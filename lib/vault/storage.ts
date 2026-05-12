/**
 * Vault Firebase Storage Adapter
 *
 * Handles upload, download URL retrieval, and deletion for vault media.
 * All paths follow the pattern: vault/{uid}/{subfolder}/{filename}
 *
 * Returns progress via a callback so the hook can update UI state
 * without coupling progress tracking to this module.
 */

import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
  type StorageReference,
} from "firebase/storage";
import { storage } from "../../app/firebase";
import type { MediaMimeType } from "./types";

export interface UploadResult {
  storagePath: string;
  downloadUrl: string;
  size:        number;
}

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
  return new Promise((resolve, reject) => {
    const subfolder   = subfolderFor(mimeType);
    const safeName    = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `vault/${uid}/${subfolder}/${folder ? folder + "/" : ""}${safeName}`;
    const storageRef: StorageReference = ref(storage, storagePath);

    const task = uploadBytesResumable(storageRef, file, { contentType: mimeType });

    task.on(
      "state_changed",
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress(pct);
      },
      error => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(task.snapshot.ref);
        resolve({ storagePath, downloadUrl, size: file.size });
      },
    );
  });
}

export async function uploadThumbnail(
  uid:      string,
  blob:     Blob,
  mediaId:  string,
): Promise<string> {
  const path = `vault/${uid}/images/thumbnails/${mediaId}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytesResumable(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}

export async function deleteStorageFile(storagePath: string): Promise<void> {
  await deleteObject(ref(storage, storagePath));
}

export function uploadIntelligenceDoc(
  uid:        string,
  file:       File,
  folder:     string,
  onProgress: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const safeName    = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const storagePath = `vault/${uid}/intelligence-docs/${folder ? folder + "/" : ""}${safeName}`;
    const storageRef  = ref(storage, storagePath);
    const task        = uploadBytesResumable(storageRef, file, { contentType: file.type });

    task.on(
      "state_changed",
      snap => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        onProgress(pct);
      },
      error => reject(error),
      async () => {
        const downloadUrl = await getDownloadURL(task.snapshot.ref);
        resolve({ storagePath, downloadUrl, size: file.size });
      },
    );
  });
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

    video.src      = url;
    video.muted    = true;
    video.preload  = "metadata";
    video.currentTime = 1;            // seek to 1s (frame 0 is often black)

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
