"use client";

import Link from "next/link";
import { useState } from "react";

const SCRIPT = {
  title: "नेपालमा EPF कसरी काम गर्छ? | Complete Guide 2026 | ZZC",
  target: "12–14 min",
  sections: [
    {
      ts: "0:00–0:30",
      label: "Hook",
      type: "hook",
      say: `"तपाईंको तलबाट हरेक महिना केही हजार रुपैयाँ काटिन्छ। तपाईंलाई थाहा छ त्यो पैसा कहाँ जान्छ? र 30 वर्षमा त्यो कति हुन्छ?"

[ZZC calculator खोल्नुस्, screen record]

"आज हामी EPF — Employee Provident Fund — को बारेमा सब कुरा सिक्नेछौँ। सरल भाषामा।"`,
      visual: "ZZC calculator open on screen, cursor moving — record 10 sec",
    },
    {
      ts: "0:30–1:30",
      label: "Channel Intro",
      type: "intro",
      say: `"म Jeevan — ZZC Zeneration Z Chautari मा स्वागत छ। यो channel Nepal को Gen Z र युवाहरूको लागि हो — जसले आफ्नो पैसाको बारेमा सरल, AI-backed financial intelligence चाहन्छन्।

Subscribe गर्नुस् र bell थिच्नुस् — हरेक video मा नेपालको real financial data राखिन्छ।"`,
      visual: "Channel intro card — 5 sec ZZC logo animation",
    },
    {
      ts: "1:30–3:30",
      label: "EPF के हो?",
      type: "content",
      say: `"EPF — Employee Provident Fund — नेपालको सरकारी retirement saving scheme हो।

कसरी काम गर्छ:
- तपाईंको employer ले हरेक महिना तपाईंको base salary को 10% EPF मा जम्मा गर्छ।
- तपाईंको employer ले पनि 10% थप्छ।
- त्यसमाथि सरकारले 1.67% gratuity थप्छ।
- Total: तपाईंको तलबको लगभग 21.67% EPF खातामा जान्छ।

Example: तपाईंको base salary NPR 30,000 छ भने —
- तपाईं: NPR 3,000
- Employer: NPR 3,000
- Total: NPR 6,000/महिना EPF मा जान्छ।

यो पैसा EPF नेपाल (EPFO) ले manage गर्छ र हालको interest rate 8.5% आसपास छ।"`,
      visual: "Simple graphic: Employee 10% + Employer 10% = 20% breakdown",
    },
    {
      ts: "3:30–6:00",
      label: "ZZC Calculator Demo",
      type: "demo",
      say: `"अब ZZC calculator खोलौँ र real projection हेरौँ।

[zzc.jeevanregmi.com.np/calculator → SIP tab]

मान्नुस् तपाईं 25 वर्षको हुनुहुन्छ, salary NPR 40,000।
EPF contribution: NPR 8,000/महिना (20%)
Interest rate: 8.5%
Years: 35 वर्ष (60 मा retire)

[Calculator मा enter गर्नुस्, result देखाउनुस्]

Result: NPR 1.8 करोड बढी!

तर यो nominal value हो। Inflation adjust गर्दा real value अर्कै हुन्छ — त्यो पनि calculator ले देखाउँछ।

[Real/Nominal toggle थिच्नुस्]

Nepal scenario stress test: अगाडि हेर्नुस् — economic downturn भए पनि, growth scenario भए के हुन्छ — सब देखाउँछ।"`,
      visual: "FULL SCREEN screen record: ZZC.com/calculator — enter values, show projection, toggle real/nominal",
    },
    {
      ts: "6:00–8:30",
      label: "3 Common Mistakes",
      type: "content",
      say: `"अब तीन ठूला गल्तीहरू — जो धेरैजसो Nepali employees गर्छन्:

MISTAKE 1: Early withdrawal।
EPF पैसा early निकाल्नु — 10% TDS काटिन्छ, compound interest गुम्छ। हजारौं रुपैयाँको नोक्सान।

MISTAKE 2: Job change गर्दा EPF transfer नगर्नु।
नयाँ job मा गए, पुरानो EPF खाता छोडिदिए। त्यो पैसा dormant हुन्छ, grow गर्दैन।

MISTAKE 3: SSF को बारेमा नजान्नु।
Private sector को लागि SSF — Social Security Fund — पनि छ। EPF र SSF अलग हुन्, र दुवैको maximum benefit लिन सकिन्छ।

EPF formal sector (सरकारी, semi-government) को लागि हो। Private sector employers को SSF registration mandatory छ।"`,
      visual: "3 cards on screen: ✗ Early Withdrawal, ✗ No Transfer, ✗ Missing SSF",
    },
    {
      ts: "8:30–10:30",
      label: "AI Recommendation Demo",
      type: "demo",
      say: `"अब ZZC को AI recommendation try गरौँ।

[zzc.jeevanregmi.com.np/recommend]

म यहाँ 'Pension' category छान्छु, age 28, salary NPR 50,000, retirement age 60 राख्छु।

[Live demo गर्नुस्]

हेर्नुस् — AI ले EPF, SSF दुवैको detailed comparison दिन्छ — नेपालीमा, real numbers सहित।

यो free छ। Try गर्नुस्।"`,
      visual: "FULL SCREEN screen record: recommend.page → fill form → show AI result loading → show final recommendation",
    },
    {
      ts: "10:30–12:00",
      label: "Summary + CTA",
      type: "cta",
      say: `"Summary:
- EPF = 20% monthly automatic retirement saving
- Current interest: ~8.5%
- 35 वर्षमा NPR 1–2 करोड बन्छ (salary अनुसार)
- 3 mistakes: early withdrawal, no transfer, ignoring SSF
- ZZC calculator मा आफ्नो exact projection हेर्नुस्

Links description मा छन्:
- ZZC EPF Calculator: zzc.jeevanregmi.com.np/calculator
- AI Recommendation: zzc.jeevanregmi.com.np/recommend

Subscribe गर्नुस्, comment मा लेख्नुस् — तपाईंको EPF amount कति छ? र bell icon थिच्नुस्।

Next video: SSF vs EPF — कुन राम्रो?"`,
      visual: "End screen: Subscribe button + 2 video cards + ZZC logo",
    },
  ],
};

