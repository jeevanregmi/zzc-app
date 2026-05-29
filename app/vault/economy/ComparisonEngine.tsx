"use client";

import { useState } from "react";
import { updateDoc, doc as fsDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { EconomicAtom, EconomicSector } from "../../../lib/types/economy";
import { SECTOR_META, COMPARISON_META, formatNPR } from "../../../lib/types/economy";
import {
  runComparison,
  buildUpdatePayloads,
  type ComparisonReport,
  type AtomMatch,
  type SectorTrend,
  type MovementImpact,
} from "../../../lib/economy/comparison";

interface Props {
  atoms:            EconomicAtom[];
  fiscalYears:      string[];
  onAtomsUpdated:   () => void;
}

type Tab = "sectors" | "repeated" | "new" | "removed" | "movement";

const TAB_LABELS: Record<Tab, string> = {
  sectors:  "Sector Trends",
  repeated: "Repeated Promises",
  new:      "New Programs",
  removed:  "Removed",
  movement: "Gen Z Impact",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TabButton({ tab, active, count, onClick }: {
  tab: Tab; active: boolean; count: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors " +
        (active
          ? "bg-zinc-700 text-white"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800")
      }
    >
      {TAB_LABELS[tab]}
      {count > 0 && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
          active ? "bg-zinc-600 text-zinc-200" : "bg-zinc-800 text-zinc-500"
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`text-center px-3 py-2 rounded-lg border ${color}`}>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] leading-none mt-0.5">{label}</p>
    </div>
  );
}

function SectorRow({ trend }: { trend: SectorTrend }) {
  const meta = SECTOR_META[trend.sector] ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
  const trendColor =
    trend.trend === "increased" ? "text-green-400" :
    trend.trend === "decreased" ? "text-red-400"   :
    trend.trend === "new"       ? "text-cyan-400"  :
    trend.trend === "removed"   ? "text-rose-400"  :
    "text-zinc-500";
  const trendIcon =
    trend.trend === "increased" ? "↑" :
    trend.trend === "decreased" ? "↓" :
    trend.trend === "new"       ? "★" :
    trend.trend === "removed"   ? "✕" : "—";

  return (
    <div className="flex items-center gap-3 py-2 border-b border-zinc-800/40 last:border-0">
      <div className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${meta.tw}`}>
        {meta.icon} {trend.sector}
      </div>
      <div className="flex-1 grid grid-cols-3 gap-2 text-xs text-right">
        <span className="text-zinc-500">
          {trend.previousTotal > 0 ? formatNPR(trend.previousTotal) : `${trend.previousCount} items`}
        </span>
        <span className="text-zinc-300">
          {trend.currentTotal > 0 ? formatNPR(trend.currentTotal) : `${trend.currentCount} items`}
        </span>
        <span className={`font-medium ${trendColor}`}>
          {trendIcon}
          {trend.trend !== "new" && trend.trend !== "removed" && trend.percentChange !== 0
            ? ` ${Math.abs(trend.percentChange).toFixed(1)}%`
            : ""}
        </span>
      </div>
    </div>
  );
}

function AtomMatchRow({ match, showPrevious }: { match: AtomMatch; showPrevious?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const atom = showPrevious ? (match.previousAtom ?? match.currentAtom) : match.currentAtom;
  const cmp  = COMPARISON_META[match.comparisonStatus] ?? COMPARISON_META.unknown;

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden mb-2">
      <button
        className="w-full text-left px-3 py-2.5 hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 leading-snug">{atom.summaryNepali}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-zinc-500">{atom.fiscalYear}</span>
              <span className={`text-[10px] font-medium ${cmp.tw}`}>{cmp.label}</span>
              {atom.amount != null && (
                <span className="text-[10px] text-yellow-400">{formatNPR(atom.amount)}</span>
              )}
              {match.similarity > 0 && (
                <span className="text-[10px] text-zinc-600">
                  {Math.round(match.similarity * 100)}% match
                </span>
              )}
            </div>
          </div>
          <span className="text-zinc-600 text-xs shrink-0 mt-0.5">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-zinc-800/60 pt-2">
          <p className="text-xs text-zinc-400">{atom.citizenMeaningNepali}</p>
          {atom.textEvidence && (
            <p className="text-xs text-zinc-600 italic bg-zinc-900 rounded p-2">
              "{atom.textEvidence}"
            </p>
          )}
          {match.previousAtom && !showPrevious && (
            <div className="text-xs text-zinc-600 bg-zinc-900 rounded p-2">
              <span className="text-zinc-500">गत वर्षको: </span>
              {match.previousAtom.summaryNepali}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MovementImpactRow({ impact }: { impact: MovementImpact }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SECTOR_META[impact.atom.sector as EconomicSector] ??
    { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };

  return (
    <div className="border border-purple-900/40 rounded-xl overflow-hidden mb-2 bg-purple-950/10">
      <button
        className="w-full text-left px-3 py-2.5 hover:bg-purple-950/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 leading-snug">{impact.atom.summaryNepali}</p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${meta.tw}`}>
                {meta.icon} {impact.atom.sector}
              </span>
              <span className="text-[10px] text-purple-400 font-medium">
                ⚡ {impact.demandType}
              </span>
              <span className="text-[10px] text-zinc-600">
                {Math.round(impact.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-[10px] text-purple-500 mt-1">{impact.beforeAfterContext}</p>
          </div>
          <span className="text-zinc-600 text-xs shrink-0 mt-0.5">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-purple-900/30 pt-2">
          <p className="text-xs text-zinc-400">{impact.atom.citizenMeaningNepali}</p>
          {impact.atom.textEvidence && (
            <p className="text-xs text-zinc-600 italic bg-zinc-900 rounded p-2">
              "{impact.atom.textEvidence}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ComparisonEngine({ atoms, fiscalYears, onAtomsUpdated }: Props) {
  const [baseYear,    setBaseYear]    = useState("");
  const [compareYear, setCompareYear] = useState("");
  const [report,      setReport]      = useState<ComparisonReport | null>(null);
  const [activeTab,   setActiveTab]   = useState<Tab>("sectors");
  const [saving,      setSaving]      = useState(false);
  const [saveMsg,     setSaveMsg]     = useState("");
  const [error,       setError]       = useState("");

  function runEngine() {
    setError("");
    setReport(null);
    setSaveMsg("");

    if (!baseYear || !compareYear) {
      setError("दुवै fiscal year छान्नुहोस्।");
      return;
    }
    if (baseYear === compareYear) {
      setError("दुई फरक fiscal year छान्नुहोस्।");
      return;
    }

    const prevAtoms = atoms.filter(a => a.fiscalYear === baseYear);
    const currAtoms = atoms.filter(a => a.fiscalYear === compareYear);

    if (prevAtoms.length === 0) {
      setError(`${baseYear} को atoms भेटिएनन् — पहिले extract गर्नुहोस्।`);
      return;
    }
    if (currAtoms.length === 0) {
      setError(`${compareYear} को atoms भेटिएनन् — पहिले extract गर्नुहोस्।`);
      return;
    }

    const result = runComparison(currAtoms, prevAtoms, compareYear, baseYear);
    setReport(result);
    setActiveTab("sectors");
  }

  async function saveResults() {
    if (!report) return;
    setSaving(true);
    setSaveMsg("");

    const updates = buildUpdatePayloads(report);
    const promises: Promise<void>[] = [];

    for (const [atomId, fields] of updates.entries()) {
      promises.push(
        updateDoc(fsDoc(db, "economy_atoms", atomId), fields).catch(e => {
          console.warn("[economy-compare] update failed:", atomId, e?.code ?? e);
        }),
      );
    }

    await Promise.all(promises);
    setSaving(false);
    setSaveMsg(`✅ ${updates.size} atoms updated — comparison results saved।`);
    onAtomsUpdated();
  }

  const tabCounts: Record<Tab, number> = {
    sectors:  report?.sectorTrends.length ?? 0,
    repeated: report?.stats.repeatedCount ?? 0,
    new:      report?.stats.newCount ?? 0,
    removed:  report?.stats.removedCount ?? 0,
    movement: report?.stats.movementCount ?? 0,
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300">वर्ष तुलना</h2>
        <span className="text-xs text-zinc-600">Year-to-Year Comparison Engine</span>
      </div>

      {/* Year selectors */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-4">
        {fiscalYears.length < 2 ? (
          <p className="text-zinc-500 text-sm">
            तुलना गर्न कम्तीमा दुई fiscal year का atoms चाहिन्छन्।
            <span className="text-zinc-600 text-xs block mt-1">
              माथिको Documents section बाट दोस्रो year extract गर्नुहोस्।
            </span>
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">
                  गत वर्ष (Base / Reference)
                </label>
                <select
                  value={baseYear}
                  onChange={e => { setBaseYear(e.target.value); setReport(null); setSaveMsg(""); }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
                >
                  <option value="">छान्नुहोस्...</option>
                  {fiscalYears.map(y => (
                    <option key={y} value={y} disabled={y === compareYear}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="hidden sm:flex items-center pt-5">
                <span className="text-zinc-600 text-xl">→</span>
              </div>

              <div className="flex-1">
                <label className="block text-xs text-zinc-500 mb-1">
                  यो वर्ष (Compare / Current)
                </label>
                <select
                  value={compareYear}
                  onChange={e => { setCompareYear(e.target.value); setReport(null); setSaveMsg(""); }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
                >
                  <option value="">छान्नुहोस्...</option>
                  {fiscalYears.map(y => (
                    <option key={y} value={y} disabled={y === baseYear}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="sm:pt-5 w-full sm:w-auto">
                <button
                  onClick={runEngine}
                  disabled={!baseYear || !compareYear || baseYear === compareYear}
                  className={
                    "w-full sm:w-auto text-sm px-4 py-2 rounded-lg font-medium transition-colors " +
                    (!baseYear || !compareYear || baseYear === compareYear
                      ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                      : "bg-cyan-600 text-white hover:bg-cyan-500")
                  }
                >
                  Compare गर्नुहोस्
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-amber-400">{error}</p>
            )}
          </>
        )}
      </div>

      {/* Results */}
      {report && (
        <div className="space-y-4">
          {/* Stats summary */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <StatChip
              label="Matched" value={report.stats.matched}
              color="border-zinc-700 text-zinc-300"
            />
            <StatChip
              label="New" value={report.stats.newCount}
              color="border-cyan-800 text-cyan-300"
            />
            <StatChip
              label="Removed" value={report.stats.removedCount}
              color="border-rose-900 text-rose-300"
            />
            <StatChip
              label="Repeated" value={report.stats.repeatedCount}
              color="border-amber-800 text-amber-300"
            />
            <StatChip
              label="Gen Z Impact" value={report.stats.movementCount}
              color="border-purple-800 text-purple-300"
            />
            <div className="text-center px-3 py-2 rounded-lg border border-zinc-800">
              <p className="text-[10px] text-zinc-500 leading-tight">
                {report.baseFiscalYear}
              </p>
              <p className="text-[10px] text-zinc-400">→</p>
              <p className="text-[10px] text-zinc-400 leading-tight">
                {report.compareFiscalYear}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-2">
            {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
              <TabButton
                key={tab}
                tab={tab}
                active={activeTab === tab}
                count={tabCounts[tab]}
                onClick={() => setActiveTab(tab)}
              />
            ))}
          </div>

          {/* Tab content */}
          <div>
            {/* Sector Trends */}
            {activeTab === "sectors" && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-zinc-600 px-1 mb-2">
                  <span>Sector</span>
                  <div className="grid grid-cols-3 gap-2 w-64 text-right">
                    <span>{report.baseFiscalYear}</span>
                    <span>{report.compareFiscalYear}</span>
                    <span>Change</span>
                  </div>
                </div>
                {report.sectorTrends.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">Sector data भेटिएन।</p>
                ) : (
                  report.sectorTrends.map(trend => (
                    <SectorRow key={trend.sector} trend={trend} />
                  ))
                )}
              </div>
            )}

            {/* Repeated Promises */}
            {activeTab === "repeated" && (
              <div>
                {report.repeatedPromises.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-zinc-500 text-sm">कुनै दोहोरिएको प्रतिबद्धता भेटिएन।</p>
                    <p className="text-zinc-600 text-xs mt-1">
                      दुवै वर्षमा policy_promise atoms हुनुपर्छ।
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-amber-400 mb-3">
                      यी प्रतिबद्धताहरू दुवै वर्षमा उस्तै भाषामा देखिएका छन्। कार्यान्वयन भएन?
                    </p>
                    {report.repeatedPromises.map((match, i) => (
                      <AtomMatchRow key={match.currentAtom.id + i} match={match} />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* New Programs */}
            {activeTab === "new" && (
              <div>
                {report.newAtoms.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">
                    नयाँ atoms भेटिएनन्।
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-cyan-400 mb-3">
                      {report.compareFiscalYear} मा पहिलो पटक देखिएका कार्यक्रम / नीति।
                    </p>
                    {report.newAtoms.map(atom => (
                      <AtomMatchRow
                        key={atom.id}
                        match={{ currentAtom: atom, previousAtom: null, similarity: 0, comparisonStatus: "new" }}
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Removed Programs */}
            {activeTab === "removed" && (
              <div>
                {report.removedAtoms.length === 0 ? (
                  <p className="text-zinc-600 text-sm text-center py-4">
                    हटाइएका कार्यक्रम भेटिएनन्।
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-rose-400 mb-3">
                      {report.baseFiscalYear} मा थियो, {report.compareFiscalYear} मा छैन।
                    </p>
                    {report.removedAtoms.map(atom => (
                      <AtomMatchRow
                        key={atom.id}
                        match={{ currentAtom: atom, previousAtom: null, similarity: 0, comparisonStatus: "removed" }}
                        showPrevious
                      />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Gen Z Movement Impact */}
            {activeTab === "movement" && (
              <div>
                {report.movementImpact.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-zinc-500 text-sm">
                      Gen Z आन्दोलन-सम्बन्धित atoms भेटिएनन्।
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                      २०८१ BS पछिका युवा, रोजगार, सुशासन atoms हुनुपर्छ।
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-purple-950/20 border border-purple-900/40 rounded-xl p-3 mb-3">
                      <p className="text-xs text-purple-300 font-medium">
                        Gen Z आन्दोलन (२०८१ BS) को नीतिगत प्रतिक्रिया
                      </p>
                      <p className="text-[10px] text-purple-500 mt-1">
                        यी atoms युवा, रोजगार, सुशासन र डिजिटल क्षेत्रमा
                        आन्दोलनको माग अनुसार नीति परिवर्तन देखाउँछन्।
                        Source evidence सहित track गरिएको।
                      </p>
                    </div>
                    {report.movementImpact.map((impact, i) => (
                      <MovementImpactRow key={impact.atom.id + i} impact={impact} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Save results */}
          <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
            <div>
              {saveMsg && (
                <p className="text-xs text-green-400">{saveMsg}</p>
              )}
              {!saveMsg && (
                <p className="text-xs text-zinc-600">
                  Results save गर्दा atoms मा comparisonStatus + year links थपिन्छन्।
                </p>
              )}
            </div>
            <button
              onClick={saveResults}
              disabled={saving}
              className={
                "text-xs px-4 py-2 rounded-lg font-medium transition-colors " +
                (saving
                  ? "bg-zinc-800 text-zinc-500 cursor-wait"
                  : "bg-zinc-700 text-zinc-200 hover:bg-zinc-600 hover:text-white border border-zinc-600")
              }
            >
              {saving ? "Saving..." : "Results Firestore मा Save गर्नुहोस्"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
