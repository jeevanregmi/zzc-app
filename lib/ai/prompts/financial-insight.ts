/**
 * Prompt Template: Financial Insight Generator
 *
 * Input:  FinancialSnapshot (from calculator state)
 * Output: Nepali-language personalized insight with prioritized action items
 *
 * Used by: /recommend page AI summary
 * Called from: Cloudflare Pages Function /api/ai/financial-insight
 */

import type { AITextRequest, AITextResponse, PromptTemplate } from "../types";
import type { FinancialSnapshot } from "../../types/financial";

export interface FinancialInsightOutput {
  headline:        string;          // 1-sentence summary in Nepali
  strengthPoints:  string[];        // what the user is doing well
  riskPoints:      string[];        // risks identified
  actionItems:     string[];        // ranked action items (most impactful first)
  calculatorScore: number;          // 0-100 overall financial health score
}

export const financialInsightTemplate: PromptTemplate<FinancialSnapshot, FinancialInsightOutput> = {
  name:        "financial-insight",
  description: "Generates Nepali-language personalized financial insights from calculator data",

  build(snapshot: FinancialSnapshot): AITextRequest {
    return {
      system: FINANCIAL_INSIGHT_SYSTEM,
      messages: [{ role: "user", content: buildInsightPrompt(snapshot) }],
      maxTokens: 1200,
    };
  },

  parse(response: AITextResponse): FinancialInsightOutput {
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const raw = jsonMatch ? jsonMatch[1] : response.content;
      return JSON.parse(raw) as FinancialInsightOutput;
    } catch {
      return {
        headline:        "",
        strengthPoints:  [],
        riskPoints:      [],
        actionItems:     [],
        calculatorScore: 0,
      };
    }
  },
};

const FINANCIAL_INSIGHT_SYSTEM = `You are a bilingual (English/Nepali) financial advisor specializing in Nepal's personal finance.
You understand Nepal's economic context: 6.5% average inflation, SSF pension system, NEPSE, Nepali salary structures.
Provide practical, encouraging advice. Be specific to Nepal, not generic South Asian advice.
Output valid JSON. Use Nepali for human-readable strings, English for field names.`;

function buildInsightPrompt(snapshot: FinancialSnapshot): string {
  const sip        = snapshot.sipResult;
  const retirement = snapshot.retirementResult;
  const loan       = snapshot.loanResult;
  const health     = snapshot.healthResult;

  return `Analyze this Nepali user's financial snapshot and provide personalized insights.

SIP: ${sip ? `Final nominal NPR ${sip.finalNominal?.toLocaleString()}, Final real NPR ${sip.finalReal?.toLocaleString()}` : "Not configured"}

RETIREMENT: ${retirement ? `Adequacy score ${retirement.adequacyScore}%, Required corpus NPR ${retirement.requiredCorpusReal?.toLocaleString()}` : "Not configured"}

LOAN: ${loan ? `EMI NPR ${loan.emi?.toLocaleString()}, DTI ${loan.dti}%, Category: ${loan.dtiCategory}` : "No active loan"}

HEALTH: ${health ? `Overall score ${health.overallScore}/100, HLV NPR ${health.hlv?.toLocaleString()}` : "Not configured"}

Output JSON:
{
  "headline": "one-sentence Nepali summary of their financial position",
  "strengthPoints": ["Nepali strength 1", "Nepali strength 2"],
  "riskPoints": ["Nepali risk 1", "Nepali risk 2"],
  "actionItems": ["highest impact action in Nepali", "second action", "third action"],
  "calculatorScore": <0-100 integer>
}`;
}
