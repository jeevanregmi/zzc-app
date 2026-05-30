// lib/vault/documentLineage.ts
// Pure functions for document lineage scoring, safety assessment, and duplicate detection.
// No Firestore calls here — pass counts from the caller.

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LineageCounts {
  intelCount:          number;  // janta_intelligence
  atomicCount:         number;  // atomic_extraction_logs
  economyCount:        number;  // economy_atoms
  promiseCount:        number;  // promise_atoms
  constitutionalCount: number;  // constitutional_framework
  classificationCount: number;  // classification_suggestions
  relCount:            number;  // janta_relationships
}

export type LineageTier =
  | "core_source"      // constitution/high-value intel
  | "used_source"      // has child records
  | "unused"           // no children, not test
  | "test_demo"        // test/demo title pattern + no children
  | "broken_state"     // error/stuck pipeline
  | "needs_review";    // ambiguous

export type SafetyLevel =
  | "safe_to_delete"   // no children, test/demo
  | "safe_to_archive"  // no children, legit doc
  | "archive_only"     // has children — archive allowed, no delete
  | "do_not_touch"     // critical children (constitution, many intel)
  | "needs_review";    // founder judgment needed

export interface LineageResult {
  score:          number;
  tier:           LineageTier;
  safetyLevel:    SafetyLevel;
  recommendation: string;   // Nepali founder-facing sentence
  totalChildren:  number;
  tierLabel:      string;
  safetyLabel:    string;
}

export const TEST_PATTERNS = /^(test|demo|sample|tmp|untitled|temp|xxx|yyy|zzz)/i;

// ── Title fingerprint for duplicate detection ─────────────────────────────────

