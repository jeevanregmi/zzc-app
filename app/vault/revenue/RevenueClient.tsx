"use client";

import { useMemo, useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useRecommendationClicks } from "../../../hooks/vault/useRecommendationClicks";
import { useAudienceLeads } from "../../../hooks/vault/useAudienceLeads";
import { useSourceSignals } from "../../../hooks/vault/useSourceSignals";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import type { SourceSignal } from "../../../lib/types/signals";
import type { IntelligenceDocument } from "../../../lib/types/documents";

/* ─── B2B Brief Generator ─────────────────────────────────── */
function buildWeeklyBrief(
  signals: SourceSignal[],
  docs: IntelligenceDocument[],
): string {
  const now  = new Date();
  const week = `${now.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const approvedDocs = docs.filter(d => d.adminApprovalStatus === "approved").slice(0, 5);
  const recentSignals = signals.slice(0, 8);

  const lines: string[] = [
    `ZZC INTELLIGENCE BRIEF — Week of ${week}`,
    "Powered by ZZC Nepal Financial Intelligence Platform",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  if (recentSignals.length > 0) {
    lines.push("📡 KEY SIGNALS THIS WEEK");
    lines.push("");
    recentSignals.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.title}`);
      if (s.summary) lines.push(`   ${s.summary}`);
      if (s.sourceUrl) lines.push(`   Source: ${s.sourceUrl}`);
      lines.push("");
    });
  }

  if (approvedDocs.length > 0) {
    lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    lines.push("📄 INTELLIGENCE DOCUMENTS — ADMIN VERIFIED");
    lines.push("");
    approvedDocs.forEach(d => {
      lines.push(`▸ ${d.title}`);
      if (d.aiSummary) lines.push(`  ${d.aiSummary}`);
      if (d.aiKeyInsights && d.aiKeyInsights.length > 0) {
        d.aiKeyInsights.slice(0, 3).forEach(ins => lines.push(`  • ${ins}`));
      }
      lines.push("");
    });
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("Prepared by ZZC Intelligence Platform · zeneration-z-chautari.pages.dev");
  lines.push("For custom briefs or sector deep-dives contact: JEEVANREGMI15@gmail.com");

  return lines.join("\n");
}

/* ─── Stat Card ───────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className={`text-3xl font-black ${accent ?? "text-white"}`}>{value}</p>
      <p className="text-zinc-400 text-sm mt-1 font-semibold">{label}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────── */
export default function RevenueClient() {
  const { user }              = useVaultAuth();
  const { clicks, loading: cLoading } = useRecommendationClicks();
  const { leads,  loading: lLoading } = useAudienceLeads();
  const { signals }           = useSourceSignals(user?.uid ?? null, "validated");
  const { docs }              = useIntelligenceDocs(user?.uid ?? null);

  const [briefCopied, setBriefCopied] = useState(false);

  const clicksByScheme = useMemo(() => {
    const map: Record<string, number> = {};
    clicks.forEach(c => { map[c.schemeName] = (map[c.schemeName] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [clicks]);

  const clicksByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    clicks.forEach(c => { map[c.category] = (map[c.category] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [clicks]);

  const uniqueSessions = useMemo(() => new Set(clicks.map(c => c.sessionId)).size, [clicks]);

  const topScheme = clicksByScheme[0]?.[0] ?? "—";

  const approvedDocs = useMemo(
    () => docs.filter(d => d.adminApprovalStatus === "approved"),
    [docs],
  );

  const brief = useMemo(
    () => buildWeeklyBrief(signals, docs),
    [signals, docs],
  );

  const copyBrief = () => {
    navigator.clipboard.writeText(brief).then(() => {
      setBriefCopied(true);
      setTimeout(() => setBriefCopied(false), 2500);
    });
  };

  const loading = cLoading || lLoading;

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white">Revenue Intelligence</h1>
        <p className="text-zinc-500 text-sm mt-1">Affiliate click tracking · Audience leads · B2B intelligence briefs</p>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-sm py-12 text-center">Loading…</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total Clicks"    value={clicks.length}    accent="text-green-400" />
            <StatCard label="Unique Sessions" value={uniqueSessions}   accent="text-cyan-400" />
            <StatCard label="Email Leads"     value={leads.length}     accent="text-purple-400" />
            <StatCard label="Top Scheme"      value={topScheme}        sub={clicksByScheme[0] ? `${clicksByScheme[0][1]} clicks` : undefined} accent="text-amber-400" />
          </div>

          {/* Clicks by scheme */}
          {clicksByScheme.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Clicks by Scheme</p>
              <div className="space-y-2">
                {clicksByScheme.map(([scheme, count]) => {
                  const pct = clicks.length ? Math.round((count / clicks.length) * 100) : 0;
                  return (
                    <div key={scheme} className="flex items-center gap-3">
                      <span className="text-zinc-300 text-sm font-semibold w-32 shrink-0">{scheme}</span>
                      <div className="flex-1 bg-zinc-800 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-zinc-500 text-xs w-16 text-right shrink-0">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Clicks by category */}
          {clicksByCategory.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Clicks by Category</p>
              <div className="flex flex-wrap gap-3">
                {clicksByCategory.map(([cat, count]) => (
                  <div key={cat} className="bg-zinc-800 rounded-xl px-4 py-2 text-center">
                    <p className="text-white font-black text-lg">{count}</p>
                    <p className="text-zinc-500 text-xs capitalize">{cat}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent clicks */}
          {clicks.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Recent Clicks</p>
              <div className="space-y-2">
                {clicks.slice(0, 20).map(c => (
                  <div key={c.id} className="flex items-center gap-3 py-1.5 border-b border-zinc-800 last:border-0">
                    <span className="text-xs font-bold bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full shrink-0">{c.schemeName}</span>
                    <span className="text-zinc-500 text-xs capitalize flex-1">{c.category}</span>
                    <span className="text-zinc-700 text-xs font-mono shrink-0">{c.sessionId.slice(0, 8)}…</span>
                    <span className="text-zinc-700 text-xs shrink-0">{new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Leads */}
          {leads.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">Email Leads ({leads.length})</p>
              <div className="space-y-2">
                {leads.slice(0, 30).map(l => (
                  <div key={l.id} className="flex items-center gap-3 py-1.5 border-b border-zinc-800 last:border-0">
                    <span className="text-zinc-300 text-sm flex-1">{l.email}</span>
                    <span className="text-zinc-600 text-xs">{l.source}</span>
                    <span className="text-zinc-700 text-xs">{new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* B2B Brief Generator */}
          <div className="bg-zinc-900 border border-cyan-900 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className="text-cyan-400 font-semibold text-sm">B2B Intelligence Brief</p>
                <p className="text-zinc-600 text-xs mt-0.5">
                  Auto-generated from {signals.length} validated signals + {approvedDocs.length} approved documents
                </p>
              </div>
              <button
                onClick={copyBrief}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-cyan-900 text-cyan-300 hover:bg-cyan-800 transition-colors"
              >
                {briefCopied ? "Copied ✓" : "Copy Brief"}
              </button>
            </div>
            <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono bg-black/40 rounded-xl p-4 max-h-80 overflow-y-auto leading-relaxed">
              {brief}
            </pre>
          </div>

          {/* Zero state */}
          {clicks.length === 0 && leads.length === 0 && (
            <div className="text-center py-16 text-zinc-600 text-sm">
              No revenue data yet. Apply CTAs on the Recommend page will track clicks here automatically.
            </div>
          )}
        </>
      )}
    </div>
  );
}
