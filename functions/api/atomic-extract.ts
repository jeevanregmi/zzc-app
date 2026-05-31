/**
 * POST /api/atomic-extract
 *
 * Tier 2 Atomic Intelligence Extraction — page/paragraph-level, source-traced.
 *
 * ONLY runs on:
 *   - official documents (sourceType === "official")
 *   - approved documents (adminApprovalStatus === "approved")
 *   - founder-triggered (never auto-runs)
 *
 * Background mode (preferred):
 *   - Frontend sends Authorization: Bearer {firebase-id-token}
 *   - Returns { ok: true, status: "processing" } immediately (no 524)
 *   - context.waitUntil() runs extraction in background
 *   - Results written to Firestore via REST API
 *   - Frontend polls atomic_extraction_jobs/{docId} via onSnapshot
 *
 * Sync mode (fallback, no token):
 *   - Blocks until extraction completes, returns records directly
 *
 * GET  /api/atomic-extract?docId=X&pageCount=N  → cost estimate
 * POST /api/atomic-extract                       → run extraction
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, firestoreAdd, firestoreSet, firestoreBatchCommit } from "./_shared";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:   string;
  VAULT_BUCKET?:   R2Bucket;
}

interface PagesContext {
  request:     Request;
  env:         Env;
  waitUntil:   (promise: Promise<unknown>) => void;
}

interface AtomicRequest {
  docId:        string;
  ownerId:      string;
  downloadUrl:  string;
  mimeType:     string;
  docTitle:     string;
  docType?:     string;
  sourceYear?:  string;
  pageCount?:   number;
  domain?:      string;
}

interface AtomicRecord {
  type:            string;
  title:           string;
  titleNepali:     string;
  summaryNepali:   string;
  sector:          string;
  ministry:        string;
  department?:     string | null;
  target?:         string | null;
  measurable:      boolean;
  timeline?:       string | null;
  budgetAmount?:   string | null;
  fiscalYear?:     string | null;
  geoScope:        string;
  governmentLevel: string;
  constitutionalRefs?: number[];
  tags:            string[];
  confidence:      number;
  affectedGroups:  string[];
  affectedSectors: string[];
  pageNumber:      number;
  textEvidence:    string;
  paragraphIdx?:   number;
}

export function estimateCost(pageCount: number): number {
  return Math.max(0.10, Math.ceil(pageCount / 100) * 0.15);
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 32768; // safe spread limit
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function buildAtomicPrompt(body: AtomicRequest): string {
  return `तपाईं ZZC को Tier 2 Atomic Intelligence Extractor हुनुहुन्छ।

यो कुनै summary होइन। यो PAGE-BY-PAGE atomic fact extraction हो।

Document: "${body.docTitle}"
Type: ${body.docType ?? "official government document"}
Year: ${body.sourceYear ?? "unknown"}

═══════════════════════════════════════════════════════════════
ATOMIC EXTRACTION RULE — यो पालना गर्नैपर्छ:
═══════════════════════════════════════════════════════════════

हरेक extracted record को लागि तपाईंले MUST provide गर्नुपर्छ:

1. pageNumber  — PDF को exact page number (1-indexed)
2. textEvidence — उही page बाट verbatim quote (exact text, max 400 characters)
3. paragraphIdx — page मा paragraph को position (0 = first paragraph)

यदि तपाईंले page number cite गर्न सक्नुहुन्न भने — त्यो record REJECT गर्नुहोस्।
यदि verbatim text quote गर्न सक्नुहुन्न भने — त्यो record REJECT गर्नुहोस्।

NO INFERENCE. NO PARAPHRASE. Direct source text only.

═══════════════════════════════════════════════════════════════
WHAT TO EXTRACT:
═══════════════════════════════════════════════════════════════

Extract EVERY specific, trackable fact:
- Budget allocations with amounts (NPR)
- Statistical findings with numbers
- Named institutions, committees, bodies
- Policy changes with specific conditions
- Recommendations with measurable targets
- Complaints data with counts or percentages
- Performance metrics
- Legal provisions with article numbers
- Implementation deadlines
- Personnel counts, coverage percentages

SKIP: vague aspirations, general statements, repeated summaries.

═══════════════════════════════════════════════════════════════
RECORD SCHEMA:
═══════════════════════════════════════════════════════════════

{
  "records": [
    {
      "type": "budget_target|promise|project|institution|employment_target|social_program|reform|bank_directive|interest_rate|epf_rule|ssf_rule|monetary_policy|financial_complaint|other",
      "title": "concise English (5-8 words)",
      "titleNepali": "छोटो नेपाली शीर्षक",
      "summaryNepali": "नागरिकले बुझ्ने १-२ वाक्य",
      "sector": "education|health|agriculture|infrastructure|energy|finance|governance|employment|social|environment|judiciary|transport|other",
      "ministry": "exact ministry or body name from document",
      "department": "specific department or null",
      "target": "exact figure/metric or null",
      "measurable": true,
      "timeline": "deadline from document or null",
      "budgetAmount": "रु. X करोड/अर्ब or null",
      "fiscalYear": "2083/84 format or null",
      "geoScope": "national|provincial|district|municipality|ward",
      "governmentLevel": "federal|provincial|local",
      "constitutionalRefs": [3, 31],
      "tags": ["tag1", "tag2", "tag3"],
      "confidence": 0.95,
      "affectedGroups": ["युवा", "कृषक"],
      "affectedSectors": ["education", "finance"],
      "pageNumber": 14,
      "textEvidence": "exact verbatim quote from page 14 (max 400 chars)",
      "paragraphIdx": 2
    }
  ],
  "totalPages": 180,
  "recordCount": 47
}`;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
}

function validateAndFilter(records: AtomicRecord[]): AtomicRecord[] {
  const valid = records.filter(r => {
    if (!r.pageNumber || r.pageNumber < 1) return false;
    if (!r.textEvidence || r.textEvidence.trim().length < 10) return false;
    if (!r.title || !r.titleNepali) return false;
    return true;
  });

  const seen = new Set<string>();
  return valid.filter(r => {
    const key = normalizeTitle(r.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Shared: fetch PDF from R2 or signed URL ───────────────────────────────────

async function fetchPdf(body: AtomicRequest, env: Env): Promise<{ buf: ArrayBuffer; sizeBytes: number }> {
  let r2Key = "";
  try { r2Key = new URL(body.downloadUrl).searchParams.get("key") ?? ""; } catch { /* ignore */ }

  let buf: ArrayBuffer;
  if (r2Key && env.VAULT_BUCKET) {
    const obj = await env.VAULT_BUCKET.get(r2Key);
    if (!obj) throw new Error(`Document not in R2: ${r2Key}`);
    buf = await obj.arrayBuffer();
  } else {
    const abort = new AbortController();
    const tid   = setTimeout(() => abort.abort(), 30_000);
    let res: Response;
    try { res = await fetch(body.downloadUrl, { signal: abort.signal }); }
    finally { clearTimeout(tid); }
    if (!res.ok) throw new Error(`PDF fetch failed: HTTP ${res.status}`);
    buf = await res.arrayBuffer();
  }
  return { buf, sizeBytes: buf.byteLength };
}

