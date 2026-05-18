import { anthropicErrorMessage, providerError, log } from "./_shared";

/**
 * POST /api/generate-content-idea
 *
 * Phase 6D — Intelligence → Content Pipeline
 *
 * Accepts a SourceSignal and returns a structured content brief ready to be
 * written to the Content Queue. The caller (IntelligenceClient) is responsible
 * for the Firestore write.
 *
 * Required Cloudflare Pages env var: ANTHROPIC_API_KEY
 */

import type { SourceSignal } from "../../lib/types/signals";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface ContentIdeaRequest {
  signal:  SourceSignal;
  ownerId: string;
}

interface ContentIdeaResult {
  ok:       true;
  title:    string;
  type:     string;
  platform: string;
  brief:    string;
  hooks:    string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const MODEL         = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(signal: SourceSignal): string {
  const insights = (signal.aiInsights ?? []).join("\n- ");
  const topics   = (signal.taxonomyTags ?? []).map(t => t.topicId).join(", ");

  return `You are a content strategist for ZZC — Nepal's financial education platform for Gen Z (age 18–35, salary NPR 30k–150k/month).

A live intelligence signal has been validated by the admin team. Your job is to turn it into a concrete content brief.

INTELLIGENCE SIGNAL:
Title: ${signal.title}
Summary: ${signal.summary}
Source: ${signal.sourceName} (${signal.sourceUrl})
Credibility: ${signal.credibility ?? "unverified"}
Relevance score: ${signal.relevanceScore ?? 0}
Taxonomy topics: ${topics || "none detected"}

Key insights:
- ${insights || "none"}

---

Generate a content brief for ONE piece of content that would perform best for this signal on ZZC's social channels.

Return ONLY valid JSON (no markdown, no text outside JSON):
{
  "title": "exact video/post title — specific, curiosity-driven, max 60 chars",
  "type": "youtube-long|shorts|facebook-post|carousel|explainer",
  "platform": "youtube|instagram|facebook|all",
  "brief": "3-4 sentence brief: what to cover, what angle to take, what action to drive. Specific to the signal data — not generic advice.",
  "hooks": [
    "opening hook line 1 — first sentence to say or show",
    "opening hook line 2 — alternative",
    "opening hook line 3 — alternative"
  ]
}

Rules:
- Choose the format where this signal's data will be most impactful
- If it's a rate change or number, lead with the number in the title
- Hooks must be specific to this signal's actual data — no generic statements
- Brief must reference the actual facts from the signal
- Write for 22-year-old Nepali professionals who are new to finance`;
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured in Cloudflare Pages env vars", code: "ENV_MISSING" }),
      { status: 500, headers: CORS },
    );
  }

  let body: ContentIdeaRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body", code: "BAD_REQUEST" }), { status: 400, headers: CORS });
  }

  const { signal } = body;

  if (!signal?.id || !signal?.title) {
    return new Response(
      JSON.stringify({ error: "signal with id and title is required", code: "VALIDATION_ERROR" }),
      { status: 400, headers: CORS },
    );
  }

  const prompt = buildPrompt(signal);

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 1024,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Anthropic API unreachable: ${String(err)}`, code: "ANTHROPIC_UNREACHABLE" }),
      { status: 500, headers: CORS },
    );
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text().catch(() => "");
    log("generate-content-idea", "anthropic_error", { status: anthropicRes.status, signalId: signal.id });
    return providerError(
      anthropicErrorMessage(anthropicRes.status),
      "ANTHROPIC_ERROR",
      errText.slice(0, 300),
    );
  }

  const rawResponse = (await anthropicRes.json()) as { content: Array<{ type: string; text: string }> };
  const aiText      = rawResponse.content?.[0]?.text?.trim() ?? "";

  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    log("generate-content-idea", "parse_error", { signalId: signal.id, preview: aiText.slice(0, 100) });
    return new Response(
      JSON.stringify({ error: "AI returned unparseable response. Retry.", code: "AI_PARSE_ERROR", preview: aiText.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  let ai: {
    title?:    string;
    type?:     string;
    platform?: string;
    brief?:    string;
    hooks?:    string[];
  };

  try {
    ai = JSON.parse(jsonMatch[0]);
  } catch {
    log("generate-content-idea", "parse_error", { signalId: signal.id, preview: aiText.slice(0, 100) });
    return new Response(
      JSON.stringify({ error: "AI response was not valid JSON. Retry.", code: "AI_PARSE_ERROR", preview: aiText.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  const result: ContentIdeaResult = {
    ok:       true,
    title:    ai.title    ?? signal.title,
    type:     ai.type     ?? "explainer",
    platform: ai.platform ?? "youtube",
    brief:    ai.brief    ?? "",
    hooks:    ai.hooks    ?? [],
  };

  log("generate-content-idea", "ok", { model: MODEL, signalId: signal.id, type: result.type });
  return new Response(JSON.stringify(result), { headers: CORS });
};
