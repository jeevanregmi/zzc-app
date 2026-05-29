/**
 * ZZC Knowledge Priority Classifier
 *
 * Rule-based, deterministic, zero-cost — no AI required.
 * Runs instantly in the browser. Classifies every document into a knowledge tier
 * and produces an atomic extraction priority queue.
 *
 * Knowledge tiers (in priority order):
 *   foundation   — Constitution, core laws, sacred texts — permanent infrastructure
 *   national     — CIAA, NHRC, NRB, Auditor General, Budget — annual intel assets
 *   strategic    — Sectoral reports, commission studies, research
 *   operational  — Ministry routine documents, local governance
 *   archive      — Low-value historical — no atomic unless founder explicitly approves
 *
 * Atomic extraction recommendation:
 *   foundation + national → atomicRecommended: true (always)
 *   strategic             → atomicRecommended: false (founder decides)
 *   operational + archive → atomicRecommended: false
 */

import type { KnowledgeTier } from "../types/documents";

// ── Classification result ─────────────────────────────────────────────────────

export interface KnowledgePriorityResult {
  tier:              KnowledgeTier;
  score:             number;    // 0-100 — higher = extract first
  atomicRecommended: boolean;
  reason:            string;    // one-line explanation for founder
}

// ── Tier metadata (UI labels, colors) ────────────────────────────────────────

export const KNOWLEDGE_TIER_META: Record<KnowledgeTier, {
  np:     string;
  en:     string;
  color:  string;
  bg:     string;
  border: string;
  dot:    string;
}> = {
  foundation:  { np: "आधारशिला", en: "Foundation",  color: "text-amber-300",  bg: "bg-amber-950/40",  border: "border-amber-700/60",  dot: "bg-amber-400"  },
  national:    { np: "राष्ट्रिय", en: "National",    color: "text-blue-300",   bg: "bg-blue-950/40",   border: "border-blue-700/60",   dot: "bg-blue-400"   },
  strategic:   { np: "रणनीतिक",  en: "Strategic",   color: "text-violet-300", bg: "bg-violet-950/40", border: "border-violet-700/60", dot: "bg-violet-400" },
  operational: { np: "संचालन",   en: "Operational", color: "text-zinc-400",   bg: "bg-zinc-900/40",   border: "border-zinc-700/60",   dot: "bg-zinc-500"   },
  archive:     { np: "सङ्ग्रह",   en: "Archive",     color: "text-zinc-600",   bg: "bg-zinc-900/20",   border: "border-zinc-800/40",   dot: "bg-zinc-700"   },
};

export const TIER_PRIORITY: Record<KnowledgeTier, number> = {
  foundation: 5, national: 4, strategic: 3, operational: 2, archive: 1,
};

// ── Cost estimate ─────────────────────────────────────────────────────────────

export function estimateAtomicCostUSD(pageCount: number | undefined, fileSizeBytes: number): number {
  const pages = pageCount ?? Math.ceil(fileSizeBytes / 2500);
  return Math.max(0.10, Math.ceil(pages / 100) * 0.15);
}

export function formatCost(usd: number): string {
  return `~$${usd.toFixed(2)}`;
}

// ── Rule-based classifier ─────────────────────────────────────────────────────

function matchAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

