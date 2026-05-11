/**
 * ZZC Finance Engine — Mathematical core for financial intelligence
 *
 * Design mandates (enforced):
 *   - Pure functions only: no side effects, no I/O, no global state
 *   - All types imported from lib/types/financial (single source of truth)
 *   - Aggregate functions (calcSIPFull, calcRetirementFull, etc.) are the
 *     public API for hooks and adapters
 *   - Primitive functions (calcSIP, buildSIPRows, calcEMI, etc.) remain
 *     exported for unit testing and composition
 *
 * Engine is intentionally free of React, DOM, and browser APIs so it can
 * run in: Next.js server components, Web Workers, Node.js scripts, Jest.
 */

import type {
  SIPInputs, SIPRow, SIPResult,
  RetirementInputs, RetirementResult,
  LoanInputs, LoanResult, LoanAmortizationRow, DTICategory,
  HealthInputs, HealthResult,
  RiskProfile, PortfolioRecommendation,
  GoalPlan, FinancialGoal, MarketRateSnapshot,
} from "./types/financial";

// ─── Nepal Market Constants ──────────────────────────────────────────────────

/** Nepal avg CPI 2020-2025 (NRB source) */
export const NEPAL_INFLATION    = 6.5;
/** Nepal 91-day T-bill proxy (risk-free rate for Sharpe calculation) */
export const NEPAL_RISK_FREE    = 6.5;
/** Average formal sector annual salary growth */
export const SALARY_GROWTH_AVG  = 7.0;
/** Nepal avg life expectancy (WHO 2024) */
export const LIFE_EXPECTANCY_NP = 78;
/** Standard emergency fund target in months */
export const EMERGENCY_MONTHS_TARGET = 6;
/** CFA recommended retirement income replacement ratio */
export const TARGET_REPLACEMENT_RATIO = 70;
/** Default retirement age used when not specified */
export const DEFAULT_RETIREMENT_AGE = 60;

// ─── Internal intermediate type (kept here, not in domain types) ─────────────

export interface SSFPensionResult {
  corpus: number;
  monthlyPension: number;
  monthlyContrib: number;
  rows: { age: number; corpus: number }[];
}

// ─── 1. RETURN CALCULATIONS ──────────────────────────────────────────────────

/**
 * Fisher Equation: real return after stripping out inflation.
 * Real Rate = (1 + Nominal) / (1 + Inflation) − 1
 *
 * EPF 8.5% + 6.5% inflation = 1.88% real.
 * CIT ESGRS 3.75% + 6.5% inflation = −2.58% real (loss in purchasing power).
 */
export function realReturnRate(nominalRate: number, inflationRate: number): number {
  return ((1 + nominalRate / 100) / (1 + inflationRate / 100) - 1) * 100;
}

/**
 * Deflate a future nominal value to today's purchasing power.
 * Real Value = Nominal / (1 + inflation)^years
 */
export function toRealValue(nominalFV: number, inflationRate: number, years: number): number {
  if (years <= 0) return nominalFV;
  return nominalFV / Math.pow(1 + inflationRate / 100, years);
}

/**
 * CAGR: (End / Start)^(1/years) − 1
 * Finance managers use CAGR to compare investments of different durations.
 */
export function calcCAGR(startVal: number, endVal: number, years: number): number {
  if (years <= 0 || startVal <= 0 || endVal <= 0) return 0;
  return (Math.pow(endVal / startVal, 1 / years) - 1) * 100;
}

// ─── 2. SIP CALCULATIONS ────────────────────────────────────────────────────

/**
 * Standard SIP Future Value (annuity-due: payment at START of each period).
 * FV = PMT × ((1+r)^n − 1) / r × (1+r)
 */
