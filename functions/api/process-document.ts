/**
 * POST /api/process-document
 *
 * Fetches an uploaded vault document from R2 and extracts structured
 * intelligence using the vault AI router (Gemini → Bedrock → Anthropic).
 *
 * Upload status is ALWAYS independent of this function. A document is safe
 * in R2 regardless of whether AI analysis succeeds.
 *
 * Response codes:
 *   200  ok: true  + intelligence JSON     — AI succeeded
 *   402  BILLING_EXHAUSTED                 — all providers hit quota; retry after top-up
 *   503  AI_UNAVAILABLE / NO_PROVIDERS     — provider error or no keys configured
 *   500  internal errors                   — fetch failure, parse failure, etc.
 *
 * The CLIENT writes results to Firestore — this function only returns data.
 * Failure responses include `processingStatus` so the client knows which
 * Firestore state to set without parsing error messages.
 */

import { routeDocumentAnalysis }  from "../../lib/ai/vault-router";
import { log }                    from "./_shared";
import type { RouterEnv }         from "../../lib/ai/vault-router";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Env extends RouterEnv {
  // RouterEnv already covers all AI provider vars; nothing extra needed here.
}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface ProcessRequest {
  docId:       string;
  downloadUrl: string;
  mimeType:    string;
  fileName:    string;
}

interface IntelligenceResult {
  aiSummary:             string;
  aiKeyInsights:         string[];
  detectedTopics:        string[];
  contentIdeas:          string[];
  language:              string;
  confidence:            number;
  // Civic intelligence fields
  sourceType?:           string;
  sourceAuthority?:      string;
  affectedSectors?:      string[];
  policyChanges?:        string[];
  financialImplications?:string[];
  youthImpact?:          string;
  ssfEpfCitRelevance?:   string;
  nepaliExplainer?:      string;
}

// ── Constants ──────────────────────────────────────────────────────────────────

// Cost per 1M tokens (USD) — used for per-call cost estimation logged to Firestore
const PROVIDER_RATES: Record<string, { input: number; output: number }> = {
  "gemini-flash":    { input: 0.10,  output: 0.40  },
  "bedrock-sonnet":  { input: 0.80,  output: 4.00  },
  "anthropic-sonnet":{ input: 0.80,  output: 4.00  },
};

// Rough token estimator: 1 token ≈ 4 chars (English). Add system prompt overhead.
function estimateTokens(contentByteLen: number, systemPromptLen: number): { input: number; output: number } {
  const inputChars  = systemPromptLen + contentByteLen;
  const input       = Math.ceil(inputChars / 4);
  const output      = 800; // typical structured JSON response
  return { input, output };
}

