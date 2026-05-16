"use client";

import { useState } from "react";
import Link from "next/link";
import { useVaultAuth }         from "../../../hooks/vault/useVaultAuth";
import { useSourceSignals }     from "../../../hooks/vault/useSourceSignals";
import { useIntelligenceDocs }  from "../../../hooks/vault/useIntelligenceDocs";
import { useQueueItems }        from "../../../hooks/vault/useQueueItems";
import {
  updateSourceSignal,
  updateQueueItem,
  approveIntelligenceDocForQueue,
  flagIntelligenceDocForRevision,
} from "../../../lib/vault/firestore";
import { CALCULATOR_REGISTRY }  from "../../../lib/data/calculator-registry";
import type { SourceSignal }        from "../../../lib/types/signals";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import type { QueueItem }           from "../../../lib/types/queue";
import type { CalculatorFormula }   from "../../../lib/data/calculator-registry";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "signals" | "documents" | "queue" | "calculators";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60_000);
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function ConfBadge({ confidence }: { confidence: number }) {
  const { label, cls } = confidence >= 0.8
    ? { label: "HIGH", cls: "bg-green-950 border-green-900 text-green-400" }
    : confidence >= 0.5
    ? { label: "MED",  cls: "bg-amber-950 border-amber-900 text-amber-400" }
    : { label: "LOW",  cls: "bg-red-950   border-red-900   text-red-400"   };
  return (
    <span className={`text-xs px-1.5 py-0.5 border rounded font-bold shrink-0 ${cls}`}>
      {label}
    </span>
  );
}

