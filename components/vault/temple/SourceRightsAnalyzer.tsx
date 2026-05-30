"use client";

// SourceRightsAnalyzer — URL-first rights + monetization check for Temple Vault.
//
// Founder pastes a URL → rule-based analysis → rights card → action decision.
// Supports up to 10 items in the review queue (persisted in source_review_queue).
// Phase 1: rule-based only. Phase 2+: AI metadata extraction.

import { useState, useEffect } from "react";
import {
  collection, query, where, limit, getDocs, addDoc, updateDoc, doc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import {
  analyzeSourceUrl,
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  MEDIA_TYPE_LABELS,
  RIGHTS_LABELS,
  RIGHTS_COLORS,
  MONETIZATION_LABELS,
  MONETIZATION_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type RightsClear,
  type SourceRightsAnalysis,
  type ReviewStatus,
} from "../../../lib/vault/sourceRightsEngine";

// ── Types ──────────────────────────────────────────────────────────────────────

interface QueueItem {
  id?:       string;
  url:       string;
  status:    ReviewStatus;
  analysis:  SourceRightsAnalysis;
  createdAt: string;
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SourceRightsAnalyzer]", e?.code ?? e); return fb; });

// ── Rights row ─────────────────────────────────────────────────────────────────

function RightsRow({ label, val }: { label: string; val: RightsClear }) {
  const cls  = RIGHTS_COLORS[val] ?? "text-zinc-600";
  const text = RIGHTS_LABELS[val] ?? val;
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-600 text-[10px]">{label}</span>
      <span className={`text-[10px] font-medium ${cls}`}>{text}</span>
    </div>
  );
}

// ── Action button strip ────────────────────────────────────────────────────────

function ActionStrip({
  current,
  saving,
  onAction,
}: {
  current:  ReviewStatus;
  saving:   boolean;
  onAction: (s: ReviewStatus) => void;
}) {
  const actions: Array<{ status: ReviewStatus; label: string; cls: string; activeCls: string }> = [
    {
      status:    "saved_private",
      label:     "🔒 Private मा Save",
      cls:       "border-white/[0.08] text-zinc-400 hover:text-violet-300 hover:border-violet-800/60",
      activeCls: "border-violet-800/60 bg-violet-950/30 text-violet-300",
    },
    {
      status:    "permission_needed",
      label:     "✉ Permission चाहिन्छ",
      cls:       "border-white/[0.08] text-zinc-400 hover:text-amber-300 hover:border-amber-800/60",
      activeCls: "border-amber-800/60 bg-amber-950/20 text-amber-300",
    },
    {
      status:    "rejected",
      label:     "✕ Reject",
      cls:       "border-white/[0.08] text-zinc-500 hover:text-red-400 hover:border-red-900/60",
      activeCls: "border-red-900/60 bg-red-950/20 text-red-400",
    },
  ];

  return (
    <div className="flex gap-2 flex-wrap pt-1">
      {actions.map(a => (
        <button
          key={a.status}
          onClick={() => onAction(a.status)}
          disabled={saving || current === a.status}
          className={`text-xs border rounded-xl px-3 py-2 transition-colors disabled:opacity-50 ${
            current === a.status ? a.activeCls : a.cls
          }`}
        >
          {a.label}
        </button>
      ))}
      {saving && <span className="text-zinc-700 text-[10px] self-center">Saving…</span>}
    </div>
  );
}

// ── Analysis card (expanded view) ──────────────────────────────────────────────

