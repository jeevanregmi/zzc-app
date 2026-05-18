/**
 * Content Pipeline — Stage-by-Stage Domain Contracts
 *
 * WHY THIS EXISTS:
 *   Without explicit stage types, signals mutate in place and pipeline state
 *   becomes unreadable. Separate stage documents mean:
 *   - Each stage is independently queryable, debuggable, and auditable
 *   - A normalization failure doesn't corrupt the raw signal
 *   - AI enrichment can be re-run without re-ingesting
 *   - Publications are immutable snapshots — rollback is trivial
 *   - Future: stage fanout (1 signal → N normalized formats) without schema changes
 *
 * PIPELINE STAGES:
 *
 *   SourceSignal (raw_ingestions / source_signals)
 *     ↓ normalize worker
 *   NormalizedContent (normalized_content)
 *     ↓ enrich worker (AI)
 *   AIEnrichment (ai_enrichments)
 *     ↓ admin moderation / approval
 *   Publication (publications)
 *     ↓ page_modules renderer
 *   Public Frontend
 *
 * SCALING IMPLICATIONS:
 *   - Each stage can be independently scaled, rate-limited, and retried
 *   - "normalized_content" is the system of record — source is raw, publication is derivative
 *   - "ai_enrichments" can be replaced when a better model ships without touching source data
 *   - Multiple enrichments can exist per content item (A/B on different prompts)
 */

import type { PublishStatus } from "./publish";

// ── Pipeline stage status ─────────────────────────────────────────────────

export type PipelineStageStatus =
  | "pending"     // queued, not yet processed
  | "processing"  // worker claimed; in flight
  | "completed"   // stage finished successfully
  | "failed"      // stage failed; see errorMessage
  | "skipped";    // stage bypassed (e.g. content already normalized)

// ── Source types ──────────────────────────────────────────────────────────
// Canonical list of where content can originate.

export type ContentSourceType =
  | "monitored_url"    // polled from MonitoredSource
  | "manual_ingest"    // admin pasted URL into Quick Ingest
  | "rss_feed"         // RSS/Atom feed item
  | "nrb_api"          // NRB official data API
  | "sebon_api"        // SEBON data API
  | "uploaded_document"// admin uploaded PDF/doc
  | "admin_authored";  // written directly by admin (no external source)

// ── Content format ────────────────────────────────────────────────────────

export type IntelContentFormat =
  | "news_signal"      // short intelligence signal (< 500 words)
  | "analysis"         // structured financial analysis (500-2000 words)
  | "data_update"      // structured data point (rate, price, stat)
  | "scheme_profile"   // full scheme / product profile
  | "explainer"        // educational long-form
  | "alert";           // time-sensitive market alert

// ─────────────────────────────────────────────────────────────────────────────
// Stage 1 — RawIngestion
// Maps 1:1 with existing source_signals collection.
// Alias interface for type clarity when passing to pipeline functions.
// ─────────────────────────────────────────────────────────────────────────────

export interface RawIngestion {
  id:             string;
  sourceUrl:      string;
  sourceName:     string;
  sourceType:     ContentSourceType;
  title:          string;
  rawBody:        string;       // unprocessed extracted text
  publishedAt?:   string;
  relevanceScore: number;       // 0-1 from ingest worker
  credibility:    "high" | "medium" | "low" | "unverified";
  sectorId?:      string;
  taxonomyTags:   { topicId: string; sectorId: string; score: number }[];
  ingestedAt:     string;
  ownerId:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 2 — NormalizedContent
// Collection: normalized_content
//
// WHY NORMALIZE:
//   Raw ingestion bodies are noisy (HTML artifacts, boilerplate, ads).
//   Normalization extracts the signal from the noise and produces a clean,
//   structured document that AI enrichment can reliably work with.
//   Crucially: this is DETERMINISTIC — no AI, no randomness.
// ─────────────────────────────────────────────────────────────────────────────

export interface NormalizedContent {
  id:               string;
  rawIngestionId:   string;      // FK → source_signals.id
  ownerId:          string;

  // ── Normalized fields ─────────────────────────────────────────────────
  title:            string;      // cleaned, de-duplicated
  slug:             string;      // URL-safe identifier
  body:             string;      // cleaned body text (HTML stripped, boilerplate removed)
  summary:          string;      // 1-3 sentence summary (extracted, not AI-generated)
  keyFacts:         string[];    // bullet-point facts extracted from body
  publishedAt?:     string;      // original article date (if determinable)
  language:         "en" | "ne" | "mixed";
  wordCount:        number;
  format:           IntelContentFormat;

  // ── Source metadata ───────────────────────────────────────────────────
  sourceUrl:        string;
  sourceName:       string;
  sourceType:       ContentSourceType;

  // ── Taxonomy ──────────────────────────────────────────────────────────
  sectorId?:        string;
  topicIds:         string[];
  entityIds:        string[];    // FK → entities.id (named entities found in text)
  tags:             string[];

  // ── Pipeline state ────────────────────────────────────────────────────
  stageStatus:      PipelineStageStatus;
  enrichmentStatus: "pending" | "enriched" | "skipped";
  publishStatus:    PublishStatus;

