/**
 * POST /api/match-intelligence
 *
 * The Relationship Matching Engine — the core of Nepal's civic memory graph.
 *
 * Takes newly extracted intelligence records + existing records from prior
 * documents and uses Gemini to detect semantic relationships between them:
 * same commitments across years, budget allocations for projects, progress
 * updates, contradictions, escalations, follow-ups.
 *
 * This turns isolated records into a connected governance knowledge graph.
 * Relationships persist in janta_relationships and define the long-term moat.
 *
 * Input:
 *   newRecords[]     — just extracted from current document (max 30)
 *   candidates[]     — existing records from prior documents (max 40)
 *   sourceDocId      — current document ID
 *   sourceDocTitle   — current document title
 *   ownerId
 *
 * Output:
 *   { ok, relationships[], totalMatched }
 */

import { callGemini } from "../../lib/ai/providers/gemini";
import { CORS, extractJson, log, clientError, internalError } from "./_shared";

interface Env { GEMINI_API_KEY: string; }
interface PagesContext { request: Request; env: Env; }

interface RecordSummary {
  id:             string;
  type:           string;
  title:          string;
  titleNepali?:   string;
  sector:         string;
  ministry:       string;
  target?:        string;
  timeline?:      string;
  budgetAmount?:  string;
  fiscalYear?:    string;
  sourceDocTitle?: string;
}

interface MatchRequest {
  newRecords:     RecordSummary[];
  candidates:     RecordSummary[];
  sourceDocId:    string;
  sourceDocTitle: string;
  ownerId:        string;
}

interface RelationshipResult {
  fromId:           string;
  toId:             string;
  fromTitle:        string;
  toTitle:          string;
  relationshipType: string;
  confidence:       number;
  explanation:      string;
}

function slim(r: RecordSummary): Record<string, unknown> {
  return {
    id:       r.id,
    type:     r.type,
    title:    r.title,
    sector:   r.sector,
    ministry: r.ministry,
    ...(r.target        ? { target:      r.target      } : {}),
    ...(r.timeline      ? { timeline:    r.timeline    } : {}),
    ...(r.budgetAmount  ? { budget:      r.budgetAmount } : {}),
    ...(r.fiscalYear    ? { fiscalYear:  r.fiscalYear  } : {}),
    ...(r.sourceDocTitle ? { doc:        r.sourceDocTitle } : {}),
  };
}

function buildPrompt(body: MatchRequest): string {
  const newSlim      = body.newRecords.map(slim);
  const candidateSlim = body.candidates.map(slim);

  return `तपाईं ZZC Janta को civic intelligence relationship engine हुनुहुन्छ।
Nepal सरकारको governance records बीच meaningful relationships पत्ता लगाउनुस्।

NEW RECORDS (just extracted from "${body.sourceDocTitle}"):
${JSON.stringify(newSlim, null, 2)}

EXISTING RECORDS (from prior documents — potential matches):
${JSON.stringify(candidateSlim, null, 2)}

यी दुई sets बीच semantic relationships खोज्नुस्।

RELATIONSHIP TYPES:
- "same_commitment": same promise/project from a different document or year
- "funding_for": one record is a budget allocation that funds another
- "progress_update": one record shows implementation progress for another commitment
- "contradiction": newer action reverses, reduces, or contradicts a prior commitment
- "escalation": expanded scope or higher target for the same commitment
- "follow_up": next phase or continuation of a prior commitment
- "context": provides the policy basis or background for another record
- "dependency": one must happen before the other can proceed

MATCHING RULES:
- Only match NEW records to EXISTING records (not new-to-new pairs)
- Only return pairs with confidence > 0.65
- Prioritize sector + ministry + target similarity
- Budget allocations often "fund_for" projects in the same sector
- Same numerical targets across years = "same_commitment" or "escalation"
- Implementation reports "progress_update" matching prior promises
- Maximum 25 relationships total
- Each fromId must be from NEW records, each toId from EXISTING records

Return ONLY valid JSON:
{
  "relationships": [
    {
      "fromId": "new-record-id",
      "toId": "existing-record-id",
      "fromTitle": "School Internet Expansion",
      "toTitle": "Digital Schools Program 2082",
      "relationshipType": "same_commitment",
      "confidence": 0.87,
      "explanation": "Both target rural school internet connectivity — 2083 version expands 2082 commitment from 5000 to 10000 schools"
    }
  ],
  "matchSummary": "brief summary of what types of relationships were found"
}`;
}

const VALID_TYPES = new Set([
  "same_commitment", "funding_for", "progress_update",
  "contradiction", "escalation", "follow_up", "context", "dependency",
]);

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  if (!context.env.GEMINI_API_KEY) {
    return clientError("GEMINI_API_KEY not configured", 503, "NO_PROVIDERS");
  }

  let body: MatchRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.newRecords?.length || !body.candidates?.length || !body.ownerId) {
    return clientError("newRecords, candidates, ownerId required", 400, "VALIDATION_ERROR");
  }

  // Cap to avoid token limits
  const newSlice       = body.newRecords.slice(0, 30);
  const candidateSlice = body.candidates.slice(0, 40);

  // Build ID → title lookup for validation
  const newIds      = new Set(newSlice.map(r => r.id));
  const existingIds = new Set(candidateSlice.map(r => r.id));

  log("match-intelligence", "start", {
    newCount:       newSlice.length,
    candidateCount: candidateSlice.length,
    sourceDocId:    body.sourceDocId,
  });

  try {
    const result = await callGemini({
      apiKey:    context.env.GEMINI_API_KEY,
      system:    "You are a civic intelligence relationship engine for Nepal's national governance memory graph. Find semantic relationships between government records across documents and years. Return only valid JSON.",
      parts:     [{ text: buildPrompt({ ...body, newRecords: newSlice, candidates: candidateSlice }) }],
      maxTokens: 4096,
      jsonMode:  true,
    });

    const [parsed, parseErr] = extractJson(result.text);
    if (parseErr || !parsed) {
      log("match-intelligence", "parse_error", { preview: result.text.slice(0, 200) });
      // Non-fatal — return empty relationships rather than error
      return new Response(
        JSON.stringify({ ok: true, relationships: [], totalMatched: 0, parseError: true }),
        { headers: CORS },
      );
    }

    const data = parsed as { relationships: RelationshipResult[]; matchSummary?: string };
    const rawRels = data.relationships ?? [];

    // Validate: fromId must be new, toId must be existing, type must be valid
    const validated = rawRels.filter(r =>
      newIds.has(r.fromId) &&
      existingIds.has(r.toId) &&
      VALID_TYPES.has(r.relationshipType) &&
      typeof r.confidence === "number" &&
      r.confidence >= 0.65
    );

    log("match-intelligence", "ok", {
      raw:       rawRels.length,
      validated: validated.length,
      model:     result.model,
    });

    return new Response(
      JSON.stringify({
        ok:           true,
        relationships: validated,
        totalMatched:  validated.length,
        matchSummary:  data.matchSummary ?? "",
      }),
      { headers: CORS },
    );

  } catch (err) {
    log("match-intelligence", "error", { err: String(err) });
    return internalError(err);
  }
};
