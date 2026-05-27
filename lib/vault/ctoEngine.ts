/**
 * CTO Engine — pure rule-based system state analyzer.
 *
 * Takes a SystemSnapshot (Firestore data already fetched) and returns a
 * sorted list of CTOInsights. No side effects — pure function, testable.
 *
 * Design rules:
 * - Max 5 insights returned (1 primary + 4 supporting)
 * - Critical insights are never dismissable
 * - AI-cost actions carry a costWarning so the UI can show a guard
 * - Every insight must answer: what is blocked, what reaches जनता when fixed
 * - No noise: low-confidence and no-relationships have high thresholds
 * - constitution_gap suppressed when brokenFrameworkRecords > 0 (fix root cause first)
 */

export type InsightPriority = "critical" | "high" | "medium" | "low";

export type InsightType =
  | "never_analyzed"
  | "pending_review"
  | "approved_no_extract"
  | "constitution_empty"
  | "constitution_gap"
  | "ai_paused"
  | "signal_gap"
  | "low_confidence"
  | "no_relationships"
  | "system_healthy";

export interface CTOInsight {
  id:           string;
  type:         InsightType;
  priority:     InsightPriority;
  icon:         string;
  titleNp:      string;
  bodyNp:       string;
  // "यो किन देखिँदैछ?" — expanded, shown on demand
  whyNp:        string;
  actionLabel?: string;
  actionHref?:  string;
  count?:       number;
  dismissable:  boolean;
  costWarning?: string;
}

export interface SystemSnapshot {
  docsTotal:               number;
  docsNeverAnalyzed:       number;
  neverAnalyzedTitles:     string[];
  docsPendingReview:       number;
  pendingReviewTitles:     string[];
  docsApprovedNoExtract:   number;
  approvedNoExtractTitles: string[];
  docsPaused:              number;
  totalFramework:          number;
  brokenFrameworkRecords:  number;
  emptyParts:              number[];
  partsWithData:           number;
  totalIntel:              number;
  lowConfidenceIntel:      number;
  totalRelationships:      number;
  daysSinceLastSignal:     number | null;
  recentSignalCount:       number;
}

const WEIGHT: Record<InsightPriority, number> = {
  critical: 4, high: 3, medium: 2, low: 1,
};

const MAX_INSIGHTS = 5;

// Noise thresholds — tuned to avoid premature alerts
const THRESHOLD = {
  lowConfidence:   25,   // only surface when clearly a quality problem
  noRelationships: 30,   // relationships are meaningless with few records
  signalGapDays:    7,   // days before surfacing signal gap
};

