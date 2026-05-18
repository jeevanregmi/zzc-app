/**
 * POST /api/upload-document
 *
 * Stores an uploaded vault document in Cloudflare R2.
 * Returns { key, downloadUrl, size } for storage in Firestore metadata.
 *
 * Body: multipart/form-data
 *   file     (required) — binary file data
 *   ownerId  (required) — vault owner UID, used as path namespace
 *   folder   (optional) — subfolder within vault
 *
 * R2 key: vault/{ownerId}/{folder?/}{timestamp}_{sanitizedFilename}
 * Download URL: /api/r2-serve?key={encodedKey}  (relative — resolves to the
 *   correct domain in both production and Cloudflare preview deployments)
 *
 * Auth: ownerId is trusted from the request body. This is acceptable for a
 * single-founder private vault. Add Firebase ID token verification before
 * multi-user rollout.
 */

import type { R2Bucket } from "@cloudflare/workers-types";
import { log, clientError, internalError, CORS } from "./_shared";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface Env {
  VAULT_BUCKET: R2Bucket;
}

interface PagesContext {
  request: Request;
  env:     Env;
}

function sanitizeFileName(name: string): string {
  const dotIdx    = name.lastIndexOf(".");
  const ext       = dotIdx > 0 ? name.slice(dotIdx).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10) : "";
  const base      = dotIdx > 0 ? name.slice(0, dotIdx) : name;
  const cleanBase = base
    .replace(/[/\\?%*:|"<>\x00-\x1f\x7f]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 120) || "document";
  return `${Date.now()}_${cleanBase}${ext}`;
}

export const onRequestOptions = async (): Promise<Response> =>
  new Response(null, { status: 204, headers: CORS });

// Diagnostic — visit /api/upload-document in browser to confirm function is deployed
// and VAULT_BUCKET binding is active.
export const onRequestGet = async ({ env }: PagesContext): Promise<Response> =>
  new Response(
    JSON.stringify({ fn: "upload-document", binding: !!env.VAULT_BUCKET }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
  );

export const onRequestPost = async ({ request, env }: PagesContext): Promise<Response> => {
  if (!env.VAULT_BUCKET) {
    return clientError(
      "R2 storage binding not configured. Add VAULT_BUCKET in Cloudflare Pages → Settings → Functions → R2 bucket bindings.",
      503,
      "R2_NOT_CONFIGURED",
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return clientError("Expected multipart/form-data body.", 400, "INVALID_BODY");
  }

  const ownerId = (form.get("ownerId") as string | null)?.trim();
  const folder  = (form.get("folder")  as string | null)?.trim() ?? "";
  const file    = form.get("file") as File | null;

  if (!ownerId) return clientError("ownerId is required.",  400, "MISSING_OWNER_ID");
  if (!file)    return clientError("file field is required.", 400, "MISSING_FILE");

  if (!ALLOWED_TYPES.has(file.type)) {
    return clientError(
      `File type '${file.type}' is not permitted. Allowed: PDF, DOCX, TXT, MD, JPEG, PNG, WEBP.`,
      400, "INVALID_CONTENT_TYPE",
    );
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return clientError(
      `File exceeds 50 MB limit (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB).`,
      400, "FILE_TOO_LARGE",
    );
  }

  const safeName    = sanitizeFileName(file.name || "document");
  const folderPart  = folder ? `${folder}/` : "";
  const key         = `vault/${ownerId}/${folderPart}${safeName}`;

  try {
    await env.VAULT_BUCKET.put(key, buffer, {
      httpMetadata:   { contentType: file.type },
      customMetadata: {
        ownerId,
        originalName: file.name,
        uploadedAt:   new Date().toISOString(),
      },
    });

    // Construct download URL relative to current origin so it works in
    // production, Cloudflare preview deployments, and wrangler dev.
    const origin      = new URL(request.url).origin;
    const downloadUrl = `${origin}/api/r2-serve?key=${encodeURIComponent(key)}`;

    log("upload-document", "ok", { key, size: buffer.byteLength, ownerId });

    return new Response(
      JSON.stringify({ key, downloadUrl, size: buffer.byteLength }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  } catch (err) {
    log("upload-document", "r2_put_error", { err: String(err), key, ownerId });
    return internalError(err);
  }
};
