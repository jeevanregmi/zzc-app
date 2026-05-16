import { AwsClient } from "aws4fetch";

interface Env {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

type StyleVariant = "calculator-screen" | "talking-head" | "data-viz" | "split-screen" | "text-only";

interface ThumbnailRequest {
  title: string;
  headline: string;
  subline?: string;
  style: StyleVariant;
  palette?: "green-black" | "red-black" | "blue-black";
  stat?: string;
  splitA?: string;
  splitB?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const MODEL_ID = "us.anthropic.claude-sonnet-4-6";

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
    .replace(/\[SUBLINE\]/g, req.subline ?? "")
    .replace(/\[STAT\]/g, req.stat ?? "")
    .replace(/\[SPLIT_A\]/g, req.splitA ?? "A")
    .replace(/\[SPLIT_B\]/g, req.splitB ?? "B");
}

function buildPrompt(req: ThumbnailRequest): string {
  const styleInstruction = fillTemplate(STYLE_INSTRUCTIONS[req.style], req);
  const palette = req.palette ?? "green-black";

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
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = context.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: "AWS credentials missing" }), { status: 500, headers: CORS });
  }

  let body: ThumbnailRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS });
  }

  if (!body.title || !body.headline || !body.style) {
    return new Response(JSON.stringify({ error: "title, headline, and style are required" }), { status: 400, headers: CORS });
  }

  try {
    const aws = new AwsClient({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region: AWS_REGION,
      service: "bedrock",
    });

    const url = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/invoke`;

    const res = await aws.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 2000,
        messages: [{ role: "user", content: buildPrompt(body) }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Bedrock error:", res.status, err);
      return new Response(JSON.stringify({ error: "AI service unavailable. Retry.", bedrockStatus: res.status, bedrockError: err.slice(0, 500) }), { status: 500, headers: CORS });
    }

    const raw = (await res.json()) as { content: Array<{ type: string; text: string }> };
    const text = raw.content?.[0]?.text?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Could not parse AI response" }), { status: 500, headers: CORS });
    }

    const result = JSON.parse(match[0]);
    return new Response(JSON.stringify({ ok: true, ...result, title: body.title, style: body.style }), { headers: CORS });

  } catch (err) {
    console.error("generate-thumbnail-prompt error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: CORS });
  }
};
