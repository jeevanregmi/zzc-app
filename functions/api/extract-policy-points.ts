/**
 * POST /api/extract-policy-points
 *
 * Takes an approved intelligence document and extracts individual policy
 * points from it. Each point becomes a separate, simple-Nepali explainer
 * suitable for /janta gaming cards.
 *
 * Returns: { ok: true, points: PolicyPointDraft[] }
 * Client saves each point to vault_policy_points Firestore collection.
 */

import { callGemini } from "../../lib/ai/providers/gemini";

interface Env { GEMINI_API_KEY: string }
interface PagesContext { request: Request; env: Env }

interface ExtractRequest {
  docId:       string;
  title:       string;
  ocrText?:    string;
  aiSummary?:  string;
  aiKeyInsights?: string[];
  policyChanges?: string[];
  ownerId:     string;
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

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.GEMINI_API_KEY)
    return Response.json({ ok: false, error: "GEMINI_API_KEY not configured" }, { status: 503, headers: CORS });

  let body: ExtractRequest;
  try { body = await request.json() as ExtractRequest; }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: CORS }); }

  const { docId, title, ocrText, aiSummary, aiKeyInsights = [], policyChanges = [], ownerId } = body;
  if (!docId || !ownerId) return Response.json({ ok: false, error: "docId and ownerId required" }, { status: 400, headers: CORS });

  const context = [
    `Document: ${title}`,
    aiSummary ? `Summary: ${aiSummary}` : "",
    aiKeyInsights.length ? `Key insights:\n${aiKeyInsights.map((k, i) => `${i + 1}. ${k}`).join("\n")}` : "",
    policyChanges.length ? `Policy changes:\n${policyChanges.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : "",
    ocrText ? `Full text (first 8000 chars):\n${ocrText.slice(0, 8000)}` : "",
  ].filter(Boolean).join("\n\n");

  try {
    const result = await callGemini({
      apiKey: env.GEMINI_API_KEY,
      system: `तपाईं Nepal government policy documents बाट individual policy points निकाल्ने expert हुनुहुन्छ।
तपाईंको काम: जटिल सरकारी नीतिलाई सामान्य नेपाली मान्छेले बुझ्ने गरी, exciting र gaming-style मा present गर्न points बनाउनु।
Target audience: 18-35 वर्षका नेपाली युवा जो सरकारी नीति बुझ्न चाहन्छन् तर complex भाषा पढ्न गाह्रो लाग्छ।
Language: सबै fields नेपालीमा — सरल, colloquial, exciting।`,
      parts: [{
        text: `यो document बाट सबै important policy points निकाल्नुहोस्।

${context}

हरेक point को लागि JSON object बनाउनुहोस्। Return ONLY a JSON array — no markdown, no explanation:

[
  {
    "pointNumber": 1,
    "title": "सरल नेपालीमा point को नाम (max 8 words)",
    "simpleSummary": "यो point ले के गर्छ — सामान्य मान्छेले बुझ्ने गरी २-३ वाक्यमा। जस्तै: 'अब सरकारले X गर्नेछ जसले तपाईंलाई Y फाइदा दिन्छ।'",
    "youthImpact": "१८-३५ वर्षका युवालाई यसले कसरी असर गर्छ — १-२ वाक्य, specific।",
    "keyFact": "एउटा specific number, percentage, रकम वा मिति — तथ्य सहित।",
    "sectors": ["banking", "employment"]
  },
  ...
]

RULES:
- Minimum 10, maximum 30 points
- हरेक point unique छ — duplicate नबनाउनुहोस्
- title: छोटो, punchy, Nepali
- simpleSummary: gaming/exciting tone, जस्तो news anchor ले भन्छन्
- keyFact: must be a real number/stat/date from the document
- sectors: English maa, array of strings`,
      }],
      maxTokens: 6000,
    });

    let points: PolicyPointDraft[] = [];
    try {
      const text = result.text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
      points = JSON.parse(text) as PolicyPointDraft[];
      if (!Array.isArray(points)) throw new Error("Not an array");
    } catch {
      return Response.json({ ok: false, error: "AI returned invalid JSON", raw: result.text.slice(0, 300) }, { status: 500, headers: CORS });
    }

    return Response.json({ ok: true, points, docId }, { headers: CORS });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: msg }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
