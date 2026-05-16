/**
 * Canonical Publish Status — ZZC Publishing State Machine
 *
 * Single source of truth for every content lifecycle in the system.
 * Replaces the fragmented per-collection status fields:
 *   - market_rates: verified + published booleans
 *   - structuredSchemes: verified + published booleans
 *   - vault_content_queue: QueueItemStatus
 *   - vault_intelligence_docs: ProcessingStatus + AdminApprovalStatus
 *   - source_signals: SignalStatus
 *
 * State machine transitions (valid paths only):
 *
 *   draft → reviewing → preview → published
 *                    ↘           ↘
 *                    rejected    archived
 *
 * Rules:
 *   - ONLY admin action advances status
 *   - AI-generated content always starts at "draft"
 *   - "preview" = visible at /vault/preview/* but NOT public
 *   - "published" = live on public frontend
 *   - "archived" = removed from public, preserved in Firestore history
 *   - "rejected" = terminal; admin must clone to restart
 */

export type PublishStatus =
  | "draft"      // created, admin-only visibility
  | "reviewing"  // admin is actively reviewing
  | "preview"    // ready for preview; visible in /vault/preview/* only
  | "published"  // live on public frontend
  | "archived"   // removed from public; history preserved
  | "rejected";  // terminal; requires manual re-entry

// ── Transition map (valid next states from each current state) ─────────────

export const PUBLISH_TRANSITIONS: Record<PublishStatus, PublishStatus[]> = {
  draft:     ["reviewing", "rejected"],
  reviewing: ["preview",   "rejected", "draft"],
  preview:   ["published", "reviewing"],
  published: ["archived"],
  archived:  ["draft"],      // allows re-opening archived content
  rejected:  [],             // terminal — no transitions
};

export function canTransition(from: PublishStatus, to: PublishStatus): boolean {
  return PUBLISH_TRANSITIONS[from].includes(to);
}

// ── Display metadata for each status ──────────────────────────────────────

export interface PublishStatusMeta {
  label:       string;
  color:       string;   // tailwind text class
  bg:          string;   // tailwind bg class
  border:      string;   // tailwind border class
  icon:        string;
  description: string;
}

export const PUBLISH_STATUS_META: Record<PublishStatus, PublishStatusMeta> = {
  draft: {
    label:       "Draft",
    color:       "text-zinc-400",
    bg:          "bg-zinc-800",
    border:      "border-zinc-700",
    icon:        "○",
    description: "Exists in Firestore; not visible anywhere publicly",
  },
  reviewing: {
    label:       "Reviewing",
    color:       "text-yellow-400",
    bg:          "bg-yellow-900/30",
    border:      "border-yellow-800",
    icon:        "◑",
    description: "Admin is actively reviewing this content",
  },
  preview: {
    label:       "Preview",
    color:       "text-blue-400",
    bg:          "bg-blue-900/30",
    border:      "border-blue-800",
    icon:        "◎",
    description: "Visible at /vault/preview/* only — not yet public",
  },
  published: {
    label:       "Published",
    color:       "text-green-400",
    bg:          "bg-green-900/30",
    border:      "border-green-800",
    icon:        "◉",
    description: "Live on public frontend",
  },
  archived: {
    label:       "Archived",
    color:       "text-zinc-500",
    bg:          "bg-zinc-900",
    border:      "border-zinc-800",
    icon:        "◫",
    description: "Removed from public; history preserved in Firestore",
  },
  rejected: {
    label:       "Rejected",
    color:       "text-red-400",
    bg:          "bg-red-900/20",
    border:      "border-red-900",
    icon:        "✕",
    description: "Terminal state; requires manual re-entry",
  },
};

// ── Base interface for all publishable content ─────────────────────────────
// Extend this in every content type that goes through the publish pipeline.

export interface PublishableBase {
  publishStatus:  PublishStatus;
  publishedAt?:   string;   // ISO timestamp — set when status → "published"
  publishedBy?:   string;   // admin UID — set when status → "published"
  archivedAt?:    string;   // ISO timestamp — set when status → "archived"
  rejectedAt?:    string;   // ISO timestamp — set when status → "rejected"
  rejectedReason?:string;   // admin note — set when status → "rejected"
  reviewNote?:    string;   // admin note during "reviewing" stage
}

// ── Backward-compat helper ────────────────────────────────────────────────
// Derives PublishStatus from legacy verified + published booleans.
// Used when reading Firestore docs that predate the publishStatus field.

export function derivePublishStatus(doc: {
  publishStatus?: PublishStatus;
  verified?: boolean;
  published?: boolean;
}): PublishStatus {
  if (doc.publishStatus) return doc.publishStatus;
  if (doc.published && doc.verified) return "published";
  if (doc.verified) return "reviewing";
  return "draft";
}
