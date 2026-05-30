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
  TEST_PATTERNS,
  TIER_CFG,
  SAFETY_CFG,
  type LineageCounts,
  type LineageResult,
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

interface ConsolidationGroup {
  key:              string;
  icon:             string;
  titleNp:          string;
  whyNp:            string;
  recommendNp:      string;
  severity:         "critical" | "warning" | "info";
  docIds:           string[];
  filterMode?:      FilterMode;
}

// ── Health display ─────────────────────────────────────────────────────────────

const HEALTH_CONFIG: Record<PipelineHealth, { label: string; cls: string; dot: string }> = {
  healthy:     { label: "Pipeline पूरा",  cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800", dot: "bg-emerald-400" },
  in_progress: { label: "प्रक्रियामा",    cls: "bg-blue-900/40 text-blue-400 border-blue-800",          dot: "bg-blue-400"   },
  needs_action:{ label: "Action चाहिन्छ", cls: "bg-amber-900/40 text-amber-400 border-amber-800",       dot: "bg-amber-400"  },
  stuck:       { label: "अड्किएको",       cls: "bg-red-900/40 text-red-400 border-red-800",             dot: "bg-red-400"    },
  suspect:     { label: "संदिग्ध",        cls: "bg-zinc-800 text-zinc-400 border-zinc-700",             dot: "bg-zinc-500"   },
};

const CLEANUP_CONFIG: Record<FullPipelineState["cleanupSuggestion"], { label: string; cls: string }> = {
  keep:    { label: "राख्नुहोस्", cls: "bg-emerald-900/30 text-emerald-400 border-emerald-800/60" },
  review:  { label: "हेर्नुहोस्", cls: "bg-amber-900/30 text-amber-400 border-amber-800/60"       },
  archive: { label: "Archive",    cls: "bg-blue-900/30 text-blue-400 border-blue-800/60"           },
  delete:  { label: "Delete",     cls: "bg-red-900/30 text-red-400 border-red-800/60"              },
};

const FILTER_LABELS: Record<FilterMode, string> = {
  all: "सबै", healthy: "Pipeline पूरा", needs_action: "Action चाहिन्छ",
  stuck: "अड्किएको", suspect: "संदिग्ध", in_progress: "प्रक्रियामा",
};

// ── Safe Firestore helper ──────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[system-cleanup] read failed:", e?.code ?? e); return fb; });

// ── Constitution Conflict Banner ───────────────────────────────────────────────

function ConstitutionConflictBanner({
  myCount,
  peerCounts,
}: {
  myCount:    number;
  peerCounts: number[];
}) {
  const maxCount   = Math.max(myCount, ...peerCounts);
  const isCanonical = myCount === maxCount;

  return (
    <div className="mt-2 rounded-xl border border-red-900/40 bg-red-950/10 px-4 py-3 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-red-400 text-[11px] font-bold">⚡ Constitution Source Conflict</span>
        <span className="text-zinc-600 text-[10px]">
          दुबैमा Constitution records छन् — पहिले Canonical Review चाहिन्छ
        </span>
      </div>

      {/* Canonical verdict */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] border rounded-full px-2.5 py-1 font-semibold ${
          isCanonical
            ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-400"
            : "border-zinc-700 bg-zinc-900/50 text-zinc-500"
        }`}>
          {isCanonical ? "✓ Canonical Candidate" : "Duplicate Candidate"} — Const {myCount}
        </span>
        {peerCounts.map((pc, i) => (
          <span key={i} className={`text-[11px] border rounded-full px-2.5 py-1 ${
            !isCanonical && pc === maxCount
              ? "border-emerald-800/60 bg-emerald-950/20 text-emerald-400"
              : "border-zinc-700 bg-zinc-900/50 text-zinc-500"
          }`}>
            Peer — Const {pc}
          </span>
        ))}
      </div>

      {/* Why counts differ */}
      <div className="rounded-lg bg-zinc-900/60 border border-zinc-800/50 px-3 py-2 space-y-1">
        <p className="text-zinc-500 text-[10px] font-medium">किन count फरक छ?</p>
        <p className="text-zinc-600 text-[10px] leading-relaxed">
          एउटै PDF बाट अलग-अलग batch size वा AI run मा Constitution extraction भयो।
          {isCanonical
            ? ` यो document (${myCount} records) बढी complete छ — Canonical रूपमा राख्नुहोस्।`
            : ` यो document (${myCount} records) कम complete छ — Archive candidate।`}
        </p>
      </div>

      {/* Archive safety note */}
      <div className="rounded-lg bg-sky-950/20 border border-sky-900/30 px-3 py-2">
        <p className="text-sky-400 text-[10px] font-semibold">✅ Archive safe छ — Constitution records हट्दैन</p>
        <p className="text-sky-700 text-[10px] mt-0.5 leading-relaxed">
          Archive action ले केवल Intelligence र Relationship records हटाउँछ।
          Constitution framework records सधैं safe रहन्छन् र Constitution Tree मा देखिन्छन्।
        </p>
      </div>

      {/* Safe workflow */}
      <div className="space-y-1.5 pt-0.5">
        <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wide">Safe Consolidation Workflow</p>
        {[
          { done: true,  text: "दुबै राख्नुहोस् — अहिले नछुनुहोस्" },
          { done: false, text: "▼ Layer map खोलेर child records compare गर्नुहोस्" },
          { done: false, text: `बढी records भएको (Const ${maxCount}) लाई Canonical छान्नुहोस्` },
          { done: false, text: isCanonical
              ? "यो Canonical — राख्नुहोस्, Delete/Archive नगर्नुहोस्"
              : "यो Duplicate Candidate — Archive गर्न सकिन्छ (Constitution safe रहन्छ)" },
          { done: false, text: "Constitution Tree मा दुबैको content compare गर्नुहोस् (/vault/constitution)" },
        ].map(({ done, text }, i) => (
          <div key={i} className="flex items-start gap-2 text-[10px]">
            <span className={`shrink-0 font-mono font-bold ${done ? "text-emerald-600" : "text-zinc-700"}`}>
              {i + 1}.
            </span>
            <span className={done ? "text-zinc-400" : "text-zinc-500 leading-relaxed"}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Consolidation Copilot ──────────────────────────────────────────────────────

const SEVERITY_CFG = {
  critical: { dot: "bg-red-500",    cls: "border-red-900/40 bg-red-950/10",    icon: "●" },
  warning:  { dot: "bg-amber-500",  cls: "border-amber-900/40 bg-amber-950/10",icon: "⚠" },
  info:     { dot: "bg-sky-500",    cls: "border-sky-900/40 bg-sky-950/10",    icon: "ℹ" },
};

function ConsolidationCopilot({
  groups,
  onFocusGroup,
}: {
  groups: ConsolidationGroup[];
  onFocusGroup: (docIds: string[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = groups.reduce((acc, g) => acc + g.docIds.length, 0);
  const critical = groups.filter(g => g.severity === "critical").length;

  if (groups.length === 0) return null;

  return (
    <div className={`rounded-2xl border ${critical > 0 ? "border-red-900/30" : "border-amber-900/30"} overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-base">🔍</span>
          <span className="text-sm font-bold text-white">Consolidation Copilot</span>
          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${
            critical > 0
              ? "border-red-800/60 bg-red-950/20 text-red-400"
              : "border-amber-800/60 bg-amber-950/20 text-amber-400"
          }`}>
            {groups.length} issue{groups.length > 1 ? "s" : ""} · {total} docs
          </span>
        </div>
        <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {/* Groups */}
      {open && (
        <div className="divide-y divide-zinc-800/50">
          {groups.map(g => {
            const scfg = SEVERITY_CFG[g.severity];
            return (
              <div key={g.key} className={`px-5 py-4 ${scfg.cls}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scfg.dot}`} />
                      <span className="text-sm font-semibold text-zinc-200">{g.icon} {g.titleNp}</span>
                      <span className="text-[10px] text-zinc-600 border border-zinc-700 rounded-full px-2 py-0.5">
                        {g.docIds.length} doc{g.docIds.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed ml-3.5">{g.whyNp}</p>
                    <p className="text-zinc-400 text-xs mt-1 ml-3.5 font-medium">→ {g.recommendNp}</p>
                  </div>
                  <button
                    onClick={() => onFocusGroup(g.docIds)}
                    className="text-[10px] border border-zinc-700 rounded-lg px-2.5 py-1 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 transition-colors shrink-0"
                  >
                    हेर्नुहोस् →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Impact Preview Modal ───────────────────────────────────────────────────────

function ImpactPreviewModal({
  doc,
  action,
  counts,
  constConflict,
  onConfirm,
  onClose,
}: {
  doc: IntelligenceDocument;
  action: "archive" | "delete";
  counts: DocCounts;
  constConflict?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isArchive = action === "archive";

  const willDelete = [
    counts.intelCount    > 0 && { label: "Intelligence records",    val: counts.intelCount,    color: "text-blue-400"    },
    counts.relCount      > 0 && { label: "Relationships",            val: counts.relCount,      color: "text-cyan-400"    },
    !isArchive && counts.atomicCount  > 0 && { label: "Atomic logs",  val: counts.atomicCount,  color: "text-violet-400"  },
    !isArchive && counts.economyCount > 0 && { label: "Economy atoms",val: counts.economyCount, color: "text-amber-400"   },
    !isArchive && counts.promiseCount > 0 && { label: "Promise atoms",val: counts.promiseCount, color: "text-emerald-400" },
    !isArchive && counts.constitutionalCount > 0 && { label: "Constitution records", val: counts.constitutionalCount, color: "text-sky-400" },
    !isArchive && counts.classificationCount > 0 && { label: "Classification records", val: counts.classificationCount, color: "text-pink-400" },
  ].filter(Boolean) as Array<{ label: string; val: number; color: string }>;

  const willSurvive = isArchive
    ? ["R2 मा PDF file (safe)", "Economy atoms (intact)", "Constitution records (intact)", "Classification data (intact)"]
    : ["R2 मा PDF file — manually delete गर्नुहोस्"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">{isArchive ? "📦" : "🗑️"}</span>
          <div className="min-w-0">
            <p className="text-white font-black text-base">
              {isArchive ? "Archive गर्दा के हुन्छ?" : "Delete गर्दा के हुन्छ?"}
            </p>
            <p className="text-zinc-500 text-xs mt-0.5 truncate">{doc.title}</p>
          </div>
        </div>

        {willDelete.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wide">
              {isArchive ? "Intel records हट्नेछ:" : "पूरै हट्नेछ:"}
            </p>
            {willDelete.map(({ label, val, color }) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">{label}</span>
                <span className={`font-bold font-mono ${color}`}>{val}</span>
              </div>
            ))}
          </div>
        )}

        {willDelete.length === 0 && (
          <p className="text-zinc-500 text-xs">
            {isArchive ? "कुनै child records छैनन् — archive गर्न सुरक्षित।" : "कुनै linked data छैन — delete गर्न सुरक्षित।"}
          </p>
        )}

        <div className="space-y-1">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wide">बाँकी रहनेछ:</p>
          {willSurvive.map(s => (
            <p key={s} className="text-xs text-emerald-600">✓ {s}</p>
          ))}
        </div>

        {/* Constitution conflict + archive safety note */}
        {constConflict && isArchive && (
          <div className="bg-sky-950/30 border border-sky-800/50 rounded-xl px-4 py-2.5 space-y-1">
            <p className="text-sky-400 text-xs font-semibold">✅ Constitution records safe रहन्छन्</p>
            <p className="text-sky-700 text-[10px] leading-relaxed">
              Archive ले केवल Intelligence र Relationship records हटाउँछ।
              Constitutional framework records हट्दैन — Constitution Tree मा देखिन्छ।
            </p>
          </div>
        )}

        {!isArchive && (
          <div className="bg-red-950/40 border border-red-800/60 rounded-xl px-4 py-2.5">
            <p className="text-red-400 text-xs">⚠ यो action undo हुँदैन</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-sm hover:bg-zinc-800 transition-colors"
          >
            रद्द
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 rounded-xl text-white text-sm font-bold transition-colors ${
              isArchive ? "bg-blue-700 hover:bg-blue-600" : "bg-red-700 hover:bg-red-600"
            }`}
          >
            {isArchive ? "Archive गर्नुहोस्" : "Delete गर्नुहोस्"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [focusDocIds,     setFocusDocIds]    = useState<string[] | null>(null);
  const [expandedLineage, setExpandedLineage]= useState<string | null>(null);
  const [impactDoc,       setImpactDoc]      = useState<IntelligenceDocument | null>(null);
  const [impactAction,    setImpactAction]   = useState<"archive" | "delete" | null>(null);

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
      const ensure = (id: string) => { if (!map[id]) map[id] = { ...EMPTY_COUNTS }; };

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

  // ── Pipeline states ────────────────────────────────────────────────────────

  const pipelineStates = useMemo(() => {
    if (docsLoading || countsLoading) return [];
    return docs.map(doc => {
      const c = counts[doc.id] ?? EMPTY_COUNTS;
      return computeFullPipelineState({
        id: doc.id, title: doc.title, fileName: doc.fileName,
        processingStatus: doc.processingStatus, adminApprovalStatus: doc.adminApprovalStatus,
        aiSummary: doc.aiSummary, downloadUrl: doc.downloadUrl,
        sourceUrl: doc.sourceUrl, originalSourceUrl: doc.originalSourceUrl,
        extractionTier: doc.extractionTier as string | undefined,
        atomicCompleted: doc.atomicCompleted, govFolder: doc.govFolder,
        uploadedAt: doc.uploadedAt, tags: doc.tags,
        intelCount: c.intelCount, atomicCount: c.atomicCount,
        economyCount: c.economyCount, classificationCount: c.classificationCount,
        classificationApprovedCount: c.classificationApprovedCount,
      });
    });
  }, [docs, counts, docsLoading, countsLoading]);

  // ── Lineage for all docs (pure computation — no I/O) ─────────────────────

  const lineageMap = useMemo((): Record<string, LineageResult> => {
    if (docsLoading || countsLoading) return {};
    const result: Record<string, LineageResult> = {};
    docs.forEach(doc => {
      const c = counts[doc.id] ?? EMPTY_COUNTS;
      const linCounts: LineageCounts = {
        intelCount: c.intelCount, atomicCount: c.atomicCount,
        economyCount: c.economyCount, promiseCount: c.promiseCount,
        constitutionalCount: c.constitutionalCount,
        classificationCount: c.classificationCount, relCount: c.relCount,
      };
      result[doc.id] = computeLineage(doc.title, linCounts, {
        processingStatus:    doc.processingStatus,
        adminApprovalStatus: doc.adminApprovalStatus,
        hasSourceUrl:        !!(doc.sourceUrl || doc.originalSourceUrl),
        hasDownloadUrl:      !!doc.downloadUrl,
      });
    });
    return result;
  }, [docs, counts, docsLoading, countsLoading]);

  // ── Duplicate groups ───────────────────────────────────────────────────────

  const duplicateGroups = useMemo(() => {
    if (docsLoading) return new Map<string, string[]>();
    return detectDuplicateGroups(
      docs.map(d => ({ id: d.id, title: d.title, govFolder: d.govFolder, sourceUrl: d.sourceUrl }))
    );
  }, [docs, docsLoading]);

  const docDupKey = useMemo(() => {
    const m = new Map<string, string>();
    duplicateGroups.forEach((ids, key) => ids.forEach(id => m.set(id, key)));
    return m;
  }, [duplicateGroups]);

  // ── Constitution source conflict detection ─────────────────────────────────
  // A conflict = 2+ docs in the same dup group BOTH have constitutionalCount > 0.
  // These need a different workflow (canonical review) before archive/delete.

  const constConflictMap = useMemo(() => {
    const m = new Map<string, { peerIds: string[]; myCount: number; peerCounts: number[] }>();
    if (countsLoading) return m;
    duplicateGroups.forEach(docIds => {
      const withConst = docIds.filter(id => (counts[id] ?? EMPTY_COUNTS).constitutionalCount > 0);
      if (withConst.length < 2) return;
      withConst.forEach(id => {
        const peers = withConst.filter(pid => pid !== id);
        m.set(id, {
          peerIds:    peers,
          myCount:    (counts[id] ?? EMPTY_COUNTS).constitutionalCount,
          peerCounts: peers.map(pid => (counts[pid] ?? EMPTY_COUNTS).constitutionalCount),
        });
      });
    });
    return m;
  }, [duplicateGroups, counts, countsLoading]);

  const constConflictDocIds = useMemo(() => new Set(constConflictMap.keys()), [constConflictMap]);

  // ── Consolidation groups (auto-computed) ───────────────────────────────────

  const consolidationGroups = useMemo((): ConsolidationGroup[] => {
    if (pipelineStates.length === 0) return [];
    const groups: ConsolidationGroup[] = [];

    // 0. Constitution Source Conflicts — highest priority (before regular duplicates)
    const constConflictIds = Array.from(constConflictDocIds);
    if (constConflictIds.length > 0) {
      groups.push({
        key: "const_conflict", icon: "⚡", severity: "critical",
        titleNp: `${constConflictIds.length} Documents — Constitution Source Conflict`,
        whyNp: "यी duplicate documents दुबैमा constitutional framework records छन्। साधारण delete वा archive unsafe छ — पहिले कुन document canonical source हो छान्नु पर्छ।",
        recommendNp: "बढी records भएको document Canonical राख्नुहोस्। कम records भएको Archive गर्नुहोस् — Delete नगर्नुहोस्।",
        docIds: constConflictIds,
      });
    }

    // 1. Regular duplicates (excluding const-conflict docs which have their own group)
    const dupDocIds = Array.from(docDupKey.keys()).filter(id => !constConflictDocIds.has(id));
    if (dupDocIds.length > 0) {
      groups.push({
        key: "duplicates", icon: "🔁", severity: "critical",
        titleNp: `${duplicateGroups.size} Duplicate Group${duplicateGroups.size > 1 ? "s" : ""} — ${dupDocIds.length} Documents`,
        whyNp: "Title fingerprint analysis ले यी documents duplicate जस्तो देखाउँछ। Duplicate data intelligence graph लाई कमजोर पार्छ र storage waste हुन्छ।",
        recommendNp: "Review गरेर extra copies archive वा delete गर्नुहोस्। Master copy मात्र राख्नुहोस्।",
        docIds: dupDocIds,
      });
    }

    // 2. Test/demo files with no children
    const testIds = pipelineStates
      .filter(s => TEST_PATTERNS.test(s.title.trim()) && (counts[s.docId] ?? EMPTY_COUNTS).intelCount === 0)
      .map(s => s.docId);
    if (testIds.length > 0) {
      groups.push({
        key: "test_demo", icon: "🧪", severity: "warning",
        titleNp: `${testIds.length} Test/Demo Files`,
        whyNp: "Test वा demo नामका files जसबाट कुनै intelligence data बनेको छैन। यी real content होइनन् — space waste गर्दैछन्।",
        recommendNp: "Delete गर्न सुरक्षित। Real documents मात्र राख्नुहोस्।",
        docIds: testIds,
      });
    }

    // 3. Has AI summary, zero atoms (needs_action)
    const summaryNoAtomsIds = pipelineStates
      .filter(s => {
        const rawDoc = docs.find(d => d.id === s.docId);
        const c = counts[s.docId] ?? EMPTY_COUNTS;
        return rawDoc?.aiSummary && c.intelCount === 0 && c.atomicCount === 0 && s.health === "needs_action";
      })
      .map(s => s.docId);
    if (summaryNoAtomsIds.length > 0) {
      groups.push({
        key: "summary_no_atoms", icon: "⚛", severity: "warning",
        titleNp: `${summaryNoAtomsIds.length} Documents — AI Summary छ, Atoms छैन`,
        whyNp: "AI ले document analyse गरेको छ तर deep extraction भएको छैन। Intelligence pipeline अधुरो छ — public products यीबाट data पाउँदैनन्।",
        recommendNp: "Admin approval गरेर Deep Extract चलाउनुहोस्।",
        docIds: summaryNoAtomsIds, filterMode: "needs_action",
      });
    }

    // 4. Stuck pipeline
    const stuckIds = pipelineStates.filter(s => s.health === "stuck").map(s => s.docId);
    if (stuckIds.length > 0) {
      groups.push({
        key: "stuck", icon: "🔴", severity: "critical",
        titleNp: `${stuckIds.length} Pipeline अड्किएको`,
        whyNp: "AI processing वा extraction job अड्किएको छ — progress भइरहेको छैन। यी documents अहिले unusable छन्।",
        recommendNp: "Reset गरेर फेरि pipeline मा पठाउनुहोस्।",
        docIds: stuckIds, filterMode: "stuck",
      });
    }

    // 5. Missing source URL
    const missingSourceIds = pipelineStates
      .filter(s => {
        const rawDoc = docs.find(d => d.id === s.docId);
        return !rawDoc?.sourceUrl && !rawDoc?.originalSourceUrl;
      })
      .map(s => s.docId);
    if (missingSourceIds.length > 0) {
      groups.push({
        key: "missing_source", icon: "🔗", severity: "info",
        titleNp: `${missingSourceIds.length} Documents — Source URL छैन`,
        whyNp: "Source URL नभएका documents public मा safe छैनन् — evidence trail हुँदैन। Janta page मा publish गर्न source लिंक जरुरी छ।",
        recommendNp: "Document detail मा गएर original source URL थप्नुहोस्।",
        docIds: missingSourceIds,
      });
    }

    // 6. Has intel/atoms but no classification
    const noClassIds = pipelineStates
      .filter(s => {
        const c = counts[s.docId] ?? EMPTY_COUNTS;
        return (c.intelCount > 0 || c.atomicCount > 0) && c.classificationCount === 0;
      })
      .map(s => s.docId);
    if (noClassIds.length > 0) {
      groups.push({
        key: "no_classification", icon: "🏷", severity: "info",
        titleNp: `${noClassIds.length} Documents — Atoms छन्, Classification छैन`,
        whyNp: "Intelligence atoms बनेका छन् तर कुनै public route assign भएको छैन। यी atoms अहिले कुनै public product मा देखिँदैनन्।",
        recommendNp: "/vault/knowledge मा गएर classification review गर्नुहोस्।",
        docIds: noClassIds,
      });
    }

    return groups;
  }, [pipelineStates, counts, docs, duplicateGroups, docDupKey]);

  // ── Filter + search ────────────────────────────────────────────────────────

  const visible = useMemo(() => {
    let rows = pipelineStates;
    if (focusDocIds) rows = rows.filter(s => focusDocIds.includes(s.docId));
    else {
      if (filter !== "all") rows = rows.filter(s => s.health === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(s => s.title.toLowerCase().includes(q));
    }
    return rows;
  }, [pipelineStates, filter, search, focusDocIds]);

  // ── Summary counts ─────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const byHealth: Partial<Record<PipelineHealth, number>> = {};
    const bySuggestion: Partial<Record<FullPipelineState["cleanupSuggestion"], number>> = {};
    for (const s of pipelineStates) {
      byHealth[s.health] = (byHealth[s.health] ?? 0) + 1;
      const sug = overrides[s.docId] ?? s.cleanupSuggestion;
      bySuggestion[sug] = (bySuggestion[sug] ?? 0) + 1;
    }
    return { byHealth, bySuggestion, total: pipelineStates.length };
  }, [pipelineStates, overrides]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleKeep = async (doc: IntelligenceDocument) => {
    setActionLoading(doc.id);
    try {
      await updateIntelligenceDoc(doc.id, { archivePolicy: "keep_all" } as Partial<IntelligenceDocument>);
      setOverrides(p => ({ ...p, [doc.id]: "keep" }));
    } catch (e) { alert(`Keep failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setActionLoading(null); }
  };

  const handleUndoKeep = async (doc: IntelligenceDocument) => {
    setActionLoading(doc.id);
    try {
      await updateDoc(firestoreDoc(db, "vault_intelligence_docs", doc.id), {
        archivePolicy: null, updatedAt: new Date().toISOString(),
      });
      setOverrides(p => { const n = { ...p }; delete n[doc.id]; return n; });
    } catch (e) { alert(`Undo failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setActionLoading(null); }
  };

  const handleArchive = async (doc: IntelligenceDocument) => {
    setImpactDoc(null); setImpactAction(null);
    setActionLoading(doc.id);
    try {
      const intelSnap = await getDocs(query(collection(db, "janta_intelligence"),
        where("sourceDocId", "==", doc.id), where("ownerId", "==", uid)));
      await Promise.all(intelSnap.docs.map(d => deleteDoc(d.ref)));
      const relSnap = await getDocs(query(collection(db, "janta_relationships"),
        where("sourceDocId", "==", doc.id), where("ownerId", "==", uid)));
      await Promise.all(relSnap.docs.map(d => deleteDoc(d.ref)));
      await updateIntelligenceDoc(doc.id, { archived: true } as Partial<IntelligenceDocument>);
      setOverrides(p => ({ ...p, [doc.id]: "archive" }));
    } catch (e) { alert(`Archive failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (doc: IntelligenceDocument) => {
    setImpactDoc(null); setImpactAction(null);
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
      await Promise.all([intelSnap, relSnap, constSnap, atomicSnap, economySnap, classSnap].flatMap(
        snap => snap ? snap.docs.map(d => deleteDoc(d.ref)) : []
      ));
      await deleteIntelligenceDoc(doc.id);
      setOverrides(p => ({ ...p, [doc.id]: "delete" }));
    } catch (e) { alert(`Delete failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setActionLoading(null); }
  };

  const handleReset = async (doc: IntelligenceDocument) => {
    if (!window.confirm(`"${doc.title}" को pipeline reset गर्ने?\nAI analysis र approval status हट्नेछ — document file safe।`)) return;
    setActionLoading(doc.id);
    try {
      await updateDoc(firestoreDoc(db, "vault_intelligence_docs", doc.id), {
        processingStatus: "ready", adminApprovalStatus: null, aiSummary: null,
        aiKeyInsights: null, aiProcessingError: null, extractionTier: null,
        atomicCompleted: null, updatedAt: new Date().toISOString(),
      });
    } catch (e) { alert(`Reset failed: ${e instanceof Error ? e.message : String(e)}`); }
    finally { setActionLoading(null); }
  };

  // ── Loading / auth ─────────────────────────────────────────────────────────

  const isLoading = authLoading || docsLoading || countsLoading;

  if (authLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-600 text-sm animate-pulse">Auth check गर्दैछ…</p>
    </div>
  );
  if (!uid) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Access denied</p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* Impact Preview Modal */}
      {impactDoc && impactAction && (
        <ImpactPreviewModal
          doc={impactDoc}
          action={impactAction}
          counts={counts[impactDoc.id] ?? EMPTY_COUNTS}
          constConflict={constConflictMap.has(impactDoc.id)}
          onConfirm={() => {
            if (impactAction === "archive") handleArchive(impactDoc);
            else handleDelete(impactDoc);
          }}
          onClose={() => { setImpactDoc(null); setImpactAction(null); }}
        />
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
            <Link href="/vault/documents"
              className="text-xs text-zinc-600 hover:text-zinc-400 border border-zinc-800 rounded-lg px-3 py-1.5">
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
                <button key={h} onClick={() => { setFilter(filter === h ? "all" : h); setFocusDocIds(null); }}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                    filter === h ? cfg.cls : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                  }`}>
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

        {/* Consolidation Copilot */}
        {!isLoading && consolidationGroups.length > 0 && (
          <ConsolidationCopilot
            groups={consolidationGroups}
            onFocusGroup={ids => { setFocusDocIds(ids); setFilter("all"); setSearch(""); }}
          />
        )}

        {/* Focus strip */}
        {focusDocIds && (
          <div className="flex items-center gap-3 rounded-xl border border-sky-900/40 bg-sky-950/10 px-4 py-2.5">
            <span className="text-sky-400 text-xs">
              🔍 Copilot focus: {focusDocIds.length} documents
            </span>
            <button onClick={() => setFocusDocIds(null)}
              className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 border border-zinc-700 rounded-lg px-2.5 py-1 transition-colors">
              ✕ सबै हेर्नुहोस्
            </button>
          </div>
        )}

        {/* Suggestion summary */}
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
        {!focusDocIds && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "needs_action", "stuck", "suspect", "in_progress"] as FilterMode[]).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                    filter === f
                      ? "bg-zinc-700 border-zinc-600 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-400"
                  }`}>
                  {FILTER_LABELS[f]}
                </button>
              ))}
            </div>
            <input type="text" placeholder="Document खोज्नुहोस्…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="ml-auto bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-52"
            />
          </div>
        )}

        {/* Doc list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-zinc-900/50 animate-pulse" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-16 text-zinc-600 text-sm">
            {focusDocIds ? "यस group मा कुनै document छैन" : filter === "all" ? "कुनै document छैन" : `"${FILTER_LABELS[filter]}" state मा कुनै document छैन`}
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map(state => {
              const rawDoc     = docs.find(d => d.id === state.docId);
              const hCfg       = HEALTH_CONFIG[state.health];
              const suggestion = overrides[state.docId] ?? state.cleanupSuggestion;
              const sCfg       = CLEANUP_CONFIG[suggestion];
              const isActing   = actionLoading === state.docId;
              const wasDeleted     = overrides[state.docId] === "delete";
              const isKept         = overrides[state.docId] === "keep";
              const c              = counts[state.docId] ?? EMPTY_COUNTS;
              const isDup          = docDupKey.has(state.docId);
              const isConstConflict= constConflictMap.has(state.docId);
              const conflictInfo   = constConflictMap.get(state.docId);
              const showLineage    = expandedLineage === state.docId;
              const lineage        = lineageMap[state.docId];

              if (wasDeleted) return null;

              const tierCfg   = lineage ? TIER_CFG[lineage.tier]     : null;
              const safetyCfg = lineage ? SAFETY_CFG[lineage.safetyLevel] : null;

              return (
                <div key={state.docId}
                  className={`rounded-2xl border bg-zinc-900/60 transition-opacity ${
                    isActing ? "opacity-50" : ""
                  } ${state.health === "stuck" ? "border-red-900/40" : state.health === "suspect" ? "border-zinc-800/60" : "border-zinc-800"}`}
                >
                  {/* Top row */}
                  <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${hCfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <span className="text-white text-sm font-bold truncate flex-1">{state.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                          {isConstConflict ? (
                            <span className="text-[10px] border border-red-800/60 bg-red-950/20 text-red-400 rounded-full px-2 py-0.5">
                              ⚡ Const Conflict
                            </span>
                          ) : isDup && (
                            <span className="text-[10px] border border-amber-800/60 bg-amber-950/20 text-amber-400 rounded-full px-2 py-0.5">
                              duplicate
                            </span>
                          )}
                          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${hCfg.cls}`}>{hCfg.label}</span>
                          {tierCfg && (
                            <span className={`text-[10px] border rounded-full px-2 py-0.5 ${tierCfg.cls}`}>
                              {lineage!.tierLabel}
                            </span>
                          )}
                          {safetyCfg && (
                            <span className={`text-[10px] border rounded-full px-2 py-0.5 ${safetyCfg.cls}`}>
                              {lineage!.safetyLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Source institution */}
                      {rawDoc?.govFolder && (
                        <p className="text-zinc-600 text-[10px] mt-0.5">📂 {rawDoc.govFolder}</p>
                      )}

                      {/* Status + recommendation */}
                      <p className="text-zinc-400 text-xs mt-1.5 leading-relaxed">{state.statusNp}</p>
                      {lineage && (
                        <p className="text-zinc-500 text-[11px] mt-1 leading-relaxed">
                          💡 {lineage.recommendation}
                        </p>
                      )}

                      {/* Constitution conflict banner */}
                      {isConstConflict && conflictInfo && (
                        <ConstitutionConflictBanner
                          myCount={conflictInfo.myCount}
                          peerCounts={conflictInfo.peerCounts}
                        />
                      )}

                      {/* Counts row */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <CountPill label="Intel"   val={c.intelCount}          color={c.intelCount          > 0 ? "text-blue-400"    : "text-zinc-700"} />
                        <CountPill label="Atomic"  val={c.atomicCount}         color={c.atomicCount         > 0 ? "text-violet-400"  : "text-zinc-700"} />
                        <CountPill label="Economy" val={c.economyCount}        color={c.economyCount        > 0 ? "text-amber-400"   : "text-zinc-700"} />
                        <CountPill label="Const"   val={c.constitutionalCount} color={c.constitutionalCount > 0 ? "text-sky-400"     : "text-zinc-700"} />
                        <CountPill label="Promise" val={c.promiseCount}        color={c.promiseCount        > 0 ? "text-emerald-400" : "text-zinc-700"} />
                        {c.classificationCount > 0 && (
                          <CountPill
                            label="Class"
                            val={`${state.classificationApproved ? "✓" : ""}${c.classificationCount}`}
                            color={state.classificationApproved ? "text-emerald-400" : "text-zinc-500"}
                          />
                        )}
                      </div>

                      {/* Cleanup reason */}
                      <p className="text-zinc-700 text-[10px] mt-1">{state.cleanupReasonNp}</p>
                    </div>
                  </div>

                  {/* Expanded Layer Map */}
                  {showLineage && lineage && (
                    <div className="mx-4 mb-3 rounded-xl border border-zinc-700/60 bg-zinc-900/80 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-zinc-800/60 flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-300">Data Layer Map</span>
                        <span className="text-[10px] text-zinc-600">Score: {lineage.score}</span>
                      </div>

                      {/* Layer bars */}
                      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                        {[
                          { label: "Layer 1 — Constitution", val: c.constitutionalCount, color: "bg-sky-500",     note: "Static foundation" },
                          { label: "Layer 2 — Intelligence",  val: c.intelCount,          color: "bg-blue-500",    note: "Dynamic records"   },
                          { label: "Layer 2 — Relationships", val: c.relCount,            color: "bg-cyan-500",    note: "Graph edges"       },
                          { label: "Layer 3 — Atomic logs",   val: c.atomicCount,         color: "bg-violet-500",  note: "Extraction audit"  },
                          { label: "Layer 4 — Economy atoms", val: c.economyCount,        color: "bg-amber-500",   note: "Domain data"       },
                          { label: "Layer 4 — Promise atoms", val: c.promiseCount,        color: "bg-emerald-500", note: "Accountability"    },
                          { label: "Layer 5 — Classification",val: c.classificationCount, color: "bg-pink-500",    note: "Public routing"    },
                        ].map(({ label, val, color, note }) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${val > 0 ? color : "bg-zinc-700"}`} />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-zinc-500">{label}</span>
                            </div>
                            <span className={`text-[10px] font-mono font-bold ml-1 ${val > 0 ? "text-zinc-200" : "text-zinc-700"}`}>{val}</span>
                          </div>
                        ))}
                      </div>

                      {/* System reasoning */}
                      <div className="px-4 pb-3 space-y-2">
                        <p className="text-[10px] text-zinc-600 uppercase tracking-wide">किन system ले यस्तो भन्यो?</p>
                        <ReasoningBadges lineage={lineage} counts={c} rawDoc={rawDoc} isDup={isDup} />
                        <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-800/50 rounded-lg px-3 py-2 mt-1">
                          💡 {lineage.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="px-4 pb-3 flex items-center gap-2 flex-wrap border-t border-zinc-800/50 pt-2.5">
                    <Link href={state.nextActionHref}
                      className="text-[10px] text-zinc-600 hover:text-zinc-400 truncate flex-1 min-w-0">
                      → {state.nextActionNp}
                    </Link>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Layer toggle */}
                      <button onClick={() => setExpandedLineage(showLineage ? null : state.docId)}
                        className="text-[10px] border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-colors">
                        {showLineage ? "▲ Layer" : "▼ Layer"}
                      </button>

                      {/* Keep / Undo */}
                      {isKept ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-emerald-500 font-semibold">✓ राखियो</span>
                          <button onClick={() => rawDoc && handleUndoKeep(rawDoc)}
                            disabled={isActing || !rawDoc}
                            className="text-[10px] border border-zinc-700 text-zinc-500 hover:text-amber-400 hover:border-amber-800/60 rounded-lg px-2 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40">
                            ↩ Undo
                          </button>
                        </div>
                      ) : (
                        <ActionButton onClick={() => rawDoc && handleKeep(rawDoc)}
                          disabled={isActing || !rawDoc}
                          cls="border-emerald-800/60 text-emerald-500 hover:bg-emerald-900/30"
                          label="राख्नुहोस्" />
                      )}

                      {/* Archive */}
                      <ActionButton
                        onClick={() => {
                          if (!rawDoc) return;
                          setImpactDoc(rawDoc);
                          setImpactAction("archive");
                        }}
                        disabled={isActing || !rawDoc || overrides[state.docId] === "archive"}
                        cls="border-blue-800/60 text-blue-500 hover:bg-blue-900/30"
                        label="Archive" />

                      {/* Reset */}
                      <ActionButton onClick={() => rawDoc && handleReset(rawDoc)}
                        disabled={isActing || !rawDoc || (state.health !== "stuck" && state.health !== "needs_action")}
                        cls="border-amber-800/60 text-amber-500 hover:bg-amber-900/30"
                        label="Reset" />

                      {/* Delete — blocked on const-conflict docs */}
                      {isConstConflict ? (
                        <span
                          title="Constitution records छन् — Delete unsafe। Archive मात्र।"
                          className="text-[10px] border border-zinc-800/40 text-zinc-700 rounded-lg px-2.5 py-1 cursor-not-allowed select-none"
                        >
                          Delete 🔒
                        </span>
                      ) : (
                        <ActionButton
                          onClick={() => {
                            if (!rawDoc) return;
                            setImpactDoc(rawDoc);
                            setImpactAction("delete");
                          }}
                          disabled={isActing || !rawDoc}
                          cls="border-red-900/60 text-red-500 hover:bg-red-950/40"
                          label="Delete" danger />
                      )}
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
            <p><span className="text-emerald-500 font-bold">राख्नुहोस्</span> — permanent keep mark। Undo गर्न "↩ Undo" थिच्नुहोस्।</p>
            <p><span className="text-blue-500 font-bold">Archive</span> — Intel records हट्छन्, document file R2 मा safe रहन्छ</p>
            <p><span className="text-amber-500 font-bold">Reset</span> — AI analysis हट्छ, document फेरि pipeline मा जान तयार</p>
            <p><span className="text-red-500 font-bold">Delete</span> — Firestore बाट सबै records हट्छन् (R2 file manually delete गर्नुहोस्)</p>
            <p><span className="text-zinc-400 font-bold">▼ Layer</span> — Data layers, tier, safety, र system reasoning हेर्नुहोस्</p>
            <p><span className="text-red-500 font-bold">⚡ Const Conflict</span> — दुबैमा Constitution records छन् — Archive safe, Delete blocked। Canonical छानेपछि duplicate Archive गर्नुहोस्।</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── System Reasoning Badges ────────────────────────────────────────────────────

