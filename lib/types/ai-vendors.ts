/**
 * AI Vendor Evaluation — ZZC Media Intelligence
 *
 * Purpose: systematic vendor selection for text, image, voice, video, automation.
 * These types power:
 *   - cost governance decisions
 *   - content ROI attribution
 *   - A/B experiment tracking
 *   - benchmark reporting for the founder
 *
 * NOT a full orchestration system — these are stable data contracts only.
 * Computation happens in Cloudflare Workers or AI orchestrators.
 */

// ── Vendor Registry ───────────────────────────────────────────────────────────

export type AICapability =
  | "text-generation" | "image-generation" | "voice-generation"
  | "video-generation" | "embedding" | "transcription"
  | "code-generation" | "multimodal" | "fine-tuning";

export type ContentLanguage = "nepali" | "english" | "hindi" | "mixed";

export type VendorTier = "free" | "pay-as-you-go" | "subscription" | "enterprise";

export interface AIVendorModel {
  modelId:           string;           // e.g. "claude-opus-4-7", "dall-e-3", "kling-v1"
  vendorId:          string;           // → AIVendor.id
  capability:        AICapability;
  contextWindowK:    number;           // tokens (0 for non-text)
  inputPriceUSD:     number;           // per 1M tokens or per image/second
  outputPriceUSD:    number;           // per 1M tokens (0 for image/video)
  priceUnit:         "per_1m_tokens" | "per_image" | "per_second" | "per_minute" | "flat";
  maxOutputTokens:   number;
  supportsStreaming:  boolean;
  supportsFunctions:  boolean;         // tool use / function calling
  qualityScore:      number;           // 1-10 subjective quality (founder-rated)
  speedScore:        number;           // 1-10 (10 = fastest)
  nepalSuitability:  number;           // 1-10: how well it handles Nepali content
  languagesSupported: ContentLanguage[];
  notes:             string;
  deprecated:        boolean;
  addedAt:           string;
}

export interface AIVendor {
  id:             string;              // "anthropic" | "openai" | "google" | "runway-ml" etc.
  name:           string;
  website:        string;
  capabilities:   AICapability[];
  tier:           VendorTier;
  hasAPI:         boolean;
  hasMCP:         boolean;             // supports MCP for agent use
  cloudflareNative: boolean;           // available in Cloudflare Workers AI
  dataResidency:  string;              // "US" | "EU" | "global"
  gdprCompliant:  boolean;
  soc2:           boolean;
  overallScore:   number;              // 1-10 composite (cost × quality × speed)
  recommended:    boolean;             // founder-approved for production use
  notes:          string;
  addedAt:        string;
}

// ── Generation Benchmark ──────────────────────────────────────────────────────
// One record per generation job. Written by the AI orchestrator after completion.

export interface GenerationBenchmark {
  id:              string;
  vendorId:        string;
  modelId:         string;
  capability:      AICapability;
  prompt:          string;             // first 200 chars only (privacy)
  promptHash:      string;             // SHA-256 for dedup/caching
  inputTokens:     number;
  outputTokens:    number;
  durationMs:      number;
  costUSD:         number;
  qualityRating:   number | null;      // 1-5, set by founder review
  retryCount:      number;
  failureReason:   string;
  outputAssetId:   string;             // → MediaAsset.id if asset was created
  contentType:     string;             // "thumbnail" | "script" | "caption" | "voice" | "video"
  language:        ContentLanguage;
  createdAt:       string;
}

export interface VendorBenchmarkSummary {
  vendorId:          string;
  modelId:           string;
  period:            string;           // "2026-05"
  totalJobs:         number;
  successJobs:       number;
  failureRate:       number;           // %
  avgDurationMs:     number;
  avgCostUSD:        number;
  totalCostUSD:      number;
  avgQualityRating:  number;           // avg of founder-rated scores
  avgRetryCount:     number;
  costPer1kJobs:     number;
}

// ── Content A/B Experiment ────────────────────────────────────────────────────

export type ABVariantType =
  | "thumbnail" | "hook" | "caption" | "title" | "cta" | "voice" | "video-style";

export type ABStatus = "running" | "concluded" | "paused" | "archived";
export type ABWinner = "control" | "variant" | "no_difference" | "pending";

export interface ABVariant {
  id:             string;
  type:           ABVariantType;
  label:          string;              // "Thumbnail A — red background"
  contentAssetId: string;              // → ContentAsset.id
  mediaAssetId:   string;              // → MediaAsset.id (the actual asset)
  generationLog:  string;              // → AIGenerationLog.id
  prompt:         string;
  modelId:        string;
  costUSD:        number;
  impressions:    number;
  clicks:         number;
  ctr:            number;              // %
  views:          number;
  watchTimeSec:   number;
  conversions:    number;
  engagementScore:number;              // platform-specific composite
}

export interface ABExperiment {
  id:             string;
  ownerId:        string;
  title:          string;
  hypothesis:     string;              // "Red thumbnails get higher CTR than blue"
  variantType:    ABVariantType;
  platform:       string;              // "youtube" | "tiktok" etc.
  status:         ABStatus;
  control:        ABVariant;
  variant:        ABVariant;
  startDate:      string;
  endDate:        string;
  minImpressions: number;              // required for statistical significance
  winner:         ABWinner;
  confidencePct:  number;              // statistical confidence 0-100
  learnings:      string;
  appliedTo:      string;              // what changed as a result
  createdAt:      string;
  updatedAt:      string;
}

// ── Content ROI ───────────────────────────────────────────────────────────────

export interface ContentROI {
  contentAssetId: string;
  period:         string;              // "2026-05"
  platform:       string;
  views:          number;
  watchTimeHours: number;
  ctr:            number;
  shares:         number;
  saves:          number;
  comments:       number;
  subscribersGained: number;
  revenueUSD:     number;
  revenueNPR:     number;
  aiCostUSD:      number;
  productionCostNPR: number;
  netROI:         number;              // (revenueNPR - totalCostNPR) / totalCostNPR × 100
  conversionLeads:number;              // AudienceLead records from this content
  conversionValue:number;              // NPR value of those leads
  computedAt:     string;
}

// ── Vendor Decision Log ───────────────────────────────────────────────────────
// Immutable record of why a vendor/model was chosen or rejected for a use case.

export interface VendorDecision {
  id:          string;
  ownerId:     string;
  useCase:     string;                 // "thumbnail generation" | "weekly script" etc.
  chosen:      string;                 // vendorId chosen
  rejected:    string[];               // vendorIds considered but not chosen
  reasons:     string[];               // bullet reasons
  benchmarkIds:string[];               // → GenerationBenchmark.id[] that informed this
  costImpact:  string;                 // "saves ~$12/month vs OpenAI"
  madeAt:      string;
}
