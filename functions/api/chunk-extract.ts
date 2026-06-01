/**
 * POST /api/chunk-extract
 *
 * EXHAUSTIVE paragraph-level extraction from a specific page range.
 * Philosophy: every paragraph → one raw atom. No filtering. No importance threshold.
 * "Extract important items" is wrong. "Convert every paragraph" is correct.
 *
 * Uses Gemini Files API (file_uri) — no PDF re-upload per chunk.
 * Raw atoms are classified later (Phase 3). Public routing happens after founder approval.
 *
 * Body: { fileUri, startPage, endPage, chunkIndex, totalChunks,
 *         docId, ownerId, docTitle, sourceYear? }
 * Returns: { ok, pages, chunkIndex, startPage, endPage, totalParagraphs }
 */

import { callGemini } from "../../lib/ai/providers/gemini";
import { CORS, clientError, extractJson, log } from "./_shared";

interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?:  string;
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
}

export interface RawParagraph {
  text:          string;
  summaryNepali: string;
  type:          string;
  orderIndex:    number;
  sectionTitle?: string;
  heading?:      string;
  subheading?:   string;
  isHeading?:    boolean;
}

export interface RawPage {
  pageNumber:  number;
  paragraphs:  RawParagraph[];
}

function buildExhaustivePrompt(req: ChunkRequest): string {
  return `You are a civic document intelligence extractor for ZZC Nepal — a public accountability platform.

Document: "${req.docTitle}"
Year: ${req.sourceYear ?? "unknown"}
Processing: Chunk ${req.chunkIndex + 1} of ${req.totalChunks} — pages ${req.startPage} to ${req.endPage} ONLY.

CORE RULE: Read EVERY paragraph, sentence, and line on EVERY page in this range.

DO NOT SKIP:
- Introduction, preamble, background, narrative prose
- Policy direction statements without numbers
- Ministry/institution name mentions
- Sector descriptions
- Program names and descriptions
- Any sentence that mentions citizens, benefits, or changes

DO NOT APPLY any importance filter. Do NOT ask "is this important enough?"
Every paragraph has civic meaning — even context-setting prose counts.

For EACH paragraph, extract:
- text: verbatim text from the page (max 350 characters)
- summaryNepali: one sentence — what does this mean for a citizen? (नागरिकको लागि)
- type: choose ONE from: budget_allocation | policy | program | institution | tax | revenue | promise | employment | social | infrastructure | macroeconomic | narrative | legal | other
- orderIndex: paragraph order on this page (0, 1, 2…)
- sectionTitle: the top-level section name this paragraph belongs to (e.g. "Part 3: Social Development"), empty string if none
- heading: the nearest heading above this paragraph (e.g. "Education Budget Allocation"), empty string if none
- subheading: the nearest subheading above this paragraph (e.g. "Secondary School Programs"), empty string if none
- isHeading: true if this paragraph IS itself a heading/title/section title, false otherwise

DOCUMENT STRUCTURE RULES:
- Every paragraph must carry the sectionTitle and heading from its context — even if they appeared on a previous page in this chunk
- If a paragraph is a heading, set isHeading: true and still include it as a paragraph (headings ARE atoms)
- Carry forward the last seen heading/subheading for every paragraph until a new one appears
- Budget documents: major sections like "Part 1", "Part 2", "Chapter 3" are sectionTitles
- Sub-sections like "Education", "Health", "Infrastructure" within a part are headings
- Program names or specific policy blocks within a heading are subheadings

STRICT RULES:
- pageNumber MUST be ${req.startPage} to ${req.endPage}
- Every page must appear in output with at least one paragraph
- Do NOT return empty paragraphs array for any page
- If a page only has headings or page numbers, still capture the heading as a paragraph with isHeading: true
- Do NOT skip a page because it "looks like" a blank or transition page

Return ONLY this JSON (no markdown, no explanation, start with {):
{
  "pages": [
    {
      "pageNumber": ${req.startPage},
      "paragraphs": [
        {
          "text": "verbatim text from the page",
          "summaryNepali": "नागरिकको लागि सरल अर्थ",
          "type": "narrative",
          "orderIndex": 0,
          "sectionTitle": "Part 1: Economic Overview",
          "heading": "Introduction",
          "subheading": "",
          "isHeading": false
        }
      ]
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
    docId: body.docId,
    chunk: `${body.chunkIndex + 1}/${body.totalChunks}`,
    pages: `${body.startPage}-${body.endPage}`,
  });

  const prompt = buildExhaustivePrompt(body);

  try {
    // 55s: CF network wait doesn't count against CPU time, so we can wait
    // much longer than 27s for Gemini OCR on chart/table-heavy scanned pages.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        `Chunk ${body.chunkIndex + 1} timeout (55s) — pages ${body.startPage}-${body.endPage}`
      )), 55_000)
    );

    const result = await Promise.race([
      callGemini({
        apiKey:    env.GEMINI_API_KEY!,
        model:     env.GEMINI_MODEL ?? "gemini-2.5-flash",
        system:    "You are an exhaustive civic document paragraph extractor. Every paragraph on every page must appear in output. No empty pages. No filtering. Return ONLY valid JSON. Start with { end with }. No markdown.",
        parts: [
          { file_data: { mime_type: "application/pdf", file_uri: body.fileUri } },
          { text: prompt },
        ],
        maxTokens: 8192,
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

    const data    = parsed as { pages?: unknown[] };
    const rawPages = Array.isArray(data.pages) ? data.pages : [];

    // Validate and normalise pages; restrict to requested range
    const validPages: RawPage[] = [];
    let totalParagraphs = 0;

    for (const p of rawPages) {
      const page = p as Record<string, unknown>;
      const pn   = Number(page.pageNumber);
      if (!pn || pn < body.startPage || pn > body.endPage) continue;

      const paragraphs: RawParagraph[] = Array.isArray(page.paragraphs)
        ? (page.paragraphs as Record<string, unknown>[])
            .filter(para => typeof para.text === "string" && (para.text as string).trim().length > 0)
            .map((para, idx) => ({
              text:          String(para.text ?? "").slice(0, 400),
              summaryNepali: String(para.summaryNepali ?? "").slice(0, 300),
              type:          String(para.type ?? "other"),
              orderIndex:    typeof para.orderIndex === "number" ? para.orderIndex : idx,
              sectionTitle:  String(para.sectionTitle ?? ""),
              heading:       String(para.heading ?? ""),
              subheading:    String(para.subheading ?? ""),
              isHeading:     para.isHeading === true,
            }))
        : [];

      validPages.push({ pageNumber: pn, paragraphs });
      totalParagraphs += paragraphs.length;
    }

    log("chunk-extract", "done", {
      docId:      body.docId,
      chunk:      body.chunkIndex + 1,
      pages:      validPages.length,
      paragraphs: totalParagraphs,
      ms:         result.latencyMs,
    });

    return new Response(
      JSON.stringify({
        ok:             true,
        pages:          validPages,
        chunkIndex:     body.chunkIndex,
        startPage:      body.startPage,
        endPage:        body.endPage,
        totalParagraphs,
      }),
      { headers: CORS },
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("chunk-extract", "error", { docId: body.docId, chunk: body.chunkIndex + 1, err: msg.slice(0, 200) });
    return clientError(`Chunk ${body.chunkIndex + 1} failed: ${msg}`, 500, "CHUNK_ERROR");
  }
};
