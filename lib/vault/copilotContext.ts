/**
 * Copilot Context Engine — Founder Operating Intelligence Layer.
 *
 * buildCopilotContext() reads all relevant Firestore collections and produces
 * a unified CopilotContext. No AI calls — pure metadata aggregation.
 *
 * This module is UI-agnostic. The same context object can drive:
 * - CTOAssistant panel in vault
 * - Future mobile app
 * - Future voice assistant
 * - Future analytics dashboard
 * - Founder daily briefing
 */

import {
  collection, getDocs, query, where, limit,
  type Firestore,
} from "firebase/firestore";

// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface PipelineState {
  totalDocs:         number;
  pendingAI:         number;   // processingStatus === "ready" and no aiSummary
  pendingReview:     number;   // ai_ready + pending_review
  approved:          number;
  pendingExtract:    number;   // approved + 0 intel records
  aiPaused:          number;   // billing/quota fail — document safe
  recentDocTitles:   string[]; // last 3 uploaded (for context)
  approvedTitles:    string[];
  neverAnalyzedTitles: string[];
}

export interface IntelligenceState {
  frameworkCount:      number;  // constitutional_framework
  intelCount:          number;  // janta_intelligence
  relationshipCount:   number;  // janta_relationships
  brokenFramework:     number;  // partNumber === 0 records
  lowConfidenceCount:  number;  // confidence < 0.6
}

export interface BranchHealthSummary {
  partsWithData:  number;  // framework or intel records mapped to part
  emptyParts:     number[];
  emptyImportant: number[]; // subset: [3,4,5,7,11,23,27,28,29,30]
  weakestPart:    number | null;
}

export interface SourceMonitoringState {
  watchedSources:  number;
  newUpdates:      number;  // status === "new"
  pendingReview:   number;  // status === "reviewed" but not uploaded
  sourceIds:       string[]; // sources with new updates
}

export interface MediaState {
  totalAtoms:    number;
  readyAtoms:    number;  // script generated, not published
  publishedAtoms:number;
}

export interface CostRiskState {
  pendingExtracts: number;   // approved + no intel → each costs AI
  paused:          number;   // billing failures
  roughCostNote:   string;   // human-readable cost note
}

export interface QAProgress {
  approvedDocs:  number;
  target:        number;  // 10
  pct:           number;  // 0–100
  onTrack:       boolean;
}

export interface EntrepreneurSummary {
  todayLeverage:      string;  // single highest-value action right now
  todayAction:        string;  // href for today's action
  weekPriority:       string;  // strategic focus this week
  weekAction:         string;  // href for week priority action
  systemRisk:         string;  // biggest current risk
  riskAction:         string;  // href for risk mitigation
  growthOpportunity:  string;  // highest potential growth vector
  growthAction:       string;  // href for growth opportunity
  contentOpportunity: string;  // what content could be created now
  contentAction:      string;  // href for content opportunity
  dataGap:            string;  // most important missing intelligence
  dataGapAction:      string;  // href for data gap action
  founderNote:        string;  // one sentence synthesis
}

// ─── Master context type ──────────────────────────────────────────────────────

export interface CopilotContext {
  pipeline:         PipelineState;
  intelligence:     IntelligenceState;
  branchHealth:     BranchHealthSummary;
  sourceMonitoring: SourceMonitoringState;
  media:            MediaState;
  costRisk:         CostRiskState;
  qa:               QAProgress;
  entrepreneur:     EntrepreneurSummary;

  // Page-aware guidance cache (keyed by route prefix)
  pageHints:        Record<string, string[]>;