const THUMBNAIL = {
  headline: "EPF को राज खुल्यो",
  subline:  "नेपाली युवाले नजानेको कुरा",
  prompts: [
    {
      platform: "Ideogram v2 (Best — handles Nepali text)",
      prompt: `Professional YouTube thumbnail, 1280x720px. Dark black background (#0a0a0a). Left half: glowing green ZZC financial calculator interface showing bar chart with growing green bars reaching upward. Right half: large bold white Nepali text "EPF को राज खुल्यो" (very large, 50% of frame height), smaller white text below "नेपाली युवाले नजानेको कुरा". Top right corner: small green badge reading "ZZC AI". Green accent color #22c55e. Modern, clean, high contrast, no watermarks, Gen Z fintech aesthetic. Photorealistic style.`,
    },
    {
      platform: "DALL-E 3",
      prompt: `YouTube thumbnail 1280x720 pixels. Dark background near black. Left side: modern financial app dashboard screenshot with green bar chart growing upward, glowing green highlights. Right side: bold large white text "EPF को राज खुल्यो" taking up 60% of right half. Below it smaller text "नेपाली युवाले नजानेको कुरा". Green color scheme (#22c55e), black background. Small "ZZC" text badge top right. Professional, modern, high contrast YouTube thumbnail style. No people.`,
    },
    {
      platform: "Midjourney v6",
      prompt: `professional youtube thumbnail, dark black background, left side glowing green financial calculator UI dashboard with bar chart, right side bold white nepali text "EPF को राज खुल्यो" large typography, subtitle "नेपाली युवाले नजानेको कुरा" smaller, green accent color #22c55e, fintech aesthetic, high contrast, 1280x720 --ar 16:9 --v 6.1 --style raw`,
    },
  ],
  negativePrompt: "blurry text, watermark, stock photo, people, faces, border, frame, low resolution, overexposed",
  canvaInstructions: `1. New design → Custom size: 1280 × 720px
2. Background: fill #0a0a0a (pure black)
3. Left half: screenshot of ZZC calculator → add green glow effect (Elements → Glow)
4. Right half: Text box → font "Montserrat Black" or "Noto Sans Devanagari Bold"
5. Headline "EPF को राज खुल्यो" → size 90pt, color white, bold
6. Subline → size 36pt, color #a1a1aa
7. Top right: small rounded rectangle #22c55e, text "ZZC" white
8. Export as PNG, max quality`,
};

