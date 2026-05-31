/**
 * POST /api/gemini-file-upload
 *
 * Uploads a PDF to Gemini Files API for reuse across chunk extractions.
 * The file URI is valid for 48 hours — cache it in Firestore on the doc record.
 *
 * Body: { docId, ownerId, downloadUrl, mimeType?, docTitle? }
 * Returns: { ok, fileUri, fileName, sizeBytes }
 */

import { CORS, clientError, log } from "./_shared";
import type { R2Bucket } from "@cloudflare/workers-types";

interface Env {
  GEMINI_API_KEY?: string;
  VAULT_BUCKET?:   R2Bucket;
}

interface UploadRequest {
  docId:       string;
  ownerId:     string;
  downloadUrl: string;
  mimeType?:   string;
  docTitle?:   string;
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

  let body: UploadRequest;
  try {
    body = await context.request.json();
  } catch {
    return clientError("Invalid JSON", 400, "BAD_REQUEST");
  }

  if (!body.docId || !body.ownerId || !body.downloadUrl) {
    return clientError("docId, ownerId, downloadUrl required", 400, "VALIDATION_ERROR");
  }

  log("gemini-file-upload", "start", { docId: body.docId });

  // ── Fetch PDF from R2 or signed URL ──────────────────────────────────────────
  let pdfBytes: Uint8Array;
  try {
    let r2Key = "";
    try { r2Key = new URL(body.downloadUrl).searchParams.get("key") ?? ""; } catch { /* ignore */ }

    let buf: ArrayBuffer;
    if (r2Key && env.VAULT_BUCKET) {
      const obj = await env.VAULT_BUCKET.get(r2Key);
      if (!obj) throw new Error(`Not in R2: ${r2Key}`);
      buf = await obj.arrayBuffer();
    } else {
      const abort = new AbortController();
      const tid = setTimeout(() => abort.abort(), 20_000);
      let res: Response;
      try { res = await fetch(body.downloadUrl, { signal: abort.signal }); }
      finally { clearTimeout(tid); }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = await res.arrayBuffer();
    }
    pdfBytes = new Uint8Array(buf);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return clientError(`PDF fetch failed: ${msg}`, 500, "PDF_FETCH_ERROR");
  }

  log("gemini-file-upload", "pdf_fetched", { docId: body.docId, sizeBytes: pdfBytes.length });

  // ── Upload to Gemini Files API (multipart) ────────────────────────────────────
  const boundary = "zzc_boundary_" + Math.random().toString(36).slice(2, 10);
  const mimeType  = body.mimeType ?? "application/pdf";
  const displayName = (body.docTitle ?? body.docId).slice(0, 200);

  const enc = new TextEncoder();
  const metaPart = enc.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n` +
    JSON.stringify({ file: { display_name: displayName } }) +
    `\r\n`
  );
  const dataPart = enc.encode(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const endPart  = enc.encode(`\r\n--${boundary}--`);

  const total    = metaPart.length + dataPart.length + pdfBytes.length + endPart.length;
  const combined = new Uint8Array(total);
  let off = 0;
  combined.set(metaPart, off); off += metaPart.length;
  combined.set(dataPart, off); off += dataPart.length;
  combined.set(pdfBytes, off); off += pdfBytes.length;
  combined.set(endPart,  off);

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${env.GEMINI_API_KEY.trim()}`,
    {
      method:  "POST",
      headers: {
        "Content-Type":           `multipart/related; boundary=${boundary}`,
        "X-Goog-Upload-Protocol": "multipart",
      },
      body: combined,
    },
  );

  if (!uploadRes.ok) {
    const txt = await uploadRes.text().catch(() => "");
    log("gemini-file-upload", "upload_failed", { docId: body.docId, status: uploadRes.status });
    return clientError(
      `Gemini Files API upload failed (${uploadRes.status}): ${txt.slice(0, 200)}`,
      500, "GEMINI_UPLOAD_ERROR",
    );
  }

  const result = await uploadRes.json() as {
    file?: { name: string; uri: string; mimeType: string; sizeBytes?: string };
  };

  if (!result.file?.uri) {
    return clientError("Gemini Files API returned no file URI", 500, "GEMINI_UPLOAD_ERROR");
  }

  const pageCount = detectPdfPageCount(pdfBytes);

  log("gemini-file-upload", "complete", {
    docId: body.docId,
    uri:   result.file.uri.slice(0, 80),
    bytes: pdfBytes.length,
    pages: pageCount,
  });

  return new Response(
    JSON.stringify({
      ok:        true,
      fileUri:   result.file.uri,
      fileName:  result.file.name,
      sizeBytes: pdfBytes.length,
      pageCount,
    }),
    { headers: CORS },
  );
};

function detectPdfPageCount(bytes: Uint8Array): number {
  // Scan first 512 KB for /Count entries in the PDF cross-reference structure.
  // The root Pages dictionary has the highest /Count; return that.
  const slice = bytes.slice(0, Math.min(bytes.length, 512 * 1024));
  const text  = new TextDecoder("ascii", { fatal: false }).decode(slice);
  const hits  = [...text.matchAll(/\/Count\s+(\d+)/g)];
  if (hits.length === 0) return 0;
  return Math.max(...hits.map(h => parseInt(h[1], 10)));
}
