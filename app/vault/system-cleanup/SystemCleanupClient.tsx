"use client";

import { useEffect, useState, useMemo }        from "react";
import Link                                     from "next/link";
import {
  collection, query, where, limit, getDocs,
  deleteDoc, updateDoc, doc as firestoreDoc,
} from "firebase/firestore";
import { db }                                   from "../../firebase";
import { useVaultAuth }                         from "../../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs }                  from "../../../hooks/vault/useIntelligenceDocs";
import { updateIntelligenceDoc, deleteIntelligenceDoc } from "../../../lib/vault/firestore";
import {
  computeFullPipelineState,
  type FullPipelineState,
  type PipelineHealth,
} from "../../../lib/vault/fullPipelineState";
import {
  computeLineage,
  detectDuplicateGroups,
  TIER_CFG,
  SAFETY_CFG,
  type LineageCounts,
} from "../../../lib/vault/documentLineage";
import type { IntelligenceDocument } from "../../../lib/types/documents";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DocCounts {
  intelCount:                  number;
  atomicCount:                 number;
  economyCount:                number;
  classificationCount:         number;
  classificationApprovedCount: number;
  constitutionalCount:         number;
  promiseCount:                number;
  relCount:                    number;
}

const EMPTY_COUNTS: DocCounts = {
  intelCount: 0, atomicCount: 0, economyCount: 0,
  classificationCount: 0, classificationApprovedCount: 0,
  constitutionalCount: 0, promiseCount: 0, relCount: 0,
};

type FilterMode = "all" | "healthy" | "needs_action" | "stuck" | "suspect" | "in_progress";
type OverrideDecision = "keep" | "archive" | "delete" | "review" | null;

// ── Health display ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<PipelineHealth, { label: string; cls: string; dot: string }> = {
  healthy:     { label: "Pipeline पूरा",    cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800", dot: "bg-emerald-400" },
  in_progress: { label: "प्रक्रियामा",      cls: "bg-blue-900/40 text-blue-400 border-blue-800",          dot: "bg-blue-400"   },
  needs_action:{ label: "Action चाहिन्छ",   cls: "bg-amber-900/40 text-amber-400 border-amber-800",       dot: "bg-amber-400"  },
  stuck:       { label: "अड्किएको",         cls: "bg-red-900/40 text-red-400 border-red-800",             dot: "bg-red-400"    },
  suspect:     { label: "संदिग्ध",          cls: "bg-zinc-800 text-zinc-400 border-zinc-700",             dot: "bg-zinc-500"   },
};

