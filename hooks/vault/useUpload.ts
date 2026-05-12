"use client";

import { useState, useCallback } from "react";
import type { UploadTask, UploadMeta, MediaMimeType } from "../../lib/vault/types";
import { uploadMedia, uploadThumbnail, extractVideoThumbnail } from "../../lib/vault/storage";
import { createMedia } from "../../lib/vault/firestore";

export function useUpload(ownerId: string) {
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const updateTask = (localId: string, patch: Partial<UploadTask>) =>
    setTasks(prev => prev.map(t => t.localId === localId ? { ...t, ...patch } : t));

  const uploadFile = useCallback(async (file: File, meta: UploadMeta) => {
    const localId  = crypto.randomUUID();
    const mimeType = file.type as MediaMimeType;

    setTasks(prev => [...prev, { localId, fileName: file.name, progress: 0, status: "uploading" }]);

    try {
      const { storagePath, downloadUrl, size } = await uploadMedia(
        ownerId, file, meta.folder, mimeType,
        pct => updateTask(localId, { progress: pct }),
      );

      updateTask(localId, { status: "processing", progress: 100 });

      // Thumbnail for video
      let thumbnailUrl = "";
      if (mimeType.startsWith("video/")) {
        const blob = await extractVideoThumbnail(file);
        if (blob) thumbnailUrl = await uploadThumbnail(ownerId, blob, crypto.randomUUID());
      }

      // Image dimensions
      let width = 0, height = 0;
      if (mimeType.startsWith("image/")) {
        await new Promise<void>(resolve => {
          const img = new Image();
          img.onload  = () => { width = img.naturalWidth; height = img.naturalHeight; resolve(); };
          img.onerror = () => resolve();
          img.src = downloadUrl;
        });
      }

      const tagList    = meta.tags.split(",").map(t => t.trim()).filter(Boolean);
      const topicList  = meta.relatedTopics.split(",").map(t => t.trim()).filter(Boolean);

      const mediaId = await createMedia({
        ownerId,
        fileName:        file.name,
        storagePath,
        downloadUrl,
        mimeType,
        size,
        folder:          meta.folder,
        tags:            tagList,
        title:           file.name.replace(/\.[^.]+$/, ""),
        description:     "",
        aiGenerated:     meta.sourceType === "ai-generated",
        aiPrompt:        "",
        aiModel:         "",
        width,
        height,
        durationSeconds: 0,
        thumbnailUrl,
        // intelligence metadata
        topic:           "other",           // will be updated by semantic-tagger agent
        source:          meta.sourceType,
        contentType:     meta.contentType,
        visibility:      meta.visibility,
        usageStatus:     "draft",
        costEstimate:    meta.generationCost,
        relatedTopics:   topicList,
        relatedSchemes:  [],
        relatedSectors:  [],
        embeddingId:     "",
        extractedText:   "",
      });

      updateTask(localId, { status: "done", mediaId });
    } catch (err) {
      updateTask(localId, { status: "error", error: String(err) });
    }
  }, [ownerId]);

  const clearDone = () => setTasks(prev => prev.filter(t => t.status !== "done"));

  return { tasks, uploadFile, clearDone };
}
