"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES,
} from "../lib/schemes-data";

type OrgFilter = "सबै" | "EPF" | "CIT" | "SSF";
type CategoryFilter = "सबै" | "Investment" | "Loan" | "Insurance" | "Pension";

const ORG_FILTERS: OrgFilter[] = ["सबै", "EPF", "CIT", "SSF"];

/* Static Tailwind maps — no template literals */
const CAT_CARD: Record<"Investment" | "Loan" | "Insurance" | "Pension", {
  icon: string; nepali: string;
  border: string; activeBorder: string;
  bg: string; activeBg: string;
  text: string; countBg: string;
  dot: string;
}> = {
  Investment: {
    icon: "📈", nepali: "लगानी",
    border: "border-green-900", activeBorder: "border-green-500",
    bg: "bg-zinc-900", activeBg: "bg-green-950/40",
    text: "text-green-400", countBg: "bg-green-900/40",
    dot: "bg-green-500",
  },
  Loan: {
    icon: "🏠", nepali: "ऋण",
    border: "border-blue-900", activeBorder: "border-blue-500",
    bg: "bg-zinc-900", activeBg: "bg-blue-950/40",
    text: "text-blue-400", countBg: "bg-blue-900/40",
    dot: "bg-blue-500",
  },
  Insurance: {
    icon: "🛡️", nepali: "बीमा",
    border: "border-rose-900", activeBorder: "border-rose-500",
    bg: "bg-zinc-900", activeBg: "bg-rose-950/40",
    text: "text-rose-400", countBg: "bg-rose-900/40",
    dot: "bg-rose-500",
  },
  Pension: {
    icon: "🎯", nepali: "पेन्सन",
    border: "border-purple-900", activeBorder: "border-purple-500",
    bg: "bg-zinc-900", activeBg: "bg-purple-950/40",
    text: "text-purple-400", countBg: "bg-purple-900/40",
    dot: "bg-purple-500",
  },
};

const CAT_SCHEMES: Record<"Investment" | "Loan" | "Insurance" | "Pension", typeof INVESTMENT_SCHEMES> = {
  Investment: INVESTMENT_SCHEMES,
  Loan:       LOAN_SCHEMES,
  Insurance:  INSURANCE_SCHEMES,
  Pension:    PENSION_SCHEMES,
};

const orgColor: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
};

