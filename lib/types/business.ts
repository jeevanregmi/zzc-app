/**
 * Business Domain — Canonical Contracts
 *
 * Covers: revenue, expenses, AI costs, content, audience, analytics, recommendations.
 *
 * Relation strategy (see docs/INTELLIGENCE_GRAPH.md):
 *   All cross-entity relations use string ID arrays (not subcollections or embedded objects).
 *   This keeps documents flat (Firestore's preferred model) while encoding the graph structure
 *   that recommendation and analytics engines need to traverse.
 *
 *   Example traversal:
 *     AudienceLead.topicIds → FinancialTopic.id
 *     FinancialTopic.topMediaIds → MediaAsset.id
 *     MediaAsset.relatedSchemes → Scheme identifiers
 *
 * Monetary fields always carry BOTH NPR and USD amounts + the exchange rate at time of entry.
 * Historical rate divergence kills analytics if you store only one currency.
 */

// ── Enums ────────────────────────────────────────────────────────────────────

export type RevenueSource =
  | "youtube" | "playstore" | "subscription" | "consultation"
  | "enterprise" | "affiliate" | "content-licensing" | "other";

export type ExpenseCategory =
  | "ai-api" | "cloud-hosting" | "storage" | "dev-tools"
  | "marketing" | "content-production" | "legal" | "operations" | "salary";

export type ExpenseClassification = "CAPEX" | "OPEX";

export type BillingCycle = "one-time" | "monthly" | "annual";

export type SubscriptionTier   = "free" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "trial" | "cancelled" | "expired";
export type PaymentMethod      = "esewa" | "khalti" | "card" | "bank_transfer";

export type ContentPlatform =
  | "youtube" | "tiktok" | "instagram" | "linkedin" | "facebook" | "website" | "email";

export type ContentPipelineStatus =
  | "idea" | "scripting" | "production" | "editing" | "scheduled" | "published" | "archived";

export type GoalStatus = "on_track" | "behind" | "achieved" | "missed";

// ── RevenueEntry ──────────────────────────────────────────────────────────────

export interface RevenueEntry {
  id:           string;
  ownerId:      string;
  source:       RevenueSource;
  platform:     string;               // "YouTube Studio" | "eSewa" | "Khalti"
  amountNPR:    number;
  amountUSD:    number;
  usdToNprRate: number;               // rate at time of recording (avoid stale conversion)
  date:         string;               // ISO date "2026-05-10"
  description:  string;
  verified:     boolean;
  receiptPath:  string;               // Firebase Storage path
  contentAssetId: string;             // → ContentAsset.id if revenue is content-attributable
  createdAt:    string;
  updatedAt:    string;
}

// ── ExpenseEntry ──────────────────────────────────────────────────────────────

export interface ExpenseEntry {
  id:                   string;
  ownerId:              string;
  vendor:               string;               // "Anthropic" | "AWS" | "Cloudflare" | "Google"
  service:              string;               // specific service name "AWS Bedrock" | "Firebase"
  category:             ExpenseCategory;
  classification:       ExpenseClassification;
  amountUSD:            number;
  amountNPR:            number;
  usdToNprRate:         number;
  date:                 string;
  description:          string;
  invoicePath:          string;
  recurring:            boolean;
  billingCycle:         BillingCycle;
  linkedGenerationIds:  string[];             // → AIGenerationLog.id[] for AI cost attribution
  createdAt:            string;
  updatedAt:            string;
}

// ── Subscription ──────────────────────────────────────────────────────────────

export interface Subscription {
  id:            string;
  ownerId:       string;
  tier:          SubscriptionTier;
  status:        SubscriptionStatus;
  startDate:     string;
  endDate:       string;
  amountNPR:     number;
  paymentMethod: PaymentMethod;
  features:      string[];
  cancelledAt:   string;
  cancelReason:  string;
  createdAt:     string;
}

// ── ContentAsset ──────────────────────────────────────────────────────────────
// Lifecycle record for a piece of content from idea to published to analytics.
// Bridges MediaAsset (storage/AI), RevenueEntry (attribution), and AnalyticsSnapshot.

export interface ContentAsset {
  id:              string;
  ownerId:         string;

