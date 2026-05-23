/**
 * POST /api/analyze-chunk
 *
 * Processes ONE text chunk from a large document. The client splits the full
 * OCR/extracted text into chunks, calls this endpoint for each chunk, then
 * merges partial results into a final intelligence record.
 *
 * Why chunked?
 *   Cloudflare Pages Functions have a hard 30-second wall-clock timeout.
 *   Large documents (100-400 pages) take 60-180s to process in one shot.
 *   Solution: client splits text into 20K-char chunks, calls this endpoint
 *   once per chunk, accumulates partial results, merges at the end.
 *
 * Request body:
 *   { text, chunkIndex, totalChunks, docTitle, docType?, ownerId }
 *
 * Response:
 *   { ok: true, partial: ChunkResult, chunkIndex, totalChunks }
 *
 * Merge strategy (client responsibility):
 *   - keyTerms:    concat all chunks, deduplicate
 *   - insights:    concat all, deduplicate
 *   - sectors:     union of all
 *   - summary:     only from chunk 0 (or client assembles from all)
 */

import { callGemini } from "../../lib/ai/providers/gemini";

interface Env { GEMINI_API_KEY: string }
interface PagesContext { request: Request; env: Env }

export interface ChunkRequest {
  text:        string;
  chunkIndex:  number;
  totalChunks: number;
  docTitle:    string;
  docType?:    "policy" | "constitution" | "budget" | "nrb" | "general";
  ownerId:     string;
}

export interface ChunkResult {
  keyTerms:    TermEntry[];
  insights:    string[];
  sectors:     string[];
  summary?:    string;   // only present on chunkIndex === 0
  policyPoints?: PolicyPointDraft[];  // for policy/budget docs
}

export interface TermEntry {
  termNepali:   string;
  termEnglish:  string;
  definition:   string;   // flowing Nepali + English technical terms in ()
  context:      string;   // what this term means in THIS document's context
  sectors:      string[];
  articleRef?:  string;   // for Constitution — "धारा ३२" etc.
}

