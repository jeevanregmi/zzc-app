"use client";

/**
 * RecordLayerViewer — shows actual Firestore records behind each coverage count.
 * Every count in CivicObjectWorkspace is clickable; this is what opens.
 *
 * यो document बाट के निस्कियो?  Which layer, which page, which evidence.
 * Founder can inspect, approve, unpublish, mark weak, or delete any record.
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection, query, where, limit, getDocs,
  updateDoc, deleteDoc, doc as firestoreDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import { useFounderMode } from "../../../contexts/FounderModeContext";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ActiveLayer =
  | "raw_exhaustive"
  | "atomic"
  | "fallback"
  | "intel"
  | "relationships"
  | "public_ready";

interface RawDoc {
  id:   string;
  data: Record<string, unknown>;
}

export interface RecordLayerViewerProps {
  docId:   string;
  ownerId: string;
  layer:   ActiveLayer;
  onClose: () => void;
}

type FilterTab = "all" | "needs_review" | "public_ready" | "fallback" | "weak";

// ── Layer metadata — label + explanation ──────────────────────────────────────

const LAYER_META: Record<ActiveLayer, {
  labelNe: string;
  color:   "sky" | "emerald" | "amber" | "violet" | "zinc";
  collection: "janta_intelligence" | "janta_relationships";
  why:     string;
}> = {
  raw_exhaustive: {
    labelNe:    "Raw Paragraphs — Exhaustive Extraction",
    color:      "sky",
    collection: "janta_intelligence",
    why:        "Exhaustive extraction — हरेक paragraph एउटा record हो। extractionTier: 'raw_exhaustive', publishToJanta: false, publicReady: false। यी records अहिले public छैनन्। Domain classification (Phase 3) र founder approval पछि मात्र public हुन्छन्।",
  },
  atomic: {
    labelNe:    "Page-traced Atoms",
    color:      "emerald",
    collection: "janta_intelligence",
    why:        "Page-traced atoms — प्रत्येक record मा pageNumber र verbatim textEvidence छ। extractionTier: 'atomic'। High-confidence, source-backed। Full extraction pipeline बाट आएका।",
  },
  fallback: {
    labelNe:    "Fallback Drafts — AI Summary बाट",
    color:      "amber",
    collection: "janta_intelligence",
    why:        "AI summary बाट बनेका draft atoms — page evidence छैन। aiKeyInsights / policyChanges बाट synthesize गरिएका। verificationStatus: 'fallback_ai_summary'। Public होइनन्। Full exhaustive extraction ले replace गर्छ।",
  },
  intel: {
    labelNe:    "Intelligence Records — AI Analysis",
    color:      "sky",
    collection: "janta_intelligence",
    why:        "Step 2 AI analysis outputs — document-level intelligence records। Page tracing छैन। Source: AI Analyze step (onProcess)। janta_intelligence collection मा छन् तर extractionTier: 'atomic'/'raw_exhaustive'/'fallback' छैन।",
  },
  relationships: {
    labelNe:    "Relationships — Cross-document Graph",
    color:      "violet",
    collection: "janta_relationships",
    why:        "Cross-document relationship edges — intelligence records बीचको graph link। janta_relationships collection मा छन्। Intelligence matching step बाट बनेका।",
  },
  public_ready: {
    labelNe:    "⚠ Public Records — अहिले live छन्",
    color:      "emerald",
    collection: "janta_intelligence",
    why:        "⚠ यी records अहिले PUBLIC छन् (publishToJanta: true वा publicReady: true)। /janta page र अन्य public pages मा देखिन्छन्। ध्यान दिनुहोस् — manually unpublish नगरेसम्म public रहन्छन्।",
  },
};

// ── Filtering helpers ─────────────────────────────────────────────────────────

function isFallbackRecord(d: Record<string, unknown>): boolean {
  if (d.extractionTier === "fallback") return true;
  if (d.verificationStatus === "fallback_ai_summary") return true;
  if (d.extractionTier === "atomic") {
    const pn = d.pageNumber as number | null | undefined;
    if (pn === null || pn === undefined || pn < 1) return true;
  }
  return false;
}

function matchesLayer(d: Record<string, unknown>, layer: ActiveLayer): boolean {
  switch (layer) {
    case "raw_exhaustive":
      return d.extractionTier === "raw_exhaustive";
    case "atomic": {
      if (d.extractionTier !== "atomic") return false;
      const pn = d.pageNumber as number | null | undefined;
      return pn !== null && pn !== undefined && pn >= 1;
    }
    case "fallback":
      return isFallbackRecord(d);
    case "intel":
      return d.extractionTier !== "raw_exhaustive" &&
             d.extractionTier !== "atomic" &&
             !isFallbackRecord(d);
    case "public_ready":
      return d.publishToJanta === true || d.publicReady === true;
    default:
      return true;
  }
}

function matchesTab(d: Record<string, unknown>, tab: FilterTab): boolean {
  switch (tab) {
    case "all": return true;
    case "needs_review":
      return !d.founderReviewStatus || d.founderReviewStatus === "needs_review";
    case "public_ready":
      return d.publishToJanta === true || d.publicReady === true;
    case "fallback":
      return isFallbackRecord(d);
    case "weak":
      return typeof d.confidence === "number" && (d.confidence as number) < 0.5;
  }
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[RecordLayerViewer]", e?.code ?? e); return fb; });

// ── Color class map ───────────────────────────────────────────────────────────

const TIER_CLS: Record<string, string> = {
  raw_exhaustive: "bg-sky-950/40 text-sky-400 border-sky-800/40",
  atomic:         "bg-emerald-950/40 text-emerald-400 border-emerald-800/40",
  fallback:       "bg-amber-950/40 text-amber-400 border-amber-800/40",
};

// ── Root component ─────────────────────────────────────────────────────────────

export function RecordLayerViewer({ docId, ownerId, layer, onClose }: RecordLayerViewerProps) {
  const { isDebug: isDebugMode } = useFounderMode();
  const meta = LAYER_META[layer];
  const isRelLayer = layer === "relationships";

  const [allDocs,      setAllDocs]      = useState<RawDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState<FilterTab>("all");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [copiedId,     setCopiedId]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const snap = await safe(
      getDocs(query(
        collection(db, meta.collection),
        where("ownerId",     "==", ownerId),
        where("sourceDocId", "==", docId),
        limit(500),
      )),
      null,
    );
    const docs: RawDoc[] = (snap?.docs ?? []).map(d => ({
      id:   d.id,
      data: d.data() as Record<string, unknown>,
    }));
    const filtered = isRelLayer ? docs : docs.filter(d => matchesLayer(d.data, layer));
    // Sort by pageNumber asc, then paragraphIndex
    filtered.sort((a, b) => {
      const pa = (a.data.pageNumber as number | null | undefined) ?? 9999;
      const pb = (b.data.pageNumber as number | null | undefined) ?? 9999;
      if (pa !== pb) return pa - pb;
      const ia = (a.data.paragraphIndex as number | null | undefined) ?? 0;
      const ib = (b.data.paragraphIndex as number | null | undefined) ?? 0;
      return ia - ib;
    });
    setAllDocs(filtered);
    setLoading(false);
  }, [docId, ownerId, layer, meta.collection, isRelLayer]);

  useEffect(() => { void load(); }, [load]);

  const visible = allDocs.filter(d => matchesTab(d.data, tab));

  async function handleUpdate(id: string, patch: Record<string, unknown>) {
    const ref = firestoreDoc(db, meta.collection, id);
    await updateDoc(ref, { ...patch, updatedAt: new Date().toISOString() });
    setAllDocs(prev => prev.map(d =>
      d.id === id ? { ...d, data: { ...d.data, ...patch } } : d
    ));
  }

  async function handleDelete(id: string) {
    await deleteDoc(firestoreDoc(db, meta.collection, id));
    setAllDocs(prev => prev.filter(d => d.id !== id));
    setPendingDelete(null);
    setExpandedId(null);
  }

  function copyEvidence(id: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(c => (c === id ? null : c)), 2000);
  }

  const headerColor = {
    sky:     "border-sky-800/50 bg-sky-950/10 text-sky-300",
    emerald: "border-emerald-800/50 bg-emerald-950/10 text-emerald-300",
    amber:   "border-amber-800/50 bg-amber-950/10 text-amber-300",
    violet:  "border-violet-800/50 bg-violet-950/10 text-violet-300",
    zinc:    "border-zinc-800/50 bg-zinc-900/10 text-zinc-400",
  }[meta.color];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all",          label: `सबै (${allDocs.length})` },
    { key: "needs_review", label: "Review गर्नुपर्छ" },
    { key: "public_ready", label: "⚠ Public" },
    { key: "fallback",     label: "Fallback" },
    { key: "weak",         label: "Weak (<50%)" },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* ── Layer header ── */}
      <div className={`rounded-xl border px-4 py-3 ${headerColor}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest opacity-50 font-mono">
              {meta.collection} · {layer}
            </p>
            <p className="text-xs font-bold mt-0.5 leading-snug">{meta.labelNe}</p>
          </div>
          <button
            onClick={onClose}
            className="text-[10px] shrink-0 opacity-50 hover:opacity-100 transition-opacity border border-current/20 rounded-lg px-2 py-1"
          >
            ← फिर्ता
          </button>
        </div>
        <p className="text-[10px] mt-2 opacity-60 leading-relaxed">{meta.why}</p>
      </div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`text-[10px] px-2.5 py-1 rounded-full border transition-colors ${
              tab === t.key
                ? "bg-violet-900/50 border-violet-700/60 text-violet-200 font-medium"
                : "border-zinc-700/40 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Record list ── */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-zinc-600 text-xs">यस filter मा कुनै record छैन।</p>
          <button
            onClick={() => setTab("all")}
            className="text-violet-500 text-[10px] mt-2 hover:underline"
          >
            सबै records हेर्नुहोस् →
          </button>
        </div>
      ) : (
        <div className="space-y-1.5">
          {visible.map(({ id, data }) => (
            <RecordCard
              key={id}
              id={id}
              data={data}
              isDebugMode={isDebugMode}
              collectionName={meta.collection}
              isExpanded={expandedId === id}
              isPendingDelete={pendingDelete === id}
              isCopied={copiedId === id}
              onToggle={() => setExpandedId(prev => prev === id ? null : id)}
              onUpdate={patch => handleUpdate(id, patch)}
              onDeleteRequest={() => { setPendingDelete(id); setExpandedId(id); }}
              onDeleteConfirm={() => handleDelete(id)}
              onDeleteCancel={() => setPendingDelete(null)}
              onCopy={() => copyEvidence(id, String(
                data.textEvidence ?? data.originalText ?? data.title ?? ""
              ))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Record card ───────────────────────────────────────────────────────────────

interface RecordCardProps {
  id:             string;
  data:           Record<string, unknown>;
  isDebugMode:    boolean;
  collectionName: string;
  isExpanded:     boolean;
  isPendingDelete: boolean;
  isCopied:       boolean;
  onToggle:       () => void;
  onUpdate:       (patch: Record<string, unknown>) => Promise<void>;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel:  () => void;
  onCopy:          () => void;
}

function RecordCard({
  id, data, isDebugMode, collectionName,
  isExpanded, isPendingDelete, isCopied,
  onToggle, onUpdate, onDeleteRequest, onDeleteConfirm, onDeleteCancel, onCopy,
}: RecordCardProps) {
  const [updating, setUpdating] = useState(false);
  const [actionDone, setActionDone] = useState<string>("");

  const isPublic   = data.publishToJanta === true || data.publicReady === true;
  const isFallback = isFallbackRecord(data);
  const tier       = String(data.extractionTier ?? "");
  const title      = String(data.title ?? data.titleNepali ?? data.originalText ?? "").slice(0, 90);
  const evidence   = String(data.textEvidence ?? data.originalText ?? "");
  const summary    = String(data.summaryNepali ?? "");
  const pn         = data.pageNumber as number | null | undefined;
  const confidence = typeof data.confidence === "number" ? data.confidence as number : null;

  async function act(patch: Record<string, unknown>, label: string) {
    setUpdating(true);
    await onUpdate(patch).catch(() => {});
    setActionDone(label);
    setTimeout(() => setActionDone(""), 2000);
    setUpdating(false);
  }

  const borderCls = isPublic
    ? "border-emerald-700/50 bg-emerald-950/5"
    : isFallback
    ? "border-amber-800/30 bg-amber-950/5"
    : tier === "raw_exhaustive"
    ? "border-sky-900/30 bg-sky-950/5"
    : "border-white/[0.05] bg-white/[0.01]";

  return (
    <div className={`rounded-xl border transition-all ${borderCls}`}>
      {/* ── Collapsed row ── */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-start gap-2 text-left"
      >
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          {/* Badge row */}
          <div className="flex items-center gap-1 flex-wrap">
            {tier && (
              <span className={`text-[9px] border rounded-full px-1.5 py-0.5 font-mono shrink-0 ${
                TIER_CLS[tier] ?? "bg-zinc-900/30 text-zinc-600 border-zinc-800/40"
              }`}>{tier}</span>
            )}
            {!!data.type && (
              <span className="text-[9px] border border-violet-800/40 bg-violet-950/20 text-violet-500 rounded-full px-1.5 py-0.5 shrink-0">
                {String(data.type)}
              </span>
            )}
            {isPublic && (
              <span className="text-[9px] border border-emerald-700/60 bg-emerald-900/30 text-emerald-300 rounded-full px-1.5 py-0.5 font-bold shrink-0">
                ● PUBLIC
              </span>
            )}
            {pn && pn >= 1 && (
              <span className="text-[9px] text-zinc-600 shrink-0">p.{pn}</span>
            )}
            {!!data.chunkPageRange && (
              <span className="text-[9px] text-zinc-700 shrink-0">ch.{String(data.chunkPageRange)}</span>
            )}
            {confidence !== null && (
              <span className={`text-[9px] shrink-0 ${confidence < 0.5 ? "text-red-500" : "text-zinc-700"}`}>
                {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          {/* Title */}
          <p className="text-zinc-300 text-[11px] leading-snug font-medium truncate">
            {title || <span className="text-zinc-700 italic">(no title)</span>}
          </p>
          {/* Summary Nepali — truncated */}
          {summary && (
            <p className="text-zinc-600 text-[10px] leading-snug truncate">{summary}</p>
          )}
        </div>
        <span className="text-zinc-700 text-[9px] shrink-0 mt-1">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* ── Expanded detail ── */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-white/[0.04] pt-3">

          {/* Evidence / original text */}
          {evidence && (
            <div className="rounded-lg bg-zinc-900/50 border border-zinc-800/30 px-3 py-2.5">
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1.5">
                Source Evidence / Original Text
              </p>
              <p className="text-zinc-300 text-[11px] leading-relaxed">{evidence.slice(0, 600)}</p>
            </div>
          )}

          {/* Summary Nepali — full */}
          {summary && (
            <div>
              <p className="text-zinc-600 text-[9px] uppercase tracking-widest mb-1">सरल नेपाली अर्थ</p>
              <p className="text-zinc-200 text-xs leading-relaxed">{summary}</p>
            </div>
          )}

          {/* Field grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] leading-relaxed">
            {([
              ["extractionTier",    data.extractionTier],
              ["verificationStatus", data.verificationStatus],
              ["founderReviewStatus", data.founderReviewStatus],
              ["publishToJanta",    String(data.publishToJanta ?? false)],
              ["publicReady",       String(data.publicReady ?? false)],
              ["pageNumber",        data.pageNumber],
              ["chunkPageRange",    data.chunkPageRange],
              ["extractionChunk",   data.extractionChunk],
              ["sector",            data.sector],
              ["fiscalYear",        data.fiscalYear],
              ["budgetAmount",      data.budgetAmount],
              ["target",            data.target],
              ["confidence",        confidence !== null ? `${Math.round(confidence * 100)}%` : null],
              ["type",              data.type],
              ["ministry",          data.ministry],
            ] as [string, unknown][])
              .filter(([, v]) => v !== null && v !== undefined && v !== "")
              .map(([k, v]) => (
                <div key={k} className="flex gap-1">
                  <span className="text-zinc-700 shrink-0">{k}:</span>
                  <span className={`text-zinc-400 truncate ${
                    (k === "publishToJanta" || k === "publicReady") && v === "true"
                      ? "text-emerald-400 font-semibold"
                      : ""
                  }`}>{String(v)}</span>
                </div>
              ))
            }
          </div>

          {/* Debug: ID + collection */}
          {isDebugMode && (
            <div className="text-[9px] font-mono text-zinc-700 border-t border-zinc-800/30 pt-2 space-y-0.5">
              <p>ID: {id}</p>
              <p>Collection: {collectionName}</p>
            </div>
          )}

          {/* Delete confirm */}
          {isPendingDelete ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-800/50 bg-red-950/20 px-3 py-2">
              <p className="text-red-300 text-[11px] flex-1 font-semibold">यो record permanently delete हुन्छ।</p>
              <button
                onClick={onDeleteConfirm}
                className="text-[10px] px-3 py-1.5 bg-red-900/60 border border-red-700 text-red-200 rounded-lg font-bold hover:bg-red-900/80 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={onDeleteCancel}
                className="text-[10px] px-3 py-1.5 border border-zinc-700 text-zinc-500 rounded-lg hover:text-zinc-300 transition-colors"
              >
                रद्द
              </button>
            </div>
          ) : (
            /* ── Actions ── */
            <div className="flex flex-wrap gap-1.5 items-center">
              {/* Unpublish — only if public */}
              {isPublic && (
                <button
                  disabled={updating}
                  onClick={() => act({ publishToJanta: false, publicReady: false, founderReviewStatus: "needs_review" }, "unpublished")}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-red-950/30 border border-red-800/50 text-red-300 hover:bg-red-950/50 transition-colors font-semibold"
                >
                  🔒 Unpublish
                </button>
              )}
              {/* Approve */}
              {!isFallback && (
                <button
                  disabled={updating}
                  onClick={() => act({ founderReviewStatus: "approved" }, "approved")}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-300 hover:bg-emerald-950/50 transition-colors"
                >
                  ✓ Approve
                </button>
              )}
              {/* Needs review */}
              <button
                disabled={updating}
                onClick={() => act({ founderReviewStatus: "needs_review", publishToJanta: false, publicReady: false }, "review")}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors"
              >
                Needs review
              </button>
              {/* Mark weak */}
              <button
                disabled={updating}
                onClick={() => act({ founderReviewStatus: "weak", confidence: 0.2, publishToJanta: false, publicReady: false }, "marked weak")}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700/50 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                Weak
              </button>
              {/* Copy evidence */}
              <button
                onClick={onCopy}
                className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                  isCopied
                    ? "border-emerald-800/50 text-emerald-400"
                    : "border-zinc-700/50 text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {isCopied ? "✓ Copied" : "Copy evidence"}
              </button>
              {/* Delete */}
              <button
                onClick={onDeleteRequest}
                className="text-[10px] px-2.5 py-1.5 rounded-lg border border-red-900/40 text-red-800 hover:text-red-500 transition-colors ml-auto"
              >
                Delete
              </button>

              {/* Feedback */}
              {updating && <span className="text-[10px] text-zinc-600 animate-pulse">saving…</span>}
              {actionDone && !updating && (
                <span className="text-[10px] text-emerald-500">✓ {actionDone}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
