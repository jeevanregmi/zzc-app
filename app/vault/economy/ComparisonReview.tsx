"use client";

import { useState, useMemo } from "react";
import { updateDoc, doc as fsDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { EconomicSector } from "../../../lib/types/economy";
import { SECTOR_META, COMPARISON_META, formatNPR } from "../../../lib/types/economy";
import type { ComparisonReport, AtomMatch, MovementImpact } from "../../../lib/economy/comparison";

// ── Decision types ────────────────────────────────────────────────────────────

type MatchDecision = "correct" | "wrong" | "needs_revision" | "public_ready";
type MovementDecision = "confirmed" | "not_related" | "needs_context";

// ── Plain Nepali system explanations ──────────────────────────────────────────

function explainMatch(match: AtomMatch): string {
  const { comparisonStatus, similarity, percentChange, currentAtom, previousAtom } = match;
  const simPct = Math.round(similarity * 100);
  switch (comparisonStatus) {
    case "repeated":
      return `दुवै वर्षको text ${simPct}% मिल्दो छ — यो कार्यक्रम गत वर्ष पनि आएको थियो, यस वर्ष पनि दोहोरिएको देखिन्छ।`;
    case "increased": {
      const pct = (percentChange ?? 0).toFixed(1);
      return `रकम ${pct}% बढेको देखियो। ${previousAtom?.fiscalYear ?? "गत वर्ष"} को तुलनामा ${currentAtom.fiscalYear} मा बढी विनियोजन।`;
    }
    case "decreased": {
      const pct = Math.abs(percentChange ?? 0).toFixed(1);
      return `रकम ${pct}% घटेको देखियो। ${previousAtom?.fiscalYear ?? "गत वर्ष"} को तुलनामा ${currentAtom.fiscalYear} मा कम विनियोजन।`;
    }
    case "continued":
      return simPct > 0
        ? `गत वर्षसँग ${simPct}% मिल्दो — उस्तै नीति जारी रहेको देखिन्छ।`
        : `रकम लगभग उस्तै छ — नीति जारी रहेको देखिन्छ।`;
    case "new":
      return `${currentAtom.fiscalYear} मा पहिलो पटक यो record देखियो। गत वर्षको data मिलेन।`;
    default:
      return "System ले यसलाई गत वर्षसँग match गर्यो।";
  }
}

function explainMovement(impact: MovementImpact): string {
  const pct = Math.round(impact.confidence * 100);
  return `"${impact.atom.sector}" क्षेत्रको atom — Gen Z आन्दोलनसँग सम्बन्धित keywords देखिएका छन् (${pct}% confidence)। यो सम्भावित संकेत हो — founder review बिना public गर्न हुँदैन।`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReviewButtons({
  atomId,
  decision,
  onDecide,
}: {
  atomId: string;
  decision: MatchDecision | undefined;
  onDecide: (id: string, d: MatchDecision) => void;
}) {
  const btns: { d: MatchDecision; label: string; tw: string }[] = [
    { d: "correct",       label: "✓ सही",         tw: "border-green-800 text-green-400 hover:bg-green-950/40"  },
    { d: "wrong",         label: "✗ गलत",          tw: "border-red-800 text-red-400 hover:bg-red-950/40"        },
    { d: "needs_revision", label: "~ हेर्नुपर्छ",  tw: "border-amber-800 text-amber-400 hover:bg-amber-950/40"  },
    { d: "public_ready",  label: "🌐 Public",      tw: "border-cyan-800 text-cyan-400 hover:bg-cyan-950/40"     },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {btns.map(({ d, label, tw }) => (
        <button
          key={d}
          onClick={() => onDecide(atomId, d)}
          className={
            `text-[11px] px-2.5 py-1 rounded-lg border transition-colors font-medium ${tw} ` +
            (decision === d ? "ring-1 ring-offset-0 ring-zinc-400 brightness-125" : "")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function MovementReviewButtons({
  atomId,
  decision,
  onDecide,
}: {
  atomId: string;
  decision: MovementDecision | undefined;
  onDecide: (id: string, d: MovementDecision) => void;
}) {
  const btns: { d: MovementDecision; label: string; tw: string }[] = [
    { d: "confirmed",    label: "✓ Impact confirmed",  tw: "border-purple-800 text-purple-400 hover:bg-purple-950/40" },
    { d: "not_related",  label: "✗ सम्बन्धित छैन",    tw: "border-red-800 text-red-400 hover:bg-red-950/40"          },
    { d: "needs_context", label: "~ थप context चाहिन्छ", tw: "border-amber-800 text-amber-400 hover:bg-amber-950/40"  },
  ];
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {btns.map(({ d, label, tw }) => (
        <button
          key={d}
          onClick={() => onDecide(atomId, d)}
          className={
            `text-[11px] px-2.5 py-1 rounded-lg border transition-colors font-medium ${tw} ` +
            (decision === d ? "ring-1 ring-offset-0 ring-zinc-400 brightness-125" : "")
          }
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function EvidenceBlock({
  fiscalYear,
  summaryNepali,
  textEvidence,
  pageNumber,
  amount,
  docTitle,
  label,
}: {
  fiscalYear: string;
  summaryNepali: string;
  textEvidence: string;
  pageNumber: number;
  amount?: number | null;
  docTitle?: string;
  label: string;
}) {
  return (
    <div className="bg-zinc-800/40 rounded-lg p-2.5 space-y-1">
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{label} · {fiscalYear}</p>
      <p className="text-xs text-zinc-200 leading-snug">{summaryNepali}</p>
      {amount != null && (
        <p className="text-xs text-yellow-400 font-medium">{formatNPR(amount)}</p>
      )}
      <p className="text-[10px] text-zinc-600 italic">
        Page {pageNumber}: "{textEvidence.slice(0, 200)}{textEvidence.length > 200 ? "…" : ""}"
      </p>
      {docTitle && (
        <p className="text-[10px] text-zinc-700">Source: {docTitle}</p>
      )}
    </div>
  );
}

// Priority order for review: repeated → movement → changed amounts → continued → new/removed
function getReviewPriority(match: AtomMatch): number {
  switch (match.comparisonStatus) {
    case "repeated":   return 0;
    case "increased":  return 1;
    case "decreased":  return 1;
    case "continued":  return 3;
    case "new":        return 4;
    case "removed":    return 4;
    default:           return 5;
  }
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  report:         ComparisonReport;
  onReviewsSaved: () => void;
}

export function ComparisonReview({ report, onReviewsSaved }: Props) {
  const [matchReviews, setMatchReviews]       = useState<Record<string, MatchDecision>>({});
  const [movementReviews, setMovementReviews] = useState<Record<string, MovementDecision>>({});
  const [saving, setSaving]   = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // Only show matches that are meaningful to review
  const reviewQueue = useMemo(() => {
    return [...report.matches]
      .filter(m => m.comparisonStatus !== "new")  // new atoms don't need comparison review
      .sort((a, b) => getReviewPriority(a) - getReviewPriority(b));
  }, [report.matches]);

  const totalItems   = reviewQueue.length + report.movementImpact.length;
  const reviewedMatchCount   = Object.keys(matchReviews).length;
  const reviewedMovementCount = Object.keys(movementReviews).length;
  const totalReviewed = reviewedMatchCount + reviewedMovementCount;

  function setMatchDecision(atomId: string, decision: MatchDecision) {
    setMatchReviews(p => ({ ...p, [atomId]: decision }));
  }

  function setMovementDecision(atomId: string, decision: MovementDecision) {
    setMovementReviews(p => ({ ...p, [atomId]: decision }));
  }

  async function saveAllReviews() {
    setSaving(true);
    setSaveMsg("");
    const now = new Date().toISOString();
    const promises: Promise<void>[] = [];

    // Save match reviews
    for (const [atomId, decision] of Object.entries(matchReviews)) {
      const fields: Record<string, unknown> = { updatedAt: now };
      switch (decision) {
        case "correct":
          fields.verificationStatus = "founder_verified";
          break;
        case "wrong":
          fields.verificationStatus  = "needs_revision";
          fields.comparisonStatus    = "unknown";
          fields.previousYearAtomIds = [];
          fields.previousYearReference = null;
          fields.percentChange       = null;
          break;
        case "needs_revision":
          fields.verificationStatus = "needs_revision";
          break;
        case "public_ready":
          fields.verificationStatus = "founder_verified";
          fields.publishedToPublic  = true;
          break;
      }
      promises.push(
        updateDoc(fsDoc(db, "economy_atoms", atomId), fields).catch(e => {
          console.warn("[review] match update failed:", atomId, e?.code ?? e);
        }),
      );
    }

    // Save movement reviews
    for (const [atomId, decision] of Object.entries(movementReviews)) {
      const fields: Record<string, unknown> = { updatedAt: now };
      switch (decision) {
        case "confirmed":
          fields.atomType           = "movement_impact";
          fields.verificationStatus = "founder_verified";
          break;
        case "not_related":
          fields.relatedMovement    = null;
          fields.beforeAfterContext = null;
          fields.verificationStatus = "needs_revision";
          break;
        case "needs_context":
          fields.verificationStatus = "needs_revision";
          break;
      }
      promises.push(
        updateDoc(fsDoc(db, "economy_atoms", atomId), fields).catch(e => {
          console.warn("[review] movement update failed:", atomId, e?.code ?? e);
        }),
      );
    }

    await Promise.all(promises);
    setSaving(false);
    setSaveMsg(`✅ ${totalReviewed} reviews saved।`);
    onReviewsSaved();
  }

  if (totalItems === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-zinc-500 text-sm">Review गर्ने items छैनन्।</p>
        <p className="text-zinc-600 text-xs mt-1">पहिले comparison run गर्नुहोस्।</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-zinc-300 font-medium">
            {totalReviewed} / {totalItems} reviewed
          </p>
          <div className="w-32 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-600 rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (totalReviewed / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>
        {totalReviewed > 0 && (
          <button
            onClick={saveAllReviews}
            disabled={saving}
            className={
              "text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors " +
              (saving
                ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-wait"
                : "bg-zinc-800 text-zinc-200 border-zinc-600 hover:bg-zinc-700 hover:text-white")
            }
          >
            {saving ? "Saving..." : `${totalReviewed} reviews save गर्नुहोस्`}
          </button>
        )}
      </div>

      {saveMsg && <p className="text-xs text-green-400">{saveMsg}</p>}

      {/* Repeated Promises — highest priority */}
      {report.repeatedPromises.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <h3 className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              दोहोरिएका प्रतिबद्धताहरू — Accountability Signal
            </h3>
            <span className="text-xs text-zinc-600">({report.repeatedPromises.length})</span>
          </div>
          <p className="text-[10px] text-zinc-600">
            यी प्रतिबद्धताहरू दुवै वर्षमा उस्तै भाषामा देखिएका छन्।
            कार्यान्वयन भयो कि भएन — founder ले verify गर्नुपर्छ।
          </p>
          {report.repeatedPromises.map((match, i) => {
            const sectorMeta = SECTOR_META[match.currentAtom.sector as EconomicSector]
              ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
            const decision = matchReviews[match.currentAtom.id];
            return (
              <div key={match.currentAtom.id + i}
                className={`border rounded-xl p-3 space-y-2 transition-colors ${
                  decision ? "border-zinc-700 bg-zinc-900/40" : "border-amber-900/40 bg-amber-950/10"
                }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${sectorMeta.tw}`}>
                    {sectorMeta.icon} {match.currentAtom.sector}
                  </span>
                  {match.currentAtom.ministry && (
                    <span className="text-[10px] text-zinc-500">{match.currentAtom.ministry}</span>
                  )}
                  <span className="text-[10px] text-amber-400 font-medium">
                    {Math.round(match.similarity * 100)}% text मिल्दो
                  </span>
                  {decision && (
                    <span className={`text-[10px] font-medium ${
                      decision === "correct"    ? "text-green-400"  :
                      decision === "wrong"      ? "text-red-400"    :
                      decision === "public_ready" ? "text-cyan-400" : "text-amber-400"
                    }`}>
                      ● {decision === "correct" ? "सही" : decision === "wrong" ? "गलत" : decision === "public_ready" ? "Public" : "Review"}
                    </span>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <EvidenceBlock
                    label="यो वर्ष"
                    fiscalYear={match.currentAtom.fiscalYear}
                    summaryNepali={match.currentAtom.summaryNepali}
                    textEvidence={match.currentAtom.textEvidence}
                    pageNumber={match.currentAtom.pageNumber}
                    amount={match.currentAtom.amount}
                    docTitle={match.currentAtom.sourceDocTitle}
                  />
                  {match.previousAtom && (
                    <EvidenceBlock
                      label="गत वर्ष"
                      fiscalYear={match.previousAtom.fiscalYear}
                      summaryNepali={match.previousAtom.summaryNepali}
                      textEvidence={match.previousAtom.textEvidence}
                      pageNumber={match.previousAtom.pageNumber}
                      amount={match.previousAtom.amount}
                      docTitle={match.previousAtom.sourceDocTitle}
                    />
                  )}
                </div>
                <div className="bg-amber-950/20 border border-amber-900/30 rounded-lg px-2.5 py-1.5">
                  <p className="text-[10px] text-amber-300">
                    प्रणाली: {explainMatch(match)}
                  </p>
                </div>
                <ReviewButtons
                  atomId={match.currentAtom.id}
                  decision={decision}
                  onDecide={setMatchDecision}
                />
              </div>
            );
          })}
        </section>
      )}

      {/* Changed amounts — increased/decreased */}
      {(() => {
        const changed = reviewQueue.filter(m =>
          m.comparisonStatus === "increased" || m.comparisonStatus === "decreased",
        );
        if (changed.length === 0) return null;
        return (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                रकम परिवर्तन — Amount Changes
              </h3>
              <span className="text-xs text-zinc-600">({changed.length})</span>
            </div>
            <p className="text-[10px] text-zinc-600">
              रकम बढेको वा घटेको atoms। Source amounts verify गर्नुहोस्।
            </p>
            {changed.map((match, i) => {
              const sectorMeta = SECTOR_META[match.currentAtom.sector as EconomicSector]
                ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
              const cmpMeta  = COMPARISON_META[match.comparisonStatus] ?? COMPARISON_META.unknown;
              const decision = matchReviews[match.currentAtom.id];
              return (
                <div key={match.currentAtom.id + i}
                  className={`border rounded-xl p-3 space-y-2 transition-colors ${
                    decision ? "border-zinc-700 bg-zinc-900/40" : "border-zinc-800 bg-zinc-900/60"
                  }`}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${sectorMeta.tw}`}>
                      {sectorMeta.icon} {match.currentAtom.sector}
                    </span>
                    <span className={`text-[10px] font-medium ${cmpMeta.tw}`}>{cmpMeta.label}</span>
                    {match.percentChange != null && (
                      <span className={`text-[10px] font-bold ${
                        match.percentChange > 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {match.percentChange > 0 ? "+" : ""}{match.percentChange.toFixed(1)}%
                      </span>
                    )}
                    {decision && (
                      <span className={`text-[10px] font-medium ${
                        decision === "correct" ? "text-green-400" :
                        decision === "wrong"   ? "text-red-400"   :
                        decision === "public_ready" ? "text-cyan-400" : "text-amber-400"
                      }`}>
                        ● {decision === "correct" ? "सही" : decision === "wrong" ? "गलत" : decision === "public_ready" ? "Public" : "Review"}
                      </span>
                    )}
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <EvidenceBlock
                      label="यो वर्ष"
                      fiscalYear={match.currentAtom.fiscalYear}
                      summaryNepali={match.currentAtom.summaryNepali}
                      textEvidence={match.currentAtom.textEvidence}
                      pageNumber={match.currentAtom.pageNumber}
                      amount={match.currentAtom.amount}
                    />
                    {match.previousAtom && (
                      <EvidenceBlock
                        label="गत वर्ष"
                        fiscalYear={match.previousAtom.fiscalYear}
                        summaryNepali={match.previousAtom.summaryNepali}
                        textEvidence={match.previousAtom.textEvidence}
                        pageNumber={match.previousAtom.pageNumber}
                        amount={match.previousAtom.amount}
                      />
                    )}
                  </div>
                  <div className="bg-zinc-800/40 rounded-lg px-2.5 py-1.5">
                    <p className="text-[10px] text-zinc-400">
                      प्रणाली: {explainMatch(match)}
                    </p>
                  </div>
                  <ReviewButtons
                    atomId={match.currentAtom.id}
                    decision={decision}
                    onDecide={setMatchDecision}
                  />
                </div>
              );
            })}
          </section>
        );
      })()}

      {/* Continued atoms — lower priority */}
      {(() => {
        const continued = reviewQueue.filter(m => m.comparisonStatus === "continued");
        if (continued.length === 0) return null;
        return (
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                जारी नीतिहरू — Continued
              </h3>
              <span className="text-xs text-zinc-600">({continued.length})</span>
            </div>
            {continued.map((match, i) => {
              const sectorMeta = SECTOR_META[match.currentAtom.sector as EconomicSector]
                ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
              const decision = matchReviews[match.currentAtom.id];
              return (
                <div key={match.currentAtom.id + i}
                  className="border border-zinc-800/60 rounded-xl p-3 space-y-2 bg-zinc-900/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${sectorMeta.tw}`}>
                      {sectorMeta.icon} {match.currentAtom.sector}
                    </span>
                    <span className="text-[10px] text-zinc-500">निरन्तर ({Math.round(match.similarity * 100)}% match)</span>
                    {decision && (
                      <span className="text-[10px] font-medium text-green-400">● सही</span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-snug">{match.currentAtom.summaryNepali}</p>
                  <p className="text-[10px] text-zinc-600">
                    प्रणाली: {explainMatch(match)}
                  </p>
                  <ReviewButtons
                    atomId={match.currentAtom.id}
                    decision={decision}
                    onDecide={setMatchDecision}
                  />
                </div>
              );
            })}
          </section>
        );
      })()}

      {/* Gen Z Movement Impact Review */}
      {report.movementImpact.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <h3 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
              Gen Z Impact — सम्भावित संकेत
            </h3>
            <span className="text-xs text-zinc-600">({report.movementImpact.length})</span>
          </div>
          <div className="bg-purple-950/20 border border-purple-900/30 rounded-lg p-2.5 mb-2">
            <p className="text-[10px] text-purple-400">
              यी atoms Gen Z आन्दोलन (२०८१ BS) सँग सम्बन्धित हुन सक्छन् — rule-based detection।
              "Gen Z movement ले यो भयो" भनेर दाबी गर्न founder verification चाहिन्छ।
            </p>
          </div>
          {report.movementImpact.map((impact, i) => {
            const sectorMeta = SECTOR_META[impact.atom.sector as EconomicSector]
              ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
            const decision = movementReviews[impact.atom.id];
            const pct = Math.round(impact.confidence * 100);
            return (
              <div key={impact.atom.id + i}
                className={`border rounded-xl p-3 space-y-2 transition-colors ${
                  decision ? "border-zinc-700 bg-zinc-900/30" : "border-purple-900/40 bg-purple-950/10"
                }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${sectorMeta.tw}`}>
                    {sectorMeta.icon} {impact.atom.sector}
                  </span>
                  <span className="text-[10px] text-purple-400 font-medium">⚡ {impact.demandType}</span>
                  <span className="text-[10px] text-zinc-600">{pct}% confidence</span>
                  {decision && (
                    <span className={`text-[10px] font-medium ${
                      decision === "confirmed"    ? "text-purple-400" :
                      decision === "not_related"  ? "text-red-400"    : "text-amber-400"
                    }`}>
                      ● {decision === "confirmed" ? "Confirmed" : decision === "not_related" ? "Not related" : "Needs context"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-200 leading-snug">{impact.atom.summaryNepali}</p>
                <p className="text-xs text-zinc-400">{impact.atom.citizenMeaningNepali}</p>
                <p className="text-[10px] text-zinc-600 italic bg-zinc-800/40 rounded px-2 py-1">
                  Page {impact.atom.pageNumber}: "{impact.atom.textEvidence.slice(0, 200)}"
                </p>
                <div className="bg-purple-950/20 border border-purple-900/20 rounded-lg px-2.5 py-1.5">
                  <p className="text-[10px] text-purple-400">
                    प्रणाली: {explainMovement(impact)}
                  </p>
                </div>
                <MovementReviewButtons
                  atomId={impact.atom.id}
                  decision={decision}
                  onDecide={setMovementDecision}
                />
              </div>
            );
          })}
        </section>
      )}

      {/* Bottom save bar */}
      {totalReviewed > 0 && (
        <div className="sticky bottom-0 bg-zinc-950/95 border-t border-zinc-800 py-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            {totalReviewed}/{totalItems} reviewed
            {totalItems - totalReviewed > 0 && (
              <span className="ml-2 text-zinc-600">
                · {totalItems - totalReviewed} बाँकी छन्
              </span>
            )}
          </p>
          <button
            onClick={saveAllReviews}
            disabled={saving}
            className={
              "text-xs px-4 py-2 rounded-lg font-medium border transition-colors " +
              (saving
                ? "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-wait"
                : "bg-cyan-950 text-cyan-300 border-cyan-800 hover:bg-cyan-900 hover:text-white")
            }
          >
            {saving ? "Saving..." : `${totalReviewed} reviews Firestore मा save गर्नुहोस्`}
          </button>
        </div>
      )}
    </div>
  );
}