// ── Background extraction (waitUntil) ─────────────────────────────────────────

async function runAtomicBackground(
  body: AtomicRequest,
  idToken: string,
  env: Env,
  prompt: string,
  domain: string,
): Promise<void> {
  const now = new Date().toISOString();

  // Write job record immediately so frontend can track
  await firestoreSet(idToken, "atomic_extraction_jobs", body.docId, {
    ownerId:   body.ownerId,
    docId:     body.docId,
    docTitle:  body.docTitle,
    status:    "processing",
    startedAt: now,
  }).catch(e => log("atomic-extract", "job_init_error", { docId: body.docId, err: String(e).slice(0, 100) }));

  try {
    // Fetch PDF
    const { buf, sizeBytes } = await fetchPdf(body, env);
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeMB > 20) {
      throw new Error(`PDF too large for atomic extraction (${sizeMB.toFixed(1)} MB, max 20 MB)`);
    }

    const base64 = toBase64(buf);
    log("atomic-extract", "bg_pdf_fetched", { docId: body.docId, sizeMB: sizeMB.toFixed(2) });

    // 20s Gemini timeout — leaves ~10s for batch write + error status before 30s wall-clock
    const geminiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        "Gemini timeout (20s) — PDF ठूलो हुनसक्छ वा Cloudflare 30s wall-clock limit भयो। " +
        "सानो document (< 500KB) मा try गर्नुहोस्।"
      )), 20_000)
    );

    const result = await Promise.race([
      callGemini({
        apiKey:    env.GEMINI_API_KEY!,
        model:     env.GEMINI_MODEL,
        system:    "You are a precision atomic intelligence extractor. Return ONLY valid JSON. Every record MUST have pageNumber and textEvidence. No markdown. No code fences. Start with { end with }.",
        parts:     [
          { inline_data: { mime_type: "application/pdf", data: base64 } },
          { text: prompt },
        ],
        maxTokens: 8192,
      }),
      geminiTimeout,
    ]);

    let responseText = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Fix literal newlines inside JSON strings
    {
      let inStr = false, esc = false, fixed = "";
      for (const c of responseText) {
        if (esc)                       { fixed += c; esc = false; }
        else if (c === "\\" && inStr)  { fixed += c; esc = true;  }
        else if (c === '"')            { fixed += c; inStr = !inStr; }
        else if (inStr && (c === "\n" || c === "\r")) fixed += " ";
        else                            fixed += c;
      }
      responseText = fixed;
    }

    const [parsed, parseErr] = extractJson(responseText);
    if (parseErr || !parsed) {
      throw new Error(`AI response was not valid JSON. Preview: "${responseText.slice(0, 200)}"`);
    }

    const data = parsed as { records: AtomicRecord[]; totalPages?: number };
    if (!Array.isArray(data.records)) throw new Error("AI returned no records array");

    const validated = validateAndFilter(data.records);
    const rejected  = data.records.length - validated.length;

    if (validated.length === 0) {
      throw new Error("No valid atomic records — all missing pageNumber or textEvidence");
    }

    log("atomic-extract", "bg_extraction_done", {
      docId: body.docId, total: data.records.length, valid: validated.length, rejected,
    });

    // Batch write all records in one HTTP request — ~200× faster than Promise.all(firestoreAdd...)
    // Critical: keeps total wall-clock within Cloudflare's 30s limit
    await firestoreBatchCommit(idToken, validated.map(r => ({
      collectionPath: "janta_intelligence",
      data: {
        timeline:             null,
        budgetAmount:         null,
        department:           null,
        ...r,
        summaryNepali:        r.summaryNepali || "",
        measurable:           r.measurable ?? true,
        geoScope:             r.geoScope || "national",
        governmentLevel:      r.governmentLevel || "federal",
        tags:                 r.tags || [],
        affectedGroups:       r.affectedGroups || [],
        affectedSectors:      r.affectedSectors || [],
        textEvidence:         r.textEvidence.slice(0, 400),
        confidence:           Math.min(1, Math.max(0, r.confidence ?? 0.7)),
        ownerId:              body.ownerId,
        sourceDocId:          body.docId,
        sourceDocTitle:       body.docTitle,
        implementationStatus: "announced",
        verificationStatus:   "ai_extracted",
        extractionTier:       "atomic",
        domain,
        publishToJanta:       true,
        published:            true,
        createdAt:            now,
        updatedAt:            now,
      } as Record<string, unknown>,
    })));

    // Write audit log (non-blocking, failure does not affect job status)
    firestoreAdd(idToken, "atomic_extraction_logs", {
      ownerId:          body.ownerId,
      docId:            body.docId,
      docTitle:         body.docTitle,
      recordsSaved:     validated.length,
      recordsRejected:  rejected,
      estimatedCostUSD: estimateCost(body.pageCount ?? Math.ceil(sizeBytes / 2500)),
      pageCount:        body.pageCount ?? null,
      fileSizeBytes:    sizeBytes,
      domain,
      runAt:            now,
    }).catch(() => {});

    // Mark job complete — frontend onSnapshot fires
    await firestoreSet(idToken, "atomic_extraction_jobs", body.docId, {
      ownerId:         body.ownerId,
      docId:           body.docId,
      docTitle:        body.docTitle,
      status:          "complete",
      recordsSaved:    validated.length,
      recordsRejected: rejected,
      fileSizeBytes:   sizeBytes,
      startedAt:       now,
      completedAt:     new Date().toISOString(),
    });

    log("atomic-extract", "bg_complete", { docId: body.docId, saved: validated.length });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("atomic-extract", "bg_error", { docId: body.docId, err: msg.slice(0, 200) });

    await firestoreSet(idToken, "atomic_extraction_jobs", body.docId, {
      ownerId:     body.ownerId,
      docId:       body.docId,
      status:      "error",
      errorMsg:    msg.slice(0, 300),
      startedAt:   now,
      completedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

// ── Sync extraction (no token — returns records directly) ─────────────────────

async function runAtomicSync(
  body: AtomicRequest,
  env: Env,
  prompt: string,
  domain: string,
): Promise<Response> {
  let sizeBytes = 0;
  let base64: string;

  try {
    const { buf, sizeBytes: sz } = await fetchPdf(body, env);
    sizeBytes = sz;
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeMB > 20) {
      return clientError(
        `PDF too large for atomic extraction (${sizeMB.toFixed(1)} MB). Maximum is 20 MB.`,
        413,
        "PDF_TOO_LARGE",
      );
    }

    base64 = toBase64(buf);
    log("atomic-extract", "sync_pdf_fetched", { docId: body.docId, sizeMB: sizeMB.toFixed(2) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return clientError(`PDF fetch failed: ${msg}`, 500, "PDF_FETCH_ERROR");
  }

  try {
    // 25s timeout — leaves ~3s buffer before Cloudflare's 30s wall-clock limit
    const geminiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        "Gemini timeout (25s) — PDF धेरै ठूलो हुनसक्छ। Compressed वा सानो PDF मा try गर्नुहोस्।"
      )), 25_000)
    );
    const result = await Promise.race([
      callGemini({
        apiKey:    env.GEMINI_API_KEY!,
        model:     env.GEMINI_MODEL,
        system:    "You are a precision atomic intelligence extractor. Return ONLY valid JSON. Every record MUST have pageNumber and textEvidence. No markdown. No code fences. Start with { end with }.",
        parts:     [
          { inline_data: { mime_type: "application/pdf", data: base64 } },
          { text: prompt },
        ],
        maxTokens: 4096,
      }),
      geminiTimeout,
    ]);

    let responseText = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    {
      let inStr = false, esc = false, fixed = "";
      for (const c of responseText) {
        if (esc)                       { fixed += c; esc = false; }
        else if (c === "\\" && inStr)  { fixed += c; esc = true;  }
        else if (c === '"')            { fixed += c; inStr = !inStr; }
        else if (inStr && (c === "\n" || c === "\r")) fixed += " ";
        else                            fixed += c;
      }
      responseText = fixed;
    }

    const [parsed, parseErr] = extractJson(responseText);
    if (parseErr || !parsed) {
      return clientError(
        `AI response was not valid JSON. Preview: "${responseText.slice(0, 300)}"`,
        422,
        "PARSE_ERROR",
      );
    }

    const data = parsed as { records: AtomicRecord[] };
    if (!Array.isArray(data.records)) {
      return clientError("AI returned no records array", 422, "NO_RECORDS");
    }

    const validated = validateAndFilter(data.records);
    const rejected  = data.records.length - validated.length;

    if (validated.length === 0) {
      return clientError(
        "AI returned records but none had valid pageNumber + textEvidence.",
        422,
        "NO_VALID_ATOMIC_RECORDS",
      );
    }

    const atomicRecords = validated.map(r => ({
      ...r,
      extractionTier: "atomic" as const,
      domain,
      textEvidence: r.textEvidence.slice(0, 400),
      confidence:   Math.min(1, Math.max(0, r.confidence ?? 0.7)),
    }));

    return new Response(
      JSON.stringify({
        ok:    true,
        status: "complete",
        records:      atomicRecords,
        totalFound:   atomicRecords.length,
        rejected,
        domain,
        extractionTier: "atomic",
        sizeBytes,
      }),
      { headers: CORS },
    );

  } catch (err) {
    if (err instanceof GeminiCallError) {
      return clientError(
        `Gemini error (${err.statusCode ?? "unknown"}): ${err.message.slice(0, 200)}`,
        err.statusCode ?? 500,
        err.code ?? "GEMINI_ERROR",
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    return clientError(`Extraction failed: ${msg}`, 500, "EXTRACTION_ERROR");
  }
}

// ── GET: cost estimate ────────────────────────────────────────────────────────

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const url       = new URL(context.request.url);
  const pageCount = parseInt(url.searchParams.get("pageCount") ?? "100", 10);
  const cost      = estimateCost(isNaN(pageCount) || pageCount < 1 ? 100 : pageCount);

  return new Response(
    JSON.stringify({ ok: true, estimatedUSD: cost, formattedEstimate: `~$${cost.toFixed(2)}` }),
    { headers: CORS },
  );
};

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

