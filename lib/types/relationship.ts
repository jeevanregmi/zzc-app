/**
 * IntelRelationship — ZZC Janta Knowledge Graph Edge
 *
 * This is the core of the national civic memory system.
 * Every relationship connects two intelligence records across time,
 * documents, or data sources — building Nepal's governance memory graph.
 *
 * Example:
 *   2083 policy: "10,000 schools internet"  ──[funding_for]──▶  2084 budget: "Rs 2 Arba allocated"
 *   2084 budget: "Rs 2 Arba allocated"      ──[progress_update]──▶  2085 report: "2000 schools connected"
 *   2085 report: "2000 schools connected"   ◀──[contradiction]──  complaint: "Bajura school has no internet"
 *
 * Collection: janta_relationships
 */

export type RelationshipType =
  | "same_commitment"  // same promise/project in different document/year
  | "funding_for"      // budget allocation directly funding a commitment/project
  | "progress_update"  // evidence of implementation for an existing commitment
  | "contradiction"    // action that reverses, contradicts, or undermines a commitment
  | "escalation"       // expanded scope or higher target for same commitment
  | "follow_up"        // continuation or next phase of a prior commitment
  | "context"          // provides background/policy basis for another record
  | "dependency";      // this record must happen before another can proceed

export type RelationshipVerificationStatus =
  | "ai_matched"      // detected by matching engine
  | "human_verified"  // admin confirmed
  | "disputed";       // human marked as incorrect

export interface IntelRelationship {
  id:      string;
  ownerId: string;

  // ── The Edge ─────────────────────────────────────────────────────────────
  fromId:    string;  // janta_intelligence record ID (newer or subject)
  toId:      string;  // janta_intelligence record ID (older or target)
  fromTitle: string;  // cached title for display without extra query
  toTitle:   string;  // cached title

  // ── Relationship ─────────────────────────────────────────────────────────
  relationshipType:    RelationshipType;
  confidence:          number;   // 0.0-1.0
  explanation:         string;   // English: why these are related
  explanationNepali?:  string;   // Nepali: citizen-readable explanation

  // ── Source ───────────────────────────────────────────────────────────────
  sourceDocIds: string[];  // which documents establish this relationship

  // ── Verification ─────────────────────────────────────────────────────────
  verificationStatus: RelationshipVerificationStatus;
  adminNote?:         string;

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt: string;
  updatedAt: string;
}
