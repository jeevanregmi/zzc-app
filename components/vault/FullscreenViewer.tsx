"use client";

import { useState, useEffect } from "react";
import type { VaultMedia, MediaUsageStatus } from "../../lib/vault/types";
import { updateMedia, deleteMedia } from "../../lib/vault/firestore";

interface FullscreenViewerProps {
  media:    VaultMedia | null;
  onClose:  () => void;
  onDelete: (id: string) => void;
}

const STATUS_OPTIONS: MediaUsageStatus[] = ["draft", "ready", "published", "archived"];

export function FullscreenViewer({ media, onClose, onDelete }: FullscreenViewerProps) {
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [tagInput,    setTagInput]    = useState("");
  const [status,      setStatus]      = useState<MediaUsageStatus>("draft");
  const [saving,      setSaving]      = useState(false);
  const [deleting,    setDeleting]    = useState(false);

  // Sync local state when media changes
  useEffect(() => {
    if (!media) return;
    setTitle(media.title);
    setDescription(media.description);
    setTagInput(media.tags.join(", "));
    setStatus(media.usageStatus);
  }, [media?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!media) return null;

  const isImage = media.mimeType.startsWith("image/");
  const isVideo = media.mimeType.startsWith("video/");
  const isPDF   = media.mimeType === "application/pdf";

  async function handleSave() {
    if (!media) return;
    setSaving(true);
    try {
      await updateMedia(media.id, {
        title,
        description,
        tags:        tagInput.split(",").map(t => t.trim()).filter(Boolean),
        usageStatus: status,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!media || !confirm(`Delete "${media.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await deleteMedia(media.id);
      onDelete(media.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col md:flex-row gap-0 bg-zinc-900 rounded-2xl overflow-hidden">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black transition"
        >
          ✕
        </button>

        {/* Media display */}
        <div className="flex-1 bg-black flex items-center justify-center min-h-64 max-h-[60vh] md:max-h-[90vh] overflow-hidden">
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.downloadUrl}
              alt={media.title}
              className="max-w-full max-h-full object-contain"
            />
          )}
          {isVideo && (
            <video
              src={media.downloadUrl}
              controls
              className="max-w-full max-h-full"
            />
          )}
          {isPDF && (
            <iframe
              src={media.downloadUrl}
              className="w-full h-full min-h-96"
              title={media.title}
            />
          )}
          {!isImage && !isVideo && !isPDF && (
            <div className="text-center p-8">
              <p className="text-4xl mb-4">📎</p>
              <p className="text-zinc-400 mb-4">{media.fileName}</p>
              <a
                href={media.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition"
              >
                Download
              </a>
            </div>
          )}
        </div>

        {/* Metadata sidebar */}
        <div className="w-full md:w-80 flex flex-col overflow-y-auto border-t md:border-t-0 md:border-l border-zinc-800">
          <div className="flex-1 p-5 space-y-4">

            {/* Title */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Tags (comma separated)</label>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                placeholder="sip, nepal, finance"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-zinc-500 mb-1 uppercase tracking-wider">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as MediaUsageStatus)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Read-only metadata */}
            <div className="space-y-2 pt-2 border-t border-zinc-800">
              <MetaRow label="Topic"    value={media.topic} />
              <MetaRow label="Source"   value={media.source || "—"} />
              <MetaRow label="Type"     value={media.contentType} />
              <MetaRow label="MIME"     value={media.mimeType} />
              {media.width > 0 && (
                <MetaRow label="Size" value={`${media.width}×${media.height}`} />
              )}
              {media.durationSeconds > 0 && (
                <MetaRow label="Duration" value={`${media.durationSeconds}s`} />
              )}
              {media.costEstimate > 0 && (
                <MetaRow label="Cost" value={`NPR ${media.costEstimate}`} />
              )}
              <MetaRow label="Folder"   value={media.folder || "root"} />
              <MetaRow label="Uploaded" value={new Date(media.createdAt).toLocaleDateString("ne-NP")} />
            </div>
          </div>

          {/* Action buttons */}
          <div className="p-4 border-t border-zinc-800 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-zinc-200 transition disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <a
              href={media.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-zinc-800 text-zinc-300 text-sm rounded-lg hover:bg-zinc-700 transition"
            >
              ↓
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2 bg-red-950 text-red-400 text-sm rounded-lg hover:bg-red-900 transition disabled:opacity-50"
            >
              {deleting ? "…" : "🗑"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-xs text-zinc-600">{label}</span>
      <span className="text-xs text-zinc-400 text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
