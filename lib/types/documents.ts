export type DocFileType = "pdf" | "docx" | "md" | "txt" | "image" | "other";

/** Official sources = NRB, Parliament, MoF, EPF, SSF, SEBON, IRD */
export type SourceType = "official" | "unofficial" | "research" | "unknown";

export type DocCategory =
  | "research"
  | "strategy"
  | "legal"
  | "finance"
  | "content"
  | "intelligence"
  | "other";

// Civic governance library folder — determines where a document lives in the
// National Civic Intelligence Library. Every uploaded document should have one.
export type GovFolder =
  | "constitution"          // संविधान — Constitution text, amendments, explanations
  | "budget-economy"        // बजेट र अर्थव्यवस्था — Annual budgets, monetary policy, revenue
  | "policy-planning"       // नीति र योजना — Periodic plans, ministry strategies, sector frameworks
  | "parliament"            // संसद — Bills, committee reports, parliamentary proceedings
  | "judiciary"             // न्यायपालिका — Court decisions, legal interpretations, AG reports
  | "local-governance"      // स्थानीय शासन — Municipality budgets, ward reports, local plans
  | "citizen-intelligence"  // नागरिक सूचना — Complaints, surveys, civic feedback, field reports
  | "media-signals"         // मिडिया र संकेत — News, URL signals, RSS intelligence
  | "other";                // अन्य — Uncategorized

/**
 * How a document's content changes over time.
 *   perpetual        — Constitution, Acts — valid indefinitely until replaced/amended
 *   amendment_based  — Acts/rules that get periodic amendments but no full replacement
 *   annual_report    — NHRC, PSC, Supreme Court — new version every fiscal year
 *   quarterly        — Quarterly economic/monetary reports
 *   circular         — Regulatory circulars — single notice, never "updated"
 *   news             — Media/signal intelligence — ephemeral, not versioned
 */
export type LifecycleType =
  | "perpetual"
  | "amendment_based"
  | "annual_report"
  | "quarterly"
  | "circular"
  | "news";

/** How often a new version is expected. */
export type UpdateFrequency =
  | "rare"        // decades — constitutional amendments
  | "yearly"      // annual reports, budgets
  | "quarterly"   // quarterly monetary/economic reports
  | "monthly"     // monthly circulars, rate updates
  | "weekly"      // government gazette notices
  | "daily";      // live signals, news

/** How ZZC stores multiple versions of the same source document. */
export type VersioningStrategy =
  | "versioned"     // keep every version (recommended for annual_report / amendment_based)
  | "replace"       // overwrite the record — only for circular/news that are purely ephemeral
  | "append_only";  // never remove, only add (perpetual legal documents)

/** Who can monitor when a new version appears. */
export type MonitoringMode =
  | "auto"       // system polls source URL for changes
  | "manual"     // founder uploads manually when aware of new version
  | "archived"   // document lifecycle ended — no further monitoring needed
  | "inactive";  // monitoring paused

/**
 * How ZZC handles archiving old versions.
 *   keep_all    — legal/constitutional: every version must be retained forever
 *   keep_latest — circulars/news: only keep the most recent copy
 *   rolling_N   — quarterly reports: keep last N versions (configured separately)
 */
export type ArchivePolicy = "keep_all" | "keep_latest" | "rolling_N";

/** Document importance in civic intelligence priority queue. */
export type ImportanceLevel = "critical" | "high" | "medium" | "low";

export const GOV_FOLDER_META: Record<GovFolder, { np: string; icon: string; desc: string }> = {
  "constitution":         { np: "संविधान",             icon: "📜", desc: "Constitution text, amendments, constitutional explanations" },
  "budget-economy":       { np: "बजेट र अर्थव्यवस्था", icon: "💰", desc: "Annual budget, monetary policy, economic survey, revenue reports" },
  "policy-planning":      { np: "नीति र योजना",        icon: "📋", desc: "Policy & Programs, Periodic Plans, ministry strategies" },
  "parliament":           { np: "संसद",                icon: "🏛", desc: "Bills, committee reports, parliamentary discussions" },
  "judiciary":            { np: "न्यायपालिका",          icon: "⚖", desc: "Supreme Court decisions, constitutional bench, legal interpretations" },
  "local-governance":     { np: "स्थानीय शासन",        icon: "🏘", desc: "Municipality budgets, ward reports, local plans" },
  "citizen-intelligence": { np: "नागरिक सूचना",        icon: "👥", desc: "Complaints, surveys, civic feedback, field reports" },
  "media-signals":        { np: "मिडिया र संकेत",      icon: "📡", desc: "News, URL signals, RSS intelligence" },
  "other":                { np: "अन्य",                icon: "📁", desc: "Other civic documents not in the above categories" },
};

/**
 * Upload is ALWAYS separate from AI analysis. A document in any status below
 * is guaranteed to be safely stored in R2 — status only reflects AI pipeline state.
 *
 *   ready          — uploaded, AI not yet run (initial state after upload)
 *   processing_ai  — AI analysis in progress
 *   ai_ready       — AI analysis complete, pending admin review
 *   ai_paused      — AI unavailable (billing/quota/no provider); upload is intact; retry later
 *   error          — legacy: AI failed with unknown error (kept for backward compat)
 */
