"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCTOInsights } from "../../hooks/vault/useCTOInsights";
import { systemHealthStatus } from "../../lib/vault/ctoEngine";
import type { CTOInsight, InsightPriority } from "../../lib/vault/ctoEngine";

// ── Styling maps ─────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<InsightPriority, {
  bg: string; border: string; text: string; dot: string; badge: string;
}> = {
  critical: { bg: "bg-red-950/70",    border: "border-red-800",    text: "text-red-400",    dot: "bg-red-500",    badge: "bg-red-600 text-white"       },
  high:     { bg: "bg-amber-950/60",  border: "border-amber-800",  text: "text-amber-400",  dot: "bg-amber-500",  badge: "bg-amber-500 text-black"      },
  medium:   { bg: "bg-blue-950/40",   border: "border-blue-900",   text: "text-blue-400",   dot: "bg-blue-500",   badge: "bg-blue-900 text-blue-300"    },
  low:      { bg: "bg-zinc-900/60",   border: "border-zinc-800",   text: "text-zinc-400",   dot: "bg-zinc-500",   badge: "bg-zinc-800 text-zinc-400"    },
};

const HEALTH_LABEL: Record<ReturnType<typeof systemHealthStatus>, { np: string; dot: string; text: string }> = {
  critical:  { np: "Critical",         dot: "bg-red-500",    text: "text-red-400"   },
  attention: { np: "ध्यान चाहिन्छ",   dot: "bg-amber-500",  text: "text-amber-400" },
  progress:  { np: "Progress मा",      dot: "bg-blue-400",   text: "text-blue-400"  },
  healthy:   { np: "राम्रो छ",         dot: "bg-green-500",  text: "text-green-400" },
};

// ── Insight card ─────────────────────────────────────────────────────────────

