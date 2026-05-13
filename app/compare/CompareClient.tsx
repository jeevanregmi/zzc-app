"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { SCHEMES } from "../../lib/schemes-data";
import type { SchemeCategory, Org } from "../../lib/schemes-data";

// ─── Static color maps (no template literals) ──────────────────────────────

const CAT_ACTIVE: Record<SchemeCategory, string> = {
  Investment: "bg-green-500 text-black border-green-500",
  Loan:       "bg-blue-500  text-black border-blue-500",
  Insurance:  "bg-rose-500  text-black border-rose-500",
  Pension:    "bg-purple-500 text-black border-purple-500",
};
const CAT_INACTIVE: Record<SchemeCategory, string> = {
  Investment: "bg-zinc-900 text-zinc-400 border-green-900 hover:border-green-600",
  Loan:       "bg-zinc-900 text-zinc-400 border-blue-900  hover:border-blue-600",
  Insurance:  "bg-zinc-900 text-zinc-400 border-rose-900  hover:border-rose-600",
  Pension:    "bg-zinc-900 text-zinc-400 border-purple-900 hover:border-purple-600",
};
const CAT_BADGE: Record<SchemeCategory, string> = {
  Investment: "bg-green-900/60 text-green-400",
  Loan:       "bg-blue-900/60  text-blue-400",
  Insurance:  "bg-rose-900/60  text-rose-400",
  Pension:    "bg-purple-900/60 text-purple-400",
};
const CAT_ICON: Record<SchemeCategory, string> = {
  Investment: "📈",
  Loan:       "🏠",
  Insurance:  "🛡️",
  Pension:    "🎯",
};

const ORG_ACTIVE: Record<Org, string> = {
  EPF:   "bg-blue-600   text-white border-blue-600",
  CIT:   "bg-purple-600 text-white border-purple-600",
  SSF:   "bg-orange-500 text-white border-orange-500",
  NEPSE: "bg-green-700  text-white border-green-700",
  Beema: "bg-rose-700   text-white border-rose-700",
};
const ORG_INACTIVE: Record<Org, string> = {
  EPF:   "bg-zinc-900 text-zinc-400 border-blue-900   hover:border-blue-600",
  CIT:   "bg-zinc-900 text-zinc-400 border-purple-900 hover:border-purple-600",
  SSF:   "bg-zinc-900 text-zinc-400 border-orange-900 hover:border-orange-600",
  NEPSE: "bg-zinc-900 text-zinc-400 border-green-900  hover:border-green-600",
  Beema: "bg-zinc-900 text-zinc-400 border-rose-900   hover:border-rose-600",
};
const ORG_BADGE: Record<string, string> = {
  EPF:   "bg-blue-600",
  CIT:   "bg-purple-600",
  SSF:   "bg-orange-500",
  NEPSE: "bg-green-700",
  Beema: "bg-rose-700",
};

