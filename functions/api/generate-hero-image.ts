/**
 * POST /api/generate-hero-image
 *
 * Generates a contextual hero image for a /janta intelligence document.
 * Two-step: Gemini text → image prompt → Gemini Imagen 3 Fast → base64 PNG
 *
 * Returns: { ok: true, imageBase64: string, mimeType: "image/png" }
 * The client uploads to Firebase Storage and saves heroImageUrl to Firestore.
 *
 * Required env var: GEMINI_API_KEY
 */

import { callGemini } from "../../lib/ai/providers/gemini";

interface Env {
  GEMINI_API_KEY: string;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface HeroImageRequest {
  title:           string;
  nepaliExplainer?: string;
  affectedSectors?: string[];
  sourceAuthority?: string;
  aiKeyInsights?:  string[];
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function onRequestPost({ request, env }: PagesContext): Promise<Response> {
  const cors = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!env.GEMINI_API_KEY) {
    return Response.json({ ok: false, error: "GEMINI_API_KEY not configured" }, { status: 503, headers: cors });
  }

  let body: HeroImageRequest;
  try {
    body = await request.json() as HeroImageRequest;
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400, headers: cors });
  }

  const { title, nepaliExplainer, affectedSectors = [], sourceAuthority, aiKeyInsights = [] } = body;

  if (!title) {
    return Response.json({ ok: false, error: "title required" }, { status: 400, headers: cors });
  }

  try {
    // Step 1: Gemini text → craft a focused Imagen prompt
    const promptResult = await callGemini({
      apiKey: env.GEMINI_API_KEY,
      system: `You create concise image generation prompts for an AI image model.
The images are hero visuals for a Nepal government policy intelligence platform called ZZC Janta.
Rules:
- Output ONLY the image prompt, nothing else — no labels, no explanation
- Max 120 words
- Style: cinematic, editorial, professional photograph
- Nepal context: Kathmandu, parliament building, citizens, mountains, modern offices, financial districts
- Colors: warm natural light, subtle Nepal flag red accent
- NO text, charts, or UI elements in the image
- Focus on PEOPLE or PLACES relevant to the document sector
- Mood: hopeful, forward-looking, authoritative`,
      parts: [{ text: `Create an image prompt for this Nepal policy document:
Title: ${title}
Sectors: ${affectedSectors.join(", ") || "general government"}
Authority: ${sourceAuthority ?? "Nepal Government"}
Key context: ${nepaliExplainer ?? aiKeyInsights.slice(0, 2).join(". ")}

Output the image prompt only:` }],
      maxTokens: 200,
    });

    const imagePrompt = promptResult.text.trim();
    if (!imagePrompt) throw new Error("Empty image prompt from Gemini");

    // Step 2: Gemini Imagen 3 Fast → generate image
    const imagenRes = await fetch(
      `${GEMINI_BASE}/imagen-3.0-fast-generate-001:predict?key=${env.GEMINI_API_KEY.trim()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt: imagePrompt }],
          parameters: {
            sampleCount:    1,
            aspectRatio:    "16:9",
            safetySetting:  "block_only_high",
            personGeneration: "allow_adult",
          },
        }),
      }
    );

    if (!imagenRes.ok) {
      const errText = await imagenRes.text().catch(() => "");
      throw new Error(`Imagen ${imagenRes.status}: ${errText.slice(0, 200)}`);
    }

    const imagenData = await imagenRes.json() as {
      predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>;
    };

    const prediction = imagenData.predictions?.[0];
    if (!prediction?.bytesBase64Encoded) {
      throw new Error("No image returned from Imagen API");
    }

    return Response.json({
      ok:           true,
      imageBase64:  prediction.bytesBase64Encoded,
      mimeType:     prediction.mimeType ?? "image/png",
      promptUsed:   imagePrompt,
    }, { headers: cors });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("generate-hero-image error:", msg);
    return Response.json({ ok: false, error: msg }, { status: 500, headers: cors });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
