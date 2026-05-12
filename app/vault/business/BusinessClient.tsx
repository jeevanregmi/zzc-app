"use client";

/**
 * BusinessClient — BI dashboard shell.
 * Sub-navigation: Revenue | Expenses | AI Costs | YouTube | Goals
 * All data via hooks; zero business logic here.
 */

import { useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useRevenue } from "../../../hooks/business/useRevenue";
import { useExpenses } from "../../../hooks/business/useExpenses";
import { useAICosts } from "../../../hooks/business/useAICosts";
import { useKPIs } from "../../../hooks/business/useKPIs";
import { KPICard } from "../../../components/business/KPICard";
import { GoalProgress } from "../../../components/business/GoalProgress";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { fmtNPR, fmtUSD, fmtPeriod } from "../../../lib/business/formatters";

// ─── Revenue entry form ──────────────────────────────────────────────────────

function AddRevenueForm({ onAdd }: { onAdd: (data: Parameters<ReturnType<typeof useRevenue>["add"]>[0]) => void }) {
  const [source,  setSource]  = useState<string>("youtube");
  const [amount,  setAmount]  = useState("");
  const [date,    setDate]    = useState(new Date().toISOString().slice(0, 10));
  const [desc,    setDesc]    = useState("");
  const [saving,  setSaving]  = useState(false);

  async function submit() {
    if (!amount || !date) return;
    setSaving(true);
    await onAdd({
      source:       source as ReturnType<typeof useRevenue>["entries"][0]["source"],
      platform:     source,
      amountNPR:    parseFloat(amount),
      amountUSD:    parseFloat(amount) / 135,
      usdToNprRate: 135,
      date,
      description:  desc,
      verified:     false,
      receiptPath:  "",
    });
    setAmount(""); setDesc(""); setSaving(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-zinc-300">नया आय थप्नुहोस्</p>
      <div className="grid grid-cols-2 gap-3">
        <select
          value={source}
          onChange={e => setSource(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        >
          {["youtube", "playstore", "subscription", "consultation", "enterprise", "affiliate", "other"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input
          type="number"
          placeholder="रकम (NPR)"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input
          type="text"
          placeholder="विवरण"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {saving ? "..." : "थप्नुहोस्"}
      </button>
    </div>
  );
}

// ─── Add Expense form ────────────────────────────────────────────────────────

function AddExpenseForm({ onAdd }: { onAdd: (data: Parameters<ReturnType<typeof useExpenses>["add"]>[0]) => void }) {
  const [service,        setService]       = useState("");
  const [category,       setCategory]      = useState<string>("cloud-hosting");
  const [classification, setClassification]= useState<string>("OPEX");
  const [amountUSD,      setAmountUSD]     = useState("");
  const [date,           setDate]          = useState(new Date().toISOString().slice(0, 10));
  const [desc,           setDesc]          = useState("");
  const [saving,         setSaving]        = useState(false);

  async function submit() {
    if (!service || !amountUSD) return;
    setSaving(true);
    const usd = parseFloat(amountUSD);
    await onAdd({
      service,
      category:       category as ReturnType<typeof useExpenses>["entries"][0]["category"],
      classification: classification as "CAPEX" | "OPEX",
      amountUSD:      usd,
      amountNPR:      Math.round(usd * 135),
      usdToNprRate:   135,
      date,
      description:    desc,
      invoicePath:    "",
      recurring:      false,
      billingCycle:   "monthly",
    });
    setService(""); setAmountUSD(""); setDesc(""); setSaving(false);
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-zinc-300">नया खर्च थप्नुहोस्</p>
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Service (AWS Bedrock...)"
          value={service}
          onChange={e => setService(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        >
          {["ai-api","cloud-hosting","storage","dev-tools","marketing","content-production","operations"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={classification}
          onChange={e => setClassification(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        >
          <option value="OPEX">OPEX (recurring)</option>
          <option value="CAPEX">CAPEX (asset)</option>
        </select>
        <input
          type="number"
          placeholder="रकम (USD)"
          value={amountUSD}
          onChange={e => setAmountUSD(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
        <input
          type="text"
          placeholder="विवरण"
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded px-2 py-2 text-white text-sm focus:outline-none focus:border-green-500"
        />
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
      >
        {saving ? "..." : "थप्नुहोस्"}
      </button>
    </div>
  );
}

// ─── Chart colors ────────────────────────────────────────────────────────────

const PIE_COLORS = ["#22c55e", "#facc15", "#f97316", "#3b82f6", "#a855f7", "#ec4899"];

// ─── Main ────────────────────────────────────────────────────────────────────

type BITab = "overview" | "revenue" | "expenses" | "ai-costs" | "goals";

const BI_TABS: { id: BITab; label: string }[] = [
  { id: "overview",  label: "Overview" },
  { id: "revenue",   label: "आय" },
  { id: "expenses",  label: "खर्च" },
  { id: "ai-costs",  label: "AI लागत" },
  { id: "goals",     label: "लक्ष्य" },
];

function BIDashboard() {
  const { user } = useVaultAuth();
  const uid      = user?.uid ?? null;

  const rev  = useRevenue(uid);
  const exp  = useExpenses(uid);
  const ai   = useAICosts(uid);
  const kpis = useKPIs(uid);

  const [tab, setTab] = useState<BITab>("overview");

  const thisMonthNetNPR = rev.thisMonthNPR - exp.thisMonthNPR;

  // Revenue by source for pie chart
  const revBySource = rev.entries.reduce<Record<string, number>>((acc, e) => {
    acc[e.source] = (acc[e.source] ?? 0) + e.amountNPR;
    return acc;
  }, {});
  const revPieData = Object.entries(revBySource).map(([name, value]) => ({ name, value }));

  // Monthly P&L timeline
  const plData = rev.timeline.map(m => ({
    period:   fmtPeriod(m.period),
    revenue:  Math.round(m.totalRevenueNPR / 1000),
    expenses: Math.round(m.totalExpensesNPR / 1000),
    profit:   Math.round(m.netProfitNPR / 1000),
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Business Intelligence</h1>
        <p className="text-zinc-500 text-sm">ZZC वित्तीय डेटा — निजी</p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl overflow-x-auto">
        {BI_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              "px-3 py-2 rounded-lg text-sm transition-colors whitespace-nowrap " +
              (tab === t.id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard label="यो महिना आय"    value={fmtNPR(rev.thisMonthNPR)} trend="up" trendGood highlight />
            <KPICard label="यो महिना खर्च"   value={fmtNPR(exp.thisMonthNPR)} trend="flat" trendGood={false} />
            <KPICard label="नेट मुनाफा"      value={fmtNPR(thisMonthNetNPR)}
              valueClass={thisMonthNetNPR >= 0 ? undefined : "text-red-400"}
            />
            <KPICard label="AI लागत (कुल)"   value={fmtUSD(ai.totalUSD)} trendGood={false} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* P&L chart */}
            {plData.some(d => d.revenue > 0 || d.expenses > 0) ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">मासिक P&L (हजारमा)</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={plData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <XAxis dataKey="period" tick={{ fill: "#71717a", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }} />
                    <Bar dataKey="revenue"  name="आय"    fill="#22c55e" radius={[2,2,0,0]} />
                    <Bar dataKey="expenses" name="खर्च"   fill="#f97316" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-48">
                <p className="text-zinc-600 text-sm">आय/खर्च डेटा थप्नुहोस्</p>
              </div>
            )}

            {/* Revenue by source pie */}
            {revPieData.length > 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">आय स्रोत</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={revPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {revPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-center h-48">
                <p className="text-zinc-600 text-sm">आय थप्नुहोस्</p>
              </div>
            )}
          </div>

          {/* CAPEX vs OPEX */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-1">OPEX (recurring)</p>
              <p className="text-xl font-bold font-mono text-orange-400">{fmtNPR(exp.opexNPR)}</p>
              <p className="text-xs text-zinc-600 mt-1">वार्षिक सञ्चालन खर्च</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-1">CAPEX (assets)</p>
              <p className="text-xl font-bold font-mono text-blue-400">{fmtNPR(exp.capexNPR)}</p>
              <p className="text-xs text-zinc-600 mt-1">पूँजी लगानी</p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue tab */}
      {tab === "revenue" && (
        <div className="space-y-4">
          <AddRevenueForm onAdd={rev.add} />
          <div className="space-y-2">
            {rev.entries.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-8">कुनै आय रेकर्ड छैन।</p>
            )}
            {rev.entries.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-white">{e.description || e.source}</p>
                  <p className="text-xs text-zinc-500">{e.date} · {e.source}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-green-400">{fmtNPR(e.amountNPR)}</p>
                  <button onClick={() => rev.remove(e.id)} className="text-zinc-700 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses tab */}
      {tab === "expenses" && (
        <div className="space-y-4">
          <AddExpenseForm onAdd={exp.add} />
          <div className="space-y-2">
            {exp.entries.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-8">कुनै खर्च रेकर्ड छैन।</p>
            )}
            {exp.entries.map(e => (
              <div key={e.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-white">{e.service}</p>
                  <p className="text-xs text-zinc-500">{e.date} · {e.category} · {" "}
                    <span className={e.classification === "CAPEX" ? "text-blue-400" : "text-orange-400"}>
                      {e.classification}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-mono text-orange-400">{fmtUSD(e.amountUSD)}</p>
                  <button onClick={() => exp.remove(e.id)} className="text-zinc-700 hover:text-red-400 text-xs">✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Costs tab */}
      {tab === "ai-costs" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ai.byService.map(s => (
              <div key={s.service} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className="text-xs text-zinc-500 mb-1">{s.service}</p>
                <p className="text-lg font-bold font-mono text-white">{fmtUSD(s.costUSD)}</p>
                <p className="text-xs text-zinc-600">{s.operations} operations</p>
              </div>
            ))}
            {ai.byService.length === 0 && (
              <p className="text-zinc-600 text-sm col-span-3 text-center py-8">कुनै AI लागत रेकर्ड छैन।</p>
            )}
          </div>
          {ai.monthlyBurn.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">मासिक AI खर्च (USD)</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={ai.monthlyBurn.map(m => ({ period: m.period.slice(5), costUSD: m.costUSD }))}>
                  <XAxis dataKey="period" tick={{ fill: "#71717a", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#71717a", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }} />
                  <Bar dataKey="costUSD" fill="#a855f7" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Goals tab */}
      {tab === "goals" && (
        <div className="space-y-3">
          {kpis.goals.length === 0 && (
            <p className="text-zinc-600 text-sm text-center py-8">कुनै लक्ष्य थपिएको छैन।</p>
          )}
          {kpis.goals.map(g => <GoalProgress key={g.id} goal={g} />)}
        </div>
      )}
    </div>
  );
}

export default function BusinessClient() {
  return <BIDashboard />;
}
