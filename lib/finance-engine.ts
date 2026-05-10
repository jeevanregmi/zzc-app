/**
 * ZZC Finance Engine — Mathematical core for financial intelligence
 *
 * Designed for:
 *   Finance Managers   → real returns, DTI, cost of capital, HLV
 *   Portfolio Managers → Sharpe score, diversification (HHI), CAGR, real returns
 *   Retirement Planners → corpus adequacy, sustainability, replacement ratio
 *   Beginners          → plain outputs, color-coded scores, actionable gaps
 *
 * All functions are pure: no side effects, no external dependencies.
 * All money is in NPR unless explicitly labeled "real" (today's purchasing power).
 */

// ─── Nepal Market Constants ──────────────────────────────────────────────────

/** Nepal avg CPI 2020-2025 (NRB source) */
export const NEPAL_INFLATION = 6.5;
/** Nepal 91-day T-bill proxy (risk-free rate for Sharpe calculation) */
export const NEPAL_RISK_FREE = 6.5;
/** Average formal sector annual salary growth */
export const SALARY_GROWTH_AVG = 7.0;
/** Nepal avg life expectancy (WHO 2024) */
export const LIFE_EXPECTANCY_NP = 78;
/** Standard emergency fund target in months */
export const EMERGENCY_MONTHS_TARGET = 6;
/** CFA recommended retirement income replacement ratio */
export const TARGET_REPLACEMENT_RATIO = 70;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SIPRow {
  age: number;
  year: number;
  nominal: number;    // corpus in future rupees
  real: number;       // corpus in today's purchasing power
  contributed: number;
}

export interface RetirementResult {
  requiredCorpus: number;         // in today's money (real terms)
  projectedCorpus: number;        // SSF corpus in today's money
  corpusGap: number;              // positive = shortfall, negative = surplus
  adequacyScore: number;          // 0–100
  replacementRatio: number;       // % of final salary replaced by SSF pension
  sustainabilityYears: number;    // years corpus funds expenses at retirement
  monthlyGapAmount: number;       // extra NPR/month to close gap
  finalSalaryNominal: number;     // projected salary at retirement
  expensesAtRetirement: number;   // inflation-adjusted expenses at retirement
}

export interface LoanResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  dti: number;                // debt-to-income %
  affordabilityScore: number; // 0–100
  opportunityCost: number;    // FV of investing EMI at 8.5% for same tenure
  costPerRupee: number;       // totalPayment / principal
  rows: { year: number; balance: number; cumPrincipal: number; cumInterest: number }[];
}

export interface HealthResult {
  emergencyMonths: number;
  emergencyScore: number;     // 0–100
  savingsRate: number;        // %
  savingsScore: number;       // 0–100
  insuranceCoverage: number;  // % of HLV covered
  insuranceScore: number;     // 0–100
  overallScore: number;
  hlv: number;                // Human Life Value in NPR
}

export interface SSFPensionResult {
  corpus: number;
  monthlyPension: number;
  monthlyContrib: number;
  rows: { age: number; corpus: number }[];
}

// ─── 1. RETURN CALCULATIONS ──────────────────────────────────────────────────

/**
 * Fisher Equation: real return after stripping out inflation.
 *
 * Real Rate = (1 + Nominal) / (1 + Inflation) − 1
 *
 * WHY IT MATTERS: EPF 8.5% with 6.5% inflation = 1.88% real gain.
 * CIT ESGRS 3.75% with 6.5% inflation = −2.58% real loss.
 * Portfolio managers NEVER evaluate performance in nominal terms alone.
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
 * CAGR — normalises multi-year compounding into one annual rate.
 * CAGR = (End / Start)^(1/years) − 1
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
 * where r = monthly rate = annualRate/12/100, n = years × 12
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
 * Step-up = contribution grows by stepUpRate% each year (mirrors salary growth).
 * A 25-year-old saving NPR 5,000/month at 7% step-up contributes NPR 52,000/month
 * by age 60. Standard SIP misses this entire dimension.
 *
 * Returns both NOMINAL (future money) and REAL (today's purchasing power) corpus.
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
 * Uses PV of annuity at REAL return rate:
 *   C = PMT_today × (1 − (1+r_real)^−n) / r_real
 *
 * Why real terms? A "5 crore corpus" 35 years from now = only ~58 लाख
 * in today's purchasing power at 6.5% inflation. Showing nominal numbers
 * gives beginners false confidence. Real terms shows what they can actually buy.
 *
 * @param monthlyExpenseToday  monthly spending in today's rupees
 * @param retirementYears      years in retirement (lifeExpectancy − retirementAge)
 * @param postReturnRate       % annual return on corpus during retirement
 * @param inflationRate        % annual inflation
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
 * Pension sustainability: how many years does a corpus fund a monthly withdrawal?
 *
 * Solves the annuity PV equation for n:
 *   n_months = −ln(1 − C×r/PMT) / ln(1+r)
 *
 * LONGEVITY RISK: If this number < (lifeExpectancy − retirementAge),
 * the retiree will outlive their money. Critical for retirement planning.
 */
