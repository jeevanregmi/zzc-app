/**
 * Report Builder — FinancialSnapshot → structured report data
 *
 * Boundary: CALCULATION ← here → PERSISTENCE / PDF EXPORT
 *
 * Converts a FinancialSnapshot into a flat, serializable report structure.
 * Designed to feed:
 *   - Future PDF generator (e.g., @react-pdf/renderer or puppeteer)
 *   - Firestore persistence (save user's financial plan)
 *   - Analytics pipeline (anonymised aggregate insights)
 *
 * TECHNICAL DEBT RISK:
 *   ReportSection uses string values (pre-formatted). If report consumers need
 *   to sort/filter by value, they'll need raw numbers. Refactor to
 *   { label: string; rawValue: number; displayValue: string } when needed.
 */

import type { FinancialSnapshot, Recommendation } from "../types/financial";
import { formatNPR, formatPct, scoreLabel } from "../finance-engine";

export interface ReportMetric {
  label: string;
  value: string;
  highlight?: boolean;
}

export interface ReportSection {
  id: string;
  title: string;
  metrics: ReportMetric[];
}

export interface ReportData {
  generatedAt: string;
  userId?: string;
  profileSummary: string;
  sections: ReportSection[];
  recommendations: Recommendation[];
}

export function buildReportData(snapshot: FinancialSnapshot): ReportData {
  const { metadata, sipResult, retirementResult, loanResult, healthResult } = snapshot;
  const sections: ReportSection[] = [];

  sections.push({
    id: "profile",
    title: "प्रोफाइल",
    metrics: [
      { label: "उमेर",           value: `${metadata.age} वर्ष` },
      { label: "मासिक तलब",      value: formatNPR(metadata.salary) },
      { label: "मासिक खर्च",     value: formatNPR(metadata.expenses) },
      { label: "अवकाश उमेर",     value: `${metadata.retirementAge} वर्ष` },
      { label: "जीवन अवधि",      value: `${metadata.lifeExpectancy} वर्ष` },
      { label: "मुद्रास्फीति मान्यता", value: formatPct(metadata.inflationAssumption) },
    ],
  });

  if (sipResult) {
    sections.push({
      id: "sip",
      title: "SIP प्रक्षेपण",
      metrics: [
        { label: "अन्तिम corpus (nominal)", value: formatNPR(sipResult.finalNominal), highlight: true },
        { label: "अन्तिम corpus (real)",    value: formatNPR(sipResult.finalReal),    highlight: true },
        { label: "मुद्रास्फीति कटौती",      value: formatNPR(sipResult.inflationErosion) },
        { label: "CAGR",                    value: formatPct(sipResult.cagr) },
        { label: "Multiplier",              value: `${sipResult.multiplier}x` },
        { label: "मासिक पेन्सन (real)",     value: formatNPR(sipResult.monthlyPensionReal) },
      ],
    });
  }

  if (retirementResult) {
    const r = retirementResult;
    sections.push({
      id: "retirement",
      title: "सेवानिवृत्ति विश्लेषण",
      metrics: [
        { label: "आवश्यक corpus",       value: formatNPR(r.requiredCorpusReal),   highlight: true },
        { label: "अनुमानित SSF corpus", value: formatNPR(r.projectedCorpusReal), highlight: true },
        { label: "अन्तर (Gap)",         value: formatNPR(r.corpusGap) },
        { label: "पर्याप्तता स्कोर",    value: `${r.adequacyScore}/100 — ${scoreLabel(r.adequacyScore)}` },
        { label: "प्रतिस्थापन अनुपात", value: formatPct(r.replacementRatio) },
        { label: "corpus टिकाउ",        value: `${r.sustainabilityYears} वर्ष` },
        { label: "थप मासिक बचत",        value: formatNPR(r.monthlyGapToClose) },
      ],
    });
  }

  if (loanResult) {
    sections.push({
      id: "loan",
      title: "ऋण विश्लेषण",
      metrics: [
        { label: "EMI",              value: formatNPR(loanResult.emi),           highlight: true },
        { label: "कुल ब्याज",        value: formatNPR(loanResult.totalInterest) },
        { label: "DTI",              value: `${loanResult.dti.toFixed(1)}% (${loanResult.dtiCategory})` },
        { label: "अवसर लागत",        value: formatNPR(loanResult.opportunityCost) },
        { label: "प्रति रुपैयाँ लागत", value: `NPR ${loanResult.costPerRupee}` },
      ],
    });
  }

  if (healthResult) {
    sections.push({
      id: "health",
      title: "वित्तीय स्वास्थ्य",
      metrics: [
        { label: "समग्र स्कोर",     value: `${healthResult.overallScore}/100 — ${scoreLabel(healthResult.overallScore)}`, highlight: true },
        { label: "इमर्जेन्सी फन्ड", value: `${healthResult.emergencyMonths} महिना (${healthResult.emergencyScore}/100)` },
        { label: "बचत दर",          value: `${healthResult.savingsRate}% (${healthResult.savingsScore}/100)` },
        { label: "बीमा कवरेज",      value: `HLV को ${healthResult.insuranceCoverage}% (${healthResult.insuranceScore}/100)` },
        { label: "Human Life Value", value: formatNPR(healthResult.hlv) },
        { label: "टर्म बीमा प्रिमियम", value: formatNPR(healthResult.termPremiumAnnual) + "/वर्ष" },
      ],
    });
  }

  const profileSummary = [
    `${metadata.age} वर्षीय, ${formatNPR(metadata.salary)}/महिना`,
    retirementResult ? `अवकाश पर्याप्तता: ${retirementResult.adequacyScore}/100` : "",
    healthResult     ? `वित्तीय स्वास्थ्य: ${healthResult.overallScore}/100` : "",
  ].filter(Boolean).join(" | ");

  return {
    generatedAt: snapshot.generatedAt,
    userId:      snapshot.userId,
    profileSummary,
    sections,
    recommendations: snapshot.recommendations,
  };
}
