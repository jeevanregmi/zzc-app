/**
 * Signal Routing Engine — Pure Functions (no Firestore, no AI)
 *
 * Takes a SourceSignal + loaded SignalRoute array → returns matched routes.
 * Caller is responsible for loading routes from Firestore and executing actions.
 *
 * Used by:
 *   - scripts/poll-monitored-sources.js (Node.js, after signal write)
 *   - Future: Cloudflare cron worker
 *
 * Match algorithm:
 *   A route matches a signal when ANY of:
 *     - One or more of route.keywords appears in signal title or summary (case-insensitive)
 *     - signal.sectorId is in route.sectorIds
 *     - Any signal.taxonomyTags[].topicId is in route.topicIds
 *   AND signal.relevanceScore >= route.minRelevanceScore
 *   AND route.active === true
 *
 *   matchMode "all" requires ALL keywords to be present (strict match).
 *   matchMode "any" requires at least one keyword (permissive match).
 */

import type { SignalRoute, RouteMatch } from "../types/routing";

// ── Signal shape accepted by the matcher ──────────────────────────────────
// Intentionally loose — works with both Firestore SourceSignal docs and
// the raw ingest result object from ingest-url.ts.

export interface RoutableSignal {
  title:          string;
  summary:        string;
  sectorId?:      string | null;
  taxonomyTags?:  { topicId: string; sectorId: string; score: number }[];
  relevanceScore?: number;
}

// ── Core matcher ──────────────────────────────────────────────────────────

export function matchSignalRoutes(
  signal: RoutableSignal,
  routes: SignalRoute[],
): RouteMatch[] {
  const text           = `${signal.title} ${signal.summary}`.toLowerCase();
  const signalSector   = signal.sectorId?.toLowerCase() ?? "";
  const signalTopicIds = new Set((signal.taxonomyTags ?? []).map(t => t.topicId));
  const relevance      = signal.relevanceScore ?? 0.5;

  const matches: RouteMatch[] = [];

  for (const route of routes) {
    if (!route.active) continue;
    if (relevance < route.minRelevanceScore) continue;

    const matchedKeywords: string[] = [];
    const matchedSectors:  string[] = [];
    const matchedTopics:   string[] = [];

    // Keyword matching
    for (const kw of route.keywords) {
      if (text.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    }

    // Sector matching
    if (signalSector && route.sectorIds.includes(signalSector)) {
      matchedSectors.push(signalSector);
    }

    // Topic matching
    for (const topicId of route.topicIds) {
      if (signalTopicIds.has(topicId)) {
        matchedTopics.push(topicId);
      }
    }

    // Apply matchMode
    const keywordHit =
      route.keywords.length === 0 ||
      (route.matchMode === "any"
        ? matchedKeywords.length > 0
        : matchedKeywords.length === route.keywords.length);

    const hasAnyMatch =
      keywordHit ||
      matchedSectors.length > 0 ||
      matchedTopics.length > 0;

    if (!hasAnyMatch) continue;

    // Composite score: weighted sum of match signals
    const keywordScore = route.keywords.length > 0
      ? matchedKeywords.length / route.keywords.length
      : 0;
    const sectorScore  = matchedSectors.length > 0 ? 1 : 0;
    const topicScore   = route.topicIds.length > 0
      ? matchedTopics.length / route.topicIds.length
      : 0;
    const score = Math.min(
      1,
      (keywordScore * 0.5 + sectorScore * 0.25 + topicScore * 0.25) * relevance,
    );

    matches.push({ route, matchedKeywords, matchedSectors, matchedTopics, score });
  }

  // Sort descending by score, then by priority weight
  const priorityWeight: Record<string, number> = {
    critical: 4, high: 3, medium: 2, low: 1,
  };

  return matches.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (Math.abs(scoreDiff) > 0.01) return scoreDiff;
    return (priorityWeight[b.route.priority] ?? 0) - (priorityWeight[a.route.priority] ?? 0);
  });
}

// ── Seed routes — defaults to create when routing admin is first opened ───