export function classifyDocument(doc: {
  title?:           string;
  fileName?:        string;
  sourceAuthority?: string;
  institutionName?: string;
  govFolder?:       string;
  sourceType?:      string;
  tags?:            string[];
  category?:        string;
  description?:     string;
}): KnowledgePriorityResult {

  const corpus = [
    doc.title ?? "",
    doc.fileName ?? "",
    doc.sourceAuthority ?? "",
    doc.institutionName ?? "",
    doc.description ?? "",
    ...(doc.tags ?? []),
  ].join(" ").toLowerCase();

  // ── FOUNDATION ───────────────────────────────────────────────────────────────
  // Constitution, foundational civic laws, sacred texts

  if (doc.govFolder === "constitution" || matchAny(corpus, [
    /constitution of nepal/,
    /nepal ko sambidhan/,
    /संविधान/,
    /नेपालको संविधान/,
    /samvidhan/,
    /constitutional amendment/,
    /sambidhan sansodhan/,
  ])) {
    return { tier: "foundation", score: 100, atomicRecommended: true,
      reason: "Constitutional document — permanent civic infrastructure" };
  }

  // Foundational Acts
  if (matchAny(corpus, [
    /local government operation act/,
    /civil service act/,
    /education act/,
    /procurement act/,
    /governance act/,
    /fundamental law/,
    /सुशासन ऐन/,
    /स्थानीय सरकार संचालन ऐन/,
    /निजामती सेवा ऐन/,
  ])) {
    return { tier: "foundation", score: 95, atomicRecommended: true,
      reason: "Foundational governance law — permanent infrastructure" };
  }

  // Spiritual foundation texts
  if (matchAny(corpus, [
    /bhagavad gita/,
    /bhagwad gita/,
    /गीता/,
    /श्रीमद्भगवद/,
    /srimad bhagavatam/,
    /upanishad/,
    /उपनिषद/,
    /shankaracharya/,
    /शंकराचार्य/,
    /advaita vedanta/,
    /rudrashtakam/,
    /nirvana shatakam/,
    /brahmasutra/,
    /adi shankar/,
  ])) {
    return { tier: "foundation", score: 98, atomicRecommended: true,
      reason: "Foundational spiritual text — permanent bhakti intelligence" };
  }

  // ── NATIONAL ─────────────────────────────────────────────────────────────────
  // CIAA, NHRC, Auditor General, NRB, National Budget, PSC, Parliament key bills

  if (matchAny(corpus, [
    /ciaa/,
    /commission for the investigation of abuse of authority/,
    /अख्तियार दुरुपयोग/,
    /अख्तियार/,
    /corruption investigation/,
    /भ्रष्टाचार अनुसन्धान/,
  ])) {
    return { tier: "national", score: 92, atomicRecommended: true,
      reason: "CIAA — anti-corruption national intelligence" };
  }

  if (matchAny(corpus, [
    /nhrc/,
    /national human rights commission/,
    /राष्ट्रिय मानव अधिकार आयोग/,
    /मानव अधिकार आयोग/,
    /human rights commission/,
  ])) {
    return { tier: "national", score: 90, atomicRecommended: true,
      reason: "NHRC — human rights national intelligence" };
  }

  if (matchAny(corpus, [
    /auditor general/,
    /oag/,
    /महालेखापरीक्षक/,
    /mahalekha parikshak/,
    /public audit/,
    /सार्वजनिक लेखापरीक्षण/,
  ])) {
    return { tier: "national", score: 88, atomicRecommended: true,
      reason: "Auditor General — public finance accountability" };
  }

  if (matchAny(corpus, [
    /nrb/,
    /nepal rastra bank/,
    /नेपाल राष्ट्र बैंक/,
    /monetary policy/,
    /मौद्रिक नीति/,
    /central bank/,
    /financial stability report/,
  ])) {
    return { tier: "national", score: 87, atomicRecommended: true,
      reason: "NRB — monetary and financial national intelligence" };
  }

  if (doc.govFolder === "budget-economy" || matchAny(corpus, [
    /annual budget/,
    /budget speech/,
    /fiscal year budget/,
    /वार्षिक बजेट/,
    /आर्थिक विधेयक/,
    /budget and programme/,
    /appropriation act/,
  ])) {
    return { tier: "national", score: 85, atomicRecommended: true,
      reason: "National Budget — fiscal intelligence asset" };
  }

  if (matchAny(corpus, [
    /public service commission/,
    /lok sewa aayog/,
    /लोक सेवा आयोग/,
    /psc annual/,
  ])) {
    return { tier: "national", score: 82, atomicRecommended: false,
      reason: "Public Service Commission — national civil service intelligence" };
  }

  if (doc.govFolder === "judiciary" || matchAny(corpus, [
    /supreme court/,
    /सर्वोच्च अदालत/,
    /constitutional bench/,
    /sambidhan itsas/,
    /न्याय परिषद/,
  ])) {
    return { tier: "national", score: 84, atomicRecommended: false,
      reason: "Supreme Court — judicial national intelligence" };
  }

  if (doc.govFolder === "parliament" || matchAny(corpus, [
    /parliament/,
    /संसद/,
    /pratinidhisabha/,
    /rastriya sabha/,
    /legislative/,
  ])) {
    return { tier: "national", score: 78, atomicRecommended: false,
      reason: "Parliament — legislative intelligence" };
  }

  // ── STRATEGIC ────────────────────────────────────────────────────────────────
  // Sectoral reports, commission reports, policies, research

  if (doc.govFolder === "policy-planning" || matchAny(corpus, [
    /national plan/,
    /periodic plan/,
    /panchwarshiya/,
    /national policy/,
    /strategy/,
    /strategic plan/,
    /राष्ट्रिय नीति/,
    /दीर्घकालीन योजना/,
  ])) {
    return { tier: "strategic", score: 68, atomicRecommended: false,
      reason: "National policy or planning document" };
  }

  if (matchAny(corpus, [
    /annual report/,
    /वार्षिक प्रतिवेदन/,
    /commission report/,
    /आयोगको प्रतिवेदन/,
    /sector report/,
    /epf/,
    /ssf/,
    /employees provident fund/,
  ])) {
    return { tier: "strategic", score: 62, atomicRecommended: false,
      reason: "Annual report or commission study" };
  }

  if (doc.sourceType === "official") {
    return { tier: "strategic", score: 58, atomicRecommended: false,
      reason: "Official government document" };
  }

  // ── OPERATIONAL ──────────────────────────────────────────────────────────────

  if (doc.govFolder === "local-governance" || matchAny(corpus, [
    /municipality/,
    /ward/,
    /palika/,
    /नगरपालिका/,
    /गाउँपालिका/,
    /wardno/,
  ])) {
    return { tier: "operational", score: 45, atomicRecommended: false,
      reason: "Local governance document" };
  }

  if (doc.govFolder === "citizen-intelligence" || matchAny(corpus, [
    /complaint/,
    /survey/,
    /feedback/,
    /field report/,
    /नागरिक गुनासो/,
  ])) {
    return { tier: "operational", score: 42, atomicRecommended: false,
      reason: "Citizen intelligence / field report" };
  }

  if (doc.category === "research" || doc.sourceType === "research") {
    return { tier: "operational", score: 50, atomicRecommended: false,
      reason: "Research document" };
  }

  // ── ARCHIVE (default) ────────────────────────────────────────────────────────

  return { tier: "archive", score: 20, atomicRecommended: false,
    reason: "General document — classify manually if higher priority" };
}

