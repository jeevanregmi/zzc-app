"use strict";
/**
 * ZZC Monitored Source Poller — Task 3A
 *
 * Reads active monitored_sources from Firestore, calls /api/ingest-url
 * for each, writes resulting SourceSignals to Firestore.
 *
 * Deduplication: skips any source URL already ingested within DEDUPE_HOURS.
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of the service account key
 *
 * Optional env vars:
 *   SITE_URL    — base URL (default: https://zzc.jeevanregmi.com.np)
 *   CRON_SECRET — passed as x-cron-secret header if set
 */

const admin = require("firebase-admin");

// ─── Firebase init ─────────────────────────────────────────────────────────────

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT env var is not set.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch {
  console.error("❌  FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ─── Config ───────────────────────────────────────────────────────────────────

const SITE_URL    = (process.env.SITE_URL || "https://zzc.jeevanregmi.com.np").replace(/\/$/, "");
const INGEST_URL  = `${SITE_URL}/api/ingest-url`;
const CRON_SECRET = process.env.CRON_SECRET || "";
const DEDUPE_HOURS = 23;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isRecentlyIngested(url) {
  const cutoff = new Date(Date.now() - DEDUPE_HOURS * 3600 * 1000).toISOString();
  const snap = await db.collection("source_signals")
    .where("sourceUrl", "==", url)
    .where("createdAt", ">", cutoff)
    .limit(1)
    .get();
  return !snap.empty;
}

async function callIngest(source) {
  const headers = { "Content-Type": "application/json" };
  if (CRON_SECRET) headers["x-cron-secret"] = CRON_SECRET;

  const res = await fetch(INGEST_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      url:        source.url,
      sourceName: source.name,
      sourceType: source.sourceType,
      topics:     source.topics || [],
      tags:       source.tags   || [],
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  return res.json();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const snap = await db.collection("monitored_sources")
    .where("status", "==", "active")
    .get();

  const sources = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  console.log(`Found ${sources.length} active monitored source(s)`);

  let ingested = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const source of sources) {
    const now = new Date().toISOString();

    try {
      const already = await isRecentlyIngested(source.url);
      if (already) {
        console.log(`↩  Skip ${source.name} — ingested within ${DEDUPE_HOURS}h`);
        await db.collection("monitored_sources").doc(source._docId).update({ lastCheckedAt: now });
        skipped++;
        continue;
      }

      console.log(`→  Ingesting: ${source.name} (${source.url})`);
      const result = await callIngest(source);

      if (!result.ok) {
        throw new Error(result.error || "Unknown ingest error");
      }

      const sigRef = db.collection("source_signals").doc();
      await sigRef.set({
        id:             sigRef.id,
        ownerId:        source.ownerId     || "",
        sourceUrl:      source.url,
        sourceType:     source.sourceType,
        sourceName:     source.name,
        title:          result.title         || source.url,
        summary:        result.summary       || "",
        body:           result.body          || "",
        publishedAt:    result.publishedAt   || null,
        sectorId:       result.primarySectorId || null,
        taxonomyTags:   result.taxonomyTags  || [],
        status:         "raw",
        topics:         result.detectedTopics || [],
        tags:           source.tags           || [],
        relevanceScore: result.relevanceScore  ?? 0.5,
        credibility:    result.credibility     || "unverified",
        aiInsights:     result.aiInsights      || [],
        contentIdeas:   result.contentIdeas    || [],
        createdAt:      now,
        updatedAt:      now,
      });

      await db.collection("monitored_sources").doc(source._docId).update({
        lastCheckedAt:  now,
        lastSignalAt:   now,
        errorMessage:   null,
        rawSignalCount: admin.firestore.FieldValue.increment(1),
      });

      console.log(`✓  ${source.name} → signal ${sigRef.id}`);
      ingested++;

    } catch (err) {
      console.error(`✗  Error [${source.name}]: ${err.message}`);
      await db.collection("monitored_sources").doc(source._docId).update({
        lastCheckedAt: new Date().toISOString(),
        errorMessage:  err.message.slice(0, 500),
      }).catch(() => {});
      errors++;
    }
  }

  console.log(`\nDone — ingested: ${ingested} | skipped: ${skipped} | errors: ${errors}`);

  if (errors > 0 && ingested === 0 && skipped === 0) process.exit(1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
