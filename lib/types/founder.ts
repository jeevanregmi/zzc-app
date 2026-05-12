/**
 * Founder OS — Operational Domain Types
 *
 * This is the "read model" layer for the founder dashboard.
 * All types here are computed aggregations derived from primary domain documents.
 * They are never the write target — primary writes always go to:
 *   business_revenue, business_expenses, vault_media, domain_events, etc.
 *
 * Human judgment boundaries (enforced by approval states):
 *   MUST require human approval:
 *     - ContentAsset.status === "approved" before publish
 *     - CapitalAllocation changes > 10% of runway
 *     - StrategicGoal.priority changes
 *     - Any external API credential changes
 *
 *   CAN auto-execute without approval:
 *     - Semantic tagging of media
 *     - DailyBriefing generation
 *     - RecommendationSignal refresh
 *     - Embedding generation
 *     - StrategicAlert generation
 *
 * Event-driven automation flows:
 *   ContentPublished → analytics poll scheduled → AnalyticsSnapshot generated
 *   AnalyticsSnapshot generated → RecommendationSignal refreshed
 *   AI spend exceeds threshold → StrategicAlert fired → founder notification
 *   AudienceLead captured → interest scoring → recommendation seeded
 */

// ── Strategic planning ────────────────────────────────────────────────────────

export type GoalHorizon = "week" | "month" | "quarter" | "year";
export type InitiativeStatus = "idea" | "planned" | "active" | "paused" | "done" | "cancelled";

export interface StrategicGoal {
  id:          string;
  ownerId:     string;
  title:       string;
  description: string;
  horizon:     GoalHorizon;
  targetDate:  string;
  successMetric: string;       // "NPR 500k MRR", "10k YouTube subs"
  currentValue:  number;
  targetValue:   number;
  unit:          string;       // "NPR", "subscribers", "%"
  priority:      1 | 2 | 3;   // 1=critical, 2=important, 3=nice-to-have
  linkedKPIs:    string[];     // KPIMetric identifiers
  initiatives:   string[];     // → Initiative.id[]
  status:        "on_track" | "at_risk" | "off_track" | "achieved";
  notes:         string;
  createdAt:     string;
  updatedAt:     string;
}

export interface Initiative {
  id:           string;
  ownerId:      string;
  title:        string;
  goalId:       string;        // → StrategicGoal.id
  status:       InitiativeStatus;
  owner:        string;        // "founder" | AI agent role
  dueDate:      string;
  effortDays:   number;
  impactScore:  number;        // 1-10 estimated impact
  aiAssisted:   boolean;
  notes:        string;
  createdAt:    string;
  updatedAt:    string;
}

// ── Capital + cash flow ───────────────────────────────────────────────────────

export interface CapitalAllocation {
  period:        string;        // "2026-Q2"
  totalBudgetNPR:number;
  allocations: Array<{
    category:   string;         // "AI infrastructure" | "content production" | "marketing"
    budgetNPR:  number;
    spentNPR:   number;
    pctOfTotal: number;
    locked:     boolean;        // true = requires human approval to change
  }>;
  reserveNPR:    number;        // emergency buffer
  approvedBy:    string;        // "founder" — human approval required
  approvedAt:    string;
}

export interface CashFlowSnapshot {
  date:            string;
  openingBalanceNPR: number;
  revenueNPR:      number;
  expensesNPR:     number;
  closingBalanceNPR: number;
  burnRateNPR:     number;      // monthly average
  runwayMonths:    number;
  aiCostUSD:       number;
  aiCostNPR:       number;
  cashFlowPositive:boolean;
}

// ── Decision and experiment log ───────────────────────────────────────────────

export type DecisionType =
  | "product" | "financial" | "content" | "technical" | "strategic" | "operational";

export interface DecisionLog {
  id:          string;
  ownerId:     string;
  type:        DecisionType;
  title:       string;
  context:     string;         // what problem was being solved
  options:     string[];       // alternatives considered
  chosen:      string;         // what was decided
  rationale:   string;         // why
  tradeoffs:   string;         // what was sacrificed
  reversible:  boolean;
  aiAssisted:  boolean;        // was AI consulted in the decision?
  outcome:     string;         // filled later as a retrospective
  madeAt:      string;
}

export interface Experiment {
  id:           string;
  ownerId:      string;
  title:        string;
  hypothesis:   string;
  metric:       string;        // what will be measured
  control:      string;        // baseline
  variant:      string;        // what's being tested
  startDate:    string;
  endDate:      string;
  status:       "planned" | "running" | "analyzing" | "concluded";
  result:       "positive" | "negative" | "inconclusive" | "";
  learnings:    string;
  appliedTo:    string;        // what changed as a result
}

// ── Risk register ─────────────────────────────────────────────────────────────

export type RiskCategory =
  | "financial" | "technical" | "competitive" | "regulatory" | "operational" | "ai-safety";

export interface RiskEntry {
  id:           string;
  ownerId:      string;
  category:     RiskCategory;
  title:        string;
  description:  string;
  likelihood:   1 | 2 | 3 | 4 | 5;   // 1=rare, 5=almost certain
  impact:       1 | 2 | 3 | 4 | 5;   // 1=minimal, 5=catastrophic
  riskScore:    number;                // likelihood × impact
  mitigation:   string;
  contingency:  string;
  owner:        string;
  status:       "open" | "mitigated" | "accepted" | "closed";
  reviewDate:   string;
  createdAt:    string;
}

// ── AI agent registry (operational state) ────────────────────────────────────

export interface AutomationAgent {
  agentId:         string;            // matches AIAgentRole in lib/types/intelligence.ts
  name:            string;
  status:          "enabled" | "disabled" | "paused" | "error";
  lastRunAt:       string;
  lastRunResult:   "success" | "failure" | "skipped" | "";
  lastCostUSD:     number;
  totalRunsToday:  number;
  totalCostTodayUSD: number;
  dailyBudgetUSD:  number;
  budgetRemainingUSD: number;
  errorMessage:    string;
  requiresApproval:boolean;
  approvalPending: boolean;
}

// ── Distribution channels ─────────────────────────────────────────────────────

export type ChannelType =
  | "youtube" | "tiktok" | "instagram" | "linkedin"
  | "facebook" | "email" | "push" | "website";

export interface DistributionChannel {
  channelId:        string;
  type:             ChannelType;
  name:             string;
  connected:        boolean;
  followerCount:    number;
  engagementRate:   number;
  avgReachPerPost:  number;
  monthlyRevNPR:    number;
  autoPublish:      boolean;       // requires human approval before enabling
  lastPublishedAt:  string;
  pendingCount:     number;
}

// ── Content campaign ──────────────────────────────────────────────────────────

export type CampaignStatus = "draft" | "scheduled" | "active" | "completed" | "paused";

export interface ContentCampaign {
  id:              string;
  ownerId:         string;
  title:           string;
  goalId:          string;          // → StrategicGoal.id
  status:          CampaignStatus;
  channels:        ChannelType[];
  topicIds:        string[];         // → FinancialTopic.id[]
  contentAssetIds: string[];         // → ContentAsset.id[]
  startDate:       string;
  endDate:         string;
  budgetNPR:       number;
  spentNPR:        number;
  targetLeads:     number;
  actualLeads:     number;
  conversionRate:  number;
  revenueNPR:      number;
  roi:             number;
  aiGenerated:     boolean;
  approvedBy:      string;           // "founder" — campaigns require human sign-off
  approvedAt:      string;
  createdAt:       string;
  updatedAt:       string;
}
