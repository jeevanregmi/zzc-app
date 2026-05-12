"use client";

import { useRef, useState, type DragEvent } from "react";
import type { UploadMeta, MediaContentType, MediaSource, MediaVisibility } from "../../lib/types/vault";
import type { UploadTask } from "../../lib/types/vault";

interface UploadZoneProps {
  onUpload: (file: File, meta: UploadMeta) => void;
  tasks:    UploadTask[];
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,application/pdf";

const CONTENT_TYPES: MediaContentType[] = [
  "financial-education","product-demo","tutorial","research","marketing","raw-footage","thumbnail","other"
];
const SOURCE_TYPES: MediaSource[] = [
  "original","ai-generated","screen-recording","youtube","tiktok","document-scan","external"
];
const VISIBILITIES: MediaVisibility[] = ["private","internal","public"];

export function UploadZone({ onUpload, tasks }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [meta, setMeta] = useState<UploadMeta>({
    folder:         "",
    contentType:    "financial-education",
    sourceType:     "original",
    visibility:     "private",
    generationCost: 0,
    relatedTopics:  "",
    tags:           "",
  });

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(f => onUpload(f, meta));
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach(f => onUpload(f, meta));
    e.target.value = "";
  }

  const active = tasks.filter(t => t.status === "uploading" || t.status === "processing");
  const errors  = tasks.filter(t => t.status === "error");

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors " +
          (dragging ? "border-white bg-zinc-800" : "border-zinc-700 hover:border-zinc-500")
        }
      >
        <p className="text-3xl mb-2">↑</p>
        <p className="text-zinc-300 text-sm">Drop files or click to browse</p>
        <p className="text-zinc-600 text-xs mt-1">Images, Video, Audio, PDF · max 500 MB</p>
        <input ref={fileRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={handleFiles} />
      </div>

      {/* Metadata form */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Folder</label>
          <input
            value={meta.folder}
            onChange={e => setMeta(p => ({ ...p, folder: e.target.value }))}
            placeholder="zzc/2026-05"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Tags (comma-separated)</label>
          <input
            value={meta.tags}
            onChange={e => setMeta(p => ({ ...p, tags: e.target.value }))}
            placeholder="sip, nepal, finance"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Content Type</label>
          <select
            value={meta.contentType}
            onChange={e => setMeta(p => ({ ...p, contentType: e.target.value as MediaContentType }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Source</label>
          <select
            value={meta.sourceType}
            onChange={e => setMeta(p => ({ ...p, sourceType: e.target.value as MediaSource }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {SOURCE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Visibility</label>
          <select
            value={meta.visibility}
            onChange={e => setMeta(p => ({ ...p, visibility: e.target.value as MediaVisibility }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {VISIBILITIES.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Generation Cost (USD)</label>
          <input
            type="number"
            min={0}
            step={0.001}
            value={meta.generationCost}
            onChange={e => setMeta(p => ({ ...p, generationCost: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          />
        </div>
      </div>

      {/* Active uploads */}
      {active.length > 0 && (
        <div className="space-y-2">
          {active.map(t => (
            <div key={t.localId} className="bg-zinc-800 rounded-lg px-3 py-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-300 truncate max-w-[70%]">{t.fileName}</span>
                <span className="text-zinc-500">{t.status === "processing" ? "Processing…" : `${t.progress}%`}</span>
              </div>
              <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-200"
                  style={{ width: `${t.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map(t => (
            <p key={t.localId} className="text-xs text-red-400">
              {t.fileName}: {t.error}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