export function calcPensionSustainability(
  corpus: number,
  monthlyWithdrawal: number,
  postReturnRate: number,
): number {
  if (corpus <= 0 || monthlyWithdrawal <= 0) return 0;
  const r = postReturnRate / 100 / 12;
  if (r === 0) return Math.round(corpus / monthlyWithdrawal / 12 * 10) / 10;
  const ratio = (corpus * r) / monthlyWithdrawal;
  if (ratio >= 1) return 99; // corpus earns more than withdrawal: never depletes
  if (ratio <= 0) return 0;
  return Math.round((-Math.log(1 - ratio) / Math.log(1 + r)) / 12 * 10) / 10;
}

/**
 * Replacement ratio: % of pre-retirement income replaced by pension.
 * Target: 70% (CFA Institute standard). Below 50% = retirement at risk.
 */
export function calcReplacementRatio(monthlyPension: number, finalSalary: number): number {
  return finalSalary > 0 ? (monthlyPension / finalSalary) * 100 : 0;
}

/** Corpus adequacy score 0–100. 100 = fully funded, 50 = half funded. */
export function calcAdequacyScore(projectedReal: number, requiredReal: number): number {
  if (requiredReal <= 0) return 100;
  return Math.min(100, Math.round((projectedReal / requiredReal) * 100));
}

/**
 * Monthly savings to close corpus gap.
 * Inverse of SIP FV (annuity-due): PMT = FV × r / ((1+r)^n − 1) / (1+r)
 */
export function calcMonthlySavingsNeeded(gap: number, annualRate: number, years: number): number {
  if (gap <= 0 || years <= 0) return 0;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return Math.round(gap / n);
  return Math.round(gap * r / ((Math.pow(1 + r, n) - 1) * (1 + r)));
}

/** Salary at retirement with compound annual growth */
export function projectedFinalSalary(
  currentSalary: number,
  yearsToRetirement: number,
  salaryGrowth = SALARY_GROWTH_AVG,
): number {
  return Math.round(currentSalary * Math.pow(1 + salaryGrowth / 100, yearsToRetirement));
}

// ─── 4. LOAN CALCULATIONS ────────────────────────────────────────────────────

/**
 * EMI — Equated Monthly Installment (reducing balance loan)
 * EMI = P × r × (1+r)^n / ((1+r)^n − 1)
 */
export function calcEMI(principal: number, annualRate: number, years: number): number {
  if (principal <= 0 || years <= 0) return 0;
  if (annualRate === 0) return Math.round(principal / (years * 12));
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
}

/**
 * Full loan intelligence: DTI, affordability score, opportunity cost, amortization.
 *
 * DTI (Debt-to-Income Ratio):
 *   DTI = monthly_debt / gross_monthly_income × 100
 *   <30% = safe   30–40% = manageable   40–50% = stretched   >50% = dangerous
 *   Banks typically reject loans if total DTI > 50%.
 *
 * Opportunity Cost:
 *   FV of investing the same EMI at EPF rate (8.5%) for the same tenure.
 *   Finance managers compare "cost of debt" vs "return on equity."
 *   If opportunity cost > total payment, you're better off investing than borrowing.
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
  const affordabilityScore = dti < 30 ? 100 : dti < 40 ? 80 : dti < 50 ? 50 : 20;
  const opportunityCost = Math.round(calcSIP(emi, 8.5, years));
  const costPerRupee = principal > 0 ? parseFloat((totalPayment / principal).toFixed(2)) : 1;

  const rows: LoanResult["rows"] = [];
  let balance = principal;
  let cumPrincipal = 0, cumInterest = 0;
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
  return { emi, totalPayment, totalInterest, dti, affordabilityScore, opportunityCost, costPerRupee, rows };
}

// ─── 5. RISK & SCHEME SCORING ────────────────────────────────────────────────

/**
 * Volatility proxy by stated risk level.
 * Without historical price series, we map qualitative risk to a
 * numeric volatility estimate. EPF/SSF ≈ bonds; NEPSE ≈ equity.
 */
const VOLATILITY_PROXY: Record<string, number> = {
  "Very Low": 0.3,    "अत्यन्त कम": 0.3,
  "Low": 0.8,         "कम": 0.8,
  "Low-Medium": 1.5,  "कम-मध्यम": 1.5,
  "Medium": 3.0,      "मध्यम": 3.0,
  "Medium-High": 4.5, "मध्यम-उच्च": 4.5,
  "High": 6.0,        "उच्च": 6.0,
  "Very High": 9.0,   "अत्यन्त उच्च": 9.0,
};