function estimateCostUSD(provider: string, input: number, output: number): number {
  const rate = PROVIDER_RATES[provider] ?? { input: 1.0, output: 5.0 };
  return (input / 1_000_000) * rate.input + (output / 1_000_000) * rate.output;
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const MAX_BYTES    = 30 * 1024 * 1024;  // 30 MB
const TEXT_MIMES   = new Set(["text/plain", "text/markdown", "text/x-markdown"]);

const SYSTEM_PROMPT = `You are Nepal's premier AI intelligence analyst for ZZC — the country's only AI-native financial and civic intelligence platform for Gen Z (age 18–35, salary NPR 30k–150k/month).

Your job: extract structured intelligence from government, financial, and policy documents relevant to young Nepali workers and investors.

FOCUS AREAS:
- NRB (Nepal Rastra Bank) monetary policy, interest rate changes, bank directives
- EPF/SSF/CIT: contribution rates, interest rates (EPF currently 8.5%), loan limits
- Nepal government budget, tax policy, savings/investment rules
- Parliament bills affecting workers, youth, housing, financial markets
- NEPSE, SEBON: IPO rules, mutual fund regulations, capital market policy
- Housing loan limits, education loan, margin lending rules

OFFICIAL SOURCES (classify as official when document is from):
nrb.org.np, epf.gov.np, ssf.gov.np, sebon.gov.np, ird.gov.np, mof.gov.np,
parliament.gov.np, oag.gov.np, rajpatra.gov.np, customs.gov.np, nlc.gov.np

Return ONLY valid JSON — no markdown, no explanation, nothing outside the JSON:
{
  "aiSummary": "३ वाक्यमा नेपालीमा। वाक्य १: यो कागजात के हो। वाक्य २: मुख्य परिवर्तन वा नीति विवरण सङ्ख्यासहित। वाक्य ३: महिना रु ५०,००० कमाउने २५ वर्षीय नेपालीलाई प्रत्यक्ष असर।",
  "aiKeyInsights": [
    "सङ्ख्या/प्रतिशत/रकम/मिति सहितको तथ्य — सरल नेपालीमा",
    "तथ्य २ — सधैं सङ्ख्या समावेश गर्नुहोस्",
    "तथ्य ३",
    "तथ्य ४",
    "तथ्य ५"
  ],
  "detectedTopics": ["EPF", "ब्याजदर", "आवास ऋण"],
  "language": "Nepali or English or Mixed",
  "confidence": 0.0,
  "sourceType": "official or unofficial or research or unknown",
  "sourceAuthority": "Nepal Rastra Bank or Parliament of Nepal or Ministry of Finance or EPF Nepal or SSF Nepal or SEBON or Other — exact institution name",
  "affectedSectors": ["banking", "EPF", "housing", "youth employment", "NEPSE"],
  "policyChanges": [
    "नेपालीमा: के परिवर्तन भयो — अघिल्लो र नयाँ व्यवस्था सहित",
    "परिवर्तन २"
  ],
  "financialImplications": [
    "रु/प्रतिशत रकम सन्दर्भसहित (जस्तै: EPF आवास ऋण सीमा रु ३० लाख पुग्यो)",
    "निहितार्थ २"
  ],
  "youthImpact": "२३-३० वर्षका नेपाली युवा कामदारलाई कसरी असर पर्छ भनी नेपालीमा एक अनुच्छेद (३-४ वाक्य)। समावेश गर्नुहोस्: फाइदा/बेफाइदा, के कदम चाल्ने, कुनै deadline छ भने।",
  "ssfEpfCitRelevance": "नेपालीमा एक अनुच्छेद: SSF, EPF, वा CIT सम्बन्धी विशेष निहितार्थ। सम्बन्धित नभएमा लेख्नुहोस्: SSF/EPF/CIT सँग प्रत्यक्ष सम्बन्ध छैन।",
  "nepaliExplainer": "सरल नेपालीमा २-३ वाक्यमा: के भयो, किन महत्त्वपूर्ण छ, युवाहरूलाई के गर्नुपर्छ।",
  "contentIdeas": [
    "YouTube: [specific video title from this document's actual data]",
    "Short: [15-60 second reel concept from this document]",
    "Post: [Facebook/Instagram Nepali explainer concept]"
  ]
}

RULES:
- aiKeyInsights: नेपालीमा लेख्नुहोस् — specific numbers, NPR amounts, %, dates — NEVER generic statements
- aiSummary, youthImpact, ssfEpfCitRelevance, policyChanges, financialImplications: सबै नेपालीमा
- contentIdeas: specific to THIS document's actual data, not generic Nepal finance
- confidence: 0.95 = official primary source with clear data; 0.7 = useful secondary; 0.3 = not finance-relevant
- sourceType "official" only for documents from NRB, EPF, SSF, MoF, Parliament, SEBON, IRD, or Nepal government gazette
- If document is not finance/policy relevant: confidence ≤ 0.3, sourceType = "unknown", minimal other fields
- nepaliExplainer: must be actual Nepali text, not English. Simple language a student can understand.
- policyChanges and financialImplications: empty array [] if not applicable`;

// ── Helpers ────────────────────────────────────────────────────────────────────

function toBase64(buffer: ArrayBuffer): string {
  const bytes  = new Uint8Array(buffer);
  let binary   = "";
  const chunk  = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function parseIntelligence(text: string): IntelligenceResult | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]) as IntelligenceResult; } catch { return null; }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// ── Handlers ───────────────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  // ── Parse request ──────────────────────────────────────────────────────────
  let body: ProcessRequest;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "Invalid JSON body", code: "BAD_REQUEST" }, 400);
  }

  const { docId, downloadUrl, mimeType, fileName } = body;
  if (!downloadUrl || !mimeType || !fileName) {
    return json({ error: "downloadUrl, mimeType, fileName required", code: "VALIDATION_ERROR" }, 400);
  }

  // ── Fetch file from R2 ─────────────────────────────────────────────────────
  // Total budget: CF Pages Functions have a ~30s wall-clock timeout.
  // We abort after 25s so we can return a clean error instead of being killed silently.
  const abort   = new AbortController();
  const abortId = setTimeout(() => abort.abort(), 25_000);

  let fileRes: Response;
  try {
    fileRes = await fetch(downloadUrl, { signal: abort.signal });
    if (!fileRes.ok) throw new Error(`R2 returned HTTP ${fileRes.status}`);
  } catch (err) {
    clearTimeout(abortId);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return json({
      error:            isTimeout
        ? "Request timeout — document is safe. Large PDFs (>500KB) can take up to 30s. Retry using the button on the card."
        : `Could not fetch document: ${String(err)}`,
      code:             isTimeout ? "TIMEOUT" : "FETCH_ERROR",
      processingStatus: "ai_paused",
    }, isTimeout ? 504 : 500);
  }
  clearTimeout(abortId);

  // ── Build DocumentPayload ──────────────────────────────────────────────────
  const isText = TEXT_MIMES.has(mimeType);
  let textBody: string | undefined;
  let base64:   string | undefined;

  if (isText) {
    textBody = (await fileRes.text()).slice(0, 80_000);
  } else {
    const buf = await fileRes.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      return json({ error: `File too large (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB). Max 15 MB.`, code: "FILE_TOO_LARGE" }, 413);
    }
    base64 = toBase64(buf);
  }

  // ── Route to AI provider ───────────────────────────────────────────────────
  const result = await routeDocumentAnalysis(
    context.env,
    SYSTEM_PROMPT,
    { mimeType, fileName, textBody, base64 },
    4096,
  );

  if (!result.ok) {
    log("process-document", "ai_failed", {
      docId,
      reason:    result.reason,
      tried:     result.tried,
      lastError: result.lastError,
    });

    const isBilling = result.reason === "billing_exhausted";
    const code      = isBilling ? "BILLING_EXHAUSTED" : result.reason === "no_providers" ? "NO_PROVIDERS" : "AI_UNAVAILABLE";
    const status    = isBilling ? 402 : 503;

    const errorMsg = isBilling
      ? "Document uploaded successfully. AI analysis paused — all providers have exhausted their quota/credits. Top up at console.anthropic.com/billing or add a GEMINI_API_KEY. Upload सफल भयो तर AI analysis रोकिएको छ।"
      : result.reason === "no_providers"
        ? "No AI provider is configured. Add GEMINI_API_KEY (recommended), AWS credentials for Bedrock, or ANTHROPIC_API_KEY in Cloudflare Pages env vars."
        : `Document uploaded. AI analysis temporarily unavailable (tried: ${result.tried.join(", ")}). Retry in a few minutes.`;

    return json({
      error:            errorMsg,
      code,
      processingStatus: "ai_paused",
      tried:            result.tried,
      details:          result.lastError.slice(0, 300),
    }, status);
  }

  // ── Parse AI response ──────────────────────────────────────────────────────
  const intelligence = parseIntelligence(result.text);
  if (!intelligence) {
    log("process-document", "parse_error", { docId, provider: result.provider, preview: result.text.slice(0, 100) });
    return json({
      error:      "AI returned unparseable response. Retry.",
      code:       "AI_PARSE_ERROR",
      rawPreview: result.text.slice(0, 400),
    }, 500);
  }

  // Estimate cost for Firestore bookkeeping (client writes the log entry)
  const contentLen    = textBody ? textBody.length : (base64 ? Math.ceil(base64.length * 0.75) : 0);
  const { input: estInput, output: estOutput } = estimateTokens(contentLen, SYSTEM_PROMPT.length);
  const estCostUSD    = estimateCostUSD(result.provider, estInput, estOutput);

  log("process-document", "ok", {
    docId,
    provider:    result.provider,
    model:       result.model,
    retries:     result.retries,
    confidence:  intelligence.confidence,
    estCostUSD:  estCostUSD.toFixed(6),
  });

  return json({
    ok:              true,
    provider:        result.provider,
    model:           result.model,
    retries:         result.retries,
    estInputTokens:  estInput,
    estOutputTokens: estOutput,
    estCostUSD,
    ...intelligence,
  }, 200);
};
