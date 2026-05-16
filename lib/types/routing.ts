/**
 * Signal Routing Taxonomy — Admin-Configurable Routing Rules
 *
 * Defines where an ingested SourceSignal gets routed and what action is taken.
 * Rules live in Firestore collection "signal_routes" — admin-managed via /vault/routing.
 *
 * Pipeline position:
 *   MonitoredSource → ingest-url worker → SourceSignal written
 *     → matchSignalRoutes(signal, routes)
 *       → for each match: executeRoute(route, signal)
 *         → writes to appropriate destination collection
 *
 * Design principles:
 *   - Pure keyword/sector matching — no AI at the routing layer
 *   - All routed items start at publishStatus: "draft" — nothing auto-publishes
 *   - Multiple routes can match a single signal (fan-out)
 *   - "suggest_update" destinations create suggestion docs, not direct updates
 */

import type { PublishStatus } from "./publish";

export type RouteDestination =
  | "content_queue"         // → vault_content_queue (QueueItem, status: pending)
  | "market_rate_suggest"   // → market_rate_suggestions (admin reviews before touching market_rates)
  | "scheme_suggest"        // → scheme_suggestions (admin reviews before touching structuredSchemes)
  | "intelligence_flag";    // → flags signal for deep analysis in Admin Vault

export type RouteAction =
  | "create_draft"          // auto-create a draft item in destination; admin reviews
  | "suggest_update"        // create a suggestion record; never touches live data
  | "flag_review";          // add a review task to admin queue only; no new doc created

export type RoutePriority = "critical" | "high" | "medium" | "low";

// ── Keyword match strategy ─────────────────────────────────────────────────

export type KeywordMatchMode =
  | "any"   // signal matches if ANY keyword is present
  | "all";  // signal matches only if ALL keywords are present

// ── SignalRoute — stored in Firestore "signal_routes" ─────────────────────

export interface SignalRoute {
  id:            string;
  name:          string;          // admin display name: "NRB Policy → Rate Update"
  description:   string;         // what this route does

  // ── Match criteria ──────────────────────────────────────────────────────
  keywords:      string[];        // matched against signal.title + signal.summary (case-insensitive)
  sectorIds:     string[];        // matched against signal.sectorId (OR logic with keywords)
  topicIds:      string[];        // matched against signal.taxonomyTags[].topicId
  matchMode:     KeywordMatchMode;
  minRelevanceScore: number;      // 0–1; signals below this score are skipped

  // ── Action ─────────────────────────────────────────────────────────────
  destination:   RouteDestination;
  action:        RouteAction;
  priority:      RoutePriority;

  // ── Auto-tagging applied to the created item ───────────────────────────
  autoTags:      string[];
  autoTopics:    string[];

  // ── Content queue config (used when destination === "content_queue") ───
  contentType?:  string;          // QueueContentType
  platform?:     string;          // QueuePlatform

  // ── Control ────────────────────────────────────────────────────────────
  active:        boolean;
  requiresAdminApproval: boolean; // always true — included for future automation gate

  // ── Metadata ───────────────────────────────────────────────────────────
  createdAt:     string;
  updatedAt:     string;
  lastMatchAt?:  string;          // updated when this route fires
  matchCount:    number;          // lifetime match counter
}

// ── RouteMatch — result of matchSignalRoutes() ─────────────────────────────

export interface RouteMatch {
  route:         SignalRoute;
  matchedKeywords: string[];
  matchedSectors:  string[];
  matchedTopics:   string[];
  score:         number;          // 0–1 composite match score
}

// ── RouteExecution — written to Firestore after a route fires ─────────────
// Collection: "route_executions" — append-only audit log.

export type RouteExecutionStatus = "pending" | "completed" | "failed" | "skipped";

export interface RouteExecution {
  id:            string;
  routeId:       string;
  routeName:     string;
  signalId:      string;
  signalTitle:   string;
  destination:   RouteDestination;
  action:        RouteAction;
  status:        RouteExecutionStatus;
  createdItemId?:string;          // ID of the doc created in the destination collection
  error?:        string;
  executedAt:    string;
}

// ── Suggestion types (intermediate layer before touching live data) ────────

// Written to "market_rate_suggestions" when a route with destination="market_rate_suggest" fires
export interface MarketRateSuggestion {
  id:              string;
  routeId:         string;
  signalId:        string;
  signalTitle:     string;
  signalUrl:       string;
  suggestedRateId: string;        // which market_rates doc to update
  suggestedValue:  number | null; // AI-extracted value, null if not parseable
  context:         string;        // relevant excerpt from signal
  publishStatus:   PublishStatus; // always starts as "draft"
  reviewedBy?:     string;
  reviewedAt?:     string;
  createdAt:       string;
  updatedAt:       string;
}

// Written to "scheme_suggestions" when destination="scheme_suggest" fires
export interface SchemeSuggestion {
  id:           string;
  routeId:      string;
  signalId:     string;
  signalTitle:  string;
  signalUrl:    string;
  targetSchemeId?: string;        // which structuredScheme to update, if known
  suggestedFields: Record<string, unknown>; // field → suggested value
  context:      string;
  publishStatus: PublishStatus;
  reviewedBy?:  string;
  reviewedAt?:  string;
  createdAt:    string;
  updatedAt:    string;
}