const SHORT_DERIVATIVE = {
  title: "EPF को ₹8,000 → 35 वर्षमा कति? #shorts",
  hook:  "तपाईंको EPF मा हरेक महिना ₹8,000 जान्छ। 35 वर्षमा कति हुन्छ?",
  script: `[0–3 sec] Text overlay: "₹8,000/month EPF → 35 years = ???"

[3–30 sec] ZZC calculator screen record:
- Enter: monthly = 8000, rate = 8.5%, years = 35
- Show result: ₹1.8 करोड बढी!
- Toggle: Real value = ~₹60 lakh (inflation adjust)
"यो ZZC calculator ले 2 second मा गरिदिन्छ"

[30–45 sec] "Full EPF guide — YouTube मा ZZC channel मा।
Link bio मा छ → Free calculator try गर्नुस्"

[45–60 sec] Subscribe overlay`,
  caption: `EPF Nepal: ₹8,000/month → 35 वर्षमा कति? 🤯

ZZC calculator ले real numbers देखाउँछ — inflation adjust, Nepal scenarios सहित।

Free try गर्नुस् 👉 zzc.jeevanregmi.com.np/calculator

#EPFNepal #नेपालFinance #ZZC #नेपालFintech #GenZFinance #EPF2026 #SavingsNepal`,
};

const CHECKLIST: { phase: string; items: string[] }[] = [
  {
    phase: "TODAY — Pre-Production (2–3 hrs)",
    items: [
      "Read through full script above 3× until comfortable",
      "Open ZZC calculator + recommend page on second screen/phone",
      "Set up screen recording (OBS or built-in screen record)",
      "Do 2-minute test recording — check audio levels, no echo",
      "Create thumbnail in Canva using instructions above (30 min)",
      "Upload thumbnail to /vault/media (tag: contentType=thumbnail, topic=EPF)",
    ],
  },
  {
    phase: "RECORDING (1–2 hrs)",
    items: [
      "Record talking head segments (hook, intro, mistakes, CTA)",
      "Screen record ZZC calculator demo — go slow, zoom in on numbers",
      "Screen record ZZC AI recommendation flow — use 28yr, 50k, pension",
      "Record a 60-sec Short version (just calculator demo + hook)",
    ],
  },
  {
    phase: "EDITING (2–3 hrs)",
    items: [
      "Cut out silences and mistakes — keep it tight",
      "Add ZZC intro card (5 sec) at start",
      "Add captions (Nepali subtitles — use CapCut auto-caption)",
      "Add 3 graphics: EPF breakdown card (0:03:30), 3 mistakes cards (0:06:00)",
      "Add end screen (last 20 sec): Subscribe + 2 video cards",
      "Color grade: slight warm/green tint, boost contrast 10%",
      "Export: 1080p60, H.264, AAC 192kbps, <2GB",
    ],
  },
  {
    phase: "UPLOAD (30 min)",
    items: [
      "Upload to YouTube Studio as Unlisted first",
      `Title: "नेपालमा EPF कसरी काम गर्छ? | Complete Guide 2026 | ZZC"`,
      "Paste description from AI Studio (generate-script → description field)",
      "Upload thumbnail from /vault/media",
      "Add chapters using timestamps from script above",
      "Cards: add ZZC calculator link at 3:30 and 8:30",
      "End screen: configured (subscribe + next video)",
      "Set to Public → schedule 7:00 PM NST",
      "Pin first comment: 'ZZC Calculator try गर्नुस्: zzc.jeevanregmi.com.np/calculator'",
    ],
  },
  {
    phase: "PUBLISH SHORT (15 min)",
    items: [
      "Export Short version: 1080×1920 vertical crop, ≤60 sec",
      "Add Nepali captions (bold, white text, bottom third)",
      "Upload to YouTube Shorts, Instagram Reels, TikTok simultaneously",
      "Use caption from Short derivative above",
    ],
  },
  {
    phase: "AFTER PUBLISH (15 min)",
    items: [
      "Record publish URL → update /vault/content/youtube/published",
      "Share to WhatsApp groups, Facebook (ZZC page)",
      "Monitor first 48hr: check CTR, avg view duration in YouTube Studio",
      "Reply to all comments within 24hr",
    ],
  },
];

type SectionType = "hook" | "intro" | "content" | "demo" | "cta";

const TYPE_COLOR: Record<SectionType, string> = {
  hook:    "text-yellow-400",
  intro:   "text-blue-400",
  content: "text-zinc-300",
  demo:    "text-green-400",
  cta:     "text-purple-400",
};

