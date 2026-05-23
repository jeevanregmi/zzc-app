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
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are extracting Nepal's Constitution (2015/2072 BS) as a structured constitutional knowledge graph.
You are building the ROOT SEMANTIC FRAMEWORK for a civic intelligence system.
Return ONLY valid JSON. Start with { end with }. No markdown. No code fences. No extra fields.`;

function buildPrompt(docTitle: string): string {
  return `Extract the 25 most foundational constitutional provisions from: "${docTitle}"

PRIORITY ORDER — extract in this order:
1. Fundamental Rights (Part 3, Articles 16–46) — pick the 15 most important (equality, freedom, life, education, health, labour, women, children, dalits, property, religion, privacy, justice)
2. Directive Principles (Part 4, Article 51) — pick 4 most important clauses
3. Key State Institutions — President, Parliament, Supreme Court (3 records)
4. Federal Structure — federal/provincial/local power division (3 records)

For each article, ONE record. Keep all text SHORT and compact.

RULES — STRICT:
- "originalText": max 150 chars verbatim
- "plainNepaliSummary": max 50 chars
- ALL array fields: max 4 items each, max 30 chars per item
- "articleId": "art-{article}" or "art-{article}-{clause}" e.g. "art-18", "art-51-j"
- "confidence": 0.0–1.0

Return ONLY valid JSON:
{
  "records": [
    {
      "articleId": "art-18",
      "part": "Part 3 — Fundamental Rights",
      "partNumber": 3,
      "article": 18,
      "clause": null,
      "titleEnglish": "Right to Equality",
      "titleNepali": "समानताको हक",
      "originalText": "All citizens shall be equal before the law. No discrimination shall be made in the application of general laws on grounds of origin...",
      "plainNepaliSummary": "सबै नागरिक कानुनको अगाडि बराबर छन्।",
      "rights": ["equality before law", "non-discrimination"],
      "duties": [],
      "obligations": ["State shall not discriminate on grounds of origin, religion, race, caste, sex"],
      "institutions": [],
      "governanceStructures": ["federal"],
      "sectors": ["governance", "human rights"],
      "affectedGroups": ["all citizens", "women", "dalits", "marginalized groups"],
      "keywords": ["equality", "discrimination", "law", "citizens"],
      "relatedArticles": ["art-40", "art-42"],
      "constitutionalThemes": ["fundamental rights", "equality", "non-discrimination"],
      "sourcePage": 12,
      "confidence": 0.95
    }
  ],
  "totalArticlesInConstitution": 308,
  "partsExtracted": ["Part 3 — Fundamental Rights", "Part 4 — Directive Principles"],
  "summaryNote": "one English sentence about what was extracted"
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

function normalizeRecord(r: RawRecord, docId: string, docTitle: string, ownerId: string, now: string) {
  const article = typeof r.article === "number" ? r.article : parseInt(String(r.article ?? "0"), 10);
  const clause  = r.clause != null && r.clause !== "" ? String(r.clause) : null;
  const articleId = (typeof r.articleId === "string" && r.articleId.trim())
    ? r.articleId.trim()
    : `art-${article}${clause ? `-${clause.replace(/[^a-z0-9]/gi, "-")}` : ""}`;

  return {
    articleId,
    part:                  String(r.part               ?? "").slice(0, 100),
    partNumber:            typeof r.partNumber === "number" ? r.partNumber : parseInt(String(r.partNumber ?? "0"), 10),
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

    if (!env.GEMINI_API_KEY?.trim()) {
      return providerError("GEMINI_API_KEY not configured in Cloudflare Pages env vars", "CONFIG_ERROR");
    }

    log("extract-constitution", "start", { docId: body.documentId, mimeType: body.mimeType });

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
          { text: buildPrompt(body.docTitle || "Nepal Constitution 2015") },
        ],
        maxTokens: 24576,
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

    const [parsed, parseErr] = extractJson<{ records?: unknown[]; summaryNote?: string; partsExtracted?: string[]; totalArticlesInConstitution?: number }>(text);
    if (parseErr || !parsed) {
      log("extract-constitution", "parse_error", { docId: body.documentId, len: text.length, err: parseErr ?? "null" });
      return providerError(
        `AI response could not be parsed as constitutional framework JSON.`,
        "PARSE_ERROR",
        `Response length: ${text.length}. ${parseErr ?? ""}`,
      );
    }

    if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
      return providerError("AI returned no constitutional framework records.", "NO_RECORDS");
    }

    // ── Normalize records ──────────────────────────────────────────────────────
    const now     = new Date().toISOString();
    const records = (parsed.records as RawRecord[]).map(r =>
      normalizeRecord(r, body.documentId, body.docTitle, body.ownerId, now)
    );

    log("extract-constitution", "records_ready", {
      docId:   body.documentId,
      count:   records.length,
      parts:   parsed.partsExtracted ?? [],
    });

    return new Response(JSON.stringify({
      ok:           true,
      count:        records.length,
      records,
      partsExtracted:              parsed.partsExtracted ?? [],
      totalArticlesInConstitution: parsed.totalArticlesInConstitution ?? null,
      summaryNote:                 parsed.summaryNote ?? "",
    }), { status: 200, headers: CORS });

  } catch (err) {
    return internalError(err);
  }
};
