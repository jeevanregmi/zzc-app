"use client";

import type { IntelligenceDocument } from "../../../lib/types/documents";

interface Props {
  doc:     IntelligenceDocument;
  onClose: () => void;
}

export function DocumentViewer({ doc, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-zinc-500 text-sm">{doc.category}</span>
          <span className="text-zinc-700">/</span>
          <h2 className="text-white font-semibold text-sm truncate">{doc.title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={doc.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-400 hover:text-green-300 font-semibold transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {doc.fileType === "pdf" && (
          <iframe
            src={doc.downloadUrl}
            className="w-full h-full border-0"
            title={doc.title}
          />
        )}

        {doc.fileType === "image" && (
          <div className="flex items-center justify-center h-full p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.downloadUrl}
              alt={doc.title}
              className="max-w-full max-h-full object-contain rounded-xl"
            />
          </div>
        )}

        {(doc.fileType === "txt" || doc.fileType === "md") && doc.ocrText && (
          <pre className="p-8 text-zinc-300 text-sm whitespace-pre-wrap font-mono leading-relaxed">
            {doc.ocrText}
          </pre>
        )}

        {doc.fileType !== "pdf" && doc.fileType !== "image" &&
          !(doc.fileType === "txt" || doc.fileType === "md") && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
            <span className="text-6xl">📁</span>
            <p className="text-sm">Preview not available for this file type.</p>
            <a
              href={doc.downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="text-green-400 hover:text-green-300 text-sm font-semibold"
            >
              Open in new tab →
            </a>
          </div>
        )}
      </div>

      {(doc.aiSummary || doc.aiKeyInsights?.length) && (
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-6 py-4 max-h-48 overflow-y-auto">
          <h3 className="text-green-400 text-xs font-semibold mb-2">AI Intelligence</h3>
          {doc.aiSummary && (
            <p className="text-zinc-400 text-xs mb-2">{doc.aiSummary}</p>
          )}
          {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
            <ul className="space-y-1">
              {doc.aiKeyInsights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-green-600 shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
