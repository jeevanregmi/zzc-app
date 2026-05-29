"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  collection, getDocs, query, where, limit,
  onSnapshot, doc as fsDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import {
  type EconomicAtom, type EconomicDocType, type EconomicSector, type EconomicAtomType,
  SECTOR_META, ATOM_TYPE_LABEL, COMPARISON_META, DOC_TYPE_LABEL,
  ECONOMIC_DOC_TYPES, formatNPR,
} from "../../../lib/types/economy";
import { ComparisonEngine } from "./ComparisonEngine";

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

  const [modal, setModal]       = useState<ExtractModal | null>(null);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [jobMsgs, setJobMsgs]   = useState<Record<string, string>>({});
  const jobUnsubs = useRef<Record<string, () => void>>({});

  const [filterYear, setFilterYear]     = useState("all");
  const [filterSector, setFilterSector] = useState("all");
  const [filterType, setFilterType]     = useState("all");
  const [expandedAtom, setExpandedAtom] = useState<string | null>(null);

  const searchParams  = useSearchParams();
  const autoDocId     = searchParams.get("docId");
  const autoOpened    = useRef(false);

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
        getDocs(query(collection(db, "vault_documents"), where("ownerId", "==", uid), limit(100))),
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

    return () => {
      Object.values(jobUnsubs.current).forEach(u => u());
    };
  }, [uid]);

  // ── Auto-open modal from ?docId URL param (deep-link from /vault/documents) ─

  useEffect(() => {
    if (!autoDocId || loadingData || docs.length === 0 || autoOpened.current) return;
    const found = docs.find(d => d.id === autoDocId);
    if (found) {
      autoOpened.current = true;
      setModal({ doc: found, fiscalYear: "", nepaliYear: "", docType: "budget_speech" });
    }
  }, [autoDocId, docs, loadingData]);

  // ── Job polling ─────────────────────────────────────────────────────────────

  function startJobPolling(docId: string) {
    const timeout = setTimeout(() => {
      jobUnsubs.current[docId]?.();
      setJobMsgs(p => ({ ...p, [docId]: "⚠️ Timeout — job may still be running in background" }));
      setExtracting(null);
    }, 5 * 60 * 1000);

    const unsub = onSnapshot(
      fsDoc(db, "economy_extraction_jobs", docId),
      snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        if (data.status === "complete") {
          clearTimeout(timeout);
          jobUnsubs.current[docId]?.();
          const saved = data.recordsSaved ?? 0;
          setJobMsgs(p => ({ ...p, [docId]: `✅ ${saved} economic atoms निकालियो!` }));
          setExtracting(null);
          loadAtoms();
        } else if (data.status === "error") {
          clearTimeout(timeout);
          jobUnsubs.current[docId]?.();
          setJobMsgs(p => ({ ...p, [docId]: `❌ ${data.errorMsg ?? "Extraction failed"}` }));
          setExtracting(null);
        }
      },
    );
    jobUnsubs.current[docId] = unsub;
  }

  // ── Extract handler ─────────────────────────────────────────────────────────

  async function handleExtract() {
    if (!modal || !user) return;
    const { doc, fiscalYear, nepaliYear, docType } = modal;
    const nepaliYearNum = parseInt(nepaliYear, 10);

    if (!doc.downloadUrl) {
      setJobMsgs(p => ({ ...p, [doc.id]: "Document download URL नभेटिएको" }));
      setModal(null);
      return;
    }
    if (!fiscalYear || !nepaliYearNum || nepaliYearNum < 2000) {
      return; // modal validates before submit
    }

    setModal(null);
    setExtracting(doc.id);
    setJobMsgs(p => ({ ...p, [doc.id]: "🔄 Sending to background extraction..." }));

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
      if (data.status === "processing") {
        setJobMsgs(p => ({ ...p, [doc.id]: "🔄 Economy atoms निकाल्दैछ — background मा छ।" }));
        startJobPolling(doc.id);
      } else if (!res.ok) {
        setJobMsgs(p => ({ ...p, [doc.id]: data.error ?? "Extraction failed" }));
        setExtracting(null);
      }
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

      {/* Deep-link banner — shown when arriving from /vault/documents */}
      {autoDocId && (
        <div className="bg-yellow-950/40 border border-yellow-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-lg">💰</span>
          <div className="flex-1 min-w-0">
            <p className="text-yellow-300 text-sm font-semibold">Economy Extract — Document चुनिएको छ</p>
            <p className="text-yellow-600 text-xs mt-0.5">
              Documents page बाट आउनुभयो। तलको document list बाट &quot;Economy Extract गर्नुहोस्&quot; थिच्नुहोस्।
            </p>
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
              const count   = atomCountByDoc[doc.id] ?? 0;
              const isExtr  = extracting === doc.id;
              const msg     = jobMsgs[doc.id];
              return (
                <div key={doc.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3">
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
                    </div>
                    {msg && (
                      <p className={`text-xs mt-1 ${msg.startsWith("✅") ? "text-green-400" : msg.startsWith("❌") ? "text-red-400" : "text-cyan-400 animate-pulse"}`}>
                        {msg}
                      </p>
                    )}
                  </div>
                  <button
                    disabled={isExtr || !doc.downloadUrl}
                    onClick={() => setModal({
                      doc,
                      fiscalYear: "",
                      nepaliYear: "",
                      docType: "budget_speech",
                    })}
                    className={
                      "shrink-0 text-xs px-3 py-1.5 rounded-lg font-bold transition-colors " +
                      (isExtr
                        ? "bg-cyan-950 text-cyan-400 border border-cyan-800 cursor-wait animate-pulse"
                        : !doc.downloadUrl
                          ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                          : "bg-cyan-700 hover:bg-cyan-600 text-white")
                    }
                  >
                    {isExtr ? "🔄 Extracting..." : "💰 Economy Extract"}
                  </button>
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
