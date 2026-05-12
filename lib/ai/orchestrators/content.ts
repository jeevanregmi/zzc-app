/**
 * Content Generation Orchestrator
 *
 * Coordinates the multi-step pipeline: topic → brief → thumbnail prompt → schedule.
 *
 * EXECUTION BOUNDARY:
 *   This orchestrator contains PURE LOGIC (no SDK calls, no fetch).
 *   It assembles tasks, validates budgets, and writes state to Firestore.
 *   The actual AI API calls happen in Cloudflare Pages Functions which
 *   inject concrete ITextProvider / IImageProvider implementations.
 *
 * Pipeline steps (all async, each emits a domain event on completion):
 *   1. createBrief     → AITextRequest via contentBriefTemplate
 *   2. generateThumbnailPrompt → refines brief into image gen prompt
 *   3. createContentAsset → writes ContentAsset to Firestore (status: "scripting")
 *   4. (human review gate — no automation past this point without approval)
 *   5. schedulePublish  → future: YouTube API / social scheduling
 *
 * Human gates prevent AI hallucinations from reaching your audience without review.
 */

import type { FinancialTopic } from "../../types/business";
import type { ContentBriefInput } from "../prompts/content-brief";
import type { ITextProvider, AIProviderConfig } from "../types";
import { contentBriefTemplate, type ContentBriefOutput } from "../prompts/content-brief";
import { buildBrandVoicePrompt, ZZC_BRAND_VOICE } from "../prompts/brand-voice";
import { estimateTextCostUSD, checkBudget } from "../costs/tracker";

export interface ContentOrchestrationRequest {
  topic:           FinancialTopic;
  platform:        ContentBriefInput["platform"];
  durationTarget:  number;
  audienceTags:    string[];
  existingContent: Array<{ title: string }>;
  budgetSnapshot: {
    spentTodayUSD: number;
    dailyLimitUSD: number;
  };
}

export interface ContentOrchestrationResult {
  brief?:       ContentBriefOutput;
  costUSD:      number;
  blocked:      boolean;
  blockReason:  string;
}

export async function createContentBrief(
  request:  ContentOrchestrationRequest,
  provider: ITextProvider,
  config:   AIProviderConfig,
): Promise<ContentOrchestrationResult> {
  // Budget guard — prevents runaway costs
  const estimatedCost = estimateTextCostUSD(config.model, 1500, 2000);
  const budgetCheck   = checkBudget(
    estimatedCost,
    request.budgetSnapshot.spentTodayUSD,
    request.budgetSnapshot.dailyLimitUSD,
  );

  if (!budgetCheck.allowed) {
    return { blocked: true, blockReason: budgetCheck.reason, costUSD: 0 };
  }

  const input: ContentBriefInput = {
    topic:               request.topic,
    platform:            request.platform,
    audienceTags:        request.audienceTags,
    durationTarget:      request.durationTarget,
    brandVoice:          buildBrandVoicePrompt(ZZC_BRAND_VOICE),
    existingPerformers:  request.existingContent.map(c => c.title),
  };

  const aiRequest  = contentBriefTemplate.build(input);
  const startMs    = Date.now();
  const response   = await provider.generate(aiRequest);
  const latencyMs  = Date.now() - startMs;

  const actualCost = estimateTextCostUSD(config.model, response.inputTokens, response.outputTokens);
  void latencyMs; // will be written to AIGenerationLog by caller

  return {
    brief:       contentBriefTemplate.parse(response),
    costUSD:     actualCost,
    blocked:     false,
    blockReason: "",
  };
}
