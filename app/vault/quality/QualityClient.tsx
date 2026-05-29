"use client";

import { useEffect, useState, useCallback } from "react";
import {
  collection, getDocs, query, where, updateDoc,
  doc as firestoreDoc, limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { VaultShell } from "../../../components/vault/VaultShell";
import type { IntelligenceRecord } from "../../../lib/types/intelligence-record";
import {
  scoreRecord, docQualitySummary, isPublicSafe,
  BAND_LABEL, BAND_COLOR_CLASS, type QualityBand,
} from "../../../lib/vault/qualityScore";

// ── Helpers ────────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[quality]", e?.code ?? e); return fb; });

const VERIFICATION_LABELS: Record<string, string> = {
  ai_extracted:     "AI Extracted",
  founder_reviewed: "Founder Reviewed",
  human_verified:   "Human Verified",
};

const VERIFICATION_NEXT: Record<string, IntelligenceRecord["verificationStatus"]> = {
  ai_extracted:     "founder_reviewed",
  founder_reviewed: "human_verified",
  human_verified:   "human_verified",
};

// ── Per-record row ─────────────────────────────────────────────────────────────

interface RecordRowProps {
  record:   IntelligenceRecord;
  onUpdate: (id: string, patch: Partial<IntelligenceRecord>) => void;
}

function RecordRow({ record, onUpdate }: RecordRowProps) {
  const score       = scoreRecord(record);
  const publicReady = isPublicSafe(record);
  const [refInput,  setRefInput]  = useState("");
  const [addingRef, setAddingRef] = useState(false);
  const [saving,    setSaving]    = useState(false);

  async function saveRefs() {
    const parts = refInput
      .split(/[,\s]+/)
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    if (parts.length === 0) { setAddingRef(false); return; }
    setSaving(true);
    const merged = Array.from(new Set([...(record.constitutionalRefs ?? []), ...parts])).sort((a, b) => a - b);
    await safe(updateDoc(firestoreDoc(db, "janta_intelligence", record.id), {
      constitutionalRefs: merged,
      updatedAt: new Date().toISOString(),
    }), undefined);
    onUpdate(record.id, { constitutionalRefs: merged });
    setRefInput("");
    setAddingRef(false);
    setSaving(false);
  }

  async function advanceVerification() {
    const next = VERIFICATION_NEXT[record.verificationStatus ?? "ai_extracted"];
    if (next === record.verificationStatus) return;
    await safe(updateDoc(firestoreDoc(db, "janta_intelligence", record.id), {
      verificationStatus: next,
      updatedAt: new Date().toISOString(),
    }), undefined);
    onUpdate(record.id, { verificationStatus: next });
  }

  const verStatus = record.verificationStatus ?? "ai_extracted";

  return (
    <div className={`rounded-lg border px-4 py-3 space-y-2 transition-colors ${
      publicReady ? "bg-zinc-900/40 border-zinc-800/40" : "bg-zinc-950/60 border-zinc-900/40"
    }`}>
      {/* Title row */}
      <div className="flex items-start gap-3">
        {/* Quality chip */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${BAND_COLOR_CLASS[score.band as QualityBand]}`}>
          {score.total}/100
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-zinc-200 text-sm font-semibold leading-snug line-clamp-2">
            {record.titleNepali}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Tier */}
            {record.extractionTier === "atomic" ? (
              <span className="text-[9px] font-bold text-violet-400 bg-violet-950/30 border border-violet-900/40 rounded px-1.5 py-0.5">⚛ Atomic</span>
            ) : (
              <span className="text-[9px] text-zinc-600 bg-zinc-900/40 border border-zinc-800/40 rounded px-1.5 py-0.5">
                {record.extractionTier ?? "operational"}
              </span>
            )}
            {/* Page */}
            {record.pageNumber ? (
              <span className="text-[9px] text-zinc-500 font-mono">Page {record.pageNumber}</span>
            ) : (
              <span className="text-[9px] text-red-500/70">पेज छैन</span>
            )}
            {/* Evidence */}
            {(record.textEvidence?.length ?? 0) >= 10 ? (
              <span className="text-[9px] text-emerald-600">evidence ✓</span>
            ) : (
              <span className="text-[9px] text-red-500/70">evidence छैन</span>
            )}
            {/* Public-safe indicator */}
            {publicReady ? (
              <span className="text-[9px] font-bold text-emerald-500">● Public</span>
            ) : (
              <span className="text-[9px] text-zinc-700">○ Vault only</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-3 flex-wrap pl-1">

        {/* Constitutional refs */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(record.constitutionalRefs ?? []).map(p => (
            <span key={p} className="text-[9px] text-blue-500 bg-blue-950/20 border border-blue-900/30 rounded px-1.5 py-0.5 font-mono">
              भाग {p}
            </span>
          ))}
          {addingRef ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={refInput}
                onChange={e => setRefInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveRefs(); if (e.key === "Escape") setAddingRef(false); }}
                placeholder="3, 4, 31"
                className="text-[10px] w-20 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={saveRefs}
                disabled={saving}
                className="text-[9px] font-bold text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
              >
                {saving ? "…" : "✓"}
              </button>
              <button
                onClick={() => setAddingRef(false)}
                className="text-[9px] text-zinc-600 hover:text-zinc-400"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingRef(true)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-colors ${
                (record.constitutionalRefs?.length ?? 0) === 0
                  ? "text-amber-400 bg-amber-950/20 border-amber-900/30 hover:bg-amber-950/40"
                  : "text-zinc-600 border-zinc-800/50 hover:text-zinc-400"
              }`}
              title="संविधान भाग जोड्नुहोस्"
            >
              + भाग
            </button>
          )}
        </div>

        {/* Verification status */}
        <button
          onClick={advanceVerification}
          disabled={verStatus === "human_verified"}
          className={`ml-auto text-[9px] font-bold px-2.5 py-1 rounded border transition-colors ${
            verStatus === "human_verified"
              ? "text-emerald-500 bg-emerald-950/20 border-emerald-900/40 cursor-default"
              : verStatus === "founder_reviewed"
                ? "text-blue-400 bg-blue-950/20 border-blue-900/40 hover:bg-blue-950/40"
                : "text-zinc-500 bg-zinc-800/40 border-zinc-700/40 hover:text-zinc-300"
          }`}
          title={verStatus === "human_verified" ? undefined : `→ ${VERIFICATION_LABELS[VERIFICATION_NEXT[verStatus] ?? "human_verified"]}`}
        >
          {VERIFICATION_LABELS[verStatus] ?? verStatus}
          {verStatus !== "human_verified" && " →"}
        </button>

      </div>
    </div>
  );
}

