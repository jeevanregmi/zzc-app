/**
 * POST /api/generate-media-script
 *
 * Generates a civic media atom script from a source intelligence atom.
 * Single Gemini Flash call — produces script, narration, visualPrompt, captionText.
 *
 * The client reads the source atom from Firestore and passes its content here.
 * This function does NOT query Firestore — it processes whatever content is sent.
 *
 * ONE Brain Principle: this function generates EXPRESSION content only.
 * It never duplicates or reinterprets intelligence — it packages it for publication.
 *
 * Input:  { sourceText, sourceTitle, ownerId, sourceCollection, sourceAtomId,
 *           linkedArticle?, linkedBranch?, mediaType, emotionalTone, targetAudience }
 * Output: { ok, atom: MediaAtom }
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, clientError, providerError, internalError } from "./_shared";

interface Env { GEMINI_API_KEY: string; GEMINI_MODEL?: string; }
interface PagesContext { request: Request; env: Env; }

interface ScriptRequest {
  sourceText:       string;
  sourceTitle:      string;
  ownerId:          string;
  sourceCollection: "constitutional_framework" | "janta_intelligence";
  sourceAtomId:     string;
  linkedArticle?:   string;
  linkedBranch?:    number;
  mediaType:        "short" | "reel" | "explainer" | "scene";
  emotionalTone:    "informative" | "urgent" | "hopeful" | "critical";
  targetAudience:   "general" | "youth" | "rural" | "urban";
}

interface GeneratedScript {
  scriptNepali:  string;
  narrationText: string;
  visualPrompt:  string;
  captionText:   string;
}

const TONE_GUIDE: Record<string, string> = {
  informative: "शान्त र तथ्यमा आधारित — जनतालाई सूचित गर्ने",
  urgent:      "तत्कालिता र महत्त्व जनाउने — कारवाही आवश्यक छ",
  hopeful:     "आशाजनक र प्रेरणादायी — परिवर्तन सम्भव छ",
  critical:    "समालोचनात्मक र प्रश्नात्मक — जवाफदेहिता माग्ने",
};

const AUDIENCE_GUIDE: Record<string, string> = {
  general: "सामान्य नेपाली नागरिक",
  youth:   "१८–३५ वर्षका युवा",
  rural:   "ग्रामीण र पहाडी समुदाय",
  urban:   "सहरी शिक्षित वर्ग",
};

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  if (!env.GEMINI_API_KEY) {
    return clientError("GEMINI_API_KEY not configured", 500, "GEMINI_NOT_CONFIGURED");
  }

  let body: ScriptRequest;
  try {
    body = await request.json() as ScriptRequest;
  } catch {
    return clientError("Invalid JSON body", 400, "INVALID_BODY");
  }

  const { sourceText, sourceTitle, ownerId, sourceCollection, sourceAtomId,
          linkedArticle, linkedBranch, mediaType, emotionalTone, targetAudience } = body;

  if (!sourceText?.trim())   return clientError("sourceText आवश्यक छ",   400, "MISSING_SOURCE_TEXT");
  if (!sourceAtomId?.trim()) return clientError("sourceAtomId आवश्यक छ", 400, "MISSING_SOURCE_ATOM_ID");
  if (!ownerId?.trim())      return clientError("ownerId आवश्यक छ",      400, "MISSING_OWNER_ID");

  const prompt = `तपाईं नेपालको civic educator हुनुहुन्छ। तलको ${sourceCollection === "constitutional_framework" ? "संवैधानिक धारा" : "सरकारी intelligence record"} बाट एउटा social media script बनाउनुहोस्।

SOURCE: ${sourceTitle}
${linkedArticle ? `Article: ${linkedArticle}` : ""}
${linkedBranch  ? `Constitutional Part: ${linkedBranch}` : ""}

CONTENT:
${sourceText.slice(0, 3000)}

FORMAT:
- mediaType: ${mediaType}
- emotionalTone: ${emotionalTone} (${TONE_GUIDE[emotionalTone] ?? ""})
- targetAudience: ${AUDIENCE_GUIDE[targetAudience] ?? "सामान्य नागरिक"}

Generate a JSON object with exactly these 4 fields:

{
  "scriptNepali":  "60-150 शब्दको Nepali script। सरल भाषा। Hook बाट सुरु। नागरिकको दैनिक जीवनसँग जोड्नुहोस्। Constitutional/policy fact स्पष्ट राख्नुहोस्।",
  "narrationText": "TTS को लागि clean version — script नै, तर numbers Nepali words मा (जस्तै: ३१ → एकतिस), punctuation minimal, pauses को लागि comma प्रयोग।",
  "visualPrompt":  "English-only visual prompt for AI image generator। No copyrighted faces. Abstract/symbolic। Nepali civic imagery। Scene को describe। 1-2 sentences।",
  "captionText":   "Social media Nepali caption। 2-3 lines। Relevant hashtags (#ZZC #Nepal #संविधान)। Emoji उचित।"
}

RULES:
- scriptNepali: जनतालाई सिधै कुरा गर्नुहोस्। Government jargon भन्ने होइन — नागरिकलाई के मतलब छ भन्नुहोस्।
- narrationText: ElevenLabs/TTS मा directly paste हुने version। कुनै markdown/emoji छैन।
- visualPrompt: Ideogram/Runway/DALL-E compatible। No specific person faces। Symbolic Nepali scenes।
- captionText: Copy-paste ready for TikTok/Facebook/Instagram। Nepali-first।
- JSON only — no explanation before or after.`;

  try {
    const result = await callGemini({
      apiKey:    env.GEMINI_API_KEY,
      model:     env.GEMINI_MODEL ?? "gemini-2.0-flash",
      system:    "You are a Nepali civic content creator. Generate structured JSON only. No markdown formatting.",
      parts:     [{ text: prompt }],
      maxTokens: 1200,
      jsonMode:  true,
    });

    const [parsed, parseErr] = extractJson<GeneratedScript>(result.text);
    if (parseErr || !parsed) {
      return providerError("AI response parse गर्न सकिएन", "PARSE_ERROR", parseErr ?? undefined);
    }

    if (!parsed.scriptNepali || !parsed.narrationText) {
      return providerError("AI ले required fields generate गरेन", "INCOMPLETE_RESPONSE");
    }

    const atom = {
      ownerId,
      sourceCollection,
      sourceAtomId,
      ...(linkedArticle ? { linkedArticle } : {}),
      ...(linkedBranch  ? { linkedBranch  } : {}),
      scriptNepali:  parsed.scriptNepali.trim(),
      narrationText: parsed.narrationText.trim(),
      visualPrompt:  (parsed.visualPrompt ?? "").trim(),
      captionText:   (parsed.captionText  ?? "").trim(),
      mediaType,
      emotionalTone,
      targetAudience,
      sourceRefs:    [sourceAtomId],
      status:        "script_ready" as const,
      createdAt:     new Date().toISOString(),
    };

    return new Response(JSON.stringify({ ok: true, atom }), { headers: CORS });

  } catch (err) {
    if (err instanceof GeminiCallError) {
      if (err.code === "quota_exceeded") return providerError("Gemini quota exhausted", "QUOTA_EXCEEDED");
      if (err.code === "auth")           return providerError("Gemini API key invalid", "AUTH_ERROR");
      return providerError(err.message, err.code);
    }
    return internalError(err);
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS });
}
