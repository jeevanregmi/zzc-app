import { AwsClient } from "aws4fetch";
import { callGemini } from "../../lib/ai/providers/gemini";
import { DEFAULT_BEDROCK_MODEL } from "../../lib/ai/bedrock-models";
import {
  CORS, validateBedrockEnv, bedrockErrorMessage,
  clientError, providerError, internalError, extractJson, log,
} from "./_shared";

interface Env {
  GEMINI_API_KEY?:        string;
  AWS_ACCESS_KEY_ID?:     string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:            string;
  BEDROCK_MODEL_ID?:      string;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

type StyleVariant = "calculator-screen" | "talking-head" | "data-viz" | "split-screen" | "text-only";

interface ThumbnailRequest {
  title:    string;
  headline: string;
  subline?: string;
  style:    StyleVariant;
  palette?: "green-black" | "red-black" | "blue-black";
  stat?:    string;
  splitA?:  string;
  splitB?:  string;
}

const BASE_STYLE = `Professional YouTube thumbnail for ZZC, a Nepal Gen Z fintech education channel.
Style: dark background (#000 or #18181b), bold green (#22c55e) accents, white high-contrast text.
Typography: large bold Nepali text in upper portion, clean English subline if needed.
Mood: authoritative, modern, Gen Z. No stock-photo feel. No watermarks. No borders.
Dimensions: 1280×720px, high resolution.`;

const STYLE_INSTRUCTIONS: Record<StyleVariant, string> = {
  "calculator-screen": `Main visual: ZZC financial calculator UI screenshot on left half, glowing green. Right half: large bold text "[HEADLINE]". Green digital/fintech aesthetic. Small "ZZC AI" badge top-right corner.`,
  "talking-head":      `Left 40%: close-up of a young Nepali person (25-30 yrs) with surprised or engaged expression, green rim lighting. Right 60%: large bold "[HEADLINE]" in white, small "[SUBLINE]" below. Subtle rupee symbol (₹) watermark background.`,
  "data-viz":          `Center: dramatic bar chart or exponential growth curve, green on dark background, peak labeled "[STAT]". Top: "[HEADLINE]" in large bold white. Bottom small: "ZZC | zzc.jeevanregmi.com.np".`,
  "split-screen":      `Split vertically. Left half: dark red zone with "[SPLIT_A]" in large white text, subtle ✗ mark. Right half: dark green zone with "[SPLIT_B]" in large white text, ✓ mark. Center glowing divider line. Top overlay: "[HEADLINE]".`,
  "text-only":         `"[HEADLINE]" in extremely large bold Nepali font, centered, fills 70% of frame. "[SUBLINE]" below in smaller weight. Green ZZC logo badge bottom-right. Minimal noise texture background.`,
};

function fillTemplate(template: string, req: ThumbnailRequest): string {
  return template
    .replace(/\[HEADLINE\]/g, req.headline)
    .replace(/\[SUBLINE\]/g,  req.subline ?? "")
    .replace(/\[STAT\]/g,     req.stat    ?? "")
    .replace(/\[SPLIT_A\]/g,  req.splitA  ?? "A")
    .replace(/\[SPLIT_B\]/g,  req.splitB  ?? "B");
}

function buildPrompt(req: ThumbnailRequest): string {
  const styleInstruction = fillTemplate(STYLE_INSTRUCTIONS[req.style], req);
  const palette          = req.palette ?? "green-black";

  return `You are a professional creative director for ZZC fintech YouTube channel.

Generate 3 variations of an optimized image generation prompt for this thumbnail:

Video title: "${req.title}"
Headline text: "${req.headline}"
${req.subline ? `Subline text: "${req.subline}"` : ""}
Style variant: ${req.style}
Color palette: ${palette}

Base style rules:
${BASE_STYLE}

Style-specific direction:
${styleInstruction}

For each variation, optimize for: click-through rate, mobile legibility (text must be readable at 240px wide), and ZZC brand consistency.

Return ONLY this JSON (no explanation):
{
  "prompts": [
    {
      "variant": "A",
      "platform": "Midjourney",
      "prompt": "full optimized prompt string for Midjourney v6"
    },
    {
      "variant": "B",
      "platform": "DALL-E 3",
      "prompt": "full optimized prompt string for DALL-E 3"
    },
    {
      "variant": "C",
      "platform": "Ideogram v2",
      "prompt": "full optimized prompt string for Ideogram v2 (best for Nepali text rendering)"
    }
  ],
  "negativePrompt": "what to exclude (blurry text, stock photos, watermarks, etc.)",
  "canvaInstructions": "Step-by-step Canva instructions if AI image not available"
}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  let body: ThumbnailRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON request body", 400, "BAD_REQUEST");
  }

  if (!body.title || !body.headline || !body.style) {
    return clientError("title, headline, and style are required", 400, "VALIDATION_ERROR");
  }

  const prompt = buildPrompt(body);

  // ── Primary: Gemini ──────────────────────────────────────────────────────────
  if (context.env.GEMINI_API_KEY) {
    try {
      const result = await callGemini({
        apiKey:    context.env.GEMINI_API_KEY,
        system:    "You are a creative director for a Nepal YouTube channel. Respond with valid JSON only — no markdown, no explanation.",
        parts:     [{ text: prompt }],
        maxTokens: 2000,
      });

      const [parsed, parseErr] = extractJson(result.text);
      if (parseErr) {
        log("generate-thumbnail-prompt", "gemini_parse_error", { preview: result.text.slice(0, 100) });
        return providerError("AI returned unparseable response. Retry.", "AI_PARSE_ERROR", result.text.slice(0, 300));
      }

      log("generate-thumbnail-prompt", "ok", { provider: "gemini", style: body.style });
      return new Response(
        JSON.stringify({ ok: true, ...(parsed as object), title: body.title, style: body.style }),
        { headers: CORS },
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log("generate-thumbnail-prompt", "gemini_error", { msg });
      // Fall through to Bedrock
    }
  }

  // ── Fallback: AWS Bedrock ────────────────────────────────────────────────────
  const envErr = validateBedrockEnv(context.env);
  if (envErr) return clientError("No AI provider configured", 500, "NO_PROVIDERS");

  const MODEL_ID = context.env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;

  try {
    const aws = new AwsClient({
      accessKeyId:     context.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: context.env.AWS_SECRET_ACCESS_KEY!,
      region:          context.env.AWS_REGION!,
      service:         "bedrock",
    });

    const url = `https://bedrock-runtime.${context.env.AWS_REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/invoke`;

    const bedrockRes = await aws.fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        2000,
        messages:          [{ role: "user", content: prompt }],
      }),
    });

    if (!bedrockRes.ok) {
      const raw = await bedrockRes.text().catch(() => "");
      log("generate-thumbnail-prompt", "bedrock_error", { status: bedrockRes.status, details: raw.slice(0, 200) });
      return providerError(bedrockErrorMessage(bedrockRes.status), "BEDROCK_ERROR", raw.slice(0, 300));
    }

    const raw = (await bedrockRes.json()) as { content: Array<{ type: string; text: string }> };
    const text = raw.content?.[0]?.text?.trim() ?? "";

    const [result, parseErr] = extractJson(text);
    if (parseErr) {
      log("generate-thumbnail-prompt", "parse_error", { preview: text.slice(0, 100) });
      return providerError("AI returned unparseable response. Retry.", "AI_PARSE_ERROR", text.slice(0, 300));
    }

    log("generate-thumbnail-prompt", "ok", { provider: "bedrock", model: MODEL_ID, style: body.style });
    return new Response(
      JSON.stringify({ ok: true, ...(result as object), title: body.title, style: body.style }),
      { headers: CORS },
    );

  } catch (err) {
    log("generate-thumbnail-prompt", "unexpected_error", { err: String(err) });
    return internalError(err);
  }
};
