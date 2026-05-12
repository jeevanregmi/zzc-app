/**
 * Provider capability and cost configuration.
 *
 * Update costs here when provider pricing changes — all cost accounting
 * (lib/ai/costs/tracker.ts) references this single config file.
 *
 * Pricing sources (verify at each provider's pricing page before billing):
 *   Anthropic: https://www.anthropic.com/pricing
 *   OpenAI:    https://openai.com/pricing
 *   Google:    https://ai.google.dev/pricing
 */

import type { AIProviderConfig } from "../types";

export const PROVIDER_CONFIGS: Record<string, AIProviderConfig> = {

  // ── Anthropic Claude ────────────────────────────────────────────────────────
  "claude-opus-4-7": {
    provider:    "anthropic",
    model:       "claude-opus-4-7",
    capabilities:["text-generation", "structured-output", "embedding"],
    costPer1kInputTokens:  0.005,    // $5.00 / 1M input
    costPer1kOutputTokens: 0.025,    // $25.00 / 1M output
    maxContextTokens:      1_000_000,
  },
  "claude-sonnet-4-6": {
    provider:    "anthropic",
    model:       "claude-sonnet-4-6",
    capabilities:["text-generation", "structured-output"],
    costPer1kInputTokens:  0.003,
    costPer1kOutputTokens: 0.015,
    maxContextTokens:      1_000_000,
  },
  "claude-haiku-4-5": {
    provider:    "anthropic",
    model:       "claude-haiku-4-5-20251001",
    capabilities:["text-generation"],
    costPer1kInputTokens:  0.001,
    costPer1kOutputTokens: 0.005,
    maxContextTokens:      200_000,
  },

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  "gpt-4o": {
    provider:    "openai",
    model:       "gpt-4o",
    capabilities:["text-generation", "structured-output"],
    costPer1kInputTokens:  0.0025,
    costPer1kOutputTokens: 0.01,
    maxContextTokens:      128_000,
  },
  "dall-e-3": {
    provider:    "openai",
    model:       "dall-e-3",
    capabilities:["image-generation"],
    costPer1kInputTokens:  0,        // flat per-image pricing
    costPer1kOutputTokens: 0,
    maxContextTokens:      0,
  },
  "text-embedding-3-small": {
    provider:    "openai",
    model:       "text-embedding-3-small",
    capabilities:["embedding"],
    costPer1kInputTokens:  0.00002,
    costPer1kOutputTokens: 0,
    maxContextTokens:      8_192,
  },

  // ── Google Gemini ───────────────────────────────────────────────────────────
  "gemini-2.5-flash": {
    provider:    "google",
    model:       "gemini-2.5-flash",
    capabilities:["text-generation", "structured-output"],
    costPer1kInputTokens:  0.000075,
    costPer1kOutputTokens: 0.0003,
    maxContextTokens:      1_000_000,
  },

  // ── Replicate (image/video gen) ─────────────────────────────────────────────
  "flux-1-schnell": {
    provider:    "replicate",
    model:       "black-forest-labs/flux-schnell",
    capabilities:["image-generation"],
    costPer1kInputTokens:  0,
    costPer1kOutputTokens: 0,
    maxContextTokens:      0,
  },
  "flux-1-pro": {
    provider:    "replicate",
    model:       "black-forest-labs/flux-1.1-pro",
    capabilities:["image-generation"],
    costPer1kInputTokens:  0,
    costPer1kOutputTokens: 0,
    maxContextTokens:      0,
  },
} as const;

// Flat per-image pricing (not token-based)
export const IMAGE_PRICING_USD: Record<string, number> = {
  "dall-e-3":          0.04,     // 1024×1024
  "dall-e-3-hd":       0.08,     // 1024×1024 HD
  "flux-1-schnell":    0.003,    // per image
  "flux-1-pro":        0.055,    // per image
  "stability-xl":      0.008,
};

// Default model per operation type
export const DEFAULT_PROVIDER: Record<string, string> = {
  "text-generation":    "claude-opus-4-7",
  "structured-output":  "claude-opus-4-7",
  "image-generation":   "flux-1-schnell",
  "embedding":          "text-embedding-3-small",
  "audio-transcription":"whisper-1",
};
