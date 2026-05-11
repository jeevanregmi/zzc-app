"use client";

import { useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import type { SIPHookReturn } from "../../../hooks/useSIPCalculator";
import { ScoreBar, InsightBox, StatCard, NumInput, SliderInput } from "../../../components/calculator";
import { formatNPR, formatPct, calcSIPFull } from "../../../lib/finance-engine";
import { SCHEMES } from "../../../lib/schemes-data";
import { NEPAL_SCENARIOS } from "../../../lib/simulation/engine";

const PRESETS = SCHEMES
  .filter(s => s.calculatorEnabled && s.interestRate !== null)
  .slice(0, 4)
  .map(s => ({ label: s.titleNepali, rate: s.interestRate as number }));

export function SIPTab({ inputs, setters, result }: SIPHookReturn) {
  const [showReal, setShowReal] = useState(false);
  const years = inputs.retirementAge - inputs.currentAge;

  // Stress-test: run all 5 Nepal scenarios against current monthly + age inputs
  const scenarios = useMemo(() =>
    NEPAL_SCENARIOS.map(s => {
      const r = calcSIPFull({
        ...inputs,
        annualRate:    s.nominalReturn,
        inflationRate: s.inflationRate,
        stepUpRate:    s.salaryGrowthRate,
      });
      return { label: s.label, nominal: r.finalNominal, real: r.finalReal };
    }),
    [inputs]
  );

  const chartData = result.rows.map(r => ({
    age:   r.age,
    nominal:     Math.round(r.nominal / 100_000),
    real:        Math.round(r.real / 100_000),
    contributed: Math.round(r.contributed / 100_000),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">SIP सेटिङ</h2>

        <div className="flex flex-wrap gap-2 mb-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setters.setAnnualRate(p.rate)}
              className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded hover:border-green-500 text-zinc-300 transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>

        <NumInput
          label="मासिक लगानी (NPR)"
          value={inputs.monthly}
          onChange={setters.setMonthly}
          min={500}
          step={500}
        />
        <SliderInput
          label="वार्षिक रिटर्न"
          value={inputs.annualRate}
          onChange={setters.setAnnualRate}
          min={4}
          max={18}
        />
        <NumInput
          label="हालको उमेर"
          value={inputs.currentAge}
          onChange={setters.setCurrentAge}
          min={18}
          max={55}
          step={1}
          suffix="वर्ष"
        />
        <NumInput
          label="अवकाश उमेर"
          value={inputs.retirementAge}
          onChange={setters.setRetirementAge}
          min={50}
          max={70}
          step={1}
          suffix="वर्ष"
        />
        <SliderInput
          label="मुद्रास्फीति दर"
          value={inputs.inflationRate}
          onChange={setters.setInflationRate}
          min={3}
          max={12}
        />
        <SliderInput
          label="वार्षिक योगदान वृद्धि"
          value={inputs.stepUpRate}
          onChange={setters.setStepUpRate}
          min={0}
          max={15}
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="अन्तिम corpus (nominal)" value={formatNPR(result.finalNominal)} highlight />
          <StatCard label="अन्तिम corpus (real)"    value={formatNPR(result.finalReal)} highlight />
          <StatCard label="मुद्रास्फीति कटौती"       value={formatNPR(result.inflationErosion)}
            valueClass="text-orange-400" />
          <StatCard label="CAGR"         value={formatPct(result.cagr)} />
          <StatCard label="Multiplier"   value={`${result.multiplier}x`} />
          <StatCard label="वास्तविक रिटर्न" value={formatPct(result.realReturnRate)}
            valueClass={result.realReturnRate >= 0 ? "text-green-400" : "text-red-400"} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="मासिक पेन्सन (nominal)"
            value={formatNPR(result.monthlyPensionNominal)}
            sub="4% SWR"
          />
          <StatCard
            label="मासिक पेन्सन (real)"
            value={formatNPR(result.monthlyPensionReal)}
            sub="आजको क्रय शक्तिमा"
            highlight
          />
        </div>

        {result.realReturnRate < 0 && (
          <InsightBox type="danger">
            <strong>सावधान!</strong> वास्तविक रिटर्न {formatPct(result.realReturnRate)} — मुद्रास्फीतिले लगानीको मूल्य घटाउँदैछ।
            रिटर्न {formatPct(inputs.inflationRate)} भन्दा बढी हुनुपर्छ।
          </InsightBox>
        )}

        {/* Chart with real/nominal toggle */}
        {chartData.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-zinc-500">corpus प्रक्षेपण (लाखमा) — {years} वर्ष</p>
              <button
                onClick={() => setShowReal(p => !p)}
                className={
                  "text-xs px-2 py-1 rounded border transition-colors " +
                  (showReal
                    ? "border-yellow-500 text-yellow-400 bg-yellow-500/10"
                    : "border-zinc-600 text-zinc-400 hover:border-zinc-400")
                }
              >
                {showReal ? "Real मात्र" : "Nominal + Real"}
              </button>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`NPR ${v} लाख`]}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                />
                <Legend />
                {!showReal && <Area type="monotone" dataKey="nominal"     name="Nominal"     stroke="#22c55e" fill="#22c55e22" strokeWidth={2} dot={false} />}
                <Area type="monotone" dataKey="real"        name="Real"        stroke="#facc15" fill="#facc1522" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="contributed" name="Contributed" stroke="#71717a" fill="#71717a11" strokeWidth={1} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Stress-test scenarios */}
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-2">नेपाल परिदृश्य विश्लेषण</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-700">
                  <th className="text-left py-1 pr-3">परिदृश्य</th>
                  <th className="text-right py-1 pr-3">Nominal</th>
                  <th className="text-right py-1">Real</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s, i) => (
                  <tr key={i} className={
                    "border-b border-zinc-800 " +
                    (i === 2 ? "text-white font-medium bg-zinc-800/30" : "text-zinc-400")
                  }>
                    <td className="py-1.5 pr-3">{s.label}{i === 2 ? " ★" : ""}</td>
                    <td className="text-right py-1.5 pr-3">{formatNPR(s.nominal)}</td>
                    <td className="text-right py-1.5 text-yellow-400">{formatNPR(s.real)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-zinc-600 mt-1">★ = आधारभूत परिदृश्य (तपाईंको हालको सेटिङ)</p>
        </div>

        <InsightBox type="info">
          <strong>नेपाल-विशेष सल्लाह:</strong> EPF/SSF अनिवार्य योगदान (११%+२०%) गणनामा थपिएको छ।
          NEPSE लामो अवधिमा उच्च रिटर्न दिन्छ तर अस्थिरता पनि उच्च हुन्छ।
        </InsightBox>
      </div>
    </div>
  );
}
