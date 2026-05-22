/**
 * POST /api/ingest-url
 *
 * URL Intelligence Ingestion Worker.
 *
 * Accepts a URL, fetches content, extracts intelligence via vault-router
 * (Gemini Flash → Bedrock Haiku → Anthropic Haiku). Provider-independent —
 * continues working if any single provider is unavailable or over quota.
 *
 * Handles:
 *   - HTML pages + RSS/Atom feeds → text extraction → AI analysis
 *   - PDF URLs (application/pdf) → base64 → AI analysis (via Gemini/Anthropic PDF support)
 *   - Plain text
 *
 * Supports: nrb.org.np, parliament.gov.np, mof.gov.np, epf.gov.np, ssf.gov.np
 * Max content passed to AI: 40,000 chars for HTML; 10 MB for PDFs
 */

import { routeDocumentAnalysis }                               from "../../lib/ai/vault-router";
import { matchTopics, matchSectors, taxonomySummaryForPrompt } from "../../lib/data/taxonomy";
import { log }                                                 from "./_shared";
import type { RouterEnv }                                      from "../../lib/ai/vault-router";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env extends RouterEnv {}

interface PagesContext {
  request: Request;
  env:     Env;
}

interface IngestRequest {
  url:        string;
  sourceName: string;
  sourceType?: string;
  topics?:    string[];  // existing IntelligenceTopic names to match against
  tags?:      string[];
}

interface IngestResult {
  title:          string;
  summary:        string;
  body:           string;
  publishedAt?:   string;
  relevanceScore: number;
  credibility:    "high" | "medium" | "low" | "unverified";
  aiInsights:     string[];
  contentIdeas:   string[];
  detectedTopics: string[];
  // Taxonomy classification (from lib/data/taxonomy.ts)
  taxonomyTags:   { topicId: string; sectorId: string; score: number }[];
  primarySectorId?: string;
  model:          string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

const MODEL          = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL  = "https://api.anthropic.com/v1/messages";
const MAX_FETCH_SIZE = 2 * 1024 * 1024;  // 2 MB raw response limit
const MAX_TEXT_CHARS = 40_000;            // chars sent to Claude

// Domains classified as high credibility for Nepal finance
const HIGH_CREDIBILITY_DOMAINS = [
  "nrb.org.np", "epf.gov.np", "epf.org.np", "ssf.gov.np", "sebon.gov.np",
  "ird.gov.np", "mof.gov.np", "sharesansar.com", "merolagani.com",
  "nepsefloor.com", "moneynepal.com",
];

// ─── HTML / RSS extraction ────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (m) return m[1].trim();
  const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i);
  return og ? og[1].trim() : "";
}

function extractPublishedAt(html: string): string | undefined {
  // Try common meta tags first
  const patterns = [
    /<meta[^>]+property="article:published_time"[^>]+content="([^"]+)"/i,
    /<meta[^>]+name="publish[_-]?date"[^>]+content="([^"]+)"/i,
    /<time[^>]+datetime="([^"]+)"/i,
    /datePublished['":\s]+["']([0-9T:Z.+-]{10,30})['"]/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      try { return new Date(m[1]).toISOString(); } catch { /* fall through */ }
    }
  }
  return undefined;
}

function isRssOrAtom(contentType: string, body: string): boolean {
  if (/xml|rss|atom/.test(contentType)) return true;
  return body.trimStart().startsWith("<?xml") || /<rss|<feed/.test(body.slice(0, 500));
}

function parseRssFeed(xml: string): { title: string; items: string[] } {
  const feedTitle = (xml.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ?? [])[1] ?? "";

  const itemTexts: string[] = [];
  const itemRx = /<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = itemRx.exec(xml)) !== null && count < 20) {
    const item = m[0];
    const title   = (item.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i) ?? [])[1] ?? "";
    const desc    = (item.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ?? [])[1] ?? "";
    const summary = (item.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ?? [])[1] ?? "";
    const content = (item.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/i) ?? [])[1] ?? "";
    const raw = [title, desc || summary, content].filter(Boolean).join(" ");
    itemTexts.push(stripHtml(raw).slice(0, 2000));
    count++;
  }
  return { title: stripHtml(feedTitle), items: itemTexts };
}

