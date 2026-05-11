/**
 * ZZC Financial Domain Types
 *
 * Canonical TypeScript interfaces for all financial domain objects.
 * These are pure data contracts — no logic, no React, no Firebase.
 *
 * Architecture principle:
 *   Everything in the system speaks this type language.
 *   Engine computes it. Hooks wrap it. Components render it. Adapters serialize it.
 *
 * Future-proofing:
 *   FinancialSnapshot → AI advisor prompt builder
 *   RetirementResult  → PDF report
 *   MonteCarloResult  → Analytics / Firestore persistence
 *   Portfolio         → Portfolio optimizer
 */

// ─── Enumerations ────────────────────────────────────────────────────────────

export type RiskProfile     = "conservative" | "moderate" | "aggressive";
export type TaxEfficiency   = "exempt" | "partial" | "taxable";
export type DTICategory     = "safe" | "manageable" | "stretched" | "dangerous";
export type ScoreGrade      = "excellent" | "good" | "fair" | "poor";
export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type RecommendationCategory =
  | "retirement" | "insurance" | "savings" | "loan" | "investment" | "emergency";
export type SortCol =
  | "nominalReturn" | "realReturn" | "riskScore" | "liquidityScore" | "sharpeScore";

// ─── Input Models ────────────────────────────────────────────────────────────

export interface SIPInputs {
  monthly: number;           // NPR/month starting contribution
  annualRate: number;        // % nominal annual return
  currentAge: number;
  retirementAge: number;
  inflationRate: number;     // % annual CPI assumption
  stepUpRate: number;        // % annual contribution growth (salary-linked)
}

export interface RetirementInputs {
  currentSalary: number;         // NPR/month gross
  monthlyExpensesToday: number;  // NPR/month in today's money
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  postRetirementReturn: number;  // % annual — what corpus earns in retirement
  inflationRate: number;
  salaryGrowthRate: number;      // % annual
}

export interface LoanInputs {
  principal: number;     // NPR
  annualRate: number;    // %
  tenureYears: number;
  monthlyIncome: number; // NPR — for DTI calculation
}

export interface HealthInputs {
  monthlyIncome: number;
  monthlyExpenses: number;
  emergencyFundBalance: number;
  lifeInsuranceCover: number;
  currentAge: number;
}

export interface PortfolioHolding {
  schemeId: string;
  monthlyContribution: number;  // NPR
}

// ─── Output / Result Models ──────────────────────────────────────────────────

export interface SIPRow {
  age: number;
  year: number;
  nominal: number;     // corpus in future rupees
  real: number;        // corpus in today's purchasing power
  contributed: number; // cumulative contributions
}

export interface SIPResult {
  rows: SIPRow[];
  finalNominal: number;
  finalReal: number;
  totalContributed: number;
  inflationErosion: number;   // finalNominal − finalReal
  cagr: number;               // % annualised growth on contributions
  multiplier: number;         // finalNominal / totalContributed
  realReturnRate: number;     // % after inflation (Fisher equation)
  monthlyPensionNominal: number;
  monthlyPensionReal: number;
}

export interface RetirementResult {
  requiredCorpusReal: number;       // in today's purchasing power
  projectedCorpusNominal: number;   // SSF/EPF corpus at retirement
  projectedCorpusReal: number;      // deflated to today's money
  corpusGap: number;                // positive = shortfall, negative = surplus
  adequacyScore: number;            // 0–100
  replacementRatio: number;         // % of final salary replaced
  sustainabilityYears: number;      // how many years corpus funds retirement
  monthlyGapToClose: number;        // extra NPR/month needed to fill gap
  finalSalaryNominal: number;       // projected salary at retirement date
  expensesAtRetirement: number;     // nominal monthly expenses at retirement
  ssfMonthlyPension: number;
  ssfMonthlyContrib: number;
  ssfCorpusRows: { age: number; corpus: number }[];
  scenarioComparison: {
    inflation6: { required: number; projected: number; gap: number };
    inflation8: { required: number; projected: number; gap: number };
  };
}

export interface LoanAmortizationRow {
  year: number;
  balance: number;
  cumPrincipal: number;
  cumInterest: number;
}

export interface LoanResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  dti: number;                // %
  dtiCategory: DTICategory;
  affordabilityScore: number; // 0–100
  opportunityCost: number;    // FV of EMI invested at EPF rate
  costPerRupee: number;       // totalPayment / principal
  rows: LoanAmortizationRow[];
}

export interface HealthResult {
  emergencyMonths: number;
  emergencyScore: number;     // 0–100
  savingsRate: number;        // %
  savingsScore: number;       // 0–100
  insuranceCoverage: number;  // % of HLV covered
  insuranceScore: number;     // 0–100
  overallScore: number;
  hlv: number;                // Human Life Value (NPR)
  termPremiumAnnual: number;  // estimated annual term premium
}

export interface SchemeMetric {
  schemeId: string;
  title: string;
  titleNepali: string;
  org: string;
  category: string;
  nominalReturn: number;
  realReturn: number;
  riskScore: number;         // 1–10
  liquidityScore: number;    // 1–10
  sharpeScore: number;
  governmentBacked: boolean;
}

export interface Portfolio {
  holdings: PortfolioHolding[];
  weightedReturn: number;
  diversificationScore: number;
  riskProfile: RiskProfile;
  totalMonthlyContrib: number;
}

