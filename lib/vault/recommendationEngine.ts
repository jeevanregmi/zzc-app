/**
 * Universal Recommendation Engine
 *
 * Generates UniversalRecommendation[] for every ZZC intelligence object type.
 * Pure functions — no Firestore writes. Caller persists via saveRecommendations().
 *
 * Currently active generators:
 *   document              — wraps identityEnrichment.ts (govFolder, lifecycle, institution, tags)
 *   constitutional_record — publication readiness, partNumber=0 repair
 *   janta_record          — publication readiness, missing constitutional refs
 *
 * Phase 5 generators (stubbed — return [] until built):
 *   sacred_text, shloka_atom, character, semantic_atom, media_atom
 */

import { getDocEnrichment } from "./identityEnrichment";
import type { ResolvableDoc, RecDescriptor }      from "./documentResolver";
import type { ConstitutionalFrameworkRecord }      from "../types/constitutional-framework";
import type {
  UniversalRecommendation,
  RecommendationKind,
  RecommendationTarget,
  RecommendationSignal,
} from "../types/recommendations";

// ── Deterministic ID ──────────────────────────────────────────────────────────

function recId(targetId: string, kind: string, field?: string): string {
  const suffix = field ? `_${field}` : `_${kind}`;
  return `${targetId}_${kind}${suffix}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 100);
}

// ── Document recommendations ──────────────────────────────────────────────────

/**
 * Generate enrichment recommendations for a vault_intelligence_docs record.
 * Wraps identityEnrichment.ts — no additional LLM calls.
 */
export function generateDocumentRecommendations(
  ownerId: string,
  doc:     ResolvableDoc,
  kitRecs: RecDescriptor[],
): UniversalRecommendation[] {
  const enrichment = getDocEnrichment(doc, kitRecs);
  const label = (doc.title ?? doc.fileName ?? doc.id).slice(0, 80);

  return enrichment.suggestions.map(s => {
    const kind: RecommendationKind =
      (s.field === "govFolder" || s.field === "lifecycleType" || s.field === "institutionName")
        ? "identity_fix"
        : "metadata";

    const signals: RecommendationSignal[] = enrichment.kitMatch
      ? [{ type: "kit_match", label: `Kit: ${enrichment.kitMatch.title} (${enrichment.kitMatch.score}%)` }]
      : [];

    return {
      id:          recId(doc.id, kind, s.field),
      ownerId,
      createdAt:   new Date().toISOString(),
      targetType:  "document" as RecommendationTarget,
      targetId:    doc.id,
      targetLabel: label,
      kind,
      field:       s.field,
      current:     s.current,
      suggested:   s.suggested,
      confidence:  s.confidence,
      reasoning:   s.reason,
      signals,
      status:      "pending",
    };
  });
}

// ── Constitutional record recommendations ─────────────────────────────────────

export function generateConstitutionalRecommendations(
  ownerId: string,
  record:  ConstitutionalFrameworkRecord & { id: string },
): UniversalRecommendation[] {
  const recs: UniversalRecommendation[] = [];
  const label = `${record.titleNepali} (अनुच्छेद ${record.article})`;

  // Suggest publishing when all key fields are populated and partNumber is valid
  if (
    !record.publishToJanta
    && record.titleNepali
    && record.plainNepaliSummary
    && record.partNumber > 0
  ) {
    recs.push({
      id:          recId(record.id, "publication_ready"),
      ownerId,
      createdAt:   new Date().toISOString(),
      targetType:  "constitutional_record",
      targetId:    record.id,
      targetLabel: label,
      kind:        "publication_ready",
      field:       "publishToJanta",
      current:     false,
      suggested:   true,
      confidence:  85,
      reasoning:   `सबै आवश्यक fields भरिएको छ — Janta मा प्रकाशन गर्न सकिन्छ`,
      signals: [
        { type: "nepali_summary", label: "Nepali summary present" },
        { type: "part_number",    label: `भाग ${record.partNumber}` },
      ],
      status: "pending",
    });
  }

  // Flag partNumber=0 (common after batch extraction without part repair)
  if (record.partNumber === 0) {
    recs.push({
      id:          recId(record.id, "identity_fix", "partNumber"),
      ownerId,
      createdAt:   new Date().toISOString(),
      targetType:  "constitutional_record",
      targetId:    record.id,
      targetLabel: label,
      kind:        "identity_fix",
      field:       "partNumber",
      current:     0,
      suggested:   null,
      confidence:  70,
      reasoning:   `partNumber = 0 — यो record को भाग नम्बर repair गर्न आवश्यक छ`,
      signals:     [{ type: "zero_partNumber", label: "partNumber is 0" }],
      status:      "pending",
    });
  }

  return recs;
}

// ── Janta intelligence recommendations ───────────────────────────────────────

export interface JantaRecordMinimal {
  id:                   string;
  ownerId?:             string;
  titleNepali?:         string;
  titleEnglish?:        string;
  publishToJanta?:      boolean;
  constitutionalRefs?:  string[];
  domain?:              string;
  implementationStatus?: string;
}

export function generateJantaRecommendations(
  ownerId: string,
  intel:   JantaRecordMinimal,
): UniversalRecommendation[] {
  const recs: UniversalRecommendation[] = [];
  const label = (intel.titleNepali ?? intel.titleEnglish ?? intel.id).slice(0, 80);

  // Suggest publishing when implementation is active/delivered
  if (
    !intel.publishToJanta
    && (intel.implementationStatus === "delivered" || intel.implementationStatus === "in_progress")
    && intel.titleNepali
  ) {
    recs.push({
      id:          recId(intel.id, "publication_ready"),
      ownerId,
      createdAt:   new Date().toISOString(),
      targetType:  "janta_record",
      targetId:    intel.id,
      targetLabel: label,
      kind:        "publication_ready",
      field:       "publishToJanta",
      current:     false,
      suggested:   true,
      confidence:  75,
      reasoning:   `यो intelligence record "${intel.implementationStatus}" status मा छ — Janta मा प्रकाशन गर्न सुझाव`,
      signals:     [{ type: "impl_status", label: `status: ${intel.implementationStatus}` }],
      status:      "pending",
    });
  }

  // Suggest linking to constitutional articles if domain=janta and no refs
  if (
    intel.domain === "janta"
    && (!intel.constitutionalRefs || intel.constitutionalRefs.length === 0)
  ) {
    recs.push({
      id:          recId(intel.id, "relationship", "constitutionalRefs"),
      ownerId,
      createdAt:   new Date().toISOString(),
      targetType:  "janta_record",
      targetId:    intel.id,
      targetLabel: label,
      kind:        "relationship",
      field:       "constitutionalRefs",
      current:     [],
      suggested:   [],
      confidence:  45,
      reasoning:   `Constitutional articles links छैनन् — Constitution Tree सँग जोड्न सुझाव`,
      signals:     [{ type: "missing_refs", label: "No constitutional references" }],
      status:      "pending",
    });
  }

  return recs;
}

// ── Phase 5 stubs ─────────────────────────────────────────────────────────────
// These return [] until the Bhakti pipeline is built.

export function generateSacredTextRecommendations(_ownerId: string, _id: string): UniversalRecommendation[] {
  return [];
}

export function generateCharacterRecommendations(_ownerId: string, _id: string): UniversalRecommendation[] {
  return [];
}

export function generateSemanticAtomRecommendations(_ownerId: string, _id: string): UniversalRecommendation[] {
  return [];
}
