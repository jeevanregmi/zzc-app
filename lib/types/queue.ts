/**
 * Content Queue — Admin Validation Pipeline
 *
 * Every queue item must carry a complete source trace back to its
 * originating intelligence document. This is not optional metadata —
 * it is a schema constraint enforcing the platform's credibility principle:
 * no AI-generated content enters the pipeline without a verifiable source.
 */

export type QueueItemStatus =
  | "pending"       // awaiting admin review
  | "approved"      // admin approved → ready for AI Studio or production
  | "in_production" // being worked on
  | "rejected"      // admin rejected — will not publish
  | "archived";     // expired without review, or manually archived

export type QueueContentType =
  | "youtube-long"    // 5-12 min explainer
  | "shorts"          // 15-60 sec vertical video
  | "facebook-post"   // 200-500 word educational post
  | "carousel"        // 5-8 slide explanation
  | "explainer"       // general format not yet decided
  | "other";

export type QueuePlatform = "youtube" | "instagram" | "facebook" | "all";

export interface QueueItem {
  id:        string;
  ownerId:   string;

  // ── Content proposal ────────────────────────────────────────────────────────
  aiTitle:       string;                // AI-generated title or concept
  contentType:   QueueContentType;
  platform:      QueuePlatform;

  // ── SOURCE TRACEABILITY — document-sourced items ──────────────────────────────
  // Present when the item originates from an uploaded vault document.
  sourceDocId?:       string;    // vault_intelligence_docs document ID
  sourceDocTitle?:    string;    // human-readable title of the source doc
  sourceDocUrl?:      string;    // Firebase Storage URL — direct link to original file
  sourceDocFileName?: string;    // original filename for display
  sourceInsights?:    string[];  // the specific extracted insights that support this idea
  sourceUploadedAt?:  string;

  // ── SOURCE TRACEABILITY — signal-sourced items ────────────────────────────────
  // Present when the item originates from a SourceSignal (live intelligence feed).
  sourceSignalId?: string;       // source_signals document ID
  brief?:          string;       // AI-generated content brief
  hooks?:          string[];     // attention-grabbing hooks for the piece
  aiModel?:        string;       // model used to generate this item
  tags?:           string[];     // taxonomy topic IDs from the signal

  // ── Intelligence scores ───────────────────────────────────────────────────────
  confidence: number;            // 0.0–1.0 from AI analysis of source
  language?:  string;

  // ── Admin workflow ────────────────────────────────────────────────────────────
  status:      QueueItemStatus;
  adminNotes?: string;           // admin comments when reviewing
  expiresAt?:  string;           // auto-archive if pending past this date (7 days)

  // ── Timestamps ────────────────────────────────────────────────────────────────
  createdAt:   string;
  updatedAt:   string;
  approvedAt?: string;
  rejectedAt?: string;
}
