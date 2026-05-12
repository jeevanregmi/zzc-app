"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { LoanHookReturn } from "../../../hooks/useLoanAnalyzer";
import { InsightBox, StatCard, NumInput, SliderInput } from "../../../components/calculator";
import { formatNPR, formatPct } from "../../../lib/finance-engine";
import type { DTICategory } from "../../../lib/types/financial";

const DTI_BADGE: Record<DTICategory, string> = {
  safe:       "bg-green-500/20 text-green-400 border-green-500/30",
  manageable: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  stretched:  "bg-orange-500/20 text-orange-400 border-orange-500/30",
  dangerous:  "bg-red-500/20 text-red-400 border-red-500/30",
};

const DTI_NEPALI: Record<DTICategory, string> = {
  safe:       "सुरक्षित",
  manageable: "व्यवस्थापनयोग्य",
  stretched:  "तनावपूर्ण",
  dangerous:  "खतरनाक",
};

export function LoanTab({ inputs, setters, result }: LoanHookReturn) {
  const chartData = result.rows.map(r => ({
    year: r.year,
    balance:     Math.round(r.balance / 100_000),
    cumInterest: Math.round(r.cumInterest / 100_000),
    cumPrincipal:Math.round(r.cumPrincipal / 100_000),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">ऋण विवरण</h2>

        <NumInput
          label="ऋण रकम (NPR)"
          value={inputs.principal}
          onChange={setters.setPrincipal}
          min={100_000}
          step={100_000}
        />
        <SliderInput
          label="वार्षिक ब्याजदर"
          value={inputs.annualRate}
          onChange={setters.setAnnualRate}
          min={4}
          max={18}
        />
        <NumInput
          label="अवधि"
          value={inputs.tenureYears}
          onChange={setters.setTenureYears}
          min={1} max={30} step={1} suffix="वर्ष"
        />
        <NumInput
          label="मासिक आय (NPR)"
          value={inputs.monthlyIncome}
          onChange={setters.setMonthlyIncome}
          min={10_000}
          step={5_000}
        />

        <InsightBox type="info">
          <strong>DTI</strong> (Debt-to-Income) = EMI ÷ आय × १००।
          ३०% भन्दा कम सुरक्षित। ५०% भन्दा बढी भए बैंकले ऋण अस्वीकार गर्न सक्छ।
        </InsightBox>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* EMI + DTI hero row */}
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-[140px] bg-zinc-800 border border-green-500/25 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">मासिक EMI</p>
            <p className="text-2xl font-bold font-mono text-green-400">{formatNPR(result.emi)}</p>
          </div>
          <div className="flex-1 min-w-[140px] bg-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">DTI</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold font-mono text-white">{result.dti.toFixed(1)}%</p>
              <span className={"text-xs px-2 py-0.5 rounded border " + DTI_BADGE[result.dtiCategory]}>
                {DTI_NEPALI[result.dtiCategory]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="कुल भुक्तानी"      value={formatNPR(result.totalPayment)} />
          <StatCard label="कुल ब्याज"          value={formatNPR(result.totalInterest)}
            valueClass="text-orange-400" />
          <StatCard label="प्रति रुपैयाँ लागत" value={`NPR ${result.costPerRupee}`} />
          <StatCard label="वहनक्षमता स्कोर"    value={`${result.affordabilityScore}/100`}
            valueClass={result.affordabilityScore >= 80 ? "text-green-400" : result.affordabilityScore >= 50 ? "text-yellow-400" : "text-red-400"}
          />
          <StatCard
            label="अवसर लागत"
            value={formatNPR(result.opportunityCost)}
            sub="EMI कै रकम EPF मा लगाउँदा"
            valueClass="text-zinc-400"
          />
        </div>

        {result.opportunityCost > result.totalPayment && (
          <InsightBox type="warning">
            यो ऋणको कुल भुक्तानी ({formatNPR(result.totalPayment)}) भन्दा अवसर लागत
            ({formatNPR(result.opportunityCost)}) बढी छ। ऋण नलिई लगानी गर्नु बढी फाइदाजनक हुन्थ्यो।
          </InsightBox>
        )}

        {/* Amortization chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">ऋण घटाउने तालिका (लाखमा)</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} label={{ value: "वर्ष", fill: "#71717a", fontSize: 11, position: "insideBottom" }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`NPR ${v} लाख`]}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                />
                <Legend />
                <Area type="monotone" dataKey="balance"      name="बाँकी ऋण"    stroke="#f97316" fill="#f9731622" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="cumInterest"  name="जम्मा ब्याज"  stroke="#ef4444" fill="#ef444411" strokeWidth={1} dot={false} />
                <Area type="monotone" dataKey="cumPrincipal" name="जम्मा साँवा"  stroke="#22c55e" fill="#22c55e11" strokeWidth={1} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
