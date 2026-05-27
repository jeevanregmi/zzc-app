"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VaultShell } from "../../../components/vault/VaultShell";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { buildCopilotContext } from "../../../lib/vault/copilotContext";
import { buildManagementOS } from "../../../lib/vault/managementEngine";
import { db } from "../../firebase";
import type { ManagementOSState } from "../../../lib/types/management";
import type {
  DepartmentBriefing,
  DepartmentStatus,
  FounderWorkStep,
} from "../../../lib/types/management";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DepartmentStatus }) {
  const map: Record<DepartmentStatus, string> = {
    critical:        "bg-red-950/60 text-red-400 border-red-900/50",
    needs_attention: "bg-amber-950/60 text-amber-400 border-amber-900/50",
    on_track:        "bg-green-950/60 text-green-400 border-green-900/50",
    idle:            "bg-zinc-900 text-zinc-600 border-zinc-800",
  };
  const labels: Record<DepartmentStatus, string> = {
    critical:        "तुरुन्त",
    needs_attention: "ध्यान दिनुस्",
    on_track:        "राम्रो",
    idle:            "सक्रिय छैन",
  };
  return (
    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wide ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

// ─── Work step card ───────────────────────────────────────────────────────────

function WorkStepCard({ step, isFirst }: { step: FounderWorkStep; isFirst: boolean }) {
  const urgencyColor =
    step.urgency === "must_do"     ? "border-red-900/50 bg-red-950/10" :
    step.urgency === "should_do"   ? "border-amber-900/50 bg-amber-950/10" :
                                     "border-zinc-800 bg-zinc-900/30";
  const numColor =
    step.urgency === "must_do"     ? "bg-red-700 text-white" :
    step.urgency === "should_do"   ? "bg-amber-600 text-black" :
                                     "bg-zinc-800 text-zinc-400";
  const btnColor =
    step.urgency === "must_do"     ? "bg-red-700 hover:bg-red-600 text-white" :
    step.urgency === "should_do"   ? "bg-amber-600 hover:bg-amber-500 text-black" :
                                     "bg-zinc-800 hover:bg-zinc-700 text-white";

  return (
    <div className={`rounded-xl border p-3.5 space-y-3 transition-colors ${urgencyColor} ${isFirst ? "ring-1 ring-amber-700/30" : ""}`}>
      <div className="flex items-start gap-3">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5 ${numColor}`}>
          {step.order}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base shrink-0">{step.officer.icon}</span>
            <p className="text-xs font-black text-white">{step.officer.titleNp}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
              step.urgency === "must_do" ? "bg-red-950/60 text-red-400" :
              step.urgency === "should_do" ? "bg-amber-950/60 text-amber-400" :
              "bg-zinc-900 text-zinc-600"
            }`}>
              {step.durationMins} min
            </span>
          </div>
          <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{step.reason}</p>
        </div>
      </div>
      <Link
        href={step.actionHref}
        className={`block w-full text-center text-xs font-black py-2 rounded-lg transition-colors ${btnColor}`}
      >
        {step.actionLabel} →
      </Link>
      <p className="text-[9px] text-zinc-700 leading-tight">
        ✓ {step.successCondition}
      </p>
    </div>
  );
}

// ─── Department card ──────────────────────────────────────────────────────────

function DepartmentCard({ b }: { b: DepartmentBriefing }) {
  const borderColor =
    b.status === "critical"        ? "border-red-900/50" :
    b.status === "needs_attention" ? "border-amber-900/40" :
    b.status === "idle"            ? "border-zinc-800/40" :
                                     "border-zinc-800";

  return (
    <div className={`rounded-xl border p-3.5 space-y-3 bg-zinc-950/50 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="text-xl shrink-0">{b.officer.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-black text-white leading-none">{b.officer.titleNp}</p>
            <StatusBadge status={b.status} />
          </div>
          <p className="text-[10px] text-zinc-600 mt-0.5">{b.officer.title}</p>
        </div>
      </div>

      {/* KPIs */}
      {b.kpis.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {b.kpis.slice(0, 3).map(kpi => (
            <div key={kpi.definition.id} className={`rounded-lg px-2 py-1 border text-center min-w-0 ${
              kpi.isOnTarget ? "border-green-900/40 bg-green-950/10" : "border-zinc-800 bg-zinc-900/50"
            }`}>
              <p className={`text-sm font-black leading-none ${kpi.isOnTarget ? "text-green-400" : "text-white"}`}>
                {kpi.value}
              </p>
              <p className="text-[9px] text-zinc-600 mt-0.5 leading-none">{kpi.definition.labelNp}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top task */}
      {b.topTasks[0] && (
        <p className="text-[11px] text-zinc-400 leading-snug">
          → {b.topTasks[0].titleNp}
        </p>
      )}

      {/* Blocker */}
      {b.blockers[0] && (
        <p className="text-[10px] text-red-400 leading-snug">
          🔴 {b.blockers[0].blockedReason ?? "Blocked"}
        </p>
      )}

      {/* Action */}
      <Link
        href={b.nextActionHref}
        className="block w-full text-center text-[11px] font-black py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
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
      .catch(e => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, [uid]);

  if (authLoading) return null;

  return (
    <VaultShell>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛</span>
            <div>
              <h1 className="text-xl font-black text-white leading-none">Management OS</h1>
              <p className="text-zinc-600 text-xs mt-0.5">ZZC Founder Operating System — सबै departments एकैठाउँमा</p>
            </div>
          </div>
          {state && (
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              {state.urgentCount > 0 && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-950/60 text-red-400 border border-red-900/50">
                  🔴 {state.urgentCount} critical
                </span>
              )}
              {state.blockerCount > 0 && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-950/60 text-amber-400 border border-amber-900/50">
                  ⚠ {state.blockerCount} blockers
                </span>
              )}
              <span className="text-[10px] text-zinc-700">
                {new Date(state.computedAt).toLocaleTimeString("ne-NP")} मा update भयो
              </span>
            </div>
          )}
        </div>

        {/* ── Loading / error ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
            Management OS load हुँदैछ…
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/10 p-4 text-red-400 text-sm">
            Load गर्न सकिएन: {error}
          </div>
        )}

        {state && (
          <>
            {/* ── Today's Founder Route ─────────────────────────────────────── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">आजको Founder Route</p>
                  <p className="text-white font-black text-base leading-snug mt-0.5">
                    {state.cycle.totalSteps} steps · ~{state.cycle.totalMins} minutes
                  </p>
                </div>
                <div className="text-right space-y-1">
                  {state.cycle.mustDoSteps > 0 && (
                    <p className="text-[10px] font-black text-red-400">{state.cycle.mustDoSteps} MUST DO</p>
                  )}
                  {state.cycle.shouldDoSteps > 0 && (
                    <p className="text-[10px] font-black text-amber-400">{state.cycle.shouldDoSteps} should do</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-1 space-y-1">
                <p className="text-[10px] text-zinc-600 px-3 pt-2 font-bold">{state.cycle.weekFocus}</p>
                <div className="space-y-1.5 p-2">
                  {state.cycle.steps.map((step, i) => (
                    <WorkStepCard key={`${step.department}-${step.order}`} step={step} isFirst={i === 0} />
                  ))}
                </div>
              </div>

              {state.openDecisions.length > 0 && (
                <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3.5">
                  <p className="text-[9px] text-amber-500 uppercase tracking-widest font-black mb-2">
                    Founder Decision आवश्यक
                  </p>
                  {state.openDecisions.map((d, i) => (
                    <p key={i} className="text-amber-300 text-sm font-bold">→ {d}</p>
                  ))}
                </div>
              )}
            </section>

            {/* ── Department status grid ────────────────────────────────────── */}
            <section className="space-y-3">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">
                Departments ({state.departments.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {state.departments.map(b => (
                  <DepartmentCard key={b.department} b={b} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── Back ─────────────────────────────────────────────────────────── */}
        <div className="pt-2 border-t border-zinc-800">
          <Link href="/vault" className="text-zinc-600 hover:text-white text-xs transition-colors">
            ← Vault Dashboard
          </Link>
        </div>
      </div>
    </VaultShell>
  );
}
