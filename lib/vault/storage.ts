/**
 * Vault Firebase Storage Adapter
 *
 * Handles upload, download URL retrieval, and deletion for vault media.
 * All paths follow the pattern: vault/{uid}/{subfolder}/{filename}
 *
 * Returns progress via a callback so the hook can update UI state
 * without coupling progress tracking to this module.
 *
 * BUGS FIXED:
 *   1. async complete callback had no try/catch — if getDownloadURL threw,
 *      the Promise never resolved OR rejected, causing the UI to hang forever
 *      at 0% with no error surfaced. Fixed: complete callback wraps getDownloadURL
 *      in try/catch and calls reject() on failure.
 *   2. No upload timeout — a dropped connection hung indefinitely. Fixed:
 *      120s timeout calls task.cancel() and rejects with a clear message.
 *   3. Filename sanitizer stripped all Unicode (Nepali chars became `___`).
 *      Fixed: sanitizeFileName keeps Unicode, strips only truly dangerous chars
 *      (path separators, null bytes, control chars).
 *   4. NaN progress when totalBytes=0 (before Firebase resolves file size).
 *      Fixed: guard on snap.totalBytes > 0.
 */

import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
  type StorageReference,
} from "firebase/storage";
import { storage } from "../../app/firebase";
import type { MediaMimeType } from "./types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  storagePath:  string;
  downloadUrl:  string;
  size:         number;
  safeName:     string;   // sanitized filename stored in Storage
}

// ── Constants ─────────────────────────────────────────────────────────────────

const UPLOAD_TIMEOUT_MS = 120_000; // 2 minutes before we cancel and surface an error

// ── Filename sanitization ─────────────────────────────────────────────────────
// Firebase Storage supports Unicode filenames — no need to strip Nepali chars.
// We only strip characters that are dangerous in storage paths or HTTP headers:
//   / \ ? % * : | " < > NUL control chars
// Spaces become underscores. Result is always non-empty.

export function sanitizeFileName(name: string): string {
  const dotIdx  = name.lastIndexOf(".");
  const ext     = dotIdx > 0 ? name.slice(dotIdx).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10) : "";
  const base    = dotIdx > 0 ? name.slice(0, dotIdx) : name;

  const cleanBase = base
    .replace(/[/\\?%*:|"<>\x00-\x1f\x7f]+/g, "")  // dangerous chars — stripped entirely
    .replace(/\s+/g, "_")                            // spaces → underscores
    .replace(/_{2,}/g, "_")                          // collapse runs of underscores
    .replace(/^[._\-]+|[._\-]+$/g, "")              // strip leading/trailing punct
    .slice(0, 120)                                   // cap base at 120 chars
    || "document";

  return `${Date.now()}_${cleanBase}${ext}`;
}

// ── Internal: resumable upload with timeout ───────────────────────────────────

function resumableUpload(
  storageRef:  StorageReference,
  file:        File | Blob,
  contentType: string,
  storagePath: string,
  fileSize:    number,
  onProgress:  (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType });

    // Timeout guard — cancel the task and surface a human-readable error.
    // Without this, a dropped connection hangs forever (Firebase SDK doesn't
    // have a built-in upload timeout).
    const timeoutId = setTimeout(() => {
      task.cancel();
      reject(new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s. Check your connection and try again.`));
    }, UPLOAD_TIMEOUT_MS);

    task.on(
      "state_changed",

      // Progress snapshot — guard totalBytes > 0 to avoid NaN on first tick
      snap => {
        if (snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },

      // Error — Firebase storage/unauthorized, storage/canceled, network errors, etc.
      // serverResponse contains the raw HTTP body from Firebase — the single most
      // useful piece of diagnostic information when rules reject an upload.
      error => {
        clearTimeout(timeoutId);
        const storageErr = error as { code?: string; serverResponse?: string };
        console.error("[storage] upload failed", {
          code:           storageErr.code,
          message:        error.message,
          serverResponse: storageErr.serverResponse ?? "(none)",
          path:           storagePath,
          fileSize,
        });
        reject(error);
      },

      // Complete — MUST be wrapped in try/catch.
      // If getDownloadURL throws (network blip, malformed ref), the async
      // function discards the exception silently and the Promise NEVER settles,
      // causing the UI to hang forever. This was the primary stuck-at-0% bug.
      async () => {
        clearTimeout(timeoutId);
        try {
          const downloadUrl = await getDownloadURL(task.snapshot.ref);
          resolve({ storagePath, downloadUrl, size: fileSize, safeName: storageRef.name });
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

function subfolderFor(mimeType: MediaMimeType): string {
  if (mimeType.startsWith("video/"))  return "videos/originals";
  if (mimeType.startsWith("image/"))  return "images/originals";
  if (mimeType === "application/pdf") return "documents/attachments";
  return "misc";
}

export function uploadMedia(
  uid:          string,
  file:         File,
  folder:       string,
  mimeType:     MediaMimeType,
  onProgress:   (pct: number) => void,
): Promise<UploadResult> {
  const subfolder   = subfolderFor(mimeType);
  const safeName    = sanitizeFileName(file.name);
  const storagePath = `vault/${uid}/${subfolder}/${folder ? folder + "/" : ""}${safeName}`;
  const storageRef  = ref(storage, storagePath);
  return resumableUpload(storageRef, file, mimeType, storagePath, file.size, onProgress);
}

export function uploadIntelligenceDoc(
  uid:        string,
  file:       File,
  folder:     string,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  const safeName    = sanitizeFileName(file.name);
  const storagePath = `vault/${uid}/intelligence-docs/${folder ? folder + "/" : ""}${safeName}`;
  const storageRef  = ref(storage, storagePath);
  return resumableUpload(storageRef, file, file.type, storagePath, file.size, onProgress);
}

export async function uploadThumbnail(
  uid:      string,
  blob:     Blob,
  mediaId:  string,
): Promise<string> {
  const path       = `vault/${uid}/images/thumbnails/${mediaId}.jpg`;
  const storageRef = ref(storage, path);
  // Thumbnails are small blobs — no resumable needed, but we still need getDownloadURL
  await uploadBytesResumable(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}

/**
 * Extract first frame of a video file as a JPEG blob (client-side).
 * Returns null if the browser cannot process the video.
 */
export function extractVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise(resolve => {
    const video  = document.createElement("video");
    const canvas = document.createElement("canvas");
    const url    = URL.createObjectURL(file);

    video.src         = url;
    video.muted       = true;
    video.preload     = "metadata";
    video.currentTime = 1;

    video.onloadeddata = () => {
      canvas.width  = Math.min(400, video.videoWidth);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        resolve(blob);
      }, "image/jpeg", 0.8);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}
