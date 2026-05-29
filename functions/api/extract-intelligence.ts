/**
 * POST /api/extract-intelligence
 *
 * Exhaustive deep extraction of ALL structured intelligence records from
 * a government document — this is not summarization, it is structured
 * civic knowledge extraction for Nepal's national memory graph.
 *
 * Each extracted record is a permanent, traceable, cross-linkable node
 * with full audit trail (sourceQuote, rawParagraph, extractionReasoning).
 *
 * Multi-channel provider strategy (fail-over, not parallel):
 *   PDF path:   Gemini inline PDF (only provider that supports it)
 *               → on any failure, falls through to text chunking if body.text available
 *   Text path:  routeTextPrompt → Gemini 2.0-flash → Bedrock → Anthropic
 *               Gemini 2.0-flash preferred over 2.5-flash: more stable JSON output.
 *
 * Multi-chunk strategy: up to 4 × 14,000 chars = 56,000 chars coverage.
 * Up to 60 records per chunk → 100–500+ records per document.
 *
 * Input:  { text, docTitle, docType, sourceYear, fiscalYear, ownerId, docId }
 * Output: { ok, records[], totalFound, chunkCount, docSummary }
 */

import { callGemini, GeminiCallError }            from "../../lib/ai/providers/gemini";
import { routeTextPrompt }                         from "../../lib/ai/vault-router";
import type { RouterEnv }                          from "../../lib/ai/vault-router";
import { CORS, extractJson, log, clientError, providerError, internalError } from "./_shared";
import type { R2Bucket }                           from "@cloudflare/workers-types";

interface Env {
  GEMINI_API_KEY?:        string;
  GEMINI_MODEL?:          string;
  AWS_ACCESS_KEY_ID?:     string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:            string;
  BEDROCK_MODEL_ID?:      string;
  ANTHROPIC_API_KEY?:     string;
  VAULT_BUCKET?:          R2Bucket;
}
interface PagesContext { request: Request; env: Env; }

interface ExtractRequest {
  text?:        string;       // optional — used when full text is available from Firestore
  downloadUrl?: string;       // R2 URL to re-fetch original PDF for direct Gemini analysis
  mimeType?:    string;       // mime type of the file at downloadUrl
  docTitle:     string;
  docType?:     string;
  sourceYear?:  string;
  fiscalYear?:  string;
  ownerId:      string;
  docId:        string;
  domain?:      string;
}

interface ExtractedRecord {
  type:          string;
  title:         string;
  titleNepali:   string;
  summaryNepali: string;
  sector:        string;
  ministry:      string;
  department?:   string;
  target?:       string;
  measurable:    boolean;
  timeline?:     string;
  budgetAmount?: string;
  fiscalYear?:   string;
  geoScope:      string;
  governmentLevel: string;
  sourceSection?: string;
  tags:          string[];
  confidence:    number;
  affectedGroups:  string[];
  affectedSectors: string[];
  traceability: {
    sourceQuote:         string;
    rawParagraph:        string;
    extractionReasoning: string;
  };
}

