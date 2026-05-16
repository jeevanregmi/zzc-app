/**
 * Task 5A — Signal → Scheme routing (rule-based, deterministic)
 *
 * Takes a signal's taxonomyTags and returns matched schemeIds from the
 * static taxonomy registry. No AI, no Firestore — pure static data join.
 *
 * Usage:
 *   const routing = routeSignalToSchemes(signal.taxonomyTags ?? []);
 *   // routing.schemeIds → ["epf-provident-fund", "ssf-home-loan", ...]
 */

import { TOPICS } from "../data/taxonomy";

// Accepts the loose shape from SourceSignal.taxonomyTags (topicId is string, not TopicId)
type TagInput = { topicId: string; sectorId: string; score: number };

export interface SchemeRouting {
  schemeIds:  string[];
  confidence: number;    // 0–1: highest tag score among contributing topics
  topicIds:   string[];  // topic IDs that contributed scheme matches
}

export function routeSignalToSchemes(taxonomyTags: TagInput[]): SchemeRouting {
  if (!taxonomyTags || taxonomyTags.length === 0) {
    return { schemeIds: [], confidence: 0, topicIds: [] };
  }

  const topicMap = new Map(TOPICS.map(t => [t.id as string, t]));

  // Score each schemeId by the max tag score of topics that reference it
  const schemeScores = new Map<string, number>();
  const matchingTopicIds: string[] = [];

  for (const tag of taxonomyTags) {
    const topic = topicMap.get(tag.topicId);
    if (!topic || topic.schemeIds.length === 0) continue;

    matchingTopicIds.push(tag.topicId);
    for (const schemeId of topic.schemeIds) {
      const prev = schemeScores.get(schemeId) ?? 0;
      schemeScores.set(schemeId, Math.max(prev, tag.score));
    }
  }

  if (schemeScores.size === 0) {
    return { schemeIds: [], confidence: 0, topicIds: [] };
  }

  const sorted   = Array.from(schemeScores.entries()).sort((a, b) => b[1] - a[1]);
  const schemeIds  = sorted.map(([id]) => id);
  const confidence = sorted[0][1];

  return { schemeIds, confidence, topicIds: [...new Set(matchingTopicIds)] };
}
