"use client";

import { useState } from "react";
import { VaultGate }     from "../../../components/vault/VaultGate";
import { useVaultAuth }  from "../../../hooks/vault/useVaultAuth";
import { useMediaItems } from "../../../hooks/vault/useMediaItems";
import { useUpload }     from "../../../hooks/vault/useUpload";
import { MediaGrid }     from "../../../components/vault/MediaGrid";
import { UploadZone }    from "../../../components/vault/UploadZone";
import { FullscreenViewer } from "../../../components/vault/FullscreenViewer";
import type { VaultMedia }  from "../../../lib/vault/types";
import type { UploadMeta }  from "../../../lib/vault/types";

type Panel = "grid" | "upload";

function MediaInner() {
  const { user }                                 = useVaultAuth();
  const { items, loading: mediaLoading }         = useMediaItems(user?.uid ?? null);
  const { tasks, uploadFile, clearDone }         = useUpload(user?.uid ?? "");

  const [panel,    setPanel]    = useState<Panel>("grid");
  const [selected, setSelected] = useState<VaultMedia | null>(null);

  function handleUpload(file: File, meta: UploadMeta): void {
    uploadFile(file, meta);
    // Switch to grid after queuing so user sees progress
    setPanel("grid");
  }

  const doneCount = tasks.filter(t => t.status === "done").length;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Media Vault</h1>
            <p className="text-zinc-500 text-sm mt-0.5">
              {items.length} asset{items.length !== 1 ? "s" : ""} stored
            </p>
          </div>
          <div className="flex gap-2">
            {doneCount > 0 && (
              <button
                onClick={clearDone}
                className="px-3 py-2 text-xs text-zinc-400 hover:text-white transition"
              >
                Clear {doneCount} done
              </button>
            )}
            <button
              onClick={() => setPanel(p => p === "upload" ? "grid" : "upload")}
              className={
                "px-4 py-2 text-sm rounded-lg font-medium transition " +
                (panel === "upload"
                  ? "bg-zinc-800 text-white"
                  : "bg-white text-black hover:bg-zinc-200")
              }
            >
              {panel === "upload" ? "← Back to grid" : "Upload"}
            </button>
          </div>
        </div>

        {/* Active upload progress */}
        {tasks.filter(t => t.status === "uploading" || t.status === "processing").length > 0 && (
          <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
            <p className="text-xs text-zinc-500 mb-3 uppercase tracking-wider">Uploading</p>
            <div className="space-y-2">
              {tasks.filter(t => t.status === "uploading" || t.status === "processing").map(t => (
                <div key={t.localId}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-300 truncate max-w-[60%]">{t.fileName}</span>
                    <span className="text-zinc-500">
                      {t.status === "processing" ? "Processing…" : `${t.progress}%`}
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all" style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main panel */}
        {panel === "upload" ? (
          <div className="max-w-2xl">
            <h2 className="text-lg font-medium mb-4">Upload Assets</h2>
            <UploadZone onUpload={handleUpload} tasks={tasks} />
          </div>
        ) : (
          <MediaGrid
            items={items}
            loading={mediaLoading}
            onSelect={setSelected}
          />
        )}
      </div>

      {/* Fullscreen viewer */}
      <FullscreenViewer
        media={selected}
        onClose={() => setSelected(null)}
        onDelete={id => {
          if (selected?.id === id) setSelected(null);
        }}
      />
    </div>
  );
}

export default function MediaClient() {
  return (
    <VaultGate>
      <MediaInner />
    </VaultGate>
  );
}
