export type TrustLevel = "high" | "medium" | "low" | "risky";

/**
 * Deterministic trust score computed from public signal metadata.
 * No AI call required — entirely based on domain, AI confidence, freshness,
 * and admin validation state.
 *
 * Score = sum of five independent components (max 100).
 */
export interface TrustScore {
  score:          number;       // 0-100 overall
  level:          TrustLevel;
  reasons:        string[];     // ordered by impact, most important first
  // ─── Component breakdown ─────────────────────────────────────────────────
  officialSource: number;       // 0-30: government/regulator domain bonus
  sourceQuality:  number;       // 0-25: AI credibility assessment
  aiConfidence:   number;       // 0-25: AI analysis confidence score
  freshness:      number;       // 0-15: recency of original content
  adminVerified:  number;       // 0-5:  human validation bonus
}

/** Input fields required to compute a TrustScore. All optional — missing fields score 0. */
export interface TrustScoreInput {
  sourceUrl?:     string;       // used to detect official domains
  sourceType?:    string;       // "nrb_api" | "sebon_api" | "rss" | "url" | "other"
  aiConfidence?:  number;       // 0-1 (relevanceScore or doc confidence)
  credibility?:   "high" | "medium" | "low" | "unverified";
  publishedAt?:   string;       // ISO 8601 date
  adminVerified?: boolean;      // true if admin has validated/approved
}
