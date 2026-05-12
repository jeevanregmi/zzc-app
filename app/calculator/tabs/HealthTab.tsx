"use client";

import type { HealthHookReturn } from "../../../hooks/useFinancialHealth";
import { ScoreBar, InsightBox, StatCard, NumInput } from "../../../components/calculator";
import { formatNPR, scoreLabel, scoreColor } from "../../../lib/finance-engine";

export function HealthTab({ inputs, setters, result }: HealthHookReturn) {
  const yearsToRet = Math.max(0, 60 - inputs.currentAge);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Inputs */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">वित्तीय स्वास्थ्य</h2>

        <NumInput
          label="मासिक आय (NPR)"
          value={inputs.monthlyIncome}
          onChange={setters.setMonthlyIncome}
          min={10_000}
          step={5_000}
        />
        <NumInput
          label="मासिक खर्च (NPR)"
          value={inputs.monthlyExpenses}
          onChange={setters.setMonthlyExpenses}
          min={5_000}
          step={1_000}
        />
        <NumInput
          label="इमर्जेन्सी फन्ड ब्यालेन्स (NPR)"
          value={inputs.emergencyFundBalance}
          onChange={setters.setEmergencyFundBalance}
          min={0}
          step={10_000}
        />
        <NumInput
          label="जीवन बीमा कभर (NPR)"
          value={inputs.lifeInsuranceCover}
          onChange={setters.setLifeInsuranceCover}
          min={0}
          step={100_000}
        />
        <NumInput
          label="हालको उमेर"
          value={inputs.currentAge}
          onChange={setters.setCurrentAge}
          min={18} max={60} step={1} suffix="वर्ष"
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        {/* Overall score hero */}
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-5 flex items-center gap-5">
          <div className="text-center min-w-[80px]">
            <div className={"text-4xl font-bold font-mono " + scoreColor(result.overallScore)}>
              {result.overallScore}
            </div>
            <div className="text-xs text-zinc-500 mt-1">/100</div>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold mb-1">
              समग्र वित्तीय स्वास्थ्य — {scoreLabel(result.overallScore)}
            </p>
            <p className="text-xs text-zinc-400">
              इमर्जेन्सी ३५% + बचत ४०% + बीमा २५%
            </p>
          </div>
        </div>

        {/* Three score bars */}
        <div className="bg-zinc-800/50 rounded-xl p-4 space-y-1">
          <ScoreBar
            score={result.emergencyScore}
            label={`इमर्जेन्सी फन्ड — ${result.emergencyMonths} महिना`}
            sub="लक्ष्य: ६ महिना"
          />
          <ScoreBar
            score={result.savingsScore}
            label={`बचत दर — ${result.savingsRate}%`}
            sub="लक्ष्य: ३०%+"
          />
          <ScoreBar
            score={result.insuranceScore}
            label={`बीमा कभरेज — HLV को ${result.insuranceCoverage}%`}
            sub="लक्ष्य: HLV बराबर"
          />
        </div>

        {/* HLV + premium */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Human Life Value (HLV)"
            value={formatNPR(result.hlv)}
            sub={`${yearsToRet} वर्षको भविष्य आय PV`}
            highlight
          />
          <StatCard
            label="सिफारिश टर्म बीमा प्रिमियम"
            value={formatNPR(result.termPremiumAnnual)}
            sub="वार्षिक अनुमानित लागत"
          />
        </div>

        {/* Insights */}
        {result.emergencyMonths < 3 && (
          <InsightBox type="danger">
            इमर्जेन्सी फन्ड मात्र <strong>{result.emergencyMonths} महिना</strong> — रोजगारी गुम्यो वा स्वास्थ्य
            समस्या आयो भने ऋण लिनुपर्छ। {formatNPR(inputs.monthlyExpenses * 6)} को इमर्जेन्सी फन्ड लक्ष्य राख्नुहोस्।
          </InsightBox>
        )}
        {result.savingsRate < 10 && (
          <InsightBox type="warning">
            बचत दर <strong>{result.savingsRate}%</strong> मात्र। विशेषज्ञहरू कम्तिमा <strong>२०%</strong> बचत
            गर्न सिफारिश गर्छन्। खर्च घटाउने वा आय बढाउने लक्ष्य राख्नुहोस्।
          </InsightBox>
        )}
        {result.insuranceCoverage < 50 && (
          <InsightBox type="warning">
            HLV को मात्र <strong>{result.insuranceCoverage}%</strong> बीमा छ।
            {formatNPR(result.hlv)} कभरको टर्म बीमा लिनुहोस् — वार्षिक प्रिमियम मात्र
            {" "}{formatNPR(result.termPremiumAnnual)} पर्छ।
          </InsightBox>
        )}
      </div>
    </div>
  );
}
