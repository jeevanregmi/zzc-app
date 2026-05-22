"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { IntelligenceDocument } from "../../lib/types/documents";
import type { QueueItem } from "../../lib/types/queue";

// ─── Date helpers (Nepali numerals + month names) ─────────────────────────────

const NP_MONTHS = [
  "जनवरी","फेब्रुअरी","मार्च","अप्रिल","मे","जुन",
  "जुलाई","अगस्ट","सेप्टेम्बर","अक्टोबर","नोभेम्बर","डिसेम्बर",
];

function toNp(n: number) {
  return String(n).split("").map(c => "०१२३४५६७८९"[+c] ?? c).join("");
}

function fmtDay(iso: string) {
  const d = new Date(iso);
  return `${toNp(d.getDate())} ${NP_MONTHS[d.getMonth()]}`;
}

function fmtMonthYear(iso: string) {
  const d = new Date(iso);
  return `${NP_MONTHS[d.getMonth()]} ${toNp(d.getFullYear())}`;
}

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
}

function groupByMonth(docs: IntelligenceDocument[]) {
  const map = new Map<string, { label: string; year: string; docs: IntelligenceDocument[] }>();
  for (const doc of docs) {
    const key = monthKey(doc.uploadedAt);
    if (!map.has(key)) {
      const d = new Date(doc.uploadedAt);
      map.set(key, { label: fmtMonthYear(doc.uploadedAt), year: toNp(d.getFullYear()), docs: [] });
    }
    map.get(key)!.docs.push(doc);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, v]) => v);
}

// ─── TTS ──────────────────────────────────────────────────────────────────────

function speakText(text: string, onEnd: () => void) {
  if (!("speechSynthesis" in window)) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "hi-IN"; u.rate = 0.85;
  u.onend = onEnd; u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

// ─── Sector metadata ──────────────────────────────────────────────────────────

const SECTOR_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  banking:        { bg: "#0f2744", border: "#1d4ed8", text: "#93c5fd", dot: "#3b82f6" },
  epf:            { bg: "#052e16", border: "#15803d", text: "#86efac", dot: "#22c55e" },
  ssf:            { bg: "#052e16", border: "#15803d", text: "#86efac", dot: "#22c55e" },
  taxation:       { bg: "#27180b", border: "#b45309", text: "#fcd34d", dot: "#f59e0b" },
  tax:            { bg: "#27180b", border: "#b45309", text: "#fcd34d", dot: "#f59e0b" },
  "capital market": { bg: "#1a0533", border: "#7c3aed", text: "#c4b5fd", dot: "#8b5cf6" },
  housing:        { bg: "#082f49", border: "#0369a1", text: "#7dd3fc", dot: "#0ea5e9" },
  employment:     { bg: "#3b0764", border: "#9333ea", text: "#e879f9", dot: "#a855f7" },
  education:      { bg: "#042f2e", border: "#0f766e", text: "#5eead4", dot: "#14b8a6" },
  energy:         { bg: "#1c1917", border: "#d97706", text: "#fbbf24", dot: "#f59e0b" },
  digitalization: { bg: "#0f172a", border: "#2563eb", text: "#93c5fd", dot: "#60a5fa" },
  remittance:     { bg: "#1f1635", border: "#7c3aed", text: "#ddd6fe", dot: "#a78bfa" },
};

const SECTOR_EMOJI: Record<string, string> = {
  banking: "🏦", epf: "🛡️", ssf: "🛡️", cit: "📑", taxation: "💰", tax: "💰",
  "capital market": "📈", housing: "🏠", employment: "💼", education: "📚",
  energy: "⚡", digitalization: "💻", infrastructure: "🏗️", agriculture: "🌾",
  remittance: "✈️", investment: "📊", governance: "🏛️", nrn: "🌍",
};

const SECTOR_NP: Record<string, string> = {
  banking:           "बैंकिङ",
  epf:               "संचय कोष",
  ssf:               "सामाजिक सुरक्षा कोष",
  cit:               "नागरिक लगानी कोष",
  taxation:          "करप्रणाली",
  tax:               "कर",
  "tax policy":      "कर नीति",
  "capital market":  "पुँजी बजार",
  housing:           "आवास",
  employment:        "रोजगार",
  education:         "शिक्षा",
  energy:            "ऊर्जा",
  digitalization:    "डिजिटलाइजेशन",
  infrastructure:    "पूर्वाधार",
  agriculture:       "कृषि",
  remittance:        "रेमिट्यान्स",
  investment:        "लगानी",
  governance:        "सुशासन",
  nrn:               "गैर-आवासीय नेपाली",
  "social security": "सामाजिक सुरक्षा",
  tourism:           "पर्यटन",
  "economic growth": "आर्थिक वृद्धि",
  "economic policy": "आर्थिक नीति",
};

