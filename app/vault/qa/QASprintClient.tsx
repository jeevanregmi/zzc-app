"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../firebase";
import { VaultShell } from "../../../components/vault/VaultShell";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import {
  getDocPipelineState,
  getRecMatchResult,
  type PipelineDoc,
  type RecMatchResult,
} from "../../../lib/vault/pipelineState";

// ── QA Document Kit ───────────────────────────────────────────────────────────

interface KitDoc {
  title:        string;
  parts:        number[];
  cat:          string;
  tags:         string;
  folder:       string;   // govFolder to match
  siteUrl:      string;   // official site URL (domain fallback)
  siteLabel:    string;
  searchQuery:  string;
  archiveQuery: string;
  lifecycle:    string;
  importance:   string;
}

const KIT_DOCS: KitDoc[] = [
  { title: "राष्ट्रिय मानव अधिकार आयोग वार्षिक प्रतिवेदन",          parts: [28, 3],    cat: "research", tags: "मानव अधिकार,fundamental rights",    folder: "nhrc",                siteUrl: "https://nhrcnepal.org",        siteLabel: "nhrcnepal.org",       searchQuery: "NHRC Nepal \"annual report\" 2081 filetype:pdf OR \"मानव अधिकार\" \"वार्षिक प्रतिवेदन\" 2081",    archiveQuery: "nhrcnepal.org annual report",           lifecycle: "annual_report", importance: "high"     },
  { title: "अख्तियार दुरुपयोग अनुसन्धान आयोग वार्षिक प्रतिवेदन",   parts: [24],       cat: "legal",    tags: "CIAA,भ्रष्टाचार,anti-corruption",   folder: "ciaa",                siteUrl: "https://ciaa.gov.np",          siteLabel: "ciaa.gov.np",         searchQuery: "CIAA Nepal annual report 2081 filetype:pdf site:ciaa.gov.np",                                 archiveQuery: "ciaa.gov.np annual report",             lifecycle: "annual_report", importance: "high"     },
  { title: "नेपाल सरकारको वार्षिक बजेट भाषण",                        parts: [23],       cat: "finance",  tags: "बजेट,सार्वजनिक खर्च,अर्थ",          folder: "mof",                 siteUrl: "https://mof.gov.np",           siteLabel: "mof.gov.np",          searchQuery: "Nepal budget speech 2081 filetype:pdf site:mof.gov.np",                                       archiveQuery: "mof.gov.np budget 2081",                lifecycle: "annual_report", importance: "critical" },
  { title: "नेपाल राष्ट्र बैंक मौद्रिक नीति",                        parts: [23],       cat: "finance",  tags: "मौद्रिक नीति,NRB,banking",           folder: "nrb",                 siteUrl: "https://nrb.org.np",           siteLabel: "nrb.org.np",          searchQuery: "Nepal Rastra Bank monetary policy 2081 filetype:pdf site:nrb.org.np",                         archiveQuery: "nrb.org.np monetary policy 2081",       lifecycle: "annual_report", importance: "critical" },
  { title: "राष्ट्रिय शिक्षा नीति",                                   parts: [4, 3],     cat: "strategy", tags: "शिक्षा नीति,education,directive",     folder: "moe",                 siteUrl: "https://moest.gov.np",         siteLabel: "moest.gov.np",        searchQuery: "राष्ट्रिय शिक्षा नीति 2076 filetype:pdf site:moest.gov.np",                                   archiveQuery: "moest.gov.np education policy",         lifecycle: "amendment_based", importance: "high"   },
  { title: "लोक सेवा आयोग वार्षिक प्रतिवेदन",                        parts: [26],       cat: "research", tags: "लोक सेवा,civil service,PSC",          folder: "psc",                 siteUrl: "https://psc.gov.np",           siteLabel: "psc.gov.np",          searchQuery: "Lok Sewa Aayog PSC annual report 2081 filetype:pdf site:psc.gov.np",                          archiveQuery: "psc.gov.np annual report 2081",         lifecycle: "annual_report", importance: "medium"   },
  { title: "निर्वाचन आयोग वार्षिक प्रतिवेदन",                        parts: [27],       cat: "research", tags: "निर्वाचन,election,democracy",         folder: "election-commission", siteUrl: "https://election.gov.np",      siteLabel: "election.gov.np",     searchQuery: "Election Commission Nepal annual report 2081 filetype:pdf site:election.gov.np",               archiveQuery: "election.gov.np annual report 2081",    lifecycle: "annual_report", importance: "high"     },
  { title: "महालेखापरीक्षकको कार्यालय लेखापरीक्षण प्रतिवेदन",       parts: [25, 23],   cat: "finance",  tags: "लेखापरीक्षण,audit,OAG",               folder: "oag",                 siteUrl: "https://oag.gov.np",           siteLabel: "oag.gov.np",          searchQuery: "OAG Nepal Auditor General annual report 2081 filetype:pdf site:oag.gov.np",                   archiveQuery: "oag.gov.np auditor general report 2081",lifecycle: "annual_report", importance: "high"     },
  { title: "राष्ट्रिय महिला आयोग वार्षिक प्रतिवेदन",                 parts: [29, 3],    cat: "research", tags: "महिला अधिकार,women,gender",           folder: "ncw",                 siteUrl: "https://ncwnepal.gov.np",      siteLabel: "ncwnepal.gov.np",     searchQuery: "National Women Commission Nepal annual report 2081 filetype:pdf site:ncwnepal.gov.np",         archiveQuery: "ncwnepal.gov.np annual report 2081",    lifecycle: "annual_report", importance: "medium"   },
  { title: "सर्वोच्च अदालत वार्षिक प्रतिवेदन",                       parts: [11, 3],    cat: "legal",    tags: "न्यायपालिका,judiciary,Supreme Court", folder: "judiciary",           siteUrl: "https://supremecourt.gov.np",  siteLabel: "supremecourt.gov.np", searchQuery: "Supreme Court Nepal annual report 2081 filetype:pdf site:supremecourt.gov.np",                  archiveQuery: "supremecourt.gov.np annual report 2081",lifecycle: "annual_report", importance: "high"     },
];

