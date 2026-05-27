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
  type DepartmentBriefing,
  type DepartmentId,
  type DepartmentStatus,
  type FounderWorkCycle,
  type FounderWorkStep,
  type KPIValue,
  type ManagementOSState,
  type ManagementTask,
  type StepUrgency,
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
  const { pipeline, costRisk, qa } = ctx;
  const tasks: ManagementTask[] = [];

  if (pipeline.aiPaused > 0) {
    tasks.push(task(
      `${pipeline.aiPaused} documents ai_paused — API key हेर्नुस्`,
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

  const status: DepartmentStatus =
    pipeline.aiPaused > 0            ? "critical" :
    pipeline.pendingAI > 0           ? "needs_attention" :
    !qa.onTrack                       ? "needs_attention" :
    costRisk.pendingExtracts > 0      ? "needs_attention" : "on_track";

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
      kv("pendingExtract","Extract Pending",     "documents",  costRisk.pendingExtracts, 0,  "lower_is_better"),
    ],
    nextAction:      tasks[0]?.titleNp ?? "सबै systems राम्रो छन्",
    nextActionHref:  tasks[0]?.actionHref ?? "/vault/qa",
    nextActionLabel: tasks[0]?.actionLabel ?? "QA Sprint →",
  };
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

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildManagementOS(ctx: CopilotContext): ManagementOSState {
  _taskSeq = 0; // reset per-call so IDs are deterministic

  const start = Date.now();

  const briefings: DepartmentBriefing[] = [
    buildOperationsBriefing(ctx),
    buildIntelligenceBriefing(ctx),
    buildResearchBriefing(ctx),
    buildContentBriefing(ctx),
    buildProductBriefing(ctx),
    buildGrowthBriefing(ctx),
    buildFinanceBriefing(ctx),
    buildStrategyBriefing(ctx),
  ];

  const cycle = buildWorkCycle(briefings, ctx);

  const urgentCount   = briefings.filter(b => b.status === "critical").length;
  const blockerCount  = briefings.reduce((n, b) => n + b.blockers.length, 0);
  const openDecisions = cycle.topDecision ? [cycle.topDecision] : [];

  return {
    cycle,
    departments:   briefings,
    urgentCount,
    blockerCount,
    openDecisions,
    computedAt:    ctx.computedAt,
    durationMs:    Date.now() - start,
  };
}
