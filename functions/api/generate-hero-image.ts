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

    // Step 2: Pollinations.ai (free, no API key, Flux model) → fetch image as base64
    const encodedPrompt = encodeURIComponent(imagePrompt);
    const pollinationsUrl =
      `https://image.pollinations.ai/prompt/${encodedPrompt}` +
      `?width=1280&height=720&model=flux&nologo=true&seed=${Date.now() % 9999}`;

    const imgRes = await fetch(pollinationsUrl, {
      headers: { "User-Agent": "ZZC-Janta/1.0" },
    });

    if (!imgRes.ok) {
      throw new Error(`Pollinations image fetch failed: ${imgRes.status}`);
    }

    const imgBuffer   = await imgRes.arrayBuffer();
    const imgBytes    = new Uint8Array(imgBuffer);
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";

    // Convert to base64
    let binary = "";
    for (let i = 0; i < imgBytes.length; i++) {
      binary += String.fromCharCode(imgBytes[i]);
    }
    const imageBase64 = btoa(binary);

    return Response.json({
      ok:           true,
      imageBase64,
      mimeType:     contentType.split(";")[0],
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
