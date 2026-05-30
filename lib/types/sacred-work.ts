/**
 * Sacred Work — canonical model for ZZC Sacred Intelligence Studio.
 *
 * A SacredWork is the top-level canonical entity for a specific composition:
 * Rudrashtakam, Nirvana Shatakam, Bhaja Govindam, Hanuman Chalisa, etc.
 *
 * One SacredWork links multiple language versions (Sanskrit original +
 * Nepali meaning + Hindi explanation + English translation + audio tracks)
 * so the system never creates disconnected duplicates.
 *
 * Collections used:
 *   sacred_works     — canonical work registry (private founder, public Phase 5+)
 *   audio_assets     — audio track registry (per-work and standalone)
 *   source_licenses  — license/rights tracking for external sources
 *   sacred_alignments — line-by-line multilingual alignment records
 *
 * Architecture rule: SacredWork is the canonical node. SacredText records
 * (in sacred_texts) are linked TO a SacredWork — they are NOT the canonical entity.
 */

import type { SpiritualTradition } from "./semantic-atom";
import type { SacredLanguage, SacredTextType } from "./sacred-text";
import type { DevotionalRasa } from "./extraction-pipeline";
import type { TempleVisibility } from "./temple-vault";

// ── License status ─────────────────────────────────────────────────────────────
// Rule: Unknown = private study only. Publish only after founder verifies.

export type LicenseStatus =
  | "public_domain"    // clearly public domain (pre-1925 or explicit dedication)
  | "open_license"     // CC-BY, CC0, or similar permissive
  | "unknown"          // not yet checked — private study only
  | "restricted";      // copyright claimed — private study only, no public publish

export type UsageRight =
  | "private_study"       // founder can study privately
  | "public_display"      // can show text on public Bhakti Chautari
  | "audio_reuse"         // can embed/stream the audio
  | "derivative_allowed"  // can make Nepali explanations from it
  | "unknown";            // rights not assessed

export type SourcePlatform =
  | "internet_archive"    // archive.org
  | "youtube"             // YouTube
  | "website"             // any website
  | "scripture_repository"// Vedanta Society, Gita Press, etc.
  | "personal_recording"  // founder's own recording
  | "other";

// ── Source License ─────────────────────────────────────────────────────────────

export interface SourceLicense {
  id?:                 string;
  ownerId:             string;

  sourceUrl:           string;
  sourcePlatform:      SourcePlatform;
  sourceTitle?:        string;        // human-readable title for this source

  licenseStatus:       LicenseStatus;
  usageAllowed:        UsageRight[];
  attributionRequired: boolean;
  attributionText?:    string;        // exact attribution string to use

  notes?:              string;        // founder notes about this license check
  checkedAt:           string;        // ISO — when founder reviewed license
  checkedBy:           "founder";

  // Link to a sacred work if this source is for a specific work
  relatedSacredWorkId?: string;

  createdAt:           string;
}

export const LICENSE_LABELS: Record<LicenseStatus, string> = {
  public_domain: "Public Domain",
  open_license:  "Open License",
  unknown:       "Unknown — Private only",
  restricted:    "Restricted",
};

export const LICENSE_COLORS: Record<LicenseStatus, string> = {
  public_domain: "text-emerald-400 border-emerald-800/60 bg-emerald-950/20",
  open_license:  "text-sky-400 border-sky-800/60 bg-sky-950/20",
  unknown:       "text-amber-400 border-amber-800/60 bg-amber-950/20",
  restricted:    "text-red-400 border-red-800/60 bg-red-950/20",
};

// ── Audio Asset ────────────────────────────────────────────────────────────────

export type AudioType =
  | "chant"       // devotional chant / recitation
  | "bhajan"      // devotional song
  | "stotra"      // stotra/hymn recitation
  | "pravachan"   // spiritual discourse / lecture
  | "kirtan";     // congregational devotional singing

export type TranscriptStatus =
  | "not_transcribed"   // audio not yet transcribed
  | "transcribed"       // text transcribed but not aligned
  | "aligned";          // transcript aligned to timestamps

export interface AudioAsset {
  id?:                  string;
  ownerId:              string;