export default function Home() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<OrgFilter>("सबै");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("सबै");

  useEffect(() => {
    const fetchSchemes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "structuredSchemes"));
        const data: any[] = [];
        querySnapshot.forEach((docItem) => {
          data.push({ id: docItem.id, ...docItem.data() });
        });
        setSchemes(data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchSchemes();
  }, []);

  const filtered = schemes.filter((s) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      s.title?.toLowerCase().includes(q) ||
      s.summary?.toLowerCase().includes(q) ||
      s.nepaliSummary?.toLowerCase().includes(q) ||
      s.organization?.toLowerCase().includes(q);
    const matchesOrg = orgFilter === "सबै" || s.organization === orgFilter;
    const matchesCategory = categoryFilter === "सबै" || s.category === categoryFilter;
    return matchesSearch && matchesOrg && matchesCategory;
  });

  const handleCategoryCard = (cat: "Investment" | "Loan" | "Insurance" | "Pension") => {
    setCategoryFilter((prev) => (prev === cat ? "सबै" : cat));
    setSearch("");
    setOrgFilter("सबै");
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 sm:px-6 py-6 sm:py-10">
      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <div className="mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold mb-2 sm:mb-3 text-white leading-tight">
            ZZC — Zeneration Z Chautari
          </h1>
          <p className="text-zinc-400 text-sm sm:text-lg">
            Nepal ko Gen Z — Paisa Sikau, Bhavishya Banau
          </p>
        </div>

        {/* ── 4 Category Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {(["Investment", "Loan", "Insurance", "Pension"] as const).map((cat) => {
            const styles = CAT_CARD[cat];
            const isActive = categoryFilter === cat;
            const catSchemes = CAT_SCHEMES[cat];
            return (
              <button
                key={cat}
                onClick={() => handleCategoryCard(cat)}
                className={`
                  text-left rounded-3xl border p-5 transition-all duration-200
                  ${isActive
                    ? `${styles.activeBorder} ${styles.activeBg} shadow-lg`
                    : `${styles.border} ${styles.bg} hover:${styles.activeBorder}`
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{styles.icon}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.countBg} ${styles.text}`}>
                    {catSchemes.length} योजना
                  </span>
                </div>
                <p className={`font-black text-lg mb-3 ${isActive ? styles.text : "text-white"}`}>
                  {styles.nepali}
                </p>
                <ul className="space-y-1.5">
                  {catSchemes.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
                      <span className="text-zinc-400 text-xs truncate">{s.titleNepali}</span>
                    </li>
                  ))}
                  {catSchemes.length > 3 && (
                    <li className="text-zinc-600 text-xs pl-3.5">
                      +{catSchemes.length - 3} थप...
                    </li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="योजना खोज्नुस्..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 text-base mb-6"
        />

        {/* Org filter */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {ORG_FILTERS.map((tab) => (
            <button
              key={tab}
              onClick={() => setOrgFilter(tab)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition ${
                orgFilter === tab
                  ? "bg-green-500 text-black"
                  : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
              }`}
            >
              {tab}
            </button>
          ))}
          {/* active category badge */}
          {categoryFilter !== "सबै" && (
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].countBg} ${CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].text}`}>
              {CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].icon} {CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].nepali}
              <button onClick={() => setCategoryFilter("सबै")} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          )}
        </div>

        {/* Result count */}
        {!loading && (
          <p className="text-zinc-600 text-sm mb-6">
            {filtered.length} योजना
            {orgFilter !== "सबै" || categoryFilter !== "सबै" || search ? " भेटियो" : " उपलब्ध"}
          </p>
        )}

        {loading && <p className="text-zinc-600 mb-8">योजनाहरू लोड हुँदैछ...</p>}

        {/* Grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
          {filtered.map((scheme) => (
            <a
              href={`/scheme/${scheme.id}`}
              key={scheme.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-green-600 hover:scale-[1.01] transition duration-200 shadow-xl block group"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold leading-snug group-hover:text-green-400 transition">
                  {scheme.title}
                </h2>
                <span className={`text-xs px-3 py-1 rounded-full text-white font-bold shrink-0 ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
                  {scheme.organization}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-400 mb-4">
                <p><span className="text-zinc-600">श्रेणी </span>{scheme.category}</p>
                <p><span className="text-zinc-600">जोखिम </span>{scheme.riskLevel}</p>
                <p><span className="text-zinc-600">ब्याज </span>{scheme.interestRate ? `${scheme.interestRate}%` : "N/A"}</p>
                <p><span className="text-zinc-600">तरलता </span>{scheme.liquidity}</p>
              </div>

              {scheme.benefits?.slice(0, 3).map((b: string, i: number) => (
                <span key={i} className="inline-block bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full mr-1.5 mb-1.5">
                  {b}
                </span>
              ))}

              <p className="mt-4 text-zinc-500 text-sm leading-relaxed line-clamp-2">
                {scheme.nepaliSummary || scheme.summary}
              </p>
            </a>
          ))}
        </div>

        {/* Empty states */}
        {!loading && filtered.length === 0 && categoryFilter === "Loan" && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-6xl mb-4">🏠</div>
            <p className="text-2xl font-bold text-white mb-2">ऋण योजनाहरू</p>
            <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
              EPF ({LOAN_SCHEMES.filter((s) => s.organization === "EPF").length} प्रकार),
              CIT ({LOAN_SCHEMES.filter((s) => s.organization === "CIT").length} प्रकार) र
              SSF ({LOAN_SCHEMES.filter((s) => s.organization === "SSF").length} प्रकार) ऋण योजनाहरू
              — Admin प्यानलबाट थप्न सकिन्छ।
            </p>
            <div className="space-y-2 text-left mb-6">
              {LOAN_SCHEMES.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {s.titleNepali}
                  {s.interestRate && <span className="text-zinc-600 text-xs">· {s.interestRate}%</span>}
                </div>
              ))}
            </div>
            <a
              href="/recommend"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors"
            >
              🤖 AI ऋण सिफारिस पाउनुस् →
            </a>
          </div>
        )}

        {!loading && filtered.length === 0 && categoryFilter !== "Loan" && categoryFilter !== "सबै" && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{CAT_CARD[categoryFilter as "Investment" | "Insurance" | "Pension"].icon}</div>
            <p className="text-xl font-bold text-white mb-2">
              {CAT_CARD[categoryFilter as "Investment" | "Insurance" | "Pension"].nepali} योजनाहरू Firestore मा थपिएका छैनन्
            </p>
            <p className="text-zinc-500 text-sm mb-6">
              Admin प्यानलबाट थप्नुस् वा AI सिफारिस प्रयोग गर्नुस्।
            </p>
            <a
              href="/recommend"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors"
            >
              🤖 AI सिफारिस →
            </a>
          </div>
        )}

        {!loading && filtered.length === 0 && (search || orgFilter !== "सबै") && categoryFilter === "सबै" && (
          <div className="text-center py-24 text-zinc-600">
            <p className="text-2xl font-bold mb-2">कुनै योजना भेटिएन</p>
            <p className="text-sm">खोज वा फिल्टर परिवर्तन गर्नुस्</p>
          </div>
        )}

      </div>
    </main>
  );
}
