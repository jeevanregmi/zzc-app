"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import type { IntelligenceDocument } from "../../lib/types/documents";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "आज";
  if (d === 1) return "हिजो";
  if (d < 7) return `${d} दिन अघि`;
  if (d < 30) return `${Math.floor(d / 7)} हप्ता अघि`;
  return `${Math.floor(d / 30)} महिना अघि`;
}

function speakText(text: string, onEnd: () => void) {
  if (!("speechSynthesis" in window)) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "hi-IN";
  u.rate = 0.85;
  u.onend = onEnd;
  u.onerror = onEnd;
  window.speechSynthesis.speak(u);
}

const GRADIENTS = [
  { bg: "from-[#022c22] to-[#064e3b]",  accent: "#10b981", dot: "#34d399" },
  { bg: "from-[#1e1b4b] to-[#3730a3]",  accent: "#818cf8", dot: "#a5b4fc" },
  { bg: "from-[#431407] to-[#9a3412]",  accent: "#fb923c", dot: "#fdba74" },
  { bg: "from-[#2e1065] to-[#6d28d9]",  accent: "#c084fc", dot: "#d8b4fe" },
  { bg: "from-[#0c4a6e] to-[#0369a1]",  accent: "#38bdf8", dot: "#7dd3fc" },
  { bg: "from-[#4a044e] to-[#86198f]",  accent: "#e879f9", dot: "#f0abfc" },
];

const SECTOR_EMOJI: Record<string, string> = {
  banking: "🏦", epf: "🛡️", ssf: "🛡️", cit: "📑",
  taxation: "💰", tax: "💰", "capital market": "📈",
  housing: "🏠", employment: "💼", education: "📚",
  energy: "⚡", digitalization: "💻", infrastructure: "🏗️",
  agriculture: "🌾", remittance: "✈️", investment: "📊",
  governance: "🏛️", nrn: "🌍", sme: "🏪",
};

function getSectorEmoji(sectors: string[]): string {
  for (const s of sectors) {
    const k = s.toLowerCase();
    for (const [key, val] of Object.entries(SECTOR_EMOJI)) {
      if (k.includes(key)) return val;
    }
  }
  return "📋";
}

// ─── Story Card ───────────────────────────────────────────────────────────────

