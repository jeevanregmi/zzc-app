/**
 * AI Orchestration Layer — Provider-Agnostic Contracts
 *
 * The orchestrator and all domain code depend ONLY on these interfaces.
 * Individual provider adapters (anthropic.ts, openai.ts) implement them.
 *
 * This prevents vendor lock-in: swapping Claude for Gemini is a config change,
 * not a refactor. It also allows mocking in tests without touching provider SDKs.
 *
 * Boundary rule: nothing outside lib/ai/providers/ may import Anthropic/OpenAI SDKs.
 */

// ── Provider interface ────────────────────────────────────────────────────────

export type AIModelCapability =
  | "text-generation"
  | "image-generation"
  | "video-generation"
  | "audio-transcription"
  | "embedding"
  | "structured-output";

export interface AIProviderConfig {
  provider:     "anthropic" | "openai" | "google" | "replicate" | "stability-ai" | "runway-ml";
  model:        string;
  capabilities: AIModelCapability[];
  costPer1kInputTokens:  number;    // USD
  costPer1kOutputTokens: number;
  maxContextTokens:      number;
}

// ── Request / Response ────────────────────────────────────────────────────────

export interface AITextRequest {
  system?:     string;
  messages:    { role: "user" | "assistant"; content: string }[];
  maxTokens:   number;
  temperature?: number;
  thinking?:   boolean;
}

export interface AITextResponse {
  content:      string;
  inputTokens:  number;
  outputTokens: number;
  model:        string;
  latencyMs:    number;
}

export interface AIImageRequest {
  prompt:     string;
  width:      number;
  height:     number;
  steps?:     number;
  seed?:      number;
}

export interface AIImageResponse {
  imageUrl:  string;
  seed:      number;
  latencyMs: number;
}

export interface AIEmbedRequest {
  text:  string;
  model: string;
}

export interface AIEmbedResponse {
  embedding: number[];
  model:     string;
  tokens:    number;
}

// ── Provider interface (all adapters implement this) ─────────────────────────

export interface ITextProvider {
  generate(request: AITextRequest): Promise<AITextResponse>;
}

export interface IImageProvider {
  generateImage(request: AIImageRequest): Promise<AIImageResponse>;
}

export interface IEmbedProvider {
  embed(request: AIEmbedRequest): Promise<AIEmbedResponse>;
}

// ── Orchestration task types ──────────────────────────────────────────────────

export type OrchestrationTaskType =
  | "generate-content-brief"
  | "generate-recommendation"
  | "generate-financial-insight"
  | "generate-semantic-tags"
  | "generate-thumbnail-prompt"
  | "summarize-analytics";

export interface OrchestrationTask {
  id:          string;
  taskType:    OrchestrationTaskType;
  ownerId:     string;
  inputData:   Record<string, unknown>;
  outputData:  Record<string, unknown>;
  status:      "pending" | "running" | "completed" | "failed";
  providerConfig: AIProviderConfig;
  costUSD:     number;
  latencyMs:   number;
  generationLogId: string;          // → AIGenerationLog.id
  createdAt:   string;
  completedAt: string;
}

// ── Prompt template interface ─────────────────────────────────────────────────
// All prompt templates in lib/ai/prompts/ implement this.

export interface PromptTemplate<TInput, TOutput> {
  name:        string;
  description: string;
  build(input: TInput): AITextRequest;
  parse(response: AITextResponse): TOutput;
}
