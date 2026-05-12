/**
 * Prompt Template: Content Recommendation Generator
 *
 * Input:  AudienceLead interests + available ContentAssets + FinancialTopics
 * Output: Ranked content recommendations with reasoning
 *
 * Used by: RecommendationOrchestrator
 * Called from: Cloudflare Pages Function /api/ai/recommend
 */

import type { AITextRequest, AITextResponse, PromptTemplate } from "../types";
import type { AudienceLead } from "../../types/business";

export interface RecommendationInput {
  lead:             Pick<AudienceLead, "interestTags" | "ageRange" | "occupation">;
  availableContent: Array<{
    id:        string;
    title:     string;
    platform:  string;
    topics:    string[];
    views:     number;
    engagement:number;
  }>;
  maxRecommendations: number;
}

export interface RecommendationOutput {
  recommendations: Array<{
    contentId: string;
    score:     number;      // 0-1 relevance score
    reason:    string;      // one sentence why this is relevant
  }>;
  audienceInsight: string;  // one-line profile summary of this lead's interests
}

export const recommendationTemplate: PromptTemplate<RecommendationInput, RecommendationOutput> = {
  name:        "recommendation",
  description: "Ranks content assets by relevance to a specific audience lead",

  build(input: RecommendationInput): AITextRequest {
    return {
      system: RECOMMENDATION_SYSTEM,
      messages: [{
        role:    "user",
        content: buildRecommendationPrompt(input),
      }],
      maxTokens: 1500,
    };
  },

  parse(response: AITextResponse): RecommendationOutput {
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const raw = jsonMatch ? jsonMatch[1] : response.content;
      return JSON.parse(raw) as RecommendationOutput;
    } catch {
      return { recommendations: [], audienceInsight: "" };
    }
  },
};

const RECOMMENDATION_SYSTEM = `You are a personalization engine for a Nepali financial education platform.
Rank content by relevance to a specific user based on their interest profile.
Consider: interest alignment, content complexity relative to apparent experience level, recency.
Output must be valid JSON.`;

function buildRecommendationPrompt(input: RecommendationInput): string {
  const contentList = input.availableContent
    .map(c => `ID:${c.id} | "${c.title}" | ${c.platform} | topics:[${c.topics.join(",")}] | views:${c.views}`)
    .join("\n");

  return `USER PROFILE:
Interests: ${input.lead.interestTags.join(", ")}
Age range: ${input.lead.ageRange}
Occupation: ${input.lead.occupation}

AVAILABLE CONTENT (${input.availableContent.length} items):
${contentList}

Recommend the top ${input.maxRecommendations} items most relevant to this user.
Output JSON:
{
  "recommendations": [
    { "contentId": "...", "score": 0.95, "reason": "..." }
  ],
  "audienceInsight": "one sentence describing this user's financial interest profile"
}`;
}
