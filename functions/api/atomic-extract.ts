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
 * Every extracted record contains:
 *   - pageNumber  — physical page in the PDF (1-indexed)
 *   - textEvidence — verbatim quoted sentence(s) from that page (max 400 chars)
 *   - paragraphIdx — paragraph position on the page (0-indexed, best-effort)
 *   - extractionTier = "atomic"
 *   - confidence
 *
 * This is NOT summarization. If the AI cannot cite a page and verbatim text,
 * that record is rejected — not saved.
 *
 * GET  /api/atomic-extract?docId=X&pageCount=N  → cost estimate
 * POST /api/atomic-extract                       → run extraction
 *
 * Requires: GEMINI_API_KEY (only Gemini supports inline PDF processing)
 * No text-chunk fallback — page numbers are meaningless without the PDF.
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError } from "./_shared";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:   string;
  VAULT_BUCKET?:   R2Bucket;
}
interface PagesContext { request: Request; env: Env; }

interface AtomicRequest {
  docId:        string;
  ownerId:      string;
  downloadUrl:  string;  // R2 signed URL
  mimeType:     string;  // must be application/pdf or image/*
  docTitle:     string;
  docType?:     string;
  sourceYear?:  string;
  pageCount?:   number;  // if known — used for cost estimate
  domain?:      string;
}

interface AtomicRecord {
  type:          string;
  title:         string;
  titleNepali:   string;
  summaryNepali: string;
  sector:        string;
  ministry:      string;
  department?:   string | null;
  target?:       string | null;
  measurable:    boolean;
  timeline?:     string | null;
  budgetAmount?: string | null;
  fiscalYear?:   string | null;
  geoScope:      string;
  governmentLevel: string;
  constitutionalRefs?: number[];
  tags:          string[];
  confidence:    number;
  affectedGroups:  string[];
  affectedSectors: string[];
  // Tier 2 source trace — all three required for atomic records
  pageNumber:    number;
  textEvidence:  string;
  paragraphIdx?: number;
}

// Cost estimate: 0.15 USD per 100 pages (conservative — includes input + output tokens)
export function estimateCost(pageCount: number): number {
  return Math.max(0.10, Math.ceil(pageCount / 100) * 0.15);
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
  // Reject records without page number or textEvidence
  const valid = records.filter(r => {
    if (!r.pageNumber || r.pageNumber < 1) return false;
    if (!r.textEvidence || r.textEvidence.trim().length < 10) return false;
    if (!r.title || !r.titleNepali) return false;
    return true;
  });

  // Deduplicate by title
  const seen = new Set<string>();
  return valid.filter(r => {
    const key = normalizeTitle(r.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

// ── POST: run atomic extraction ───────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

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

  const isPdf = (body.mimeType ?? "").includes("pdf")
    || (body.downloadUrl ?? "").toLowerCase().includes(".pdf");
  if (!isPdf) {
    return clientError(
      "Atomic extraction currently requires a PDF document. Non-PDF formats do not support page-level source tracing.",
      400,
      "PDF_REQUIRED",
    );
  }

  log("atomic-extract", "start", { docId: body.docId, docTitle: body.docTitle.slice(0, 60) });

  // ── Fetch PDF from R2 ───────────────────────────────────────────────────────
  let base64: string;
  let sizeBytes = 0;
  try {
    let buf: ArrayBuffer;
    // Try R2 direct access first (faster, avoids signed URL expiry)
    let r2Key = "";
    try { r2Key = new URL(body.downloadUrl).searchParams.get("key") ?? ""; } catch { /* ignore */ }

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

    sizeBytes = buf.byteLength;
    const sizeMB = sizeBytes / 1024 / 1024;

    if (sizeMB > 20) {
      return clientError(
        `PDF too large for atomic extraction (${sizeMB.toFixed(1)} MB). Maximum is 20 MB.`,
        413,
        "PDF_TOO_LARGE",
      );
    }

    base64 = toBase64(buf);
    log("atomic-extract", "pdf_fetched", { docId: body.docId, sizeMB: sizeMB.toFixed(2) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("atomic-extract", "pdf_fetch_error", { docId: body.docId, err: msg.slice(0, 200) });
    return clientError(`PDF fetch failed: ${msg}`, 500, "PDF_FETCH_ERROR");
  }

  // ── Send to Gemini with atomic extraction prompt ───────────────────────────
  const prompt = buildAtomicPrompt(body);
  const domain = body.domain ?? "janta";

  try {
    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY!,
      model:     env.GEMINI_MODEL,
      system:    "You are a precision atomic intelligence extractor. Return ONLY valid JSON. Every record MUST have pageNumber and textEvidence. No markdown. No code fences. Start with { end with }.",
      parts:     [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: prompt },
      ],
      maxTokens: 32768,
    });

    let responseText = result.text.trim();
    // Strip markdown code fences if model adds them
    responseText = responseText
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    // Fix literal newlines inside string values
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
      const preview = responseText.slice(0, 300);
      log("atomic-extract", "parse_error", { docId: body.docId, len: responseText.length, preview });
      return clientError(
        `AI response was not valid JSON. Preview: "${preview}"`,
        422,
        "PARSE_ERROR",
      );
    }

    const data = parsed as { records: AtomicRecord[]; totalPages?: number; recordCount?: number };
    if (!Array.isArray(data.records)) {
      return clientError("AI returned no records array", 422, "NO_RECORDS");
    }

    // Validate: every record must have pageNumber + textEvidence
    const validated = validateAndFilter(data.records);
    const rejected  = data.records.length - validated.length;

    if (validated.length === 0) {
      return clientError(
        "AI returned records but none had valid pageNumber + textEvidence. Cannot save as atomic intelligence.",
        422,
        "NO_VALID_ATOMIC_RECORDS",
      );
    }

    log("atomic-extract", "complete", {
      docId:    body.docId,
      total:    data.records.length,
      valid:    validated.length,
      rejected,
    });

    // Tag each record with atomic tier and domain before returning
    const atomicRecords = validated.map(r => ({
      ...r,
      extractionTier: "atomic" as const,
      domain,
      // Clamp textEvidence to 400 chars
      textEvidence: r.textEvidence.slice(0, 400),
      // Normalize confidence
      confidence: Math.min(1, Math.max(0, r.confidence ?? 0.7)),
    }));

    return new Response(
      JSON.stringify({
        ok:           true,
        records:      atomicRecords,
        totalFound:   atomicRecords.length,
        rejected,
        domain,
        extractionTier: "atomic",
        sizeBytes,
        docSummary:   `${atomicRecords.length} atomic intelligence records extracted with page-level source traces from "${body.docTitle}"`,
      }),
      { headers: CORS },
    );

  } catch (err) {
    if (err instanceof GeminiCallError) {
      log("atomic-extract", "gemini_error", {
        docId:  body.docId,
        code:   err.code,
        status: err.statusCode,
      });
      return clientError(
        `Gemini error (${err.statusCode ?? "unknown"}): ${err.message.slice(0, 200)}`,
        err.statusCode ?? 500,
        err.code ?? "GEMINI_ERROR",
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    log("atomic-extract", "unknown_error", { docId: body.docId, err: msg.slice(0, 200) });
    return clientError(`Extraction failed: ${msg}`, 500, "EXTRACTION_ERROR");
  }
};
