/**
 * Management OS Engine — pure function, no Firestore reads.
 * Input: CopilotContext (already computed).
 * Output: ManagementOSState — the full rendered state for /vault/management.
 *
 * Architecture: this is a VIEW layer over CopilotContext.
 * ONE brain. No new data. No new queries.
 */

import type { CopilotContext } from "./copilotContext";
import {
  AI_OFFICERS,
  DEFAULT_WORK_ORDER,
  type COOBriefing,
  type DepartmentBriefing,
  type DepartmentId,
  type DepartmentStatus,
  type FounderWorkCycle,
  type FounderWorkStep,
  type KPIValue,
  type ManagementOSState,
  type ManagementTask,
  type StepUrgency,
  type TestItem,
} from "../types/management";

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _taskSeq = 0;
function task(
  titleNp:   string,
  dept:      DepartmentId,
  priority:  ManagementTask["priority"],
  status:    ManagementTask["status"],
  actionLabel: string,
  actionHref:  string,
  opts: Partial<ManagementTask> = {},
): ManagementTask {
  return {
    id:               `t_${++_taskSeq}`,
    titleNp,
    department:       dept,
    priority,
    status,
    owner:            "founder",
    requiresApproval: false,
    costLevel:        "none",
    actionLabel,
    actionHref,
    ...opts,
  };
}

function kv(
  id:        string,
  labelNp:   string,
  unit:      string,
  value:     number | string,
  target:    number | undefined,
  direction: "higher_is_better" | "lower_is_better" | "exact_is_better",
): KPIValue {
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  let isOnTarget = false;
  if (target !== undefined && !isNaN(numVal)) {
    if (direction === "higher_is_better") isOnTarget = numVal >= target;
    else if (direction === "lower_is_better") isOnTarget = numVal <= target;
    else isOnTarget = numVal === target;
  }
  return {
    definition: { id, labelNp, unit, target, direction },
    value,
    isOnTarget,
  };
}

// ─── Department briefings ─────────────────────────────────────────────────────

function buildOperationsBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { pipeline, costRisk, qa, lifecycle } = ctx;
  const tasks: ManagementTask[] = [];

  if (pipeline.aiPaused > 0) {
    tasks.push(task(
      `${pipeline.aiPaused} documents AI analyze रोकिएको छ — API key जाँच्नुस्`,
      "operations", "urgent", "open",
      "System Settings →", "/vault/system",
      { costLevel: "none", blockedReason: "Billing failure" },
    ));
  }
  if (pipeline.pendingAI > 0) {
    tasks.push(task(
      `${pipeline.pendingAI} documents AI analyze गर्न बाँकी`,
      "operations", "high", "open",
      "Documents →", "/vault/documents",
    ));
  }
  if (!qa.onTrack) {
    tasks.push(task(
      `QA Sprint: ${qa.approvedDocs}/${qa.target} — ${qa.target - qa.approvedDocs} बाँकी`,
      "operations", "high", "open",
      "QA Sprint →", "/vault/qa",
    ));
  }
  if (lifecycle.overdueCount > 0) {
    tasks.push(task(
      `${lifecycle.overdueCount} वटा documents को नयाँ version आइसकेको हुन सक्छ — check गर्नुस्`,
      "operations", "medium", "open",
      "Lifecycle हेर्नुस् →", "/vault/documents?view=lifecycle",
    ));
  }
  if (lifecycle.needsTypeSet > 0) {
    tasks.push(task(
      `${lifecycle.needsTypeSet} documents को lifecycle type set गरिएको छैन`,
      "operations", "low", "open",
      "Lifecycle →", "/vault/documents?view=lifecycle",
    ));
  }

  const status: DepartmentStatus =
    pipeline.aiPaused > 0            ? "critical" :
    pipeline.pendingAI > 0           ? "needs_attention" :
    !qa.onTrack                       ? "needs_attention" :
    lifecycle.overdueCount > 0        ? "needs_attention" :
    costRisk.pendingExtracts > 0      ? "needs_attention" : "on_track";

  const summary = buildLifecycleSummaryText(lifecycle);

  return {
    department:  "operations",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.operations,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("aiPaused",     "AI Paused Documents", "documents",  pipeline.aiPaused,        0,  "lower_is_better"),
      kv("qaProgress",   "QA Sprint Progress",  "documents",  qa.approvedDocs,          10, "higher_is_better"),
      kv("overdueCheck", "Update Check Overdue","documents",  lifecycle.overdueCount,   0,  "lower_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? summary,
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/documents?view=lifecycle",
    nextActionLabel: tasks[0]?.actionLabel ?? "Lifecycle हेर्नुस् →",
  };
}

