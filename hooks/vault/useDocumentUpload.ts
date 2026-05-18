"use client";

import { useState, useCallback } from "react";
import { uploadToR2 }           from "../../lib/vault/r2";
import { createIntelligenceDoc } from "../../lib/vault/firestore";
import type { DocUploadTask, DocCategory, DocFileType } from "../../lib/types/documents";

// ── MIME → stored file type ───────────────────────────────────────────────────

function mimeToFileType(mime: string): DocFileType {
  if (mime === "application/pdf")                                                              return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
   || mime === "application/msword")                                                           return "docx";
  if (mime === "text/markdown" || mime === "text/x-markdown")                                 return "md";
  if (mime === "text/plain")                                                                   return "txt";
  if (mime.startsWith("image/"))                                                               return "image";
  return "other";
}

// ── R2 / API error → human-readable string ────────────────────────────────────

function formatUploadError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as { code?: string }).code;
    // Errors from /api/upload-document (CF Function → R2)
    if (code === "R2_NOT_CONFIGURED") return "R2 storage is not connected. Go to /vault/system for setup instructions.";
    if (code === "INVALID_CONTENT_TYPE") return "This file type is not supported. Upload PDF, DOCX, TXT, MD, or image files.";
    if (code === "FILE_TOO_LARGE")    return "File exceeds the 50 MB limit. Compress it first.";
    if (code === "MISSING_OWNER_ID") return "Authentication error — reload the page and try again.";
    // Network / timeout errors (no code)
    if (err.message.includes("timed out")) return err.message;
    if (err.message.includes("Network error")) return err.message;
    return err.message || "Upload failed. Try again.";
  }
  return "Unknown upload error. Try again.";
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface UploadDocMeta {
  title:       string;
  description: string;
  category:    DocCategory;
  folder:      string;
  tags:        string;   // comma-separated
}

export interface UploadSummary {
  successCount: number;
  errorCount:   number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDocumentUpload(ownerId: string) {
  const [tasks, setTasks] = useState<DocUploadTask[]>([]);

  const updateTask = (localId: string, patch: Partial<DocUploadTask>) =>
    setTasks(prev => prev.map(t => t.localId === localId ? { ...t, ...patch } : t));

  const uploadDoc = useCallback(async (file: File, meta: UploadDocMeta) => {
    if (!ownerId) {
      // Auth hasn't resolved yet — this shouldn't normally reach here because
      // the Upload button is gated on user being loaded, but guard defensively.
      console.error("[upload] blocked — ownerId is empty. Wait for auth to resolve.");
      return;
    }

    const localId = crypto.randomUUID();
    console.log("[upload] starting", { ownerId, fileName: file.name, size: file.size, type: file.type });
    setTasks(prev => [...prev, { localId, fileName: file.name, progress: 0, status: "uploading" }]);

    try {
      // Step 1: Upload file to R2 via Cloudflare Pages Function
      const { r2Key, downloadUrl, size } = await uploadToR2(
        ownerId, file, meta.folder,
        pct => updateTask(localId, { progress: pct }),
      );

      // Step 2: Write metadata to Firestore (storagePath = R2 key, not Firebase path)
      updateTask(localId, { status: "creating", progress: 100 });
      const tagList = meta.tags.split(",").map(t => t.trim()).filter(Boolean);
      const docId   = await createIntelligenceDoc({
        ownerId,
        title:            meta.title || file.name.replace(/\.[^.]+$/, ""),
        description:      meta.description,
        fileName:         file.name,
        fileType:         mimeToFileType(file.type),
        mimeType:         file.type,
        fileSize:         size,
        storagePath:      r2Key,       // R2 object key (was Firebase Storage path)
        downloadUrl,                   // /api/r2-serve?key=... (was Firebase download URL)
        folder:           meta.folder,
        tags:             tagList,
        category:         meta.category,
        processingStatus: "ready",
        uploadedAt:       new Date().toISOString(),
        updatedAt:        new Date().toISOString(),
      });

      console.log("[upload] done", { docId, r2Key, size });
      updateTask(localId, { status: "done", docId });

    } catch (err) {
      const code = (err as { code?: string }).code;
      console.error("[upload] failed", {
        code,
        ownerId,
        fileName: file.name,
        hint: code === "R2_NOT_CONFIGURED"
          ? "VAULT_BUCKET binding not set in Cloudflare Pages → Settings → Functions."
          : "Check /api/upload-document response in browser Network tab for details.",
      });
      updateTask(localId, { status: "error", error: formatUploadError(err) });
    }
  }, [ownerId]);

  const clearDone   = () => setTasks(prev => prev.filter(t => t.status !== "done"));
  const dismissTask = (localId: string) => setTasks(prev => prev.filter(t => t.localId !== localId));

  const summary: UploadSummary | null =
    tasks.length > 0 && tasks.every(t => t.status === "done" || t.status === "error")
      ? {
          successCount: tasks.filter(t => t.status === "done").length,
          errorCount:   tasks.filter(t => t.status === "error").length,
        }
      : null;

  return { tasks, uploadDoc, clearDone, dismissTask, summary };
}
