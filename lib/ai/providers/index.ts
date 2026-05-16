/**
 * Provider Registry
 *
 * ARCHITECTURE NOTE:
 *   lib/ai/providers/ contains ONLY interfaces and pure adapter logic.
 *   It NEVER imports actual SDKs (Anthropic, OpenAI, Google) directly.
 *
 *   Reason: the actual API calls must run in Cloudflare Pages Functions
 *   (functions/api/ai/) where the API keys live as environment variables.
 *   Client-side code (Next.js components, hooks) cannot safely hold API keys.
 *
 *   The provider adapters in this directory implement the ITextProvider /
 *   IImageProvider interfaces using raw fetch() calls (no SDK dependency).
 *   This makes them safe for Cloudflare Worker edge runtime.
 *
 * Provider execution boundary:
 *   Browser → fetch("/api/ai/generate") → Cloudflare Pages Function
 *           → instantiates provider adapter → calls AI API
 *           → returns typed AITextResponse
 *
 *   lib/ai/providers/ = edge-safe, fetch-based, no secrets
 *   functions/api/ai/ = has env vars, instantiates providers, runs tasks
 */

export type { ITextProvider, IImageProvider, IEmbedProvider, AIProviderConfig } from "../types";
export { PROVIDER_CONFIGS } from "./config";
export { createAnthropicProvider } from "./anthropic";
export { createBedrockProvider }   from "./bedrock";
