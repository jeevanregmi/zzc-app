export type DocFileType = "pdf" | "docx" | "md" | "txt" | "image" | "other";

/** Official sources = NRB, Parliament, MoF, EPF, SSF, SEBON, IRD */
export type SourceType = "official" | "unofficial" | "research" | "unknown";

export type DocCategory =
  | "research"
  | "strategy"
  | "legal"
  | "finance"
  | "content"
  | "intelligence"
  | "other";

/**
 * Upload is ALWAYS separate from AI analysis. A document in any status below
 * is guaranteed to be safely stored in R2 — status only reflects AI pipeline state.
 *
 *   ready          — uploaded, AI not yet run (initial state after upload)
 *   processing_ai  — AI analysis in progress
 *   ai_ready       — AI analysis complete, pending admin review
 *   ai_paused      — AI unavailable (billing/quota/no provider); upload is intact; retry later
 *   error          — legacy: AI failed with unknown error (kept for backward compat)
 */
export type ProcessingStatus =
  | "uploading"
  | "ready"
  | "processing_ai"
  | "ai_ready"
  | "ai_paused"
  | "error";

// Separate from ProcessingStatus — tracks admin review of AI output.
// An ai_ready doc must reach "approved" before queue items can be generated.
export type AdminApprovalStatus =
  | "pending_review"   // AI done, awaiting admin review in Admin Vault
  | "approved"         // Admin reviewed and approved — queue generation unlocked
  | "needs_revision";  // Admin flagged — AI output needs correction before use

export interface IntelligenceDocument {
  id:               string;
  ownerId:          string;
  title:            string;
  description:      string;
  fileName:         string;
  fileType:         DocFileType;
  mimeType:         string;
  fileSize:         number;
  storagePath:      string;
  downloadUrl:      string;
  folder:           string;
  tags:             string[];
  category:         DocCategory;
  processingStatus: ProcessingStatus;
  // ── AI base fields — populated after processing ───────────────────────────
  aiSummary?:          string;
  aiKeyInsights?:      string[];
  ocrText?:            string;
  translationNe?:      string;
  confidence?:         number;     // 0-1
  sourceCredibility?:  "high" | "medium" | "low" | "unverified";
  // ── Civic intelligence fields — Nepal government/finance specific ──────────
  sourceType?:         SourceType;         // official (NRB/Parliament/MoF) | unofficial | research
  sourceAuthority?:    string;             // "Nepal Rastra Bank" | "Parliament of Nepal" | etc.
  sourceUrl?:          string;             // original URL (for URL-ingested docs)
  affectedSectors?:    string[];           // ["banking", "EPF", "housing", "youth employment"]
  policyChanges?:      string[];           // specific regulatory/policy changes extracted
  financialImplications?: string[];        // NPR amounts, rates, percentages, deadlines
  youthImpact?:        string;             // one paragraph — impact on 18-35 Nepali workers
  ssfEpfCitRelevance?: string;             // specific SSF/EPF/CIT implications
  nepaliExplainer?:    string;             // 2-3 sentences in simple Nepali (सरल भाषामा)
  // ── Flywheel connector — feeds Content Pipeline ────────────────────────────
  detectedTopics?:     string[];           // ["EPF", "housing loan", "interest rate"]
  contentIdeas?:       string[];           // AI-proposed content titles/concepts
  // ── Admin validation gate ─────────────────────────────────────────────────
  adminApprovalStatus?:  AdminApprovalStatus;
  adminApprovalNotes?:   string;
  adminApprovedAt?:      string;
  // ── AI provider tracking ──────────────────────────────────────────────────
  aiProvider?:         string;
  aiRetryCount?:       number;
  aiProcessingError?:  string;
  // ── Metadata ──────────────────────────────────────────────────────────────
  pageCount?:          number;
  language?:           string;
  uploadedAt:          string;
  updatedAt:           string;
}

// Client-side only — never stored in Firestore
export interface DocUploadTask {
  localId:   string;
  fileName:  string;
  progress:  number;               // 0-100
  status:    "uploading" | "creating" | "done" | "error";
  error?:    string;
  docId?:    string;
}