// ── Queue builder ─────────────────────────────────────────────────────────────

export interface AtomicQueueItem {
  docId:             string;
  title:             string;
  tier:              KnowledgeTier;
  score:             number;
  reason:            string;
  estimatedCostUSD:  number;
  mimeType:          string;
  downloadUrl:       string;
  pageCount?:        number;
  fileSizeBytes:     number;
  extractionTier?:   string;
}

export interface AtomicQueueSummary {
  items:          AtomicQueueItem[];
  totalCostUSD:   number;
  foundationCount: number;
  nationalCount:   number;
}

/**
 * Builds the recommended atomic extraction queue from a list of approved official documents.
 * Only includes PDFs (page-level extraction requires PDF).
 * Excludes documents already at "atomic" tier.
 * Sorted by priority score descending.
 */
export function buildAtomicQueue(docs: Array<{
  id:               string;
  title:            string;
  mimeType:         string;
  downloadUrl:      string;
  fileSize:         number;
  sourceType?:      string;
  adminApprovalStatus?: string;
  extractionTier?:  string;
  govFolder?:       string;
  sourceAuthority?: string;
  institutionName?: string;
  tags?:            string[];
  category?:        string;
  description?:     string;
  fileName?:        string;
  pageCount?:       number;
}>): AtomicQueueSummary {

  const items: AtomicQueueItem[] = [];

  for (const doc of docs) {
    // Only approved documents
    if (doc.adminApprovalStatus !== "approved") continue;
    // Only PDFs (required for page-level source tracing)
    if (!doc.mimeType?.includes("pdf")) continue;
    // Only official or research (skip unofficial/unknown for atomic)
    if (doc.sourceType === "unofficial" || doc.sourceType === "unknown") continue;
    // Skip already-atomic
    if (doc.extractionTier === "atomic") continue;

    const { tier, score, atomicRecommended, reason } = classifyDocument(doc);

    // Include foundation + national always; others only if atomicRecommended
    if (tier !== "foundation" && tier !== "national" && !atomicRecommended) continue;

    items.push({
      docId:            doc.id,
      title:            doc.title,
      tier,
      score,
      reason,
      estimatedCostUSD: estimateAtomicCostUSD(doc.pageCount, doc.fileSize),
      mimeType:         doc.mimeType,
      downloadUrl:      doc.downloadUrl,
      pageCount:        doc.pageCount,
      fileSizeBytes:    doc.fileSize,
      extractionTier:   doc.extractionTier,
    });
  }

  // Sort by priority score descending
  items.sort((a, b) => b.score - a.score || TIER_PRIORITY[b.tier] - TIER_PRIORITY[a.tier]);

  const totalCostUSD   = items.reduce((s, i) => s + i.estimatedCostUSD, 0);
  const foundationCount = items.filter(i => i.tier === "foundation").length;
  const nationalCount   = items.filter(i => i.tier === "national").length;

  return { items, totalCostUSD, foundationCount, nationalCount };
}
