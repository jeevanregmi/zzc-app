export type SourceType =
  | "rss"
  | "url"
  | "nrb_api"
  | "sebon_api"
  | "twitter"
  | "reddit"
  | "youtube"
  | "other";

export type SourceStatus = "active" | "paused" | "error";

export type SignalStatus = "raw" | "validated" | "rejected" | "promoted";

export type TopicPriority = "high" | "medium" | "low";

// ─── SourceSignal ─────────────────────────────────────────────────────────────
// A harvested intelligence item from a monitored source.
// Written by ingest-url.ts worker; reviewed in /vault/content/intelligence.

export interface SourceSignal {
  id:           string;
  ownerId:      string;
  sourceUrl:    string;
  sourceType:   SourceType;
  sourceName:   string;          // human-readable, e.g. "NRB Press Releases"
  title:        string;
  summary:      string;          // AI 1-2 sentence summary
  body?:        string;          // full extracted text
  publishedAt?: string;
  // Taxonomy classification (populated by ingest worker via lib/data/taxonomy.ts)
  sectorId?:    string;          // primary sector (e.g. "nbfi", "capital-markets")
  taxonomyTags?: { topicId: string; sectorId: string; score: number }[];
  // Classification
  status:       SignalStatus;
  topics:       string[];        // IntelligenceTopic names matched
  tags:         string[];
  // AI analysis
  relevanceScore?:  number;      // 0-1
  credibility?:     "high" | "medium" | "low" | "unverified";
  aiInsights?:      string[];
  contentIdeas?:    string[];
  // Admin
  validatedBy?:     string;
  validatedAt?:     string;
  rejectionReason?: string;
  createdAt:    string;
  updatedAt:    string;
}

// ─── MonitoredSource ──────────────────────────────────────────────────────────
// A configured source URL/feed polled on schedule by the cron worker.

export interface MonitoredSource {
  id:          string;
  ownerId:     string;
  name:        string;
  url:         string;
  sourceType:  SourceType;
  status:      SourceStatus;
  schedule:    "hourly" | "daily" | "weekly";
  // Runtime state
  lastCheckedAt?: string;
  lastSuccessAt?: string;
  lastSignalAt?:  string;
  errorMessage?:  string;
  rawSignalCount: number;
  // Auto-tagging
  topics:      string[];
  tags:        string[];
  createdAt:   string;
  updatedAt:   string;
}

// ─── IntelligenceTopic ────────────────────────────────────────────────────────
// A tracked concept (e.g. "EPF", "Housing Loan") that signals get tagged against.

export interface IntelligenceTopic {
  id:          string;
  ownerId:     string;
  name:        string;
  description: string;
  keywords:    string[];         // auto-matching keywords
  priority:    TopicPriority;
  // Denormalized counters
  rawSignalCount:       number;
  validatedSignalCount: number;
  contentIdeasCount:    number;
  createdAt:   string;
  updatedAt:   string;
}
