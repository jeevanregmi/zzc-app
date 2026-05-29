/**
 * IntelligenceRecord — ZZC National Intelligence Schema
 *
 * This is NOT a document analysis artifact.
 * This is a node in Nepal's national knowledge graph — shared across
 * all ZZC intelligence domains (Janta, Finance, Banking, Policy, etc.)
 *
 * Collection: janta_intelligence (the national intelligence collection)
 * Domain-tagged: every record carries a `domain` field for routing.
 *
 * The moat is ONE shared structured national memory graph — not per-domain silos.
 *
 * Extraction tiers (set by extractionTier field):
 *   "operational" → Tier 1: document-level summary, no source trace
 *   "structured"  → Tier 1.5: structured records, chunk-level trace
 *   "atomic"      → Tier 2: page/paragraph level, verbatim evidence required
 */
import type { ExtractionTier } from "./extraction-pipeline";

// ── Intelligence Domain ──────────────────────────────────────────────────────

export type IntelDomain =
  | "janta"      // civic governance, promises, public projects
  | "finance"    // NRB, banks, EPF, SSF, CIT, insurance, NEPSE
  | "banking"    // bank-specific directives, rates, complaints
  | "policy"     // laws, acts, regulations
  | "market";    // NEPSE, investment, cooperative rules

// ── Record Classification ────────────────────────────────────────────────────

export type IntelRecordType =
  // ── Civic / Janta ─────────────────────────────────────────────
  | "promise"             // specific government commitment/वाचा
  | "budget_target"       // financial allocation with amount
  | "project"             // infrastructure or development project
  | "institution"         // new body, committee, authority created
  | "employment_target"   // job creation numerical target
  | "social_program"      // welfare scheme, subsidy, benefit
  | "reform"              // policy, law, regulation change
  | "digital_policy"      // technology, digitalization, e-governance
  | "financial_inclusion" // banking, insurance, credit access
  // ── Finance / Banking ─────────────────────────────────────────
  | "bank_directive"      // NRB circular or bank directive
  | "interest_rate"       // deposit/lending rate change
  | "loan_rule"           // loan limit, collateral, eligibility rule
  | "epf_rule"            // EPF contribution, interest, withdrawal rule
  | "ssf_rule"            // SSF scheme, contribution, benefit rule
  | "cit_rule"            // CIT contribution or benefit rule
  | "insurance_rule"      // insurance regulation or claim rule
  | "nepse_rule"          // NEPSE, IPO, mutual fund regulation
  | "monetary_policy"     // NRB monetary policy target/instrument
  | "financial_complaint" // public complaint pattern or regulatory action
  // ── Shared ────────────────────────────────────────────────────
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
  | "founder_reviewed" // founder has read and approved the record against the source
  | "human_verified"   // admin has verified against source with page-level check
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

  // ── Domain Routing ───────────────────────────────────────────────────────
  // Which ZZC intelligence layer this record belongs to.
  // Records without domain field default to "janta" (backward compat).
  domain: IntelDomain;

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

  // ── Constitutional Linkage ────────────────────────────────────────────────
  // Explicit part numbers this record relates to (e.g. [3, 4]).
  // Populated by admin tagging or AI extraction. Overrides sector inference.
  constitutionalRefs?: number[];

  // ── Discovery ────────────────────────────────────────────────────────────
  tags: string[];  // searchable tags for citizen queries

  // ── Extraction Tier — honest depth label ─────────────────────────────────
  // Set by the extraction pipeline. Absent = pre-tier records (treat as structured).
  // "atomic" records MUST have pageNumber + textEvidence.
  extractionTier?: ExtractionTier;

  // ── Atomic Source Trace (required for Tier 2, optional for lower tiers) ──
  // When extractionTier === "atomic": pageNumber and textEvidence are mandatory.
  pageNumber?:   number;  // physical page in the source PDF (1-indexed)
  textEvidence?: string;  // verbatim quoted sentence(s) that contain this fact (max 400 chars)
  paragraphIdx?: number;  // 0-indexed paragraph position on the page (if determinable)

  // ── Quality ──────────────────────────────────────────────────────────────
  confidence: number;  // 0.0-1.0

  // ── Publishing ───────────────────────────────────────────────────────────
  publishToJanta: boolean;  // legacy — kept for backward compat with existing records
  published?:     boolean;  // domain-agnostic publish flag for new domains
  featured?:      boolean;

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}

// ── Legacy aliases (backward compat with existing records) ──────────────────

/** @deprecated Use ImplementationStatus */
export type IntelRecordStatus = ImplementationStatus;
