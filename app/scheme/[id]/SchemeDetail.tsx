"use client";

import { useEffect, useState } from "react";
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
  Investment: { icon: "📈", nepali: "लगानी", text: "text-green-400", border: "border-green-800", bg: "bg-green-950/30" },
  Loan:       { icon: "🏠", nepali: "ऋण",    text: "text-blue-400",  border: "border-blue-800",  bg: "bg-blue-950/30"  },
  Insurance:  { icon: "🛡️", nepali: "बीमा",  text: "text-rose-400",  border: "border-rose-800",  bg: "bg-rose-950/30"  },
  Pension:    { icon: "🎯", nepali: "पेन्सन", text: "text-purple-400",border: "border-purple-800",bg: "bg-purple-950/30"},
};

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
        <p className="text-zinc-600">लोड हुँदैछ...</p>
      </main>
    );
  }

  if (!scheme) {
    return (
      <main className="min-h-screen bg-black text-white px-6 py-12">
        <a href="/" className="text-green-400 text-sm hover:underline">← सबै योजनाहरूमा फर्कनुस्</a>
        <p className="text-zinc-500 mt-8">योजना भेटिएन।</p>
      </main>
    );
  }

  const cat = scheme.category as SchemeCategory | undefined;
  const catMeta = cat ? CAT_META[cat] : null;
  const related = cat
    ? getByCategory(cat).filter((s: Scheme) => s.id !== id).slice(0, 4)
    : [];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">

        <a href="/" className="text-green-400 text-sm mb-8 inline-block hover:underline">
          ← सबै योजनाहरूमा फर्कनुस्
        </a>

        {/* Category badge */}
        {catMeta && (
          <div className={`inline-flex items-center gap-2 mt-6 mb-4 px-4 py-1.5 rounded-full border text-sm font-semibold ${catMeta.border} ${catMeta.bg} ${catMeta.text}`}>
            <span>{catMeta.icon}</span>
            <span>{catMeta.nepali}</span>
          </div>
        )}

        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-4xl font-black text-white leading-tight">{scheme.title}</h1>
            {scheme.titleNepali && scheme.titleNepali !== scheme.title && (
              <p className="text-zinc-500 text-lg mt-1">{scheme.titleNepali}</p>
            )}
          </div>
          {scheme.organization && (
            <span className={`text-sm px-4 py-1.5 rounded-full text-white font-black shrink-0 ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
              {scheme.organization}
            </span>
          )}
        </div>

        {/* मुख्य जानकारी */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">
          {[
            { label: "संस्था",    value: scheme.organization },
            { label: "श्रेणी",    value: scheme.category },
            { label: "उपश्रेणी",  value: scheme.subcategory },
            { label: "जोखिम",    value: scheme.riskLevel },
            { label: "तरलता",    value: scheme.liquidity },
            { label: "ब्याज दर", value: scheme.interestRate ? `${scheme.interestRate}%` : null },
            { label: "ऋण सीमा",  value: scheme.loanLimit ?? null },
          ].map(({ label, value }) => value ? (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-3 flex items-center justify-between">
              <span className="text-zinc-500 text-sm">{label}</span>
              <span className="text-white font-semibold text-sm">{value}</span>
            </div>
          ) : null)}
        </div>

        {/* सुविधाहरू */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs mb-1">सेवानिवृत्ति</p>
            <p className={`font-black text-lg ${scheme.retirementSupport ? "text-green-400" : "text-zinc-700"}`}>
              {scheme.retirementSupport ? "छ" : "छैन"}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs mb-1">बीमा</p>
            <p className={`font-black text-lg ${scheme.hasInsurance || scheme.insurance ? "text-green-400" : "text-zinc-700"}`}>
              {scheme.hasInsurance || scheme.insurance ? "छ" : "छैन"}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
            <p className="text-zinc-500 text-xs mb-1">स्वास्थ्य सुविधा</p>
            <p className={`font-black text-lg ${scheme.medicalCoverage ? "text-green-400" : "text-zinc-700"}`}>
              {scheme.medicalCoverage ? "छ" : "छैन"}
            </p>
          </div>
        </div>

        {/* सारांश */}
        {(scheme.nepaliSummary || scheme.summary) && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-8">
            <h2 className="text-xl font-black mb-3 text-green-400">सारांश</h2>
            <p className="text-zinc-300 leading-relaxed">{scheme.nepaliSummary || scheme.summary}</p>
          </div>
        )}

        {/* फाइदाहरू */}
        {scheme.benefits?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4">फाइदाहरू</h2>
            <div className="flex flex-wrap gap-2">
              {scheme.benefits.map((b: string, i: number) => (
                <span key={i} className="bg-zinc-800 text-zinc-300 text-sm px-4 py-2 rounded-full">{b}</span>
              ))}
            </div>
          </div>
        )}

        {/* योग्यता */}
        {scheme.eligibility?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4">योग्यता शर्तहरू</h2>
            <ul className="space-y-2">
              {scheme.eligibility.map((e: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  {e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* कागजातहरू */}
        {scheme.documents?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4">आवश्यक कागजातहरू</h2>
            <ul className="space-y-2">
              {scheme.documents.map((d: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-zinc-400 text-sm">
                  <span className="text-zinc-600 mt-0.5 shrink-0">•</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-3 flex-wrap mb-10">
          <a
            href="/calculator"
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-black px-6 py-3 rounded-2xl transition-colors"
          >
            🧮 क्याल्कुलेटर
          </a>
          <a
            href="/recommend"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold px-6 py-3 rounded-2xl border border-zinc-700 transition-colors"
          >
            🤖 AI सिफारिस
          </a>
        </div>

        {/* Related schemes */}
        {related.length > 0 && catMeta && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4">
              <span className={catMeta.text}>{catMeta.icon}</span>{" "}
              यही श्रेणीका अन्य योजनाहरू
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {related.map((s: Scheme) => (
                <a
                  key={s.id}
                  href={`/scheme/${s.id}`}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 block transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white">{s.titleNepali}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${orgColor[s.organization] ?? "bg-zinc-700"}`}>
                      {s.organization}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-xs line-clamp-2">{s.nepaliSummary}</p>
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
