/**
 * Unified AI Client — Primary + Fallback with Retry and Cost Tracking
 *
 * WHY THIS EXISTS:
 *   Every Cloudflare Worker currently duplicates: API key extraction, request
 *   formatting, error handling, and retry logic. That means 6 files to update
 *   when Anthropic changes a header. The unified client centralizes all of that.
 *
 * PROVIDER CHAIN:
 *   Primary:  Anthropic (direct API) — lowest latency, best models
 *   Fallback: AWS Bedrock (Claude via Bedrock) — used when Anthropic returns
 *             429 (rate limit) or 529 (overloaded) 3 times in a row
 *
 * RETRY POLICY:
 *   Retryable errors: 429, 500, 502, 503, 529, network timeout
 *   Non-retryable: 400 (bad request), 401 (auth), 404 (model not found)
 *   Backoff: exponential with jitter — 1s, 2s, 4s between attempts
 *   Max attempts: configurable (default: 3 on primary, then fallback)
 *
 * COST LOGGING:
 *   After every successful generation, emits a structured cost record.
 *   Callers provide an optional `onCost` callback — this keeps the client
 *   itself free of Firestore dependencies (usable in both CF Workers and Node.js).
 *
 * USAGE:
 *   const client = createAIClient({ anthropicKey: env.ANTHROPIC_API_KEY });
 *   const result = await client.generate({ system, messages, maxTokens: 1500 });
 */

import { createAnthropicProvider } from "./providers/anthropic";
import { createBedrockProvider }   from "./providers/bedrock";
import { estimateTextCostUSD }     from "./costs/tracker";
import type { AITextRequest, AITextResponse, ITextProvider } from "./types";

// ── Client config ─────────────────────────────────────────────────────────

export interface AIClientConfig {
  // Primary provider
  anthropicKey:      string;
  anthropicModel?:   string;    // default: claude-sonnet-4-6

  // Fallback provider (optional — gracefully degraded if not configured)
  bedrockAccessKey?:    string;
  bedrockSecretKey?:    string;
  bedrockRegion?:       string;  // default: us-east-1
  bedrockInferenceId?:  string;  // inference profile ID

  // Retry policy
  maxPrimaryAttempts?: number;   // default: 3
  maxFallbackAttempts?:number;   // default: 2

  // Cost callback — called after every successful generation
  onCost?: (entry: AICallRecord) => void | Promise<void>;
}

// ── Cost record emitted after each generation ─────────────────────────────

export interface AICallRecord {
  modelId:          string;
  provider:         string;
  inputTokens:      number;
  outputTokens:     number;
  estimatedCostUSD: number;
  latencyMs:        number;
  usedFallback:     boolean;
  taskType?:        string;
  entityId?:        string;    // content/signal being processed
  timestamp:        string;
}

// ── Retryable status codes ────────────────────────────────────────────────

const RETRYABLE = new Set([429, 500, 502, 503, 529]);

function shouldRetry(err: Error): boolean {
  const msg = err.message;
  if (RETRYABLE.has(parseInt(msg.match(/\b(\d{3})\b/)?.[1] ?? "0"))) return true;
  if (msg.includes("timeout") || msg.includes("network") || msg.includes("ECONNRESET")) return true;
  return false;
}

function backoffMs(attempt: number): number {
  const base   = 1000 * Math.pow(2, attempt);          // 1s, 2s, 4s
  const jitter = Math.random() * 0.3 * base;           // ±30% jitter
  return Math.min(base + jitter, 16_000);               // cap at 16s
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Retry wrapper ─────────────────────────────────────────────────────────

async function generateWithRetry(
  provider:    ITextProvider,
  request:     AITextRequest,
  maxAttempts: number,
): Promise<AITextResponse> {
  let lastErr: Error = new Error("No attempts made");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await provider.generate(request);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (!shouldRetry(lastErr) || attempt === maxAttempts - 1) throw lastErr;
      await sleep(backoffMs(attempt));
    }
  }

  throw lastErr;
}

// ── Public client interface ───────────────────────────────────────────────

export interface AIClient {
  generate(
    request:  AITextRequest,
    opts?: { taskType?: string; entityId?: string },
  ): Promise<AITextResponse & { usedFallback: boolean; estimatedCostUSD: number }>;
}

