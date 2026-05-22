/**
 * Founder Economics Layer — ZZC AI-native operating system
 *
 * Covers: approval queue, provider economics, burn/runway, AI decision summaries.
 * These types are computed or staged — not raw Firestore records.
 */

// ─── Approval Queue ───────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export type ApprovalItemType =
  | "expense"
  | "revenue"
  | "payout"
  | "sponsorship"
  | "revenue-adjustment";

export interface ApprovalQueueItem {
  id:          string;
  type:        ApprovalItemType;
  title:       string;
  description: string;
  amountUSD:   number;
  amountNPR:   number;
  status:      ApprovalStatus;
  requestedAt: string;     // ISO date
  reviewedAt?: string;
  notes?:      string;
  createdAt:   string;
}

// ─── vault_ai_usage entry (global admin collection) ───────────────────────────

export interface VaultAIUsageEntry {
  id:            string;
  provider:      string;   // "gemini" | "bedrock" | "anthropic"
  model:         string;
  tokensIn:      number;
  tokensOut:     number;
  estimatedCost: number;   // USD
  documentId?:   string;
  userId?:       string;
  date:          string;   // ISO
  status:        "success" | "error";
  createdAt:     string;
}

// ─── Computed summaries (client-side aggregates) ──────────────────────────────

export interface ProviderEconomics {
  provider:     string;
  totalCostUSD: number;
  callCount:    number;
  avgCostUSD:   number;
  successRate:  number;   // 0–1
}

export interface BurnSummary {
  thisMonthUSD:  number;   // current month total spend (AI + infra + manual)
  lastMonthUSD:  number;
  avgMonthlyUSD: number;   // 3-month rolling average
  projectedUSD:  number;   // extrapolated to end of current month
  aiAutoUSD:     number;   // auto-tracked from vault_ai_usage
  aiManualUSD:   number;   // manually entered via AI log
  infraUSD:      number;   // all other expenses
}

export interface RunwayEstimate {
  totalInvestedUSD: number;
  totalRevenueUSD:  number;
  netPositionUSD:   number;  // revenue - invested (negative = founder-funded)
  monthlyBurnUSD:   number;
  annualRunRateUSD: number;
  alertLevel:       "healthy" | "warning" | "critical" | "pre-revenue";
}

// ─── AI Founder Decision Brief ────────────────────────────────────────────────

export interface EconomicsSummary {
  leaks:       string[];   // where money is leaking
  efficiency:  string[];   // which provider / workflow is most cost efficient
  workflows:   string[];   // expensive workflow analysis
  projections: string[];   // projected costs at growth scenarios
  advice:      string[];   // top 3 immediate actions
  generatedAt: string;
  provider?:   string;
}
