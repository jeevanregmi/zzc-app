/**
 * POST /api/economics-summary
 *
 * AI-generated founder decision brief.
 * Accepts a plain-text financial snapshot built by the frontend,
 * routes through vault-router (Gemini → Bedrock → Anthropic),
 * returns structured JSON with leaks, efficiency, projections, and advice.
 *
 * This is a founder-only admin route — called from /vault/business Sustainability tab.
 */

import { routeDocumentAnalysis } from "../../lib/ai/vault-router";
import { log }                   from "./_shared";
import type { RouterEnv }        from "../../lib/ai/vault-router";

interface Env extends RouterEnv {}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface SummaryRequest {
  snapshot: string;   // plain-text financial snapshot built by the UI
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const SYSTEM_PROMPT = `You are a startup financial advisor for ZZC — Nepal's AI-native financial intelligence platform.

ZZC context:
- Solo founder (Jeevan Regmi) building Nepal's civic intelligence OS
- Revenue model: subscriptions, sponsorships, civic partnerships, research sales, API access
- Cost model: AI provider fees (Gemini Flash → Bedrock Haiku → Anthropic Haiku), Cloudflare Pages/R2, Firebase
- Current stage: pre-revenue / early traction
- Target: financially self-aware infrastructure, not just a content platform

Analyze the financial snapshot provided and return ONLY valid JSON (no markdown, no text before/after):
{
  "leaks": [
    "specific money leak with dollar amount or pattern",
    "another leak"
  ],
  "efficiency": [
    "which AI provider is most cost-efficient and why (with numbers)",
    "workflow efficiency observation"
  ],
  "workflows": [
    "which workflow costs the most per call and why",
    "optimization recommendation"
  ],
  "projections": [
    "projected monthly cost at 10 paying users (with specific numbers)",
    "projected monthly cost at 100 paying users",
    "when AI costs will exceed a meaningful threshold"
  ],
  "advice": [
    "top priority action #1 (specific, actionable, with expected $ impact)",
    "top priority action #2",
    "top priority action #3"
  ]
}

Rules:
- Be specific with numbers — "costs $0.003/analysis" not "costs a small amount"
- Reference actual providers/workflows from the snapshot
- Advice must be immediately actionable by a solo founder
- If data is sparse, state what's missing and why it matters
- All amounts in USD unless specified otherwise`;

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  let body: SummaryRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS });
  }

  const { snapshot } = body;
  if (!snapshot || snapshot.trim().length < 50) {
    return new Response(
      JSON.stringify({ error: "Snapshot too short — must include financial data" }),
      { status: 400, headers: CORS },
    );
  }

  const result = await routeDocumentAnalysis(
    context.env,
    SYSTEM_PROMPT,
    { mimeType: "text/plain", fileName: "financial-snapshot.txt", textBody: snapshot },
    1024,
  );

  if (!result.ok) {
    return new Response(
      JSON.stringify({
        error: result.reason === "billing_exhausted"
          ? "AI quota exhausted. Top up at console.anthropic.com/billing."
          : `AI unavailable (tried: ${result.tried.join(", ")}). Retry in a few minutes.`,
        code: result.reason === "billing_exhausted" ? "BILLING_EXHAUSTED" : "AI_UNAVAILABLE",
      }),
      { status: result.reason === "billing_exhausted" ? 402 : 503, headers: CORS },
    );
  }

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ error: "AI returned unparseable response", preview: result.text.slice(0, 200) }),
      { status: 500, headers: CORS },
    );
  }

  let summary: {
    leaks?:       string[];
    efficiency?:  string[];
    workflows?:   string[];
    projections?: string[];
    advice?:      string[];
  };
  try {
    summary = JSON.parse(jsonMatch[0]);
  } catch {
    return new Response(
      JSON.stringify({ error: "AI response was not valid JSON", preview: result.text.slice(0, 200) }),
      { status: 500, headers: CORS },
    );
  }

  log("economics-summary", "ok", { model: result.model, snapshotLen: snapshot.length });

  return new Response(
    JSON.stringify({
      ok:          true,
      leaks:       summary.leaks       ?? [],
      efficiency:  summary.efficiency  ?? [],
      workflows:   summary.workflows   ?? [],
      projections: summary.projections ?? [],
      advice:      summary.advice      ?? [],
      generatedAt: new Date().toISOString(),
      provider:    result.model,
    }),
    { headers: CORS },
  );
};