export function generateInsights(snap: SystemSnapshot): CTOInsight[] {
  const pool: CTOInsight[] = [];

  // ── 1. Documents never analyzed ────────────────────────────────────────────
  // Blocks: nothing enters the pipeline. Highest pipeline urgency.
  if (snap.docsNeverAnalyzed > 0) {
    const sample = snap.neverAnalyzedTitles.slice(0, 2).join(" र ");
    pool.push({
      id:          "never_analyzed",
      type:        "never_analyzed",
      priority:    snap.docsNeverAnalyzed >= 3 ? "critical" : "high",
      icon:        "🤖",
      titleNp:     `${snap.docsNeverAnalyzed} document पढिएन — pipeline सुरु हुँदैन`,
      bodyNp:      snap.docsNeverAnalyzed === 1
        ? `"${snap.neverAnalyzedTitles[0] ?? "Document"}" upload भयो तर AI ले अझै पढेको छैन।`
        : `${sample}${snap.docsNeverAnalyzed > 2 ? ` लगायत ${snap.docsNeverAnalyzed} documents` : ""} — AI analyze नगरे intelligence निकाल्न सकिँदैन।`,
      whyNp:       "AI analyze नगरी document बाट topics, rights, institutions, र promises निकाल्न सकिँदैन। यो pipeline को पहिलो step हो — यो नभई Constitution Tree मा केही थपिँदैन।",
      actionLabel: "Documents → AI Analyze",
      actionHref:  "/vault/documents",
      count:       snap.docsNeverAnalyzed,
      dismissable: false,
    });
  }

  // ── 2. Pending admin review ─────────────────────────────────────────────────
  // Blocks: intelligence exists but is quarantined. जनता can't see it yet.
  if (snap.docsPendingReview > 0) {
    pool.push({
      id:          "pending_review",
      type:        "pending_review",
      priority:    snap.docsPendingReview >= 3 ? "critical" : "high",
      icon:        "👁",
      titleNp:     `${snap.docsPendingReview} document review पर्खिरहेको — intelligence अड्किएको छ`,
      bodyNp:      "AI analysis सकियो। तपाईंको review नभई यो intelligence जनतासम्म पुग्दैन।",
      whyNp:       "AI कहिलेकाहीँ गलत पनि हुन्छ — गलत civic intelligence publish हुन नदिन Admin Review gate राखिएको हो। Approve नगरी Deep Extract र Public Tree access खुल्दैन।",
      actionLabel: "Admin Vault → Review",
      actionHref:  "/vault/admin?tab=documents",
      count:       snap.docsPendingReview,
      dismissable: false,
    });
  }

  // ── 3. Approved but not deep-extracted ────────────────────────────────────
  // Blocks: approved document hasn't yielded Janta cards yet.
  if (snap.docsApprovedNoExtract > 0) {
    const first = snap.approvedNoExtractTitles[0] ?? "document";
    pool.push({
      id:          "approved_no_extract",
      type:        "approved_no_extract",
      priority:    "high",
      icon:        "🔍",
      titleNp:     `${snap.docsApprovedNoExtract} document approve भयो — Intelligence निकाल्न बाँकी`,
      bodyNp:      snap.docsApprovedNoExtract === 1
        ? `"${first}" approve भएको छ। Intelligence निकाले Janta cards र connections तयार हुन्छन्।`
        : `${snap.docsApprovedNoExtract} documents approve भए तर Intelligence अझै निकालिएन।`,
      whyNp:       "Approve गरेपछि पनि document static छ — Intelligence निकालेपछि मात्र Janta cards, policy points, र cross-document connections बन्छन्। यो step नगरे जनताले document बाट केही पाउँदैनन्।",
      actionLabel: "Documents → Intelligence निकाल्नुहोस्",
      actionHref:  "/vault/documents",
      count:       snap.docsApprovedNoExtract,
      dismissable: true,
      costWarning: "Intelligence निकाल्न AI cost लाग्छ। Document card मा intel count हेर्नुस् — पहिले नै extract भएको छैन भने मात्र गर्नुस्।",
    });
  }

  // ── 4. Constitution framework: completely empty ────────────────────────────
  // Blocks: the entire Layer 1 tree is absent.
  if (snap.totalFramework === 0) {
    pool.push({
      id:          snap.docsTotal > 0 ? "constitution_not_extracted" : "constitution_no_doc",
      type:        "constitution_empty",
      priority:    "high",
      icon:        "📜",
      titleNp:     snap.docsTotal > 0
        ? "संविधान Framework निकालिएन — Constitution Tree खाली छ"
        : "नेपालको संविधान PDF upload गरिएन",
      bodyNp:      snap.docsTotal > 0
        ? "Constitution PDF छ तर धाराहरू निकालिएनन्। Public Tree मा केही देखिँदैन।"
        : "संविधान २०७२ PDF upload गर्नुस् — यो पूरा civic intelligence system को जग हो।",
      whyNp:       "Constitutional Framework (Layer 1) बिना Constitution Tree खाली हुन्छ। ३५ भागका धाराहरू, अधिकारहरू, र institutions — सबै यही बाट आउँछन्। एकपटक निकाले पुग्छ।",
      actionLabel: snap.docsTotal > 0 ? "Documents → संविधान निकाल्नुहोस्" : "संविधान Upload गर्नुस्",
      actionHref:  snap.docsTotal > 0
        ? "/vault/documents"
        : "/vault/documents?upload=1&govFolder=constitution&tags=constitution,2072,nepal,fundamental-law",
      dismissable: false,
      costWarning: snap.docsTotal > 0
        ? "संविधान extraction ले multiple AI calls लाग्छ। एकपटक सकिएपछि re-extract आवश्यक हुँदैन।"
        : undefined,
    });
  }

  // ── 5. Constitution: broken branch mapping ────────────────────────────────
  // Only fire when there are genuinely repairable records (partNumber === 0).
  // Threshold: 5+ to avoid noise from isolated edge cases.
  if (snap.brokenFrameworkRecords >= 5 && snap.totalFramework > 0) {
    pool.push({
      id:          "broken_framework",
      type:        "constitution_gap",
      priority:    snap.brokenFrameworkRecords > 50 ? "high" : "medium",
      icon:        "🔧",
      titleNp:     `${snap.brokenFrameworkRecords} धाराहरू सही भागमा पुगेका छैनन्`,
      bodyNp:      `AI ले देवनागरी अंक गलत पढ्यो — यी ${snap.brokenFrameworkRecords} धाराहरू Branch Health ले देख्दैन र सबै भाग खाली देखिन्छन्।`,
      whyNp:       "भाग mapping गलत भएकाले Branch Health page मा सबै ३५ भाग 'खाली' देखिन्छन् — Constitution Tree सही काम गर्दैन। यो मिलाउँदा AI फेरि चल्दैन, content बदलिँदैन, ~३० सेकेन्ड लाग्छ।",
      actionLabel: "भाग-संरचना सुधार → Constitution",
      actionHref:  "/vault/constitution",
      count:       snap.brokenFrameworkRecords,
      dismissable: true,
    });
  }

  // ── 6. Constitution: important parts empty ────────────────────────────────
  // Only surface AFTER broken records are fixed (they cause false empty readings).
  // Only matters for civically critical parts.
  if (
    snap.emptyParts.length > 0 &&
    snap.totalFramework > 0 &&
    snap.brokenFrameworkRecords === 0   // suppress until root cause is fixed
  ) {
    const importantParts = [3, 4, 5, 6, 7, 11, 12, 15, 16, 17];
    const importantEmpty = snap.emptyParts.filter(p => importantParts.includes(p));
    if (importantEmpty.length > 0) {
      pool.push({
        id:          "constitution_gap",
        type:        "constitution_gap",
        priority:    importantEmpty.length >= 5 ? "high" : "medium",
        icon:        "🌿",
        titleNp:     `${importantEmpty.length} महत्त्वपूर्ण संवैधानिक भाग मा intelligence छैन`,
        bodyNp:      `भाग ${importantEmpty.slice(0, 4).join(", ")} मा कुनै data छैन — जनताले यी भागका अधिकार देख्न पाउँदैनन्। ${snap.partsWithData}/35 भाग active छन्।`,
        whyNp:       "खाली भागहरूमा upload भएका documents त्यहाँ पुगेनन् वा Intelligence निकालिएन। Branch Health page मा कुन भाग कमजोर छन् हेर्नुस् र relevant documents upload/extract गर्नुस्।",
        actionLabel: "Branch Health हेर्नुस्",
        actionHref:  "/vault/constitution/health",
        count:       importantEmpty.length,
        dismissable: true,
      });
    }
  }

  // ── 7. AI paused ────────────────────────────────────────────────────────────
  if (snap.docsPaused > 0) {
    pool.push({
      id:          "ai_paused",
      type:        "ai_paused",
      priority:    snap.docsPaused >= 3 ? "high" : "medium",
      icon:        "⏸",
      titleNp:     `${snap.docsPaused} document — AI रोकियो, document सुरक्षित छ`,
      bodyNp:      "AI provider को limit पुग्यो। Document safe छ, intelligence मात्र रोकियो। API key ठीक गरेपछि retry हुन्छ।",
      whyNp:       "AI analysis fail हुँदा document 'रोकिएको' state मा जान्छ — document कहिल्यै delete हुँदैन। System Settings मा API key configure गरेपछि retry गर्न सकिन्छ।",
      actionLabel: "System Settings →",
      actionHref:  "/vault/system",
      count:       snap.docsPaused,
      dismissable: true,
    });
  }

  // ── 8. Signal gap ──────────────────────────────────────────────────────────
  // Infrastructure concern — never escalates to "high" (it's not blocking pipeline).
  if (snap.daysSinceLastSignal !== null && snap.daysSinceLastSignal > THRESHOLD.signalGapDays) {
    pool.push({
      id:          "signal_gap",
      type:        "signal_gap",
      priority:    "medium",   // capped — signal gap is infrastructure, not pipeline blocker
      icon:        "📡",
      titleNp:     `${snap.daysSinceLastSignal} दिनदेखि नयाँ government signal छैन`,
      bodyNp:      "NRB, MoF वा Parliament बाट live update आएको छैन। जारी नीति परिवर्तनहरू detect हुँदैनन्।",
      whyNp:       "Signal Feed ले live government/financial news detect गर्छ। लामो gap भएमा नयाँ policy changes intelligence मा आउँदैनन् — Janta cards outdated हुन्छन्।",
      actionLabel: "Signal Feed →",
      actionHref:  "/vault/content/intelligence",
      dismissable: true,
    });
  }

  // ── 9. Low confidence — suppressed until clearly a problem ────────────────
  // Only surfaces when 25+ records have <60% confidence (not after just a few docs).
  if (snap.lowConfidenceIntel > THRESHOLD.lowConfidence) {
    pool.push({
      id:          "low_confidence",
      type:        "low_confidence",
      priority:    "low",
      icon:        "⚠️",
      titleNp:     `${snap.lowConfidenceIntel} intelligence records कमजोर छन्`,
      bodyNp:      "AI confidence 60% भन्दा कम छ — गलत information जनतासम्म जान सक्छ।",
      whyNp:       "Confidence कम भएका records गलत हुन सक्छन्। Branch Health page मा कुन records कमजोर छन् हेर्नुस् — unnecessary AI cost नगर्नुस्, हेरेर मात्र re-extract गर्नुस्।",
      actionLabel: "Branch Health →",
      actionHref:  "/vault/constitution/health",
      count:       snap.lowConfidenceIntel,
      dismissable: true,
    });
  }

  // ── 10. No relationships — only after enough intel exists ─────────────────
  // Premature below 30 records (Deep Extract auto-creates relationships).
  if (snap.totalRelationships === 0 && snap.totalIntel > THRESHOLD.noRelationships) {
    pool.push({
      id:          "no_relationships",
      type:        "no_relationships",
      priority:    "low",
      icon:        "🔗",
      titleNp:     "Documents बीचको connection map बनेको छैन",
      bodyNp:      `${snap.totalIntel} intelligence records छन् तर cross-document connections छैनन् — जनताले सम्बन्धित policies एकसाथ देख्न पाउँदैनन्।`,
      whyNp:       "Connections ले documents बीचको pattern देखाउँछ — 'Budget 2081 ले Education Act लाई कसरी affect गर्छ।' Intelligence निकाल्दा auto-match हुन्छ, manual काम छैन।",
      actionLabel: "Documents → Intelligence निकाल्नुहोस्",
      actionHref:  "/vault/documents",
      dismissable: true,
    });
  }

  // ── System healthy ──────────────────────────────────────────────────────────
  if (pool.length === 0) {
    pool.push({
      id:          "system_healthy",
      type:        "system_healthy",
      priority:    "low",
      icon:        "✅",
      titleNp:     snap.docsTotal > 0 ? "Civic Intelligence Pipeline चलिरहेको छ" : "System तयार छ",
      bodyNp:      snap.docsTotal > 0
        ? `${snap.docsTotal} documents · ${snap.totalIntel} intelligence records · ${snap.partsWithData}/35 branches active — pipeline unblocked।`
        : "पहिलो civic document upload गरेर Constitution Intelligence सुरु गर्नुस्।",
      whyNp:       "सबै tracked pipeline steps clear छन् — कुनै document review मा अड्किएको छैन, कुनै AI error छैन, कुनै branch mapping problem छैन। नयाँ document upload गर्नुस् वा Branch Health check गर्नुस्।",
      actionLabel: snap.docsTotal === 0 ? "पहिलो Document Upload →" : "Branch Health →",
      actionHref:  snap.docsTotal === 0 ? "/vault/documents" : "/vault/constitution/health",
      dismissable: false,
    });
  }

  return pool
    .sort((a, b) => {
      const pw = WEIGHT[b.priority] - WEIGHT[a.priority];
      return pw !== 0 ? pw : (b.count ?? 0) - (a.count ?? 0);
    })
    .slice(0, MAX_INSIGHTS);
}

