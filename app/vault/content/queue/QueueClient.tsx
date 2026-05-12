"use client";

import { useState } from "react";
import Link from "next/link";
import { useVaultAuth } from "../../../../hooks/vault/useVaultAuth";
import { useQueueItems } from "../../../../hooks/vault/useQueueItems";
import { updateQueueItem, deleteQueueItem } from "../../../../lib/vault/firestore";
import type { QueueItem, QueueItemStatus } from "../../../../lib/types/queue";

// ─── Display helpers ──────────────────────────────────────────────────────────

const STATUS_TABS: { key: QueueItemStatus | "all"; label: string }[] = [
  { key: "all",          label: "All"          },
  { key: "pending",      label: "Pending"      },
  { key: "approved",     label: "Approved"     },
  { key: "in_production",label: "In Production"},
  { key: "rejected",     label: "Rejected"     },
  { key: "archived",     label: "Archived"     },
];

const PLATFORM_ICONS: Record<string, string> = {
  youtube:   "▶",
  instagram: "◎",
  facebook:  "f",
  all:       "◈",
};

const TYPE_LABELS: Record<string, string> = {
  "youtube-long":  "YouTube",
  "shorts":        "Short / Reel",
  "facebook-post": "Facebook Post",
  "carousel":      "Carousel",
  "explainer":     "Explainer",
  "other":         "Content",
};

function confidenceBadge(c: number) {
  if (c >= 0.8) return { label: "HIGH",       cls: "bg-green-900 text-green-400 border-green-800" };
  if (c >= 0.5) return { label: "MEDIUM",     cls: "bg-amber-900 text-amber-300 border-amber-800" };
  return          { label: "LOW",         cls: "bg-red-900  text-red-400   border-red-800"   };
}

function isExpiringSoon(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now();
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  return "just now";
}

// ─── Queue card ───────────────────────────────────────────────────────────────

