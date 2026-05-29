"use client";

import Link from "next/link";

export default function HomeClient() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-20">

      {/* Identity */}
      <div className="text-center mb-12 sm:mb-16 space-y-3">
        <p className="text-zinc-600 text-xs tracking-widest uppercase font-mono">
          AI for Nepal · By Nepal · Rooted in Knowledge
        </p>
        <h1 className="text-5xl sm:text-7xl font-black tracking-tight">
          <span className="text-emerald-400">Z</span>
          <span className="text-violet-400">Z</span>
          <span className="text-white">C</span>
        </h1>
        <p className="text-zinc-300 text-lg sm:text-xl font-semibold">
          नेपालको नागरिक र भक्ति ज्ञान चौतारी
        </p>
        <p className="text-zinc-600 text-sm max-w-md mx-auto leading-relaxed">
          Verified documents, sacred texts, and AI-assisted intelligence —
          explained simply for Nepal&apos;s new generation.
        </p>
      </div>

      {/* Two doors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 w-full max-w-2xl">

        {/* Civic */}
        <Link
          href="/civic"
          className="group relative flex flex-col gap-4 p-6 sm:p-8 rounded-2xl border border-emerald-800/40 bg-emerald-950/10 hover:bg-emerald-950/20 hover:border-emerald-700/60 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏛</span>
            <div>
              <p className="text-emerald-300 font-black text-lg">Civic Chautari</p>
              <p className="text-emerald-700 text-xs">नागरिक ज्ञान</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
              संविधान — Constitutional intelligence
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
              सरकारी reports — Policy facts, source-traced
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-emerald-600 shrink-0" />
              नागरिक explainers — Rights, schemes, governance
            </li>
          </ul>
          <div className="mt-auto pt-2 flex items-center justify-between">
            <span className="text-emerald-500 text-xs font-mono">
              Source-backed · Founder-verified
            </span>
            <span className="text-emerald-400 group-hover:translate-x-1 transition-transform font-bold">
              →
            </span>
          </div>
        </Link>

        {/* Bhakti */}
        <Link
          href="/bhakti"
          className="group relative flex flex-col gap-4 p-6 sm:p-8 rounded-2xl border border-violet-800/40 bg-violet-950/10 hover:bg-violet-950/20 hover:border-violet-700/60 transition-all duration-300"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">🛕</span>
            <div>
              <p className="text-violet-300 font-black text-lg">Bhakti Chautari</p>
              <p className="text-violet-700 text-xs">भक्ति ज्ञान</p>
            </div>
          </div>
          <ul className="space-y-1.5 text-sm text-zinc-400">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-violet-600 shrink-0" />
              Sanskrit shloka — Meaning, context, wisdom
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-violet-600 shrink-0" />
              भजन र स्तोत्र — Sacred text learning
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-violet-600 shrink-0" />
              Leela · Character wisdom · Chambers
            </li>
          </ul>
          <div className="mt-auto pt-2 flex items-center justify-between">
            <span className="text-violet-500 text-xs font-mono">
              Sacred · Source-grounded · Curated
            </span>
            <span className="text-violet-400 group-hover:translate-x-1 transition-transform font-bold">
              →
            </span>
          </div>
        </Link>
      </div>

      {/* Subtle footer links */}
      <div className="mt-12 sm:mt-16 flex items-center gap-6 text-xs text-zinc-700">
        <Link href="/janta" className="hover:text-zinc-400 transition">जन्ता</Link>
        <span>·</span>
        <Link href="/constitution" className="hover:text-zinc-400 transition">संविधान</Link>
        <span>·</span>
        <Link href="/calculator" className="hover:text-zinc-400 transition">Calculator</Link>
        <span>·</span>
        <Link href="/vault" className="hover:text-zinc-400 transition">Founder OS</Link>
      </div>

    </main>
  );
}
