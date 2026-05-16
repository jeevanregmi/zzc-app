/**
 * Calculator Formula Registry
 *
 * Every formula used in a public-facing ZZC calculator must be listed here.
 * Nothing reaches "verified" status without explicit admin sign-off.
 *
 * Stability contract: formula IDs are permanent slugs — never reuse or delete.
 * Add new formulas; mark old ones "deprecated" rather than removing them.
 */

export type FormulaStatus = "verified" | "draft" | "deprecated";
export type CalculatorTab = "sip" | "retirement" | "loan" | "risk" | "health" | "portfolio";

export interface CalculatorFormula {
  id:            string;
  name:          string;
  calculatorTab: CalculatorTab;
  description:   string;
  formula?:      string;      // Human-readable formula notation
  status:        FormulaStatus;
  verifiedBy?:   string;      // Admin display name who signed off
  verifiedAt?:   string;      // ISO timestamp of verification
  notes?:        string;      // Context, caveats, Nepal-specific considerations
}

export const CALCULATOR_REGISTRY: CalculatorFormula[] = [

  // ── SIP Calculator ─────────────────────────────────────────────────────────

  {
    id:            "sip-future-value",
    name:          "SIP Future Value",
    calculatorTab: "sip",
    description:   "Calculates the maturity value of regular monthly SIP contributions compounded at a fixed annual interest rate.",
    formula:       "FV = PMT × [((1 + r)^n − 1) / r] × (1 + r)   where r = annual_rate ÷ 12, n = months",
    status:        "draft",
    notes:         "Standard annuity-due formula. Assumes beginning-of-period payments. Rate used is nominal, not effective annual rate. Needs actuary sign-off for Nepal-specific inflation-adjusted projections.",
  },
  {
    id:            "sip-real-return",
    name:          "SIP Inflation-Adjusted Return",
    calculatorTab: "sip",
    description:   "Adjusts the nominal SIP future value by projected Nepal CPI inflation to show purchasing-power-equivalent returns.",
    formula:       "Real FV = Nominal FV ÷ (1 + inflation_rate)^years",
    status:        "draft",
    notes:         "Inflation rate sourced from NRB data. Nepal average CPI 2015–2024 ≈ 7%. Needs periodic review as NRB updates targets.",
  },

  // ── Retirement Planner ─────────────────────────────────────────────────────

  {
    id:            "retirement-corpus-target",
    name:          "Retirement Corpus Target",
    calculatorTab: "retirement",
    description:   "Present value of the corpus needed to fund monthly withdrawals for a target post-retirement duration.",
    formula:       "Corpus = PMT × [(1 − (1 + r)^−n) / r]   where r = real_return_rate ÷ 12, n = retirement_months",
    status:        "draft",
    notes:         "Uses real return (nominal rate minus inflation). Nepal life expectancy at 60 ≈ 17 years. Requires actuarial review for SSF/EPF integration.",
  },
  {
    id:            "retirement-monthly-savings",
    name:          "Required Monthly Savings for Retirement",
    calculatorTab: "retirement",
    description:   "Monthly SIP amount needed to accumulate the retirement corpus target by the target retirement age.",
    formula:       "PMT = Corpus × r / [((1 + r)^n − 1) × (1 + r)]",
    status:        "draft",
    notes:         "Inverse of SIP future value formula. Combined with EPF/SSF contribution to compute additional savings required.",
  },

  // ── Loan Analyzer ─────────────────────────────────────────────────────────

  {
    id:            "loan-emi",
    name:          "Loan EMI (Equal Monthly Instalment)",
    calculatorTab: "loan",
    description:   "Standard reducing-balance EMI for any term loan — home, vehicle, education, or personal — using the formula adopted by all NRB-regulated banks.",
    formula:       "EMI = P × r × (1 + r)^n / [(1 + r)^n − 1]   where r = annual_rate ÷ 12",
    status:        "draft",
    notes:         "Reduces-balance method mandated by NRB for all bank EMI products. Flat-rate EMI used by some NBFCs — a separate formula should be added for that case.",
  },
  {
    id:            "loan-total-interest",
    name:          "Total Interest Payable",
    calculatorTab: "loan",
    description:   "Total interest paid over the full loan tenure.",
    formula:       "Total Interest = (EMI × n) − Principal",
    status:        "draft",
    notes:         "Straightforward arithmetic from EMI formula. No Nepal-specific caveats.",
  },
  {
    id:            "loan-affordability",
    name:          "Loan Affordability Ratio",
    calculatorTab: "loan",
    description:   "Debt-service-to-income ratio: what fraction of monthly income goes to loan repayment. NRB recommends ≤ 50%.",
    formula:       "Affordability = EMI ÷ Monthly_Income",
    status:        "draft",
    notes:         "NRB guideline: total EMI burden should not exceed 50% of gross monthly income. This threshold should be surfaced prominently in the UI.",
  },

  // ── Financial Health Score ─────────────────────────────────────────────────

  {
    id:            "financial-health-composite",
    name:          "Financial Health Score (Composite)",
    calculatorTab: "health",
    description:   "Weighted composite score (0–100) combining four sub-scores: savings rate, debt-to-income ratio, emergency fund coverage, and insurance coverage.",
    status:        "draft",
    notes:         "Sub-score weights (25% each) are heuristic and not actuarially validated. Nepal-specific calibration (average income, typical debt levels) required before production use. Recommended: external review by a Nepal-certified financial planner.",
  },
  {
    id:            "emergency-fund-coverage",
    name:          "Emergency Fund Coverage (Months)",
    calculatorTab: "health",
    description:   "Number of months of expenses covered by liquid savings. Target: 3–6 months.",
    formula:       "Coverage = Liquid_Savings ÷ Monthly_Expenses",
    status:        "draft",
    notes:         "Simple ratio. Nepal context: informal economy workers may need higher coverage (6–12 months) due to irregular income.",
  },

  // ── Risk Profile ──────────────────────────────────────────────────────────

  {
    id:            "risk-profile-score",
    name:          "Investor Risk Profile Score",
    calculatorTab: "risk",
    description:   "Questionnaire-based risk tolerance score classifying investors as conservative, moderate, or aggressive based on age, income stability, investment horizon, and loss tolerance.",
    status:        "draft",
    notes:         "Scoring methodology is heuristic. Not a licensed risk suitability assessment. Requires prominent disclaimer. Methodology needs review by a Nepal SEBON-registered investment advisor.",
  },

  // ── Portfolio Optimizer ───────────────────────────────────────────────────

  {
    id:            "portfolio-allocation-model",
    name:          "Portfolio Allocation Model",
    calculatorTab: "portfolio",
    description:   "Risk-profile-based asset allocation recommendation across EPF/SSF, CIT/mutual funds, NEPSE equities, and fixed deposits — using Nepal-specific asset class return assumptions.",
    status:        "draft",
    notes:         "Allocation weights derived from Nepal market context, not from mean-variance optimisation. Not licensed financial advice. Requires disclaimer and admin approval before production. Return assumptions (EPF 8.5%, NEPSE long-run ≈ 10–12%, FD ≈ 8%) must be reviewed annually.",
  },
];
