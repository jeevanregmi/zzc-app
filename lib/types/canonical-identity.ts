/**
 * Canonical Document Identity
 *
 * One real-world document = one CanonicalDocument record.
 * Many vault_intelligence_docs instances can point to the same canonical.
 *
 * Collection: canonical_documents
 *
 * ZZC uses this to:
 *   - Detect re-uploads of the same document
 *   - Track all known URLs and filenames across versions
 *   - Monitor for new versions based on lifecycle schedule
 *   - Provide a stable identity even when filename/URL changes
 */

// ── Core types ────────────────────────────────────────────────────────────────

export type CanonicalStatus = "active" | "superseded" | "archived";

export interface CanonicalDocument {
  id:              string;       // Firestore auto-ID
  ownerId:         string;

  // ── Core identity (authoritative, founder-set) ────────────────────────────
  canonicalTitle:    string;     // Nepali: "राष्ट्रिय मानव अधिकार आयोग वार्षिक प्रतिवेदन"
  canonicalTitleEn?: string;     // English: "NHRC Annual Report"
  institutionId:     string;     // normalized: "nhrc" | "nrb" | "mof" | ...
  govFolder:         string;     // GovFolder value
  lifecycleType:     string;     // LifecycleType value
  year?:             number;     // BS fiscal year (e.g. 2081)
  period?:           string;     // "annual" | "Q1" | "Q2" | "Q3" | "Q4"

  // ── Fingerprints (deduplication keys) ─────────────────────────────────────
  canonicalKey:      string;     // "{institutionId}_{lifecycle}_{year?}" — primary dedup key
  titleFingerprint:  string;     // normalized sorted word set — secondary fuzzy match key
  contentHash?:      string;     // SHA-256 of raw content (exact match — set when available)

  // ── Source lineage (all known origins of this document) ───────────────────
  primarySourceUrl:  string;     // Official source (e.g. "https://nhrcnepal.org/report.pdf")
  knownAliasUrls:    string[];   // Archive.org mirrors, other sources
  knownFilenames:    string[];   // Every filename this doc has appeared under

  // ── Semantic classification ────────────────────────────────────────────────
  constitutionalParts: number[];
  tags:              string[];

  // ── Instance registry (all vault_intelligence_docs pointing here) ──────────
  primaryInstanceId: string;     // The canonical upload (best quality, most complete)
  allInstanceIds:    string[];   // All uploads — including duplicates

  // ── Lifecycle monitoring ───────────────────────────────────────────────────
  updateFrequency:   string;     // UpdateFrequency value
  nextExpectedAt?:   string;     // ISO date — when next version is expected
  lastVerifiedAt?:   string;     // ISO date — last time we confirmed this is current

  // ── Version chain ──────────────────────────────────────────────────────────
  previousCanonicalId?: string;  // Previous year's canonical
  nextCanonicalId?:     string;  // Next year's canonical (set when superseded)

  // ── Status ────────────────────────────────────────────────────────────────
  status:            CanonicalStatus;

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdAt:         string;
  updatedAt:         string;
}

// ── Matching result ───────────────────────────────────────────────────────────

export interface CanonicalMatch {
  canonical:   CanonicalDocument;
  confidence:  number;          // 0-100
  matchReason: string;          // Nepali explanation shown to founder
  signals:     string[];        // which signals matched
}

// ── Promotion input ───────────────────────────────────────────────────────────

/** Minimum fields needed to create a canonical from an existing document */
export interface CanonicalPromotionInput {
  ownerId:          string;
  canonicalTitle:   string;
  institutionId:    string;
  govFolder:        string;
  lifecycleType:    string;
  year?:            number;
  primarySourceUrl: string;
  constitutionalParts: number[];
  tags:             string[];
  updateFrequency:  string;
  titleFingerprint: string;
  instanceId:       string;     // the vault_intelligence_docs doc ID
  fileName:         string;
}

// ── Normalized institution IDs ─────────────────────────────────────────────────
// Stable shorthand IDs for known Nepal government institutions.

export const INSTITUTION_ID_MAP: Record<string, string> = {
  // govFolder → institutionId
  "nhrc":                  "nhrc",
  "ciaa":                  "ciaa",
  "mof":                   "mof",
  "nrb":                   "nrb",
  "moe":                   "moe",
  "psc":                   "psc",
  "election-commission":   "election",
  "oag":                   "oag",
  "ncw":                   "ncw",
  "judiciary":             "judiciary",
  "constitution":          "nepal-gov",
  "budget-economy":        "mof",
  "policy-planning":       "npc",
  "parliament":            "parliament",
  "local-governance":      "local-gov",
  "citizen-intelligence":  "citizen",
  "media-signals":         "media",
  "other":                 "unknown",
};

export const SITE_TO_INSTITUTION_ID: Record<string, string> = {
  "nhrcnepal.org":       "nhrc",
  "ciaa.gov.np":         "ciaa",
  "mof.gov.np":          "mof",
  "nrb.org.np":          "nrb",
  "moest.gov.np":        "moe",
  "psc.gov.np":          "psc",
  "election.gov.np":     "election",
  "oag.gov.np":          "oag",
  "ncwnepal.gov.np":     "ncw",
  "supremecourt.gov.np": "judiciary",
};

// Update frequency defaults per lifecycle type
export const LIFECYCLE_UPDATE_FREQUENCY: Record<string, string> = {
  "perpetual":       "rare",
  "amendment_based": "rare",
  "annual_report":   "yearly",
  "quarterly":       "quarterly",
  "circular":        "monthly",
  "news":            "daily",
};
