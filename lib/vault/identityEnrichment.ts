/**
 * Document Identity Enrichment Engine
 *
 * Rule-based (no LLM). Analyzes existing vault documents and suggests
 * missing identity fields using:
 *   - Regex patterns on title/filename/aiSummary (Nepali + English)
 *   - Resolver scoring against known recommendation descriptors
 *   - AI-extracted fields that are already present (detectedTopics, sourceAuthority)
 *
 * Output: per-document suggestions with confidence scores.
 * Founder reviews in the Identity Queue UI and approves one-by-one or in bulk.
 */

import { resolveDocsForRec, type RecDescriptor, type ResolvableDoc } from "./documentResolver";

// ── Types ─────────────────────────────────────────────────────────────────────

export type IdentityField =
  | "govFolder"
  | "lifecycleType"
  | "institutionName"
  | "originalSourceUrl"
  | "constitutionalParts"
  | "tags";

export interface IdentitySuggestion {
  field:      IdentityField;
  current:    unknown;    // existing value (undefined/null/empty means missing)
  suggested:  unknown;    // what we suggest setting it to
  confidence: number;     // 0-100
  reason:     string;     // Nepali explanation shown in UI
}

export interface DocEnrichmentResult {
  doc:         ResolvableDoc;
  missingCount: number;   // how many identity fields are empty/unset
  suggestions: IdentitySuggestion[];  // only suggestions with confidence ≥ MIN_CONFIDENCE
  kitMatch?:   { folder: string; title: string; score: number };
  needsAction: boolean;   // true if any suggestion with confidence ≥ ACTION_THRESHOLD
}

const MIN_CONFIDENCE    = 25;   // minimum to show a suggestion at all
const ACTION_THRESHOLD  = 40;   // minimum to mark doc as "needs action"

// ── Lifecycle detection ───────────────────────────────────────────────────────
// Rule-based patterns on Nepali/English text.

interface LifecycleHit { value: string; confidence: number }

const LIFECYCLE_PATTERNS: Array<{ re: RegExp; value: string; conf: number }> = [
  { re: /वार्षिक\s*प्रतिवेदन|annual\s*report/i,       value: "annual_report",    conf: 85 },
  { re: /मौद्रिक\s*नीति|monetary\s*policy/i,          value: "annual_report",    conf: 80 },
  { re: /बजेट\s*भाषण|budget\s*speech/i,               value: "annual_report",    conf: 80 },
  { re: /लेखापरीक्षण\s*प्रतिवेदन|audit\s*report/i,   value: "annual_report",    conf: 80 },
  { re: /त्रैमासिक|quarterly/i,                        value: "quarterly",        conf: 80 },
  { re: /परिपत्र|circular/i,                           value: "circular",         conf: 75 },
  { re: /संविधान\s*(नेपालको)?|constitution\s*(of\s*nepal)?/i, value: "perpetual", conf: 85 },
  { re: /ऐन[,।\s]|act[,.\s]/i,                         value: "amendment_based",  conf: 65 },
  { re: /राष्ट्रिय\s*नीति|national\s*policy/i,         value: "amendment_based",  conf: 70 },
  { re: /नीति\s*[,।२-]/i,                              value: "amendment_based",  conf: 55 },
  { re: /समाचार|news|press\s*note/i,                   value: "news",             conf: 70 },
];

function detectLifecycle(text: string): LifecycleHit | null {
  for (const { re, value, conf } of LIFECYCLE_PATTERNS) {
    if (re.test(text)) return { value, confidence: conf };
  }
  return null;
}

// ── Missing-field detection ───────────────────────────────────────────────────

function isMissing(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string"  && v.trim() === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function missingFields(doc: ResolvableDoc): IdentityField[] {
  const fields: IdentityField[] = [];
  if (isMissing(doc.govFolder))           fields.push("govFolder");
  if (isMissing(doc.lifecycleType))       fields.push("lifecycleType");
  if (isMissing(doc.institutionName) && isMissing(doc.sourceAuthority)) fields.push("institutionName");
  if (isMissing(doc.originalSourceUrl) && isMissing(doc.sourceUrl))     fields.push("originalSourceUrl");
  if (isMissing(doc.constitutionalParts)) fields.push("constitutionalParts");
  if (isMissing(doc.tags))                fields.push("tags");
  return fields;
}

