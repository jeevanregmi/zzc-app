"use client";

import { useRef, useState, useCallback } from "react";
import type { UploadDocMeta } from "../../../hooks/vault/useDocumentUpload";
import type { DocUploadTask } from "../../../lib/types/documents";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const CATEGORIES = ["research", "strategy", "legal", "finance", "content", "intelligence", "other"] as const;

interface Props {
  tasks:     DocUploadTask[];
  onUpload:  (file: File, meta: UploadDocMeta) => void;
  onClear:   () => void;
  onClose:   () => void;
}

export function DocumentUploadModal({ tasks, onUpload, onClear, onClose }: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [staged,   setStaged]   = useState<File[]>([]);
  const [meta, setMeta] = useState<UploadDocMeta>({
    title:       "",
    description: "",
    category:    "research",
    folder:      "",
    tags:        "",
  });

  const addFiles = (files: File[]) => {
    const valid = files.filter(f => ALLOWED_MIME.includes(f.type));
    setStaged(prev => [...prev, ...valid]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleUploadAll = () => {
    staged.forEach(file => {
      onUpload(file, {
        ...meta,
        title: meta.title || file.name.replace(/\.[^.]+$/, ""),
      });
    });
    setStaged([]);
  };

  const allDone    = tasks.length > 0 && tasks.every(t => t.status === "done" || t.status === "error");
  const anyActive  = tasks.some(t => t.status === "uploading" || t.status === "creating");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black text-lg">Upload Documents</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragging ? "border-green-500 bg-green-950/20" : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ALLOWED_MIME.join(",")}
            className="hidden"
            onChange={e => addFiles(Array.from(e.target.files ?? []))}
          />
          <p className="text-zinc-400 text-sm">Drop files here or click to browse</p>
          <p className="text-zinc-600 text-xs mt-1">PDF, DOCX, TXT, MD, Images</p>
          {staged.length > 0 && (
            <p className="text-green-400 text-xs mt-2 font-semibold">{staged.length} file{staged.length > 1 ? "s" : ""} staged</p>
          )}
        </div>

        {/* Staged file list */}
        {staged.length > 0 && (
          <ul className="space-y-1 max-h-24 overflow-y-auto">
            {staged.map((f, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg">
                <span className="truncate">{f.name}</span>
                <button onClick={() => setStaged(prev => prev.filter((_, idx) => idx !== i))} className="text-zinc-600 hover:text-red-400 ml-2 shrink-0">×</button>
              </li>
            ))}
          </ul>
        )}

        {/* Metadata form */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Title (optional — defaults to filename)"
              value={meta.title}
              onChange={e => setMeta(p => ({ ...p, title: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Description (optional)"
              value={meta.description}
              onChange={e => setMeta(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <select
            value={meta.category}
            onChange={e => setMeta(p => ({ ...p, category: e.target.value as typeof meta.category }))}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-500"
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Folder (optional)"
            value={meta.folder}
            onChange={e => setMeta(p => ({ ...p, folder: e.target.value }))}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
          />
          <div className="col-span-2">
            <input
              type="text"
              placeholder="Tags (comma-separated)"
              value={meta.tags}
              onChange={e => setMeta(p => ({ ...p, tags: e.target.value }))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
        </div>

        {/* Upload tasks */}
        {tasks.length > 0 && (
          <ul className="space-y-2 max-h-32 overflow-y-auto">
            {tasks.map(task => (
              <li key={task.localId}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400 truncate">{task.fileName}</span>
                  <span className={task.status === "done" ? "text-green-400" : task.status === "error" ? "text-red-400" : "text-zinc-500"}>
                    {task.status === "uploading" ? `${task.progress}%` : task.status}
                  </span>
                </div>
                {task.status === "uploading" && (
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
                {task.error && <p className="text-red-400 text-xs">{task.error}</p>}
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3">
          {allDone ? (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              Done
            </button>
          ) : (
            <button
              onClick={handleUploadAll}
              disabled={staged.length === 0 || anyActive}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              {anyActive ? "Uploading…" : `Upload ${staged.length > 0 ? staged.length + " file" + (staged.length > 1 ? "s" : "") : ""}`.trim()}
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
