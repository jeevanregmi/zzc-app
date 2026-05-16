/**
 * POST /api/ingest-url
 *
 * Phase 6B — URL Intelligence Ingestion Worker
 *
 * Accepts a URL, fetches the page content, extracts text, and runs it through
 * Claude to produce a structured SourceSignal intelligence payload.
 *
 * The CALLER is responsible for writing the result to Firestore as a SourceSignal
 * document (consistent with how /api/process-document works).
 *
 * Supports: HTML pages, RSS/Atom feeds, plain text
 * Max content passed to Claude: 40,000 chars (truncated after that)
 *
 * Required Cloudflare Pages env var: ANTHROPIC_API_KEY
 */

import { matchTopics, matchSectors, taxonomySummaryForPrompt } from "../../lib/data/taxonomy";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env {
  ANTHROPIC_API_KEY: string;
}

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
  "nrb.org.np", "epf.gov.np", "ssf.gov.np", "sebon.gov.np",
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
  const { ANTHROPIC_API_KEY } = context.env;

  if (!ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: CORS },
    );
  }

  // ── Parse request ──────────────────────────────────────────────────────────
  let body: IngestRequest;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: CORS });
  }

  const { url, sourceName, topics = [], tags = [] } = body;

  if (!url || !sourceName) {
    return new Response(
      JSON.stringify({ error: "url and sourceName are required" }),
      { status: 400, headers: CORS },
    );
  }

  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error("bad protocol");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid URL" }), { status: 400, headers: CORS });
  }

  // ── Fetch the URL ──────────────────────────────────────────────────────────
  let fetchRes: Response;
  try {
    fetchRes = await fetch(url, {
      headers: {
        "User-Agent": "ZZCBot/1.0 (Nepal finance intelligence; +https://zzc.jeevanregmi.com.np)",
        "Accept":     "text/html,application/xhtml+xml,application/xml,application/rss+xml,text/plain;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Could not fetch URL: ${String(err)}` }),
      { status: 500, headers: CORS },
    );
  }

  if (!fetchRes.ok) {
    return new Response(
      JSON.stringify({ error: `URL returned HTTP ${fetchRes.status}` }),
      { status: 500, headers: CORS },
    );
  }

  // Guard against huge responses
  const rawLen = Number(fetchRes.headers.get("content-length") ?? 0);
  if (rawLen > MAX_FETCH_SIZE) {
    return new Response(
      JSON.stringify({ error: `Page too large (${(rawLen / 1024 / 1024).toFixed(1)} MB). Max 2 MB.` }),
      { status: 413, headers: CORS },
    );
  }

  const rawText = await fetchRes.text();
  const contentType = fetchRes.headers.get("content-type") ?? "";

  // ── Extract text ───────────────────────────────────────────────────────────
  let extractedTitle = "";
  let extractedText  = "";
  let extractedDate: string | undefined;

  if (isRssOrAtom(contentType, rawText)) {
    const { title, items } = parseRssFeed(rawText);
    extractedTitle = title;
    extractedText  = items.join("\n\n---\n\n");
  } else if (contentType.includes("text/plain")) {
    extractedTitle = parsedUrl.pathname.split("/").pop() ?? url;
    extractedText  = rawText;
  } else {
    // HTML (default)
    extractedTitle = extractTitle(rawText);
    extractedDate  = extractPublishedAt(rawText);
    extractedText  = stripHtml(rawText);
  }

  // Truncate before sending to Claude
  const clauceText = extractedText.slice(0, MAX_TEXT_CHARS);

  if (clauceText.trim().length < 100) {
    return new Response(
      JSON.stringify({ error: "Could not extract meaningful text from this URL. The page may require JavaScript or authentication." }),
      { status: 422, headers: CORS },
    );
  }

  // Auto-detect credibility from domain before Claude confirms
  const domainCred = domainCredibility(url);

  // ── Build prompt ───────────────────────────────────────────────────────────
  const prompt = buildPrompt(url, sourceName, clauceText, extractedTitle, topics);

  // ── Call Claude ────────────────────────────────────────────────────────────
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch(ANTHROPIC_URL, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 2048,
        messages:   [{ role: "user", content: prompt }],
      }),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Anthropic API unreachable: ${String(err)}` }),
      { status: 500, headers: CORS },
    );
  }

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    console.error("Anthropic error:", anthropicRes.status, errText);
    return new Response(
      JSON.stringify({ error: "AI analysis failed. Check ANTHROPIC_API_KEY." }),
      { status: 500, headers: CORS },
    );
  }

  const rawResponse = (await anthropicRes.json()) as { content: Array<{ type: string; text: string }> };
  const aiText = rawResponse.content?.[0]?.text?.trim() ?? "";

  // ── Parse JSON response ────────────────────────────────────────────────────
  const jsonMatch = aiText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return new Response(
      JSON.stringify({ error: "Could not parse AI response", preview: aiText.slice(0, 400) }),
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
      JSON.stringify({ error: "AI response was not valid JSON", preview: aiText.slice(0, 400) }),
      { status: 500, headers: CORS },
    );
  }

  // ── Taxonomy classification ────────────────────────────────────────────────

  // 1. Local keyword matching against extracted text (deterministic, fast)
  const localMatches = matchTopics(clauceText, 8);

  // 2. Validate Claude's taxonomy IDs and merge (Claude may hallucinate IDs)
  const aiTopicIds: string[] = (ai.taxonomyTopicIds ?? []).filter(
    id => localMatches.some(m => m.topic.id === id) || matchTopics(id, 1).length > 0,
  );

  // 3. Build final taxonomy tags — union of local + AI, deduped, sorted by score
  const tagMap = new Map<string, { topicId: string; sectorId: string; score: number }>();
  for (const m of localMatches) {
    tagMap.set(m.topic.id, { topicId: m.topic.id, sectorId: m.topic.sectorId, score: m.score });
  }
  for (const id of aiTopicIds) {
    if (!tagMap.has(id)) {
      const existing = localMatches.find(m => m.topic.id === id);
      if (existing) {
        tagMap.set(id, { topicId: id, sectorId: existing.topic.sectorId, score: existing.score });
      }
    }
  }
  const taxonomyTags = Array.from(tagMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  // 4. Derive primary sector from highest-scoring tags
  const sectorRouting = matchSectors(taxonomyTags.map(t => t.topicId));
  const primarySectorId = sectorRouting[0]?.sector.id;

  // ── Credibility resolution ─────────────────────────────────────────────────
  const resolvedCredibility = ((): IngestResult["credibility"] => {
    const aiCred = ai.credibility ?? "unverified";
    if (domainCred === "high") return "high";
    if (["high", "medium", "low", "unverified"].includes(aiCred)) {
      return aiCred as IngestResult["credibility"];
    }
    return "unverified";
  })();

  // Merge detected topics with admin-tracked topics that appear in content
  const allTopics = Array.from(new Set([
    ...(ai.detectedTopics ?? []),
    ...topics.filter(t => clauceText.toLowerCase().includes(t.toLowerCase())),
  ]));

  const result: IngestResult = {
    title:           ai.title        || extractedTitle || url,
    summary:         ai.summary      || "",
    body:            clauceText.slice(0, 8_000),
    publishedAt:     ai.publishedAt  || extractedDate || undefined,
    relevanceScore:  typeof ai.relevanceScore === "number"
                     ? Math.max(0, Math.min(1, ai.relevanceScore))
                     : 0.5,
    credibility:     resolvedCredibility,
    aiInsights:      ai.aiInsights   ?? [],
    contentIdeas:    ai.contentIdeas ?? [],
    detectedTopics:  allTopics,
    taxonomyTags,
    primarySectorId,
    model:           MODEL,
  };

  return new Response(JSON.stringify({ ok: true, ...result }), { headers: CORS });
};
