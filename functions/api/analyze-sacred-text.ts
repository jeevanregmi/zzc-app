/**
 * POST /api/analyze-sacred-text
 *
 * Analyzes an uploaded sacred text and generates spiritual intelligence suggestions.
 *
 * Input:  { text: SacredText, characters: SpiritualCharacter[] (with ids) }
 * Output: { suggestions: SuggestionPayload[], tokensUsed: number }
 *
 * Cost guard: caller must check for existing suggestions before calling.
 * AI recommends — founder decides. Nothing writes to Firestore here.
 */

import { callGemini, GeminiCallError } from "../../lib/ai/providers/gemini";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:   string;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface TextInput {
  title:             { nepali?: string; sanskrit?: string };
  textType:          string;
  tradition:         string;
  authorName?:       string;
  scriptureRef?:     string;
  originalText:      string;
  primaryCharacterId?: string;
}

interface CharacterInput {
  id:              string;
  icon?:           string;
  primaryName:     { nepali?: string; sanskrit?: string };
  primaryTradition:string;
}

interface RequestBody {
  text:       TextInput;
  characters: CharacterInput[];
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// ── Prompt builder ─────────────────────────────────────────────────────────────

function buildPrompt(body: RequestBody): string {
  const { text, characters } = body;
  const title = text.title.nepali ?? text.title.sanskrit ?? "Unknown";

  const charList = characters.length > 0
    ? characters.map(c =>
        `  - id: "${c.id}" | icon: ${c.icon ?? "✦"} | name: "${c.primaryName.nepali ?? c.primaryName.sanskrit}" | tradition: ${c.primaryTradition}`,
      ).join("\n")
    : "  (no characters seeded yet — skip character_enrichment and character_relationship types)";

  return `Analyze this sacred devotional text for a spiritual intelligence database.

Title: ${title}
Type: ${text.textType}
Tradition: ${text.tradition}
Author: ${text.authorName ?? "Unknown"}
Scripture: ${text.scriptureRef ?? "Unknown"}

Original text:
---
${text.originalText}
---

Characters in the database (use EXACT IDs):
${charList}

Generate suggestions as a JSON array. Each object must have a "type" field.

VALID TYPES AND SCHEMAS:

shloka_atom — extract a meaningful verse as an intelligence atom:
{ "type": "shloka_atom", "originalLine": <Sanskrit/Hindi line>, "nepaliMeaning": <Nepali meaning>, "keyTerms": [<Sanskrit terms>], "devotionalEmotion": <one of: shanta/dasya/sakhya/vatsalya/madhurya/vira/rudra/karuna/adbhuta> }

sanskrit_term — a theological/philosophical term from THIS text worth adding to dictionary:
{ "type": "sanskrit_term", "term": <Sanskrit word>, "nepaliMeaning": <Nepali meaning>, "philosophicalConcept": <concept in English> }

character_enrichment — enrich an EXISTING character with qualities/symbols from this text:
{ "type": "character_enrichment", "characterId": <exact id from list>, "characterName": <name>, "field": <one of: epithets/symbols/moods/keyShlokas/mantras>, "valueList": [<values to add>] }

character_relationship — a relationship this text reveals between two EXISTING characters:
{ "type": "character_relationship", "fromId": <exact id>, "fromName": <name>, "toId": <exact id>, "toName": <name>, "relationType": <one of: teaches/loves/embodies/created/destroyed/blesses/incarnation_of/reveals/companion_of/composed/participated_in/set_in/opposes>, "contextNote": <Nepali context note from this text> }

RULES:
- Return ONLY a JSON array. No markdown. No explanation. Start with [ end with ].
- 4-10 suggestions. Quality over quantity.
- Only use character IDs from the list above for enrichment/relationship types.
- Nepali meanings should be authentic, rooted in the Sanskrit etymology of THIS specific text.
- shloka_atom: pick the most potent, theologically significant lines.
- sanskrit_term: only terms that appear in THIS text and carry real semantic weight.
- If no characters are seeded, return only shloka_atom and sanskrit_term suggestions.`;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { request, env } = context;
  const apiKey = env.GEMINI_API_KEY ?? "";

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured" }),
      { status: 500, headers: CORS },
    );
  }

  let body: RequestBody;
  try {
    body = await request.json() as RequestBody;
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: CORS },
    );
  }

  if (!body?.text?.originalText?.trim()) {
    return new Response(
      JSON.stringify({ error: "originalText is required" }),
      { status: 400, headers: CORS },
    );
  }

  try {
    const result = await callGemini({
      apiKey,
      model:     env.GEMINI_MODEL,
      system:    "You are a sacred text analysis AI for a Sanskrit-Nepali devotional intelligence system. Return ONLY valid JSON arrays. No markdown. No explanation. Start with [ end with ].",
      parts:     [{ text: buildPrompt(body) }],
      maxTokens: 4096,
      jsonMode:  true,
    });

    // Parse JSON — strip any stray markdown fences
    const cleaned = result.text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let suggestions: unknown[];
    try {
      const parsed = JSON.parse(cleaned) as unknown;
      suggestions = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn("[analyze-sacred-text] parse failed:", cleaned.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "AI returned unparseable JSON", raw: cleaned.slice(0, 400) }),
        { status: 422, headers: CORS },
      );
    }

    return new Response(
      JSON.stringify({ suggestions, tokensUsed: result.inputTokens + result.outputTokens }),
      { status: 200, headers: CORS },
    );

  } catch (err) {
    if (err instanceof GeminiCallError) {
      const isQuota = err.code === "quota_exceeded";
      return new Response(
        JSON.stringify({ error: isQuota ? "Gemini quota exceeded — try again later" : err.message }),
        { status: isQuota ? 429 : 500, headers: CORS },
      );
    }
    console.error("[analyze-sacred-text]", err);
    return new Response(
      JSON.stringify({ error: "AI analysis failed" }),
      { status: 500, headers: CORS },
    );
  }
};