// ─── Domain credibility helper ────────────────────────────────────────────────

function domainCredibility(url: string): "high" | "unverified" {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return HIGH_CREDIBILITY_DOMAINS.includes(host) ? "high" : "unverified";
  } catch {
    return "unverified";
  }
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(
  url:        string,
  sourceName: string,
  text:       string,
  title:      string,
  topicList:  string[],
): string {
  const userTopicsSection = topicList.length
    ? `\nAdmin-configured tracked topics: ${topicList.join(", ")}`
    : "";

  const taxonomySection = taxonomySummaryForPrompt();

  return `You are an intelligence analyst for ZZC — Nepal's AI-native fintech platform for Gen Z investors (age 18–35, salary NPR 30k–150k/month).

Source: "${sourceName}" (${url})${userTopicsSection}

CONTENT TO ANALYZE:
Title: ${title || "(no title extracted)"}

${text}

---

ZZC FINANCIAL INTELLIGENCE TAXONOMY (canonical topic IDs for classification):

${taxonomySection}

---

Your task: Extract actionable finance intelligence relevant to young Nepali workers and investors, and classify it using the taxonomy above.

Return ONLY valid JSON (no markdown fences, no text before or after):
{
  "title": "clean, accurate title for this intelligence signal",
  "summary": "2-3 sentences: what happened and why it matters for a 25-year-old Nepali investor",
  "relevanceScore": 0.0,
  "credibility": "high|medium|low|unverified",
  "aiInsights": [
    "specific fact with number/percentage/date from the content",
    "fact 2",
    "fact 3"
  ],
  "contentIdeas": [
    "YouTube: [specific video title based on this signal]",
    "Short: [15-60s reel concept from this signal]",
    "Post: [Facebook/Instagram explainer concept]"
  ],
  "detectedTopics": ["EPF", "interest rate"],
  "taxonomyTopicIds": ["epf", "bank-interest-rates"],
  "publishedAt": "ISO date string if found, else null"
}

Rules:
- relevanceScore: 0.9 = directly affects EPF/SSF/NRB/NEPSE/loans for Nepali workers; 0.5 = useful context; 0.1 = no finance relevance
- credibility: "high" only for official NRB/EPF/SSF/SEBON/MoF sources
- aiInsights: specific numbers, names, dates from the content — never generic statements
- contentIdeas: specific to THIS signal's actual data, not generic Nepal finance
- taxonomyTopicIds: pick 1-5 canonical IDs from the taxonomy above that this content actually covers
- detectedTopics: human-readable topic names (can differ from taxonomy IDs)
- If not finance-relevant, set relevanceScore ≤ 0.2, taxonomyTopicIds = []
- publishedAt: ISO 8601 string if determinable, else null`;
}

