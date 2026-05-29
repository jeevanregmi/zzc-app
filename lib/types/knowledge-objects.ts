/**
 * Universal Knowledge Object (UKO) — ZZC Atom Pool Type System
 *
 * Every meaningful civic or bhakti unit is a Knowledge Object.
 * Products are windows into the same Atom Pool — they never own atoms.
 *
 * See: docs/ATOM_POOL_ARCHITECTURE.md
 *
 * IMPORTANT: This is an ADAPTER INTERFACE, not a new Firestore collection.
 * Existing collections stay. Adapters convert source docs to this interface.
 * Nothing is migrated. The UKO is a view, not a copy.
 */

// ── Core identity types ────────────────────────────────────────────────────────

export type KnowledgeDomain =
  | "civic"     // Government, constitution, policy, economy, promises
  | "bhakti"    // Sacred texts, shlokas, characters, leelas
  | "shared";   // Semantic terms, media seeds, cross-domain atoms

export type KnowledgeObjectType =
  | "constitution_article"  // Article / clause from Nepal Constitution
  | "civic_fact"            // Verified factual statement from government doc
  | "government_promise"    // Specific government commitment with source evidence
  | "economic_atom"         // Budget allocation, revenue, spending, deficit
  | "shloka_atom"           // Shloka / mantra from sacred text
  | "bhajan_atom"           // Bhajan / stuti / devotional song unit
  | "character_teaching"    // Teaching attributed to a spiritual character
  | "semantic_term"         // Civic glossary term or Sanskrit dictionary entry
  | "media_seed";           // Pre-classified unit ready for media production

export type VerificationStatus =
  | "ai_extracted"          // Extracted by AI, awaiting founder review
  | "founder_reviewed"      // Founder confirmed accuracy
  | "human_verified"        // Third-party cross-check done
  | "needs_revision";       // Flagged as incorrect

export type ClassificationStatus =
  | "pending"               // Awaiting classifier run
  | "suggested"             // Classifier has run; awaiting founder approval
  | "approved"              // Founder approved; routing is active
  | "edited"                // Founder edited the suggestion before approving
  | "rejected";             // Founder rejected all suggested classifications

// ── Public products — the destination windows ─────────────────────────────────

export type PublicProduct =
  | "civic_feed"              // Main public civic feed
  | "constitution_reader"     // Public constitution page
  | "janta_intelligence"      // /janta deep intelligence feed
  | "economy_chautari"        // Nepal economic memory page
  | "promise_tracker"         // Government promise accountability tracker
  | "bhakti_chautari"         // Bhakti public expression layer
  | "shloka_explorer"         // Sanskrit / Nepali shloka browser
  | "media_studio"            // AI-assisted script / caption production
  | "discussion_forum"        // Citizen discussion attached to atoms
  | "ai_tutor";               // Future AI voice / immersive learning

// ── Classification layer — faceted, multi-dimensional ────────────────────────

/**
 * Civic classifications for government, economy, constitution, and promise atoms.
 * All arrays allow multiple values — one atom belongs to many categories.
 */
export interface CivicClassifications {
  domains:          string[];           // ["civic", "economy"]
  sectors:          string[];           // ["youth", "employment", "governance"]
  themes:           string[];           // ["accountability", "public finance"]
  audiences:        string[];           // ["students", "citizens", "journalists"]
  sourceTypes:      string[];           // ["budget_speech", "niti_karyakram"]
  timePeriods:      string[];           // ["2083/84", "post_gen_z_movement"]
  publicProducts:   PublicProduct[];
  mediaSuitability: string[];           // ["short_script", "explainer_card", "infographic"]
  learningLevel:    ("basic" | "intermediate" | "advanced")[];
  relatedMovements: string[];           // ["gen_z_movement_2081"]
}

/**
 * Bhakti classifications for sacred texts, shlokas, bhajans, and characters.
 */