function StoryCard({ doc, idx }: { doc: IntelligenceDocument; idx: number }) {
  const [speaking, setSpeaking] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const g = GRADIENTS[idx % GRADIENTS.length];
  const emoji = getSectorEmoji(doc.affectedSectors ?? []);

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
    <article className={`relative rounded-3xl overflow-hidden mb-6 bg-gradient-to-br ${g.bg}`}>
      {/* Glow blob */}
      <div
        className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: g.accent }}
      />

      {/* ── Header ── */}
      <div className="relative px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {doc.sourceType === "official" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white tracking-wide">
                ✓ OFFICIAL
              </span>
            )}
            {doc.sourceAuthority && (
              <span className="text-[10px] text-white/40 font-mono">{doc.sourceAuthority}</span>
            )}
          </div>
          {/* Time + TTS */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-white/30">{timeAgo(doc.uploadedAt)}</span>
            <button
              onClick={handleSpeak}
              aria-label={speaking ? "Stop reading" : "Read aloud"}
              className="w-9 h-9 rounded-full flex items-center justify-center text-base transition-all"
              style={speaking
                ? { background: g.accent, color: "#000" }
                : { background: "rgba(255,255,255,0.08)", color: "#fff" }}
            >
              {speaking ? "⏸" : "🔊"}
            </button>
          </div>
        </div>

        {/* Big emoji + title */}
        <div className="flex gap-4 items-start mt-4">
          <span className="text-5xl leading-none">{emoji}</span>
          <h2 className="text-white font-black text-lg leading-snug flex-1">{doc.title}</h2>
        </div>
      </div>

      {/* ── सरल नेपालीमा ── */}
      {doc.nepaliExplainer && (
        <div className="mx-5 mb-4 rounded-2xl px-5 py-4 bg-black/30 border border-white/10">
          <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: g.accent }}>
            🇳🇵 सरल नेपालीमा
          </p>
          <p className="text-white text-[15px] leading-relaxed font-semibold">{doc.nepaliExplainer}</p>
        </div>
      )}

      {/* ── Key Facts numbered ── */}
      {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">📌 Key Facts</p>
          {(expanded ? doc.aiKeyInsights : doc.aiKeyInsights.slice(0, 3)).map((ins, i) => (
            <div key={i} className="flex gap-3 items-start rounded-xl px-4 py-3 bg-black/20">
              <span className="font-black text-sm shrink-0" style={{ color: g.accent }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-white/90 text-sm leading-snug">{ins}</p>
            </div>
          ))}
          {doc.aiKeyInsights.length > 3 && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="text-[11px] text-white/30 hover:text-white/60 transition-colors pl-1"
            >
              {expanded ? "▲ कम देखाउनुस्" : `▼ +${doc.aiKeyInsights.length - 3} थप facts`}
            </button>
          )}
        </div>
      )}

      {/* ── Youth Impact ── */}
      {doc.youthImpact && (
        <div className="mx-5 mb-4 rounded-2xl px-5 py-3 bg-white/5 border border-white/10">
          <p className="text-[10px] font-black tracking-widest uppercase mb-1.5" style={{ color: g.dot }}>
            ⚡ युवाहरूलाई असर
          </p>
          <p className="text-white/80 text-sm leading-relaxed">{doc.youthImpact}</p>
        </div>
      )}

      {/* ── Policy Changes ── */}
      {doc.policyChanges && doc.policyChanges.length > 0 && (
        <div className="mx-5 mb-4 rounded-2xl px-5 py-3 bg-white/5 border border-white/10">
          <p className="text-[10px] font-black tracking-widest uppercase mb-2" style={{ color: g.dot }}>
            📜 नीतिगत परिवर्तन
          </p>
          {doc.policyChanges.slice(0, 3).map((p, i) => (
            <div key={i} className="flex gap-2 text-xs text-white/70 mb-1">
              <span style={{ color: g.accent }}>◆</span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Sectors + Confidence ── */}
      <div className="px-5 pb-5">
        {doc.affectedSectors && doc.affectedSectors.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {doc.affectedSectors.slice(0, 6).map(s => (
              <span
                key={s}
                className="text-[11px] font-bold px-3 py-1 rounded-full"
                style={{ background: `${g.accent}22`, color: g.accent, border: `1px solid ${g.accent}44` }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {doc.confidence != null && (
          <div>
            <div className="flex justify-between text-[10px] text-white/25 mb-1">
              <span>AI Confidence</span>
              <span>{Math.round(doc.confidence * 100)}%</span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(doc.confidence * 100)}%`, background: g.accent }}
              />
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Quick Insights Rail ──────────────────────────────────────────────────────

function QuickRail({ docs }: { docs: IntelligenceDocument[] }) {
  const items = docs.flatMap(d => d.aiKeyInsights ?? []).slice(0, 15);
  if (items.length === 0) return null;
  return (
    <div className="mb-8">
      <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3">⚡ Quick Scroll — Tap to Listen</p>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
        {items.map((ins, i) => (
          <button
            key={i}
            onClick={() => speakText(ins, () => {})}
            className="shrink-0 w-48 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-left hover:border-green-800 transition-colors"
          >
            <p className="text-green-400 text-[10px] font-black mb-1">#{i + 1}</p>
            <p className="text-white text-xs leading-snug line-clamp-3">{ins}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ count }: { count: number }) {
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
      <div className="absolute bottom-0 right-1/4 w-64 h-32 bg-cyan-500/8 rounded-full blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-black tracking-widest uppercase">
            AI · Nepal Intelligence · Live
          </span>
        </div>

        <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight mb-3">
          जनता{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            Intel
          </span>
        </h1>
        <p className="text-zinc-400 text-base mb-1">
          सरकारी policies → AI analyze → तपाईंको भाषामा 🇳🇵
        </p>
        <p className="text-zinc-600 text-sm mb-6">
          Tap <span className="text-white">🔊</span> to listen · Gen Z Nepal Edition
        </p>

        {count > 0 && (
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-5 py-2">
            <span className="text-green-400 font-black text-2xl">{count}</span>
            <span className="text-zinc-500 text-xs">
              intelligence report{count !== 1 ? "s" : ""} · Updated today
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function JantaClient() {
  const [docs, setDocs] = useState<IntelligenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "official" | "epf" | "budget">("all");

  useEffect(() => {
    getDocs(
      query(
        collection(db, "vault_intelligence_docs"),
        where("adminApprovalStatus", "==", "approved"),
      )
    ).then(snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as IntelligenceDocument))
        .sort((a, b) =>
          (b.updatedAt ?? b.uploadedAt ?? "").localeCompare(a.updatedAt ?? a.uploadedAt ?? "")
        );
      setDocs(items);
      setLoading(false);
    }).catch(err => { console.error("janta fetch:", err); setLoading(false); });
  }, []);

  const filtered = docs.filter(d => {
    if (filter === "all")      return true;
    if (filter === "official") return d.sourceType === "official";
    if (filter === "epf")      return d.detectedTopics?.some(t => /epf|ssf|cit/i.test(t));
    if (filter === "budget")   return d.detectedTopics?.some(t => /budget|बजेट|fiscal/i.test(t));
    return true;
  });

  const FILTERS = [
    { key: "all" as const,      label: "सबै" },
    { key: "official" as const, label: "✓ Official" },
    { key: "epf" as const,      label: "EPF / SSF" },
    { key: "budget" as const,   label: "बजेट" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <Hero count={docs.length} />

      {/* Sticky nav */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-zinc-900">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <Link href="/" className="text-green-400 font-black text-lg tracking-tight">ZZC</Link>
          <div className="flex gap-1">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
                  filter === f.key
                    ? "bg-green-500 text-black"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link
            href="/vault/documents"
            className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors hidden sm:block"
          >
            Admin →
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">Intelligence load हुँदैछ…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <p className="text-6xl">🏛️</p>
            <p className="text-white font-black text-2xl">
              {docs.length === 0 ? "कुनै document छैन" : "यस filter मा छैन"}
            </p>
            <p className="text-zinc-500 text-sm">
              {docs.length === 0
                ? "Admin Vault मा approve गरेपछि यहाँ देखिन्छ।"
                : "अर्को filter try गर्नुस्।"}
            </p>
          </div>
        ) : (
          <>
            <QuickRail docs={filtered} />
            <p className="text-xs text-zinc-700 mb-5">
              {filtered.length} intelligence report{filtered.length !== 1 ? "s" : ""}
            </p>
            {filtered.map((doc, i) => (
              <StoryCard key={doc.id} doc={doc} idx={i} />
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center">
        <p className="text-zinc-700 text-xs">
          ZZC Janta Intelligence · AI by Gemini · For Nepal · By Nepal ·{" "}
          <Link href="/" className="hover:text-green-500 transition-colors">
            zzc.jeevanregmi.com.np
          </Link>
        </p>
      </footer>
    </div>
  );
}