// ── Institution name from kit match ──────────────────────────────────────────

// siteLabel examples: "nhrcnepal.org" → "NHRC Nepal", "mof.gov.np" → "Ministry of Finance"
const SITE_TO_INSTITUTION: Record<string, string> = {
  "nhrcnepal.org":       "National Human Rights Commission of Nepal",
  "ciaa.gov.np":         "Commission for the Investigation of Abuse of Authority",
  "mof.gov.np":          "Ministry of Finance, Nepal",
  "nrb.org.np":          "Nepal Rastra Bank",
  "moest.gov.np":        "Ministry of Education, Science and Technology",
  "psc.gov.np":          "Public Service Commission of Nepal",
  "election.gov.np":     "Election Commission of Nepal",
  "oag.gov.np":          "Office of the Auditor General",
  "ncwnepal.gov.np":     "National Women Commission of Nepal",
  "supremecourt.gov.np": "Supreme Court of Nepal",
};

function institutionFromSite(siteUrl: string): string | null {
  try {
    const host = new URL(siteUrl).hostname.replace(/^www\./, "");
    return SITE_TO_INSTITUTION[host] ?? null;
  } catch { return null; }
}

// ── Core enrichment for one document ─────────────────────────────────────────

export function getDocEnrichment(
  doc:  ResolvableDoc,
  recs: RecDescriptor[],
): DocEnrichmentResult {
  const missing  = missingFields(doc);
  const textHint = `${doc.title ?? ""} ${doc.fileName ?? ""} ${doc.aiSummary?.slice(0, 300) ?? ""}`;

  // ── Best kit match (resolver) ───────────────────────────────────────────────
  let kitMatch: DocEnrichmentResult["kitMatch"] | undefined;
  if (recs.length > 0) {
    const hits = resolveDocsForRec(
      // dummy rec — we invert: score this ONE doc against ALL recs
      // by calling scoreDocAgainstRec for each rec
      recs[0],     // placeholder; we loop manually below
      [doc],
    );
    void hits; // suppress unused — we call manually
  }

  // Score this doc against every rec and find the best match
  let bestScore = 0;
  let bestRec: RecDescriptor | undefined;
  for (const rec of recs) {
    // Use resolveDocsForRec with single doc
    const [result] = resolveDocsForRec(rec, [doc]);
    if (result && result.totalScore > bestScore) {
      bestScore = result.totalScore;
      bestRec   = rec;
    }
  }
  if (bestRec && bestScore >= MIN_CONFIDENCE) {
    kitMatch = {
      folder: bestRec.folder,
      title:  bestRec.title ?? bestRec.folder,
      score:  bestScore,
    };
  }

  // ── Build suggestions ───────────────────────────────────────────────────────
  const suggestions: IdentitySuggestion[] = [];

  // 1. govFolder — from kit match
  if (missing.includes("govFolder") && kitMatch && kitMatch.score >= MIN_CONFIDENCE) {
    suggestions.push({
      field:      "govFolder",
      current:    doc.govFolder,
      suggested:  kitMatch.folder,
      confidence: Math.min(95, kitMatch.score),
      reason:     `Kit "${kitMatch.title}" सँग ${kitMatch.score}% match — govFolder=${kitMatch.folder}`,
    });
  }

  // 2. lifecycleType — rule-based pattern matching
  if (missing.includes("lifecycleType")) {
    const hit = detectLifecycle(textHint);
    if (hit && hit.confidence >= MIN_CONFIDENCE) {
      suggestions.push({
        field:      "lifecycleType",
        current:    doc.lifecycleType,
        suggested:  hit.value,
        confidence: hit.confidence,
        reason:     `Title/filename pattern → lifecycle: ${hit.value}`,
      });
    }
  }

  // 3. institutionName — from kit match's siteUrl or existing sourceAuthority
  if (missing.includes("institutionName")) {
    // Prefer existing AI-extracted sourceAuthority as a fill-in
    if (!isMissing(doc.sourceAuthority)) {
      suggestions.push({
        field:      "institutionName",
        current:    doc.institutionName,
        suggested:  doc.sourceAuthority,
        confidence: 90,
        reason:     `AI-extracted sourceAuthority बाट copy गर्ने: "${String(doc.sourceAuthority).slice(0, 60)}"`,
      });
    } else if (bestRec && bestScore >= MIN_CONFIDENCE) {
      const inst = institutionFromSite(bestRec.siteUrl);
      if (inst) {
        suggestions.push({
          field:      "institutionName",
          current:    doc.institutionName,
          suggested:  inst,
          confidence: Math.min(80, bestScore),
          reason:     `Kit site "${bestRec.siteUrl}" बाट institution: "${inst}"`,
        });
      }
    }
  }

  // 4. originalSourceUrl — from kit match's siteUrl (only if no URL fields set)
  if (missing.includes("originalSourceUrl") && bestRec && bestScore >= 40) {
    suggestions.push({
      field:      "originalSourceUrl",
      current:    doc.originalSourceUrl ?? doc.sourceUrl,
      suggested:  bestRec.siteUrl,
      confidence: Math.min(70, bestScore),
      reason:     `Kit site URL बाट: "${bestRec.siteUrl}"`,
    });
  }

  // 5. constitutionalParts — from kit match's parts, if doc lacks them
  if (missing.includes("constitutionalParts") && bestRec?.parts && bestRec.parts.length > 0 && bestScore >= 40) {
    suggestions.push({
      field:      "constitutionalParts",
      current:    doc.constitutionalParts,
      suggested:  bestRec.parts,
      confidence: Math.min(75, bestScore),
      reason:     `Kit recommendation का constitutional parts: भाग ${bestRec.parts.join(", ")}`,
    });
  }

  // 6. tags — from kit match's tags, if doc has none
  if (missing.includes("tags") && bestRec?.tags && bestScore >= 40) {
    const tagList = bestRec.tags.split(/[,;]+/).map(t => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      suggestions.push({
        field:      "tags",
        current:    doc.tags,
        suggested:  tagList,
        confidence: Math.min(70, bestScore),
        reason:     `Kit recommendation का tags: ${tagList.slice(0, 4).join(", ")}`,
      });
    }
  }

  // Filter to minimum confidence threshold
  const filtered = suggestions.filter(s => s.confidence >= MIN_CONFIDENCE);

  return {
    doc,
    missingCount: missing.length,
    suggestions:  filtered,
    kitMatch,
    needsAction:  filtered.some(s => s.confidence >= ACTION_THRESHOLD),
  };
}

