"use client";

import Link from "next/link";

const BRAND_ASSETS = [
  {
    id:       "zzc-logo-v1",
    name:     "zzc-logo-v1.png",
    type:     "Logo",
    status:   "pending" as const,
    note:     "Primary logo — green on black. Upload via Media vault.",
    spec:     "1:1 ratio, min 500×500px, PNG transparent",
  },
  {
    id:       "zzc-youtube-banner-v1",
    name:     "zzc-youtube-banner-v1.png",
    type:     "YouTube Banner",
    status:   "pending" as const,
    note:     "Channel art — safe zone 1235×338px. Full: 2560×1440px.",
    spec:     "2560×1440px, safe zone 1235×338px, <6MB",
  },
  {
    id:       "zzc-thumbnail-template-v1",
    name:     "zzc-thumbnail-template-v1.psd",
    type:     "Thumbnail Template",
    status:   "pending" as const,
    note:     "Reusable Canva/Photoshop thumbnail template.",
    spec:     "1280×720px, 72dpi, high contrast text",
  },
];

const PLATFORMS = [
  {
    href:    "/vault/content/ai-studio",
    icon:    "⚡",
    label:   "AI Studio",
    sub:     "Script · Thumbnail prompt · Voice (soon)",
    color:   "border-green-900 hover:border-green-500",
    badge:   "Tier 1 live",
    badgeColor: "bg-green-900/40 text-green-400",
  },
  {
    href:    "/vault/content/youtube",
    icon:    "▶",
    label:   "YouTube",
    sub:     "Long-form · 10–20 min",
    color:   "border-red-900 hover:border-red-500",
    badge:   "Primary channel",
    badgeColor: "bg-red-900/40 text-red-400",
  },
  {
    href:    "/vault/content/shorts",
    icon:    "⚡",
    label:   "Shorts / Reels",
    sub:     "YouTube Shorts · Instagram · TikTok",
    color:   "border-purple-900 hover:border-purple-500",
    badge:   "Fastest growth",
    badgeColor: "bg-purple-900/40 text-purple-400",
  },
  {
    href:    "/vault/content/facebook",
    icon:    "📘",
    label:   "Facebook",
    sub:     "Short clips · Posts",
    color:   "border-blue-900 hover:border-blue-500",
    badge:   "Nepal reach",
    badgeColor: "bg-blue-900/40 text-blue-400",
  },
];

const STATUS_PILL: Record<"pending" | "uploaded" | "approved", string> = {
  pending:  "bg-zinc-800 text-zinc-400",
  uploaded: "bg-yellow-900/40 text-yellow-400",
  approved: "bg-green-900/40 text-green-400",
};

export default function ContentPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">Content Operations</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Brand assets · Production pipelines · Platform workflows</p>
        </div>

        {/* Brand Identity */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Brand Assets</h2>
            <Link href="/vault/media" className="text-xs text-green-400 hover:text-green-300">
              Upload → Media Vault
            </Link>
          </div>
          <div className="space-y-2">
            {BRAND_ASSETS.map(a => (
              <div key={a.id} className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono text-zinc-200">{a.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_PILL[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{a.note}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">Spec: {a.spec}</p>
                </div>
                <Link
                  href="/vault/media"
                  className="shrink-0 text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Upload
                </Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            After uploading, tag with topic="brand" and contentType="thumbnail" or "b-roll" in the media vault.
          </p>
        </section>

        {/* ZZC Brand Guidelines (inline, quick ref) */}
        <section className="mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Brand Voice</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-zinc-500 mb-1">Colors</p>
              <div className="flex gap-1">
                <span className="w-5 h-5 rounded bg-green-500 border border-zinc-700" title="#22c55e" />
                <span className="w-5 h-5 rounded bg-black border border-zinc-700" title="#000000" />
                <span className="w-5 h-5 rounded bg-zinc-900 border border-zinc-700" title="#18181b" />
              </div>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Tone</p>
              <p className="text-zinc-300">Gen Z · Smart · Nepali-first</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">Language</p>
              <p className="text-zinc-300">नेपाली + English terms</p>
            </div>
            <div>
              <p className="text-zinc-500 mb-1">CTA</p>
              <p className="text-zinc-300">AI सिफारिस · Calculator</p>
            </div>
          </div>
        </section>

        {/* Platform Pipelines */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Production Pipelines</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PLATFORMS.map(p => (
              <Link
                key={p.href}
                href={p.href}
                className={`block p-4 bg-zinc-900 border rounded-xl transition-colors ${p.color}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.badgeColor}`}>{p.badge}</span>
                </div>
                <p className="font-semibold text-white text-sm">{p.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{p.sub}</p>
              </Link>
            ))}
          </div>
        </section>

      </div>

  );
}
