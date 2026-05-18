import { AwsClient } from "aws4fetch";
import { DEFAULT_BEDROCK_MODEL } from "../../lib/ai/bedrock-models";
import {
  CORS, validateBedrockEnv, bedrockErrorMessage,
  clientError, providerError, internalError, extractJson, log,
} from "./_shared";

interface Env {
  AWS_ACCESS_KEY_ID:     string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION:            string;
  BEDROCK_MODEL_ID?:     string;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface ScriptRequest {
  topic:          string;
  format:         "long-form" | "short" | "reel";
  targetMinutes?: number;
  pillar?:        string;
  cta?:           string;
  tone?:          "educational" | "casual" | "dramatic";
  signalBrief?:   string;
  signalHooks?:   string[];
  signalTags?:    string[];
}

function buildSignalSection(body: ScriptRequest): string {
  const { signalBrief, signalHooks, signalTags } = body;
  if (!signalBrief && (!signalHooks || signalHooks.length === 0)) return "";

  const lines: string[] = ["", "INTELLIGENCE SIGNAL CONTEXT (use this data to make the script specific):"];
  if (signalBrief)                       lines.push(`Brief: ${signalBrief}`);
  if (signalHooks && signalHooks.length) lines.push(`Validated hooks:\n${signalHooks.map(h => `  - ${h}`).join("\n")}`);
  if (signalTags  && signalTags.length)  lines.push(`Topics: ${signalTags.join(", ")}`);
  lines.push("Use the facts and hooks above. Do not invent data not present in the signal.");
  return lines.join("\n");
}

function buildPrompt(body: ScriptRequest): string {
  const {
    topic, format,
    targetMinutes = format === "long-form" ? 12 : 60,
    pillar = "", cta = "ZZC calculator मा हेर्नुस्", tone = "educational",
  } = body;
  const signalSection = buildSignalSection(body);

  if (format === "long-form") {
    return `तपाईं ZZC (Zeneration Z Chautari) को लागि नेपाली YouTube content writer हुनुहुन्छ।

ZZC एउटा AI-native नेपाली fintech intelligence platform हो। Gen Z audience (18–30 वर्ष)।
Brand voice: Smart, Nepali-first, data-backed, सरल भाषामा जटिल financial topics।
Tone: ${tone}
CTA: ${cta}

Video Topic: "${topic}"
Format: YouTube Long-form (${targetMinutes} min target)
Pillar: ${pillar}${signalSection}

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

  return `तपाईं ZZC (Zeneration Z Chautari) को लागि नेपाली short-form content writer हुनुहुन्छ।

ZZC एउटा AI-native नेपाली fintech platform हो। Gen Z audience।
Brand voice: Fast, punchy, Nepali-first, data hook।
Tone: ${tone}
CTA: ${cta}

Topic: "${topic}"
Format: ${format === "short" ? "YouTube Short / Instagram Reel" : "TikTok Reel"} (≤60 sec)${signalSection}

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
  const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, BEDROCK_MODEL_ID } = context.env;

  const envErr = validateBedrockEnv(context.env);
  if (envErr) return clientError(envErr, 500, "ENV_MISSING");

  const MODEL_ID = BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;

  let body: ScriptRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON request body", 400, "BAD_REQUEST");
  }

  if (!body.topic || !body.format) {
    return clientError("topic and format are required", 400, "VALIDATION_ERROR");
  }

  try {
    const aws = new AwsClient({
      accessKeyId:     AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region:          AWS_REGION,
      service:         "bedrock",
    });

    const url = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(MODEL_ID)}/invoke`;

    const bedrockRes = await aws.fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        3000,
        messages:          [{ role: "user", content: buildPrompt(body) }],
      }),
    });

    if (!bedrockRes.ok) {
      const raw = await bedrockRes.text().catch(() => "");
      log("generate-script", "bedrock_error", { status: bedrockRes.status, details: raw.slice(0, 200) });
      return providerError(
        bedrockErrorMessage(bedrockRes.status),
        "BEDROCK_ERROR",
        raw.slice(0, 300),
      );
    }

    const raw = (await bedrockRes.json()) as { content: Array<{ type: string; text: string }> };
    const text = raw.content?.[0]?.text?.trim() ?? "";

    const [script, parseErr] = extractJson(text);
    if (parseErr) {
      log("generate-script", "parse_error", { preview: text.slice(0, 100) });
      return providerError("AI returned unparseable response. Retry.", "AI_PARSE_ERROR", text.slice(0, 300));
    }

    log("generate-script", "ok", { model: MODEL_ID, format: body.format });
    return new Response(
      JSON.stringify({ ok: true, script, model: MODEL_ID, topic: body.topic, format: body.format }),
      { headers: CORS },
    );

  } catch (err) {
    log("generate-script", "unexpected_error", { err: String(err) });
    return internalError(err);
  }
};
