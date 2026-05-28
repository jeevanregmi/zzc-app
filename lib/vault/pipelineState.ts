/**
 * Unified document pipeline state engine.
 *
 * All pages that need to know "what stage is this document at?"
 * or "has this QA recommendation been satisfied?" must use these
 * helpers — never inline heuristics.
 *
 * Stage order:
 *   uploaded → analyzed → reviewed → approved → extracted → complete
 *
 * A recommendation is "complete" only when the matched document has
 * BOTH approved AND extracted (intelCount > 0).
 */

// ── Core doc shape ────────────────────────────────────────────────────────────
// Subset of IntelligenceDocument. All Firestore vault_documents reads should
// map to this interface (spread d.data() and include these fields).

export interface PipelineDoc {
  id:                   string;
  title?:               string;
  fileName?:            string;
  processingStatus?:    string;
  adminApprovalStatus?: string;
  aiSummary?:           string;
  govFolder?:           string;
  // URL fields in priority order for domain matching:
  // originalSourceUrl = where the PDF was downloaded from (most reliable)
  // sourceUrl         = URL-ingested doc source
  // downloadUrl       = R2 or current storage URL (least reliable for origin matching)
  originalSourceUrl?:   string;
  sourceUrl?:           string;
  downloadUrl?:         string;
}

// ── Pipeline state ────────────────────────────────────────────────────────────

export type PipelineBlockingStep = "analyze" | "review" | "approve" | "extract";

export interface DocPipelineState {
  docId:         string;
  // Stage evidence flags — derived from real Firestore field values
  isUploaded:    boolean;
  isAnalyzed:    boolean;   // processingStatus === "ai_ready" || !!aiSummary
  isReviewed:    boolean;   // adminApprovalStatus !== "pending_review" && !!adminApprovalStatus
  isApproved:    boolean;   // adminApprovalStatus === "approved"
  isExtracted:   boolean;   // intelCount > 0 (janta_intelligence records exist)
  isComplete:    boolean;   // approved AND extracted
  // Evidence counts
  intelCount:    number;
  // Blocking info — null when isComplete
  blockingStep:  PipelineBlockingStep | null;
  blockingLabel: string | null;  // Nepali text
}

export function getDocPipelineState(
  doc: PipelineDoc,
  intelCount: number,
): DocPipelineState {
  const isAnalyzed  = doc.processingStatus === "ai_ready" || !!doc.aiSummary;
  const isReviewed  = !!doc.adminApprovalStatus && doc.adminApprovalStatus !== "pending_review";
  const isApproved  = doc.adminApprovalStatus === "approved";
  const isExtracted = intelCount > 0;
  const isComplete  = isApproved && isExtracted;

  let blockingStep:  DocPipelineState["blockingStep"]  = null;
  let blockingLabel: string | null = null;

  if (!isAnalyzed)       { blockingStep = "analyze"; blockingLabel = "AI Analysis बाँकी"; }
  else if (!isReviewed)  { blockingStep = "review";  blockingLabel = "Admin Review बाँकी"; }
  else if (!isApproved)  { blockingStep = "approve"; blockingLabel = "Approval बाँकी"; }
  else if (!isExtracted) { blockingStep = "extract"; blockingLabel = "Intelligence Extract बाँकी"; }

  return {
    docId:        doc.id,
    isUploaded:   true,
    isAnalyzed,
    isReviewed,
    isApproved,
    isExtracted,
    isComplete,
    intelCount,
    blockingStep,
    blockingLabel,
  };
}

// ── Recommendation matching ───────────────────────────────────────────────────

export interface QARec {
  folder:  string;  // govFolder to match against
  siteUrl: string;  // official site URL (domain fallback)
}

export type RecStatus = "complete" | "in_progress" | "missing";

export interface RecMatchResult {
  status:           RecStatus;
  label:            string;     // Nepali status label
  reasons:          string[];   // specific evidence items
  matchedDocId?:    string;
  matchedDocTitle?: string;
  state?:           DocPipelineState;
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return ""; }
}

function domainsOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  // e.g. "nhrcnepal.org" matches "nhrcnepal.org" or a subdomain
  return a === b || a.endsWith("." + b) || b.endsWith("." + a);
}

/**
 * Find the vault document that best satisfies a recommendation.
 *
 * Tier 1 — govFolder exact match (set at upload time via kit link)
 * Tier 2 — originalSourceUrl domain match (where PDF was downloaded from)
 * Tier 3 — sourceUrl domain match (URL-ingested docs)
 * Tier 4 — downloadUrl domain match (last resort; fails for R2-hosted docs)
 */
export function matchDocToRec(rec: QARec, docs: PipelineDoc[]): PipelineDoc | undefined {
  // Tier 1: govFolder — most authoritative
  const byFolder = docs.find(d => !!d.govFolder && d.govFolder === rec.folder);
  if (byFolder) return byFolder;

  // Tier 2-4: domain matching across all stored URL fields
  const recHost = domainOf(rec.siteUrl);
  if (!recHost) return undefined;

  return docs.find(d => {
    const candidates = [
      d.originalSourceUrl,
      d.sourceUrl,
      d.downloadUrl,
    ].filter((u): u is string => !!u);

    return candidates.some(url => domainsOverlap(domainOf(url), recHost));
  });
}

/**
 * Check whether a recommendation is satisfied by any vault document,
 * and return the full status with reasons.
 */
export function getRecMatchResult(
  rec: QARec,
  docs: PipelineDoc[],
  intelByDoc: Record<string, number>,
): RecMatchResult {
  const matched = matchDocToRec(rec, docs);

  if (!matched) {
    return {
      status:  "missing",
      label:   "Upload गरिएको छैन",
      reasons: ["कुनै document match भएन (govFolder वा URL domain मिलेन)"],
    };
  }

  const intelCount = intelByDoc[matched.id] ?? 0;
  const state      = getDocPipelineState(matched, intelCount);
  const title      = matched.title ?? matched.fileName ?? matched.id;

  if (state.isComplete) {
    return {
      status:          "complete",
      label:           "पूरा भयो",
      reasons:         [
        `✓ ${intelCount} intelligence records`,
        matched.govFolder ? `✓ govFolder: ${matched.govFolder}` : "✓ URL domain match",
      ],
      matchedDocId:    matched.id,
      matchedDocTitle: title,
      state,
    };
  }

  // In progress — document matched but pipeline not complete
  const reasons = [
    state.isAnalyzed  ? "✓ AI Analyzed"       : "○ Analysis बाँकी",
    state.isReviewed  ? "✓ Reviewed"           : "○ Review बाँकी",
    state.isApproved  ? "✓ Approved"           : "○ Approval बाँकी",
    state.isExtracted ? `✓ ${intelCount} records` : "○ Intelligence Extract बाँकी",
  ];

  return {
    status:          "in_progress",
    label:           state.blockingLabel ?? "प्रक्रियामा",
    reasons,
    matchedDocId:    matched.id,
    matchedDocTitle: title,
    state,
  };
}
