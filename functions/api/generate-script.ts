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

interface ScriptRequest {
  topic: string;
  format: "long-form" | "short" | "reel";
  targetMinutes?: number;
  pillar?: string;
  cta?: string;
  tone?: "educational" | "casual" | "dramatic";
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

const MODEL_ID = "anthropic.claude-3-5-sonnet-20241022-v2:0";

function buildPrompt(body: ScriptRequest): string {
  const { topic, format, targetMinutes = format === "long-form" ? 12 : 60, pillar = "", cta = "ZZC calculator मा हेर्नुस्", tone = "educational" } = body;

  if (format === "long-form") {
    return `तपाईं ZZC (Zeneration Z Chautari) को लागि नेपाली YouTube content writer हुनुहुन्छ।

ZZC एउटा AI-native नेपाली fintech intelligence platform हो। Gen Z audience (18–30 वर्ष)।
Brand voice: Smart, Nepali-first, data-backed, सरल भाषामा जटिल financial topics।
Tone: ${tone}
CTA: ${cta}

Video Topic: "${topic}"
Format: YouTube Long-form (${targetMinutes} min target)
Pillar: ${pillar}

यो JSON structure मा script outline बनाउनुस्:
{
  "title": "SEO-optimized YouTube title (Nepali keyword first)",
  "hook": "पहिलो 30 sec को hook — surprising stat वा question (नेपालीमा)",
  "sections": [
    {
      "label": "Section name",
      "duration": "0:00–0:30",
      "script": "यो section को detailed talking points (3–5 lines, नेपालीमा)",
      "visual": "Screen record / B-roll / graphic suggestion"
    }
  ],
  "ctaText": "Exact CTA को script (channel + tool link)",
  "description": "YouTube description (500+ words, timestamps, links)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Important: sections array मा Hook, Intro, Main Content (2-3 parts), Demo/Calculator, Mistakes/Tips, CTA राख्नुस्।`;
  }

  // Short / Reel (≤60 sec)
  return `तपाईं ZZC (Zeneration Z Chautari) को लागि नेपाली short-form content writer हुनुहुन्छ।

ZZC एउटा AI-native नेपाली fintech platform हो। Gen Z audience।
Brand voice: Fast, punchy, Nepali-first, data hook।
Tone: ${tone}
CTA: ${cta}

Topic: "${topic}"
Format: ${format === "short" ? "YouTube Short / Instagram Reel" : "TikTok Reel"} (≤60 sec)

JSON structure मा script बनाउनुस्:
{
  "title": "Short video title",
  "hook": "First 1-second hook text (screen overlay)",
  "sections": [
    {
      "label": "Hook",
      "duration": "0–3 sec",
      "script": "Exact words to say",
      "visual": "Visual suggestion"
    },
    {
      "label": "Core",
      "duration": "3–45 sec",
      "script": "Main content — 1 key insight with data",
      "visual": "ZZC calculator screen record / graphic"
    },
    {
      "label": "CTA",
      "duration": "45–60 sec",
      "script": "${cta}",
      "visual": "Link in bio / subscribe overlay"
    }
  ],
  "caption": "Social media caption (150 words, hashtags, Nepali)",
  "hashtags": ["#ZZC", "#NepalFinance", "#नेपालFintech"]
}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION } = context.env;

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: "AWS credentials missing" }), { status: 500, headers: CORS });
  }

  let body: ScriptRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS });
  }

  if (!body.topic || !body.format) {
    return new Response(JSON.stringify({ error: "topic and format are required" }), { status: 400, headers: CORS });
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
        max_tokens: 3000,
        messages: [{ role: "user", content: buildPrompt(body) }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Bedrock error:", res.status, err);
      return new Response(JSON.stringify({ error: "AI service unavailable. Retry." }), { status: 502, headers: CORS });
    }

    const raw = (await res.json()) as { content: Array<{ type: string; text: string }> };
    const text = raw.content?.[0]?.text?.trim() ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return new Response(JSON.stringify({ error: "Could not parse AI response", raw: text.slice(0, 300) }), { status: 500, headers: CORS });
    }

    const script = JSON.parse(match[0]);
    return new Response(JSON.stringify({ ok: true, script, model: MODEL_ID, topic: body.topic, format: body.format }), { headers: CORS });

  } catch (err) {
    console.error("generate-script error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), { status: 500, headers: CORS });
  }
};
