"use client";

import Link from "next/link";
import type { ScriptDraft } from "../../../../../lib/types/content";

const SCRIPTS: ScriptDraft[] = [
  {
    id: "script-epf-v1",
    ideaId: "epf-explained-v1",
    title: "नेपालमा EPF कसरी काम गर्छ?",
    status: "outline",
    updatedAt: "2026-05-11",
    sections: [
      { label: "Hook",          duration: "0:00–0:30",  notes: "Surprising EPF stat: average Nepali worker EPF corpus at retirement is ₹X — show real number from NRB data" },
      { label: "Problem",       duration: "0:30–1:30",  notes: "Most people don't understand their own EPF. Employer deducts, money disappears — where does it go?" },
      { label: "What is EPF",   duration: "1:30–3:30",  notes: "10% employee + 10% employer. EPFO Nepal registration. Who is eligible (formal sector only). B-roll: office worker" },
      { label: "How it grows",  duration: "3:30–5:30",  notes: "Compound interest. Current NRB rate. Show ZZC calculator — enter ₹10k/month, 30 years. Run it live." },
      { label: "Common mistakes",duration: "5:30–8:00", notes: "1. Early withdrawal penalty. 2. Not transferring when changing jobs. 3. Ignoring SSF parallel account." },
      { label: "SSF connection", duration: "8:00–10:00",notes: "Brief SSF mention — separate video teaser. Link between EPF and formal sector compliance." },
      { label: "AI Demo",        duration: "10:00–11:30",notes: "ZZC AI Recommend screen — show pension category results. Gen Z profile input." },
      { label: "CTA",            duration: "11:30–12:00",notes: "Subscribe + try ZZC EPF calculator + comment: 'EPF check गर्नुभयो?' + link in bio" },
    ],
  },
];

const TEMPLATE_SECTIONS = [
  { label: "Hook",           duration: "0:00–0:30",  purpose: "Surprising stat or relatable question. Must create curiosity." },
  { label: "Problem Frame",  duration: "0:30–1:30",  purpose: "Why this matters to a Nepali Gen Z viewer specifically." },
  { label: "Core Explainer", duration: "1:30–6:00",  purpose: "The actual knowledge. Use ZZC calculator or scheme data." },
  { label: "Mistakes",       duration: "6:00–8:30",  purpose: "3 common mistakes or misconceptions. High retention format." },
  { label: "AI/Tool Demo",   duration: "8:30–10:30", purpose: "Live ZZC screen record: calculator, AI recommend, or scheme browser." },
  { label: "CTA + Subscribe", duration: "10:30–12:00",purpose: "Subscribe + tool link + comment prompt. One clear action." },
];

export default function ScriptsPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <Link href="/vault/content/youtube" className="text-zinc-600 hover:text-zinc-400 text-sm">YouTube</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Scripts</h1>
        </div>

        {/* Script template */}
        <section className="mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">ZZC Script Template (10–14 min)</h2>
          <div className="space-y-1">
            {TEMPLATE_SECTIONS.map(s => (
              <div key={s.label} className="flex items-start gap-3 p-2.5 border-b border-zinc-800 last:border-0 text-sm">
                <span className="text-green-400 font-medium w-32 shrink-0">{s.label}</span>
                <span className="text-zinc-600 font-mono text-xs w-24 shrink-0 mt-0.5">{s.duration}</span>
                <span className="text-zinc-400 text-xs">{s.purpose}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Active scripts */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Active Scripts — {SCRIPTS.length}
          </h2>
          <div className="space-y-4">
            {SCRIPTS.map(script => (
              <div key={script.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-white text-sm">{script.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400">{script.status}</span>
                </div>
                <div className="space-y-1">
                  {script.sections.map((sec, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0 text-xs">
                      <span className="text-zinc-600 font-mono w-24 shrink-0 mt-0.5">{sec.duration}</span>
                      <span className="text-green-400 font-medium w-28 shrink-0">{sec.label}</span>
                      <span className="text-zinc-400">{sec.notes}</span>
                    </div>
                  ))}
                </div>
                <p className="text-zinc-700 text-xs mt-3">Updated: {script.updatedAt}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mt-6 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-500">
          Scripts are drafted in Google Docs and linked here once in review. Tag media assets with{" "}
          <span className="text-zinc-300 font-mono">contentType="script"</span> in{" "}
          <Link href="/vault/media" className="text-green-400 hover:text-green-300">Media Vault</Link>.
        </div>

      </div>

  );
}
