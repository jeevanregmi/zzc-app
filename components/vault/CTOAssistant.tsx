"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useCTOInsights } from "../../hooks/vault/useCTOInsights";
import { systemHealthStatus } from "../../lib/vault/ctoEngine";
import type { CTOInsight, InsightPriority } from "../../lib/vault/ctoEngine";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISMISS_KEY    = "zzc_cto_dismissed_v2";
const OPEN_KEY       = "zzc_cto_open";

// ── Dismiss storage helpers ───────────────────────────────────────────────────

function readDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}") as Record<string, number>;
  } catch { return {}; }
}

function writeDismissed(map: Record<string, number>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

function isDismissed(id: string): boolean {
  const map = readDismissed();
  const ts  = map[id];
  if (!ts) return false;
  if (Date.now() - ts > DISMISS_TTL_MS) { delete map[id]; writeDismissed(map); return false; }
  return true;
}

function dismissInsight(id: string) {
  const map = readDismissed();
  map[id] = Date.now();
  writeDismissed(map);
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STYLE: Record<InsightPriority, {
  bg: string; border: string; text: string; dot: string; badge: string;
}> = {
  critical: { bg: "bg-red-950/70",   border: "border-red-800",    text: "text-red-400",    dot: "bg-red-500",    badge: "bg-red-600 text-white"    },
  high:     { bg: "bg-amber-950/60", border: "border-amber-800",  text: "text-amber-400",  dot: "bg-amber-500",  badge: "bg-amber-500 text-black"  },
  medium:   { bg: "bg-blue-950/40",  border: "border-blue-900",   text: "text-blue-400",   dot: "bg-blue-500",   badge: "bg-blue-900 text-blue-300" },
  low:      { bg: "bg-zinc-900/50",  border: "border-zinc-800",   text: "text-zinc-400",   dot: "bg-zinc-500",   badge: "bg-zinc-800 text-zinc-400" },
};

const HEALTH_META = {
  critical:  { np: "Critical — तुरुन्त हेर्नुस्", dot: "bg-red-500",    text: "text-red-400"   },
  attention: { np: "ध्यान दिनुस्",                dot: "bg-amber-500",  text: "text-amber-400" },
  progress:  { np: "Progress मा छ",               dot: "bg-blue-400",   text: "text-blue-400"  },
  healthy:   { np: "System राम्रो छ",             dot: "bg-green-500",  text: "text-green-400" },
};

// ── Primary insight card ──────────────────────────────────────────────────────

function PrimaryCard({
  insight,
  onDismiss,
}: {
  insight:   CTOInsight;
  onDismiss: (id: string) => void;
}) {
  const s = STYLE[insight.priority];
  const [showWhy,  setShowWhy]  = useState(false);
  const [showCost, setShowCost] = useState(false);

  const priorityLabel =
    insight.priority === "critical" ? "🚨 Critical — तुरुन्त action चाहिन्छ" :
    insight.priority === "high"     ? "⚡ अहिलेको सबैभन्दा महत्त्वपूर्ण काम" :
    insight.priority === "medium"   ? "📋 Recommended next step"              : "💡 हेर्नुस्";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${s.bg} ${s.border}`}>
      {/* Priority label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${s.text}`}>
            {priorityLabel}
          </span>
        </div>
        {insight.dismissable && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors"
            title="24 घण्टाको लागि dismiss गर्नुस्"
          >
            ✓ review गरें
          </button>
        )}
      </div>

      {/* Icon + title + body */}
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">{insight.icon}</span>
        <div className="min-w-0 space-y-1">
          <p className="text-white font-black text-sm leading-snug">{insight.titleNp}</p>
          <p className="text-zinc-400 text-xs leading-relaxed">{insight.bodyNp}</p>
        </div>
      </div>

      {/* Cost warning — shown inline before action */}
      {insight.costWarning && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-xs shrink-0">💰</span>
            <p className="text-amber-400/80 text-[10px] leading-relaxed">{insight.costWarning}</p>
          </div>
        </div>
      )}

      {/* Primary action button */}
      {insight.actionHref && insight.actionLabel && (
        insight.costWarning ? (
          showCost ? (
            <Link
              href={insight.actionHref}
              className="block text-center text-sm font-black py-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
            >
              {insight.actionLabel} →
            </Link>
          ) : (
            <button
              onClick={() => setShowCost(true)}
              className={`w-full text-center text-sm font-black py-2.5 rounded-xl border transition-colors ${s.border} ${s.text} hover:bg-white hover:text-black hover:border-transparent`}
            >
              {insight.actionLabel} →
            </button>
          )
        ) : (
          <Link
            href={insight.actionHref}
            className="block text-center text-sm font-black py-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
          >
            {insight.actionLabel} →
          </Link>
        )
      )}

      {/* "Why am I seeing this?" */}
      <button
        onClick={() => setShowWhy(p => !p)}
        className="w-full text-left text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
      >
        <span>{showWhy ? "▾" : "▸"}</span>
        यो किन देखिँदैछ?
      </button>
      {showWhy && (
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
          <p className="text-zinc-400 text-[10px] leading-relaxed">{insight.whyNp}</p>
        </div>
      )}
    </div>
  );
}