  title:           string;
  description:     string;
  platform:        ContentPlatform;
  status:          ContentPipelineStatus;

  // Relation pointers — enables graph traversal without subcollections
  mediaAssetIds:   string[];          // → MediaAsset.id[] (video file, thumbnail, B-roll)
  generationLogIds:string[];          // → AIGenerationLog.id[] (AI assists used)
  expenseIds:      string[];          // → ExpenseEntry.id[] (production costs)
  revenueIds:      string[];          // → RevenueEntry.id[] (earned from this content)

  // Intelligence feature vectors
  topicIds:        string[];          // → FinancialTopic.id[]
  relatedSchemes:  string[];          // e.g. ["SIP", "NLF", "SSF"]
  relatedSectors:  string[];          // e.g. ["banking", "insurance"]
  targetAudience:  string[];          // audience segment tags

  // Performance (updated when analytics snapshot is taken)
  publishedAt:     string;
  platformVideoId: string;            // YouTube video ID, etc.
  views:           number;
  engagement:      number;            // likes + comments + shares
  watchTimeHours:  number;            // video only
  revenueNPR:      number;            // attributed revenue
  aiCostUSD:       number;            // total AI cost for this content

  // ROI = revenueNPR / (aiCostUSD × nprRate); tracked separately for analytics
  roi:             number;

  createdAt:       string;
  updatedAt:       string;
}

// ── FinancialTopic ────────────────────────────────────────────────────────────
// Normalized topic taxonomy. AudienceLead.topicIds and ContentAsset.topicIds
// both reference FinancialTopic.id — this is the graph hub for recommendations.

export interface FinancialTopic {
  id:              string;            // slug: "sip-basics", "retirement-planning"
  name:            string;            // "SIP Basics"
  nameNepali:      string;            // "SIP आधारभूत"
  description:     string;
  relatedTopicIds: string[];          // sibling/parent topic IDs
  relatedSchemes:  string[];          // ["SIP", "NLF", "PPF"]
  relatedSectors:  string[];          // ["mutual-funds", "banking"]
  topMediaIds:     string[];          // top 5 MediaAsset.id[] by engagement
  topContentIds:   string[];          // top 5 ContentAsset.id[] by revenue
  searchVolume:    number;            // estimated monthly search volume (manual entry)
  createdAt:       string;
  updatedAt:       string;
}

// ── AudienceLead ─────────────────────────────────────────────────────────────
// Captured from calculator usage, newsletter signup, etc.
// topicIds drives personalized content recommendations.
// conversionEvents drives funnel analytics.

export interface AudienceLead {
  id:               string;
  ownerId:          string;

  email:            string;
  name:             string;
  source:           string;           // "/calculator" | "youtube-cta" | "newsletter"
  utmSource:        string;
  utmMedium:        string;
  utmCampaign:      string;

  // Interest graph — drives recommendation
  topicIds:         string[];         // → FinancialTopic.id[]
  interestTags:     string[];         // free-form: ["sip", "young-professional", "nepal"]

  // Engagement state
  subscribed:       boolean;
  lastActiveAt:     string;
  emailsSent:       number;
  emailsOpened:     number;
  emailsClicked:    number;

  // Conversion tracking
  conversionEvents: ConversionEvent[];

  // Demographic signals (voluntary)
  ageRange:         string;           // "20-25" | "26-30" etc.
  occupation:       string;

  createdAt:        string;
  updatedAt:        string;
}

export interface ConversionEvent {
  type:      "signup" | "calculator_complete" | "subscription" | "consultation_booking";
  timestamp: string;
  value:     number;                  // NPR value of conversion (0 if unknown)
  metadata:  Record<string, string>;
}

// ── AnalyticsSnapshot ─────────────────────────────────────────────────────────
// Point-in-time metric snapshot. Used for trend charts and goal tracking.
// Linked to ContentAsset and AudienceLead via topContentIds / leadCount.

