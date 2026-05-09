"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const orgColor: Record<string, string> = {
  EPF: "bg-blue-600",
  CIT: "bg-purple-600",
  SSF: "bg-orange-600",
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
        }

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }

    };

    fetchScheme();

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

  return (

    <main className="min-h-screen bg-black text-white px-6 py-12">

      <div className="max-w-4xl mx-auto">

        <a
          href="/"
          className="text-green-400 text-sm mb-8 inline-block hover:underline"
        >
          ← सबै योजनाहरूमा फर्कनुस्
        </a>

        <div className="flex items-start justify-between gap-4 mt-6 mb-8 flex-wrap">
          <h1 className="text-4xl font-black text-white leading-tight">
            {scheme.title}
          </h1>
          {scheme.organization && (
            <span className={`text-sm px-4 py-1.5 rounded-full text-white font-black shrink-0 ${orgColor[scheme.organization] ?? "bg-zinc-700"}`}>
              {scheme.organization}
            </span>
          )}
        </div>

        {/* मुख्य जानकारी */}
        <div className="grid sm:grid-cols-2 gap-3 mb-8">

          {[
            { label: "संस्था", value: scheme.organization },
            { label: "श्रेणी", value: scheme.category },
            { label: "उपश्रेणी", value: scheme.subcategory },
            { label: "जोखिम", value: scheme.riskLevel },
            { label: "तरलता", value: scheme.liquidity },
            { label: "ब्याज दर", value: scheme.interestRate ? `${scheme.interestRate}%` : "N/A" },
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
            <p className={`font-black text-lg ${scheme.insurance ? "text-green-400" : "text-zinc-700"}`}>
              {scheme.insurance ? "छ" : "छैन"}
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
            <p className="text-zinc-300 leading-relaxed">
              {scheme.nepaliSummary || scheme.summary}
            </p>
          </div>
        )}

        {/* फाइदाहरू */}
        {scheme.benefits?.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-black mb-4">फाइदाहरू</h2>
            <div className="flex flex-wrap gap-2">
              {scheme.benefits.map((b: string, i: number) => (
                <span
                  key={i}
                  className="bg-zinc-800 text-zinc-300 text-sm px-4 py-2 rounded-full"
                >
                  {b}
                </span>
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

      </div>

    </main>

  );

}