// ── Queue builder ─────────────────────────────────────────────────────────────

/**
 * Returns enrichment results for docs that need attention:
 * - Has at least one missing identity field
 * - Has at least one suggestion with confidence ≥ ACTION_THRESHOLD
 * Sorted by: most missing fields first, then by highest-confidence suggestion.
 */
export function getIdentityQueue(
  docs:    ResolvableDoc[],
  recs:    RecDescriptor[],
  skipped: Set<string>,
): DocEnrichmentResult[] {
  return docs
    .filter(d => !skipped.has(d.id))
    .map(d => getDocEnrichment(d, recs))
    .filter(r => r.needsAction)
    .sort((a, b) => {
      if (b.missingCount !== a.missingCount) return b.missingCount - a.missingCount;
      const aMax = Math.max(...a.suggestions.map(s => s.confidence), 0);
      const bMax = Math.max(...b.suggestions.map(s => s.confidence), 0);
      return bMax - aMax;
    });
}

// ── Patch payload builder ─────────────────────────────────────────────────────

/**
 * Converts accepted suggestions into a patchDocumentIdentity-compatible payload.
 * Only includes suggestions the founder accepted (by suggestionField list).
 */
export function buildIdentityPatch(
  suggestions: IdentitySuggestion[],
  accepted:    IdentityField[],  // which fields the founder approved
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const s of suggestions) {
    if (accepted.includes(s.field)) {
      patch[s.field] = s.suggested;
    }
  }
  return patch;
}
