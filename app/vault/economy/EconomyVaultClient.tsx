"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection, getDocs, getDoc, query, where, limit,
  onSnapshot, doc as fsDoc,
} from "firebase/firestore";
import type { ExtractionJob } from "../../../lib/types/extraction-job";
import { isJobStuck } from "../../../lib/types/extraction-job";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import {
  type EconomicAtom, type EconomicDocType, type EconomicSector, type EconomicAtomType,
  SECTOR_META, ATOM_TYPE_LABEL, COMPARISON_META, DOC_TYPE_LABEL,
  ECONOMIC_DOC_TYPES, formatNPR,
} from "../../../lib/types/economy";
import { ComparisonEngine } from "./ComparisonEngine";
import { ExtractionProgress } from "../../../components/vault/ExtractionProgress";

// ── Local types ───────────────────────────────────────────────────────────────

interface VaultDoc {
  id:                  string;
  title:               string;
  govFolder?:          string;
  mimeType?:           string;
  downloadUrl?:        string;
  pageCount?:          number;
  processingStatus?:   string;
  adminApprovalStatus?: string;
}

interface ExtractModal {
  doc:        VaultDoc;
  fiscalYear: string;
  nepaliYear: string;
  docType:    EconomicDocType;
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(e => {
  console.warn("[economy]", e?.code ?? e);
  return fb;
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseFiscalYear(input: string): number {
  const m = input.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 0;
}

function AtomTypeBadge({ type }: { type: string }) {
  const label = ATOM_TYPE_LABEL[type as EconomicAtomType] ?? type;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 whitespace-nowrap">
      {label}
    </span>
  );
}

function SectorBadge({ sector }: { sector: string }) {
  const meta = SECTOR_META[sector as EconomicSector] ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${meta.tw}`}>
      <span>{meta.icon}</span>{sector}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EconomyVaultClient() {
  const { user, loading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [docs, setDocs]   = useState<VaultDoc[]>([]);
  const [atoms, setAtoms] = useState<EconomicAtom[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [modal, setModal]           = useState<ExtractModal | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [jobMsgs, setJobMsgs]       = useState<Record<string, string>>({});
  const [jobStates, setJobStates]   = useState<Record<string, ExtractionJob>>({});

  const [filterYear, setFilterYear]     = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterType, setFilterType]     = useState("all");
  const [expandedAtom, setExpandedAtom] = useState<string | null>(null);

  const searchParams   = useSearchParams();
  const autoDocId      = searchParams.get("docId");
  const autoOpened     = useRef(false);
  const [deepDoc, setDeepDoc] = useState<VaultDoc | null>(null);
  const [deepDocError, setDeepDocError] = useState<string | null>(null);

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadAtoms = useCallback(() => {
    if (!uid) return;
    safe(
      getDocs(query(collection(db, "economy_atoms"), where("ownerId", "==", uid), limit(500))),
      null,
    ).then(snap => {
      if (!snap) return;
      setAtoms(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EconomicAtom, "id">) })));
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);

    Promise.all([
      safe(
        getDocs(query(collection(db, "vault_intelligence_docs"), where("ownerId", "==", uid), limit(100))),
        null,
      ),
      safe(
        getDocs(query(collection(db, "economy_atoms"), where("ownerId", "==", uid), limit(500))),
        null,
      ),
    ]).then(([docsSnap, atomsSnap]) => {
      if (docsSnap) {
        setDocs(docsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VaultDoc, "id">) })));
      }
      if (atomsSnap) {
        setAtoms(atomsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<EconomicAtom, "id">) })));
      }
    }).finally(() => setLoadingData(false));
  }, [uid]);

  // ── Subscribe to ALL economy extraction jobs for this user ───────────────────
  // This is what makes the job cockpit persistent across page refreshes.
  // ExtractionProgress is shown for any doc that has an active/failed job,
  // not just the one currently being extracted in this browser session.

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "economy_extraction_jobs"), where("ownerId", "==", uid), limit(50)),
      snap => {
        const map: Record<string, ExtractionJob> = {};
        snap.docs.forEach(d => {
          map[d.id] = { id: d.id, ...(d.data() as Omit<ExtractionJob, "id">) };
        });
        setJobStates(map);
      },
      err => console.warn("[economy] jobs snapshot:", err?.code ?? err),
    );
    return unsub;
  }, [uid]);

  // ── Deep-link: directly fetch the doc when ?docId is in URL ─────────────────
  // Does NOT depend on the general docs list. Fires as soon as uid + autoDocId are ready.

  useEffect(() => {
    if (!autoDocId || !uid || autoOpened.current) return;
    autoOpened.current = true;

    getDoc(fsDoc(db, "vault_intelligence_docs", autoDocId))
      .then(snap => {
        if (!snap.exists()) {
          setDeepDocError(`Document भेटिएन — ID: ${autoDocId}`);
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        // Verify ownership
        if (data.ownerId !== uid) {
          setDeepDocError("Permission denied — यो document तपाईंको होइन।");
          return;
        }
        const vd: VaultDoc = {
          id:                  snap.id,
          title:               (data.title as string) ?? snap.id,
          govFolder:           data.govFolder as string | undefined,
          mimeType:            data.mimeType as string | undefined,
          downloadUrl:         data.downloadUrl as string | undefined,
          pageCount:           data.pageCount as number | undefined,
          processingStatus:    data.processingStatus as string | undefined,
          adminApprovalStatus: data.adminApprovalStatus as string | undefined,
        };
        setDeepDoc(vd);
        setModal({ doc: vd, fiscalYear: "", nepaliYear: "", docType: "budget_speech" });
      })
      .catch(e => {
        setDeepDocError(`Firestore fetch failed: ${String(e?.code ?? e).slice(0, 80)}`);
      });
  }, [autoDocId, uid]);

  // ── Extract handler ─────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!modal || !user) return;
    const { doc, fiscalYear, nepaliYear, docType } = modal;
    const nepaliYearNum = parseInt(nepaliYear, 10);

    // Duplicate prevention — if a non-terminal job exists, don't start another
    const existing = jobStates[doc.id];
    if (existing && existing.status !== "completed" && existing.status !== "failed") {
      setModal(null);
      return; // ExtractionProgress panel is already showing for this doc
    }

    if (!doc.downloadUrl) {
      setJobMsgs(p => ({ ...p, [doc.id]: "Document download URL नभेटिएको" }));
      setModal(null);
      return;
    }
    if (!fiscalYear || !nepaliYearNum || nepaliYearNum < 2000) return;

    setModal(null);
    setExtracting(doc.id);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/economy-extract", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          docId:       doc.id,
          ownerId:     user.uid,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType ?? "application/pdf",
          docTitle:    doc.title,
          fiscalYear,
          nepaliYear:  nepaliYearNum,
          docType,
          pageCount:   doc.pageCount,
        }),
      });
      const data = await res.json() as { status?: string; error?: string };
      if (!res.ok || data.status !== "processing") {
        setJobMsgs(p => ({ ...p, [doc.id]: data.error ?? "Extraction failed to start" }));
        setExtracting(null);
      }
      // If ok: ExtractionProgress panel will handle all status from here
    } catch (e) {
      setJobMsgs(p => ({ ...p, [doc.id]: `Connection error: ${String(e).slice(0, 80)}` }));
      setExtracting(null);
    }
  }

  // ── Derived data ────────────────────────────────────────────────────────────

  const atomCountByDoc = useMemo(() => {
    const map: Record<string, number> = {};
    atoms.forEach(a => {
      map[a.sourceDocumentId] = (map[a.sourceDocumentId] ?? 0) + 1;
    });
    return map;
  }, [atoms]);

  const fiscalYears = useMemo(() => {
    const years = [...new Set(atoms.map(a => a.fiscalYear))].filter(Boolean).sort().reverse();
    return years;
  }, [atoms]);

  const filteredAtoms = useMemo(() => {
    return atoms.filter(a => {
      if (filterYear !== "all" && a.fiscalYear !== filterYear) return false;
      if (filterSector !== "all" && a.sector !== filterSector) return false;
      if (filterType !== "all" && a.atomType !== filterType) return false;
      return true;
    });
  }, [atoms, filterYear, filterSector, filterType]);

  const publishedCount = atoms.filter(a => a.publishedToPublic).length;

  // ── Auth guard ──────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-8 text-zinc-500 text-sm">Loading...</div>;
  }
  if (!user) {
    return <div className="p-8 text-zinc-500 text-sm">Not authenticated.</div>;
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-8">

      {/* Deep-link banner — shown when arriving via ?docId from /vault/documents */}
      {autoDocId && !deepDocError && (
        <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">💰</span>
          <div className="flex-1 min-w-0">
            <p className="text-yellow-300 text-sm font-semibold">
              {deepDoc
                ? `यो document Economy Extract को लागि तयार छ`
                : "Document load हुँदैछ…"}
            </p>
            {deepDoc && (
              <p className="text-yellow-200 text-xs font-medium mt-0.5 truncate">{deepDoc.title}</p>
            )}
            <p className="text-yellow-700 text-xs mt-0.5">
              {deepDoc
                ? "Modal खुल्यो — Fiscal Year र Document Type राखेर Extract सुरु गर्नुहोस्।"
                : "Firestore बाट document fetch गर्दैछ…"}
            </p>
          </div>
          {deepDoc && (
            <button
              onClick={() => setModal({ doc: deepDoc, fiscalYear: "", nepaliYear: "", docType: "budget_speech" })}
              className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg bg-yellow-700 hover:bg-yellow-600 text-white transition-colors"
            >
              Modal खोल्नुहोस्
            </button>
          )}
        </div>
      )}

      {/* Deep-link error — doc could not be fetched */}
      {autoDocId && deepDocError && (
        <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 space-y-1.5">
          <p className="text-red-300 text-sm font-semibold">Document भेटिएन</p>
          <p className="text-red-400 text-xs">{deepDocError}</p>
          <div className="text-[10px] text-zinc-600 font-mono space-y-0.5 pt-1">
            <p>docId: {autoDocId}</p>
            <p>collection: vault_intelligence_docs</p>
            <p>uid: {uid ?? "null (not authenticated)"}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">📊</span>
          <h1 className="text-xl font-bold text-white">Nepal Economic Intelligence</h1>
        </div>
        <p className="text-zinc-500 text-sm">
          बजेट · मौद्रिक नीति · आर्थिक सर्वेक्षण · नीति विश्लेषण
        </p>
        <p className="text-zinc-600 text-xs mt-1">
          वर्ष वर्षको Nepal को आर्थिक स्मृति — source-traced, citizen-friendly
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "कुल Atoms",    value: atoms.length,       note: "निकालिएका economic records"  },
          { label: "Fiscal Years", value: fiscalYears.length, note: fiscalYears.slice(0, 3).join(", ") || "अझै छैन" },
          { label: "Documents",    value: Object.keys(atomCountByDoc).length, note: "processed documents"    },
          { label: "Published",    value: publishedCount,     note: publishedCount === 0 ? "Approve गर्नुहोस्" : "public मा छन्" },
        ].map(s => (
          <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{loadingData ? "—" : s.value}</p>
            <p className="text-xs font-medium text-zinc-300 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{s.note}</p>
          </div>
        ))}
      </div>

      {/* Documents Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">Documents</h2>
          <span className="text-xs text-zinc-600">{docs.length} vault documents</span>
        </div>

        {loadingData ? (
          <div className="text-zinc-600 text-sm py-4 text-center">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-zinc-500 text-sm">कुनै document भेटिएन।</p>
            <p className="text-zinc-600 text-xs mt-1">
              <a href="/vault/documents" className="underline hover:text-zinc-400">Documents</a> मा budget PDF upload गर्नुहोस्।
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const count      = atomCountByDoc[doc.id] ?? 0;
              const isExtr     = extracting === doc.id;
              const job        = jobStates[doc.id];
              const jobActive  = job && job.status !== "completed" && job.status !== "failed";
              const jobDone    = job?.status === "completed";
              const jobFailed  = job?.status === "failed";
              const stuck      = job ? isJobStuck(job) : false;
              const showPanel  = isExtr || jobActive || jobFailed || stuck;
              const canExtract = !showPanel && !!doc.downloadUrl;
              const msg        = jobMsgs[doc.id];

              return (
                <div key={doc.id} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">

                  {/* Doc header */}
                  <div className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {doc.govFolder && (
                          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                            {doc.govFolder}
                          </span>
                        )}
                        {doc.pageCount && (
                          <span className="text-[10px] text-zinc-600">{doc.pageCount} pages</span>
                        )}
                        <span className={`text-[10px] font-medium ${count > 0 ? "text-cyan-400" : "text-zinc-600"}`}>
                          {count} atoms
                        </span>
                        {jobDone && !showPanel && (
                          <span className="text-[10px] font-medium text-green-400">
                            ✅ {job!.recordsExtracted ?? 0} atoms निकालियो
                          </span>
                        )}
                        {jobActive && !isExtr && (
                          <span className="text-[10px] font-medium text-cyan-400 animate-pulse">
                            ● चलिरहेको छ
                          </span>
                        )}
                      </div>
                      {/* Start-failure message only */}
                      {!showPanel && msg && (
                        <p className={`text-xs mt-1 ${msg.startsWith("❌") ? "text-red-400" : "text-zinc-500"}`}>
                          {msg}
                        </p>
                      )}
                    </div>

                    {/* Action button */}
                    {canExtract && (
                      <button
                        onClick={() => setModal({ doc, fiscalYear: "", nepaliYear: "", docType: "budget_speech" })}
                        className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold bg-cyan-700 hover:bg-cyan-600 text-white transition-colors"
                      >
                        {jobDone ? "🔄 Re-extract" : "💰 Economy Extract"}
                      </button>
                    )}
                    {!doc.downloadUrl && !showPanel && (
                      <span className="text-[10px] text-zinc-600 shrink-0">URL नभेटिएको</span>
                    )}
                  </div>

                  {/* ── Job cockpit — shows for ANY active/failed/stuck job, survives page refresh ── */}
                  {showPanel && (
                    <div className="px-3 pb-3 border-t border-zinc-800/60 pt-2">
                      <ExtractionProgress
                        docId={doc.id}
                        collectionName="economy_extraction_jobs"
                        onComplete={() => {
                          setExtracting(null);
                          loadAtoms();
                        }}
                        onError={errMsg => {
                          setExtracting(null);
                          setJobMsgs(p => ({ ...p, [doc.id]: `❌ ${errMsg.slice(0, 120)}` }));
                        }}
                        onRetry={() => {
                          setExtracting(null);
                          setModal({ doc, fiscalYear: "", nepaliYear: "", docType: "budget_speech" });
                        }}
                        onNotFound={() => {
                          setJobStates(prev => {
                            const next = { ...prev };
                            delete next[doc.id];
                            return next;
                          });
                          setExtracting(curr => curr === doc.id ? null : curr);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Atom Browser */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-zinc-300">
            Economic Atoms
            {filteredAtoms.length !== atoms.length && (
              <span className="ml-2 text-zinc-600 font-normal">
                ({filteredAtoms.length} / {atoms.length})
              </span>
            )}
          </h2>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={filterYear}
            onChange={e => setFilterYear(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5"
          >
            <option value="all">सबै वर्ष</option>
            {fiscalYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          <select
            value={filterSector}
            onChange={e => setFilterSector(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5"
          >
            <option value="all">सबै क्षेत्र</option>
            {Object.keys(SECTOR_META).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-2 py-1.5"
          >
            <option value="all">सबै प्रकार</option>
            {Object.entries(ATOM_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {(filterYear !== "all" || filterSector !== "all" || filterType !== "all") && (
            <button
              onClick={() => { setFilterYear("all"); setFilterSector("all"); setFilterType("all"); }}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700"
            >
              Filter हटाउनुहोस्
            </button>
          )}
        </div>

        {loadingData ? (
          <div className="text-zinc-600 text-sm py-6 text-center">Loading atoms...</div>
        ) : filteredAtoms.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 text-center">
            <p className="text-zinc-500 text-sm">
              {atoms.length === 0
                ? "अझै कुनै economic atoms निकालिएको छैन।"
                : "Filter मिलेका atoms भेटिएनन्।"}
            </p>
            {atoms.length === 0 && (
              <p className="text-zinc-600 text-xs mt-2">
                माथिको document list बाट "Economy Extract गर्नुहोस्" क्लिक गर्नुहोस्।
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAtoms.map(atom => {
              const isExpanded = expandedAtom === atom.id;
              const cmpMeta    = COMPARISON_META[atom.comparisonStatus] ?? COMPARISON_META.unknown;
              const sectorMeta = SECTOR_META[atom.sector as EconomicSector] ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };

              return (
                <div key={atom.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <button
                    className="w-full text-left p-3 hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setExpandedAtom(isExpanded ? null : atom.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 leading-snug">{atom.summaryNepali}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${sectorMeta.tw}`}>
                            {sectorMeta.icon} {atom.sector}
                          </span>
                          <AtomTypeBadge type={atom.atomType} />
                          <span className={`text-[10px] font-medium ${cmpMeta.tw}`}>
                            {cmpMeta.label}
                          </span>
                          {atom.amount != null && (
                            <span className="text-[10px] text-yellow-400 font-medium">
                              {formatNPR(atom.amount)}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-600">
                            {atom.fiscalYear} · p.{atom.pageNumber}
                          </span>
                        </div>
                      </div>
                      <span className="text-zinc-600 text-xs shrink-0 mt-0.5">
                        {isExpanded ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2 border-t border-zinc-800/60 pt-2">
                      <div>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                          यो तपाईंलाई कसरी असर गर्छ?
                        </p>
                        <p className="text-xs text-zinc-300">{atom.citizenMeaningNepali}</p>
                      </div>
                      {atom.textEvidence && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                            Source (page {atom.pageNumber})
                          </p>
                          <p className="text-xs text-zinc-500 italic bg-zinc-800/50 rounded p-2 border border-zinc-700/50">
                            "{atom.textEvidence}"
                          </p>
                        </div>
                      )}
                      {atom.previousYearReference && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                            गत वर्षको सन्दर्भ
                          </p>
                          <p className="text-xs text-zinc-500">{atom.previousYearReference}</p>
                        </div>
                      )}
                      {atom.actorName && (
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
                            विशेषज्ञ / संस्था
                          </p>
                          <p className="text-xs text-zinc-300">
                            {atom.actorName}
                            {atom.actorInstitution ? ` — ${atom.actorInstitution}` : ""}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          atom.publishedToPublic
                            ? "bg-green-950 text-green-400 border-green-800"
                            : "bg-zinc-800 text-zinc-500 border-zinc-700"
                        }`}>
                          {atom.publishedToPublic ? "Published" : "Private"}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          Confidence: {Math.round(atom.confidence * 100)}%
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {DOC_TYPE_LABEL[atom.sourceDocType] ?? atom.sourceDocType}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Phase 2: Comparison Engine */}
      <ComparisonEngine
        atoms={atoms}
        fiscalYears={fiscalYears}
        onAtomsUpdated={loadAtoms}
      />

      {/* Extraction Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-base font-semibold text-white">
              Economy Intelligence Extract
            </h3>
            <p className="text-xs text-zinc-400 bg-zinc-800/60 rounded-lg p-2">
              <strong className="text-zinc-200">{modal.doc.title}</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Document Type
                </label>
                <select
                  value={modal.docType}
                  onChange={e => setModal(m => m ? { ...m, docType: e.target.value as EconomicDocType } : m)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
                >
                  {ECONOMIC_DOC_TYPES.map(t => (
                    <option key={t} value={t}>{DOC_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Fiscal Year <span className="text-zinc-600">(e.g. 2081/82)</span>
                </label>
                <input
                  type="text"
                  placeholder="2081/82"
                  value={modal.fiscalYear}
                  onChange={e => {
                    const fy = e.target.value;
                    const ny = parseFiscalYear(fy);
                    setModal(m => m ? { ...m, fiscalYear: fy, nepaliYear: ny > 0 ? String(ny) : m.nepaliYear } : m);
                  }}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Nepali Year BS <span className="text-zinc-600">(e.g. 2081)</span>
                </label>
                <input
                  type="number"
                  placeholder="2081"
                  value={modal.nepaliYear}
                  onChange={e => setModal(m => m ? { ...m, nepaliYear: e.target.value } : m)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2">
              <p className="text-xs text-amber-300">
                यो extraction background मा हुन्छ। Result आउन केही मिनेट लाग्न सक्छ।
                Page छाडेर जान मिल्छ।
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 text-sm py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                disabled={!modal.fiscalYear || !modal.nepaliYear || parseInt(modal.nepaliYear, 10) < 2000}
                onClick={handleExtract}
                className={
                  "flex-1 text-sm py-2 rounded-lg font-medium transition-colors " +
                  (!modal.fiscalYear || !modal.nepaliYear || parseInt(modal.nepaliYear, 10) < 2000
                    ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                    : "bg-cyan-600 text-white hover:bg-cyan-500")
                }
              >
                Extract सुरु गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
