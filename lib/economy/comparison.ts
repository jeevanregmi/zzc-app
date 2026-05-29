/**
 * Nepal Economic Intelligence — Comparison Engine
 *
 * Pure functions. No I/O. Takes atoms, returns analysis.
 * Deterministic and testable.
 *
 * What this does:
 *   - Matches atoms across fiscal years by sector + type + text similarity
 *   - Detects repeated promises (same promise in multiple years)
 *   - Classifies sector trends (increased / decreased / new / removed)
 *   - Tags post-Gen Z movement impact atoms (2081 BS onwards)
 *   - Produces Firestore update payloads for back-linking atoms across years
 */

import type { EconomicAtom, EconomicAtomType, EconomicSector, EconomicComparisonStatus } from "../types/economy";

// ── Text similarity ───────────────────────────────────────────────────────────

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[।,।!?।\-–—]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1),
  );
}

function jaccardSimilarity(a: string, b: string): number {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const w of ta) { if (tb.has(w)) inter++; }
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── Atom type compatibility ───────────────────────────────────────────────────
// Which atom types can be matched against each other across years.

const COMPATIBLE: Partial<Record<EconomicAtomType, EconomicAtomType[]>> = {
  budget_allocation:   ["budget_allocation"],
  revenue:             ["revenue"],
  spending:            ["spending"],
  debt_deficit:        ["debt_deficit"],
  policy_promise:      ["policy_promise", "repeated_promise", "reform"],
  repeated_promise:    ["policy_promise", "repeated_promise"],
  reform:              ["reform", "policy_promise"],
  removed_policy:      ["removed_policy", "policy_promise"],
  economist_commentary: ["economist_commentary"],
  institution_response: ["institution_response"],
  movement_impact:     ["movement_impact", "policy_promise", "reform"],
  sector_trend:        ["sector_trend"],
};

function typesCompatible(a: string, b: string): boolean {
  const compat = COMPATIBLE[a as EconomicAtomType];
  return compat ? compat.includes(b as EconomicAtomType) : a === b;
}

// ── Match finding ─────────────────────────────────────────────────────────────

const MIN_SIMILARITY = 0.18;

function findBestMatch(
  current: EconomicAtom,
  pool: EconomicAtom[],
): { atom: EconomicAtom; similarity: number } | null {
  const candidates = pool.filter(p =>
    p.sector === current.sector &&
    typesCompatible(current.atomType, p.atomType),
  );

  let best: { atom: EconomicAtom; similarity: number } | null = null;
  for (const candidate of candidates) {
    const sim = jaccardSimilarity(current.summaryNepali, candidate.summaryNepali);
    if (sim >= MIN_SIMILARITY && (!best || sim > best.similarity)) {
      best = { atom: candidate, similarity: sim };
    }
  }
  return best;
}

// ── Status derivation ─────────────────────────────────────────────────────────

function deriveStatus(
  current: EconomicAtom,
  previous: EconomicAtom,
  similarity: number,
): { status: EconomicComparisonStatus; percentChange?: number } {
  const isPledge = (t: string) =>
    t === "policy_promise" || t === "repeated_promise";

  // High similarity promise-to-promise → repeated
  if (similarity > 0.35 && isPledge(current.atomType) && isPledge(previous.atomType)) {
    return { status: "repeated" };
  }

  // Amount-based comparison
  if (current.amount != null && previous.amount != null && previous.amount > 0) {
    const pct = ((current.amount - previous.amount) / previous.amount) * 100;
    if (Math.abs(pct) < 3) return { status: "continued", percentChange: pct };
    return {
      status:        pct > 0 ? "increased" : "decreased",
      percentChange: pct,
    };
  }

  return { status: "continued" };
}

// ── Public: match result ──────────────────────────────────────────────────────

export interface AtomMatch {
  currentAtom:      EconomicAtom;
  previousAtom:     EconomicAtom | null;
  similarity:       number;
  comparisonStatus: EconomicComparisonStatus;
  percentChange?:   number;
}

// ── Sector trends ─────────────────────────────────────────────────────────────

export interface SectorTrend {
  sector:        EconomicSector;
  currentTotal:  number;
  previousTotal: number;
  percentChange: number;
  trend:         "increased" | "decreased" | "unchanged" | "new" | "removed";
  currentCount:  number;
  previousCount: number;
}

