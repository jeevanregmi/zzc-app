/**
 * Job Queue System — Cron-Safe Background Processing
 *
 * WHY A JOB QUEUE:
 *   Cloudflare Pages Functions have a 30s CPU limit. Long-running operations
 *   (bulk normalization, AI enrichment of 50 signals) can't run in a single
 *   request. The job queue decouples triggering from execution:
 *   - Ingest writes a Job → cron worker reads pending Jobs → processes each
 *   - Failed jobs auto-retry with exponential backoff
 *   - Dead-letter jobs (maxRetries exceeded) surface in /vault/pipeline monitor
 *   - Admin can manually retry, skip, or cancel any job
 *
 * OPERATIONAL BENEFITS:
 *   - Visibility: every background operation is inspectable in Vault
 *   - Idempotency: each job has a unique ID used as dedup key
 *   - Backpressure: rate-limit by checking pending job count before creating more
 *   - Cost attribution: job records link to AI cost entries
 *
 * SCALING PATH:
 *   Today: Firestore + GitHub Actions / Cloudflare Cron
 *   Future: Replace with Cloudflare Queues or a proper task queue without
 *   changing the Job interface — the Firestore adapter is the only thing that changes.
 */

export type JobType =
  // Pipeline jobs
  | "normalize_signal"         // raw signal → normalized_content
  | "enrich_content"           // normalized_content → ai_enrichments
  | "publish_content"          // enriched content → publication
  | "bulk_normalize"           // normalize all pending signals in batch

  // Source monitoring
  | "poll_source"              // poll a single MonitoredSource
  | "poll_all_sources"         // poll all active sources (dispatches poll_source jobs)

  // AI generation
  | "generate_content_brief"   // create content brief from enrichment
  | "generate_thumbnail"       // generate thumbnail prompt for queue item

  // Maintenance
  | "archive_stale_signals"    // archive signals older than N days
  | "recompute_route_counts"   // recount route.matchCount from executions
  | "cleanup_failed_jobs";     // remove dead-letter jobs older than 30d

export type JobStatus =
  | "pending"    // queued; not yet claimed by a worker
  | "claimed"    // worker picked it up; in-flight
  | "completed"  // finished successfully
  | "failed"     // failed; will retry if attempts < maxAttempts
  | "dead"       // maxAttempts exceeded; needs manual intervention
  | "cancelled"  // admin cancelled before execution
  | "skipped";   // job was a duplicate or preconditions not met

export type JobPriority = "critical" | "high" | "normal" | "low";

// ── Job — stored in Firestore "jobs" collection ───────────────────────────

export interface Job {
  id:           string;
  type:         JobType;
  priority:     JobPriority;
  status:       JobStatus;

  // ── Payload (job-type specific) ───────────────────────────────────────
  // All jobs carry a typed payload. Worker reads `type` first, then casts `payload`.
  payload:      Record<string, unknown>;

  // ── Retry control ─────────────────────────────────────────────────────
  attempts:     number;          // current attempt count (0-indexed)
  maxAttempts:  number;          // default: 3
  nextRetryAt?: string;          // ISO timestamp; set on failure with backoff

  // ── Result ────────────────────────────────────────────────────────────
  result?:      Record<string, unknown>; // success output
  errorMessage?:string;          // last failure message
  errorStack?:  string;          // last failure stack trace (truncated)

  // ── Worker tracking ───────────────────────────────────────────────────
  workerId?:    string;          // identifies which worker invocation claimed it
  claimedAt?:   string;          // ISO timestamp of claim
  completedAt?: string;

  // ── Cost attribution ──────────────────────────────────────────────────
  estimatedCostUSD?: number;     // pre-flight estimate (AI jobs)
  actualCostUSD?:    number;     // post-completion actual cost

  // ── Idempotency ───────────────────────────────────────────────────────
  idempotencyKey?:   string;     // prevent duplicate job creation
  // Format: "{jobType}:{entityId}:{date}" — e.g. "normalize_signal:abc123:2026-05-16"

  // ── Metadata ──────────────────────────────────────────────────────────
  createdAt:    string;
  updatedAt:    string;
  createdBy:    string;          // admin UID or "system"
}

// ── Typed payload shapes ──────────────────────────────────────────────────
// Keep these in sync with the job processor in functions/api/run-jobs.ts

export interface NormalizeSignalPayload {
  signalId:    string;
  ownerId:     string;
  forceRenorm?: boolean;   // re-normalize even if already done
}

export interface EnrichContentPayload {
  normalizedContentId: string;
  ownerId:             string;
  enrichmentType:      string;
  modelId?:            string;    // override default model
}

export interface PollSourcePayload {
  sourceId:    string;
  sourceUrl:   string;
  sourceName:  string;
  ownerId:     string;
}

export interface ArchiveStaleSignalsPayload {
  olderThanDays: number;
  dryRun:        boolean;
}

// ── Job creation helpers (no Firestore dependency — just builds the shape) ─

export function buildJob(
  type:     JobType,
  payload:  Record<string, unknown>,
  opts: {
    priority?:        JobPriority;
    maxAttempts?:     number;
    idempotencyKey?:  string;
    createdBy?:       string;
    estimatedCostUSD?:number;
  } = {},
): Omit<Job, "id" | "createdAt" | "updatedAt"> {
  return {
    type,
    priority:     opts.priority    ?? "normal",
    status:       "pending",
    payload,
    attempts:     0,
    maxAttempts:  opts.maxAttempts ?? 3,
    createdBy:    opts.createdBy   ?? "system",
    idempotencyKey: opts.idempotencyKey,
    estimatedCostUSD: opts.estimatedCostUSD,
  };
}

// ── Backoff calculation ───────────────────────────────────────────────────
// Exponential backoff with jitter. Call after each failed attempt.

export function calcNextRetryAt(attempts: number): string {
  const baseMs   = 30_000;           // 30 seconds base
  const maxMs    = 3_600_000;        // 1 hour cap
  const backoff  = Math.min(baseMs * Math.pow(2, attempts), maxMs);
  const jitter   = Math.random() * 0.2 * backoff;   // ±20% jitter
  return new Date(Date.now() + backoff + jitter).toISOString();
}