export function calcSIP(monthlyAmount: number, annualRate: number, years: number): number {
  if (years <= 0 || monthlyAmount <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthlyAmount * n;
  return monthlyAmount * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

/**
 * Step-up SIP with inflation adjustment — builds year-by-year rows.
 *
 * Step-up: contribution grows by stepUpRate% each year (mirrors salary growth).
 * A 25-year-old saving NPR 5,000/month at 7% step-up contributes NPR 52,000/month
 * by age 60. Standard SIP misses this entirely.
 */
export function buildSIPRows(
  monthly: number,
  annualRate: number,
  fromAge: number,
  toAge: number,
  inflationRate: number,
  stepUpRate: number,
): SIPRow[] {
  const years = toAge - fromAge;
  if (years <= 0 || monthly <= 0) return [];
  const r = annualRate / 100 / 12;
  const rows: SIPRow[] = [];
  let fund = 0;
  let contributed = 0;
  let currentMonthly = monthly;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      fund = fund * (1 + r) + currentMonthly;
      contributed += currentMonthly;
    }
    rows.push({
      age: fromAge + y,
      year: y,
      nominal: Math.round(fund),
      real: Math.round(toRealValue(fund, inflationRate, y)),
      contributed: Math.round(contributed),
    });
    currentMonthly *= 1 + stepUpRate / 100;
  }
  return rows;
}

// ─── 3. RETIREMENT CALCULATIONS ─────────────────────────────────────────────

/**
 * Required retirement corpus in TODAY'S money (real terms).
 *
 * PV of growing annuity at real return rate:
 *   C = PMT_today × (1 − (1+r_real)^−n) / r_real
 *
 * Why real? "5 crore" 35 years from now = ~58 लाख today at 6.5% inflation.
 * Real terms prevents false confidence from nominal projections.
 */
export function calcRequiredCorpusReal(
  monthlyExpenseToday: number,
  retirementYears: number,
  postReturnRate: number,
  inflationRate: number,
): number {
  if (retirementYears <= 0 || monthlyExpenseToday <= 0) return 0;
  const realAnnual = realReturnRate(postReturnRate, inflationRate);
  const r = realAnnual / 100 / 12;
  const n = retirementYears * 12;
  if (Math.abs(r) < 1e-10) return monthlyExpenseToday * n;
  return monthlyExpenseToday * (1 - Math.pow(1 + r, -n)) / r;
}

/**
 * Pension sustainability: how many years does corpus fund monthly withdrawal?
 *
 * Solves annuity PV for n:
 *   n_months = −ln(1 − C×r/PMT) / ln(1+r)
 *
 * LONGEVITY RISK: if result < (lifeExpectancy − retirementAge), retiree outlives money.
 */
export function calcPensionSustainability(
  corpus: number,
  monthlyWithdrawal: number,
  postReturnRate: number,
): number {
  if (corpus <= 0 || monthlyWithdrawal <= 0) return 0;
  const r = postReturnRate / 100 / 12;
  if (r === 0) return Math.round((corpus / monthlyWithdrawal / 12) * 10) / 10;
  const ratio = (corpus * r) / monthlyWithdrawal;
  if (ratio >= 1) return 99;
  if (ratio <= 0) return 0;
  return Math.round((-Math.log(1 - ratio) / Math.log(1 + r)) / 12 * 10) / 10;
}

/** Replacement ratio: % of pre-retirement salary replaced by pension. Target: 70% (CFA). */
export function calcReplacementRatio(monthlyPension: number, finalSalary: number): number {
  return finalSalary > 0 ? (monthlyPension / finalSalary) * 100 : 0;
}

/** Corpus adequacy 0–100. 100 = fully funded. */
export function calcAdequacyScore(projectedReal: number, requiredReal: number): number {
  if (requiredReal <= 0) return 100;
  return Math.min(100, Math.round((projectedReal / requiredReal) * 100));
}