function QueueCard({
  item,
  onApprove,
  onReject,
  onArchive,
  onDelete,
}: {
  item:      QueueItem;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
  onArchive: (id: string) => void;
  onDelete:  (id: string) => void;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes,     setNotes]     = useState(item.adminNotes ?? "");
  const badge = confidenceBadge(item.confidence);
  const expiring = item.status === "pending" && isExpiringSoon(item.expiresAt);
  const expired  = item.status === "pending" && isExpired(item.expiresAt);

  const saveNotes = async () => {
    await updateQueueItem(item.id, { adminNotes: notes });
    setNotesOpen(false);
  };

  const studioUrl = `/vault/content/ai-studio?queueId=${item.id}&title=${encodeURIComponent(item.aiTitle)}`;

  return (
    <div className={`bg-zinc-900 rounded-2xl border flex flex-col gap-4 p-5 ${
      expired    ? "border-red-900 opacity-70" :
      expiring   ? "border-amber-800" :
      item.status === "approved" ? "border-green-800" :
      item.status === "rejected" ? "border-zinc-800 opacity-60" :
      "border-zinc-800"
    }`}>

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <span className="text-lg">{PLATFORM_ICONS[item.platform] ?? "◈"}</span>
          <span className="text-zinc-600 text-xs">{TYPE_LABELS[item.contentType] ?? "Content"}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-snug">{item.aiTitle}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>
              {(item.confidence * 100).toFixed(0)}% {badge.label}
            </span>
            {expiring && !expired && (
              <span className="text-xs text-amber-400">Expires soon</span>
            )}
            {expired && (
              <span className="text-xs text-red-400">Expired</span>
            )}
            {item.status !== "pending" && (
              <span className="text-xs text-zinc-600 capitalize">{item.status.replace("_", " ")}</span>
            )}
          </div>
        </div>
      </div>

      {/* Source traceability panel */}
      <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-zinc-500 text-xs shrink-0">📄</span>
            <div className="min-w-0">
              <p className="text-zinc-300 text-xs font-semibold truncate">{item.sourceDocTitle}</p>
              <p className="text-zinc-600 text-xs">{item.sourceDocFileName} · {formatRelative(item.sourceUploadedAt)}</p>
            </div>
          </div>
          <a
            href={item.sourceDocUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-green-400 hover:text-green-300 font-semibold shrink-0 transition-colors"
          >
            View Source →
          </a>
        </div>

        {item.sourceInsights.length > 0 && (
          <ul className="space-y-1 mt-1">
            {item.sourceInsights.slice(0, 3).map((insight, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-500">
                <span className="text-zinc-700 shrink-0 mt-0.5">•</span>
                <span className="line-clamp-2">{insight}</span>
              </li>
            ))}
            {item.sourceInsights.length > 3 && (
              <li className="text-xs text-zinc-700 pl-3">+{item.sourceInsights.length - 3} more</li>
            )}
          </ul>
        )}
      </div>

      {/* Admin notes */}
      {notesOpen ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add admin note…"
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none"
          />
          <button onClick={saveNotes} className="text-xs text-green-400 hover:text-green-300 font-semibold px-2">Save</button>
          <button onClick={() => setNotesOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-400 px-2">×</button>
        </div>
      ) : item.adminNotes ? (
        <p className="text-zinc-500 text-xs italic cursor-pointer hover:text-zinc-400" onClick={() => setNotesOpen(true)}>
          Note: {item.adminNotes}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap border-t border-zinc-800 pt-3">
        {item.status === "pending" && (
          <>
            <button
              onClick={() => onApprove(item.id)}
              className="text-xs bg-green-600 hover:bg-green-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(item.id)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              Reject
            </button>
          </>
        )}
        {(item.status === "approved" || item.status === "in_production") && (
          <Link
            href={studioUrl}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            → AI Studio
          </Link>
        )}
        {item.status !== "archived" && item.status !== "rejected" && (
          <button
            onClick={() => setNotesOpen(true)}
            className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1.5"
          >
            + Note
          </button>
        )}
        {item.status !== "archived" && (
          <button
            onClick={() => onArchive(item.id)}
            className="text-xs text-zinc-700 hover:text-zinc-500 ml-auto"
          >
            Archive
          </button>
        )}
        {(item.status === "archived" || item.status === "rejected") && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-zinc-700 hover:text-red-500 ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function QueueClient() {
  const { user } = useVaultAuth();
  const { items, loading } = useQueueItems(user?.uid ?? null, "all");

  const [activeTab, setActiveTab] = useState<QueueItemStatus | "all">("pending");

  const filtered = activeTab === "all" ? items : items.filter(i => i.status === activeTab);

  const counts: Record<string, number> = {
    all:           items.length,
    pending:       items.filter(i => i.status === "pending").length,
    approved:      items.filter(i => i.status === "approved").length,
    in_production: items.filter(i => i.status === "in_production").length,
    rejected:      items.filter(i => i.status === "rejected").length,
    archived:      items.filter(i => i.status === "archived").length,
  };

  const handleApprove = async (id: string) => {
    await updateQueueItem(id, {
      status:     "approved",
      approvedAt: new Date().toISOString(),
    });
  };

  const handleReject = async (id: string) => {
    await updateQueueItem(id, {
      status:     "rejected",
      rejectedAt: new Date().toISOString(),
    });
  };

  const handleArchive = async (id: string) => {
    await updateQueueItem(id, { status: "archived" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Permanently delete this queue item?")) return;
    await deleteQueueItem(id);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-white">Content Queue</h1>
            <p className="text-zinc-500 text-sm mt-1">
              AI-generated ideas awaiting review — every item traces back to its source document
            </p>
          </div>
          {counts.pending > 0 && (
            <div className="bg-amber-900 border border-amber-800 rounded-2xl px-4 py-2 text-center">
              <p className="text-2xl font-black text-amber-300">{counts.pending}</p>
              <p className="text-amber-500 text-xs">Pending review</p>
            </div>
          )}
        </div>
      </div>

      {/* How this works — only show when empty */}
      {!loading && items.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
          <h3 className="text-white font-semibold text-sm mb-3">How the Content Queue works</h3>
          <ol className="space-y-2">
            {[
              "Upload a source document (NRB circular, EPF policy, research PDF) in the Intelligence Library",
              "Click \"Analyze with AI\" — Claude extracts insights and proposes content ideas",
              "Content ideas automatically appear here as pending queue items",
              "Review each idea — verify the source, check the insights, then Approve or Reject",
              "Approved items flow to AI Studio for script generation",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="bg-zinc-800 text-zinc-400 text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                <span className="text-zinc-400">{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4">
            <Link
              href="/vault/documents"
              className="text-green-400 hover:text-green-300 text-sm font-semibold"
            >
              Go to Intelligence Library →
            </Link>
          </div>
        </div>
      )}

      {/* Status tabs */}
      {items.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-6">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {tab.label}
              {counts[tab.key] > 0 && (
                <span className={`ml-1.5 ${activeTab === tab.key ? "text-zinc-600" : "text-zinc-600"}`}>
                  {counts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-zinc-600 text-sm">Loading queue…</p>
        </div>
      ) : filtered.length === 0 && items.length > 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          No {activeTab === "all" ? "" : activeTab} items.
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(item => (
            <QueueCard
              key={item.id}
              item={item}
              onApprove={handleApprove}
              onReject={handleReject}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : null}

      {/* Traceability principle footer */}
      {items.length > 0 && (
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-600 text-xs">
            <span className="text-zinc-400 font-semibold">Source traceability: </span>
            Every item above links to its originating document. Use "View Source →" to verify claims before approving.
            Pending items auto-archive after 7 days. Nothing published without explicit approval.
          </p>
        </div>
      )}
    </div>
  );
}