  // ── Identity ─────────────────────────────────────────────────────────────
  title:                string;
  sourceUrl:            string;
  duration?:            number;               // seconds
  performer?:           string;               // singer / chanter name
  speaker?:             string;               // pravachan speaker
  language:             SacredLanguage;
  audioType:            AudioType;

  // ── License ───────────────────────────────────────────────────────────────
  licenseStatus:        LicenseStatus;
  usageAllowed:         UsageRight[];
  attributionRequired:  boolean;
  attributionText?:     string;
  sourceLicenseId?:     string;               // pointer to source_licenses doc

  // ── Links ─────────────────────────────────────────────────────────────────
  relatedSacredWorkId?: string;               // which canonical work
  relatedCharacterId?:  string;               // which deity/character

  // ── Processing ────────────────────────────────────────────────────────────
  transcriptStatus:     TranscriptStatus;
  transcriptText?:      string;               // raw transcript if available
  alignedShlokaIds?:    string[];             // sacred_alignments IDs linked to this audio

  // ── Future ────────────────────────────────────────────────────────────────
  // Will power: listening mode, chant practice, AI Guru lesson reference,
  // timestamp-linked shloka study, Nepali explanation video background

  publicReady:          boolean;              // false until license verified + founder approves
  addedAt:              string;
  visibility:           TempleVisibility;
}

export const AUDIO_TYPE_LABELS: Record<AudioType, string> = {
  chant:     "Chant",
  bhajan:    "भजन",
  stotra:    "स्तोत्र",
  pravachan: "प्रवचन",
  kirtan:    "कीर्तन",
};

export const AUDIO_TYPE_ICONS: Record<AudioType, string> = {
  chant:     "🕉",
  bhajan:    "🎵",
  stotra:    "📿",
  pravachan: "🗣",
  kirtan:    "🪘",
};

// ── Sacred Work ────────────────────────────────────────────────────────────────
// The canonical top-level node for a specific composition.
// Example: "Rudrashtakam" links Sanskrit text + Nepali meaning + Hindi explanation
//          + English translation + audio track — all as ONE entity.

export interface SacredWork {
  id?:                string;
  ownerId:            string;

  // ── Canonical identity ────────────────────────────────────────────────────
  canonicalTitle:     string;               // "Rudrashtakam"
  alternateTitles:    string[];             // ["रुद्राष्टकम्", "Rudra Ashtakam"]
  canonicalTitleDevanagari?: string;        // "रुद्राष्टकम्"

  // ── Tradition ──────────────────────────────────────────────────────────────
  tradition:          SpiritualTradition;
  textType:           SacredTextType;       // stotra, bhajan, mantra_set, etc.

  // ── Attribution ───────────────────────────────────────────────────────────
  author?:            string;               // known author (e.g. "Goswami Tulsidas")
  attributedAuthor?:  string;               // tradition attribution ("attributed to Pushpadanta")
  languageOriginal:   SacredLanguage;       // primary language of original composition

  // ── Character / deity link ────────────────────────────────────────────────
  primaryDeity?:      string;               // "Shiva", "Vishnu", "Devi"
  primaryCharacterId?: string;              // spiritual_characters doc ID
  relatedCharacterIds?: string[];           // other related characters

  // ── Source & license ──────────────────────────────────────────────────────
  sourceRefs:         string[];             // "Ramcharitmanas - Uttarakanda", etc.
  licenseStatus:      LicenseStatus;
  publicDomainStatus: boolean;             // true only if verified public domain
  licenseNotes?:      string;

  // ── Linked content ────────────────────────────────────────────────────────
  // IDs link to other collections — not embedded — for the ONE BRAIN principle
  relatedTextIds:     string[];             // sacred_texts collection IDs (one per language version)
  audioAssetIds:      string[];             // audio_assets collection IDs
  imageRefs:          string[];             // direct image URLs (public domain or founder's)
  videoRefs:          string[];             // video URLs
  alignmentIds:       string[];             // sacred_alignments collection IDs
  atomIds:            string[];             // bhakti_atoms or semantic_dictionary IDs created from this