function buildLifecycleSummaryText(lc: CopilotContext["lifecycle"]): string {
  const parts: string[] = [];
  if (lc.overdueCount > 0)      parts.push(`${lc.overdueCount} वटा documents update check गर्नुपर्ने भयो`);
  if (lc.annualReportCount > 0) parts.push(`${lc.annualReportCount} वटा वार्षिक प्रतिवेदन archive मा छन्`);
  if (lc.amendmentCount > 0)    parts.push(`${lc.amendmentCount} वटा कानून amendment monitoring मा छन्`);
  if (lc.needsTypeSet > 0)      parts.push(`${lc.needsTypeSet} documents को type set गर्नुपर्छ`);
  if (parts.length === 0)       return "सबै documents को lifecycle राम्रो छ";
  return parts.join(" · ");
}

function buildIntelligenceBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { pipeline, intelligence, branchHealth } = ctx;
  const tasks: ManagementTask[] = [];

  if (pipeline.pendingExtract > 0) {
    tasks.push(task(
      `${pipeline.pendingExtract} approved documents बाट intelligence extract गर्नुस्`,
      "intelligence", "urgent", "open",
      "Documents →", "/vault/documents",
      { costLevel: "medium", costNote: `~$${(pipeline.pendingExtract * 0.05).toFixed(2)} estimated` },
    ));
  }
  if (pipeline.pendingReview > 0) {
    tasks.push(task(
      `${pipeline.pendingReview} documents review र approve गर्नुस्`,
      "intelligence", "high", "open",
      "Admin Vault →", "/vault/admin",
    ));
  }
  if (branchHealth.emptyImportant.length > 0) {
    tasks.push(task(
      `${branchHealth.emptyImportant.length} महत्त्वपूर्ण branches खाली छन्`,
      "intelligence", "medium", "open",
      "Branch Health →", `/vault/constitution/health?part=${branchHealth.emptyImportant[0]}`,
    ));
  }

  const status: DepartmentStatus =
    pipeline.pendingExtract > 0      ? "needs_attention" :
    pipeline.pendingReview  > 0      ? "needs_attention" :
    intelligence.intelCount === 0    ? "critical"        :
    branchHealth.partsWithData < 10  ? "needs_attention" : "on_track";

  return {
    department:  "intelligence",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.intelligence,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("approved",    "Approved Documents",    "documents", pipeline.approved,          10,  "higher_is_better"),
      kv("intelCount",  "Intelligence Records",   "records",   intelligence.intelCount,    undefined, "higher_is_better"),
      kv("branches",    "Branches With Data",     "branches",  branchHealth.partsWithData, 35,  "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Intelligence pipeline राम्रो छ",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/documents",
    nextActionLabel: tasks[0]?.actionLabel ?? "Documents →",
  };
}

function buildResearchBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { sourceMonitoring, branchHealth } = ctx;
  const tasks: ManagementTask[] = [];

  if (sourceMonitoring.newUpdates > 0) {
    tasks.push(task(
      `${sourceMonitoring.newUpdates} नयाँ source updates review गर्नुस्`,
      "research", "high", "open",
      "Source Radar →", "/vault/sources",
    ));
  }
  if (branchHealth.emptyImportant.length > 0) {
    const p = branchHealth.emptyImportant[0];
    tasks.push(task(
      `Part ${p} को लागि document upload गर्नुस्`,
      "research", "medium", "open",
      "Documents Upload →", `/vault/documents?upload=1&parts=${p}`,
    ));
  }

  const status: DepartmentStatus =
    sourceMonitoring.newUpdates > 5  ? "needs_attention" :
    branchHealth.emptyImportant.length > 5 ? "needs_attention" : "on_track";

  return {
    department:  "research",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.research,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("watched",      "Watched Sources",        "sources",   sourceMonitoring.watchedSources, undefined, "higher_is_better"),
      kv("newUpdates",   "New Updates",             "updates",   sourceMonitoring.newUpdates,     0,         "lower_is_better"),
      kv("emptyImport",  "Empty Important Branches","branches",  branchHealth.emptyImportant.length, 0,     "lower_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Research queue खाली छ",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/sources",
    nextActionLabel: tasks[0]?.actionLabel ?? "Source Radar →",
  };
}

function buildContentBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { media } = ctx;
  const tasks: ManagementTask[] = [];

  if (media.readyAtoms > 0) {
    tasks.push(task(
      `${media.readyAtoms} scripts publish गर्न ready छन्`,
      "content", "high", "open",
      "Media Workspace →", "/vault/media",
    ));
  } else if (media.totalAtoms === 0) {
    tasks.push(task(
      "पहिलो media script generate गर्नुस्",
      "content", "medium", "open",
      "AI Studio →", "/vault/content/ai-studio",
    ));
  }

  const status: DepartmentStatus =
    media.readyAtoms > 3 ? "needs_attention" :
    media.totalAtoms === 0 ? "idle" : "on_track";

  return {
    department:  "content",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.content,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("ready",     "Scripts Ready",    "atoms",  media.readyAtoms,     undefined, "higher_is_better"),
      kv("published", "Published Atoms",  "atoms",  media.publishedAtoms, undefined, "higher_is_better"),
      kv("total",     "Total Media Atoms","atoms",  media.totalAtoms,     undefined, "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Content queue खाली छ",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/media",
    nextActionLabel: tasks[0]?.actionLabel ?? "Media →",
  };
}

function buildProductBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { branchHealth, intelligence } = ctx;
  const tasks: ManagementTask[] = [];

  if (branchHealth.partsWithData < 5) {
    tasks.push(task(
      "Public Constitution Tree मा data कम छ — पहिले intelligence pipeline run गर्नुस्",
      "product", "high", "open",
      "QA Sprint →", "/vault/qa",
    ));
  }
  tasks.push(task(
    "Public tree health check गर्नुस्",
    "product", "low", "open",
    "Public Tree →", "/constitution",
  ));

  const status: DepartmentStatus =
    branchHealth.partsWithData < 3   ? "critical" :
    branchHealth.partsWithData < 10  ? "needs_attention" :
    intelligence.intelCount < 10     ? "needs_attention" : "on_track";

  return {
    department:  "product",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.product,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("publicBranches", "Public Branches Active", "branches", branchHealth.partsWithData, 35, "higher_is_better"),
      kv("intelTotal",     "Intelligence Records",    "records",  intelligence.intelCount,             undefined, "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp,
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/products",
    nextActionLabel: tasks[0]?.actionLabel ?? "Products →",
  };
}

function buildGrowthBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { media, qa } = ctx;
  const tasks: ManagementTask[] = [];

  if (!qa.onTrack) {
    tasks.push(task(
      "QA Sprint पहिले पूरा गर्नुस् — content publish गर्न intelligence चाहिन्छ",
      "growth", "high", "open",
      "QA Sprint →", "/vault/qa",
    ));
  } else if (media.readyAtoms > 0) {
    tasks.push(task(
      `${media.readyAtoms} publish-ready atoms सामाजिक सञ्जालमा share गर्नुस्`,
      "growth", "high", "open",
      "Content Queue →", "/vault/content/queue",
    ));
  } else {
    tasks.push(task(
      "नयाँ civic content campaign plan गर्नुस्",
      "growth", "medium", "open",
      "Business →", "/vault/business",
    ));
  }

  const status: DepartmentStatus =
    !qa.onTrack          ? "idle" :
    media.readyAtoms > 0 ? "needs_attention" : "on_track";

  return {
    department:  "growth",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.growth,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("publishReady", "Publish-Ready Assets",  "atoms", media.readyAtoms,     undefined, "higher_is_better"),
      kv("published",    "Published Atoms",        "atoms", media.publishedAtoms, undefined, "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Growth queue review गर्नुस्",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/business",
    nextActionLabel: tasks[0]?.actionLabel ?? "Business →",
  };
}

function buildFinanceBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { costRisk, pipeline } = ctx;
  const tasks: ManagementTask[] = [];

  if (costRisk.paused > 0) {
    tasks.push(task(
      `${costRisk.paused} documents paused — billing issue छ`,
      "finance", "urgent", "open",
      "System Settings →", "/vault/system",
      { costLevel: "high" },
    ));
  }
  if (costRisk.pendingExtracts > 0) {
    tasks.push(task(
      `${costRisk.pendingExtracts} extracts pending — ${costRisk.roughCostNote}`,
      "finance", "medium", "open",
      "Documents →", "/vault/documents",
      { costLevel: "medium", costNote: costRisk.roughCostNote },
    ));
  }
  tasks.push(task(
    "Revenue readiness review गर्नुस्",
    "finance", "low", "open",
    "Revenue →", "/vault/revenue",
  ));

  const status: DepartmentStatus =
    costRisk.paused > 0           ? "critical" :
    costRisk.pendingExtracts > 10 ? "needs_attention" : "on_track";

  return {
    department:  "finance",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.finance,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("paused",          "Paused (Billing)", "documents", pipeline.aiPaused,          0,         "lower_is_better"),
      kv("pendingExtract",  "Pending Extracts", "documents", costRisk.pendingExtracts,   0,         "lower_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Cost profile राम्रो छ",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/finance",
    nextActionLabel: tasks[0]?.actionLabel ?? "Finance →",
  };
}

function buildStrategyBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { qa, intelligence } = ctx;
  const tasks: ManagementTask[] = [];

  tasks.push(task(
    "Vision Vault review र update गर्नुस्",
    "strategy", "medium", "open",
    "Vision Vault →", "/vault/vision",
  ));
  if (qa.onTrack && intelligence.intelCount > 50) {
    tasks.push(task(
      "Roadmap — अर्को phase decide गर्नुस्",
      "strategy", "medium", "open",
      "System Map →", "/vault/system-map",
    ));
  }

  const status: DepartmentStatus =
    qa.approvedDocs < 5 ? "idle" : "on_track";

  return {
    department:  "strategy",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.strategy,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("intelTotal", "Intelligence Foundation", "records",  intelligence.intelCount,    50, "higher_is_better"),
      kv("qaProgress", "QA Sprint Progress",       "documents", qa.approvedDocs,          10, "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp,
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/vision",
    nextActionLabel: tasks[0]?.actionLabel ?? "Vision Vault →",
  };
}

// ─── Bhakti briefing ─────────────────────────────────────────────────────────