export function titleFingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/[_\-./\\]/g, " ")
    .replace(/[^a-z0-9ऀ-ॿ\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(w => w.length > 3)
    .sort()
    .join("|");
}

// ── Detect duplicate groups from a flat doc list ──────────────────────────────

export interface DocMeta { id: string; title: string; govFolder?: string; sourceUrl?: string }

export function detectDuplicateGroups(docs: DocMeta[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  docs.forEach(d => {
    const fp = titleFingerprint(d.title);
    if (!fp) return;
    const existing = groups.get(fp) ?? [];
    existing.push(d.id);
    groups.set(fp, existing);
  });
  // Keep only groups with 2+ docs
  for (const [key, ids] of groups) {
    if (ids.length < 2) groups.delete(key);
  }
  return groups;
}

// ── Core lineage compute ──────────────────────────────────────────────────────

export function computeLineage(
  title:            string,
  counts:           LineageCounts,
  meta: {
    processingStatus?:    string;
    adminApprovalStatus?: string;
    hasSourceUrl:         boolean;
    hasDownloadUrl:       boolean;
  }
): LineageResult {

  const isTestDemo     = TEST_PATTERNS.test(title.trim());
  const isConstitution = counts.constitutionalCount > 0;
  const totalChildren  =
    counts.intelCount + counts.atomicCount + counts.economyCount +
    counts.promiseCount + counts.constitutionalCount;

  // ── Score ─────────────────────────────────────────────────────────────────
  let score = 0;
  if (meta.hasSourceUrl)              score += 5;
  if (meta.hasDownloadUrl)            score += 5;
  if (meta.adminApprovalStatus === "approved") score += 15;
  if (counts.constitutionalCount > 0) score += 30;
  if (counts.intelCount > 0)          score += 20;
  if (counts.atomicCount > 0)         score += 10;
  if (counts.economyCount > 0)        score += 10;
  if (counts.promiseCount > 0)        score += 10;
  if (counts.classificationCount > 0) score += 5;
  if (isTestDemo)                     score -= 30;
  if (totalChildren === 0)            score -= 15;
  if (meta.processingStatus === "error") score -= 10;

  // ── Tier ─────────────────────────────────────────────────────────────────
  let tier: LineageTier;
  let tierLabel: string;
  if (isConstitution || (counts.intelCount > 20 && meta.adminApprovalStatus === "approved")) {
    tier = "core_source"; tierLabel = "Core Source";
  } else if (totalChildren > 0) {
    tier = "used_source"; tierLabel = "Used Source";
  } else if (isTestDemo && totalChildren === 0) {
    tier = "test_demo"; tierLabel = "Test/Demo";
  } else if (meta.processingStatus === "error") {
    tier = "broken_state"; tierLabel = "Broken State";
  } else if (totalChildren === 0) {
    tier = "unused"; tierLabel = "Unused";
  } else {
    tier = "needs_review"; tierLabel = "Needs Review";
  }

  // ── Safety level ──────────────────────────────────────────────────────────
  let safetyLevel: SafetyLevel;
  let safetyLabel: string;
  if (isConstitution || counts.intelCount > 15) {
    safetyLevel = "do_not_touch"; safetyLabel = "Delete नगर्नुहोस्";
  } else if (totalChildren > 0) {
    safetyLevel = "archive_only"; safetyLabel = "Archive मात्र";
  } else if (isTestDemo) {
    safetyLevel = "safe_to_delete"; safetyLabel = "Delete सुरक्षित";
  } else if (totalChildren === 0) {
    safetyLevel = "safe_to_archive"; safetyLabel = "Archive सुरक्षित";
  } else {
    safetyLevel = "needs_review"; safetyLabel = "Founder Review";
  }

  // ── Nepali recommendation ─────────────────────────────────────────────────
  let recommendation: string;
  if (isConstitution) {
    recommendation = `Constitution framework मा ${counts.constitutionalCount} records linked — delete वा archive नगर्नुहोस्।`;
  } else if (counts.intelCount > 15 && meta.adminApprovalStatus === "approved") {
    recommendation = `${counts.intelCount} intelligence records छन् र approved छ — core source, protect गर्नुहोस्।`;
  } else if (totalChildren > 5) {
    recommendation = `यो document मा ${totalChildren} child records छन् — delete नगर्नुहोस्।`;
  } else if (totalChildren > 0) {
    recommendation = `${totalChildren} child records छन् — archive मात्र, delete नगर्नुहोस्।`;
  } else if (isTestDemo) {
    recommendation = "Test/demo file देखिन्छ र child data छैन — delete गर्न सुरक्षित।";
  } else if (meta.processingStatus === "error") {
    recommendation = "Pipeline error मा छ — Reset गरेर retry गर्नुहोस्, नत्र archive।";
  } else if (!meta.hasDownloadUrl) {
    recommendation = "Download URL छैन — pipeline चल्न सक्दैन। Archive वा delete गर्नुहोस्।";
  } else {
    recommendation = "Child data छैन — AI Analysis गर्नुहोस् वा archive गर्नुहोस्।";
  }

  return { score, tier, tierLabel, safetyLevel, safetyLabel, recommendation, totalChildren };
}

// ── Tier display config ───────────────────────────────────────────────────────

export const TIER_CFG: Record<LineageTier, { cls: string; dot: string }> = {
  core_source:   { cls: "text-sky-300 border-sky-700 bg-sky-950/30",     dot: "bg-sky-400"     },
  used_source:   { cls: "text-cyan-400 border-cyan-700 bg-cyan-950/20",  dot: "bg-cyan-400"    },
  unused:        { cls: "text-slate-500 border-slate-700 bg-slate-900/30", dot: "bg-slate-600" },
  test_demo:     { cls: "text-red-400 border-red-700 bg-red-950/20",     dot: "bg-red-400"     },
  broken_state:  { cls: "text-amber-400 border-amber-700 bg-amber-950/20", dot: "bg-amber-400" },
  needs_review:  { cls: "text-zinc-400 border-zinc-700 bg-zinc-900/30",  dot: "bg-zinc-500"    },
};

export const SAFETY_CFG: Record<SafetyLevel, { cls: string }> = {
  safe_to_delete:  { cls: "text-red-400 border-red-800/60 bg-red-950/20"       },
  safe_to_archive: { cls: "text-blue-400 border-blue-800/60 bg-blue-950/20"    },
  archive_only:    { cls: "text-amber-400 border-amber-800/60 bg-amber-950/20" },
  do_not_touch:    { cls: "text-emerald-400 border-emerald-800/60 bg-emerald-950/20" },
  needs_review:    { cls: "text-zinc-400 border-zinc-700 bg-zinc-900/30"       },
};