// ── Compact insight card ──────────────────────────────────────────────────────

function CompactCard({
  insight,
  onDismiss,
}: {
  insight:   CTOInsight;
  onDismiss: (id: string) => void;
}) {
  const s = STYLE[insight.priority];
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${s.border} bg-zinc-950/40`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold leading-snug">{insight.titleNp}</p>
          <p className="text-zinc-500 text-[10px] leading-relaxed mt-0.5">{insight.bodyNp}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {insight.actionHref && (
            <Link href={insight.actionHref} className={`text-[11px] font-black hover:opacity-80 ${s.text}`}>→</Link>
          )}
          {insight.dismissable && (
            <button
              onClick={() => onDismiss(insight.id)}
              className="text-[9px] text-zinc-700 hover:text-zinc-500"
              title="24 घण्टाको लागि dismiss"
            >
              ✓
            </button>
          )}
        </div>
      </div>

      {/* Why explanation */}
      <button
        onClick={() => setShowWhy(p => !p)}
        className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors flex items-center gap-1 ml-4"
      >
        <span>{showWhy ? "▾" : "▸"}</span>
        किन?
      </button>
      {showWhy && (
        <div className="ml-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2.5 py-2">
          <p className="text-zinc-500 text-[10px] leading-relaxed">{insight.whyNp}</p>
          {insight.costWarning && (
            <p className="text-amber-500/70 text-[10px] mt-1 leading-relaxed">💰 {insight.costWarning}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Healthy state card ────────────────────────────────────────────────────────

function HealthyCard({ insight }: { insight: CTOInsight }) {
  return (
    <div className="rounded-2xl border border-green-900/60 bg-green-950/20 p-5 space-y-3 text-center">
      <p className="text-3xl">🌳</p>
      <div>
        <p className="text-green-400 font-black text-sm">{insight.titleNp}</p>
        <p className="text-zinc-500 text-xs leading-relaxed mt-1">{insight.bodyNp}</p>
      </div>
      {insight.actionHref && insight.actionLabel && (
        <Link
          href={insight.actionHref}
          className="inline-block text-xs font-bold text-green-400 hover:text-green-300 border border-green-800/60 rounded-xl px-4 py-2 transition-colors"
        >
          {insight.actionLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CTOAssistant({ uid }: { uid: string | null }) {
  const [open,      setOpen]      = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { insights: rawInsights, snapshot, loading, lastRefresh, refresh } = useCTOInsights(uid);

  // Restore panel state on mount
  useEffect(() => {
    try { if (localStorage.getItem(OPEN_KEY) === "true") setOpen(true); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(open)); } catch { /* ignore */ }
  }, [open]);

  // Filter dismissed insights (non-critical only)
  const insights = rawInsights.filter(i => i.priority === "critical" || !dismissed.has(i.id));

  const handleDismiss = useCallback((id: string) => {
    dismissInsight(id);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  if (!uid) return null;

  const health        = systemHealthStatus(insights);
  const hl            = HEALTH_META[health];
  const criticalCount = insights.filter(i => i.priority === "critical").length;
  const highCount     = insights.filter(i => i.priority === "high").length;
  const urgentCount   = criticalCount + highCount;

  const isHealthy   = insights.length === 1 && insights[0]?.type === "system_healthy";
  const topInsight  = insights[0] ?? null;
  const restInsights = insights.slice(1);

  const minutesSince = lastRefresh
    ? Math.floor((Date.now() - lastRefresh.getTime()) / 60_000)
    : null;

  return (
    <>
      {/* ── Floating dock button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        title="🧠 Founder Cockpit — system state, next actions, blocked pipelines"
        className={`
          fixed bottom-5 right-5 z-50
          flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl shadow-2xl
          transition-all duration-200 select-none border-2
          ${open
            ? "bg-zinc-800 border-zinc-500 text-white"
            : urgentCount > 0
              ? "bg-zinc-950 border-amber-600 text-white hover:border-amber-400"
              : "bg-zinc-950 border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white"
          }
        `}
      >
        <span className="text-base leading-none">🧠</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-black tracking-wide">Founder Cockpit</span>
          <span className={`text-[9px] font-semibold mt-0.5 ${hl.text}`}>{hl.np}</span>
        </div>
        {urgentCount > 0 && (
          <span className={`
            text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none shrink-0
            ${criticalCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-amber-500 text-black"}
          `}>
            {urgentCount}
          </span>
        )}
        {urgentCount === 0 && (
          <span className={`w-2 h-2 rounded-full shrink-0 ${hl.dot} ${loading ? "animate-pulse" : ""}`} />
        )}
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
        <div className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[390px] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">🧠</span>
              <div>
                <p className="text-white font-black text-sm leading-none">Founder Cockpit</p>
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
                title="System state refresh गर्नुस्"
                className="text-zinc-600 hover:text-white text-sm transition-colors disabled:opacity-30 font-mono w-5 text-center"
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

            {/* Loading */}
            {loading && !snapshot && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-3xl animate-pulse">🧠</span>
                <p className="text-zinc-600 text-xs">System state load हुँदैछ…</p>
              </div>
            )}

            {/* Snapshot stats row */}
            {snapshot && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Documents",    value: snapshot.docsTotal,     color: "text-white"                                              },
                  { label: "Intelligence", value: snapshot.totalIntel,     color: snapshot.totalIntel > 0     ? "text-blue-400"  : "text-zinc-600" },
                  { label: "Framework",   value: snapshot.totalFramework, color: snapshot.totalFramework > 0 ? "text-green-400" : "text-zinc-600" },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-2.5 text-center">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Healthy state */}
            {isHealthy && topInsight && <HealthyCard insight={topInsight} />}

            {/* Active insights */}
            {!isHealthy && topInsight && (
              <PrimaryCard insight={topInsight} onDismiss={handleDismiss} />
            )}
            {!isHealthy && restInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold px-0.5">
                  अरू सुझाव
                </p>
                {restInsights.map(ins => (
                  <CompactCard key={ins.id} insight={ins} onDismiss={handleDismiss} />
                ))}
              </div>
            )}

            {/* Dismissed count (if any) */}
            {dismissed.size > 0 && (
              <button
                onClick={() => {
                  writeDismissed({});
                  setDismissed(new Set());
                }}
                className="w-full text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors py-1"
              >
                {dismissed.size} suggestion dismiss गरिएको — reset गर्नुस्
              </button>
            )}

            {/* Constitution branch progress */}
            {snapshot && snapshot.totalFramework > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                    Constitutional Branches
                  </p>
                  <Link href="/vault/constitution/health" className="text-[10px] text-zinc-600 hover:text-white transition-colors">
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
                    खाली: भाग {snapshot.emptyParts.slice(0, 6).join(", ")}
                    {snapshot.emptyParts.length > 6 ? ` +${snapshot.emptyParts.length - 6} थप` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Quick explain glossary */}
            <details className="group">
              <summary className="text-[10px] text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors list-none flex items-center gap-1 px-0.5 py-1">
                <span className="group-open:hidden">▸</span>
                <span className="hidden group-open:inline">▾</span>
                Terms को अर्थ बुझ्नुस्
              </summary>
              <div className="mt-2 space-y-1.5">
                {[
                  { term: "constitutional_framework", np: "Layer 1 — संविधानका धाराहरू, भागहरू, अधिकारहरू। Constitution PDF बाट एकपटक extract गर्नुस्।" },
                  { term: "janta_intelligence",       np: "Layer 2 — सरकारी documents बाट निकालिएका policy points, promises, facts।" },
                  { term: "Deep Extract",             np: "Approved document बाट Janta cards, policy points र relationships निकाल्ने process। AI cost लाग्छ।" },
                  { term: "Admin Review",             np: "AI output verify गर्ने step — approve नगरी Deep Extract र Public Tree हुँदैन।" },
                  { term: "Branch Health",            np: "प्रत्येक constitutional भाग (१–३५) मा कति intelligence छ — कमजोर branches identify गर्न।" },
                ].map(({ term, np }) => (
                  <div key={term} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-3 py-2">
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
                : minutesSince === 0 ? "भर्खरै"
                : minutesSince !== null ? `${minutesSince} min अगाडि`
                : "—"}
            </p>
            <Link href="/vault/constitution/health" className="text-[10px] text-zinc-600 hover:text-white transition-colors">
              Full Health →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