/** Monthly savings to close corpus gap. Inverse SIP FV. */
export function calcMonthlySavingsNeeded(gap: number, annualRate: number, years: number): number {
  if (gap <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return Math.round(gap / n);
  return Math.round((gap * r) / ((Math.pow(1 + r, n) - 1) * (1 + r)));
}

/** Salary at retirement with compound annual growth. */
export function projectedFinalSalary(
  currentSalary: number,
  yearsToRetirement: number,
  salaryGrowth = SALARY_GROWTH_AVG,
): number {
  return Math.round(currentSalary * Math.pow(1 + salaryGrowth / 100, yearsToRetirement));
}

// ─── 4. LOAN CALCULATIONS ────────────────────────────────────────────────────

/** EMI: P × r × (1+r)^n / ((1+r)^n − 1) */
export function calcEMI(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate === 0) return Math.round(principal / (years * 12));
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

function dtiCategory(dti: number): DTICategory {
  if (dti < 30) return "safe";
  if (dti < 40) return "manageable";
  if (dti < 50) return "stretched";
  return "dangerous";
}

/**
 * Full loan analysis: DTI, affordability, opportunity cost, amortization schedule.
 *
 * Opportunity cost: FV of investing EMI at EPF rate (8.5%) for same tenure.
 * If opportunity cost > total payment, debt is destroying value.
 */
export function calcLoanAnalysis(
  principal: number,
  annualRate: number,
  years: number,
  monthlyIncome: number,
): LoanResult {
  const emi = calcEMI(principal, annualRate, years);
  const n = years * 12;
  const r = annualRate > 0 ? annualRate / 100 / 12 : 0;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;
  const dti = monthlyIncome > 0 ? (emi / monthlyIncome) * 100 : 0;
  const cat = dtiCategory(dti);
  const affordabilityScore = dti < 30 ? 100 : dti < 40 ? 80 : dti < 50 ? 50 : 20;
  const opportunityCost = Math.round(calcSIP(emi, 8.5, years));
  const costPerRupee = principal > 0 ? parseFloat((totalPayment / principal).toFixed(2)) : 1;

  const rows: LoanAmortizationRow[] = [];
  let balance = principal;
  let cumPrincipal = 0;
  let cumInterest = 0;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      const intPmt = balance * r;
      const prinPmt = Math.min(emi - intPmt, balance);
      balance = Math.max(0, balance - prinPmt);
      cumInterest += intPmt;
      cumPrincipal += prinPmt;
    }
    rows.push({
      year: y,
      balance: Math.round(balance),
      cumPrincipal: Math.round(cumPrincipal),
      cumInterest: Math.round(cumInterest),
    });
  }
  return {
    emi,
    totalPayment,
    totalInterest,
    dti,
    dtiCategory: cat,
    affordabilityScore,
    opportunityCost,
    costPerRupee,
    rows,
  };
}

// ─── 5. RISK & SCHEME SCORING ────────────────────────────────────────────────

/**
 * Volatility proxy by stated risk level.
 * Without historical price series, qualitative risk maps to numeric volatility.
 */
const VOLATILITY_PROXY: Record<string, number> = {
  "Very Low": 0.3, "Low": 0.8, "Low-Medium": 1.5, "Medium": 3.0,
  "Medium-High": 4.5, "High": 6.0, "Very High": 9.0,
  "Low Risk": 0.8, "Moderate Risk": 3.0, "High Risk": 7.0,
};

const RISK_SCORE_MAP: Record<string, number> = {
  "Very Low": 1, "Low": 2, "Low-Medium": 3, "Medium": 5,
  "Medium-High": 7, "High": 9, "Very High": 10,
  "Low Risk": 2, "Moderate Risk": 5, "High Risk": 9,
};

const LIQUIDITY_SCORE_MAP: Record<string, number> = {
  "Very High": 10, "High": 8, "Medium": 5, "Low": 3, "Very Low": 1,
  "On retirement": 2, "Locked until retirement": 1,
};

/**
 * Sharpe-like score: (Return − RiskFreeRate) / VolatilityProxy
 *
 * EPF 8.5% → (8.5−6.5)/0.8 = 2.50 ← strong risk-adjusted return
 * SSF 8.5% → (8.5−6.5)/0.3 = 6.67 ← exceptional (employer co-contribution)
 * CIT ESGRS 3.75% → (3.75−6.5)/0.8 = −3.44 ← negative (destroys real value)
 */
export function calcSharpeScore(
  annualReturn: number,
  riskFreeRate: number,
  riskLevel: string,
): number {
  const vol = VOLATILITY_PROXY[riskLevel] ?? 3.0;
  return parseFloat(((annualReturn - riskFreeRate) / vol).toFixed(2));
}

export function schemeRiskScore(riskLevel: string): number {
  return RISK_SCORE_MAP[riskLevel] ?? 5;
}

