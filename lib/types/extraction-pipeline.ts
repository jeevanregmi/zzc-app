/**
 * ZZC Intelligence Extraction Pipeline — Two-Tier Architecture
 *
 * Tier 1:   Operational Analysis  — fast, document-level (BUILT)
 * Tier 1.5: Structured Intelligence — policy/article records (BUILT)
 * Tier 2:   Atomic Extraction     — paragraph/atom-level (NOT YET BUILT)
 *
 * RULE: Never label Tier 1 or Tier 1.5 work as "deep" or "atomic".
 * The word "deep" is reserved for true Tier 2 paragraph/atom-level extraction.
 *
 * See docs/INTELLIGENCE_PIPELINE.md for full architecture rationale.
 */

// ── Extraction tiers ──────────────────────────────────────────────────────────

export type ExtractionTier =
  | "none"        // uploaded, no AI work done yet
  | "operational" // Tier 1: summary, tags, metadata — what AI Analyze produces
  | "structured"  // Tier 1.5: structured records (janta_intelligence, constitutional_framework)
  | "atomic";     // Tier 2: paragraph/atom/shloka level — NOT YET BUILT

export const EXTRACTION_TIER_LABELS: Record<ExtractionTier, {
  np:   string;
  en:   string;
  desc: string;
  built: boolean;
}> = {
  none: {
    np:    "कच्चा",
    en:    "Raw",
    desc:  "Uploaded but not yet analyzed",
    built: true,
  },
  operational: {
    np:    "विश्लेषित",
    en:    "Analyzed",
    desc:  "Summary, tags, and metadata extracted by AI",
    built: true,
  },
  structured: {
    np:    "संरचित",
    en:    "Intelligence Extracted",
    desc:  "Structured intelligence records created (janta_intelligence / constitutional_framework)",
    built: true,
  },
  atomic: {
    np:    "आणविक",
    en:    "Atomic",
    desc:  "Paragraph → atom-level extraction with reasoning lineage — Phase 2 (not yet built)",
    built: false,
  },
};

export const EXTRACTION_TIER_BADGE: Record<ExtractionTier, {
  color:  string;
  bg:     string;
  border: string;
}> = {
  none:        { color: "text-zinc-500",   bg: "bg-zinc-900/40",    border: "border-zinc-800/40" },
  operational: { color: "text-sky-400",    bg: "bg-sky-900/20",     border: "border-sky-800/40" },
  structured:  { color: "text-amber-400",  bg: "bg-amber-900/20",   border: "border-amber-800/40" },
  atomic:      { color: "text-violet-400", bg: "bg-violet-900/20",  border: "border-violet-800/40" },
};

// ── Civic domain: Tier 2 types (NOT YET BUILT — architecture contracts only) ─

/**
 * One extracted section from a civic document.
 * Tier 2 atomic extraction decomposes a document into sections first,
 * then into paragraphs, then into semantic atoms.
 */
export interface CivicDocumentSection {
  sectionIndex:        number;
  heading?:            string;
  rawText:             string;
  constitutionalRefs?: string[];    // article IDs grounded to this section
  semanticAtomIds?:    string[];    // SemanticDictionaryEntry IDs created from this section
  confidence?:         number;      // 0-1 AI confidence in section boundary
}

/**
 * Full result of Tier 2 atomic extraction on a civic document.
 * Created when the Phase 2 extraction pipeline runs on an approved document.
 */
export interface CivicAtomicExtractionResult {
  documentId:      string;
  extractionTier:  "atomic";
  sections:        CivicDocumentSection[];
  atomsCreated:    number;    // SemanticDictionaryEntry records created
  graphEdges:      number;    // AtomRelationship edges created
  reasoningTrace?: ReasoningTrace;
  extractedAt:     string;    // ISO
}

// ── Bhakti domain: Tier 2 types (NOT YET BUILT — architecture contracts only) ─

/**
 * Nine classical rasas — the emotional/aesthetic modes in Sanskrit poetics.
 * Used in shloka atom extraction to classify the devotional mood of each verse.
 * Phase 2 (Bhakti Chautari atomic extraction).
 */