// ── Factory ───────────────────────────────────────────────────────────────

export function createAIClient(config: AIClientConfig): AIClient {
  const primaryModel = config.anthropicModel ?? "claude-sonnet-4-6";
  const primary      = createAnthropicProvider(config.anthropicKey, primaryModel);

  const hasFallback  = !!(
    config.bedrockAccessKey &&
    config.bedrockSecretKey &&
    config.bedrockInferenceId
  );

  const fallback = hasFallback
    ? createBedrockProvider(
        {
          accessKeyId:     config.bedrockAccessKey!,
          secretAccessKey: config.bedrockSecretKey!,
          region:          config.bedrockRegion ?? "us-east-1",
        },
        config.bedrockInferenceId!,
      )
    : null;

  const maxPrimary  = config.maxPrimaryAttempts  ?? 3;
  const maxFallback = config.maxFallbackAttempts ?? 2;

  return {
    async generate(request, opts = {}) {
      let response:     AITextResponse;
      let usedFallback  = false;
      let providerUsed  = "anthropic";
      let modelUsed     = primaryModel;

      // ── Primary attempt ───────────────────────────────────────────────
      try {
        response = await generateWithRetry(primary, request, maxPrimary);
      } catch (primaryErr) {
        if (!fallback) throw primaryErr;

        // ── Fallback attempt ──────────────────────────────────────────
        try {
          response     = await generateWithRetry(fallback, request, maxFallback);
          usedFallback = true;
          providerUsed = "bedrock";
          modelUsed    = config.bedrockInferenceId!;
        } catch (fallbackErr) {
          // Both failed — throw primary error (more informative)
          throw primaryErr;
        }
      }

      // ── Cost accounting ───────────────────────────────────────────────
      const estimatedCostUSD = estimateTextCostUSD(
        usedFallback ? (config.bedrockInferenceId ?? modelUsed) : primaryModel,
        response.inputTokens,
        response.outputTokens,
      );

      const costRecord: AICallRecord = {
        modelId:          modelUsed,
        provider:         providerUsed,
        inputTokens:      response.inputTokens,
        outputTokens:     response.outputTokens,
        estimatedCostUSD,
        latencyMs:        response.latencyMs,
        usedFallback,
        taskType:         opts.taskType,
        entityId:         opts.entityId,
        timestamp:        new Date().toISOString(),
      };

      if (config.onCost) {
        try { await config.onCost(costRecord); } catch { /* non-fatal */ }
      }

      return { ...response, usedFallback, estimatedCostUSD };
    },
  };
}

// ── Env-based factory helper ──────────────────────────────────────────────
// Cloudflare Workers inject env vars. This factory reads the standard env shape.

export interface WorkerEnv {
  ANTHROPIC_API_KEY:        string;
  ANTHROPIC_MODEL?:         string;
  AWS_ACCESS_KEY_ID?:       string;
  AWS_SECRET_ACCESS_KEY?:   string;
  AWS_REGION?:              string;
  BEDROCK_INFERENCE_ID?:    string;
}

export function createAIClientFromEnv(
  env:     WorkerEnv,
  onCost?: (entry: AICallRecord) => void | Promise<void>,
): AIClient {
  return createAIClient({
    anthropicKey:      env.ANTHROPIC_API_KEY,
    anthropicModel:    env.ANTHROPIC_MODEL,
    bedrockAccessKey:  env.AWS_ACCESS_KEY_ID,
    bedrockSecretKey:  env.AWS_SECRET_ACCESS_KEY,
    bedrockRegion:     env.AWS_REGION,
    bedrockInferenceId:env.BEDROCK_INFERENCE_ID,
    onCost,
  });
}

// ── Safe JSON extraction ──────────────────────────────────────────────────
// Claude sometimes wraps JSON in markdown fences. This strips them reliably.

export function extractJSON<T>(raw: string): T {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  const start = stripped.indexOf("{");
  const end   = stripped.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error(`No JSON object found in AI response. Got: ${stripped.slice(0, 200)}`);
  }

  return JSON.parse(stripped.slice(start, end + 1)) as T;
}
