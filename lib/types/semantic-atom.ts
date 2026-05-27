/**
 * Universal Semantic Atom Protocol.
 *
 * The shared type foundation for BOTH worlds:
 *   - ZZC Civic World  (constitutional_framework, janta_intelligence, civic_signals)
 *   - ZZ Spiritual World (sanskrit_atoms, bhakti_atoms, mantra_atoms — Phase 3+)
 *
 * Both domains follow the same atom structure.
 * This ensures: portable infrastructure, unified search, cross-domain relationships.
 *
 * See docs/TEMPLE_VAULT.md for full architecture rationale.
 * See lib/types/constitutional-master.ts for the civic domain implementation.
 * See lib/types/temple-vault.ts for the spiritual domain implementation.
 */

// ─── Domain ───────────────────────────────────────────────────────────────────

export type AtomDomain = "civic" | "spiritual";

// ─── Multilingual text ────────────────────────────────────────────────────────

export interface MultilingualText {
  sanskrit?:  string;   // Devanagari script
  nepali?:    string;   // Devanagari script
  hindi?:     string;   // Devanagari script
  english?:   string;
  transliteration?: string;  // IAST (only for Sanskrit)
}

// ─── Source reference ────────────────────────────────────────────────────────
// Every meaning claim must be grounded in a source.

export type SourceTier = "public_domain" | "cc_by" | "open_license" | "proprietary" | "original";

export interface SemanticSource {
  id:          string;   // e.g. "monier-williams-1899", "apte-1890"
  name:        string;   // "Monier-Williams Sanskrit-English Dictionary (1899)"
  tier:        SourceTier;
  url?:        string;
  pageRef?:    string;   // "p. 512", "entry: dharma"
  attribution?: string;  // required for CC-BY sources
}

// ─── Relationship types ───────────────────────────────────────────────────────

export type AtomRelationType =
  | "synonym"          // same meaning
  | "antonym"          // opposite
  | "component"        // is a part of
  | "contains"         // has as a component
  | "derivedFrom"      // etymological derivation
  | "contrasts"        // meaningfully contrasts with
  | "relatedConcept"   // broadly related
  | "crossDomain";     // relates a civic concept to a spiritual concept (or vice versa)

export interface AtomRelationship {
  targetId:    string;           // other atom ID
  type:        AtomRelationType;
  domain:      AtomDomain;       // domain of the target atom
  note?:       string;           // why these are related
}

// ─── Verification status ─────────────────────────────────────────────────────

export type VerificationStatus =
  | "ai_draft"          // AI-generated — not verified, must be clearly marked
  | "source_grounded"   // extracted from a verified source (monier-williams etc.)
  | "founder_verified"; // manually reviewed and accepted by founder

// ─── Universal Semantic Atom Base ────────────────────────────────────────────
// Every atom in both worlds implements this interface.

export interface SemanticAtomBase {
  id?:            string;
  ownerId:        string;
  domain:         AtomDomain;

  // ── Core multilingual identity ───────────────────────────────────────────
  term:           MultilingualText;   // the term in each language
  meaning:        MultilingualText;   // the meaning/definition in each language

  // ── Source grounding (required for verified atoms) ─────────────────────
  sources:        SemanticSource[];
  primarySourceId?: string;           // ID of the most authoritative source

  // ── Relationships ────────────────────────────────────────────────────────
  relationships:  AtomRelationship[];

  // ── Classification ────────────────────────────────────────────────────────
  tags:           string[];           // searchable tags
  difficultyLevel: "accessible" | "intermediate" | "scholarly";

  // ── Verification ─────────────────────────────────────────────────────────
  verificationStatus: VerificationStatus;
  addedAt:        string;             // ISO timestamp
  verifiedAt?:    string;             // ISO timestamp

  // ── Usage examples ────────────────────────────────────────────────────────
  usageExamples?: string[];           // in-context usage from source texts
}

// ─── Civic domain extension ───────────────────────────────────────────────────
// Extends SemanticAtomBase for constitutional/governance terms.

