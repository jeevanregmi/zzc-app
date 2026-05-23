"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type { ConstitutionalFrameworkRecord } from "../../../lib/types/constitutional-framework";
import Link from "next/link";

// ─── Record Detail Panel ───────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  if (Array.isArray(value) && value.length === 0) return null;

  const display = Array.isArray(value)
    ? value.join(", ")
    : typeof value === "boolean"
    ? value ? "✓ yes" : "✗ no"
    : String(value);

  return (
    <div className="flex gap-3 py-1.5 border-b border-zinc-800/60 last:border-0">
      <span className="text-zinc-600 text-xs w-40 shrink-0 font-mono">{label}</span>
      <span className="text-zinc-300 text-xs leading-relaxed flex-1">{display}</span>
    </div>
  );
}

function RecordCard({ record, onDelete }: {
  record: ConstitutionalFrameworkRecord;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const confColor =
    (record.confidence ?? 0) >= 0.9 ? "text-green-400"  :
    (record.confidence ?? 0) >= 0.7 ? "text-amber-400"  : "text-red-400";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-zinc-800/40 transition-colors"
        onClick={() => setExpanded(p => !p)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-400 font-mono text-xs font-bold">
              {record.articleId?.replace("art-", "धारा ")}
            </span>
            <span className="text-zinc-600 text-xs">·</span>
            <span className="text-zinc-500 text-xs">{record.part}</span>
          </div>
          <p className="text-white font-bold text-sm mt-0.5 leading-snug">
            {record.titleNepali}
          </p>
          <p className="text-zinc-500 text-xs">{record.titleEnglish}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-xs font-bold ${confColor}`}>
            {Math.round((record.confidence ?? 0) * 100)}%
          </span>
          <span className="text-zinc-600 text-xs">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Quick preview — always visible */}
      {!expanded && (
        <div className="px-4 pb-3">
          <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
            {record.plainNepaliSummary || record.originalText}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {(record.constitutionalThemes ?? []).slice(0, 3).map(t => (
              <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-900">
                {t}
              </span>
            ))}
            {(record.sectors ?? []).slice(0, 2).map(s => (
              <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full detail — expanded */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 space-y-1 pt-3">
          <FieldRow label="articleId"            value={record.articleId} />
          <FieldRow label="article"              value={record.article} />
          <FieldRow label="clause"               value={record.clause ?? "—"} />
          <FieldRow label="part"                 value={record.part} />
          <FieldRow label="partNumber"           value={record.partNumber} />
          <FieldRow label="titleEnglish"         value={record.titleEnglish} />
          <FieldRow label="titleNepali"          value={record.titleNepali} />
          <FieldRow label="confidence"           value={`${(record.confidence ?? 0) * 100}%`} />
          <FieldRow label="sourcePage"           value={record.sourcePage ?? "—"} />

          <div className="my-2 border-t border-zinc-800" />

          <FieldRow label="originalText"         value={record.originalText} />
          <FieldRow label="plainNepaliSummary"   value={record.plainNepaliSummary} />

          <div className="my-2 border-t border-zinc-800" />

          <FieldRow label="rights"               value={record.rights} />
          <FieldRow label="duties"               value={record.duties} />
          <FieldRow label="obligations"          value={record.obligations} />
          <FieldRow label="institutions"         value={record.institutions} />
          <FieldRow label="governanceStructures" value={record.governanceStructures} />
          <FieldRow label="sectors"              value={record.sectors} />
          <FieldRow label="affectedGroups"       value={record.affectedGroups} />
          <FieldRow label="keywords"             value={record.keywords} />
          <FieldRow label="relatedArticles"      value={record.relatedArticles} />
          <FieldRow label="constitutionalThemes" value={record.constitutionalThemes} />

          <div className="my-2 border-t border-zinc-800" />

          <FieldRow label="publishToJanta"       value={record.publishToJanta} />
          <FieldRow label="sourceDocTitle"       value={record.sourceDocTitle} />

          <div className="pt-2 flex justify-end">
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(record.id!); }}
              className="text-xs text-zinc-700 hover:text-red-400 transition-colors"
            >
              Delete record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ConstitutionAdminClient() {
  const { user, loading: authLoading, isOwner } = useVaultAuth();

  const [records,  setRecords]  = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [partFilter, setPartFilter] = useState("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(
      collection(db, "constitutional_framework"),
      where("ownerId", "==", user.uid),
    )).then(snap => {
      const recs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord))
        .sort((a, b) => (a.partNumber ?? 0) - (b.partNumber ?? 0) || (a.article ?? 0) - (b.article ?? 0));
      setRecords(recs);
    }).catch(err => console.warn("constitutional_framework load:", err))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  const parts = useMemo(() =>
    Array.from(new Set(records.map(r => r.part).filter(Boolean))).sort(),
    [records]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      if (partFilter !== "all" && r.part !== partFilter) return false;
      if (!q) return true;
      return (
        r.titleEnglish?.toLowerCase().includes(q)  ||
        r.titleNepali?.toLowerCase().includes(q)   ||
        r.articleId?.toLowerCase().includes(q)     ||
        r.keywords?.some(k => k.toLowerCase().includes(q)) ||
        r.sectors?.some(s => s.toLowerCase().includes(q))  ||
        r.constitutionalThemes?.some(t => t.toLowerCase().includes(q))
      );
    });
  }, [records, search, partFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm("This constitutional_framework record DELETE गर्ने?")) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "constitutional_framework", id));
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`सबै ${records.length} constitutional_framework records DELETE गर्ने? यो reversible छैन।`)) return;
    try {
      await Promise.all(records.map(r => deleteDoc(doc(db, "constitutional_framework", r.id!))));
      setRecords([]);
    } catch (err) {
      alert(`Delete all failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  if (!authLoading && !isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-500">Access denied.</p>
      </div>
    );
  }

  // Stats
  const avgConf    = records.length
    ? Math.round(records.reduce((s, r) => s + (r.confidence ?? 0), 0) / records.length * 100)
    : 0;
  const withRights = records.filter(r => r.rights?.length > 0).length;
  const withObligs = records.filter(r => r.obligations?.length > 0).length;
  const withInsts  = records.filter(r => r.institutions?.length > 0).length;

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
        <Link href="/vault/documents" className="text-zinc-500 hover:text-white text-sm">← Documents</Link>
        <span className="text-zinc-800">|</span>
        <span className="text-white font-bold text-sm">📜 Constitutional Framework Admin</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Header + stats */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white">constitutional_framework</h1>
            <p className="text-zinc-500 text-xs mt-0.5">Root ontology verification — Nepal Constitution 2015</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/constitution"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-900/50 border border-amber-700 text-amber-300 hover:bg-amber-900 transition-colors"
            >
              🌳 Tree UI →
            </Link>
            <Link
              href="/vault/documents"
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              ← Vault
            </Link>
          </div>
        </div>

        {/* Stats cards */}
        {records.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Articles", value: records.length, color: "text-white" },
              { label: "Avg Confidence", value: `${avgConf}%`, color: avgConf >= 80 ? "text-green-400" : "text-amber-400" },
              { label: "With Rights",    value: withRights,  color: "text-blue-400"  },
              { label: "With Obligations", value: withObligs, color: "text-purple-400" },
            ].map(s => (
              <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Parts breakdown */}
        {records.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-zinc-400 text-xs font-semibold mb-3">Parts Extracted</p>
            <div className="flex flex-wrap gap-2">
              {parts.map(part => {
                const count = records.filter(r => r.part === part).length;
                return (
                  <button
                    key={part}
                    onClick={() => setPartFilter(p => p === part ? "all" : part)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      partFilter === part
                        ? "bg-amber-900 text-amber-300 border-amber-700"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    {part} <span className="opacity-60">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-2xl p-8 text-center space-y-3">
            <p className="text-4xl">📜</p>
            <p className="text-white font-bold">Constitutional framework खाली छ</p>
            <p className="text-zinc-500 text-sm">
              Vault मा Constitution PDF upload गरेर <br />
              <span className="text-amber-400 font-semibold">"📜 संविधान Framework निकाल्नुहोस्"</span> button click गर्नुस्।
            </p>
            <Link
              href="/vault/documents"
              className="inline-block text-sm font-bold px-4 py-2.5 rounded-xl bg-amber-900/60 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
            >
              Vault Documents →
            </Link>
          </div>
        )}

        {/* Search + filter + delete all */}
        {records.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="article, keyword, sector खोज्नुस्..."
              className="flex-1 min-w-48 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-600"
            />
            <span className="text-zinc-600 text-xs">{filtered.length} / {records.length}</span>
            <button
              onClick={handleDeleteAll}
              className="text-xs text-zinc-700 hover:text-red-400 transition-colors px-2 py-1"
            >
              Delete All
            </button>
          </div>
        )}

        {/* Records list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(record => (
              <div key={record.id} className={deleting === record.id ? "opacity-40" : ""}>
                <RecordCard record={record} onDelete={handleDelete} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