// ── POST: run atomic extraction ───────────────────────────────────────────────

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const env = context.env;

  if (!env.GEMINI_API_KEY?.trim()) {
    return clientError(
      "Atomic extraction requires GEMINI_API_KEY — only Gemini supports inline PDF page-level processing.",
      503,
      "NO_GEMINI",
    );
  }

  let body: AtomicRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.docId || !body.ownerId || !body.downloadUrl || !body.docTitle) {
    return clientError("docId, ownerId, downloadUrl, docTitle required", 400, "VALIDATION_ERROR");
  }

  const isPdf =
    (body.mimeType ?? "").includes("pdf") ||
    (body.downloadUrl ?? "").toLowerCase().includes(".pdf");
  if (!isPdf) {
    return clientError(
      "Atomic extraction currently requires a PDF document.",
      400,
      "PDF_REQUIRED",
    );
  }

  const domain = body.domain ?? "janta";
  const prompt = buildAtomicPrompt(body);

  // Extract Firebase ID token from Authorization header
  const authHeader = context.request.headers.get("Authorization") ?? "";
  const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  log("atomic-extract", "start", {
    docId:    body.docId,
    title:    body.docTitle.slice(0, 60),
    mode:     idToken ? "background" : "sync",
  });

  // ── Sync mode — blocks up to 22s (20s Gemini + overhead), returns records ──
  // waitUntil background mode was unreliable (worker killed before status write).
  // Sync mode matches all other extraction functions and is within Cloudflare's
  // 30s wall-clock limit.
  void idToken; // idToken accepted but no longer used for mode selection
  return runAtomicSync(body, env, prompt, domain);
};