export interface CivicSemanticAtom extends SemanticAtomBase {
  domain:           "civic";
  constitutionalRefs?: string[];      // article IDs ("art-18", "art-4")
  partRefs?:        number[];         // constitutional parts
  legalContext?:    string;           // how this term is used in Nepali law
}

// ─── Spiritual domain extension ──────────────────────────────────────────────
// Extends SemanticAtomBase for Sanskrit/spiritual terms.

export interface SpiritualSemanticAtom extends SemanticAtomBase {
  domain:           "spiritual";

  // Sanskrit-specific fields
  iast?:            string;   // IAST transliteration: "dharma", "mokṣa"
  devanagari:       string;   // canonical Devanagari form
  dhatu?:           string;   // Sanskrit root verb (e.g., "dhṛ" for dharma)
  grammaticalNote?: string;   // gender, case, compound type

  // Spiritual context
  tradition?:       SpiritualTradition;
  scriptureRefs?:   ScriptureReference[];
  chamberRef?:      string;   // which Temple Vault chamber this belongs to

  // Semantic depth
  philosophicalNote?: string;  // non-literal, deeper meaning layer
  devotionalNote?:    string;  // how this term is experienced in devotional practice
}

// ─── Spiritual domain types ───────────────────────────────────────────────────

export type SpiritualTradition =
  | "advaita_vedanta"
  | "shaiva"
  | "vaishnava"
  | "shakta"
  | "buddhist"
  | "jain"
  | "sikh"
  | "vedic"
  | "upanishadic"
  | "bhakti"
  | "tantra"
  | "yoga"
  | "general";

export interface ScriptureReference {
  text:     string;   // "Bhagavad Gita", "Rigveda", "Upanishads"
  chapter?: string;   // "2.47", "1.1"
  verse?:   string;   // verbatim Sanskrit verse
  verseTranslation?: string;
}

// ─── The semantic_dictionary Firestore collection ────────────────────────────
// One collection. Two domains. All terms live here.
// Query pattern: where("domain", "==", "civic") or where("domain", "==", "spiritual")

export type SemanticDictionaryEntry = CivicSemanticAtom | SpiritualSemanticAtom;

// ─── Predefined source registry ──────────────────────────────────────────────
// Canonical source records. Add to Firestore manually in Phase 3.

export const AUTHORITATIVE_SOURCES: SemanticSource[] = [
  {
    id:   "monier-williams-1899",
    name: "A Sanskrit-English Dictionary — Sir Monier Monier-Williams (1899)",
    tier: "public_domain",
    url:  "https://www.sanskrit-lexicon.uni-koeln.de/scans/MWScan/2020/web/webtc/indexcaller.php",
    attribution: "Monier-Williams, M. (1899). A Sanskrit-English Dictionary. Oxford: Clarendon Press. Public domain.",
  },
  {
    id:   "apte-1890",
    name: "The Practical Sanskrit-English Dictionary — Vaman Shivram Apte (1890)",
    tier: "public_domain",
    url:  "https://www.sanskrit-lexicon.uni-koeln.de/scans/AP90Scan/2020/web/webtc/indexcaller.php",
    attribution: "Apte, V.S. (1890). The Practical Sanskrit-English Dictionary. Poona. Public domain.",
  },
  {
    id:   "dcs",
    name: "Digital Corpus of Sanskrit (DCS)",
    tier: "cc_by",
    url:  "http://www.sanskrit-linguistics.org/dcs/",
    attribution: "Hellwig, O. (2010–2023). Digital Corpus of Sanskrit. CC-BY 4.0.",
  },
  {
    id:   "gretil",
    name: "Göttingen Register of Electronic Texts in Indian Languages (GRETIL)",
    tier: "open_license",
    url:  "http://gretil.sub.uni-goettingen.de/",
    attribution: "GRETIL, Göttingen University. Check individual text licenses.",
  },
  {
    id:   "cologne-digital",
    name: "Cologne Digital Sanskrit Dictionaries",
    tier: "public_domain",
    url:  "https://www.sanskrit-lexicon.uni-koeln.de/",
    attribution: "Cologne Digital Sanskrit Dictionaries. Public domain.",
  },
];
