"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { SCHEMES, getByCategory } from "../../../lib/schemes-data";
import type { Scheme, SchemeCategory } from "../../../lib/schemes-data";

const orgColor: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
  NEPSE: "bg-green-700",
  Beema: "bg-rose-700",
};

const CAT_META: Record<SchemeCategory, { icon: string; nepali: string; text: string; border: string; bg: string }> = {
  Investment: { icon: "📈", nepali: "लगानी", text: "text-green-400",  border: "border-green-800",  bg: "bg-green-950/30"  },
  Loan:       { icon: "🏠", nepali: "ऋण",    text: "text-blue-400",   border: "border-blue-800",   bg: "bg-blue-950/30"   },
  Insurance:  { icon: "🛡️", nepali: "बीमा",  text: "text-rose-400",   border: "border-rose-800",   bg: "bg-rose-950/30"   },
  Pension:    { icon: "🎯", nepali: "पेन्सन", text: "text-purple-400", border: "border-purple-800", bg: "bg-purple-950/30" },
};

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 text-base font-black text-white mb-4">
      <span className="w-0.5 h-4 bg-green-500 rounded-full shrink-0" />
      {children}
    </h2>
  );
}

export default function SchemeDetail({ id }: { id: string }) {
  const [scheme, setScheme] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchScheme = async () => {
      try {
        const docRef = doc(db, "structuredSchemes", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setScheme({ id: docSnap.id, ...docSnap.data() });
          return;
        }
      } catch {
        // fall through to lib data
      }
      const libScheme = SCHEMES.find((s) => s.id === id);
      if (libScheme) setScheme(libScheme);
      setLoading(false);
    };
    fetchScheme().finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <p className="text-zinc-600 text-sm">लोड हुँदैछ...</p>
      </main>
    );
  }

  if (!scheme) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <Link href="/" className="text-green-400 text-sm hover:underline">← सबै योजनाहरूमा फर्कनुस्</Link>
        <p className="text-zinc-500 mt-8 text-sm">योजना भेटिएन।</p>
      </main>
    );
  }

  const cat = scheme.category as SchemeCategory | undefined;
  const catMeta = cat ? CAT_META[cat] : null;
  const related = cat
    ? getByCategory(cat).filter((s: Scheme) => s.id !== id).slice(0, 4)
    : [];

  const features = [
    scheme.retirementSupport                      && "सेवानिवृत्ति सुविधा",
    (scheme.hasInsurance || scheme.insurance)      && "बीमा सुविधा",
    scheme.medicalCoverage                        && "स्वास्थ्य सुविधा",
  ].filter(Boolean) as string[];

  const metaStats = [
    { label: "जोखिम",    value: scheme.riskLevel   },
    { label: "तरलता",    value: scheme.liquidity    },
    { label: "ऋण सीमा",  value: scheme.loanLimit   },
    { label: "उपश्रेणी", value: scheme.subcategory },
    { label: "संस्था",   value: scheme.organization },
  ].filter((i) => i.value);

  return (
    <main className="min-h-screen bg-black text-white">

      {/* ── Page header ── */}
      <div className="border-b border-zinc-900 px-4 sm:px-6 py-7 sm:py-10">
        <div className="max-w-4xl mx-auto">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-600 mb-5">
            <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
            <span>/</span>
            <Link href="/" className="hover:text-zinc-400 transition">योजनाहरू</Link>
            {catMeta && (
              <>
                <span>/</span>
                <span className={catMeta.text}>{catMeta.nepali}</span>
              </>
            )}
          </nav>

          {/* Badges */}
          <div className="flex items-center flex-wrap gap-2 mb-4">
            {catMeta && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${catMeta.border} ${catMeta.bg} ${catMeta.text}`}>
                {catMeta.icon} {catMeta.nepali}
              </span>
            )}
            {scheme.organization && (
              <span className={`text-xs px-3 py-1 rounded-full text-white font-bold ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
                {scheme.organization}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-1">
            {scheme.title}
          </h1>
          {scheme.titleNepali && scheme.titleNepali !== scheme.title && (
            <p className="text-zinc-500 text-base mt-1">{scheme.titleNepali}</p>
          )}

          {/* Feature tags */}
          {features.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {features.map((f) => (
                <span key={f} className="flex items-center gap-1.5 text-xs text-green-400 bg-green-950/30 border border-green-900 px-3 py-1 rounded-full">
                  <span className="font-bold">✓</span> {f}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* ── Key metrics ── */}
        {(scheme.interestRate || metaStats.length > 0) && (
          <div className="flex flex-wrap gap-3 mb-10">
            {scheme.interestRate && (
              <div className="bg-green-950/20 border border-green-800 rounded-2xl px-5 py-4 min-w-[110px]">
                <p className="text-zinc-500 text-xs mb-1">ब्याज दर</p>
                <p className="text-3xl font-black text-green-400 leading-none">{scheme.interestRate}%</p>
              </div>
            )}
            {metaStats.map(({ label, value }) => (
              <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 min-w-[100px]">
                <p className="text-zinc-500 text-xs mb-1">{label}</p>
                <p className="text-white font-bold text-sm leading-snug">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Summary ── */}
        {(scheme.nepaliSummary || scheme.summary) && (
          <div className="mb-10">
            <SectionHead>सारांश</SectionHead>
            <p className="text-zinc-300 leading-relaxed text-sm sm:text-base">
              {scheme.nepaliSummary || scheme.summary}
            </p>
          </div>
        )}

        {/* ── Benefits ── */}
        {scheme.benefits?.length > 0 && (
          <div className="mb-10">
            <SectionHead>फाइदाहरू</SectionHead>
            <div className="flex flex-wrap gap-2">
              {scheme.benefits.map((b: string, i: number) => (
                <span key={i} className="bg-zinc-800 text-zinc-300 text-sm px-4 py-2 rounded-full">
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Eligibility ── */}
        {scheme.eligibility?.length > 0 && (
          <div className="mb-10">
            <SectionHead>योग्यता शर्तहरू</SectionHead>
            <ul className="space-y-2.5">
              {scheme.eligibility.map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                  <span className="text-green-500 mt-0.5 shrink-0 font-bold">✓</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Documents ── */}
        {scheme.documents?.length > 0 && (
          <div className="mb-10">
            <SectionHead>आवश्यक कागजातहरू</SectionHead>
            <ul className="space-y-2">
              {scheme.documents.map((d: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                  <span className="text-zinc-600 mt-0.5 shrink-0">→</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── CTAs ── */}
        <div className="flex gap-3 flex-wrap pt-6 border-t border-zinc-900 mb-12">
          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors text-sm"
          >
            🔢 क्यालकुलेटर
          </Link>
          <Link
            href="/recommend"
            className="inline-flex items-center gap-2 border border-zinc-700 hover:border-green-700 text-zinc-300 hover:text-white font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
          >
            ⚡ AI सिफारिस
          </Link>
          <Link
            href="/compare"
            className="inline-flex items-center gap-2 border border-zinc-800 hover:border-zinc-600 text-zinc-500 hover:text-zinc-300 font-semibold px-6 py-3 rounded-2xl transition-colors text-sm"
          >
            ⚖ तुलना गर्नुस्
          </Link>
        </div>

        {/* ── Related schemes ── */}
        {related.length > 0 && catMeta && (
          <div>
            <SectionHead>यही श्रेणीका अन्य योजनाहरू</SectionHead>
            <div className="grid sm:grid-cols-2 gap-3">
              {related.map((s: Scheme) => (
                <Link
                  key={s.id}
                  href={`/scheme/${s.id}`}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 block transition group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-white group-hover:text-green-400 transition leading-snug">
                      {s.titleNepali}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold shrink-0 ${orgColor[s.organization] ?? "bg-zinc-700"}`}>
                      {s.organization}
                    </span>
                  </div>
                  {s.interestRate && (
                    <p className="text-green-400 text-xs font-bold mb-1.5">{s.interestRate}% ब्याज</p>
                  )}
                  <p className="text-zinc-500 text-xs line-clamp-2">{s.nepaliSummary}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
