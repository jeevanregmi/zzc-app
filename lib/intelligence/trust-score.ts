/**
 * Trust Score Engine — Phase 7A
 *
 * Pure deterministic scoring. No AI calls, no Firestore reads.
 * All logic is a function of the input fields; same input → same score always.
 *
 * Max score breakdown:
 *   officialSource  30 pts  — government/regulator domain
 *   sourceQuality   25 pts  — AI credibility assessment
 *   aiConfidence    25 pts  — AI analysis confidence (0-1 mapped linearly)
 *   freshness       15 pts  — content recency
 *   adminVerified    5 pts  — human validation bonus
 *                  ── 100 pts total
 *
 * Levels:
 *   80-100 → high     (safe to approve)
 *   60-79  → medium   (review before approving)
 *   40-59  → low      (treat with caution)
 *   0-39   → risky    (do not approve without verification)
 */

import type { TrustScore, TrustScoreInput, TrustLevel } from "../types/trust";

// ─── Domain lists ─────────────────────────────────────────────────────────────

const OFFICIAL_NEPAL_DOMAINS = new Set([
  "nrb.org.np",       // Nepal Rastra Bank
  "epf.gov.np",       // Employees' Provident Fund
  "ssf.gov.np",       // Social Security Fund
  "sebon.gov.np",     // Securities Board of Nepal
  "ird.gov.np",       // Inland Revenue Department
  "mof.gov.np",       // Ministry of Finance
  "mofe.gov.np",      // Ministry of Finance & Economy (alternate)
  "mlit.gov.np",      // Ministry of Land, Infrastructure & Transport
  "cia.gov.np",       // Citizen Investment Trust
  "nps.gov.np",       // Nepal Pension Scheme related
  "slbs.gov.np",      // Securities Lending & Borrowing
  "nepsefloor.com",   // Official NEPSE trading data portal
]);

