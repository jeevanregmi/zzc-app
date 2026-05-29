/**
 * lib/knowledge/adapters.ts — Phase 3: Atom Pool Adapters
 *
 * Converts records from existing Firestore collections into the
 * UniversalKnowledgeObject interface. No data is duplicated or migrated.
 * Each adapter is a pure function: source record in → UKO view out.
 *
 * Adapter map:
 *   janta_intelligence        → intelRecordToUKO()
 *   constitutional_framework  → constitutionArticleToUKO()
 *   economy_atoms             → economyAtomToUKO()
 *   promise_atoms             → promiseAtomToUKO()
 *   sacred_texts              → sacredTextToUKO()     (document-level, not atom-level)
 *   shloka_atoms              → shlokaAtomToUKO()
 *   semantic_dictionary       → semanticTermToUKO()
 *   media_atoms               → mediaAtomToUKO()
 *
 * Entry point for public product consumers:
 *   adaptAnyKnowledgeObject(collectionName, record, ownerId)
 *
 * See: docs/ATOM_POOL_ARCHITECTURE.md
 */

import {
  computeUKOQualityScore,
  routeKnowledgeAtom,
  VAULT_ONLY_ROUTE,
  type UniversalKnowledgeObject,
  type VerificationStatus,
  type ClassificationStatus,
  type KnowledgeDomain,
  type KnowledgeObjectType,
  type CivicClassifications,
  type BhaktiClassifications,
  type PublicProduct,
} from "../types/knowledge-objects";

import type { IntelligenceRecord } from "../types/intelligence-record";
import type { ConstitutionalFrameworkRecord } from "../types/constitutional-framework";
import type { EconomicAtom } from "../types/economy";
import type { PromiseAtom } from "../types/promise";
import type { SacredText, ShlokaAtom } from "../types/sacred-text";
import type { SemanticDictionaryEntry, CivicSemanticAtom, SpiritualSemanticAtom } from "../types/semantic-atom";
import type { MediaAtom } from "../types/media-atoms";

// ── Shared low-level helpers ───────────────────────────────────────────────────

function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && isFinite(v) ? v : fallback;
}

function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function asStrArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function nowIso(): string {
  return new Date().toISOString();
}

// ── Verification status mappers ────────────────────────────────────────────────
// Each source collection uses slightly different verification vocabulary.
// Map all variants to the canonical UKO VerificationStatus.

function mapIntelVerification(v: string | undefined): VerificationStatus {
  if (v === "founder_reviewed" || v === "founder_verified") return "founder_reviewed";
  if (v === "human_verified" || v === "cross_verified")     return "human_verified";
  if (v === "disputed" || v === "retracted")                return "needs_revision";
  return "ai_extracted";
}

function mapEconomyVerification(v: string | undefined): VerificationStatus {
  if (v === "founder_verified" || v === "founder_reviewed") return "founder_reviewed";
  if (v === "needs_revision")                               return "needs_revision";
  return "ai_extracted";
}

function mapSemanticVerification(v: string | undefined): VerificationStatus {
  // "source_grounded" = extracted from authoritative dictionary; treat as founder_reviewed
  if (v === "founder_verified" || v === "source_grounded")  return "founder_reviewed";
  return "ai_extracted";
}

function mapPromiseVerification(v: string | undefined): VerificationStatus {
  if (v === "founder_reviewed" || v === "human_verified")   return "founder_reviewed";
  if (v === "needs_revision")                               return "needs_revision";
  return "ai_extracted";
}

// ── Classification status helper ──────────────────────────────────────────────
// Pre-existing published atoms are treated as "approved" in the Atom Pool —
// the founder has already reviewed and published them through the old system.
// Unpublished atoms are "pending" until the classifier runs and founder approves.

function classificationStatus(alreadyPublic: boolean): ClassificationStatus {
  return alreadyPublic ? "approved" : "pending";
}

