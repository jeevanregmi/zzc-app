"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { collection, getDocs, query, where, updateDoc, doc as firestoreDoc } from "firebase/firestore";
import { db } from "../../app/firebase";
import { useCTOInsights } from "../../hooks/vault/useCTOInsights";
import { systemHealthStatus } from "../../lib/vault/ctoEngine";
import type { CTOInsight, InsightPriority } from "../../lib/vault/ctoEngine";
import { useFounderMode } from "../../contexts/FounderModeContext";
import { readLastSession } from "../../hooks/vault/useSessionTracker";

// ── Constants ─────────────────────────────────────────────────────────────────

const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;
const DISMISS_KEY    = "zzc_cto_dismissed_v2";
const OPEN_KEY       = "zzc_cto_open";

// ── Dismiss storage helpers ───────────────────────────────────────────────────

function readDismissed(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY) ?? "{}") as Record<string, number>; }
  catch { return {}; }
}

function writeDismissed(map: Record<string, number>) {
  try { localStorage.setItem(DISMISS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

function isDismissedFn(id: string): boolean {
  const map = readDismissed();
  const ts  = map[id];
  if (!ts) return false;
  if (Date.now() - ts > DISMISS_TTL_MS) { delete map[id]; writeDismissed(map); return false; }
  return true;
}

function dismissInsight(id: string) {
  const map = readDismissed(); map[id] = Date.now(); writeDismissed(map);
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STYLE: Record<InsightPriority, {
  bg: string; border: string; text: string; dot: string;
}> = {
  critical: { bg: "bg-red-950/60",   border: "border-red-800/70",   text: "text-red-400",    dot: "bg-red-500"    },
  high:     { bg: "bg-amber-950/50", border: "border-amber-800/60", text: "text-amber-400",  dot: "bg-amber-500"  },
  medium:   { bg: "bg-zinc-900/60",  border: "border-zinc-800",     text: "text-blue-400",   dot: "bg-blue-500"   },
  low:      { bg: "bg-zinc-900/40",  border: "border-zinc-800",     text: "text-zinc-400",   dot: "bg-zinc-500"   },
};

const HEALTH_META = {
  critical:  { np: "तुरुन्त हेर्नुस्",  dot: "bg-red-500",   text: "text-red-400"   },
  attention: { np: "ध्यान दिनुस्",      dot: "bg-amber-500", text: "text-amber-400" },
  progress:  { np: "राम्रो progress",   dot: "bg-blue-400",  text: "text-blue-400"  },
  healthy:   { np: "System राम्रो छ",   dot: "bg-green-500", text: "text-green-400" },
};

const PRIORITY_LABEL: Record<InsightPriority, string> = {
  critical: "🚨 तुरुन्त action चाहिन्छ",
  high:     "⚡ अहिलेको सबैभन्दा महत्त्वपूर्ण काम",
  medium:   "📋 अर्को recommended step",
  low:      "💡 हेर्नुस्",
};

// ── Primary insight card ──────────────────────────────────────────────────────

function PrimaryCard({
  insight,
  onDismiss,
  isDebug,
}: {
  insight:   CTOInsight;
  onDismiss: (id: string) => void;
  isDebug:   boolean;
}) {
  const s = STYLE[insight.priority];
  const [showWhy,  setShowWhy]  = useState(false);
  const [showCost, setShowCost] = useState(false);

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${s.bg} ${s.border}`}>
      {/* Priority label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
          <span className={`text-[9px] font-black uppercase tracking-widest ${s.text}`}>
            {PRIORITY_LABEL[insight.priority]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isDebug && (
            <span className="text-[8px] text-zinc-700 font-mono">{insight.type}</span>
          )}
          {insight.dismissable && (
            <button
              onClick={() => onDismiss(insight.id)}
              className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors"
              title="24 घण्टाको लागि dismiss गर्नुस्"
            >
              ✓ review गरें
            </button>
          )}
        </div>
      </div>

      {/* Icon + title + body */}
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 leading-none mt-0.5">{insight.icon}</span>
        <div className="min-w-0 space-y-1">
          <p className="text-white font-black text-sm leading-snug">{insight.titleNp}</p>
          <p className="text-zinc-400 text-xs leading-relaxed">{insight.bodyNp}</p>
        </div>
      </div>

      {/* Cost guard — shown inline before AI actions */}
      {insight.costWarning && (
        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="text-amber-400 text-xs shrink-0">💰</span>
            <p className="text-amber-400/80 text-[10px] leading-relaxed">{insight.costWarning}</p>
          </div>
        </div>
      )}

      {/* Primary action — two-click for AI-cost actions */}
      {insight.actionHref && insight.actionLabel && (
        insight.costWarning ? (
          showCost ? (
            <Link
              href={insight.actionHref}
              className="block text-center text-sm font-black py-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
            >
              {insight.actionLabel} →
            </Link>
          ) : (
            <button
              onClick={() => setShowCost(true)}
              className={`w-full text-center text-sm font-black py-2.5 rounded-xl border transition-colors ${s.border} ${s.text} hover:bg-white hover:text-black hover:border-transparent`}
            >
              {insight.actionLabel} →
            </button>
          )
        ) : (
          <Link
            href={insight.actionHref}
            className="block text-center text-sm font-black py-2.5 rounded-xl bg-white text-black hover:bg-zinc-100 transition-colors"
          >
            {insight.actionLabel} →
          </Link>
        )
      )}

      {/* "यो किन देखिँदैछ?" expandable */}
      <button
        onClick={() => setShowWhy(p => !p)}
        className="w-full text-left text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
      >
        <span>{showWhy ? "▾" : "▸"}</span>
        यो किन देखिँदैछ?
      </button>
      {showWhy && (
        <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl px-3 py-2.5">
          <p className="text-zinc-400 text-[10px] leading-relaxed">{insight.whyNp}</p>
          {isDebug && (
            <p className="text-zinc-700 text-[9px] font-mono mt-2">id: {insight.id} · priority: {insight.priority}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact insight card ──────────────────────────────────────────────────────

function CompactCard({
  insight,
  onDismiss,
  isDebug,
}: {
  insight:   CTOInsight;
  onDismiss: (id: string) => void;
  isDebug:   boolean;
}) {
  const s = STYLE[insight.priority];
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className={`rounded-xl border px-3 py-2.5 space-y-1.5 ${s.border} bg-zinc-950/40`}>
      <div className="flex items-start gap-2.5">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs font-bold leading-snug">{insight.titleNp}</p>
          <p className="text-zinc-500 text-[10px] leading-relaxed mt-0.5">{insight.bodyNp}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {insight.actionHref && (
            <Link href={insight.actionHref} className={`text-[11px] font-black hover:opacity-80 ${s.text}`}>→</Link>
          )}
          {insight.dismissable && (
            <button onClick={() => onDismiss(insight.id)} className="text-[9px] text-zinc-700 hover:text-zinc-500" title="dismiss">✓</button>
          )}
        </div>
      </div>
      <button
        onClick={() => setShowWhy(p => !p)}
        className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors flex items-center gap-1 ml-4"
      >
        <span>{showWhy ? "▾" : "▸"}</span>
        किन?
      </button>
      {showWhy && (
        <div className="ml-4 bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-2.5 py-2">
          <p className="text-zinc-500 text-[10px] leading-relaxed">{insight.whyNp}</p>
          {insight.costWarning && (
            <p className="text-amber-500/70 text-[10px] mt-1 leading-relaxed">💰 {insight.costWarning}</p>
          )}
          {isDebug && (
            <p className="text-zinc-700 text-[9px] font-mono mt-1">id: {insight.id}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Healthy state card ────────────────────────────────────────────────────────

function HealthyCard({ insight }: { insight: CTOInsight }) {
  return (
    <div className="rounded-2xl border border-green-900/60 bg-green-950/20 p-5 space-y-3 text-center">
      <p className="text-3xl">🌳</p>
      <div>
        <p className="text-green-400 font-black text-sm">{insight.titleNp}</p>
        <p className="text-zinc-500 text-xs leading-relaxed mt-1">{insight.bodyNp}</p>
      </div>
      {insight.actionHref && insight.actionLabel && (
        <Link
          href={insight.actionHref}
          className="inline-block text-xs font-bold text-green-400 hover:text-green-300 border border-green-800/60 rounded-xl px-4 py-2 transition-colors"
        >
          {insight.actionLabel} →
        </Link>
      )}
    </div>
  );
}

// ── Debug snapshot panel ──────────────────────────────────────────────────────

function DebugPanel({ snapshot }: { snapshot: NonNullable<ReturnType<typeof useCTOInsights>["snapshot"]> }) {
  return (
    <div className="rounded-xl border border-orange-900/50 bg-orange-950/10 p-3 space-y-1.5">
      <p className="text-[9px] text-orange-500 uppercase tracking-widest font-black mb-2">🛠 Debug Snapshot</p>
      {[
        ["vault_documents",        snapshot.docsTotal],
        ["janta_intelligence",     snapshot.totalIntel],
        ["constitutional_framework", snapshot.totalFramework],
        ["broken partNumber=0",    snapshot.brokenFrameworkRecords],
        ["janta_relationships",    snapshot.totalRelationships],
        ["low confidence intel",   snapshot.lowConfidenceIntel],
        ["empty parts",            snapshot.emptyParts.length],
        ["days since signal",      snapshot.daysSinceLastSignal ?? "—"],
      ].map(([label, val]) => (
        <div key={String(label)} className="flex items-center justify-between">
          <span className="text-zinc-600 text-[9px] font-mono">{label}</span>
          <span className="text-orange-300 text-[9px] font-black">{String(val)}</span>
        </div>
      ))}
    </div>
  );
}

// ── CTO Command Center ────────────────────────────────────────────────────────

function devanagariToInt(s: string): number {
  const converted = s.replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966)).replace(/[^\d]/g, "");
  const n = parseInt(converted, 10);
  return isNaN(n) ? 0 : n;
}

type CmdStatus = "idle" | "running" | "done" | "error";

interface VaultDoc {
  id:                  string;
  processingStatus?:   string;
  adminApprovalStatus?: string;
  title?:              string;
  fileName?:           string;
  downloadUrl?:        string;
  mimeType?:           string;
  aiSummary?:          string;
  nepaliExplainer?:    string;
  affectedSectors?:    string[];
  aiKeyInsights?:      string[];
  detectedTopics?:     string[];
  uploadedAt?:         string;
  category?:           string;
}

function CommandCenter({ uid }: { uid: string }) {
  const [log,        setLog]        = useState<string[]>([]);
  const [repairSt,   setRepairSt]   = useState<CmdStatus>("idle");
  const [analyzeSt,  setAnalyzeSt]  = useState<CmdStatus>("idle");
  const [extractSt,  setExtractSt]  = useState<CmdStatus>("idle");
  const [showAnalyze, setShowAnalyze] = useState(false);
  const [showExtract, setShowExtract] = useState(false);

  const addLog = (msg: string) => setLog(p => [`${new Date().toLocaleTimeString("ne-NP")} — ${msg}`, ...p.slice(0, 19)]);

  // ── 1. PartNumber Repair ──
  const runRepair = async () => {
    setRepairSt("running");
    addLog("🔧 constitutional_framework scan गर्दैछ…");
    try {
      const snap = await getDocs(query(collection(db, "constitutional_framework"), where("ownerId", "==", uid)));
      const broken = snap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return (data.partNumber as number ?? 0) === 0 || (data.article as number ?? 0) === 0;
      });
      if (broken.length === 0) {
        addLog("✅ सबै records मा सही partNumber छ — repair आवश्यक छैन।");
        setRepairSt("done"); return;
      }
      addLog(`⚠ ${broken.length} records repair गर्नुपर्छ — fixing…`);
      let fixed = 0;
      for (const d of broken) {
        const data = d.data() as Record<string, unknown>;
        const updates: Record<string, number> = {};
        if ((data.partNumber as number ?? 0) === 0 && data.part) {
          const pn = devanagariToInt(data.part as string);
          if (pn > 0) updates.partNumber = pn;
        }
        if ((data.article as number ?? 0) === 0 && data.articleId) {
          const match = (data.articleId as string).match(/^art-(\d+)/);
          if (match) { const an = parseInt(match[1], 10); if (!isNaN(an) && an > 0) updates.article = an; }
        }
        if (Object.keys(updates).length > 0) {
          await updateDoc(firestoreDoc(db, "constitutional_framework", d.id), updates);
          fixed++;
        }
      }
      addLog(`✅ Repair सम्पन्न — ${fixed} records ठीक गरियो।`);
      setRepairSt("done");
    } catch (e) {
      addLog(`❌ Repair failed: ${e instanceof Error ? e.message : String(e)}`);
      setRepairSt("error");
    }
  };

  // ── 2. Analyze All Pending ──
  const runAnalyzeAll = async () => {
    setAnalyzeSt("running"); setShowAnalyze(false);
    addLog("🤖 pending documents scan गर्दैछ…");
    try {
      const snap = await getDocs(query(collection(db, "vault_documents"), where("ownerId", "==", uid)));
      const pending = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as VaultDoc))
        .filter(d => d.processingStatus === "ready");
      if (pending.length === 0) {
        addLog("✅ कुनै pending document छैन।");
        setAnalyzeSt("done"); return;
      }
      addLog(`📄 ${pending.length} documents analyze गर्दैछ…`);
      let done = 0;
      for (const d of pending) {
        addLog(`🔄 (${done + 1}/${pending.length}) ${String(d.title || d.fileName || d.id).slice(0, 40)}…`);
        await updateDoc(firestoreDoc(db, "vault_documents", d.id), { processingStatus: "processing_ai" });
        try {
          const res = await fetch("/api/process-document", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ docId: d.id, downloadUrl: d.downloadUrl, mimeType: d.mimeType, fileName: d.fileName }),
          });
          const data = await res.json() as { ok?: boolean; error?: string; code?: string };
          if (!res.ok || data.error) {
            const aiPaused = ["BILLING_EXHAUSTED", "NO_PROVIDERS", "AI_UNAVAILABLE", "TIMEOUT"].includes(data.code ?? "");
            await updateDoc(firestoreDoc(db, "vault_documents", d.id), { processingStatus: aiPaused ? "ai_paused" : "ready" });
            addLog(`⚠ ${String(d.title || d.id).slice(0, 30)} — ${data.error ?? "failed"}`);
          } else {
            await updateDoc(firestoreDoc(db, "vault_documents", d.id), { processingStatus: "ai_ready", adminApprovalStatus: "pending_review" });
            addLog(`✓ ${String(d.title || d.id).slice(0, 30)} — AI ready`);
            done++;
          }
        } catch (err) {
          await updateDoc(firestoreDoc(db, "vault_documents", d.id), { processingStatus: "ready" });
          addLog(`❌ ${String(d.title || d.id).slice(0, 30)} — ${err instanceof Error ? err.message : "error"}`);
        }
      }
      addLog(`✅ Analyze batch सम्पन्न — ${done}/${pending.length} सफल।`);
      setAnalyzeSt("done");
    } catch (e) {
      addLog(`❌ Analyze failed: ${e instanceof Error ? e.message : String(e)}`);
      setAnalyzeSt("error");
    }
  };

  // ── 3. Extract All Approved ──
  const runExtractAll = async () => {
    setExtractSt("running"); setShowExtract(false);
    addLog("⚡ approved documents scan गर्दैछ…");
    try {
      const [docsSnap, intelSnap] = await Promise.all([
        getDocs(query(collection(db, "vault_documents"), where("ownerId", "==", uid))),
        getDocs(query(collection(db, "janta_intelligence"), where("ownerId", "==", uid))),
      ]);
      const intelByDoc: Record<string, number> = {};
      intelSnap.docs.forEach(d => {
        const docId = (d.data() as Record<string, unknown>).docId as string;
        if (docId) intelByDoc[docId] = (intelByDoc[docId] ?? 0) + 1;
      });
      const approved = docsSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as VaultDoc))
        .filter(d => d.adminApprovalStatus === "approved" && (intelByDoc[d.id] ?? 0) === 0);
      if (approved.length === 0) {
        addLog("✅ Extract गर्नुपर्ने कुनै approved document छैन।");
        setExtractSt("done"); return;
      }
      addLog(`📋 ${approved.length} documents extract गर्दैछ…`);
      let done = 0;
      for (const d of approved) {
        addLog(`🔄 (${done + 1}/${approved.length}) ${String(d.title || d.fileName || d.id).slice(0, 40)}…`);
        const text = [d.aiSummary, d.nepaliExplainer, ...(Array.isArray(d.affectedSectors) ? d.affectedSectors : []), ...(Array.isArray(d.aiKeyInsights) ? d.aiKeyInsights : [])].filter(Boolean).join("\n\n");
        if (!text) { addLog(`⚠ ${String(d.title || d.id).slice(0, 30)} — text छैन, skip`); continue; }
        try {
          const res = await fetch("/api/extract-intelligence", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, downloadUrl: d.downloadUrl, mimeType: d.mimeType, docTitle: d.title, docType: (Array.isArray(d.detectedTopics) ? d.detectedTopics[0] : undefined) ?? "government document", sourceYear: new Date(String(d.uploadedAt)).getFullYear().toString(), ownerId: uid, docId: d.id, domain: d.category === "finance" ? "finance" : "janta" }),
          });
          const data = await res.json() as { ok: boolean; totalFound?: number; error?: string };
          if (data.ok) { addLog(`✓ ${String(d.title || d.id).slice(0, 30)} — ${data.totalFound ?? 0} intel records`); done++; }
          else { addLog(`⚠ ${String(d.title || d.id).slice(0, 30)} — ${data.error ?? "failed"}`); }
        } catch (err) {
          addLog(`❌ ${String(d.title || d.id).slice(0, 30)} — ${err instanceof Error ? err.message : "error"}`);
        }
      }
      addLog(`✅ Extract batch सम्पन्न — ${done}/${approved.length} सफल।`);
      setExtractSt("done");
    } catch (e) {
      addLog(`❌ Extract failed: ${e instanceof Error ? e.message : String(e)}`);
      setExtractSt("error");
    }
  };

  const statusColor = (s: CmdStatus) => s === "done" ? "text-green-400" : s === "error" ? "text-red-400" : s === "running" ? "text-amber-400" : "text-zinc-500";
  const statusIcon  = (s: CmdStatus) => s === "done" ? "✅" : s === "error" ? "❌" : s === "running" ? "⟳" : "▶";

  return (
    <div className="space-y-3">
      <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black">⚡ Command Center — Direct Execute</p>

      {/* ── Repair ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-black">🔧 PartNumber Repair</p>
            <p className="text-zinc-500 text-[10px] mt-0.5">partNumber=0 records fix गर्छ — free, instant</p>
          </div>
          <span className={`text-[10px] font-black ${statusColor(repairSt)}`}>{statusIcon(repairSt)}</span>
        </div>
        <button
          onClick={runRepair}
          disabled={repairSt === "running"}
          className="w-full py-2 rounded-lg text-xs font-black bg-purple-900/60 border border-purple-700/60 text-purple-300 hover:bg-purple-800/60 disabled:opacity-40 transition-colors"
        >
          {repairSt === "running" ? "Repair हुँदैछ…" : "Run Repair"}
        </button>
      </div>

      {/* ── Analyze All ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-black">🤖 Analyze All Pending</p>
            <p className="text-zinc-500 text-[10px] mt-0.5">सबै ready docs AI analyze गर्छ · AI cost लाग्छ</p>
          </div>
          <span className={`text-[10px] font-black ${statusColor(analyzeSt)}`}>{statusIcon(analyzeSt)}</span>
        </div>
        {!showAnalyze && analyzeSt !== "running" ? (
          <button onClick={() => setShowAnalyze(true)} className="w-full py-2 rounded-lg text-xs font-black bg-amber-900/40 border border-amber-700/50 text-amber-300 hover:bg-amber-800/40 transition-colors">
            Run Analyze All →
          </button>
        ) : showAnalyze ? (
          <div className="space-y-1.5">
            <p className="text-amber-400 text-[10px] leading-relaxed">⚠ प्रत्येक document मा AI cost लाग्छ। Gemini Flash use हुन्छ।</p>
            <div className="flex gap-2">
              <button onClick={runAnalyzeAll} className="flex-1 py-2 rounded-lg text-xs font-black bg-amber-600 text-black hover:bg-amber-500 transition-colors">✓ Confirm — Run</button>
              <button onClick={() => setShowAnalyze(false)} className="px-3 py-2 rounded-lg text-xs text-zinc-500 border border-zinc-700 hover:text-white transition-colors">रद्द</button>
            </div>
          </div>
        ) : (
          <p className="text-amber-400 text-[10px]">⟳ Analyze हुँदैछ — log हेर्नुस्…</p>
        )}
      </div>

      {/* ── Extract All ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white text-xs font-black">⚡ Extract All Approved</p>
            <p className="text-zinc-500 text-[10px] mt-0.5">approved + 0 intel docs बाट janta_intelligence extract गर्छ</p>
          </div>
          <span className={`text-[10px] font-black ${statusColor(extractSt)}`}>{statusIcon(extractSt)}</span>
        </div>
        {!showExtract && extractSt !== "running" ? (
          <button onClick={() => setShowExtract(true)} className="w-full py-2 rounded-lg text-xs font-black bg-blue-900/40 border border-blue-700/50 text-blue-300 hover:bg-blue-800/40 transition-colors">
            Run Extract All →
          </button>
        ) : showExtract ? (
          <div className="space-y-1.5">
            <p className="text-blue-400 text-[10px] leading-relaxed">⚠ Approved documents मा AI extraction run हुन्छ — intelligence records बन्छन्।</p>
            <div className="flex gap-2">
              <button onClick={runExtractAll} className="flex-1 py-2 rounded-lg text-xs font-black bg-blue-600 text-white hover:bg-blue-500 transition-colors">✓ Confirm — Run</button>
              <button onClick={() => setShowExtract(false)} className="px-3 py-2 rounded-lg text-xs text-zinc-500 border border-zinc-700 hover:text-white transition-colors">रद्द</button>
            </div>
          </div>
        ) : (
          <p className="text-blue-400 text-[10px]">⟳ Extract हुँदैछ — log हेर्नुस्…</p>
        )}
      </div>

      {/* ── Approve note ── */}
      <div className="rounded-xl border border-zinc-800/50 px-3 py-2.5">
        <p className="text-zinc-600 text-[10px] leading-relaxed">🔒 <strong className="text-zinc-500">Admin Approve</strong> — quality gate हो, कहिल्यै automate हुँदैन। <Link href="/vault/admin" className="text-zinc-400 hover:text-white">Admin Vault →</Link></p>
      </div>

      {/* ── Live log ── */}
      {log.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-black/60 p-3 space-y-1 max-h-48 overflow-y-auto">
          <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-black mb-1.5">Live Log</p>
          {log.map((l, i) => (
            <p key={i} className="text-[10px] font-mono text-zinc-400 leading-relaxed">{l}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CTOAssistant({ uid }: { uid: string | null }) {
  const [open,      setOpen]      = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastSession, setLastSession] = useState<ReturnType<typeof readLastSession>>(null);

  const { isDebug, isFounder } = useFounderMode();
  const { insights: rawInsights, snapshot, loading, lastRefresh, refresh } = useCTOInsights(uid);

  // Restore panel open state
  useEffect(() => {
    try { if (localStorage.getItem(OPEN_KEY) === "true") setOpen(true); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(OPEN_KEY, String(open)); } catch { /* ignore */ }
  }, [open]);

  // Read last session when panel opens
  useEffect(() => {
    if (open) setLastSession(readLastSession());
  }, [open]);

  // Sync dismissed from storage on mount
  useEffect(() => {
    const map = readDismissed();
    const active = Object.entries(map)
      .filter(([, ts]) => Date.now() - ts < DISMISS_TTL_MS)
      .map(([id]) => id);
    if (active.length > 0) setDismissed(new Set(active));
  }, []);

  const insights = rawInsights.filter(i => i.priority === "critical" || !dismissed.has(i.id));

  const handleDismiss = useCallback((id: string) => {
    dismissInsight(id);
    setDismissed(prev => new Set([...prev, id]));
  }, []);

  if (!uid) return null;

  const health        = systemHealthStatus(insights);
  const hl            = HEALTH_META[health];
  const criticalCount = insights.filter(i => i.priority === "critical").length;
  const highCount     = insights.filter(i => i.priority === "high").length;
  const urgentCount   = criticalCount + highCount;

  const [panelTab, setPanelTab] = useState<"insights" | "commands">("insights");

  const isHealthy    = insights.length === 1 && insights[0]?.type === "system_healthy";
  const topInsight   = insights[0] ?? null;
  const restInsights = insights.slice(1);

  const minutesSince = lastRefresh
    ? Math.floor((Date.now() - lastRefresh.getTime()) / 60_000)
    : null;

  // Last session is only worth showing if it's >15 min old (not the current active page)
  const sessionAge = lastSession ? Math.floor((Date.now() - lastSession.ts) / 60_000) : null;
  const showSession = lastSession && sessionAge !== null && sessionAge > 15;

  return (
    <>
      {/* ── Floating dock button ──────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(p => !p)}
        title="🧠 Founder Cockpit — system state, next actions, blocked pipelines"
        className={`
          fixed bottom-5 right-5 z-50
          flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-2xl shadow-2xl
          transition-all duration-200 select-none border-2
          ${open
            ? "bg-zinc-800 border-zinc-500 text-white"
            : urgentCount > 0
              ? "bg-zinc-950 border-amber-600 text-white hover:border-amber-400"
              : "bg-zinc-950 border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:text-white"
          }
        `}
      >
        <span className="text-base leading-none">🧠</span>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[11px] font-black tracking-wide">Founder Cockpit</span>
          <span className={`text-[9px] font-semibold mt-0.5 ${hl.text}`}>{hl.np}</span>
        </div>
        {urgentCount > 0 ? (
          <span className={`
            text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none shrink-0
            ${criticalCount > 0 ? "bg-red-600 text-white animate-pulse" : "bg-amber-500 text-black"}
          `}>
            {urgentCount}
          </span>
        ) : (
          <span className={`w-2 h-2 rounded-full shrink-0 ${hl.dot} ${loading ? "animate-pulse" : ""}`} />
        )}
      </button>

      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-30 lg:hidden bg-black/70" onClick={() => setOpen(false)} />
      )}

      {/* ── Side panel ───────────────────────────────────────────────────── */}
      {open && (
        <div className="fixed top-0 right-0 bottom-0 z-40 w-full sm:w-[390px] bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">

          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="text-lg leading-none">🧠</span>
              <div>
                <p className="text-white font-black text-sm leading-none">Founder Cockpit</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${hl.dot}`} />
                  <span className={`text-[10px] font-bold ${hl.text}`}>{hl.np}</span>
                  {isDebug && (
                    <span className="text-[9px] text-orange-500 border border-orange-800/60 rounded px-1 py-0.5 ml-1">🛠 Debug</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { void refresh(); }}
                disabled={loading}
                title="System state refresh गर्नुस्"
                className="text-zinc-600 hover:text-white text-sm transition-colors disabled:opacity-30 font-mono w-5 text-center"
              >
                {loading ? "⟳" : "↺"}
              </button>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white text-xl leading-none transition-colors">
                ×
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 px-4 shrink-0">
            {([
              { id: "insights",  label: "💡 Insights" },
              { id: "commands",  label: "⚡ Commands" },
            ] as const).map(t => (
              <button
                key={t.id}
                onClick={() => setPanelTab(t.id)}
                className={`px-3 py-2 text-[11px] font-black border-b-2 transition-colors ${panelTab === t.id ? "border-white text-white" : "border-transparent text-zinc-600 hover:text-zinc-400"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">

            {/* ── Commands tab ── */}
            {panelTab === "commands" && <CommandCenter uid={uid} />}

            {/* ── Insights tab ── */}
            {panelTab === "insights" && <>

            {/* Last session continuity banner */}
            {showSession && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2.5 flex items-center gap-2.5">
                <span className="text-base shrink-0">🕐</span>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-black">
                    अघिल्लो session — {sessionAge! < 60 ? `${sessionAge} min` : `${Math.floor(sessionAge! / 60)} घण्टा`} अगाडि
                  </p>
                  <p className="text-zinc-300 text-xs font-bold mt-0.5 leading-snug">{lastSession!.labelNp}</p>
                </div>
                <Link href={lastSession!.href} className="shrink-0 text-[10px] text-zinc-500 hover:text-white transition-colors font-black">
                  जाने →
                </Link>
              </div>
            )}

            {/* Loading */}
            {loading && !snapshot && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-3xl animate-pulse">🧠</span>
                <p className="text-zinc-600 text-xs">System state load हुँदैछ…</p>
              </div>
            )}

            {/* Snapshot stats row */}
            {snapshot && (
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: "Documents",   sub: isDebug ? "vault_documents" : "uploaded",         value: snapshot.docsTotal,     color: "text-white"                                               },
                  { label: "Intelligence", sub: isDebug ? "janta_intelligence" : "records",       value: snapshot.totalIntel,    color: snapshot.totalIntel > 0     ? "text-blue-400"  : "text-zinc-600" },
                  { label: "Branches",    sub: isDebug ? "constitutional_framework" : `${snapshot.partsWithData}/35`, value: snapshot.partsWithData, color: snapshot.partsWithData > 0 ? "text-green-400" : "text-zinc-600" },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-zinc-800/60 rounded-xl p-2.5 text-center">
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-zinc-600 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
                    {isDebug && <p className="text-zinc-700 text-[8px] font-mono mt-0.5 truncate">{s.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Healthy state */}
            {isHealthy && topInsight && <HealthyCard insight={topInsight} />}

            {/* Active insights */}
            {!isHealthy && topInsight && (
              <PrimaryCard insight={topInsight} onDismiss={handleDismiss} isDebug={isDebug} />
            )}
            {!isHealthy && restInsights.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold px-0.5">अरू सुझाव</p>
                {restInsights.map(ins => (
                  <CompactCard key={ins.id} insight={ins} onDismiss={handleDismiss} isDebug={isDebug} />
                ))}
              </div>
            )}

            {/* Dismissed count */}
            {dismissed.size > 0 && (
              <button
                onClick={() => { writeDismissed({}); setDismissed(new Set()); }}
                className="w-full text-[10px] text-zinc-700 hover:text-zinc-500 transition-colors py-1"
              >
                {dismissed.size} suggestion dismiss गरिएको — reset गर्नुस्
              </button>
            )}

            {/* Constitution branch progress */}
            {snapshot && snapshot.totalFramework > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">
                    {isDebug ? "constitutional_framework — Branches" : "संविधान Branches"}
                  </p>
                  <Link href="/vault/constitution/health" className="text-[10px] text-zinc-600 hover:text-white transition-colors">Health →</Link>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.round((snapshot.partsWithData / 35) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-white shrink-0">{snapshot.partsWithData}/35</span>
                </div>
                {snapshot.brokenFrameworkRecords > 0 && (
                  <p className="text-amber-600 text-[10px]">
                    {snapshot.brokenFrameworkRecords} धाराहरू सही भागमा पुगेका छैनन् —
                    <Link href="/vault/constitution" className="text-amber-400 ml-1 hover:text-amber-300">मिलाउनुस् →</Link>
                  </p>
                )}
                {snapshot.emptyParts.length > 0 && snapshot.brokenFrameworkRecords === 0 && (
                  <p className="text-zinc-600 text-[10px]">
                    खाली: भाग {snapshot.emptyParts.slice(0, 6).join(", ")}
                    {snapshot.emptyParts.length > 6 ? ` +${snapshot.emptyParts.length - 6} थप` : ""}
                  </p>
                )}
              </div>
            )}

            {/* Debug raw snapshot */}
            {isDebug && snapshot && <DebugPanel snapshot={snapshot} />}

            {/* Glossary — founder mode shows plain Nepali only */}
            {isFounder && (
              <details className="group">
                <summary className="text-[10px] text-zinc-700 hover:text-zinc-500 cursor-pointer transition-colors list-none flex items-center gap-1 px-0.5 py-1">
                  <span className="group-open:hidden">▸</span>
                  <span className="hidden group-open:inline">▾</span>
                  Terms को अर्थ बुझ्नुस्
                </summary>
                <div className="mt-2 space-y-1.5">
                  {[
                    { term: "Documents",    np: "Vault मा upload गरिएका सरकारी documents — Budget, Policy, संविधान आदि।" },
                    { term: "Intelligence", np: "Documents बाट निकालिएका policy points, हकहरू, promises, facts — जनताका लागि।" },
                    { term: "Branches",     np: "संविधानका ३५ भागहरू — प्रत्येक भागमा कति intelligence छ भन्ने मापन।" },
                    { term: "Deep Extract", np: "Approved document बाट Intelligence cards र connections निकाल्ने step। AI cost लाग्छ।" },
                    { term: "Admin Review", np: "AI output verify गर्ने step — approve नगरी Intelligence public हुँदैन।" },
                  ].map(({ term, np }) => (
                    <div key={term} className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl px-3 py-2">
                      <p className="text-zinc-300 text-[10px] font-bold">{term}</p>
                      <p className="text-zinc-600 text-[10px] mt-0.5 leading-relaxed">{np}</p>
                    </div>
                  ))}
                </div>
              </details>
            )}

            </>}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between shrink-0">
            <p className="text-zinc-700 text-[10px]">
              {loading ? "Refreshing…"
                : minutesSince === 0 ? "भर्खरै"
                : minutesSince !== null ? `${minutesSince} min अगाडि`
                : "—"}
            </p>
            <Link href="/vault/constitution/health" className="text-[10px] text-zinc-600 hover:text-white transition-colors">
              Full Health →
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
