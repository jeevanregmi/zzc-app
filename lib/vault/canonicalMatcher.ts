/**
 * Canonical Document Matcher
 *
 * Given a candidate document, scores it against all existing canonical_documents
 * to detect if it's a duplicate or new version of an already-known document.
 *
 * Signal hierarchy:
 *   1. contentHash exact match      → 100% (definitive)
 *   2. canonicalKey exact match     → 95%  (same institution + lifecycle + year)
 *   3. institutionId + year match   → 90%  (same org, same year, different lifecycle label)
 *   4. titleFingerprint Jaccard ≥ 0.7 + same institution → 85%
 *   5. primarySourceUrl domain match + lifecycle match   → 80%
 *   6. titleFingerprint Jaccard ≥ 0.5                   → 65%
 *   7. govFolder + lifecycle + ±1 year                   → 60%
 */

import { computeFingerprint, titleSimilarity } from "./identityFingerprint";
import type { CanonicalDocument, CanonicalMatch } from "../types/canonical-identity";

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

function domainsOverlap(a: string, b: string): boolean {
  return !!a && !!b && (a === b || a.endsWith("." + b) || b.endsWith("." + a));
}

export interface MatchableDoc {
  id:                 string;
  title?:             string;
  fileName?:          string;
  govFolder?:         string;
  lifecycleType?:     string;
  docYear?:           number | null;
  originalSourceUrl?: string;
  sourceUrl?:         string;
  institutionName?:   string;
  sourceAuthority?:   string;
  contentHash?:       string;
}

/**
 * Score a candidate doc against all known canonicals.
 * Returns matches sorted by confidence desc, filtered to confidence ≥ minConfidence.
 */
export function matchDocToCanonicals(
  doc:           MatchableDoc,
  canonicals:    CanonicalDocument[],
  minConfidence: number = 60,
): CanonicalMatch[] {
  if (canonicals.length === 0) return [];

  const fp = computeFingerprint(doc);
  const results: CanonicalMatch[] = [];

  for (const canonical of canonicals) {
    let confidence = 0;
    const signals: string[] = [];
    let matchReason = "";

    // 1. Content hash exact match — definitive
    if (doc.contentHash && canonical.contentHash && doc.contentHash === canonical.contentHash) {
      confidence = 100;
      signals.push("content hash exact match");
      matchReason = "Content fingerprint सँग exact match — यो उही document हो";
    }

    // 2. Canonical key exact match
    else if (fp.canonicalKey && canonical.canonicalKey && fp.canonicalKey === canonical.canonicalKey) {
      confidence = 95;
      signals.push(`canonicalKey: ${canonical.canonicalKey}`);
      matchReason = `Institution + lifecycle + year पूर्ण match: ${canonical.canonicalKey}`;
    }

    else {
      // Score multiple signals additively
      let raw = 0;

      // Institution match
      const sameInstitution = fp.institutionId !== "unknown"
        && fp.institutionId === canonical.institutionId;
      if (sameInstitution) { raw += 30; signals.push(`institution: ${fp.institutionId}`); }

      // Year match (exact, or within ±1 for version detection)
      if (fp.year && canonical.year) {
        if (fp.year === canonical.year) {
          raw += 25;
          signals.push(`year: ${fp.year}`);
        } else if (Math.abs(fp.year - canonical.year) === 1) {
          raw += 10;
          signals.push(`year: ±1 (${fp.year} vs ${canonical.year})`);
        }
      }

      // Lifecycle match
      if (doc.lifecycleType && doc.lifecycleType === canonical.lifecycleType) {
        raw += 15;
        signals.push(`lifecycle: ${canonical.lifecycleType}`);
      }

      // Title fingerprint similarity
      const titSim = titleSimilarity(fp.titleFp, canonical.titleFingerprint);
      if (titSim >= 0.7) { raw += 25; signals.push(`title similarity: ${Math.round(titSim * 100)}%`); }
      else if (titSim >= 0.5) { raw += 15; signals.push(`title similarity: ${Math.round(titSim * 100)}%`); }
      else if (titSim >= 0.3) { raw += 5;  signals.push(`title similarity: ${Math.round(titSim * 100)}%`); }

      // Source URL domain match
      const docDomain = domainOf(doc.originalSourceUrl ?? doc.sourceUrl ?? "");
      const canDomain = domainOf(canonical.primarySourceUrl);
      const aliasMatch = canonical.knownAliasUrls.some(u => domainsOverlap(domainOf(u), docDomain));
      if (docDomain && (domainsOverlap(docDomain, canDomain) || aliasMatch)) {
        raw += 10;
        signals.push(`source domain: ${docDomain}`);
      }

      // govFolder match (already implied by institution but adds signal)
      if (doc.govFolder && doc.govFolder === canonical.govFolder) {
        raw += 5;
      }

      // Normalize to 0-100 (raw max is about 110 — clamp to 95 for non-exact)
      confidence = Math.min(95, Math.round((raw / 110) * 100));

      if (confidence > 0 && signals.length > 0) {
        const topSignal = sameInstitution
          ? `Institution "${fp.institutionId}" + ${signals.slice(1, 3).join(" + ")}`
          : signals.slice(0, 3).join(" + ");
        matchReason = `${topSignal} — "${canonical.canonicalTitle.slice(0, 50)}" जस्तो देखिन्छ`;
      }
    }

    if (confidence >= minConfidence && signals.length > 0) {
      results.push({ canonical, confidence, matchReason, signals });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Confidence label for canonical matching.
 *   ≥ 90 → "यो उही document हो"     (definitive duplicate)
 *   ≥ 70 → "सम्भवतः उही document"   (high probability)
 *   ≥ 50 → "मिल्दो document"         (likely related)
 *   <  50 → "कमजोर match"             (weak)
 */
export function canonicalConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return "यो उही document हो";
  if (confidence >= 70) return "सम्भवतः उही document";
  if (confidence >= 50) return "मिल्दो document";
  return "कमजोर match";
}
