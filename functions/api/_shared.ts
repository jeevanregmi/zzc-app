/**
 * Shared utilities for all ZZC Cloudflare Pages Functions.
 *
 * Rules enforced here:
 *   - Never emit HTTP 502/503/504 — upstream failures map to 500 with structured body
 *   - Every error response is JSON with { error, code } fields
 *   - Bedrock and Anthropic error codes are mapped to actionable messages
 */

// ─── CORS ─────────────────────────────────────────────────────────────────────

export const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// ─── Structured error responses ───────────────────────────────────────────────

export interface ApiError {
  error:    string;
  code:     string;
  details?: string;
}

/** Application-level error (4xx). Uses the provided status unchanged. */
export function clientError(message: string, status: number, code: string): Response {
  const body: ApiError = { error: message, code };
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

/**
 * Upstream provider error — ALWAYS maps to 500, never 502.
 * Pages Functions own the error; callers receive actionable context.
 */
export function providerError(message: string, code: string, details?: string): Response {
  const body: ApiError = { error: message, code };
  if (details) body.details = details.slice(0, 300);
  return new Response(JSON.stringify(body), { status: 500, headers: CORS });
}

/** Catch-all internal error — always 500 with safe message. */
export function internalError(err: unknown): Response {
  const msg = err instanceof Error ? err.message : String(err);
  return new Response(
    JSON.stringify({ error: "Internal error. Retry or contact support.", code: "INTERNAL_ERROR", details: msg.slice(0, 200) }),
    { status: 500, headers: CORS },
  );
}

// ─── Environment validation ───────────────────────────────────────────────────

export interface BedrockEnvVars {
  AWS_ACCESS_KEY_ID?:    string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:           string;
  BEDROCK_MODEL_ID?:     string;
}

/** Returns error message string if env is invalid, null if valid. */
export function validateBedrockEnv(env: BedrockEnvVars): string | null {
  if (!env.AWS_ACCESS_KEY_ID?.trim())    return "AWS_ACCESS_KEY_ID not configured in Cloudflare Pages env vars";
  if (!env.AWS_SECRET_ACCESS_KEY?.trim()) return "AWS_SECRET_ACCESS_KEY not configured in Cloudflare Pages env vars";
  if (!env.AWS_REGION?.trim())           return "AWS_REGION not configured in Cloudflare Pages env vars";
  return null;
}

export function validateAnthropicEnv(env: { ANTHROPIC_API_KEY?: string }): string | null {
  if (!env.ANTHROPIC_API_KEY?.trim()) return "ANTHROPIC_API_KEY not configured in Cloudflare Pages env vars";
  return null;
}

// ─── Bedrock error mapping ─────────────────────────────────────────────────────

/**
 * Maps a Bedrock HTTP status code to an actionable user-facing message.
 * Never leaks raw AWS error text — that goes to details (truncated).
 */
export function bedrockErrorMessage(status: number): string {
  switch (status) {
    case 400: return "Bedrock rejected the request — model ID may be invalid or not enabled in your AWS account. Check BEDROCK_MODEL_ID env var (e.g. us.anthropic.claude-3-5-haiku-20241022-v1:0).";
    case 401:
    case 403: return "Bedrock credentials invalid or expired. Rotate AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in Cloudflare Pages env vars.";
    case 404: return "Bedrock model not found. The model ID is either incorrect or not enabled in your AWS account. Verify in AWS Console → Bedrock → Model catalog.";
    case 429: return "Bedrock rate limit exceeded. Retry in 60 seconds.";
    case 500:
    case 503: return "Bedrock service unavailable. Retry in a few minutes.";
    default:  return `Bedrock returned HTTP ${status}. Retry or check AWS Console.`;
  }
}

// ─── Anthropic error mapping ──────────────────────────────────────────────────

export function anthropicErrorMessage(status: number): string {
  switch (status) {
    case 401: return "Anthropic API key invalid or revoked. Update ANTHROPIC_API_KEY in Cloudflare Pages env vars.";
    case 403: return "Anthropic API key does not have permission for this operation.";
    case 429: return "Anthropic rate limit exceeded. Retry in 60 seconds.";
    case 529: return "Anthropic API overloaded. Retry in a few minutes.";
    case 500:
    case 503: return "Anthropic API unavailable. Retry in a few minutes.";
    case 400: return "Anthropic rejected the request (HTTP 400). The request format or content type may be unsupported.";
    default:  return `Anthropic API returned HTTP ${status}. Retry or contact support.`;
  }
}

// ─── Structured logging ───────────────────────────────────────────────────────

/**
 * Emits a single JSON log line to Cloudflare's log stream.
 * Each entry includes timestamp, worker name, event type, and optional fields.
 */
export function log(
  worker: string,
  event:  string,
  data?:  Record<string, unknown>,
): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), worker, event, ...data }));
}

// ─── JSON parsing from LLM text ───────────────────────────────────────────────

/**
 * Extracts the first {...} JSON block from an LLM response string.
 * Returns [parsed, null] on success, [null, errorMessage] on failure.
 */
export function extractJson<T = unknown>(text: string): [T, null] | [null, string] {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return [null, "No JSON object found in AI response"];
  try {
    return [JSON.parse(match[0]) as T, null];
  } catch (e) {
    return [null, `AI response JSON parse failed: ${e instanceof Error ? e.message : String(e)}`];
  }
}
