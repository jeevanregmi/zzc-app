"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

const ORG_TABS = ["All", "EPF", "CIT", "SSF"] as const;
const CATEGORY_FILTERS = ["All", "Investment", "Pension", "Insurance"] as const;

type OrgTab = (typeof ORG_TABS)[number];
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export default function Home() {

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<OrgTab>("All");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("All");

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
      s.organization?.toLowerCase().includes(q);

    const matchesOrg = orgFilter === "All" || s.organization === orgFilter;

    const matchesCategory =
      categoryFilter === "All" || s.category === categoryFilter;

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

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search schemes..."
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

        {/* Org Tabs */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {ORG_TABS.map((tab) => (
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

        {/* Category Chips */}
        <div className="flex gap-2 mb-10 flex-wrap">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`
                px-4
                py-1.5
                rounded-full
                text-xs
                font-semibold
                transition
                ${
                  categoryFilter === cat
                    ? "bg-zinc-200 text-black"
                    : "bg-zinc-800 text-zinc-500 hover:text-white"
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-zinc-600 text-sm mb-6">
            {filtered.length} scheme{filtered.length !== 1 ? "s" : ""}
            {orgFilter !== "All" || categoryFilter !== "All" || search
              ? " matching filters"
              : " total"}
          </p>
        )}

        {loading && (
          <p className="text-zinc-600 mb-8">Loading schemes...</p>
        )}

        {/* Grid */}
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
                  <span className="text-zinc-600">Category</span>
                  {" "}
                  {scheme.category}
                </p>

                <p>
                  <span className="text-zinc-600">Risk</span>
                  {" "}
                  {scheme.riskLevel}
                </p>

                <p>
                  <span className="text-zinc-600">Rate</span>
                  {" "}
                  {scheme.interestRate ? `${scheme.interestRate}%` : "N/A"}
                </p>

                <p>
                  <span className="text-zinc-600">Liquidity</span>
                  {" "}
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
                {scheme.summary}
              </p>

            </a>

          ))}

        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-24 text-zinc-600">
            <p className="text-2xl font-bold mb-2">No schemes found</p>
            <p className="text-sm">Try adjusting your search or filters</p>
          </div>
        )}

      </div>

    </main>

  );

}
