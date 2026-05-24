"use client";

import { useState } from "react";
import Link from "next/link";
import { useVaultAuth } from "../../../../hooks/vault/useVaultAuth";
import { useQueueItems } from "../../../../hooks/vault/useQueueItems";
import { updateQueueItem, deleteQueueItem } from "../../../../lib/vault/firestore";
import type { QueueItem, QueueItemStatus } from "../../../../lib/types/queue";
import { useLearningMode }  from "../../../../contexts/LearningModeContext";
import { TrustBadge }       from "../../../../components/vault/TrustBadge";
import { trustFromQueueItem } from "../../../../lib/intelligence/trust-score";

// ─── Display helpers ──────────────────────────────────────────────────────────

const STATUS_TABS: { key: QueueItemStatus | "all"; label: string }[] = [
  { key: "all",          label: "सबै"               },
  { key: "pending",      label: "Review पर्खिरहेको" },
  { key: "approved",     label: "स्वीकृत"           },
  { key: "in_production",label: "निर्माण हुँदैछ"    },
  { key: "rejected",     label: "अस्वीकृत"          },
  { key: "archived",     label: "संग्रहित"           },
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

function isExpiringSoon(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;
}

function isExpired(expiresAt: string | undefined): boolean {
  if (!expiresAt) return false;
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
  const badge   = confidenceBadge(item.confidence);
  const trust   = trustFromQueueItem(item);
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
            <TrustBadge trust={trust} />
            {expiring && !expired && (
              <span className="text-xs text-amber-400">⏰ म्याद सकिँदैछ</span>
            )}
            {expired && (
              <span className="text-xs text-red-400">म्याद सकियो</span>
            )}
            {item.status !== "pending" && (
              <span className="text-xs text-zinc-600">
                {item.status === "approved"      ? "स्वीकृत" :
                 item.status === "in_production" ? "निर्माण हुँदैछ" :
                 item.status === "rejected"      ? "अस्वीकृत" :
                 item.status === "archived"      ? "संग्रहित" : item.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Source traceability panel — document-sourced items only */}
      {item.sourceDocId && (
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-zinc-500 text-xs shrink-0">📄</span>
              <div className="min-w-0">
                <p className="text-zinc-300 text-xs font-semibold truncate">{item.sourceDocTitle}</p>
                <p className="text-zinc-600 text-xs">{item.sourceDocFileName} · {item.sourceUploadedAt ? formatRelative(item.sourceUploadedAt) : ""}</p>
              </div>
            </div>
            {item.sourceDocUrl && (
              <a
                href={item.sourceDocUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-green-400 hover:text-green-300 font-semibold shrink-0 transition-colors"
              >
                स्रोत हेर्नुहोस् →
              </a>
            )}
          </div>

          {(item.sourceInsights ?? []).length > 0 && (
            <ul className="space-y-1 mt-1">
              {(item.sourceInsights ?? []).slice(0, 3).map((insight, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-500">
                  <span className="text-zinc-700 shrink-0 mt-0.5">•</span>
                  <span className="line-clamp-2">{insight}</span>
                </li>
              ))}
              {(item.sourceInsights ?? []).length > 3 && (
                <li className="text-xs text-zinc-700 pl-3">+{(item.sourceInsights ?? []).length - 3} more</li>
              )}
            </ul>
          )}
        </div>
      )}

      {/* Source traceability panel — signal-sourced items */}
      {item.sourceSignalId && !item.sourceDocId && (
        <div className="bg-zinc-800/50 rounded-xl p-3 border border-zinc-700 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs shrink-0">🧠</span>
            <p className="text-zinc-400 text-xs font-semibold">Intelligence signal बाट बनाइएको idea</p>
          </div>
          {item.brief && (
            <p className="text-zinc-500 text-xs leading-relaxed pl-4">{item.brief}</p>
          )}
        </div>
      )}

      {/* Admin notes */}
      {notesOpen ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Note थप्नुहोस्…"
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
              title="स्वीकृत गर्नुहोस् — AI Studio मा script बन्न जान्छ"
              className="text-xs bg-green-600 hover:bg-green-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              ✅ स्वीकृत
            </button>
            <button
              onClick={() => onReject(item.id)}
              title="अस्वीकार गर्नुहोस् — Rejected tab मा जान्छ, delete हुँदैन"
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              ❌ अस्वीकार
            </button>
          </>
        )}
        {item.status === "approved" && (
          <>
            <Link
              href={`/vault/content/preview?id=${item.id}`}
              className="text-xs bg-green-700 hover:bg-green-600 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              हेर्नुहोस् →
            </Link>
            <Link
              href={studioUrl}
              title="AI Studio — AWS Bedrock (Claude Sonnet 4.6) ले full script र thumbnail prompt बनाउँछ। Token खर्च हुन्छ।"
              className="text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              AI Studio 🔴
            </Link>
          </>
        )}
        {item.status === "in_production" && (
          <Link
            href={studioUrl}
            className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            → AI Studio 🔴
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
            संग्रह
          </button>
        )}
        {(item.status === "archived" || item.status === "rejected") && (
          <button
            onClick={() => onDelete(item.id)}
            className="text-xs text-zinc-700 hover:text-red-500 ml-auto"
          >
            मेटाउनुहोस्
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main client ──────────────────────────────────────────────────────────────

export default function QueueClient() {
  const { on: learn } = useLearningMode();
  const { user } = useVaultAuth();
  const { items, loading, error } = useQueueItems(user?.uid ?? null, "all");

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
    if (!confirm("यो queue item permanently मेटाउने? यो action undo हुँदैन।")) return;
    await deleteQueueItem(id);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-lg">📋</span>
              <h1 className="text-2xl font-black text-white">सामग्री Queue</h1>
            </div>
            <p className="text-zinc-500 text-sm mt-1 leading-relaxed max-w-lg">
              AI ले document बाट बनाएका ideas — तपाईंले review गरेर approve गर्नुहोस्,
              तब मात्र AI Studio मा script बन्छ।
            </p>
          </div>
          {counts.pending > 0 && (
            <div className="bg-amber-900 border border-amber-800 rounded-2xl px-4 py-2 text-center shrink-0">
              <p className="text-2xl font-black text-amber-300">{counts.pending}</p>
              <p className="text-amber-500 text-xs">review पर्खिरहेको</p>
            </div>
          )}
        </div>
      </div>

      {/* Firestore error banner */}
      {error && (
        <div className="mb-6 flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-2xl px-4 py-3">
          <span className="text-red-400 text-sm">✕</span>
          <p className="text-xs text-red-300/90">Queue unavailable: {error}. Check your connection and refresh.</p>
        </div>
      )}

      {/* Workflow explainer — always visible, Nepali */}
      {!loading && (
        <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">यो Queue कसरी काम गर्छ?</p>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
            {[
              {
                icon:  "🔍",
                step:  "Signal / Document",
                np:    "Intelligence आउँछ",
                cost:  "🟢 Free",
              },
              {
                icon:  "🤖",
                step:  "AI ले Idea बनाउँछ",
                np:    "Claude ले brief र hooks लेख्छ",
                cost:  "🟢 सस्तो (~2k tokens)",
              },
              {
                icon:  "👁",
                step:  "तपाईंले Review",
                np:    "स्वीकृत वा अस्वीकार गर्नुहोस्",
                cost:  "Free — AI छैन",
              },
              {
                icon:  "⚡",
                step:  "AI Studio",
                np:    "Full script र thumbnail prompt",
                cost:  "🔴 Token खर्च हुन्छ",
              },
              {
                icon:  "🎬",
                step:  "प्रकाशन",
                np:    "तपाईंले film र edit गर्नुहोस्",
                cost:  "Free",
              },
            ].map((s, i, arr) => (
              <div key={i} className="flex sm:flex-col items-start gap-2 sm:gap-1 relative">
                <div className="bg-zinc-800 rounded-xl p-2.5 flex-1 w-full">
                  <p className="text-base mb-1">{s.icon}</p>
                  <p className="text-xs font-bold text-zinc-200 leading-snug">{s.step}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{s.np}</p>
                  <p className="text-[9px] text-zinc-600 mt-1">{s.cost}</p>
                </div>
                {i < arr.length - 1 && (
                  <span className="text-zinc-700 text-xs sm:hidden">›</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state — Nepali guidance */}
      {!loading && items.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8 text-center">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-white font-bold text-base mb-1">Queue खाली छ</p>
          <p className="text-zinc-500 text-sm mb-5 leading-relaxed max-w-sm mx-auto">
            पहिले document upload गरेर AI ले analyze गर्नुहोस् —
            content ideas automatically यहाँ आउँछन्।
          </p>
          <ol className="text-left space-y-2 max-w-sm mx-auto mb-5">
            {[
              "📄 Documents मा जानुहोस् र document upload गर्नुहोस्",
              "🤖 'AI ले Analyze' थिच्नुहोस् — ideas automatically बन्छन्",
              "👁 यहाँ आएर review गर्नुहोस् — स्वीकृत वा अस्वीकार",
              "⚡ Approved ideas AI Studio मा script बन्न जान्छन्",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="bg-zinc-800 text-zinc-500 text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
                <span className="text-zinc-400">{step}</span>
              </li>
            ))}
          </ol>
          <Link
            href="/vault/documents"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            📄 Documents मा जानुहोस् →
          </Link>
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
          <p className="text-zinc-600 text-sm">Queue लोड हुँदैछ…</p>
        </div>
      ) : filtered.length === 0 && items.length > 0 ? (
        <div className="text-center py-16 text-zinc-600 text-sm">
          यस category मा कुनै item छैन।
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
          <p className="text-zinc-600 text-xs leading-relaxed">
            <span className="text-zinc-400 font-semibold">स्रोत जवाफदेहिता: </span>
            माथिका हरेक item आफ्नो मूल document सँग जोडिएको छ।
            Approve गर्नु अघि "स्रोत हेर्नुहोस् →" थिचेर verify गर्नुहोस्।
            Review नगरेका items ७ दिनपछि automatically संग्रहित हुन्छन्।
            Approve नगरेसम्म कुनै पनि item publish हुँदैन।
          </p>
        </div>
      )}
    </div>
  );
}