  // ── Available language versions (summary — full text is in sacred_texts) ──
  hasLanguage: {
    sanskrit?:  boolean;
    nepali?:    boolean;
    hindi?:     boolean;
    english?:   boolean;
  };
  hasAudio:           boolean;

  // ── Metadata ─────────────────────────────────────────────────────────────
  founderNotes?:      string;
  publicReady:        boolean;              // false until license verified + atoms approved
  createdAt:          string;
  updatedAt:          string;
  visibility:         TempleVisibility;     // private until founder publishes
}

// ── Sacred Alignment ───────────────────────────────────────────────────────────
// Line-by-line multilingual alignment.
// One record per shloka line (or logical unit) linking:
//   Sanskrit original ↔ IAST ↔ Nepali meaning ↔ Hindi meaning ↔ English meaning
//   ↔ audio timestamp ↔ deity/character ↔ rasa ↔ philosophical/devotional note
//
// This is the deep study layer. It powers:
//   - word-by-word Nepali explanation
//   - AI Guru source-grounded answers
//   - Bhakti media generation (shloka card, audio-backed reel)

export interface SacredAlignment {
  id?:              string;
  ownerId:          string;
  sacredWorkId:     string;               // parent SacredWork
  audioAssetId?:    string;              // if this line has audio

  // ── Position ───────────────────────────────────────────────────────────────
  lineIndex:        number;              // 0-based within the work
  lineLabel?:       string;             // "Verse 1", "Shloka 2a", etc.

  // ── Text layers ────────────────────────────────────────────────────────────
  textSanskrit?:    string;             // Devanagari original
  textIAST?:        string;             // IAST transliteration
  textNepali?:      string;             // Nepali rendering / close translation
  textHindi?:       string;             // Hindi meaning
  textEnglish?:     string;             // English translation

  // ── Meaning ────────────────────────────────────────────────────────────────
  meaningNepali?:   string;             // founder's Nepali explanation (not translation)
  philosophicalNote?: string;           // Vedantic/Puranic significance
  devotionalNote?:  string;            // heart-level meaning for bhakti practice

  // ── Context links ──────────────────────────────────────────────────────────
  characterRef?:    string;            // deity/character referenced in this line
  rasa?:            DevotionalRasa;    // emotional mood of this line
  keyTerms?:        string[];          // Sanskrit terms appearing in this line

  // ── Audio ──────────────────────────────────────────────────────────────────
  audioTimestampStart?: number;        // seconds from track start
  audioTimestampEnd?:   number;        // seconds

  // ── QA ─────────────────────────────────────────────────────────────────────
  verified:         boolean;           // founder reviewed this alignment
  createdAt:        string;
  updatedAt:        string;
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const TRADITION_LABELS: Partial<Record<SpiritualTradition, string>> = {
  shaiva:          "शैव",
  vaishnava:       "वैष्णव",
  shakta:          "शाक्त",
  advaita_vedanta: "अद्वैत वेदान्त",
  buddhist:        "बौद्ध",
  vedic:           "वैदिक",
  upanishadic:     "औपनिषदिक",
  bhakti:          "भक्ति",
  ganapatya:       "गाणपत्य",
  general:         "सामान्य",
};

export const TRADITION_DOT_COLORS: Partial<Record<SpiritualTradition, string>> = {
  shaiva:          "bg-sky-500",
  vaishnava:       "bg-amber-500",
  shakta:          "bg-rose-500",
  advaita_vedanta: "bg-violet-500",
  buddhist:        "bg-stone-500",
  vedic:           "bg-yellow-500",
  upanishadic:     "bg-indigo-500",
  bhakti:          "bg-pink-500",
  ganapatya:       "bg-orange-500",
  general:         "bg-zinc-500",
};

export const TRADITION_TEXT_COLORS: Partial<Record<SpiritualTradition, string>> = {
  shaiva:          "text-sky-400",
  vaishnava:       "text-amber-400",
  shakta:          "text-rose-400",
  advaita_vedanta: "text-violet-400",
  buddhist:        "text-stone-400",
  vedic:           "text-yellow-400",
  upanishadic:     "text-indigo-400",
  bhakti:          "text-pink-400",
  ganapatya:       "text-orange-400",
  general:         "text-zinc-400",
};