export interface PolicyPointDraft {
  pointNumber:  number;
  title:        string;
  simpleSummary: string;
  youthImpact:  string;
  keyFact:      string;
  sectors:      string[];
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function buildSystemPrompt(docType: string): string {
  const typeHint = {
    policy:       "Nepal सरकारको नीति तथा कार्यक्रम दस्तावेज",
    constitution: "नेपालको संविधान (२०७२)",
    budget:       "Nepal सरकारको बजेट वक्तव्य",
    nrb:          "Nepal Rastra Bank को परिपत्र वा नीति निर्देशन",
    general:      "Nepal सरकार वा सार्वजनिक नीति सम्बन्धी दस्तावेज",
  }[docType] ?? "सार्वजनिक नीति दस्तावेज";

  return `तपाईं ZZC को civic intelligence expert हुनुहुन्छ। यो ${typeHint} को एउटा section विश्लेषण गर्नुहोस्।

LANGUAGE RULE — सबैभन्दा महत्त्वपूर्ण:
- Primary language: सरल, flowing नेपाली
- Technical/legal terms: नेपाली र English दुवैमा — जस्तै "पुँजी बजार (Capital Market)", "राजस्व (Revenue)", "मौलिक हक (Fundamental Rights)", "कार्यपालिका (Executive)", "न्यायपालिका (Judiciary)", "संघीयता (Federalism)"
- Style: नेपाली वाक्य संरचना, तर technical terms parenthesis मा English पनि

TARGET AUDIENCE: 18-35 वर्षका नेपाली युवा जसले government document को जटिल भाषा बुझ्न गाह्रो हुन्छ।

GOAL: हरेक महत्त्वपूर्ण term को अर्थ, context, र real-life impact सरल भाषामा explain गर्नुहोस्।`;
}

function buildPrompt(req: ChunkRequest): string {
  const isFirst = req.chunkIndex === 0;
  const isConstitution = req.docType === "constitution";
  const isPolicy = req.docType === "policy" || req.docType === "budget";

  return `Document: "${req.docTitle}"
Chunk: ${req.chunkIndex + 1} of ${req.totalChunks}

TEXT TO ANALYZE:
${req.text.slice(0, 22000)}

Return ONLY a JSON object — no markdown, no explanation:

{
  ${isFirst ? `"summary": "यो document को overview — 2-3 वाक्यमा नेपालीमा। key purpose, scope, र impact।",` : ""}
  "keyTerms": [
    {
      "termNepali": "मौलिक हक",
      "termEnglish": "Fundamental Rights",
      "definition": "सरल नेपालीमा: यो term ले के भन्छ — 2 वाक्यमा। जस्तै: 'नागरिकलाई राज्यले दिने आधारभूत अधिकार (Basic Rights) हो जुन कुनै पनि कानुनले खोस्न सक्दैन।'",
      "context": "यस document मा यो term कसरी प्रयोग भएको छ — specific reference सहित",
      "sectors": ["governance", "legal"],
      ${isConstitution ? `"articleRef": "धारा १८ — समानताको हक (Right to Equality)"` : ""}
    }
  ],
  "insights": [
    "यस section को key finding — specific numbers/dates/amounts सहित",
    "finding 2",
    "finding 3"
  ],
  "sectors": ["governance", "economy", "education"],
  ${isPolicy ? `"policyPoints": [
    {
      "pointNumber": 1,
      "title": "सरल नेपालीमा point को नाम (max 8 words)",
      "simpleSummary": "यो point ले के गर्छ — 2-3 वाक्यमा। 'अब सरकारले X गर्नेछ जसले तपाईंलाई Y फाइदा।'",
      "youthImpact": "18-35 वर्षका युवालाई यसले कसरी असर — 1-2 वाक्य, specific।",
      "keyFact": "एउटा specific number, percentage, रकम वा मिति।",
      "sectors": ["banking", "employment"]
    }
  ],` : ""}
  "chunkIndex": ${req.chunkIndex}
}

RULES:
- keyTerms: यस chunk मा भेटिएका सबै important technical/legal/economic terms निकाल्नुहोस् — minimum 5, maximum 20
- definition: सधैं नेपालीमा, technical terms को English parenthesis मा
- insights: specific facts, numbers, dates — never vague statements
- sectors: English lowercase — governance, economy, banking, agriculture, energy, education, health, employment, infrastructure, digital, legal, environment, youth, women
${isPolicy ? "- policyPoints: यस chunk मा भेटिएका numbered policy points extract गर्नुहोस्" : ""}
${isConstitution ? "- articleRef: सधैं धारा number include गर्नुहोस्" : ""}`;
}

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.GEMINI_API_KEY)
    return Response.json({ ok: false, error: "GEMINI_API_KEY not configured" }, { status: 503, headers: CORS });

  let body: ChunkRequest;
  try { body = await request.json() as ChunkRequest; }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: CORS }); }

  const { text, chunkIndex, totalChunks, docTitle, docType = "general", ownerId } = body;

  if (!text || !docTitle || !ownerId)
    return Response.json({ ok: false, error: "text, docTitle, ownerId required" }, { status: 400, headers: CORS });

  if (text.length < 50)
    return Response.json({ ok: false, error: "Text too short — minimum 50 characters" }, { status: 400, headers: CORS });

  try {
    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY,
      system:    buildSystemPrompt(docType),
      parts:     [{ text: buildPrompt(body) }],
      maxTokens: 8000,
    });

    let partial: ChunkResult;
    try {
      const cleaned = result.text.trim()
        .replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      partial = JSON.parse(cleaned) as ChunkResult;
      if (!partial.keyTerms || !Array.isArray(partial.keyTerms))
        throw new Error("Missing keyTerms array");
    } catch {
      return Response.json(
        { ok: false, error: "AI returned invalid JSON", raw: result.text.slice(0, 400) },
        { status: 500, headers: CORS },
      );
    }

    return Response.json({ ok: true, partial, chunkIndex, totalChunks }, { headers: CORS });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