function buildSectorTrends(
  current: EconomicAtom[],
  previous: EconomicAtom[],
): SectorTrend[] {
  const sectors = new Set<EconomicSector>([
    ...current.map(a => a.sector as EconomicSector),
    ...previous.map(a => a.sector as EconomicSector),
  ]);

  const trends: SectorTrend[] = [];
  for (const sector of sectors) {
    const curr = current.filter(a => a.sector === sector);
    const prev = previous.filter(a => a.sector === sector);
    const currTotal = curr.reduce((s, a) => s + (a.amount ?? 0), 0);
    const prevTotal = prev.reduce((s, a) => s + (a.amount ?? 0), 0);

    let trend: SectorTrend["trend"] = "unchanged";
    let percentChange = 0;

    if (prev.length === 0) {
      trend = "new";
    } else if (curr.length === 0) {
      trend = "removed";
    } else if (currTotal > 0 && prevTotal > 0) {
      percentChange = ((currTotal - prevTotal) / prevTotal) * 100;
      if (percentChange > 5)       trend = "increased";
      else if (percentChange < -5) trend = "decreased";
      else                         trend = "unchanged";
    } else if (curr.length !== prev.length) {
      // No amounts but atom count changed
      percentChange = ((curr.length - prev.length) / prev.length) * 100;
      if (percentChange > 10) trend = "increased";
      else if (percentChange < -10) trend = "decreased";
    }

    trends.push({
      sector,
      currentTotal: currTotal,
      previousTotal: prevTotal,
      percentChange,
      trend,
      currentCount:  curr.length,
      previousCount: prev.length,
    });
  }

  // Sort: big movers first, then new/removed, then unchanged
  return trends.sort((a, b) => {
    if (a.trend === "new" && b.trend !== "new") return -1;
    if (b.trend === "new" && a.trend !== "new") return 1;
    if (a.trend === "removed" && b.trend !== "removed") return -1;
    if (b.trend === "removed" && a.trend !== "removed") return 1;
    return Math.abs(b.percentChange) - Math.abs(a.percentChange);
  });
}

// ── Movement impact classification ─────────────────────────────────────────────
// Rule-based. No LLM required. Nepal Gen Z movement (2081 BS) focus:
// youth employment, anti-corruption, governance reform, digital Nepal.

const MOVEMENT_KEYWORDS = [
  "युवा", "तरुण", "भ्रष्टाचार", "सुशासन", "पारदर्शिता",
  "जवाफदेहिता", "आन्दोलन", "रोजगार", "अवसर", "प्रतिभा",
  "योग्यता", "डिजिटल", "नागरिक", "सार्वजनिक", "नयाँ पुस्ता",
];
const MOVEMENT_SECTORS: EconomicSector[] = [
  "युवा", "रोजगार", "सुशासन", "डिजिटल/प्रविधि",
];
const MOVEMENT_YEAR = 2081;

export interface MovementImpact {
  atom:               EconomicAtom;
  relatedMovement:    string;
  beforeAfterContext: string;
  demandType:         string;
  confidence:         number;
}