// ── Document group ─────────────────────────────────────────────────────────────

interface DocGroupProps {
  docTitle:  string;
  records:   IntelligenceRecord[];
  onUpdate:  (id: string, patch: Partial<IntelligenceRecord>) => void;
}

function DocGroup({ docTitle, records, onUpdate }: DocGroupProps) {
  const [open, setOpen] = useState(false);
  const summary = docQualitySummary(records);

  const barPct = records.length > 0
    ? Math.round((summary.publicSafe / records.length) * 100)
    : 0;

  return (
    <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-bold text-zinc-200 truncate">{docTitle}</p>
          {/* Quality bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden max-w-32">
              <div
                className={`h-full rounded-full transition-all ${barPct >= 80 ? "bg-emerald-500" : barPct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${barPct}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-zinc-500">
              {summary.publicSafe}/{summary.total} public-safe · avg {summary.avgScore}/100
            </span>
          </div>
        </div>
        {/* Quick stats */}
        <div className="flex items-center gap-3 shrink-0 text-[10px]">
          {summary.weak > 0 && (
            <span className="text-red-400 font-bold">{summary.weak} कमजोर</span>
          )}
          {summary.missingConstitutionalRefs > 0 && (
            <span className="text-amber-500">{summary.missingConstitutionalRefs} refs छैन</span>
          )}
          <span className="text-zinc-600">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Records */}
      {open && (
        <div className="border-t border-zinc-800/40 px-5 pb-5 pt-4 space-y-2">
          {records
            .slice()
            .sort((a, b) => scoreRecord(a).total - scoreRecord(b).total)  // weakest first
            .map(r => (
              <RecordRow key={r.id} record={r} onUpdate={onUpdate} />
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function QualityClient() {
  const { user } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [records, setRecords] = useState<IntelligenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) return;
    const snap = await safe(
      getDocs(query(
        collection(db, "janta_intelligence"),
        where("ownerId", "==", uid),
        limit(500),
      )),
      null,
    );
    if (snap) setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord)));
    setLoading(false);
  }, [uid]);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = useCallback((id: string, patch: Partial<IntelligenceRecord>) => {
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  if (!uid) return null;

  // ── Aggregate stats ─────────────────────────────────────────────────────────

  const summary = docQualitySummary(records);

  // Group by source document
  const byDoc = new Map<string, { title: string; records: IntelligenceRecord[] }>();
  for (const r of records) {
    const key = r.sourceDocId ?? "unknown";
    if (!byDoc.has(key)) byDoc.set(key, { title: r.sourceDocTitle ?? key, records: [] });
    byDoc.get(key)!.records.push(r);
  }
  const docGroups = Array.from(byDoc.values())
    .sort((a, b) => {
      const sa = docQualitySummary(a.records);
      const sb = docQualitySummary(b.records);
      return sb.publicSafe - sa.publicSafe;
    });

  return (
    <VaultShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Hero ── */}
        <div className="space-y-1">
          <h1 className="text-xl font-black text-white">Knowledge Quality Gate</h1>
          <p className="text-zinc-500 text-sm">
            Public Civic Chautari मा जान योग्य records मात्र देखाउनुहोस्। बाँकी Vault मा राख्नुहोस्।
          </p>
        </div>

        {/* ── Global stats ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-zinc-900/40 border border-zinc-800/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "जम्मा Records",        value: summary.total,      color: "text-zinc-300" },
                { label: "Public-safe (≥61)",    value: summary.publicSafe, color: "text-emerald-400" },
                { label: "कमजोर (<30)",           value: summary.weak,       color: "text-red-400" },
                { label: "औसत Score",             value: `${summary.avgScore}/100`, color: "text-amber-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-zinc-800/50 bg-zinc-900/40 px-4 py-3">
                  <p className={`text-lg font-black ${color}`}>{value}</p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Missing fields summary */}
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-4 space-y-3">
              <p className="text-xs font-bold text-zinc-400">सुधार गर्नुपर्ने</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 border border-amber-900/30">
                  <span className="text-amber-400 text-lg font-black">{summary.missingConstitutionalRefs}</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">संविधान सन्दर्भ छैन</p>
                    <p className="text-[10px] text-zinc-600">Records जसमा भाग नम्बर छैन</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/40">
                  <span className="text-zinc-400 text-lg font-black">{summary.missingHumanVerification}</span>
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Human verification बाँकी</p>
                    <p className="text-[10px] text-zinc-600">अझै AI Extracted मात्र</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Public / Vault split ── */}
            <div className="rounded-xl border border-zinc-800/50 px-5 py-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-bold text-emerald-400">Public मा जान मिल्छ</p>
                </div>
                <p className="text-2xl font-black text-white">{summary.publicSafe}</p>
                <p className="text-[10px] text-zinc-600">
                  Atomic + evidence + page ref + score ≥ 61
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" />
                  <p className="text-xs font-bold text-zinc-500">अझै कमजोर छन्</p>
                </div>
                <p className="text-2xl font-black text-zinc-400">{summary.total - summary.publicSafe}</p>
                <p className="text-[10px] text-zinc-600">
                  Vault मा मात्र — सुधार गरेपछि public गर्नुहोस्
                </p>
              </div>
            </div>
          </>
        )}

        {/* ── Document groups ── */}
        {!loading && docGroups.length === 0 && (
          <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-12 text-center">
            <p className="text-zinc-500 text-sm">कुनै Intelligence Record छैन।</p>
            <p className="text-zinc-700 text-xs mt-2">Documents upload र Intelligence Extract गर्नुहोस्।</p>
          </div>
        )}

        {!loading && docGroups.length > 0 && (
          <div className="space-y-3">
            <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">
              {docGroups.length} Document{docGroups.length > 1 ? "s" : ""} — Record detail
            </p>
            {docGroups.map(({ title, records: recs }) => (
              <DocGroup
                key={title}
                docTitle={title}
                records={recs}
                onUpdate={handleUpdate}
              />
            ))}
          </div>
        )}

      </div>
    </VaultShell>
  );
}
