// Spiritual Recommendation Queue types.
//
// AI analyzes uploaded sacred texts → generates suggestions →
// founder approves/edits/rejects each → approved items update the intelligence graph.
//
// Architecture: AI recommends. Founder decides. Nothing publishes automatically.

import type { LeelaRelationType } from "./temple-vault";

// ── Suggestion types ───────────────────────────────────────────────────────────

export type SuggestionType =
  | "shloka_atom"            // extract individual verse as an intelligence atom
  | "sanskrit_term"          // add term to spiritual dictionary
  | "character_enrichment"   // enrich existing deity/character record
  | "character_relationship" // add relationship edge to the leela graph
  | "bhajan_media_seed"      // line suitable for devotional media
  | "public_readiness";      // text ready for Bhakti Chautari

export type SuggestionStatus =
  | "pending"   // awaiting founder review
  | "approved"  // founder approved — applied to graph
  | "edited"    // founder edited then approved — applied with edits
  | "rejected"  // founder rejected
  | "deferred"; // saved for later review

export const SUGGESTION_TYPE_LABELS: Record<SuggestionType, string> = {
  shloka_atom:            "श्लोक Atom",
  sanskrit_term:          "Sanskrit Term",
  character_enrichment:   "Character",
  character_relationship: "Relationship",
  bhajan_media_seed:      "Media Seed",
  public_readiness:       "Publish",
};

export const SUGGESTION_TYPE_ICONS: Record<SuggestionType, string> = {
  shloka_atom:            "📿",
  sanskrit_term:          "🔤",
  character_enrichment:   "✦",
  character_relationship: "↔",
  bhajan_media_seed:      "🎵",
  public_readiness:       "🌐",
};

export const SUGGESTION_STATUS_COLORS: Record<SuggestionStatus, string> = {
  pending:  "text-amber-400 border-amber-800/50 bg-amber-950/20",
  approved: "text-green-400 border-green-800/50 bg-green-950/20",
  edited:   "text-sky-400 border-sky-800/50 bg-sky-950/20",
  rejected: "text-zinc-700 border-zinc-800/50 bg-zinc-900/20",
  deferred: "text-zinc-500 border-zinc-700/50 bg-zinc-900/20",
};

export const SUGGESTION_STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending:  "Pending",
  approved: "अनुमोदित",
  edited:   "सम्पादित",
  rejected: "अस्वीकृत",
  deferred: "स्थगित",
};

// ── Typed payload per suggestion type ─────────────────────────────────────────

export interface ShlokaAtomPayload {
  type:              "shloka_atom";
  originalLine:      string;
  nepaliMeaning:     string;
  hindiMeaning?:     string;
  englishSupport?:   string;
  keyTerms:          string[];
  devotionalEmotion?:string;  // DevotionalRasa value
}

export interface SanskritTermPayload {
  type:                  "sanskrit_term";
  term:                  string;
  nepaliMeaning:         string;
  hindiMeaning?:         string;
  englishMeaning?:       string;
  philosophicalConcept?: string;
}

export interface CharacterEnrichmentPayload {
  type:           "character_enrichment";
  characterId:    string;
  characterName:  string;
  field:          string;  // SpiritualCharacter field name
  valueSanskrit?: string;
  valueNepali?:   string;
  valueEnglish?:  string;
  valueList?:     string[];
}

export interface RelationshipPayload {
  type:         "character_relationship";
  fromId:       string;
  fromName:     string;
  toId:         string;
  toName:       string;
  relationType: LeelaRelationType;
  contextNote?: string;
}

export interface BhajanMediaPayload {
  type:          "bhajan_media_seed";
  suggestedTitle:string;
  selectedLines: string[];
  mediaType:     "devotional_reel" | "quote_card" | "chant_audio";
  mood?:         string;
}

export interface PublicReadinessPayload {
  type:            "public_readiness";
  note:            string;
  readinessScore?: number;  // 0-100
  blockers?:       string[];
}

export type SuggestionPayload =
  | ShlokaAtomPayload
  | SanskritTermPayload
  | CharacterEnrichmentPayload
  | RelationshipPayload
  | BhajanMediaPayload
  | PublicReadinessPayload;

// ── Main document ──────────────────────────────────────────────────────────────

export interface SpiritualSuggestion {
  id?:              string;
  ownerId:          string;
  sourceTextId:     string;
  sourceTextTitle?: string;

  suggestionType:   SuggestionType;
  payload:          SuggestionPayload;

  aiConfidence?:    number;   // 0-100
  aiReasoning?:     string;

  status:           SuggestionStatus;
  founderNote?:     string;
  editedPayload?:   SuggestionPayload;

  createdAt:        string;
  reviewedAt?:      string;
}
