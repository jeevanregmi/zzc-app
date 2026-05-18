"use client";

import { useState, useEffect } from "react";
import { useSearchParams }     from "next/navigation";
import Link                    from "next/link";
import { getQueueItem, updateQueueItem } from "../../../../lib/vault/firestore";
import type { QueueItem, QueueContentType, QueuePlatform } from "../../../../lib/types/queue";
import { TrustBadge }          from "../../../../components/vault/TrustBadge";
import { trustFromQueueItem }  from "../../../../lib/intelligence/trust-score";

// ─── Platform preview components ──────────────────────────────────────────────

function YouTubePreview({ item }: { item: QueueItem }) {
  const isLong = item.contentType === "youtube-long";

  return (
    <div className="space-y-4">
      {/* Thumbnail mock */}
      <div
        className={`relative w-full rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 flex items-end ${
          isLong ? "aspect-video" : "aspect-[9/16] max-w-[240px] mx-auto"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-black" />
        {/* ZZC brand mark */}
        <div className="absolute top-3 right-3 text-[10px] font-black text-green-400 tracking-widest bg-black/60 px-2 py-0.5 rounded">
          ZZC
        </div>
        {/* Title overlay */}
        <div className="relative z-10 p-4 w-full bg-gradient-to-t from-black/90 to-transparent">
          <p className={`font-black text-white leading-tight ${isLong ? "text-xl" : "text-base"}`}>
            {item.aiTitle}
          </p>
          {item.hooks && item.hooks[0] && (
            <p className="text-green-400 text-xs mt-1 font-semibold line-clamp-1">
              {item.hooks[0]}
            </p>
          )}
        </div>
      </div>

      {/* Below-thumbnail metadata */}
      <div className="space-y-1.5">
        <p className="text-white font-semibold text-base leading-snug">{item.aiTitle}</p>
        <p className="text-zinc-500 text-xs">ZZC Finance Nepal · 0 views · just now</p>

        {/* Description block */}
        <div className="bg-zinc-900 rounded-xl p-3 space-y-2 mt-2 border border-zinc-800">
          <p className="text-zinc-500 text-xs font-medium">Description</p>
          {item.brief && (
            <p className="text-zinc-300 text-xs leading-relaxed">{item.brief}</p>
          )}
          {item.hooks && item.hooks.length > 1 && (
            <div className="space-y-1 pt-1 border-t border-zinc-800">
              <p className="text-zinc-600 text-[10px] font-medium uppercase tracking-wider">Hook options</p>
              {item.hooks.map((h, i) => (
                <p key={i} className="text-zinc-400 text-xs">• {h}</p>
              ))}
            </div>
          )}
          {(item.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {(item.tags ?? []).map(t => (
                <span key={t} className="text-xs text-zinc-600">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShortsPreview({ item }: { item: QueueItem }) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Vertical card */}
      <div className="relative w-[200px] aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 flex flex-col justify-between">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
        <div className="relative z-10 p-3">
          <span className="text-[9px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded">
            SHORT
          </span>
        </div>
        <div className="relative z-10 p-3 space-y-2">
          {item.hooks && item.hooks[0] && (
            <p className="text-white font-black text-base leading-snug drop-shadow-lg">
              {item.hooks[0]}
            </p>
          )}
          <p className="text-zinc-300 text-[10px] leading-relaxed line-clamp-3">
            {item.brief}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-green-400 text-[9px] font-bold">ZZC</span>
            <span className="text-zinc-500 text-[9px]">≤ 60s</span>
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-2">
        <p className="text-zinc-500 text-xs font-medium">Caption / Description</p>
        {item.brief && <p className="text-zinc-300 text-xs leading-relaxed">{item.brief}</p>}
        {(item.tags ?? []).length > 0 && (
          <p className="text-zinc-500 text-xs">
            {(item.tags ?? []).map(t => `#${t}`).join(" ")}
          </p>
        )}
      </div>
    </div>
  );
}

