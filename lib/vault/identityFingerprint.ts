/**
 * Document Identity Fingerprinting
 *
 * Pure functions — no Firestore, no side effects.
 * Used to generate stable, comparable fingerprints from document metadata.
 *
 * Two fingerprint types:
 *   canonicalKey     — composite dedup key for fast exact lookup
 *   titleFingerprint — normalized word set for fuzzy similarity matching
 */

import {
  INSTITUTION_ID_MAP,
  SITE_TO_INSTITUTION_ID,
} from "../types/canonical-identity";

// ── Stop words (not useful for identity) ─────────────────────────────────────

const TITLE_STOPWORDS = new Set([
  // English
  "the", "and", "for", "with", "from", "this", "that",
  "annual", "report", "of", "nepal", "government", "national",
  // Nepali
  "को", "मा", "र", "छ", "छन्", "गर्ने", "भएको", "नेपाल",
  "सरकारको", "सरकार",
]);

// ── Title fingerprint ─────────────────────────────────────────────────────────

/**
 * Normalize a document title into a sorted word set string.
 * Two titles with the same significant words → identical fingerprint.
 */
export function titleFingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\sऀ-ॿ]/g, " ")   // keep Devanagari + Latin word chars
    .split(/\s+/)
    .filter(w => w.length > 2 && !TITLE_STOPWORDS.has(w))
    .sort()
    .join("_");
}

/**
 * Jaccard similarity between two title fingerprints (0–1).
 * Split fingerprint strings back into word sets and compute intersection/union.
 */
export function titleSimilarity(fp1: string, fp2: string): number {
  if (!fp1 || !fp2) return 0;
  const a = new Set(fp1.split("_").filter(Boolean));
  const b = new Set(fp2.split("_").filter(Boolean));
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  a.forEach(w => { if (b.has(w)) intersection++; });
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

// ── Canonical key ─────────────────────────────────────────────────────────────

/**
 * Composite dedup key: "{institutionId}_{lifecycleType}_{year?}"
 *
 * For annual docs: "nhrc_annual_report_2081"
 * For perpetual:   "nepal-gov_perpetual"
 * For circulars with no year: falls back to title hash
 */
export function canonicalKey(
  institutionId: string,
  lifecycleType: string,
  year?: number,
  titleFp?: string,
): string {
  const parts = [
    institutionId.toLowerCase().replace(/[^a-z0-9-]/g, "_"),
    lifecycleType.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
  ];
  if (year && year > 0) {
    parts.push(String(year));
  } else if (titleFp && titleFp.length > 0) {
    // Use first 12 chars of titleFp as discriminator for docs without year
    parts.push(titleFp.slice(0, 12));
  }
  return parts.join("_");
}

// ── Institution ID normalization ──────────────────────────────────────────────

/**
 * Resolve an institutionId from whichever identity fields are available.
 * Priority: govFolder > source URL domain > institution name text search
 */
export function resolveInstitutionId(
  govFolder?: string,
  sourceUrl?: string,
  institutionName?: string,
): string {
  if (govFolder) {
    const fromFolder = INSTITUTION_ID_MAP[govFolder];
    if (fromFolder) return fromFolder;
  }

  if (sourceUrl) {
    try {
      const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
      const fromSite = SITE_TO_INSTITUTION_ID[host];
      if (fromSite) return fromSite;
      // Use the second-level domain as fallback
      const parts = host.split(".");
      if (parts.length >= 2) return parts[parts.length - 2];
    } catch { /* invalid URL */ }
  }

  if (institutionName) {
    const name = institutionName.toLowerCase();
    if (name.includes("nhrc") || name.includes("human rights commission")) return "nhrc";
    if (name.includes("ciaa") || name.includes("अख्तियार")) return "ciaa";
    if (name.includes("rastra bank") || name.includes("राष्ट्र बैंक")) return "nrb";
    if (name.includes("finance") || name.includes("अर्थ मन्त्राल")) return "mof";
    if (name.includes("education") || name.includes("शिक्षा")) return "moe";
    if (name.includes("psc") || name.includes("lok sewa") || name.includes("लोक सेवा")) return "psc";
    if (name.includes("election") || name.includes("निर्वाचन")) return "election";
    if (name.includes("auditor") || name.includes("महालेखापरीक्षक")) return "oag";
    if (name.includes("women") || name.includes("महिला आयोग")) return "ncw";
    if (name.includes("supreme court") || name.includes("सर्वोच्च")) return "judiciary";
  }

  return "unknown";
}

// ── Year extraction ───────────────────────────────────────────────────────────

const YEAR_BS_PATTERN  = /\b(20[5-9]\d)\b/;   // BS years 2050-2099
const YEAR_AD_PATTERN  = /\b(20[12]\d)\b/;    // AD years 2010-2029

/**
 * Extract likely document year (BS fiscal year preferred) from title/filename text.
 * Returns BS year if found, otherwise undefined.
 */
export function extractDocYear(text: string): number | undefined {
  const bsMatch = text.match(YEAR_BS_PATTERN);
  if (bsMatch) return parseInt(bsMatch[1], 10);

  // Convert AD to approximate BS (AD + 56 or 57 for Nepali fiscal year)
  const adMatch = text.match(YEAR_AD_PATTERN);
  if (adMatch) {
    const ad = parseInt(adMatch[1], 10);
    return ad + 56;
  }

  return undefined;
}

// ── Full fingerprint from document fields ─────────────────────────────────────

export interface DocumentFingerprint {
  institutionId:    string;
  year?:            number;
  titleFp:          string;
  canonicalKey:     string;
}

export function computeFingerprint(doc: {
  title?:           string;
  fileName?:        string;
  govFolder?:       string;
  lifecycleType?:   string;
  docYear?:         number | null;
  originalSourceUrl?: string;
  sourceUrl?:       string;
  institutionName?: string;
  sourceAuthority?: string;
}): DocumentFingerprint {
  const instId = resolveInstitutionId(
    doc.govFolder,
    doc.originalSourceUrl ?? doc.sourceUrl,
    doc.institutionName ?? doc.sourceAuthority,
  );

  const titleText = `${doc.title ?? ""} ${doc.fileName ?? ""}`.trim();
  const year = (doc.docYear && doc.docYear > 0)
    ? doc.docYear
    : extractDocYear(titleText);

  const lifecycle = doc.lifecycleType ?? "other";
  const titleFp   = titleFingerprint(titleText);
  const key       = canonicalKey(instId, lifecycle, year, titleFp);

  return { institutionId: instId, year, titleFp, canonicalKey: key };
}