function buildBhaktiBriefing(ctx: CopilotContext): DepartmentBriefing {
  const { temple } = ctx;
  const tasks: ManagementTask[] = [];

  if (temple.totalNotes === 0) {
    tasks.push(task(
      "Temple Vault मा पहिलो विचार थप्नुहोस्",
      "bhakti", "medium", "open",
      "मन्दिर →", "/vault/temple",
    ));
  }
  if (temple.reviewNotes > 0) {
    tasks.push(task(
      `${temple.reviewNotes} notes समीक्षामा छन् — Bhakti Chautari को लागि तयार गर्नुस्`,
      "bhakti", "medium", "open",
      "मन्दिर →", "/vault/temple",
      { costLevel: "none" },
    ));
  }
  if (temple.totalNotes > 5 && temple.bhaktiAtoms === 0) {
    tasks.push(task(
      "पहिलो bhakti atom create गर्नुस् — Bhakti Chautari Phase 4 तयारी",
      "bhakti", "low", "open",
      "मन्दिर →", "/vault/temple",
    ));
  }

  const status: DepartmentStatus =
    temple.reviewNotes > 0        ? "needs_attention" :
    temple.totalNotes  > 0        ? "on_track"        : "idle";

  return {
    department:  "bhakti",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.bhakti,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("templeNotes",    "Temple Notes",          "लेखन",   temple.totalNotes,    undefined, "higher_is_better"),
      kv("reviewNotes",    "समीक्षामा Notes",         "लेखन",   temple.reviewNotes,   0,         "lower_is_better"),
      kv("bhaktiAtoms",    "Bhakti Atoms (Phase 4)", "atoms",  temple.bhaktiAtoms,   undefined, "higher_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "Temple Vault चालू छ — लेख्नुहोस्",
    nextActionHref:  "/vault/temple",
    nextActionLabel: "मन्दिर →",
  };
}

// ─── QA briefing ──────────────────────────────────────────────────────────────

function buildQABriefing(ctx: CopilotContext): DepartmentBriefing {
  const { pipeline, qa, intelligence } = ctx;
  const tasks: ManagementTask[] = [];

  if (!qa.onTrack) {
    tasks.push(task(
      `QA Sprint: ${qa.approvedDocs}/${qa.target} — ${qa.target - qa.approvedDocs} documents बाँकी`,
      "qa", "urgent", "open",
      "QA Sprint →", "/vault/qa",
    ));
  }
  if (pipeline.pendingReview > 0) {
    tasks.push(task(
      `${pipeline.pendingReview} documents review pending — Admin Vault खोल्नुस्`,
      "qa", "high", "open",
      "Admin Vault →", "/vault/admin",
    ));
  }
  if (intelligence.lowConfidenceCount > 0) {
    tasks.push(task(
      `${intelligence.lowConfidenceCount} low-confidence records verify गर्नुस्`,
      "qa", "medium", "open",
      "Branch Health →", "/vault/constitution/health",
    ));
  }
  if (intelligence.brokenFramework > 0) {
    tasks.push(task(
      `${intelligence.brokenFramework} framework records repair गर्नुस्`,
      "qa", "medium", "open",
      "Constitution →", "/vault/constitution",
    ));
  }

  const status: DepartmentStatus =
    !qa.onTrack                         ? "needs_attention" :
    pipeline.pendingReview > 0          ? "needs_attention" :
    intelligence.lowConfidenceCount > 5 ? "needs_attention" : "on_track";

  return {
    department:  "qa",
    status,
    statusNp:    statusLabel(status),
    officer:     AI_OFFICERS.qa,
    topTasks:    tasks.slice(0, 3),
    blockers:    tasks.filter(t => t.status === "blocked"),
    kpis: [
      kv("qaProgress",   "QA Sprint",         "docs",    qa.approvedDocs,                 qa.target, "higher_is_better"),
      kv("pendingRev",   "Pending Review",      "docs",    pipeline.pendingReview,          0,         "lower_is_better"),
      kv("lowConf",      "Low-Confidence",      "records", intelligence.lowConfidenceCount, 0,         "lower_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? `QA Sprint ${qa.pct}% पूरा — राम्रो`,
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/qa",
    nextActionLabel: tasks[0]?.actionLabel ?? "QA Sprint →",
  };
}

// ─── Status label ─────────────────────────────────────────────────────────────

function statusLabel(s: DepartmentStatus): string {
  switch (s) {
    case "critical":         return "तुरुन्त हेर्नुस्";
    case "needs_attention":  return "ध्यान दिनुस्";
    case "on_track":         return "राम्रो";
    case "idle":             return "सक्रिय छैन";
  }
}

// ─── Work cycle ───────────────────────────────────────────────────────────────

function buildWorkCycle(
  briefings: DepartmentBriefing[],
  ctx:       CopilotContext,
): FounderWorkCycle {
  const byDept = Object.fromEntries(briefings.map(b => [b.department, b])) as
    Record<DepartmentId, DepartmentBriefing>;

  // Dynamic prioritization: operations/critical departments first
  const ordered = [...DEFAULT_WORK_ORDER].sort((a, b) => {
    const sa = byDept[a].status;
    const sb = byDept[b].status;
    const rank = (s: DepartmentStatus) =>
      s === "critical" ? 0 : s === "needs_attention" ? 1 : s === "on_track" ? 2 : 3;
    return rank(sa) - rank(sb);
  });

  const steps: FounderWorkStep[] = [];
  let order = 1;

  for (const deptId of ordered) {
    const b = byDept[deptId];
    if (b.status === "idle" && steps.length >= 5) continue; // max 6 steps, skip idle if full

    const topTask = b.topTasks[0];
    if (!topTask && b.status === "on_track") continue; // nothing to do

    const urgency: StepUrgency =
      b.status === "critical"        ? "must_do" :
      b.status === "needs_attention" ? "should_do" : "nice_to_have";

    const durationMins =
      deptId === "operations"   ? 10 :
      deptId === "intelligence" ? 20 :
      deptId === "research"     ? 15 :
      deptId === "content"      ? 15 :
      deptId === "finance"      ? 10 :
      deptId === "product"      ? 10 :
      deptId === "growth"       ? 15 :
      15;

    steps.push({
      order:            order++,
      department:       deptId,
      officer:          b.officer,
      durationMins,
      reason:           topTask?.titleNp ?? b.nextAction,
      primaryTask:      topTask?.titleNp ?? b.nextAction,
      actionLabel:      b.nextActionLabel,
      actionHref:       b.nextActionHref,
      successCondition: successFor(deptId, ctx),
      urgency,
      canSkip:          urgency === "nice_to_have",
      skipReason:       urgency === "nice_to_have" ? "भोलि पनि गर्न सकिन्छ" : undefined,
    });

    if (steps.length >= 6) break;
  }

  const mustDo    = steps.filter(s => s.urgency === "must_do").length;
  const shouldDo  = steps.filter(s => s.urgency === "should_do").length;
  const niceTo    = steps.filter(s => s.urgency === "nice_to_have").length;
  const totalMins = steps.reduce((a, s) => a + s.durationMins, 0);

  const topDecision = deriveTopDecision(ctx);

  return {
    generatedAt:    ctx.computedAt,
    totalSteps:     steps.length,
    totalMins,
    steps,
    topDecision,
    weekFocus:      deriveWeekFocus(ctx),
    mustDoSteps:    mustDo,
    shouldDoSteps:  shouldDo,
    niceToHaveSteps: niceTo,
  };
}

function successFor(dept: DepartmentId, ctx: CopilotContext): string {
  switch (dept) {
    case "operations":   return `AI Paused: 0, QA sprint ${ctx.qa.approvedDocs}/${ctx.qa.target}`;
    case "intelligence": return `Pending extract: 0, Pending review: 0`;
    case "research":     return `Source updates reviewed, empty branches addressed`;
    case "content":      return `Scripts approved वा published`;
    case "growth":       return `Content queue empty वा campaign active`;
    case "finance":      return `Paused documents: 0`;
    case "product":      return `Public tree checks passed`;
    case "strategy":     return `Vision Vault updated`;
    case "bhakti":       return `Temple notes reviewed, bhakti_atoms published`;
    case "qa":           return `QA sprint ${ctx.qa.approvedDocs}/${ctx.qa.target} complete`;
  }
}

function deriveTopDecision(ctx: CopilotContext): string | undefined {
  if (ctx.pipeline.aiPaused > 0) return "API key fix गर्ने वा documents delete गर्ने?";
  if (ctx.costRisk.pendingExtracts > 5)
    return `${ctx.costRisk.pendingExtracts} documents extract गर्ने? (${ctx.costRisk.roughCostNote})`;
  if (!ctx.qa.onTrack) return `QA Sprint यही साता complete गर्ने?`;
  return undefined;
}

function deriveWeekFocus(ctx: CopilotContext): string {
  if (ctx.pipeline.aiPaused > 0)   return "System stability — billing fix, zero paused documents";
  if (!ctx.qa.onTrack)              return `QA Sprint — ${ctx.qa.target - ctx.qa.approvedDocs} documents approve र extract गर्ने`;
  if (ctx.media.readyAtoms > 0)     return "Content publishing — ready atoms publish गर्ने";
  if (ctx.intelligence.intelCount < 20) return "Intelligence foundation — documents extract गर्ने";
  return "Quality र growth — pipeline stable, content amplify गर्ने";
}

// ─── COO Briefing — the orchestration voice ───────────────────────────────────
// Synthesizes ALL department states into a single directive message.
// This is what the founder reads FIRST. One sentence. No ambiguity.

let _testSeq = 0;
function testItem(
  title:       string,
  dept:        DepartmentId,
  testType:    TestItem["testType"],
  href:        string,
  description: string,
): TestItem {
  return {
    id:          `test_${++_testSeq}`,
    title,
    department:  dept,
    testType,
    status:      "pending",
    href,
    description,
  };
}

function buildTestingQueue(ctx: CopilotContext): TestItem[] {
  _testSeq = 0;
  const items: TestItem[] = [];

  // Temple Vault — recently built (Phase 2)
  items.push(testItem(
    "Temple Vault — mobile layout",
    "bhakti", "ui_test", "/vault/temple",
    "मोबाइलमा chamber cards र note editor overflow नभएको verify गर्नुस्",
  ));

  // Management OS — recently built
  items.push(testItem(
    "Management OS — 10 departments render",
    "qa", "ui_test", "/vault/management",
    "सबै 10 departments cards देखिन्छन्, COO panel सही छ",
  ));

  // Constitution pipeline — if documents present
  if (ctx.pipeline.approved > 0) {
    items.push(testItem(
      "Constitution extraction quality",
      "intelligence", "pipeline_test", "/vault/constitution/health",
      "Branch Health मा approved documents को intelligence records देखिन्छ",
    ));
  }

  // QA Sprint progress
  if (!ctx.qa.onTrack) {
    items.push(testItem(
      `QA Sprint — ${ctx.qa.approvedDocs}/${ctx.qa.target} complete`,
      "qa", "data_test", "/vault/qa",
      "QA Sprint page मा progress correct छ",
    ));
  }

  // Public Janta page — if intel exists
  if (ctx.intelligence.intelCount > 0) {
    items.push(testItem(
      "Public Janta page — story cards loading",
      "product", "ui_test", "/janta",
      "Story cards render हुन्छन्, TTS काम गर्छ",
    ));
  }

  return items;
}

function buildCOOBriefing(
  briefings: DepartmentBriefing[],
  ctx:       CopilotContext,
): COOBriefing {
  const criticalDepts   = briefings.filter(b => b.status === "critical");
  const attentionDepts  = briefings.filter(b => b.status === "needs_attention");
  const allIssues       = [...criticalDepts, ...attentionDepts];
  const totalBlockers   = briefings.reduce((n, b) => n + b.blockers.length, 0);

  const systemStatus =
    criticalDepts.length > 0  ? "critical" :
    attentionDepts.length > 0 ? "attention_needed" : "healthy";

  // The ONE focus sentence — what to do right now
  let focusStatement: string;
  const topCritical = criticalDepts[0];
  const topAttention = attentionDepts[0];

  if (topCritical) {
    const task = topCritical.topTasks[0];
    focusStatement = `तुरुन्त: ${task?.titleNp ?? topCritical.nextAction}`;
  } else if (topAttention) {
    const task = topAttention.topTasks[0];
    focusStatement = `आजको प्राथमिकता: ${task?.titleNp ?? topAttention.nextAction}`;
  } else {
    // All clear — suggest the highest value next action
    focusStatement = deriveWeekFocus(ctx);
  }

  // CTO feedback: 3-5 clean sentences summarizing operational state
  const ctoFeedback: string[] = [];

  // Pipeline
  if (ctx.pipeline.aiPaused > 0) {
    ctoFeedback.push(`${ctx.pipeline.aiPaused} documents AI processing रोकिएको छ — billing issue छ।`);
  } else if (ctx.pipeline.approved > 0) {
    ctoFeedback.push(`${ctx.pipeline.approved} documents approved — pipeline healthy।`);
  }

  // QA
  ctoFeedback.push(
    ctx.qa.onTrack
      ? `QA Sprint complete — ${ctx.qa.approvedDocs}/${ctx.qa.target} documents verified।`
      : `QA Sprint ${ctx.qa.pct}% — ${ctx.qa.target - ctx.qa.approvedDocs} documents बाँकी छन्।`,
  );

  // Intelligence
  if (ctx.intelligence.intelCount > 0) {
    ctoFeedback.push(`${ctx.intelligence.intelCount} intelligence records, ${ctx.branchHealth.partsWithData}/35 branches active।`);
  } else {
    ctoFeedback.push("Intelligence extraction शुरू भएको छैन — documents pipeline मा pending छन्।");
  }

  // Temple/Bhakti
  if (ctx.temple.totalNotes > 0) {
    const reviewNote = ctx.temple.reviewNotes > 0
      ? ` ${ctx.temple.reviewNotes} notes समीक्षामा।`
      : "";
    ctoFeedback.push(`Temple Vault: ${ctx.temple.totalNotes} notes active।${reviewNote}`);
  } else {
    ctoFeedback.push("Temple Vault Phase 2 stable — content अझ थपिएको छैन।");
  }

  // Overall
  if (systemStatus === "healthy") {
    ctoFeedback.push("सबै systems stable छन् — अर्को phase तर्फ बढ्न सकिन्छ।");
  } else {
    ctoFeedback.push(`${allIssues.length} department(s) ध्यान माग्दैछन्।`);
  }

  const operationalNote =
    systemStatus === "healthy"         ? "सबै 10 departments चालू छन् — system स्वस्थ छ।" :
    systemStatus === "attention_needed" ? `${attentionDepts.length} department(s) ध्यान माग्छन् — critical छैन।` :
                                          `${criticalDepts.length} critical issue — तुरुन्त action आवश्यक।`;

  const systemStatusNp =
    systemStatus === "healthy"          ? "सबै राम्रो" :
    systemStatus === "attention_needed" ? "ध्यान दिनुस्" : "तुरुन्त हेर्नुस्";

  return {
    focusStatement,
    systemStatus,
    systemStatusNp,
    attentionCount: allIssues.length,
    criticalCount:  criticalDepts.length,
    blockerCount:   totalBlockers,
    testingItems:   buildTestingQueue(ctx),
    ctoFeedback,
    operationalNote,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildManagementOS(ctx: CopilotContext): ManagementOSState {
  _taskSeq = 0;
  _testSeq = 0;

  const start = Date.now();

  const briefings: DepartmentBriefing[] = [
    buildOperationsBriefing(ctx),
    buildQABriefing(ctx),
    buildIntelligenceBriefing(ctx),
    buildResearchBriefing(ctx),
    buildContentBriefing(ctx),
    buildBhaktiBriefing(ctx),
    buildGrowthBriefing(ctx),
    buildFinanceBriefing(ctx),
    buildProductBriefing(ctx),
    buildStrategyBriefing(ctx),
  ];

  const cooBriefing   = buildCOOBriefing(briefings, ctx);
  const cycle         = buildWorkCycle(briefings, ctx);
  const urgentCount   = briefings.filter(b => b.status === "critical").length;
  const blockerCount  = briefings.reduce((n, b) => n + b.blockers.length, 0);
  const openDecisions = cycle.topDecision ? [cycle.topDecision] : [];

  return {
    cooBriefing,
    cycle,
    departments:   briefings,
    urgentCount,
    blockerCount,
    openDecisions,
    computedAt:    ctx.computedAt,
    durationMs:    Date.now() - start,
  };
}
