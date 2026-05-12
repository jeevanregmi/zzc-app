"use client";

import { useState, useCallback } from "react";
import { uploadIntelligenceDoc } from "../../lib/vault/storage";
import { createIntelligenceDoc } from "../../lib/vault/firestore";
import type { DocUploadTask, DocCategory, DocFileType } from "../../lib/types/documents";

function mimeToFileType(mime: string): DocFileType {
  if (mime === "application/pdf")                             return "pdf";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (mime === "text/markdown" || mime === "text/x-markdown") return "md";
  if (mime === "text/plain")                                  return "txt";
  if (mime.startsWith("image/"))                              return "image";
  return "other";
}

export interface UploadDocMeta {
  title:       string;
  description: string;
  category:    DocCategory;
  folder:      string;
  tags:        string;          // comma-separated
}

export function useDocumentUpload(ownerId: string) {
  const [tasks, setTasks] = useState<DocUploadTask[]>([]);

  const updateTask = (localId: string, patch: Partial<DocUploadTask>) =>
    setTasks(prev => prev.map(t => t.localId === localId ? { ...t, ...patch } : t));

  const uploadDoc = useCallback(async (file: File, meta: UploadDocMeta) => {
    const localId = crypto.randomUUID();
    setTasks(prev => [...prev, { localId, fileName: file.name, progress: 0, status: "uploading" }]);

    try {
      const { storagePath, downloadUrl, size } = await uploadIntelligenceDoc(
        ownerId, file, meta.folder,
        pct => updateTask(localId, { progress: pct }),
      );

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
        storagePath,
        downloadUrl,
        folder:           meta.folder,
        tags:             tagList,
        category:         meta.category,
        processingStatus: "ready",
        uploadedAt:       new Date().toISOString(),
        updatedAt:        new Date().toISOString(),
      });

      updateTask(localId, { status: "done", docId });
    } catch (err) {
      updateTask(localId, { status: "error", error: String(err) });
    }
  }, [ownerId]);

  const clearDone = () => setTasks(prev => prev.filter(t => t.status !== "done"));

  return { tasks, uploadDoc, clearDone };
}