function ReasoningBadges({
  lineage, counts, rawDoc, isDup,
}: {
  lineage: LineageResult;
  counts: DocCounts;
  rawDoc: IntelligenceDocument | undefined;
  isDup: boolean;
}) {
  const reasons: string[] = [];

  if (isDup) reasons.push("Title fingerprint analysis ले duplicate देखाउँछ");
  if (TEST_PATTERNS.test((rawDoc?.title ?? "").trim())) reasons.push("Title test/demo pattern match गर्छ");
  if (counts.constitutionalCount > 0) reasons.push(`Constitution framework मा ${counts.constitutionalCount} records linked`);
  if (counts.intelCount > 20) reasons.push(`${counts.intelCount} intelligence records — high-value source`);
  if (counts.intelCount > 0 && counts.atomicCount === 0) reasons.push("Intel records छन् तर atomic extraction भएको छैन");
  if (counts.intelCount === 0 && counts.atomicCount === 0) reasons.push("कुनै child records बनेका छैनन्");
  if (!rawDoc?.sourceUrl && !rawDoc?.originalSourceUrl) reasons.push("Source URL छैन — evidence trail हुँदैन");
  if (rawDoc?.processingStatus === "error") reasons.push("Pipeline error state मा छ");
  if (!rawDoc?.downloadUrl) reasons.push("Download URL छैन — pipeline चल्न सक्दैन");
  if (rawDoc?.adminApprovalStatus === "approved") reasons.push("Founder approved document");
  if (lineage.score < 0) reasons.push(`Lineage score negative छ (${lineage.score}) — low value`);

  if (reasons.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.map(r => (
        <span key={r} className="text-[10px] text-zinc-500 border border-zinc-700/60 rounded px-2 py-0.5 leading-tight">
          {r}
        </span>
      ))}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function CountPill({ label, val, color }: { label: string; val: string | number; color: string }) {
  return (
    <span className="flex items-center gap-1 text-[10px]">
      <span className="text-zinc-700">{label}</span>
      <span className={`font-bold font-mono ${color}`}>{val}</span>
    </span>
  );
}

function ActionButton({
  onClick, disabled, cls, label, danger = false,
}: {
  onClick: () => void; disabled: boolean; cls: string; label: string; danger?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[10px] border rounded-lg px-2.5 py-1 transition-colors font-medium ${
        disabled ? "border-zinc-800 text-zinc-700 cursor-not-allowed" : `${cls} cursor-pointer`
      }`}>
      {label}
    </button>
  );
}
