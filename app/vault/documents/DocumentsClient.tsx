"use client";

import { useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import { useDocumentUpload } from "../../../hooks/vault/useDocumentUpload";
import { deleteIntelligenceDoc } from "../../../lib/vault/firestore";
import { deleteStorageFile } from "../../../lib/vault/storage";
import { DocumentCard } from "../../../components/vault/documents/DocumentCard";
import { DocumentUploadModal } from "../../../components/vault/documents/DocumentUploadModal";
import { DocumentViewer } from "../../../components/vault/documents/DocumentViewer";
import type { IntelligenceDocument, DocCategory } from "../../../lib/types/documents";

const ALL_CATEGORIES = ["all", "research", "strategy", "legal", "finance", "content", "intelligence", "other"] as const;
type FilterCategory = typeof ALL_CATEGORIES[number];

const CAT_LABEL: Record<FilterCategory, string> = {
  all:          "All",
  research:     "Research",
  strategy:     "Strategy",
  legal:        "Legal",
  finance:      "Finance",
  content:      "Content",
  intelligence: "Intelligence",
  other:        "Other",
};

export default function DocumentsClient() {
  const { user } = useVaultAuth();
  const { docs, loading } = useIntelligenceDocs(user?.uid ?? null);
  const { tasks, uploadDoc, clearDone } = useDocumentUpload(user?.uid ?? "");

  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState<FilterCategory>("all");
  const [showUpload, setShowUpload] = useState(false);
  const [viewing,    setViewing]    = useState<IntelligenceDocument | null>(null);

  const filtered = docs.filter(d => {
    const matchCat   = filter === "all" || d.category === filter;
    const q          = search.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.fileName.toLowerCase().includes(q) || d.tags.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleDelete = async (doc: IntelligenceDocument) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await Promise.all([
      deleteIntelligenceDoc(doc.id),
      doc.storagePath ? deleteStorageFile(doc.storagePath).catch(() => {}) : Promise.resolve(),
    ]);
  };

  const aiReadyCount = docs.filter(d => d.processingStatus === "ai_ready").length;

  return (
    <>
      {showUpload && (
        <DocumentUploadModal
          tasks={tasks}
          onUpload={uploadDoc}
          onClear={clearDone}
          onClose={() => setShowUpload(false)}
        />
      )}

      {viewing && (
        <DocumentViewer
          doc={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Intelligence Library</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {docs.length} document{docs.length !== 1 ? "s" : ""}
              {aiReadyCount > 0 && <span className="text-green-400 ml-2">· {aiReadyCount} AI-ready</span>}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            + Upload Documents
          </button>
        </div>

        {/* Stats row */}
        {docs.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total Docs",   value: docs.length },
              { label: "AI Ready",     value: aiReadyCount },
              { label: "Processing",   value: docs.filter(d => d.processingStatus === "processing_ai").length },
              { label: "Categories",   value: new Set(docs.map(d => d.category)).size },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-zinc-500 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search + filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Search documents, tags…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2 flex-wrap">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                  filter === cat
                    ? "bg-white text-black"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {CAT_LABEL[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Document grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-zinc-600 text-sm">Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            {docs.length === 0 ? (
              <>
                <span className="text-6xl">📄</span>
                <p className="text-zinc-500 text-sm">No documents yet.</p>
                <p className="text-zinc-600 text-xs">Upload PDFs, strategy docs, research files, or images.</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="mt-2 text-green-400 hover:text-green-300 text-sm font-semibold"
                >
                  Upload your first document →
                </button>
              </>
            ) : (
              <>
                <p className="text-zinc-500 text-sm">No documents match your search.</p>
                <button onClick={() => { setSearch(""); setFilter("all"); }} className="text-zinc-600 text-xs hover:text-zinc-400">
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(doc => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onView={setViewing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* AI processing notice */}
        {docs.length > 0 && docs.some(d => d.processingStatus === "ready") && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h3 className="text-white font-semibold text-sm mb-1">AI Processing</h3>
            <p className="text-zinc-500 text-xs">
              Documents marked "Ready" are queued for AI analysis — summarization, key insight extraction, and translation. Processing will run automatically when the AI Pipeline worker is active.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