export interface DefaultRoute {
  name:              string;
  description:       string;
  keywords:          string[];
  sectorIds:         string[];
  topicIds:          string[];
  matchMode:         "any" | "all";
  minRelevanceScore: number;
  destination:       SignalRoute["destination"];
  action:            SignalRoute["action"];
  priority:          SignalRoute["priority"];
  autoTags:          string[];
  autoTopics:        string[];
  contentType?:      string;
  platform?:         string;
  active:            boolean;
  requiresAdminApproval: boolean;
}

export const DEFAULT_SIGNAL_ROUTES: DefaultRoute[] = [
  {
    name:        "NRB Policy → Rate Update Suggestion",
    description: "NRB monetary policy signals → suggest market rate updates",
    keywords:    ["nrb", "monetary policy", "repo rate", "interest rate", "bank rate", "policy rate"],
    sectorIds:   ["banking", "government-finance"],
    topicIds:    ["nrb-policy", "interest-rates", "bank-interest-rates"],
    matchMode:   "any",
    minRelevanceScore: 0.4,
    destination: "market_rate_suggest",
    action:      "suggest_update",
    priority:    "critical",
    autoTags:    ["nrb", "rates"],
    autoTopics:  ["nrb-policy"],
    active:      true,
    requiresAdminApproval: true,
  },
  {
    name:        "NEPSE / Capital Markets → Content Queue",
    description: "NEPSE index, IPO, mutual fund signals → content queue drafts",
    keywords:    ["nepse", "ipo", "fpo", "mutual fund", "stock market", "sebon", "debenture"],
    sectorIds:   ["capital-markets"],
    topicIds:    ["nepse", "ipo-fpo", "mutual-funds", "sebon"],
    matchMode:   "any",
    minRelevanceScore: 0.45,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    autoTags:    ["capital-markets", "investment"],
    autoTopics:  ["nepse"],
    contentType: "explainer",
    platform:    "youtube",
    active:      true,
    requiresAdminApproval: true,
  },
  {
    name:        "EPF / SSF Updates → Scheme + Content",
    description: "EPF/SSF rate or policy changes → scheme suggestion + content draft",
    keywords:    ["epf", "ssf", "provident fund", "social security", "karmachari sanchaya kosh"],
    sectorIds:   ["nbfi", "government-finance"],
    topicIds:    ["epf", "ssf"],
    matchMode:   "any",
    minRelevanceScore: 0.4,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "high",
    autoTags:    ["epf", "ssf", "retirement"],
    autoTopics:  ["epf", "ssf"],
    contentType: "explainer",
    platform:    "all",
    active:      true,
    requiresAdminApproval: true,
  },
  {
    name:        "Inflation / Economic Data → Rate Suggestion",
    description: "Inflation and CPI signals → suggest inflation rate update",
    keywords:    ["inflation", "cpi", "consumer price", "महंगी", "मुद्रास्फीति"],
    sectorIds:   ["economic-intelligence", "government-finance"],
    topicIds:    ["inflation"],
    matchMode:   "any",
    minRelevanceScore: 0.4,
    destination: "market_rate_suggest",
    action:      "suggest_update",
    priority:    "high",
    autoTags:    ["inflation", "economy"],
    autoTopics:  ["inflation"],
    active:      true,
    requiresAdminApproval: true,
  },
  {
    name:        "Insurance Sector → Content Queue",
    description: "Insurance regulation or product signals → content draft",
    keywords:    ["insurance", "beema", "life insurance", "health insurance", "non-life"],
    sectorIds:   ["insurance"],
    topicIds:    ["life-insurance", "health-insurance", "non-life-insurance"],
    matchMode:   "any",
    minRelevanceScore: 0.4,
    destination: "content_queue",
    action:      "create_draft",
    priority:    "medium",
    autoTags:    ["insurance"],
    autoTopics:  ["life-insurance"],
    contentType: "explainer",
    platform:    "facebook",
    active:      true,
    requiresAdminApproval: true,
  },
];
