"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type { ConstitutionalFrameworkRecord } from "../../../lib/types/constitutional-framework";
import Link from "next/link";
import { WorkflowGuide, CONSTITUTION_EXTRACT_STEPS } from "../../../components/vault/WorkflowGuide";

// ─── Stats Panel ───────────────────────────────────────────────────────────────

function StatsPanel({ records }: { records: ConstitutionalFrameworkRecord[] }) {
  const partCount    = new Set(records.map(r => r.part).filter(Boolean)).size;
  const avgConf      = records.length
    ? Math.round(records.reduce((s, r) => s + (r.confidence ?? 0), 0) / records.length * 100)
    : 0;
  const withRights   = records.filter(r => (r.rights?.length ?? 0) > 0).length;
  const uniqueInst   = new Set(records.flatMap(r => r.institutions ?? [])).size;
  const uniqueThemes = new Set(records.flatMap(r => r.constitutionalThemes ?? [])).size;
  const withPage     = records.filter(r => r.sourcePage != null).length;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {[
        { label: "भागहरू",      value: partCount,      color: "text-amber-400" },
        { label: "धाराहरू",     value: records.length, color: "text-white" },
        { label: "विश्वसनीयता", value: `${avgConf}%`,  color: avgConf >= 80 ? "text-green-400" : "text-amber-400" },
        { label: "हक भएका",    value: withRights,     color: "text-blue-400" },
        { label: "संस्थाहरू",   value: uniqueInst,     color: "text-purple-400" },
        { label: "थिमहरू",      value: uniqueThemes,   color: "text-cyan-400" },
      ].map(s => (
        <div key={s.label} className="bg-zinc-950 border border-zinc-800/60 rounded-xl p-2.5 text-center">
          <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
          <p className="text-zinc-600 text-xs mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Intelligence Detail (expanded article panel) ──────────────────────────────

function IntelDetail({
  record,
  onDelete,
}: {
  record:   ConstitutionalFrameworkRecord;
  onDelete: () => void;
}) {
  return (
    <div className="ml-10 mr-3 mb-1 rounded-xl border border-zinc-800/60 bg-zinc-950 overflow-hidden divide-y divide-zinc-800/40">

      {/* Original text */}
      {record.originalText && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">मूल पाठ</p>
          <p className="text-zinc-300 text-xs leading-relaxed italic">
            &ldquo;{record.originalText}&rdquo;
          </p>
        </div>
      )}

      {/* Philosophy / summary */}
      {record.plainNepaliSummary && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">सार तथा दर्शन</p>
          <p className="text-zinc-200 text-sm leading-relaxed">{record.plainNepaliSummary}</p>
        </div>
      )}

      {/* Rights */}
      {(record.rights?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">हकहरू</p>
          <div className="flex flex-wrap gap-1.5">
            {record.rights.map(r => (
              <span key={r} className="text-xs px-2.5 py-0.5 rounded-full bg-green-950/50 text-green-400 border border-green-900/60">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Duties */}
      {(record.duties?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">नागरिक कर्तव्यहरू</p>
          <ul className="space-y-1">
            {record.duties.map((d, i) => (
              <li key={i} className="text-xs text-zinc-400 flex gap-2">
                <span className="text-blue-600 shrink-0">•</span>{d}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* State obligations */}
      {(record.obligations?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">राज्यका दायित्वहरू</p>
          <ul className="space-y-1.5">
            {record.obligations.map((o, i) => (
              <li key={i} className="text-xs text-zinc-300 flex gap-2">
                <span className="text-amber-600 shrink-0 mt-0.5">→</span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Affected groups */}
      {(record.affectedGroups?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">प्रभावित समूह</p>
          <div className="flex flex-wrap gap-1.5">
            {record.affectedGroups.map(g => (
              <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Institutions */}
      {(record.institutions?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">संस्थाहरू</p>
          <div className="flex flex-wrap gap-1.5">
            {record.institutions.map(inst => (
              <span key={inst} className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/50 text-indigo-400 border border-indigo-900/60">
                🏛️ {inst}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Governance structures */}
      {(record.governanceStructures?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">शासन संरचना</p>
          <div className="flex flex-wrap gap-1.5">
            {record.governanceStructures.map(g => (
              <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-orange-950/40 text-orange-400 border border-orange-900/50">{g}</span>
            ))}
          </div>
        </div>
      )}

      {/* Sectors + themes */}
      {((record.sectors?.length ?? 0) > 0 || (record.constitutionalThemes?.length ?? 0) > 0) && (
        <div className="px-5 py-3.5 grid sm:grid-cols-2 gap-4">
          {(record.sectors?.length ?? 0) > 0 && (
            <div>
              <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">क्षेत्रहरू</p>
              <div className="flex flex-wrap gap-1">
                {record.sectors.map(s => (
                  <span key={s} className="text-xs px-1.5 py-0.5 rounded-full bg-amber-950/30 text-amber-500 border border-amber-900/40">{s}</span>
                ))}
              </div>
            </div>
          )}
          {(record.constitutionalThemes?.length ?? 0) > 0 && (
            <div>
              <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">संवैधानिक थिमहरू</p>
              <div className="flex flex-wrap gap-1">
                {record.constitutionalThemes.map(t => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keywords */}
      {(record.keywords?.length ?? 0) > 0 && (
        <div className="px-5 py-3.5">
          <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest mb-2">मुख्य शब्दहरू</p>
          <div className="flex flex-wrap gap-1">
            {record.keywords.map(k => (
              <span key={k} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800/60 text-zinc-500 font-mono">{k}</span>
            ))}
          </div>
        </div>
      )}

      {/* Footer: related + meta + delete */}
      <div className="px-5 py-3 flex items-center justify-between gap-4 flex-wrap bg-zinc-900/30">
        <div className="flex items-center gap-4 flex-wrap text-xs">
          {(record.relatedArticles?.length ?? 0) > 0 && (
            <span className="text-zinc-600">
              सम्बन्धित: {record.relatedArticles.map(a => a.replace("art-", "धारा ")).join(", ")}
            </span>
          )}
          {record.sourcePage != null && (
            <span className="text-zinc-700">पृष्ठ {record.sourcePage}</span>
          )}
          <span className={`font-semibold ${
            (record.confidence ?? 0) >= 0.9 ? "text-green-700" :
            (record.confidence ?? 0) >= 0.7 ? "text-amber-700" : "text-red-700"
          }`}>
            {Math.round((record.confidence ?? 0) * 100)}% विश्वसनीयता
          </span>
        </div>
        <button
          onClick={onDelete}
          className="text-xs text-zinc-800 hover:text-red-500 transition-colors"
        >
          हटाउनुस्
        </button>
      </div>
    </div>
  );
}

// ─── Article Row ───────────────────────────────────────────────────────────────

function ArticleRow({
  record,
  onDelete,
  isDeleting,
}: {
  record:     ConstitutionalFrameworkRecord;
  onDelete:   (id: string) => void;
  isDeleting: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const dharaLabel = record.clause
    ? `धारा ${record.article}(${record.clause})`
    : `धारा ${record.article}`;

  return (
    <div className={isDeleting ? "opacity-30 pointer-events-none" : ""}>
      <button
        className="w-full text-left flex items-start gap-3 px-5 py-2.5 hover:bg-zinc-900/50 transition-colors group"
        onClick={() => setExpanded(p => !p)}
      >
        <span className="text-zinc-700 text-xs w-3 shrink-0 mt-0.5 group-hover:text-zinc-500 transition-colors">
          {expanded ? "▼" : "▶"}
        </span>
        <div className="flex-1 min-w-0">
          <span className="text-white font-bold text-sm">{dharaLabel}</span>
          {record.titleNepali && (
            <span className="text-zinc-200 text-sm ml-2">— {record.titleNepali}</span>
          )}
          {!expanded && record.titleEnglish && (
            <p className="text-zinc-600 text-xs mt-0.5 leading-relaxed">{record.titleEnglish}</p>
          )}
          {!expanded && record.plainNepaliSummary && (
            <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">{record.plainNepaliSummary}</p>
          )}
        </div>
        {(record.rights?.length ?? 0) > 0 && !expanded && (
          <span className="text-green-800 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            {record.rights.length} हक
          </span>
        )}
      </button>
      {expanded && (
        <IntelDetail record={record} onDelete={() => onDelete(record.id!)} />
      )}
    </div>
  );
}

// ─── Part Section ──────────────────────────────────────────────────────────────

function PartSection({
  partName,
  partNumber,
  records,
  onDelete,
  deletingId,
}: {
  partName:   string;
  partNumber: number;
  records:    ConstitutionalFrameworkRecord[];
  onDelete:   (id: string) => void;
  deletingId: string | null;
}) {
  const [open, setOpen] = useState(true);

  const sorted = useMemo(() =>
    [...records].sort((a, b) =>
      (a.article ?? 0) - (b.article ?? 0) ||
      (a.clause ?? "").localeCompare(b.clause ?? "")
    ),
    [records]
  );

  const displayName = partName || `भाग ${partNumber}`;

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden">

      {/* Part header */}
      <button
        className="w-full text-left px-5 py-3.5 flex items-center gap-3 bg-zinc-900/80 hover:bg-zinc-900 transition-colors"
        onClick={() => setOpen(p => !p)}
      >
        <span className="text-zinc-500 text-xs w-3 shrink-0">{open ? "▼" : "▶"}</span>
        <p className="text-amber-400 font-black text-sm flex-1">{displayName}</p>
        <span className="text-zinc-600 text-xs shrink-0">{records.length} धाराहरू</span>
      </button>

      {/* Articles */}
      {open && (
        <div className="divide-y divide-zinc-800/30 border-t border-zinc-800/60">
          {sorted.map(record => (
            <ArticleRow
              key={record.id}
              record={record}
              onDelete={onDelete}
              isDeleting={deletingId === record.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function ConstitutionAdminClient() {
  const { user, loading: authLoading, isOwner } = useVaultAuth();

  const [records,   setRecords]   = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [deduping,  setDeduping]  = useState(false);
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getDocs(query(
      collection(db, "constitutional_framework"),
      where("ownerId", "==", user.uid),
    )).then(snap => {
      setRecords(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord))
          .sort((a, b) =>
            (a.partNumber ?? 0) - (b.partNumber ?? 0) ||
            (a.article ?? 0)    - (b.article ?? 0)
          )
      );
    }).catch(err => console.warn("constitutional_framework load:", err))
      .finally(() => setLoading(false));
  }, [user?.uid]);

  // Group by part, sorted by partNumber
  const parts = useMemo(() => {
    const map = new Map<string, { partNumber: number; records: ConstitutionalFrameworkRecord[] }>();
    records.forEach(r => {
      const key = r.part?.trim() || `भाग ${r.partNumber}`;
      if (!map.has(key)) map.set(key, { partNumber: r.partNumber ?? 999, records: [] });
      map.get(key)!.records.push(r);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => a.partNumber - b.partNumber);
  }, [records]);

  const handleDelete = async (id: string) => {
    if (!confirm("यो धारा record DELETE गर्ने?")) return;
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

  const handleDedup = async () => {
    // Group by articleId; keep newest createdAt, delete older duplicates
    const byArticleId = new Map<string, ConstitutionalFrameworkRecord[]>();
    records.forEach(r => {
      const key = r.articleId || `art-${r.article}${r.clause ? `-${r.clause}` : ""}`;
      if (!byArticleId.has(key)) byArticleId.set(key, []);
      byArticleId.get(key)!.push(r);
    });

    const toDelete: string[] = [];
    byArticleId.forEach(group => {
      if (group.length <= 1) return;
      // Sort newest first — keep index 0, delete the rest
      group.sort((a, b) =>
        String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
      );
      group.slice(1).forEach(r => { if (r.id) toDelete.push(r.id); });
    });

    if (toDelete.length === 0) {
      alert("कुनै duplicate records फेला परेन।");
      return;
    }

    if (!confirm(`${toDelete.length} duplicate records DELETE गर्ने?\n\nनयाँ extraction राखिन्छ, पुराना हटाइन्छन्।`)) return;

    setDeduping(true);
    try {
      await Promise.all(toDelete.map(id => deleteDoc(doc(db, "constitutional_framework", id))));
      setRecords(prev => prev.filter(r => !toDelete.includes(r.id!)));
      alert(`✅ Dedup सम्पन्न! ${toDelete.length} duplicate records हटाइए।`);
    } catch (err) {
      alert(`Dedup failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeduping(false);
    }
  };

  // Repair records where partNumber=0 or article=0 without re-extracting.
  // Extracts the correct number from the `part` string ("भाग ३" → 3) and
  // the `articleId` field ("art-18" → 18) stored by the extraction pipeline.
  const handleRepairPartNumbers = async () => {
    const broken = records.filter(r => (r.partNumber ?? 0) === 0 || (r.article ?? 0) === 0);
    if (broken.length === 0) {
      alert("✅ सबै records मा सही partNumber र article छ — repair आवश्यक छैन।");
      return;
    }
    if (!confirm(`${broken.length} records मा partNumber=0 वा article=0 छ। Firestore data repair गर्ने?\n\nRe-extraction हुँदैन — केवल existing data बाट सही number निकालिनेछ।`)) return;

    function devanagariToInt(s: string): number {
      const converted = s.replace(/[०-९]/g, d => String(d.charCodeAt(0) - 0x0966)).replace(/[^\d]/g, "");
      const n = parseInt(converted, 10);
      return isNaN(n) ? 0 : n;
    }

    setRepairing(true);
    let fixed = 0;
    try {
      for (const r of broken) {
        if (!r.id) continue;
        const updates: Record<string, number> = {};

        if ((r.partNumber ?? 0) === 0 && r.part) {
          const pn = devanagariToInt(r.part);
          if (pn > 0) updates.partNumber = pn;
        }

        if ((r.article ?? 0) === 0 && r.articleId) {
          // articleId format: "art-18" or "art-18-a"
          const match = r.articleId.match(/^art-(\d+)/);
          if (match) {
            const an = parseInt(match[1], 10);
            if (!isNaN(an) && an > 0) updates.article = an;
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(doc(db, "constitutional_framework", r.id), updates);
          setRecords(prev => prev.map(rec =>
            rec.id === r.id ? { ...rec, ...updates } : rec
          ));
          fixed++;
        }
      }
      alert(`✅ Repair सम्पन्न! ${fixed} records ठीक गरियो।\n\nBranch Health page refresh गर्नुस् — अब data देखिनेछ।`);
    } catch (err) {
      alert(`Repair failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRepairing(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`सबै ${records.length} constitutional framework records DELETE गर्ने? यो reversible छैन।`)) return;
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

  // Derived state — how many records have partNumber=0
  const brokenCount = records.filter(r => (r.partNumber ?? 0) === 0).length;

  // WorkflowGuide steps — override repair step with live count + callback
  const constitutionSteps = useMemo(
    () => CONSTITUTION_EXTRACT_STEPS.map(s =>
      s.id !== "repair" ? s : {
        ...s,
        labelNp:        brokenCount > 0 ? `PartNumber Repair (${brokenCount} records)` : "PartNumber Repair",
        whyNp:          `AI ले देवनागरी अंक ("भाग ३" → parseInt("३",10) = NaN = 0) पढ्न सकेन। ${brokenCount} धाराहरू "भाग ०" मा छन् — Branch Health ले देख्दैन। Repair ले "part" field बाट सही भाग निकाल्छ। AI call छैन, content बदलिँदैन, ३०–६० sec लाग्छ।`,
        actionLabel:    brokenCount > 0
          ? `${brokenCount} भाग-० धाराहरूलाई सही भागमा मिलाउनुहोस्`
          : "Repair गर्नुहोस्",
        actionCallback: handleRepairPartNumbers,
        actionHref:     undefined,
      }
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [brokenCount]
  );

  // WorkflowGuide step index
  const constitutionStep = records.length === 0 ? 0
    : brokenCount > 0                           ? 2
    :                                             3;

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Nav */}
      <nav className="border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
        <Link href="/vault/documents" className="text-zinc-500 hover:text-white text-sm transition-colors">
          ← Documents
        </Link>
        <span className="text-zinc-800">|</span>
        <span className="text-zinc-300 font-bold text-sm">📜 नेपालको संविधान</span>
        {records.length > 0 && (
          <span className="text-zinc-700 text-xs">· {records.length} धाराहरू · {parts.length} भागहरू</span>
        )}
        {/* Secondary actions — small, unobtrusive */}
        <div className="ml-auto flex items-center gap-2">
          <Link href="/vault/constitution/health" className="text-xs font-bold px-2.5 py-1 rounded-lg bg-green-950/40 border border-green-900 text-green-400 hover:bg-green-900/40 transition-colors">🩺 Health</Link>
          <Link href="/constitution" className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-900/30 border border-amber-900 text-amber-400 hover:bg-amber-900/40 transition-colors">🌳 Tree</Link>
          {records.length > 0 && (
            <button onClick={handleDedup} disabled={deduping}
              className="text-xs px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-500 hover:text-blue-400 hover:border-blue-900 transition-colors disabled:opacity-40"
            >
              {deduping ? "…" : "Dedup"}
            </button>
          )}
          {records.length > 0 && (
            <button onClick={handleDeleteAll}
              className="text-xs text-zinc-700 hover:text-red-500 transition-colors px-1"
            >सबै मेटाउनुस्</button>
          )}
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">नेपालको संविधान</h1>
          <p className="text-zinc-500 text-sm mt-0.5">२०७२ सालको संविधान · संवैधानिक मूल ढाँचा (Layer 1)</p>
        </div>

        {/* ── Founder Cockpit Card — shows ONLY when action is needed ── */}
        {!loading && brokenCount > 0 && (
          <div className="rounded-2xl border border-amber-800 bg-amber-950/30 p-5 space-y-4">
            {/* What is wrong */}
            <div className="flex items-start gap-3">
              <span className="text-2xl shrink-0">🔧</span>
              <div className="min-w-0">
                <p className="text-amber-400 font-black text-base leading-snug">
                  {brokenCount} धाराहरू "भाग ०" मा अड्किएका छन्
                </p>
                <p className="text-zinc-400 text-xs leading-relaxed mt-1">
                  AI ले देवनागरी अंकहरू गलत पढ्यो — "भाग ३" भन्ने "भाग 0" बन्यो।
                  Branch Health ले यी {brokenCount} records देख्दैन, त्यसैले सबै भागहरू खाली देखिन्छन्।
                </p>
              </div>
            </div>

            {/* Why it matters */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl px-4 py-3 space-y-1.5">
              <p className="text-zinc-300 text-xs font-black">यो किन महत्त्वपूर्ण छ?</p>
              <p className="text-zinc-500 text-xs leading-relaxed">
                Repair नगरेसम्म Branch Health page मा सबै ३५ भागहरू "खाली" देखिन्छन् —
                Constitution Tree काम गर्दैन।
                Pipeline को यो एउटा step सकियो भने system पूरा ready हुन्छ।
              </p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "भाग-० records",  value: brokenCount,        color: "text-amber-400" },
                { label: "Total records",   value: records.length,     color: "text-white"     },
                { label: "AI cost",         value: "₀",                color: "text-green-400" },
                { label: "Repair समय",      value: "~30s",             color: "text-blue-400"  },
              ].map(s => (
                <div key={s.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-2.5 text-center">
                  <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                  <p className="text-zinc-600 text-[9px] mt-0.5 uppercase tracking-wide">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Safety checklist */}
            <div className="space-y-1">
              {[
                { ok: true,  text: "Content बदलिँदैन — केवल part number assign हुन्छ" },
                { ok: true,  text: "Re-extraction हुँदैन — `part` field को text बाट number निकालिन्छ" },
                { ok: true,  text: "AI call छैन — Firestore update मात्र (cost = ₀)" },
                { ok: true,  text: "Safe — undo गर्न नमिले पनि content intact रहन्छ" },
              ].map(({ ok, text }) => (
                <div key={text} className="flex items-start gap-2">
                  <span className={`text-xs shrink-0 mt-0.5 ${ok ? "text-green-400" : "text-red-400"}`}>{ok ? "✓" : "✗"}</span>
                  <p className="text-zinc-400 text-xs leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* Primary action */}
            <button
              onClick={handleRepairPartNumbers}
              disabled={repairing}
              className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-black py-3 rounded-xl text-sm transition-colors"
            >
              {repairing
                ? "Repair हुँदैछ…"
                : `${brokenCount} भाग-० धाराहरूलाई सही भागमा मिलाउनुहोस् →`}
            </button>
            <p className="text-zinc-600 text-[10px] text-center">
              Repair सकिएपछि Branch Health page मा सबै ३५ भागहरू देखिन्छन्।
            </p>
          </div>
        )}

        {/* ── All good: show pipeline progress ── */}
        {!loading && records.length > 0 && brokenCount === 0 && (
          <div className="rounded-2xl border border-green-900 bg-green-950/20 p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-green-400 font-black text-sm">Constitution Framework ready!</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                सबै {records.length} धाराहरू correct part number सहित save भए।
                Branch Health page मा verify गर्नुस्।
              </p>
            </div>
            <Link
              href="/vault/constitution/health"
              className="ml-auto shrink-0 text-xs font-black px-3 py-2 rounded-xl bg-green-900/40 border border-green-800 text-green-400 hover:bg-green-900/60 transition-colors"
            >
              Branch Health →
            </Link>
          </div>
        )}

        {/* Workflow guide — constitution extraction pipeline */}
        {!loading && (
          <WorkflowGuide
            workflowType="constitution-extraction"
            titleNp="संविधान Extraction Pipeline"
            steps={constitutionSteps}
            currentStep={constitutionStep}
            className="mb-2"
          />
        )}

        {/* Stats */}
        {!loading && records.length > 0 && <StatsPanel records={records} />}

        {/* Empty state */}
        {!loading && records.length === 0 && (
          <div className="border border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-3">
            <p className="text-3xl">📜</p>
            <p className="text-white font-bold">संवैधानिक ढाँचा खाली छ</p>
            <p className="text-zinc-600 text-sm max-w-sm mx-auto">
              Vault Documents मा Constitution PDF upload गरेर &ldquo;📜 संविधान Framework निकाल्नुहोस्&rdquo; button click गर्नुस् — माथिको workflow guide follow गर्नुस्।
            </p>
            <Link
              href="/vault/documents"
              className="inline-block text-sm font-bold px-5 py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
            >
              Vault Documents →
            </Link>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-zinc-900 border border-zinc-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Constitution hierarchical tree */}
        {!loading && records.length > 0 && (
          <div className="space-y-2">
            {parts.map(p => (
              <PartSection
                key={p.name}
                partName={p.name}
                partNumber={p.partNumber}
                records={p.records}
                onDelete={handleDelete}
                deletingId={deleting}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        {records.length > 0 && (
          <p className="text-center text-zinc-800 text-xs pt-4">
            नेपालको संविधान २०७२ · ३०८ धारा · ३५ भाग · ९ अनुसूची
          </p>
        )}
      </div>
    </div>
  );
}