export interface BhaktiClassifications {
  domains:          string[];           // ["bhakti"]
  traditions:       string[];           // ["shaiva", "vedanta", "vaishava", "shakta"]
  characters:       string[];           // ["shiva", "vishnu", "adi_shankaracharya"]
  textTypes:        string[];           // ["stotra", "shloka", "bhajan", "katha", "upanishad"]
  rasas:            string[];           // ["shanta", "adbhuta", "bhakti", "vira"]
  languages:        string[];           // ["sanskrit", "nepali", "hindi", "maithili"]
  publicProducts:   PublicProduct[];
  mediaSuitability: string[];           // ["chant_card", "devotional_reel", "shloka_verse"]
}

/**
 * Unified classification type — one of civic or bhakti, stored on the UKO.
 * The `domain` field on UniversalKnowledgeObject determines which shape to expect.
 */
export type KnowledgeClassifications = CivicClassifications | BhaktiClassifications;

// ── Routing — computed from approved classifications ──────────────────────────

/**
 * Where this atom appears in public products.
 * Computed by routeKnowledgeAtom() from approved classifications.
 * Never set manually — always derived.
 *
 * keepVaultOnly == true overrides all show* flags (no public exposure).
 */
export interface KnowledgeRoute {
  showInCivicFeed:           boolean;
  showInConstitutionReader:  boolean;
  showInJantaFeed:           boolean;
  showInEconomyChautari:     boolean;
  showInPromiseTracker:      boolean;
  showInBhaktiChautari:      boolean;
  showInSlokhaExplorer:      boolean;
  showInMediaStudio:         boolean;
  showInDiscussionQueue:     boolean;
  showInAITutor:             boolean;
  keepVaultOnly:             boolean;
}

export const VAULT_ONLY_ROUTE: KnowledgeRoute = {
  showInCivicFeed:           false,
  showInConstitutionReader:  false,
  showInJantaFeed:           false,
  showInEconomyChautari:     false,
  showInPromiseTracker:      false,
  showInBhaktiChautari:      false,
  showInSlokhaExplorer:      false,
  showInMediaStudio:         false,
  showInDiscussionQueue:     false,
  showInAITutor:             false,
  keepVaultOnly:             true,
};

// ── Universal Knowledge Object ────────────────────────────────────────────────

/**
 * UniversalKnowledgeObject — the canonical interface for all atoms in the pool.
 *
 * Source collections (janta_intelligence, economy_atoms, promise_atoms, etc.)
 * are NEVER modified. Adapter functions map them to this interface.
 * The UKO is a view, not a stored copy.
 *
 * For Firestore storage use case, see ClassificationSuggestion below —
 * that is what gets persisted per atom for founder review.
 */
export interface UniversalKnowledgeObject {
  // Identity
  id:                    string;
  ownerId:               string;
  domain:                KnowledgeDomain;
  objectType:            KnowledgeObjectType;

  // Content (citizen-friendly, Nepali-first)
  titleNepali:           string;
  summaryNepali:         string;
  meaningNepali:         string;           // "यसले नागरिकलाई / भक्तलाई के हुन्छ?"

  // Source traceability (mandatory — no public claim without source)
  sourceCollection:      string;           // e.g. "economy_atoms", "promise_atoms"
  sourceDocumentId:      string;           // vault_intelligence_docs ID
  sourceDocTitle:        string;
  evidenceText:          string;           // verbatim quote from source
  pageNumber:            number;

  // Quality signals
  confidence:            number;           // 0–1, AI confidence at extraction time
  qualityScore:          number;           // 0–1, completeness score (source + fields)
  verificationStatus:    VerificationStatus;
  publicReady:           boolean;          // false until founder explicitly approves

  // Classification (set by classifier, approved by founder)
  classifications:       KnowledgeClassifications;
  classificationStatus:  ClassificationStatus;

  // Routing (derived from approved classifications via routeKnowledgeAtom)
  routes:                KnowledgeRoute;

  createdAt:             string;           // ISO
  updatedAt:             string;           // ISO
}

// ── Knowledge Graph — relationship edges ──────────────────────────────────────

