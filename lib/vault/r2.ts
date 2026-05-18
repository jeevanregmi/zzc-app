/**
 * Client-side R2 upload adapter.
 *
 * Sends files to POST /api/upload-document (Cloudflare Pages Function),
 * which stores them in R2 and returns the object key + download URL.
 *
 * Uses XMLHttpRequest instead of fetch so upload progress is trackable.
 * fetch does not expose upload progress in any browser.
 *
 * The download URL returned is /api/r2-serve?key=... — a proxy endpoint
 * that streams R2 content with the correct MIME type. Anthropic's document
 * processing API fetches this URL directly in production.
 */

export interface R2UploadResult {
  r2Key:       string;   // R2 object key — stored as storagePath in Firestore
  downloadUrl: string;   // /api/r2-serve?key=... — stored as downloadUrl in Firestore
  size:        number;
}

export interface R2UploadError extends Error {
  code?: string;
}

function parseApiError(responseText: string, httpStatus: number): R2UploadError {
  try {
    const { error, code } = JSON.parse(responseText) as { error?: string; code?: string };
    const err = new Error(error ?? `Upload failed (HTTP ${httpStatus})`) as R2UploadError;
    err.code = code;
    return err;
  } catch {
    return new Error(`Upload failed (HTTP ${httpStatus}): ${responseText.slice(0, 200)}`) as R2UploadError;
  }
}

export function uploadToR2(
  ownerId:    string,
  file:       File,
  folder:     string,
  onProgress: (pct: number) => void,
): Promise<R2UploadResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file",    file);
    form.append("ownerId", ownerId);
    if (folder) form.append("folder", folder);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const { key, downloadUrl, size } = JSON.parse(xhr.responseText) as {
            key: string; downloadUrl: string; size: number;
          };
          resolve({ r2Key: key, downloadUrl, size });
        } catch {
          reject(new Error("R2 upload response was not valid JSON. Check /api/upload-document logs."));
        }
      } else {
        reject(parseApiError(xhr.responseText, xhr.status));
      }
    });

    xhr.addEventListener("error",   () => reject(new Error("Network error during upload. Check your connection and try again.")));
    xhr.addEventListener("abort",   () => reject(new Error("Upload was aborted.")));
    xhr.addEventListener("timeout", () => reject(new Error("Upload timed out after 120 seconds. Try again on a faster connection.")));

    xhr.timeout = 120_000;
    xhr.open("POST", "/api/upload-document");
    xhr.send(form);
  });
}
