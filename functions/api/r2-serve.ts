/**
 * GET /api/r2-serve?key={objectKey}
 *
 * Streams a private R2 vault object to the browser (or to Anthropic's
 * document processing API). Content is served inline with correct MIME type.
 *
 * Auth: none — keys are scoped to vault/{ownerId}/... and include a
 * timestamp prefix making them unguessable. Add token auth before
 * multi-user rollout.
 *
 * Used for:
 *   - Displaying uploaded PDFs/images in the DocumentViewer
 *   - Passing document URLs to process-document.ts → Anthropic
 */

import type { R2Bucket, R2ObjectBody } from "@cloudflare/workers-types";
import { clientError } from "./_shared";

interface Env {
  VAULT_BUCKET: R2Bucket;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const onRequestGet = async ({ request, env }: PagesContext): Promise<Response> => {
  if (!env.VAULT_BUCKET) {
    return clientError("R2 storage binding not configured.", 503, "R2_NOT_CONFIGURED");
  }

  const key = new URL(request.url).searchParams.get("key");
  if (!key) return clientError("key parameter is required.", 400, "MISSING_KEY");

  // Block path traversal and non-vault paths
  if (!key.startsWith("vault/") || key.includes("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  let object: R2ObjectBody | null;
  try {
    object = await env.VAULT_BUCKET.get(key);
  } catch (err) {
    return new Response(`Storage error: ${String(err)}`, { status: 500 });
  }

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
  const buffer      = await object.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type":        contentType,
      "Content-Disposition": "inline",
      "Cache-Control":       "private, max-age=3600",
    },
  });
};