const RISK_SCORE_MAP: Record<string, number> = {
  "Very Low": 1,    "अत्यन्त कम": 1,
  "Low": 2,         "कम": 2,
  "Low-Medium": 3,  "कम-मध्यम": 3,
  "Medium": 5,      "मध्यम": 5,
  "Medium-High": 7, "मध्यम-उच्च": 7,
  "High": 9,        "उच्च": 9,
  "Very High": 10,  "अत्यन्त उच्च": 10,
};

const LIQUIDITY_SCORE_MAP: Record<string, number> = {
  "Very High": 10, "High": 8, "Medium": 5,
  "Low": 3, "Very Low": 1,
  "On retirement": 2, "Locked until retirement": 1,
};

/**
 * Sharpe-like score: (Return − RiskFreeRate) / VolatilityProxy
 *
 * Portfolio managers use Sharpe to rank investments by risk-adjusted return.
 * A high Sharpe means you earn more return per unit of risk.
 *
 * Real results for Nepal schemes (6.5% risk-free, 6.5% inflation):
 *   EPF Provident Fund 8.5% → Sharpe = (8.5−6.5)/0.8 =  2.50  ← best
 *   SSF corpus        8.5% → Sharpe = (8.5−6.5)/0.3 =  6.67  ← exceptional
 *   NEPSE mutual      15%  → Sharpe = (15−6.5)/6.0  =  1.42  ← decent
 *   CIT ESGRS         3.75%→ Sharpe = (3.75−6.5)/0.8= −3.44  ← negative!
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
    liquidity.toLowerCase().includes(k.toLowerCase())
  );
  return key ? LIQUIDITY_SCORE_MAP[key] : 5;
}

/**
 * Portfolio diversification score using Herfindahl-Hirschman Index.
 *
 * HHI = Σ(weight_i)²  — lower HHI = more diversified
 * Score = (1 − average_HHI) × 100
 *
 * Single scheme portfolio = 0. Equal spread across 4 categories + 4 orgs ≈ 87.
 * Portfolio managers use this to flag dangerous concentration.
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
 * 3-factor financial health score (0–100).
 *
 * Emergency Fund (35%): months of expenses covered / 6-month target
 *
 * Savings Rate (40%): (Income − Expenses) / Income
 *   ≥30% = excellent (100)   ≥20% = good (80)   ≥10% = fair (50)   <10% = poor
 *
 * Insurance Adequacy (25%): cover / HLV × 100
 *   HLV (Human Life Value) = PV of future income surplus discounted at inflation.
 *   Represents the financial loss to dependants if earner dies today.
 */
export function calcFinancialHealth(
  monthlyIncome: number,
  monthlyExpenses: number,
  emergencyFund: number,
  insuranceCover: number,
  yearsToRetirement: number,
): HealthResult {
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
    emergencyScore * 0.35 + savingsScore * 0.40 + insuranceScore * 0.25
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

// ─── 7. SSF PENSION (canonical) ──────────────────────────────────────────────

/**
 * SSF Old Age Pension.
 * Corpus:  SIP at 8.5% with 31% total contribution (11% employee + 20% employer)
 * Pension: salary × service_years × 1.33%  (SSF Act official formula)
 */
export function calcSSFPension(
  salary: number,
  currentAge: number,
  retirementAge: number,
): SSFPensionResult {
  const years = Math.max(0, retirementAge - currentAge);
  const monthlyContrib = Math.round(salary * 0.31);
  const r = 0.085 / 12;
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

/** Term insurance annual premium rate per NPR 1 of sum assured, by age */
export function termPremiumRate(age: number): number {
  if (age < 25) return 0.0028;
  if (age < 30) return 0.0035;
  if (age < 35) return 0.0048;
  if (age < 40) return 0.0065;
  if (age < 45) return 0.0090;
  if (age < 50) return 0.0120;
  return 0.0165;
}

// ─── 9. FORMATTERS & SCORE HELPERS ──────────────────────────────────────────

export function formatNPR(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  if (abs >= 10_000_000) return `${sign}NPR ${(abs / 10_000_000).toFixed(2)} करोड`;
  if (abs >= 100_000)    return `${sign}NPR ${(abs / 100_000).toFixed(2)} लाख`;
  return `${sign}NPR ${Math.round(abs).toLocaleString()}`;
}

export function formatPct(n: number, d = 1): string {
  return `${n.toFixed(d)}%`;
}

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
  if (s >= 2) return "text-green-400";
  if (s >= 1) return "text-yellow-400";
  if (s >= 0) return "text-orange-400";
  return "text-red-400";
}

export function realReturnColor(r: number): string {
  if (r >= 2) return "text-green-400";
  if (r >= 0) return "text-yellow-400";
  return "text-red-400";
}