function EmptyState({ icon, title, message, linkHref, linkLabel }: {
  icon:      string;
  title:     string;
  message:   string;
  linkHref:  string;
  linkLabel: string;
}) {
  return (
    <div className="border border-zinc-900 rounded-lg p-8 text-center space-y-2">
      <p className="text-xl text-zinc-700">{icon}</p>
      <p className="text-sm font-medium text-zinc-400">{title}</p>
      <p className="text-xs text-zinc-600 max-w-xs mx-auto">{message}</p>
      <Link href={linkHref} className="inline-block mt-2 text-xs text-cyan-600 hover:text-cyan-400">
        {linkLabel}
      </Link>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

function TabBar({ tab, setTab, counts }: {
  tab:    Tab;
  setTab: (t: Tab) => void;
  counts: Record<Tab, number>;
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "signals",     label: "Signals"     },
    { key: "documents",   label: "Documents"   },
    { key: "queue",       label: "Queue"       },
    { key: "calculators", label: "Calculators" },
  ];
  return (
    <div className="flex gap-0 border-b border-zinc-800 px-4 overflow-x-auto">
      {tabs.map(t => {
        const count    = counts[t.key];
        const isActive = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              isActive
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            {count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                isActive ? "bg-cyan-900 text-cyan-400" : "bg-zinc-800 text-zinc-400"
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Signal card ──────────────────────────────────────────────────────────────

const CREDIBILITY_COLOR: Record<string, string> = {
  high:       "text-green-400",
  medium:     "text-amber-400",
  low:        "text-orange-400",
  unverified: "text-zinc-500",
};

function SignalCard({ signal, onValidate, onReject }: {
  signal:     SourceSignal;
  onValidate: (id: string) => Promise<void>;
  onReject:   (id: string) => Promise<void>;
}) {
  const [acting, setActing] = useState(false);

  const act = async (fn: (id: string) => Promise<void>) => {
    setActing(true);
    try { await fn(signal.id); } finally { setActing(false); }
  };

  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
      {/* Source traceability header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-2">{signal.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-zinc-600">
            <span>{signal.sourceName}</span>
            <span>·</span>
            <span>{relTime(signal.createdAt)}</span>
            {signal.credibility && (
              <>
                <span>·</span>
                <span className={`font-semibold ${CREDIBILITY_COLOR[signal.credibility]}`}>
                  {signal.credibility.toUpperCase()}
                </span>
              </>
            )}
            {signal.relevanceScore !== undefined && (
              <>
                <span>·</span>
                <span>{Math.round(signal.relevanceScore * 100)}% relevance</span>
              </>
            )}
          </div>
        </div>
        <a
          href={signal.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-700 hover:text-cyan-500 shrink-0 mt-0.5"
        >
          Source ↗
        </a>
      </div>

      {/* AI summary */}
      {signal.summary && (
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{signal.summary}</p>
      )}

      {/* Taxonomy tags */}
      {signal.taxonomyTags && signal.taxonomyTags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {signal.taxonomyTags.slice(0, 5).map(tag => (
            <span
              key={tag.topicId}
              className="text-xs px-1.5 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500"
            >
              {tag.topicId}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          disabled={acting}
          onClick={() => act(onValidate)}
          className="flex-1 text-xs py-1.5 bg-green-950 hover:bg-green-900 border border-green-900 text-green-300 rounded transition-colors disabled:opacity-50"
        >
          {acting ? "…" : "Validate"}
        </button>
        <button
          disabled={acting}
          onClick={() => act(onReject)}
          className="flex-1 text-xs py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 rounded transition-colors disabled:opacity-50"
        >
          {acting ? "…" : "Reject"}
        </button>
        <Link
          href="/vault/content/intelligence"
          className="flex-1 text-center text-xs py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 rounded transition-colors"
        >
          Details →
        </Link>
      </div>
    </div>
  );
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocReviewCard({ doc, onApprove, onFlag }: {
  doc:       IntelligenceDocument;
  onApprove: (id: string) => Promise<void>;
  onFlag:    (id: string, notes: string) => Promise<void>;
}) {
  const [acting,    setActing]    = useState(false);
  const [flagging,  setFlagging]  = useState(false);
  const [flagNotes, setFlagNotes] = useState("");

  const actApprove = async () => {
    setActing(true);
    try { await onApprove(doc.id); } finally { setActing(false); }
  };
  const actFlag = async () => {
    setActing(true);
    try { await onFlag(doc.id, flagNotes); setFlagging(false); } finally { setActing(false); }
  };

  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{doc.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-zinc-600">
            <span className="uppercase">{doc.category}</span>
            <span>·</span>
            <span>{relTime(doc.uploadedAt)}</span>
            <span>·</span>
            <span>{doc.fileName}</span>
          </div>
        </div>
        {doc.confidence !== undefined && (
          <ConfBadge confidence={doc.confidence} />
        )}
      </div>

      {/* AI Summary */}
      {doc.aiSummary && (
        <div className="bg-zinc-950 border border-zinc-900 rounded px-3 py-2">
          <p className="text-xs text-zinc-600 font-medium mb-1">AI Summary</p>
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{doc.aiSummary}</p>
        </div>
      )}

      {/* Key Insights */}
      {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-zinc-600 font-medium">Key Insights ({doc.aiKeyInsights.length})</p>
          {doc.aiKeyInsights.slice(0, 3).map((insight, i) => (
            <div key={i} className="flex gap-1.5 text-xs text-zinc-400">
              <span className="text-cyan-800 shrink-0">›</span>
              <span className="line-clamp-1">{insight}</span>
            </div>
          ))}
          {doc.aiKeyInsights.length > 3 && (
            <p className="text-xs text-zinc-600 pl-3">+{doc.aiKeyInsights.length - 3} more</p>
          )}
        </div>
      )}

      {/* Content ideas count */}
      {doc.contentIdeas && doc.contentIdeas.length > 0 && (
        <p className="text-xs text-zinc-600">
          {doc.contentIdeas.length} content idea{doc.contentIdeas.length !== 1 ? "s" : ""} will be sent to queue on approval
        </p>
      )}

      {/* Flag notes input */}
      {flagging && (
        <div className="space-y-2 pt-1">
          <textarea
            value={flagNotes}
            onChange={e => setFlagNotes(e.target.value)}
            placeholder="What needs revision? (optional)"
            rows={2}
            className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
          />
          <div className="flex gap-2">
            <button
              disabled={acting}
              onClick={actFlag}
              className="flex-1 text-xs py-1.5 bg-amber-950 border border-amber-800 text-amber-300 rounded disabled:opacity-50"
            >
              {acting ? "…" : "Confirm Flag"}
            </button>
            <button
              onClick={() => setFlagging(false)}
              className="flex-1 text-xs py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!flagging && (
        <div className="flex gap-2 pt-1">
          <button
            disabled={acting}
            onClick={actApprove}
            className="flex-1 text-xs py-1.5 bg-green-950 hover:bg-green-900 border border-green-900 text-green-300 rounded transition-colors disabled:opacity-50"
          >
            {acting ? "…" : "Approve for Queue"}
          </button>
          <button
            disabled={acting}
            onClick={() => setFlagging(true)}
            className="flex-1 text-xs py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-900 text-amber-400 rounded transition-colors disabled:opacity-50"
          >
            Flag for Revision
          </button>
          <Link
            href="/vault/documents"
            className="flex-1 text-center text-xs py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 rounded transition-colors"
          >
            Library →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Queue card ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  "youtube-long":  "YouTube",
  "shorts":        "Shorts",
  "facebook-post": "Facebook Post",
  "carousel":      "Carousel",
  "explainer":     "Explainer",
  "other":         "Content",
};

function QueueReviewCard({ item, onApprove, onReject }: {
  item:      QueueItem;
  onApprove: (id: string, notes: string) => Promise<void>;
  onReject:  (id: string, notes: string) => Promise<void>;
}) {
  const [acting,    setActing]    = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes,     setNotes]     = useState(item.adminNotes ?? "");

  const act = async (fn: (id: string, n: string) => Promise<void>) => {
    setActing(true);
    try { await fn(item.id, notes); } finally { setActing(false); }
  };

  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white line-clamp-2">{item.aiTitle}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-zinc-600">
            <span>{TYPE_LABELS[item.contentType] ?? item.contentType}</span>
            <span>·</span>
            <span className="capitalize">{item.platform}</span>
            <span>·</span>
            <span>{relTime(item.createdAt)}</span>
          </div>
        </div>
        <ConfBadge confidence={item.confidence} />
      </div>

      {/* Source traceability — required for every queue item */}
      <div className="bg-zinc-950 border border-zinc-900 rounded px-3 py-2 space-y-1">
        <p className="text-xs text-zinc-600 font-medium">Source Trace</p>
        {item.sourceDocTitle && (
          <p className="text-xs text-zinc-400 truncate">Document: {item.sourceDocTitle}</p>
        )}
        {item.sourceSignalId && (
          <p className="text-xs text-zinc-400">Signal: {item.sourceSignalId.slice(0, 12)}…</p>
        )}
        {item.sourceDocUrl && (
          <a
            href={item.sourceDocUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-cyan-700 hover:text-cyan-500"
          >
            View source file ↗
          </a>
        )}
        {!item.sourceDocTitle && !item.sourceSignalId && (
          <p className="text-xs text-red-500">⚠ No source trace — review carefully</p>
        )}
      </div>

      {/* Brief */}
      {item.brief && (
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{item.brief}</p>
      )}

      {/* Hooks */}
      {item.hooks && item.hooks.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-xs text-zinc-600 font-medium">Hooks</p>
          {item.hooks.slice(0, 2).map((hook, i) => (
            <p key={i} className="text-xs text-zinc-400 line-clamp-1">
              <span className="text-cyan-800">›</span> {hook}
            </p>
          ))}
        </div>
      )}

      {/* Admin notes input */}
      {showNotes && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Admin notes (optional — visible on queue item)"
          rows={2}
          className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          disabled={acting}
          onClick={() => act(onApprove)}
          className="flex-1 text-xs py-1.5 bg-green-950 hover:bg-green-900 border border-green-900 text-green-300 rounded transition-colors disabled:opacity-50"
        >
          {acting ? "…" : "Approve"}
        </button>
        <button
          disabled={acting}
          onClick={() => act(onReject)}
          className="flex-1 text-xs py-1.5 bg-red-950 hover:bg-red-900 border border-red-900 text-red-400 rounded transition-colors disabled:opacity-50"
        >
          {acting ? "…" : "Reject"}
        </button>
        <button
          onClick={() => setShowNotes(p => !p)}
          className="text-xs px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 rounded transition-colors"
        >
          {showNotes ? "Hide" : "Notes"}
        </button>
      </div>
    </div>
  );
}

// ─── Calculator formula card ──────────────────────────────────────────────────

const FORMULA_STATUS_STYLE: Record<string, string> = {
  verified:   "text-green-400 bg-green-950 border-green-900",
  draft:      "text-amber-400 bg-amber-950 border-amber-900",
  deprecated: "text-red-400   bg-red-950   border-red-900",
};

function FormulaCard({ formula }: { formula: CalculatorFormula }) {
  const statusCls = FORMULA_STATUS_STYLE[formula.status] ?? FORMULA_STATUS_STYLE.draft;
  return (
    <div className="border border-zinc-800 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white">{formula.name}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{formula.calculatorTab} calculator</p>
        </div>
        <span className={`text-xs px-2 py-0.5 border rounded font-bold shrink-0 ${statusCls}`}>
          {formula.status.toUpperCase()}
        </span>
      </div>

      <p className="text-xs text-zinc-400">{formula.description}</p>

      {formula.formula && (
        <p className="text-xs font-mono bg-zinc-950 border border-zinc-900 rounded px-2 py-1.5 text-zinc-300 leading-relaxed">
          {formula.formula}
        </p>
      )}

      {formula.notes && (
        <p className="text-xs text-zinc-600 italic leading-relaxed">{formula.notes}</p>
      )}

      {formula.verifiedAt && (
        <p className="text-xs text-zinc-600">
          Verified {new Date(formula.verifiedAt).toLocaleDateString()}
          {formula.verifiedBy && ` · ${formula.verifiedBy}`}
        </p>
      )}

      {formula.status === "draft" && (
        <div className="border border-amber-900/50 bg-amber-950/20 rounded px-2.5 py-1.5">
          <p className="text-xs text-amber-600">
            Not yet verified — public calculator results include a verification-pending notice.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminVaultClient() {
  const [tab, setTab] = useState<Tab>("signals");

  const { user }                              = useVaultAuth();
  const uid                                   = user?.uid ?? null;
  const { signals: allSignals, loading: sl }  = useSourceSignals(uid, "all");
  const { docs, loading: dl }                 = useIntelligenceDocs(uid);
  const { items: pendingQueue, loading: ql }  = useQueueItems(uid, "pending");

  // Derived pending counts
  const pendingSignals = allSignals.filter(s => s.status === "raw");
  const pendingDocs    = docs.filter(d =>
    d.processingStatus === "ai_ready" &&
    (d.adminApprovalStatus === "pending_review" || !d.adminApprovalStatus),
  );
  const unverifiedCalcs = CALCULATOR_REGISTRY.filter(c => c.status !== "verified");

  const counts: Record<Tab, number> = {
    signals:     pendingSignals.length,
    documents:   pendingDocs.length,
    queue:       pendingQueue.length,
    calculators: unverifiedCalcs.length,
  };

  const totalActionable = counts.signals + counts.documents + counts.queue;
  const loading         = sl || dl || ql;

  // ── Signal actions ──────────────────────────────────────────────────────────

  const handleValidateSignal = async (id: string) => {
    await updateSourceSignal(id, {
      status:      "validated",
      validatedBy: user?.email ?? "admin",
      validatedAt: new Date().toISOString(),
    });
  };

  const handleRejectSignal = async (id: string) => {
    await updateSourceSignal(id, { status: "rejected" });
  };

  // ── Document actions ────────────────────────────────────────────────────────

  const handleApproveDoc = async (id: string) => {
    await approveIntelligenceDocForQueue(id);
  };

  const handleFlagDoc = async (id: string, notes: string) => {
    await flagIntelligenceDocForRevision(id, notes);
  };

  // ── Queue actions ───────────────────────────────────────────────────────────

  const handleApproveQueue = async (id: string, notes: string) => {
    await updateQueueItem(id, {
      status:     "approved",
      adminNotes: notes || undefined,
      approvedAt: new Date().toISOString(),
    });
  };

  const handleRejectQueue = async (id: string, notes: string) => {
    await updateQueueItem(id, {
      status:     "rejected",
      adminNotes: notes || undefined,
      rejectedAt: new Date().toISOString(),
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Admin Intelligence Vault
            </h1>
            <p className="text-xs text-zinc-600 mt-0.5 max-w-sm">
              Central validation hub — all AI-generated content requires admin approval before entering the production pipeline.
            </p>
          </div>

          {!loading && totalActionable > 0 && (
            <div className="text-right shrink-0">
              <p className="text-2xl font-black text-cyan-400">{totalActionable}</p>
              <p className="text-xs text-zinc-500">pending review</p>
            </div>
          )}
          {!loading && totalActionable === 0 && (
            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-green-400">All clear</p>
              <p className="text-xs text-zinc-600">Nothing needs review</p>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="flex gap-4 flex-wrap">
          {[
            { label: "Raw Signals",       count: counts.signals,     color: "text-cyan-400"   },
            { label: "Docs for Review",   count: counts.documents,   color: "text-amber-400"  },
            { label: "Queue Pending",     count: counts.queue,       color: "text-orange-400" },
            { label: "Draft Formulas",    count: counts.calculators, color: "text-zinc-500"   },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-xs">
              <span className={`font-black text-sm ${s.color}`}>{s.count}</span>
              <span className="text-zinc-600">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <TabBar tab={tab} setTab={setTab} counts={counts} />

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="p-4 max-w-2xl">
        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
            Loading…
          </div>
        )}

        {/* Signals */}
        {!loading && tab === "signals" && (
          <div className="space-y-3">
            {pendingSignals.length === 0 ? (
              <EmptyState
                icon="◈"
                title="No raw signals pending"
                message="Ingest new URLs to generate signals, or check the Signal Feed for already-reviewed items."
                linkHref="/vault/content/intelligence"
                linkLabel="Open Signal Feed →"
              />
            ) : (
              pendingSignals.map(s => (
                <SignalCard
                  key={s.id}
                  signal={s}
                  onValidate={handleValidateSignal}
                  onReject={handleRejectSignal}
                />
              ))
            )}
          </div>
        )}

        {/* Documents */}
        {!loading && tab === "documents" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 pb-1">
              These documents have been processed by AI. Review the AI output, then approve to unlock queue item generation — or flag for revision.
            </p>
            {pendingDocs.length === 0 ? (
              <EmptyState
                icon="◻"
                title="No documents awaiting review"
                message="Upload and process documents in the Intelligence Library. AI-ready docs appear here for approval before entering the content queue."
                linkHref="/vault/documents"
                linkLabel="Open Intelligence Library →"
              />
            ) : (
              pendingDocs.map(d => (
                <DocReviewCard
                  key={d.id}
                  doc={d}
                  onApprove={handleApproveDoc}
                  onFlag={handleFlagDoc}
                />
              ))
            )}
          </div>
        )}

        {/* Queue */}
        {!loading && tab === "queue" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 pb-1">
              Approve items to unlock them for AI Studio script and thumbnail generation. Every item must have a verified source before approval.
            </p>
            {pendingQueue.length === 0 ? (
              <EmptyState
                icon="◆"
                title="No items pending approval"
                message="Content queue items appear here after being generated from validated signals or approved documents."
                linkHref="/vault/content/queue"
                linkLabel="Open Content Queue →"
              />
            ) : (
              pendingQueue.map(item => (
                <QueueReviewCard
                  key={item.id}
                  item={item}
                  onApprove={handleApproveQueue}
                  onReject={handleRejectQueue}
                />
              ))
            )}
          </div>
        )}

        {/* Calculators */}
        {!loading && tab === "calculators" && (
          <div className="space-y-3">
            <div className="border border-amber-900 bg-amber-950/20 rounded-lg p-3 text-xs text-amber-400 leading-relaxed">
              <strong>Formula Verification Required.</strong> Each formula below must be admin-verified before the calculator result is presented as final to users. Draft formulas show a verification-pending notice on the public site.
            </div>
            {CALCULATOR_REGISTRY.map(formula => (
              <FormulaCard key={formula.id} formula={formula} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