export type DevotionalRasa =
  | "shringara"   // श्रृङ्गार — love, devotion, longing
  | "vira"        // वीर — heroism, valor, divine power
  | "karuna"      // करुण — compassion, grief, surrender
  | "adbhuta"     // अद्भुत — wonder, awe, the inexplicable
  | "shanta"      // शान्त — serenity, equanimity, moksha-pointing
  | "hasya"       // हास्य — joy, bliss, divine play (lila)
  | "bhayanaka"   // भयानक — reverence before the infinite
  | "bibhatsa"    // बीभत्स — renunciation, vairagya, detachment
  | "raudra";     // रौद्र — fierce grace, divine wrath, transformation

export const DEVOTIONAL_RASA_LABELS: Record<DevotionalRasa, { np: string; desc: string }> = {
  shringara: { np: "श्रृङ्गार", desc: "प्रेम र भक्ति — Divine love and devotion" },
  vira:      { np: "वीर",       desc: "वीरता र शक्ति — Heroism and divine power" },
  karuna:    { np: "करुण",      desc: "करुणा र समर्पण — Compassion and surrender" },
  adbhuta:   { np: "अद्भुत",   desc: "विस्मय र अचम्म — Wonder and awe" },
  shanta:    { np: "शान्त",     desc: "शान्ति र मोक्ष — Serenity and liberation" },
  hasya:     { np: "हास्य",     desc: "आनन्द र लीला — Divine joy and play" },
  bhayanaka: { np: "भयानक",    desc: "अनन्त प्रति भय-भक्ति — Awe before the infinite" },
  bibhatsa:  { np: "बीभत्स",   desc: "वैराग्य र त्याग — Renunciation and detachment" },
  raudra:    { np: "रौद्र",     desc: "दिव्य क्रोध र परिवर्तन — Fierce divine grace" },
};

/**
 * A Sanskrit verbal root with its derived forms.
 * Extracted during Phase 2 bhakti atom extraction.
 * Seeds the semantic_dictionary with etymological depth.
 */
export interface SanskritRoot {
  dhatu:        string;    // root verb: "dhṛ", "vid", "bhū", "jan"
  iast:         string;    // IAST romanization
  rootMeaning:  string;    // primary meaning of the root
  derivedForms: string[];  // "dharma", "dhāraṇā", "dhāraya", "dharaṇī"
  tradition?:   string;    // Paninian grammar note, if applicable
}

/**
 * Full result of Phase 2 shloka atom extraction on a SacredText.
 */
export interface BhaktiAtomicExtractionResult {
  sourceTextId:        string;
  extractionTier:      "atomic";
  atomsCreated:        number;          // ShlokaAtom records created
  sanskritRootsFound:  SanskritRoot[];
  dominantRasa?:       DevotionalRasa;
  rasaDistribution?:   Partial<Record<DevotionalRasa, number>>;  // 0-100 weights
  characterRefs:       string[];        // SpiritualCharacter IDs enriched
  dictionarySeeds:     number;          // new SemanticDictionaryEntry records created
  reasoningTrace?:     ReasoningTrace;
  extractedAt:         string;
}

// ── Reasoning trace — explainable lineage ─────────────────────────────────────
// Every atomic extraction step must leave a trace explaining WHY each atom
// was created, WHAT source grounded it, and HOW confident the model was.
// This is the foundation of ZZC's "explainable intelligence" principle.

export interface ReasoningStep {
  step:        string;   // "section_split" | "atom_extract" | "constitutional_ground" | "rasa_classify"
  input?:      string;   // brief: what text was processed
  output?:     string;   // brief: what atom/record was created
  confidence:  number;   // 0-1
  note?:       string;   // human-readable reasoning
}

export interface ReasoningTrace {
  documentId:   string;
  tier:         ExtractionTier;
  provider:     string;   // "gemini-flash" | "bedrock-sonnet" | "anthropic"
  model:        string;
  steps:        ReasoningStep[];
  tokensUsed?:  number;
  createdAt:    string;
}

// ── Source traceability ────────────────────────────────────────────────────────
// Every claim in ZZC must be traceable to its source.
// Tier 2 atoms carry a source trace; Tier 1 records carry a document reference.

export interface SourceTrace {
  documentId:    string;    // vault_intelligence_docs ID
  sourceQuote?:  string;    // verbatim sentence/verse that generated this atom
  sectionIndex?: number;    // which section of the document
  pageNumber?:   number;    // physical page if known
  confidence:    number;    // 0-1 — AI confidence in this grounding
  verifiedAt?:   string;    // ISO — when founder confirmed this trace is accurate
}
