"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection, getDocs, getDoc, query, where, limit,
  onSnapshot, doc as fsDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type { ExtractionJob } from "../../../lib/types/extraction-job";
import { isJobStuck } from "../../../lib/types/extraction-job";
import type { PromiseAtom, PromiseSector, PromiseStatus } from "../../../lib/types/promise";
import {
  PROMISE_STATUS_META, PROMISE_SECTOR_META,
  SOURCE_DOC_TYPE_LABEL, PROMISE_SOURCE_DOC_TYPES,
} from "../../../lib/types/promise";
import { ExtractionProgress } from "../../../components/vault/ExtractionProgress";

// ── Local types ───────────────────────────────────────────────────────────────

interface VaultDoc {
  id:                   string;
  title:                string;
  govFolder?:           string;
  mimeType?:            string;
  downloadUrl?:         string;
  pageCount?:           number;
  adminApprovalStatus?: string;
  fiscalYear?:          string;
}

interface ExtractModal {
  doc:        VaultDoc;
  fiscalYear: string;
  nepaliYear: string;
  docType:    string;
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(e => {
  console.warn("[promises]", e?.code ?? e);
  return fb;
});

function parseFiscalYear(input: string): number {
  const m = input.match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : 2083;
}

// ── Badges ────────────────────────────────────────────────────────────────────

function SectorBadge({ sector }: { sector: string }) {
  const meta = PROMISE_SECTOR_META[sector as PromiseSector]
    ?? { icon: "◻", tw: "bg-zinc-900 text-zinc-400 border-zinc-700" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${meta.tw}`}>
      {meta.icon} {sector}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const meta = PROMISE_STATUS_META[status as PromiseStatus]
    ?? { icon: "⚪", labelNepali: status, tw: "text-zinc-400 bg-zinc-800/60 border-zinc-700" };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${meta.tw}`}>
      {meta.icon} {meta.labelNepali}
    </span>
  );
}