// ─── Request handlers ─────────────────────────────────────────────────────────

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  // ── Parse request ────────────────────────────────────────────────────────────
  let body: IngestRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body", code: "BAD_REQUEST" }), { status: 400, headers: CORS });
  }

  const { url, sourceName, topics = [] } = body;

  if (!url || !sourceName) {
    return new Response(
      JSON.stringify({ error: "url and sourceName are required", code: "VALIDATION_ERROR" }),
      { status: 400, headers: CORS },
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("bad protocol");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL — must be http or https", code: "INVALID_URL" }), { status: 400, headers: CORS });
  }

  // ── Fetch the URL ────────────────────────────────────────────────────────────
  let fetchRes: Response;
  try {
    fetchRes = await fetch(url, {
      headers: {
        "User-Agent": "ZZCBot/1.0 (Nepal finance intelligence; +https://zzc.jeevanregmi.com.np)",
        "Accept":     "application/pdf,text/html,application/xhtml+xml,application/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Could not fetch URL: ${String(err)}`, code: "FETCH_ERROR" }), { status: 500, headers: CORS });
  }

  if (!fetchRes.ok) {
    return new Response(JSON.stringify({ error: `URL returned HTTP ${fetchRes.status}`, code: "FETCH_ERROR" }), { status: 500, headers: CORS });
  }

  const contentType = fetchRes.headers.get("content-type") ?? "";
  const domainCred  = domainCredibility(url);

  // ── Branch: PDF URL vs HTML/RSS ───────────────────────────────────────────────
  // NRB, Parliament, EPF publish most policy documents as direct PDF links.
  // PDF binary cannot be processed by stripHtml — must be decoded and sent as
  // base64 to an AI provider that supports PDF (Gemini, Anthropic).
  const isPdf = contentType.includes("application/pdf") ||
                parsedUrl.pathname.toLowerCase().endsWith(".pdf");

  let aiText: string;
  let usedModel = MODEL;
  let claudeText = "";    // extracted text for taxonomy matching (HTML path only)
  let extractedTitle = "";
  let extractedDate: string | undefined;

  if (isPdf) {
    // ── PDF URL path ──────────────────────────────────────────────────────────
    const MAX_PDF = 10 * 1024 * 1024;
    const rawLen  = Number(fetchRes.headers.get("content-length") ?? 0);
    if (rawLen > MAX_PDF) {
      return new Response(
        JSON.stringify({ error: `PDF too large (${(rawLen / 1024 / 1024).toFixed(1)} MB). Max 10 MB.`, code: "FILE_TOO_LARGE" }),
        { status: 413, headers: CORS },
      );
    }
    const buf    = await fetchRes.arrayBuffer();
    const bytes  = new Uint8Array(buf);
    let binary   = "";
    const chunk  = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64   = btoa(binary);
    const fileName = parsedUrl.pathname.split("/").pop() || sourceName;

    const systemPrompt = buildPrompt(url, sourceName, "", "", topics);

    const result = await routeDocumentAnalysis(
      context.env,
      systemPrompt,
      { mimeType: "application/pdf", fileName, base64 },
      2048,
    );

    if (!result.ok) {
      const isBilling = result.reason === "billing_exhausted";
      return new Response(
        JSON.stringify({
          error: isBilling
            ? "AI quota exhausted. Top up at console.anthropic.com/billing or enable Gemini billing."
            : `AI unavailable (tried: ${result.tried.join(", ")}). Retry in a few minutes.`,
          code: isBilling ? "BILLING_EXHAUSTED" : "AI_UNAVAILABLE",
        }),
        { status: isBilling ? 402 : 503, headers: CORS },
      );
    }
    aiText    = result.text;
    usedModel = result.model;
    claudeText = `PDF: ${fileName}`;  // fallback for taxonomy matching
    extractedTitle = fileName.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");

  } else {
    // ── HTML / RSS / text path ────────────────────────────────────────────────
    const rawLen = Number(fetchRes.headers.get("content-length") ?? 0);
    if (rawLen > MAX_FETCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Page too large (${(rawLen / 1024 / 1024).toFixed(1)} MB). Max 2 MB.`, code: "PAGE_TOO_LARGE" }),
        { status: 413, headers: CORS },
      );
    }

    const rawHtml = await fetchRes.text();

    if (isRssOrAtom(contentType, rawHtml)) {
      const { title, items } = parseRssFeed(rawHtml);
      extractedTitle = title;
      claudeText     = items.join("\n\n---\n\n");
    } else if (contentType.includes("text/plain")) {
      extractedTitle = parsedUrl.pathname.split("/").pop() ?? url;
      claudeText     = rawHtml;
    } else {
      extractedTitle = extractTitle(rawHtml);
      extractedDate  = extractPublishedAt(rawHtml);
      claudeText     = stripHtml(rawHtml);
    }

    const trimmed = claudeText.slice(0, MAX_TEXT_CHARS);

    if (trimmed.trim().length < 100) {
      return new Response(
        JSON.stringify({
          error: "Could not extract meaningful text from this URL. The page may require JavaScript or login.",
          code:  "EXTRACT_FAILED",
        }),
        { status: 422, headers: CORS },
      );
    }

    claudeText = trimmed;
    const systemPrompt = buildPrompt(url, sourceName, claudeText, extractedTitle, topics);

    const result = await routeDocumentAnalysis(
      context.env,
      systemPrompt,
      { mimeType: "text/plain", fileName: sourceName, textBody: claudeText },
      2048,
    );

    if (!result.ok) {
      const isBilling = result.reason === "billing_exhausted";
      return new Response(
        JSON.stringify({
          error: isBilling
            ? "AI quota exhausted. Top up at console.anthropic.com/billing or enable Gemini billing."
            : `AI unavailable (tried: ${result.tried.join(", ")}). Retry in a few minutes.`,
          code: isBilling ? "BILLING_EXHAUSTED" : "AI_UNAVAILABLE",
        }),
        { status: isBilling ? 402 : 503, headers: CORS },
      );
    }
    aiText    = result.text;
    usedModel = result.model;
  }

  // ── Parse AI response ─────────────────────────────────────────────────────────
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ error: "AI returned unparseable response. Retry.", code: "AI_PARSE_ERROR", preview: aiText.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  let ai: {
    title?:            string;
    summary?:          string;
    relevanceScore?:   number;
    credibility?:      string;
    aiInsights?:       string[];
    contentIdeas?:     string[];
    detectedTopics?:   string[];
    taxonomyTopicIds?: string[];
    publishedAt?:      string | null;
  };

  try {
    ai = JSON.parse(jsonMatch[0]);
  } catch {
    return new Response(
      JSON.stringify({ error: "AI response was not valid JSON. Retry.", code: "AI_PARSE_ERROR", preview: aiText.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  // ── Taxonomy classification ───────────────────────────────────────────────────
  const localMatches = matchTopics(claudeText, 8);

  const aiTopicIds: string[] = (ai.taxonomyTopicIds ?? []).filter(
    id => localMatches.some(m => m.topic.id === id) || matchTopics(id, 1).length > 0,
  );

  const tagMap = new Map<string, { topicId: string; sectorId: string; score: number }>();
  for (const m of localMatches) {
    tagMap.set(m.topic.id, { topicId: m.topic.id, sectorId: m.topic.sectorId, score: m.score });
  }
  for (const id of aiTopicIds) {
    if (!tagMap.has(id)) {
      const existing = localMatches.find(m => m.topic.id === id);
      if (existing) tagMap.set(id, { topicId: id, sectorId: existing.topic.sectorId, score: existing.score });
    }
  }
  const taxonomyTags    = Array.from(tagMap.values()).sort((a, b) => b.score - a.score).slice(0, 6);
  const sectorRouting   = matchSectors(taxonomyTags.map(t => t.topicId));
  const primarySectorId = sectorRouting[0]?.sector.id;

  // ── Credibility resolution ────────────────────────────────────────────────────
  const resolvedCredibility = ((): IngestResult["credibility"] => {
    if (domainCred === "high") return "high";
    const aiCred = ai.credibility ?? "unverified";
    if (["high", "medium", "low", "unverified"].includes(aiCred)) return aiCred as IngestResult["credibility"];
    return "unverified";
  })();

  const allTopics = Array.from(new Set([
    ...(ai.detectedTopics ?? []),
    ...topics.filter(t => claudeText.toLowerCase().includes(t.toLowerCase())),
  ]));

  const result: IngestResult = {
    title:          ai.title        || extractedTitle || url,
    summary:        ai.summary      || "",
    body:           claudeText.slice(0, 8_000),
    publishedAt:    ai.publishedAt  || extractedDate  || undefined,
    relevanceScore: typeof ai.relevanceScore === "number" ? Math.max(0, Math.min(1, ai.relevanceScore)) : 0.5,
    credibility:    resolvedCredibility,
    aiInsights:     ai.aiInsights   ?? [],
    contentIdeas:   ai.contentIdeas ?? [],
    detectedTopics: allTopics,
    taxonomyTags,
    primarySectorId,
    model:          usedModel,
  };

  log("ingest-url", "ok", { model: usedModel, url: body.url, isPdf, relevanceScore: result.relevanceScore, primarySectorId });
  return new Response(JSON.stringify({ ok: true, ...result }), { headers: CORS });
};
