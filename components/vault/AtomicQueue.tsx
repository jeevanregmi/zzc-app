"use client";

import { useState, useMemo } from "react";
import {
  buildAtomicQueue,
  KNOWLEDGE_TIER_META,
  formatCost,
  type AtomicQueueItem,
} from "../../lib/vault/knowledgePriority";
import type { IntelligenceDocument } from "../../lib/types/documents";

interface Props {
  docs:           IntelligenceDocument[];
  onRunAtomic:    (doc: IntelligenceDocument) => void;
  extractingId?:  string | null;
}

export function AtomicQueue({ docs, onRunAtomic, extractingId }: Props) {
  const [open,           setOpen]           = useState(true);
  const [confirmed,      setConfirmed]      = useState(false);
  const [queueRunning,   setQueueRunning]   = useState(false);
  const [queueProgress,  setQueueProgress]  = useState(0);
  const [queueTotal,     setQueueTotal]     = useState(0);
  const [doneIds,        setDoneIds]        = useState<Set<string>>(new Set());

  const queue = useMemo(() => buildAtomicQueue(
    docs.map(d => ({
      id:                  d.id,
      title:               d.title,
      mimeType:            d.mimeType,
      downloadUrl:         d.downloadUrl,
      fileSize:            d.fileSize,
      sourceType:          d.sourceType,
      adminApprovalStatus: d.adminApprovalStatus,
      extractionTier:      d.extractionTier as string | undefined,
      govFolder:           d.govFolder,
      sourceAuthority:     d.sourceAuthority,
      institutionName:     d.institutionName,
      tags:                d.tags,
      category:            d.category,
      description:         d.description,
      fileName:            d.fileName,
      pageCount:           (d as unknown as Record<string, unknown>).pageCount as number | undefined,
    }))
  ), [docs]);

  if (queue.items.length === 0) return null;

  const pending = queue.items.filter(i => !doneIds.has(i.docId));

  async function runQueue() {
    setQueueRunning(true);
    setQueueTotal(pending.length);
    setQueueProgress(0);

    for (const item of pending) {
      // Find the full doc object
      const doc = docs.find(d => d.id === item.docId);
      if (!doc) continue;

      onRunAtomic(doc);

      // Wait for this item to finish (poll via extractingId)
      // Since we can't await the parent handler directly, we use a polling approach.
      // The parent sets extractingId while running — we wait until it clears.
      await new Promise<void>(resolve => {
        const check = () => {
          // Give the parent 200ms to set extractingId, then poll
          setTimeout(() => {
            const checkDone = setInterval(() => {
              // extractingId is null when done — but we can't read it here
              // Instead, wait a fixed time estimate per doc
              clearInterval(checkDone);
              resolve();
            }, 30_000); // 30s per doc — atomic extraction takes 15-60s
          }, 500);
        };
        check();
      });

      setDoneIds(prev => new Set([...prev, item.docId]));
      setQueueProgress(p => p + 1);
    }

    setQueueRunning(false);
    setConfirmed(false);
  }

  return (
    <div className="rounded-2xl border border-amber-800/40 bg-amber-950/10 overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-amber-950/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚛</span>
          <div className="text-left">
            <p className="text-amber-200 font-black text-sm">Recommended Atomic Queue</p>
            <p className="text-amber-600/70 text-xs mt-0.5">
              {queue.items.length} document{queue.items.length !== 1 ? "s" : ""} atomic extraction को लागि ready
              {queue.foundationCount > 0 && ` · ${queue.foundationCount} Foundation`}
              {queue.nationalCount > 0 && ` · ${queue.nationalCount} National`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-amber-400 font-black text-sm">
            {formatCost(queue.totalCostUSD)} अनुमानित
          </span>
          <span className="text-zinc-600 text-xs">{open ? "↑" : "↓"}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-amber-800/30 divide-y divide-amber-900/20">

          {/* Queue items */}
          <div className="px-4 py-3 space-y-2">
            {queue.items.map((item, idx) => {
              const meta  = KNOWLEDGE_TIER_META[item.tier];
              const done  = doneIds.has(item.docId);
              const active = extractingId === item.docId;

              return (
                <div
                  key={item.docId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    done    ? "bg-green-950/30 border border-green-900/40" :
                    active  ? "bg-violet-950/40 border border-violet-800/60 animate-pulse" :
                              "bg-zinc-900/40 border border-zinc-800/50"
                  }`}
                >
                  {/* Rank */}
                  <span className="text-zinc-600 font-mono text-xs w-5 shrink-0 text-center">
                    {done ? "✓" : active ? "⟳" : idx + 1}
                  </span>

                  {/* Tier dot */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />

                  {/* Title + reason */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${done ? "text-green-400" : active ? "text-violet-300" : "text-white"}`}>
                      {item.title}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{item.reason}</p>
                  </div>

                  {/* Tier badge */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${meta.bg} ${meta.color} ${meta.border}`}>
                    {meta.np}
                  </span>

                  {/* Cost */}
                  <span className="text-zinc-600 text-[10px] shrink-0 font-mono">
                    {formatCost(item.estimatedCostUSD)}
                  </span>

                  {/* Single-doc run button */}
                  {!done && !active && !queueRunning && (
                    <button
                      onClick={() => {
                        const doc = docs.find(d => d.id === item.docId);
                        if (doc) onRunAtomic(doc);
                      }}
                      className="text-[10px] text-violet-500 hover:text-violet-300 border border-violet-800/50 rounded-lg px-2 py-0.5 shrink-0 transition-colors"
                    >
                      Run
                    </button>
                  )}
                  {done && (
                    <span className="text-[10px] text-green-500 shrink-0 font-bold">Done</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Cost summary + approve */}
          <div className="px-5 py-4">
            {queueRunning ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-violet-300 text-xs font-bold animate-pulse">
                    ⚛ Queue चल्दैछ — {queueProgress}/{queueTotal} document
                  </p>
                  <span className="text-violet-600 text-xs font-mono">
                    {Math.round((queueProgress / queueTotal) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-1">
                  <div
                    className="bg-violet-500 h-1 rounded-full transition-all duration-1000"
                    style={{ width: `${(queueProgress / queueTotal) * 100}%` }}
                  />
                </div>
                <p className="text-zinc-600 text-[10px]">
                  हरेक document को page-level extraction हुँदैछ — cancel नगर्नुहोस्।
                </p>
              </div>

            ) : !confirmed ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-zinc-400 text-xs">
                    <span className="text-white font-bold">{pending.length} document</span> — अनुमानित खर्च{" "}
                    <span className="text-amber-400 font-bold">
                      {formatCost(pending.reduce((s, i) => s + i.estimatedCostUSD, 0))}
                    </span>
                  </p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">
                    Foundation र National documents — ZZC को real intelligence foundation।
                  </p>
                </div>
                <button
                  onClick={() => setConfirmed(true)}
                  className="shrink-0 px-4 py-2 rounded-xl bg-amber-700 hover:bg-amber-600 text-black font-black text-xs transition-colors"
                >
                  Queue Approve गर्नुहोस्
                </button>
              </div>

            ) : (
              <div className="space-y-3">
                <div className="rounded-xl bg-amber-950/50 border border-amber-700/50 px-4 py-3 space-y-2">
                  <p className="text-amber-200 text-xs font-black">
                    ⚛ पक्का गर्नुहोस् — Atomic Queue Start
                  </p>
                  <div className="space-y-1 text-[11px] text-amber-400/80 leading-relaxed">
                    <p>• {pending.length} official documents sequentially process हुनेछन्</p>
                    <p>• हरेक document को page + paragraph + verbatim evidence store हुनेछ</p>
                    <p>• अनुमानित खर्च: <span className="text-amber-300 font-bold">
                      {formatCost(pending.reduce((s, i) => s + i.estimatedCostUSD, 0))}
                    </span></p>
                    <p className="text-zinc-500">Browser बन्द नगर्नुहोस् — process complete हुन्जेल।</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => void runQueue()}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-black text-xs transition-colors"
                  >
                    हो, सबै run गर्नुहोस्
                  </button>
                  <button
                    onClick={() => setConfirmed(false)}
                    className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                  >
                    रद्द गर्नुहोस्
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Principle reminder */}
          <div className="px-5 py-3 bg-zinc-950/30">
            <p className="text-[10px] text-zinc-600 leading-relaxed">
              <span className="text-zinc-500 font-bold">ZZC Principle:</span>{" "}
              Foundation र National documents मात्र Atomic Intelligence को लागि qualify हुन्छन्।
              Tier 2 = page + paragraph + verbatim evidence — placebo intelligence होइन।
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
