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
 * - Every insight must answer: what is wrong, why it matters, what to click
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
  // What happened + why it matters (1–2 sentences, simple Nepali)
  titleNp:      string;
  bodyNp:       string;
  // Why am I seeing this? — expanded explanation shown on demand
  whyNp:        string;
  // Primary action
  actionLabel?: string;
  actionHref?:  string;
  // Count of affected items (for sorting + badge)
  count?:       number;
  // Can this insight be dismissed for 24h? (critical = never)
  dismissable:  boolean;
  // AI-cost action warning — shown before user clicks
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
  brokenFrameworkRecords:  number;   // partNumber === 0 — need PartNumber Repair
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

export function generateInsights(snap: SystemSnapshot): CTOInsight[] {
  const pool: CTOInsight[] = [];

  // ── Documents never analyzed ────────────────────────────────────────────────
  if (snap.docsNeverAnalyzed > 0) {
    const sample = snap.neverAnalyzedTitles.slice(0, 2).join(" र ");
    pool.push({
      id:          "never_analyzed",
      type:        "never_analyzed",
      priority:    snap.docsNeverAnalyzed >= 3 ? "critical" : "high",
      icon:        "🤖",
      titleNp:     `${snap.docsNeverAnalyzed} document AI analyze गरिएन`,
      bodyNp:      snap.docsNeverAnalyzed === 1
        ? `"${snap.neverAnalyzedTitles[0] ?? "Document"}" upload भयो तर AI ले पढेको छैन।`
        : `${sample}${snap.docsNeverAnalyzed > 2 ? ` लगायत ${snap.docsNeverAnalyzed} documents` : ""} — AI analyze गर्नुस्।`,
      whyNp:       "AI analyze नगरी document बाट topics, rights, institutions, र promises निकाल्न सकिँदैन। Constitution Tree मा intelligence थपिँदैन। यो pipeline को पहिलो step हो।",
      actionLabel: "Documents मा जानुस्",
      actionHref:  "/vault/documents",
      count:       snap.docsNeverAnalyzed,
      dismissable: false,
    });
  }

  // ── Pending admin review ────────────────────────────────────────────────────
  if (snap.docsPendingReview > 0) {
    pool.push({
      id:          "pending_review",
      type:        "pending_review",
      priority:    snap.docsPendingReview >= 3 ? "critical" : "high",
      icon:        "👁",
      titleNp:     `${snap.docsPendingReview} document Admin Review पर्खिरहेको`,
      bodyNp:      "AI analysis सकियो। तपाईंले review नगरेसम्म यो intelligence public हुँदैन।",
      whyNp:       "AI गलत पनि हुन सक्छ — गलत intelligence जनतासम्म नपुगोस् भनेर Admin Review राखिएको हो। Approve नगरी Deep Extract र Public Tree access हुँदैन।",
      actionLabel: "Admin Vault मा Review गर्नुस्",
      actionHref:  "/vault/admin?tab=documents",
      count:       snap.docsPendingReview,
      dismissable: false,
    });
  }

  // ── Approved but not deep-extracted ────────────────────────────────────────
  if (snap.docsApprovedNoExtract > 0) {
    const first = snap.approvedNoExtractTitles[0] ?? "document";
    pool.push({
      id:          "approved_no_extract",
      type:        "approved_no_extract",
      priority:    "high",
      icon:        "🔍",
      titleNp:     `${snap.docsApprovedNoExtract} approved document — Deep Extract बाँकी`,
      bodyNp:      snap.docsApprovedNoExtract === 1
        ? `"${first}" approve भएको छ। Deep Extract गरे Janta cards र relationships तयार हुन्छन्।`
        : `${snap.docsApprovedNoExtract} documents approve भए तर Intelligence extract गरिएन।`,
      whyNp:       "Approve गरेपछि पनि document static छ — Deep Extract गरेपछि मात्र Janta Intelligence cards, policy points, र cross-document relationships बन्छन्। यो step नगरे जनताले document बाट फाइदा लिन सक्दैनन्।",
      actionLabel: "Documents → Deep Extract",
      actionHref:  "/vault/documents",
      count:       snap.docsApprovedNoExtract,
      dismissable: true,
      costWarning: "Deep Extract ले AI cost लाग्छ। Document पहिले नै extract भएको छैन भने मात्र गर्नुस् — Document card मा intel count हेर्नुस्।",
    });
  }

  // ── Constitution framework: completely empty ────────────────────────────────
  if (snap.totalFramework === 0) {
    pool.push({
      id:          snap.docsTotal > 0 ? "constitution_not_extracted" : "constitution_no_doc",
      type:        "constitution_empty",
      priority:    "high",
      icon:        "📜",
      titleNp:     snap.docsTotal > 0
        ? "Constitution Framework extract गरिएन — Tree खाली छ"
        : "नेपालको संविधान PDF upload गरिएन",
      bodyNp:      snap.docsTotal > 0
        ? "Constitution PDF छ तर Framework extract गरिएन। Constitution Tree मा केही देखिँदैन।"
        : "संविधान २०७२ PDF upload गर्नुस् — यो पूरा system को आधार हो।",
      whyNp:       "Constitutional Framework (Layer 1) बिना Constitution Tree खाली हुन्छ। ३५ भागका धाराहरू, अधिकारहरू, र institutions — सबै यही बाट आउँछन्। यो एकपटक गरे पुग्छ।",
      actionLabel: snap.docsTotal > 0 ? "Documents → Extract" : "Upload गर्नुस्",
      actionHref:  "/vault/documents",
      dismissable: false,
      costWarning: snap.docsTotal > 0
        ? "Constitution extraction ले 22 batch API calls लाग्छ। एकपटक सकिएपछि re-extract आवश्यक हुँदैन।"
        : undefined,
    });
  }

  // ── Constitution: partNumber=0 broken records ──────────────────────────────
  // These records exist but Branch Health can't read them — they look like empty parts.
  if (snap.brokenFrameworkRecords > 0 && snap.totalFramework > 0) {
    pool.push({
      id:          "broken_framework",
      type:        "constitution_gap",
      priority:    snap.brokenFrameworkRecords > 50 ? "high" : "medium",
      icon:        "🔧",
      titleNp:     `${snap.brokenFrameworkRecords} धाराहरू "भाग ०" मा अड्किएका छन्`,
      bodyNp:      `AI ले देवनागरी अंक ("भाग ३" → "भाग 0") पढ्न सकेन। Branch Health ले यी records देख्दैन — सबै parts खाली देखिन्छन्।`,
      whyNp:       "Extraction को bug: `parseInt(\"३\", 10)` = NaN = 0। Repair ले `part` field बाट सही number निकाल्छ — re-extraction हुँदैन, AI cost छैन, content बदलिँदैन। ३०–६० seconds लाग्छ।",
      actionLabel: "PartNumber Repair → /vault/constitution",
      actionHref:  "/vault/constitution",
      count:       snap.brokenFrameworkRecords,
      dismissable: false,
      costWarning: undefined, // explicitly safe — no AI, no re-extraction
    });
  }

  // ── Constitution: important parts empty ────────────────────────────────────
  if (snap.emptyParts.length > 0 && snap.totalFramework > 0) {
    const importantParts = [3, 4, 5, 6, 7, 11, 12, 15, 16, 17];
    const importantEmpty = snap.emptyParts.filter(p => importantParts.includes(p));
    if (importantEmpty.length > 0) {
      pool.push({
        id:          "constitution_gap",
        type:        "constitution_gap",
        priority:    importantEmpty.length >= 5 ? "high" : "medium",
        icon:        "🌿",
        titleNp:     `${snap.emptyParts.length} संवैधानिक भाग मा intelligence छैन`,
        bodyNp:      `भाग ${importantEmpty.slice(0, 4).join(", ")} मा कुनै data छैन। ${snap.partsWithData}/35 भाग active छन्।`,
        whyNp:       "खाली भागको Branch Health red देखिन्छ। ती भागमा upload गरिएका documents गएनन् वा extract भएनन्। Branch Health page मा हेर्नुस् र relevant documents upload/extract गर्नुस्।",
        actionLabel: "Branch Health हेर्नुस्",
        actionHref:  "/vault/constitution/health",
        count:       snap.emptyParts.length,
        dismissable: true,
      });
    }
  }

  // ── AI paused ───────────────────────────────────────────────────────────────
  if (snap.docsPaused > 0) {
    pool.push({
      id:          "ai_paused",
      type:        "ai_paused",
      priority:    snap.docsPaused >= 3 ? "high" : "medium",
      icon:        "⏸",
      titleNp:     `${snap.docsPaused} document AI billing कारण रोकियो`,
      bodyNp:      "AI provider को limit पुग्यो। Document safe छ — AI मात्र रोकियो।",
      whyNp:       "AI analysis fail हुँदा document 'ai_paused' state मा जान्छ — document delete हुँदैन, कहिल्यै। System Settings मा API key configure गरेपछि retry गर्न सकिन्छ।",
      actionLabel: "System Settings →",
      actionHref:  "/vault/system",
      count:       snap.docsPaused,
      dismissable: true,
    });
  }

  // ── Signal gap ─────────────────────────────────────────────────────────────
  if (snap.daysSinceLastSignal !== null && snap.daysSinceLastSignal > 7) {
    pool.push({
      id:          "signal_gap",
      type:        "signal_gap",
      priority:    snap.daysSinceLastSignal > 30 ? "high" : "medium",
      icon:        "📡",
      titleNp:     `${snap.daysSinceLastSignal} दिनदेखि कुनै signal feed छैन`,
      bodyNp:      "NRB, MoF वा Parliament बाट signal आएको छैन। Signal Feed check गर्नुस्।",
      whyNp:       "Signal Feed ले live government/financial news detect गर्छ। लामो gap भएमा नयाँ policy changes detect हुँदैनन् — Janta Intelligence outdated हुन्छ।",
      actionLabel: "Signal Feed →",
      actionHref:  "/vault/content/intelligence",
      dismissable: true,
    });
  }

  // ── Low confidence ─────────────────────────────────────────────────────────
  if (snap.lowConfidenceIntel > 10) {
    pool.push({
      id:          "low_confidence",
      type:        "low_confidence",
      priority:    "low",
      icon:        "⚠️",
      titleNp:     `${snap.lowConfidenceIntel} intelligence records कमजोर छन्`,
      bodyNp:      "AI confidence 60% भन्दा कम छ — Branch Health मा review गर्न सकिन्छ।",
      whyNp:       "Confidence कम भएका records गलत हुन सक्छन्। Re-extract गर्नुभन्दा पहिले Branch Health page मा कुन records कमजोर छन् हेर्नुस् — unnecessary AI cost नगर्नुस्।",
      actionLabel: "Branch Health →",
      actionHref:  "/vault/constitution/health",
      count:       snap.lowConfidenceIntel,
      dismissable: true,
    });
  }

  // ── No relationships ────────────────────────────────────────────────────────
  if (snap.totalRelationships === 0 && snap.totalIntel > 5) {
    pool.push({
      id:          "no_relationships",
      type:        "no_relationships",
      priority:    "low",
      icon:        "🔗",
      titleNp:     "Intelligence records isolated छन्",
      bodyNp:      `${snap.totalIntel} records छन् तर कुनै cross-document relationship link छैन।`,
      whyNp:       "Relationships ले documents बीचको pattern देखाउँछ — उदाहरण: 'Budget 2081 ले Education Act लाई कसरी affect गर्छ।' Deep Extract गर्दा auto-match हुन्छ, manual काम छैन।",
      actionLabel: "Documents →",
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
      titleNp:     snap.docsTotal > 0 ? "System राम्रो चलिरहेको छ" : "Backend तयार छ",
      bodyNp:      snap.docsTotal > 0
        ? `${snap.docsTotal} documents · ${snap.totalIntel} intelligence records · ${snap.partsWithData}/35 branches active।`
        : "पहिलो civic document upload गरेर Constitution Intelligence सुरु गर्नुस्।",
      whyNp:       "सबै tracked pipeline steps complete भएका छन्। नयाँ document upload गर्नुस् वा Branch Health check गर्नुस्।",
      actionLabel: snap.docsTotal === 0 ? "पहिलो Upload →" : "Branch Health →",
      actionHref:  snap.docsTotal === 0 ? "/vault/documents" : "/vault/constitution/health",
      dismissable: false,
    });
  }

  // Sort by priority, then count, then cap at MAX_INSIGHTS
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