export interface AnalyticsSnapshot {
  id:                string;
  ownerId:           string;
  date:              string;          // "2026-05-10"
  source:            "web" | "mobile" | "api";
  pageViews:         number;
  uniqueVisitors:    number;
  sessions:          number;
  bounceRate:        number;          // %
  avgSessionSec:     number;
  topPages:          { path: string; views: number }[];
  topCountries:      { code: string; visits: number }[];
  conversionRate:    number;          // % of visitors who register/subscribe
  calculatorUsage:   number;
  recommendUsage:    number;
  newLeads:          number;          // AudienceLead records created this period
  topContentIds:     string[];        // → ContentAsset.id[] (top performers this period)
  recordedAt:        string;
}

// ── RecommendationSignal ──────────────────────────────────────────────────────
// Pre-computed recommendation input stored in Firestore.
// The actual recommendation computation happens in Cloudflare Worker or Claude tool call.
// This document is written by the analytics pipeline and read by the recommendation engine.

export interface RecommendationSignal {
  id:             string;
  ownerId:        string;
  subjectType:    "lead" | "session";  // who we're recommending for
  subjectId:      string;              // AudienceLead.id or anonymous session ID

  // Interest signals — aggregated from behavior
  topicAffinities: { topicId: string; score: number }[];  // 0-1 affinity score
  schemeAffinities:{ scheme: string;  score: number }[];

  // Candidate assets — pre-filtered by interest overlap
  candidateMediaIds:   string[];       // MediaAsset.id[]
  candidateContentIds: string[];       // ContentAsset.id[]

  // Output — recommendation engine writes here
  recommendedContentIds: string[];
  recommendedTopicIds:   string[];
  reasoning:             string;       // LLM explanation (optional)

  computedAt: string;
  expiresAt:  string;                  // TTL — recompute if stale
}

// ── Platform Metrics ──────────────────────────────────────────────────────────

export interface YouTubeSnapshot {
  id:                  string;
  ownerId:             string;
  videoId:             string;
  contentAssetId:      string;         // → ContentAsset.id
  title:               string;
  publishedAt:         string;
  viewCount:           number;
  watchTimeHours:      number;
  subscribersGained:   number;
  revenueUSD:          number;
  likes:               number;
  comments:            number;
  ctr:                 number;         // click-through rate %
  avgViewDurationSec:  number;
  impressions:         number;
  topCountries:        { code: string; pct: number }[];
  recordedAt:          string;
}

export interface PlayStoreSnapshot {
  id:          string;
  ownerId:     string;
  appId:       string;
  date:        string;
  downloads:   number;
  activeUsers: number;                 // DAU
  revenueUSD:  number;
  rating:      number;                 // 1-5
  reviewCount: number;
  uninstalls:  number;
  crashRate:   number;                 // %
  recordedAt:  string;
}

// ── KPIs and Goals ────────────────────────────────────────────────────────────

export type KPIMetric =
  | "monthly_revenue_npr" | "monthly_expenses_npr" | "net_profit_npr"
  | "youtube_subscribers" | "youtube_monthly_views" | "youtube_revenue_usd"
  | "playstore_downloads" | "playstore_dau"
  | "subscription_count" | "mrr_npr" | "churn_rate_pct"
  | "monthly_ai_cost_usd" | "monthly_web_visitors"
  | "calculator_sessions" | "recommend_completions"
  | "leads_captured"      | "email_open_rate";

export interface BusinessGoal {
  id:           string;
  ownerId:      string;
  metric:       KPIMetric;
  label:        string;
  targetValue:  number;
  currentValue: number;
  period:       string;               // "2026-Q2" | "2026-05"
  status:       GoalStatus;
  notes:        string;
  updatedAt:    string;
}

// ── Aggregated views (computed, never stored directly) ────────────────────────

export interface MonthlyPL {
  period:          string;
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
  churnRate:    number;
  byTier:       { tier: SubscriptionTier; count: number; mrrNPR: number }[];
}

// ── AI Content Pipeline ───────────────────────────────────────────────────────
// Tracks the AI-driven content creation flow:
//   topic → script → thumbnail prompt → image → caption → publish queue
// One job per content asset. Steps are append-only (event-sourced status).

export type PipelineStepType =
  | "topic_selected" | "script_drafted" | "thumbnail_prompted"
  | "image_generated" | "caption_written" | "review_pending"
  | "approved" | "scheduled" | "published" | "failed";

