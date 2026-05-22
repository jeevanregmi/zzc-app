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

    // Step 2: Try image generation models in order until one succeeds
    const IMAGE_MODELS = [
      "gemini-2.0-flash-preview-image-generation",
      "gemini-2.0-flash-exp-image-generation",
      "imagen-3.0-generate-001",
    ];

    let imageBase64: string | null = null;
    let imageMimeType = "image/png";
    let lastErr = "";

    for (const model of IMAGE_MODELS) {
      const isImagen = model.startsWith("imagen-");
      const endpoint = isImagen ? "predict" : "generateContent";
      const body = isImagen
        ? JSON.stringify({
            instances:  [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1, aspectRatio: "16:9", safetySetting: "block_only_high" },
          })
        : JSON.stringify({
            contents:         [{ parts: [{ text: imagePrompt }] }],
            generationConfig: { responseModalities: ["IMAGE"] },
          });

      const res = await fetch(
        `${GEMINI_BASE}/${model}:${endpoint}?key=${env.GEMINI_API_KEY.trim()}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body },
      );

      if (!res.ok) {
        lastErr = `${model}: ${res.status}`;
        continue;
      }

      const data = await res.json() as Record<string, unknown>;

      if (isImagen) {
        const pred = (data.predictions as Array<{ bytesBase64Encoded: string; mimeType: string }>)?.[0];
        if (pred?.bytesBase64Encoded) {
          imageBase64  = pred.bytesBase64Encoded;
          imageMimeType = pred.mimeType ?? "image/png";
          break;
        }
      } else {
        const parts = (data as {
          candidates?: Array<{ content: { parts: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
        }).candidates?.[0]?.content?.parts;
        const part = parts?.find(p => p.inlineData);
        if (part?.inlineData) {
          imageBase64   = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType ?? "image/png";
          break;
        }
      }
      lastErr = `${model}: empty response`;
    }

    if (!imageBase64) {
      throw new Error(`All image models failed. Last: ${lastErr}`);
    }

    return Response.json({
      ok:           true,
      imageBase64,
      mimeType:     imageMimeType,
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
