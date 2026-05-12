/**
 * Prompt Template: Semantic Tag Generator
 *
 * Input:  MediaAsset title + description + filename + extractedText
 * Output: relatedTopics, relatedSchemes, relatedSectors — enriches the intelligence graph
 *
 * Run automatically on MediaAssetCreated event.
 * Writes back to MediaAsset via updateMedia().
 */

import type { AITextRequest, AITextResponse, PromptTemplate } from "../types";

export interface SemanticTagInput {
  title:         string;
  description:   string;
  fileName:      string;
  extractedText: string;   // OCR/transcript; "" if not available
  mimeType:      string;
}

export interface SemanticTagOutput {
  relatedTopics:  string[];    // e.g. ["sip-basics", "retirement-planning"]
  relatedSchemes: string[];    // e.g. ["SIP", "SSF", "NLF"]
  relatedSectors: string[];    // e.g. ["mutual-funds", "banking", "insurance"]
  suggestedTags:  string[];    // free-form tags for vault display
  contentSummary: string;      // 1-2 sentence description if none exists
}

export const semanticTagTemplate: PromptTemplate<SemanticTagInput, SemanticTagOutput> = {
  name:        "semantic-tags",
  description: "Extracts financial topic tags and scheme references from media asset metadata",

  build(input: SemanticTagInput): AITextRequest {
    return {
      system: SEMANTIC_TAG_SYSTEM,
      messages: [{ role: "user", content: buildTagPrompt(input) }],
      maxTokens: 800,
    };
  },

  parse(response: AITextResponse): SemanticTagOutput {
    try {
      const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
      const raw = jsonMatch ? jsonMatch[1] : response.content;
      return JSON.parse(raw) as SemanticTagOutput;
    } catch {
      return { relatedTopics: [], relatedSchemes: [], relatedSectors: [], suggestedTags: [], contentSummary: "" };
    }
  },
};

const SEMANTIC_TAG_SYSTEM = `You are a financial content classifier for Nepal's personal finance ecosystem.
Your job: extract structured topic metadata from media asset descriptions.
Known Nepal financial schemes: SIP (mutual fund), SSF (Social Security Fund), NLF (Nepal Life Fund),
PPF (Public Provident Fund), NSB (Nepal SBI Bank), NEPSE, eSewa, Khalti, FonePay.
Output valid JSON only. Do not include unknown or non-Nepali schemes.`;

function buildTagPrompt(input: SemanticTagInput): string {
  const textSection = input.extractedText
    ? `\nExtracted content:\n${input.extractedText.slice(0, 1000)}`
    : "";

  return `Classify this media asset:

Title: ${input.title}
Description: ${input.description}
Filename: ${input.fileName}
MIME type: ${input.mimeType}${textSection}

Output JSON:
{
  "relatedTopics":  ["topic-slug-1", "topic-slug-2"],
  "relatedSchemes": ["SIP", "SSF"],
  "relatedSectors": ["mutual-funds", "banking"],
  "suggestedTags":  ["tag1", "tag2"],
  "contentSummary": "1-2 sentence description of what this asset contains"
}

Use lowercase hyphenated slugs for topics. Only include schemes you are confident about.`;
}
