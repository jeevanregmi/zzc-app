/**
 * Prompt Template: Content Brief Generator
 *
 * Input:  FinancialTopic + audience segment + brand voice config
 * Output: Structured content brief with script outline, hook, CTAs
 *
 * Used by: ContentOrchestrator.createBrief()
 * Called from: Cloudflare Pages Function /api/ai/content-brief
 */

import type { AITextRequest, AITextResponse, PromptTemplate } from "../types";
import type { FinancialTopic } from "../../types/business";

export interface ContentBriefInput {
  topic:          FinancialTopic;
  platform:       "youtube" | "tiktok" | "instagram" | "linkedin";
  audienceTags:   string[];       // ["young-professional", "nepal", "first-time-investor"]
  durationTarget: number;         // seconds (60 for Shorts, 480 for long-form)
  brandVoice:     string;         // from BrandVoiceConfig
  existingPerformers: string[];   // titles of top-performing content on this topic
}

export interface ContentBriefOutput {
  title:          string;
  hook:           string;         // first 3-5 seconds script
  outline:        string[];       // ordered section/scene list
  callToAction:   string;
  keywords:       string[];
  thumbnailIdea:  string;
  estimatedViews: number;         // rough estimate based on topic search volume
  recommendedTags:string[];
}

export const contentBriefTemplate: PromptTemplate<ContentBriefInput, ContentBriefOutput> = {
  name:        "content-brief",
  description: "Generates structured YouTube/short-form content briefs from financial topics",

  build(input: ContentBriefInput): AITextRequest {
    return {
      system: CONTENT_BRIEF_SYSTEM,
      messages: [{
        role:    "user",
        content: buildUserPrompt(input),
      }],
      maxTokens: 2000,
    };
  },

  parse(response: AITextResponse): ContentBriefOutput {
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const raw = jsonMatch ? jsonMatch[1] : response.content;
      return JSON.parse(raw) as ContentBriefOutput;
    } catch {
      return {
        title:           "",
        hook:            response.content.slice(0, 200),
        outline:         [],
        callToAction:    "",
        keywords:        [],
        thumbnailIdea:   "",
        estimatedViews:  0,
        recommendedTags: [],
      };
    }
  },
};

// ── Prompt text ───────────────────────────────────────────────────────────────

const CONTENT_BRIEF_SYSTEM = `You are a financial content strategist specializing in Nepali personal finance education.
Your audience is young Nepali professionals (age 22-35) who are new to investing.
You understand Nepal's financial ecosystem: SIP mutual funds, SSF pension, NLF, NSB, CBIL, NEPSE.
Always write in an accessible, encouraging tone. Avoid jargon without explanation.
Output must be valid JSON matching the ContentBriefOutput schema.`;

function buildUserPrompt(input: ContentBriefInput): string {
  const performers = input.existingPerformers.length
    ? `\nTop-performing content on this topic: ${input.existingPerformers.slice(0, 3).join(", ")}`
    : "";

  return `Create a content brief for the following:

TOPIC: ${input.topic.name} (${input.topic.nameNepali})
PLATFORM: ${input.platform}
TARGET DURATION: ${input.durationTarget} seconds
AUDIENCE: ${input.audienceTags.join(", ")}
BRAND VOICE: ${input.brandVoice}${performers}

Related financial schemes: ${input.topic.relatedSchemes.join(", ")}
Topic description: ${input.topic.description}

Output a JSON object with this exact schema:
{
  "title": "compelling title with primary keyword",
  "hook": "first 3-5 seconds script that grabs attention",
  "outline": ["scene/section 1", "scene/section 2", "..."],
  "callToAction": "end-of-video CTA",
  "keywords": ["keyword1", "keyword2"],
  "thumbnailIdea": "visual description for thumbnail design",
  "estimatedViews": <number based on topic search volume ${input.topic.searchVolume}>,
  "recommendedTags": ["tag1", "tag2"]
}`;
}
