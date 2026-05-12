"use client";

import Link from "next/link";


export default function YouTubePage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-4 flex items-center gap-3 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">YouTube</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400">Primary channel</span>
        </div>

        {/* Pipeline sub-nav */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { href: "/vault/content/youtube/first-video", label: "🎬 First Video", badge: "ready" },
            { href: "/vault/content/youtube/ideas",       label: "💡 Ideas",       badge: "10" },
            { href: "/vault/content/youtube/scripts",     label: "📝 Scripts",     badge: "1" },
            { href: "/vault/content/youtube/thumbnails",  label: "🖼 Thumbnails",  badge: "3" },
            { href: "/vault/content/youtube/published",   label: "✅ Published",   badge: "0" },
          ].map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-lg text-xs text-zinc-300 whitespace-nowrap transition-colors"
            >
              {n.label}
              <span className="text-zinc-600">{n.badge}</span>
            </Link>
          ))}
        </div>

        {/* First video CTA */}
        <Link
          href="/vault/content/youtube/first-video"
          className="block mb-6 p-4 bg-zinc-900 border border-yellow-900/50 hover:border-yellow-600 rounded-xl transition-colors group"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 font-medium">Production ready</span>
              </div>
              <p className="text-white font-semibold text-sm mb-0.5">नेपालमा EPF कसरी काम गर्छ? | Complete Guide 2026</p>
              <p className="text-zinc-500 text-xs">Full script · 3 thumbnail prompts · Short derivative · Step-by-step production checklist</p>
            </div>
            <span className="text-zinc-600 group-hover:text-yellow-400 transition-colors ml-4 shrink-0">→</span>
          </div>
        </Link>

        {/* Channel strategy */}
        <section className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Channel Strategy</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div><p className="text-zinc-600 mb-0.5">Frequency</p><p className="text-zinc-300">1 long/week + 3 shorts</p></div>
            <div><p className="text-zinc-600 mb-0.5">Audience</p><p className="text-zinc-300">Nepali Gen Z 18–30</p></div>
            <div><p className="text-zinc-600 mb-0.5">Upload time</p><p className="text-zinc-300">7:00 PM NST</p></div>
            <div><p className="text-zinc-600 mb-0.5">CTA</p><p className="text-green-400">ZZC Calculator</p></div>
          </div>
        </section>

      </div>

  );
}
