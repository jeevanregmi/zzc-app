"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import type { RetirementHookReturn } from "../../../hooks/useRetirementPlanner";
import { ScoreBar, InsightBox, StatCard, NumInput, SliderInput } from "../../../components/calculator";
import { formatNPR, formatPct, scoreLabel } from "../../../lib/finance-engine";

export function RetirementTab({ inputs, setters, result }: RetirementHookReturn) {
  const yearsToRet = inputs.retirementAge - inputs.currentAge;
  const retYears   = inputs.lifeExpectancy - inputs.retirementAge;
  const isFunded   = result.corpusGap <= 0;

  const chartData = result.ssfCorpusRows
    .filter((_, i) => i % 2 === 0)
    .map(r => ({
      age:     r.age,
      corpus:  Math.round(r.corpus / 100_000),
      required: Math.round(result.requiredCorpusReal / 100_000),
    }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">सेवानिवृत्ति सेटिङ</h2>

        <NumInput
          label="हालको मासिक तलब (NPR)"
          value={inputs.currentSalary}
          onChange={setters.setCurrentSalary}
          min={10_000}
          step={5_000}
        />
        <NumInput
          label="मासिक खर्च — आजको मूल्यमा (NPR)"
          value={inputs.monthlyExpensesToday}
          onChange={setters.setMonthlyExpensesToday}
          min={5_000}
          step={1_000}
        />
        <NumInput
          label="हालको उमेर"
          value={inputs.currentAge}
          onChange={setters.setCurrentAge}
          min={18} max={60} step={1} suffix="वर्ष"
        />
        <NumInput
          label="अवकाश उमेर"
          value={inputs.retirementAge}
          onChange={setters.setRetirementAge}
          min={50} max={70} step={1} suffix="वर्ष"
        />
        <NumInput
          label="जीवन अवधि"
          value={inputs.lifeExpectancy}
          onChange={setters.setLifeExpectancy}
          min={60} max={95} step={1} suffix="वर्ष"
        />
        <SliderInput
          label="सेवानिवृत्ति पश्चात् रिटर्न"
          value={inputs.postRetirementReturn}
          onChange={setters.setPostRetirementReturn}
          min={3} max={12}
        />
        <SliderInput
          label="मुद्रास्फीति दर"
          value={inputs.inflationRate}
          onChange={setters.setInflationRate}
          min={3} max={12}
        />
        <SliderInput
          label="तलब वृद्धि दर"
          value={inputs.salaryGrowthRate}
          onChange={setters.setSalaryGrowthRate}
          min={3} max={15}
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Adequacy score */}
        <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-400">corpus पर्याप्तता</span>
            <span className={
              "text-2xl font-bold font-mono " +
              (result.adequacyScore >= 80 ? "text-green-400" : result.adequacyScore >= 50 ? "text-yellow-400" : "text-red-400")
            }>
              {result.adequacyScore}/100
            </span>
          </div>
          <ScoreBar score={result.adequacyScore} label={scoreLabel(result.adequacyScore)} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="आवश्यक corpus (real)"    value={formatNPR(result.requiredCorpusReal)} highlight />
          <StatCard label="SSF corpus (real)"        value={formatNPR(result.projectedCorpusReal)} />
          <StatCard
            label="अन्तर"
            value={formatNPR(Math.abs(result.corpusGap))}
            sub={isFunded ? "अधिशेष ✓" : "कमी ✗"}
            valueClass={isFunded ? "text-green-400" : "text-red-400"}
          />
          <StatCard label="प्रतिस्थापन अनुपात"     value={formatPct(result.replacementRatio)} sub="लक्ष्य: ७०%" />
          <StatCard label="corpus टिकाउपना"         value={`${result.sustainabilityYears} वर्ष`}
            sub={`${retYears} वर्ष चाहिन्छ`}
            valueClass={result.sustainabilityYears >= retYears ? "text-green-400" : "text-red-400"}
          />
          <StatCard label="थप मासिक बचत चाहिन्छ"   value={formatNPR(result.monthlyGapToClose)}
            valueClass={result.monthlyGapToClose > 0 ? "text-orange-400" : "text-green-400"}
          />
        </div>

        {/* SSF details */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="SSF मासिक पेन्सन"   value={formatNPR(result.ssfMonthlyPension)} />
          <StatCard label="SSF मासिक योगदान"   value={formatNPR(result.ssfMonthlyContrib)} sub="तलबको ३१%" />
        </div>

        {/* Scenario comparison */}
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="text-xs text-zinc-500 mb-2 font-medium uppercase tracking-wider">मुद्रास्फीति परिदृश्य</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-zinc-400 text-xs mb-1">६% मुद्रास्फीति</p>
              <p className="font-mono text-white">{formatNPR(result.scenarioComparison.inflation6.required)}</p>
              <p className={"text-xs font-mono " + (result.scenarioComparison.inflation6.gap > 0 ? "text-red-400" : "text-green-400")}>
                {result.scenarioComparison.inflation6.gap > 0 ? "कमी: " : "अधिशेष: "}
                {formatNPR(Math.abs(result.scenarioComparison.inflation6.gap))}
              </p>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">८% मुद्रास्फीति</p>
              <p className="font-mono text-white">{formatNPR(result.scenarioComparison.inflation8.required)}</p>
              <p className={"text-xs font-mono " + (result.scenarioComparison.inflation8.gap > 0 ? "text-red-400" : "text-green-400")}>
                {result.scenarioComparison.inflation8.gap > 0 ? "कमी: " : "अधिशेष: "}
                {formatNPR(Math.abs(result.scenarioComparison.inflation8.gap))}
              </p>
            </div>
          </div>
        </div>

        {!isFunded && (
          <InsightBox type="warning">
            SSF corpus मात्र <strong>{formatPct(result.replacementRatio)}</strong> आय प्रतिस्थापन गर्छ।
            थप <strong>{formatNPR(result.monthlyGapToClose)}/महिना</strong> लगानी गरेमा {yearsToRet} वर्षमा corpus पूर्ण हुन्छ।
          </InsightBox>
        )}

        {/* SSF corpus chart */}
        {chartData.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 mb-2">SSF corpus निर्माण (लाखमा)</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`NPR ${v} लाख`]}
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46" }}
                />
                <Area type="monotone" dataKey="corpus"   name="SSF corpus"    stroke="#22c55e" fill="#22c55e22" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="required" name="Required (real)" stroke="#f97316" fill="#f9731611" strokeWidth={1} dot={false} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
