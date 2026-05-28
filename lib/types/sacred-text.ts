import type { MultilingualText, SpiritualTradition } from "./semantic-atom";
import type { TempleVisibility } from "./temple-vault";

// Sacred text intake types for the Living Spiritual Intelligence Graph.
//
// Pipeline: SacredText → ShlokaAtom → SpiritualCharacter enrichment → Bhakti Chautari
//
// Phase 1: Intake (this file)
// Phase 2: Atom extraction (shloka lines, key Sanskrit terms)
// Phase 3: Character graph update (deity intelligence grows with each upload)

// ── Text type ──────────────────────────────────────────────────────────────────

export type SacredTextType =
  | "stotra"            // hymn of praise (e.g. Rudrashtakam)
  | "stuti"             // eulogy / panegyric
  | "bhajan"            // devotional song
  | "mantra_set"        // collection of mantras
  | "shloka_collection" // standalone shlokas / verses
  | "katha"             // narrative — story / legend
  | "kavya"             // devotional poetry
  | "gita_chapter"      // from Bhagavad Gita
  | "upanishad"         // Upanishad text / excerpt
  | "purana_excerpt"    // from Puranas / Itihasa
  | "arati";            // aarti / evening prayer

export const SACRED_TEXT_TYPE_LABELS: Record<SacredTextType, string> = {
  stotra:            "स्तोत्र",
  stuti:             "स्तुति",
  bhajan:            "भजन",
  mantra_set:        "मन्त्र संग्रह",
  shloka_collection: "श्लोक संग्रह",
  katha:             "कथा",
  kavya:             "काव्य",
  gita_chapter:      "गीता अध्याय",
  upanishad:         "उपनिषद्",
  purana_excerpt:    "पुराण अंश",
  arati:             "आरती",
};

export const SACRED_TEXT_TYPE_ICONS: Record<SacredTextType, string> = {
  stotra:            "🙏",
  stuti:             "🌺",
  bhajan:            "🎵",
  mantra_set:        "🕉",
  shloka_collection: "📿",
  katha:             "📖",
  kavya:             "✍️",
  gita_chapter:      "🌿",
  upanishad:         "🔱",
  purana_excerpt:    "🏛",
  arati:             "🪔",
};

// ── Language ───────────────────────────────────────────────────────────────────

export type SacredLanguage = "sanskrit" | "nepali" | "hindi" | "english" | "mixed";

export const SACRED_LANGUAGE_LABELS: Record<SacredLanguage, string> = {
  sanskrit: "संस्कृत",
  nepali:   "नेपाली",
  hindi:    "हिन्दी",
  english:  "English",
  mixed:    "मिश्रित",
};

// ── Author type ────────────────────────────────────────────────────────────────

export type AuthorType =
  | "vedic_rishi"
  | "acharya"
  | "saint_poet"
  | "folk_tradition"
  | "traditional"
  | "unknown";

export const AUTHOR_TYPE_LABELS: Record<AuthorType, string> = {
  vedic_rishi:    "वैदिक ऋषि",
  acharya:        "आचार्य",
  saint_poet:     "सन्त-कवि",
  folk_tradition: "लोक परम्परा",
  traditional:    "परम्परागत",
  unknown:        "अज्ञात",
};

// ── Processing status ──────────────────────────────────────────────────────────

export type SacredTextStatus =
  | "raw"              // uploaded, no processing yet
  | "atoms_extracted"  // Phase 2: shloka atoms extracted
  | "character_updated"// Phase 3: character graph enriched
  | "review_ready"     // founder has reviewed, ready for Bhakti Chautari
  | "published";       // published to Bhakti Chautari

export const SACRED_TEXT_STATUS_LABELS: Record<SacredTextStatus, string> = {
  raw:              "Raw",
  atoms_extracted:  "Atoms",
  character_updated:"Graph",
  review_ready:     "समीक्षा",
  published:        "प्रकाशित",
};

// ── Main SacredText document ───────────────────────────────────────────────────

export interface SacredText {
  id?: string;
  ownerId: string;

  // Identity
  title:          MultilingualText;  // nepali required; sanskrit optional
  textType:       SacredTextType;
  tradition:      SpiritualTradition;

  // Language
  primaryLanguage: SacredLanguage;

  // Attribution
  authorName?:      string;   // "आदि शंकराचार्य", "Tulsidas", etc.
  authorType?:      AuthorType;
  scriptureRef?:    string;   // "Shiva Purana, Vidyeshvara Samhita"
  historicalPeriod?:string;   // "~8th century CE"
  publicDomain:     boolean;
  licenseNote?:     string;

  // Content — original text exactly as uploaded, whitespace preserved
  originalText:     string;
  transliteration?: string;   // optional IAST / romanized

  // Classification
  chamberId?:            string;  // which temple chamber
  primaryCharacterId?:   string;  // seed ID of main deity (e.g. "seed_shiva")
  relatedCharacterIds?:  string[];

  // Processing pipeline
  processingStatus: SacredTextStatus;
  atomCount?:        number;
  extractedTermCount?:number;

  // Founder notes
  founderNote?:      string;
  authenticityNote?: string;

  // Visibility
  visibility: TempleVisibility;

  createdAt: string;
  updatedAt: string;
}

// ── ShlokaAtom — Phase 2 extracted unit ───────────────────────────────────────
// One atom = one meaningful line/verse extracted from a SacredText.
// Dictionary terms grow organically from atoms encountered, not bulk import.

export interface ShlokaAtom {
  id?: string;
  ownerId: string;

  sourceTextId:  string;   // links to SacredText.id
  lineIndex:     number;   // position in source text (0-based)

  // Original text (Sanskrit / Hindi)
  originalLine:  string;

  // Meanings (Nepali required when atom is reviewed)
  nepaliMeaning?:  string;
  hindiMeaning?:   string;
  englishSupport?: string;

  // Semantic analysis
  keyTerms:         string[];  // Sanskrit terms encountered — seeds the dictionary
  philosophicalConcept?: string;
  devotionalEmotion?:    string;  // rasa label

  // Graph connections
  relatedCharacterId?: string;
  relatedLeelaNote?:   string;
  relatedMantra?:      string;

  // Quality
  verified:     boolean;
  founderNote?: string;

  createdAt: string;
}
