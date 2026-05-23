/**
 * POST /api/extract-promises
 *
 * Extracts structured civic promises from a government document.
 * Each promise captures: what was committed, who is responsible,
 * timeline, budget, and which citizens are affected.
 *
 * This powers ZZC Janta's accountability layer —
 * "promise vs reality" tracking over time.
 *
 * Input:  { text, docTitle, docType, sourceYear, ownerId, docId }
 * Output: { ok, promises: StructuredPromise[] }
 */

import { callGemini } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, providerError, internalError } from "./_shared";

interface Env { GEMINI_API_KEY: string; }
interface PagesContext { request: Request; env: Env; }

interface ExtractRequest {
  text:       string;
  docTitle:   string;
  docType?:   string;   // "budget" | "niti-karyakram" | "manifesto" | "act"
  sourceYear?: string;
  ownerId:    string;
  docId:      string;
}

interface StructuredPromise {
  promiseText:         string;
  promiseNepali:       string;
  category:            string;
  responsibleMinistry: string;
  responsiblePerson?:  string;
  timeline?:           string;
  budgetAmount?:       string;
  affectedGroups:      string[];
  affectedSectors:     string[];
  sourceSection?:      string;
}

function buildPrompt(body: ExtractRequest): string {
  const textSlice = body.text.slice(0, 18000);
  return `तपाईं ZZC Janta को civic intelligence AI हुनुहुन्छ।

नेपाल सरकारको document analyze गरेर structured promises निकाल्नुस्।

Document: "${body.docTitle}"
Type: ${body.docType ?? "government document"}
Year: ${body.sourceYear ?? "unknown"}

---
${textSlice}
---

यो document बाट SPECIFIC, TRACKABLE वाचाहरू (promises/commitments) निकाल्नुस्।

प्रत्येक promise को लागि:
- promiseText: document को exact quote वा near-exact
- promiseNepali: सरल नेपालीमा १-२ वाक्यमा (नागरिकले बुझ्ने)
- category: "budget-allocation" | "infrastructure" | "policy-reform" | "social-program" | "institution" | "target" | "timeline" | "other"
- responsibleMinistry: जिम्मेवार मन्त्रालय वा निकाय
- responsiblePerson: specific अधिकारी/नेता (यदि उल्लेख छ)
- timeline: कहिलेसम्म (document मा उल्लेखित)
- budgetAmount: रकम (यदि छ) — "रु. X करोड/अर्ब" format
- affectedGroups: प्रभावित नागरिक समूह array (Nepali) — ["युवा", "कृषक", "महिला", "उद्योगी", ...]
- affectedSectors: array — ["agriculture", "education", "energy", "employment", "health", "infrastructure", "digitalization", "banking", ...]
- sourceSection: document को कुन section/paragraph बाट (brief reference)

महत्त्वपूर्ण:
- Vague statements छाड्नुस् — trackable specific commitments मात्र
- हरेक promise independent हुनुपर्छ
- Maximum 25 promises return गर्नुस्
- Prioritize: budget allocations, timelines, numerical targets, institutional changes

Return ONLY valid JSON:
{
  "promises": [
    {
      "promiseText": "...",
      "promiseNepali": "...",
      "category": "...",
      "responsibleMinistry": "...",
      "responsiblePerson": null,
      "timeline": "...",
      "budgetAmount": null,
      "affectedGroups": [],
      "affectedSectors": [],
      "sourceSection": "..."
    }
  ],
  "totalFound": 0,
  "docSummary": "one-line summary of what kind of commitments this document makes"
}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  if (!context.env.GEMINI_API_KEY) {
    return clientError("GEMINI_API_KEY not configured", 503, "NO_PROVIDERS");
  }

  let body: ExtractRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.text || !body.docTitle || !body.docId || !body.ownerId) {
    return clientError("text, docTitle, docId, ownerId required", 400, "VALIDATION_ERROR");
  }

  try {
    const result = await callGemini({
      apiKey:    context.env.GEMINI_API_KEY,
      system:    "You are a civic intelligence AI for Nepal. Extract structured, trackable government promises. Return only valid JSON.",
      parts:     [{ text: buildPrompt(body) }],
      maxTokens: 4000,
    });

    const [parsed, parseErr] = extractJson(result.text);
    if (parseErr || !parsed) {
      log("extract-promises", "parse_error", { preview: result.text.slice(0, 200) });
      return providerError("AI returned unparseable response. Retry.", "AI_PARSE_ERROR", result.text.slice(0, 300));
    }

    const data = parsed as { promises: StructuredPromise[]; totalFound: number; docSummary: string };

    log("extract-promises", "ok", {
      docId: body.docId,
      count: data.promises?.length ?? 0,
      model: result.model,
    });

    return new Response(
      JSON.stringify({
        ok:         true,
        promises:   data.promises ?? [],
        totalFound: data.totalFound ?? data.promises?.length ?? 0,
        docSummary: data.docSummary ?? "",
        model:      result.model,
      }),
      { headers: CORS },
    );

  } catch (err) {
    log("extract-promises", "error", { err: String(err) });
    return internalError(err);
  }
};
