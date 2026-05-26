/**
 * CTO Engine — pure rule-based system state analyzer.
 *
 * Takes a SystemSnapshot (Firestore data already fetched) and returns a
 * sorted list of CTOInsights: what's broken, what's pending, what matters.
 *
 * No Firestore reads here — this is a pure function so it's testable.
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
  actionLabel?: string;
  actionHref?:  string;
  count?:       number;
}

export interface SystemSnapshot {
  // Documents
  docsTotal:               number;
  docsNeverAnalyzed:       number;
  neverAnalyzedTitles:     string[];
  docsPendingReview:       number;
  pendingReviewTitles:     string[];
  docsApprovedNoExtract:   number;
  approvedNoExtractTitles: string[];
  docsPaused:              number;
  // Constitutional framework
  totalFramework:          number;
  emptyParts:              number[];   // part numbers 1–35 with 0 records
  partsWithData:           number;     // 35 - emptyParts.length (clamped to 0–35)
  // Janta intelligence
  totalIntel:              number;
  lowConfidenceIntel:      number;     // confidence < 0.6
  // Relationships
  totalRelationships:      number;
  // Signals
  daysSinceLastSignal:     number | null;
  recentSignalCount:       number;
}

const WEIGHT: Record<InsightPriority, number> = {
  critical: 4,
  high:     3,
  medium:   2,
  low:      1,
};

export function generateInsights(snap: SystemSnapshot): CTOInsight[] {
  const out: CTOInsight[] = [];

  // ── Documents never analyzed ────────────────────────────────────────────────
  if (snap.docsNeverAnalyzed > 0) {
    const titles = snap.neverAnalyzedTitles.slice(0, 2).join(", ");
    out.push({
      id:          "never_analyzed",
      type:        "never_analyzed",
      priority:    snap.docsNeverAnalyzed >= 3 ? "critical" : "high",
      icon:        "🤖",
      titleNp:     `${snap.docsNeverAnalyzed} document AI analyze गरिएन`,
      bodyNp:      snap.docsNeverAnalyzed === 1
        ? `"${snap.neverAnalyzedTitles[0] ?? ""}" upload भयो तर AI ले पढेको छैन। Documents पेजमा गएर analyze गर्नुस्।`
        : `${titles}${snap.docsNeverAnalyzed > 2 ? ` र ${snap.docsNeverAnalyzed - 2} थप` : ""} — AI ले intelligence निकाल्न analyze आवश्यक छ।`,
      actionLabel: "Documents हेर्नुस्",
      actionHref:  "/vault/documents",
      count:       snap.docsNeverAnalyzed,
    });
  }

  // ── Pending admin review ────────────────────────────────────────────────────
  if (snap.docsPendingReview > 0) {
    out.push({
      id:          "pending_review",
      type:        "pending_review",
      priority:    snap.docsPendingReview >= 3 ? "critical" : "high",
      icon:        "👁",
      titleNp:     `${snap.docsPendingReview} document Admin Review पर्खिरहेको`,
      bodyNp:      `AI analysis सकियो तर Admin Vault मा review गरिएन। Review नगरी intelligence public हुँदैन — यो Founder को bottleneck हो।`,
      actionLabel: "Admin Vault → Review",
      actionHref:  "/vault/admin?tab=documents",
      count:       snap.docsPendingReview,
    });
  }

  // ── Approved but not deep-extracted ────────────────────────────────────────
  if (snap.docsApprovedNoExtract > 0) {
    const first = snap.approvedNoExtractTitles[0] ?? "";
    out.push({
      id:          "approved_no_extract",
      type:        "approved_no_extract",
      priority:    "high",
      icon:        "🔍",
      titleNp:     `${snap.docsApprovedNoExtract} document approve भयो — Deep Extract बाँकी`,
      bodyNp:      snap.docsApprovedNoExtract === 1
        ? `"${first}" approve भएको छ। Documents पेजमा गएर Deep Extract गर्नुस् — Janta cards, policy points र relationships निकाल्न।`
        : `${snap.docsApprovedNoExtract} documents approve भए तर Deep Extract गरिएन। यी बाट Janta intelligence जनतालाई उपलब्ध छैन।`,
      actionLabel: "Documents → Deep Extract",
      actionHref:  "/vault/documents",
      count:       snap.docsApprovedNoExtract,
    });
  }

  // ── Constitution framework: completely empty ────────────────────────────────
  if (snap.totalFramework === 0) {
    out.push({
      id:          snap.docsTotal > 0 ? "constitution_not_extracted" : "constitution_no_doc",
      type:        "constitution_empty",
      priority:    "high",
      icon:        "📜",
      titleNp:     snap.docsTotal > 0
        ? "Constitution Framework extract गरिएन"
        : "संविधान PDF upload गरिएन",
      bodyNp:      snap.docsTotal > 0
        ? "Constitution PDF upload भइसकेको छ तर Framework extract गरिएन। Constitution Tree खाली छ — जनताले भाग र धाराहरू देख्न पाउँदैनन्।"
        : "नेपालको संविधान २०७२ PDF upload गर्नुस् — Constitution Tree सुरु हुन्छ। यो पूरा system को आधार हो।",
      actionLabel: snap.docsTotal > 0 ? "Documents → Extract" : "Upload गर्नुस्",
      actionHref:  "/vault/documents",
    });
  }

  // ── Constitution: important parts empty ────────────────────────────────────
  // Only show when framework exists but some important parts are missing
  if (snap.emptyParts.length > 0 && snap.totalFramework > 0) {
    // Prioritize constitutionally important parts (fundamental rights, directives, etc.)
    const importantParts = [3, 4, 5, 6, 7, 11, 12, 15, 16, 17];
    const importantEmpty = snap.emptyParts.filter(p => importantParts.includes(p));
    if (importantEmpty.length > 0) {
      out.push({
        id:          "constitution_gap",
        type:        "constitution_gap",
        priority:    importantEmpty.length >= 5 ? "high" : "medium",
        icon:        "🌿",
        titleNp:     `${snap.emptyParts.length} संवैधानिक भाग खाली छन्`,
        bodyNp:      `भाग ${importantEmpty.slice(0, 4).join(", ")} मा intelligence छैन। ${snap.partsWithData}/35 भाग cover भएका छन्।`,
        actionLabel: "Branch Health हेर्नुस्",
        actionHref:  "/vault/constitution/health",
        count:       snap.emptyParts.length,
      });
    }
  }

  // ── AI paused (billing/quota) ───────────────────────────────────────────────
  if (snap.docsPaused > 0) {
    out.push({
      id:          "ai_paused",
      type:        "ai_paused",
      priority:    snap.docsPaused >= 3 ? "high" : "medium",
      icon:        "⏸",
      titleNp:     `${snap.docsPaused} document AI billing/quota कारण रोकियो`,
      bodyNp:      "AI provider को limit पुग्यो। System Settings मा गएर API key configure गर्नुस् — document safe छ, AI मात्र रोकियो।",
      actionLabel: "System Settings →",
      actionHref:  "/vault/system",
      count:       snap.docsPaused,
    });
  }

  // ── Signal gap ─────────────────────────────────────────────────────────────
  if (snap.daysSinceLastSignal !== null && snap.daysSinceLastSignal > 7) {
    out.push({
      id:          "signal_gap",
      type:        "signal_gap",
      priority:    snap.daysSinceLastSignal > 30 ? "high" : "medium",
      icon:        "📡",
      titleNp:     `${snap.daysSinceLastSignal} दिनदेखि कुनै signal feed छैन`,
      bodyNp:      "NRB, MoF वा Parliament बाट कुनै signal आएन। Signal Intelligence page मा गएर source configure गर्नुस्।",
      actionLabel: "Signal Feed →",
      actionHref:  "/vault/content/intelligence",
    });
  }

  // ── Low confidence records ─────────────────────────────────────────────────
  if (snap.lowConfidenceIntel > 10) {
    out.push({
      id:          "low_confidence",
      type:        "low_confidence",
      priority:    "low",
      icon:        "⚠️",
      titleNp:     `${snap.lowConfidenceIntel} intelligence records को confidence कम छ`,
      bodyNp:      "AI confidence 60% भन्दा कम छ — यी records re-review वा re-extract गर्न सकिन्छ।",
      actionLabel: "Branch Health →",
      actionHref:  "/vault/constitution/health",
      count:       snap.lowConfidenceIntel,
    });
  }

  // ── No relationships ────────────────────────────────────────────────────────
  if (snap.totalRelationships === 0 && snap.totalIntel > 5) {
    out.push({
      id:          "no_relationships",
      type:        "no_relationships",
      priority:    "low",
      icon:        "🔗",
      titleNp:     "Intelligence records isolated छन्",
      bodyNp:      `${snap.totalIntel} records छन् तर आपसमा कुनै relationship link छैन। Deep Extract गर्दा auto-match हुन्छ।`,
      actionLabel: "Documents →",
      actionHref:  "/vault/documents",
    });
  }

  // ── System healthy ──────────────────────────────────────────────────────────
  if (out.length === 0) {
    out.push({
      id:      "system_healthy",
      type:    "system_healthy",
      priority: "low",
      icon:    "✅",
      titleNp: "System राम्रो चलिरहेको छ",
      bodyNp:  snap.docsTotal > 0
        ? `${snap.docsTotal} documents · ${snap.totalIntel} intelligence records · ${snap.partsWithData}/35 constitutional branches active।`
        : "Backend तयार छ। पहिलो civic document upload गरेर सुरु गर्नुस्।",
      actionLabel: snap.docsTotal === 0 ? "First Upload →" : undefined,
      actionHref:  snap.docsTotal === 0 ? "/vault/documents" : undefined,
    });
  }

  // Sort: priority descending, then count descending
  return out.sort((a, b) => {
    const pw = WEIGHT[b.priority] - WEIGHT[a.priority];
    return pw !== 0 ? pw : (b.count ?? 0) - (a.count ?? 0);
  });
}

// ── System health summary ───────────────────────────────────────────────────

export type HealthStatus = "critical" | "attention" | "progress" | "healthy";

export function systemHealthStatus(insights: CTOInsight[]): HealthStatus {
  if (insights.some(i => i.priority === "critical")) return "critical";
  if (insights.filter(i => i.priority === "high").length >= 2)   return "attention";
  if (insights.some(i => i.priority === "high"))    return "progress";
  return "healthy";
}