const CHUNK_SIZE  = 14000;
const MAX_CHUNKS  = 4;
const OVERLAP     = 400;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < MAX_CHUNKS) {
    chunks.push(text.slice(start, start + CHUNK_SIZE));
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

function buildPrompt(body: ExtractRequest, chunk: string, n: number, total: number): string {
  return `तपाईं ZZC Janta को deep civic intelligence AI हुनुहुन्छ।
Nepal सरकारको document बाट EXHAUSTIVE structured intelligence records निकाल्नुस्।

Document: "${body.docTitle}"
Type: ${body.docType ?? "government document"}
Fiscal Year: ${body.fiscalYear ?? body.sourceYear ?? "unknown"}
Section: Chunk ${n} of ${total} (analyze this section completely)

---
${chunk}
---

यो section बाट सबै SPECIFIC, TRACKABLE items निकाल्नुस्।
हरेक budget line, project, institution, target, reform, program — NOTHING छाड्नुस्।

RECORD TYPES:
- "promise": government commitment/वाचा with specific accountability
- "budget_target": financial allocation with amount/बजेट विनियोजन
- "project": infrastructure or development project/परियोजना
- "institution": new body, committee, authority, board/निकाय सिर्जना
- "employment_target": job creation with numerical target/रोजगारी लक्ष्य
- "social_program": welfare, subsidy, benefit scheme/सामाजिक कार्यक्रम
- "reform": policy, law, regulation change/नीतिगत वा कानुनी सुधार
- "digital_policy": technology, digitalization, e-governance/डिजिटल
- "financial_inclusion": banking, insurance, credit access/वित्तीय पहुँच
- "other": any other specific trackable civic commitment

REQUIRED FIELDS FOR EACH RECORD:
- type: from the list above
- title: concise English (5-10 words)
- titleNepali: छोटो नेपाली शीर्षक (५-१० शब्द)
- summaryNepali: नागरिकले बुझ्ने १-२ वाक्य
- sector: "education"|"health"|"agriculture"|"energy"|"infrastructure"|"employment"|"social"|"finance"|"governance"|"environment"|"tourism"|"industry"|"water"|"transport"|"other"
- ministry: exact ministry/body name from document (Nepali or English)
- department: specific department if mentioned, null otherwise
- target: exact number/metric/outcome stated — null if not present
- measurable: true only if evidence could verify this, false for vague
- timeline: exact deadline/fiscal year from document — null if not stated
- budgetAmount: "रु. X करोड" or "रु. X अर्ब" — null if not stated
- fiscalYear: fiscal year this applies to (e.g. "2083/84") — null if not clear
- geoScope: "national"|"provincial"|"district"|"municipality"|"ward"
- governmentLevel: "federal"|"provincial"|"local"
- sourceSection: which section/chapter/paragraph this came from (brief)
- tags: array of 3-6 searchable Nepali/English tags
- confidence: 0.0-1.0 (how specific and trackable — near 1.0 needs number+timeline+ministry)
- affectedGroups: Nepali citizen groups ["युवा", "कृषक", "महिला", "दलित", "उद्यमी", "किसान", ...]
- affectedSectors: ["agriculture", "education", "energy", "health", "infrastructure", ...]
- traceability:
  - sourceQuote: exact or near-exact quote from the text above (max 200 chars)
  - rawParagraph: the full paragraph this item was extracted from (max 400 chars)
  - extractionReasoning: why this is a specific trackable civic item (max 100 chars)

STRICT RULES:
- Maximum 60 records per section
- NEVER include vague aspirational statements — only specific trackable items
- NEVER repeat items that say the same thing in different words
- DO NOT set status — system will set "announced" automatically
- Every record must have sourceQuote showing where in the text it came from

Return ONLY valid JSON (no markdown, no explanation):
{
  "records": [
    {
      "type": "budget_target",
      "title": "School Internet Expansion",
      "titleNepali": "विद्यालय इन्टरनेट विस्तार",
      "summaryNepali": "१०,००० विद्यालयमा इन्टरनेट पुर्‍याइनेछ।",
      "sector": "education",
      "ministry": "शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय",
      "department": null,
      "target": "10000 schools",
      "measurable": true,
      "timeline": "२०८३/८४",
      "budgetAmount": "रु. ५ अर्ब",
      "fiscalYear": "2083/84",
      "geoScope": "national",
      "governmentLevel": "federal",
      "sourceSection": "Section 3, Digital Economy",
      "tags": ["internet", "school", "education", "digitalization", "विद्यालय"],
      "confidence": 0.95,
      "affectedGroups": ["विद्यार्थी", "शिक्षक"],
      "affectedSectors": ["education", "digitalization"],
      "traceability": {
        "sourceQuote": "१०,००० विद्यालयमा इन्टरनेट सेवा विस्तार गरी...",
        "rawParagraph": "डिजिटल शिक्षाका लागि चालु आर्थिक वर्षमा...",
        "extractionReasoning": "Specific target (10000) with fiscal year and ministry"
      }
    }
  ],
  "sectionSummary": "what types of commitments this section primarily contains"
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

function deduplicateRecords(records: ExtractedRecord[]): ExtractedRecord[] {
  const seen = new Set<string>();
  return records.filter(r => {
    const key = normalizeTitle(r.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

type PdfAttemptResult =
  | { ok: true;  response: Response }
  | { ok: false; msg: string };

async function extractFromPdf(
  context: PagesContext,
  body:    ExtractRequest,
  domain:  string,
): Promise<PdfAttemptResult> {
  log("extract-intelligence", "pdf_direct", { docId: body.docId });

  let base64: string;
  try {
    let r2Key = "";
    try { r2Key = new URL(body.downloadUrl!).searchParams.get("key") ?? ""; } catch { /* ignored */ }
    let buf: ArrayBuffer;
    if (r2Key && context.env.VAULT_BUCKET) {
      const obj = await context.env.VAULT_BUCKET.get(r2Key);
      if (!obj) throw new Error(`Document not found in R2: ${r2Key}`);
      buf = await obj.arrayBuffer();
    } else {
      const abort = new AbortController();
      const tid   = setTimeout(() => abort.abort(), 20_000);
      let res: Response;
      try { res = await fetch(body.downloadUrl!, { signal: abort.signal }); }
      finally { clearTimeout(tid); }
      if (!res.ok) throw new Error(`PDF fetch failed: HTTP ${res.status} from ${body.downloadUrl!.slice(0, 80)}`);
      buf = await res.arrayBuffer();
    }
    const sizeMB = buf.byteLength / 1024 / 1024;
    if (sizeMB > 15) {
      log("extract-intelligence", "pdf_too_large", { docId: body.docId, sizeMB: sizeMB.toFixed(1) });
      return { ok: false, msg: `PDF too large for direct extraction (${sizeMB.toFixed(1)} MB). Gemini inline limit is 15 MB.` };
    }
    base64 = toBase64(buf);
  } catch (err) {
    log("extract-intelligence", "pdf_fetch_error", { docId: body.docId, err: String(err).slice(0, 200) });
    return { ok: false, msg: err instanceof Error ? err.message : String(err) };
  }

  const prompt = `Extract the 30 most specific, trackable records from: "${body.docTitle}".

PRIORITY: items with exact numbers, amounts (NPR), percentages, dates, named targets.
SKIP: vague or aspirational statements without specific data.

Return ONLY valid JSON — start with { end with } — no markdown, no code fences:
{
  "records": [
    {
      "type": "budget_target|promise|project|institution|reform|social_program|employment_target|financial_inclusion|other",
      "title": "concise English title (5-8 words)",
      "titleNepali": "छोटो नेपाली शीर्षक",
      "sector": "education|health|agriculture|infrastructure|energy|finance|governance|youth|other",
      "ministry": "ministry name",
      "target": "exact figure from doc or null",
      "confidence": 0.9,
      "sourceQuote": "verbatim quote from doc (max 60 chars)"
    }
  ],
  "sectionSummary": "one English sentence"
}`;

  try {
    const result = await callGemini({
      apiKey:    context.env.GEMINI_API_KEY!,
      system:    "You are Nepal's civic intelligence extraction engine. Return ONLY valid JSON. Start with { end with }. No markdown. No code fences. No extra fields beyond the schema. NEVER include summaryNepali.",
      parts:     [
        { inline_data: { mime_type: "application/pdf", data: base64 } },
        { text: prompt },
      ],
      maxTokens: 16384,
    });

    let responseText = result.text.trim();
    responseText = responseText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
    // Fix literal newlines inside string values
    { let inStr = false, esc = false, fixed = "";
      for (const c of responseText) {
        if (esc)                        { fixed += c; esc = false; }
        else if (c === "\\" && inStr)   { fixed += c; esc = true;  }
        else if (c === '"')             { fixed += c; inStr = !inStr; }
        else if (inStr && (c === "\n" || c === "\r")) fixed += " ";
        else                             fixed += c;
      }
      responseText = fixed;
    }

    const [parsed, parseErr] = extractJson(responseText);
    if (parseErr || !parsed) {
      const preview = responseText.slice(0, 200);
      log("extract-intelligence", "pdf_parse_error", { docId: body.docId, textLen: responseText.length, preview });
      return { ok: false, msg: `AI response not JSON (${responseText.length} chars, model: ${result.model}). Preview: "${preview}"` };
    }

    const data = parsed as { records: ExtractedRecord[]; sectionSummary?: string };
    if (!Array.isArray(data.records) || data.records.length === 0) {
      return { ok: false, msg: "AI could not extract structured records from PDF." };
    }

    const records = data.records.map(r => ({ ...r, chunkId: "pdf_direct", domain }));
    records.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

    log("extract-intelligence", "pdf_complete", { docId: body.docId, count: records.length });

    return {
      ok: true,
      response: new Response(
        JSON.stringify({
          ok:         true,
          records,
          totalFound: records.length,
          rawCount:   records.length,
          chunkCount: 1,
          domain,
          docSummary: data.sectionSummary ?? `${records.length} intelligence records extracted from ${body.docTitle}`,
        }),
        { headers: CORS },
      ),
    };
  } catch (err) {
    if (err instanceof GeminiCallError) {
      log("extract-intelligence", "gemini_pdf_error", { docId: body.docId, code: err.code, status: err.statusCode });
    }
    return { ok: false, msg: err instanceof Error ? err.message.slice(0, 200) : String(err) };
  }
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const env = context.env;

  const hasProvider =
    env.GEMINI_API_KEY?.trim() ||
    (env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim() && env.AWS_REGION?.trim()) ||
    env.ANTHROPIC_API_KEY?.trim();

  if (!hasProvider) {
    return clientError(
      "No AI providers configured. Add GEMINI_API_KEY, AWS credentials, or ANTHROPIC_API_KEY in Cloudflare Pages env vars.",
      503,
      "NO_PROVIDERS",
    );
  }

  let body: ExtractRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.docTitle || !body.docId || !body.ownerId) {
    return clientError("docTitle, docId, ownerId required", 400, "VALIDATION_ERROR");
  }
  if (!body.text && !body.downloadUrl) {
    return clientError("text or downloadUrl required", 400, "VALIDATION_ERROR");
  }

  const domain = body.domain ?? "janta";
  const isPdf  = body.mimeType === "application/pdf";

  // ── PDF direct extraction (Gemini inline — best quality when available) ────────
  // Gemini is the only provider that can process inline PDFs. On any failure
  // (parse error, quota, bad_request), fall through to text chunking if body.text
  // is available. This gives: Gemini PDF → Gemini text → Bedrock → Anthropic.
  if (isPdf && body.downloadUrl) {
    if (env.GEMINI_API_KEY?.trim()) {
      const pdfResult = await extractFromPdf(context, body, domain);
      if (pdfResult.ok) return pdfResult.response;

      if (body.text) {
        log("extract-intelligence", "pdf_fallback_text", {
          docId:    body.docId,
          pdfError: pdfResult.msg.slice(0, 100),
        });
        // fall through to text chunking below
      } else {
        return clientError(
          `Intelligence निकाल्न सकिएन: ${pdfResult.msg}`,
          422,
          "NO_RECORDS_EXTRACTED",
        );
      }
    } else if (!body.text) {
      // No Gemini key and no extracted text — cannot proceed
      return clientError(
        "PDF intelligence extraction requires GEMINI_API_KEY. No extracted text available as fallback.",
        422,
        "NO_RECORDS_EXTRACTED",
      );
    }
    // else: no Gemini key but body.text available → fall through to text chunking
  }

  // ── Text chunking — multi-provider: Gemini 2.0-flash → Bedrock → Anthropic ─────
  // gemini-2.0-flash is preferred over 2.5-flash here: more stable structured JSON
  // output for long extraction prompts. Override with GEMINI_MODEL env var if needed.
  const text   = body.text ?? "";
  const chunks = chunkText(text);
  const allRecords: Array<ExtractedRecord & { chunkId: string }> = [];
  const summaries: string[] = [];

  log("extract-intelligence", "start", {
    docId:      body.docId,
    textLength: text.length,
    chunks:     chunks.length,
  });

  const routerEnv: RouterEnv = {
    GEMINI_API_KEY:        env.GEMINI_API_KEY,
    GEMINI_MODEL:          env.GEMINI_MODEL ?? "gemini-2.0-flash",
    AWS_ACCESS_KEY_ID:     env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION:            env.AWS_REGION,
    BEDROCK_MODEL_ID:      env.BEDROCK_MODEL_ID,
    ANTHROPIC_API_KEY:     env.ANTHROPIC_API_KEY,
  };

  const system = "You are a deep civic intelligence AI for Nepal's national governance memory system. Extract ALL structured, traceable civic records from government documents — every budget line, project, institution, target, reform, and program. Return only valid JSON. Be exhaustive and include traceability for every record.";

  for (let i = 0; i < chunks.length; i++) {
    const routeResult = await routeTextPrompt(
      routerEnv,
      system,
      buildPrompt(body, chunks[i], i + 1, chunks.length),
      32768,
    );

    if (!routeResult.ok) {
      log("extract-intelligence", "chunk_route_fail", {
        chunk:  i + 1,
        reason: routeResult.reason,
        err:    routeResult.lastError.slice(0, 200),
      });
      continue;
    }

    const [parsed, parseErr] = extractJson(routeResult.text);
    if (parseErr || !parsed) {
      log("extract-intelligence", "chunk_parse_error", {
        chunk:    i + 1,
        provider: routeResult.provider,
        preview:  routeResult.text.slice(0, 200),
      });
      continue;
    }

    const data = parsed as { records: ExtractedRecord[]; sectionSummary?: string };
    if (Array.isArray(data.records)) {
      for (const r of data.records) {
        allRecords.push({ ...r, chunkId: `chunk_${i + 1}` });
      }
    }
    if (data.sectionSummary) summaries.push(data.sectionSummary);

    log("extract-intelligence", "chunk_ok", {
      chunk:    i + 1,
      records:  data.records?.length ?? 0,
      provider: routeResult.provider,
      model:    routeResult.model,
    });
  }

  if (allRecords.length === 0) {
    return providerError(
      "AI could not extract structured records. Document may lack specific trackable commitments or be in an unsupported format.",
      "NO_RECORDS_EXTRACTED",
    );
  }

  const deduped = deduplicateRecords(allRecords);
  deduped.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));

  log("extract-intelligence", "complete", {
    docId:   body.docId,
    raw:     allRecords.length,
    deduped: deduped.length,
    chunks:  chunks.length,
  });

  return new Response(
    JSON.stringify({
      ok:         true,
      records:    deduped.map(r => ({ ...r, domain })),
      totalFound: deduped.length,
      rawCount:   allRecords.length,
      chunkCount: chunks.length,
      domain,
      docSummary: summaries.join(" | ") || `${deduped.length} intelligence records extracted from ${body.docTitle}`,
    }),
    { headers: CORS },
  );
};
