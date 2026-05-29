"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, getDocs, query, where, addDoc, updateDoc, deleteDoc,
  doc as firestoreDoc, orderBy, limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { SOURCE_REGISTRY, type OfficialSource } from "../../../lib/vault/sourceRegistry";
import type { SourceWatcher, SourceUpdate, CheckSourceResult } from "../../../lib/types/source-monitoring";
import { VaultShell } from "../../../components/vault/VaultShell";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[sources]", e?.code ?? e); return fb; });

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const hr   = Math.floor(min / 60);
  const day  = Math.floor(hr / 24);
  if (day > 0) return `${day} दिन अगाडि`;
  if (hr  > 0) return `${hr} घण्टा अगाडि`;
  if (min > 0) return `${min} मिनेट अगाडि`;
  return "भर्खरै";
}

function whatHappened(src: OfficialSource | undefined, update: SourceUpdate): string {
  const name    = src?.nameNp ?? "सरकारी स्रोत";
  const docType = update.fileType === "pdf"  ? "PDF दस्तावेज" :
                  update.fileType === "docx" || update.fileType === "doc" ? "Word दस्तावेज" :
                  "नयाँ सामग्री";
  return `${name} ले ${docType} प्रकाशित गर्यो`;
}

// ─── Recommendation Card ───────────────────────────────────────────────────────
// Each detected SourceUpdate becomes one recommendation — WHAT / WHY / NEXT.

interface RecommendationCardProps {
  update:   SourceUpdate;
  source:   OfficialSource | undefined;
  onAction: (update: SourceUpdate, action: SourceUpdate["status"]) => void;
}