function toNepaliSector(s: string): string {
  const key = s.toLowerCase();
  return SECTOR_NP[key] ?? s;
}

function getSectorMeta(sectors: string[]) {
  for (const s of sectors) {
    const k = s.toLowerCase();
    for (const [key, val] of Object.entries(SECTOR_COLORS)) {
      if (k.includes(key)) return { ...val, emoji: SECTOR_EMOJI[key] ?? "📋" };
    }
  }
  return { bg: "#0f0f0f", border: "#27272a", text: "#a1a1aa", dot: "#52525b", emoji: "📋" };
}

// ─── Slide image URLs (Pollinations.ai, client-side, no API key) ──────────────

const NEPAL_SUFFIX = "Nepal Kathmandu cinematic editorial professional photograph warm light no text no charts";

function slideImageUrl(prompt: string, seed: number): string {
  const full = `${prompt.slice(0, 180)}, ${NEPAL_SUFFIX}`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;
}

function getSlideImage(slide: Slide & { doc: IntelligenceDocument }, idx: number): string {
  const sectors = (slide.doc.affectedSectors ?? []).join(", ") || "Nepal government policy";
  if (slide.type === "cover")   return slide.doc.heroImageUrl ?? slideImageUrl(`Nepal government policy ${slide.doc.title} ${sectors}`, idx);
  if (slide.type === "insight") return slideImageUrl(`Nepal policy visual: ${slide.text} sector: ${sectors}`, idx * 7 + 13);
  if (slide.type === "impact")  return slideImageUrl(`Young Nepali professionals career employment opportunity modern office ${sectors}`, 42);
  return slideImageUrl("ZZC Nepal digital finance intelligence platform Kathmandu young professionals", 99);
}

// ─── Slide Deck ───────────────────────────────────────────────────────────────

type SlideType = "cover" | "insight" | "impact" | "cta";
interface Slide { type: SlideType; text: string; num?: number; total?: number }

function buildSlides(doc: IntelligenceDocument): (Slide & { doc: IntelligenceDocument })[] {
  const slides: (Slide & { doc: IntelligenceDocument })[] = [];
  slides.push({ type: "cover",   text: doc.nepaliExplainer ?? doc.aiSummary ?? doc.title, doc });
  const insights = doc.aiKeyInsights ?? [];
  insights.forEach((ins, i) => slides.push({ type: "insight", text: ins, num: i + 1, total: insights.length, doc }));
  if (doc.youthImpact) slides.push({ type: "impact", text: doc.youthImpact, doc });
  slides.push({ type: "cta", text: "नेपाल सरकारका नीतिहरूको AI विश्लेषण — ZZC Janta", doc });
  return slides;
}

