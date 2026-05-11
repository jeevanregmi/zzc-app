"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { PortfolioHookReturn } from "../../../hooks/usePortfolioOptimizer";
import type { RiskProfile } from "../../../lib/types/financial";
import { ScoreBar, InsightBox, StatCard, NumInput } from "../../../components/calculator";
import { formatNPR } from "../../../lib/finance-engine";

const RISK_OPTIONS: { value: RiskProfile; label: string; sub: string }[] = [
  { value: "conservative", label: "रूढिवादी",  sub: "Safety-first, low volatility" },
  { value: "moderate",     label: "मध्यम",     sub: "Balanced growth + safety" },
  { value: "aggressive",   label: "आक्रामक",   sub: "Max growth, long horizon" },
];

const BAR_COLORS = ["#22c55e", "#16a34a", "#facc15", "#f97316"];

const SCHEME_EXPLAINERS: Record<string, string> = {
  "epf-ssf-mandatory": "EPF/SSF — नियोक्ताले ५०% थप्छ। सरकारी ग्यारेन्टी।",
  "nsb-fd":            "NSB/FD — ९% ग्यारेन्टी। जोखिम शून्य।",
  "balanced-mf":       "Balanced MF — NEPSE + Bond मिश्रण। मध्यम जोखिम।",
  "equity-mf":         "Equity MF/NEPSE — उच्च रिटर्न, उच्च अस्थिरता। १०+ वर्ष चाहिन्छ।",
};

export function PortfolioTab({ inputs, setters, result, ratesLoading }: PortfolioHookReturn) {
  const chartData = result.allocations.map(a => ({
    name:  a.schemeName.split(" ").slice(0, 2).join(" "),
    pct:   a.pct,
    amount: Math.round(a.monthlyNPR / 1000),
  }));

  const years = Math.max(1, 60 - inputs.age);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">

      {/* Inputs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Portfolio सेटिङ</h2>
          <span className={"text-xs px-2 py-0.5 rounded-full " + (ratesLoading ? "bg-zinc-700 text-zinc-400" : "bg-green-900/50 text-green-400 border border-green-800")}>
            {ratesLoading ? "दर लोड हुँदैछ…" : "Live दर"}
          </span>
        </div>

        <NumInput
          label="हालको उमेर"
          value={inputs.age}
          onChange={setters.setAge}
          min={18} max={59} step={1} suffix="वर्ष"
        />
        <NumInput
          label="मासिक लगानी (NPR)"
          value={inputs.monthlyInvestable}
          onChange={setters.setMonthlyInvestable}
          min={1000} step={1000}
        />

        <div>
          <p className="text-xs text-zinc-400 mb-2">जोखिम प्रोफाइल</p>
          <div className="space-y-2">
            {RISK_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setters.setRiskTolerance(o.value)}
                className={
                  "w-full text-left px-3 py-2 rounded-lg border transition-colors " +
                  (inputs.riskTolerance === o.value
                    ? "border-green-500 bg-green-500/10 text-white"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500")
                }
              >
                <span className="text-sm font-medium">{o.label}</span>
                <span className="text-xs text-zinc-500 ml-2">{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {inputs.age >= 55 && (
          <InsightBox type="warning">
            उमेर ५५+ — risk एक tier घटाइएको छ।
          </InsightBox>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="कुल मासिक"   value={formatNPR(result.totalMonthlyNPR)} highlight />
          <StatCard label="२०-वर्ष (nominal)" value={formatNPR(result.projectedNominal)} />
          <StatCard label="२०-वर्ष (real)"    value={formatNPR(result.projectedReal)} highlight />
          <StatCard label="जोखिम स्कोर" value={`${result.riskScore}/10`}
            valueClass={result.riskScore <= 4 ? "text-green-400" : result.riskScore <= 6 ? "text-yellow-400" : "text-orange-400"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1">विविधता स्कोर</p>
            <ScoreBar score={result.diversScore} label="विविधता" />
          </div>
          <StatCard label="Horizon" value={`${years} वर्ष`} sub="सेवानिवृत्तिसम्म" />
        </div>

        {/* Allocation chart */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">मासिक allocation — हजार NPR मा</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 8 }}>
              <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <Tooltip
                formatter={(v) => [`NPR ${(v as number) * 1000} /महिना`]}
                contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Allocation breakdown */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Allocation विस्तार</p>
          {result.allocations.map(a => (
            <div key={a.schemeId} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
              <div className="flex-shrink-0 w-10 text-center">
                <span className="text-green-400 font-bold text-sm">{a.pct}%</span>
                <div className="text-xs text-zinc-500">{formatNPR(a.monthlyNPR)}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium">{a.schemeName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{SCHEME_EXPLAINERS[a.schemeId] ?? a.rationale}</p>
              </div>
            </div>
          ))}
        </div>

        {result.notes.length > 0 && (
          <InsightBox type="info">
            {result.notes.map((n, i) => <p key={i}>{n}</p>)}
          </InsightBox>
        )}
      </div>
    </div>
  );
}
