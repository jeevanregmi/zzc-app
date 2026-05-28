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
import { computeFingerprint, resolveInstitutionId } from "./identityFingerprint";
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
  const parts = [targetId, kind];
  if (field) parts.push(field);
  return parts.join("_").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
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

// ── Canonical promotion recommendations ──────────────────────────────────────

/**
 * A document is "promotable" to canonical identity when it has:
 *   - govFolder (institutional classification)
 *   - lifecycleType (how it changes over time)
 *   - A resolvable institution (govFolder or sourceUrl domain)
 *   - No existing canonicalId (hasn't been promoted yet)
 *
 * The suggested value is the computed canonicalKey — the persistent identity token.
 */
export function generateCanonicalPromotionRecommendation(
  ownerId: string,
  doc:     ResolvableDoc & { canonicalId?: string; docYear?: number | null; contentHash?: string },
): UniversalRecommendation | null {
  // Already promoted — no recommendation needed
  if (doc.canonicalId) return null;

  // Need at minimum govFolder + lifecycleType to generate a meaningful canonical
  if (!doc.govFolder || !doc.lifecycleType) return null;

  const fp = computeFingerprint({
    title:              doc.title,
    fileName:           doc.fileName,
    govFolder:          doc.govFolder,
    lifecycleType:      doc.lifecycleType,
    docYear:            doc.docYear ?? null,
    originalSourceUrl:  doc.originalSourceUrl,
    sourceUrl:          doc.sourceUrl,
    institutionName:    doc.institutionName,
    sourceAuthority:    doc.sourceAuthority,
  });

  const institutionId = resolveInstitutionId(doc.govFolder, doc.originalSourceUrl ?? doc.sourceUrl, doc.institutionName);
  const isUnknownInst = institutionId === "unknown";

  // Higher confidence when we have year + known institution
  const confidence = isUnknownInst
    ? 55
    : fp.year
      ? 90
      : 75;

  const label = (doc.title ?? doc.fileName ?? doc.id).slice(0, 80);

  const signals: RecommendationSignal[] = [
    { type: "govFolder",     label: `govFolder: ${doc.govFolder}` },
    { type: "lifecycle",     label: `lifecycle: ${doc.lifecycleType}` },
  ];
  if (fp.year) signals.push({ type: "year", label: `year: ${fp.year}` });
  if (!isUnknownInst) signals.push({ type: "institution", label: `institution: ${institutionId}` });

  return {
    id:          recId(doc.id, "canonical_promotion"),
    ownerId,
    createdAt:   new Date().toISOString(),
    targetType:  "document" as RecommendationTarget,
    targetId:    doc.id,
    targetLabel: label,
    kind:        "canonical_promotion",
    field:       "canonicalId",
    current:     null,
    suggested:   fp.canonicalKey,
    confidence,
    reasoning:   `यो document Canonical Identity बन्न तयार छ — Key: "${fp.canonicalKey}" — Approve गर्दा permanent identity anchor बन्नेछ`,
    signals,
    status:      "pending",
  };
}

/**
 * Duplicate detection: check if any OTHER doc in the vault appears to be
 * the same real-world document. Returns one recommendation per suspect duplicate.
 *
 * Uses title + institution + year matching — no content hash comparison here
 * (that requires reading file bytes, done asynchronously elsewhere).
 */
export function generateDuplicateDetectionRecommendations(
  ownerId:  string,
  doc:      ResolvableDoc & { canonicalId?: string; docYear?: number | null },
  allDocs:  (ResolvableDoc & { canonicalId?: string; docYear?: number | null })[],
): UniversalRecommendation[] {
  // Skip if already canonically linked — dedup resolved
  if (doc.canonicalId) return [];
  if (!doc.govFolder || !doc.lifecycleType) return [];

  const fp = computeFingerprint({
    govFolder:         doc.govFolder,
    lifecycleType:     doc.lifecycleType,
    docYear:           doc.docYear ?? null,
    title:             doc.title,
    originalSourceUrl: doc.originalSourceUrl,
    sourceUrl:         doc.sourceUrl,
    institutionName:   doc.institutionName,
  });

  const recs: UniversalRecommendation[] = [];

  for (const other of allDocs) {
    if (other.id === doc.id) continue;
    // Skip docs already confirmed to be different canonicals
    if (doc.canonicalId && other.canonicalId && doc.canonicalId !== other.canonicalId) continue;

    const otherFp = computeFingerprint({
      govFolder:         other.govFolder,
      lifecycleType:     other.lifecycleType,
      docYear:           (other as { docYear?: number | null }).docYear ?? null,
      title:             other.title,
      originalSourceUrl: other.originalSourceUrl,
      sourceUrl:         other.sourceUrl,
      institutionName:   other.institutionName,
    });

    // Exact canonicalKey match = very likely duplicate (skip if institution is unknown to avoid false positives)
    if (
      fp.canonicalKey === otherFp.canonicalKey
      && fp.canonicalKey !== "unknown_other"
      && fp.institutionId !== "unknown"
    ) {
      const label = (doc.title ?? doc.fileName ?? doc.id).slice(0, 80);
      const otherLabel = (other.title ?? other.fileName ?? other.id).slice(0, 60);
      recs.push({
        id:          recId(doc.id, "duplicate_detected", other.id.slice(0, 12)),
        ownerId,
        createdAt:   new Date().toISOString(),
        targetType:  "document" as RecommendationTarget,
        targetId:    doc.id,
        targetLabel: label,
        kind:        "duplicate_detected",
        field:       "canonicalId",
        current:     null,
        suggested:   other.id,
        confidence:  85,
        reasoning:   `"${otherLabel}" — उही canonicalKey "${fp.canonicalKey}" — यी दुई documents एउटै हुन सक्छन्`,
        signals:     [{ type: "canonicalKey", label: `same key: ${fp.canonicalKey}` }],
        status:      "pending",
      });
      break; // One duplicate suggestion per doc is enough
    }
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
