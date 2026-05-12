/**
 * AI Prompt Builder — FinancialSnapshot → structured Anthropic API prompt
 *
 * Boundary: CALCULATION ← here → AI ORCHESTRATION
 *
 * This adapter converts a fully-computed FinancialSnapshot into a prompt string
 * suitable for Claude. It is the only file that knows about both the financial
 * domain (lib/types) AND the AI API contract (prompt structure).
 *
 * Design principles:
 *   - Pure function: snapshot in, string out. No API calls here.
 *   - Prompt is structured (sections + numbered facts) so Claude can reason
 *     over specific numbers without hallucinating.
 *   - All monetary values are in NPR real terms (today's purchasing power)
 *     to prevent confusing Claude with nominal vs real distinctions.
 *
 * TECHNICAL DEBT RISK:
 *   Prompt format is tightly coupled to Claude's current behavior. If model
 *   changes response style, update the system prompt in functions/api/recommend.ts,
 *   NOT this file. This file produces the user-turn content only.
 */

import type { FinancialSnapshot } from "../types/financial";
import { formatNPR, scoreLabel } from "../finance-engine";

/**
 * Build a structured user-turn prompt from a FinancialSnapshot.
 * Output is English for Claude; UI translations stay in the component layer.
 */
export function buildAIPrompt(snapshot: FinancialSnapshot): string {
  const { metadata, sipResult, retirementResult, loanResult, healthResult, monteCarloResult } = snapshot;
  const lines: string[] = [];

  lines.push("## Financial Profile — Nepal Investor");
  lines.push(`Age: ${metadata.age} | Monthly Salary: ${formatNPR(metadata.salary)} | Monthly Expenses: ${formatNPR(metadata.expenses)}`);
  lines.push(`Retirement Target Age: ${metadata.retirementAge} | Life Expectancy: ${metadata.lifeExpectancy} | Inflation Assumption: ${metadata.inflationAssumption}%`);
  lines.push("");

  if (sipResult) {
    lines.push("### SIP Projection");
    lines.push(`Final corpus (nominal): ${formatNPR(sipResult.finalNominal)}`);
    lines.push(`Final corpus (real / today's money): ${formatNPR(sipResult.finalReal)}`);
    lines.push(`Inflation erosion: ${formatNPR(sipResult.inflationErosion)} — ${((sipResult.inflationErosion / sipResult.finalNominal) * 100).toFixed(0)}% of nominal corpus`);
    lines.push(`CAGR: ${sipResult.cagr.toFixed(2)}% | Real return rate: ${sipResult.realReturnRate.toFixed(2)}% | Multiplier: ${sipResult.multiplier}x`);
    lines.push(`Estimated monthly pension: ${formatNPR(sipResult.monthlyPensionReal)} (real terms)`);
    lines.push("");
  }

  if (retirementResult) {
    const r = retirementResult;
    const gapDir = r.corpusGap > 0 ? "SHORTFALL" : "SURPLUS";
    lines.push("### Retirement Adequacy");
    lines.push(`Required corpus (real): ${formatNPR(r.requiredCorpusReal)}`);
    lines.push(`Projected SSF corpus (real): ${formatNPR(r.projectedCorpusReal)}`);
    lines.push(`Gap: ${formatNPR(Math.abs(r.corpusGap))} — ${gapDir}`);
    lines.push(`Adequacy score: ${r.adequacyScore}/100 (${scoreLabel(r.adequacyScore)})`);
    lines.push(`Replacement ratio: ${r.replacementRatio}% (target: 70%)`);
    lines.push(`Corpus sustainability: ${r.sustainabilityYears} years (need ${metadata.lifeExpectancy - metadata.retirementAge} years)`);
    if (r.monthlyGapToClose > 0) {
      lines.push(`Monthly additional savings needed: ${formatNPR(r.monthlyGapToClose)}`);
    }
    lines.push(`Scenario — 6% inflation: gap ${formatNPR(r.scenarioComparison.inflation6.gap)}`);
    lines.push(`Scenario — 8% inflation: gap ${formatNPR(r.scenarioComparison.inflation8.gap)}`);
    lines.push("");
  }

  if (loanResult) {
    lines.push("### Loan Analysis");
    lines.push(`EMI: ${formatNPR(loanResult.emi)} | Total interest: ${formatNPR(loanResult.totalInterest)}`);
    lines.push(`DTI: ${loanResult.dti.toFixed(1)}% (${loanResult.dtiCategory}) | Affordability: ${loanResult.affordabilityScore}/100`);
    lines.push(`Opportunity cost of debt: ${formatNPR(loanResult.opportunityCost)} (EMI invested at EPF rate)`);
    lines.push(`Cost per rupee borrowed: NPR ${loanResult.costPerRupee}`);
    lines.push("");
  }

  if (healthResult) {
    lines.push("### Financial Health");
    lines.push(`Overall score: ${healthResult.overallScore}/100 (${scoreLabel(healthResult.overallScore)})`);
    lines.push(`Emergency fund: ${healthResult.emergencyMonths} months covered (target: 6 months) — score: ${healthResult.emergencyScore}/100`);
    lines.push(`Savings rate: ${healthResult.savingsRate}% — score: ${healthResult.savingsScore}/100`);
    lines.push(`Insurance coverage: ${healthResult.insuranceCoverage}% of HLV (${formatNPR(healthResult.hlv)}) — score: ${healthResult.insuranceScore}/100`);
    lines.push(`Recommended term cover: ${formatNPR(healthResult.hlv)} | Est. annual premium: ${formatNPR(healthResult.termPremiumAnnual)}`);
    lines.push("");
  }

  if (monteCarloResult) {
    lines.push("### Monte Carlo Results");
    lines.push(`Probability of retirement success: ${monteCarloResult.probabilityOfSuccess}%`);
    lines.push(`Median outcome (p50): ${formatNPR(monteCarloResult.percentiles.p50)}`);
    lines.push(`Pessimistic (p10): ${formatNPR(monteCarloResult.percentiles.p10)} | Optimistic (p90): ${formatNPR(monteCarloResult.percentiles.p90)}`);
    if (monteCarloResult.expectedShortfall > 0) {
      lines.push(`Expected shortfall in failing scenarios: ${formatNPR(monteCarloResult.expectedShortfall)}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("Provide personalised, actionable advice in Nepali language. Focus on:");
  lines.push("1. The most critical gap or risk in this profile");
  lines.push("2. Specific Nepal-available investment schemes (EPF, SSF, CIT, NEPSE) to address the gap");
  lines.push("3. One concrete monthly action amount in NPR");
  lines.push("4. Risk of inaction — what happens in 10 years if nothing changes");

  return lines.join("\n");
}
