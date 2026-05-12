/**
 * POST /api/process-document
 *
 * Vault-only endpoint. Fetches an uploaded intelligence document from Firebase
 * Storage, sends it to Claude for analysis, and returns structured intelligence.
 *
 * The CLIENT is responsible for writing results back to Firestore via
 * updateIntelligenceDoc — this function only returns the extracted data.
 *
 * Supported formats: PDF, images (jpeg/png/webp/gif), TXT, MD
 * Max file size: 15 MB
 *
 * Required Cloudflare Pages env var: ANTHROPIC_API_KEY
 * Set at: Pages dashboard → Settings → Environment variables
 *
 * Uses direct Anthropic API (not AWS Bedrock) because Bedrock's InvokeModel
 * endpoint does not support the PDF document content type.
 */

interface Env {
  ANTHROPIC_API_KEY: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface ProcessRequest {
  docId:       string;
  downloadUrl: string;
  mimeType:    string;
  fileName:    string;
}

interface IntelligenceResult {
  aiSummary:       string;
  aiKeyInsights:   string[];
  detectedTopics:  string[];
  contentIdeas:    string[];
  language:        string;
  confidence:      number;
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const MODEL        = "claude-sonnet-4-6";
const MAX_BYTES    = 15 * 1024 * 1024;  // 15 MB
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// ─── base64 helper (Cloudflare Workers — no Buffer) ──────────────────────────

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary  = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ─── Intelligence extraction prompt ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are an intelligence analyst for ZZC (Zeneration Z Chautari), Nepal's only AI-native fintech intelligence platform for Gen Z investors (age 18–35).

Your job: extract actionable intelligence from documents relevant to young Nepali investors.

Focus areas:
- Interest rate changes: EPF (currently 8.5%), SSF contributions, CIT returns, NRB policy rate
- Policy changes affecting workers' savings: EPF/SSF/CIT regulations
- Nepal government budget implications (tax, savings, investment rules)
- NEPSE market data, IPO regulations, mutual fund updates
- NRB monetary policy decisions and their impact on personal finance
- Loan limit changes: EPF housing loan, SSF education loan, bank lending limits

Return ONLY valid JSON — no markdown fences, no explanation text, nothing before or after the JSON:
{
  "aiSummary": "3 clear sentences. What happened. Why it matters for a 25-year-old Nepali investor.",
  "aiKeyInsights": ["specific fact with number/percentage/date", "fact 2", "fact 3", "fact 4", "fact 5"],
  "detectedTopics": ["EPF", "interest rate", "housing loan"],
  "language": "Nepali or English or Mixed",
  "confidence": 0.0,
  "contentIdeas": [
    "YouTube: [specific video title based on this document]",
    "Short: [15–60 second reel concept from this document]",
    "Post: [Facebook/Instagram explainer concept from this document]"
  ]
}

Rules:
- aiKeyInsights must contain specific numbers, percentages, dates, or named amounts from the document — never generic statements
- contentIdeas must reference content specific to THIS document's actual data, not generic Nepal finance
- confidence: 0.9 = clear primary source with data; 0.5 = useful but partial; 0.1 = not readable or not finance-related
- If document is not relevant to Nepal finance/investment, set confidence ≤ 0.3 and note it in aiSummary
- aiSummary in English (for the admin dashboard); content ideas can be in English or Nepali`;

// ─── Build message content blocks by file type ───────────────────────────────

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

function buildContent(
  mimeType: string,
  fileName: string,
  base64OrText: string,
  isText: boolean,
): ContentBlock[] {
  const prompt: ContentBlock = { type: "text", text: SYSTEM_PROMPT };

  if (isText) {
    return [
      {
        type: "text",
        text: `${SYSTEM_PROMPT}\n\n--- DOCUMENT CONTENT ---\nFile: ${fileName}\n\n${base64OrText}`,
      },
    ];
  }

  if (mimeType === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64OrText },
      },
      prompt,
    ];
  }

  // Image types
  const imageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (imageTypes.includes(mimeType)) {
    return [
      {
        type: "image",
        source: { type: "base64", media_type: mimeType, data: base64OrText },
      },
      {
        type: "text",
        text: `${SYSTEM_PROMPT}\n\nThis is an image file named "${fileName}". Extract any visible text and financial data.`,
      },
    ];
  }

  // Unsupported binary format — give Claude the filename context only
  return [
    {
      type: "text",
      text: `${SYSTEM_PROMPT}\n\nFile: "${fileName}" (${mimeType}) — binary format not directly readable. Based on the filename and extension alone, provide a best-effort analysis. Set confidence to 0.2.`,
    },
  ];
}

// ─── Request handlers ─────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured. Add it to Cloudflare Pages env vars." }),
      { status: 500, headers: CORS },
    );
  }

  let body: ProcessRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS });
  }

  const { downloadUrl, mimeType, fileName } = body;
  if (!downloadUrl || !mimeType || !fileName) {
    return new Response(
      JSON.stringify({ error: "downloadUrl, mimeType, fileName required" }),
      { status: 400, headers: CORS },
    );
  }

  // ── Fetch file from Firebase Storage ──────────────────────────────────────
  let fileResponse: Response;
  try {
    fileResponse = await fetch(downloadUrl);
    if (!fileResponse.ok) throw new Error(`Storage fetch ${fileResponse.status}`);
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Could not fetch file: ${String(err)}` }),
      { status: 502, headers: CORS },
    );
  }

  const contentLength = Number(fileResponse.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BYTES) {
    return new Response(
      JSON.stringify({ error: `File too large (${(contentLength / 1024 / 1024).toFixed(1)} MB). Max 15 MB.` }),
      { status: 413, headers: CORS },
    );
  }

  // ── Determine text vs binary ───────────────────────────────────────────────
  const isText = mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/x-markdown";

  let contentBlocks: ContentBlock[];

  if (isText) {
    const text = await fileResponse.text();
    contentBlocks = buildContent(mimeType, fileName, text.slice(0, 80_000), true);
  } else {
    const buffer    = await fileResponse.arrayBuffer();
    const actualLen = buffer.byteLength;
    if (actualLen > MAX_BYTES) {
      return new Response(
        JSON.stringify({ error: `File too large (${(actualLen / 1024 / 1024).toFixed(1)} MB). Max 15 MB.` }),
        { status: 413, headers: CORS },
      );
    }
    const base64 = toBase64(buffer);
    contentBlocks = buildContent(mimeType, fileName, base64, false);
  }

  // ── Call Anthropic API ─────────────────────────────────────────────────────
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method:  "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":  "pdfs-2024-09-25",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 2048,
        messages:   [{ role: "user", content: contentBlocks }],
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Anthropic API unreachable: ${String(err)}` }),
      { status: 502, headers: CORS },
    );
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic error:", anthropicRes.status, errText);
    return new Response(
      JSON.stringify({ error: "AI service error. Check ANTHROPIC_API_KEY and try again." }),
      { status: 502, headers: CORS },
    );
  }

  const raw = (await anthropicRes.json()) as { content: Array<{ type: string; text: string }> };
  const text = raw.content?.[0]?.text?.trim() ?? "";

  // ── Parse JSON response ────────────────────────────────────────────────────
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ error: "Could not parse AI response", rawPreview: text.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  let result: IntelligenceResult;
  try {
    result = JSON.parse(jsonMatch[0]);
  } catch {
    return new Response(
      JSON.stringify({ error: "AI response was not valid JSON", rawPreview: text.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, ...result, model: MODEL }),
    { headers: CORS },
  );
};
