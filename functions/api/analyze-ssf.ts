/**
 * POST /api/analyze-ssf
 *
 * SSF Statement Copilot — founder-only personal finance tool.
 *
 * Accepts a base64-encoded SSF statement (PDF or image) and returns:
 *   - contribution history with months and amounts
 *   - detected missing months
 *   - total contributions
 *   - recommendations
 *
 * Uses vault-router (Gemini → Bedrock → Anthropic) for provider resilience.
 * No passwords stored. No auto-transactions. Read-only analysis only.
 */

import { routeDocumentAnalysis } from "../../lib/ai/vault-router";
import { log }                   from "./_shared";
import type { RouterEnv }        from "../../lib/ai/vault-router";

interface Env extends RouterEnv {}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface SSFRequest {
  base64:   string;
  mimeType: string;
  fileName: string;
}

interface SSFContribution {
  month:          string;   // "2080-Baisakh" or "2024-04"
  employeeAmount: number;   // NPR
  employerAmount: number;   // NPR
  total:          number;   // NPR
}

interface SSFAnalysis {
  memberName?:          string;
  memberId?:            string;
  employerName?:        string;
  contributions:        SSFContribution[];
  missingMonths:        string[];
  totalEmployee:        number;
  totalEmployer:        number;
  totalAccumulated:     number;
  contributionPeriod:   string;   // e.g. "Baisakh 2079 – Chaitra 2080"
  monthsContributed:    number;
  recommendations:      string[];
  nepaliSummary:        string;   // सरल नेपालीमा सारांश
  warnings:             string[];
  confidence:           number;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const SYSTEM_PROMPT = `You are Nepal's SSF (Social Security Fund) statement analyst for ZZC — a personal finance copilot for young Nepali workers.

Your job: extract and analyze SSF contribution data from statement documents.

SSF BASICS:
- Employee contributes: 11% of basic salary
- Employer contributes: 20% of basic salary
- Total monthly contribution: 31% of basic salary
- Eligible for housing loan, medical, pension after qualifying period
- Administered by Social Security Fund Nepal (ssf.gov.np)

Extract ALL contribution records you can find. Return ONLY valid JSON:
{
  "memberName": "full name from statement or null",
  "memberId": "SSF member ID or null",
  "employerName": "employer name or null",
  "contributionPeriod": "first month – last month (e.g. Baisakh 2079 – Chaitra 2080)",
  "monthsContributed": 0,
  "contributions": [
    {
      "month": "YYYY-MonthName or BS month name + year",
      "employeeAmount": 0,
      "employerAmount": 0,
      "total": 0
    }
  ],
  "missingMonths": ["months with 0 contribution or gaps in sequence"],
  "totalEmployee": 0,
  "totalEmployer": 0,
  "totalAccumulated": 0,
  "recommendations": [
    "specific actionable recommendation based on the contribution history",
    "recommendation 2"
  ],
  "nepaliSummary": "सरल नेपालीमा: कति महिना योगदान, कुल रकम, के गर्नुपर्छ — २-३ वाक्यमा",
  "warnings": ["any gaps, discrepancies, or concerns found in the statement"],
  "confidence": 0.0
}

RULES:
- contributions: every row you can read — don't skip any
- missingMonths: months where the statement shows 0 or a gap in the sequence
- totalAccumulated: sum of all employee + employer contributions (and interest if shown)
- recommendations: specific and actionable (e.g. "You qualify for EPF housing loan after X months", "File for missing month contributions at ssf.gov.np")
- confidence: 0.9 = clear statement with all data; 0.5 = partial data readable; 0.1 = not an SSF document
- nepaliSummary: actual Nepali text, simple language`;

function parseAnalysis(text: string): SSFAnalysis | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as SSFAnalysis; } catch { return null; }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  let body: SSFRequest;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, 400);
  }

  const { base64, mimeType, fileName } = body;
  if (!base64 || !mimeType || !fileName) {
    return json({ error: "base64, mimeType, fileName required", code: "VALIDATION_ERROR" }, 400);
  }

  const result = await routeDocumentAnalysis(
    context.env,
    SYSTEM_PROMPT,
    { mimeType, fileName, base64 },
    2048,
  );

  if (!result.ok) {
    const isBilling = result.reason === "billing_exhausted";
    return json({
      error:  isBilling
        ? "AI analysis paused — provider quota exhausted. Retry tomorrow or top up at console.anthropic.com/billing."
        : `AI unavailable (tried: ${result.tried.join(", ")}). Retry in a few minutes.`,
      code:   isBilling ? "BILLING_EXHAUSTED" : "AI_UNAVAILABLE",
    }, isBilling ? 402 : 503);
  }

  const analysis = parseAnalysis(result.text);
  if (!analysis) {
    log("analyze-ssf", "parse_error", { provider: result.provider, preview: result.text.slice(0, 100) });
    return json({ error: "AI returned unparseable response. Retry.", code: "AI_PARSE_ERROR" }, 500);
  }

  log("analyze-ssf", "ok", {
    provider:   result.provider,
    model:      result.model,
    months:     analysis.monthsContributed,
    confidence: analysis.confidence,
  });

  return json({ ok: true, provider: result.provider, model: result.model, ...analysis }, 200);
};
