"use client";

import { useMemo, useState } from "react";
import { useVaultAuth }       from "../../../hooks/vault/useVaultAuth";
import { useVaultAIUsage }    from "../../../hooks/vault/useVaultAIUsage";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import type { VaultAIUsageEntry } from "../../../lib/types/economics";
import type { IntelligenceDocument } from "../../../lib/types/documents";

const PROVIDER_COLOR: Record<string, string> = {
  gemini:    "text-blue-400",
  bedrock:   "text-orange-400",
  anthropic: "text-purple-400",
  unknown:   "text-zinc-500",
};

const STATUS_COLOR: Record<string, string> = {
  success: "bg-green-950 text-green-400 border-green-800",
  error:   "bg-red-950 text-red-400 border-red-800",
};

function JobRow({ entry }: { entry: VaultAIUsageEntry }) {
  const provider = entry.provider.toLowerCase();
  const color    = PROVIDER_COLOR[provider] ?? "text-zinc-400";
  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-800/20 text-xs">
      <td className="py-2 pr-3 text-zinc-500 font-mono whitespace-nowrap">
        {entry.createdAt.slice(0, 16).replace("T", " ")}
      </td>
      <td className={`py-2 pr-3 font-semibold ${color}`}>{entry.provider}</td>
      <td className="py-2 pr-3 text-zinc-400 max-w-32 truncate">{entry.model}</td>
      <td className="py-2 pr-3 text-zinc-500 font-mono">
        {entry.tokensIn.toLocaleString()} / {entry.tokensOut.toLocaleString()}
      </td>
      <td className="py-2 pr-3 text-right">
        <span className={`px-2 py-0.5 rounded-full border text-xs ${STATUS_COLOR[entry.status]}`}>
          {entry.status}
        </span>
      </td>
      <td className="py-2 text-right text-orange-400 font-mono">
        ${entry.estimatedCost.toFixed(5)}
      </td>
    </tr>
  );
}

