/**
 * Universal Recommendation Schema
 *
 * Every intelligence object in ZZC — documents, constitutional records,
 * janta intel, sacred texts, characters — continuously generates enrichment
 * suggestions. All flow through this single schema and the recommendation_queue
 * Firestore collection. Founder approves or rejects. Nothing auto-applies.
 */

// ── Target types ──────────────────────────────────────────────────────────────

export type RecommendationTarget =
  | "document"              // vault_intelligence_docs
  | "constitutional_record" // constitutional_framework
  | "janta_record"          // janta_intelligence
  | "sacred_text"           // sacred_texts       (Phase 5)
  | "shloka_atom"           // shloka_atoms        (Phase 5)
  | "character"             // spiritual_characters (Phase 5)
  | "semantic_atom"         // semantic_dictionary  (Phase 5)
  | "media_atom";           // media_atoms          (Phase 5)

// ── Recommendation kinds ──────────────────────────────────────────────────────

export type RecommendationKind =
  | "identity_fix"          // set govFolder, lifecycleType, institutionName
  | "metadata"              // fill tags, constitutionalParts, originalSourceUrl
  | "canonical_promotion"   // document has enough identity → promote to canonical_documents
  | "duplicate_detected"    // another document appears to be the same real-world doc
  | "relationship"          // suggest a graph edge between two objects
  | "duplicate_merge"       // two objects likely represent the same thing
  | "character_enrichment"  // add attributes to a spiritual character
  | "sanskrit_term"         // new semantic_dictionary entry
  | "media_grounding"       // suggest a media_atom reference
  | "publication_ready"     // object ready to publish (publishToJanta toggle)
  | "lifecycle_update";     // suggest lifecycle type change

// ── Status ────────────────────────────────────────────────────────────────────

export type RecommendationStatus =
  | "pending"   // awaiting founder review
  | "approved"  // applied to the target object
  | "rejected"  // explicitly declined
  | "snoozed";  // defer for later without rejecting

// ── Signal trace ──────────────────────────────────────────────────────────────

export interface RecommendationSignal {
  type:  string;   // machine label ("kit_match", "zero_partNumber", …)
  label: string;   // human-readable explanation shown in the UI
}

// ── Main record ───────────────────────────────────────────────────────────────

export interface UniversalRecommendation {
  id:           string;   // deterministic: `${targetId}_${kind}_${field ?? kind}`
  ownerId:      string;
  createdAt:    string;   // ISO string

  // What is being enriched
  targetType:   RecommendationTarget;
  targetId:     string;
  targetLabel:  string;   // human-readable name (title, articleId, etc.)

  // What is being suggested
  kind:         RecommendationKind;
  field?:       string;   // for identity_fix / metadata — which field
  current:      unknown;  // existing value (null/undefined if missing)
  suggested:    unknown;  // proposed value to apply on approve

  // Confidence + reasoning
  confidence:   number;           // 0-100
  reasoning:    string;           // Nepali explanation shown to founder
  signals:      RecommendationSignal[];

  // Review state
  status:       RecommendationStatus;
  reviewedAt?:  string;
  reviewNote?:  string;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const REC_KIND_LABELS: Record<RecommendationKind, string> = {
  identity_fix:         "Identity",
  metadata:             "Metadata",
  canonical_promotion:  "Canonical",
  duplicate_detected:   "Duplicate",
  relationship:         "सम्बन्ध",
  duplicate_merge:      "Merge",
  character_enrichment: "Character",
  sanskrit_term:        "Sanskrit",
  media_grounding:      "Media",
  publication_ready:    "प्रकाशन",
  lifecycle_update:     "Lifecycle",
};

export const REC_TARGET_LABELS: Record<RecommendationTarget, string> = {
  document:              "Documents",
  constitutional_record: "संविधान",
  janta_record:          "Janta Intel",
  sacred_text:           "Sacred Texts",
  shloka_atom:           "Shloka",
  character:             "Character",
  semantic_atom:         "Semantic",
  media_atom:            "Media Atom",
};

export const REC_KIND_COLORS: Record<RecommendationKind, string> = {
  identity_fix:         "bg-purple-900/30 text-purple-300",
  metadata:             "bg-sky-900/30 text-sky-300",
  canonical_promotion:  "bg-violet-900/30 text-violet-300",
  duplicate_detected:   "bg-orange-900/30 text-orange-300",
  relationship:         "bg-indigo-900/30 text-indigo-300",
  duplicate_merge:      "bg-orange-900/30 text-orange-300",
  character_enrichment: "bg-rose-900/30 text-rose-300",
  sanskrit_term:        "bg-yellow-900/30 text-yellow-300",
  media_grounding:      "bg-cyan-900/30 text-cyan-300",
  publication_ready:    "bg-green-900/30 text-green-300",
  lifecycle_update:     "bg-teal-900/30 text-teal-300",
};

export function recConfidenceColor(confidence: number): string {
  if (confidence >= 80) return "text-green-400";
  if (confidence >= 50) return "text-amber-400";
  return "text-zinc-400";
}

export function recConfidenceBg(confidence: number): string {
  if (confidence >= 80) return "bg-green-900/20 border-green-800/40";
  if (confidence >= 50) return "bg-amber-900/20 border-amber-800/40";
  return "bg-zinc-900/40 border-zinc-800/40";
}
