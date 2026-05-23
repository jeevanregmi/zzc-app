/**
 * IntelligenceRecord — ZZC Janta National Civic Memory Schema
 *
 * This is NOT a document analysis artifact.
 * This is a node in Nepal's national governance knowledge graph.
 *
 * Every extracted record is a structured, traceable, cross-linkable
 * unit of civic intelligence — budget line, project, promise, reform,
 * institution, target — that persists permanently and accumulates over time.
 *
 * The moat is not summaries. The moat is long-term machine-readable
 * national memory with relationship intelligence.
 *
 * Collection: janta_intelligence
 */

// ── Record Classification ────────────────────────────────────────────────────

export type IntelRecordType =
  | "promise"             // specific government commitment/वाचा
  | "budget_target"       // financial allocation with amount
  | "project"             // infrastructure or development project
  | "institution"         // new body, committee, authority created
  | "employment_target"   // job creation numerical target
  | "social_program"      // welfare scheme, subsidy, benefit
  | "reform"              // policy, law, regulation change
  | "digital_policy"      // technology, digitalization, e-governance
  | "financial_inclusion" // banking, insurance, credit access
  | "other";              // any other specific trackable item

// ── Implementation Status (10 states for full lifecycle) ────────────────────

export type ImplementationStatus =
  | "announced"            // stated in document — default for newly extracted
  | "budgeted"             // budget allocated but not yet started
  | "started"              // implementation has begun
  | "in_progress"          // actively being implemented
  | "delayed"              // past stated deadline, not done
  | "partially_completed"  // done for some groups/regions, not all
  | "completed"            // fully verified as done
  | "failed"               // implementation failed or abandoned
  | "disputed"             // conflicting reports on status
  | "cancelled";           // officially dropped

// ── Verification Status ──────────────────────────────────────────────────────

export type VerificationStatus =
  | "ai_extracted"     // just extracted, not yet human-reviewed
  | "human_verified"   // admin has verified against source
  | "cross_verified"   // verified by multiple independent documents
  | "disputed"         // conflicting information found
  | "retracted";       // found to be incorrect, kept for audit trail

// ── Geographic + Government Scope ───────────────────────────────────────────

export type GeoScope =
  | "national"
  | "provincial"
  | "district"
  | "municipality"
  | "ward";

export type GovernmentLevel =
  | "federal"
  | "provincial"
  | "local";

// ── Traceability (critical for audit, verification, retraining, public trust) ─

export interface IntelTraceability {
  sourceQuote:         string;  // exact or near-exact text from the document
  rawParagraph:        string;  // full paragraph this item was extracted from
  chunkId:             string;  // which chunk of the doc (chunk_1, chunk_2, ...)
  extractionReasoning: string;  // why AI flagged this as trackable
}

// ── Main Record Interface ────────────────────────────────────────────────────

export interface IntelligenceRecord {
  id:      string;
  ownerId: string;

  // ── Source Document ──────────────────────────────────────────────────────
  sourceDocId:    string;   // vault_intelligence_docs ID
  sourceDocTitle: string;   // human-readable doc name
  sourceDocType?: string;   // "budget" | "niti-karyakram" | "act" | "circular"
  sourceYear?:    string;   // "2083" (BS year)
  fiscalYear?:    string;   // "2083/84" (BS fiscal year)
  sourceSection?: string;   // which section/chapter of the document
  sourcePage?:    number;   // page number if available
  documentType?:  string;   // "policy" | "budget" | "act" | "circular" | "report"

  // ── Core Record ──────────────────────────────────────────────────────────
  type:          IntelRecordType;
  title:         string;        // concise English title (5-10 words)
  titleNepali:   string;        // concise Nepali title
  summaryNepali: string;        // 1-2 citizen-readable Nepali sentences

  // ── Classification ───────────────────────────────────────────────────────
  sector:      string;   // "education" | "health" | "agriculture" | ...
  ministry:    string;   // responsible ministry (exact name from document)
  department?: string;   // specific department within ministry

  // ── Specifics ────────────────────────────────────────────────────────────
  target?:          string;   // numerical/qualitative target
  measurable:       boolean;  // can this be verified with evidence?
  timeline?:        string;   // deadline/fiscal year from document
  budgetAmount?:    string;   // "रु. X करोड/अर्ब" as stated
  budgetAmountNum?: number;   // parsed NPR crore for sorting/filtering

  // ── Geographic Scope ─────────────────────────────────────────────────────
  geoScope:           GeoScope;
  governmentLevel:    GovernmentLevel;
  affectedProvinces?: string[];  // ["Koshi", "Bagmati", ...]

  // ── Political Context ────────────────────────────────────────────────────
  politicalParty?: string;  // if associated with specific party/coalition

  // ── Status ───────────────────────────────────────────────────────────────
  implementationStatus: ImplementationStatus;
  verificationStatus:   VerificationStatus;
  statusNote?:          string;
  statusUpdatedAt?:     string;

  // ── Relationship Graph (populated by matching engine) ────────────────────
  relatedEntities?:  string[];  // IDs of janta_entities
  relatedPromises?:  string[];  // janta_intelligence IDs — same commitment
  relatedProjects?:  string[];  // janta_intelligence IDs — linked projects
  relatedPolicies?:  string[];  // janta_intelligence IDs — linked policies
  relatedBudgets?:   string[];  // janta_intelligence IDs — funding records

  // ── Impact ───────────────────────────────────────────────────────────────
  affectedGroups:   string[];  // ["युवा", "कृषक", "महिला", "दलित", ...]
  affectedSectors:  string[];  // ["agriculture", "education", "energy", ...]

  // ── Traceability (audit trail, verification, future retraining) ──────────
  traceability?: IntelTraceability;

  // ── Discovery ────────────────────────────────────────────────────────────
  tags: string[];  // searchable tags for citizen queries

  // ── Quality ──────────────────────────────────────────────────────────────
  confidence: number;  // 0.0-1.0

  // ── Publishing ───────────────────────────────────────────────────────────
  publishToJanta: boolean;
  featured?:      boolean;

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

// ── Legacy aliases (backward compat with existing records) ──────────────────

/** @deprecated Use ImplementationStatus */
export type IntelRecordStatus = ImplementationStatus;
