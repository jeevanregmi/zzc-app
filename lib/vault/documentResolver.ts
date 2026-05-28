/**
 * Document Identity Resolver
 *
 * Scores vault documents against QA recommendations using multiple signals.
 * Used to find existing documents that satisfy a recommendation without
 * requiring re-upload.
 *
 * Signal hierarchy (by weight):
 *   1.  govFolder exact match        — set by founder (highest authority)
 *   2.  originalSourceUrl domain     — where PDF was downloaded from
 *   3.  sourceUrl domain             — URL-ingested doc source
 *   4.  institution name             — sourceAuthority / institutionName
 *   5.  downloadUrl domain           — R2 docs won't match official sites (low weight)
 *   6.  title keyword overlap        — significant Nepali/English words
 *   7.  filename keyword overlap     — file basename keywords
 *   8.  tags overlap                 — tag intersection
 *   9.  constitutional parts overlap — part number intersection
 *   10. lifecycle type match         — annual_report / amendment_based / etc.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

/** The recommendation descriptor — what we're trying to match a doc to */
export interface RecDescriptor {
  folder:     string;    // govFolder value to set/match
  siteUrl:    string;    // official site URL (for domain matching)
  title?:     string;    // expected Nepali/English title (for keyword matching)
  tags?:      string;    // comma-separated tag hints
  parts?:     number[];  // expected constitutional parts
  lifecycle?: string;    // expected lifecycle type
}

/** Minimal doc shape the resolver operates on */
export interface ResolvableDoc {
  id:                   string;
  title?:               string;
  fileName?:            string;
  govFolder?:           string;
  originalSourceUrl?:   string;
  sourceUrl?:           string;
  downloadUrl?:         string;
  institutionName?:     string;
  sourceAuthority?:     string;  // alias used in older docs
  tags?:                string[] | string;
  aiSummary?:           string;
  constitutionalParts?: number[];
  lifecycleType?:       string;
  processingStatus?:    string;
  adminApprovalStatus?: string;
}

export interface ResolverSignal {
  type:    string;
  score:   number;   // contribution to raw score
  matched: boolean;
  label:   string;   // Nepali/English explanation shown in UI
}

export interface DocMatch {
  doc:        ResolvableDoc;
  totalScore: number;    // 0-100 normalised
  rawScore:   number;    // pre-normalisation sum
  signals:    ResolverSignal[];  // only matched signals
  topReason:  string;    // label of the highest-scoring matched signal
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

function domainsOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a === b || a.endsWith("." + b) || b.endsWith("." + a);
}

// Devanagari-aware keyword extractor: keeps words > 2 chars, strips stopwords
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "this", "that", "have", "its",
  "nepal", "government", "national", "report", "annual", "office",
  "ministry", "commission", "committee", "department",
  "को", "को", "मा", "र", "छ", "छन्", "गर्ने", "भएको",
]);

function keywords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\sऀ-ॿ]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w))
  );
}

function keywordOverlapRatio(a: string, b: string): number {
  const aWords = keywords(a);
  const bWords = keywords(b);
  if (aWords.size === 0 || bWords.size === 0) return 0;
  let hits = 0;
  aWords.forEach(w => { if (bWords.has(w)) hits++; });
  const union = new Set([...aWords, ...bWords]).size;
  return hits / union;
}

function partsOverlapRatio(recParts: number[], docParts: number[]): number {
  if (recParts.length === 0 || docParts.length === 0) return 0;
  const docSet = new Set(docParts);
  const hits   = recParts.filter(p => docSet.has(p)).length;
  return hits / Math.max(recParts.length, 1);
}

function normaliseTags(tags: string[] | string | undefined): string[] {
  if (!tags) return [];
  const list = Array.isArray(tags) ? tags : String(tags).split(/[,;]+/);
  return list.map(t => t.trim().toLowerCase()).filter(Boolean);
}

// Sum of all signal max scores (for normalisation)
const RAW_MAX = 50 + 30 + 25 + 20 + 10 + 15 + 10 + 10 + 10 + 5;  // = 185

// ── Core scorer ───────────────────────────────────────────────────────────────

