/**
 * GET /api/health
 *
 * AI provider health check for ZZC Pages Functions.
 * Returns the configuration status of Bedrock and Anthropic API providers.
 *
 * ?probe=true  — performs a real 1-token invocation to each configured provider.
 *                This costs a small amount and takes 2-5 seconds. Use sparingly.
 *
 * Response always HTTP 200 with JSON — never 502 or 5xx.
 * Caller reads the per-provider "status" field to determine health.
 *
 * Architecture:
 *   Static export compatibility: this is a Cloudflare Pages Function (functions/api/),
 *   not a Next.js API route, so it has no effect on next build --export.
 */

import { AwsClient } from "aws4fetch";
import type { R2Bucket } from "@cloudflare/workers-types";
import { DEFAULT_BEDROCK_MODEL } from "../../lib/ai/bedrock-models";

interface Env {
  AWS_ACCESS_KEY_ID?:    string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:           string;
  BEDROCK_MODEL_ID?:     string;
  ANTHROPIC_API_KEY?:    string;
  VAULT_BUCKET?:         R2Bucket;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

type ProviderStatus = "configured" | "unconfigured" | "ok" | "error";

interface ProviderHealth {
  status:  ProviderStatus;
  model?:  string;
  region?: string;
  error?:  string;
  latencyMs?: number;
}

interface R2Health {
  status: "ok" | "unconfigured";
}

interface HealthResponse {
  ok:        boolean;
  timestamp: string;
  bedrock:   ProviderHealth;
  anthropic: ProviderHealth;
  r2:        R2Health;
  probe:     boolean;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// ─── Bedrock env check ────────────────────────────────────────────────────────

function checkBedrockEnv(env: Env): ProviderHealth {
  const missing: string[] = [];
  if (!env.AWS_ACCESS_KEY_ID?.trim())     missing.push("AWS_ACCESS_KEY_ID");
  if (!env.AWS_SECRET_ACCESS_KEY?.trim()) missing.push("AWS_SECRET_ACCESS_KEY");
  if (!env.AWS_REGION?.trim())            missing.push("AWS_REGION");

  if (missing.length > 0) {
    return {
      status: "unconfigured",
      error:  `Missing env vars: ${missing.join(", ")}`,
    };
  }

  const modelId = env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;
  return {
    status: "configured",
    model:  modelId,
    region: env.AWS_REGION!.trim(),
  };
}

// ─── Bedrock probe ────────────────────────────────────────────────────────────

async function probeBedrockEnv(env: Env, base: ProviderHealth): Promise<ProviderHealth> {
  if (base.status === "unconfigured") return base;

  const start   = Date.now();
  const modelId = env.BEDROCK_MODEL_ID?.trim() || DEFAULT_BEDROCK_MODEL;
  const region  = env.AWS_REGION!.trim();

  try {
    const aws = new AwsClient({
      accessKeyId:     env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      region,
      service:         "bedrock",
    });

    const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;

    const res = await aws.fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        1,
        messages:          [{ role: "user", content: "ping" }],
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      return {
        ...base,
        status:    "error",
        latencyMs: Date.now() - start,
        error:     `HTTP ${res.status}: ${raw.slice(0, 200)}`,
      };
    }

    return { ...base, status: "ok", latencyMs: Date.now() - start };

  } catch (err) {
    return {
      ...base,
      status:    "error",
      latencyMs: Date.now() - start,
      error:     err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Anthropic env check ──────────────────────────────────────────────────────

function checkAnthropicEnv(env: Env): ProviderHealth {
  if (!env.ANTHROPIC_API_KEY?.trim()) {
    return { status: "unconfigured", error: "Missing env var: ANTHROPIC_API_KEY" };
  }
  return { status: "configured", model: "claude-sonnet-4-6 / claude-haiku-4-5-20251001" };
}

// ─── Anthropic probe ──────────────────────────────────────────────────────────

async function probeAnthropicEnv(env: Env, base: ProviderHealth): Promise<ProviderHealth> {
  if (base.status === "unconfigured") return base;

  const start = Date.now();

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 1,
        messages:   [{ role: "user", content: "ping" }],
      }),
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => "");
      return {
        ...base,
        status:    "error",
        latencyMs: Date.now() - start,
        error:     `HTTP ${res.status}: ${raw.slice(0, 200)}`,
      };
    }

    return { ...base, status: "ok", latencyMs: Date.now() - start };

  } catch (err) {
    return {
      ...base,
      status:    "error",
      latencyMs: Date.now() - start,
      error:     err instanceof Error ? err.message : String(err),
    };
  }
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const { env, request } = context;
  const probe = new URL(request.url).searchParams.get("probe") === "true";

  let bedrockHealth  = checkBedrockEnv(env);
  let anthropicHealth = checkAnthropicEnv(env);

  if (probe) {
    [bedrockHealth, anthropicHealth] = await Promise.all([
      probeBedrockEnv(env, bedrockHealth),
      probeAnthropicEnv(env, anthropicHealth),
    ]);
  }

  const allOk = (
    (bedrockHealth.status  === "ok" || bedrockHealth.status  === "configured") &&
    (anthropicHealth.status === "ok" || anthropicHealth.status === "configured")
  );

  const r2Health: R2Health = {
    status: env.VAULT_BUCKET ? "ok" : "unconfigured",
  };

  const body: HealthResponse = {
    ok:        allOk,
    timestamp: new Date().toISOString(),
    bedrock:   bedrockHealth,
    anthropic: anthropicHealth,
    r2:        r2Health,
    probe,
  };

  // Always 200 — callers read the "ok" field and per-provider "status"
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers: CORS });
};
