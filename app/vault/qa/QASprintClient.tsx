"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { VaultShell } from "../../../components/vault/VaultShell";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";

// ── Types ─────────────────────────────────────────────────────────────────────

interface QADoc {
  id:                   string;
  title?:               string;
  fileName?:            string;
  processingStatus?:    string;
  adminApprovalStatus?: string;
  uploadedAt?:          string;
  aiSummary?:           string;
}

interface StageCount {
  uploaded:        number;
  analyzed:        number;
  reviewed:        number;
  approved:        number;
  extracted:       number;
  branchHealthPct: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[QASprint]", e?.code ?? e); return fb; });

const EMPTY = { docs: [], size: 0 } as unknown as import("firebase/firestore").QuerySnapshot;

function docTitle(d: QADoc): string {
  return String(d.title ?? d.fileName ?? d.id).slice(0, 50);
}

// ── Stage pill ────────────────────────────────────────────────────────────────

function StagePill({ done, label }: { done: boolean; label: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      done
        ? "border-green-800 bg-green-950/40 text-green-400"
        : "border-zinc-700 bg-zinc-900 text-zinc-500"
    }`}>
      {done ? "✓" : "○"} {label}
    </span>
  );
}

// ── Pipeline funnel stage ─────────────────────────────────────────────────────

function FunnelStage({
  step, label, labelNp, count, target, done, href, btnLabel,
  active,
}: {
  step:     number;
  label:    string;
  labelNp:  string;
  count:    number;
  target?:  number;
  done:     boolean;
  href:     string;
  btnLabel: string;
  active:   boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 space-y-2.5 transition-colors ${
      active
        ? "border-amber-800/60 bg-amber-950/15"
        : done
          ? "border-green-900/40 bg-green-950/10"
          : "border-zinc-800 bg-zinc-900/30"
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
          done ? "bg-green-700 text-white" : active ? "bg-amber-600 text-black" : "bg-zinc-800 text-zinc-500"
        }`}>
          {done ? "✓" : step}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-black leading-none ${done ? "text-green-400" : active ? "text-amber-300" : "text-zinc-400"}`}>
            {labelNp}
          </p>
          <p className="text-zinc-600 text-[9px] mt-0.5">{label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-black leading-none ${done ? "text-green-400" : active ? "text-amber-400" : "text-zinc-500"}`}>
            {count}
            {target !== undefined && <span className="text-[10px] text-zinc-600">/{target}</span>}
          </p>
        </div>
      </div>
      {active && (
        <Link
          href={href}
          className="block w-full text-center text-xs font-black py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black transition-colors"
        >
          {btnLabel} →
        </Link>
      )}
      {!active && !done && (
        <Link
          href={href}
          className="block w-full text-center text-xs font-black py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors"
        >
          {btnLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc }: { doc: QADoc }) {
  const stages = [
    { key: "upload",   done: true,                                                           label: "Upload"   },
    { key: "analyze",  done: !!doc.aiSummary || doc.processingStatus === "ai_ready",         label: "Analyze"  },
    { key: "review",   done: !!doc.adminApprovalStatus && doc.adminApprovalStatus !== "pending_review", label: "Review"   },
    { key: "approved", done: doc.adminApprovalStatus === "approved",                         label: "Approved" },
  ];

  const allDone = stages.every(s => s.done);

  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${
      allDone ? "border-green-900/40 bg-green-950/10" : "border-zinc-800 bg-zinc-900/30"
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{docTitle(doc)}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {stages.map(s => <StagePill key={s.key} done={s.done} label={s.label} />)}
        </div>
      </div>
      {allDone && <span className="text-green-500 text-sm shrink-0">✓</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QASprintClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [docs,       setDocs]       = useState<QADoc[]>([]);
  const [intelByDoc, setIntelByDoc] = useState<Record<string, number>>({});
  const [partsWithData, setPartsWithData] = useState(0);
  const [loading,    setLoading]    = useState(false);

  const TARGET = 10;

  useEffect(() => {
    if (!uid) return;
    setLoading(true);
    void Promise.all([
      safe(getDocs(query(collection(db, "vault_documents"), where("ownerId", "==", uid), limit(200))), EMPTY),
      safe(getDocs(query(collection(db, "janta_intelligence"), where("ownerId", "==", uid), limit(500))), EMPTY),
      safe(getDocs(query(collection(db, "constitutional_framework"), where("ownerId", "==", uid), limit(500))), EMPTY),
    ]).then(([docsSnap, intelSnap, fwSnap]) => {
      const rawDocs: QADoc[] = (docsSnap.docs ?? [])
        .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as QADoc))
        .filter(d => !(d as unknown as Record<string, unknown>).archived);
      setDocs(rawDocs);

      const ibd: Record<string, number> = {};
      (intelSnap.docs ?? []).forEach(d => {
        const src = (d.data() as Record<string, unknown>).sourceDocId as string | undefined;
        if (src) ibd[src] = (ibd[src] ?? 0) + 1;
      });
      setIntelByDoc(ibd);

      const partSet = new Set<number>();
      (fwSnap.docs ?? []).forEach(d => {
        const pn = (d.data() as Record<string, unknown>).partNumber as number | undefined;
        if (typeof pn === "number" && pn > 0) partSet.add(pn);
      });
      setPartsWithData(partSet.size);

    }).finally(() => setLoading(false));
  }, [uid]);

  if (authLoading) return null;

  const uploaded   = docs.length;
  const analyzed   = docs.filter(d => !!d.aiSummary || d.processingStatus === "ai_ready" || d.processingStatus === "ai_paused").length;
  const reviewed   = docs.filter(d => d.adminApprovalStatus && d.adminApprovalStatus !== "pending_review").length;
  const approved   = docs.filter(d => d.adminApprovalStatus === "approved").length;
  const extracted  = docs.filter(d => d.adminApprovalStatus === "approved" && (intelByDoc[d.id] ?? 0) > 0).length;

  const stages: StageCount = { uploaded, analyzed, reviewed, approved, extracted, branchHealthPct: Math.round((partsWithData / 35) * 100) };

  // Current blocking step
  const nextStep =
    uploaded === 0  ? 1 :
    analyzed  < uploaded ? 2 :
    reviewed  < analyzed ? 3 :
    approved  < TARGET   ? 4 :
    extracted < approved ? 5 : 6;

  const pct = Math.min(100, Math.round((approved / TARGET) * 100));

  return (
    <VaultShell>
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h1 className="text-xl font-black text-white">QA Sprint</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            {TARGET} documents पूरा pipeline मा पार गर्ने लक्ष्य — civic intelligence system को foundation prove गर्ने।
          </p>
        </div>

        {/* Progress */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-white">Approved Documents</p>
            <span className={`text-sm font-black ${approved >= TARGET ? "text-green-400" : "text-amber-400"}`}>
              {approved}/{TARGET}
            </span>
          </div>
          <div className="bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${approved >= TARGET ? "bg-green-500" : "bg-amber-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-zinc-600 text-[10px]">
            {approved >= TARGET
              ? "✅ QA Sprint target पूरा भयो — अब expression layer build गर्न सकिन्छ।"
              : `${TARGET - approved} थप documents approve र extract गर्नुपर्छ।`}
          </p>
        </div>

        {/* Pipeline funnel */}
        <div>
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-3">Pipeline Funnel</p>
          <div className="space-y-2">
            <FunnelStage
              step={1} label="vault_documents — total" labelNp="Upload गरिएको"
              count={stages.uploaded} done={stages.uploaded > 0}
              active={nextStep === 1} href="/vault/documents?upload=1" btnLabel="Documents Upload गर्नुस्"
            />
            <FunnelStage
              step={2} label="processingStatus = ai_ready" labelNp="AI Analyze गरिएको"
              count={stages.analyzed} done={stages.analyzed >= stages.uploaded && stages.uploaded > 0}
              active={nextStep === 2} href="/vault/documents" btnLabel="Documents → AI Analyze"
            />
            <FunnelStage
              step={3} label="adminApprovalStatus reviewed" labelNp="Admin Review गरिएको"
              count={stages.reviewed} done={stages.reviewed >= stages.analyzed && stages.analyzed > 0}
              active={nextStep === 3} href="/vault/admin?tab=documents" btnLabel="Admin Vault → Review गर्नुस्"
            />
            <FunnelStage
              step={4} label="adminApprovalStatus = approved" labelNp="Approve गरिएको"
              count={stages.approved} target={TARGET} done={stages.approved >= TARGET}
              active={nextStep === 4} href="/vault/admin?tab=documents" btnLabel="Documents Approve गर्नुस्"
            />
            <FunnelStage
              step={5} label="janta_intelligence records > 0" labelNp="Intelligence Extract गरिएको"
              count={stages.extracted} done={stages.extracted >= stages.approved && stages.approved > 0}
              active={nextStep === 5} href="/vault/documents" btnLabel="Intelligence Extract गर्नुस्"
            />
            <FunnelStage
              step={6} label="constitutional_framework parts mapped" labelNp="Branch Health Check"
              count={partsWithData} target={35} done={stages.branchHealthPct >= 50}
              active={nextStep === 6} href="/vault/constitution/health" btnLabel="Branch Health हेर्नुस्"
            />
          </div>
        </div>

        {/* Document list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">Documents load हुँदैछ…</div>
        ) : docs.length > 0 ? (
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-2">Documents ({docs.length})</p>
            <div className="space-y-1.5">
              {docs.map(d => <DocRow key={d.id} doc={d} />)}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center space-y-3">
            <p className="text-3xl">📄</p>
            <p className="text-zinc-400 text-sm font-bold">कुनै document upload गरिएको छैन</p>
            <Link
              href="/vault/documents?upload=1"
              className="inline-block text-xs font-black px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
            >
              पहिलो Document Upload गर्नुस् →
            </Link>
          </div>
        )}

        {/* Next action CTA */}
        {!loading && docs.length > 0 && nextStep <= 5 && (
          <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 space-y-3">
            <p className="text-[9px] text-amber-500 uppercase tracking-widest font-black">अर्को Step — अहिले गर्नुस्</p>
            {nextStep === 2 && (
              <>
                <p className="text-amber-300 text-sm font-bold">{stages.uploaded - stages.analyzed} documents AI analyze बाँकी</p>
                <Link href="/vault/documents" className="block text-center text-sm font-black py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black transition-colors">Documents → AI Analyze →</Link>
              </>
            )}
            {nextStep === 3 && (
              <>
                <p className="text-amber-300 text-sm font-bold">{stages.analyzed - stages.reviewed} documents Admin Review पर्खिरहेका</p>
                <Link href="/vault/admin?tab=documents" className="block text-center text-sm font-black py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black transition-colors">Admin Vault → Review →</Link>
              </>
            )}
            {nextStep === 4 && (
              <>
                <p className="text-amber-300 text-sm font-bold">{TARGET - approved} thap documents approve गर्नुस् (target: {TARGET})</p>
                <Link href="/vault/admin?tab=documents" className="block text-center text-sm font-black py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black transition-colors">Admin Vault → Approve →</Link>
              </>
            )}
            {nextStep === 5 && (
              <>
                <p className="text-amber-300 text-sm font-bold">{stages.approved - stages.extracted} approved documents बाट intelligence extract बाँकी</p>
                <Link href="/vault/documents" className="block text-center text-sm font-black py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black transition-colors">Documents → Intelligence Extract →</Link>
              </>
            )}
          </div>
        )}

        {/* Sprint complete */}
        {!loading && approved >= TARGET && extracted >= approved && (
          <div className="rounded-xl border border-green-800/50 bg-green-950/20 p-4 text-center space-y-3">
            <p className="text-3xl">🌳</p>
            <p className="text-green-400 font-black text-sm">QA Sprint पूरा भयो!</p>
            <p className="text-zinc-500 text-xs leading-relaxed">
              {approved} documents → {Object.values(intelByDoc).reduce((a, b) => a + b, 0)} intelligence records → {partsWithData}/35 branches active
            </p>
            <div className="flex gap-2">
              <Link href="/vault/constitution/health" className="flex-1 text-center text-xs font-black py-2 rounded-xl border border-green-800 text-green-400 hover:bg-green-950 transition-colors">Branch Health →</Link>
              <Link href="/vault/media" className="flex-1 text-center text-xs font-black py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white transition-colors">Media Content →</Link>
            </div>
          </div>
        )}

        {/* Back */}
        <div className="pt-2 border-t border-zinc-800">
          <Link href="/vault" className="text-zinc-600 hover:text-white text-xs transition-colors">← Vault Dashboard</Link>
        </div>
      </div>
    </VaultShell>
  );
}
