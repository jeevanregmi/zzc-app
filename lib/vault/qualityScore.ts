// Knowledge Card Quality Score
// Single source of truth for what "publishable" means in ZZC.
// Used by: CivicFeedClient (public gate), QualityClient (vault review), UniversalKnowledgeCard (badge).

import type { IntelligenceRecord } from "../types/intelligence-record";

// ── Score breakdown ────────────────────────────────────────────────────────────

export interface QualityBreakdown {
  summaryNepali:      number;  // 0 or 15
  sourceTitle:        number;  // 0 or 10
  atomicTier:         number;  // 0 or 20
  textEvidence:       number;  // 0 or 20
  pageNumber:         number;  // 0 or 15
  constitutionalRefs: number;  // 0 or 10
  humanVerified:      number;  // 0 or 10
}

export type QualityBand = "weak" | "acceptable" | "strong" | "publish-grade";

export interface QualityScore {
  total:        number;       // 0–100
  breakdown:    QualityBreakdown;
  band:         QualityBand;
  isPublicSafe: boolean;      // score >= 61
}

// ── Scorer ─────────────────────────────────────────────────────────────────────

export function scoreRecord(r: Partial<IntelligenceRecord>): QualityScore {
  const summaryNepali      = (r.summaryNepali?.trim().length  ?? 0) >= 5  ? 15 : 0;
  const sourceTitle        = (r.sourceDocTitle?.trim().length ?? 0) >= 1  ? 10 : 0;
  const atomicTier         = r.extractionTier === "atomic"                ? 20 : 0;
  const textEvidence       = (r.textEvidence?.trim().length  ?? 0) >= 10 ? 20 : 0;
  const pageNumber         = (r.pageNumber  ?? 0) > 0                     ? 15 : 0;
  const constitutionalRefs = (r.constitutionalRefs?.length   ?? 0) >= 1  ? 10 : 0;
  const humanVerified      =
    r.verificationStatus === "human_verified" || r.verificationStatus === "cross_verified" ? 10 : 0;

  const total = summaryNepali + sourceTitle + atomicTier + textEvidence + pageNumber + constitutionalRefs + humanVerified;

  const band: QualityBand =
    total >= 81 ? "publish-grade" :
    total >= 61 ? "strong" :
    total >= 31 ? "acceptable" :
                  "weak";

  return {
    total,
    breakdown: { summaryNepali, sourceTitle, atomicTier, textEvidence, pageNumber, constitutionalRefs, humanVerified },
    band,
    isPublicSafe: total >= 61,
  };
}

// ── Public-safe predicate (used by CivicFeedClient) ───────────────────────────
// All structural requirements must be met AND score >= 61.

export function isPublicSafe(r: Partial<IntelligenceRecord>): boolean {
  return (
    r.extractionTier === "atomic" &&
    (r.textEvidence?.trim().length  ?? 0) >= 10 &&
    (r.pageNumber  ?? 0) > 0 &&
    (r.sourceDocTitle?.trim().length ?? 0) >= 1 &&
    (r.summaryNepali?.trim().length  ?? 0) >= 5 &&
    scoreRecord(r).isPublicSafe
  );
}

// ── Document-level summary ─────────────────────────────────────────────────────

export interface DocQualitySummary {
  total:                     number;
  publicSafe:                number;
  weak:                      number;
  acceptable:                number;
  strong:                    number;
  publishGrade:              number;
  avgScore:                  number;
  missingConstitutionalRefs: number;
  missingHumanVerification:  number;
}

export function docQualitySummary(records: Partial<IntelligenceRecord>[]): DocQualitySummary {
  if (records.length === 0) {
    return { total: 0, publicSafe: 0, weak: 0, acceptable: 0, strong: 0, publishGrade: 0, avgScore: 0, missingConstitutionalRefs: 0, missingHumanVerification: 0 };
  }
  const scores = records.map(r => scoreRecord(r));
  return {
    total:                     records.length,
    publicSafe:                scores.filter(s => s.isPublicSafe).length,
    weak:                      scores.filter(s => s.band === "weak").length,
    acceptable:                scores.filter(s => s.band === "acceptable").length,
    strong:                    scores.filter(s => s.band === "strong").length,
    publishGrade:              scores.filter(s => s.band === "publish-grade").length,
    avgScore:                  Math.round(scores.reduce((n, s) => n + s.total, 0) / scores.length),
    missingConstitutionalRefs: records.filter(r => (r.constitutionalRefs?.length ?? 0) === 0).length,
    missingHumanVerification:  records.filter(r =>
      r.verificationStatus !== "human_verified" && r.verificationStatus !== "cross_verified"
    ).length,
  };
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const BAND_LABEL: Record<QualityBand, string> = {
  "weak":          "कमजोर",
  "acceptable":    "स्वीकार्य",
  "strong":        "बलियो",
  "publish-grade": "प्रकाशन-योग्य",
};

export const BAND_COLOR_CLASS: Record<QualityBand, string> = {
  "weak":          "text-red-400   bg-red-950/30   border-red-900/40",
  "acceptable":    "text-amber-400 bg-amber-950/30 border-amber-900/40",
  "strong":        "text-emerald-400 bg-emerald-950/30 border-emerald-900/40",
  "publish-grade": "text-violet-400 bg-violet-950/30 border-violet-900/40",
};
