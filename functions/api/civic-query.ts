/**
 * POST /api/civic-query
 *
 * The citizen query engine — the public interface of Nepal's civic intelligence system.
 *
 * Citizens ask questions in Nepali. The engine answers ONLY from structured,
 * traceable intelligence records — never from hallucination, never from summaries.
 *
 * This is the promise: every answer is backed by a real government document.
 * Citizens can always ask: "यो कुरा कहाँ लेखिएको थियो?" — and see the source.
 *
 * Input:  { question, records: CompactRecord[], locale?: "ne" | "en" }
 * Output: { ok, answer, keyFacts, citedTitles, recordIds, confidence, disclaimer }
 *
 * The client pre-filters records before sending (by keyword or sector) to keep
 * the prompt focused. Only the relevant subset arrives here.
 */

import { callGemini } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, internalError } from "./_shared";

interface Env { GEMINI_API_KEY: string; }
interface PagesContext { request: Request; env: Env; }

interface CompactRecord {
  id:              string;
  type:            string;
  title:           string;
  titleNepali:     string;
  summaryNepali:   string;
  sector:          string;
  ministry:        string;
  target?:         string;
  timeline?:       string;
  budgetAmount?:   string;
  fiscalYear?:     string;
  sourceDocTitle?: string;
  implementationStatus?: string;
  confidence?:     number;
}

interface QueryRequest {
  question: string;
  records:  CompactRecord[];
  locale?:  "ne" | "en";
}

interface QueryResponse {
  answer:       string;
  keyFacts:     string[];
  citedTitles:  string[];
  recordIds:    string[];
  confidence:   number;
  disclaimer:   string;
}

function buildPrompt(body: QueryRequest): string {
  const compact = body.records.slice(0, 40).map(r => ({
    id:       r.id,
    type:     r.type,
    title:    r.title,
    nepali:   r.titleNepali,
    summary:  r.summaryNepali,
    sector:   r.sector,
    ministry: r.ministry,
    ...(r.target       ? { target:    r.target       } : {}),
    ...(r.timeline     ? { timeline:  r.timeline     } : {}),
    ...(r.budgetAmount ? { budget:    r.budgetAmount } : {}),
    ...(r.fiscalYear   ? { fiscal:    r.fiscalYear   } : {}),
    ...(r.sourceDocTitle ? { source:  r.sourceDocTitle } : {}),
    status:   r.implementationStatus ?? "announced",
  }));

  return `तपाईं ZZC Janta को citizen intelligence engine हुनुहुन्छ।
नागरिकको प्रश्नको जवाफ ONLY REAL STRUCTURED RECORDS बाट दिनुस्।

CITIZEN QUESTION: "${body.question}"

STRUCTURED RECORDS (real government data):
${JSON.stringify(compact, null, 2)}

CRITICAL RULES:
1. ONLY use information from the structured records above
2. NEVER hallucinate — यदि records मा जानकारी छैन भने clearly भन्नुस्
3. NEVER invent numbers, dates, or ministry names
4. Every claim must be traceable to a specific record ID
5. यदि प्रश्न नेपालीमा छ भने नेपालीमा जवाफ दिनुस्
6. Be specific — use exact numbers, fiscal years, ministries from records
7. यदि records ले प्रश्नको जवाफ दिँदैन भने: "उपलब्ध records मा यो जानकारी भेटिएन।"

Answer format:
- answer: direct response to the question (2-4 sentences in Nepali)
- keyFacts: 3-5 specific facts from records (exact numbers preferred)
- citedTitles: record titles you used to answer
- recordIds: IDs of records you cited (from the "id" field above)
- confidence: 0.0-1.0 based on how well records answer the question
- disclaimer: standard source disclaimer (Nepali)

Return ONLY valid JSON:
{
  "answer": "...",
  "keyFacts": ["...", "..."],
  "citedTitles": ["...", "..."],
  "recordIds": ["...", "..."],
  "confidence": 0.8,
  "disclaimer": "यो जानकारी AI ले Nepal सरकारका official documents बाट निकालेको हो। original document verify गर्नुस्।"
}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  if (!context.env.GEMINI_API_KEY) {
    return clientError("GEMINI_API_KEY not configured", 503, "NO_PROVIDERS");
  }

  let body: QueryRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.question?.trim()) {
    return clientError("question required", 400, "VALIDATION_ERROR");
  }
  if (!body.records?.length) {
    return new Response(
      JSON.stringify({
        ok:          true,
        answer:      "यस विषयमा कुनै structured records उपलब्ध छैन। थप documents analyze गरेपछि जवाफ दिन सकिन्छ।",
        keyFacts:    [],
        citedTitles: [],
        recordIds:   [],
        confidence:  0,
        disclaimer:  "ZZC Janta — structured government intelligence",
      }),
      { headers: CORS },
    );
  }

  log("civic-query", "start", {
    questionLength: body.question.length,
    recordCount:    body.records.length,
  });

  try {
    const result = await callGemini({
      apiKey:    context.env.GEMINI_API_KEY,
      system:    "You are ZZC Janta's citizen intelligence engine for Nepal. Answer questions ONLY from structured government records — never hallucinate. Every answer must be traceable to real data. Return only valid JSON.",
      parts:     [{ text: buildPrompt(body) }],
      maxTokens: 2048,
      jsonMode:  true,
    });

    const [parsed, parseErr] = extractJson(result.text);
    if (parseErr || !parsed) {
      log("civic-query", "parse_error", { preview: result.text.slice(0, 200) });
      return new Response(
        JSON.stringify({
          ok:          true,
          answer:      "प्रश्नको जवाफ generate गर्न सकिएन। फेरि try गर्नुस्।",
          keyFacts:    [],
          citedTitles: [],
          recordIds:   [],
          confidence:  0,
          disclaimer:  "",
        }),
        { headers: CORS },
      );
    }

    const data = parsed as QueryResponse;

    log("civic-query", "ok", {
      confidence: data.confidence,
      cited:      data.recordIds?.length ?? 0,
      model:      result.model,
    });

    return new Response(
      JSON.stringify({ ok: true, ...data }),
      { headers: CORS },
    );

  } catch (err) {
    log("civic-query", "error", { err: String(err) });
    return internalError(err);
  }
};