const HIGH_CREDIBILITY_MEDIA = new Set([
  "sharesansar.com",   // Nepal stock market data
  "merolagani.com",    // NEPSE data and analysis
  "moneynepal.com",    // Nepal personal finance
  "onlinekhabar.com",  // Nepali news
  "myrepublica.com",   // English Nepal news
  "ekantipur.com",     // Nepali national daily
  "ratopati.com",      // Nepali finance news
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function ageInDays(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return ms / 86_400_000;
}

// ─── Component scorers ────────────────────────────────────────────────────────

function scoreOfficialSource(input: TrustScoreInput): { pts: number; reason: string | null } {
  // Official API types always get full score regardless of domain
  if (input.sourceType === "nrb_api" || input.sourceType === "sebon_api") {
    return { pts: 30, reason: "Official regulatory API source (NRB/SEBON)" };
  }

  const domain = extractDomain(input.sourceUrl ?? "");
  if (!domain) return { pts: 0, reason: null };

  if (OFFICIAL_NEPAL_DOMAINS.has(domain)) {
    return { pts: 30, reason: `Official government/regulator domain (${domain})` };
  }
  if (HIGH_CREDIBILITY_MEDIA.has(domain)) {
    return { pts: 15, reason: `High-credibility Nepal finance media (${domain})` };
  }
  return { pts: 0, reason: null };
}

function scoreSourceQuality(input: TrustScoreInput): { pts: number; reason: string | null } {
  switch (input.credibility) {
    case "high":       return { pts: 25, reason: "AI assessed source credibility as high" };
    case "medium":     return { pts: 15, reason: "AI assessed source credibility as medium" };
    case "low":        return { pts: 5,  reason: "AI assessed source credibility as low" };
    case "unverified": return { pts: 2,  reason: "Source credibility unverified — treat with caution" };
    default:           return { pts: 0,  reason: null };
  }
}

function scoreAiConfidence(input: TrustScoreInput): { pts: number; reason: string | null } {
  if (input.aiConfidence == null) return { pts: 0, reason: null };
  const clamped = Math.max(0, Math.min(1, input.aiConfidence));
  const pts = Math.round(clamped * 25);
  if (pts >= 20) return { pts, reason: `High AI confidence (${Math.round(clamped * 100)}%)` };
  if (pts >= 10) return { pts, reason: `Moderate AI confidence (${Math.round(clamped * 100)}%)` };
  return { pts, reason: `Low AI confidence (${Math.round(clamped * 100)}%) — content may be off-topic` };
}

function scoreFreshness(input: TrustScoreInput): { pts: number; reason: string | null } {
  if (!input.publishedAt) return { pts: 6, reason: null };
  const age = ageInDays(input.publishedAt);
  if (age < 1)   return { pts: 15, reason: "Published within the last 24 hours" };
  if (age < 7)   return { pts: 12, reason: `Published ${Math.floor(age)}d ago — recent` };
  if (age < 30)  return { pts: 8,  reason: `Published ${Math.floor(age)}d ago — still current` };
  if (age < 90)  return { pts: 4,  reason: `Published ${Math.floor(age)}d ago — getting dated` };
  return { pts: 0, reason: `Published ${Math.floor(age)}d ago — stale content` };
}

function scoreAdminVerified(input: TrustScoreInput): { pts: number; reason: string | null } {
  if (input.adminVerified) {
    return { pts: 5, reason: "Admin verified this source" };
  }
  return { pts: 0, reason: null };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function computeTrustScore(input: TrustScoreInput): TrustScore {
  const official  = scoreOfficialSource(input);
  const quality   = scoreSourceQuality(input);
  const aiConf    = scoreAiConfidence(input);
  const fresh     = scoreFreshness(input);
  const adminV    = scoreAdminVerified(input);

  const score = official.pts + quality.pts + aiConf.pts + fresh.pts + adminV.pts;

  const level: TrustLevel =
    score >= 80 ? "high"   :
    score >= 60 ? "medium" :
    score >= 40 ? "low"    :
    "risky";

  // Build reasons list — only include non-null entries, ordered by impact
  const reasonPairs: { pts: number; reason: string }[] = [
    { pts: official.pts, reason: official.reason ?? "" },
    { pts: quality.pts,  reason: quality.reason  ?? "" },
    { pts: aiConf.pts,   reason: aiConf.reason   ?? "" },
    { pts: fresh.pts,    reason: fresh.reason    ?? "" },
    { pts: adminV.pts,   reason: adminV.reason   ?? "" },
  ]
    .filter(r => r.reason)
    .sort((a, b) => b.pts - a.pts);

  if (reasonPairs.length === 0) {
    reasonPairs.push({ pts: 0, reason: "No source metadata available — score based on defaults" });
  }

  return {
    score,
    level,
    reasons:        reasonPairs.map(r => r.reason),
    officialSource: official.pts,
    sourceQuality:  quality.pts,
    aiConfidence:   aiConf.pts,
    freshness:      fresh.pts,
    adminVerified:  adminV.pts,
  };
}

/** Convenience helpers for the three main data types */

export function trustFromSignal(signal: {
  sourceUrl?:    string;
  sourceType?:   string;
  relevanceScore?: number;
  credibility?:  "high" | "medium" | "low" | "unverified";
  publishedAt?:  string;
  status?:       string;
  validatedAt?:  string;
}): TrustScore {
  return computeTrustScore({
    sourceUrl:    signal.sourceUrl,
    sourceType:   signal.sourceType,
    aiConfidence: signal.relevanceScore,
    credibility:  signal.credibility,
    publishedAt:  signal.publishedAt,
    adminVerified: signal.status === "validated" || signal.status === "promoted",
  });
}

export function trustFromDoc(doc: {
  downloadUrl?:       string;
  confidence?:        number;
  sourceCredibility?: "high" | "medium" | "low" | "unverified";
  uploadedAt?:        string;
  adminApprovalStatus?: string;
}): TrustScore {
  return computeTrustScore({
    sourceUrl:    doc.downloadUrl,
    aiConfidence: doc.confidence,
    credibility:  doc.sourceCredibility,
    publishedAt:  doc.uploadedAt,
    adminVerified: doc.adminApprovalStatus === "approved",
  });
}

export function trustFromQueueItem(item: {
  sourceDocUrl?:  string;
  confidence?:    number;
  status?:        string;
  createdAt?:     string;
}): TrustScore {
  return computeTrustScore({
    sourceUrl:    item.sourceDocUrl,
    aiConfidence: item.confidence,
    publishedAt:  item.createdAt,
    adminVerified: item.status === "approved" || item.status === "in_production",
  });
}
