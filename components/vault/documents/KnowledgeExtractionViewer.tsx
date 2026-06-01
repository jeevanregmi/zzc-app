"use client";

/**
 * KnowledgeExtractionViewer
 *
 * Shows every raw_exhaustive atom grouped by chunk/page.
 * Founder can inspect what AI extracted, mark correct/wrong/important,
 * and identify coverage gaps before domain classification.
 */

import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, limit, getDocs,
  updateDoc, deleteDoc, doc as firestoreDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractionJobSummary {
  totalChunks:   number;
  expectedPages: number;
  chunkStatuses: Record<string, { status: string; atomCount: number; error?: string }>;
}

interface RawAtom {
  id:               string;
  pageNumber:       number;
  paragraphIndex:   number;
  extractionChunk:  number;
  chunkPageRange:   string;
  originalText:     string;
  summaryNepali:    string;
  type:             string;
  title:            string;
  sectionTitle:     string;
  heading:          string;
  subheading:       string;
  isHeading:        boolean;
  founderReviewStatus: string;
  founderMark?:     string;
  deterministicKey: string;
}

type FilterType = "all" | "needs_review" | "missing_heading" | "very_short" | "important" | "wrong";

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[KnowledgeExtractionViewer]", e?.code ?? e); return fb; });

// ── Main component ─────────────────────────────────────────────────────────────

interface Props {
  docId:      string;
  ownerId:    string;
  jobSummary: ExtractionJobSummary | null;
}