export default function AIQueueClient() {
  const { user } = useVaultAuth();
  const uid      = user?.uid ?? null;
  const aiUsage  = useVaultAIUsage();
  const docs     = useIntelligenceDocs(uid);

  const [processing, setProcessing] = useState<Set<string>>(new Set());
  const [results,    setResults]    = useState<Record<string, "ok" | "error" | "billing">>({});
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus,   setFilterStatus]   = useState<"all" | "success" | "error">("all");

  // ── Documents awaiting AI ─────────────────────────────────────────────────
  const awaitingAI = useMemo(
    () => docs.docs.filter(d =>
      d.processingStatus === "ready" ||
      d.processingStatus === "ai_paused" ||
      d.processingStatus === "error"
    ),
    [docs.docs],
  );

  // ── Filtered entries ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = aiUsage.entries;
    if (filterProvider !== "all")
      list = list.filter(e => e.provider.toLowerCase() === filterProvider);
    if (filterStatus !== "all")
      list = list.filter(e => e.status === filterStatus);
    return list.slice(0, 100);
  }, [aiUsage.entries, filterProvider, filterStatus]);

  // ── Unique providers ──────────────────────────────────────────────────────
  const providers = useMemo(
    () => ["all", ...new Set(aiUsage.entries.map(e => e.provider.toLowerCase()))],
    [aiUsage.entries],
  );

  // ── Trigger AI on a document ──────────────────────────────────────────────
  async function triggerAnalysis(docId: string, downloadUrl: string, mimeType: string, fileName: string) {
    setProcessing(prev => new Set(prev).add(docId));
    try {
      const res = await fetch("/api/process-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId, downloadUrl, mimeType, fileName, ownerId: uid }),
      });
      const data = await res.json() as { ok?: boolean; code?: string };
      setResults(prev => ({
        ...prev,
        [docId]: data.ok ? "ok" : data.code === "BILLING_EXHAUSTED" ? "billing" : "error",
      }));
    } catch {
      setResults(prev => ({ ...prev, [docId]: "error" }));
    } finally {
      setProcessing(prev => { const s = new Set(prev); s.delete(docId); return s; });
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">AI Queue</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          AI job log, cost visibility, and manual retry for paused analyses
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total AI Calls",   value: aiUsage.entries.length,     color: "text-white" },
          { label: "Successful",       value: aiUsage.totalAnalyses,       color: "text-green-400" },
          { label: "Total Cost",       value: `$${aiUsage.totalCostUSD.toFixed(3)}`, color: "text-orange-400" },
          { label: "Avg per Analysis", value: `$${aiUsage.avgCostPerAnalysis.toFixed(5)}`, color: "text-cyan-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-zinc-500 text-xs mb-1">{label}</p>
            <p className={`text-xl font-black font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Documents awaiting / paused AI */}
      {awaitingAI.length > 0 && (
        <div className="bg-zinc-900 border border-amber-900 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-amber-400">
              Documents Awaiting AI ({awaitingAI.length})
            </p>
            <p className="text-xs text-zinc-500">Click Retry to trigger analysis now</p>
          </div>
          <div className="space-y-2">
            {awaitingAI.map((doc: IntelligenceDocument) => {
              const isRunning = processing.has(doc.id);
              const result    = results[doc.id];
              return (
                <div key={doc.id} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{doc.title}</p>
                    <p className="text-xs text-zinc-500">{doc.fileName} · {doc.processingStatus}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {result === "ok" && <span className="text-green-400 text-xs">✓ Queued</span>}
                    {result === "billing" && <span className="text-red-400 text-xs">Billing exhausted</span>}
                    {result === "error" && <span className="text-red-400 text-xs">Failed</span>}
                    <button
                      onClick={() => triggerAnalysis(doc.id, doc.downloadUrl, doc.mimeType, doc.fileName)}
                      disabled={isRunning || result === "ok"}
                      className="text-xs bg-amber-900/50 text-amber-400 border border-amber-800 hover:bg-amber-900 disabled:bg-zinc-800 disabled:text-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      {isRunning ? "Running…" : "Retry AI"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select
          value={filterProvider}
          onChange={e => setFilterProvider(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
        >
          {providers.map(p => <option key={p} value={p}>{p === "all" ? "All providers" : p}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none"
        >
          <option value="all">All statuses</option>
          <option value="success">Success only</option>
          <option value="error">Errors only</option>
        </select>
        <p className="text-zinc-600 text-xs self-center">{filtered.length} entries shown</p>
      </div>

      {/* AI job log table */}
      {aiUsage.loading ? (
        <p className="text-zinc-600 text-sm">Loading AI usage log…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <p className="text-zinc-600">No AI calls logged yet</p>
          <p className="text-zinc-700 text-sm mt-1">Upload and analyze a document to see entries here</p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-zinc-600 text-xs border-b border-zinc-800 bg-zinc-950">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 pr-3">Provider</th>
                  <th className="text-left py-2 pr-3">Model</th>
                  <th className="text-left py-2 pr-3">Tokens (in/out)</th>
                  <th className="text-right py-2 pr-3">Status</th>
                  <th className="text-right py-2 px-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => <JobRow key={e.id} entry={e} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Provider economics */}
      {aiUsage.providerEconomics.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Provider Economics</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {aiUsage.providerEconomics.map(p => (
              <div key={p.provider} className="bg-zinc-950 rounded-lg p-3">
                <p className={`font-bold text-sm ${PROVIDER_COLOR[p.provider.toLowerCase()] ?? "text-zinc-300"}`}>
                  {p.provider}
                </p>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Calls</span>
                    <span className="text-zinc-300">{p.callCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total cost</span>
                    <span className="text-orange-400">${p.totalCostUSD.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Avg/call</span>
                    <span className="text-zinc-400">${p.avgCostUSD.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Success</span>
                    <span className={p.successRate > 0.9 ? "text-green-400" : "text-amber-400"}>
                      {Math.round(p.successRate * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
