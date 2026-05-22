"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import type { UploadDocMeta } from "../../../hooks/vault/useDocumentUpload";
import type { DocUploadTask, DocCategory } from "../../../lib/types/documents";
import { createIntelligenceDoc } from "../../../lib/vault/firestore";

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
  tasks:      DocUploadTask[];
  onUpload:   (file: File, meta: UploadDocMeta) => void;
  onClear:    () => void;
  onClose:    () => void;
  onDismiss?: (localId: string) => void;
  ownerId?:   string;
}

// ── URL ingest result preview ─────────────────────────────────────────────────

interface IngestPreview {
  title:         string;
  summary:       string;
  credibility:   string;
  relevanceScore:number;
  detectedTopics:string[];
  aiInsights:    string[];
  contentIdeas:  string[];
  sourceType?:   string;
  sourceAuthority?: string;
}

function UrlIngestPanel({ ownerId, onClose }: { ownerId: string; onClose: () => void }) {
  const [url,       setUrl]       = useState("");
  const [source,    setSource]    = useState("");
  const [category,  setCategory]  = useState<DocCategory>("intelligence");
  const [fetching,  setFetching]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [preview,   setPreview]   = useState<IngestPreview | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);

  const handleIngest = async () => {
    if (!url.trim() || !source.trim()) return;
    setFetching(true);
    setError(null);
    setPreview(null);
    try {
      const res = await fetch("/api/ingest-url", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: url.trim(), sourceName: source.trim() }),
      });
      const data = await res.json() as { ok?: boolean; error?: string } & IngestPreview;
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to fetch URL");
        return;
      }
      setPreview(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setFetching(false);
    }
  };

  const handleSave = async () => {
    if (!preview || !ownerId) return;
    setSaving(true);
    try {
      await createIntelligenceDoc({
        ownerId,
        title:            preview.title || source,
        description:      preview.summary.slice(0, 200),
        fileName:         url,
        fileType:         "other",
        mimeType:         "text/html",
        fileSize:         0,
        storagePath:      url,
        downloadUrl:      url,
        folder:           "government-sources",
        tags:             preview.detectedTopics.slice(0, 5),
        category,
        processingStatus: "ai_ready",
        adminApprovalStatus: "pending_review",
        // AI fields
        aiSummary:        preview.summary,
        aiKeyInsights:    preview.aiInsights,
        detectedTopics:   preview.detectedTopics,
        contentIdeas:     preview.contentIdeas,
        confidence:       preview.relevanceScore,
        sourceCredibility:preview.credibility as "high" | "medium" | "low" | "unverified",
        sourceType:       (preview.sourceType ?? "unknown") as "official" | "unofficial" | "research" | "unknown",
        sourceAuthority:  preview.sourceAuthority,
        sourceUrl:        url,
        language:         "English",
        aiProvider:       "anthropic-sonnet",
        aiRetryCount:     0,
        uploadedAt:       new Date().toISOString(),
        updatedAt:        new Date().toISOString(),
      });
      setSaved(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <p className="text-green-400 font-semibold">Saved to Intelligence Library</p>
        <p className="text-zinc-500 text-sm text-center">Pending admin review. You can re-run AI analysis from the Documents page.</p>
        <button onClick={onClose} className="bg-green-500 hover:bg-green-400 text-black font-black px-6 py-2.5 rounded-xl text-sm">Done</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <input
          type="url"
          placeholder="https://nrb.org.np/publications/... or parliament.gov.np/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
        />
        <input
          type="text"
          placeholder="Source name (e.g. Nepal Rastra Bank, Parliament of Nepal)"
          value={source}
          onChange={e => setSource(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value as DocCategory)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          {(["intelligence", "research", "finance", "legal", "strategy", "other"] as DocCategory[]).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <p className="text-zinc-600 text-xs">Works with: NRB circulars, parliament bills, MoF notices, EPF/SSF pages, news articles, RSS feeds</p>

      {error && <p className="text-red-400 text-sm bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">{error}</p>}

      {!preview ? (
        <button
          onClick={handleIngest}
          disabled={fetching || !url.trim() || !source.trim()}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
        >
          {fetching ? "Fetching + Analyzing…" : "Fetch & Analyze →"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-2">
            <p className="text-white font-semibold text-sm">{preview.title}</p>
            <p className="text-zinc-400 text-xs line-clamp-3">{preview.summary}</p>
            <div className="flex gap-2 flex-wrap">
              {preview.detectedTopics.slice(0, 4).map(t => (
                <span key={t} className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
            <p className="text-zinc-600 text-xs">
              Relevance: {Math.round(preview.relevanceScore * 100)}% · Credibility: {preview.credibility}
              {preview.sourceAuthority && ` · ${preview.sourceAuthority}`}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              {saving ? "Saving…" : "Save to Library →"}
            </button>
            <button
              onClick={() => setPreview(null)}
              className="px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-2.5 rounded-xl text-sm"
            >
              Re-fetch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function DocumentUploadModal({ tasks, onUpload, onClear, onClose, onDismiss, ownerId }: Props) {
  const inputRef   = useRef<HTMLInputElement>(null);
  const [tab,      setTab]     = useState<"file" | "url">("file");
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

  // ── Task state analysis ───────────────────────────────────────────────────────
  const anyActive       = tasks.some(t => t.status === "uploading" || t.status === "creating");
  const anyError        = tasks.some(t => t.status === "error");
  const allSucceeded    = tasks.length > 0 && tasks.every(t => t.status === "done");
  const allSettled      = tasks.length > 0 && !anyActive;
  const successCount    = tasks.filter(t => t.status === "done").length;
  const errorCount      = tasks.filter(t => t.status === "error").length;

  // ── Footer logic ──────────────────────────────────────────────────────────────
  // Three distinct states, never conflated:
  //   allSucceeded → green "Done" — closes modal, clears tasks
  //   allSettled + errors → red error summary — modal stays open, no auto-close
  //   otherwise → Upload button or Uploading… label

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-black text-lg">Add to Intelligence Library</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
          <button
            onClick={() => setTab("file")}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors ${tab === "file" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            Upload File
          </button>
          <button
            onClick={() => setTab("url")}
            className={`flex-1 text-sm font-semibold py-1.5 rounded-lg transition-colors ${tab === "url" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"}`}
          >
            Paste URL
          </button>
        </div>

        {/* URL ingestion panel */}
        {tab === "url" && ownerId && (
          <UrlIngestPanel ownerId={ownerId} onClose={onClose} />
        )}
        {tab === "url" && !ownerId && (
          <p className="text-zinc-500 text-sm text-center py-4">Authentication required</p>
        )}

        {/* Drop zone — only in file tab */}
        {tab === "file" && (
        <>
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
          <ul className="space-y-2 max-h-36 overflow-y-auto">
            {tasks.map(task => (
              <li key={task.localId}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-zinc-400 truncate">{task.fileName}</span>
                  <span className={
                    task.status === "done"     ? "text-green-400" :
                    task.status === "error"    ? "text-red-400"   :
                    task.status === "creating" ? "text-amber-400" :
                                                 "text-zinc-500"
                  }>
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
                {task.error && (
                  <div className="mt-1 bg-red-950/60 border border-red-900/70 rounded-lg px-3 py-2 text-xs">
                    <p className="text-red-400 font-medium">{task.error}</p>
                    {onDismiss && (
                      <button
                        onClick={() => onDismiss(task.localId)}
                        className="mt-1.5 text-red-500 hover:text-red-300 underline"
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* Error summary banner — only shown when all settled and there are errors */}
        {allSettled && anyError && (
          <div className="bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3 space-y-2">
            <p className="text-red-400 text-sm font-semibold">
              {errorCount === tasks.length
                ? `Upload failed — ${errorCount} file${errorCount > 1 ? "s" : ""} could not be saved`
                : `${successCount} saved · ${errorCount} failed`}
            </p>
            <p className="text-red-300/70 text-xs">
              Nothing was saved for the failed files. Check{" "}
              <Link href="/vault/system" className="underline hover:text-red-200" onClick={onClose}>
                System Status
              </Link>{" "}
              to diagnose storage connectivity, then dismiss each error above and try again.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-3">
          {allSucceeded ? (
            <button
              onClick={() => { onClear(); onClose(); }}
              className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              Done — {successCount} saved
            </button>
          ) : allSettled && anyError ? (
            <>
              {successCount > 0 && (
                <button
                  onClick={onClear}
                  className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Keep {successCount} saved, dismiss errors
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                Close (files NOT saved)
              </button>
            </>
          ) : (
            <button
              onClick={handleUploadAll}
              disabled={staged.length === 0 || anyActive}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-2.5 rounded-xl text-sm transition-colors"
            >
              {anyActive ? "Uploading…" : `Upload ${staged.length > 0 ? staged.length + " file" + (staged.length > 1 ? "s" : "") : ""}`.trim()}
            </button>
          )}
          {!allSettled && (
            <button
              onClick={onClose}
              className="px-5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
