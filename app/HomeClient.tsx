"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "./firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import {
  INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES,
} from "../lib/schemes-data";
import { useMarketRates } from "../hooks/useMarketRates";

type OrgFilter = "सबै" | "EPF" | "CIT" | "SSF";
type CategoryFilter = "सबै" | "Investment" | "Loan" | "Insurance" | "Pension";

const ORG_FILTERS: OrgFilter[] = ["सबै", "EPF", "CIT", "SSF"];

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

const TOOLS = [
  {
    href: "/recommend",
    label: "AI सिफारिस",
    sublabel: "तपाईंको प्रोफाइल → सही योजना",
    border: "border-green-800 hover:border-green-500",
    text: "text-green-400",
    bg: "bg-green-950/20 hover:bg-green-950/40",
    icon: "⚡",
    badge: "AI",
  },
  {
    href: "/compare",
    label: "तुलना गर्नुस्",
    sublabel: "29+ योजना एकै ठाउँमा",
    border: "border-zinc-800 hover:border-blue-600",
    text: "text-blue-400",
    bg: "bg-zinc-900 hover:bg-blue-950/20",
    icon: "⚖️",
    badge: null,
  },
  {
    href: "/calculator",
    label: "क्यालकुलेटर",
    sublabel: "SIP, EMI, सेवानिवृत्ति, जोखिम",
    border: "border-zinc-800 hover:border-purple-600",
    text: "text-purple-400",
    bg: "bg-zinc-900 hover:bg-purple-950/20",
    icon: "🔢",
    badge: null,
  },
  {
    href: "/eligibility",
    label: "योग्यता जाँच",
    sublabel: "तपाईं कुन योजनामा पर्नुहुन्छ?",
    border: "border-zinc-800 hover:border-orange-600",
    text: "text-orange-400",
    bg: "bg-zinc-900 hover:bg-orange-950/20",
    icon: "✓",
    badge: null,
  },
] as const;

