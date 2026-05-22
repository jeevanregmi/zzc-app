"use client";

import { useMemo } from "react";
import { useVaultAuth }    from "../../../hooks/vault/useVaultAuth";
import { useRevenue }      from "../../../hooks/business/useRevenue";
import { useExpenses }     from "../../../hooks/business/useExpenses";
import { useAICosts }      from "../../../hooks/business/useAICosts";
import { useVaultAIUsage } from "../../../hooks/vault/useVaultAIUsage";
import { useForexRate }    from "../../../hooks/vault/useForexRate";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

const NPR = (n: number, r: number) => `NPR ${Math.round(n * r).toLocaleString("en-NP")}`;

function StatCard({
  label, value, sub, color = "text-white",
}: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FinanceClient() {
  const { user }  = useVaultAuth();
  const uid       = user?.uid ?? null;
  const rev       = useRevenue(uid);
  const exp       = useExpenses(uid);
  const ai        = useAICosts(uid);
  const aiUsage   = useVaultAIUsage();
  const forex     = useForexRate();
  const rate      = forex.loading ? 155 : forex.rateNPR;

  const currentPeriod = new Date().toISOString().slice(0, 7);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalRevNPR  = useMemo(() => rev.entries.reduce((s, e) => s + e.amountNPR, 0), [rev.entries]);
  const totalExpUSD  = useMemo(() => exp.entries.reduce((s, e) => s + e.amountUSD, 0), [exp.entries]);
  const totalAIUSD   = useMemo(() => ai.entries.reduce((s, e) => s + e.costUSD, 0),   [ai.entries]);
  const totalAIAutoUSD = aiUsage.totalCostUSD;

  const totalCostNPR = Math.round((totalExpUSD + totalAIUSD + totalAIAutoUSD) * rate);
  const netNPR       = totalRevNPR - totalCostNPR;

  // ── This month ───────────────────────────────────────────────────────────────
  const thisRevNPR  = rev.thisMonthNPR;
  const thisExpUSD  = useMemo(
    () => exp.entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.amountUSD, 0),
    [exp.entries, currentPeriod],
  );
  const thisAIManUSD = useMemo(
    () => ai.entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.costUSD, 0),
    [ai.entries, currentPeriod],
  );
  const thisCostNPR  = Math.round((thisExpUSD + thisAIManUSD + aiUsage.thisMonthUSD) * rate);
  const thisNetNPR   = thisRevNPR - thisCostNPR;

  // ── Monthly P&L timeline (last 6 months) ─────────────────────────────────────
  const plTimeline = useMemo(() => {
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return months.map(m => {
      const revNPR  = rev.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amountNPR, 0);
      const expUSD  = exp.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amountUSD, 0);
      const aiManUSD = ai.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.costUSD, 0);
      const aiAutoUSD = aiUsage.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.estimatedCost, 0);
      const costNPR = Math.round((expUSD + aiManUSD + aiAutoUSD) * rate);
      return {
        month: m.slice(5), // "MM"
        revenue: revNPR,
        cost:    costNPR,
        net:     revNPR - costNPR,
      };
    });
  }, [rev.entries, exp.entries, ai.entries, aiUsage.entries, rate]);

  // ── Expense by category ───────────────────────────────────────────────────────
  const expByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of exp.entries) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amountUSD);
    }
    // Add AI auto costs
    map.set("ai-auto", (map.get("ai-auto") ?? 0) + totalAIAutoUSD);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([cat, usd]) => ({ cat, usd, npr: Math.round(usd * rate) }));
  }, [exp.entries, totalAIAutoUSD, rate]);

  // ── Revenue by source ─────────────────────────────────────────────────────────
  const revBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of rev.entries) {
      map.set(e.source, (map.get(e.source) ?? 0) + e.amountNPR);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([src, npr]) => ({ src, npr }));
  }, [rev.entries]);

  // ── Runway estimate ───────────────────────────────────────────────────────────
  const monthlyBurnNPR = useMemo(() => {
    const avg3 = [0, 1, 2].map(i => {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const expUSD   = exp.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.amountUSD, 0);
      const aiManUSD = ai.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.costUSD, 0);
      const aiAutoUSD = aiUsage.entries.filter(e => e.date.startsWith(m)).reduce((s, e) => s + e.estimatedCost, 0);
      return (expUSD + aiManUSD + aiAutoUSD) * rate;
    });
    return Math.round(avg3.reduce((s, v) => s + v, 0) / 3);
  }, [exp.entries, ai.entries, aiUsage.entries, rate]);

  const annualRunRateNPR = monthlyBurnNPR * 12;

  const CAT_LABELS: Record<string, string> = {
    "ai-api": "AI APIs (manual)", "ai-auto": "AI APIs (auto-tracked)",
    "cloud-hosting": "Cloud Hosting", "storage": "Storage",
    "dev-tools": "Dev Tools", "marketing": "Marketing",
    "content-production": "Content Production", "operations": "Operations",
  };

  if (rev.loading || exp.loading || ai.loading) {
    return <div className="p-8 text-zinc-600 text-center">Loading financial data…</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Finance</h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Revenue, expenses, AI costs — complete P&amp;L
            {!forex.loading && (
              <span className="ml-2 text-zinc-600">· NRB: 1 USD = NPR {rate.toFixed(2)}</span>
            )}
          </p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-semibold border ${
          netNPR >= 0
            ? "bg-green-950 text-green-400 border-green-800"
            : "bg-red-950 text-red-400 border-red-800"
        }`}>
          {netNPR >= 0 ? "Net Positive" : "Net Negative"}
        </span>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Revenue (all-time)"
          value={`NPR ${totalRevNPR.toLocaleString("en-NP")}`}
          sub={`$${(totalRevNPR / rate).toFixed(2)}`}
          color="text-green-400"
        />
        <StatCard
          label="Total Costs (all-time)"
          value={`NPR ${totalCostNPR.toLocaleString("en-NP")}`}
          sub={`$${(totalCostNPR / rate).toFixed(2)}`}
          color="text-orange-400"
        />
        <StatCard
          label="Net Position (all-time)"
          value={`NPR ${Math.abs(netNPR).toLocaleString("en-NP")}`}
          sub={netNPR >= 0 ? "surplus" : "deficit"}
          color={netNPR >= 0 ? "text-green-400" : "text-red-400"}
        />
        <StatCard
          label="Monthly Burn Rate"
          value={`NPR ${monthlyBurnNPR.toLocaleString("en-NP")}`}
          sub={`~$${(monthlyBurnNPR / rate).toFixed(0)}/month`}
          color="text-amber-400"
        />
      </div>

      {/* This month row */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">This Month ({currentPeriod})</p>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            label="Revenue"
            value={`NPR ${thisRevNPR.toLocaleString("en-NP")}`}
            sub={thisRevNPR === 0 ? "No revenue yet" : undefined}
            color="text-green-400"
          />
          <StatCard
            label="Costs"
            value={`NPR ${thisCostNPR.toLocaleString("en-NP")}`}
            sub={`$${(thisCostNPR / rate).toFixed(2)}`}
            color="text-orange-400"
          />
          <StatCard
            label="Net"
            value={`NPR ${Math.abs(thisNetNPR).toLocaleString("en-NP")}`}
            sub={thisNetNPR >= 0 ? "profit" : "loss"}
            color={thisNetNPR >= 0 ? "text-green-400" : "text-red-400"}
          />
        </div>
      </div>

      {/* P&L timeline chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-zinc-300 mb-4">Monthly P&L — Last 6 Months</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={plTimeline} barGap={4}>
            <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
              formatter={(v: unknown) => [`NPR ${Number(v).toLocaleString("en-NP")}`, ""]}
            />
            <Bar dataKey="revenue" name="Revenue" fill="#22c55e" radius={[3,3,0,0]} />
            <Bar dataKey="cost"    name="Cost"    fill="#f97316" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Net trend */}
      {plTimeline.some(d => d.net !== 0) && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-4">Net Trend (NPR)</p>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={plTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis dataKey="month" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                formatter={(v: unknown) => [`NPR ${Number(v).toLocaleString("en-NP")}`, "Net"]}
              />
              <Line type="monotone" dataKey="net" stroke="#06b6d4" strokeWidth={2} dot={{ fill: "#06b6d4" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column: costs + revenue breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cost breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Cost by Category</p>
          {expByCategory.length === 0 ? (
            <p className="text-zinc-600 text-sm">No expenses recorded yet</p>
          ) : (
            <div className="space-y-2">
              {expByCategory.map(({ cat, usd, npr }) => (
                <div key={cat} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{CAT_LABELS[cat] ?? cat}</span>
                  <div className="text-right">
                    <span className="text-orange-400 font-mono text-xs">NPR {npr.toLocaleString()}</span>
                    <span className="text-zinc-600 text-xs ml-1">(${usd.toFixed(2)})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Revenue by Source</p>
          {revBySource.length === 0 ? (
            <p className="text-zinc-600 text-sm">No revenue recorded yet — use Business BI → आय tab to add</p>
          ) : (
            <div className="space-y-2">
              {revBySource.map(({ src, npr }) => (
                <div key={src} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400 capitalize">{src.replace(/-/g, " ")}</span>
                  <span className="text-green-400 font-mono text-xs">NPR {npr.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Annual projections */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-sm font-semibold text-zinc-300 mb-3">Annual Projections</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Annual Run Rate (costs)</p>
            <p className="text-orange-400 font-black font-mono text-lg">
              NPR {annualRunRateNPR.toLocaleString("en-NP")}
            </p>
            <p className="text-zinc-600 text-xs">${(annualRunRateNPR / rate).toFixed(0)}/year</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Projected Monthly AI (extrap.)</p>
            <p className="text-amber-400 font-black font-mono text-lg">
              NPR {Math.round(aiUsage.projectedMonthlyUSD * rate).toLocaleString("en-NP")}
            </p>
            <p className="text-zinc-600 text-xs">${aiUsage.projectedMonthlyUSD.toFixed(2)} AI only</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs mb-1">Break-even Revenue Needed</p>
            <p className="text-cyan-400 font-black font-mono text-lg">
              NPR {monthlyBurnNPR.toLocaleString("en-NP")}
            </p>
            <p className="text-zinc-600 text-xs">per month to cover all costs</p>
          </div>
        </div>
      </div>

      {/* Expense table */}
      {exp.entries.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">All Expenses ({exp.entries.length})</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800">
                  <th className="text-left py-2 pr-3">Date</th>
                  <th className="text-left py-2 pr-3">Service</th>
                  <th className="text-left py-2 pr-3">Category</th>
                  <th className="text-right py-2 pr-3">USD</th>
                  <th className="text-right py-2">NPR</th>
                </tr>
              </thead>
              <tbody>
                {exp.entries.slice(0, 50).map(e => (
                  <tr key={e.id} className="border-b border-zinc-900 hover:bg-zinc-800/30">
                    <td className="py-1.5 pr-3 text-zinc-500">{e.date}</td>
                    <td className="py-1.5 pr-3 text-zinc-300">{e.service}</td>
                    <td className="py-1.5 pr-3 text-zinc-500">{CAT_LABELS[e.category] ?? e.category}</td>
                    <td className="py-1.5 pr-3 text-right text-orange-400 font-mono">${e.amountUSD.toFixed(2)}</td>
                    <td className="py-1.5 text-right text-zinc-400 font-mono">
                      NPR {Math.round(e.amountUSD * rate).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {exp.entries.length > 50 && (
              <p className="text-zinc-600 text-xs mt-2 text-center">Showing 50 of {exp.entries.length}</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
