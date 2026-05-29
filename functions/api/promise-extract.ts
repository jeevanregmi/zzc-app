/**
 * POST /api/promise-extract
 *
 * Gen Z Government Promise Tracker — Extraction Engine.
 * Extracts specific, source-backed government promises from official documents.
 *
 * NON-PARTISAN: factual extraction only. Status is always "announced" at extract time.
 * Every atom requires pageNumber + verbatim textEvidence.
 *
 * Background mode (preferred):
 *   - Returns { ok: true, status: "processing" } immediately (no 524 timeout)
 *   - context.waitUntil() runs extraction in background
 *   - Progress written to promise_extraction_jobs/{docId}
 *   - Atoms written to promise_atoms
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, firestoreAdd, firestoreSet, firestorePatch } from "./_shared";
import { estimateCostUSD } from "../../lib/types/extraction-job";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:   string;
  VAULT_BUCKET?:   R2Bucket;
}

interface PagesContext {
  request:   Request;
  env:       Env;
  waitUntil: (promise: Promise<unknown>) => void;
}

interface PromiseRequest {
  docId:       string;
  ownerId:     string;
  downloadUrl: string;
  mimeType:    string;
  docTitle:    string;
  fiscalYear:  string;   // "2083/84"
  nepaliYear:  number;   // 2083
  docType:     string;   // "budget_speech" | "niti_karyakram" | ...
  pageCount?:  number;
}

interface RawPromiseRecord {
  titleNepali:             string;
  plainNepaliMeaning:      string;
  promisedAction:          string;
  promisedOutput:          string | null;
  deadlineText:            string | null;
  measurableIndicator:     string | null;
  originalTextEvidence:    string;
  pageNumber:              number;
  sector:                  string;
  responsibleInstitution:  string | null;
  targetGroup:             string | null;
  budgetAmount:            number | null;
  budgetUnit:              string | null;
  isRepeatFromLastYear:    boolean;
  previousYearEvidence:    string | null;
  relatedMovement:         "gen_z_movement_2081" | "none" | null;
  movementDemandType:      string | null;
  movementConfidence:      number | null;
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes  = new Uint8Array(buffer);
  let binary   = "";
  const chunk  = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function buildPromisePrompt(body: PromiseRequest): string {
  return `तपाईं ZZC को Government Promise Tracker AI हुनुहुन्छ।

तपाईंको काम: यो official document बाट सरकारले गरेका specific PROMISES मात्र निकाल्नुहोस्।

Document: "${body.docTitle}"
Type: ${body.docType}
Fiscal Year: ${body.fiscalYear} (Nepali BS: ${body.nepaliYear})

═══════════════════════════════════════════════════════════════
PROMISE भनेको के हो — स्पष्ट परिभाषा
═══════════════════════════════════════════════════════════════

✅ PROMISE: सरकारले specific action गर्नेछ भनी commitment गरेको
  - "...स्थापना गरिनेछ"
  - "...कार्यान्वयन गरिनेछ"
  - "...उपलब्ध गराइनेछ"
  - "...लागू गरिनेछ"
  - "...वितरण गरिनेछ"

❌ NOT A PROMISE — निकाल्नु हुँदैन:
  - Budget allocations only (amounts without commitment)
  - Statistical data / economic figures
  - Historical achievements
  - General aspirations without specific action
  - Vague statements without accountability

═══════════════════════════════════════════════════════════════
NON-PARTISAN RULE — अनिवार्य पालना
═══════════════════════════════════════════════════════════════

- केवल factual extraction। editorial opinion थप्नु हुँदैन।
- "अस्पष्ट छ", "झुटो", "failed" — कहिल्यै लेख्नु हुँदैन।
- plainNepaliMeaning मा: "यसले नागरिकलाई के हुन्छ?" सरल भाषामा मात्र।
- Source text verbatim quote गर्नुहोस् — interpret होइन।

═══════════════════════════════════════════════════════════════
SECTORS — exact Nepali names use गर्नुहोस्
═══════════════════════════════════════════════════════════════

युवा | रोजगार | शिक्षा | स्वास्थ्य | सुशासन | भ्रष्टाचार नियन्त्रण
डिजिटल | कृषि | अर्थतन्त्र | पूर्वाधार | सामाजिक सुरक्षा | न्याय | वातावरण | अन्य

═══════════════════════════════════════════════════════════════
GEN Z MOVEMENT — 2081 BS आन्दोलन सम्बन्धित promises
═══════════════════════════════════════════════════════════════

यदि promise ले Gen Z 2081 आन्दोलनका माँग (रोजगार, सुशासन, भ्रष्टाचार, युवा सशक्तिकरण)
सँग सम्बन्ध छ भने:
- relatedMovement: "gen_z_movement_2081"
- movementDemandType: "युवा सशक्तिकरण" / "रोजगार सिर्जना" / "सुशासन" / "भ्रष्टाचार नियन्त्रण"
- movementConfidence: 0.0–1.0 (0 = no relation, 1 = explicitly stated)

यदि सम्बन्ध छैन भने: relatedMovement: "none", movementConfidence: 0

═══════════════════════════════════════════════════════════════
RETURN FORMAT — strict JSON
═══════════════════════════════════════════════════════════════

{
  "fiscalYear": "${body.fiscalYear}",
  "nepaliYear": ${body.nepaliYear},
  "totalPages": 180,
  "promiseCount": 35,
  "promises": [
    {
      "titleNepali": "युवाहरूलाई ५० हजार रोजगारी सिर्जना",
      "plainNepaliMeaning": "सरकारले युवाहरूका लागि ५० हजार नयाँ जागिरको अवसर बनाउने प्रतिबद्धता गरेको छ।",
      "promisedAction": "रोजगारी सिर्जना कार्यक्रम लागू गरिनेछ",
      "promisedOutput": "५० हजार रोजगारी",
      "deadlineText": "आर्थिक वर्ष २०८३/८४ सम्म",
      "measurableIndicator": "रोजगारी प्रदान गरिएको संख्या",
      "originalTextEvidence": "verbatim quote from the document (max 500 chars)",
      "pageNumber": 14,
      "sector": "रोजगार",
      "responsibleInstitution": "Ministry of Labour, Employment and Social Security",
      "targetGroup": "युवा उद्यमी",
      "budgetAmount": 5000000000,
      "budgetUnit": "rupees",
      "isRepeatFromLastYear": false,
      "previousYearEvidence": null,
      "relatedMovement": "gen_z_movement_2081",
      "movementDemandType": "रोजगार सिर्जना",
      "movementConfidence": 0.8
    }
  ]
}

RULES:
1. pageNumber छैन → REJECT।
2. originalTextEvidence (verbatim quote) छैन → REJECT।
3. Minimum 15 promises, maximum 80 promises।
4. isRepeatFromLastYear: सोही promise गत वर्ष पनि भएको थियो भने true।
5. titleNepali: max 60 chars, actionable।
6. budgetAmount: null यदि कुनै specific amount mentioned छैन भने।`;
}

function computeScore(r: RawPromiseRecord): number {
  let score = 0;
  if ((r.budgetAmount ?? 0) > 0)          score += 0.4;
  if (r.measurableIndicator?.trim())      score += 0.3;
  if (r.deadlineText?.trim())             score += 0.2;
  if (r.responsibleInstitution?.trim())   score += 0.1;
  return Math.round(score * 10) / 10;
}

function validateRecords(records: RawPromiseRecord[]): RawPromiseRecord[] {
  const valid = records.filter(r => {
    if (!r.pageNumber || r.pageNumber < 1) return false;
    if (!r.originalTextEvidence || r.originalTextEvidence.trim().length < 10) return false;
    if (!r.titleNepali || r.titleNepali.trim().length < 3) return false;
    if (!r.promisedAction || r.promisedAction.trim().length < 5) return false;
    if (!r.sector) return false;
    return true;
  });

  const seen = new Set<string>();
  return valid.filter(r => {
    const key = r.titleNepali.trim().toLowerCase().slice(0, 50);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchPdf(body: PromiseRequest, env: Env): Promise<{ buf: ArrayBuffer; sizeBytes: number }> {
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

// ── Progress helper ────────────────────────────────────────────────────────────

function progress(idToken: string, docId: string, fields: Record<string, unknown>): void {
  const now = new Date().toISOString();
  firestorePatch(idToken, "promise_extraction_jobs", docId, {
    ...fields,
    updatedAt:       now,
    lastHeartbeatAt: now,
  }).catch(() => {});
}

// ── Background extraction (waitUntil) ─────────────────────────────────────────

async function runPromiseBackground(
  body: PromiseRequest,
  idToken: string,
  env: Env,
  prompt: string,
): Promise<void> {
  const now = new Date().toISOString();

  await firestoreSet(idToken, "promise_extraction_jobs", body.docId, {
    pipeline:          "promise",
    ownerId:           body.ownerId,
    docId:             body.docId,
    docTitle:          body.docTitle,
    fiscalYear:        body.fiscalYear,
    nepaliYear:        body.nepaliYear,
    docType:           body.docType,
    status:            "queued",
    progressPercent:   0,
    currentStepNepali: "सुरु हुँदैछ…",
    recordsExtracted:  0,
    recordsRejected:   0,
    startedAt:         now,
    updatedAt:         now,
    lastHeartbeatAt:   now,
  }).catch(e => log("promise-extract", "job_init_error", { docId: body.docId, err: String(e).slice(0, 100) }));

  try {
    // ── Step 1: fetch PDF ───────────────────────────────────────────────────
    progress(idToken, body.docId, {
      status:            "fetching_document",
      progressPercent:   10,
      currentStepNepali: "PDF server बाट download गर्दैछ…",
    });

    const { buf, sizeBytes } = await fetchPdf(body, env);
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeMB > 20) throw new Error(`PDF too large (${sizeMB.toFixed(1)} MB, max 20 MB)`);

    log("promise-extract", "pdf_fetched", { docId: body.docId, sizeMB: sizeMB.toFixed(2) });

    // ── Step 2: encode PDF ──────────────────────────────────────────────────
    progress(idToken, body.docId, {
      status:            "reading_pdf",
      progressPercent:   25,
      currentStepNepali: `PDF पढ्दैछ — ${sizeMB.toFixed(1)} MB${body.pageCount ? `, ${body.pageCount} pages` : ""}`,
      fileSizeMB:        Math.round(sizeMB * 10) / 10,
      pageCount:         body.pageCount ?? null,
    });

    const base64 = toBase64(buf);

    // ── Step 3: AI extraction ───────────────────────────────────────────────
    progress(idToken, body.docId, {
      status:            "ai_processing",
      progressPercent:   40,
      currentStepNepali: `Gemini ले government promises निकाल्दैछ — ${body.docTitle.slice(0, 50)}…`,
      providerUsed:      "gemini-flash",
    });

    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY!,
      model:     env.GEMINI_MODEL,
      system:    "You are Nepal Government Promise Tracker AI. Return ONLY valid JSON. Every promise MUST have pageNumber and originalTextEvidence. No markdown. No code fences. Start with { end with }.",
      parts: [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: prompt },
      ],
      maxTokens: 32768,
    });

    const inputTokens  = result.inputTokens  ?? 0;
    const outputTokens = result.outputTokens ?? 0;
    const costUSD      = estimateCostUSD(inputTokens, outputTokens);

    // ── Step 4: parse & validate ────────────────────────────────────────────
    let responseText = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Sanitize newlines inside strings
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

    const data = parsed as { promises: RawPromiseRecord[]; totalPages?: number };
    if (!Array.isArray(data.promises)) throw new Error("AI returned no promises array");

    const validated = validateRecords(data.promises);
    const rejected  = data.promises.length - validated.length;

    if (validated.length === 0) {
      throw new Error("No valid promise records — all missing pageNumber or originalTextEvidence");
    }

    log("promise-extract", "extraction_done", {
      docId: body.docId, total: data.promises.length, valid: validated.length, rejected,
      inputTokens, outputTokens, costUSD: costUSD.toFixed(4),
    });

    // ── Step 5: save promise atoms ──────────────────────────────────────────
    progress(idToken, body.docId, {
      status:            "saving_atoms",
      progressPercent:   80,
      currentStepNepali: `${validated.length} promises Firestore मा save गर्दैछ…`,
      recordsExtracted:  validated.length,
      recordsRejected:   rejected,
      inputTokens,
      outputTokens,
      estimatedCostUSD:  Math.round(costUSD * 10000) / 10000,
      providerUsed:      "gemini-flash",
      pageCount:         data.totalPages ?? body.pageCount ?? null,
    });

    const savePromises = validated.map(r => {
      const atom: Record<string, unknown> = {
        // source
        ownerId:                body.ownerId,
        sourceDocumentId:       body.docId,
        sourceDocTitle:         body.docTitle,
        sourceDocType:          body.docType,
        fiscalYear:             body.fiscalYear,
        nepaliYear:             body.nepaliYear,
        // what was promised
        titleNepali:            r.titleNepali.slice(0, 120),
        plainNepaliMeaning:     r.plainNepaliMeaning || "",
        promisedAction:         r.promisedAction || "",
        promisedOutput:         r.promisedOutput ?? null,
        deadlineText:           r.deadlineText ?? null,
        measurableIndicator:    r.measurableIndicator ?? null,
        // source evidence
        originalTextEvidence:   r.originalTextEvidence.slice(0, 500),
        pageNumber:             r.pageNumber,
        // classification
        sector:                 r.sector,
        responsibleInstitution: r.responsibleInstitution ?? null,
        targetGroup:            r.targetGroup ?? null,
        budgetAmount:           r.budgetAmount ?? null,
        budgetUnit:             r.budgetUnit ?? null,
        // movement context
        relatedMovement:        r.relatedMovement === "gen_z_movement_2081"
                                  ? "gen_z_movement_2081"
                                  : "none",
        movementDemandType:     r.movementDemandType ?? null,
        movementConfidence:     r.movementConfidence != null
                                  ? Math.min(1, Math.max(0, r.movementConfidence))
                                  : 0,
        // accountability
        promiseStatus:          "announced",
        isRepeatFromLastYear:   r.isRepeatFromLastYear === true,
        previousYearEvidence:   r.previousYearEvidence ?? null,
        accountabilityScore:    computeScore(r),
        // verification
        verificationStatus:     "ai_extracted",
        publicReady:            false,
        createdAt:              now,
        updatedAt:              now,
      };
      return firestoreAdd(idToken, "promise_atoms", atom);
    });
    await Promise.all(savePromises);

    // Audit log
    await firestoreAdd(idToken, "promise_extraction_logs", {
      ownerId:          body.ownerId,
      docId:            body.docId,
      docTitle:         body.docTitle,
      fiscalYear:       body.fiscalYear,
      nepaliYear:       body.nepaliYear,
      docType:          body.docType,
      recordsSaved:     validated.length,
      recordsRejected:  rejected,
      fileSizeBytes:    sizeBytes,
      pageCount:        body.pageCount ?? null,
      inputTokens,
      outputTokens,
      estimatedCostUSD: Math.round(costUSD * 10000) / 10000,
      providerUsed:     "gemini-flash",
      runAt:            now,
    }).catch(() => {});

    // ── Complete ────────────────────────────────────────────────────────────
    await firestorePatch(idToken, "promise_extraction_jobs", body.docId, {
      status:            "completed",
      progressPercent:   100,
      currentStepNepali: `✅ ${validated.length} promises निकालियो — ${body.fiscalYear}`,
      recordsExtracted:  validated.length,
      recordsRejected:   rejected,
      recordsSaved:      validated.length,
      inputTokens,
      outputTokens,
      estimatedCostUSD:  Math.round(costUSD * 10000) / 10000,
      completedAt:       new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
      lastHeartbeatAt:   new Date().toISOString(),
    });

    log("promise-extract", "complete", { docId: body.docId, saved: validated.length, costUSD: costUSD.toFixed(4) });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("promise-extract", "error", { docId: body.docId, err: msg.slice(0, 200) });

    firestorePatch(idToken, "promise_extraction_jobs", body.docId, {
      status:            "failed",
      progressPercent:   0,
      currentStepNepali: "❌ गल्ती भयो",
      errorMessage:      msg.slice(0, 400),
      completedAt:       new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
      lastHeartbeatAt:   new Date().toISOString(),
    }).catch(() => {});
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const env = context.env;

  if (!env.GEMINI_API_KEY?.trim()) {
    return clientError("Promise extraction requires GEMINI_API_KEY.", 503, "NO_GEMINI");
  }

  let body: PromiseRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.docId || !body.ownerId || !body.downloadUrl || !body.docTitle || !body.fiscalYear) {
    return clientError("docId, ownerId, downloadUrl, docTitle, fiscalYear required", 400, "VALIDATION_ERROR");
  }

  if (!body.nepaliYear || body.nepaliYear < 2000) {
    return clientError("nepaliYear must be a valid Nepali BS year (e.g. 2083)", 400, "INVALID_YEAR");
  }

  const isPdf =
    (body.mimeType ?? "").includes("pdf") ||
    (body.downloadUrl ?? "").toLowerCase().includes(".pdf");
  if (!isPdf) {
    return clientError("Promise extraction requires a PDF document.", 400, "PDF_REQUIRED");
  }

  const prompt    = buildPromisePrompt(body);
  const authHeader = context.request.headers.get("Authorization") ?? "";
  const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  if (!idToken) {
    return clientError("Authorization header required for promise extraction.", 401, "AUTH_REQUIRED");
  }

  log("promise-extract", "start", {
    docId: body.docId, title: body.docTitle.slice(0, 60),
    fiscalYear: body.fiscalYear,
  });

  context.waitUntil(runPromiseBackground(body, idToken, env, prompt));
  return new Response(
    JSON.stringify({ ok: true, status: "processing", docId: body.docId }),
    { headers: CORS },
  );
};