export function schemeLiquidityScore(liquidity: string): number {
  if (LIQUIDITY_SCORE_MAP[liquidity] !== undefined) return LIQUIDITY_SCORE_MAP[liquidity];
  const key = Object.keys(LIQUIDITY_SCORE_MAP).find(k =>
    liquidity.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? LIQUIDITY_SCORE_MAP[key] : 5;
}

/**
 * Portfolio diversification via HHI: Σ(weight_i)²
 * Score = (1 − avg_HHI) × 100. Single scheme = 0. Equal 4-way spread ≈ 75.
 */
export function calcDiversificationScore(
  holdings: { category: string; org: string; amount: number }[],
): number {
  const total = holdings.reduce((s, h) => s + h.amount, 0);
  if (total === 0 || holdings.length < 2) return 0;
  const catAmts: Record<string, number> = {};
  const orgAmts: Record<string, number> = {};
  for (const h of holdings) {
    catAmts[h.category] = (catAmts[h.category] ?? 0) + h.amount;
    orgAmts[h.org] = (orgAmts[h.org] ?? 0) + h.amount;
  }
  const hhiCat = Object.values(catAmts).reduce((s, v) => s + (v / total) ** 2, 0);
  const hhiOrg = Object.values(orgAmts).reduce((s, v) => s + (v / total) ** 2, 0);
  return Math.round(((1 - hhiCat) + (1 - hhiOrg)) / 2 * 100);
}

// ─── 6. FINANCIAL HEALTH ────────────────────────────────────────────────────

/**
 * 3-factor financial health (0–100):
 *   Emergency Fund 35%: months covered / 6-month target
 *   Savings Rate   40%: (income − expenses) / income
 *   Insurance      25%: cover / HLV — Human Life Value = PV of future income surplus
 */
export function calcFinancialHealth(
  monthlyIncome: number,
  monthlyExpenses: number,
  emergencyFund: number,
  insuranceCover: number,
  yearsToRetirement: number,
): Omit<HealthResult, "termPremiumAnnual"> {
  const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  const emergencyScore = Math.min(100, Math.round((emergencyMonths / 6) * 100));

  const savingsRate = monthlyIncome > 0
    ? Math.max(0, ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100)
    : 0;
  const savingsScore = savingsRate >= 30 ? 100
    : savingsRate >= 20 ? 80
    : savingsRate >= 10 ? 50
    : Math.round(savingsRate * 3);

  const annualSurplus = Math.max(0, (monthlyIncome - monthlyExpenses) * 12);
  const d = NEPAL_INFLATION / 100;
  const hlv = annualSurplus > 0 && yearsToRetirement > 0
    ? annualSurplus * (1 - Math.pow(1 + d, -yearsToRetirement)) / d
    : 0;
  const insuranceCoverage = hlv > 0 ? (insuranceCover / hlv) * 100 : 0;
  const insuranceScore = Math.min(100, Math.round(insuranceCoverage));
  const overallScore = Math.round(
    emergencyScore * 0.35 + savingsScore * 0.40 + insuranceScore * 0.25,
  );

  return {
    emergencyMonths: parseFloat(emergencyMonths.toFixed(1)),
    emergencyScore,
    savingsRate: parseFloat(savingsRate.toFixed(1)),
    savingsScore,
    insuranceCoverage: parseFloat(insuranceCoverage.toFixed(0)),
    insuranceScore,
    overallScore,
    hlv: Math.round(hlv),
  };
}

// ─── 7. SSF PENSION ──────────────────────────────────────────────────────────

/**
 * SSF Old Age Pension (formal sector).
 * Corpus:  SIP at 8.5% with 31% total contribution (11% employee + 20% employer)
 * Pension: salary × service_years × 1.33%  (SSF Act formula)
 *
 * RISK: hardcoded 31% rate. If SSF amends Act, update SSF_TOTAL_CONTRIB_RATE.
 */
const SSF_TOTAL_CONTRIB_RATE = 0.31;
const SSF_ANNUAL_RETURN      = 8.5;

export function calcSSFPension(
  salary: number,
  currentAge: number,
  retirementAge: number,
): SSFPensionResult {
  const years = Math.max(0, retirementAge - currentAge);
  const monthlyContrib = Math.round(salary * SSF_TOTAL_CONTRIB_RATE);
  const r = SSF_ANNUAL_RETURN / 100 / 12;
  const n = years * 12;
  const corpus = n > 0
    ? monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
    : 0;
  const monthlyPension = Math.round(salary * years * 0.0133);
  const rows: { age: number; corpus: number }[] = [];
  let fund = 0;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) fund = fund * (1 + r) + monthlyContrib;
    rows.push({ age: currentAge + y, corpus: Math.round(fund) });
  }
  return { corpus: Math.round(corpus), monthlyPension, monthlyContrib, rows };
}

