"use client";

import Link from "next/link";

const STRATEGY = {
  audience:  "25–45 yr Nepalis — working professionals, parents, semi-urban",
  focus:     "Trust-building, community reach, repurposed YT content",
  frequency: "3–5 posts/week: 1 video clip + 2 carousels/images + 1 poll/question",
  goal:      "Drive traffic to zzc.jeevanregmi.com.np and build Nepal fintech community",
};

const POST_TYPES = [
  {
    type:    "Short Clip (1–3 min)",
    source:  "Repurposed from YouTube long-form",
    format:  "MP4, square (1:1) or vertical (9:16), <1GB",
    caption: "Short hook + 3 key points + link to full video",
    best:    "Mon–Wed, 7–9 PM NST",
  },
  {
    type:    "Carousel / Infographic",
    source:  "ZZC calculator screenshot + data summary",
    format:  "PNG, 1080×1080px, 2–8 slides",
    caption: "\"Did you know?\" opener + tip + CTA to calculator",
    best:    "Thu–Fri, 12 PM NST",
  },
  {
    type:    "Poll / Question",
    source:  "Original engagement post",
    format:  "Text + optional image",
    caption: "\"तपाईंको EPF status के छ?\" type questions",
    best:    "Saturday, 10 AM NST",
  },
];

const CLIP_WORKFLOW = [
  { step: "1. Select clip",  detail: "Pick 1–3 min segment from YT video — hook + one key insight" },
  { step: "2. Re-export",   detail: "Square (1080×1080) or vertical (1080×1920). Burn-in Nepali captions." },
  { step: "3. Add CTA card", detail: "Last 3 sec: 'पूरा video YouTube मा — ZZC channel subscribe गर्नुहोस्'" },
  { step: "4. Caption",     detail: "150–300 words. Nepali first. 3 emojis max. End with 'link bio मा छ'" },
  { step: "5. Upload",      detail: "Facebook Page → Create Post → Video. Schedule 7 PM NST." },
  { step: "6. Boost (later)", detail: "₹500 boost on best-performing post after 48h — Nepal geo-target" },
];

const CONTENT_CALENDAR = [
  { day: "Monday",    type: "Short clip",       topic: "EPF / SSF tip from latest YT" },
  { day: "Wednesday", type: "Carousel",         topic: "ZZC calculator result screenshot" },
  { day: "Thursday",  type: "Short clip",       topic: "AI recommendation demo" },
  { day: "Friday",    type: "Poll / Question",  topic: "Community engagement — finance habits" },
  { day: "Saturday",  type: "Image / Graphic",  topic: "Weekly Nepal finance stat" },
];

export default function FacebookPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Facebook</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400">Nepal reach</span>
        </div>

        {/* Strategy */}
        <section className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Strategy</h2>
          <div className="space-y-2 text-sm">
            {Object.entries(STRATEGY).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-zinc-600 w-24 shrink-0 capitalize">{k}</span>
                <span className="text-zinc-300">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Post types */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Post Formats</h2>
          <div className="space-y-2">
            {POST_TYPES.map(p => (
              <div key={p.type} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                <p className="text-sm font-semibold text-blue-400 mb-2">{p.type}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  <div><span className="text-zinc-600">Source: </span><span className="text-zinc-400">{p.source}</span></div>
                  <div><span className="text-zinc-600">Best time: </span><span className="text-zinc-400">{p.best}</span></div>
                  <div><span className="text-zinc-600">Format: </span><span className="text-zinc-400">{p.format}</span></div>
                  <div><span className="text-zinc-600">Caption: </span><span className="text-zinc-400">{p.caption}</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Clip workflow */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Clip Workflow</h2>
          <div className="space-y-1">
            {CLIP_WORKFLOW.map(w => (
              <div key={w.step} className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
                <span className="text-blue-400 font-mono w-28 shrink-0 text-xs mt-0.5">{w.step}</span>
                <span className="text-zinc-400">{w.detail}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Content calendar */}
        <section className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Weekly Calendar</h2>
          <div className="space-y-1">
            {CONTENT_CALENDAR.map(c => (
              <div key={c.day} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0 text-sm">
                <span className="text-zinc-500 w-24 shrink-0">{c.day}</span>
                <span className="text-blue-400 text-xs w-28 shrink-0">{c.type}</span>
                <span className="text-zinc-400 text-xs">{c.topic}</span>
              </div>
            ))}
          </div>
        </section>

      </div>

  );
}