function FacebookPreview({ item }: { item: QueueItem }) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden max-w-lg mx-auto">
      {/* Post header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-full bg-green-900 border border-green-700 flex items-center justify-center shrink-0">
          <span className="text-green-400 text-xs font-black">Z</span>
        </div>
        <div>
          <p className="text-white text-sm font-semibold">ZZC Finance Nepal</p>
          <p className="text-zinc-500 text-xs">Just now · Public</p>
        </div>
      </div>

      {/* Post body */}
      <div className="p-4 space-y-3">
        <p className="text-white font-semibold text-sm">{item.aiTitle}</p>
        {item.brief && (
          <p className="text-zinc-300 text-sm leading-relaxed">{item.brief}</p>
        )}
        {item.hooks && item.hooks[0] && (
          <p className="text-green-400 text-sm font-medium">{item.hooks[0]}</p>
        )}
        {(item.tags ?? []).length > 0 && (
          <p className="text-zinc-500 text-xs">
            {(item.tags ?? []).map(t => `#${t}`).join(" ")}
          </p>
        )}
      </div>

      {/* Reaction bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-zinc-800 text-zinc-600 text-xs">
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>↗ Share</span>
      </div>
    </div>
  );
}

function AllPlatformPreview({ item }: { item: QueueItem }) {
  const [tab, setTab] = useState<"youtube" | "short" | "facebook">("youtube");
  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-zinc-800 pb-0">
        {(["youtube", "short", "facebook"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-green-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t === "short" ? "Short / Reel" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === "youtube"  && <YouTubePreview  item={item} />}
      {tab === "short"    && <ShortsPreview   item={item} />}
      {tab === "facebook" && <FacebookPreview item={item} />}
    </div>
  );
}

function PlatformPreview({ item }: { item: QueueItem }) {
  const { platform, contentType } = item;

  if (contentType === "shorts") return <ShortsPreview item={item} />;
  if (contentType === "facebook-post") return <FacebookPreview item={item} />;
  if (platform === "youtube") return <YouTubePreview item={item} />;
  if (platform === "instagram") return <ShortsPreview item={item} />;
  if (platform === "facebook") return <FacebookPreview item={item} />;
  return <AllPlatformPreview item={item} />;
}

// ─── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending:       { text: "Pending review",  cls: "text-amber-400"  },
  approved:      { text: "Approved",        cls: "text-green-400"  },
  in_production: { text: "In production",   cls: "text-emerald-400" },
  rejected:      { text: "Rejected",        cls: "text-red-400"    },
  archived:      { text: "Archived",        cls: "text-zinc-500"   },
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function PreviewClient() {
  const searchParams = useSearchParams();
  const id           = searchParams.get("id") ?? "";

  const [item,      setItem]      = useState<QueueItem | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); setError("No item ID in URL."); return; }
    getQueueItem(id)
      .then(q => { setItem(q); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, [id]);

  const moveToProduction = async () => {
    if (!item) return;
    setApproving(true);
    try {
      await updateQueueItem(item.id, {
        status:             "in_production",
        previewApprovedAt:  new Date().toISOString(),
      });
      setDone(true);
      setItem(prev => prev ? { ...prev, status: "in_production" } : prev);
    } catch (e) {
      setError(`Failed to move to production: ${String(e)}`);
    } finally {
      setApproving(false);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[300px]">
        <p className="text-zinc-600 text-sm">Loading preview…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 space-y-4">
        <Link href="/vault/content/queue" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Back to Queue
        </Link>
        <div className="bg-red-950/40 border border-red-900/60 rounded-xl p-4">
          <p className="text-red-300 text-sm">{error ?? "Item not found."}</p>
        </div>
      </div>
    );
  }

  const trust        = trustFromQueueItem(item);
  const statusLabel  = STATUS_LABEL[item.status] ?? STATUS_LABEL.pending;
  const studioUrl    = `/vault/content/ai-studio?queueId=${item.id}&title=${encodeURIComponent(item.aiTitle)}`;
  const canProduce   = item.status === "approved" && !done;
  const alreadyProd  = item.status === "in_production" || done;

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Nav */}
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/vault/content/queue" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Queue
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="text-xs text-zinc-400">Preview</span>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start gap-3 justify-between flex-wrap">
            <h1 className="text-xl font-bold text-white leading-snug flex-1 min-w-0">
              {item.aiTitle}
            </h1>
            <span className={`text-xs font-semibold shrink-0 ${statusLabel.cls}`}>
              {statusLabel.text}
            </span>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-zinc-500">
            <span className="capitalize">{item.contentType.replace("-", " ")}</span>
            <span>·</span>
            <span className="capitalize">{item.platform}</span>
            <span>·</span>
            <TrustBadge trust={trust} variant="bar" />
          </div>
        </div>

        {/* Source traceability */}
        {(item.sourceDocTitle || item.sourceSignalId) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
            <span className="text-zinc-500 text-sm shrink-0 mt-0.5">
              {item.sourceDocTitle ? "📄" : "🧠"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500 font-medium mb-0.5">Source trace</p>
              {item.sourceDocTitle && (
                <p className="text-sm text-zinc-300 font-semibold truncate">{item.sourceDocTitle}</p>
              )}
              {item.sourceDocFileName && (
                <p className="text-xs text-zinc-600">{item.sourceDocFileName}</p>
              )}
              {item.sourceSignalId && !item.sourceDocTitle && (
                <p className="text-xs text-zinc-400">Signal: {item.sourceSignalId.slice(0, 16)}…</p>
              )}
              {(item.sourceInsights ?? []).length > 0 && (
                <ul className="mt-2 space-y-1">
                  {(item.sourceInsights ?? []).slice(0, 3).map((ins, i) => (
                    <li key={i} className="text-xs text-zinc-500 flex gap-1.5">
                      <span className="text-zinc-700 shrink-0">•</span>
                      <span className="line-clamp-2">{ins}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {item.sourceDocUrl && (
              <a
                href={item.sourceDocUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-500 hover:text-green-300 shrink-0 font-semibold"
              >
                View source →
              </a>
            )}
          </div>
        )}

        {/* Platform preview */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-4">
            Platform Preview
          </h2>
          <PlatformPreview item={item} />
        </section>

        {/* Actions */}
        <div className="border-t border-zinc-800 pt-6 space-y-3">

          {alreadyProd && (
            <div className="flex items-center gap-2 bg-emerald-950/40 border border-emerald-900/60 rounded-xl px-4 py-3">
              <span className="text-emerald-400">✓</span>
              <p className="text-sm text-emerald-300 font-semibold">Moved to production</p>
              <Link
                href={studioUrl}
                className="ml-auto text-xs text-emerald-600 hover:text-emerald-400 font-semibold"
              >
                Open in AI Studio →
              </Link>
            </div>
          )}

          {canProduce && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                disabled={approving}
                onClick={moveToProduction}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                {approving ? "Moving to production…" : "Move to Production"}
              </button>
              <Link
                href={studioUrl}
                className="flex-1 py-3 text-center bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold text-sm rounded-xl transition-colors"
              >
                Generate Script / Thumbnail first →
              </Link>
            </div>
          )}

          {item.status === "pending" && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl px-4 py-3">
              <p className="text-xs text-amber-400">
                This item is still pending review. Approve it in the{" "}
                <Link href="/vault/admin" className="underline hover:text-amber-300">Admin Vault</Link>{" "}
                before moving to production.
              </p>
            </div>
          )}

          {item.status === "rejected" && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl px-4 py-3">
              <p className="text-xs text-red-400">This item was rejected and cannot be moved to production.</p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Link
              href="/vault/content/queue"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back to Queue
            </Link>
            {item.adminNotes && (
              <p className="text-xs text-zinc-600 italic ml-auto">Note: {item.adminNotes}</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
