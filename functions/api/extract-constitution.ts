/**
 * POST /api/extract-constitution
 *
 * Extracts Nepal's Constitution as a structured constitutional framework.
 * Output goes to the `constitutional_framework` Firestore collection —
 * NOT to janta_intelligence — because the Constitution is the ROOT ONTOLOGY
 * of the entire ZZC governance intelligence graph.
 *
 * Schema: ConstitutionalFrameworkRecord (lib/types/constitutional-framework.ts)
 */

import { CORS, clientError, providerError, internalError, log, extractJson } from "./_shared";
import { callGemini, GeminiCallError }                                       from "../../lib/ai/providers/gemini";

interface Env {
  GEMINI_API_KEY?:    string;
  GEMINI_MODEL?:      string;
  ANTHROPIC_API_KEY?: string;
}

interface ExtractConstitutionRequest {
  documentId:    string;
  downloadUrl:   string;
  mimeType:      string;
  docTitle:      string;
  ownerId:       string;
  articleRange:  string; // e.g. "1-28", "29-56" — ARTICLE numbers (not part numbers)
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are extracting Nepal's Constitution (2015/2072 BS) as a structured constitutional knowledge graph.
You are building the ROOT SEMANTIC FRAMEWORK for a civic intelligence system.
Return ONLY valid JSON. Start with { end with }. No markdown. No code fences. No extra fields.`;

function buildPrompt(articleRange: string, docTitle: string): string {
  const [s, e] = articleRange.split("-").map(Number);
  const count  = e - s + 1;
  return `तपाईं नेपालको संविधान २०७२ बाट सम्पूर्ण संवैधानिक ज्ञान निकाल्दै हुनुहुन्छ।

TASK: Extract धारा ${s} देखि धारा ${e} (Articles ${s}–${e}, total ${count} articles) from "${docTitle}".

⚠️  CRITICAL RULE: Extract ALL ${count} articles with धारा numbers ${s} through ${e}. Do NOT skip any.
For articles with खण्ड (sub-clauses), create ONE record per article — combine unless fundamentally distinct rights.

CONSTITUTIONAL TERMINOLOGY (use in all Nepali fields):
- भाग = Part  |  धारा = Article  |  खण्ड = Clause

COMPACT FORMAT (strict — fits all ${count} articles in one response):
- "part": Nepali Devanagari from PDF e.g. "भाग ३ — मौलिक हकहरू"
- "originalText": verbatim from PDF, max 80 chars
- "plainNepaliSummary": rule + constitutional philosophy/spirit, max 50 chars, pure Nepali
- ALL arrays: max 3 items, max 25 chars per item
- "articleId": "art-{number}" — system ID only
- "confidence": 0.0–1.0

Return ONLY valid JSON (ascending धारा number order):
{
  "records": [
    {
      "articleId": "art-18",
      "part": "भाग ३ — मौलिक हकहरू",
      "partNumber": 3,
      "article": 18,
      "clause": null,
      "titleEnglish": "Right to Equality",
      "titleNepali": "समानताको हक",
      "originalText": "सबै नागरिक कानुनको दृष्टिमा समान हुनेछन्।",
      "plainNepaliSummary": "राज्यले भेदभाव गर्न पाउँदैन — समता नै लोकतन्त्रको जग हो।",
      "rights": ["कानुनको समान संरक्षण"],
      "duties": [],
      "obligations": ["राज्यले भेदभाव नगर्ने"],
      "institutions": [],
      "governanceStructures": ["संघीय सरकार"],
      "sectors": ["मानव अधिकार"],
      "affectedGroups": ["सबै नागरिक", "दलित", "महिला"],
      "keywords": ["समानता", "भेदभाव"],
      "relatedArticles": ["art-40", "art-42"],
      "constitutionalThemes": ["मौलिक हक", "समानता"],
      "sourcePage": 12,
      "confidence": 0.95
    }
  ],
  "articleRangeExtracted": "${s}-${e}",
  "summaryNote": "one sentence about this batch"
}`;
}

// ─── PDF fetch + base64 ───────────────────────────────────────────────────────

async function fetchPdfBase64(url: string): Promise<{ base64: string; sizeBytes: number } | { error: string }> {
  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return { error: `Storage fetch failed: HTTP ${res.status}` };
    const buf   = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    if (bytes.length > 18_000_000) return { error: `PDF too large: ${(bytes.length / 1_000_000).toFixed(1)} MB (max 18 MB)` };
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return { base64: btoa(bin), sizeBytes: bytes.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Gemini extraction ────────────────────────────────────────────────────────

interface RawRecord {
  articleId?:            unknown;
  part?:                 unknown;
  partNumber?:           unknown;
  article?:              unknown;
  clause?:               unknown;
  titleEnglish?:         unknown;
  titleNepali?:          unknown;
  originalText?:         unknown;
  plainNepaliSummary?:   unknown;
  rights?:               unknown;
  duties?:               unknown;
  obligations?:          unknown;
  institutions?:         unknown;
  governanceStructures?: unknown;
  sectors?:              unknown;
  affectedGroups?:       unknown;
  keywords?:             unknown;
  relatedArticles?:      unknown;
  constitutionalThemes?: unknown;
  sourcePage?:           unknown;
  confidence?:           unknown;
}

function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter(x => typeof x === "string").map(x => (x as string).slice(0, 60));
}

// Converts Devanagari numerals ("३") or mixed strings ("भाग ३") to an integer.
// parseInt("३", 10) returns NaN — this handles that case correctly.
function devanagariToInt(v: unknown): number {
  if (typeof v === "number") return isNaN(v) ? 0 : Math.floor(v);
  const s = String(v ?? "0")
    .replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966))
    .replace(/[^\d]/g, "");
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function normalizeRecord(r: RawRecord, docId: string, docTitle: string, ownerId: string, now: string) {
  const article = devanagariToInt(r.article);
  const clause  = r.clause != null && r.clause !== "" ? String(r.clause) : null;
  const articleId = (typeof r.articleId === "string" && r.articleId.trim())
    ? r.articleId.trim()
    : `art-${article}${clause ? `-${clause.replace(/[^a-z0-9]/gi, "-")}` : ""}`;

  return {
    articleId,
    part:                  String(r.part               ?? "").slice(0, 100),
    partNumber:            devanagariToInt(r.partNumber),
    article,
    clause,
    titleEnglish:          String(r.titleEnglish        ?? "").slice(0, 120),
    titleNepali:           String(r.titleNepali         ?? "").slice(0, 120),
    originalText:          String(r.originalText        ?? "").slice(0, 300),
    plainNepaliSummary:    String(r.plainNepaliSummary  ?? "").slice(0, 120),
    rights:                toStrArray(r.rights),
    duties:                toStrArray(r.duties),
    obligations:           toStrArray(r.obligations),
    institutions:          toStrArray(r.institutions),
    governanceStructures:  toStrArray(r.governanceStructures),
    sectors:               toStrArray(r.sectors),
    affectedGroups:        toStrArray(r.affectedGroups),
    keywords:              toStrArray(r.keywords),
    relatedArticles:       toStrArray(r.relatedArticles),
    constitutionalThemes:  toStrArray(r.constitutionalThemes),
    sourcePage:            typeof r.sourcePage === "number" ? r.sourcePage : null,
    confidence:            typeof r.confidence === "number" ? Math.min(1, Math.max(0, r.confidence)) : 0.8,
    publishToJanta:        true,
    ownerId,
    sourceDocId:           docId,
    sourceDocTitle:        docTitle,
    createdAt:             now,
    updatedAt:             now,
  };
}

// ─── JSON salvage — recover completed records from a token-truncated response ──
// Gemini cuts the output at maxOutputTokens, leaving the JSON array incomplete.
// This walks the records array bracket-by-bracket and extracts every record that
// closed before the truncation point, so a 65-article batch that truncates at
// article 60 still saves 60 articles rather than 0.

function salvageTruncatedJson(text: string): { records: unknown[]; salvaged: boolean } {
  const recordsKey = text.indexOf('"records"');
  if (recordsKey === -1) return { records: [], salvaged: false };
  const arrayOpen = text.indexOf('[', recordsKey);
  if (arrayOpen === -1) return { records: [], salvaged: false };

  let depth      = 0;
  let inStr      = false;
  let esc        = false;
  const ends: number[] = []; // positions of each depth-0 closing }

  for (let i = arrayOpen + 1; i < text.length; i++) {
    const c = text[i];
    if (esc)                      { esc = false; continue; }
    if (c === "\\" && inStr)      { esc = true;  continue; }
    if (c === '"')                { inStr = !inStr; continue; }
    if (inStr)                    continue;
    if (c === "{")                { depth++; }
    else if (c === "}")           {
      depth--;
      if (depth === 0) ends.push(i); // closed a top-level record in the array
    } else if (c === "]" && depth === 0) break; // normal array end
  }

  if (ends.length === 0) return { records: [], salvaged: false };

  const lastEnd    = ends[ends.length - 1];
  const arraySlice = text.slice(arrayOpen + 1, lastEnd + 1).replace(/,\s*$/, "");
  const repaired   = `{"records":[${arraySlice}],"partsExtracted":[],"summaryNote":"salvaged"}`;

  try {
    const parsed = JSON.parse(repaired) as { records: unknown[] };
    return { records: Array.isArray(parsed.records) ? parsed.records : [], salvaged: true };
  } catch {
    return { records: [], salvaged: false };
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

interface PagesContext { request: Request; env: Env; }

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {

  try {
    const body = await request.json() as ExtractConstitutionRequest;

    if (!body.documentId?.trim())  return clientError("documentId required",  400, "MISSING_FIELD");
    if (!body.downloadUrl?.trim()) return clientError("downloadUrl required",  400, "MISSING_FIELD");
    if (!body.ownerId?.trim())     return clientError("ownerId required",      400, "MISSING_FIELD");
    if (!body.mimeType?.trim())    return clientError("mimeType required",     400, "MISSING_FIELD");
    if (!body.articleRange?.trim()) return clientError("articleRange required", 400, "MISSING_FIELD");

    if (!env.GEMINI_API_KEY?.trim()) {
      return providerError("GEMINI_API_KEY not configured in Cloudflare Pages env vars", "CONFIG_ERROR");
    }

    log("extract-constitution", "start", { docId: body.documentId, mimeType: body.mimeType, articleRange: body.articleRange });

    // ── Fetch PDF ──────────────────────────────────────────────────────────────
    if (body.mimeType !== "application/pdf") {
      return clientError("Constitution must be a PDF file", 400, "NOT_PDF");
    }

    const pdfResult = await fetchPdfBase64(body.downloadUrl);
    if ("error" in pdfResult) {
      return providerError(`PDF fetch failed: ${pdfResult.error}`, "PDF_FETCH_ERROR");
    }

    log("extract-constitution", "pdf_fetched", {
      docId:     body.documentId,
      sizeBytes: pdfResult.sizeBytes,
    });

    // ── Gemini call ────────────────────────────────────────────────────────────
    const model = env.GEMINI_MODEL ?? "gemini-2.5-flash";

    let geminiText: string;
    try {
      const result = await callGemini({
        apiKey:    env.GEMINI_API_KEY!,
        model,
        system:    SYSTEM_PROMPT,
        parts:     [
          { inline_data: { mime_type: "application/pdf", data: pdfResult.base64 } },
          { text: buildPrompt(body.articleRange, body.docTitle || "Nepal Constitution 2015") },
        ],
        maxTokens: 32768,
      });
      geminiText = result.text;
      log("extract-constitution", "gemini_ok", {
        docId:        body.documentId,
        model:        result.model,
        inputTokens:  result.inputTokens,
        outputTokens: result.outputTokens,
        latencyMs:    result.latencyMs,
      });
    } catch (err) {
      if (err instanceof GeminiCallError) {
        if (err.code === "quota_exceeded") return providerError("Gemini quota exhausted. Retry in 60 seconds.", "QUOTA_EXCEEDED");
        if (err.code === "auth")           return providerError("Gemini API key invalid.", "AUTH_ERROR");
        return providerError(`Gemini error: ${err.message}`, "GEMINI_ERROR");
      }
      throw err;
    }

    // ── Parse JSON ─────────────────────────────────────────────────────────────
    // Inline fence-strip + newline sanitizer (Gemini 2.5-flash quirks)
    let text = geminiText.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    { let inStr = false, esc = false, fixed = "";
      for (const c of text) {
        if (esc)                        { fixed += c; esc = false; }
        else if (c === "\\" && inStr)   { fixed += c; esc = true; }
        else if (c === '"')             { fixed += c; inStr = !inStr; }
        else if (inStr && (c === "\n" || c === "\r")) fixed += " ";
        else                             fixed += c;
      }
      text = fixed;
    }

    let parsedRecords: unknown[];
    let partsExtracted: string[] = [];
    let summaryNote = "";
    let wasSalvaged = false;

    const [parsed, parseErr] = extractJson<{ records?: unknown[]; summaryNote?: string; partsExtracted?: string[]; totalArticlesInConstitution?: number }>(text);
    if (parseErr || !parsed || !Array.isArray(parsed.records) || parsed.records.length === 0) {
      // Primary parse failed — attempt salvage of completed records before the truncation point
      const salvage = salvageTruncatedJson(text);
      if (salvage.salvaged && salvage.records.length > 0) {
        log("extract-constitution", "salvaged", {
          docId:     body.documentId,
          count:     salvage.records.length,
          parseErr:  parseErr ?? "no_records",
          textLen:   text.length,
        });
        parsedRecords = salvage.records;
        wasSalvaged   = true;
      } else {
        log("extract-constitution", "parse_error", { docId: body.documentId, len: text.length, err: parseErr ?? "null" });
        return providerError(
          `AI response could not be parsed as constitutional framework JSON.`,
          "PARSE_ERROR",
          `Response length: ${text.length}. ${parseErr ?? ""}`,
        );
      }
    } else {
      parsedRecords  = parsed.records;
      partsExtracted = parsed.partsExtracted ?? [];
      summaryNote    = parsed.summaryNote    ?? "";
    }

    // ── Normalize records ──────────────────────────────────────────────────────
    const now     = new Date().toISOString();
    const records = (parsedRecords as RawRecord[]).map(r =>
      normalizeRecord(r, body.documentId, body.docTitle, body.ownerId, now)
    );

    log("extract-constitution", "records_ready", {
      docId:     body.documentId,
      count:     records.length,
      parts:     partsExtracted,
      salvaged:  wasSalvaged,
    });

    return new Response(JSON.stringify({
      ok:           true,
      count:        records.length,
      records,
      partsExtracted,
      totalArticlesInConstitution: parsed?.totalArticlesInConstitution ?? null,
      summaryNote:  wasSalvaged ? `salvaged ${records.length} records (JSON was truncated — try re-extracting this batch for complete coverage)` : summaryNote,
    }), { status: 200, headers: CORS });

  } catch (err) {
    return internalError(err);
  }
};