export function scoreDocAgainstRec(doc: ResolvableDoc, rec: RecDescriptor): DocMatch {
  const all: ResolverSignal[] = [];
  let raw = 0;

  function signal(type: string, matched: boolean, contribution: number, label: string) {
    const score = matched ? contribution : 0;
    raw += score;
    all.push({ type, score, matched, label });
  }

  // 1. govFolder exact match (weight 50)
  signal(
    "govFolder",
    !!doc.govFolder && doc.govFolder === rec.folder,
    50,
    `govFolder: ${rec.folder}`,
  );

  // 2-4. URL domain matching
  const recHost = domainOf(rec.siteUrl);
  if (recHost) {
    signal("originalSourceUrl", !!doc.originalSourceUrl && domainsOverlap(domainOf(doc.originalSourceUrl), recHost), 30, `originalSourceUrl: ${recHost}`);
    signal("sourceUrl",         !!doc.sourceUrl         && domainsOverlap(domainOf(doc.sourceUrl),         recHost), 25, `sourceUrl: ${recHost}`);
    signal("downloadUrl",       !!doc.downloadUrl        && domainsOverlap(domainOf(doc.downloadUrl),       recHost), 10, `downloadUrl: ${recHost}`);
  }

  // 5. Institution name contains folder/domain hints (weight 20)
  {
    const inst     = ((doc.institutionName ?? "") + " " + (doc.sourceAuthority ?? "")).toLowerCase();
    const hint     = rec.folder.replace(/-/g, " ");
    const siteWord = recHost.split(".")[0] ?? "";
    const matched  = inst.length > 2 && (
      inst.includes(hint) ||
      inst.includes(siteWord) ||
      hint.split(/\s+/).some(w => w.length > 2 && inst.includes(w))
    );
    signal("institutionName", matched, 20, `institution: ${inst.slice(0, 40)}`);
  }

  // 6. Title keyword overlap (weight 15)
  if (rec.title) {
    const docText  = `${doc.title ?? ""} ${doc.fileName ?? ""}`.trim();
    const overlap  = docText ? keywordOverlapRatio(rec.title, docText) : 0;
    const score    = Math.round(overlap * 15);
    raw += score;
    all.push({ type: "titleKeywords", score, matched: score > 0, label: `title match (${Math.round(overlap * 100)}%)` });
  }

  // 7. Filename keyword overlap (weight 10)
  if (doc.fileName && rec.title) {
    const overlap = keywordOverlapRatio(rec.title, doc.fileName);
    const score   = Math.round(overlap * 10);
    raw += score;
    all.push({ type: "filenameKeywords", score, matched: score > 0, label: `filename match (${Math.round(overlap * 100)}%)` });
  }

  // 8. Tags overlap (weight 10)
  {
    const docTags = normaliseTags(doc.tags);
    const recTags = normaliseTags(rec.tags);
    if (docTags.length > 0 && recTags.length > 0) {
      const hits  = recTags.filter(t => docTags.some(d => d.includes(t) || t.includes(d))).length;
      const score = Math.min(10, Math.round((hits / recTags.length) * 10));
      raw += score;
      all.push({ type: "tags", score, matched: score > 0, label: `${hits} tags matched` });
    }
  }

  // 9. Constitutional parts overlap (weight 10)
  if ((rec.parts ?? []).length > 0 && (doc.constitutionalParts ?? []).length > 0) {
    const overlap = partsOverlapRatio(rec.parts!, doc.constitutionalParts!);
    const score   = Math.round(overlap * 10);
    raw += score;
    all.push({ type: "constitutionalParts", score, matched: score > 0, label: `constitution parts` });
  }

  // 10. Lifecycle type match (weight 5)
  if (rec.lifecycle && doc.lifecycleType) {
    signal("lifecycleType", doc.lifecycleType === rec.lifecycle, 5, `lifecycle: ${rec.lifecycle}`);
  }

  // Normalise
  const totalScore  = Math.min(100, Math.round((raw / RAW_MAX) * 100));
  const matched     = all.filter(s => s.matched && s.label);
  const best        = matched.sort((a, b) => b.score - a.score)[0];

  return {
    doc,
    totalScore,
    rawScore:  raw,
    signals:   matched,
    topReason: best?.label ?? "कुनै signal match भएन",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Score all docs against a recommendation, sorted by score desc.
 * Returns ALL scored docs (caller filters by threshold).
 */
export function resolveDocsForRec(
  rec:  RecDescriptor,
  docs: ResolvableDoc[],
): DocMatch[] {
  return docs
    .map(doc => scoreDocAgainstRec(doc, rec))
    .filter(m => m.totalScore > 0)
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Confidence label for a score.
 *   ≥ 60 → high (likely the same document)
 *   ≥ 30 → medium (probably related)
 *   < 30 → low (weak signal only)
 */
export function confidenceLabel(score: number): "high" | "medium" | "low" {
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  return "low";
}
