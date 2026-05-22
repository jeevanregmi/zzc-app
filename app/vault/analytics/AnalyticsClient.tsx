"use client";

import { useMemo } from "react";
import { useVaultAuth }             from "../../../hooks/vault/useVaultAuth";
import { useVaultAIUsage }          from "../../../hooks/vault/useVaultAIUsage";
import { useIntelligenceDocs }      from "../../../hooks/vault/useIntelligenceDocs";
import { useQueueItems }            from "../../../hooks/vault/useQueueItems";
import { useSourceSignals }         from "../../../hooks/vault/useSourceSignals";
import { useRecommendationClicks }  from "../../../hooks/vault/useRecommendationClicks";
import { useAudienceLeads }         from "../../../hooks/vault/useAudienceLeads";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

function KPICard({
  label, value, sub, color = "text-white",
}: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-sm font-semibold text-zinc-300 mb-4">{title}</p>
      {children}
    </div>
  );
}

export default function AnalyticsClient() {
  const { user }  = useVaultAuth();
  const uid       = user?.uid ?? null;

  const aiUsage  = useVaultAIUsage();
  const docs     = useIntelligenceDocs(uid);
  const queue    = useQueueItems(uid, "all");
  const signals  = useSourceSignals(uid, "all");
  const { clicks } = useRecommendationClicks();
  const { leads }  = useAudienceLeads();

  // ── Doc pipeline stats ────────────────────────────────────────────────────
  const docStats = useMemo(() => ({
    total:        docs.docs.length,
    ready:        docs.docs.filter(d => d.processingStatus === "ready").length,
    aiReady:      docs.docs.filter(d => d.processingStatus === "ai_ready").length,
    paused:       docs.docs.filter(d => d.processingStatus === "ai_paused").length,
    approved:     docs.docs.filter(d => d.adminApprovalStatus === "approved").length,
    pending:      docs.docs.filter(d => d.adminApprovalStatus === "pending_review").length,
    totalIdeas:   docs.docs.reduce((s, d) => s + (d.contentIdeas?.length ?? 0), 0),
  }), [docs.docs]);

  // ── Queue stats ───────────────────────────────────────────────────────────
  const queueStats = useMemo(() => ({
    total:        queue.items.length,
    pending:      queue.items.filter(q => q.status === "pending").length,
    approved:     queue.items.filter(q => q.status === "approved").length,
    in_production: queue.items.filter(q => q.status === "in_production").length,
    rejected:     queue.items.filter(q => q.status === "rejected").length,
  }), [queue.items]);

  // ── Signal stats ──────────────────────────────────────────────────────────
  const signalStats = useMemo(() => ({
    total:     signals.signals.length,
    raw:       signals.signals.filter(s => s.status === "raw").length,
    validated: signals.signals.filter(s => s.status === "validated").length,
    promoted:  signals.signals.filter(s => s.status === "promoted").length,
    rejected:  signals.signals.filter(s => s.status === "rejected").length,
  }), [signals.signals]);

  // ── AI usage daily chart (last 14 days) ────────────────────────────────────
  const aiDailyChart = useMemo(() => {
    const map = new Map<string, { calls: number; cost: number }>();
    const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    for (const e of aiUsage.entries) {
      if (e.date < cutoff) continue;
      const d = e.date.slice(5); // MM-DD
      const prev = map.get(d) ?? { calls: 0, cost: 0 };
      map.set(d, { calls: prev.calls + 1, cost: prev.cost + e.estimatedCost });
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, calls: v.calls, cost: parseFloat(v.cost.toFixed(4)) }));
  }, [aiUsage.entries]);

  // ── Recommendation clicks by scheme ──────────────────────────────────────
  const clicksByScheme = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clicks) {
      const key = (c as { scheme?: string }).scheme ?? "unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([scheme, count]) => ({ scheme, count }));
  }, [clicks]);

  // ── Provider usage breakdown ──────────────────────────────────────────────
  const providerChart = aiUsage.providerEconomics.map(p => ({
    name:    p.provider.replace("bedrock", "Bedrock").replace("gemini", "Gemini").replace("anthropic", "Anthropic"),
    calls:   p.callCount,
    cost:    p.totalCostUSD,
    success: Math.round(p.successRate * 100),
  }));

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Analytics</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          Platform intelligence — pipeline throughput, AI usage, engagement, content performance
        </p>
      </div>

      {/* Top KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard
          label="Documents Processed"
          value={docStats.total}
          sub={`${docStats.approved} approved`}
          color="text-cyan-400"
        />
        <KPICard
          label="AI Analyses Run"
          value={aiUsage.totalAnalyses}
          sub={`$${aiUsage.totalCostUSD.toFixed(3)} total cost`}
          color="text-purple-400"
        />
        <KPICard
          label="Content Ideas Generated"
          value={docStats.totalIdeas}
          sub={`${queueStats.approved} in queue`}
          color="text-green-400"
        />
        <KPICard
          label="Recommendation Clicks"
          value={clicks.length}
          sub={`${leads.length} email leads`}
          color="text-amber-400"
        />
      </div>

      {/* Intelligence Pipeline funnel */}
      <Section title="Intelligence Pipeline">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { label: "Raw Signals",    value: signalStats.raw,       color: "text-zinc-400" },
            { label: "Validated",      value: signalStats.validated,  color: "text-blue-400" },
            { label: "Promoted",       value: signalStats.promoted,   color: "text-cyan-400" },
            { label: "Content Ideas",  value: docStats.totalIdeas,    color: "text-purple-400" },
            { label: "Queue Approved", value: queueStats.approved,    color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-950 rounded-lg p-3 text-center">
              <p className={`text-2xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-zinc-600 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Document pipeline status */}
      <Section title="Document Pipeline Status">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
          {[
            { label: "Uploaded",        value: docStats.total,     color: "text-zinc-300" },
            { label: "Awaiting AI",     value: docStats.ready,     color: "text-zinc-500" },
            { label: "AI Complete",     value: docStats.aiReady,   color: "text-blue-400" },
            { label: "AI Paused",       value: docStats.paused,    color: "text-amber-400" },
            { label: "Pending Review",  value: docStats.pending,   color: "text-orange-400" },
            { label: "Approved",        value: docStats.approved,  color: "text-green-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-950 rounded-lg p-2">
              <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-zinc-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Content Queue funnel */}
      <Section title="Content Queue">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { label: "Pending",       value: queueStats.pending,       color: "text-zinc-400" },
            { label: "Approved",      value: queueStats.approved,      color: "text-green-400" },
            { label: "In Production", value: queueStats.in_production, color: "text-cyan-400" },
            { label: "Rejected",      value: queueStats.rejected,      color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-950 rounded-lg p-2">
              <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
              <p className="text-zinc-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* AI daily calls chart */}
      {aiDailyChart.length > 0 && (
        <Section title="AI Calls — Last 14 Days">
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={aiDailyChart}>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 9 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                formatter={(v, name) => [name === "cost" ? `$${Number(v).toFixed(4)}` : v, name ?? ""]}
              />
              <Bar dataKey="calls" name="calls" fill="#a78bfa" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Two columns: provider breakdown + recommendation clicks */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Provider breakdown */}
        <Section title="AI Provider Usage">
          {providerChart.length === 0 ? (
            <p className="text-zinc-600 text-sm">No AI calls tracked yet</p>
          ) : (
            <div className="space-y-3">
              {providerChart.map(p => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300">{p.name}</span>
                    <span className="text-zinc-500">{p.calls} calls · ${p.cost.toFixed(4)} · {p.success}% ok</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${p.success}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Recommendation clicks by scheme */}
        <Section title="Scheme Recommendation Clicks">
          {clicksByScheme.length === 0 ? (
            <p className="text-zinc-600 text-sm">No clicks yet — users haven&apos;t used the recommender</p>
          ) : (
            <div className="space-y-2">
              {clicksByScheme.map(({ scheme, count }) => (
                <div key={scheme} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300 capitalize">{scheme.replace(/_/g, " ")}</span>
                  <span className="text-amber-400 font-mono font-bold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Recent audience leads */}
      {leads.length > 0 && (
        <Section title={`Email Leads (${leads.length})`}>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {leads.slice(0, 20).map((lead, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 border-b border-zinc-800 last:border-0 text-xs">
                <span className="text-zinc-400">{(lead as { email?: string }).email ?? "—"}</span>
                <span className="text-zinc-600 ml-auto">
                  {(lead as { createdAt?: string }).createdAt?.slice(0, 10) ?? ""}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

    </div>
  );
}
