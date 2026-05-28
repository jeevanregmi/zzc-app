/**
 * Lifecycle helpers — converts technical lifecycle types into simple founder-friendly
 * Nepali language. No Firestore reads. Pure data helpers.
 */

import type { IntelligenceDocument, LifecycleType } from "../types/documents";

// ─── Founder-friendly lifecycle profile ──────────────────────────────────────

export interface LifecycleProfile {
  label:       string;   // simple Nepali name
  emoji:       string;
  description: string;   // 1-sentence answer to "यो document के हो?"
  frequency:   string;   // answer to "कहिले update हुन्छ?"
  archiveNote: string;   // answer to "पुरानो version राख्ने कि?"
  nextAction:  string;   // answer to "अब मैले के गर्ने?"
  color:       string;   // tailwind border color class
}

export const LIFECYCLE_PROFILES: Record<LifecycleType, LifecycleProfile> = {
  perpetual: {
    label:       "लामो समय चल्ने कानून",
    emoji:       "📜",
    description: "यो कानून वा संविधान लामो समयसम्म valid रहन्छ।",
    frequency:   "धेरै कम बदलिन्छ — दशकौंमा एकपटक।",
    archiveNote: "सधैं राख्ने — पुरानो version कहिल्यै हटाउन मिल्दैन।",
    nextAction:  "संशोधन भएको सूचना आए नयाँ version upload गर्नुस्।",
    color:       "border-violet-800/50",
  },
  amendment_based: {
    label:       "संशोधन आए मात्र update हुने",
    emoji:       "🔧",
    description: "यो ऐन वा नीति सरकारले संशोधन गरे मात्र update हुन्छ।",
    frequency:   "अनियमित — जतिबेला सरकारले बदल्छ।",
    archiveNote: "सबै version राख्ने — तुलनाको लागि पुरानो पनि चाहिन्छ।",
    nextAction:  "सरकारी gazette मा notice देखे upload गर्नुस्।",
    color:       "border-blue-800/50",
  },
  annual_report: {
    label:       "वार्षिक प्रतिवेदन",
    emoji:       "📊",
    description: "हरेक वर्ष नयाँ प्रतिवेदन प्रकाशित हुन्छ।",
    frequency:   "वर्षमा एकपटक — सामान्यतः श्रावण–भाद्र।",
    archiveNote: "सबै वर्षको राख्ने — तुलना विश्लेषणको लागि।",
    nextAction:  "अर्को वर्ष नयाँ प्रतिवेदन आए upload गर्नुस्।",
    color:       "border-amber-800/50",
  },
  quarterly: {
    label:       "त्रैमासिक प्रतिवेदन",
    emoji:       "📅",
    description: "हरेक ३ महीनामा नयाँ प्रतिवेदन आउँछ।",
    frequency:   "३ महीनामा एकपटक।",
    archiveNote: "सबै version राख्ने।",
    nextAction:  "अर्को ३ महीनामा check गर्नुस्।",
    color:       "border-cyan-800/50",
  },
  circular: {
    label:       "सूचना / परिपत्र",
    emoji:       "📌",
    description: "एकपटक जारी भएको सरकारी सूचना।",
    frequency:   "एकपटक मात्र — replace हुँदैन।",
    archiveNote: "सधैं राख्ने — unique notice हो।",
    nextAction:  "नयाँ परिपत्र आए छुट्टै upload गर्नुस्।",
    color:       "border-green-800/50",
  },
  news: {
    label:       "समाचार / current update",
    emoji:       "📰",
    description: "तत्काल जानकारी — नयाँ भर्सन आए replace गर्न सकिन्छ।",
    frequency:   "नियमित आउँछ।",
    archiveNote: "पछिल्लो मात्र राख्न सकिन्छ।",
    nextAction:  "नयाँ update आए replace वा नयाँ upload गर्नुस्।",
    color:       "border-zinc-700",
  },
};