function AnalysisCard({
  item,
  idx,
  saving,
  onAction,
}: {
  item:     QueueItem;
  idx:      number;
  saving:   boolean;
  onAction: (idx: number, status: ReviewStatus) => void;
}) {
  const { analysis } = item;

  return (
    <div className="border-t border-white/[0.04] px-4 py-4 space-y-4">

      {/* What can I do? */}
      <div className="space-y-1.5">
        <p className="text-zinc-400 text-[11px] font-semibold">के गर्न मिल्छ?</p>
        {analysis.allowedItems.map((t, i) => (
          <p key={i} className="text-[11px] text-emerald-500 leading-snug">✅ {t}</p>
        ))}
        {analysis.cautionItems.map((t, i) => (
          <p key={i} className="text-[11px] text-amber-500 leading-snug">⚠ {t}</p>
        ))}
        {analysis.blockedItems.map((t, i) => (
          <p key={i} className="text-[11px] text-red-500 leading-snug">❌ {t}</p>
        ))}
      </div>

      {/* Rights summary table */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 space-y-2">
        <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-1.5">Rights Summary</p>
        <RightsRow label="Private study"    val={analysis.privateStudy} />
        <RightsRow label="Public display"   val={analysis.publicDisplay} />
        <RightsRow label="Audio reuse"      val={analysis.audioReuse} />
        <RightsRow label="Derivative/Reels" val={analysis.derivativeVideo} />
        <div className="flex items-center justify-between border-t border-white/[0.04] pt-2">
          <span className="text-zinc-600 text-[10px]">Monetization</span>
          <span className={`text-[10px] font-medium ${MONETIZATION_COLORS[analysis.monetization]}`}>
            {MONETIZATION_LABELS[analysis.monetization]}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-600 text-[10px]">Attribution required</span>
          <span className="text-zinc-500 text-[10px]">
            {analysis.attributionRequired === true ? "✓ Yes"
              : analysis.attributionRequired === false ? "No"
              : "Unknown"}
          </span>
        </div>
      </div>

      {/* Platform note */}
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/40 px-4 py-3">
        <p className="text-zinc-600 text-[10px] font-semibold mb-1">Platform Note</p>
        <p className="text-zinc-500 text-[10px] leading-relaxed">{analysis.platformNote}</p>
      </div>

      {/* Safe alternatives */}
      {analysis.safeAlternatives.length > 0 && (
        <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 px-4 py-3 space-y-1">
          <p className="text-sky-500 text-[10px] font-semibold">✨ Safe Alternative</p>
          {analysis.safeAlternatives.map((s, i) => (
            <p key={i} className="text-sky-700 text-[10px] leading-relaxed">{s}</p>
          ))}
        </div>
      )}

      {/* Recommended action */}
      <div className="rounded-xl border border-violet-900/30 bg-violet-950/10 px-4 py-2.5">
        <p className="text-violet-400 text-[10px]">→ {analysis.recommendedAction}</p>
      </div>

      {/* Action buttons */}
      <ActionStrip
        current={item.status}
        saving={saving}
        onAction={s => onAction(idx, s)}
      />
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function SourceRightsAnalyzer({ ownerId }: { ownerId: string }) {
  const [urlInput,     setUrlInput]     = useState("");
  const [queue,        setQueue]        = useState<QueueItem[]>([]);
  const [expandedIdx,  setExpandedIdx]  = useState<number | null>(null);
  const [savingIdx,    setSavingIdx]    = useState<number | null>(null);
  const [loadingQueue, setLoadingQueue] = useState(true);

  // Load persisted queue from Firestore on mount
  useEffect(() => {
    if (!ownerId) return;
    safe(
      getDocs(query(
        collection(db, "source_review_queue"),
        where("ownerId", "==", ownerId),
        limit(30),
      )),
      null,
    ).then(snap => {
      if (snap) {
        const items: QueueItem[] = snap.docs
          .map(d => {
            const data = d.data() as Record<string, unknown>;
            return {
              id:        d.id,
              url:       data.url as string,
              status:    data.status as ReviewStatus,
              analysis:  data.analysis as SourceRightsAnalysis,
              createdAt: data.createdAt as string,
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setQueue(items);
      }
      setLoadingQueue(false);
    });
  }, [ownerId]);

  function handleAnalyze() {
    const url = urlInput.trim();
    if (!url) return;
    const analysis = analyzeSourceUrl(url);
    const item: QueueItem = {
      url,
      status:    "analyzed",
      analysis,
      createdAt: new Date().toISOString(),
    };
    setQueue(prev => [item, ...prev]);
    setExpandedIdx(0);
    setUrlInput("");
  }

  async function handleAction(idx: number, status: ReviewStatus) {
    setSavingIdx(idx);
    const item = queue[idx];
    try {
      if (item.id) {
        await updateDoc(doc(db, "source_review_queue", item.id), {
          status,
          updatedAt: new Date().toISOString(),
        });
        setQueue(prev => prev.map((q, i) => i === idx ? { ...q, status } : q));
      } else {
        const ref = await addDoc(collection(db, "source_review_queue"), {
          ownerId,
          url:       item.url,
          status,
          analysis:  item.analysis,
          createdAt: item.createdAt,
          updatedAt: new Date().toISOString(),
        });
        setQueue(prev => prev.map((q, i) => i === idx ? { ...q, id: ref.id, status } : q));
      }
    } finally {
      setSavingIdx(null);
    }
  }

  const activeCount = queue.filter(q => q.status !== "rejected").length;

  return (
    <div className="rounded-2xl border border-violet-900/30 bg-violet-950/5 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.04]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">🔗 Source Rights Scanner</h3>
            <p className="text-zinc-600 text-[11px] mt-0.5">
              URL paste गर्नुहोस् — platform, media type, र rights analysis तुरुन्त देखिन्छ
            </p>
          </div>
          {activeCount > 0 && (
            <span className="text-[10px] border border-violet-800/60 bg-violet-950/30 text-violet-400 rounded-full px-2.5 py-1 shrink-0">
              {activeCount} in queue
            </span>
          )}
        </div>

        {/* URL input */}
        <div className="flex gap-2 mt-4">
          <input
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleAnalyze(); }}
            placeholder="https://archive.org/… वा YouTube URL वा website/audio link"
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-violet-800/60 transition-colors"
          />
          <button
            onClick={handleAnalyze}
            disabled={!urlInput.trim()}
            className="px-4 py-2.5 rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300 text-xs font-medium hover:bg-violet-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            Analyze →
          </button>
        </div>

        {/* Disclaimer */}
        <div className="mt-3 rounded-xl border border-zinc-800/40 bg-zinc-900/30 px-4 py-2.5">
          <p className="text-zinc-700 text-[10px] leading-relaxed">
            ⚠ AI ले license संकेत मात्र पढ्छ — rule-based analysis। Public वा revenue use अघि founder ले source/permission verify गर्नुपर्छ।
          </p>
        </div>
      </div>

      {/* Queue */}
      <div className="divide-y divide-white/[0.03]">
        {loadingQueue && queue.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-zinc-700 text-xs animate-pulse">Queue load गर्दैछ…</p>
          </div>
        ) : queue.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <div className="text-3xl mb-3 opacity-20">🔗</div>
            <p className="text-zinc-700 text-xs">कुनै URL analyze गरिएको छैन</p>
            <p className="text-zinc-800 text-[10px] mt-1">माथि URL paste गरेर Analyze थिच्नुहोस्</p>
          </div>
        ) : (
          queue.map((item, idx) => {
            const isExpanded = expandedIdx === idx;
            const isSaving   = savingIdx === idx;
            const { analysis } = item;

            return (
              <div key={`${item.createdAt}-${idx}`}>
                {/* Item header */}
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="text-lg shrink-0 opacity-70">{PLATFORM_ICONS[analysis.platform]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-400 text-[11px] truncate">{item.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-zinc-600 text-[10px]">{PLATFORM_LABELS[analysis.platform]}</span>
                      <span className="text-zinc-800 text-[10px]">·</span>
                      <span className="text-zinc-600 text-[10px]">{MEDIA_TYPE_LABELS[analysis.mediaType]}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] border rounded-full px-2.5 py-0.5 shrink-0 ${STATUS_COLORS[item.status]}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  <span className="text-zinc-700 text-[10px] shrink-0">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {/* Expanded analysis */}
                {isExpanded && (
                  <AnalysisCard
                    item={item}
                    idx={idx}
                    saving={isSaving}
                    onAction={handleAction}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