const PART_LABELS_KIT: Record<number, string> = {
  3: "मौलिक हक", 4: "निर्देशक सिद्धान्त", 11: "न्यायपालिका",
  23: "वित्त", 24: "CIAA", 25: "महालेखापरीक्षक",
  26: "लोक सेवा", 27: "निर्वाचन", 28: "मानव अधिकार", 29: "महिला",
};

function buildUploadUrl(doc: KitDoc): string {
  const params = new URLSearchParams({
    upload:    "1",
    title:     doc.title,
    tags:      doc.tags,
    govFolder: doc.folder,
    lifecycle: doc.lifecycle,
    sourceUrl: doc.siteUrl,
  });
  if (doc.parts[0]) params.set("parts", String(doc.parts[0]));
  return `/vault/documents?${params.toString()}`;
}

// ── Kit row ───────────────────────────────────────────────────────────────────

function DocKitRow({ doc, idx, result }: { doc: KitDoc; idx: number; result: RecMatchResult }) {
  const done       = result.status === "complete";
  const inProgress = result.status === "in_progress";

  return (
    <div className={`rounded-lg border px-3 py-3 space-y-2 ${
      done       ? "border-green-900/40 bg-green-950/10" :
      inProgress ? "border-amber-900/30 bg-amber-950/10" :
                   "border-zinc-800 bg-zinc-900/20"
    }`}>
      {/* Title row */}
      <div className="flex items-start gap-3">
        <span className={`text-xs font-black w-5 shrink-0 pt-0.5 ${
          done ? "text-green-500" : inProgress ? "text-amber-500" : "text-zinc-600"
        }`}>
          {done ? "✓" : inProgress ? "⚡" : idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold leading-tight ${
            done ? "text-green-400" : inProgress ? "text-amber-300" : "text-white"
          }`}>
            {doc.title}
          </p>

          {/* Status badge + evidence pills */}
          <div className="flex flex-wrap gap-1 mt-1">
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
              done       ? "bg-green-950/40 text-green-400 border-green-900/50" :
              inProgress ? "bg-amber-950/40 text-amber-400 border-amber-900/50" :
                           "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {result.label}
            </span>
            {result.reasons.map((r, i) => (
              <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                r.startsWith("✓")
                  ? "bg-green-950/20 text-green-500/80 border-green-900/30"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
              }`}>
                {r}
              </span>
            ))}
          </div>

          {/* Matched doc title — for in_progress, helps identify which doc was found */}
          {inProgress && result.matchedDocTitle && (
            <p className="text-[9px] text-zinc-600 mt-1 truncate">
              → {result.matchedDocTitle}
            </p>
          )}

          {/* Constitution part chips */}
          <div className="flex flex-wrap gap-1 mt-1">
            {doc.parts.map(p => (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800/60 text-zinc-500 border border-zinc-700/50">
                भाग {p} — {PART_LABELS_KIT[p] ?? `Part ${p}`}
              </span>
            ))}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold border ${
              doc.importance === "critical"
                ? "bg-red-950/40 text-red-400 border-red-900/50"
                : doc.importance === "high"
                  ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                  : "bg-zinc-800 text-zinc-500 border-zinc-700"
            }`}>
              {doc.lifecycle === "annual_report" ? "वार्षिक" : doc.lifecycle === "amendment_based" ? "नीति" : doc.lifecycle}
            </span>
          </div>
        </div>
      </div>

      {/* Action row — shown when not complete */}
      {!done && (
        <div className="space-y-1.5 pl-8">
          {result.status === "missing" && (
            <>
              <p className="text-[9px] text-zinc-600 font-bold">१. PDF खोज्नुस् — कुनै एक काम गर्छ:</p>
              <div className="grid grid-cols-3 gap-1">
                <a href={doc.siteUrl} target="_blank" rel="noopener noreferrer"
                  className="text-center text-[9px] font-bold py-1.5 rounded-lg border border-blue-800/60 bg-blue-950/30 text-blue-400 hover:bg-blue-900/40 transition-colors">
                  Official →
                </a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(doc.searchQuery)}`} target="_blank" rel="noopener noreferrer"
                  className="text-center text-[9px] font-bold py-1.5 rounded-lg border border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">
                  Google →
                </a>
                <a href={`https://web.archive.org/web/*/${encodeURIComponent(doc.siteUrl)}`} target="_blank" rel="noopener noreferrer"
                  className="text-center text-[9px] font-bold py-1.5 rounded-lg border border-violet-800/50 bg-violet-950/20 text-violet-400 hover:bg-violet-900/30 transition-colors">
                  Archive →
                </a>
              </div>
              <p className="text-[9px] text-zinc-700">Site बन्द? → Google → वा Archive → मा PDF खोज्नुस् → Download → अनि Upload</p>
              <Link href={buildUploadUrl(doc)}
                className="block w-full text-center text-[10px] font-black py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black transition-colors">
                २. PDF Download भएपछि — Upload →
              </Link>
            </>
          )}
          {result.status === "in_progress" && result.state && (
            <Link
              href={
                result.state.blockingStep === "analyze"  ? "/vault/documents" :
                result.state.blockingStep === "extract"  ? "/vault/documents" :
                "/vault/admin?tab=documents"
              }
              className="block w-full text-center text-[10px] font-black py-1.5 rounded-lg border border-amber-700/50 bg-amber-950/20 text-amber-400 hover:bg-amber-900/30 transition-colors"
            >
              {result.state.blockingLabel} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const EMPTY = { docs: [], size: 0 } as unknown as import("firebase/firestore").QuerySnapshot;

function docTitle(d: PipelineDoc): string {
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
  step, label, labelNp, count, target, done, href, btnLabel, active,
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
      active ? "border-amber-800/60 bg-amber-950/15" :
      done   ? "border-green-900/40 bg-green-950/10" :
               "border-zinc-800 bg-zinc-900/30"
    }`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
          done ? "bg-green-700 text-white" : active ? "bg-amber-600 text-black" : "bg-zinc-800 text-zinc-500"
        }`}>
          {done ? "✓" : step}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-black leading-none ${
            done ? "text-green-400" : active ? "text-amber-300" : "text-zinc-400"
          }`}>
            {labelNp}
          </p>
          <p className="text-zinc-600 text-[9px] mt-0.5">{label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-black leading-none ${
            done ? "text-green-400" : active ? "text-amber-400" : "text-zinc-500"
          }`}>
            {count}
            {target !== undefined && <span className="text-[10px] text-zinc-600">/{target}</span>}
          </p>
        </div>
      </div>
      {active && (
        <Link href={href}
          className="block w-full text-center text-xs font-black py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black transition-colors">
          {btnLabel} →
        </Link>
      )}
      {!active && !done && (
        <Link href={href}
          className="block w-full text-center text-xs font-black py-2 rounded-lg border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-colors">
          {btnLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc, intelCount }: { doc: PipelineDoc; intelCount: number }) {
  const state = getDocPipelineState(doc, intelCount);
  const stages = [
    { key: "upload",   done: true,              label: "Upload"   },
    { key: "analyze",  done: state.isAnalyzed,  label: "Analyze"  },
    { key: "review",   done: state.isReviewed,  label: "Review"   },
    { key: "approved", done: state.isApproved,  label: "Approved" },
    { key: "extract",  done: state.isExtracted, label: "Extracted" },
  ];

  return (
    <div className={`rounded-lg border px-3 py-2 flex items-center gap-3 ${
      state.isComplete ? "border-green-900/40 bg-green-950/10" : "border-zinc-800 bg-zinc-900/30"
    }`}>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{docTitle(doc)}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {stages.map(s => <StagePill key={s.key} done={s.done} label={s.label} />)}
        </div>
        {!state.isComplete && state.blockingLabel && (
          <p className="text-[9px] text-amber-500/70 mt-1">⚡ {state.blockingLabel}</p>
        )}
      </div>
      {state.isComplete && <span className="text-green-500 text-sm shrink-0">✓</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function QASprintClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const [docs,         setDocs]         = useState<PipelineDoc[]>([]);
  const [intelByDoc,   setIntelByDoc]   = useState<Record<string, number>>({});
  const [partsWithData, setPartsWithData] = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [fetchError,   setFetchError]   = useState<string | null>(null);

  const TARGET = 10;

  const fetchData = () => {
    if (!uid) return;
    setLoading(true);
    setFetchError(null);

    const safeQ = <T,>(p: Promise<T>, fb: T, label: string): Promise<T> =>
      p.catch(e => {
        const msg = e?.code ? `${label}: ${String(e.code)}` : `${label}: ${String(e)}`;
        console.warn("[QASprint]", msg, e);
        setFetchError(msg);
        return fb;
      });

    void Promise.all([
      safeQ(getDocs(query(collection(db, "vault_intelligence_docs"), where("ownerId", "==", uid), limit(200))), EMPTY, "vault_intelligence_docs"),
      safeQ(getDocs(query(collection(db, "janta_intelligence"),    where("ownerId", "==", uid), limit(500))), EMPTY, "janta_intelligence"),
      safeQ(getDocs(query(collection(db, "constitutional_framework"), where("ownerId", "==", uid), limit(500))), EMPTY, "constitutional_framework"),
    ]).then(([docsSnap, intelSnap, fwSnap]) => {

      const rawDocs: PipelineDoc[] = (docsSnap.docs ?? [])
        .map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) } as PipelineDoc))
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
  };

  useEffect(() => { fetchData(); }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return null;

  // Pipeline funnel counts — derived from actual doc fields via pipeline engine
  const uploaded  = docs.length;
  const analyzed  = docs.filter(d => getDocPipelineState(d, 0).isAnalyzed).length;
  const reviewed  = docs.filter(d => getDocPipelineState(d, 0).isReviewed).length;
  const approved  = docs.filter(d => getDocPipelineState(d, 0).isApproved).length;
  const extracted = docs.filter(d => getDocPipelineState(d, intelByDoc[d.id] ?? 0).isExtracted).length;

  // QA kit results — each recommendation checked against all docs via pipeline engine
  const kitResults: RecMatchResult[] = KIT_DOCS.map(k =>
    getRecMatchResult({ folder: k.folder, siteUrl: k.siteUrl }, docs, intelByDoc)
  );
  const kitCompleteCount  = kitResults.filter(r => r.status === "complete").length;
  const kitProgressCount  = kitResults.filter(r => r.status === "in_progress").length;

  // Current blocking step
  const nextStep =
    uploaded  === 0 ? 1 :
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
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎯</span>
              <h1 className="text-xl font-black text-white">QA Sprint</h1>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-[10px] font-black px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors disabled:opacity-40"
            >
              {loading ? "…" : "↻ Refresh"}
            </button>
          </div>
          <p className="text-zinc-500 text-sm">
            {TARGET} documents पूरा pipeline मा पार गर्ने लक्ष्य — civic intelligence system को foundation prove गर्ने।
          </p>
        </div>

        {/* Firestore error banner */}
        {fetchError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2 flex items-start gap-2">
            <span className="text-red-400 text-xs shrink-0">⚠</span>
            <div className="min-w-0">
              <p className="text-[10px] text-red-400 font-bold">Firestore error — data load गर्न सकिएन</p>
              <p className="text-[9px] text-red-400/70 font-mono break-all">{fetchError}</p>
            </div>
          </div>
        )}

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
              step={1} label="vault_intelligence_docs — total" labelNp="Upload गरिएको"
              count={uploaded} done={uploaded > 0}
              active={nextStep === 1} href="/vault/documents?upload=1" btnLabel="Documents Upload गर्नुस्"
            />
            <FunnelStage
              step={2} label="processingStatus = ai_ready" labelNp="AI Analyze गरिएको"
              count={analyzed} done={analyzed >= uploaded && uploaded > 0}
              active={nextStep === 2} href="/vault/documents" btnLabel="Documents → AI Analyze"
            />
            <FunnelStage
              step={3} label="adminApprovalStatus reviewed" labelNp="Admin Review गरिएको"
              count={reviewed} done={reviewed >= analyzed && analyzed > 0}
              active={nextStep === 3} href="/vault/admin?tab=documents" btnLabel="Admin Vault → Review गर्नुस्"
            />
            <FunnelStage
              step={4} label="adminApprovalStatus = approved" labelNp="Approve गरिएको"
              count={approved} target={TARGET} done={approved >= TARGET}
              active={nextStep === 4} href="/vault/admin?tab=documents" btnLabel="Documents Approve गर्नुस्"
            />
            <FunnelStage
              step={5} label="janta_intelligence records > 0" labelNp="Intelligence Extract गरिएको"
              count={extracted} done={extracted >= approved && approved > 0}
              active={nextStep === 5} href="/vault/documents" btnLabel="Intelligence Extract गर्नुस्"
            />
            <FunnelStage
              step={6} label="constitutional_framework parts mapped" labelNp="Branch Health Check"
              count={partsWithData} target={35} done={partsWithData >= 18}
              active={nextStep === 6} href="/vault/constitution/health" btnLabel="Branch Health हेर्नुस्"
            />
          </div>
        </div>

        {/* Document Kit */}
        {!loading && approved < TARGET && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">10 Document Kit — सुझाव</p>
              <div className="flex items-center gap-2">
                {kitProgressCount > 0 && (
                  <span className="text-[9px] text-amber-500">⚡ {kitProgressCount} प्रक्रियामा</span>
                )}
                <span className="text-[9px] text-zinc-600">{kitCompleteCount}/{TARGET} पूरा</span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-900/30 bg-amber-950/10 px-3 py-2 mb-3 flex items-start gap-2">
              <span className="text-amber-500 text-xs shrink-0">⚠</span>
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                नेपाल सरकारका websites कहिलेकाहीँ बन्द हुन्छन्। Official site नखुलेमा <strong>Google →</strong> button प्रयोग गर्नुस्।
              </p>
            </div>
            <div className="space-y-1.5">
              {KIT_DOCS.map((doc, i) => (
                <DocKitRow key={i} doc={doc} idx={i} result={kitResults[i]} />
              ))}
            </div>
            <p className="text-zinc-700 text-[9px] mt-2 px-1">
              प्रत्येक document सम्बन्धित सरकारी website बाट PDF download गरेर Upload गर्नुहोस्।
            </p>
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-xs">Documents load हुँदैछ…</div>
        ) : docs.length > 0 ? (
          <div>
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-2">Documents ({docs.length})</p>
            <div className="space-y-1.5">
              {docs.map(d => <DocRow key={d.id} doc={d} intelCount={intelByDoc[d.id] ?? 0} />)}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-700 p-6 text-center space-y-3">
            <p className="text-3xl">📄</p>
            <p className="text-zinc-400 text-sm font-bold">कुनै document upload गरिएको छैन</p>
            {!fetchError && uid && (
              <p className="text-zinc-600 text-[9px]">
                Firestore query सफल — vault_intelligence_docs मा 0 records (uid: {uid.slice(0, 8)}…)
              </p>
            )}
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
                <p className="text-amber-300 text-sm font-bold">{uploaded - analyzed} documents AI analyze बाँकी</p>
                <Link href="/vault/documents" className="block text-center text-sm font-black py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-black transition-colors">Documents → AI Analyze →</Link>
              </>
            )}
            {nextStep === 3 && (
              <>
                <p className="text-amber-300 text-sm font-bold">{analyzed - reviewed} documents Admin Review पर्खिरहेका</p>
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
                <p className="text-amber-300 text-sm font-bold">{approved - extracted} approved documents बाट intelligence extract बाँकी</p>
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
