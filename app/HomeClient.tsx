"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

type OrgFilter = "सबै" | "EPF" | "CIT" | "SSF";
type CategoryFilter = "सबै" | "Investment" | "Loan" | "Insurance" | "Pension";

const ORG_FILTERS: OrgFilter[] = ["सबै", "EPF", "CIT", "SSF"];

const CATEGORY_FILTERS: { value: CategoryFilter; label: string; icon: string }[] = [
  { value: "सबै",       label: "सबै",    icon: "🏛️" },
  { value: "Investment", label: "लगानी",  icon: "📈" },
  { value: "Loan",       label: "ऋण",    icon: "🏠" },
  { value: "Insurance",  label: "बीमा",  icon: "🛡️" },
  { value: "Pension",    label: "पेन्सन", icon: "🎯" },
];

export default function Home() {

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<OrgFilter>("सबै");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("सबै");

  useEffect(() => {

    const fetchSchemes = async () => {

      try {

        const querySnapshot = await getDocs(
          collection(db, "structuredSchemes")
        );

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

    const matchesCategory =
      categoryFilter === "सबै" || s.category === categoryFilter;

    return matchesSearch && matchesOrg && matchesCategory;

  });

  const orgColor: Record<string, string> = {
    EPF: "bg-blue-600",
    CIT: "bg-purple-600",
    SSF: "bg-orange-600",
  };

  return (

    <main className="min-h-screen bg-black text-white p-10">

      <div className="max-w-7xl mx-auto">

        {/* Hero */}
        <div className="mb-10">

          <h1 className="text-5xl font-extrabold mb-3 text-white">
            ZZC — Zeneration Z Chautari
          </h1>

          <p className="text-zinc-400 text-lg">
            Nepal ko Gen Z — Paisa Sikau, Bhavishya Banau
          </p>

        </div>

        {/* खोज */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="योजना खोज्नुस्..."
          className="
            w-full
            bg-zinc-900
            border
            border-zinc-700
            rounded-2xl
            px-5
            py-4
            text-white
            placeholder-zinc-500
            focus:outline-none
            focus:border-green-500
            text-base
            mb-6
          "
        />

        {/* संस्था फिल्टर */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {ORG_FILTERS.map((tab) => (
            <button
              key={tab}
              onClick={() => setOrgFilter(tab)}
              className={`
                px-5
                py-2
                rounded-full
                text-sm
                font-bold
                transition
                ${
                  orgFilter === tab
                    ? "bg-green-500 text-black"
                    : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-700"
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* श्रेणी फिल्टर */}
        <div className="flex gap-2 mb-10 flex-wrap">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`
                flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition
                ${
                  categoryFilter === cat.value
                    ? "bg-zinc-200 text-black"
                    : "bg-zinc-800 text-zinc-500 hover:text-white"
                }
              `}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* नतिजा संख्या */}
        {!loading && (
          <p className="text-zinc-600 text-sm mb-6">
            {filtered.length} योजना
            {orgFilter !== "सबै" || categoryFilter !== "सबै" || search
              ? " भेटियो"
              : " उपलब्ध"}
          </p>
        )}

        {loading && (
          <p className="text-zinc-600 mb-8">योजनाहरू लोड हुँदैछ...</p>
        )}

        {/* ग्रिड */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

          {filtered.map((scheme) => (

            <a
              href={`/scheme/${scheme.id}`}
              key={scheme.id}
              className="
                bg-zinc-900
                border
                border-zinc-800
                rounded-3xl
                p-6
                hover:border-green-600
                hover:scale-[1.01]
                transition
                duration-200
                shadow-xl
                block
                group
              "
            >

              <div className="flex items-start justify-between gap-3 mb-4">

                <h2 className="text-xl font-bold leading-snug group-hover:text-green-400 transition">
                  {scheme.title}
                </h2>

                <span
                  className={`
                    text-xs
                    px-3
                    py-1
                    rounded-full
                    text-white
                    font-bold
                    shrink-0
                    ${orgColor[scheme.organization] ?? "bg-zinc-700"}
                  `}
                >
                  {scheme.organization}
                </span>

              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-400 mb-4">

                <p>
                  <span className="text-zinc-600">श्रेणी </span>
                  {scheme.category}
                </p>

                <p>
                  <span className="text-zinc-600">जोखिम </span>
                  {scheme.riskLevel}
                </p>

                <p>
                  <span className="text-zinc-600">ब्याज </span>
                  {scheme.interestRate ? `${scheme.interestRate}%` : "N/A"}
                </p>

                <p>
                  <span className="text-zinc-600">तरलता </span>
                  {scheme.liquidity}
                </p>

              </div>

              {scheme.benefits?.slice(0, 3).map((b: string, i: number) => (
                <span
                  key={i}
                  className="
                    inline-block
                    bg-zinc-800
                    text-zinc-300
                    text-xs
                    px-2.5
                    py-1
                    rounded-full
                    mr-1.5
                    mb-1.5
                  "
                >
                  {b}
                </span>
              ))}

              <p className="mt-4 text-zinc-500 text-sm leading-relaxed line-clamp-2">
                {scheme.nepaliSummary || scheme.summary}
              </p>

            </a>

          ))}

        </div>

        {!loading && filtered.length === 0 && categoryFilter === "Loan" && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="text-6xl mb-4">🏠</div>
            <p className="text-2xl font-bold text-white mb-2">ऋण योजनाहरू</p>
            <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
              EPF ऋण (५ प्रकार), CIT ऋण (३ प्रकार) र SSF ऋण (३ प्रकार) — Admin प्यानलबाट थप्न सकिन्छ।
              अहिलेको लागि AI सिफारिस प्रयोग गर्नुस्।
            </p>
            <a
              href="/recommend"
              className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors"
            >
              🤖 AI ऋण सिफारिस पाउनुस् →
            </a>
          </div>
        )}
        {!loading && filtered.length === 0 && categoryFilter !== "Loan" && (
          <div className="text-center py-24 text-zinc-600">
            <p className="text-2xl font-bold mb-2">कुनै योजना भेटिएन</p>
            <p className="text-sm">खोज वा फिल्टर परिवर्तन गर्नुस्</p>
          </div>
        )}

      </div>

    </main>

  );

}