const UNKNOWN_PROFILE: LifecycleProfile = {
  label:       "अज्ञात प्रकार",
  emoji:       "❓",
  description: "यो document को प्रकार set गरिएको छैन।",
  frequency:   "थाहा छैन।",
  archiveNote: "manually decide गर्नुस्।",
  nextAction:  "Document edit गरेर lifecycle type set गर्नुस्।",
  color:       "border-zinc-700",
};

export function getLifecycleProfile(lifecycleType?: LifecycleType | string): LifecycleProfile {
  if (!lifecycleType) return UNKNOWN_PROFILE;
  return LIFECYCLE_PROFILES[lifecycleType as LifecycleType] ?? UNKNOWN_PROFILE;
}

// ─── "अर्को version कहिले?" — human-readable next-check window ────────────────

export function nextCheckLabel(doc: IntelligenceDocument): string {
  if (doc.expectedUpdateWindow) return doc.expectedUpdateWindow;
  if (!doc.lifecycleType) return "—";

  const uploaded = new Date(doc.uploadedAt);
  const addMonths = (n: number) => {
    const d = new Date(uploaded);
    d.setMonth(d.getMonth() + n);
    return `${d.getFullYear()} ${d.toLocaleString("ne-NP", { month: "long" })} तिर`;
  };

  switch (doc.lifecycleType) {
    case "perpetual":       return "दशकौंपछि — संशोधन भए मात्र";
    case "amendment_based": return "अनिश्चित — gazette notice आउँदा";
    case "annual_report":   return addMonths(12);
    case "quarterly":       return addMonths(3);
    case "circular":        return "replace हुँदैन — archive मा राख्नुस्";
    case "news":            return addMonths(1);
    default:                return "—";
  }
}

// ─── Overdue detection ────────────────────────────────────────────────────────

export function isOverdue(doc: IntelligenceDocument): boolean {
  if (!doc.lifecycleType) return false;
  const uploaded = new Date(doc.uploadedAt);
  const now      = new Date();
  const daysOld  = (now.getTime() - uploaded.getTime()) / 86_400_000;

  if (doc.lifecycleType === "annual_report") return daysOld > 365;
  if (doc.lifecycleType === "quarterly")     return daysOld > 120;
  return false;
}

// ─── Group by lifecycle ───────────────────────────────────────────────────────

export type LifecycleGroupKey = LifecycleType | "unknown";

export const LIFECYCLE_GROUP_ORDER: LifecycleGroupKey[] = [
  "perpetual", "amendment_based", "annual_report", "quarterly", "circular", "news", "unknown",
];

export function groupDocsByLifecycle(
  docs: IntelligenceDocument[],
): Map<LifecycleGroupKey, IntelligenceDocument[]> {
  const map = new Map<LifecycleGroupKey, IntelligenceDocument[]>();
  for (const doc of docs) {
    const key: LifecycleGroupKey = (doc.lifecycleType as LifecycleType) ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(doc);
  }
  return map;
}

// ─── Lifecycle summary for COO/CopilotContext ─────────────────────────────────

export interface LifecycleSummary {
  total:             number;
  byType:            Partial<Record<LifecycleGroupKey, number>>;
  overdueCount:      number;   // annual/quarterly past their expected update date
  needsTypeSet:      number;   // documents with no lifecycleType at all
  annualReportCount: number;   // total annual_report docs
}

export function computeLifecycleSummary(docs: IntelligenceDocument[]): LifecycleSummary {
  const byType: Partial<Record<LifecycleGroupKey, number>> = {};
  let overdueCount = 0;
  let needsTypeSet = 0;

  for (const doc of docs) {
    const key: LifecycleGroupKey = (doc.lifecycleType as LifecycleType) ?? "unknown";
    byType[key] = (byType[key] ?? 0) + 1;
    if (!doc.lifecycleType) needsTypeSet++;
    if (isOverdue(doc)) overdueCount++;
  }

  return {
    total:             docs.length,
    byType,
    overdueCount,
    needsTypeSet,
    annualReportCount: byType.annual_report ?? 0,
  };
}
