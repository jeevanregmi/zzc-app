/**
 * Domain Events — Canonical Contracts
 *
 * Every meaningful state change in ZZC emits a domain event.
 * Events decouple the action (upload file) from downstream reactions
 * (generate embedding, update analytics, refresh recommendations).
 *
 * Storage: Firestore collection "domain_events" — append-only event log.
 * Consumers: Cloudflare Workers (scheduled cron) poll unprocessed events.
 *
 * Event lifecycle:
 *   status: "pending"    → written by the action that caused the event
 *   status: "processing" → claimed by a Worker (idempotency via Firestore transaction)
 *   status: "completed"  → Worker finished all handlers
 *   status: "failed"     → Worker error after retries; needs manual inspection
 *
 * Idempotency: Workers must be idempotent — they may receive the same event
 * twice on failure/retry. Use DomainEvent.id as the idempotency key.
 */

// ── Event type registry ───────────────────────────────────────────────────────

export type DomainEventType =
  // Vault / media
  | "MediaAssetCreated"
  | "MediaAssetUpdated"
  | "MediaAssetDeleted"
  | "EmbeddingGenerated"          // MediaAsset.embeddingId populated
  | "TranscriptGenerated"         // MediaAsset.extractedText populated

  // AI generation
  | "AIGenerationRequested"
  | "AIGenerationCompleted"
  | "AIGenerationFailed"

  // Business / revenue
  | "ExpenseLogged"
  | "RevenueLogged"
  | "ContentPublished"
  | "ContentPerformanceUpdated"

  // Audience
  | "AudienceLeadCaptured"
  | "AudienceLeadSubscribed"
  | "AudienceLeadUnsubscribed"

  // Analytics
  | "AnalyticsSnapshotGenerated"
  | "GoalStatusChanged"

  // Recommendations
  | "RecommendationSignalRefreshed"
  | "RecommendationGenerated";

// ── Base event shape ──────────────────────────────────────────────────────────

export interface DomainEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  id:          string;              // UUID — idempotency key for Workers
  eventType:   DomainEventType;
  ownerId:     string;              // Firebase Auth UID of the triggering user
  occurredAt:  string;              // ISO timestamp of the action that caused the event
  status:      "pending" | "processing" | "completed" | "failed";
  processingAttempts: number;       // incremented on each Worker pickup
  errorMessage:string;              // "" on success; last error on failure
  payload:     T;                   // event-specific data (typed below)
  processedAt: string;              // "" until completed
}

// ── Typed event payloads ──────────────────────────────────────────────────────

export type MediaAssetCreatedPayload = {
  mediaAssetId: string;
  mimeType:     string;
  folder:       string;
  size:         number;
};

export type AIGenerationCompletedPayload = {
  generationLogId:  string;
  outputAssetIds:   string[];
  estimatedCostUSD: number;
  model:            string;
  provider:         string;
};

export type AudienceLeadCapturedPayload = {
  leadId:      string;
  email:       string;
  source:      string;
  topicIds:    string[];
};

export type ContentPublishedPayload = {
  contentAssetId:  string;
  platform:        string;
  platformVideoId: string;
  publishedAt:     string;
};

export type AnalyticsSnapshotGeneratedPayload = {
  snapshotId:    string;
  period:        string;
  pageViews:     number;
  newLeads:      number;
};

export type RecommendationGeneratedPayload = {
  signalId:              string;
  subjectId:             string;
  recommendedContentIds: string[];
};

// ── Concrete event types (for strong typing in Workers) ───────────────────────

export type MediaAssetCreatedEvent     = DomainEvent<MediaAssetCreatedPayload>;
export type AIGenerationCompletedEvent = DomainEvent<AIGenerationCompletedPayload>;
export type AudienceLeadCapturedEvent  = DomainEvent<AudienceLeadCapturedPayload>;
export type ContentPublishedEvent      = DomainEvent<ContentPublishedPayload>;
export type AnalyticsSnapshotEvent     = DomainEvent<AnalyticsSnapshotGeneratedPayload>;
export type RecommendationGeneratedEvent = DomainEvent<RecommendationGeneratedPayload>;

// ── EventEmitter interface (Firestore adapter implements this) ────────────────
// Keeps the domain layer independent of Firestore SDK details.

export interface EventEmitter {
  emit<T extends Record<string, unknown>>(
    ownerId:   string,
    eventType: DomainEventType,
    payload:   T,
  ): Promise<string>;              // returns event ID
}