function SlideShow({ doc, onClose }: { doc: IntelligenceDocument; onClose: () => void }) {
  const [current, setCurrent] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const touchStart = useRef<number>(0);
  const slides = buildSlides(doc);
  const meta = getSectorMeta(doc.affectedSectors ?? []);
  const slide = slides[current];
  const isFirst = current === 0;
  const isLast  = current === slides.length - 1;
  const imgUrl  = getSlideImage(slide, current);

  const go = (n: number) => { window.speechSynthesis?.cancel(); setSpeaking(false); setCurrent(n); };
  const prev = () => { if (!isFirst) go(current - 1); };
  const next = () => { if (!isLast)  go(current + 1); };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft"  || e.key === "ArrowUp")   prev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const handleSpeak = () => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
    setSpeaking(true);
    speakText(slide.text, () => setSpeaking(false));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col select-none"
      style={{ background: "#000" }}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => { const d = touchStart.current - e.changedTouches[0].clientX; if (d > 50) next(); if (d < -50) prev(); }}
    >
      {/* Full-bleed background image on every slide */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={imgUrl}
        src={imgUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
        style={{ opacity: 0.55 }}
      />
      {/* Gradient overlay — bottom-heavy so text is always readable */}
      <div className="absolute inset-0" style={{
        background: slide.type === "insight"
          ? "linear-gradient(to bottom, rgba(0,0,0,.6) 0%, rgba(0,0,0,.75) 50%, rgba(0,0,0,.92) 100%)"
          : "linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(0,0,0,.8) 100%)"
      }} />
      {/* Sector color accent strip at top */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: meta.dot }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/40">{toNp(current + 1)}/{toNp(slides.length)}</span>
          <div className="flex gap-1 ml-1">
            {slides.map((_, i) => (
              <button key={i} onClick={() => go(i)}
                className="rounded-full transition-all"
                style={{ width: i === current ? 16 : 6, height: 6, background: i === current ? meta.dot : `${meta.dot}40` }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSpeak}
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all"
            style={speaking ? { background: meta.dot, color: "#000" } : { background: `${meta.dot}22`, color: meta.text }}
          >{speaking ? "⏸" : "🔊"}</button>
          <button onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl leading-none transition-all"
          >×</button>
        </div>
      </div>

      {/* Slide body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        {slide.type === "cover" && (
          <>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span className="text-5xl">{meta.emoji}</span>
              {doc.sourceType === "official" && (
                <span className="text-[10px] font-black px-3 py-1 rounded-full border"
                  style={{ background: `${meta.dot}18`, color: meta.text, borderColor: `${meta.dot}44` }}>
                  ✓ OFFICIAL
                </span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{doc.title}</h2>
            <p className="text-sm sm:text-base leading-relaxed max-w-lg font-medium" style={{ color: meta.text }}>{slide.text}</p>
            {doc.sourceAuthority && <p className="text-xs text-white/30">{doc.sourceAuthority}</p>}
          </>
        )}

        {slide.type === "insight" && (
          <>
            <div className="text-7xl font-black leading-none" style={{ color: `${meta.dot}25` }}>
              {toNp(slide.num!).padStart(2, "०")}
            </div>
            <p className="text-xl sm:text-2xl font-bold text-white leading-relaxed max-w-xl">{slide.text}</p>
            <p className="text-[10px] text-white/25 mt-2">
              {toNp(slide.num!)} / {toNp(slide.total!)} insights
            </p>
          </>
        )}

        {slide.type === "impact" && (
          <>
            <span className="text-5xl">⚡</span>
            <p className="text-[11px] font-black tracking-widest uppercase text-amber-400">युवाहरूलाई असर</p>
            <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-xl">{slide.text}</p>
          </>
        )}

        {slide.type === "cta" && (
          <>
            <p className="text-green-400 font-black text-5xl">ZZC</p>
            <p className="text-white font-black text-xl">जनता Intelligence</p>
            <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">{slide.text}</p>
            <p className="text-green-400/60 text-xs mt-2">zzc.jeevanregmi.com.np/janta</p>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-8">
        <button onClick={prev} disabled={isFirst}
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold transition-all disabled:opacity-15"
          style={{ background: `${meta.dot}20`, color: meta.text }}
        >‹</button>
        <p className="text-white/20 text-xs">swipe गर्नुस्</p>
        <button onClick={next} disabled={isLast}
          className="w-14 h-14 rounded-full flex items-center justify-center text-3xl font-bold transition-all disabled:opacity-15"
          style={{ background: isLast ? `${meta.dot}20` : meta.dot, color: isLast ? meta.text : "#000" }}
        >›</button>
      </div>
    </div>
  );
}

// ─── Timeline Card ────────────────────────────────────────────────────────────

function TimelineCard({ doc, isLast, onSlides }: { doc: IntelligenceDocument; isLast: boolean; onSlides: (doc: IntelligenceDocument) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const meta = getSectorMeta(doc.affectedSectors ?? []);

  const handleSpeak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const text = [
      doc.title,
      doc.nepaliExplainer ?? doc.aiSummary ?? "",
      ...(doc.aiKeyInsights?.slice(0, 3) ?? []),
    ].filter(Boolean).join(". ");
    setSpeaking(true);
    speakText(text, () => setSpeaking(false));
  };

  return (
    <div className={`relative pl-8 ${isLast ? "" : "pb-6"}`}>
      {/* Timeline dot */}
      <div
        className="absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 z-10"
        style={{ background: meta.dot, borderColor: meta.dot, boxShadow: `0 0 8px ${meta.dot}66` }}
      />

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden border transition-all"
        style={{ background: meta.bg, borderColor: meta.border }}
      >
        {/* Card header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{meta.emoji}</span>
              {doc.sourceType === "official" && (
                <span
                  className="text-[9px] font-black px-2 py-0.5 rounded-full border tracking-wider"
                  style={{ background: `${meta.dot}18`, color: meta.text, borderColor: `${meta.dot}44` }}
                >
                  ✓ OFFICIAL
                </span>
              )}
              {doc.sourceAuthority && (
                <span className="text-[9px] font-mono" style={{ color: `${meta.text}80` }}>
                  {doc.sourceAuthority}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px]" style={{ color: `${meta.text}50` }}>{fmtDay(doc.uploadedAt)}</span>
              <button
                onClick={handleSpeak}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all"
                style={speaking
                  ? { background: meta.dot, color: "#000" }
                  : { background: `${meta.dot}18`, color: meta.text }
                }
              >
                {speaking ? "⏸" : "🔊"}
              </button>
            </div>
          </div>

          <h3
            className="font-black text-sm leading-snug mt-2"
            style={{ color: meta.text }}
          >
            {doc.title}
          </h3>
        </div>

        {/* Hero image — shown when generated */}
        {doc.heroImageUrl && (
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={doc.heroImageUrl}
              alt={doc.title}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, transparent 40%, ${meta.bg}ee 100%)`,
              }}
            />
          </div>
        )}

        {/* Nepali explainer — always visible */}
        {doc.nepaliExplainer && (
          <div
            className="mx-3 mb-3 rounded-xl px-4 py-3"
            style={{ background: `${meta.dot}0f`, border: `1px solid ${meta.dot}22` }}
          >
            <p className="text-[9px] font-black tracking-widest uppercase mb-1.5" style={{ color: meta.dot }}>
              🇳🇵 सरल नेपालीमा
            </p>
            <p className="text-sm leading-relaxed font-medium text-white/90">{doc.nepaliExplainer}</p>
          </div>
        )}

        {/* Key insights (collapsed: 2, expanded: all) */}
        {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
          <div className="px-3 pb-2 space-y-1.5">
            {(expanded ? doc.aiKeyInsights : doc.aiKeyInsights.slice(0, 2)).map((ins, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="text-xs font-black shrink-0 mt-0.5" style={{ color: meta.dot }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-xs leading-snug text-white/70">{ins}</p>
              </div>
            ))}
          </div>
        )}

        {/* Youth impact — on expand */}
        {expanded && doc.youthImpact && (
          <div
            className="mx-3 mb-3 rounded-xl px-4 py-3"
            style={{ background: `${meta.dot}0a`, border: `1px solid ${meta.dot}20` }}
          >
            <p className="text-[9px] font-black tracking-widest uppercase mb-1" style={{ color: meta.dot }}>
              ⚡ युवाहरूलाई असर
            </p>
            <p className="text-xs leading-relaxed text-white/70">{doc.youthImpact}</p>
          </div>
        )}

        {/* Sectors + expand toggle */}
        <div className="px-3 pb-2 flex items-center justify-between gap-2 mt-1">
          <div className="flex flex-wrap gap-1">
            {(doc.affectedSectors ?? []).slice(0, 4).map(s => (
              <span
                key={s}
                className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${meta.dot}15`, color: meta.text, border: `1px solid ${meta.dot}30` }}
              >
                {toNepaliSector(s)}
              </span>
            ))}
          </div>
          {((doc.aiKeyInsights?.length ?? 0) > 2 || doc.youthImpact) && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[10px] font-bold shrink-0 transition-colors"
              style={{ color: `${meta.dot}90` }}
            >
              {expanded ? "▲ कम" : "▼ थप"}
            </button>
          )}
        </div>

        {/* Slides button */}
        {(doc.aiKeyInsights?.length ?? 0) > 0 && (
          <div className="px-3 pb-1">
            <button
              onClick={() => onSlides(doc)}
              className="w-full py-2 rounded-xl text-xs font-black tracking-wide transition-all hover:scale-[1.02]"
              style={{ background: `${meta.dot}18`, color: meta.text, border: `1px solid ${meta.dot}33` }}
            >
              📊 Slides हेर्नुस् — {toNp(doc.aiKeyInsights!.length + (doc.youthImpact ? 3 : 2))} slides
            </button>
          </div>
        )}

        {/* Social content pipeline chips */}
        {doc.contentIdeas && doc.contentIdeas.length > 0 && (
          <div
            className="mx-3 mb-3 rounded-xl px-3 py-2"
            style={{ background: "#ffffff06", border: "1px solid #ffffff0f" }}
          >
            <p className="text-[8px] font-black tracking-widest uppercase mb-1.5 text-white/30">
              📲 Content Pipeline
            </p>
            <div className="flex flex-wrap gap-1">
              {doc.contentIdeas.slice(0, 5).map((idea, i) => {
                const l = idea.toLowerCase();
                const isShort  = l.startsWith("short:") || l.startsWith("reel:");
                const isYT     = l.startsWith("youtube:");
                const isFB     = l.startsWith("post:") || l.startsWith("facebook:");
                const icon     = isShort ? "🎬" : isYT ? "▶️" : isFB ? "👍" : "💡";
                const label    = idea.replace(/^(YouTube|Short|Reel|Post|Facebook|Carousel|Explainer):\s*/i, "");
                return (
                  <span
                    key={i}
                    className="text-[8px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "#ffffff0a", color: "#ffffff50", border: "1px solid #ffffff12" }}
                  >
                    {icon} <span className="truncate max-w-[120px]">{label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Confidence strip */}
        {doc.confidence != null && (
          <div className="h-0.5 w-full" style={{ background: `${meta.dot}18` }}>
            <div
              className="h-full"
              style={{ width: `${Math.round(doc.confidence * 100)}%`, background: meta.dot }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Card (AI Studio published content) ───────────────────────────────

const PLATFORM_ICON: Record<string, string> = {
  youtube:   "▶️", instagram: "📸", facebook: "👥", all: "📲",
};
const TYPE_LABEL: Record<string, string> = {
  "youtube-long": "YouTube", shorts: "Short/Reel", "facebook-post": "Facebook Post",
  carousel: "Carousel", explainer: "Explainer", other: "Content",
};

function ContentCard({ item, isLast }: { item: QueueItem; isLast: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const preview = item.brief ?? item.sourceInsights?.[0] ?? "";

  const handleSpeak = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    setSpeaking(true);
    speakText([item.aiTitle, preview].filter(Boolean).join(". "), () => setSpeaking(false));
  };

  return (
    <div className={`relative pl-8 ${isLast ? "" : "pb-6"}`}>
      {/* Timeline dot — green for content */}
      <div className="absolute left-0 top-4 w-3.5 h-3.5 rounded-full border-2 z-10"
        style={{ background: "#22c55e", borderColor: "#22c55e", boxShadow: "0 0 8px #22c55e66" }} />

      <div className="rounded-2xl overflow-hidden border border-green-900/60 bg-[#051a0f]">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">{PLATFORM_ICON[item.platform] ?? "📲"}</span>
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-green-950 text-green-400 border border-green-800">
                ZZC {TYPE_LABEL[item.contentType] ?? "Content"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-green-900">
                {fmtDay(item.jantaPublishedAt ?? item.createdAt)}
              </span>
              <button onClick={handleSpeak}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all"
                style={speaking ? { background: "#22c55e", color: "#000" } : { background: "#22c55e18", color: "#86efac" }}
              >{speaking ? "⏸" : "🔊"}</button>
            </div>
          </div>
          <h3 className="font-black text-sm leading-snug mt-2 text-green-300">{item.aiTitle}</h3>
        </div>

        {preview && (
          <div className="mx-3 mb-3 rounded-xl px-4 py-3 bg-green-950/30 border border-green-900/40">
            <p className="text-xs leading-snug text-white/70 line-clamp-3">{preview}</p>
          </div>
        )}

        {item.sourceDocTitle && (
          <div className="px-3 pb-3">
            <span className="text-[9px] text-green-900">📄 {item.sourceDocTitle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Month Section ────────────────────────────────────────────────────────────

type TimelineEntry =
  | { kind: "doc";     item: IntelligenceDocument; date: string }
  | { kind: "content"; item: QueueItem;             date: string };

function MonthSection({ label, entries, onSlides }: { label: string; year: string; entries: TimelineEntry[]; onSlides: (doc: IntelligenceDocument) => void }) {
  return (
    <div className="relative">
      <div className="absolute left-[6px] top-6 bottom-0 w-px bg-zinc-800" />
      <div className="flex items-center gap-3 mb-5">
        <div className="w-3.5 h-3.5 rounded-full bg-zinc-700 border-2 border-zinc-500 z-10" />
        <div>
          <span className="text-sm font-black text-white">{label}</span>
          <span className="ml-2 text-[10px] text-zinc-600">{toNp(entries.length)} items</span>
        </div>
      </div>
      <div>
        {entries.map((entry, i) =>
          entry.kind === "doc"
            ? <TimelineCard key={entry.item.id} doc={entry.item} isLast={i === entries.length - 1} onSlides={onSlides} />
            : <ContentCard  key={entry.item.id} item={entry.item} isLast={i === entries.length - 1} />
        )}
      </div>
    </div>
  );
}

// ─── Quick Rail ───────────────────────────────────────────────────────────────

function QuickRail({ docs }: { docs: IntelligenceDocument[] }) {
  const items = docs.flatMap(d =>
    (d.aiKeyInsights ?? []).slice(0, 2).map(ins => ({ ins, sector: d.affectedSectors?.[0] ?? "" }))
  ).slice(0, 12);
  if (items.length === 0) return null;

  return (
    <div className="mb-8">
      <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">
        ⚡ Quick Scroll — Tap to Listen
      </p>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {items.map(({ ins, sector }, i) => {
          const meta = getSectorMeta([sector]);
          return (
            <button
              key={i}
              onClick={() => speakText(ins, () => {})}
              className="shrink-0 w-44 rounded-2xl px-4 py-3 text-left transition-all hover:scale-105"
              style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
            >
              <p className="text-[9px] font-black mb-1" style={{ color: meta.dot }}>#{toNp(i + 1)}</p>
              <p className="text-xs leading-snug text-white/80 line-clamp-3">{ins}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Year Badge ───────────────────────────────────────────────────────────────

function YearDivider({ year }: { year: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-xs font-black text-zinc-500 px-3 py-1 border border-zinc-800 rounded-full">
        {year}
      </span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ count, span }: { count: number; span: string }) {
  return (
    <div className="relative overflow-hidden bg-black border-b border-zinc-900">
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,255,100,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,100,1) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-0 left-1/4 w-96 h-48 bg-green-500/10 rounded-full blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-6 py-10 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-full px-4 py-1.5 mb-5">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-[10px] font-black tracking-widest uppercase">
            AI · Nepal Intelligence Timeline
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-2">
          जनता{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            Timeline
          </span>
        </h1>
        <p className="text-zinc-400 text-sm mb-1">
          नेपाल सरकारका decisions — date-wise, AI-analyzed, सरल भाषामा 🇳🇵
        </p>
        <p className="text-zinc-600 text-xs mb-6">
          Scroll गर्नुस् history through · Tap 🔊 to listen · Gen Z Nepal
        </p>

        {count > 0 && (
          <div className="inline-flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3">
            <div className="text-center">
              <p className="text-green-400 font-black text-2xl leading-none">{toNp(count)}</p>
              <p className="text-zinc-600 text-[10px] mt-0.5">documents</p>
            </div>
            {span && (
              <>
                <div className="w-px h-8 bg-zinc-800" />
                <div className="text-center">
                  <p className="text-white font-black text-sm leading-none">{span}</p>
                  <p className="text-zinc-600 text-[10px] mt-0.5">time span</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function JantaClient() {
  const [docs,         setDocs]         = useState<IntelligenceDocument[]>([]);
  const [contentItems, setContentItems] = useState<QueueItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<"all" | "official" | "epf" | "budget" | "content">("all");
  const [slideDoc,     setSlideDoc]     = useState<IntelligenceDocument | null>(null);

  useEffect(() => {
    const docsPromise = getDocs(query(
      collection(db, "vault_intelligence_docs"),
      where("adminApprovalStatus", "==", "approved"),
    )).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceDocument)));

    const contentPromise = getDocs(query(
      collection(db, "vault_content_queue"),
      where("publishToJanta", "==", true),
    )).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as QueueItem)))
      .catch(() => [] as QueueItem[]);

    Promise.all([docsPromise, contentPromise])
      .then(([docItems, queueItems]) => {
        setDocs(docItems.sort((a, b) => (b.uploadedAt ?? "").localeCompare(a.uploadedAt ?? "")));
        setContentItems(queueItems.sort((a, b) => (b.jantaPublishedAt ?? b.createdAt ?? "").localeCompare(a.jantaPublishedAt ?? a.createdAt ?? "")));
        setLoading(false);
      })
      .catch(err => { console.error("janta fetch:", err); setLoading(false); });
  }, []);

  const filteredDocs = docs.filter(d => {
    if (filter === "content")  return false;
    if (filter === "official") return d.sourceType === "official";
    if (filter === "epf")      return d.detectedTopics?.some(t => /epf|ssf|cit/i.test(t));
    if (filter === "budget")   return d.detectedTopics?.some(t => /budget|बजेट|fiscal/i.test(t));
    return true;
  });
  const filteredContent = filter === "all" || filter === "content" ? contentItems : [];

  // Merge into unified timeline entries
  const allEntries: TimelineEntry[] = [
    ...filteredDocs.map(d => ({ kind: "doc"     as const, item: d, date: d.uploadedAt })),
    ...filteredContent.map(c => ({ kind: "content" as const, item: c, date: c.jantaPublishedAt ?? c.createdAt })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const totalCount = allEntries.length;

  // Compute time span
  const span = (() => {
    if (allEntries.length < 2) return "";
    const oldest = allEntries[allEntries.length - 1]?.date ?? "";
    const newest = allEntries[0]?.date ?? "";
    const diffDays = Math.floor((new Date(newest).getTime() - new Date(oldest).getTime()) / 86400000);
    if (diffDays < 30) return `${toNp(diffDays)} days`;
    if (diffDays < 365) return `${toNp(Math.floor(diffDays / 30))} months`;
    return `${toNp(Math.floor(diffDays / 365))}+ years`;
  })();

  // Group merged entries by month
  const groupedEntries = (() => {
    const map = new Map<string, { label: string; year: string; entries: TimelineEntry[] }>();
    for (const entry of allEntries) {
      const key = monthKey(entry.date);
      if (!map.has(key)) {
        const d = new Date(entry.date);
        map.set(key, { label: fmtMonthYear(entry.date), year: toNp(d.getFullYear()), entries: [] });
      }
      map.get(key)!.entries.push(entry);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([, v]) => v);
  })();

  // Track which years we've shown a divider for
  const shownYears = new Set<string>();

  const FILTERS = [
    { key: "all"     as const, label: "सबै" },
    { key: "official"as const, label: "✓ Official" },
    { key: "epf"     as const, label: "EPF / SSF" },
    { key: "budget"  as const, label: "बजेट" },
    { key: "content" as const, label: "🎬 ZZC Content" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {slideDoc && <SlideShow doc={slideDoc} onClose={() => setSlideDoc(null)} />}
      <Hero count={totalCount} span={span} />

      {/* Sticky nav */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-zinc-900">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="text-green-400 font-black text-lg">ZZC</Link>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                  filter === f.key ? "bg-green-500 text-black" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link href="/vault/documents" className="text-[11px] text-zinc-600 hover:text-zinc-400 hidden sm:block">
            Admin →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Timeline load हुँदैछ…</p>
          </div>
        ) : allEntries.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <p className="text-6xl">🏛️</p>
            <p className="text-white font-black text-2xl">
              {docs.length === 0 && contentItems.length === 0 ? "Timeline खाली छ" : "यस filter मा छैन"}
            </p>
            <p className="text-zinc-500 text-sm">
              {docs.length === 0 && contentItems.length === 0
                ? "Admin Vault मा approve गरेपछि timeline मा देखिन्छ।"
                : "अर्को filter try गर्नुस्।"}
            </p>
          </div>
        ) : (
          <>
            <QuickRail docs={filteredDocs} />

            {groupedEntries.map(({ label, year, entries }) => {
              const showYear = !shownYears.has(year);
              if (showYear) shownYears.add(year);
              return (
                <div key={label}>
                  {showYear && <YearDivider year={year} />}
                  <MonthSection label={label} year={year} entries={entries} onSlides={setSlideDoc} />
                  <div className="mt-6" />
                </div>
              );
            })}

            <div className="py-8 text-center">
              <p className="text-zinc-700 text-xs">
                {toNp(totalCount)} items · Timeline continues as new policies are added
              </p>
              <div className="w-px h-8 bg-zinc-800 mx-auto mt-4" />
              <div className="w-3 h-3 rounded-full border-2 border-zinc-700 mx-auto" />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center">
        <p className="text-zinc-700 text-xs">
          ZZC Janta Intelligence · AI by Gemini · Nepal Policy Timeline ·{" "}
          <Link href="/" className="hover:text-green-500 transition-colors">
            zzc.jeevanregmi.com.np
          </Link>
        </p>
      </footer>
    </div>
  );
}
