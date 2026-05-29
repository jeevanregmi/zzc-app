/**
 * POST /api/economy-extract
 *
 * Nepal Economic Intelligence Extraction.
 * Extracts structured economic atoms from budget speeches, monetary policy,
 * economic surveys, and other fiscal/policy documents.
 *
 * This is Nepal's economic memory layer — not just budget summaries.
 * Every atom is source-traced (page + verbatim text), time-stamped (fiscal year),
 * and citizen-friendly (plain Nepali explanation).
 *
 * Background mode (preferred):
 *   - Frontend sends Authorization: Bearer {firebase-id-token}
 *   - Returns { ok: true, status: "processing" } immediately (no 524)
 *   - context.waitUntil() runs extraction in background
 *   - Results written to economy_atoms via Firestore REST
 *   - Frontend polls economy_extraction_jobs/{docId} via onSnapshot
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, firestoreAdd, firestoreSet } from "./_shared";
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

interface EconomyRequest {
  docId:       string;
  ownerId:     string;
  downloadUrl: string;
  mimeType:    string;
  docTitle:    string;
  fiscalYear:  string;  // "2081/82"
  nepaliYear:  number;  // 2081
  docType:     string;  // "budget_speech" | "monetary_policy" | ...
  pageCount?:  number;
}

interface EconomicRecord {
  atomType:              string;
  sector:                string;
  ministry?:             string | null;
  pageNumber:            number;
  textEvidence:          string;
  amount?:               number | null;
  amountPrevYear?:       number | null;
  unit?:                 string | null;
  geoScope:              string;
  province?:             string | null;
  targetGroup?:          string | null;
  comparisonStatus:      string;
  previousYearReference?: string | null;
  summaryNepali:         string;
  citizenMeaningNepali:  string;
  confidence:            number;
  actorName?:            string | null;
  actorRole?:            string | null;
  actorInstitution?:     string | null;
  relatedMovement?:      string | null;
  beforeAfterContext?:   string | null;
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

function buildEconomyPrompt(body: EconomyRequest): string {
  return `तपाईं ZZC को Nepal Economic Intelligence AI हुनुहुन्छ।

यो Nepal को आर्थिक स्मृति प्रणाली हो — बजेट देखि नीति सम्म, वर्ष वर्षको परिवर्तन।

Document: "${body.docTitle}"
Type: ${body.docType}
Fiscal Year: ${body.fiscalYear} (Nepali BS Year: ${body.nepaliYear})

═══════════════════════════════════════════════════════════════
EXTRACTION RULES — पालना गर्नैपर्छ
═══════════════════════════════════════════════════════════════

हरेक atom मा MUST हुनुपर्छ:
1. pageNumber — PDF को exact page number (1-indexed)
2. textEvidence — उही page बाट verbatim quote (max 300 chars)
3. summaryNepali — के भयो, एक-दुई नेपाली वाक्यमा
4. citizenMeaningNepali — "यो तपाईंलाई कसरी असर गर्छ?" सरल भाषामा

Page number cite गर्न नसकेको → REJECT।
Verbatim text quote गर्न नसकेको → REJECT।
Vague aspirations without evidence → REJECT।

═══════════════════════════════════════════════════════════════
ATOM TYPES — कुन किसिमको record हो
═══════════════════════════════════════════════════════════════

budget_allocation  — Sector/program/ministry मा कति पैसा गयो
revenue           — Tax, customs, VAT, income tax target वा परिवर्तन
spending          — Capital vs recurrent expenditure breakdown
debt_deficit      — Borrowing, deficit financing, debt service
policy_promise    — सरकारले गर्छु भनेको (amount बिना)
reform            — Structural change, institution reform, law change
repeated_promise  — गत वर्ष पनि यही भनेको थियो
removed_policy    — गत वर्ष थियो, यो वर्ष छैन
economist_commentary — Named expert/economist को recommendation
institution_response — NRB, NPC, MOF, CIAA, Parliament को प्रतिक्रिया
movement_impact   — Gen Z आन्दोलन वा public pressure पछि नीति परिवर्तन
sector_trend      — Sector को priority वा spending pattern मा उल्लेखनीय shift

═══════════════════════════════════════════════════════════════
SECTORS — exact Nepali names use गर्नुहोस्
═══════════════════════════════════════════════════════════════

शिक्षा | स्वास्थ्य | कृषि | रोजगार | युवा | पूर्वाधार | ऊर्जा | यातायात
पर्यटन | उद्योग | सामाजिक सुरक्षा | प्रदेश/स्थानीय | कर/राजस्व | ऋण/घाटा
सुशासन | डिजिटल/प्रविधि | अन्य

═══════════════════════════════════════════════════════════════
COMPARISON STATUS — गत वर्ष सँग तुलना
═══════════════════════════════════════════════════════════════

new       — यो वर्ष पहिलो पटक
continued — गत वर्ष जस्तै, unchanged
increased — बढेको (amount वा priority)
decreased — घटेको
removed   — गत वर्ष थियो, यो वर्ष छैन
repeated  — verbatim same promise दोहोरिएको
unknown   — गत वर्षको data उपलब्ध छैन

═══════════════════════════════════════════════════════════════
RETURN FORMAT — strict JSON
═══════════════════════════════════════════════════════════════

{
  "fiscalYear": "${body.fiscalYear}",
  "nepaliYear": ${body.nepaliYear},
  "totalPages": 180,
  "recordCount": 45,
  "records": [
    {
      "atomType": "budget_allocation",
      "sector": "शिक्षा",
      "ministry": "Ministry of Education, Science and Technology",
      "pageNumber": 14,
      "textEvidence": "verbatim quote from page 14 (max 300 chars)",
      "amount": 250000000000,
      "amountPrevYear": 220000000000,
      "unit": "rupees",
      "geoScope": "national",
      "province": null,
      "targetGroup": "students",
      "comparisonStatus": "increased",
      "previousYearReference": "Education received Rs 220 arba last year",
      "summaryNepali": "शिक्षा क्षेत्रमा यो वर्ष रु. २ खर्ब ५० अर्ब विनियोजन भयो, गत वर्ष भन्दा ३० अर्ब बढी।",
      "citizenMeaningNepali": "यसले विद्यार्थीका लागि थप छात्रवृत्ति र विद्यालय भवन निर्माणको अवसर ल्याउँछ।",
      "confidence": 0.95,
      "actorName": null,
      "actorRole": null,
      "actorInstitution": null,
      "relatedMovement": null,
      "beforeAfterContext": null
    }
  ]
}

Minimum 20 atoms, maximum 100 atoms।
Focus on: specific figures, named programs, trackable promises, sector allocations।
Prioritize: amounts with evidence, year-to-year comparisons, citizen impact।`;
}

function validateRecords(records: EconomicRecord[]): EconomicRecord[] {
  const valid = records.filter(r => {
    if (!r.pageNumber || r.pageNumber < 1) return false;
    if (!r.textEvidence || r.textEvidence.trim().length < 10) return false;
    if (!r.summaryNepali || r.summaryNepali.trim().length < 5) return false;
    if (!r.atomType || !r.sector) return false;
    return true;
  });

  const seen = new Set<string>();
  return valid.filter(r => {
    const key = r.summaryNepali.trim().toLowerCase().slice(0, 60);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── Shared: fetch PDF from R2 or URL ─────────────────────────────────────────

async function fetchPdf(body: EconomyRequest, env: Env): Promise<{ buf: ArrayBuffer; sizeBytes: number }> {
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

async function runEconomyBackground(
  body: EconomyRequest,
  idToken: string,
  env: Env,
  prompt: string,
): Promise<void> {
  const now = new Date().toISOString();

  await firestoreSet(idToken, "economy_extraction_jobs", body.docId, {
    ownerId:    body.ownerId,
    docId:      body.docId,
    docTitle:   body.docTitle,
    fiscalYear: body.fiscalYear,
    nepaliYear: body.nepaliYear,
    docType:    body.docType,
    status:     "processing",
    startedAt:  now,
  }).catch(e => log("economy-extract", "job_init_error", { docId: body.docId, err: String(e).slice(0, 100) }));

  try {
    const { buf, sizeBytes } = await fetchPdf(body, env);
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeMB > 20) {
      throw new Error(`PDF too large (${sizeMB.toFixed(1)} MB, max 20 MB)`);
    }

    const base64 = toBase64(buf);
    log("economy-extract", "bg_pdf_fetched", { docId: body.docId, sizeMB: sizeMB.toFixed(2) });

    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY!,
      model:     env.GEMINI_MODEL,
      system:    "You are Nepal Economic Intelligence AI. Return ONLY valid JSON. Every record MUST have pageNumber and textEvidence. No markdown. No code fences. Start with { end with }.",
      parts: [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: prompt },
      ],
      maxTokens: 32768,
    });

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
      throw new Error(`AI response was not valid JSON. Preview: "${responseText.slice(0, 200)}"`);
    }

    const data = parsed as { records: EconomicRecord[]; totalPages?: number };
    if (!Array.isArray(data.records)) throw new Error("AI returned no records array");

    const validated = validateRecords(data.records);
    const rejected  = data.records.length - validated.length;

    if (validated.length === 0) {
      throw new Error("No valid economic records — all missing pageNumber or textEvidence");
    }

    log("economy-extract", "bg_extraction_done", {
      docId: body.docId, total: data.records.length, valid: validated.length, rejected,
    });

    // Write atoms to economy_atoms
    const savePromises = validated.map(r => {
      const atom: Record<string, unknown> = {
        province:            null,
        actorName:           null,
        actorRole:           null,
        actorInstitution:    null,
        relatedMovement:     null,
        beforeAfterContext:  null,
        ...r,
        textEvidence:        r.textEvidence.slice(0, 400),
        summaryNepali:       r.summaryNepali || "",
        citizenMeaningNepali: r.citizenMeaningNepali || "",
        geoScope:            r.geoScope || "national",
        comparisonStatus:    r.comparisonStatus || "unknown",
        confidence:          Math.min(1, Math.max(0, r.confidence ?? 0.7)),
        ownerId:             body.ownerId,
        sourceDocumentId:    body.docId,
        sourceDocTitle:      body.docTitle,
        sourceDocType:       body.docType,
        fiscalYear:          body.fiscalYear,
        nepaliYear:          body.nepaliYear,
        periodType:          "annual",
        verificationStatus:  "ai_extracted",
        publishedToPublic:   false,
        createdAt:           now,
        updatedAt:           now,
      };
      return firestoreAdd(idToken, "economy_atoms", atom);
    });
    await Promise.all(savePromises);

    // Audit log
    await firestoreAdd(idToken, "economy_extraction_logs", {
      ownerId:         body.ownerId,
      docId:           body.docId,
      docTitle:        body.docTitle,
      fiscalYear:      body.fiscalYear,
      nepaliYear:      body.nepaliYear,
      docType:         body.docType,
      recordsSaved:    validated.length,
      recordsRejected: rejected,
      fileSizeBytes:   sizeBytes,
      pageCount:       body.pageCount ?? null,
      runAt:           now,
    }).catch(() => {});

    // Mark complete — frontend onSnapshot fires
    await firestoreSet(idToken, "economy_extraction_jobs", body.docId, {
      ownerId:         body.ownerId,
      docId:           body.docId,
      docTitle:        body.docTitle,
      fiscalYear:      body.fiscalYear,
      nepaliYear:      body.nepaliYear,
      docType:         body.docType,
      status:          "complete",
      recordsSaved:    validated.length,
      recordsRejected: rejected,
      startedAt:       now,
      completedAt:     new Date().toISOString(),
    });

    log("economy-extract", "bg_complete", { docId: body.docId, saved: validated.length });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("economy-extract", "bg_error", { docId: body.docId, err: msg.slice(0, 200) });

    await firestoreSet(idToken, "economy_extraction_jobs", body.docId, {
      ownerId:     body.ownerId,
      docId:       body.docId,
      status:      "error",
      errorMsg:    msg.slice(0, 300),
      startedAt:   now,
      completedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

// ── Sync fallback (no token) ──────────────────────────────────────────────────

async function runEconomySync(
  body: EconomyRequest,
  env: Env,
  prompt: string,
): Promise<Response> {
  let base64: string;
  let sizeBytes = 0;

  try {
    const { buf, sizeBytes: sz } = await fetchPdf(body, env);
    sizeBytes = sz;
    if (sizeBytes / 1024 / 1024 > 20) {
      return clientError(`PDF too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB)`, 413, "PDF_TOO_LARGE");
    }
    base64 = toBase64(buf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return clientError(`PDF fetch failed: ${msg}`, 500, "PDF_FETCH_ERROR");
  }

  try {
    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY!,
      model:     env.GEMINI_MODEL,
      system:    "You are Nepal Economic Intelligence AI. Return ONLY valid JSON. No markdown. Start with { end with }.",
      parts: [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: prompt },
      ],
      maxTokens: 32768,
    });

    let responseText = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const [parsed, parseErr] = extractJson(responseText);
    if (parseErr || !parsed) {
      return clientError(`AI response invalid JSON: "${responseText.slice(0, 200)}"`, 422, "PARSE_ERROR");
    }

    const data = parsed as { records: EconomicRecord[] };
    if (!Array.isArray(data.records)) return clientError("No records array", 422, "NO_RECORDS");

    const validated = validateRecords(data.records);
    if (validated.length === 0) return clientError("No valid records", 422, "NO_VALID_RECORDS");

    return new Response(
      JSON.stringify({ ok: true, status: "complete", records: validated, totalFound: validated.length, sizeBytes }),
      { headers: CORS },
    );

  } catch (err) {
    if (err instanceof GeminiCallError) {
      return clientError(`Gemini error: ${err.message.slice(0, 200)}`, err.statusCode ?? 500, "GEMINI_ERROR");
    }
    const msg = err instanceof Error ? err.message : String(err);
    return clientError(`Extraction failed: ${msg}`, 500, "EXTRACTION_ERROR");
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const env = context.env;

  if (!env.GEMINI_API_KEY?.trim()) {
    return clientError("Economy extraction requires GEMINI_API_KEY.", 503, "NO_GEMINI");
  }

  let body: EconomyRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.docId || !body.ownerId || !body.downloadUrl || !body.docTitle || !body.fiscalYear) {
    return clientError("docId, ownerId, downloadUrl, docTitle, fiscalYear required", 400, "VALIDATION_ERROR");
  }

  if (!body.nepaliYear || body.nepaliYear < 2000) {
    return clientError("nepaliYear must be a valid Nepali BS year (e.g. 2081)", 400, "INVALID_YEAR");
  }

  const isPdf =
    (body.mimeType ?? "").includes("pdf") ||
    (body.downloadUrl ?? "").toLowerCase().includes(".pdf");
  if (!isPdf) {
    return clientError("Economy extraction requires a PDF document.", 400, "PDF_REQUIRED");
  }

  const prompt = buildEconomyPrompt(body);
  const authHeader = context.request.headers.get("Authorization") ?? "";
  const idToken    = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";

  log("economy-extract", "start", {
    docId: body.docId, title: body.docTitle.slice(0, 60),
    fiscalYear: body.fiscalYear, mode: idToken ? "background" : "sync",
  });

  if (idToken) {
    context.waitUntil(runEconomyBackground(body, idToken, env, prompt));
    return new Response(
      JSON.stringify({ ok: true, status: "processing", docId: body.docId }),
      { headers: CORS },
    );
  }

  return runEconomySync(body, env, prompt);
};
