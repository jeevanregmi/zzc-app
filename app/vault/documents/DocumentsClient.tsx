"use client";

import { useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import { useDocumentUpload } from "../../../hooks/vault/useDocumentUpload";
import { deleteIntelligenceDoc, updateIntelligenceDoc, createQueueItem } from "../../../lib/vault/firestore";
import { deleteStorageFile } from "../../../lib/vault/storage";
import { DocumentCard } from "../../../components/vault/documents/DocumentCard";
import { DocumentUploadModal } from "../../../components/vault/documents/DocumentUploadModal";
import { DocumentViewer } from "../../../components/vault/documents/DocumentViewer";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import type { QueueContentType, QueuePlatform } from "../../../lib/types/queue";

function inferContentType(idea: string): QueueContentType {
  const l = idea.toLowerCase();
  if (l.startsWith("youtube:"))   return "youtube-long";
  if (l.startsWith("short:") || l.startsWith("reel:"))   return "shorts";
  if (l.startsWith("post:") || l.startsWith("facebook:")) return "facebook-post";
  if (l.startsWith("carousel:"))  return "carousel";
  if (l.startsWith("explainer:")) return "explainer";
  return "other";
}

function inferPlatform(idea: string): QueuePlatform {
  const l = idea.toLowerCase();
  if (l.startsWith("youtube:"))  return "youtube";
  if (l.startsWith("short:") || l.startsWith("reel:") || l.startsWith("carousel:")) return "instagram";
  if (l.startsWith("post:") || l.startsWith("facebook:")) return "facebook";
  return "all";
}

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

  const [search,       setSearch]      = useState("");
  const [filter,       setFilter]      = useState<FilterCategory>("all");
  const [showUpload,   setShowUpload]  = useState(false);
  const [viewing,      setViewing]     = useState<IntelligenceDocument | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);

  const filtered = docs.filter(d => {
    const matchCat    = filter === "all" || d.category === filter;
    const q           = search.toLowerCase();
    const matchSearch = !q
      || d.title.toLowerCase().includes(q)
      || d.fileName.toLowerCase().includes(q)
      || d.tags.some(t => t.toLowerCase().includes(q))
      || d.detectedTopics?.some(t => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleDelete = async (doc: IntelligenceDocument) => {
    if (!confirm(`Delete "${doc.title}"?`)) return;
    await Promise.all([
      deleteIntelligenceDoc(doc.id),
      doc.storagePath ? deleteStorageFile(doc.storagePath).catch(() => {}) : Promise.resolve(),
    ]);
  };

  const handleProcess = async (doc: IntelligenceDocument) => {
    setProcessingId(doc.id);
    setProcessError(null);

    // Optimistic update: show "Analyzing…" badge immediately
    await updateIntelligenceDoc(doc.id, { processingStatus: "processing_ai" });

    try {
      const res = await fetch("/api/process-document", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          docId:       doc.id,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType,
          fileName:    doc.fileName,
        }),
      });

      const data = await res.json() as {
        ok?:             boolean;
        error?:          string;
        aiSummary?:      string;
        aiKeyInsights?:  string[];
        detectedTopics?: string[];
        contentIdeas?:   string[];
        language?:       string;
        confidence?:     number;
      };

      if (!res.ok || data.error) {
        await updateIntelligenceDoc(doc.id, { processingStatus: "error" });
        setProcessError(data.error ?? "Processing failed. Try again.");
        return;
      }

      await updateIntelligenceDoc(doc.id, {
        processingStatus: "ai_ready",
        aiSummary:        data.aiSummary,
        aiKeyInsights:    data.aiKeyInsights,
        detectedTopics:   data.detectedTopics,
        contentIdeas:     data.contentIdeas,
        language:         data.language,
        confidence:       data.confidence,
      });

      // Create queue items with full source traceability
      const ideas    = data.contentIdeas ?? [];
      const insights = data.aiKeyInsights ?? [];
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      await Promise.all(ideas.map(idea =>
        createQueueItem({
          ownerId:           user!.uid,
          aiTitle:           idea.replace(/^(YouTube|Short|Post|Reel|Carousel|Explainer):\s*/i, ""),
          contentType:       inferContentType(idea),
          platform:          inferPlatform(idea),
          // Source traceability — every item links back to originating document
          sourceDocId:       doc.id,
          sourceDocTitle:    doc.title,
          sourceDocUrl:      doc.downloadUrl,
          sourceDocFileName: doc.fileName,
          sourceInsights:    insights,
          sourceUploadedAt:  doc.uploadedAt,
          // Intelligence scores
          confidence:        data.confidence ?? 0.5,
          language:          data.language ?? "English",
          // Admin workflow
          status:            "pending",
          adminNotes:        "",
          expiresAt,
          createdAt:         new Date().toISOString(),
          updatedAt:         new Date().toISOString(),
        })
      ));

    } catch (err) {
      await updateIntelligenceDoc(doc.id, { processingStatus: "error" });
      setProcessError(`Network error: ${String(err)}`);
    } finally {
      setProcessingId(null);
    }
  };

  const aiReadyCount  = docs.filter(d => d.processingStatus === "ai_ready").length;
  const readyCount    = docs.filter(d => d.processingStatus === "ready").length;

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
              {readyCount > 0 && <span className="text-zinc-500 ml-2">· {readyCount} awaiting analysis</span>}
            </p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            + Upload Documents
          </button>
        </div>

        {/* Process error banner */}
        {processError && (
          <div className="mb-6 bg-red-950 border border-red-800 rounded-2xl px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-red-400 text-sm">{processError}</p>
            <button onClick={() => setProcessError(null)} className="text-red-600 hover:text-red-400 text-lg leading-none shrink-0">×</button>
          </div>
        )}

        {/* Stats row */}
        {docs.length > 0 && (
          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { label: "Total Docs",  value: docs.length },
              { label: "AI Ready",    value: aiReadyCount },
              { label: "Awaiting AI", value: readyCount },
              { label: "Categories",  value: new Set(docs.map(d => d.category)).size },
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
            placeholder="Search titles, tags, topics…"
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
                <p className="text-zinc-600 text-xs">Upload NRB circulars, EPF policy docs, research files, or images.</p>
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
                <button
                  onClick={() => { setSearch(""); setFilter("all"); }}
                  className="text-zinc-600 text-xs hover:text-zinc-400"
                >
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
                isProcessing={processingId === doc.id}
                onView={setViewing}
                onProcess={handleProcess}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Content ideas summary — flywheel banner */}
        {docs.some(d => d.contentIdeas && d.contentIdeas.length > 0) && (
          <div className="mt-8 bg-zinc-900 border border-cyan-900 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-400 font-semibold text-sm">Content Pipeline</span>
              <span className="text-zinc-600 text-xs">— ideas surfaced from your intelligence</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {docs
                .filter(d => d.contentIdeas && d.contentIdeas.length > 0)
                .flatMap(d => d.contentIdeas!)
                .slice(0, 6)
                .map((idea, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-700 text-xs mt-0.5 shrink-0">→</span>
                    <p className="text-zinc-400 text-xs">{idea}</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