  // ── Metadata ──────────────────────────────────────────────────────────
  normalizedAt:     string;
  updatedAt:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 3 — AIEnrichment
// Collection: ai_enrichments
//
// WHY SEPARATE FROM NormalizedContent:
//   AI output is probabilistic and model-version-dependent. Keeping enrichments
//   as separate documents means:
//   - Re-enrich with a new model without touching source data
//   - A/B test enrichment prompts on the same content
//   - Audit which model produced which insight
//   - Rate-limit AI calls independently from normalization
// ─────────────────────────────────────────────────────────────────────────────

export type EnrichmentType =
  | "insight_extraction"   // key financial insights from content
  | "content_brief"        // content creation brief for AI Studio
  | "scheme_classification"// which schemes does this content relate to?
  | "risk_assessment"      // risk signals in the content
  | "data_extraction"      // structured data (rates, percentages) extracted from text
  | "translation_ne";      // Nepali translation of key sections

export interface AIEnrichment {
  id:                string;
  normalizedContentId: string;   // FK → normalized_content.id
  rawIngestionId:    string;     // FK → source_signals.id (denormalized for fast joins)
  ownerId:           string;

  // ── Enrichment output ─────────────────────────────────────────────────
  type:              EnrichmentType;
  modelId:           string;     // which model produced this (e.g. "claude-sonnet-4-6")
  modelProvider:     string;     // "anthropic" | "bedrock"
  promptVersion:     string;     // semver of the prompt template used

  // ── Content ───────────────────────────────────────────────────────────
  insights:          string[];   // key financial insights
  summary:           string;     // AI-generated 1-paragraph summary
  nepaliSummary?:    string;     // Nepali translation
  contentIdeas:      string[];   // content creation suggestions
  relatedSchemeIds:  string[];   // schemes this content is relevant to
  extractedData:     Record<string, unknown>; // structured data (rates, stats)
  confidenceScore:   number;     // 0-1 overall enrichment confidence

  // ── Token accounting ──────────────────────────────────────────────────
  inputTokens:       number;
  outputTokens:      number;
  estimatedCostUSD:  number;
  latencyMs:         number;

  // ── Pipeline state ────────────────────────────────────────────────────
  stageStatus:       PipelineStageStatus;
  reviewedBy?:       string;     // admin UID who reviewed this enrichment
  reviewedAt?:       string;

  // ── Metadata ──────────────────────────────────────────────────────────
  enrichedAt:        string;
  updatedAt:         string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stage 4 — Publication
// Collection: publications
//
// WHY IMMUTABLE RECORDS:
//   A publication is a snapshot of what was shown to the public at a point in time.
//   If you update the source, you create a NEW publication version (v2, v3...).
//   This gives you: rollback, audit trail, A/B publishing, scheduled content.
//
// FUTURE SCALING:
//   A publication can render to multiple surfaces: homepage module, /scheme/[id]
//   page, email digest, API response. The `surfaces` field controls this.
// ─────────────────────────────────────────────────────────────────────────────

export type PublicationSurface =
  | "homepage_signal_feed"
  | "scheme_detail_page"
  | "homepage_module"
  | "api_endpoint"
  | "email_digest"
  | "compare_page";

export interface Publication {
  id:                  string;
  normalizedContentId: string;
  enrichmentId?:       string;   // FK → ai_enrichments.id (if AI-enriched)
  ownerId:             string;
  version:             number;   // 1-indexed; increment on re-publish

  // ── Published content snapshot ────────────────────────────────────────
  title:               string;
  slug:                string;
  summary:             string;
  body:                string;
  nepaliSummary?:      string;
  keyFacts:            string[];
  tags:                string[];
  topicIds:            string[];
  relatedSchemeIds:    string[];
  sourceUrl:           string;
  sourceName:          string;

  // ── Rendering config ──────────────────────────────────────────────────
  surfaces:            PublicationSurface[];
  moduleType?:         string;   // if rendered as a page module
  format:              IntelContentFormat;

  // ── Publish state ─────────────────────────────────────────────────────
  publishStatus:       PublishStatus;
  publishedAt?:        string;
  publishedBy?:        string;
  unpublishedAt?:      string;
  scheduledFor?:       string;   // future: scheduled publish timestamp

  // ── Metadata ──────────────────────────────────────────────────────────
  createdAt:           string;
  updatedAt:           string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// Collection: audit_logs
//
// WHY SEPARATE FROM domain_events:
//   domain_events is a processing queue (pending → completed/failed).
//   audit_logs is a permanent compliance record — never mutated after write.
//   Operations: who changed what, when, from what state, to what state.
//   Required for: incident investigation, compliance, operational debugging.
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "content.published"
  | "content.unpublished"
  | "content.archived"
  | "content.rejected"
  | "route.created"
  | "route.toggled"
  | "route.deleted"
  | "scheme.published"
  | "scheme.verified"
  | "rate.published"
  | "rate.verified"
  | "module.published"
  | "module.hidden"
  | "enrichment.approved"
  | "enrichment.rejected"
  | "job.completed"
  | "job.failed"
  | "signal.ingested"
  | "signal.routed";

export interface AuditLog {
  id:           string;
  action:       AuditAction;
  actorId:      string;      // admin UID or "system" for automated actions
  actorType:    "admin" | "system" | "worker";
  entityType:   string;      // "NormalizedContent" | "SignalRoute" | "StructuredScheme" | ...
  entityId:     string;
  fromState?:   string;      // previous status/value
  toState?:     string;      // new status/value
  metadata:     Record<string, unknown>; // action-specific context
  occurredAt:   string;
}
