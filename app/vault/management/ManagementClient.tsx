"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VaultShell } from "../../../components/vault/VaultShell";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { buildCopilotContext } from "../../../lib/vault/copilotContext";
import { buildManagementOS } from "../../../lib/vault/managementEngine";
import { db } from "../../firebase";
import type {
  COOBriefing,
  DepartmentBriefing,
  DepartmentStatus,
  FounderWorkStep,
  ManagementOSState,
  TestItem,
} from "../../../lib/types/management";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DepartmentStatus }) {
  const styles: Record<DepartmentStatus, string> = {
    critical:        "bg-red-950/60 text-red-400 border-red-900/50",
    needs_attention: "bg-amber-950/60 text-amber-400 border-amber-900/50",
    on_track:        "bg-green-950/60 text-green-500 border-green-900/40",
    idle:            "bg-zinc-900/60 text-zinc-600 border-zinc-800",
  };
  const labels: Record<DepartmentStatus, string> = {
    critical:        "तुरुन्त",
    needs_attention: "ध्यान",
    on_track:        "राम्रो",
    idle:            "निष्क्रिय",
  };
  return (
    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── COO Panel — the orchestration voice ──────────────────────────────────────
// Founder reads this FIRST. One sentence. No ambiguity.

function COOPanel({ coo }: { coo: COOBriefing }) {
  const [showFeedback, setShowFeedback]   = useState(false);
  const [showTesting,  setShowTesting]    = useState(false);

  const borderColor =
    coo.systemStatus === "critical"          ? "border-red-900/50 bg-red-950/10" :
    coo.systemStatus === "attention_needed"  ? "border-amber-900/40 bg-amber-950/5" :
                                               "border-zinc-800/50 bg-zinc-950/20";

  const statusDot =
    coo.systemStatus === "critical"          ? "bg-red-500" :
    coo.systemStatus === "attention_needed"  ? "bg-amber-500" :
                                               "bg-green-500";

  const pendingTests = coo.testingItems.filter(t => t.status === "pending");

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${borderColor}`}>
      {/* Officer header */}
      <div className="flex items-center gap-3">
        <span className="text-xl">⚙️</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-white">मुख्य सञ्चालन अधिकारी</p>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
            <span className="text-[10px] text-zinc-500">{coo.systemStatusNp}</span>
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">Chief Operations Officer — आजको संक्षिप्त विवरण</p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          {coo.criticalCount > 0 && (
            <p className="text-[10px] font-bold text-red-400">{coo.criticalCount} critical</p>
          )}
          {coo.attentionCount > 0 && (
            <p className="text-[10px] text-amber-500">{coo.attentionCount} ध्यान माग्छन्</p>
          )}
        </div>
      </div>

      {/* THE focus statement — the most important element on the page */}
      <div className={`rounded-xl px-4 py-3.5 border ${
        coo.systemStatus === "critical"         ? "border-red-900/40 bg-red-950/20" :
        coo.systemStatus === "attention_needed" ? "border-amber-900/30 bg-amber-950/10" :
                                                  "border-white/[0.06] bg-white/[0.03]"
      }`}>
        <p className={`text-sm font-bold leading-snug ${
          coo.systemStatus === "critical"         ? "text-red-300" :
          coo.systemStatus === "attention_needed" ? "text-amber-200" :
                                                    "text-white"
        }`}>
          {coo.focusStatement}
        </p>
        <p className="text-[10px] text-zinc-600 mt-1.5">{coo.operationalNote}</p>
      </div>

      {/* Quick stats row */}
      <div className="flex gap-4 text-[11px] text-zinc-600">
        {coo.blockerCount > 0 && (
          <span className="text-amber-600">{coo.blockerCount} blockers</span>
        )}
        {pendingTests.length > 0 && (
          <button
            onClick={() => setShowTesting(!showTesting)}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            {pendingTests.length} testing pending {showTesting ? "▲" : "▼"}
          </button>
        )}
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          CTO सारांश {showFeedback ? "▲" : "▼"}
        </button>
      </div>

      {/* Testing queue — collapsible */}
      {showTesting && pendingTests.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Testing Queue</p>
          {pendingTests.map(item => (
            <TestRow key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* CTO feedback — collapsible */}
      {showFeedback && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-2">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">CTO को लागि सारांश</p>
          {coo.ctoFeedback.map((line, i) => (
            <p key={i} className="text-zinc-400 text-xs leading-relaxed">
              <span className="text-zinc-700 mr-1.5">→</span>{line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Test row ──────────────────────────────────────────────────────────────────

function TestRow({ item }: { item: TestItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
    >
      <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors text-[10px] mt-0.5 shrink-0">□</span>
      <div className="min-w-0">
        <p className="text-xs text-zinc-300 group-hover:text-white transition-colors leading-snug">{item.title}</p>
        <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">{item.description}</p>
      </div>
    </Link>
  );
}

// ─── Work step card ───────────────────────────────────────────────────────────

function WorkStepCard({ step, isFirst }: { step: FounderWorkStep; isFirst: boolean }) {
  const bg =
    step.urgency === "must_do"   ? "border-red-900/40 bg-red-950/10" :
    step.urgency === "should_do" ? "border-amber-900/40 bg-amber-950/8" :
                                   "border-zinc-800/60 bg-zinc-900/20";
  const numBg =
    step.urgency === "must_do"   ? "bg-red-700 text-white" :
    step.urgency === "should_do" ? "bg-amber-600 text-black" :
                                   "bg-zinc-800 text-zinc-500";
  const btnCls =
    step.urgency === "must_do"   ? "bg-red-800/60 hover:bg-red-700/80 text-red-200 border-red-700/40" :
    step.urgency === "should_do" ? "bg-amber-800/40 hover:bg-amber-700/60 text-amber-200 border-amber-700/30" :
                                   "bg-zinc-800/60 hover:bg-zinc-700/80 text-zinc-300 border-zinc-700/40";

  return (
    <div className={`rounded-xl border p-3.5 space-y-3 ${bg} ${isFirst ? "ring-1 ring-amber-700/20" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${numBg}`}>
          {step.order}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base shrink-0">{step.officer.icon}</span>
            <p className="text-xs font-bold text-white">{step.officer.titleNp}</p>
            <span className="text-[9px] text-zinc-600">{step.durationMins}m</span>
          </div>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{step.reason}</p>
        </div>
      </div>
      <Link
        href={step.actionHref}
        className={`block w-full text-center text-xs font-bold py-2 rounded-lg border transition-colors ${btnCls}`}
      >
        {step.actionLabel} →
      </Link>
      <p className="text-[9px] text-zinc-700 leading-tight">✓ {step.successCondition}</p>
    </div>
  );
}

// ─── Department card ──────────────────────────────────────────────────────────

function DepartmentCard({ b }: { b: DepartmentBriefing }) {
  const border =
    b.status === "critical"        ? "border-red-900/40" :
    b.status === "needs_attention" ? "border-amber-900/30" :
    b.status === "idle"            ? "border-zinc-800/30" :
                                     "border-zinc-800/50";

  return (
    <div className={`rounded-xl border p-3.5 space-y-3 bg-zinc-950/40 ${border}`}>
      <div className="flex items-center gap-2.5">
        <span className="text-lg shrink-0">{b.officer.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[11px] font-bold text-white leading-none">{b.officer.titleNp}</p>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-[9px] text-zinc-700 mt-0.5 truncate">{b.officer.title}</p>
        </div>
      </div>

      {b.kpis.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {b.kpis.slice(0, 3).map(kpi => (
            <div key={kpi.definition.id} className={`rounded-lg px-2 py-1.5 border text-center ${
              kpi.isOnTarget ? "border-green-900/30 bg-green-950/10" : "border-zinc-800/60 bg-zinc-900/40"
            }`}>
              <p className={`text-sm font-bold leading-none ${kpi.isOnTarget ? "text-green-400" : "text-zinc-300"}`}>
                {kpi.value}
              </p>
              <p className="text-[9px] text-zinc-600 mt-0.5 leading-none max-w-[64px] truncate">{kpi.definition.labelNp}</p>
            </div>
          ))}
        </div>
      )}

      {b.topTasks[0] && (
        <p className="text-[11px] text-zinc-500 leading-snug">→ {b.topTasks[0].titleNp}</p>
      )}
      {b.blockers[0] && (
        <p className="text-[10px] text-red-500/80 leading-snug">⊘ {b.blockers[0].blockedReason ?? "Blocked"}</p>
      )}

      <Link
        href={b.nextActionHref}
        className="block w-full text-center text-[10px] font-bold py-1.5 rounded-lg border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
      >
        {b.nextActionLabel} →
      </Link>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ManagementClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [state,   setState]   = useState<ManagementOSState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    buildCopilotContext(uid, db)
      .then(ctx => setState(buildManagementOS(ctx)))
      .catch(e  => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [uid]);

  if (authLoading) return null;

  return (
    <VaultShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xl">🏛</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Management OS</h1>
              <p className="text-zinc-600 text-xs mt-0.5">ZZC Founder Operating System — 10 departments</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-700 text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse mr-3" />
            System load हुँदैछ…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4 text-red-400 text-sm">
            Load गर्न सकिएन: {error}
          </div>
        )}

        {state && (
          <>
            {/* ── COO Panel — the voice of the organization ────────────── */}
            <section>
              <COOPanel coo={state.cooBriefing} />
            </section>

            {/* ── Founder Work Cycle ────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">आजको कार्य अनुक्रम</p>
                  <p className="text-white font-bold text-sm mt-0.5">
                    {state.cycle.totalSteps} steps · ~{state.cycle.totalMins} minutes
                  </p>
                </div>
                <div className="text-right space-y-0.5">
                  {state.cycle.mustDoSteps > 0 && (
                    <p className="text-[10px] font-bold text-red-400">{state.cycle.mustDoSteps} तुरुन्त</p>
                  )}
                  {state.cycle.shouldDoSteps > 0 && (
                    <p className="text-[10px] text-amber-500">{state.cycle.shouldDoSteps} गर्नुस्</p>
                  )}
                </div>
              </div>

              {state.cycle.weekFocus && (
                <p className="text-[10px] text-zinc-600 leading-snug">
                  यो हप्ता: {state.cycle.weekFocus}
                </p>
              )}

              <div className="space-y-2">
                {state.cycle.steps.map((step, i) => (
                  <WorkStepCard key={`${step.department}-${step.order}`} step={step} isFirst={i === 0} />
                ))}
              </div>

              {state.openDecisions.length > 0 && (
                <div className="rounded-xl border border-amber-900/30 bg-amber-950/8 p-4">
                  <p className="text-[9px] text-amber-600 uppercase tracking-widest font-bold mb-2">
                    तपाईंको निर्णय आवश्यक
                  </p>
                  {state.openDecisions.map((d, i) => (
                    <p key={i} className="text-amber-300 text-sm font-bold">→ {d}</p>
                  ))}
                </div>
              )}
            </section>

            {/* ── Department grid — 10 departments ─────────────────────── */}
            <section className="space-y-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                {state.departments.length} Departments
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {state.departments.map(b => (
                  <DepartmentCard key={b.department} b={b} />
                ))}
              </div>
            </section>
          </>
        )}

        <div className="pt-2 border-t border-zinc-800/50">
          <Link href="/vault" className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors">
            ← Vault
          </Link>
        </div>
      </div>
    </VaultShell>
  );
}
