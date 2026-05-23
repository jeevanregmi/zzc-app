"use client";

import { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { IntelligenceRecord, IntelRecordType } from "../../lib/types/intelligence-record";
import Link from "next/link";

// ── Finance-specific type metadata ────────────────────────────────────────────

const FIN_TYPE_META: Partial<Record<IntelRecordType, { label: string; color: string; emoji: string }>> = {
  bank_directive:      { label: "Bank Directive",    color: "bg-blue-950  text-blue-300  border-blue-800",   emoji: "🏦" },
  interest_rate:       { label: "Interest Rate",     color: "bg-green-950 text-green-300 border-green-800",  emoji: "📈" },
  loan_rule:           { label: "Loan Rule",         color: "bg-amber-950 text-amber-300 border-amber-800",  emoji: "🏠" },
  epf_rule:            { label: "EPF Rule",          color: "bg-cyan-950  text-cyan-300  border-cyan-800",   emoji: "👷" },
  ssf_rule:            { label: "SSF Rule",          color: "bg-teal-950  text-teal-300  border-teal-800",   emoji: "🛡" },
  cit_rule:            { label: "CIT Rule",          color: "bg-indigo-950 text-indigo-300 border-indigo-800", emoji: "💼" },
  insurance_rule:      { label: "Insurance",         color: "bg-violet-950 text-violet-300 border-violet-800", emoji: "📋" },
  nepse_rule:          { label: "NEPSE/IPO",         color: "bg-rose-950  text-rose-300  border-rose-800",   emoji: "📊" },
  monetary_policy:     { label: "Monetary Policy",   color: "bg-orange-950 text-orange-300 border-orange-800", emoji: "🏛️" },
  financial_complaint: { label: "Complaint Pattern", color: "bg-red-950   text-red-300   border-red-800",    emoji: "⚠️" },
  reform:              { label: "Financial Reform",  color: "bg-purple-950 text-purple-300 border-purple-800", emoji: "⚖️" },
  financial_inclusion: { label: "Fin. Inclusion",   color: "bg-lime-950  text-lime-300  border-lime-800",   emoji: "🤝" },
  other:               { label: "Other",             color: "bg-zinc-800  text-zinc-400  border-zinc-700",   emoji: "📌" },
};

const EXAMPLE_QUESTIONS = [
  "EPF बाट housing loan कति लिन सकिन्छ?",
  "NRB ले interest rate मा के नियम ल्यायो?",
  "SSF र EPF मा के फरक छ?",
  "CIT योगदान कसरी हुन्छ?",
  "NEPSE मा IPO apply गर्न के चाहिन्छ?",
  "बैंकको loan interest कति छ?",
];

// ── Financial Record Card ─────────────────────────────────────────────────────

function FinanceRecordCard({ rec }: { rec: IntelligenceRecord }) {
  const [expanded, setExpanded] = useState(false);
  const meta = FIN_TYPE_META[rec.type] ?? FIN_TYPE_META.other!;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors">

      {/* Confidence strip */}
      <div className="h-0.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all"
          style={{ width: `${Math.round((rec.confidence ?? 0) * 100)}%` }}
        />
      </div>

      {/* Type + sector badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${meta.color}`}>
          {meta.emoji} {meta.label}
        </span>
        {rec.sector && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
            {rec.sector}
          </span>
        )}
        {rec.fiscalYear && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
            {rec.fiscalYear}
          </span>
        )}
      </div>

      {/* Title */}
      <div>
        <p className="text-white font-bold text-sm leading-snug">{rec.titleNepali}</p>
        <p className="text-zinc-500 text-xs mt-0.5">{rec.title}</p>
      </div>

      {/* Summary */}
      <p className="text-zinc-300 text-xs leading-relaxed">{rec.summaryNepali}</p>

      {/* Key facts row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {rec.ministry && <span>🏛️ {rec.ministry}</span>}
        {rec.target    && <span>🎯 {rec.target}</span>}
        {rec.timeline  && <span>📅 {rec.timeline}</span>}
        {rec.budgetAmount && <span className="text-green-600 font-semibold">💰 {rec.budgetAmount}</span>}
      </div>

      {/* Source doc */}
      {rec.sourceDocTitle && (
        <p className="text-zinc-600 text-xs truncate">📄 {rec.sourceDocTitle}</p>
      )}

      {/* Traceability expand */}
      {rec.traceability?.sourceQuote && (
        <>
          <button
            onClick={() => setExpanded(p => !p)}
            className="text-xs text-zinc-600 hover:text-zinc-400 text-left transition-colors"
          >
            {expanded ? "▲ source छुपाउनुहोस्" : "▼ source quote हेर्नुहोस्"}
          </button>
          {expanded && (
            <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700/60">
              <p className="text-zinc-500 text-xs mb-1 font-semibold">Source Quote</p>
              <p className="text-zinc-400 text-xs italic leading-relaxed">"{rec.traceability.sourceQuote}"</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── AI Query Result ───────────────────────────────────────────────────────────

interface QueryResult {
  answer:      string;
  keyFacts:    string[];
  citedTitles: string[];
  confidence:  number;
  disclaimer:  string;
}

// ── Main Finance Intelligence Client ─────────────────────────────────────────

export default function FinanceClient() {
  const [records, setRecords]     = useState<IntelligenceRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch]       = useState("");
  const [question, setQuestion]   = useState("");
  const [querying, setQuerying]   = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    getDocs(query(
      collection(db, "janta_intelligence"),
      where("domain", "==", "finance"),
    )).then(snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord)));
    }).catch(err => {
      console.warn("finance intelligence fetch:", err?.message ?? err);
    }).finally(() => setLoading(false));
  }, []);

  // Type distribution for filter chips
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    records.forEach(r => { counts[r.type] = (counts[r.type] ?? 0) + 1; });
    return counts;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      const matchType = typeFilter === "all" || r.type === typeFilter;
      const matchSearch = !q
        || r.title.toLowerCase().includes(q)
        || r.titleNepali.toLowerCase().includes(q)
        || r.summaryNepali.toLowerCase().includes(q)
        || r.ministry?.toLowerCase().includes(q)
        || r.sector?.toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [records, typeFilter, search]);

  const handleQuery = async (q: string) => {
    if (!q.trim() || querying) return;
    setQuerying(true);
    setQueryResult(null);
    try {
      const compact = records.slice(0, 80).map(r => ({
        id:            r.id,
        type:          r.type,
        title:         r.title,
        titleNepali:   r.titleNepali,
        summaryNepali: r.summaryNepali,
        sector:        r.sector,
        ministry:      r.ministry,
        target:        r.target,
        timeline:      r.timeline,
        budgetAmount:  r.budgetAmount,
        fiscalYear:    r.fiscalYear,
        sourceDocTitle: r.sourceDocTitle,
        implementationStatus: r.implementationStatus,
      }));
      const res = await fetch("/api/civic-query", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question: q, records: compact, locale: "ne" }),
      });
      const data = await res.json() as { ok: boolean } & QueryResult;
      if (data.ok) setQueryResult(data);
    } catch {
      // silent — query failure doesn't break the page
    } finally {
      setQuerying(false);
    }
  };

  const activeTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-black text-white">

      {/* Nav */}
      <nav className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="text-green-400 font-black text-lg tracking-tight">ZZC</Link>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <Link href="/janta" className="hover:text-white transition-colors">Janta</Link>
          <span className="text-green-400 font-semibold">Finance</span>
          <Link href="/vault/documents" className="hover:text-white transition-colors">Vault</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

        {/* Hero */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏦</span>
            <h1 className="text-3xl font-black text-white tracking-tight">Finance Intelligence</h1>
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl">
            NRB, EPF, SSF, CIT, बैंक, बीमा, NEPSE — नेपालका सबै financial records structured intelligence मा।
            AI ले real documents बाट जवाफ दिन्छ — hallucination होइन।
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-green-400 font-black text-lg">{records.length}</span>
            <span className="text-zinc-500">financial records</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-400">{activeTypes.length} record types</span>
            {records.length === 0 && !loading && (
              <>
                <span className="text-zinc-700">·</span>
                <Link href="/vault/documents" className="text-amber-400 text-xs hover:text-amber-300 underline">
                  financial documents upload गर्नुहोस् →
                </Link>
              </>
            )}
          </div>
        </div>

        {/* AI Query Box */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <p className="text-xs text-zinc-500 font-semibold">🤖 Financial Intelligence Query</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleQuery(question)}
              placeholder="EPF, SSF, NRB, loan, interest rate — जे सोध्नुहोस्…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
            <button
              onClick={() => handleQuery(question)}
              disabled={querying || !question.trim()}
              className="px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-black font-black text-sm transition-colors disabled:opacity-40 shrink-0"
            >
              {querying ? "…" : "सोध्नुहोस्"}
            </button>
          </div>

          {/* Example questions */}
          {!queryResult && !querying && (
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.map(q => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); handleQuery(q); }}
                  className="text-xs px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Query result */}
          {querying && (
            <div className="bg-zinc-800/50 rounded-xl p-4 animate-pulse">
              <p className="text-zinc-500 text-sm">Financial intelligence खोज्दैछ…</p>
            </div>
          )}
          {queryResult && !querying && (
            <div className="bg-zinc-800/50 rounded-xl p-4 space-y-3">
              {/* Confidence */}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="flex-1 bg-zinc-700 rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.round(queryResult.confidence * 100)}%` }}
                  />
                </div>
                <span>{Math.round(queryResult.confidence * 100)}% confidence</span>
                <button
                  onClick={() => setQueryResult(null)}
                  className="text-zinc-600 hover:text-zinc-400 ml-2"
                >×</button>
              </div>

              {/* Answer */}
              <p className="text-white text-sm leading-relaxed font-medium">{queryResult.answer}</p>

              {/* Key facts */}
              {queryResult.keyFacts.length > 0 && (
                <div className="space-y-1">
                  {queryResult.keyFacts.map((fact, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-green-600 text-xs mt-0.5 shrink-0">▸</span>
                      <p className="text-zinc-300 text-xs">{fact}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Cited sources */}
              {queryResult.citedTitles.length > 0 && (
                <div className="border-t border-zinc-700 pt-2">
                  <p className="text-zinc-600 text-xs mb-1">Sources:</p>
                  <div className="flex flex-wrap gap-1">
                    {queryResult.citedTitles.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-zinc-700 text-zinc-400 border border-zinc-600">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {queryResult.disclaimer && (
                <p className="text-zinc-600 text-xs">{queryResult.disclaimer}</p>
              )}
            </div>
          )}
        </div>

        {/* Empty state — no finance records yet */}
        {!loading && records.length === 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center space-y-4">
            <span className="text-5xl">🏦</span>
            <div>
              <p className="text-white font-bold text-lg">Financial Intelligence empty छ</p>
              <p className="text-zinc-500 text-sm mt-1">
                NRB circulars, EPF rules, SSF documents, bank directives upload गरेर Deep Intelligence Extract गर्नुहोस्।
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Link
                href="/vault/documents"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-black font-black px-5 py-2.5 rounded-xl text-sm transition-colors"
              >
                + Financial Documents Upload गर्नुहोस्
              </Link>
              <p className="text-zinc-600 text-xs">
                Document को category "Finance" राख्नुहोस् — automatically finance domain मा extract हुन्छ।
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-sm">Financial intelligence लोड हुँदैछ…</p>
          </div>
        )}

        {/* Records section */}
        {!loading && records.length > 0 && (
          <div className="space-y-4">

            {/* Type filter chips */}
            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 transition-colors ${
                    typeFilter === "all" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  सबै ({records.length})
                </button>
                {activeTypes.map(([type, count]) => {
                  const meta = FIN_TYPE_META[type as IntelRecordType] ?? FIN_TYPE_META.other!;
                  return (
                    <button
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={`text-xs px-3 py-1 rounded-full font-semibold shrink-0 transition-colors whitespace-nowrap ${
                        typeFilter === type ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {meta.emoji} {meta.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <input
                type="text"
                placeholder="Records खोज्नुहोस् — ministry, sector, keyword…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Records grid */}
            {filtered.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">
                कुनै records मिलेन — filter वा search बदल्नुहोस्।
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.slice(0, 60).map(rec => (
                  <FinanceRecordCard key={rec.id} rec={rec} />
                ))}
              </div>
            )}

            {filtered.length > 60 && (
              <p className="text-center text-zinc-600 text-xs pt-2">
                {filtered.length - 60} थप records — search गरेर refine गर्नुहोस्।
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
