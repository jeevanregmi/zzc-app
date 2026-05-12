"use client";

import Link from "next/link";
import type { IntelligenceDocument } from "../../../lib/types/documents";

const FILE_ICONS: Record<string, string> = {
  pdf:   "📄",
  docx:  "📝",
  md:    "📋",
  txt:   "📃",
  image: "🖼",
  other: "📁",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  uploading:     { label: "Uploading",     cls: "bg-blue-900 text-blue-300" },
  ready:         { label: "Ready",         cls: "bg-zinc-800 text-zinc-400" },
  processing_ai: { label: "Analyzing…",    cls: "bg-amber-900 text-amber-300 animate-pulse" },
  ai_ready:      { label: "AI Ready",      cls: "bg-green-900 text-green-400" },
  error:         { label: "Error",         cls: "bg-red-900 text-red-400" },
};

const CAT_COLORS: Record<string, string> = {
  research:     "border-purple-800",
  strategy:     "border-blue-800",
  legal:        "border-rose-800",
  finance:      "border-green-800",
  content:      "border-amber-800",
  intelligence: "border-cyan-800",
  other:        "border-zinc-800",
};

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

interface Props {
  doc:          IntelligenceDocument;
  isProcessing: boolean;
  queueCount?:  number;
  onView:       (doc: IntelligenceDocument) => void;
  onProcess:    (doc: IntelligenceDocument) => void;
  onDelete:     (doc: IntelligenceDocument) => void;
}

export function DocumentCard({ doc, isProcessing, queueCount = 0, onView, onProcess, onDelete }: Props) {
  const displayStatus = isProcessing ? "processing_ai" : doc.processingStatus;
  const status        = STATUS_BADGE[displayStatus] ?? STATUS_BADGE.ready;
  const border        = CAT_COLORS[doc.category] ?? "border-zinc-800";
  const canProcess    = !isProcessing && (doc.processingStatus === "ready" || doc.processingStatus === "error");

  return (
    <div className={`bg-zinc-900 border ${border} rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{FILE_ICONS[doc.fileType] ?? "📁"}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{doc.title}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{doc.fileName}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.cls}`}>{status.label}</span>
      </div>

      {/* Description */}
      {doc.description && (
        <p className="text-zinc-400 text-xs line-clamp-2">{doc.description}</p>
      )}

      {/* AI Summary */}
      {doc.aiSummary && (
        <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
          <p className="text-zinc-500 text-xs mb-1 font-semibold">AI Summary</p>
          <p className="text-zinc-300 text-xs line-clamp-3">{doc.aiSummary}</p>
        </div>
      )}

      {/* Key Insights */}
      {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
        <ul className="space-y-1">
          {doc.aiKeyInsights.slice(0, 3).map((insight, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="text-green-600 shrink-0 mt-0.5">•</span>
              <span className="line-clamp-2">{insight}</span>
            </li>
          ))}
          {doc.aiKeyInsights.length > 3 && (
            <li className="text-xs text-zinc-600 pl-3">+{doc.aiKeyInsights.length - 3} more insights</li>
          )}
        </ul>
      )}

      {/* Content Ideas — flywheel connector with queue traceability */}
      {doc.contentIdeas && doc.contentIdeas.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs font-semibold">Content Ideas</p>
            {queueCount > 0 ? (
              <Link
                href="/vault/content/queue"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                {queueCount} in queue →
              </Link>
            ) : (
              <span className="text-xs text-zinc-700">{doc.contentIdeas.length} generated</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {doc.contentIdeas.slice(0, 3).map((idea, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-zinc-600 text-xs shrink-0 mt-0.5">→</span>
                <p className="text-zinc-400 text-xs line-clamp-2">{idea}</p>
              </div>
            ))}
            {doc.contentIdeas.length > 3 && (
              <p className="text-zinc-600 text-xs pl-3">+{doc.contentIdeas.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
          {doc.tags.length > 4 && (
            <span className="text-xs text-zinc-600">+{doc.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Detected topics */}
      {doc.detectedTopics && doc.detectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.detectedTopics.map(topic => (
            <span key={topic} className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded-full">{topic}</span>
          ))}
        </div>
      )}

      {/* Source metadata — traceability footer */}
      <div className="flex items-center gap-3 text-xs text-zinc-700">
        <span>{formatSize(doc.fileSize)}</span>
        <span>·</span>
        <span>{doc.category}</span>
        {doc.confidence !== undefined && (
          <>
            <span>·</span>
            <span className={doc.confidence >= 0.7 ? "text-green-700" : doc.confidence >= 0.4 ? "text-yellow-700" : "text-red-700"}>
              {Math.round(doc.confidence * 100)}% confidence
            </span>
          </>
        )}
        {doc.language && doc.language !== "English" && (
          <>
            <span>·</span>
            <span>{doc.language}</span>
          </>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
        <span className="text-zinc-600 text-xs">{new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <div className="flex items-center gap-2">
          {canProcess && (
            <button
              onClick={() => onProcess(doc)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
            >
              Analyze with AI
            </button>
          )}
          {isProcessing && (
            <span className="text-xs text-amber-400">Analyzing…</span>
          )}
          <button
            onClick={() => onView(doc)}
            className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors"
          >
            View
          </button>
          <button
            onClick={() => onDelete(doc)}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
