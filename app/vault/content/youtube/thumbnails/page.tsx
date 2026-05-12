"use client";

import Link from "next/link";
import type { ThumbnailPrompt } from "../../../../../lib/types/content";

/* Reusable prompt architecture — fill [BRACKETS] per video */
const PROMPT_ARCHITECTURE = {
  base: `Professional YouTube thumbnail for a Nepal fintech education channel called ZZC.
Style: dark background (#000 or #18181b), bold green (#22c55e) accent color, white high-contrast text.
Typography: large bold Nepali headline in top 60% of frame, small English subline below.
Mood: authoritative, modern, Gen Z appropriate. No stock-photo feel.`,
  styleVariants: [
    {
      id: "calculator-screen",
      name: "Calculator Screen",
      prompt: `[BASE] Main visual: ZZC financial calculator interface screenshot on left half, glowing green. Right half: bold Nepali text "[HEADLINE]". Small badge top-right: "ZZC AI". Aspect ratio 1280x720.`,
    },
    {
      id: "talking-head",
      name: "Talking Head",
      prompt: `[BASE] Left 40%: close-up face with surprised/engaged expression, green rim light. Right 60%: large bold text "[HEADLINE]", small text "[SUBLINE]". Subtle rupee symbol background watermark.`,
    },
    {
      id: "data-viz",
      name: "Data Visualization",
      prompt: `[BASE] Center: dramatic bar chart or growth curve, green on dark, showing "[STAT]" at the peak. Top text: "[HEADLINE]" in large white. Bottom: "ZZC Calculator | zzc.jeevanregmi.com.np" small.`,
    },
    {
      id: "split-screen",
      name: "Split Screen (Comparison)",
      prompt: `[BASE] Left half: red/dark zone labeled "[OPTION A]" with ✗. Right half: green zone labeled "[OPTION B]" with ✓. Center vertical divider. Top: "[HEADLINE]". Used for SSF vs EPF, SIP vs Lump Sum.`,
    },
    {
      id: "text-only",
      name: "Bold Text Only",
      prompt: `[BASE] Large bold Nepali text "[HEADLINE]" centered, takes 70% of frame. Subtle "[SUBLINE]" below in smaller weight. Green ZZC logo badge bottom-right. High contrast, minimal.`,
    },
  ],
};

const THUMBNAILS: ThumbnailPrompt[] = [
  {
    id: "thumb-epf-v1",
    ideaId: "epf-explained-v1",
    headline: "EPF को राज खुल्यो",
    subline: "नेपाली युवाले नजानेको कुरा",
    visualStyle: "calculator-screen",
    palette: "green-black",
    aiPrompt: `Professional YouTube thumbnail for Nepal fintech channel ZZC. Dark black background. Left: ZZC calculator interface showing EPF projection chart (green bars growing upward). Right: bold white Nepali text "EPF को राज खुल्यो" (large), smaller subline "नेपाली युवाले नजानेको कुरा". Green rupee symbol accent. ZZC badge top-right. 1280x720px. Modern, clean, Gen Z aesthetic.`,
    status: "draft",
    createdAt: "2026-05-11",
  },
  {
    id: "thumb-ai-recommend-v1",
    ideaId: "ai-recommend-demo-v1",
    headline: "AI ले मेरो Investment छान्यो",
    subline: "Nepal मा best scheme — हेर्नुस्",
    visualStyle: "calculator-screen",
    palette: "green-black",
    aiPrompt: `Professional YouTube thumbnail for Nepal fintech channel ZZC. Dark background. Left: AI chat interface showing ZZC recommendation (green highlights). Right: large bold white Nepali text "AI ले मेरो Investment छान्यो". Glowing green AI circuit pattern subtle in background. ZZC badge. Surprised human face emoji overlay optional. 1280x720px.`,
    status: "draft",
    createdAt: "2026-05-11",
  },
  {
    id: "thumb-ssf-epf-v1",
    ideaId: "ssf-vs-epf-v1",
    headline: "SSF vs EPF",
    subline: "कुन राम्रो? AI ले छान्यो",
    visualStyle: "split-screen",
    palette: "green-black",
    aiPrompt: `Professional YouTube thumbnail, split-screen style. Left half dark red: "SSF" in large white text with subtle ✗. Right half dark green: "EPF" in large white text with ✓. Center divider glowing. Top: "SSF vs EPF" bold. Bottom small: "ZZC Nepal | AI Recommendation". 1280x720px. Modern fintech aesthetic.`,
    status: "draft",
    createdAt: "2026-05-11",
  },
];

const STATUS_COLOR: Record<string, string> = {
  draft:     "bg-zinc-800 text-zinc-500",
  generated: "bg-blue-900/40 text-blue-400",
  approved:  "bg-yellow-900/40 text-yellow-400",
  uploaded:  "bg-green-900/40 text-green-400",
};

export default function ThumbnailsPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <Link href="/vault/content/youtube" className="text-zinc-600 hover:text-zinc-400 text-sm">YouTube</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Thumbnails</h1>
        </div>

        {/* Prompt Architecture */}
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Prompt Architecture</h2>
          <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-3">
            <p className="text-xs text-zinc-500 mb-1">Base Style (applies to all variants)</p>
            <p className="text-xs text-zinc-300 font-mono leading-relaxed">{PROMPT_ARCHITECTURE.base}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PROMPT_ARCHITECTURE.styleVariants.map(v => (
              <div key={v.id} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-xs font-semibold text-green-400 mb-1">{v.name}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{v.prompt}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Active thumbnails */}
        <section>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Thumbnail Briefs — {THUMBNAILS.length}
          </h2>
          <div className="space-y-3">
            {THUMBNAILS.map(t => (
              <div key={t.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white text-sm">{t.headline}</p>
                    {t.subline && <p className="text-zinc-500 text-xs">{t.subline}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status]}`}>{t.status}</span>
                </div>
                <div className="flex gap-3 text-xs text-zinc-600 mb-3">
                  <span>Style: <span className="text-zinc-400">{t.visualStyle}</span></span>
                  <span>Palette: <span className="text-zinc-400">{t.palette}</span></span>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg">
                  <p className="text-xs text-zinc-600 mb-1">AI Prompt (copy → Midjourney / DALL-E / Ideogram)</p>
                  <p className="text-xs text-zinc-300 font-mono leading-relaxed">{t.aiPrompt}</p>
                </div>
                <div className="mt-2 flex gap-3 text-xs">
                  <Link href="/vault/media" className="text-green-400 hover:text-green-300">
                    Upload result → Media Vault
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

  );
}
