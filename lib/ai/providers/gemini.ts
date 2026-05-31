/**
 * Gemini Flash REST adapter — Cloudflare Workers compatible.
 *
 * Uses the Generative Language REST API directly (no SDK, no Node.js APIs).
 * Supports text, PDF (inline_data), and images (inline_data).
 *
 * Default model: gemini-2.0-flash
 *   - GA, stable, cheap: $0.10/1M input tokens (free tier: 15 RPM, 1500 RPD)
 *   - Supports PDF natively via inline_data (unlike Bedrock)
 *   - Override with GEMINI_MODEL env var if needed
 *
 * Error classification is intentional — the vault router uses it to decide
 * whether to skip this provider or fail the whole request:
 *   quota_exceeded  → billing/rate-limit, skip to next provider
 *   auth            → misconfigured key, skip to next provider
 *   server_error    → transient, may retry
 *   bad_request     → content/format issue, skip to next provider
 */

export type GeminiErrorCode =
  | "quota_exceeded"
  | "auth"
  | "bad_request"
  | "server_error"
  | "unknown";

export class GeminiCallError extends Error {
  readonly code:       GeminiErrorCode;
  readonly statusCode: number;
  constructor(code: GeminiErrorCode, statusCode: number, message: string) {
    super(message);
    this.name       = "GeminiCallError";
    this.code       = code;
    this.statusCode = statusCode;
  }
}

export interface GeminiPart {
  text?:        string;
  inline_data?: { mime_type: string; data: string };
  file_data?:   { mime_type: string; file_uri: string }; // Gemini Files API
}

export interface GeminiCallResult {
  text:         string;
  inputTokens:  number;
  outputTokens: number;
  model:        string;
  latencyMs:    number;
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_DEFAULT_MODEL = "gemini-2.5-flash";

export async function callGemini(opts: {
  apiKey:     string;
  model?:     string;
  system:     string;
  parts:      GeminiPart[];
  maxTokens?: number;
  jsonMode?:  boolean;
}): Promise<GeminiCallResult> {
  const model     = opts.model ?? GEMINI_DEFAULT_MODEL;
  const maxTokens = opts.maxTokens ?? 2048;
  const start     = Date.now();

  const res = await fetch(
    `${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent?key=${opts.apiKey.trim()}`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        system_instruction: { parts: [{ text: opts.system }] },
        contents:           [{ role: "user", parts: opts.parts }],
        generationConfig:   {
            maxOutputTokens: maxTokens,
            temperature:     0.1,
            ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
            // thinkingConfig only supported on gemini-2.5-* models
            ...(model.includes("2.5") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
      }),
    },
  );

  if (!res.ok) {
    const raw = await res.text().catch(() => "");
    const isQuota   = res.status === 429 || raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota");
    const isAuth    = res.status === 401 || res.status === 403 ||
                      (res.status === 400 && raw.includes("INVALID_ARGUMENT") && raw.includes("API key"));
    const isBad     = res.status === 400 && !isAuth;
    const isServer  = res.status >= 500;
    const code: GeminiErrorCode =
      isQuota  ? "quota_exceeded" :
      isAuth   ? "auth"           :
      isServer ? "server_error"   :
      isBad    ? "bad_request"    : "unknown";
    throw new GeminiCallError(code, res.status, `Gemini ${res.status}: ${raw.slice(0, 300)}`);
  }

  const data = await res.json() as {
    candidates?:    Array<{ content: { parts: Array<{ text?: string; thought?: boolean }> } }>;
    usageMetadata?: { promptTokenCount: number; candidatesTokenCount: number };
  };

  // Concatenate all non-thought text parts — Gemini 2.5 sometimes returns
  // multiple parts (e.g. a brief preamble in part 1, JSON in part 2).
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter(p => !p.thought && p.text != null)
    .map(p => p.text ?? "")
    .join("")
    .trim();

  return {
    text,
    inputTokens:  data.usageMetadata?.promptTokenCount     ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    model,
    latencyMs:    Date.now() - start,
  };
}