// ── Build a partial UKO then finalize quality + routes ────────────────────────

function finalizeUKO(partial: Omit<UniversalKnowledgeObject, "qualityScore" | "routes">): UniversalKnowledgeObject {
  const qualityScore = computeUKOQualityScore({
    evidenceText:     partial.evidenceText,
    pageNumber:       partial.pageNumber,
    sourceDocumentId: partial.sourceDocumentId,
    titleNepali:      partial.titleNepali,
    meaningNepali:    partial.meaningNepali,
    confidence:       partial.confidence,
  });
  // Placeholder routes needed to satisfy the type before we compute real routes
  const withPlaceholder: UniversalKnowledgeObject = { ...partial, qualityScore, routes: VAULT_ONLY_ROUTE };
  return { ...withPlaceholder, routes: routeKnowledgeAtom(withPlaceholder) };
}

// ── 1. janta_intelligence → UKO ───────────────────────────────────────────────

/**
 * Adapts a janta_intelligence record to UniversalKnowledgeObject.
 *
 * objectType mapping:
 *   "promise" → "government_promise"
 *   all others → "civic_fact"
 *
 * publicReady: publishToJanta is the existing flag; published is the newer one.
 * Both are checked.
 */
export function intelRecordToUKO(record: IntelligenceRecord, ownerId: string): UniversalKnowledgeObject {
  const isPublic       = record.publishToJanta || record.published === true;
  const verStat        = mapIntelVerification(record.verificationStatus);
  const objType: KnowledgeObjectType = record.type === "promise" ? "government_promise" : "civic_fact";
  const clsStatus      = classificationStatus(isPublic);

  // Evidence: prefer atomic textEvidence, fall back to traceability.sourceQuote
  const evidenceText   = record.textEvidence ?? record.traceability?.sourceQuote ?? "";
  const pageNumber     = record.pageNumber ?? record.sourcePage ?? 0;

  // Sector classification — combine singular sector + plural affectedSectors
  const sectors: string[] = [
    ...(record.sector ? [record.sector] : []),
    ...asStrArr(record.affectedSectors),
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Public products: guess from domain for already-public records
  const publicProducts: PublicProduct[] = isPublic
    ? (record.domain === "finance" || record.domain === "banking" || record.domain === "market"
        ? ["economy_chautari", "janta_intelligence"]
        : ["janta_intelligence", "civic_feed"])
    : [];

  const classifications: CivicClassifications = {
    domains:          ["civic"],
    sectors,
    themes:           asStrArr(record.tags),
    audiences:        asStrArr(record.affectedGroups),
    sourceTypes:      record.sourceDocType ? [record.sourceDocType] : [],
    timePeriods:      record.fiscalYear ? [record.fiscalYear] : [],
    publicProducts,
    mediaSuitability: [],
    learningLevel:    [],
    relatedMovements: [],
  };

  return finalizeUKO({
    id:                    record.id,
    ownerId,
    domain:                "civic",
    objectType:            objType,
    titleNepali:           record.titleNepali,
    summaryNepali:         record.summaryNepali,
    meaningNepali:         record.summaryNepali, // janta_intelligence has no separate meaningNepali
    sourceCollection:      "janta_intelligence",
    sourceDocumentId:      record.sourceDocId,
    sourceDocTitle:        record.sourceDocTitle,
    evidenceText,
    pageNumber,
    confidence:            record.confidence,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             record.createdAt,
    updatedAt:             record.updatedAt,
  });
}

// ── 2. constitutional_framework → UKO ─────────────────────────────────────────

/**
 * Adapts a constitutional_framework record to UniversalKnowledgeObject.
 *
 * ConstitutionalFrameworkRecord has no verificationStatus field.
 * High confidence (>= 0.85) + publishToJanta = founder_reviewed by convention.
 */
export function constitutionArticleToUKO(
  article: ConstitutionalFrameworkRecord & { id: string },
  ownerId: string,
): UniversalKnowledgeObject {
  const isPublic    = article.publishToJanta;
  const verStat: VerificationStatus = isPublic && article.confidence >= 0.85
    ? "founder_reviewed"
    : "ai_extracted";
  const clsStatus   = classificationStatus(isPublic);

  const publicProducts: PublicProduct[] = isPublic ? ["constitution_reader"] : [];

  const classifications: CivicClassifications = {
    domains:          ["civic"],
    sectors:          asStrArr(article.sectors),
    themes:           asStrArr(article.constitutionalThemes),
    audiences:        asStrArr(article.affectedGroups),
    sourceTypes:      ["parliamentary_document"],
    timePeriods:      [],
    publicProducts,
    mediaSuitability: [],
    learningLevel:    ["intermediate"],
    relatedMovements: [],
  };

  return finalizeUKO({
    id:                    article.id,
    ownerId,
    domain:                "civic",
    objectType:            "constitution_article",
    titleNepali:           article.titleNepali,
    summaryNepali:         article.plainNepaliSummary,
    meaningNepali:         article.plainNepaliSummary,
    sourceCollection:      "constitutional_framework",
    sourceDocumentId:      article.sourceDocId,
    sourceDocTitle:        article.sourceDocTitle,
    evidenceText:          article.originalText,
    pageNumber:            article.sourcePage ?? 0,
    confidence:            article.confidence,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             article.createdAt,
    updatedAt:             article.updatedAt,
  });
}

// ── 3. economy_atoms → UKO ────────────────────────────────────────────────────

/**
 * Adapts an economy_atoms record to UniversalKnowledgeObject.
 *
 * citizenMeaningNepali becomes meaningNepali — the citizen-impact field.
 * The `atomType` is preserved in the themes classification for downstream use.
 */
export function economyAtomToUKO(atom: EconomicAtom, ownerId: string): UniversalKnowledgeObject {
  const isPublic  = atom.publishedToPublic;
  const verStat   = mapEconomyVerification(atom.verificationStatus);
  const clsStatus = classificationStatus(isPublic);

  const publicProducts: PublicProduct[] = isPublic ? ["economy_chautari"] : [];
  const relatedMovements: string[] = atom.relatedMovement ? [atom.relatedMovement] : [];

  const classifications: CivicClassifications = {
    domains:          ["civic", "economy"],
    sectors:          [atom.sector],
    themes:           [atom.atomType],
    audiences:        atom.targetGroup ? [atom.targetGroup] : [],
    sourceTypes:      [atom.sourceDocType],
    timePeriods:      [atom.fiscalYear],
    publicProducts,
    mediaSuitability: [],
    learningLevel:    [],
    relatedMovements,
  };

  return finalizeUKO({
    id:                    atom.id,
    ownerId,
    domain:                "civic",
    objectType:            "economic_atom",
    titleNepali:           atom.summaryNepali,            // economy atoms have no separate title
    summaryNepali:         atom.summaryNepali,
    meaningNepali:         atom.citizenMeaningNepali,
    sourceCollection:      "economy_atoms",
    sourceDocumentId:      atom.sourceDocumentId,
    sourceDocTitle:        atom.sourceDocTitle,
    evidenceText:          atom.textEvidence,
    pageNumber:            atom.pageNumber,
    confidence:            atom.confidence,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             atom.createdAt,
    updatedAt:             atom.updatedAt,
  });
}

// ── 4. promise_atoms → UKO ────────────────────────────────────────────────────

/**
 * Adapts a promise_atoms record to UniversalKnowledgeObject.
 *
 * accountabilityScore (0–1) is preserved as confidence.
 * promisedAction + plainNepaliMeaning map to summaryNepali + meaningNepali.
 */
export function promiseAtomToUKO(atom: PromiseAtom, ownerId: string): UniversalKnowledgeObject {
  const isPublic  = atom.publicReady;
  const verStat   = mapPromiseVerification(atom.verificationStatus);
  const clsStatus = classificationStatus(isPublic);

  const relatedMovements: string[] = atom.relatedMovement && atom.relatedMovement !== "none"
    ? [atom.relatedMovement]
    : [];

  const publicProducts: PublicProduct[] = isPublic ? ["promise_tracker", "civic_feed"] : [];

  const classifications: CivicClassifications = {
    domains:          ["civic"],
    sectors:          [atom.sector],
    themes:           ["accountability", "government_promise"],
    audiences:        atom.targetGroup ? [atom.targetGroup] : [],
    sourceTypes:      [atom.sourceDocType],
    timePeriods:      [atom.fiscalYear],
    publicProducts,
    mediaSuitability: ["explainer_card"],
    learningLevel:    ["basic"],
    relatedMovements,
  };

  return finalizeUKO({
    id:                    atom.id,
    ownerId,
    domain:                "civic",
    objectType:            "government_promise",
    titleNepali:           atom.titleNepali,
    summaryNepali:         atom.promisedAction,
    meaningNepali:         atom.plainNepaliMeaning,
    sourceCollection:      "promise_atoms",
    sourceDocumentId:      atom.sourceDocumentId,
    sourceDocTitle:        atom.sourceDocTitle,
    evidenceText:          atom.originalTextEvidence,
    pageNumber:            atom.pageNumber,
    confidence:            atom.accountabilityScore ?? 0.5,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             atom.createdAt,
    updatedAt:             atom.updatedAt,
  });
}

// ── 5. sacred_texts → UKO (document-level) ────────────────────────────────────

/**
 * Adapts a sacred_texts document to UniversalKnowledgeObject.
 *
 * NOTE: SacredText is a document CONTAINER. Its atomic units are ShlokaAtoms.
 * This adapter creates a document-level UKO (objectType: "media_seed")
 * representing the whole text. Use shlokaAtomToUKO() for verse-level atoms.
 *
 * pageNumber: 0 — sacred texts are not page-indexed in this system.
 * evidenceText: first 400 chars of originalText (the source itself).
 */
export function sacredTextToUKO(
  text: SacredText & { id: string },
  ownerId: string,
): UniversalKnowledgeObject {
  const isPublic  = text.visibility === "published";
  const clsStatus = classificationStatus(isPublic);

  const publicProducts: PublicProduct[] = isPublic
    ? ["bhakti_chautari", "shloka_explorer"]
    : [];

  const titleNepali = text.title.nepali ?? text.title.sanskrit ?? "Unknown";

  const classifications: BhaktiClassifications = {
    domains:          ["bhakti"],
    traditions:       text.tradition ? [text.tradition] : [],
    characters:       text.primaryCharacterId ? [text.primaryCharacterId] : [],
    textTypes:        [text.textType],
    rasas:            [],
    languages:        [text.primaryLanguage],
    publicProducts,
    mediaSuitability: isPublic ? ["chant_card"] : [],
  };

  return finalizeUKO({
    id:                    text.id,
    ownerId,
    domain:                "bhakti",
    objectType:            "media_seed",
    titleNepali,
    summaryNepali:         text.founderNote ?? titleNepali,
    meaningNepali:         text.founderNote ?? "",
    sourceCollection:      "sacred_texts",
    sourceDocumentId:      text.id,
    sourceDocTitle:        titleNepali,
    evidenceText:          text.originalText.slice(0, 400),
    pageNumber:            0, // sacred texts are line-indexed, not page-indexed
    confidence:            0.8,
    verificationStatus:    isPublic ? "founder_reviewed" : "ai_extracted",
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             text.createdAt,
    updatedAt:             text.updatedAt,
  });
}

// ── 6. shloka_atoms → UKO ────────────────────────────────────────────────────

/**
 * Adapts a shloka_atoms record to UniversalKnowledgeObject.
 *
 * pageNumber: lineIndex + 1 (1-based position in source text; not a physical page).
 * titleNepali: the original Sanskrit line (the atom itself).
 * summaryNepali + meaningNepali: nepaliMeaning if available.
 */
export function shlokaAtomToUKO(
  shloka: ShlokaAtom & { id: string },
  ownerId: string,
): UniversalKnowledgeObject {
  const isPublic  = shloka.verified;
  const verStat: VerificationStatus = shloka.verified ? "founder_reviewed" : "ai_extracted";
  const clsStatus = classificationStatus(isPublic);

  const publicProducts: PublicProduct[] = isPublic ? ["shloka_explorer", "bhakti_chautari"] : [];

  const classifications: BhaktiClassifications = {
    domains:          ["bhakti"],
    traditions:       [],
    characters:       shloka.relatedCharacterId ? [shloka.relatedCharacterId] : [],
    textTypes:        ["shloka"],
    rasas:            shloka.devotionalEmotion ? [shloka.devotionalEmotion] : [],
    languages:        ["sanskrit"],
    publicProducts,
    mediaSuitability: isPublic ? ["chant_card"] : [],
  };

  return finalizeUKO({
    id:                    shloka.id,
    ownerId,
    domain:                "bhakti",
    objectType:            "shloka_atom",
    titleNepali:           shloka.originalLine,
    summaryNepali:         shloka.nepaliMeaning ?? shloka.originalLine,
    meaningNepali:         shloka.nepaliMeaning ?? "",
    sourceCollection:      "shloka_atoms",
    sourceDocumentId:      shloka.sourceTextId,
    sourceDocTitle:        shloka.sourceTextId, // no title on ShlokaAtom — caller should enrich
    evidenceText:          shloka.originalLine,
    pageNumber:            shloka.lineIndex + 1, // 1-indexed line position
    confidence:            shloka.verified ? 0.9 : 0.6,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             shloka.createdAt,
    updatedAt:             shloka.createdAt, // ShlokaAtom has no updatedAt field
  });
}

// ── 7. semantic_dictionary → UKO ──────────────────────────────────────────────

/**
 * Adapts a semantic_dictionary entry to UniversalKnowledgeObject.
 *
 * SemanticDictionaryEntry = CivicSemanticAtom | SpiritualSemanticAtom.
 * Domain determines the UKO domain and classification shape.
 *
 * evidenceText: first usage example, or sourced attribution.
 * pageNumber: 0 — dictionary entries are not page-indexed.
 */
export function semanticTermToUKO(
  entry: SemanticDictionaryEntry & { id?: string },
  ownerId: string,
): UniversalKnowledgeObject {
  const id        = entry.id ?? "";
  const isPublic  = false; // semantic_dictionary is vault-private until Phase 3+
  const verStat   = mapSemanticVerification(entry.verificationStatus);
  const clsStatus: ClassificationStatus = "pending";

  const termNepali    = entry.term.nepali ?? entry.term.sanskrit ?? entry.term.english ?? "";
  const meaningNepali = entry.meaning.nepali ?? entry.meaning.english ?? "";
  const evidenceText  = (entry.usageExamples?.[0]) ?? entry.sources[0]?.attribution ?? "";

  if (entry.domain === "civic") {
    const civic = entry as CivicSemanticAtom;
    const classifications: CivicClassifications = {
      domains:          ["civic"],
      sectors:          [],
      themes:           asStrArr(civic.tags),
      audiences:        [],
      sourceTypes:      [],
      timePeriods:      [],
      publicProducts:   [],
      mediaSuitability: [],
      learningLevel:    [civic.difficultyLevel === "scholarly" ? "advanced"
                          : civic.difficultyLevel === "intermediate" ? "intermediate" : "basic"],
      relatedMovements: [],
    };

    return finalizeUKO({
      id,
      ownerId,
      domain:                "civic",
      objectType:            "semantic_term",
      titleNepali:           termNepali,
      summaryNepali:         meaningNepali,
      meaningNepali,
      sourceCollection:      "semantic_dictionary",
      sourceDocumentId:      civic.primarySourceId ?? civic.sources[0]?.id ?? "",
      sourceDocTitle:        civic.sources[0]?.name ?? "Semantic Dictionary",
      evidenceText,
      pageNumber:            0,
      confidence:            verStat === "founder_reviewed" ? 0.9 : 0.65,
      verificationStatus:    verStat,
      publicReady:           isPublic,
      classifications,
      classificationStatus:  clsStatus,
      createdAt:             civic.addedAt,
      updatedAt:             civic.verifiedAt ?? civic.addedAt,
    });
  }

  // Spiritual domain
  const spiritual = entry as SpiritualSemanticAtom;
  const classifications: BhaktiClassifications = {
    domains:          ["bhakti"],
    traditions:       spiritual.tradition ? [spiritual.tradition] : [],
    characters:       [],
    textTypes:        [],
    rasas:            [],
    languages:        ["sanskrit"],
    publicProducts:   [],
    mediaSuitability: [],
  };

  return finalizeUKO({
    id,
    ownerId,
    domain:                "bhakti",
    objectType:            "semantic_term",
    titleNepali:           spiritual.devanagari || termNepali,
    summaryNepali:         meaningNepali,
    meaningNepali,
    sourceCollection:      "semantic_dictionary",
    sourceDocumentId:      spiritual.primarySourceId ?? spiritual.sources[0]?.id ?? "",
    sourceDocTitle:        spiritual.sources[0]?.name ?? "Sanskrit Dictionary",
    evidenceText,
    pageNumber:            0,
    confidence:            verStat === "founder_reviewed" ? 0.9 : 0.65,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             spiritual.addedAt,
    updatedAt:             spiritual.verifiedAt ?? spiritual.addedAt,
  });
}

// ── 8. media_atoms → UKO ──────────────────────────────────────────────────────

/**
 * Adapts a media_atoms record to UniversalKnowledgeObject.
 *
 * MediaAtom is a publication wrapper — it references civic intelligence
 * via sourceCollection + sourceAtomId; it never stores intelligence.
 * The UKO objectType is "media_seed": it signals this is media-ready content.
 *
 * sourceDocumentId: the sourceAtomId (the atom it was generated from).
 * evidenceText: scriptNepali — the AI-generated Nepali script.
 * pageNumber: 0 — media atoms are not page-indexed.
 * publicReady: only when status === "published".
 */
export function mediaAtomToUKO(
  atom: MediaAtom & { id: string },
  ownerId: string,
): UniversalKnowledgeObject {
  const isPublic  = atom.status === "published";
  const verStat: VerificationStatus = (atom.status === "approved" || atom.status === "published")
    ? "founder_reviewed"
    : "ai_extracted";
  const clsStatus = classificationStatus(isPublic);

  const publicProducts: PublicProduct[] = isPublic ? ["media_studio"] : [];

  // Media atoms are always civic (they reference constitutional_framework or janta_intelligence)
  const classifications: CivicClassifications = {
    domains:          ["civic"],
    sectors:          [],
    themes:           [atom.mediaType, atom.emotionalTone],
    audiences:        [atom.targetAudience],
    sourceTypes:      [atom.sourceCollection],
    timePeriods:      [],
    publicProducts,
    mediaSuitability: [atom.mediaType],
    learningLevel:    ["basic"],
    relatedMovements: [],
  };

  return finalizeUKO({
    id:                    atom.id,
    ownerId,
    domain:                "civic",
    objectType:            "media_seed",
    titleNepali:           atom.captionText.slice(0, 100) || atom.scriptNepali.slice(0, 80),
    summaryNepali:         atom.scriptNepali.slice(0, 200),
    meaningNepali:         atom.narrationText.slice(0, 200),
    sourceCollection:      "media_atoms",
    sourceDocumentId:      atom.sourceAtomId,
    sourceDocTitle:        atom.sourceCollection,
    evidenceText:          atom.scriptNepali.slice(0, 400),
    pageNumber:            0,
    confidence:            isPublic ? 0.95 : 0.7,
    verificationStatus:    verStat,
    publicReady:           isPublic,
    classifications,
    classificationStatus:  clsStatus,
    createdAt:             atom.createdAt,
    updatedAt:             atom.publishedAt ?? atom.approvedAt ?? atom.createdAt,
  });
}

// ── Dispatch adapter ───────────────────────────────────────────────────────────

/**
 * adaptAnyKnowledgeObject — entry point for all public product consumers.
 *
 * Takes a raw Firestore document (as Record<string, unknown>) from any
 * supported collection and returns a UniversalKnowledgeObject.
 *
 * Returns null for unsupported collections or malformed records.
 *
 * Usage:
 *   const uko = adaptAnyKnowledgeObject("economy_atoms", firestoreDoc.data(), uid);
 *   if (uko) routeKnowledgeAtom(uko);
 */
export function adaptAnyKnowledgeObject(
  collectionName: string,
  record: Record<string, unknown>,
  ownerId: string,
): UniversalKnowledgeObject | null {
  try {
    const id = asStr(record.id ?? record._id ?? "");

    switch (collectionName) {
      case "janta_intelligence": {
        const r = record as unknown as IntelligenceRecord;
        if (!r.titleNepali || !r.sourceDocId) return null;
        return intelRecordToUKO({ ...r, id }, ownerId);
      }

      case "constitutional_framework": {
        const r = record as unknown as ConstitutionalFrameworkRecord;
        if (!r.titleNepali || !r.articleId) return null;
        return constitutionArticleToUKO({ ...r, id }, ownerId);
      }

      case "economy_atoms": {
        const r = record as unknown as EconomicAtom;
        if (!r.summaryNepali || !r.sourceDocumentId) return null;
        return economyAtomToUKO({ ...r, id }, ownerId);
      }

      case "promise_atoms": {
        const r = record as unknown as PromiseAtom;
        if (!r.titleNepali || !r.sourceDocumentId) return null;
        return promiseAtomToUKO({ ...r, id }, ownerId);
      }

      case "sacred_texts": {
        const r = record as unknown as SacredText;
        if (!r.title || !r.originalText) return null;
        return sacredTextToUKO({ ...r, id }, ownerId);
      }

      case "shloka_atoms": {
        const r = record as unknown as ShlokaAtom;
        if (!r.originalLine) return null;
        return shlokaAtomToUKO({ ...r, id }, ownerId);
      }

      case "semantic_dictionary": {
        const r = record as unknown as SemanticDictionaryEntry;
        if (!r.term || !r.domain) return null;
        return semanticTermToUKO({ ...r, id }, ownerId);
      }

      case "media_atoms": {
        const r = record as unknown as MediaAtom;
        if (!r.scriptNepali || !r.sourceAtomId) return null;
        return mediaAtomToUKO({ ...r, id }, ownerId);
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ── Supported collections registry ───────────────────────────────────────────

/**
 * SUPPORTED_COLLECTIONS — the set of collections the Atom Pool can consume.
 * Use this to validate collectionName before calling adaptAnyKnowledgeObject.
 */
export const SUPPORTED_COLLECTIONS = new Set([
  "janta_intelligence",
  "constitutional_framework",
  "economy_atoms",
  "promise_atoms",
  "sacred_texts",
  "shloka_atoms",
  "semantic_dictionary",
  "media_atoms",
] as const);

export type SupportedCollection = typeof SUPPORTED_COLLECTIONS extends Set<infer T> ? T : never;