export type ProcessingStatus =
  | "uploading"
  | "ready"
  | "processing_ai"
  | "ai_ready"
  | "ai_paused"
  | "error";

// Separate from ProcessingStatus — tracks admin review of AI output.
// An ai_ready doc must reach "approved" before queue items can be generated.
export type AdminApprovalStatus =
  | "pending_review"   // AI done, awaiting admin review in Admin Vault
  | "approved"         // Admin reviewed and approved — queue generation unlocked
  | "needs_revision";  // Admin flagged — AI output needs correction before use

export interface IntelligenceDocument {
  id:               string;
  ownerId:          string;
  title:            string;
  description:      string;
  fileName:         string;
  fileType:         DocFileType;
  mimeType:         string;
  fileSize:         number;
  storagePath:      string;
  downloadUrl:      string;
  folder:           string;
  tags:             string[];
  category:         DocCategory;
  processingStatus: ProcessingStatus;
  // ── AI base fields — populated after processing ───────────────────────────
  aiSummary?:          string;
  aiKeyInsights?:      string[];
  ocrText?:            string;
  translationNe?:      string;
  confidence?:         number;     // 0-1
  sourceCredibility?:  "high" | "medium" | "low" | "unverified";
  // ── Civic intelligence fields — Nepal government/finance specific ──────────
  sourceType?:         SourceType;         // official (NRB/Parliament/MoF) | unofficial | research
  sourceAuthority?:    string;             // "Nepal Rastra Bank" | "Parliament of Nepal" | etc.
  sourceUrl?:          string;             // original URL (for URL-ingested docs)
  affectedSectors?:    string[];           // ["banking", "EPF", "housing", "youth employment"]
  policyChanges?:      string[];           // specific regulatory/policy changes extracted
  financialImplications?: string[];        // NPR amounts, rates, percentages, deadlines
  youthImpact?:        string;             // one paragraph — impact on 18-35 Nepali workers
  ssfEpfCitRelevance?: string;             // specific SSF/EPF/CIT implications
  nepaliExplainer?:    string;             // 2-3 sentences in simple Nepali (सरल भाषामा)
  // ── Flywheel connector — feeds Content Pipeline ────────────────────────────
  detectedTopics?:     string[];           // ["EPF", "housing loan", "interest rate"]
  contentIdeas?:       string[];           // AI-proposed content titles/concepts
  // ── Admin validation gate ─────────────────────────────────────────────────
  adminApprovalStatus?:  AdminApprovalStatus;
  adminApprovalNotes?:   string;
  adminApprovedAt?:      string;
  // ── AI provider tracking ──────────────────────────────────────────────────
  aiProvider?:         string;
  aiRetryCount?:       number;
  aiProcessingError?:  string;
  // ── Janta public media ────────────────────────────────────────────────────
  heroImageUrl?:       string;   // Firebase Storage URL — shown on /janta card
  // ── Civic Library classification ──────────────────────────────────────────
  // These fields make every document a structured civic intelligence source,
  // not just a stored file.
  govFolder?:           GovFolder;     // which folder in the Civic Intelligence Library
  constitutionalParts?: number[];      // which constitutional parts (1-35) this doc covers
  institutionName?:     string;        // source institution: "Nepal Rastra Bank", "Ministry of Finance", etc.
  docYear?:             number | null; // fiscal/calendar year of the document
  docType?:             string;        // specific type: "Annual Budget", "Court Decision", "Policy", etc.
  // ── Document Lifecycle Intelligence ──────────────────────────────────────
  // These fields answer: what kind of document is this, when will it be
  // superseded, and how should ZZC archive it over time?
  lifecycleType?:         LifecycleType;       // perpetual | amendment_based | annual_report | quarterly | circular | news
  updateFrequency?:       UpdateFrequency;     // rare | yearly | quarterly | monthly | weekly | daily
  monitoringMode?:        MonitoringMode;      // auto | manual | archived | inactive
  archivePolicy?:         ArchivePolicy;       // keep_all | keep_latest | rolling_N
  versioningStrategy?:    VersioningStrategy;  // versioned | replace | append_only
  importanceLevel?:       ImportanceLevel;     // critical | high | medium | low
  // ── Version chain ─────────────────────────────────────────────────────────
  versionNumber?:         string;              // "2081/82", "2080/81", "FY2024-25"
  versionLabel?:          string;              // display: "२०८१/८२ वार्षिक प्रतिवेदन"
  previousVersionId?:     string;              // docId of the older version this replaces
  replacedByDocId?:       string;              // docId of the newer version (set when superseded)
  amendmentNotes?:        string;              // what changed from previous version
  // ── Source provenance + archive ───────────────────────────────────────────
  originalSourceUrl?:     string;              // exact URL where the PDF was downloaded from
  archiveVerifiedAt?:     string;              // ISO timestamp confirming R2 copy is intact
  expectedUpdateWindow?:  string;              // "Shrawan–Bhadra 2082" — next version expected
  // ── Metadata ──────────────────────────────────────────────────────────────
  pageCount?:          number;
  language?:           string;
  uploadedAt:          string;
  updatedAt:           string;
}

// Client-side only — never stored in Firestore
export interface DocUploadTask {
  localId:   string;
  fileName:  string;
  progress:  number;               // 0-100
  status:    "uploading" | "creating" | "done" | "error";
  error?:    string;
  docId?:    string;
}
