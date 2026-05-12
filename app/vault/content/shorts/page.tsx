"use client";

import Link from "next/link";

const PLATFORMS = [
  { name: "YouTube Shorts", specs: "≤60 sec · 9:16 · 1080×1920px · no end screen", color: "text-red-400" },
  { name: "Instagram Reels", specs: "≤90 sec · 9:16 · 1080×1920px · captions critical", color: "text-purple-400" },
  { name: "TikTok",          specs: "≤60 sec · 9:16 · 1080×1920px · hook in 1 sec", color: "text-pink-400" },
];

const SHORT_IDEAS = [
  {
    title: "EPF को ₹100 = 20 वर्षमा कति?",
    hook:  "तपाईंले आज EPF मा ₹100 राख्दा 20 वर्षमा कति हुन्छ?",
    angle: "ZZC calculator screen record — 30 sec",
    cta:   "Calculator link in bio",
  },
  {
    title: "नेपालमा CIT कसरी काम गर्छ?",
    hook:  "नेपालको CIT ट्याक्स — 3 कुरा जो तपाईंले जान्नुपर्छ",
    angle: "Talking head + text overlay",
    cta:   "Full video on channel",
  },
  {
    title: "AI ले मेरो लागि scheme छान्यो",
    hook:  "मैले AI लाई सोधेँ — Nepal मा best investment के हो?",
    angle: "ZZC recommend flow screen record",
    cta:   "Try ZZC AI (link in bio)",
  },
  {
    title: "SIP vs Lump Sum — Nepal Context",
    hook:  "नेपालमा SIP राम्रो कि एकमुष्ट? Simple math",
    angle: "ZZC SIP calculator with scenario toggle",
    cta:   "Calculator link",
  },
];

const WORKFLOW = [
  { step: "1. Clip source", detail: "Extract 30–60 sec clip from long-form OR record standalone" },
  { step: "2. Vertical crop", detail: "9:16 crop. Keep face/content in upper 70% (TikTok text zone)" },
  { step: "3. Captions", detail: "Auto-captions in Nepali + English. Bold, high-contrast, 40–50% screen width" },
  { step: "4. Hook overlay", detail: "First 1-sec text card: hook question in big Nepali font" },
  { step: "5. ZZC outro (3 sec)", detail: "Logo + 'zzc.jeevanregmi.com.np' + subscribe CTA" },
  { step: "6. Export", detail: "MP4, H.264, 1080×1920, ≤200MB. Audio: AAC 192kbps" },
  { step: "7. Upload batch", detail: "Upload all 3 platforms same day. Schedule: 7 PM NST" },
];

const REUSE_MATRIX = [
  { content: "Calculator screen record", yt: "✓", shorts: "✓ (crop)", ig: "✓ (crop)", fb: "✓" },
  { content: "AI recommendation demo",   yt: "✓", shorts: "✓",        ig: "✓",        fb: "✓" },
  { content: "Explainer talking head",   yt: "✓", shorts: "✓",        ig: "✓",        fb: "—" },
  { content: "Data visualization",       yt: "✓", shorts: "—",        ig: "✓ (still)",fb: "✓" },
];

export default function ShortsPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Shorts / Reels</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-400">Fastest growth</span>
        </div>

        {/* Platform specs */}
        <section className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PLATFORMS.map(p => (
            <div key={p.name} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className={`font-semibold text-sm mb-1 ${p.color}`}>{p.name}</p>
              <p className="text-xs text-zinc-500">{p.specs}</p>
            </div>
          ))}
        </section>

        {/* Short ideas */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Content Ideas</h2>
          <div className="space-y-2">
            {SHORT_IDEAS.map((s, i) => (
              <div key={i} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-sm font-semibold text-white mb-1">{s.title}</p>
                <p className="text-xs text-zinc-400 mb-1"><span className="text-zinc-600">Hook: </span>{s.hook}</p>
                <div className="flex gap-4 text-xs">
                  <span className="text-zinc-600">Format: <span className="text-zinc-400">{s.angle}</span></span>
                  <span className="text-zinc-600">CTA: <span className="text-green-400">{s.cta}</span></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Production Workflow</h2>
          <div className="space-y-1">
            {WORKFLOW.map(w => (
              <div key={w.step} className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
                <span className="text-green-400 font-mono w-28 shrink-0 text-xs mt-0.5">{w.step}</span>
                <span className="text-zinc-400">{w.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Content reuse matrix */}
        <section className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Content Reuse Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-zinc-600 border-b border-zinc-800">
                  <th className="text-left py-1.5 pr-4 font-medium">Content</th>
                  <th className="text-center py-1.5 px-2 font-medium">YT Long</th>
                  <th className="text-center py-1.5 px-2 font-medium">Shorts</th>
                  <th className="text-center py-1.5 px-2 font-medium">IG Reels</th>
                  <th className="text-center py-1.5 px-2 font-medium">Facebook</th>
                </tr>
              </thead>
              <tbody>
                {REUSE_MATRIX.map(row => (
                  <tr key={row.content} className="border-b border-zinc-900">
                    <td className="py-2 pr-4 text-zinc-400">{row.content}</td>
                    <td className="py-2 px-2 text-center text-zinc-300">{row.yt}</td>
                    <td className="py-2 px-2 text-center text-zinc-300">{row.shorts}</td>
                    <td className="py-2 px-2 text-center text-zinc-300">{row.ig}</td>
                    <td className="py-2 px-2 text-center text-zinc-300">{row.fb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>

  );
}