function PrimaryCard({ insight }: { insight: CTOInsight }) {
  const s = PRIORITY_STYLE[insight.priority];
  const priorityLabel =
    insight.priority === "critical" ? "🚨 Critical" :
    insight.priority === "high"     ? "⚡ Most Important Next Step" :
    insight.priority === "medium"   ? "📋 Recommended" : "💡 Note";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${s.bg} ${s.border}`}>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
        <span className={`text-[9px] font-black uppercase tracking-widest ${s.text}`}>
          {priorityLabel}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">{insight.icon}</span>
        <div className="min-w-0 space-y-1">
          <p className="text-white font-black text-sm leading-snug">{insight.titleNp}</p>
          <p className="text-zinc-400 text-xs leading-relaxed">{insight.bodyNp}</p>
        </div>
      </div>
      {insight.actionHref && insight.actionLabel && (
        <Link
          href={insight.actionHref}
          className="block text-center text-sm font-black py-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
        >
          {insight.actionLabel} →
        </Link>
      )}
    </div>
  );
}

function CompactCard({ insight }: { insight: CTOInsight }) {
  const s = PRIORITY_STYLE[insight.priority];
  return (
    <div className={`rounded-xl border px-3 py-2.5 flex items-start gap-2.5 ${s.border} bg-zinc-950/40`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-bold leading-snug">{insight.titleNp}</p>
        <p className="text-zinc-500 text-[10px] leading-relaxed mt-0.5 line-clamp-2">{insight.bodyNp}</p>
      </div>
      {insight.actionHref && (
        <Link
          href={insight.actionHref}
          className={`text-[11px] font-black shrink-0 mt-0.5 hover:opacity-80 transition-opacity ${s.text}`}
        >
          →
        </Link>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CTOAssistant({ uid }: { uid: string | null }) {
  const [open, setOpen] = useState(false);
  const { insights, snapshot, loading, lastRefresh, refresh } = useCTOInsights(uid);

  // Restore panel state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem("zzc_cto_open") === "true") setOpen(true);
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("zzc_cto_open", String(open)); } catch { /* ignore */ }
  }, [open]);

  if (!uid) return null;

  const health       = systemHealthStatus(insights);
  const hl           = HEALTH_LABEL[health];
  const criticalCount = insights.filter(i => i.priority === "critical").length;
  const highCount     = insights.filter(i => i.priority === "high").length;
  const urgentCount   = criticalCount + highCount;

  const topInsight    = insights[0] ?? null;
  const restInsights  = insights.slice(1, 6);

  const minutesSince = lastRefresh
    ? Math.floor((Date.now() - lastRefresh.getTime()) / 60_000)
    : null;

  return (
    <>
      {/* ── Floating dock button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        title="🧠 CTO Assistant"
        className={`
          fixed bottom-5 right-5 z-40
          flex items-center gap-2 px-3 py-2 rounded-2xl border shadow-xl
          transition-all duration-200
          ${open
            ? "bg-zinc-800 border-zinc-600 text-white"
            : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white hover:bg-zinc-900"
          }
        `}
      >
        <span className="text-base leading-none">🧠</span>
        <span className="text-xs font-black hidden sm:inline">CTO</span>

        {/* Urgent count badge */}
        {urgentCount > 0 && (
          <span className={`
            text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none
            ${criticalCount > 0 ? "bg-red-600 text-white" : "bg-amber-500 text-black"}
          `}>
            {urgentCount}
          </span>
        )}

        {/* Health dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${hl.dot} ${loading ? "animate-pulse" : ""}`} />
      </button>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-30 lg:hidden bg-black/70"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[380px] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">🧠</span>
              <div>
                <p className="text-white font-black text-sm leading-none">CTO Assistant</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hl.dot}`} />
                  <span className={`text-[10px] font-bold ${hl.text}`}>{hl.np}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { void refresh(); }}
                disabled={loading}
                title="Refresh system state"
                className="text-zinc-600 hover:text-white text-sm transition-colors disabled:opacity-30 font-mono"
              >
                {loading ? "⟳" : "↺"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-600 hover:text-white text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* Loading state */}
            {loading && !snapshot && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center space-y-2">
                  <p className="text-2xl animate-pulse">🧠</p>
                  <p className="text-zinc-600 text-xs">System state load हुँदैछ…</p>
                </div>
              </div>
            )}

            {/* System snapshot stats */}
            {snapshot && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Documents",    value: snapshot.docsTotal,      color: "text-white"                                             },
                  { label: "Intelligence", value: snapshot.totalIntel,      color: snapshot.totalIntel > 0 ? "text-blue-400" : "text-zinc-600" },
                  { label: "Framework",   value: snapshot.totalFramework,  color: snapshot.totalFramework > 0 ? "text-green-400" : "text-zinc-600" },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-2.5 text-center">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Primary insight — most important action */}
            {topInsight && <PrimaryCard insight={topInsight} />}

            {/* Remaining insights */}
            {restInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold px-0.5">
                  अरू actions
                </p>
                {restInsights.map(ins => (
                  <CompactCard key={ins.id} insight={ins} />
                ))}
              </div>
            )}

            {/* Constitutional branch progress */}
            {snapshot && snapshot.totalFramework > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                    Constitutional Branches
                  </p>
                  <Link
                    href="/vault/constitution/health"
                    className="text-[10px] text-zinc-600 hover:text-white transition-colors"
                  >
                    Health →
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((snapshot.partsWithData / 35) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-white shrink-0">{snapshot.partsWithData}/35</span>
                </div>
                {snapshot.emptyParts.length > 0 && (
                  <p className="text-zinc-600 text-[10px]">
                    खाली भागहरू: {snapshot.emptyParts.slice(0, 6).join(", ")}
                    {snapshot.emptyParts.length > 6 ? ` +${snapshot.emptyParts.length - 6} थप` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Explain system — quick reference */}
            <details className="group">
              <summary className="text-[10px] text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors list-none flex items-center gap-1 px-0.5">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>
                System terms explain गर्नुस्
              </summary>
              <div className="mt-2 space-y-2">
                {[
                  { term: "constitutional_framework",  np: "संविधानका धाराहरू (Layer 1) — Constitution PDF बाट AI ले निकालेका structured records।" },
                  { term: "janta_intelligence",        np: "सरकारी documents बाट निकालिएका policy points, promises, facts (Layer 2)।" },
                  { term: "Deep Extract",              np: "Approved document बाट detailed Janta cards, policy points, र relationships निकाल्ने process।" },
                  { term: "Branch Health",             np: "Constitutional Part (1–35) मा कति intelligence छ — कमजोर branches identify गर्न।" },
                  { term: "Admin Review",              np: "AI output सही छ कि छैन Founder ले verify गर्ने step — approve नगरी public हुँदैन।" },
                ].map(({ term, np }) => (
                  <div key={term} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2">
                    <p className="text-zinc-300 text-[10px] font-bold">{term}</p>
                    <p className="text-zinc-600 text-[10px] mt-0.5 leading-relaxed">{np}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between shrink-0">
            <p className="text-zinc-700 text-[10px]">
              {loading
                ? "Refreshing…"
                : minutesSince === 0
                  ? "भर्खरै update भयो"
                  : minutesSince !== null
                    ? `${minutesSince} min अगाडि`
                    : "—"}
            </p>
            <Link
              href="/vault/constitution/health"
              className="text-[10px] text-zinc-600 hover:text-white transition-colors"
            >
              Full Health Report →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
