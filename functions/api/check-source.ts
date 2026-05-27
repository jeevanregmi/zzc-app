/**
 * POST /api/check-source
 *
 * Fetches an official government source URL and extracts PDF/doc links.
 * Returns new links not in the caller-provided lastKnownUrls list.
 *
 * No AI — pure link extraction. Stage 1 of source monitoring.
 * Firestore writes are handled by the client after reviewing results.
 */

interface Env { [key: string]: unknown }

interface PagesContext {
  request: Request;
  env:     Env;
}

interface CheckSourceRequest {
  url:           string;
  sourceId:      string;
  lastKnownUrls: string[];
}

interface DetectedLink {
  url:      string;
  title:    string;
  fileType: "pdf" | "doc" | "docx" | "html" | "other";
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type":                 "application/json",
};

// Regex to detect likely document links
const DOC_EXT_RE = /\.(pdf|docx?)\b/i;
const DOC_TEXT_RE = /download|report|annual|प्रतिवेदन|वार्षिक|ऐन|नियम|बजेट|नीति|निर्देशिका|circular|notice|publication/i;

function detectFileType(url: string): DetectedLink["fileType"] {
  const lower = url.toLowerCase();
  if (lower.includes(".pdf"))  return "pdf";
  if (lower.includes(".docx")) return "docx";
  if (lower.includes(".doc"))  return "doc";
  return "html";
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function extractLinks(html: string, baseUrl: string): DetectedLink[] {
  const links: DetectedLink[] = [];
  const seen = new Set<string>();

  // Match all <a ...> tags
  const aTagRe = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = aTagRe.exec(html)) !== null) {
    const rawHref = match[1].trim();
    const rawText = match[2].replace(/<[^>]+>/g, "").trim().slice(0, 200);

    const isDoc = DOC_EXT_RE.test(rawHref) || DOC_TEXT_RE.test(rawText) || DOC_TEXT_RE.test(rawHref);
    if (!isDoc) continue;

    const resolved = resolveUrl(rawHref, baseUrl);
    if (!resolved) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    links.push({
      url:      resolved,
      title:    rawText || resolved.split("/").pop() || resolved,
      fileType: detectFileType(resolved),
    });

    if (links.length >= 50) break;
  }

  return links;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost = async (context: PagesContext): Promise<Response> => {
  let body: CheckSourceRequest;
  try {
    body = await context.request.json() as CheckSourceRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: CORS });
  }

  const { url, sourceId, lastKnownUrls = [] } = body;
  if (!url || !sourceId) {
    return new Response(JSON.stringify({ error: "url and sourceId required" }), { status: 400, headers: CORS });
  }

  const checkedAt = new Date().toISOString();
  let foundUrls: DetectedLink[] = [];
  let errorMsg: string | undefined;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ZZC-CivicBot/1.0; +https://zzc.jeevanregmi.com.np)",
        "Accept":     "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      errorMsg = `HTTP ${res.status} from ${url}`;
    } else {
      const html = await res.text();
      foundUrls  = extractLinks(html, url);
    }
  } catch (err) {
    errorMsg = String(err).slice(0, 200);
  }

  const knownSet = new Set(lastKnownUrls);
  const newUrls  = foundUrls.filter(l => !knownSet.has(l.url));

  return new Response(
    JSON.stringify({ sourceId, url, checkedAt, foundUrls, newUrls, error: errorMsg }),
    { status: 200, headers: CORS },
  );
};