export default function Home() {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<OrgFilter>("सबै");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("सबै");
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const { rates, hasVerifiedData, updatedAt: ratesUpdatedAt, source: ratesSource } = useMarketRates();

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

  async function handleEmailSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    setEmailStatus("submitting");
    try {
      await addDoc(collection(db, "audience_leads"), {
        email:        email.toLowerCase().trim(),
        subscribedAt: new Date().toISOString(),
        source:       "homepage",
        subscribed:   true,
      });
      setEmailStatus("success");
      setEmail("");
    } catch {
      setEmailStatus("error");
    }
  }

  const handleCategoryCard = (cat: "Investment" | "Loan" | "Insurance" | "Pension") => {
    setCategoryFilter((prev) => (prev === cat ? "सबै" : cat));
    setSearch("");
    setOrgFilter("सबै");
  };

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ── Intelligence Hero ── */}
      <section className="px-4 sm:px-6 pt-10 pb-10 sm:pt-16 sm:pb-14 border-b border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Nepal Finance Intelligence</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
                नेपालको लगानी<br />
                <span className="text-green-400">बुझ्नुस्, निर्णय गर्नुस्।</span>
              </h1>
              <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-lg">
                EPF, CIT, SSF, NEPSE — सबै योजनाहरू एकै ठाउँमा।
                AI सिफारिस, तुलना, क्यालकुलेटर र योग्यता जाँच।
              </p>
            </div>
            <div className="flex gap-3 sm:flex-col sm:items-end shrink-0">
              <Link
                href="/recommend"
                className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-5 py-3 rounded-2xl transition-colors text-sm"
              >
                ⚡ AI सिफारिस
              </Link>
              <Link
                href="/compare"
                className="inline-flex items-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold px-5 py-3 rounded-2xl transition-colors text-sm"
              >
                तुलना गर्नुस् →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Market Rates Ticker ── */}
      <section className="bg-zinc-950 border-b border-zinc-900 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto">
          {hasVerifiedData ? (
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-none">
              <span className="text-green-600 text-[10px] font-mono font-bold tracking-widest shrink-0">VERIFIED</span>
              <div className="w-px h-3.5 bg-zinc-800 shrink-0" />
              {([
                { label: "EPF",     value: `${rates.epfRate}%`,         color: "text-blue-400"   },
                { label: "SSF",     value: `${rates.ssfRate}%`,         color: "text-orange-400" },
                { label: "FD",      value: `${rates.fdRate}%`,          color: "text-green-400"  },
                { label: "NEPSE",   value: `~${rates.nepseAvgReturn}%`, color: "text-purple-400" },
                { label: "USD/NPR", value: `रु${rates.usdToNprRate}`,   color: "text-zinc-300"   },
              ] as const).map((r, i) => (
                <div key={r.label} className={`flex items-baseline gap-1.5 shrink-0 ${i > 0 ? "pl-4 border-l border-zinc-800" : ""}`}>
                  <span className="text-zinc-600 text-xs font-mono">{r.label}</span>
                  <span className={`text-sm font-bold font-mono ${r.color}`}>{r.value}</span>
                </div>
              ))}
              <div className="ml-auto shrink-0 hidden sm:flex flex-col items-end gap-0.5">
                {ratesUpdatedAt && (
                  <span className="text-zinc-700 text-[10px] font-mono">अपडेट: {ratesUpdatedAt}</span>
                )}
                {ratesSource && (
                  <span className="text-zinc-700 text-[10px]">स्रोत: {ratesSource}</span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-zinc-700 text-[10px] font-mono font-bold tracking-widest">दर डेटा</span>
              <span className="text-zinc-600 text-xs">Admin द्वारा अझै प्रमाणीकरण गरिएको छैन</span>
              <span className="text-zinc-700 text-[10px] font-mono">— Vault → Public Data मा अपडेट गर्नुस्</span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── 4 Tool Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-14">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 block ${tool.border} ${tool.bg}`}
            >
              {tool.badge && (
                <span className="absolute top-3 right-3 text-[10px] font-black text-black bg-green-500 px-1.5 py-0.5 rounded-md leading-none">
                  {tool.badge}
                </span>
              )}
              <div className="text-xl mb-3">{tool.icon}</div>
              <p className={`font-black text-sm sm:text-base mb-1 ${tool.text}`}>{tool.label}</p>
              <p className="text-zinc-500 text-xs leading-snug">{tool.sublabel}</p>
            </Link>
          ))}
        </div>

        {/* ── Scheme Explorer ── */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white">योजना Explorer</h2>
            <p className="text-zinc-600 text-xs mt-0.5">नेपालका सबै प्रमुख बचत र लगानी योजनाहरू</p>
          </div>
          <Link
            href="/compare"
            className="text-xs text-zinc-500 hover:text-green-400 transition border border-zinc-800 hover:border-zinc-700 px-3 py-1.5 rounded-xl"
          >
            सबै तुलना →
          </Link>
        </div>

        {/* Category filter cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          {(["Investment", "Loan", "Insurance", "Pension"] as const).map((cat) => {
            const styles = CAT_CARD[cat];
            const isActive = categoryFilter === cat;
            const catSchemes = CAT_SCHEMES[cat];
            return (
              <button
                key={cat}
                onClick={() => handleCategoryCard(cat)}
                className={`text-left rounded-2xl border p-4 transition-all duration-200 ${
                  isActive
                    ? `${styles.activeBorder} ${styles.activeBg}`
                    : `${styles.border} ${styles.bg} hover:${styles.activeBorder}`
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{styles.icon}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.countBg} ${styles.text}`}>
                    {catSchemes.length}
                  </span>
                </div>
                <p className={`font-black text-sm mb-2 ${isActive ? styles.text : "text-white"}`}>
                  {styles.nepali}
                </p>
                <ul className="space-y-1">
                  {catSchemes.slice(0, 2).map((s) => (
                    <li key={s.id} className="flex items-center gap-1.5">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${styles.dot}`} />
                      <span className="text-zinc-500 text-xs truncate">{s.titleNepali}</span>
                    </li>
                  ))}
                  {catSchemes.length > 2 && (
                    <li className="text-zinc-700 text-xs pl-2.5">+{catSchemes.length - 2} थप</li>
                  )}
                </ul>
              </button>
            );
          })}
        </div>

        {/* Search + org filter row */}
        <div className="flex gap-3 mb-4 flex-col sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="योजना खोज्नुस्..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-600 text-sm"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {ORG_FILTERS.map((tab) => (
              <button
                key={tab}
                onClick={() => setOrgFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  orgFilter === tab
                    ? "bg-green-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Active category badge */}
        {categoryFilter !== "सबै" && (
          <div className="flex items-center gap-2 mb-4">
            <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].countBg} ${CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].text}`}>
              {CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].icon}{" "}
              {CAT_CARD[categoryFilter as "Investment" | "Loan" | "Insurance" | "Pension"].nepali}
              <button onClick={() => setCategoryFilter("सबै")} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            </span>
          </div>
        )}

        {!loading && (
          <p className="text-zinc-600 text-xs mb-5">
            {filtered.length} योजना{orgFilter !== "सबै" || categoryFilter !== "सबै" || search ? " भेटियो" : " उपलब्ध"}
          </p>
        )}

        {loading && <p className="text-zinc-600 text-sm mb-8">योजनाहरू लोड हुँदैछ...</p>}

        {/* Scheme grid */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5 mb-16">
          {filtered.map((scheme) => (
            <Link
              href={`/scheme/${scheme.id}`}
              key={scheme.id}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 hover:border-green-700 transition duration-200 block group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-base font-bold leading-snug group-hover:text-green-400 transition">
                  {scheme.title}
                </h2>
                <span className={`text-xs px-2.5 py-0.5 rounded-full text-white font-bold shrink-0 ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
                  {scheme.organization}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-400 mb-3">
                <p><span className="text-zinc-600">श्रेणी </span>{scheme.category}</p>
                <p><span className="text-zinc-600">जोखिम </span>{scheme.riskLevel}</p>
                <p><span className="text-zinc-600">ब्याज </span>{scheme.interestRate ? `${scheme.interestRate}%` : "N/A"}</p>
                <p><span className="text-zinc-600">तरलता </span>{scheme.liquidity}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {scheme.benefits?.slice(0, 3).map((b: string, i: number) => (
                  <span key={i} className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full">
                    {b}
                  </span>
                ))}
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">
                {scheme.nepaliSummary || scheme.summary}
              </p>
            </Link>
          ))}
        </div>

        {/* Empty states */}
        {!loading && filtered.length === 0 && categoryFilter === "Loan" && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-5xl mb-4">🏠</div>
            <p className="text-xl font-bold text-white mb-2">ऋण योजनाहरू</p>
            <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
              EPF ({LOAN_SCHEMES.filter((s) => s.organization === "EPF").length} प्रकार),
              CIT ({LOAN_SCHEMES.filter((s) => s.organization === "CIT").length} प्रकार) र
              SSF ({LOAN_SCHEMES.filter((s) => s.organization === "SSF").length} प्रकार) ऋण योजनाहरू
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
            <Link href="/recommend" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors text-sm">
              ⚡ AI ऋण सिफारिस →
            </Link>
          </div>
        )}

        {!loading && filtered.length === 0 && categoryFilter !== "Loan" && categoryFilter !== "सबै" && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">{CAT_CARD[categoryFilter as "Investment" | "Insurance" | "Pension"].icon}</div>
            <p className="text-lg font-bold text-white mb-2">
              {CAT_CARD[categoryFilter as "Investment" | "Insurance" | "Pension"].nepali} योजनाहरू Firestore मा थपिएका छैनन्
            </p>
            <p className="text-zinc-500 text-sm mb-6">AI सिफारिस प्रयोग गर्नुस्।</p>
            <Link href="/recommend" className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors text-sm">
              ⚡ AI सिफारिस →
            </Link>
          </div>
        )}

        {!loading && filtered.length === 0 && (search || orgFilter !== "सबै") && categoryFilter === "सबै" && (
          <div className="text-center py-20 text-zinc-600">
            <p className="text-xl font-bold mb-2">कुनै योजना भेटिएन</p>
            <p className="text-sm">खोज वा फिल्टर परिवर्तन गर्नुस्</p>
          </div>
        )}

        {/* ── Email Capture ── */}
        <div className="border border-zinc-800 rounded-3xl p-8 sm:p-10 max-w-2xl mx-auto text-center bg-zinc-950/60">
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-semibold mb-3">Intelligence अपडेट</p>
          <h3 className="text-xl sm:text-2xl font-black text-white mb-2">Nepal Finance को खबर पाउनुस्</h3>
          <p className="text-zinc-500 text-sm mb-7 leading-relaxed">
            नयाँ scheme, NRB circulars, NEPSE updates र AI insights — सिधै email मा।
          </p>
          {emailStatus === "success" ? (
            <div className="bg-green-950/40 border border-green-800 rounded-2xl px-6 py-5">
              <p className="text-green-400 font-bold">✓ Subscribed!</p>
              <p className="text-zinc-500 text-sm mt-1">हामी तपाईंलाई जानकारी दिनेछौं।</p>
            </div>
          ) : (
            <form onSubmit={handleEmailSubscribe} className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tapainko@email.com"
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-green-500 text-sm"
                disabled={emailStatus === "submitting"}
              />
              <button
                type="submit"
                disabled={!email || emailStatus === "submitting"}
                className="bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black px-6 py-3 rounded-xl transition-colors text-sm shrink-0"
              >
                {emailStatus === "submitting" ? "..." : "Subscribe"}
              </button>
            </form>
          )}
          {emailStatus === "error" && (
            <p className="text-red-400 text-xs mt-3">केही गल्ती भयो। फेरि प्रयास गर्नुस्।</p>
          )}
          <p className="text-zinc-700 text-xs mt-4">Spam छैन। जुनसुकै बेला unsubscribe गर्न सकिन्छ।</p>
        </div>

      </div>
    </main>
  );
}