export interface PipelineStep {
  step:       PipelineStepType;
  status:     "pending" | "running" | "done" | "failed";
  startedAt:  string;
  completedAt:string;
  agentId:    string;            // which AI agent ran this step
  costUSD:    number;
  outputRef:  string;            // MediaAsset.id or plain text ref
  errorMsg:   string;
}

export interface ContentPipelineJob {
  id:            string;
  ownerId:       string;
  contentAssetId:string;         // → ContentAsset.id
  topicId:       string;         // → FinancialTopic.id
  targetPlatform:ContentPlatform;
  targetDate:    string;
  steps:         PipelineStep[];
  currentStep:   PipelineStepType;
  totalCostUSD:  number;
  requiresApproval: boolean;     // always true before publish
  approvedBy:    string;
  approvedAt:    string;
  createdAt:     string;
  updatedAt:     string;
}

// ── Publish Queue ─────────────────────────────────────────────────────────────

export type PublishStatus = "queued" | "publishing" | "published" | "failed" | "cancelled";

export interface PublishQueueItem {
  id:             string;
  ownerId:        string;
  contentAssetId: string;
  platform:       ContentPlatform;
  scheduledAt:    string;
  publishedAt:    string;
  status:         PublishStatus;
  platformPostId: string;        // returned ID after publish
  errorMsg:       string;
  retryCount:     number;
}

// ── Monetization ──────────────────────────────────────────────────────────────

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id:          string;
  ownerId:     string;          // the user being billed
  subscriptionId: string;
  lineItems:   { description: string; amountNPR: number }[];
  totalNPR:    number;
  status:      InvoiceStatus;
  issuedAt:    string;
  dueAt:       string;
  paidAt:      string;
  paymentMethod: PaymentMethod;
  paymentRef:  string;         // eSewa/Khalti transaction ID
}

export interface PaymentEvent {
  id:          string;
  ownerId:     string;
  invoiceId:   string;
  amountNPR:   number;
  method:      PaymentMethod;
  gateway:     string;          // "esewa" | "khalti" | "direct"
  gatewayRef:  string;
  status:      "success" | "failed" | "refunded";
  occurredAt:  string;
}

// ── Premium Feature Gates ─────────────────────────────────────────────────────

export type PremiumFeature =
  | "calculator_advanced"      // Monte Carlo, scenario analysis
  | "vault_unlimited"          // unlimited storage
  | "pdf_export"               // export financial reports
  | "ai_recommendations"       // AI-powered advice
  | "portfolio_optimizer"      // portfolio allocation engine
  | "goal_planner"             // goal-based planning
  | "founder_os"               // founder dashboard
  | "api_access";              // programmatic access

export interface FeatureGate {
  feature:    PremiumFeature;
  minTier:    SubscriptionTier;
  enabled:    boolean;          // override for testing
  rolloutPct: number;           // 0-100 gradual rollout
}

// ── Notification / Delivery Events ───────────────────────────────────────────

export type NotificationChannel = "email" | "push" | "in_app";
export type NotificationType    =
  | "welcome" | "subscription_created" | "payment_received" | "payment_failed"
  | "report_ready" | "content_published" | "goal_achieved" | "weekly_digest";

export interface NotificationEvent {
  id:        string;
  ownerId:   string;
  channel:   NotificationChannel;
  type:      NotificationType;
  subject:   string;
  bodyText:  string;
  bodyHtml:  string;
  sentAt:    string;
  openedAt:  string;
  clickedAt: string;
  status:    "queued" | "sent" | "delivered" | "failed" | "bounced";
  provider:  string;    // "sendgrid" | "firebase-fcm" | "in-app"
  providerRef: string;  // message ID from provider
}

// ── PDF Report ────────────────────────────────────────────────────────────────

export type ReportType = "sip_summary" | "retirement_plan" | "loan_analysis" | "portfolio" | "full_snapshot";

export interface PDFReportSpec {
  id:           string;
  ownerId:      string;
  type:         ReportType;
  title:        string;
  generatedAt:  string;
  storagePath:  string;         // Firebase Storage path after generation
  downloadUrl:  string;
  expiresAt:    string;         // signed URL expiry
  sizeBytes:    number;
  pageCount:    number;
  snapshotJson: string;         // serialised FinancialSnapshot used to generate it
}