export function classifyMovementImpact(atoms: EconomicAtom[]): MovementImpact[] {
  const results: MovementImpact[] = [];

  for (const atom of atoms) {
    if (atom.nepaliYear < MOVEMENT_YEAR) continue;

    const text = [atom.summaryNepali, atom.citizenMeaningNepali, atom.textEvidence ?? ""]
      .join(" ")
      .toLowerCase();

    const sectorScore  = MOVEMENT_SECTORS.includes(atom.sector as EconomicSector) ? 0.5 : 0;
    const kwCount      = MOVEMENT_KEYWORDS.filter(kw => text.includes(kw.toLowerCase())).length;
    const confidence   = Math.min(1, sectorScore + kwCount * 0.12);

    if (confidence < 0.28) continue;

    const demandType =
      atom.sector === "युवा"           ? "युवा सशक्तिकरण"          :
      atom.sector === "रोजगार"         ? "रोजगार सिर्जना"           :
      atom.sector === "सुशासन"         ? "भ्रष्टाचारविरुद्ध सुशासन" :
      atom.sector === "डिजिटल/प्रविधि" ? "डिजिटल रूपान्तरण"         :
                                          "नीतिगत सुधार";

    results.push({
      atom,
      relatedMovement:    "gen_z_movement_2081",
      beforeAfterContext: `Gen Z आन्दोलन पछि ${atom.nepaliYear} — ${atom.sector} मा नीतिगत प्रतिक्रिया`,
      demandType,
      confidence,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

// ── Main comparison ───────────────────────────────────────────────────────────

export interface ComparisonReport {
  baseFiscalYear:    string;   // "2080/81" — previous (reference)
  compareFiscalYear: string;   // "2081/82" — current (what changed)
  generatedAt:       string;
  matches:           AtomMatch[];
  sectorTrends:      SectorTrend[];
  repeatedPromises:  AtomMatch[];
  newAtoms:          EconomicAtom[];
  removedAtoms:      EconomicAtom[];
  movementImpact:    MovementImpact[];
  stats: {
    totalCurrent:  number;
    totalPrevious: number;
    matched:       number;
    newCount:      number;
    removedCount:  number;
    repeatedCount: number;
    movementCount: number;
  };
}

export function runComparison(
  currentAtoms: EconomicAtom[],
  previousAtoms: EconomicAtom[],
  currentFY: string,
  previousFY: string,
): ComparisonReport {
  const matches: AtomMatch[] = [];
  const matchedPrevIds = new Set<string>();

  for (const curr of currentAtoms) {
    const match = findBestMatch(curr, previousAtoms);
    if (match) {
      const { status, percentChange } = deriveStatus(curr, match.atom, match.similarity);
      matches.push({
        currentAtom:      curr,
        previousAtom:     match.atom,
        similarity:       match.similarity,
        comparisonStatus: status,
        percentChange,
      });
      matchedPrevIds.add(match.atom.id);
    } else {
      matches.push({
        currentAtom:      curr,
        previousAtom:     null,
        similarity:       0,
        comparisonStatus: "new",
      });
    }
  }

  const newAtoms        = matches.filter(m => !m.previousAtom).map(m => m.currentAtom);
  const removedAtoms    = previousAtoms.filter(p => !matchedPrevIds.has(p.id));
  const repeatedPromises = matches.filter(m => m.comparisonStatus === "repeated");
  const sectorTrends    = buildSectorTrends(currentAtoms, previousAtoms);
  const movementImpact  = classifyMovementImpact(currentAtoms);

  return {
    baseFiscalYear:    previousFY,
    compareFiscalYear: currentFY,
    generatedAt:       new Date().toISOString(),
    matches,
    sectorTrends,
    repeatedPromises,
    newAtoms,
    removedAtoms,
    movementImpact,
    stats: {
      totalCurrent:  currentAtoms.length,
      totalPrevious: previousAtoms.length,
      matched:       matches.filter(m => m.previousAtom !== null).length,
      newCount:      newAtoms.length,
      removedCount:  removedAtoms.length,
      repeatedCount: repeatedPromises.length,
      movementCount: movementImpact.length,
    },
  };
}

// ── Firestore update payloads ─────────────────────────────────────────────────
// Returns a map of atomId → fields to merge-update in Firestore.
// Used by ComparisonEngine.tsx to persist results without overwriting atoms.

export function buildUpdatePayloads(
  report: ComparisonReport,
): Map<string, Record<string, unknown>> {
  const updates = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();

  // Current-year atoms: set comparisonStatus + link to previous
  for (const match of report.matches) {
    const curr = match.currentAtom;
    const prev = match.previousAtom;

    const currUpdate: Record<string, unknown> = {
      comparisonStatus: match.comparisonStatus,
      updatedAt: now,
    };
    if (match.percentChange != null)  currUpdate.percentChange  = Math.round(match.percentChange * 10) / 10;
    if (prev) {
      currUpdate.previousYearAtomIds  = [prev.id];
      currUpdate.previousYearReference = prev.summaryNepali.slice(0, 150);
    }
    updates.set(curr.id, { ...(updates.get(curr.id) ?? {}), ...currUpdate });

    // Previous-year atom: link forward to current
    if (prev) {
      const existing = updates.get(prev.id) ?? {};
      const fwdIds   = (existing.nextYearAtomIds as string[] | undefined) ?? [];
      updates.set(prev.id, {
        ...existing,
        nextYearAtomIds: [...new Set([...fwdIds, curr.id])],
        updatedAt: now,
      });
    }
  }

  // Previous-year atoms with no current match → "removed"
  for (const removed of report.removedAtoms) {
    const existing = updates.get(removed.id) ?? {};
    updates.set(removed.id, {
      ...existing,
      comparisonStatus: "removed",
      updatedAt: now,
    });
  }

  // Movement impact atoms: tag with relatedMovement
  for (const impact of report.movementImpact) {
    const existing = updates.get(impact.atom.id) ?? {};
    updates.set(impact.atom.id, {
      ...existing,
      relatedMovement:    impact.relatedMovement,
      beforeAfterContext: impact.beforeAfterContext,
      updatedAt: now,
    });
  }

  return updates;
}
