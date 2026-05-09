"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

const MAX_COMPARE = 4;

interface CompareRow {
  label: string;
  key: string;
  format?: (v: any) => string;
}

const COMPARE_ROWS: CompareRow[] = [
  { label: "Organization", key: "organization" },
  { label: "Category", key: "category" },
  { label: "Subcategory", key: "subcategory" },
  { label: "Interest Rate", key: "interestRate", format: (v) => v ? `${v}%` : "N/A" },
  { label: "Risk Level", key: "riskLevel" },
  { label: "Liquidity", key: "liquidity" },
  { label: "Retirement Support", key: "retirementSupport", format: (v) => v ? "YES" : "NO" },
  { label: "Insurance", key: "insurance", format: (v) => v ? "YES" : "NO" },
  { label: "Medical Coverage", key: "medicalCoverage", format: (v) => v ? "YES" : "NO" },
  { label: "Pension", key: "pension", format: (v) => v ? "YES" : "NO" },
  { label: "Gratuity", key: "gratuity", format: (v) => v ? "YES" : "NO" },
  { label: "Loan Limit", key: "loanLimit", format: (v) => v ? `NPR ${Number(v).toLocaleString()}` : "N/A" },
  { label: "Calculator", key: "calculatorEnabled", format: (v) => v ? "Available" : "—" },
];

const orgColor: Record<string, string> = {
  EPF: "border-blue-500",
  CIT: "border-purple-500",
  SSF: "border-orange-500",
};

const orgBg: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
};

function boolColor(key: string, value: any): string {
  if (typeof value !== "boolean") return "";
  const positive = ["retirementSupport", "insurance", "medicalCoverage", "pension", "gratuity", "calculatorEnabled"];
  if (positive.includes(key)) return value ? "text-green-400 font-black" : "text-zinc-700";
  return "";
}

export default function ComparePage() {

  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {

    const fetchSchemes = async () => {

      try {
        const qs = await getDocs(collection(db, "structuredSchemes"));
        const data: any[] = [];
        qs.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setSchemes(data);
      } catch (err) {
        console.log(err);
      } finally {
        setLoading(false);
      }

    };

    fetchSchemes();

  }, []);

  const toggleScheme = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const selectedSchemes = selected
    .map((id) => schemes.find((s) => s.id === id))
    .filter(Boolean);

  const filteredSchemes = schemes.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.title?.toLowerCase().includes(q) || s.organization?.toLowerCase().includes(q);
  });

  return (

    <main className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-7xl mx-auto">

        <h1 className="text-5xl font-black text-green-400 mb-3">
          Smart Compare
        </h1>

        <p className="text-zinc-400 text-lg mb-10">
          Select up to {MAX_COMPARE} schemes to compare side-by-side.
        </p>

        {/* Scheme Selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-10">

          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">

            <h2 className="text-xl font-black">
              Select Schemes
              <span className="text-zinc-600 font-normal text-base ml-2">
                ({selected.length}/{MAX_COMPARE} selected)
              </span>
            </h2>

            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="text-zinc-500 hover:text-white text-sm transition"
              >
                Clear all
              </button>
            )}

          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search schemes..."
            className="
              w-full
              bg-black
              border
              border-zinc-700
              rounded-2xl
              px-4
              py-3
              text-sm
              placeholder-zinc-600
              focus:outline-none
              focus:border-green-500
              mb-4
            "
          />

          {loading && <p className="text-zinc-600 text-sm">Loading schemes...</p>}

          <div className="grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">

            {filteredSchemes.map((scheme) => {
              const isSelected = selected.includes(scheme.id);
              const isDisabled = !isSelected && selected.length >= MAX_COMPARE;

              return (
                <button
                  key={scheme.id}
                  onClick={() => !isDisabled && toggleScheme(scheme.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-start gap-3
                    p-4
                    rounded-2xl
                    border
                    text-left
                    transition
                    ${
                      isSelected
                        ? `${orgColor[scheme.organization] ?? "border-green-500"} bg-zinc-800`
                        : isDisabled
                        ? "border-zinc-800 bg-zinc-900/50 opacity-40 cursor-not-allowed"
                        : "border-zinc-800 bg-black hover:border-zinc-600"
                    }
                  `}
                >
                  <div
                    className={`
                      w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center
                      ${isSelected ? "border-green-400 bg-green-400" : "border-zinc-600"}
                    `}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${isSelected ? "text-white" : "text-zinc-400"}`}>
                      {scheme.title}
                    </p>
                    <span
                      className={`
                        inline-block mt-1 text-xs px-2 py-0.5 rounded-full text-white font-bold
                        ${orgBg[scheme.organization] ?? "bg-zinc-700"}
                      `}
                    >
                      {scheme.organization}
                    </span>
                  </div>
                </button>
              );
            })}

          </div>

        </div>

        {/* Comparison Table */}
        {selectedSchemes.length >= 2 && (

          <div>

            <h2 className="text-2xl font-black mb-6">Comparison</h2>

            {/* Desktop table */}
            <div className="overflow-x-auto">

              <table className="w-full border-collapse">

                <thead>
                  <tr>
                    <th className="text-left p-4 text-zinc-600 font-semibold text-sm w-40 shrink-0" />
                    {selectedSchemes.map((s) => (
                      <th
                        key={s.id}
                        className={`
                          p-4 text-center border-b-2 min-w-[200px]
                          ${orgColor[s.organization] ?? "border-zinc-700"}
                        `}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${orgBg[s.organization] ?? "bg-zinc-700"}`}
                          >
                            {s.organization}
                          </span>
                          <span className="text-white font-bold text-sm leading-snug">{s.title}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {COMPARE_ROWS.map((row, i) => (
                    <tr
                      key={row.key}
                      className={i % 2 === 0 ? "bg-zinc-900/50" : "bg-black"}
                    >
                      <td className="p-4 text-zinc-500 text-sm font-semibold whitespace-nowrap">
                        {row.label}
                      </td>
                      {selectedSchemes.map((s) => {
                        const raw = s[row.key];
                        const display = row.format ? row.format(raw) : (raw ?? "—");
                        return (
                          <td
                            key={s.id}
                            className={`p-4 text-center text-sm ${boolColor(row.key, raw) || "text-zinc-300"}`}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Benefits row */}
                  <tr className="bg-zinc-900/50">
                    <td className="p-4 text-zinc-500 text-sm font-semibold align-top">Benefits</td>
                    {selectedSchemes.map((s) => (
                      <td key={s.id} className="p-4 align-top">
                        <ul className="space-y-1">
                          {s.benefits?.map((b: string, i: number) => (
                            <li key={i} className="text-xs text-zinc-400 flex items-start gap-1.5">
                              <span className="text-green-600 mt-0.5 shrink-0">•</span>
                              {b}
                            </li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                </tbody>

              </table>

            </div>

            {/* View detail links */}
            <div className="flex gap-3 mt-6 flex-wrap">
              {selectedSchemes.map((s) => (
                <a
                  key={s.id}
                  href={`/scheme/${s.id}`}
                  className="text-sm text-zinc-500 hover:text-green-400 transition"
                >
                  View {s.title} →
                </a>
              ))}
            </div>

          </div>

        )}

        {selected.length === 1 && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-xl font-bold">Select one more scheme to compare</p>
          </div>
        )}

        {selected.length === 0 && !loading && (
          <div className="text-center py-16 text-zinc-600">
            <p className="text-xl font-bold">Select at least 2 schemes above</p>
            <p className="text-sm mt-2">You can compare up to {MAX_COMPARE} at once</p>
          </div>
        )}

      </div>

    </main>

  );

}
