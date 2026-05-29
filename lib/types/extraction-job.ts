/**
 * Shared extraction job telemetry schema.
 *
 * Used by all ZZC background extraction pipelines:
 *   economy      → economy_extraction_jobs/{docId}
 *   atomic       → atomic_extraction_jobs/{docId}
 *   constitution → constitution_extraction_jobs/{docId}
 *   sacred_text  → sacred_extraction_jobs/{docId}
 *
 * The Firestore document is written by the Cloudflare Worker (REST API)
 * and read by the frontend (onSnapshot via Firebase SDK).
 */

export type ExtractionPipeline =
  | "economy"
  | "atomic"
  | "constitution"
  | "sacred_text";

export type ExtractionJobStatus =
  | "queued"
  | "fetching_document"
  | "reading_pdf"
  | "ai_processing"
  | "saving_atoms"
  | "completed"
  | "failed";

export interface ExtractionJob {
  id:                string;
  pipeline:          ExtractionPipeline;
  status:            ExtractionJobStatus;
  progressPercent:   number;
  currentStepNepali: string;

  // Document context
  docId:             string;
  docTitle?:         string;
  fiscalYear?:       string;

  // Progress counters
  pageCount?:        number;
  pagesProcessed?:   number;
  recordsExtracted?: number;
  recordsRejected?:  number;

  // AI telemetry
  providerUsed?:     string;
  inputTokens?:      number;
  outputTokens?:     number;
  estimatedCostUSD?: number;
  fileSizeMB?:       number;

  // Timing (ISO strings)
  startedAt:         string;
  updatedAt:         string;
  lastHeartbeatAt:   string;
  completedAt?:      string;

  // Error
  errorMessage?:     string;
}

// ── Nepali step labels ─────────────────────────────────────────────────────────

export const STEP_LABEL: Record<ExtractionJobStatus, string> = {
  queued:            "सुरु हुँदैछ…",
  fetching_document: "PDF डाउनलोड गर्दैछ…",
  reading_pdf:       "PDF पढ्दैछ…",
  ai_processing:     "AI ले atoms निकाल्दैछ…",
  saving_atoms:      "Firestore मा save गर्दैछ…",
  completed:         "✅ सकियो",
  failed:            "❌ गल्ती भयो",
};

// ── Cost estimation (Gemini Flash 2.0 pricing, USD) ───────────────────────────

const GEMINI_INPUT_PER_M  = 0.10;   // $0.10 per 1M input tokens
const GEMINI_OUTPUT_PER_M = 0.40;   // $0.40 per 1M output tokens

export function estimateCostUSD(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * GEMINI_INPUT_PER_M
       + (outputTokens / 1_000_000) * GEMINI_OUTPUT_PER_M;
}

export function formatCostUSD(usd: number): string {
  if (usd < 0.001) return "<$0.001";
  return `$${usd.toFixed(3)}`;
}

// ── Stuck detection ────────────────────────────────────────────────────────────

const STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

export function isJobStuck(job: Pick<ExtractionJob, "status" | "lastHeartbeatAt">): boolean {
  if (job.status === "completed" || job.status === "failed") return false;
  const last = new Date(job.lastHeartbeatAt).getTime();
  return Date.now() - last > STUCK_THRESHOLD_MS;
}
