"use strict";
/**
 * ZZC Monitored Source Poller
 *
 * Reads active monitored_sources from Firestore, calls /api/ingest-url
 * for each, writes resulting SourceSignals to Firestore, then runs the
 * signal routing engine to create downstream drafts in the appropriate
 * destination collections.
 *
 * Pipeline per source:
 *   1. Fetch URL via /api/ingest-url → AI-classified signal payload
 *   2. Deduplicate (skip if same URL ingested within DEDUPE_HOURS)
 *   3. Write SourceSignal doc (status: "raw")
 *   4. Load active signal_routes from Firestore
 *   5. matchSignalRoutes(signal, routes) → matched routes
 *   6. For each match: executeRoute → write to destination collection
 *   7. Update MonitoredSource metadata
 *
 * Required env vars:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of the service account key
 *
 * Optional env vars:
 *   SITE_URL    — base URL (default: https://zzc.jeevanregmi.com.np)
 *   CRON_SECRET — passed as x-cron-secret header if set
 */

const admin = require("firebase-admin");

// ─── Firebase init ────────────────────────────────────────────────────────────

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

const SITE_URL     = (process.env.SITE_URL || "https://zzc.jeevanregmi.com.np").replace(/\/$/, "");
const INGEST_URL   = `${SITE_URL}/api/ingest-url`;
const CRON_SECRET  = process.env.CRON_SECRET || "";
const DEDUPE_HOURS = 23;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function isRecentlyIngested(url) {
  const cutoff = new Date(Date.now() - DEDUPE_HOURS * 3600 * 1000).toISOString();
  const snap = await db.collection("source_signals")
    .where("sourceUrl", "==", url)
    .where("createdAt",  ">", cutoff)
    .limit(1)
    .get();
  return !snap.empty;
}

