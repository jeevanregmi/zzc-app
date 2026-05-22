/**
 * GET /api/health
 *
 * AI provider + infrastructure health check for ZZC Pages Functions.
 * Returns configuration status of all three AI providers and R2 storage.
 *
 * ?probe=true  — makes real 1-token calls to each configured provider.
 *                Detects billing exhaustion vs. auth vs. server errors.
 *                Costs a small amount and takes 3–8 seconds. Use sparingly.
 *
 * Response: always HTTP 200 with JSON — caller reads per-provider "status".
 */

import { AwsClient }         from "aws4fetch";
import type { R2Bucket }     from "@cloudflare/workers-types";
import { DEFAULT_BEDROCK_MODEL } from "../../lib/ai/bedrock-models";
import { callGemini, GeminiCallError, GEMINI_DEFAULT_MODEL } from "../../lib/ai/providers/gemini";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Env {
  GEMINI_API_KEY?:        string;
  GEMINI_MODEL?:          string;
  AWS_ACCESS_KEY_ID?:     string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:            string;
  BEDROCK_MODEL_ID?:      string;
  ANTHROPIC_API_KEY?:     string;
  VAULT_BUCKET?:          R2Bucket;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

type ProviderStatus = "ok" | "configured" | "credit_low" | "error" | "unconfigured";

interface ProviderHealth {
  status:    ProviderStatus;
  model?:    string;
  error?:    string;
  latencyMs?:number;
  costTier?: "cheap" | "standard" | "premium";
}

interface HealthResponse {
  ok:        boolean;
  timestamp: string;
  gemini:    ProviderHealth;
  bedrock:   ProviderHealth;
  anthropic: ProviderHealth;
  r2:        { status: "ok" | "unconfigured" };
  probe:     boolean;
}

// Module-level probe cache — prevents repeated ?probe=true calls from burning
// free-tier RPM quota. CF Workers reuse the isolate across requests within the
// same instance. Cache expires after 5 minutes.
let probeCache: { body: string; expiresAt: number } | null = null;
const PROBE_CACHE_MS = 5 * 60 * 1000;

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// ── Gemini ─────────────────────────────────────────────────────────────────────

function checkGemini(env: Env): ProviderHealth {
  if (!env.GEMINI_API_KEY?.trim()) {
    return { status: "unconfigured", costTier: "cheap" };
  }
  return {
    status:   "configured",
    model:    env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL,
    costTier: "cheap",
  };
}

async function probeGemini(env: Env, base: ProviderHealth): Promise<ProviderHealth> {
  if (base.status === "unconfigured") return base;
  const start = Date.now();
  try {
    await callGemini({
      apiKey:    env.GEMINI_API_KEY!,
      model:     env.GEMINI_MODEL,
      system:    "Reply with one word.",
      parts:     [{ text: "ping" }],
      maxTokens: 1,
    });
    return { ...base, status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    const latencyMs = Date.now() - start;
    if (err instanceof GeminiCallError) {
      const isCredit = err.code === "quota_exceeded";
      return {
        ...base,
        status:    isCredit ? "credit_low" : "error",
        latencyMs,
        error:     isCredit
          ? "Gemini quota exhausted. Top up at console.cloud.google.com or add billing."
          : err.message.slice(0, 200),
      };
    }
    return { ...base, status: "error", latencyMs, error: String(err).slice(0, 200) };
  }
}

// ── Bedrock ────────────────────────────────────────────────────────────────────

function checkBedrock(env: Env): ProviderHealth {
  const missing: string[] = [];
  if (!env.AWS_ACCESS_KEY_ID?.trim())     missing.push("AWS_ACCESS_KEY_ID");
  if (!env.AWS_SECRET_ACCESS_KEY?.trim()) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!env.AWS_REGION?.trim())            missing.push("AWS_REGION");
  if (missing.length > 0) return { status: "unconfigured", error: `Missing: ${missing.join(", ")}`, costTier: "standard" };
  const modelId = env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;
  return { status: "configured", model: modelId, costTier: "standard" };
}

async function probeBedrock(env: Env, base: ProviderHealth): Promise<ProviderHealth> {
  if (base.status === "unconfigured") return base;
  const start   = Date.now();
  const modelId = env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;
  try {
    const aws = new AwsClient({
      accessKeyId:     env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      region:          env.AWS_REGION!,
      service:         "bedrock",
    });
    const url = `https://bedrock-runtime.${env.AWS_REGION!}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;
    const res = await aws.fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ anthropic_version: "bedrock-2023-05-31", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
    });
    if (!res.ok) {
      const raw        = await res.text().catch(() => "");
      const isBilling  = res.status === 429 || raw.includes("ThrottlingException");
      return { ...base, status: isBilling ? "credit_low" : "error", latencyMs: Date.now() - start, error: `HTTP ${res.status}: ${raw.slice(0, 150)}` };
    }
    return { ...base, status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { ...base, status: "error", latencyMs: Date.now() - start, error: String(err).slice(0, 200) };
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

function checkAnthropic(env: Env): ProviderHealth {
  if (!env.ANTHROPIC_API_KEY?.trim()) {
    return { status: "unconfigured", costTier: "premium" };
  }
  return { status: "configured", model: "claude-sonnet-4-6", costTier: "premium" };
}

async function probeAnthropic(env: Env, base: ProviderHealth): Promise<ProviderHealth> {
  if (base.status === "unconfigured") return base;
  const start = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
      body:    JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "ping" }] }),
    });
    if (!res.ok) {
      const raw       = await res.text().catch(() => "");
      const isCredit  = res.status === 400 && raw.includes("credit balance");
      const isQuota   = res.status === 429;
      return {
        ...base,
        status:    isCredit || isQuota ? "credit_low" : "error",
        latencyMs: Date.now() - start,
        error:     isCredit ? "Anthropic credit exhausted. Top up at console.anthropic.com/billing." : `HTTP ${res.status}: ${raw.slice(0, 150)}`,
      };
    }
    return { ...base, status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return { ...base, status: "error", latencyMs: Date.now() - start, error: String(err).slice(0, 200) };
  }
}

// ── Handlers ───────────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { env, request } = context;
  const probe = new URL(request.url).searchParams.get("probe") === "true";

  let geminiHealth   = checkGemini(env);
  let bedrockHealth  = checkBedrock(env);
  let anthropicHealth = checkAnthropic(env);

  if (probe) {
    const now = Date.now();
    if (probeCache && now < probeCache.expiresAt) {
      return new Response(probeCache.body, { status: 200, headers: CORS });
    }
    [geminiHealth, bedrockHealth, anthropicHealth] = await Promise.all([
      probeGemini(env, geminiHealth),
      probeBedrock(env, bedrockHealth),
      probeAnthropic(env, anthropicHealth),
    ]);
  }

  const isUsable = (h: ProviderHealth) =>
    h.status === "ok" || h.status === "configured" || h.status === "credit_low";

  const anyProviderUsable = isUsable(geminiHealth) || isUsable(bedrockHealth) || isUsable(anthropicHealth);

  const body: HealthResponse = {
    ok:        anyProviderUsable,
    timestamp: new Date().toISOString(),
    gemini:    geminiHealth,
    bedrock:   bedrockHealth,
    anthropic: anthropicHealth,
    r2:        { status: env.VAULT_BUCKET ? "ok" : "unconfigured" },
    probe,
  };

  const responseBody = JSON.stringify(body, null, 2);
  if (probe) probeCache = { body: responseBody, expiresAt: Date.now() + PROBE_CACHE_MS };
  return new Response(responseBody, { status: 200, headers: CORS });
};