export default function FirstVideoPage() {
  const [tab, setTab] = useState<"script" | "thumbnail" | "short" | "checklist">("checklist");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  const TABS = [
    { id: "checklist" as const, label: "✅ Checklist" },
    { id: "script"    as const, label: "📝 Script" },
    { id: "thumbnail" as const, label: "🖼 Thumbnail" },
    { id: "short"     as const, label: "⚡ Short" },
  ];

  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-4 flex items-start gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <Link href="/vault/content/youtube" className="text-zinc-600 hover:text-zinc-400 text-sm">← YouTube</Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-xl font-bold text-white">First Video</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400">Production ready</span>
          </div>
        </div>

        {/* Meta */}
        <div className="mb-5 p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm">
          <p className="font-semibold text-white mb-0.5">{SCRIPT.title}</p>
          <div className="flex gap-4 text-xs text-zinc-500 flex-wrap">
            <span>⏱ Target: {SCRIPT.target}</span>
            <span>📌 Pillar: EPF/SSF</span>
            <span className="text-green-400">→ CTA: ZZC Calculator + AI Recommend</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                tab === t.id
                  ? "bg-zinc-700 text-white font-medium"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Checklist ── */}
        {tab === "checklist" && (
          <div className="space-y-5">
            {CHECKLIST.map(phase => (
              <div key={phase.phase}>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{phase.phase}</p>
                <div className="space-y-1">
                  {phase.items.map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm">
                      <span className="text-zinc-600 mt-0.5 shrink-0">☐</span>
                      <span className="text-zinc-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Script ── */}
        {tab === "script" && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-600 mb-4">Read each section aloud. [brackets] = action directions, not spoken.</p>
            {SCRIPT.sections.map((s, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-zinc-600 font-mono text-xs w-24 shrink-0">{s.ts}</span>
                  <span className={`font-semibold text-sm ${TYPE_COLOR[s.type as SectionType]}`}>{s.label}</span>
                </div>
                <pre className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans mb-3">{s.say}</pre>
                <p className="text-xs text-zinc-600 border-t border-zinc-800 pt-2">📹 {s.visual}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Thumbnail ── */}
        {tab === "thumbnail" && (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl mb-2">
              <div className="flex gap-4 text-sm">
                <div><span className="text-zinc-600">Headline: </span><span className="text-white font-bold">{THUMBNAIL.headline}</span></div>
                <div><span className="text-zinc-600">Subline: </span><span className="text-zinc-400">{THUMBNAIL.subline}</span></div>
              </div>
            </div>

            {THUMBNAIL.prompts.map((p, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-green-400">{p.platform}</span>
                  <button
                    onClick={() => copy(p.prompt, i)}
                    className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-colors"
                  >
                    {copiedIdx === i ? "✓ Copied" : "Copy prompt"}
                  </button>
                </div>
                <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">{p.prompt}</p>
              </div>
            ))}

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
              <p className="text-xs font-semibold text-zinc-500 mb-2">Negative Prompt (all platforms)</p>
              <p className="text-xs text-zinc-400 font-mono">{THUMBNAIL.negativePrompt}</p>
            </div>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
              <p className="text-xs font-semibold text-zinc-500 mb-2">Canva Fallback (no AI image tool)</p>
              <p className="text-xs text-zinc-400 whitespace-pre-wrap">{THUMBNAIL.canvaInstructions}</p>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-500">
              After generating: upload result to{" "}
              <Link href="/vault/media" className="text-green-400 hover:text-green-300">Media Vault</Link>
              {" "}→ tag: contentType=thumbnail, topic=EPF
            </div>
          </div>
        )}

        {/* ── Short ── */}
        {tab === "short" && (
          <div className="space-y-4">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 mb-1">Title</p>
              <p className="text-white font-semibold text-sm">{SHORT_DERIVATIVE.title}</p>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 mb-2">Hook (first 3 sec screen overlay)</p>
              <p className="text-yellow-400 font-semibold">"{SHORT_DERIVATIVE.hook}"</p>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-500 mb-2">Script (60 sec)</p>
              <pre className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">{SHORT_DERIVATIVE.script}</pre>
            </div>

            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-500">Caption (copy for YT Shorts / Instagram / TikTok)</p>
                <button
                  onClick={() => copy(SHORT_DERIVATIVE.caption, 99)}
                  className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
                >
                  {copiedIdx === 99 ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <pre className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap font-sans">{SHORT_DERIVATIVE.caption}</pre>
            </div>

            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-500">
              Format: 1080×1920 vertical · ≤60 sec · burn-in Nepali captions · Schedule 7 PM NST
            </div>
          </div>
        )}

      </div>

  );
}