function RecommendationCard({ update, source, onAction }: RecommendationCardProps) {
  const isNew       = update.status === "new";
  const isPostponed = update.status === "reviewed";

  const uploadHref = `/vault/documents?upload=1&govFolder=${encodeURIComponent(update.likelyGovFolder)}&tags=${encodeURIComponent(update.tags.join(","))}`;

  const PIPELINE = [
    { num: 1, label: "PDF Download गर्नुहोस्",                  href: update.url,  external: true },
    { num: 2, label: "Vault मा Upload गर्नुहोस्",               href: uploadHref,  external: false },
    { num: 3, label: "Intelligence Extract चलाउनुहोस्",         href: null,        external: false },
    { num: 4, label: "संविधान सन्दर्भ जोड्नुहोस्",             href: null,        external: false },
    { num: 5, label: "नागरिक Knowledge Cards प्रकाशित गर्नुहोस्", href: null,     external: false },
  ];

  return (
    <article className={`rounded-xl border p-5 space-y-4 transition-opacity ${
      isNew       ? "bg-zinc-900/70 border-amber-800/40" :
      isPostponed ? "bg-zinc-900/40 border-zinc-800/40 opacity-70" :
                    "bg-zinc-950/30 border-zinc-800/30 opacity-40"
    }`}>

      {/* Source + time */}
      <div className="flex items-center gap-2 flex-wrap">
        {isNew && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          {source?.nameNp ?? update.sourceId}
        </span>
        <span className="text-[10px] text-zinc-700">·</span>
        <span className="text-[10px] text-zinc-700">{relativeTime(update.detectedAt)}</span>
        {update.fileType === "pdf" && (
          <span className="text-[9px] font-bold text-red-400 bg-red-950/30 border border-red-900/40 rounded px-1.5 py-0.5">
            PDF
          </span>
        )}
        {isPostponed && (
          <span className="ml-auto text-[9px] text-zinc-600 bg-zinc-800/40 border border-zinc-700/30 rounded px-2 py-0.5">
            पछि गर्ने
          </span>
        )}
      </div>

      {/* WHAT HAPPENED */}
      <div className="space-y-1.5">
        <p className="text-white font-black text-base leading-snug">
          {whatHappened(source, update)}
        </p>

        {/* WHAT CHANGED — the document */}
        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-2">
          {update.title || update.url}
        </p>

        {/* Constitutional context */}
        {source && source.relatedParts.length > 0 && (
          <div className="flex gap-1 flex-wrap pt-0.5">
            {source.relatedParts.slice(0, 4).map(p => (
              <span
                key={p}
                className="text-[10px] text-blue-500 bg-blue-950/20 border border-blue-900/30 rounded px-1.5 py-0.5 font-mono"
              >
                भाग {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* WHAT TO DO NEXT — recommended pipeline (only for new) */}
      {isNew && (
        <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/50 px-4 py-3 space-y-2">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
            सिफारिस गरिएका कदमहरू
          </p>
          <ol className="space-y-2">
            {PIPELINE.map(step => (
              <li key={step.num} className="flex items-center gap-3 text-sm">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {step.num}
                </span>
                {step.href ? (
                  <a
                    href={step.href}
                    target={step.external ? "_blank" : undefined}
                    rel={step.external ? "noopener noreferrer" : undefined}
                    className="text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
                  >
                    {step.label} →
                  </a>
                ) : (
                  <span className="text-zinc-600">{step.label}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* FOUNDER ACTIONS */}
      {isNew && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <a
            href={uploadHref}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-950/80 transition-colors"
          >
            Vault मा सुरु गर्नुहोस् →
          </a>
          <button
            onClick={() => onAction(update, "reviewed")}
            className="text-xs font-medium px-3 py-2 rounded-lg bg-zinc-800/40 text-zinc-400 border border-zinc-700/40 hover:bg-zinc-800/70 transition-colors"
          >
            ⏭ पछि गर्छु
          </button>
          <button
            onClick={() => onAction(update, "ignored")}
            className="text-xs font-medium px-3 py-2 text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            × छोड्नुहोस्
          </button>
        </div>
      )}

      {/* Re-action for postponed */}
      {isPostponed && (
        <div className="flex items-center gap-2">
          <a
            href={uploadHref}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-500 border border-emerald-900/40 hover:bg-emerald-950/60 transition-colors"
          >
            Vault मा Upload गर्नुहोस् →
          </a>
          <button
            onClick={() => onAction(update, "ignored")}
            className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors"
          >
            × छोड्नुहोस्
          </button>
        </div>
      )}
    </article>
  );
}

// ─── Source Management ────────────────────────────────────────────────────────
// Secondary panel — which sources are being monitored. Collapsed by default.
// "Monitoring" is backend state. It lives here, not in the main view.

interface SourceManagementProps {
  sources:    typeof SOURCE_REGISTRY;
  watcherMap: Record<string, SourceWatcher>;
  onToggle:   (src: OfficialSource) => void;
  onCheck:    (src: OfficialSource, watcher: SourceWatcher) => void;
  checkingId: string | null;
}

function SourceManagement({ sources, watcherMap, onToggle, onCheck, checkingId }: SourceManagementProps) {
  const [open,   setOpen]   = useState(false);
  const [filter, setFilter] = useState<"watched" | "all">("watched");

  const watched  = sources.filter(s => watcherMap[s.sourceId]);
  const filtered = filter === "watched" ? watched : sources;

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-zinc-400">स्रोत व्यवस्थापन</span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {watched.length} अनुगमनमा · {sources.length} उपलब्ध
          </span>
        </div>
        <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-800/40 px-5 pb-5 space-y-4">

          <div className="flex gap-2 pt-4">
            {(["watched", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${
                  filter === f
                    ? "bg-zinc-800 text-zinc-300 border-zinc-700"
                    : "text-zinc-600 border-zinc-800/60 hover:text-zinc-400"
                }`}
              >
                {f === "watched" ? `अनुगमनमा (${watched.length})` : `सबै स्रोत (${sources.length})`}
              </button>
            ))}
          </div>

          <p className="text-[10px] text-zinc-700 leading-relaxed">
            स्रोत थप्नुहोस् → प्रणालीले नयाँ दस्तावेज पत्ता लगाउँछ → तपाईंलाई सिफारिस पठाउँछ।
          </p>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {filtered.map(src => {
              const watcher = watcherMap[src.sourceId] ?? null;
              return (
                <div
                  key={src.sourceId}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    watcher
                      ? "bg-zinc-900/60 border-zinc-700/40"
                      : "bg-zinc-950/40 border-zinc-800/30"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 truncate">{src.nameNp}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{src.domain}</p>
                  </div>
                  {/* Manual re-check (background action — no prominent label) */}
                  {watcher && (
                    <button
                      onClick={() => onCheck(src, watcher)}
                      disabled={checkingId === src.sourceId}
                      title="स्रोत पुन: जाँच गर्नुहोस्"
                      className="text-[10px] font-bold w-7 h-7 rounded border border-violet-800/40 bg-violet-950/30 text-violet-400 hover:bg-violet-950/50 transition-colors disabled:opacity-40 flex items-center justify-center"
                    >
                      {checkingId === src.sourceId ? "⏳" : "↺"}
                    </button>
                  )}
                  <button
                    onClick={() => onToggle(src)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
                      watcher
                        ? "bg-zinc-800/60 text-zinc-500 border-zinc-700/40 hover:text-red-400 hover:border-red-900/40"
                        : "bg-emerald-950/30 text-emerald-600 border-emerald-900/40 hover:bg-emerald-950/50"
                    }`}
                  >
                    {watcher ? "हटाउनुहोस्" : "+ थप्नुहोस्"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type InboxFilter = "new" | "postponed" | "done";

export default function SourcesClient() {
  const { user } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [watchers,     setWatchers]     = useState<SourceWatcher[]>([]);
  const [updates,      setUpdates]      = useState<SourceUpdate[]>([]);
  const [checkingId,   setCheckingId]   = useState<string | null>(null);
  const [inboxFilter,  setInboxFilter]  = useState<InboxFilter>("new");

  // ─── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!uid) return;
    const [wSnap, uSnap] = await Promise.all([
      safe(getDocs(query(collection(db, "monitored_sources"), where("ownerId", "==", uid), limit(100))), null),
      safe(getDocs(query(collection(db, "source_updates"),   where("ownerId", "==", uid), orderBy("detectedAt", "desc"), limit(200))), null),
    ]);
    if (wSnap) setWatchers(wSnap.docs.map(d => ({ id: d.id, ...d.data() } as SourceWatcher)));
    if (uSnap) setUpdates(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as SourceUpdate)));
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  // ─── Toggle monitor ──────────────────────────────────────────────────────────

  const toggleWatch = useCallback(async (src: OfficialSource) => {
    if (!uid) return;
    const existing = watchers.find(w => w.sourceId === src.sourceId);
    if (existing) {
      await safe(deleteDoc(firestoreDoc(db, "monitored_sources", existing.id)), undefined);
      setWatchers(prev => prev.filter(w => w.id !== existing.id));
    } else {
      const now = new Date().toISOString();
      const watcher: Omit<SourceWatcher, "id"> = {
        ownerId: uid, sourceId: src.sourceId, url: src.officialUrl,
        status: "active", checkFrequency: "manual",
        lastCheckedAt: null, lastKnownUrls: [], createdAt: now,
      };
      const ref = await addDoc(collection(db, "monitored_sources"), watcher);
      setWatchers(prev => [...prev, { id: ref.id, ...watcher }]);
    }
  }, [uid, watchers]);

  // ─── Check source (background fetch) ─────────────────────────────────────────

  const checkSource = useCallback(async (src: OfficialSource, watcher: SourceWatcher) => {
    if (!uid || checkingId) return;
    setCheckingId(src.sourceId);
    try {
      const res  = await fetch("/api/check-source", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: watcher.url, sourceId: src.sourceId, lastKnownUrls: watcher.lastKnownUrls }),
      });
      const data: CheckSourceResult = await res.json();
      const allFoundUrls = data.foundUrls.map(l => l.url);

      await safe(updateDoc(firestoreDoc(db, "monitored_sources", watcher.id), {
        lastCheckedAt: data.checkedAt, lastKnownUrls: allFoundUrls,
        status: data.error ? "error" : "active", errorMessage: data.error ?? null,
      }), undefined);

      const newUpdates: SourceUpdate[] = [];
      for (const link of data.newUrls) {
        const update: Omit<SourceUpdate, "id"> = {
          ownerId: uid, sourceId: src.sourceId, watcherId: watcher.id,
          url: link.url, title: link.title, fileType: link.fileType,
          detectedAt: data.checkedAt, status: "new",
          likelyGovFolder: src.relatedGovFolders[0] ?? "policy-planning",
          likelyParts: src.relatedParts.slice(0, 3),
          tags: src.tags.slice(0, 5), confidence: link.fileType === "pdf" ? 0.85 : 0.5,
        };
        const ref = await addDoc(collection(db, "source_updates"), update);
        newUpdates.push({ id: ref.id, ...update });
      }

      setWatchers(prev => prev.map(w =>
        w.id === watcher.id
          ? { ...w, lastCheckedAt: data.checkedAt, lastKnownUrls: allFoundUrls, status: data.error ? "error" : "active" }
          : w,
      ));
      setUpdates(prev => [...newUpdates, ...prev]);
    } finally {
      setCheckingId(null);
    }
  }, [uid, checkingId]);

  // ─── Founder action: approve / postpone / skip ───────────────────────────────

  const handleAction = useCallback(async (update: SourceUpdate, status: SourceUpdate["status"]) => {
    await safe(updateDoc(firestoreDoc(db, "source_updates", update.id), { status }), undefined);
    setUpdates(prev => prev.map(u => u.id === update.id ? { ...u, status } : u));
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────────

  if (!uid) return null;

  const sourceMap: Record<string, OfficialSource> = {};
  for (const s of SOURCE_REGISTRY) sourceMap[s.sourceId] = s;

  const watcherMap: Record<string, SourceWatcher> = {};
  for (const w of watchers) watcherMap[w.sourceId] = w;

  const newCount       = updates.filter(u => u.status === "new").length;
  const postponedCount = updates.filter(u => u.status === "reviewed").length;
  const doneCount      = updates.filter(u => u.status === "uploaded" || u.status === "ignored").length;

  const visible = updates.filter(u => {
    if (inboxFilter === "new")       return u.status === "new";
    if (inboxFilter === "postponed") return u.status === "reviewed";
    return u.status === "uploaded" || u.status === "ignored";
  });

  return (
    <VaultShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero ── */}
        <div className="space-y-2">
          <h1 className="text-xl font-black text-white">स्रोत Intelligence Centre</h1>
          <p className="text-zinc-400 text-sm">
            {newCount > 0 ? (
              <>
                <span className="text-amber-400 font-bold">{newCount} सिफारिस</span>
                {" "}तपाईंको निर्णयको प्रतीक्षामा छन्
              </>
            ) : (
              "अहिले कुनै नयाँ सिफारिस छैन — स्रोतहरू पृष्ठभूमिमा अनुगमन भइरहेका छन्"
            )}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 animate-pulse" />
            <span>
              {watchers.length} स्रोत अनुगमनमा · प्रणालीले पत्ता लगाउँछ · तपाईं निर्णय गर्नुहुन्छ
            </span>
          </div>
        </div>

        {/* ── Inbox filter tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "new",       label: "नयाँ सिफारिस", count: newCount },
            { key: "postponed", label: "पछि गर्ने",    count: postponedCount },
            { key: "done",      label: "सकिएका",        count: doneCount },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setInboxFilter(key)}
              className={`text-[11px] font-bold px-4 py-1.5 rounded-full border transition-colors ${
                inboxFilter === key
                  ? "bg-zinc-800 text-zinc-200 border-zinc-600"
                  : "text-zinc-600 border-zinc-800/60 hover:text-zinc-400"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`ml-1.5 font-black text-[10px] ${key === "new" ? "text-amber-400" : "text-zinc-500"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Recommendations inbox ── */}
        <div className="space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-12 text-center space-y-3">
              <p className="text-zinc-500 text-sm font-semibold">
                {inboxFilter === "new"
                  ? "नयाँ सिफारिस छैन"
                  : inboxFilter === "postponed"
                    ? "पछि गर्ने सूचीमा कुनै छैन"
                    : "सकिएका सिफारिस छैनन्"}
              </p>
              {inboxFilter === "new" && watchers.length === 0 && (
                <p className="text-zinc-700 text-xs">
                  तल "स्रोत व्यवस्थापन" खोलेर स्रोत थप्नुहोस् — प्रणालीले नयाँ दस्तावेज पत्ता लगाउन थाल्छ।
                </p>
              )}
              {inboxFilter === "new" && watchers.length > 0 && (
                <p className="text-zinc-700 text-xs">
                  {watchers.length} स्रोत अनुगमनमा छन्। नयाँ दस्तावेज प्रकाशित भएपछि यहाँ देखिनेछ।
                </p>
              )}
            </div>
          ) : (
            visible.map(update => (
              <RecommendationCard
                key={update.id}
                update={update}
                source={sourceMap[update.sourceId]}
                onAction={handleAction}
              />
            ))
          )}
        </div>

        {/* ── Source Management — secondary, collapsed by default ── */}
        <SourceManagement
          sources={SOURCE_REGISTRY}
          watcherMap={watcherMap}
          onToggle={toggleWatch}
          onCheck={checkSource}
          checkingId={checkingId}
        />

      </div>
    </VaultShell>
  );
}