export type CivicRelationType =
  | "supports"                  // Atom A is evidence for Atom B
  | "contradicts"               // Atom A conflicts with Atom B
  | "repeats"                   // Same promise appeared in a prior year
  | "updates"                   // Atom A supersedes Atom B
  | "depends_on"                // Atom A requires Atom B to be meaningful
  | "relates_to_constitution"   // Links to a constitutional article
  | "funded_by_budget"          // Promise has allocated budget atom as evidence
  | "promised_by_government"    // Budget atom has a promise atom as its source
  | "monitored_by_institution"  // Institution is responsible for this atom
  | "affects_group";            // Atom directly affects a named group

export type BhaktiRelationType =
  | "praises"                   // Shloka praises a character
  | "explains"                  // One atom explains another
  | "invokes"                   // Mantra invokes a deity
  | "belongs_to_text"           // Shloka belongs to a source text
  | "describes_character"       // Teaching describes a character
  | "teaches_concept"           // Atom teaches a spiritual concept
  | "has_rasa"                  // Atom carries a specific rasa
  | "related_to_mantra"         // Associated with a mantra
  | "related_to_leela";         // Refers to a leela episode

export type SharedRelationType =
  | "similar_meaning"           // Semantic similarity across atoms or domains
  | "translation_of"            // Atom is a translation of another
  | "commentary_on"             // Atom comments on or elaborates another
  | "source_for"                // Atom is source evidence for another
  | "public_ready_for";         // Atom enables another atom to go public

export type KnowledgeRelationType =
  | CivicRelationType
  | BhaktiRelationType
  | SharedRelationType;

/**
 * KnowledgeEdge — a directed relationship between two atoms.
 * Stored in: knowledge_edges
 */
export interface KnowledgeEdge {
  id:                    string;
  ownerId:               string;
  sourceAtomId:          string;
  targetAtomId:          string;
  sourceCollection:      string;           // collection of sourceAtomId
  targetCollection:      string;           // collection of targetAtomId
  relationType:          KnowledgeRelationType;
  explanationNepali:     string;           // why this edge exists
  evidenceRef?:          string;           // optional supporting reference
  confidence:            number;           // 0–1
  verificationStatus:    VerificationStatus;
  createdAt:             string;
}

// ── Classification Suggestion — for founder review queue ─────────────────────

/**
 * ClassificationSuggestion — what the classifier engine proposes per atom.
 * Stored in: classification_suggestions (Phase 6)
 *
 * Nothing routes to public without founder approval.
 */
export interface ClassificationSuggestion {
  id:                       string;
  ownerId:                  string;
  atomId:                   string;
  sourceCollection:         string;         // where the atom lives
  atomPreview:              string;         // titleNepali snippet for UI
  suggestedClassifications: KnowledgeClassifications;
  suggestedRoutes:          KnowledgeRoute;
  generatedBy:              "rule_engine" | "ai_classifier" | "founder";
  status:                   "pending" | "approved" | "edited" | "rejected" | "deferred";
  founderNote?:             string;
  editedClassifications?:   KnowledgeClassifications;  // if founder edited
  createdAt:                string;
  reviewedAt?:              string;
}

// ── Routing engine — pure function ────────────────────────────────────────────

/**
 * routeKnowledgeAtom — compute routing from approved classifications.
 *
 * Rules (rule-based, Phase 5):
 * - publicReady == false → keepVaultOnly = true, all show* = false
 * - verificationStatus == "ai_extracted" → keepVaultOnly (founder review required)
 * - classificationStatus !== "approved" → keepVaultOnly
 * - publicProducts array drives each show* flag
 */
export function routeKnowledgeAtom(atom: UniversalKnowledgeObject): KnowledgeRoute {
  if (
    !atom.publicReady ||
    atom.verificationStatus === "ai_extracted" ||
    atom.classificationStatus !== "approved"
  ) {
    return VAULT_ONLY_ROUTE;
  }

  const products = atom.classifications.publicProducts;

  return {
    showInCivicFeed:           products.includes("civic_feed"),
    showInConstitutionReader:  products.includes("constitution_reader"),
    showInJantaFeed:           products.includes("janta_intelligence"),
    showInEconomyChautari:     products.includes("economy_chautari"),
    showInPromiseTracker:      products.includes("promise_tracker"),
    showInBhaktiChautari:      products.includes("bhakti_chautari"),
    showInSlokhaExplorer:      products.includes("shloka_explorer"),
    showInMediaStudio:         products.includes("media_studio"),
    showInDiscussionQueue:     products.includes("discussion_forum"),
    showInAITutor:             products.includes("ai_tutor"),
    keepVaultOnly:             false,
  };
}