  // Metadata
  computedAt:   string;
  durationMs:   number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QA_TARGET          = 10;
const IMPORTANT_PARTS    = [3, 4, 5, 7, 11, 23, 24, 25, 26, 27, 28, 29, 30];

// ─── Builder ──────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[copilotContext]", e?.code ?? e); return fb; });

const EMPTY_SNAP = { docs: [], size: 0 } as unknown as import("firebase/firestore").QuerySnapshot;

export async function buildCopilotContext(
  uid:      string,
  firestoreDb: Firestore,
): Promise<CopilotContext> {
  const start = Date.now();
  const q = (col: string, lim = 500) =>
    getDocs(query(collection(firestoreDb, col), where("ownerId", "==", uid), limit(lim)));

  // ── Parallel reads ─────────────────────────────────────────────────────────
  const [
    docsSnap,
    intelSnap,
    frameworkSnap,
    relSnap,
    mediaSnap,
    watcherSnap,
    updateSnap,
  ] = await Promise.all([
    safe(q("vault_documents",         200), EMPTY_SNAP),
    safe(q("janta_intelligence",      500), EMPTY_SNAP),
    safe(q("constitutional_framework",500), EMPTY_SNAP),
    safe(q("janta_relationships",     200), EMPTY_SNAP),
    safe(q("media_atoms",             100), EMPTY_SNAP),
    safe(q("monitored_sources",       100), EMPTY_SNAP),
    safe(q("source_updates",          200), EMPTY_SNAP),
  ]);

  // ── Pipeline state ─────────────────────────────────────────────────────────

  interface DocRow { id: string; [k: string]: unknown }
  const docs: DocRow[] = (docsSnap.docs ?? [])
    .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as DocRow))
    .filter(d => !d.archived);

  const pendingAI    = docs.filter(d => d.processingStatus === "ready" && !d.aiSummary);
  const pendingRev   = docs.filter(d =>
    d.processingStatus === "ai_ready" &&
    (!d.adminApprovalStatus || d.adminApprovalStatus === "pending_review"),
  );
  const approved     = docs.filter(d => d.adminApprovalStatus === "approved");
  const paused       = docs.filter(d => d.processingStatus === "ai_paused");

  const intelByDoc: Record<string, number> = {};
  let lowConf = 0;
  (intelSnap.docs ?? []).forEach(d => {
    const data = d.data() as Record<string, unknown>;
    const srcId = data.sourceDocId as string | undefined;
    if (srcId) intelByDoc[srcId] = (intelByDoc[srcId] ?? 0) + 1;
    if (typeof data.confidence === "number" && data.confidence < 0.6) lowConf++;
  });

  const pendingExtract = approved.filter(d => (intelByDoc[d.id] ?? 0) === 0);

  const title = (d: DocRow) => String(d.title ?? d.fileName ?? "Untitled");

  const pipeline: PipelineState = {
    totalDocs:           docs.length,
    pendingAI:           pendingAI.length,
    pendingReview:       pendingRev.length,
    approved:            approved.length,
    pendingExtract:      pendingExtract.length,
    aiPaused:            paused.length,
    recentDocTitles:     docs.slice(-3).map(title).reverse(),
    approvedTitles:      approved.slice(0, 3).map(title),
    neverAnalyzedTitles: pendingAI.slice(0, 2).map(title),
  };

  // ── Intelligence state ─────────────────────────────────────────────────────

  let brokenFramework = 0;
  const partCounts = new Map<number, number>();
  (frameworkSnap.docs ?? []).forEach(d => {
    const pn = (d.data() as Record<string, unknown>).partNumber as number | undefined;
    if (typeof pn === "number" && pn > 0) {
      partCounts.set(pn, (partCounts.get(pn) ?? 0) + 1);
    } else if (pn === 0) {
      const partStr = (d.data() as Record<string, unknown>).part as string | undefined;
      if (partStr) {
        // Has a `part` string ("भाग ३") — Repair can parse and fix this.
        brokenFramework++;
      }
      // pn===0 with no part string: unclassifiable — repair cannot fix, no insight generated.
    }
  });

  const intelligence: IntelligenceState = {
    frameworkCount:      frameworkSnap.size ?? 0,
    intelCount:          intelSnap.size ?? 0,
    relationshipCount:   relSnap.size ?? 0,
    brokenFramework,
    lowConfidenceCount:  lowConf,
  };

  // ── Branch health summary ──────────────────────────────────────────────────

  const emptyParts: number[] = [];
  for (let p = 1; p <= 35; p++) {
    if ((partCounts.get(p) ?? 0) === 0) emptyParts.push(p);
  }
  const emptyImportant = emptyParts.filter(p => IMPORTANT_PARTS.includes(p));

  // Weakest part = important part with fewest records (non-zero but lowest)
  let weakestPart: number | null = null;
  let weakestCount = Infinity;
  for (const p of IMPORTANT_PARTS) {
    const ct = partCounts.get(p) ?? 0;
    if (ct > 0 && ct < weakestCount) { weakestCount = ct; weakestPart = p; }
  }
  if (!weakestPart && IMPORTANT_PARTS.some(p => emptyParts.includes(p))) {
    weakestPart = IMPORTANT_PARTS.find(p => emptyParts.includes(p)) ?? null;
  }

  const branchHealth: BranchHealthSummary = {
    partsWithData:  35 - emptyParts.length,
    emptyParts,
    emptyImportant,
    weakestPart,
  };

  // ── Source monitoring ──────────────────────────────────────────────────────

  const watcherDocs = (watcherSnap.docs ?? []).map(d => d.data() as Record<string, unknown>);
  const updateDocs  = (updateSnap.docs  ?? []).map(d => d.data() as Record<string, unknown>);
  const newUpdates  = updateDocs.filter(u => u.status === "new");
  const reviewedUpdates = updateDocs.filter(u => u.status === "reviewed");

  const sourceMonitoring: SourceMonitoringState = {
    watchedSources:  watcherDocs.length,
    newUpdates:      newUpdates.length,
    pendingReview:   reviewedUpdates.length,
    sourceIds:       [...new Set(newUpdates.map(u => String(u.sourceId ?? "")))],
  };

  // ── Media state ────────────────────────────────────────────────────────────

  const mediaDocs = (mediaSnap.docs ?? []).map(d => d.data() as Record<string, unknown>);
  const media: MediaState = {
    totalAtoms:     mediaDocs.length,
    readyAtoms:     mediaDocs.filter(m => m.status === "ready" || m.status === "script_ready").length,
    publishedAtoms: mediaDocs.filter(m => m.status === "published").length,
  };

  // ── Cost risk ──────────────────────────────────────────────────────────────

  const roughCost = pendingExtract.length === 0
    ? "कुनै pending AI cost छैन"
    : `${pendingExtract.length} documents extract गर्न ≈ ${Math.ceil(pendingExtract.length * 0.05 * 100) / 100} USD (~NPR ${Math.ceil(pendingExtract.length * 0.05 * 135)})`;

  const costRisk: CostRiskState = {
    pendingExtracts: pendingExtract.length,
    paused:          paused.length,
    roughCostNote:   roughCost,
  };

  // ── QA progress ───────────────────────────────────────────────────────────

  const qa: QAProgress = {
    approvedDocs: approved.length,
    target:       QA_TARGET,
    pct:          Math.min(100, Math.round((approved.length / QA_TARGET) * 100)),
    onTrack:      approved.length >= QA_TARGET,
  };

  // ── Entrepreneur summary ──────────────────────────────────────────────────

  const entrepreneur = deriveEntrepreneur({
    pipeline, intelligence, branchHealth, sourceMonitoring, media, costRisk, qa,
  });

  // ── Page hints ────────────────────────────────────────────────────────────

  const pageHints = buildPageHints({ pipeline, intelligence, branchHealth, sourceMonitoring, media });

  return {
    pipeline,
    intelligence,
    branchHealth,
    sourceMonitoring,
    media,
    costRisk,
    qa,
    entrepreneur,
    pageHints,
    computedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function partToGovFolder(p: number): string {
  if (p >= 1 && p <= 3) return "constitution";
  if (p === 4)          return "policy-planning";
  if (p >= 5 && p <= 7) return "parliament";
  if (p === 8)          return "budget-economy";
  if (p >= 9 && p <= 10) return "judiciary";
  if (p >= 11 && p <= 22) return "local-governance";
  if (p === 23)          return "budget-economy";
  if (p >= 24 && p <= 27) return "policy-planning";
  if (p >= 28 && p <= 30) return "citizen-intelligence";
  return "constitution";
}

function uploadUrl(partNumber: number, extraTags?: string): string {
  const gf = partToGovFolder(partNumber);
  const p  = new URLSearchParams({ upload: "1", parts: String(partNumber), govFolder: gf });
  if (extraTags) p.set("tags", extraTags);
  return `/vault/documents?${p.toString()}`;
}

// ─── Entrepreneur summary derivation ─────────────────────────────────────────

function deriveEntrepreneur(parts: {
  pipeline:         PipelineState;
  intelligence:     IntelligenceState;
  branchHealth:     BranchHealthSummary;
  sourceMonitoring: SourceMonitoringState;
  media:            MediaState;
  costRisk:         CostRiskState;
  qa:               QAProgress;
}): EntrepreneurSummary {
  const { pipeline, intelligence, branchHealth, sourceMonitoring, media, qa } = parts;

  const PART_LABELS: Record<number, string> = {
    3: "मौलिक हक", 4: "निर्देशक सिद्धान्त", 5: "राज्य संरचना", 7: "कार्यपालिका",
    11: "न्यायपालिका", 23: "वित्त", 24: "CIAA", 25: "महालेखापरीक्षक",
    26: "लोक सेवा", 27: "निर्वाचन", 28: "मानव अधिकार", 29: "महिला", 30: "दलित",
  };

  // Today's highest leverage action
  let todayLeverage: string;
  let todayAction: string;
  if (pipeline.pendingAI > 0) {
    todayLeverage = `${pipeline.pendingAI} document AI analyze गर्नुहोस् — pipeline अड्किएको छ`;
    todayAction   = "/vault/documents";
  } else if (pipeline.pendingReview > 0) {
    todayLeverage = `${pipeline.pendingReview} document review गर्नुहोस् — intelligence quarantine मा छ`;
    todayAction   = "/vault/admin?tab=documents";
  } else if (pipeline.pendingExtract > 0) {
    todayLeverage = `${pipeline.pendingExtract} documents बाट intelligence extract गर्नुहोस्`;
    todayAction   = "/vault/documents";
  } else if (sourceMonitoring.newUpdates > 0) {
    todayLeverage = `${sourceMonitoring.newUpdates} नयाँ official updates review गर्नुहोस् र upload गर्नुहोस्`;
    todayAction   = "/vault/sources";
  } else if (branchHealth.emptyImportant.length > 0) {
    const firstPart = branchHealth.emptyImportant[0]!;
    todayLeverage = `भाग ${branchHealth.emptyImportant.slice(0, 3).map(p => PART_LABELS[p] ?? `भाग ${p}`).join(", ")} का documents upload गर्नुहोस्`;
    todayAction   = uploadUrl(firstPart);
  } else {
    todayLeverage = "Branch Health हेर्नुस् — अर्को कमजोर branch identify गर्नुस्";
    todayAction   = "/vault/constitution/health";
  }

  // Week priority
  let weekPriority: string;
  let weekAction: string;
  if (!qa.onTrack) {
    const remaining = qa.target - qa.approvedDocs;
    weekPriority = `QA Sprint: ${remaining} थप documents approve र extract गर्नुहोस् (${qa.pct}% पूरा)`;
    weekAction   = "/vault/qa";
  } else if (intelligence.intelCount < 200) {
    weekPriority = "Intelligence base बढाउनुहोस् — content बनाउन कम्तिमा 200 records चाहिन्छ";
    weekAction   = "/vault/documents";
  } else if (media.readyAtoms > 0) {
    weekPriority = `${media.readyAtoms} media scripts publish गर्नुहोस् — public reach बढाउनुहोस्`;
    weekAction   = "/vault/media";
  } else {
    weekPriority = "New documents upload + intelligence graph expand गर्नुहोस्";
    weekAction   = "/vault/documents";
  }

  // System risk
  let systemRisk: string;
  let riskAction: string;
  if (parts.costRisk.paused > 0) {
    systemRisk = `AI billing issue — ${parts.costRisk.paused} documents paused। API key check गर्नुहोस्।`;
    riskAction = "/vault/system";
  } else if (intelligence.brokenFramework > 50) {
    systemRisk = `${intelligence.brokenFramework} framework records broken — Branch Health data गलत देखिन्छ`;
    riskAction = "/vault/constitution";
  } else if (intelligence.frameworkCount === 0) {
    systemRisk = "Constitution Framework खाली छ — civic intelligence system को जग नै छैन";
    riskAction = "/vault/documents";
  } else {
    systemRisk = "कुनै critical system risk छैन";
    riskAction = "/vault/constitution/health";
  }

  // Growth opportunity
  let growthOpportunity: string;
  let growthAction: string;
  if (intelligence.intelCount > 300 && media.totalAtoms === 0) {
    growthOpportunity = "Enough intelligence exists — media content सुरु गर्न सकिन्छ";
    growthAction      = "/vault/media";
  } else if (branchHealth.partsWithData >= 20) {
    growthOpportunity = `${branchHealth.partsWithData}/35 branches active — public tree launch गर्न सकिन्छ`;
    growthAction      = "/vault/constitution";
  } else if (qa.onTrack) {
    growthOpportunity = "QA sprint पूरा — signal center र public content phase सुरु गर्न सकिन्छ";
    growthAction      = "/vault/qa";
  } else {
    growthOpportunity = `QA sprint सकिएपछि (${qa.approvedDocs}/${qa.target}) सबै growth paths खुल्छन्`;
    growthAction      = "/vault/qa";
  }

  // Content opportunity
  let contentOpportunity: string;
  let contentAction: string;
  if (intelligence.intelCount > 100) {
    const strongParts = IMPORTANT_PARTS.filter(p => !branchHealth.emptyParts.includes(p));
    if (strongParts.length > 0) {
      const named = strongParts.slice(0, 2).map(p => PART_LABELS[p] ?? `भाग ${p}`).join(", ");
      contentOpportunity = `${named} — यी topics मा strong data छ, content बनाउन तयार`;
      contentAction      = "/vault/media";
    } else {
      contentOpportunity = "Intelligence base बढाउँदैछ — content बनाउन अझ data चाहिन्छ";
      contentAction      = "/vault/documents";
    }
  } else {
    contentOpportunity = "Intelligence records कम छन् — पहिले pipeline build गर्नुहोस्";
    contentAction      = "/vault/documents";
  }

  // Data gap
  let dataGap: string;
  let dataGapAction: string;
  if (branchHealth.emptyImportant.length > 0) {
    const firstPart = branchHealth.emptyImportant[0]!;
    const named = branchHealth.emptyImportant.slice(0, 3).map(p => PART_LABELS[p] ?? `भाग ${p}`).join(", ");
    dataGap       = `${named} — यी महत्त्वपूर्ण भागमा intelligence छैन`;
    dataGapAction = `/vault/constitution/health?part=${firstPart}`;
  } else if (intelligence.intelCount === 0) {
    dataGap       = "सम्पूर्ण intelligence graph खाली — पहिलो document approve र extract गर्नुहोस्";
    dataGapAction = "/vault/documents";
  } else {
    dataGap       = "Core branches covered — secondary branches fill गर्दैछ";
    dataGapAction = "/vault/constitution/health";
  }

  // Founder note
  let founderNote: string;
  if (pipeline.pendingAI > 0 || pipeline.pendingReview > 0) {
    founderNote = "Pipeline अड्किएको छ — एक एक step clear गर्दा intelligence graph बढ्छ।";
  } else if (!qa.onTrack) {
    founderNote = "QA sprint priority — real documents through pipeline prove गर्नुहोस्।";
  } else if (intelligence.intelCount > 200) {
    founderNote = "Foundation strong छ — अब expression layer (content, public tree) focus गर्नुहोस्।";
  } else {
    founderNote = "Infrastructure phase — दुरुस्त बनाउँदैछ, acceleration नजिकै छ।";
  }

  return {
    todayLeverage, todayAction,
    weekPriority,  weekAction,
    systemRisk,    riskAction,
    growthOpportunity, growthAction,
    contentOpportunity, contentAction,
    dataGap,       dataGapAction,
    founderNote,
  };
}

// ─── Page hints ───────────────────────────────────────────────────────────────

function buildPageHints(parts: {
  pipeline:         PipelineState;
  intelligence:     IntelligenceState;
  branchHealth:     BranchHealthSummary;
  sourceMonitoring: SourceMonitoringState;
  media:            MediaState;
}): Record<string, string[]> {
  const { pipeline, intelligence, branchHealth, sourceMonitoring, media } = parts;
  const hints: Record<string, string[]> = {};

  // /vault/documents
  const docHints: string[] = [];
  if (pipeline.pendingAI > 0)      docHints.push(`${pipeline.pendingAI} document AI analyze पर्खिरहेका छन्।`);
  if (pipeline.pendingReview > 0)  docHints.push(`${pipeline.pendingReview} document Admin review पर्खिरहेका छन्।`);
  if (pipeline.pendingExtract > 0) docHints.push(`${pipeline.pendingExtract} approved documents Intelligence extract पर्खिरहेका छन्।`);
  if (pipeline.aiPaused > 0)       docHints.push(`${pipeline.aiPaused} documents AI billing fail — system settings check गर्नुहोस्।`);
  if (docHints.length === 0)       docHints.push("Pipeline clear छ — नयाँ document upload गर्नुहोस्।");
  hints["/vault/documents"] = docHints;

  // /vault/constitution
  const constHints: string[] = [];
  if (intelligence.brokenFramework > 0) constHints.push(`${intelligence.brokenFramework} framework records partNumber=0 — Repair button थिच्नुहोस्।`);
  if (intelligence.frameworkCount === 0) constHints.push("संविधान PDF upload र extract गरिएको छैन।");
  else constHints.push(`${intelligence.frameworkCount} framework records, ${branchHealth.partsWithData}/35 branches active।`);
  hints["/vault/constitution"] = constHints;

  // /vault/constitution/health
  const healthHints: string[] = [];
  if (branchHealth.emptyImportant.length > 0) {
    healthHints.push(`भाग ${branchHealth.emptyImportant.slice(0, 4).join(", ")} — महत्त्वपूर्ण भागमा intelligence छैन।`);
  }
  if (branchHealth.weakestPart) {
    healthHints.push(`भाग ${branchHealth.weakestPart} सबैभन्दा कमजोर — यसका documents upload गर्नुहोस्।`);
  }
  if (healthHints.length === 0) healthHints.push(`${branchHealth.partsWithData}/35 branches मा data छ।`);
  hints["/vault/constitution/health"] = healthHints;

  // /vault/sources
  const srcHints: string[] = [];
  if (sourceMonitoring.newUpdates > 0)  srcHints.push(`${sourceMonitoring.newUpdates} नयाँ official updates — review गरी upload गर्नुहोस्।`);
  if (sourceMonitoring.watchedSources === 0) srcHints.push("अझै कुनै स्रोत watch गरिएको छैन — महत्त्वपूर्ण स्रोतहरूमा + Watch थप्नुहोस्।");
  else srcHints.push(`${sourceMonitoring.watchedSources} स्रोतहरू monitored छन्।`);
  hints["/vault/sources"] = srcHints;

  // /vault/media
  const mediaHints: string[] = [];
  if (media.readyAtoms > 0)  mediaHints.push(`${media.readyAtoms} media scripts publish पर्खिरहेका छन्।`);
  if (media.totalAtoms === 0) mediaHints.push("अझै कुनै media atom छैन — intelligence बाट content generate गर्नुहोस्।");
  hints["/vault/media"] = mediaHints;

  // /vault (overview)
  const overviewHints: string[] = [];
  if (pipeline.totalDocs === 0) overviewHints.push("पहिलो civic document upload गर्नुहोस् र pipeline सुरु गर्नुहोस्।");
  else overviewHints.push(`${pipeline.totalDocs} documents · ${intelligence.intelCount} intelligence records · ${branchHealth.partsWithData}/35 branches।`);
  hints["/vault"] = overviewHints;

  return hints;
}