// ─── 8. INSURANCE ────────────────────────────────────────────────────────────

/** Term insurance annual premium rate per NPR 1 of sum assured, by age. */
export function termPremiumRate(age: number): number {
  if (age < 25) return 0.0028;
  if (age < 30) return 0.0035;
  if (age < 35) return 0.0048;
  if (age < 40) return 0.0065;
  if (age < 45) return 0.0090;
  if (age < 50) return 0.0120;
  return 0.0165;
}

// ─── 9. FORMATTERS & SCORE DISPLAY ──────────────────────────────────────────

export function formatNPR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 10_000_000) return `${sign}NPR ${(abs / 10_000_000).toFixed(2)} करोड`;
  if (abs >= 100_000)    return `${sign}NPR ${(abs / 100_000).toFixed(2)} लाख`;
  return `${sign}NPR ${Math.round(abs).toLocaleString()}`;
}

export function formatPct(n: number, d = 1): string { return `${n.toFixed(d)}%`; }

export function scoreLabel(score: number): string {
  if (score >= 80) return "उत्कृष्ट";
  if (score >= 60) return "राम्रो";
  if (score >= 40) return "ठीकै छ";
  return "सुधार चाहिन्छ";
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function scoreBg(score: number): string {
  if (score >= 80) return "bg-green-400";
  if (score >= 60) return "bg-yellow-400";
  if (score >= 40) return "bg-orange-400";
  return "bg-red-400";
}

export function sharpeColor(s: number): string {
  if (s >= 2)  return "text-green-400";
  if (s >= 1)  return "text-yellow-400";
  if (s >= 0)  return "text-orange-400";
  return "text-red-400";
}

export function realReturnColor(r: number): string {
  if (r >= 2) return "text-green-400";
  if (r >= 0) return "text-yellow-400";
  return "text-red-400";
}

// ─── 10. AGGREGATE DOMAIN FUNCTIONS (canonical inputs → canonical outputs) ───
//
// These are the PRIMARY API for hooks. Hooks call these — not the primitives.
// Primitives stay exported for unit test isolation.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full SIP computation: SIPInputs → SIPResult.
 *
 * Aggregates step-up rows + all derived metrics into one serializable output.
 * Use 4% annual SWR for monthly pension estimate (conservative but standard).
 */
export function calcSIPFull(inputs: SIPInputs): SIPResult {
  const { monthly, annualRate, currentAge, retirementAge, inflationRate, stepUpRate } = inputs;
  const rows = buildSIPRows(monthly, annualRate, currentAge, retirementAge, inflationRate, stepUpRate);
  const years = Math.max(1, retirementAge - currentAge);
  const rr = realReturnRate(annualRate, inflationRate);

  if (rows.length === 0) {
    return {
      rows: [], finalNominal: 0, finalReal: 0, totalContributed: 0,
      inflationErosion: 0, cagr: 0, multiplier: 1,
      realReturnRate: rr, monthlyPensionNominal: 0, monthlyPensionReal: 0,
    };
  }

  const last = rows[rows.length - 1];
  return {
    rows,
    finalNominal: last.nominal,
    finalReal: last.real,
    totalContributed: last.contributed,
    inflationErosion: last.nominal - last.real,
    cagr: calcCAGR(last.contributed, last.nominal, years),
    multiplier: last.contributed > 0 ? parseFloat((last.nominal / last.contributed).toFixed(2)) : 1,
    realReturnRate: rr,
    monthlyPensionNominal: Math.round(last.nominal * 0.04 / 12),
    monthlyPensionReal: Math.round(last.real * 0.04 / 12),
  };
}

/**
 * Full retirement computation: RetirementInputs → RetirementResult.
 *
 * Integrates SSF corpus projection, corpus adequacy vs required, scenario comparison.
 * All monetary outputs in today's rupees (real terms) for intuitive comparison.
 */
export function calcRetirementFull(inputs: RetirementInputs): RetirementResult {
  const {
    currentSalary, monthlyExpensesToday, currentAge, retirementAge,
    lifeExpectancy, postRetirementReturn, inflationRate, salaryGrowthRate,
  } = inputs;

  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementYears   = Math.max(1, lifeExpectancy - retirementAge);

  const ssf = calcSSFPension(currentSalary, currentAge, retirementAge);
  const projectedCorpusNominal = ssf.corpus;
  const projectedCorpusReal    = Math.round(toRealValue(projectedCorpusNominal, inflationRate, yearsToRetirement));
  const requiredCorpusReal     = Math.round(calcRequiredCorpusReal(
    monthlyExpensesToday, retirementYears, postRetirementReturn, inflationRate,
  ));

  const corpusGap      = requiredCorpusReal - projectedCorpusReal;
  const adequacyScore  = calcAdequacyScore(projectedCorpusReal, requiredCorpusReal);
  const finalSalaryNominal = projectedFinalSalary(currentSalary, yearsToRetirement, salaryGrowthRate);
  const expensesAtRetirement = Math.round(
    monthlyExpensesToday * Math.pow(1 + inflationRate / 100, yearsToRetirement),
  );
  const replacementRatio  = parseFloat(calcReplacementRatio(ssf.monthlyPension, finalSalaryNominal).toFixed(1));
  const sustainabilityYears = calcPensionSustainability(ssf.corpus, expensesAtRetirement, postRetirementReturn);
  const monthlyGapToClose   = calcMonthlySavingsNeeded(Math.max(0, corpusGap), postRetirementReturn, yearsToRetirement);

  const scenarioFor = (inf: number) => {
    const req  = Math.round(calcRequiredCorpusReal(monthlyExpensesToday, retirementYears, postRetirementReturn, inf));
    const proj = Math.round(toRealValue(projectedCorpusNominal, inf, yearsToRetirement));
    return { required: req, projected: proj, gap: req - proj };
  };

  return {
    requiredCorpusReal,
    projectedCorpusNominal: Math.round(projectedCorpusNominal),
    projectedCorpusReal,
    corpusGap,
    adequacyScore,
    replacementRatio,
    sustainabilityYears,
    monthlyGapToClose,
    finalSalaryNominal,
    expensesAtRetirement,
    ssfMonthlyPension: ssf.monthlyPension,
    ssfMonthlyContrib: ssf.monthlyContrib,
    ssfCorpusRows: ssf.rows,
    scenarioComparison: {
      inflation6: scenarioFor(6),
      inflation8: scenarioFor(8),
    },
  };
}

/** Canonical loan computation: LoanInputs → LoanResult. */
export function calcLoanFull(inputs: LoanInputs): LoanResult {
  return calcLoanAnalysis(inputs.principal, inputs.annualRate, inputs.tenureYears, inputs.monthlyIncome);
}

/**
 * Canonical health computation: HealthInputs → HealthResult.
 * Derives yearsToRetirement from currentAge + default retirement age (60).
 */
export function calcHealthFull(inputs: HealthInputs): HealthResult {
  const yearsToRetirement = Math.max(1, DEFAULT_RETIREMENT_AGE - inputs.currentAge);
  const base = calcFinancialHealth(
    inputs.monthlyIncome,
    inputs.monthlyExpenses,
    inputs.emergencyFundBalance,
    inputs.lifeInsuranceCover,
    yearsToRetirement,
  );
  const termPremiumAnnual = Math.round(base.hlv * termPremiumRate(inputs.currentAge));
  return { ...base, termPremiumAnnual };
}

// ─── 11. PORTFOLIO OPTIMIZER ─────────────────────────────────────────────────

export interface PortfolioOptimizerInputs {
  age:                number;
  monthlyInvestable:  number;    // NPR free to invest (income - expenses - goals)
  riskTolerance:      RiskProfile;
  existingHoldings:   { schemeId: string; balanceNPR: number }[];
  rates:              MarketRateSnapshot;
}

/**
 * Nepal-calibrated strategic asset allocation.
 *
 * Buckets (Nepal-specific):
 *   Safety:  EPF/SSF mandatory + FD/NSB (sovereign/guaranteed)
 *   Core:    Balanced mutual funds (NEPSE index + bond)
 *   Growth:  Equity mutual funds / NEPSE direct
 *
 * Risk profile → allocation weights:
 *   Conservative: 65% Safety, 25% Core, 10% Growth
 *   Moderate:     45% Safety, 35% Core, 20% Growth
 *   Aggressive:   25% Safety, 35% Core, 40% Growth
 *   Very Aggressive: 15% Safety, 30% Core, 55% Growth
 *
 * Ages 55+ are bumped one tier toward conservative regardless of preference.
 */
export function calcPortfolioAllocation(
  inputs: PortfolioOptimizerInputs,
): PortfolioRecommendation {
  const { age, monthlyInvestable, riskTolerance, rates } = inputs;

  // Age-adjusted risk (de-risk as retirement approaches)
  let effectiveRisk: RiskProfile = riskTolerance;
  if (age >= 60)                                       effectiveRisk = "conservative";
  else if (age >= 55 && riskTolerance === "aggressive") effectiveRisk = "moderate";

  type Weights = { safety: number; core: number; growth: number };
  const WEIGHTS: Record<RiskProfile, Weights> = {
    conservative: { safety: 0.65, core: 0.25, growth: 0.10 },
    moderate:     { safety: 0.45, core: 0.35, growth: 0.20 },
    aggressive:   { safety: 0.25, core: 0.35, growth: 0.40 },
  };
  const w = WEIGHTS[effectiveRisk];

  const safetyNPR = Math.round(monthlyInvestable * w.safety);
  const coreNPR   = Math.round(monthlyInvestable * w.core);
  const growthNPR = Math.round(monthlyInvestable * w.growth);

  const allocations = [
    {
      schemeId:   "epf-ssf-mandatory",
      schemeName: "EPF/SSF (Mandatory)",
      pct:        Math.round(w.safety * 0.6 * 100),
      monthlyNPR: Math.round(safetyNPR * 0.6),
      rationale:  "Guaranteed government-backed pension base",
    },
    {
      schemeId:   "nsb-fd",
      schemeName: "NSB / FD",
      pct:        Math.round(w.safety * 0.4 * 100),
      monthlyNPR: Math.round(safetyNPR * 0.4),
      rationale:  `${rates.fdRate}% guaranteed, sovereign risk only`,
    },
    {
      schemeId:   "balanced-mf",
      schemeName: "Balanced Mutual Fund",
      pct:        Math.round(w.core * 100),
      monthlyNPR: coreNPR,
      rationale:  "Diversified NEPSE + bond exposure, professionally managed",
    },
    {
      schemeId:   "equity-mf",
      schemeName: "Equity Mutual Fund / NEPSE",
      pct:        Math.round(w.growth * 100),
      monthlyNPR: growthNPR,
      rationale:  `${rates.nepseAvgReturn}% historical avg; high volatility, long horizon required`,
    },
  ].filter(a => a.monthlyNPR > 0);

  // Weighted nominal return
  const blendedNominal =
    (w.safety * 0.6 * rates.epfRate) +
    (w.safety * 0.4 * rates.fdRate) +
    (w.core * rates.nepseAvgReturn * 0.6 + w.core * rates.fdRate * 0.4) +
    (w.growth * rates.nepseAvgReturn);

  const years = Math.max(1, DEFAULT_RETIREMENT_AGE - age);
  const r = blendedNominal / 100 / 12;
  const n = years * 12;
  const projNominal = monthlyInvestable * ((Math.pow(1 + r, n) - 1) / r);
  const projReal    = toRealValue(projNominal, rates.inflationRate, years);

  const riskScore = effectiveRisk === "conservative" ? 3
    : effectiveRisk === "moderate"   ? 5
    : 7;

  const notes: string[] = [];
  if (age >= 55) notes.push("Portfolio de-risked by one tier due to proximity to retirement.");
  if (rates.inflationRate > 7) notes.push(`High inflation (${rates.inflationRate}%) — prioritise real-return instruments.`);
  if (effectiveRisk === "aggressive") {
    notes.push("Equity allocation assumes 10+ year horizon. Review annually.");
  }

  return {
    allocations,
    totalMonthlyNPR:  monthlyInvestable,
    projectedNominal: Math.round(projNominal),
    projectedReal:    Math.round(projReal),
    riskScore,
    diversScore:      Math.round((1 - (w.safety * w.safety + w.core * w.core + w.growth * w.growth)) * 100 + 30),
    notes,
  };
}

// ─── 12. GOAL-BASED PLANNER ──────────────────────────────────────────────────

/**
 * Optimal monthly contribution for each goal using future-value inversion.
 *
 * For goal horizon H years and return rate r:
 *   FV = PMT × ((1+r)^n − 1) / r  →  PMT = FV × r / ((1+r)^n − 1)
 *
 * Scheme selection by horizon:
 *   < 2yr:  FD/NSB (safety, no equity risk)
 *   2-5yr:  Balanced MF
 *   5-15yr: Equity MF blend
 *   15yr+:  EPF/SSF + Equity MF
 */
export function calcGoalPlan(
  goals: FinancialGoal[],
  monthlyIncome: number,
  monthlyExpenses: number,
  rates: MarketRateSnapshot,
): GoalPlan {
  const surplus = Math.max(0, monthlyIncome - monthlyExpenses);
  const sorted  = [...goals].sort((a, b) => a.priority - b.priority || a.yearsToGoal - b.yearsToGoal);

  let allocated = 0;
  const allocations = sorted.map(goal => {
    const horizon = Math.max(1, goal.yearsToGoal);
    const remaining = Math.max(0, goal.targetNPR - goal.currentNPR);

    // Pick scheme and expected return by horizon
    const rate = horizon < 2 ? rates.fdRate
      : horizon < 5  ? (rates.fdRate + rates.nepseAvgReturn * 0.4) / 2
      : horizon < 15 ? rates.nepseAvgReturn * 0.7 + rates.fdRate * 0.3
      : rates.nepseAvgReturn * 0.6 + rates.epfRate * 0.4;

    const schemeId = horizon < 2 ? "nsb-fd"
      : horizon < 5  ? "balanced-mf"
      : horizon < 15 ? "equity-mf"
      : "epf-equity-blend";

    const r = rate / 100 / 12;
    const n = horizon * 12;
    const monthlyNeeded = remaining > 0 && r > 0
      ? Math.ceil(remaining * r / (Math.pow(1 + r, n) - 1))
      : 0;

    const monthlyContrib  = Math.min(monthlyNeeded, Math.max(0, surplus - allocated));
    const projectedNPR    = monthlyContrib > 0 && r > 0
      ? monthlyContrib * ((Math.pow(1 + r, n) - 1) / r) + goal.currentNPR * Math.pow(1 + r, n)
      : goal.currentNPR;
    const shortfall       = goal.targetNPR - projectedNPR;

    allocated += monthlyContrib;

    return {
      goalId:            goal.id,
      label:             goal.label,
      monthlyNPR:        Math.round(monthlyContrib),
      projectedNPR:      Math.round(projectedNPR),
      shortfallNPR:      Math.round(shortfall),
      onTrack:           shortfall <= 0,
      recommendedScheme: schemeId,
    };
  });

  const totalMonthly = allocations.reduce((s, a) => s + a.monthlyNPR, 0);
  const notes: string[] = [];
  if (totalMonthly > surplus * 0.8) notes.push("Goal contributions exceed 80% of surplus — consider extending timelines.");
  if (allocations.some(a => !a.onTrack)) notes.push("Some goals underfunded — increase income or reduce target amounts.");

  return {
    goals:           allocations,
    totalMonthlyNPR: totalMonthly,
    surplusNPR:      Math.round(surplus - totalMonthly),
    feasible:        totalMonthly <= surplus,
    notes,
  };
}
