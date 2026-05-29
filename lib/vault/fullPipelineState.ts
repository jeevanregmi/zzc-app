/**
 * Full Document Pipeline State Engine
 *
 * Single source of truth for "what has happened to this document?"
 *
 * Reads ONLY from Firestore-sourced counts passed in as arguments.
 * Pure function — no side effects, no Firestore reads inside.
 *
 * Covers every pipeline:
 *   Upload → AI Analysis → Admin Approval → Intelligence Extract
 *   → Atomic Extract → Economy Extract → Classification → Public Ready
 *
 * Returns a founder-readable sentence and next-step instruction.
 * No technical terms in the output — only plain Nepali.
 */

// ── Input shape ───────────────────────────────────────────────────────────────

export interface FullPipelineInput {
  // From vault_intelligence_docs
  id:                   string;
  title?:               string;
  fileName?:            string;
  processingStatus?:    string;   // "ready" | "processing_ai" | "ai_ready" | "ai_paused" | "error"
  adminApprovalStatus?: string;   // "pending_review" | "approved" | "needs_revision"
  aiSummary?:           string;
  downloadUrl?:         string;
  sourceUrl?:           string;
  originalSourceUrl?:   string;
  extractionTier?:      string;   // "atomic" when atomic is done
  atomicCompleted?:     boolean;  // explicit flag if set
  govFolder?:           string;
  uploadedAt?:          string;
  tags?:                string[];

  // From Firestore collection counts (passed in — never computed here)
  intelCount:           number;   // janta_intelligence records for this doc
  atomicCount:          number;   // atomic_extraction_logs completed records OR count from logs
  economyCount:         number;   // economy_atoms records for this doc
  classificationCount:  number;   // classification_suggestions for this doc
  classificationApprovedCount: number; // approved classification_suggestions for this doc
}

// ── Output shape ──────────────────────────────────────────────────────────────

export type PipelineHealth =
  | "healthy"      // Pipeline complete, high quality, public-ready
  | "in_progress"  // Currently being processed — no action needed
  | "needs_action" // Founder must do something specific
  | "stuck"        // Error state, needs investigation
  | "suspect";     // Looks like test/incomplete data

export interface FullPipelineState {
  docId:    string;
  title:    string;

  // What happened — boolean evidence from Firestore
  uploaded:                boolean;
  aiAnalyzed:              boolean;
  adminApproved:           boolean;
  intelExtracted:          boolean;
  atomicExtracted:         boolean;
  economyExtracted:        boolean;
  classificationScanned:   boolean;
  classificationApproved:  boolean;

  // Counts
  intelCount:              number;
  atomicCount:             number;
  economyCount:            number;
  classificationCount:     number;

  // Founder-readable status (main sentence)
  statusNp:                string;

  // What to do next
  nextActionNp:            string;
  nextActionHref:          string;

  // Overall health classification
  health:                  PipelineHealth;
  healthLabelNp:           string;

  // Cleanup suggestion
  cleanupSuggestion:       "keep" | "review" | "archive" | "delete";
  cleanupReasonNp:         string;
}

// ── Pure classifier ───────────────────────────────────────────────────────────