// ─── Portfolio Optimizer ─────────────────────────────────────────────────────

export interface PortfolioAllocation {
  schemeId:    string;
  schemeName:  string;
  pct:         number;        // 0-100 recommended allocation %
  monthlyNPR:  number;        // absolute amount at this allocation
  rationale:   string;        // one-line reason
}

export interface PortfolioRecommendation {
  allocations:      PortfolioAllocation[];
  totalMonthlyNPR:  number;
  projectedNominal: number;   // 20-year projection
  projectedReal:    number;
  riskScore:        number;   // 1-10 (portfolio-level)
  diversScore:      number;   // 0-100
  notes:            string[];
}

// ─── Goal-Based Planner ──────────────────────────────────────────────────────

export type GoalType = "retirement" | "home" | "education" | "emergency" | "travel" | "business" | "other";

export interface FinancialGoal {
  id:           string;
  label:        string;
  type:         GoalType;
  targetNPR:    number;
  yearsToGoal:  number;
  currentNPR:   number;       // already saved toward this goal
  priority:     1 | 2 | 3;   // 1 = critical
}

export interface GoalAllocation {
  goalId:          string;
  label:           string;
  monthlyNPR:      number;   // recommended monthly contribution
  projectedNPR:    number;   // projected value at target date
  shortfallNPR:    number;   // positive = gap, negative = surplus
  onTrack:         boolean;
  recommendedScheme: string; // schemeId best suited for this horizon
}

export interface GoalPlan {
  goals:            GoalAllocation[];
  totalMonthlyNPR:  number;
  surplusNPR:       number;  // income - expenses - goal contributions
  feasible:         boolean;
  notes:            string[];
}

// ─── Market Rates ────────────────────────────────────────────────────────────

export interface MarketRate {
  id:          string;           // e.g. "nepal-inflation", "risk-free", "nepse-avg"
  label:       string;
  value:       number;           // %
  source:      string;           // "NRB" | "NRB estimate" | "SEBON" | "manual"
  updatedAt:   string;           // ISO date
}

export interface MarketRateSnapshot {
  inflationRate:    number;   // Nepal headline CPI %
  riskFreeRate:     number;   // 91-day T-bill yield %
  nepseAvgReturn:   number;   // NEPSE 3-year avg return %
  fdRate:           number;   // commercial bank FD avg %
  epfRate:          number;   // EPF declared rate %
  ssfRate:          number;   // SSF declared rate %
  usdToNprRate:     number;   // exchange rate
  updatedAt:        string;
}

// ─── Simulation Models ───────────────────────────────────────────────────────

export interface ScenarioVars {
  label: string;
  inflationRate: number;
  nominalReturn: number;
  salaryGrowthRate: number;
}

export interface ScenarioResult {
  scenario: ScenarioVars;
  sipFinalNominal: number;
  sipFinalReal: number;
  retirementAdequacyScore: number;
  retirementCorpusReal: number;
  requiredCorpusReal: number;
  isFunded: boolean;   // projectedReal >= requiredReal
}

export interface MonteCarloConfig {
  trials: number;
  monthlyContrib: number;
  stepUpRate: number;           // % annual contribution growth
  yearsToRetirement: number;
  yearsInRetirement: number;
  monthlyExpensesToday: number;
  postRetirementReturn: number; // %
  // Distribution parameters (derived from historical Nepal data)
  returnMean: number;           // % annual
  returnStd: number;            // standard deviation
  inflationMean: number;        // %
  inflationStd: number;
}

export interface MonteCarloResult {
  trials: number;
  percentiles: {
    p10: number; p25: number; p50: number; p75: number; p90: number;
  };
  probabilityOfSuccess: number;   // % of trials where corpus >= required
  expectedShortfall: number;      // average gap in failing scenarios
  requiredCorpus: number;         // benchmark used
  histogram: { bucket: string; count: number }[];
}

// ─── Report / Snapshot Models (AI advisor + PDF export) ──────────────────────

/**
 * FinancialSnapshot: complete serialisable view of a user's financial state.
 *
 * This is the object passed to:
 *   - ai-prompt-builder.ts → generates personalised AI advice prompt
 *   - report-builder.ts    → generates structured PDF data
 *   - Firestore adapter    → saves/loads user plans
 *   - Analytics pipeline   → aggregated anonymised insights
 */
export interface FinancialSnapshot {
  generatedAt: string;           // ISO 8601 timestamp
  userId?: string;               // Firestore UID (optional)
  metadata: SnapshotMetadata;
  sipResult?: SIPResult;
  retirementResult?: RetirementResult;
  loanResult?: LoanResult;
  healthResult?: HealthResult;
  portfolio?: Portfolio;
  monteCarloResult?: MonteCarloResult;
  scenarioResults?: ScenarioResult[];
  recommendations: Recommendation[];
}

export interface SnapshotMetadata {
  age: number;
  salary: number;
  expenses: number;
  retirementAge: number;
  lifeExpectancy: number;
  inflationAssumption: number;
}

export interface Recommendation {
  priority: RecommendationPriority;
  category: RecommendationCategory;
  titleNepali: string;
  bodyNepali: string;
  actionNepali: string;
  impactScore: number;          // 1–10: how much this improves financial health
}

// ─── Utility Types ───────────────────────────────────────────────────────────

/** Typed hook return — inputs + setters + result */
export interface HookReturn<I, S, R> {
  inputs: I;
  setters: S;
  result: R;
}
