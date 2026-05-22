/**
 * Business Intelligence Domain Types — ZZC startup financials
 *
 * Covers: revenue, expenses, AI costs, platform metrics, content, subscriptions, goals.
 *
 * All monetary fields carry BOTH USD and NPR amounts + the exchange rate used.
 * This prevents stale-rate conversion errors when reviewing historical data.
 *
 * CAPEX vs OPEX:
 *   CAPEX — capital expenditure with >1yr useful life (domain, app build, equipment)
 *   OPEX  — recurring operational spend (hosting, API usage, SaaS subscriptions)
 *   This distinction matters for investor reporting, tax deductions, and burn rate calc.
 */

// ─── Revenue ─────────────────────────────────────────────────────────────────

export type RevenueSource =
  | "youtube" | "playstore" | "subscription" | "consultation"
  | "enterprise" | "affiliate" | "content-licensing"
  | "sponsorship" | "civic-partnership" | "research-sale" | "api-access"
  | "other";

export interface RevenueEntry {
  id:           string;
  source:       RevenueSource;
  platform:     string;               // "YouTube Studio" | "eSewa" | "Khalti" etc.
  amountNPR:    number;
  amountUSD:    number;
  usdToNprRate: number;               // rate at time of recording
  date:         string;               // ISO "2026-05-10"
  description:  string;
  verified:     boolean;              // manually confirmed vs estimated
  receiptPath:  string;               // Firebase Storage path to invoice (optional)
  createdAt:    string;
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionTier   = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "cancelled" | "expired";
export type PaymentMethod      = "esewa" | "khalti" | "card" | "bank_transfer";

export interface Subscription {
  id:            string;
  tier:          SubscriptionTier;
  status:        SubscriptionStatus;
  startDate:     string;
  endDate:       string;
  amountNPR:     number;
  paymentMethod: PaymentMethod;
  features:      string[];
  createdAt:     string;
  cancelledAt:   string;
  cancelReason:  string;
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | "ai-api" | "cloud-hosting" | "storage" | "dev-tools"
  | "marketing" | "content-production" | "legal" | "operations" | "salary";

export type ExpenseClassification = "CAPEX" | "OPEX";
export type BillingCycle = "one-time" | "monthly" | "annual";

export interface ExpenseEntry {
  id:             string;
  service:        string;             // "AWS Bedrock" | "Cloudflare" | "Firebase" etc.
  category:       ExpenseCategory;
  classification: ExpenseClassification;
  amountUSD:      number;
  amountNPR:      number;
  usdToNprRate:   number;
  date:           string;
  description:    string;
  invoicePath:    string;             // Firebase Storage path
  recurring:      boolean;
  billingCycle:   BillingCycle;
  createdAt:      string;
}

// ─── AI Cost Tracking ────────────────────────────────────────────────────────

export type AIService =
  | "anthropic" | "aws-bedrock" | "openai" | "replicate"
  | "stability-ai" | "runway" | "midjourney" | "google-ai" | "other";

export type AIOperation =
  | "recommendation" | "content-gen" | "image-gen" | "video-gen"
  | "analysis" | "embedding" | "chat" | "transcription";

export interface AICostEntry {
  id:             string;
  service:        AIService;
  operation:      AIOperation;
  model:          string;             // "claude-opus-4-7" | "dall-e-3" etc.
  inputTokens:    number;
  outputTokens:   number;
  costUSD:        number;
  relatedFeature: string;             // "/recommend" | "/vault/ai-queue"
  date:           string;
  createdAt:      string;
}

// ─── Platform Metrics ────────────────────────────────────────────────────────

export interface YouTubeSnapshot {
  id:                string;
  videoId:           string;
  title:             string;
  publishedAt:       string;
  viewCount:         number;
  watchTimeHours:    number;
  subscribersGained: number;
  revenueUSD:        number;
  likes:             number;
  comments:          number;
  ctr:               number;          // click-through rate %
  avgViewDurationSec:number;
  impressions:       number;
  topCountries:      { code: string; pct: number }[];
  recordedAt:        string;          // when snapshot was taken
}

export interface PlayStoreSnapshot {
  id:           string;
  appId:        string;
  date:         string;
  downloads:    number;
  activeUsers:  number;               // DAU
  revenueUSD:   number;
  rating:       number;               // 1-5
  reviewCount:  number;
  uninstalls:   number;
  crashRate:    number;               // %
  recordedAt:   string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsSnapshot {
  id:               string;
  date:             string;
  source:           "web" | "mobile" | "api";
  pageViews:        number;
  uniqueVisitors:   number;
  sessions:         number;
  bounceRate:       number;
  avgSessionSec:    number;
  topPages:         { path: string; views: number }[];
  topCountries:     { code: string; visits: number }[];
  conversionRate:   number;           // % who register
  calculatorUsage:  number;
  recommendUsage:   number;
  recordedAt:       string;
}

// ─── Content Performance ─────────────────────────────────────────────────────

export type ContentType =
  | "youtube-video" | "blog-post" | "social-post"
  | "ai-image" | "ai-video" | "newsletter";

export type ContentPlatform =
  | "youtube" | "linkedin" | "facebook" | "instagram" | "website" | "email";

export interface ContentEntry {
  id:             string;
  type:           ContentType;
  title:          string;
  platform:       ContentPlatform;
  publishedAt:    string;
  views:          number;
  engagement:     number;             // likes + comments + shares
  revenueNPR:     number;
  aiGenerated:    boolean;
  aiCostUSD:      number;
  roi:            number;             // revenueNPR / (aiCostUSD × nprRate); 0 if free
  relatedExpenseId: string;
  createdAt:      string;
}

// ─── Affiliates ──────────────────────────────────────────────────────────────

export interface AffiliateEntry {
  id:             string;
  partner:        string;
  clicks:         number;
  conversions:    number;
  conversionRate: number;
  commissionRate: number;
  earnedNPR:      number;
  paidOutNPR:     number;
  period:         string;             // "2026-05"
  status:         "active" | "pending_payout" | "paid";
  createdAt:      string;
}

// ─── KPIs + Goals ────────────────────────────────────────────────────────────

export type KPIMetric =
  | "monthly_revenue_npr" | "monthly_expenses_npr" | "net_profit_npr"
  | "youtube_subscribers" | "youtube_monthly_views" | "youtube_revenue_usd"
  | "playstore_downloads" | "playstore_dau"
  | "subscription_count" | "mrr_npr" | "churn_rate_pct"
  | "monthly_ai_cost_usd" | "monthly_web_visitors"
  | "calculator_sessions" | "recommend_completions";

export type GoalStatus = "on_track" | "behind" | "achieved" | "missed";

export interface BusinessGoal {
  id:           string;
  metric:       KPIMetric;
  label:        string;               // human-readable name
  targetValue:  number;
  currentValue: number;
  period:       string;               // "2026-Q2" | "2026-05"
  status:       GoalStatus;
  notes:        string;
  updatedAt:    string;
}

// ─── Aggregated views (computed, not stored) ─────────────────────────────────

export interface MonthlyPL {
  period:          string;            // "2026-05"
  totalRevenueNPR: number;
  totalExpensesNPR:number;
  netProfitNPR:    number;
  capexNPR:        number;
  opexNPR:         number;
  aiCostUSD:       number;
  bySource:        { source: RevenueSource; amountNPR: number }[];
  byCategory:      { category: ExpenseCategory; amountNPR: number }[];
}

export interface MRRSummary {
  period:       string;
  mrrNPR:       number;
  activeCount:  number;
  trialCount:   number;
  newCount:     number;
  churnedCount: number;
  churnRate:    number;               // %
  byTier:       { tier: SubscriptionTier; count: number; mrrNPR: number }[];
}