export function KnowledgeExtractionViewer({ docId, ownerId, jobSummary }: Props) {
  const [atoms,          setAtoms]          = useState<RawAtom[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [viewMode,       setViewMode]       = useState<"list" | "review">("list");
  const [reviewPageIdx,  setReviewPageIdx]  = useState(0);
  const [jumpInput,      setJumpInput]      = useState("");
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [filter,         setFilter]         = useState<FilterType>("all");
  const [searchText,     setSearchText]     = useState("");
  const [marks,          setMarks]          = useState<Record<string, string>>({});
  const [deleting,       setDeleting]       = useState<Set<string>>(new Set());
  const [confirmDelete,  setConfirmDelete]  = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void (async () => {
      const snap = await safe(getDocs(query(
        collection(db, "janta_intelligence"),
        where("ownerId",     "==", ownerId),
        where("sourceDocId", "==", docId),
        limit(2000),
      )), null);
      if (!snap) { setLoading(false); return; }

      const rawAtoms: RawAtom[] = snap.docs
        .filter(d => (d.data() as Record<string, unknown>).extractionTier === "raw_exhaustive")
        .map(d => {
          const x = d.data() as Record<string, unknown>;
          return {
            id:               d.id,
            pageNumber:       (x.pageNumber      as number)  ?? 0,
            paragraphIndex:   (x.paragraphIndex  as number)  ?? 0,
            extractionChunk:  (x.extractionChunk as number)  ?? 0,
            chunkPageRange:   (x.chunkPageRange  as string)  ?? "",
            originalText:     (x.originalText    as string)  ?? "",
            summaryNepali:    (x.summaryNepali   as string)  ?? "",
            type:             (x.type            as string)  ?? "other",
            title:            (x.title           as string)  ?? "",
            sectionTitle:     (x.sectionTitle    as string)  ?? "",
            heading:          (x.heading         as string)  ?? "",
            subheading:       (x.subheading      as string)  ?? "",
            isHeading:        (x.isHeading       as boolean) ?? false,
            founderReviewStatus: (x.founderReviewStatus as string) ?? "needs_review",
            founderMark:      x.founderMark as string | undefined,
            deterministicKey: (x.deterministicKey as string) ?? d.id,
          };
        });

      rawAtoms.sort((a, b) =>
        a.extractionChunk !== b.extractionChunk ? a.extractionChunk - b.extractionChunk :
        a.pageNumber      !== b.pageNumber      ? a.pageNumber      - b.pageNumber      :
        a.paragraphIndex  - b.paragraphIndex
      );

      const initMarks: Record<string, string> = {};
      for (const a of rawAtoms) if (a.founderMark) initMarks[a.id] = a.founderMark;
      setMarks(initMarks);
      setAtoms(rawAtoms);
      if (rawAtoms.length > 0) setExpandedChunks(new Set([rawAtoms[0].extractionChunk]));
      setLoading(false);
    })();
  }, [docId, ownerId]);

  // ── Derived data ──────────────────────────────────────────────────────────

  const chunkGroups = useMemo(() => {
    const groups = new Map<number, RawAtom[]>();
    for (const a of atoms) {
      const g = groups.get(a.extractionChunk) ?? [];
      g.push(a);
      groups.set(a.extractionChunk, g);
    }
    return Array.from(groups.entries())
      .map(([idx, group]) => ({ idx, atoms: group, pageRange: group[0]?.chunkPageRange ?? "" }))
      .sort((a, b) => a.idx - b.idx);
  }, [atoms]);

  // All unique page numbers that have at least one atom
  const allPages = useMemo(
    () => [...new Set(atoms.map(a => a.pageNumber).filter(p => p > 0))].sort((a, b) => a - b),
    [atoms],
  );

  // Atoms for the currently-selected review page
  const reviewPageNum = allPages[reviewPageIdx] ?? 0;
  const reviewPageAtoms = useMemo(
    () => atoms.filter(a => a.pageNumber === reviewPageNum).sort((a, b) => a.paragraphIndex - b.paragraphIndex),
    [atoms, reviewPageNum],
  );

  const stats = useMemo(() => {
    const pageSet = new Set(atoms.map(a => a.pageNumber).filter(p => p > 0));

    // Derive processed pages from done chunks
    const processedPages = new Set<number>();
    if (jobSummary?.chunkStatuses) {
      for (const [idxStr, cs] of Object.entries(jobSummary.chunkStatuses)) {
        if (cs.status === "done") {
          const cIdx = parseInt(idxStr, 10);
          const sample = atoms.find(a => a.extractionChunk === cIdx);
          if (sample?.chunkPageRange) {
            const [s, e] = sample.chunkPageRange.split("-").map(Number);
            if (s && e) for (let p = s; p <= e; p++) processedPages.add(p);
          }
        }
      }
    }
    const pagesWithZero = [...processedPages].filter(p => !pageSet.has(p)).sort((a, b) => a - b);
    const failedChunks  = jobSummary?.chunkStatuses
      ? Object.entries(jobSummary.chunkStatuses)
          .filter(([, cs]) => cs.status === "failed")
          .map(([i]) => parseInt(i, 10))
      : [];

    return {
      totalExpected:  jobSummary?.expectedPages ?? 0,
      totalAtoms:     atoms.length,
      pagesWithAtoms: pageSet.size,
      pagesWithZero,
      failedChunks,
      avgPerPage:     pageSet.size > 0 ? (atoms.length / pageSet.size).toFixed(1) : "0",
    };
  }, [atoms, jobSummary]);

  const filteredAtoms = useMemo(() => {
    let r = atoms;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      r = r.filter(a =>
        a.originalText.toLowerCase().includes(q)  ||
        a.summaryNepali.toLowerCase().includes(q) ||
        a.heading.toLowerCase().includes(q)       ||
        a.sectionTitle.toLowerCase().includes(q)
      );
    }
    switch (filter) {
      case "needs_review":    r = r.filter(a => !marks[a.id] || marks[a.id] === "needs_review"); break;
      case "missing_heading": r = r.filter(a => !a.heading && !a.sectionTitle); break;
      case "very_short":      r = r.filter(a => a.originalText.length < 60); break;
      case "important":       r = r.filter(a => marks[a.id] === "important"); break;
      case "wrong":           r = r.filter(a => marks[a.id] === "wrong"); break;
    }
    return r;
  }, [atoms, filter, searchText, marks]);

  // ── Actions ───────────────────────────────────────────────────────────────

  async function markAtom(atomId: string, mark: string) {
    const next = marks[atomId] === mark ? undefined : mark;
    setMarks(prev => {
      const m = { ...prev };
      if (next) m[atomId] = next; else delete m[atomId];
      return m;
    });
    await updateDoc(firestoreDoc(db, "janta_intelligence", atomId), {
      founderMark:         next ?? null,
      founderReviewStatus: next === "correct" || next === "important" ? "reviewed" : "needs_review",
    }).catch(() => {});
  }

  async function deleteAtom(atomId: string) {
    setDeleting(prev => new Set([...prev, atomId]));
    await deleteDoc(firestoreDoc(db, "janta_intelligence", atomId)).catch(() => {});
    setAtoms(prev => prev.filter(a => a.id !== atomId));
    setDeleting(prev => { const s = new Set(prev); s.delete(atomId); return s; });
    setConfirmDelete(null);
  }

  function toggleChunk(idx: number) {
    setExpandedChunks(prev => {
      const s = new Set(prev);
      if (s.has(idx)) s.delete(idx); else s.add(idx);
      return s;
    });
  }

  function expandAll()  { setExpandedChunks(new Set(chunkGroups.map(g => g.idx))); }
  function collapseAll(){ setExpandedChunks(new Set()); }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/5 px-4 py-4">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-2">निकालिएको ज्ञान / Extracted Knowledge</p>
        <div className="flex items-center gap-2 text-zinc-600 text-xs">
          <div className="w-3 h-3 border border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
          <span>Loading atoms…</span>
        </div>
      </div>
    );
  }

  if (atoms.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/5 px-4 py-4">
        <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">निकालिएको ज्ञान / Extracted Knowledge</p>
        <p className="text-zinc-600 text-[10px]">No raw extraction atoms found — Full Document Extraction पहिले चलाउनुहोस्।</p>
      </div>
    );
  }

  const importantCount = Object.values(marks).filter(m => m === "important").length;
  const wrongCount     = Object.values(marks).filter(m => m === "wrong").length;
  const reviewedCount  = Object.values(marks).filter(m => m === "correct" || m === "important").length;

  const FILTERS: { id: FilterType; label: string }[] = [
    { id: "all",             label: `All (${atoms.length})` },
    { id: "needs_review",    label: `Unreviewed (${atoms.length - reviewedCount})` },
    { id: "missing_heading", label: `No heading (${atoms.filter(a => !a.heading && !a.sectionTitle).length})` },
    { id: "very_short",      label: `Short <60c (${atoms.filter(a => a.originalText.length < 60).length})` },
    { id: "important",       label: `Important (${importantCount})` },
    { id: "wrong",           label: `Wrong (${wrongCount})` },
  ];

  const filteredIds   = new Set(filteredAtoms.map(a => a.id));
  const visibleGroups = chunkGroups
    .map(g => ({ ...g, atoms: g.atoms.filter(a => filteredIds.has(a.id)) }))
    .filter(g => g.atoms.length > 0);

  // Jump to specific page in review mode
  function handleJumpToPage() {
    const n = parseInt(jumpInput, 10);
    if (!n) return;
    const idx = allPages.indexOf(n);
    if (idx >= 0) { setReviewPageIdx(idx); setJumpInput(""); }
    else {
      // Find closest page
      const closest = allPages.reduce((best, p) => Math.abs(p - n) < Math.abs(best - n) ? p : best, allPages[0]);
      setReviewPageIdx(allPages.indexOf(closest));
      setJumpInput("");
    }
  }

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/5 px-4 py-3 space-y-3">
      {/* ── Header + View Mode Tabs ── */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-zinc-400 text-[10px] uppercase tracking-wide">
          निकालिएको ज्ञान / Extracted Knowledge
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-sky-400 text-[10px] font-bold mr-1">{atoms.length} paragraphs</span>
          <button
            onClick={() => setViewMode("list")}
            className={`text-[9px] px-2 py-1 rounded border transition-colors ${
              viewMode === "list"
                ? "border-sky-700 bg-sky-900/40 text-sky-300"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            📋 List
          </button>
          <button
            onClick={() => setViewMode("review")}
            className={`text-[9px] px-2 py-1 rounded border transition-colors ${
              viewMode === "review"
                ? "border-violet-700 bg-violet-900/40 text-violet-300"
                : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            📖 Page Review
          </button>
        </div>
      </div>

      {/* ── PAGE REVIEW MODE ── */}
      {viewMode === "review" && (
        <PageReviewMode
          allPages={allPages}
          pageIdx={reviewPageIdx}
          pageAtoms={reviewPageAtoms}
          marks={marks}
          jumpInput={jumpInput}
          onSetJumpInput={setJumpInput}
          onJump={handleJumpToPage}
          onPrev={() => setReviewPageIdx(i => Math.max(0, i - 1))}
          onNext={() => setReviewPageIdx(i => Math.min(allPages.length - 1, i + 1))}
          onMark={markAtom}
          onDelete={id => setConfirmDelete(id)}
          onConfirmDelete={deleteAtom}
          onCancelDelete={() => setConfirmDelete(null)}
          confirmDelete={confirmDelete}
          deleting={deleting}
          jobSummary={jobSummary}
        />
      )}

      {/* ── LIST MODE ── */}
      {viewMode === "list" && (<>

      {/* ── Coverage Quality ── */}
      <div className="rounded-lg border border-zinc-800/40 bg-zinc-900/30 px-3 py-2 space-y-2">
        <p className="text-zinc-600 text-[9px] uppercase tracking-wide">Coverage Quality / कभरेज जाँच</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px]">
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Expected pages</span>
            <span className="text-zinc-300 font-bold">{stats.totalExpected || "?"}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Pages w/ atoms</span>
            <span className="text-emerald-400 font-bold">{stats.pagesWithAtoms}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Total atoms</span>
            <span className="text-sky-400 font-bold">{stats.totalAtoms}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Avg atoms/page</span>
            <span className="text-zinc-400 font-bold">{stats.avgPerPage}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Pages w/ 0 atoms</span>
            <span className={`font-bold ${stats.pagesWithZero.length > 0 ? "text-amber-400" : "text-zinc-600"}`}>
              {stats.pagesWithZero.length}
            </span>
          </div>
          <div className="flex justify-between gap-1">
            <span className="text-zinc-600">Failed chunks</span>
            <span className={`font-bold ${stats.failedChunks.length > 0 ? "text-red-400" : "text-zinc-600"}`}>
              {stats.failedChunks.length}
            </span>
          </div>
        </div>
        {stats.pagesWithZero.length > 0 && (
          <div className="rounded border border-amber-800/40 bg-amber-950/20 px-2.5 py-1.5">
            <p className="text-amber-300 text-[10px] font-semibold">
              ⚠ {stats.pagesWithZero.length} pages may be missed — retry these chunks
            </p>
            <p className="text-amber-600 text-[9px] mt-0.5 leading-relaxed">
              Pages: {stats.pagesWithZero.slice(0, 30).join(", ")}{stats.pagesWithZero.length > 30 ? "…" : ""}
            </p>
          </div>
        )}
        {stats.failedChunks.length > 0 && (
          <div className="rounded border border-red-900/40 bg-red-950/10 px-2.5 py-1.5">
            <p className="text-red-400 text-[10px] font-semibold">
              ✗ {stats.failedChunks.length} chunks failed — Resume गर्नुहोस् माथिको Recovery panel बाट
            </p>
          </div>
        )}
      </div>

      {/* ── Search + Filters ── */}
      <div className="space-y-1.5">
        <input
          type="text"
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search paragraphs, headings, summaries…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-[11px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-700"
        />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-[9px] px-2 py-0.5 rounded-full border transition-colors ${
                filter === f.id
                  ? "border-sky-700 bg-sky-900/40 text-sky-300"
                  : "border-zinc-700 bg-zinc-900/20 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Chunk groups ── */}
      <div className="space-y-1.5">
        {/* Expand/collapse all */}
        <div className="flex items-center justify-between">
          <p className="text-zinc-600 text-[9px]">
            {visibleGroups.length} chunks · {filteredAtoms.length} atoms
          </p>
          <div className="flex gap-2">
            <button onClick={expandAll}   className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors">Expand all</button>
            <button onClick={collapseAll} className="text-[9px] text-zinc-600 hover:text-zinc-400 transition-colors">Collapse all</button>
          </div>
        </div>

        {visibleGroups.map(group => (
          <div key={group.idx} className="rounded-lg border border-zinc-800/40 overflow-hidden">
            {/* Chunk header */}
            <button
              onClick={() => toggleChunk(group.idx)}
              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/50 hover:bg-zinc-900/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-500">
                  C{group.idx + 1}
                </span>
                <span className="text-zinc-400 text-[10px] font-medium">Pages {group.pageRange}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sky-400 text-[10px] font-bold">{group.atoms.length}</span>
                <span className="text-zinc-600 text-[9px]">{expandedChunks.has(group.idx) ? "▲" : "▼"}</span>
              </div>
            </button>

            {/* Atom cards */}
            {expandedChunks.has(group.idx) && (
              <div className="divide-y divide-zinc-800/30 max-h-[560px] overflow-y-auto">
                {group.atoms.map(atom => (
                  <AtomCard
                    key={atom.id}
                    atom={atom}
                    mark={marks[atom.id]}
                    isDeleting={deleting.has(atom.id)}
                    isConfirmingDelete={confirmDelete === atom.id}
                    onMark={markAtom}
                    onDelete={id => setConfirmDelete(id)}
                    onConfirmDelete={deleteAtom}
                    onCancelDelete={() => setConfirmDelete(null)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Footer note ── */}
      <p className="text-zinc-700 text-[9px] leading-relaxed">
        Domain classification अगाडि यहाँ founder inspection आवश्यक।
        Wrong marks — delete गर्नुहोस्। Important marks — public routing मा priority।
      </p>
      </>) /* end list mode */}
    </div>
  );
}

// ── Page Review Mode ──────────────────────────────────────────────────────────

interface PageReviewProps {
  allPages:       number[];
  pageIdx:        number;
  pageAtoms:      RawAtom[];
  marks:          Record<string, string>;
  jumpInput:      string;
  onSetJumpInput: (v: string) => void;
  onJump:         () => void;
  onPrev:         () => void;
  onNext:         () => void;
  onMark:         (id: string, mark: string) => void;
  onDelete:       (id: string) => void;
  onConfirmDelete:(id: string) => Promise<void>;
  onCancelDelete: () => void;
  confirmDelete:  string | null;
  deleting:       Set<string>;
  jobSummary:     ExtractionJobSummary | null;
}

function PageReviewMode({
  allPages, pageIdx, pageAtoms, marks, jumpInput,
  onSetJumpInput, onJump, onPrev, onNext,
  onMark, onDelete, onConfirmDelete, onCancelDelete,
  confirmDelete, deleting, jobSummary,
}: PageReviewProps) {
  const pageNum    = allPages[pageIdx] ?? 0;
  const totalPages = allPages.length;

  // Detect gaps in paragraph sequence
  const maxIdx  = pageAtoms.length > 0 ? Math.max(...pageAtoms.map(a => a.paragraphIndex)) : -1;
  const atomMap = new Map(pageAtoms.map(a => [a.paragraphIndex, a]));
  const slots   = Array.from({ length: maxIdx + 1 }, (_, i) => ({ idx: i, atom: atomMap.get(i) ?? null }));

  // First atom's heading context
  const headingCtx = pageAtoms[0];
  const chunkRange = pageAtoms[0]?.chunkPageRange ?? "";

  // Is this page in a failed chunk?
  let pageStatus: "done" | "failed" | "unknown" = "unknown";
  if (jobSummary?.chunkStatuses && pageAtoms.length > 0) {
    const ci = String(pageAtoms[0].extractionChunk);
    const cs = jobSummary.chunkStatuses[ci];
    if (cs) pageStatus = cs.status === "done" ? "done" : "failed";
  }

  return (
    <div className="space-y-3">
      {/* Navigation bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={onPrev}
          disabled={pageIdx === 0}
          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
        >← Prev</button>

        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-zinc-300 text-xs font-bold">Page {pageNum}</span>
          <span className="text-zinc-600 text-[10px]">of {allPages[allPages.length - 1]}</span>
          {!!chunkRange && (
            <span className="text-zinc-700 text-[9px]">· pages {chunkRange}</span>
          )}
          {pageStatus === "failed" && (
            <span className="text-red-400 text-[9px] border border-red-800/50 bg-red-950/20 px-1.5 py-0.5 rounded">
              failed — retry आवश्यक
            </span>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={pageIdx >= totalPages - 1}
          className="text-[10px] px-2.5 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-zinc-200 disabled:opacity-30 transition-colors"
        >Next →</button>

        {/* Jump to page */}
        <div className="flex items-center gap-1">
          <input
            type="number"
            value={jumpInput}
            onChange={e => onSetJumpInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onJump()}
            placeholder="Go to page"
            className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-sky-700"
          />
          <button
            onClick={onJump}
            className="text-[9px] px-2 py-1 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          >Go</button>
        </div>
      </div>

      {/* Page progress indicator */}
      <div className="text-[10px] text-zinc-600">
        Page {pageIdx + 1} of {totalPages} pages with content ·{" "}
        <span className="text-sky-400 font-semibold">{pageAtoms.length} paragraphs</span>
        {headingCtx?.sectionTitle && (
          <span className="text-zinc-500"> · {headingCtx.sectionTitle}</span>
        )}
        {headingCtx?.heading && (
          <span className="text-zinc-600"> › {headingCtx.heading}</span>
        )}
      </div>

      {/* Zero-atom warning */}
      {pageAtoms.length === 0 && (
        <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-3 py-2.5">
          <p className="text-amber-300 text-xs font-semibold">⚠ यो page बाट कुनै paragraph capture भएन</p>
          <p className="text-amber-600 text-[10px] mt-0.5">
            यो page failed chunk मा पर्न सक्छ। माथिको Recovery panel बाट "Failed pages retry" गर्नुस्।
          </p>
        </div>
      )}

      {/* Side-by-side paragraph ↔ atom view */}
      {slots.length > 0 && (
        <div className="space-y-2">
          {slots.map(({ idx, atom }) => (
            <div key={idx} className={`rounded-lg border overflow-hidden ${
              !atom ? "border-amber-800/30 bg-amber-950/10" : "border-zinc-800/40 bg-zinc-900/10"
            }`}>
              {atom ? (
                <div className="grid grid-cols-2 gap-0 divide-x divide-zinc-800/40">
                  {/* Left: original paragraph */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <p className="text-[8px] font-mono text-zinc-600">
                      P{pageNum}.{idx}
                      {atom.isHeading && <span className="ml-1 text-violet-500">HEADING</span>}
                    </p>
                    {(atom.sectionTitle || atom.heading) && (
                      <p className="text-[9px] text-zinc-500 leading-snug">
                        {atom.sectionTitle}{atom.sectionTitle && atom.heading ? " › " : ""}{atom.heading}
                        {atom.heading && atom.subheading ? ` › ${atom.subheading}` : ""}
                      </p>
                    )}
                    <p className="text-zinc-300 text-[10px] leading-relaxed">{atom.originalText}</p>
                  </div>

                  {/* Right: AI atom */}
                  <div className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[8px] border border-zinc-700/40 text-zinc-500 px-1.5 py-0.5 rounded">{atom.type}</span>
                      {!!marks[atom.id] && (
                        <span className={`text-[8px] font-bold uppercase ${
                          marks[atom.id] === "correct"   ? "text-emerald-400" :
                          marks[atom.id] === "important" ? "text-amber-400" :
                          marks[atom.id] === "wrong"     ? "text-red-400" : "text-violet-400"
                        }`}>{marks[atom.id]}</span>
                      )}
                    </div>
                    {!!atom.summaryNepali && (
                      <p className="text-sky-600 text-[9px] italic leading-snug">{atom.summaryNepali}</p>
                    )}
                    {/* Action buttons */}
                    {confirmDelete === atom.id ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => void onConfirmDelete(atom.id)} className="text-[9px] px-2 py-0.5 rounded bg-red-900/40 border border-red-700/60 text-red-200 font-semibold">हो</button>
                        <button onClick={onCancelDelete} className="text-[9px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500">रद्द</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Btn label="✓" title="Correct"   active={marks[atom.id] === "correct"}   color="emerald" onClick={() => onMark(atom.id, "correct")} />
                        <Btn label="★" title="Important" active={marks[atom.id] === "important"} color="amber"   onClick={() => onMark(atom.id, "important")} />
                        <Btn label="✗" title="Wrong"     active={marks[atom.id] === "wrong"}     color="red"     onClick={() => onMark(atom.id, "wrong")} />
                        <button
                          title="Delete"
                          disabled={deleting.has(atom.id)}
                          onClick={() => onDelete(atom.id)}
                          className="text-[9px] w-6 h-5 rounded border border-zinc-700 text-zinc-600 hover:text-red-400 transition-colors ml-auto disabled:opacity-40"
                        >{deleting.has(atom.id) ? "…" : "🗑"}</button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-3 py-2 flex items-center gap-2">
                  <span className="text-[8px] font-mono text-zinc-600">P{pageNum}.{idx}</span>
                  <span className="text-amber-400 text-[9px]">⚠ यो paragraph बाट atom बनेको छैन — possible gap</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Atom Card ─────────────────────────────────────────────────────────────────

interface AtomCardProps {
  atom:               RawAtom;
  mark?:              string;
  isDeleting:         boolean;
  isConfirmingDelete: boolean;
  onMark:             (id: string, mark: string) => void;
  onDelete:           (id: string) => void;
  onConfirmDelete:    (id: string) => Promise<void>;
  onCancelDelete:     () => void;
}

function AtomCard({
  atom, mark, isDeleting, isConfirmingDelete,
  onMark, onDelete, onConfirmDelete, onCancelDelete,
}: AtomCardProps) {
  const [expanded, setExpanded] = useState(false);

  const markBg = mark === "wrong"     ? "bg-red-950/15"
               : mark === "important" ? "bg-amber-950/10"
               : mark === "correct"   ? "bg-emerald-950/5"
               : "";

  return (
    <div className={`px-3 py-2 space-y-1.5 ${markBg}`}>
      {/* Location + type badges */}
      <div className="flex items-center gap-1 flex-wrap">
        <span className="text-[8px] font-mono bg-zinc-800/60 text-zinc-500 px-1.5 py-0.5 rounded">
          p{atom.pageNumber}·{atom.paragraphIndex}
        </span>
        {atom.isHeading && (
          <span className="text-[8px] border border-violet-800/40 bg-violet-950/30 text-violet-400 px-1.5 py-0.5 rounded">
            HEADING
          </span>
        )}
        <span className="text-[8px] border border-zinc-700/40 text-zinc-500 px-1.5 py-0.5 rounded">
          {atom.type}
        </span>
        {!!mark && (
          <span className={`text-[8px] font-bold uppercase ${
            mark === "correct"   ? "text-emerald-400" :
            mark === "important" ? "text-amber-400"   :
            mark === "wrong"     ? "text-red-400"     :
            "text-violet-400"
          }`}>{mark}</span>
        )}
        <span className="ml-auto text-zinc-700 text-[8px]">{atom.chunkPageRange}</span>
      </div>

      {/* Heading chain */}
      {(atom.sectionTitle || atom.heading || atom.subheading) && (
        <p className="text-[9px] leading-snug">
          {!!atom.sectionTitle && <span className="text-zinc-400">{atom.sectionTitle}</span>}
          {!!atom.sectionTitle && !!atom.heading && <span className="text-zinc-700"> › </span>}
          {!!atom.heading      && <span className="text-zinc-500">{atom.heading}</span>}
          {!!atom.heading      && !!atom.subheading && <span className="text-zinc-700"> › </span>}
          {!!atom.subheading   && <span className="text-zinc-600">{atom.subheading}</span>}
        </p>
      )}

      {/* Original paragraph text */}
      <p
        className="text-zinc-300 text-[10px] leading-relaxed cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        {expanded
          ? atom.originalText
          : atom.originalText.slice(0, 180) + (atom.originalText.length > 180 ? "…" : "")}
        {atom.originalText.length > 180 && (
          <span className="text-zinc-600 ml-1">{expanded ? "▲" : "▼"}</span>
        )}
      </p>

      {/* Summary Nepali */}
      {!!atom.summaryNepali && (
        <p className="text-sky-600/90 text-[9px] italic leading-snug">{atom.summaryNepali}</p>
      )}

      {/* Actions */}
      {isConfirmingDelete ? (
        <div className="flex items-center gap-2 pt-0.5">
          <p className="text-red-400 text-[9px]">यो atom delete गर्ने?</p>
          <button
            onClick={() => void onConfirmDelete(atom.id)}
            className="text-[9px] px-2 py-0.5 rounded bg-red-900/40 border border-red-700/60 text-red-200 hover:bg-red-900/60 transition-colors font-semibold"
          >हो</button>
          <button
            onClick={onCancelDelete}
            className="text-[9px] px-2 py-0.5 rounded border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
          >रद्द</button>
        </div>
      ) : (
        <div className="flex items-center gap-1 pt-0.5">
          <Btn label="✓" title="Mark correct"   active={mark === "correct"}   color="emerald" onClick={() => onMark(atom.id, "correct")} />
          <Btn label="★" title="Mark important" active={mark === "important"} color="amber"   onClick={() => onMark(atom.id, "important")} />
          <Btn label="✗" title="Mark wrong"     active={mark === "wrong"}     color="red"     onClick={() => onMark(atom.id, "wrong")} />
          <Btn label="=" title="Mark duplicate" active={mark === "duplicate"} color="violet"  onClick={() => onMark(atom.id, "duplicate")} />
          <button
            title="Copy original text"
            onClick={() => void navigator.clipboard?.writeText(atom.originalText).catch(() => {})}
            className="text-[9px] w-6 h-5 rounded border border-zinc-700 text-zinc-600 hover:text-zinc-400 transition-colors"
          >⎘</button>
          <button
            title="Delete"
            disabled={isDeleting}
            onClick={() => onDelete(atom.id)}
            className="text-[9px] w-6 h-5 rounded border border-zinc-700 text-zinc-600 hover:text-red-400 transition-colors ml-auto disabled:opacity-40"
          >{isDeleting ? "…" : "🗑"}</button>
        </div>
      )}
    </div>
  );
}

function Btn({ label, title, active, color, onClick }: {
  label: string; title: string; active: boolean;
  color: "emerald" | "amber" | "red" | "violet"; onClick: () => void;
}) {
  const cls = {
    emerald: active ? "border-emerald-700 bg-emerald-900/40 text-emerald-300" : "border-zinc-700 text-zinc-500 hover:text-emerald-400",
    amber:   active ? "border-amber-700 bg-amber-900/40 text-amber-300"       : "border-zinc-700 text-zinc-500 hover:text-amber-400",
    red:     active ? "border-red-700 bg-red-900/40 text-red-300"             : "border-zinc-700 text-zinc-500 hover:text-red-400",
    violet:  active ? "border-violet-700 bg-violet-900/40 text-violet-300"    : "border-zinc-700 text-zinc-500 hover:text-violet-400",
  }[color];
  return (
    <button title={title} onClick={onClick}
      className={`text-[10px] w-6 h-5 rounded border transition-colors ${cls}`}>
      {label}
    </button>
  );
}
