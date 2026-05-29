"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../app/firebase";
import { formatCost } from "../../lib/vault/knowledgePriority";

interface AtomicLog {
  id:               string;
  docId:            string;
  docTitle:         string;
  recordsSaved:     number;
  recordsRejected:  number;
  estimatedCostUSD: number;
  pageCount?:       number;
  fileSizeBytes?:   number;
  govFolder?:       string;
  domain:           string;
  runAt:            string;
}

interface Props {
  ownerId: string;
}

export function AtomicHistory({ ownerId }: Props) {
  const [logs,    setLogs]    = useState<AtomicLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(true);

  useEffect(() => {
    if (!ownerId) return;
    getDocs(query(
      collection(db, "atomic_extraction_logs"),
      where("ownerId", "==", ownerId),
      orderBy("runAt", "desc"),
      limit(50),
    )).then(snap => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AtomicLog)));
    }).catch(() => {
      // orderBy("runAt") needs a Firestore index — fall back to unordered query
      return getDocs(query(
        collection(db, "atomic_extraction_logs"),
        where("ownerId", "==", ownerId),
        limit(50),
      )).then(snap => {
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() } as AtomicLog));
        rows.sort((a, b) => b.runAt.localeCompare(a.runAt));
        setLogs(rows);
      }).catch(() => {});
    }).finally(() => setLoading(false));
  }, [ownerId]);

  if (!loading && logs.length === 0) return null;

  const totalRecords = logs.reduce((s, l) => s + l.recordsSaved, 0);
  const totalCost    = logs.reduce((s, l) => s + l.estimatedCostUSD, 0);
  const totalRuns    = logs.length;

  function fmtDate(iso: string) {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ne-NP", { year: "numeric", month: "short", day: "numeric" })
        + " " + d.toLocaleTimeString("ne-NP", { hour: "2-digit", minute: "2-digit" });
    } catch { return iso.slice(0, 16).replace("T", " "); }
  }

  return (
    <div className="rounded-2xl border border-violet-800/30 bg-violet-950/10 overflow-hidden">

      {/* Header */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-violet-950/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div className="text-left">
            <p className="text-violet-200 font-black text-sm">Atomic Extraction History</p>
            <p className="text-violet-600/70 text-xs mt-0.5">
              {loading ? "लोड हुँदैछ…" : `${totalRuns} run · ${totalRecords.toLocaleString()} records · ${formatCost(totalCost)} खर्च`}
            </p>
          </div>
        </div>
        <span className="text-zinc-600 text-xs">{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="border-t border-violet-800/20">

          {/* Summary strip */}
          <div className="grid grid-cols-3 divide-x divide-violet-900/30 border-b border-violet-800/20">
            <div className="px-4 py-3 text-center">
              <p className="text-violet-300 font-black text-lg">{totalRuns}</p>
              <p className="text-zinc-600 text-[10px]">Runs</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-white font-black text-lg">{totalRecords.toLocaleString()}</p>
              <p className="text-zinc-600 text-[10px]">Atomic Records</p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-amber-400 font-black text-lg">{formatCost(totalCost)}</p>
              <p className="text-zinc-600 text-[10px]">अनुमानित खर्च</p>
            </div>
          </div>

          {/* Log list */}
          {loading ? (
            <div className="px-5 py-6 text-center text-zinc-600 text-xs animate-pulse">लोड हुँदैछ…</div>
          ) : (
            <div className="divide-y divide-violet-900/20">
              {logs.map(log => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  {/* Status dot */}
                  <span className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold truncate">{log.docTitle}</p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-green-400 text-[10px] font-bold">
                        {log.recordsSaved} records saved
                      </span>
                      {log.recordsRejected > 0 && (
                        <span className="text-red-500/70 text-[10px]">
                          {log.recordsRejected} rejected
                        </span>
                      )}
                      {log.pageCount && (
                        <span className="text-zinc-600 text-[10px] font-mono">{log.pageCount}p</span>
                      )}
                      {log.govFolder && (
                        <span className="text-zinc-600 text-[10px]">{log.govFolder}</span>
                      )}
                    </div>
                    <p className="text-zinc-700 text-[10px] mt-0.5">{fmtDate(log.runAt)}</p>
                  </div>

                  {/* Cost */}
                  <span className="text-amber-500 text-xs font-mono font-bold shrink-0">
                    {formatCost(log.estimatedCostUSD)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ZZC principle note */}
          <div className="px-5 py-3 bg-zinc-950/20 border-t border-violet-900/20">
            <p className="text-[10px] text-zinc-600">
              <span className="text-zinc-500 font-bold">Audit trail:</span>{" "}
              हरेक atomic run को permanent record — delete हुँदैन। Page + verbatim evidence सहित {totalRecords} facts ZZC को intelligence graph मा छन्।
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