// ── Quality score — pure function ─────────────────────────────────────────────

/**
 * computeUKOQualityScore — 0–1 based on metadata completeness.
 * Higher = more credible, more traceable, more usable.
 */
export function computeUKOQualityScore(atom: Pick<
  UniversalKnowledgeObject,
  "evidenceText" | "pageNumber" | "sourceDocumentId" | "titleNepali" | "meaningNepali" | "confidence"
>): number {
  let score = 0;
  if (atom.evidenceText?.trim().length > 20)         score += 0.30;
  if (atom.pageNumber > 0)                           score += 0.20;
  if (atom.sourceDocumentId?.trim())                 score += 0.15;
  if (atom.titleNepali?.trim().length > 5)           score += 0.15;
  if (atom.meaningNepali?.trim().length > 10)        score += 0.10;
  if ((atom.confidence ?? 0) >= 0.7)                 score += 0.10;
  return Math.round(score * 10) / 10;
}

// ── Adapter function signatures — stubs for Phase 3 ─────────────────────────
// Implementations live in lib/knowledge/adapters.ts (Phase 3).
// Defined here so type consumers can import the signature without the impl.

export type UKOAdapter<T> = (source: T, ownerId: string) => UniversalKnowledgeObject;

// Import shapes for adapter signatures only (no circular deps)
// Adapters are implemented in lib/knowledge/adapters.ts.

// ── Display helpers ────────────────────────────────────────────────────────────

export const KNOWLEDGE_DOMAIN_META: Record<KnowledgeDomain, { label: string; icon: string; tw: string }> = {
  civic:   { label: "Civic",   icon: "⚖️", tw: "bg-blue-950/60   text-blue-300   border-blue-800/60"   },
  bhakti:  { label: "Bhakti",  icon: "🛕", tw: "bg-amber-950/60  text-amber-300  border-amber-800/60"  },
  shared:  { label: "Shared",  icon: "◈",  tw: "bg-zinc-900      text-zinc-400   border-zinc-700"      },
};

export const KNOWLEDGE_OBJECT_TYPE_LABEL: Record<KnowledgeObjectType, string> = {
  constitution_article: "Constitution Article",
  civic_fact:           "Civic Fact",
  government_promise:   "Government Promise",
  economic_atom:        "Economic Atom",
  shloka_atom:          "Shloka",
  bhajan_atom:          "Bhajan / Stuti",
  character_teaching:   "Character Teaching",
  semantic_term:        "Semantic Term",
  media_seed:           "Media Seed",
};

export const CLASSIFICATION_STATUS_META: Record<ClassificationStatus, { label: string; icon: string; tw: string }> = {
  pending:   { label: "Pending",   icon: "⏳", tw: "text-zinc-400  bg-zinc-800/60  border-zinc-700"     },
  suggested: { label: "Suggested", icon: "💡", tw: "text-yellow-400 bg-yellow-950/40 border-yellow-800/50" },
  approved:  { label: "Approved",  icon: "✅", tw: "text-green-400  bg-green-950/40  border-green-800/50" },
  edited:    { label: "Edited",    icon: "✏",  tw: "text-blue-400   bg-blue-950/40   border-blue-800/50"  },
  rejected:  { label: "Rejected",  icon: "✗",  tw: "text-red-400    bg-red-950/40    border-red-800/50"   },
};

export const PUBLIC_PRODUCT_LABEL: Record<PublicProduct, string> = {
  civic_feed:           "Civic Feed",
  constitution_reader:  "Constitution Reader",
  janta_intelligence:   "Janta Intelligence",
  economy_chautari:     "Economy Chautari",
  promise_tracker:      "Promise Tracker",
  bhakti_chautari:      "Bhakti Chautari",
  shloka_explorer:      "Shloka Explorer",
  media_studio:         "Media Studio",
  discussion_forum:     "Discussion Forum",
  ai_tutor:             "AI Tutor",
};
