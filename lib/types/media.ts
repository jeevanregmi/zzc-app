/**
 * Media Domain — Canonical Contracts
 *
 * MediaAsset is the single source of truth for any media object in ZZC:
 * vault uploads, AI-generated images/videos, YouTube thumbnails, content assets.
 *
 * Field design rationale:
 *   relatedTopics/Schemes/Sectors — content-based feature vectors for recommendation.
 *   embeddingId     — pointer to vector DB record; populate after indexing pipeline runs.
 *   extractedText   — OCR / speech-to-text; enables full-text search without extra queries.
 *   metadata        — un-indexed extension bag; avoids schema migrations for rare fields.
 *   promptHash      — SHA-256 of prompt for deduplication in AI generation queue.
 *
 * All timestamps are ISO 8601 strings (never Date objects) for Firestore/Worker safety.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export type MediaMimeType =
  | "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/svg+xml"
  | "video/mp4"  | "video/webm" | "video/quicktime"
  | "audio/mpeg" | "audio/wav"  | "audio/ogg"
  | "application/pdf"
  | "text/plain";

export type AIMediaModel =
  | "midjourney" | "dalle3" | "stable-diffusion" | "flux"
  | "sora" | "runway" | "kling" | "pika"
  | "claude" | "gemini" | "";

export type AIProvider =
  | "anthropic" | "openai" | "google" | "aws-bedrock"
  | "replicate" | "stability-ai" | "runway-ml" | "midjourney" | "other";

export type AIOperation =
  | "recommendation" | "content-gen" | "image-gen" | "video-gen"
  | "analysis" | "embedding" | "chat" | "transcription" | "summarization";

export type MediaContentType =
  | "financial-education"
  | "product-demo"
  | "testimonial"
  | "tutorial"
  | "research"
  | "personal"
  | "marketing"
  | "raw-footage"
  | "thumbnail"
  | "b-roll"
  | "other";

export type MediaSource =
  | "original"          // self-created
  | "ai-generated"      // output of an AI generation run
  | "youtube"           // captured from YouTube
  | "tiktok"
  | "reels"
  | "screen-recording"
  | "document-scan"
  | "external"
  | "";

export type MediaVisibility = "private" | "internal" | "public";

export type MediaUsageStatus = "draft" | "ready" | "published" | "archived";

export type MediaTopic =
  | "investment" | "retirement" | "insurance" | "loan" | "sip"
  | "youtube"    | "social"    | "marketing"  | "research"
  | "personal"   | "product"   | "brand"      | "other";

// ── MediaAsset ───────────────────────────────────────────────────────────────

export interface MediaAsset {
  id:              string;
  ownerId:         string;            // Firebase Auth UID
  createdBy:       string;            // Firebase Auth UID (future: multi-user)

  // Core descriptors
  title:           string;
  description:     string;
  tags:            string[];
  contentType:     MediaContentType;

  // Storage
  storagePath:     string;            // gs://bucket/vault/{uid}/media/{filename}
  thumbnailPath:   string;            // gs://bucket/vault/{uid}/thumbs/{id}  or ""
  downloadUrl:     string;            // public / signed download URL
  thumbnailUrl:    string;            // "" until thumbnail generated

  // File properties
  mimeType:        MediaMimeType;
  size:            number;            // bytes
  width:           number;            // pixels; 0 for audio/PDF
  height:          number;
  durationSeconds: number;            // 0 for images/docs

  // Organization
  folder:          string;            // virtual path e.g. "zzc/2026-05"
  visibility:      MediaVisibility;
  usageStatus:     MediaUsageStatus;

  // AI provenance
  sourceType:      MediaSource;
  aiGenerated:     boolean;
  prompt:          string;            // prompt used to generate this asset
  aiModel:         AIMediaModel;
  generationCost:  number;            // USD (0 for original captures)
  generationLogId: string;            // → AIGenerationLog.id  or ""

  // Intelligence feature vectors — drive semantic search + recommendations
  relatedTopics:   string[];          // ["sip", "retirement", "investment"]
  relatedSchemes:  string[];          // ["SIP", "SSF", "NLF", "PPF"]
  relatedSectors:  string[];          // ["banking", "insurance", "mutual-funds"]

  // AI pipeline hooks — populated asynchronously by background workers
  embeddingId:     string;            // vector DB record ID  (empty until indexed)
  extractedText:   string;            // OCR / ASR transcript (empty until processed)

  // Flexible extension — not indexed, not queried, survives schema changes
  metadata:        Record<string, string | number | boolean>;

  createdAt:       string;
  updatedAt:       string;
}

// ── AIGenerationLog ──────────────────────────────────────────────────────────
// Every AI generation call is logged here — cost accounting, dedup, audit trail.
// Future automation: queue workers write status here; analytics reads cost totals.

export interface AIGenerationLog {
  id:               string;
  ownerId:          string;

  // Model identity
  model:            string;           // "claude-opus-4-7" | "flux-1-pro" | "dall-e-3"
  provider:         AIProvider;
  operation:        AIOperation;

  // Prompt — stored in full for reproducibility; hashed for dedup
  prompt:           string;
  systemPrompt:     string;           // "" for non-LLM operations
  promptHash:       string;           // SHA-256(prompt + model) — dedup key

  // Cost accounting
  inputTokens:      number;           // 0 for image/video gen
  outputTokens:     number;
  estimatedCostUSD: number;
  generationMs:     number;           // wall-clock latency in ms

  // Output linkage — populated when generation completes
  outputAssetIds:   string[];         // MediaAsset.id[] produced by this run
  relatedFeature:   string;           // UI surface that triggered this: "/vault/ai-queue"

  // Status lifecycle
  status:           "pending" | "processing" | "completed" | "failed";
  errorMessage:     string;           // "" on success

  // Metadata passthrough
  metadata:         Record<string, string | number | boolean>;

  createdAt:        string;
  updatedAt:        string;
}