const RISK_CLASS: Record<string, string> = {
  "Low Risk":      "text-green-400",
  "Moderate Risk": "text-yellow-400",
  "High Risk":     "text-red-400",
};
const LIQ_CLASS: Record<string, string> = {
  High:   "text-green-400",
  Medium: "text-yellow-400",
  Low:    "text-red-400",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rateClass(rate: number | null): string {
  if (rate == null) return "text-zinc-600";
  if (rate >= 8)  return "text-green-400 font-bold";
  if (rate >= 4)  return "text-yellow-400 font-bold";
  return "text-zinc-300 font-semibold";
}

function boolCell(val: boolean) {
  return val
    ? <span className="text-green-400 font-black text-base">✓</span>
    : <span className="text-zinc-700 text-base">✗</span>;
}

const CATEGORIES: SchemeCategory[] = ["Investment", "Loan", "Insurance", "Pension"];
const ORGS: Org[] = ["EPF", "CIT", "SSF", "NEPSE", "Beema"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompareClient() {
  const [catFilters, setCatFilters] = useState<Set<SchemeCategory>>(new Set());
  const [orgFilters, setOrgFilters] = useState<Set<Org>>(new Set());

  function toggleCat(c: SchemeCategory) {
    setCatFilters((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }
  function toggleOrg(o: Org) {
    setOrgFilters((prev) => {
      const next = new Set(prev);
      next.has(o) ? next.delete(o) : next.add(o);
      return next;
    });
  }
  function clearAll() {
    setCatFilters(new Set());
    setOrgFilters(new Set());
  }

  const visible = useMemo(() => {
    return SCHEMES.filter((s) => {
      const catOk = catFilters.size === 0 || catFilters.has(s.category);
      const orgOk = orgFilters.size === 0 || orgFilters.has(s.organization);
      return catOk && orgOk;
    });
  }, [catFilters, orgFilters]);

  const hasFilter = catFilters.size > 0 || orgFilters.size > 0;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-10 md:px-6">
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-8">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-600 mb-4">
            <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
            <span>/</span>
            <span className="text-zinc-400">तुलना</span>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Nepal Finance Intelligence</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-2">
            सबै योजना तुलना
          </h1>
          <p className="text-zinc-500 text-sm md:text-base">
            नेपालका {SCHEMES.length}+ EPF, CIT, SSF, NEPSE र Beema योजनाहरू एकै तालिकामा
          </p>
        </div>

        {/* Filters */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 md:p-5 mb-6">

          {/* Category filters */}
          <div className="mb-4">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">श्रेणी</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = catFilters.has(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCat(c)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition
                      ${active ? CAT_ACTIVE[c] : CAT_INACTIVE[c]}
                    `}
                  >
                    <span>{CAT_ICON[c]}</span>
                    {c === "Investment" ? "लगानी" : c === "Loan" ? "ऋण" : c === "Insurance" ? "बीमा" : "पेन्सन"}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Org filters */}
          <div className="mb-4">
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">संस्था</p>
            <div className="flex flex-wrap gap-2">
              {ORGS.map((o) => {
                const active = orgFilters.has(o);
                return (
                  <button
                    key={o}
                    onClick={() => toggleOrg(o)}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold border transition ${active ? ORG_ACTIVE[o] : ORG_INACTIVE[o]}`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Count + clear */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-zinc-500 text-sm">
              <span className="text-white font-bold">{visible.length}</span> / {SCHEMES.length} योजना देखाइएको
            </p>
            {hasFilter && (
              <button
                onClick={clearAll}
                className="text-xs text-zinc-500 hover:text-white transition border border-zinc-700 rounded-full px-3 py-1"
              >
                सबै फिल्टर हटाउनुस् ✕
              </button>
            )}
          </div>

        </div>

        {/* Master comparison table */}
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="border-collapse min-w-[900px] w-full">

            {/* Column headers */}
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-zinc-400 text-xs font-bold uppercase tracking-wider sticky left-0 bg-zinc-900 z-10 min-w-[200px]">
                  योजना
                </th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[90px]">श्रेणी</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[70px]">संस्था</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[80px]">दर %</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[110px]">जोखिम</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[80px]">तरलता</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[90px]">सेवानिवृत्ति</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[80px]">स्वास्थ्य</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[70px]">बीमा</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[160px]">ऋण सीमा</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[100px]">न्यूनतम</th>
                <th className="px-3 py-3 text-center text-zinc-400 text-xs font-bold uppercase tracking-wider min-w-[70px]">विवरण</th>
              </tr>
            </thead>

            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-zinc-600">
                    <p className="text-lg font-bold">कुनै योजना भेटिएन</p>
                    <p className="text-sm mt-1">फिल्टर परिवर्तन गर्नुस्</p>
                  </td>
                </tr>
              ) : visible.map((s, i) => {
                const rate = s.interestRate ?? s.annualReturn ?? null;
                const rateDisplay = rate != null ? `${rate}%` : "—";
                const minContr = s.minContribution
                  ? `NPR ${s.minContribution.toLocaleString()}`
                  : s.contributionEmployee
                  ? `${s.contributionEmployee}%`
                  : "—";
                const loanLimit = s.loanLimit
                  ? s.loanLimit.length > 30
                    ? s.loanLimit.slice(0, 28) + "…"
                    : s.loanLimit
                  : "—";

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition ${i % 2 === 0 ? "bg-black" : "bg-zinc-900/30"}`}
                  >
                    {/* Scheme name — sticky */}
                    <td className={`px-4 py-3 sticky left-0 z-10 ${i % 2 === 0 ? "bg-black" : "bg-zinc-900/80"}`}>
                      <p className="text-sm font-bold text-white leading-snug">{s.titleNepali}</p>
                      <p className="text-xs text-zinc-600 mt-0.5 truncate max-w-[180px]">{s.title}</p>
                    </td>

                    {/* Category */}
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${CAT_BADGE[s.category]}`}>
                        {CAT_ICON[s.category]} {s.category === "Investment" ? "लगानी" : s.category === "Loan" ? "ऋण" : s.category === "Insurance" ? "बीमा" : "पेन्सन"}
                      </span>
                    </td>

                    {/* Organization */}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${ORG_BADGE[s.organization] ?? "bg-zinc-700"}`}>
                        {s.organization}
                      </span>
                    </td>

                    {/* Rate */}
                    <td className={`px-3 py-3 text-center text-sm ${rateClass(rate)}`}>
                      {rateDisplay}
                    </td>

                    {/* Risk */}
                    <td className={`px-3 py-3 text-center text-xs font-semibold ${RISK_CLASS[s.riskLevel] ?? "text-zinc-400"}`}>
                      {s.riskLevel === "Low Risk" ? "कम" : s.riskLevel === "Moderate Risk" ? "मध्यम" : "उच्च"}
                    </td>

                    {/* Liquidity */}
                    <td className={`px-3 py-3 text-center text-xs font-semibold ${LIQ_CLASS[s.liquidity] ?? "text-zinc-400"}`}>
                      {s.liquidity === "High" ? "उच्च" : s.liquidity === "Medium" ? "मध्यम" : "कम"}
                    </td>

                    {/* Retirement */}
                    <td className="px-3 py-3 text-center">{boolCell(s.retirementSupport)}</td>

                    {/* Medical */}
                    <td className="px-3 py-3 text-center">{boolCell(s.medicalCoverage)}</td>

                    {/* Insurance */}
                    <td className="px-3 py-3 text-center">{boolCell(s.hasInsurance)}</td>

                    {/* Loan limit */}
                    <td className="px-3 py-3 text-center text-xs text-zinc-400 max-w-[160px]">
                      {loanLimit}
                    </td>

                    {/* Min contribution */}
                    <td className="px-3 py-3 text-center text-xs text-zinc-400">
                      {minContr}
                    </td>

                    {/* Detail link */}
                    <td className="px-3 py-3 text-center">
                      <Link
                        href={`/scheme/${s.id}`}
                        className="text-xs text-green-500 hover:text-green-300 transition font-semibold whitespace-nowrap"
                      >
                        हेर्नुस् →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-zinc-600">
          <span><span className="text-green-400 font-bold">✓</span> = उपलब्ध</span>
          <span><span className="text-zinc-700">✗</span> = उपलब्ध छैन</span>
          <span><span className="text-green-400 font-bold">दर %</span> = ≥8% उत्कृष्ट</span>
          <span><span className="text-yellow-400 font-bold">दर %</span> = ४–७.९%</span>
          <span><span className="text-green-400">जोखिम</span> = कम</span>
          <span><span className="text-yellow-400">जोखिम</span> = मध्यम</span>
          <span><span className="text-red-400">जोखिम</span> = उच्च</span>
          <span>न्यूनतम: योगदान % वा NPR रकम</span>
        </div>

        {/* CTA */}
        <div className="mt-8 flex gap-3 flex-wrap">
          <Link href="/recommend" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-2.5 rounded-2xl transition-colors text-sm">
            ⚡ AI सिफारिस पाउनुस्
          </Link>
          <Link href="/calculator" className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold px-5 py-2.5 rounded-2xl transition-colors text-sm">
            🔢 क्यालकुलेटर
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 font-semibold px-5 py-2.5 rounded-2xl transition-colors text-sm">
            ← योजनाहरू
          </Link>
        </div>

      </div>
    </main>
  );
}