export function computeFullPipelineState(doc: FullPipelineInput): FullPipelineState {
  const title = doc.title ?? doc.fileName ?? doc.id;

  // ── Stage flags ──
  const uploaded              = true;
  const aiAnalyzed            = doc.processingStatus === "ai_ready" || !!doc.aiSummary;
  const aiProcessing          = doc.processingStatus === "processing_ai";
  const aiPaused              = doc.processingStatus === "ai_paused";
  const aiError               = doc.processingStatus === "error";
  const adminApproved         = doc.adminApprovalStatus === "approved";
  const adminNeedsRevision    = doc.adminApprovalStatus === "needs_revision";
  const pendingReview         = aiAnalyzed && (!doc.adminApprovalStatus || doc.adminApprovalStatus === "pending_review");
  const intelExtracted        = doc.intelCount > 0;
  const atomicExtracted       = doc.atomicCount > 0 || doc.extractionTier === "atomic" || !!doc.atomicCompleted;
  const economyExtracted      = doc.economyCount > 0;
  const classificationScanned = doc.classificationCount > 0;
  const classificationApproved= doc.classificationApprovedCount > 0;

  const hasSourceEvidence     = !!(doc.originalSourceUrl || doc.sourceUrl);
  const hasDownload           = !!doc.downloadUrl;

  // ── Health ──
  let health: PipelineHealth;
  let healthLabelNp: string;

  if (aiError || (!aiAnalyzed && aiPaused)) {
    health = "stuck";
    healthLabelNp = "Error — अड्किएको";
  } else if (aiProcessing) {
    health = "in_progress";
    healthLabelNp = "AI Analysis चल्दैछ";
  } else if (!doc.downloadUrl && !doc.sourceUrl) {
    health = "suspect";
    healthLabelNp = "Source नभेटिएको";
  } else if (adminNeedsRevision) {
    health = "needs_action";
    healthLabelNp = "Revision चाहिन्छ";
  } else if (adminApproved && intelExtracted && atomicExtracted) {
    health = "healthy";
    healthLabelNp = "Pipeline पूरा";
  } else if (!aiAnalyzed) {
    health = "needs_action";
    healthLabelNp = "AI Analysis बाँकी";
  } else if (pendingReview) {
    health = "needs_action";
    healthLabelNp = "Review बाँकी";
  } else if (aiAnalyzed && !adminApproved) {
    health = "needs_action";
    healthLabelNp = "Approve बाँकी";
  } else if (adminApproved && !intelExtracted) {
    health = "needs_action";
    healthLabelNp = "Extract बाँकी";
  } else {
    health = "in_progress";
    healthLabelNp = "प्रक्रियामा";
  }

  // ── Status sentence ──
  let statusNp: string;

  if (aiError) {
    statusNp = "AI Analysis मा Error — document safe छ, retry गर्नुहोस्";
  } else if (aiPaused && !aiAnalyzed) {
    statusNp = "AI रोकियो (billing limit) — document safe छ, API key confirm गर्नुहोस्";
  } else if (aiProcessing) {
    statusNp = "AI Analysis चल्दैछ — केही मिनेट पर्खनुहोस्";
  } else if (!aiAnalyzed) {
    statusNp = "Upload भयो — AI Analysis बाँकी छ";
  } else if (pendingReview) {
    statusNp = "AI Analysis भयो — Admin Review बाँकी";
  } else if (adminNeedsRevision) {
    statusNp = "Review भयो — Revision आवश्यक छ";
  } else if (!adminApproved) {
    statusNp = "Review भयो — Approval बाँकी";
  } else if (!intelExtracted) {
    statusNp = "Approved — Intelligence Extract बाँकी";
  } else if (!atomicExtracted) {
    statusNp = `Intelligence निकालियो (${doc.intelCount} records) — Atomic Extract बाँकी`;
  } else if (economyExtracted) {
    statusNp = `Pipeline पूरा — ${doc.atomicCount} atoms · ${doc.economyCount} economy records`;
  } else {
    statusNp = `Atomic Extract भयो (${doc.atomicCount} atoms) — Pipeline पूरा`;
  }

  if (classificationApproved) {
    statusNp += " · Classification ✓";
  } else if (classificationScanned) {
    statusNp += " · Classification pending";
  }

  // ── Next action ──
  let nextActionNp: string;
  let nextActionHref: string;

  if (aiError || (aiPaused && !aiAnalyzed)) {
    nextActionNp  = "System Settings हेर्नुहोस् र Retry गर्नुहोस्";
    nextActionHref = "/vault/system";
  } else if (!aiAnalyzed) {
    nextActionNp  = "Documents खोल्नुस् → AI Analyze button थिच्नुहोस्";
    nextActionHref = `/vault/documents?doc=${doc.id}&action=analyze`;
  } else if (pendingReview || !adminApproved) {
    nextActionNp  = "Admin Vault मा document हेरी Approve गर्नुहोस्";
    nextActionHref = "/vault/admin?tab=documents";
  } else if (!intelExtracted) {
    nextActionNp  = "Documents खोल्नुस् → Intelligence Extract button थिच्नुहोस्";
    nextActionHref = `/vault/documents?doc=${doc.id}&action=extract`;
  } else if (!atomicExtracted) {
    nextActionNp  = "Documents खोल्नुस् → Atomic Extract queue बाट run गर्नुहोस्";
    nextActionHref = "/vault/documents";
  } else if (!classificationScanned) {
    nextActionNp  = "Knowledge Queue मा Scan गर्नुहोस्";
    nextActionHref = "/vault/knowledge";
  } else if (!classificationApproved) {
    nextActionNp  = "Knowledge Queue मा Classification approve गर्नुहोस्";
    nextActionHref = "/vault/knowledge";
  } else {
    nextActionNp  = "Pipeline पूरा — नयाँ document upload गर्न सकिन्छ";
    nextActionHref = "/vault/documents";
  }

  // ── Cleanup suggestion ──
  let cleanupSuggestion: FullPipelineState["cleanupSuggestion"];
  let cleanupReasonNp: string;

  // DELETE: no source + no content at all + looks like test
  const looksLikeTest = /test|demo|sample|tmp|temp|untitled|unknown/i.test(title);
  const noContent = !aiAnalyzed && doc.intelCount === 0 && doc.atomicCount === 0;

  if (noContent && looksLikeTest && !hasDownload) {
    cleanupSuggestion = "delete";
    cleanupReasonNp   = "Test data जस्तो देखिन्छ — source नभेटिएको, content खाली";
  } else if (aiError && noContent && !hasSourceEvidence) {
    cleanupSuggestion = "delete";
    cleanupReasonNp   = "Error state — source नभेटिएको, content खाली — delete सुझाव";
  } else if (!aiAnalyzed && !hasSourceEvidence && noContent) {
    cleanupSuggestion = "archive";
    cleanupReasonNp   = "Source नभेटिएको, analysis भएको छैन — archive गर्न सकिन्छ";
  } else if (adminApproved && intelExtracted) {
    cleanupSuggestion = "keep";
    cleanupReasonNp   = "Approved + Intelligence छ — यो real data हो";
  } else if (atomicExtracted || economyExtracted) {
    cleanupSuggestion = "keep";
    cleanupReasonNp   = "Atoms extracted — real data";
  } else {
    cleanupSuggestion = "review";
    cleanupReasonNp   = "Pipeline incomplete — founder judgment चाहिन्छ";
  }

  return {
    docId: doc.id,
    title,
    uploaded,
    aiAnalyzed,
    adminApproved,
    intelExtracted,
    atomicExtracted,
    economyExtracted,
    classificationScanned,
    classificationApproved,
    intelCount:   doc.intelCount,
    atomicCount:  doc.atomicCount,
    economyCount: doc.economyCount,
    classificationCount: doc.classificationCount,
    statusNp,
    nextActionNp,
    nextActionHref,
    health,
    healthLabelNp,
    cleanupSuggestion,
    cleanupReasonNp,
  };
}
