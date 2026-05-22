"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import type { IntelligenceDocument } from "../../lib/types/documents";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "आज";
  if (d === 1) return "हिजो";
  if (d < 7)  return `${d} दिन अघि`;
  if (d < 30) return `${Math.floor(d / 7)} हप्ता अघि`;
  return `${Math.floor(d / 30)} महिना अघि`;
}

function confidencePct(c?: number): string {
  if (c == null) return "";
  return `${Math.round(c * 100)}%`;
}

const SECTOR_COLOR: Record<string, string> = {
  banking:          "bg-blue-900/40 text-blue-300 border-blue-800",
  EPF:              "bg-green-900/40 text-green-300 border-green-800",
  taxation:         "bg-amber-900/40 text-amber-300 border-amber-800",
  "capital market": "bg-purple-900/40 text-purple-300 border-purple-800",
  housing:          "bg-cyan-900/40 text-cyan-300 border-cyan-800",
  employment:       "bg-rose-900/40 text-rose-300 border-rose-800",
};

function SectorTag({ label }: { label: string }) {
  const cls = SECTOR_COLOR[label.toLowerCase()] ?? "bg-zinc-800 text-zinc-400 border-zinc-700";
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Document Card ────────────────────────────────────────────────────────────

function IntelCard({ doc }: { doc: IntelligenceDocument }) {
  const [expanded, setExpanded] = useState(false);
  const isOfficial = doc.sourceType === "official";

  return (
    <article className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">

      {/* Top bar */}
      <div className="px-5 pt-5 pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Source badge */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {isOfficial && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                  ✓ Official
                </span>
              )}
              {doc.sourceAuthority && (
                <span className="text-[10px] text-zinc-500 font-mono">{doc.sourceAuthority}</span>
              )}
              {doc.confidence != null && (
                <span className="text-[10px] text-zinc-600">{confidencePct(doc.confidence)} confident</span>
              )}
            </div>
            <h2 className="text-base font-bold text-white leading-snug line-clamp-2">{doc.title}</h2>
          </div>
          <span className="shrink-0 text-[10px] text-zinc-600 mt-1">{timeAgo(doc.uploadedAt)}</span>
        </div>

        {/* Nepali explainer — hero of this page */}
        {doc.nepaliExplainer && (
          <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3">
            <p className="text-[10px] text-green-500 font-semibold mb-1 uppercase tracking-widest">सरल नेपालीमा</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{doc.nepaliExplainer}</p>
          </div>
        )}

        {/* AI Summary */}
        {doc.aiSummary && (
          <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3">{doc.aiSummary}</p>
        )}
      </div>

      {/* Key insights */}
      {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
        <div className="px-5 pb-3 space-y-1">
          {(expanded ? doc.aiKeyInsights : doc.aiKeyInsights.slice(0, 3)).map((insight, i) => (
            <div key={i} className="flex gap-2 text-xs text-zinc-300">
              <span className="text-green-500 shrink-0 mt-0.5">▸</span>
              <span>{insight}</span>
            </div>
          ))}
          {doc.aiKeyInsights.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
            >
              {expanded ? "कम देखाउनुस् ▲" : `+${doc.aiKeyInsights.length - 3} थप insights ▼`}
            </button>
          )}
        </div>
      )}

      {/* Youth impact */}
      {doc.youthImpact && (
        <div className="mx-5 mb-3 bg-gradient-to-r from-green-950/40 to-cyan-950/20 border border-green-900/40 rounded-xl px-4 py-3">
          <p className="text-[10px] text-cyan-400 font-semibold uppercase tracking-widest mb-1">युवाहरूलाई असर</p>
          <p className="text-xs text-zinc-300 leading-relaxed">{doc.youthImpact}</p>
        </div>
      )}

      {/* Policy changes */}
      {doc.policyChanges && doc.policyChanges.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-amber-500 font-semibold uppercase tracking-widest mb-1.5">नीतिगत परिवर्तन</p>
          <div className="space-y-1">
            {doc.policyChanges.slice(0, 3).map((p, i) => (
              <div key={i} className="flex gap-2 text-xs text-zinc-400">
                <span className="text-amber-500 shrink-0">◆</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial implications */}
      {doc.financialImplications && doc.financialImplications.length > 0 && (
        <div className="px-5 pb-3">
          <p className="text-[10px] text-purple-400 font-semibold uppercase tracking-widest mb-1.5">वित्तीय प्रभाव</p>
          <div className="flex flex-wrap gap-1.5">
            {doc.financialImplications.slice(0, 4).map((f, i) => (
              <span key={i} className="text-[11px] bg-purple-900/30 border border-purple-800/40 text-purple-300 px-2 py-0.5 rounded-lg">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Sectors + SSF/EPF */}
      <div className="px-5 pb-4 space-y-2">
        {doc.affectedSectors && doc.affectedSectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {doc.affectedSectors.slice(0, 6).map(s => <SectorTag key={s} label={s} />)}
          </div>
        )}
        {doc.ssfEpfCitRelevance && !doc.ssfEpfCitRelevance.toLowerCase().includes("not directly") && (
          <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-lg px-3 py-2">
            <p className="text-[10px] text-green-400 font-semibold mb-0.5">SSF / EPF / CIT</p>
            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{doc.ssfEpfCitRelevance}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 px-5 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-700 font-mono">{doc.language ?? "English"}</span>
          {doc.aiProvider && (
            <span className="text-[10px] text-zinc-700 font-mono">· {doc.aiProvider}</span>
          )}
        </div>
        <div className="flex gap-2">
          {doc.detectedTopics && doc.detectedTopics.slice(0, 3).map(t => (
            <span key={t} className="text-[10px] text-zinc-600 font-mono">#{t.replace(/\s/g, "")}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ count }: { count: number }) {
  return (
    <div className="relative overflow-hidden bg-black border-b border-zinc-800">
      {/* Grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: "linear-gradient(rgba(0,255,100,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,100,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      {/* Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-green-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-cyan-500/8 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-6 py-14 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-semibold tracking-widest uppercase">AI-Powered · Public Intelligence</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-3">
          जनता{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            Intelligence
          </span>
        </h1>
        <p className="text-zinc-400 text-base mb-2">
          नेपाल सरकारका नीति, बजेट र वित्तीय निर्णयहरू — AI ले analyze गरेर सरल भाषामा।
        </p>
        <p className="text-zinc-600 text-sm mb-8">
          For Nepal. By Nepal. युवाहरूका लागि।
        </p>
        {count > 0 && (
          <p className="text-zinc-500 text-xs">
            <span className="text-green-400 font-bold">{count}</span> ota documents analyzed · Last updated today
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function JantaClient() {
  const [docs,    setDocs]    = useState<IntelligenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState<"all" | "official" | "epf" | "budget">("all");

  useEffect(() => {
    getDocs(
      query(
        collection(db, "vault_intelligence_docs"),
        where("adminApprovalStatus", "==", "approved"),
        orderBy("updatedAt", "desc"),
      )
    ).then(snap => {
      setDocs(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceDocument)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d => {
    if (filter === "all")      return true;
    if (filter === "official") return d.sourceType === "official";
    if (filter === "epf")      return d.detectedTopics?.some(t => /epf|ssf|cit/i.test(t));
    if (filter === "budget")   return d.detectedTopics?.some(t => /budget|बजेट|fiscal/i.test(t));
    return true;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all",      label: "सबै" },
    { key: "official", label: "Official" },
    { key: "epf",      label: "EPF / SSF" },
    { key: "budget",   label: "बजेट" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Hero count={docs.length} />

      {/* Nav */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-zinc-900">
        <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="text-green-400 font-black text-lg tracking-tight">ZZC</Link>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  filter === f.key
                    ? "bg-green-600 text-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link href="/vault/documents" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors hidden sm:block">
            Admin →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-600 text-sm">Intelligence load huda&shy;ixa…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <p className="text-4xl">🏛️</p>
            <p className="text-zinc-400 font-semibold">
              {docs.length === 0
                ? "कुनै approved document छैन अहिले।"
                : "यस filter मा कुनै document छैन।"}
            </p>
            <p className="text-zinc-600 text-sm">
              {docs.length === 0
                ? "Admin Vault मा documents approve गरेपछि यहाँ देखिन्छ।"
                : "अर्को filter try गर्नुहोस्।"}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-zinc-700">{filtered.length} intelligence report{filtered.length !== 1 ? "s" : ""}</p>
            {filtered.map(doc => <IntelCard key={doc.id} doc={doc} />)}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 mt-8 py-8 text-center">
        <p className="text-zinc-700 text-xs">
          ZZC Janta Intelligence · AI-powered by Gemini ·{" "}
          <Link href="/" className="text-zinc-600 hover:text-green-500 transition-colors">zzc.jeevanregmi.com.np</Link>
        </p>
      </footer>
    </div>
  );
}