function ScoreDot({ score }: { score: number }) {
  const color = score >= 0.7 ? "bg-green-500" : score >= 0.4 ? "bg-yellow-500" : "bg-zinc-600";
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {(score * 100).toFixed(0)}%
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PromiseVaultClient() {
  const { user, loading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [docs, setDocs]     = useState<VaultDoc[]>([]);
  const [atoms, setAtoms]   = useState<PromiseAtom[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [modal, setModal]           = useState<ExtractModal | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [jobStates, setJobStates]   = useState<Record<string, ExtractionJob>>({});

  const [filterSector, setFilterSector] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterYear, setFilterYear]     = useState("all");
  const [expandedAtom, setExpandedAtom] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const autoDocId    = searchParams.get("docId");
  const autoOpened   = useRef(false);
  const [deepDoc, setDeepDoc]       = useState<VaultDoc | null>(null);
  const [deepDocError, setDeepDocError] = useState<string | null>(null);

  // ── Load docs + atoms ────────────────────────────────────────────────────────

  const loadAtoms = useCallback(() => {
    if (!uid) return;
    safe(
      getDocs(query(collection(db, "promise_atoms"), where("ownerId", "==", uid), limit(500))),
      null,
    ).then(snap => {
      if (!snap) return;
      setAtoms(snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PromiseAtom, "id">) })));
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    setLoadingData(true);
    Promise.all([
      safe(getDocs(query(collection(db, "vault_intelligence_docs"), where("ownerId", "==", uid), limit(100))), null),
      safe(getDocs(query(collection(db, "promise_atoms"), where("ownerId", "==", uid), limit(500))), null),
    ]).then(([docsSnap, atomsSnap]) => {
      if (docsSnap) setDocs(docsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<VaultDoc, "id">) })));
      if (atomsSnap) setAtoms(atomsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<PromiseAtom, "id">) })));
    }).finally(() => setLoadingData(false));
  }, [uid]);

  // ── Subscribe to extraction jobs (persistent cockpit) ────────────────────────

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      query(collection(db, "promise_extraction_jobs"), where("ownerId", "==", uid), limit(50)),
      snap => {
        const map: Record<string, ExtractionJob> = {};
        snap.docs.forEach(d => { map[d.id] = { id: d.id, ...(d.data() as Omit<ExtractionJob, "id">) }; });
        setJobStates(map);
      },
      err => console.warn("[promises] jobs snapshot:", err?.code ?? err),
    );
    return unsub;
  }, [uid]);

  // ── Deep-link: ?docId= auto-opens extract modal ──────────────────────────────

  useEffect(() => {
    if (!autoDocId || !uid || autoOpened.current) return;
    autoOpened.current = true;
    getDoc(fsDoc(db, "vault_intelligence_docs", autoDocId)).then(snap => {
      if (!snap.exists()) {
        setDeepDocError(`Document ${autoDocId} not found in vault.`);
        return;
      }
      const d = { id: snap.id, ...(snap.data() as Omit<VaultDoc, "id">) };
      setDeepDoc(d);
      const fy = d.fiscalYear ?? "2083/84";
      setModal({ doc: d, fiscalYear: fy, nepaliYear: String(parseFiscalYear(fy)), docType: "budget_speech" });
    }).catch(e => setDeepDocError(`Fetch failed: ${String(e?.code ?? e).slice(0, 80)}`));
  }, [autoDocId, uid]);

  // ── Extract handler ───────────────────────────────────────────────────────────

  async function startExtract() {
    if (!modal || !uid || !user) return;
    const { doc, fiscalYear, nepaliYear, docType } = modal;

    const nyNum = parseInt(nepaliYear, 10);
    if (!nyNum || nyNum < 2000) { alert("सही Nepali year राख्नुहोस्।"); return; }
    if (!doc.downloadUrl) { alert("Document को download URL छैन।"); return; }

    const job = jobStates[doc.id];
    if (job && job.status !== "completed" && job.status !== "failed") {
      alert("यो document को extraction पहिल्यै चलिरहेको छ।");
      return;
    }

    const existingCount = atoms.filter(a => a.sourceDocumentId === doc.id).length;
    if (existingCount > 0) {
      const ok = confirm(`यो document बाट ${existingCount} promises पहिल्यै extract भएको छ। फेरि गर्नुहुन्छ?`);
      if (!ok) return;
    }

    setModal(null);
    setExtracting(doc.id);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/promise-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          docId:       doc.id,
          ownerId:     uid,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType ?? "application/pdf",
          docTitle:    doc.title,
          fiscalYear,
          nepaliYear:  nyNum,
          docType,
          pageCount:   doc.pageCount,
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error ?? "Unknown error");
    } catch (e) {
      console.error("[promises] extract failed:", e);
      alert(`Extract सुरु गर्न सकिएन: ${String(e instanceof Error ? e.message : e).slice(0, 200)}`);
    } finally {
      setExtracting(null);
    }
  }

  // ── Founder review actions ────────────────────────────────────────────────────

  async function updateAtom(atomId: string, fields: Partial<PromiseAtom>) {
    await updateDoc(fsDoc(db, "promise_atoms", atomId), fields as Record<string, unknown>);
    setAtoms(prev => prev.map(a => a.id === atomId ? { ...a, ...fields } : a));
  }

  // ── Filtered atoms ────────────────────────────────────────────────────────────

  const filtered = atoms.filter(a => {
    if (filterSector !== "all" && a.sector !== filterSector) return false;
    if (filterStatus !== "all" && a.promiseStatus !== filterStatus) return false;
    if (filterYear !== "all" && a.fiscalYear !== filterYear) return false;
    return true;
  });

  const uniqueYears    = [...new Set(atoms.map(a => a.fiscalYear))].sort().reverse();
  const uniqueSectors  = [...new Set(atoms.map(a => a.sector))].sort();
  const uniqueStatuses = [...new Set(atoms.map(a => a.promiseStatus))];

  // ── Auth guard ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><p className="text-zinc-500 text-sm animate-pulse">Loading…</p></div>;
  }
  if (!user) {
    return <div className="flex items-center justify-center min-h-screen bg-black"><p className="text-zinc-500 text-sm">Vault access required.</p></div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 space-y-8">

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-white">🗳 वाचा Tracker</h1>
        <p className="text-zinc-400 text-sm">
          सरकारले official documents मा गरेका specific promises — source-backed accountability।
        </p>
        <p className="text-[11px] text-zinc-600">
          Non-partisan · Source-traced · Founder-reviewed · "सरकारले जे भन्यो, त्यो कहाँ छ?"
        </p>
      </div>

      {/* Deep-link error */}
      {deepDocError && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-xs">
          {deepDocError}
        </div>
      )}

      {/* Deep-link banner (doc found, modal not yet opened) */}
      {deepDoc && !modal && (
        <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-yellow-300 text-sm font-bold">{deepDoc.title}</p>
            <p className="text-yellow-600 text-xs">यो document बाट promises extract गर्न तयार छ।</p>
          </div>
          <button
            onClick={() => {
              const fy = deepDoc.fiscalYear ?? "2083/84";
              setModal({ doc: deepDoc, fiscalYear: fy, nepaliYear: String(parseFiscalYear(fy)), docType: "budget_speech" });
            }}
            className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl bg-yellow-800 hover:bg-yellow-700 text-yellow-200 transition-colors"
          >
            Extract खोल्नुहोस्
          </button>
        </div>
      )}

      {/* ── Document list — extraction source ────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-300">Documents — Promises निकाल्न</h2>

        {loadingData ? (
          <p className="text-zinc-600 text-xs animate-pulse">Documents load हुँदैछ…</p>
        ) : docs.length === 0 ? (
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-6 text-center space-y-2">
            <p className="text-zinc-400 text-sm">कुनै document छैन।</p>
            <a href="/vault/documents" className="text-cyan-400 text-xs hover:underline">
              → Documents मा जानुहोस् र document upload गर्नुहोस्
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {docs.map(doc => {
              const job       = jobStates[doc.id];
              const jobActive = job && job.status !== "completed" && job.status !== "failed";
              const jobFailed = job?.status === "failed";
              const stuck     = job ? isJobStuck(job) : false;
              const showPanel = !!(extracting === doc.id || jobActive || jobFailed || stuck);
              const canExtract = !showPanel && !!doc.downloadUrl;
              const docAtomCount = atoms.filter(a => a.sourceDocumentId === doc.id).length;

              return (
                <div key={doc.id} className="rounded-xl bg-zinc-900/80 border border-zinc-800 px-4 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 leading-tight truncate">{doc.title}</p>
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-zinc-500">
                        {doc.fiscalYear && <span>📅 {doc.fiscalYear}</span>}
                        {doc.govFolder  && <span>🏛 {doc.govFolder}</span>}
                        {doc.pageCount  && <span>📄 {doc.pageCount} pages</span>}
                        {docAtomCount > 0 && (
                          <span className="text-yellow-400">🗳 {docAtomCount} promises extracted</span>
                        )}
                      </div>
                    </div>
                    {canExtract && (
                      <button
                        onClick={() => {
                          const fy = doc.fiscalYear ?? "2083/84";
                          setModal({ doc, fiscalYear: fy, nepaliYear: String(parseFiscalYear(fy)), docType: "budget_speech" });
                        }}
                        className="shrink-0 text-xs font-bold px-3 py-2 rounded-xl bg-yellow-950/50 hover:bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 transition-colors"
                      >
                        🗳 Promises निकाल्नुहोस्
                      </button>
                    )}
                  </div>

                  {showPanel && (
                    <ExtractionProgress
                      docId={doc.id}
                      collectionName="promise_extraction_jobs"
                      onComplete={() => loadAtoms()}
                      onRetry={() => {
                        const fy = doc.fiscalYear ?? "2083/84";
                        setModal({ doc, fiscalYear: fy, nepaliYear: String(parseFiscalYear(fy)), docType: "budget_speech" });
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Promise atoms browser ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-sm font-bold text-zinc-300">
            {atoms.length === 0 ? "Promises — अझै खाली छ" : `${filtered.length} / ${atoms.length} Promises`}
          </h2>

          {atoms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {/* Fiscal year filter */}
              <select
                value={filterYear}
                onChange={e => setFilterYear(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1.5"
              >
                <option value="all">सबै वर्ष</option>
                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              {/* Sector filter */}
              <select
                value={filterSector}
                onChange={e => setFilterSector(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1.5"
              >
                <option value="all">सबै sector</option>
                {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Status filter */}
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1.5"
              >
                <option value="all">सबै status</option>
                {uniqueStatuses.map(s => {
                  const meta = PROMISE_STATUS_META[s as PromiseStatus];
                  return <option key={s} value={s}>{meta?.icon} {meta?.labelNepali ?? s}</option>;
                })}
              </select>
            </div>
          )}
        </div>

        {atoms.length === 0 ? (
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-8 text-center space-y-2">
            <p className="text-2xl">🗳</p>
            <p className="text-zinc-400 text-sm font-medium">अझै कुनै promise extract भएको छैन।</p>
            <p className="text-zinc-600 text-xs">माथिको Documents section बाट Budget Speech वा नीति तथा कार्यक्रम बाट extract गर्नुहोस्।</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(atom => {
              const expanded = expandedAtom === atom.id;
              const score    = atom.accountabilityScore ?? 0;
              const statusMeta = PROMISE_STATUS_META[atom.promiseStatus]
                ?? { icon: "⚪", labelNepali: atom.promiseStatus, tw: "text-zinc-400 bg-zinc-800/60 border-zinc-700" };

              return (
                <div
                  key={atom.id}
                  className={`rounded-xl border transition-colors ${
                    atom.publicReady
                      ? "bg-green-950/20 border-green-800/50"
                      : "bg-zinc-900/80 border-zinc-800"
                  }`}
                >
                  {/* Card header */}
                  <button
                    onClick={() => setExpandedAtom(expanded ? null : atom.id)}
                    className="w-full text-left px-4 py-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-100 leading-snug">{atom.titleNepali}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {atom.isRepeatFromLastYear && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-950/60 text-orange-400 border border-orange-800/50">
                            🔁 दोहोरो
                          </span>
                        )}
                        {atom.publicReady && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-950/60 text-green-400 border border-green-800/50">
                            ✅ Public
                          </span>
                        )}
                        <span className="text-zinc-500 text-xs">{expanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <SectorBadge sector={atom.sector} />
                      <StatusBadge status={atom.promiseStatus} />
                      <ScoreDot score={score} />
                      {atom.fiscalYear && (
                        <span className="text-[10px] text-zinc-600">📅 {atom.fiscalYear}</span>
                      )}
                      {atom.relatedMovement === "gen_z_movement_2081" && atom.movementConfidence && atom.movementConfidence > 0.3 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/50">
                          ⚡ Gen Z माँग सम्बन्धित
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expanded && (
                    <div className="border-t border-zinc-800 px-4 py-3 space-y-4">
                      {/* Plain meaning */}
                      <div className="bg-zinc-800/40 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">नागरिकलाई असर</p>
                        <p className="text-sm text-zinc-200 leading-relaxed">{atom.plainNepaliMeaning}</p>
                      </div>

                      {/* Promise details grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <DetailField label="वाचा गरिएको काम" value={atom.promisedAction} />
                        {atom.promisedOutput && <DetailField label="अपेक्षित नतिजा" value={atom.promisedOutput} />}
                        {atom.deadlineText && <DetailField label="समयसीमा" value={atom.deadlineText} />}
                        {atom.measurableIndicator && <DetailField label="मापन गर्ने तरिका" value={atom.measurableIndicator} />}
                        {atom.responsibleInstitution && <DetailField label="जिम्मेवार निकाय" value={atom.responsibleInstitution} />}
                        {atom.targetGroup && <DetailField label="लक्षित समूह" value={atom.targetGroup} />}
                        {atom.budgetAmount != null && (
                          <DetailField label="बजेट रकम" value={`रु. ${(atom.budgetAmount / 1e9).toFixed(1)} अर्ब`} />
                        )}
                      </div>

                      {/* Source evidence */}
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Source Evidence</p>
                        <blockquote className="bg-zinc-900 border-l-2 border-yellow-600 px-3 py-2 text-xs text-zinc-400 leading-relaxed italic">
                          "{atom.originalTextEvidence}"
                        </blockquote>
                        <div className="flex gap-3 text-[10px] text-zinc-600">
                          <span>📄 Page {atom.pageNumber}</span>
                          <span>📃 {SOURCE_DOC_TYPE_LABEL[atom.sourceDocType] ?? atom.sourceDocType}</span>
                          <span>📑 {atom.sourceDocTitle.slice(0, 50)}</span>
                        </div>
                      </div>

                      {/* Repeat from last year */}
                      {atom.isRepeatFromLastYear && atom.previousYearEvidence && (
                        <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg px-3 py-2 space-y-1">
                          <p className="text-[10px] text-orange-500 uppercase tracking-wider">गत वर्षको वाचा (दोहोरो)</p>
                          <p className="text-xs text-orange-400 italic">"{atom.previousYearEvidence}"</p>
                        </div>
                      )}

                      {/* Founder review actions */}
                      <div className="border-t border-zinc-800 pt-3 space-y-2">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Founder Review</p>
                        <div className="flex flex-wrap gap-2">
                          {/* Status update */}
                          <select
                            value={atom.promiseStatus}
                            onChange={e => updateAtom(atom.id, { promiseStatus: e.target.value as PromiseStatus, updatedAt: new Date().toISOString() })}
                            className="text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg px-2 py-1.5"
                          >
                            {Object.entries(PROMISE_STATUS_META).map(([k, v]) => (
                              <option key={k} value={k}>{v.icon} {v.labelNepali}</option>
                            ))}
                          </select>

                          {/* Verification status */}
                          <button
                            onClick={() => updateAtom(atom.id, {
                              verificationStatus: "founder_reviewed",
                              updatedAt: new Date().toISOString(),
                            })}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                              atom.verificationStatus === "founder_reviewed"
                                ? "bg-blue-900/60 text-blue-300 border-blue-800"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                            }`}
                          >
                            ✓ Founder Review गरियो
                          </button>

                          {/* Public ready toggle */}
                          <button
                            onClick={() => updateAtom(atom.id, {
                              publicReady: !atom.publicReady,
                              updatedAt: new Date().toISOString(),
                            })}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-medium ${
                              atom.publicReady
                                ? "bg-green-900/60 text-green-300 border-green-800"
                                : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700"
                            }`}
                          >
                            {atom.publicReady ? "✅ Public Ready" : "Public Ready बनाउनुहोस्"}
                          </button>
                        </div>

                        {/* Verification label */}
                        <p className="text-[10px] text-zinc-600">
                          Verification: {atom.verificationStatus} · Score: {(score * 100).toFixed(0)}%
                          {atom.publicReady ? " · 🟢 Public" : " · ⚪ Draft"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Extract modal ──────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div>
              <h3 className="text-base font-bold text-white">🗳 Promises Extract गर्नुहोस्</h3>
              <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
                AI ले यो document बाट सरकारको specific commitments निकाल्नेछ।
              </p>
            </div>

            <div className="bg-zinc-800/60 rounded-xl px-3 py-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Document</p>
              <p className="text-sm text-zinc-200 font-medium leading-snug">{modal.doc.title}</p>
            </div>

            <div className="space-y-3">
              {/* Doc type */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Document Type</label>
                <select
                  value={modal.docType}
                  onChange={e => setModal(m => m ? { ...m, docType: e.target.value } : null)}
                  className="w-full text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl px-3 py-2"
                >
                  {PROMISE_SOURCE_DOC_TYPES.map(t => (
                    <option key={t} value={t}>{SOURCE_DOC_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>

              {/* Fiscal year */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Fiscal Year (e.g. 2083/84)</label>
                <input
                  type="text"
                  value={modal.fiscalYear}
                  onChange={e => setModal(m => m ? { ...m, fiscalYear: e.target.value } : null)}
                  className="w-full text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl px-3 py-2"
                  placeholder="2083/84"
                />
              </div>

              {/* Nepali year */}
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">Nepali BS Year (e.g. 2083)</label>
                <input
                  type="number"
                  value={modal.nepaliYear}
                  onChange={e => setModal(m => m ? { ...m, nepaliYear: e.target.value } : null)}
                  className="w-full text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-xl px-3 py-2"
                  placeholder="2083"
                  min="2000"
                  max="2200"
                />
              </div>
            </div>

            {/* Cost note */}
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl px-3 py-2 text-xs text-amber-400">
              ⚠ यो AI call मा Gemini Flash API cost लाग्छ (~$0.05–0.15 प्रति document)।
              Founder review बिना कुनै promise public हुँदैन।
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 text-sm py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:bg-zinc-800 transition-colors"
              >
                रद्द गर्नुहोस्
              </button>
              <button
                onClick={startExtract}
                className="flex-1 text-sm font-bold py-2.5 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black transition-colors"
              >
                🗳 Extract गर्नुहोस्
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-xs text-zinc-300 leading-snug">{value}</p>
    </div>
  );
}
