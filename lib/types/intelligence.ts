/**
 * Founder Intelligence Layer — Aggregated Operating System Types
 *
 * These are computed aggregations, NOT primary Firestore documents.
 * They are derived from primary domain documents (RevenueEntry, ContentAsset,
 * AudienceLead, AIGenerationLog, AnalyticsSnapshot) by Workers or in-memory.
 *
 * Think of this as the "read model" in CQRS terms:
 *   Write path:  Client → Firestore (primary documents)
 *   Read path:   Cloudflare Worker → aggregates → intelligence snapshots → founder dashboard
 *
 * Storage strategy:
 *   - DailyBriefing, BurnRateSnapshot → stored in Firestore (founder_intelligence/{period})
 *   - Everything else → computed on-demand from primary documents
 *   - Expensive aggregations → cached in Cloudflare KV with 1-hour TTL
 *
 * All fields serializable (strings, numbers, arrays) for Cloudflare KV + Firestore safety.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// REVENUE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface RevenueStream {
  streamId:     string;               // "youtube-adsense" | "zzc-pro-subscription" etc.
  name:         string;
  category:     string;               // "content" | "product" | "services" | "affiliate"
  activeNPR:    number;               // current month revenue
  prevNPR:      number;               // previous month for trend
  trend:        "growing" | "flat" | "declining";
  growthPct:    number;               // month-over-month %
  forecastNPR:  number;               // next month estimate
  isRecurring:  boolean;
  mrr:          boolean;              // true if this is a monthly recurring stream
}

export interface RevenueAttribution {
  contentAssetId: string;
  title:          string;
  platform:       string;
  directNPR:      number;             // direct attribution
  assistedNPR:    number;             // assisted (lead → conversion path)
  aiCostUSD:      number;
  roi:            number;
  publishedAt:    string;
}

export interface RevenueForecast {
  period:         string;             // "2026-06"
  baseNPR:        number;             // based on trailing 3-month average
  bullNPR:        number;             // +1 std dev scenario
  bearNPR:        number;             // -1 std dev scenario
  byStream:       { streamId: string; forecastNPR: number }[];
  confidenceScore:number;             // 0-1; higher if revenue is more consistent
  generatedAt:    string;
}

export interface AdRevenueMetrics {
  period:         string;
  youtubeRPM:     number;             // revenue per 1000 views (USD)
  impressions:    number;
  cpm:            number;             // cost per 1000 impressions (USD)
  totalUSD:       number;
  topVideos:      { videoId: string; title: string; revenueUSD: number }[];
}

export interface AffiliateMetrics {
  period:          string;
  totalClicksNPR:  number;
  totalEarnedNPR:  number;
  conversionRate:  number;
  topPartners:     { partner: string; earnedNPR: number; convRate: number }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIENCE INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface AudienceSegment {
  segmentId:    string;               // "young-professional-25-30" etc.
  label:        string;
  size:         number;               // lead count
  topTopicIds:  string[];
  engagementRate: number;             // % who open emails / click CTAs
  conversionRate: number;             // % who become paid subscribers
  avgLifetimeNPR: number;             // LTV estimate
  growthRate:   number;               // month-over-month %
}

export interface ConversionFunnel {
  period:       string;
  stageVisit:   number;               // unique site visitors
  stageCalc:    number;               // completed a calculator
  stageEmail:   number;               // captured email
  stageActive:  number;               // opened 2+ emails in 30 days
  stagePaid:    number;               // converted to paid
  visitToCalc:  number;               // %
  calcToEmail:  number;               // %
  emailToActive:number;               // %
  activeToPaid: number;               // %
}

export interface RetentionMetrics {
  cohort:            string;          // "2026-05" (month user signed up)
  startSize:         number;
  activeAfter30d:    number;
  activeAfter90d:    number;
  activeAfter180d:   number;
  churnRate30d:      number;
  churnRate90d:      number;
  avgEngagementScore:number;          // 0-100
}

export interface TrustScore {
  leadId:       string;
  score:        number;               // 0-100
  signals: {
    emailOpenRate:   number;
    clickRate:       number;
    calcCompletions: number;
    daysActive:      number;
    contentEngaged:  number;
  };
  tier:         "cold" | "warm" | "hot" | "converted";
  updatedAt:    string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOUNDER INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface DailyBriefing {
  date:          string;
  ownerId:       string;

  // Financial pulse
  revenueNPR:    number;              // rolling 30-day
  expensesNPR:   number;
  netNPR:        number;
  aiCostUSD:     number;              // yesterday's AI spend
  burnRateNPR:   number;              // monthly burn

  // Content pulse
  totalViews:    number;              // yesterday YouTube + web
  newLeads:      number;              // yesterday lead captures
  topContentId:  string;             // best performing in last 7 days

  // AI system pulse
  generationsRun:  number;            // yesterday AI gen count
  failedJobs:      number;            // failed domain event handlers
  pendingQueue:    number;            // unprocessed domain events

  // Alerts — items requiring founder attention
  alerts:        StrategicAlert[];

  generatedAt:   string;
}

export interface StrategicAlert {
  severity: "info" | "warning" | "critical";
  category: "cost" | "content" | "audience" | "revenue" | "technical";
  title:    string;
  detail:   string;
  action:   string;           // recommended action
}

export interface BurnRateSnapshot {
  period:           string;
  totalBurnNPR:     number;
  fixedCostsNPR:    number;    // hosting, tools, subscriptions
  variableCostsNPR: number;    // AI generation, content production
  aiCostUSD:        number;
  aiCostNPR:        number;
  aiPctOfBurn:      number;    // % of total burn that is AI
  byCategory: { category: string; amountNPR: number }[];
}

export interface RunwayForecast {
  cashOnHandNPR:   number;
  monthlyBurnNPR:  number;
  monthlyRevNPR:   number;
  netMonthlyNPR:   number;
  runwayMonths:    number;
  breakEvenDate:   string;         // ISO date estimate
  riskLevel:       "safe" | "watchlist" | "critical";
  generatedAt:     string;
}

export interface AutomationEfficiencyMetrics {
  period:                string;
  humanHoursSaved:       number;    // estimated hours saved by automation
  automatedJobsRun:      number;
  automatedJobsSucceeded:number;
  automationSuccessRate: number;    // %
  costPerAutomatedJob:   number;    // USD
  humanHourCostSaved:    number;    // NPR (at founder's hourly rate)
  roiMultiple:           number;    // humanHourCostSaved / totalAutomationCostNPR
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface TopicTrend {
  topicId:        string;
  label:          string;
  searchVolume:   number;
  volumeTrend:    "rising" | "stable" | "falling";
  contentGap:     boolean;   // true if topic has high demand but low ZZC coverage
  recommendedNow: boolean;
  averageCTR:     number;    // % on existing ZZC content about this topic
}

export interface ViralSignal {
  contentAssetId: string;
  title:          string;
  platform:       string;
  detectedAt:     string;
  viewsIn24h:     number;
  viewsBaseline:  number;    // typical 24h views for this asset
  velocityMultiple:number;  // viewsIn24h / viewsBaseline — e.g. 8.5× normal
  action:         "amplify" | "monitor" | "cross-post";
}

export interface ThumbnailPerformance {
  mediaAssetId: string;
  contentId:    string;
  impressions:  number;
  ctr:          number;
  aiGenerated:  boolean;
  aiModel:      string;
  generationCost:number;
  ctrRank:      "top10" | "average" | "bottom10";
}

export interface ContentDecaySignal {
  contentAssetId:  string;
  title:           string;
  peakViewsDay:    string;
  currentViewsDay: number;
  decayRate:       number;   // % drop from peak per week
  evergreen:       boolean;  // true if decay < 5%/month
  refreshCandidate:boolean;  // true if high-quality but decaying
}

export interface PublishingVelocity {
  period:           string;
  piecePublished:   number;
  aiAssisted:       number;
  humanOnly:        number;
  avgProductionDays:number;
  aiSpeedup:        number;   // ratio: avgDays without AI / with AI (estimate)
  topicsCovered:    number;
  topicsCoveredPct: number;   // of total FinancialTopics in db
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI WORKFORCE LAYER (future agent role registry)
// ═══════════════════════════════════════════════════════════════════════════════

export type AIAgentRole =
  | "content-research"      // finds trending topics, competitor gaps
  | "script-writer"         // topic + brief → full video script
  | "thumbnail-designer"    // brief → image gen prompt → MediaAsset
  | "financial-researcher"  // market data → financial insight draft
  | "analytics-reporter"    // snapshot data → DailyBriefing
  | "audience-segmenter"    // lead data → AudienceSegment updates
  | "budget-controller"     // tracks AI spend, fires StrategicAlert on anomalies
  | "semantic-tagger";      // MediaAsset → intelligence tags

export interface AIAgentDefinition {
  role:           AIAgentRole;
  description:    string;
  trigger:        string;     // event type or cron expression
  promptTemplate: string;     // lib/ai/prompts/ filename
  provider:       string;     // default provider config key
  requiresHuman:  boolean;    // if true: output goes to review queue, not auto-applied
  costCapUSD:     number;     // per-run spending cap; 0 = unlimited (not recommended)
}

// Registry — instantiated when Workers are implemented
export const AI_AGENT_REGISTRY: AIAgentDefinition[] = [
  {
    role:           "semantic-tagger",
    description:    "Enriches MediaAsset with relatedTopics/Schemes/Sectors on upload",
    trigger:        "MediaAssetCreated",
    promptTemplate: "semantic-tags",
    provider:       "claude-haiku-4-5",
    requiresHuman:  false,
    costCapUSD:     0.01,
  },
  {
    role:           "content-research",
    description:    "Identifies content gaps in FinancialTopics with rising search volume",
    trigger:        "0 6 * * 1",           // cron: every Monday 6am
    promptTemplate: "content-brief",
    provider:       "claude-opus-4-7",
    requiresHuman:  true,
    costCapUSD:     0.50,
  },
  {
    role:           "analytics-reporter",
    description:    "Generates DailyBriefing from previous day's metrics",
    trigger:        "0 7 * * *",           // cron: every day 7am
    promptTemplate: "financial-insight",
    provider:       "claude-sonnet-4-6",
    requiresHuman:  false,
    costCapUSD:     0.10,
  },
  {
    role:           "budget-controller",
    description:    "Monitors AI spend and fires StrategicAlert if daily limit approaches",
    trigger:        "AIGenerationCompleted",
    promptTemplate: "",                    // no LLM needed — pure cost math
    provider:       "",
    requiresHuman:  false,
    costCapUSD:     0,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COST GOVERNANCE
// ═══════════════════════════════════════════════════════════════════════════════

export interface CostGovernanceConfig {
  dailyAILimitUSD:       number;     // hard cap across all AI providers
  perFeatureLimitsUSD:   Record<string, number>;  // per-operation caps
  anomalyThreshold:      number;     // % above rolling average that triggers alert
  failoverPriority:      string[];   // provider IDs in failover order
  emergencyShutdown:     boolean;    // if true: all AI gen blocked until manual reset
}

export const DEFAULT_GOVERNANCE: CostGovernanceConfig = {
  dailyAILimitUSD:     5.00,
  perFeatureLimitsUSD: {
    "semantic-tagging":  0.50,
    "content-brief":     1.00,
    "recommendation":    0.50,
    "financial-insight": 0.20,
    "image-generation":  2.00,
  },
  anomalyThreshold:    200,       // 200% above rolling average = alert
  failoverPriority:    ["anthropic", "google", "openai"],
  emergencyShutdown:   false,
};
