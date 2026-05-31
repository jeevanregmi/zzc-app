/**
 * POST /api/chunk-extract
 *
 * Extracts civic intelligence atoms from a specific page range.
 * Uses Gemini Files API (file_uri from /api/gemini-file-upload) — no PDF re-upload.
 * Each call = one chunk = one Cloudflare request, safely within 30s.
 *
 * Body: { fileUri, startPage, endPage, chunkIndex, totalChunks,
 *         docId, ownerId, docTitle, sourceYear?, domain? }
 * Returns: { ok, records, chunkIndex, startPage, endPage, totalFound, validFound }
 */

import { callGemini } from "../../lib/ai/providers/gemini";
import { CORS, clientError, extractJson, log } from "./_shared";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:   string;
}

interface ChunkRequest {
  fileUri:     string;
  startPage:   number;
  endPage:     number;
  chunkIndex:  number;
  totalChunks: number;
  docId:       string;
  ownerId:     string;
  docTitle:    string;
  sourceYear?: string;
  domain?:     string;
}

function buildChunkPrompt(req: ChunkRequest): string {
  return `You are a civic intelligence extractor for ZZC (Nepal civic platform).

Document: "${req.docTitle}"
Year: ${req.sourceYear ?? "unknown"}
Processing: Chunk ${req.chunkIndex + 1} of ${req.totalChunks} — pages ${req.startPage} to ${req.endPage} ONLY.

INSTRUCTION: Extract ONLY from pages ${req.startPage}–${req.endPage} of the attached PDF.
Do not extract from other pages. If a page is blank or image-only, skip it.

Extract EVERY specific, trackable item from those pages:
- Budget allocations with amounts (NPR/रु.)
- Named programs, projects, schemes with beneficiary counts
- Policy changes with specific conditions
- Targets with measurable figures (%, numbers, NPR)
- Named institutions, committees, bodies, ministries
- Employment/coverage/beneficiary figures
- Tax changes, subsidies, incentives with rates
- Implementation deadlines and timelines
- Statistical data (GDP, inflation, growth rates)
- Any new, continued, or discontinued policy

RECORD RULES:
- pageNumber MUST be between ${req.startPage} and ${req.endPage}
- textEvidence MUST be a verbatim quote from that exact page (max 400 chars)
- Reject any record you cannot trace to a specific page in this range
- Include every named item even if details are partial

Return ONLY this JSON (no markdown, no explanation):
{
  "records": [
    {
      "type": "budget_target|promise|project|institution|employment_target|social_program|reform|tax_policy|monetary_policy|other",
      "title": "concise English (5-8 words)",
      "titleNepali": "छोटो नेपाली शीर्षक",
      "summaryNepali": "नागरिकले बुझ्ने १-२ वाक्य",
      "sector": "education|health|agriculture|infrastructure|energy|finance|governance|employment|social|environment|digital|tourism|judiciary|other",
      "ministry": "exact ministry/body from document",
      "target": "exact figure or null",
      "measurable": true,
      "timeline": "deadline from document or null",
      "budgetAmount": "रु. X करोड/अर्ब or null",
      "fiscalYear": "${req.sourceYear ?? "unknown"}",
      "geoScope": "national|provincial|district|municipality",
      "governmentLevel": "federal|provincial|local",
      "tags": ["tag1", "tag2"],
      "confidence": 0.90,
      "affectedGroups": ["group1"],
      "affectedSectors": ["sector1"],
      "pageNumber": ${req.startPage},
      "textEvidence": "verbatim quote from the page (max 400 chars)",
      "paragraphIdx": 0
    }
  ]
}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: {
  request: Request;
  env:     Env;
}): Promise<Response> => {
  const { env } = context;

  if (!env.GEMINI_API_KEY?.trim()) {
    return clientError("GEMINI_API_KEY not configured", 503, "NO_GEMINI");
  }

  let body: ChunkRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.fileUri || !body.docId || body.startPage === undefined || body.endPage === undefined) {
    return clientError("fileUri, docId, startPage, endPage required", 400, "VALIDATION_ERROR");
  }

  log("chunk-extract", "start", {
    docId:  body.docId,
    chunk:  `${body.chunkIndex + 1}/${body.totalChunks}`,
    pages:  `${body.startPage}-${body.endPage}`,
  });

  const prompt = buildChunkPrompt(body);

  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        `Chunk ${body.chunkIndex + 1} timeout (27s) — pages ${body.startPage}-${body.endPage}`
      )), 27_000)
    );

    const result = await Promise.race([
      callGemini({
        apiKey:    env.GEMINI_API_KEY!,
        // gemini-2.0-flash: faster inference, lower latency for extraction tasks
        // Do NOT use env.GEMINI_MODEL here — 2.5-flash is too slow for per-chunk calls
        model:     "gemini-2.0-flash",
        system:    "You are a precise civic intelligence extractor. Return ONLY valid JSON. Every record MUST have pageNumber (in the requested range) and textEvidence (verbatim quote). No markdown. Start with { end with }.",
        parts: [
          { file_data: { mime_type: "application/pdf", file_uri: body.fileUri } },
          { text: prompt },
        ],
        maxTokens: 4096,
      }),
      timeout,
    ]);

    const responseText = result.text.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    const [parsed, parseErr] = extractJson(responseText);
    if (parseErr || !parsed) {
      return clientError(
        `Chunk ${body.chunkIndex + 1}: invalid JSON. Preview: "${responseText.slice(0, 200)}"`,
        422, "PARSE_ERROR",
      );
    }

    const data = parsed as { records?: unknown[] };
    const rawRecords = Array.isArray(data.records) ? data.records : [];

    // Filter: only keep records whose pageNumber falls within the requested range
    const validRecords = rawRecords.filter(r => {
      const rec = r as Record<string, unknown>;
      const pn = rec.pageNumber as number | null | undefined;
      if (pn === null || pn === undefined || pn < 1) return false;
      return pn >= body.startPage && pn <= body.endPage;
    });

    log("chunk-extract", "done", {
      docId:  body.docId,
      chunk:  body.chunkIndex + 1,
      raw:    rawRecords.length,
      valid:  validRecords.length,
      ms:     result.latencyMs,
    });

    return new Response(
      JSON.stringify({
        ok:         true,
        records:    validRecords,
        chunkIndex: body.chunkIndex,
        startPage:  body.startPage,
        endPage:    body.endPage,
        totalFound: rawRecords.length,
        validFound: validRecords.length,
        domain:     body.domain ?? "janta",
      }),
      { headers: CORS },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("chunk-extract", "error", { docId: body.docId, chunk: body.chunkIndex + 1, err: msg.slice(0, 200) });
    return clientError(`Chunk ${body.chunkIndex + 1} failed: ${msg}`, 500, "CHUNK_ERROR");
  }
};