async function callIngest(source) {
  const headers = { "Content-Type": "application/json" };
  if (CRON_SECRET) headers["x-cron-secret"] = CRON_SECRET;

  const res = await fetch(INGEST_URL, {
    method:  "POST",
    headers,
    body:    JSON.stringify({
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

// ─── Signal routing ───────────────────────────────────────────────────────────

async function loadActiveRoutes() {
  const snap = await db.collection("signal_routes")
    .where("active", "==", true)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function matchRoutes(signal, routes) {
  const text         = `${signal.title} ${signal.summary}`.toLowerCase();
  const signalSector = (signal.sectorId || "").toLowerCase();
  const signalTopics = new Set((signal.taxonomyTags || []).map(t => t.topicId));
  const relevance    = signal.relevanceScore ?? 0.5;

  const matches = [];

  for (const route of routes) {
    if (relevance < (route.minRelevanceScore ?? 0)) continue;

    const matchedKeywords = (route.keywords || []).filter(kw => text.includes(kw.toLowerCase()));
    const matchedSectors  = signalSector && (route.sectorIds || []).includes(signalSector) ? [signalSector] : [];
    const matchedTopics   = (route.topicIds || []).filter(t => signalTopics.has(t));

    const keywordHit =
      route.keywords.length === 0 ||
      (route.matchMode === "all"
        ? matchedKeywords.length === route.keywords.length
        : matchedKeywords.length > 0);

    if (!keywordHit && matchedSectors.length === 0 && matchedTopics.length === 0) continue;

    matches.push({ route, matchedKeywords, matchedSectors, matchedTopics });
  }

  return matches;
}

async function executeRoute(route, signal, signalId, ownerId) {
  const now     = new Date().toISOString();
  const baseDoc = {
    routeId:     route.id,
    signalId,
    signalTitle: signal.title,
    signalUrl:   signal.sourceUrl || signal.url || "",
    publishStatus: "draft",
    createdAt:   now,
    updatedAt:   now,
  };

  let createdId = null;

  switch (route.destination) {
    case "content_queue": {
      const ref = db.collection("vault_content_queue").doc();
      await ref.set({
        id:          ref.id,
        ownerId,
        aiTitle:     `[Draft] ${signal.title}`,
        contentType: route.contentType || "explainer",
        platform:    route.platform    || "youtube",
        brief:       signal.summary,
        hooks:       signal.contentIdeas || [],
        tags:        [...(route.autoTags || []), ...(signal.tags || [])],
        sourceSignalId: signalId,
        confidence:  signal.relevanceScore ?? 0.5,
        status:      "pending",
        createdAt:   now,
        updatedAt:   now,
      });
      createdId = ref.id;
      console.log(`     → content_queue: ${ref.id}`);
      break;
    }

    case "market_rate_suggest": {
      const ref = db.collection("market_rate_suggestions").doc();
      await ref.set({
        ...baseDoc,
        id:              ref.id,
        suggestedRateId: "",        // admin fills in which rate this relates to
        suggestedValue:  null,      // AI didn't extract a specific number
        context:         signal.summary,
        reviewedBy:      null,
        reviewedAt:      null,
      });
      createdId = ref.id;
      console.log(`     → market_rate_suggestions: ${ref.id}`);
      break;
    }

    case "scheme_suggest": {
      const ref = db.collection("scheme_suggestions").doc();
      await ref.set({
        ...baseDoc,
        id:              ref.id,
        targetSchemeId:  null,
        suggestedFields: {},
        context:         signal.summary,
        reviewedBy:      null,
        reviewedAt:      null,
      });
      createdId = ref.id;
      console.log(`     → scheme_suggestions: ${ref.id}`);
      break;
    }

    case "intelligence_flag": {
      // Writes a review task to admin review queue — no new collection doc needed,
      // just update the signal's status to trigger Admin Vault attention.
      await db.collection("source_signals").doc(signalId).update({
        status:    "validated",
        updatedAt: now,
      });
      createdId = signalId;
      console.log(`     → intelligence_flag: signal ${signalId} marked validated`);
      break;
    }

    default:
      console.warn(`     ⚠ Unknown destination: ${route.destination}`);
  }

  // Increment route match counter
  if (createdId) {
    await db.collection("signal_routes").doc(route.id).update({
      lastMatchAt: now,
      matchCount:  admin.firestore.FieldValue.increment(1),
    }).catch(() => {});
  }

  return createdId;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const snap = await db.collection("monitored_sources")
    .where("status", "==", "active")
    .get();

  const sources = snap.docs.map(d => ({ _docId: d.id, ...d.data() }));
  console.log(`Found ${sources.length} active monitored source(s)`);

  if (sources.length === 0) {
    console.log("No active sources — exiting early (no further Firestore reads).");
    process.exit(0);
  }

  // Load routes once — shared across all signals this run
  const routes = await loadActiveRoutes();
  console.log(`Loaded ${routes.length} active signal route(s)\n`);

  let ingested  = 0;
  let skipped   = 0;
  let errors    = 0;
  let routed    = 0;

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

      if (!result.ok) throw new Error(result.error || "Unknown ingest error");

      // ── Write SourceSignal ──────────────────────────────────────────────────
      const sigRef = db.collection("source_signals").doc();
      const signal = {
        id:             sigRef.id,
        ownerId:        source.ownerId      || "",
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
      };
      await sigRef.set(signal);
      console.log(`   ✓ Signal written: ${sigRef.id}`);

      // ── Run routing engine ──────────────────────────────────────────────────
      if (routes.length > 0) {
        const matches = matchRoutes(signal, routes);
        console.log(`   ◈ Routes matched: ${matches.length}`);

        for (const { route } of matches) {
          console.log(`   ↪ ${route.name} → ${route.destination}`);
          try {
            await executeRoute(route, signal, sigRef.id, source.ownerId || "");
            routed++;
          } catch (routeErr) {
            console.error(`     ✗ Route execution failed: ${routeErr.message}`);
          }
        }
      }

      // ── Update MonitoredSource ──────────────────────────────────────────────
      await db.collection("monitored_sources").doc(source._docId).update({
        lastCheckedAt:  now,
        lastSignalAt:   now,
        errorMessage:   null,
        rawSignalCount: admin.firestore.FieldValue.increment(1),
      });

      ingested++;

    } catch (err) {
      console.error(`✗  Error [${source.name}]: ${err.message}`);
      await db.collection("monitored_sources").doc(source._docId).update({
        lastCheckedAt: new Date().toISOString(),
        errorMessage:  err.message.slice(0, 500),
      }).catch(() => {});
      errors++;
    }

    console.log();
  }

  console.log(`Done — ingested: ${ingested} | skipped: ${skipped} | errors: ${errors} | routed items: ${routed}`);
  if (errors > 0 && ingested === 0 && skipped === 0) process.exit(1);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