const CLEANUP_CONFIG: Record<FullPipelineState["cleanupSuggestion"], { label: string; cls: string }> = {
  keep:    { label: "राख्नुहोस्", cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/60" },
  review:  { label: "हेर्नुहोस्", cls: "bg-amber-900/30 text-amber-400 border-amber-800/60"       },
  archive: { label: "Archive",    cls: "bg-blue-900/30 text-blue-400 border-blue-800/60"           },
  delete:  { label: "Delete",     cls: "bg-red-900/30 text-red-400 border-red-800/60"              },
};

const FILTER_LABELS: Record<FilterMode, string> = {
  all:          "सबै",
  healthy:      "Pipeline पूरा",
  needs_action: "Action चाहिन्छ",
  stuck:        "अड्किएको",
  suspect:      "संदिग्ध",
  in_progress:  "प्रक्रियामा",
};

// ── Safe Firestore helper ──────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[system-cleanup] read failed:", e?.code ?? e); return fb; });

// ── Component ──────────────────────────────────────────────────────────────────

export default function SystemCleanupClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid                            = user?.uid ?? null;
  const { docs, loading: docsLoading } = useIntelligenceDocs(uid);

  const [counts,          setCounts]         = useState<Record<string, DocCounts>>({});
  const [countsLoading,   setCountsLoading]  = useState(true);
  const [overrides,       setOverrides]      = useState<Record<string, OverrideDecision>>({});
  const [actionLoading,   setActionLoading]  = useState<string | null>(null);
  const [filter,          setFilter]         = useState<FilterMode>("all");
  const [search,          setSearch]         = useState("");
  const [confirmDelete,   setConfirmDelete]  = useState<IntelligenceDocument | null>(null);
  const [expandedLineage, setExpandedLineage]= useState<string | null>(null);

  // ── Load collection counts ─────────────────────────────────────────────────

  useEffect(() => {
    if (!uid) return;

    const EMPTY_SNAP = { docs: [] as { data(): Record<string, unknown>; id: string }[] };

    Promise.all([
      safe(getDocs(query(collection(db, "janta_intelligence"),        where("ownerId", "==", uid), limit(2000))), EMPTY_SNAP),
      safe(getDocs(query(collection(db, "atomic_extraction_logs"),    where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
      safe(getDocs(query(collection(db, "economy_atoms"),             where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
      safe(getDocs(query(collection(db, "classification_suggestions"),where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
      safe(getDocs(query(collection(db, "constitutional_framework"),  where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
      safe(getDocs(query(collection(db, "promise_atoms"),             where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
      safe(getDocs(query(collection(db, "janta_relationships"),       where("ownerId", "==", uid), limit(500))),  EMPTY_SNAP),
    ]).then(([intelSnap, atomicSnap, economySnap, classSnap, constSnap, promiseSnap, relSnap]) => {
      const map: Record<string, DocCounts> = {};

      const ensure = (id: string) => {
        if (!map[id]) map[id] = { ...EMPTY_COUNTS };
      };

      intelSnap.docs.forEach(d => {
        const srcId = d.data().sourceDocId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].intelCount++; }
      });
      atomicSnap.docs.forEach(d => {
        const srcId = d.data().docId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].atomicCount++; }
      });
      economySnap.docs.forEach(d => {
        const srcId = d.data().sourceDocumentId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].economyCount++; }
      });
      classSnap.docs.forEach(d => {
        const srcId  = d.data().sourceDocumentId as string | undefined;
        const status = d.data().status as string | undefined;
        if (srcId) {
          ensure(srcId);
          map[srcId].classificationCount++;
          if (status === "approved") map[srcId].classificationApprovedCount++;
        }
      });
      constSnap.docs.forEach(d => {
        const srcId = d.data().sourceDocId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].constitutionalCount++; }
      });
      promiseSnap.docs.forEach(d => {
        const srcId = d.data().sourceDocumentId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].promiseCount++; }
      });
      relSnap.docs.forEach(d => {
        const srcId = d.data().sourceDocId as string | undefined;
        if (srcId) { ensure(srcId); map[srcId].relCount++; }
      });

      setCounts(map);
      setCountsLoading(false);
    });
  }, [uid]);

  // ── Compute pipeline states ────────────────────────────────────────────────

  const pipelineStates = useMemo(() => {
    if (docsLoading || countsLoading) return [];
    return docs.map(doc => {
      const c = counts[doc.id] ?? EMPTY_COUNTS;
      return computeFullPipelineState({
        id:                          doc.id,
        title:                       doc.title,
        fileName:                    doc.fileName,
        processingStatus:            doc.processingStatus,
        adminApprovalStatus:         doc.adminApprovalStatus,
        aiSummary:                   doc.aiSummary,
        downloadUrl:                 doc.downloadUrl,
        sourceUrl:                   doc.sourceUrl,
        originalSourceUrl:           doc.originalSourceUrl,
        extractionTier:              doc.extractionTier as string | undefined,
        atomicCompleted:             doc.atomicCompleted,
        govFolder:                   doc.govFolder,
        uploadedAt:                  doc.uploadedAt,
        tags:                        doc.tags,
        intelCount:                  c.intelCount,
        atomicCount:                 c.atomicCount,
        economyCount:                c.economyCount,
        classificationCount:         c.classificationCount,
        classificationApprovedCount: c.classificationApprovedCount,
      });
    });
  }, [docs, counts, docsLoading, countsLoading]);

  // ── Duplicate groups ───────────────────────────────────────────────────────

  const duplicateGroups = useMemo(() => {
    if (docsLoading) return new Map<string, string[]>();
    return detectDuplicateGroups(
      docs.map(d => ({ id: d.id, title: d.title, govFolder: d.govFolder, sourceUrl: d.sourceUrl }))
    );
  }, [docs, docsLoading]);

  // Invert: docId → fingerprint key (so we can look up which group a doc is in)
  const docDupKey = useMemo(() => {
    const m = new Map<string, string>();
    duplicateGroups.forEach((ids, key) => {
      ids.forEach(id => m.set(id, key));
    });
    return m;
  }, [duplicateGroups]);

  // ── Filter + search ────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let rows = pipelineStates;
    if (filter !== "all") rows = rows.filter(s => s.health === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s => s.title.toLowerCase().includes(q));
    }
    return rows;
  }, [pipelineStates, filter, search]);

  // ── Summary counts ─────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const byHealth: Partial<Record<PipelineHealth, number>> = {};
    const bySuggestion: Partial<Record<FullPipelineState["cleanupSuggestion"], number>> = {};
    for (const s of pipelineStates) {
      byHealth[s.health] = (byHealth[s.health] ?? 0) + 1;
      const suggestion   = overrides[s.docId] ?? s.cleanupSuggestion;
      bySuggestion[suggestion] = (bySuggestion[suggestion] ?? 0) + 1;
    }
    return { byHealth, bySuggestion, total: pipelineStates.length };
  }, [pipelineStates, overrides]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleKeep = async (doc: IntelligenceDocument) => {
    if (!uid) return;
    setActionLoading(doc.id);
    try {
      await updateIntelligenceDoc(doc.id, { archivePolicy: "keep_all" } as Partial<IntelligenceDocument>);
      setOverrides(p => ({ ...p, [doc.id]: "keep" }));
    } catch (e) {
      alert(`Keep failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUndoKeep = async (doc: IntelligenceDocument) => {
    if (!uid) return;
    setActionLoading(doc.id);
    try {
      await updateDoc(firestoreDoc(db, "vault_intelligence_docs", doc.id), {
        archivePolicy: null,
        updatedAt: new Date().toISOString(),
      });
      setOverrides(p => { const n = { ...p }; delete n[doc.id]; return n; });
    } catch (e) {
      alert(`Undo failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (doc: IntelligenceDocument) => {
    if (!uid) return;
    setActionLoading(doc.id);
    try {
      const intelSnap = await getDocs(query(
        collection(db, "janta_intelligence"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", uid),
      ));
      await Promise.all(intelSnap.docs.map(d => deleteDoc(d.ref)));

      const relSnap = await getDocs(query(
        collection(db, "janta_relationships"),
        where("sourceDocId", "==", doc.id),
        where("ownerId",     "==", uid),
      ));
      await Promise.all(relSnap.docs.map(d => deleteDoc(d.ref)));

      await updateIntelligenceDoc(doc.id, { archived: true } as Partial<IntelligenceDocument>);
      setOverrides(p => ({ ...p, [doc.id]: "archive" }));
    } catch (e) {
      alert(`Archive failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (doc: IntelligenceDocument) => {
    if (!uid) return;
    setConfirmDelete(null);
    setActionLoading(doc.id);
    try {
      const [intelSnap, relSnap, constSnap, atomicSnap, economySnap, classSnap] = await Promise.all([
        safe(getDocs(query(collection(db, "janta_intelligence"),         where("sourceDocId",      "==", doc.id), where("ownerId", "==", uid))), null),
        safe(getDocs(query(collection(db, "janta_relationships"),        where("sourceDocId",      "==", doc.id), where("ownerId", "==", uid))), null),
        safe(getDocs(query(collection(db, "constitutional_framework"),   where("sourceDocId",      "==", doc.id), where("ownerId", "==", uid))), null),
        safe(getDocs(query(collection(db, "atomic_extraction_logs"),     where("docId",            "==", doc.id), where("ownerId", "==", uid))), null),
        safe(getDocs(query(collection(db, "economy_atoms"),              where("sourceDocumentId", "==", doc.id), where("ownerId", "==", uid))), null),
        safe(getDocs(query(collection(db, "classification_suggestions"), where("sourceDocumentId", "==", doc.id), where("ownerId", "==", uid))), null),
      ]);
      const snaps = [intelSnap, relSnap, constSnap, atomicSnap, economySnap, classSnap];
      await Promise.all(snaps.flatMap(snap => snap ? snap.docs.map(d => deleteDoc(d.ref)) : []));
      await deleteIntelligenceDoc(doc.id);
      setOverrides(p => ({ ...p, [doc.id]: "delete" }));
    } catch (e) {
      alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (doc: IntelligenceDocument) => {
    if (!uid) return;
    const confirmed = window.confirm(
      `"${doc.title}" को pipeline reset गर्ने?\n\nAI analysis र approval status हट्नेछ — document file safe रहनेछ।`
    );
    if (!confirmed) return;
    setActionLoading(doc.id);
    try {
      await updateDoc(firestoreDoc(db, "vault_intelligence_docs", doc.id), {
        processingStatus:    "ready",
        adminApprovalStatus: null,
        aiSummary:           null,
        aiKeyInsights:       null,
        aiProcessingError:   null,
        extractionTier:      null,
        atomicCompleted:     null,
        updatedAt:           new Date().toISOString(),
      });
    } catch (e) {
      alert(`Reset failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActionLoading(null);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────

  const isLoading = authLoading || docsLoading || countsLoading;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-600 text-sm animate-pulse">Auth check गर्दैछ…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Access denied</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-zinc-950 border border-red-900/60 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🗑️</span>
              <div className="min-w-0">
                <p className="text-white font-black text-base">Document पूरै delete गर्ने?</p>
                <p className="text-zinc-500 text-xs mt-0.5 truncate">{confirmDelete.title}</p>
              </div>
            </div>
            <div className="bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-3 space-y-1">
              <p className="text-red-300 text-sm font-semibold">यो action गर्दा:</p>
              <ul className="text-red-400/80 text-xs space-y-0.5 list-disc list-inside">
                <li>Document record Firestore बाट हट्नेछ</li>
                <li>सबै janta_intelligence, atomic logs, economy atoms हट्नेछ</li>
                <li>R2 मा PDF file भने रहनेछ — manually delete गर्नुहोस्</li>
                <li>यो undo हुँदैन</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                हो, Delete गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/vault/system" className="text-zinc-600 hover:text-zinc-400 text-xs">← System</Link>
            </div>
            <h1 className="text-2xl font-black text-white">Data Cleanup</h1>
            <p className="text-zinc-500 text-sm mt-1">
              हरेक document को pipeline state हेर्नुहोस् — Keep, Archive, Delete, वा Reset गर्नुहोस्
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {duplicateGroups.size > 0 && (
              <span className="text-[10px] border border-amber-800/60 bg-amber-950/20 text-amber-400 rounded-full px-2.5 py-1">
                ⚠ {duplicateGroups.size} duplicate group{duplicateGroups.size > 1 ? "s" : ""}
              </span>
            )}
            <Link
              href="/vault/documents"
              className="text-xs text-zinc-600 hover:text-zinc-400 border border-zinc-800 rounded-lg px-3 py-1.5"
            >
              Documents →
            </Link>
          </div>
        </div>

        {/* Summary strip */}
        {!isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(["healthy", "needs_action", "stuck", "suspect"] as PipelineHealth[]).map(h => {
              const cfg   = HEALTH_CONFIG[h];
              const count = summary.byHealth[h] ?? 0;
              return (
                <button
                  key={h}
                  onClick={() => setFilter(filter === h ? "all" : h)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    filter === h ? cfg.cls : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <span className="text-white font-black text-lg">{count}</span>
                  </div>
                  <p className="text-zinc-500 text-[11px] mt-0.5">{cfg.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {/* Cleanup suggestion summary */}
        {!isLoading && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-zinc-600 text-xs">सुझाव:</span>
            {(["keep", "review", "archive", "delete"] as const).map(s => {
              const cfg   = CLEANUP_CONFIG[s];
              const count = summary.bySuggestion[s] ?? 0;
              if (count === 0) return null;
              return (
                <span key={s} className={`text-xs border rounded-full px-2.5 py-0.5 ${cfg.cls}`}>
                  {cfg.label} · {count}
                </span>
              );
            })}
            <span className="text-zinc-700 text-xs ml-auto">{summary.total} documents</span>
          </div>
        )}

        {/* Filter + search bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {(["all", "needs_action", "stuck", "suspect", "in_progress"] as FilterMode[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                  filter === f
                    ? "bg-zinc-700 border-zinc-600 text-white"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Document खोज्नुहोस्…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ml-auto bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-52"
          />
        </div>

        {/* Doc list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-2xl bg-zinc-900/50 animate-pulse" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 text-sm">
            {filter === "all" ? "कुनै document छैन" : `"${FILTER_LABELS[filter]}" state मा कुनै document छैन`}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(state => {
              const rawDoc     = docs.find(d => d.id === state.docId);
              const hCfg       = HEALTH_CONFIG[state.health];
              const suggestion = overrides[state.docId] ?? state.cleanupSuggestion;
              const sCfg       = CLEANUP_CONFIG[suggestion];
              const isActing   = actionLoading === state.docId;
              const wasDeleted = overrides[state.docId] === "delete";
              const isKept     = overrides[state.docId] === "keep";
              const c          = counts[state.docId] ?? EMPTY_COUNTS;
              const isDup      = docDupKey.has(state.docId);
              const showLineage= expandedLineage === state.docId;

              if (wasDeleted) return null;

              // Lineage computation (only when panel open — avoid cost when hidden)
              const linCounts: LineageCounts = {
                intelCount:          c.intelCount,
                atomicCount:         c.atomicCount,
                economyCount:        c.economyCount,
                promiseCount:        c.promiseCount,
                constitutionalCount: c.constitutionalCount,
                classificationCount: c.classificationCount,
                relCount:            c.relCount,
              };
              const lineage = showLineage ? computeLineage(
                state.title,
                linCounts,
                {
                  processingStatus:    rawDoc?.processingStatus,
                  adminApprovalStatus: rawDoc?.adminApprovalStatus,
                  hasSourceUrl:        !!(rawDoc?.sourceUrl || rawDoc?.originalSourceUrl),
                  hasDownloadUrl:      !!rawDoc?.downloadUrl,
                }
              ) : null;

              return (
                <div
                  key={state.docId}
                  className={`rounded-2xl border bg-zinc-900/60 transition-opacity ${
                    isActing ? "opacity-50" : ""
                  } ${state.health === "stuck" ? "border-red-900/40" : state.health === "suspect" ? "border-zinc-800/60" : "border-zinc-800"}`}
                >
                  {/* Top row: title + health + suggestion */}
                  <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                    {/* Health dot */}
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${hCfg.dot}`} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-white text-sm font-bold truncate flex-1">{state.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isDup && (
                            <span className="text-[10px] border border-amber-800/60 bg-amber-950/20 text-amber-400 rounded-full px-2 py-0.5">
                              duplicate
                            </span>
                          )}
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${hCfg.cls}`}>
                            {hCfg.label}
                          </span>
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${sCfg.cls}`}>
                            {sCfg.label}
                          </span>
                        </div>
                      </div>

                      {/* Status sentence */}
                      <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{state.statusNp}</p>

                      {/* Counts row */}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <CountPill label="Intel"   value={c.intelCount}          color={c.intelCount          > 0 ? "text-blue-400"    : "text-zinc-700"} />
                        <CountPill label="Atomic"  value={c.atomicCount}         color={c.atomicCount         > 0 ? "text-violet-400"  : "text-zinc-700"} />
                        <CountPill label="Economy" value={c.economyCount}        color={c.economyCount        > 0 ? "text-amber-400"   : "text-zinc-700"} />
                        <CountPill label="Const"   value={c.constitutionalCount} color={c.constitutionalCount > 0 ? "text-sky-400"     : "text-zinc-700"} />
                        <CountPill label="Promise" value={c.promiseCount}        color={c.promiseCount        > 0 ? "text-emerald-400" : "text-zinc-700"} />
                        {state.classificationCount > 0 && (
                          <CountPill
                            label="Class"
                            value={`${state.classificationApproved ? "✓" : ""}${state.classificationCount}`}
                            color={state.classificationApproved ? "text-emerald-400" : "text-zinc-500"}
                          />
                        )}
                        {rawDoc?.govFolder && (
                          <span className="text-[10px] text-zinc-600 border border-zinc-800 rounded px-1.5 py-0.5">
                            {rawDoc.govFolder}
                          </span>
                        )}
                      </div>

                      {/* Cleanup reason */}
                      <p className="text-zinc-600 text-[10px] mt-1.5">{state.cleanupReasonNp}</p>
                    </div>
                  </div>

                  {/* Lineage layer map (collapsible) */}
                  {showLineage && lineage && (
                    <div className="mx-4 mb-3 rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-300">Data Layer Map</span>
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${TIER_CFG[lineage.tier].cls}`}>
                            {lineage.tierLabel}
                          </span>
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${SAFETY_CFG[lineage.safetyLevel].cls}`}>
                            {lineage.safetyLabel}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-600">Score: {lineage.score}</span>
                      </div>

                      {/* Layer bars */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {[
                          { label: "Constitution",    val: c.constitutionalCount, color: "bg-sky-500"     },
                          { label: "Intel (Layer 2)", val: c.intelCount,          color: "bg-blue-500"    },
                          { label: "Relationships",   val: c.relCount,            color: "bg-cyan-500"    },
                          { label: "Atomic logs",     val: c.atomicCount,         color: "bg-violet-500"  },
                          { label: "Economy atoms",   val: c.economyCount,        color: "bg-amber-500"   },
                          { label: "Promise atoms",   val: c.promiseCount,        color: "bg-emerald-500" },
                          { label: "Classification",  val: c.classificationCount, color: "bg-pink-500"    },
                        ].map(({ label, val, color }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${val > 0 ? color : "bg-zinc-700"}`} />
                            <span className="text-[10px] text-zinc-500 flex-1 truncate">{label}</span>
                            <span className={`text-[10px] font-mono font-bold ${val > 0 ? "text-zinc-200" : "text-zinc-700"}`}>{val}</span>
                          </div>
                        ))}
                      </div>

                      {/* Nepali recommendation */}
                      <div className="px-4 pb-3">
                        <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-800/50 rounded-lg px-3 py-2">
                          💡 {lineage.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-zinc-800/50 pt-2.5">
                    {/* Next action hint */}
                    <Link
                      href={state.nextActionHref}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400 truncate flex-1 min-w-0"
                    >
                      → {state.nextActionNp}
                    </Link>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Lineage toggle */}
                      <button
                        onClick={() => setExpandedLineage(showLineage ? null : state.docId)}
                        className="text-[10px] border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-colors"
                      >
                        {showLineage ? "▲ Layer" : "▼ Layer"}
                      </button>

                      {/* Keep / Undo Keep */}
                      {isKept ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-emerald-500 font-semibold">✓ राखियो</span>
                          <button
                            onClick={() => rawDoc && handleUndoKeep(rawDoc)}
                            disabled={isActing || !rawDoc}
                            className="text-[10px] border border-zinc-700 text-zinc-500 hover:text-amber-400 hover:border-amber-800/60 rounded-lg px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                            title="Decision फेर्नुहोस्"
                          >
                            ↩ Undo
                          </button>
                        </div>
                      ) : (
                        <ActionButton
                          onClick={() => rawDoc && handleKeep(rawDoc)}
                          disabled={isActing || !rawDoc}
                          cls="border-emerald-800/60 text-emerald-500 hover:bg-emerald-900/30"
                          activeLabel="राख्नुहोस्"
                        />
                      )}

                      {/* Archive */}
                      <ActionButton
                        onClick={() => {
                          if (!rawDoc) return;
                          const ok = window.confirm(`"${state.title}" archive गर्ने?\n\nIntel records हट्नेछन् — document file safe रहनेछ।`);
                          if (ok) handleArchive(rawDoc);
                        }}
                        disabled={isActing || !rawDoc || overrides[state.docId] === "archive"}
                        cls="border-blue-800/60 text-blue-500 hover:bg-blue-900/30"
                        activeLabel="Archive"
                      />

                      {/* Reset */}
                      <ActionButton
                        onClick={() => rawDoc && handleReset(rawDoc)}
                        disabled={isActing || !rawDoc || (state.health !== "stuck" && state.health !== "needs_action")}
                        cls="border-amber-800/60 text-amber-500 hover:bg-amber-900/30"
                        activeLabel="Reset"
                      />

                      {/* Delete */}
                      <ActionButton
                        onClick={() => rawDoc && setConfirmDelete(rawDoc)}
                        disabled={isActing || !rawDoc}
                        cls="border-red-900/60 text-red-500 hover:bg-red-950/40"
                        activeLabel="Delete"
                        danger
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer guide */}
        {!isLoading && visible.length > 0 && (
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-5 py-4 space-y-1.5 text-[11px] text-zinc-600">
            <p className="text-zinc-500 font-semibold text-xs mb-2">Actions को बारेमा:</p>
            <p><span className="text-emerald-500 font-bold">राख्नुहोस्</span> — document लाई permanent रूपमा mark गर्छ, केही delete हुँदैन। Undo गर्न "↩ Undo" थिच्नुहोस्।</p>
            <p><span className="text-blue-500 font-bold">Archive</span> — Intel records हट्छन्, document file R2 मा safe रहन्छ</p>
            <p><span className="text-amber-500 font-bold">Reset</span> — AI analysis हट्छ, document फेरि pipeline मा जान तयार हुन्छ</p>
            <p><span className="text-red-500 font-bold">Delete</span> — Firestore बाट सबै records हट्छन् (R2 file manually delete गर्नुहोस्)</p>
            <p><span className="text-zinc-400 font-bold">▼ Layer</span> — Document का सबै data layers र system recommendation हेर्नुहोस्</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Small sub-components ───────────────────────────────────────────────────────

function CountPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <span className="text-zinc-700">{label}</span>
      <span className={`font-bold font-mono ${color}`}>{value}</span>
    </span>
  );
}

function ActionButton({
  onClick, disabled, cls, activeLabel, danger = false,
}: {
  onClick: () => void;
  disabled: boolean;
  cls: string;
  activeLabel: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[10px] border rounded-lg px-2.5 py-1 transition-colors font-medium ${
        disabled
          ? "border-zinc-800 text-zinc-700 cursor-not-allowed"
          : `${cls} cursor-pointer`
      }`}
    >
      {activeLabel}
    </button>
  );
}
