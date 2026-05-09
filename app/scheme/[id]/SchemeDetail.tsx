"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

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
      <main className="p-10 text-white bg-black min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </main>
    );
  }

  if (!scheme) {
    return (
      <main className="p-10 text-white bg-black min-h-screen">
        <p className="text-zinc-500">Scheme not found.</p>
      </main>
    );
  }

  return (

    <main className="p-10 text-white bg-black min-h-screen">

      <a
        href="/"
        className="text-green-400 text-sm mb-8 inline-block hover:underline"
      >
        ← Back to all schemes
      </a>

      <h1 className="text-4xl font-bold mb-6">
        {scheme.title}
      </h1>

      <div className="space-y-4">

        <p>
          <span className="text-gray-400">Organization:</span>
          {" "}
          {scheme.organization}
        </p>

        <p>
          <span className="text-gray-400">Category:</span>
          {" "}
          {scheme.category}
        </p>

        <p>
          <span className="text-gray-400">Subcategory:</span>
          {" "}
          {scheme.subcategory}
        </p>

        <p>
          <span className="text-gray-400">Risk:</span>
          {" "}
          {scheme.riskLevel}
        </p>

        <p>
          <span className="text-gray-400">Liquidity:</span>
          {" "}
          {scheme.liquidity}
        </p>

        <p>
          <span className="text-gray-400">Interest Rate:</span>
          {" "}
          {scheme.interestRate || "N/A"}
        </p>

        {scheme.benefits?.length > 0 && (
          <div className="mt-4">
            <p className="text-gray-400 mb-2">Benefits:</p>
            <div className="flex flex-wrap gap-2">
              {scheme.benefits.map((b: string, i: number) => (
                <span
                  key={i}
                  className="bg-zinc-800 text-xs px-3 py-1 rounded-full"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6">

          <h2 className="text-2xl font-bold mb-2">
            Summary
          </h2>

          <p className="text-gray-300 leading-relaxed">
            {scheme.summary}
          </p>

        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-8">

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-gray-400 text-sm mb-1">Retirement</p>
            <p className="text-green-400 font-black text-xl">
              {scheme.retirementSupport ? "YES" : "NO"}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-gray-400 text-sm mb-1">Insurance</p>
            <p className="text-green-400 font-black text-xl">
              {scheme.insurance ? "YES" : "NO"}
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <p className="text-gray-400 text-sm mb-1">Medical Coverage</p>
            <p className="text-green-400 font-black text-xl">
              {scheme.medicalCoverage ? "YES" : "NO"}
            </p>
          </div>

        </div>

      </div>

    </main>

  );

}