// ── System health summary ───────────────────────────────────────────────────

export type HealthStatus = "critical" | "attention" | "progress" | "healthy";

export function systemHealthStatus(insights: CTOInsight[]): HealthStatus {
  if (insights.some(i => i.priority === "critical")) return "critical";
  if (insights.filter(i => i.priority === "high").length >= 2) return "attention";
  if (insights.some(i => i.priority === "high"))   return "progress";
  return "healthy";
}

// ── CopilotContext-aware insight generation ─────────────────────────────────
// Translates a CopilotContext into the legacy SystemSnapshot and delegates
// to generateInsights. Also injects source-monitoring and media insights.

import type { CopilotContext } from "./copilotContext";

export function generateInsightsFromContext(
  ctx:  CopilotContext,
  page?: string,
): CTOInsight[] {
  // Build the legacy snapshot from the richer context
  const snap: SystemSnapshot = {
    docsTotal:               ctx.pipeline.totalDocs,
    docsNeverAnalyzed:       ctx.pipeline.pendingAI,
    neverAnalyzedTitles:     ctx.pipeline.neverAnalyzedTitles,
    docsPendingReview:       ctx.pipeline.pendingReview,
    pendingReviewTitles:     [],
    docsApprovedNoExtract:   ctx.pipeline.pendingExtract,
    approvedNoExtractTitles: ctx.pipeline.approvedTitles,
    docsPaused:              ctx.pipeline.aiPaused,
    totalFramework:          ctx.intelligence.frameworkCount,
    brokenFrameworkRecords:  ctx.intelligence.brokenFramework,
    emptyParts:              ctx.branchHealth.emptyParts,
    partsWithData:           ctx.branchHealth.partsWithData,
    totalIntel:              ctx.intelligence.intelCount,
    lowConfidenceIntel:      ctx.intelligence.lowConfidenceCount,
    totalRelationships:      ctx.intelligence.relationshipCount,
    daysSinceLastSignal:     null,
    recentSignalCount:       0,
  };

  const base = generateInsights(snap);

  // Inject source monitoring insight if there are new updates
  if (ctx.sourceMonitoring.newUpdates > 0 && base.length < MAX_INSIGHTS) {
    const sourceInsight: CTOInsight = {
      id:          "source_updates",
      type:        "signal_gap",
      priority:    "medium",
      icon:        "📡",
      titleNp:     `${ctx.sourceMonitoring.newUpdates} नयाँ official documents भेटियो`,
      bodyNp:      `${ctx.sourceMonitoring.sourceIds.slice(0, 2).join(", ")} मा नयाँ PDF/reports भेटियो। Review गरी upload गर्नुहोस्।`,
      whyNp:       "Source Radar ले government websites check गर्छ र नयाँ PDFs detect गर्छ। Review नगरी upload हुँदैन — AI cost लाग्दैन अहिले।",
      actionLabel: "Source Radar →",
      actionHref:  "/vault/sources",
      count:       ctx.sourceMonitoring.newUpdates,
      dismissable: true,
    };
    // Insert after pipeline insights but before low-priority ones
    const insertAt = base.findIndex(i => i.priority === "low");
    if (insertAt === -1) base.push(sourceInsight);
    else base.splice(insertAt, 0, sourceInsight);
  }

  // Page-aware hint injection (surface only relevant hints for current page)
  if (page) {
    // Find matching page hints
    const hintKey = Object.keys(ctx.pageHints).find(k => page.startsWith(k));
    if (hintKey) {
      const hints = ctx.pageHints[hintKey] ?? [];
      // Don't duplicate existing insights — only add if different message
      // (page hints are already shown separately in UI; no pool injection needed)
      void hints; // type-safe noop — hints surfaced in CTOAssistant directly
    }
  }

  return base.slice(0, MAX_INSIGHTS);
}
