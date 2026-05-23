"use client";

// /constitution — Living Nepal Constitution Tree
// Phase 1: Full-screen 2.5D animated SVG/CSS tree with particles, zoom, right panel

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { collection, query, where, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";
import Link from "next/link";

// ─── Branch Config ────────────────────────────────────────────────────────────

interface Branch {
  id:       string;
  nepali:   string;
  color:    string;
  glow:     string;
  tipX:     number;  // % viewport
  tipY:     number;
  fromX:    number;  // trunk junction % viewport
  fromY:    number;
  cp1X:     number;  // bezier control points
  cp1Y:     number;
  cp2X:     number;
  cp2Y:     number;
  side:     "left" | "right";
  keywords: string[];
  emoji:    string;
}

const BRANCHES: Branch[] = [
  {
    id: "justice",    nepali: "न्याय",        color: "#818cf8", glow: "rgba(129,140,248,.5)",
    tipX: 72,  tipY: 19, fromX: 54, fromY: 36, cp1X: 60, cp1Y: 30, cp2X: 66, cp2Y: 22,
    side: "right", emoji: "⚖️",
    keywords: ["न्याय", "justice", "court", "adalat", "supreme", "judicial"],
  },
  {
    id: "rights",     nepali: "मौलिक हक",     color: "#4ade80", glow: "rgba(74,222,128,.5)",
    tipX: 23,  tipY: 26, fromX: 46, fromY: 38, cp1X: 38, cp1Y: 34, cp2X: 30, cp2Y: 28,
    side: "left",  emoji: "📜",
    keywords: ["मौलिक हक", "fundamental", "rights", "हक", "अधिकार", "equality"],
  },
  {
    id: "education",  nepali: "शिक्षा",       color: "#60a5fa", glow: "rgba(96,165,250,.5)",
    tipX: 79,  tipY: 29, fromX: 54, fromY: 44, cp1X: 63, cp1Y: 38, cp2X: 71, cp2Y: 31,
    side: "right", emoji: "📚",
    keywords: ["शिक्षा", "education", "school", "university", "vidyalaya"],
  },
  {
    id: "women",      nepali: "महिला",         color: "#f472b6", glow: "rgba(244,114,182,.5)",
    tipX: 15,  tipY: 40, fromX: 46, fromY: 45, cp1X: 35, cp1Y: 43, cp2X: 24, cp2Y: 40,
    side: "left",  emoji: "👩",
    keywords: ["महिला", "women", "gender", "mahila", "लैंगिक"],
  },
  {
    id: "governance", nepali: "सुशासन",        color: "#22d3ee", glow: "rgba(34,211,238,.5)",
    tipX: 68,  tipY: 42, fromX: 53, fromY: 50, cp1X: 60, cp1Y: 46, cp2X: 64, cp2Y: 43,
    side: "right", emoji: "🏛️",
    keywords: ["सुशासन", "governance", "corruption", "transparency", "accountability"],
  },
  {
    id: "inclusion",  nepali: "समावेशिता",     color: "#c084fc", glow: "rgba(192,132,252,.5)",
    tipX: 20,  tipY: 50, fromX: 47, fromY: 50, cp1X: 37, cp1Y: 50, cp2X: 28, cp2Y: 50,
    side: "left",  emoji: "🤝",
    keywords: ["दलित", "dalit", "समावेशी", "inclusion", "janajati", "minority"],
  },
  {
    id: "employment", nepali: "रोजगारी",       color: "#fbbf24", glow: "rgba(251,191,36,.5)",
    tipX: 82,  tipY: 46, fromX: 53, fromY: 55, cp1X: 65, cp1Y: 51, cp2X: 74, cp2Y: 47,
    side: "right", emoji: "💼",
    keywords: ["रोजगारी", "employment", "labor", "shramik", "job", "kaam"],
  },
  {
    id: "health",     nepali: "स्वास्थ्य",     color: "#f87171", glow: "rgba(248,113,113,.5)",
    tipX: 18,  tipY: 57, fromX: 47, fromY: 54, cp1X: 36, cp1Y: 55, cp2X: 27, cp2Y: 56,
    side: "left",  emoji: "🏥",
    keywords: ["स्वास्थ्य", "health", "hospital", "swasthya", "medicine"],
  },
  {
    id: "children",   nepali: "बालबालिका",     color: "#a78bfa", glow: "rgba(167,139,250,.5)",
    tipX: 79,  tipY: 58, fromX: 53, fromY: 60, cp1X: 63, cp1Y: 59, cp2X: 71, cp2Y: 58,
    side: "right", emoji: "👶",
    keywords: ["बालबालिका", "children", "child", "bal", "minor", "baccha"],
  },
  {
    id: "environment",nepali: "वातावरण",       color: "#34d399", glow: "rgba(52,211,153,.5)",
    tipX: 26,  tipY: 66, fromX: 47, fromY: 62, cp1X: 38, cp1Y: 63, cp2X: 32, cp2Y: 65,
    side: "left",  emoji: "🌿",
    keywords: ["वातावरण", "environment", "jungle", "nature", "forest", "climate"],
  },
  {
    id: "federalism", nepali: "संघीयता",       color: "#fb923c", glow: "rgba(251,146,60,.5)",
    tipX: 76,  tipY: 67, fromX: 53, fromY: 64, cp1X: 62, cp1Y: 65, cp2X: 69, cp2Y: 66,
    side: "right", emoji: "🗺️",
    keywords: ["संघीयता", "federalism", "province", "pradesh", "municipality"],
  },
];

const ROOT_WORDS = [
  { text: "जनता",               x: 28, y: 90 },
  { text: "सार्वभौमसत्ता",       x: 40, y: 94 },
  { text: "लोकतन्त्र",          x: 52, y: 96 },
  { text: "स्वतन्त्रता",        x: 64, y: 94 },
  { text: "संविधानको मूल आधार", x: 76, y: 90 },
];

// ─── Firefly Canvas ───────────────────────────────────────────────────────────

function FireflyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const flies = Array.from({ length: 40 }, () => ({
      x:    Math.random() * window.innerWidth,
      y:    Math.random() * window.innerHeight * 0.85,
      vx:   (Math.random() - 0.5) * 0.4,
      vy:   (Math.random() - 0.5) * 0.3,
      r:    Math.random() * 2 + 1,
      o:    Math.random(),
      od:   (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 0.015 + 0.005),
      hue:  Math.random() > 0.7 ? 45 : 90,   // warm gold or green
    }));

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      flies.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0)              f.x = canvas.width;
        if (f.x > canvas.width)   f.x = 0;
        if (f.y < 0)              f.y = canvas.height * 0.85;
        if (f.y > canvas.height * 0.85) f.y = 0;

        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 3);
        grad.addColorStop(0, `hsla(${f.hue},90%,80%,${f.o})`);
        grad.addColorStop(1, `hsla(${f.hue},90%,60%,0)`);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      });
      animId = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    />
  );
}

// ─── SVG Tree ─────────────────────────────────────────────────────────────────

function TreeSVG({
  selectedBranch,
  onBranchClick,
  articleCounts,
}: {
  selectedBranch: Branch | null;
  onBranchClick:  (b: Branch) => void;
  articleCounts:  Record<string, number>;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 3 }}
    >
      <defs>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="glow-branch">
          <feGaussianBlur stdDeviation="0.4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="trunk-grad" cx="50%" cy="60%" r="50%">
          <stop offset="0%"   stopColor="#6b3a0c" />
          <stop offset="100%" stopColor="#2d1505" />
        </radialGradient>
        <radialGradient id="ground-glow" cx="50%" cy="100%" r="60%">
          <stop offset="0%"   stopColor="rgba(34,197,94,0.08)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Ground glow */}
      <ellipse cx="50" cy="85" rx="28" ry="4" fill="url(#ground-glow)" />

      {/* Roots */}
      {[
        "M 49 81 C 40 84, 30 86, 22 91",
        "M 49 82 C 43 86, 37 89, 30 94",
        "M 50 83 C 50 88, 50 92, 50 97",
        "M 51 82 C 57 86, 63 89, 70 94",
        "M 51 81 C 60 84, 70 86, 78 91",
      ].map((d, i) => (
        <path key={i} d={d}
          stroke="#3d2008" strokeWidth="0.7" fill="none" opacity="0.85"
          strokeLinecap="round"
        />
      ))}

      {/* Root word labels */}
      {ROOT_WORDS.map((r) => (
        <text
          key={r.text} x={r.x} y={r.y}
          textAnchor="middle" fontSize="1.4" fill="rgba(180,140,80,0.55)"
          fontFamily="serif" letterSpacing="0.05"
        >
          {r.text}
        </text>
      ))}

      {/* Trunk — organic closed path */}
      <path
        d="M 47.5 82 C 45 70, 44 58, 45 46 C 46 36, 48 26, 49.5 18 C 51 26, 52 36, 55 46 C 56 58, 55 70, 52.5 82 Z"
        fill="url(#trunk-grad)"
        filter="url(#glow-green)"
      />
      {/* Trunk bark texture lines */}
      {[70, 60, 50, 40, 30].map(y => (
        <path key={y}
          d={`M ${46 + (y - 50) * 0.04} ${y} Q 50 ${y - 1}, ${54 - (y - 50) * 0.04} ${y}`}
          stroke="rgba(0,0,0,0.2)" strokeWidth="0.25" fill="none"
        />
      ))}

      {/* Trunk label */}
      <text x="50" y="54" textAnchor="middle" fontSize="2.2"
        fill="rgba(255,220,150,0.7)" fontFamily="serif" fontWeight="bold"
      >
        नेपालको संविधान
      </text>

      {/* Branches + nodes */}
      {BRANCHES.map(b => {
        const isSelected = selectedBranch?.id === b.id;
        const count      = articleCounts[b.id] ?? 0;
        return (
          <g key={b.id}>
            {/* Branch path */}
            <path
              d={`M ${b.fromX} ${b.fromY} C ${b.cp1X} ${b.cp1Y}, ${b.cp2X} ${b.cp2Y}, ${b.tipX} ${b.tipY}`}
              stroke={isSelected ? b.color : "#5a3010"}
              strokeWidth={isSelected ? "0.8" : "0.55"}
              fill="none"
              strokeLinecap="round"
              style={{
                filter:     isSelected ? `drop-shadow(0 0 1.5px ${b.color})` : undefined,
                transition: "stroke 0.4s, stroke-width 0.4s",
              }}
            />

            {/* Leaf cluster at tip */}
            {[
              { dx: 0,    dy: 0,    r: 2.2 },
              { dx: -1.2, dy: -1,   r: 1.5 },
              { dx:  1.2, dy: -0.8, r: 1.4 },
              { dx:  0.2, dy: -2,   r: 1.2 },
            ].map((leaf, li) => (
              <ellipse
                key={li}
                cx={b.tipX + leaf.dx}
                cy={b.tipY + leaf.dy}
                rx={leaf.r * 1.1}
                ry={leaf.r * 0.75}
                fill={isSelected ? b.color : "#1a4a1a"}
                opacity={isSelected ? 0.9 : 0.65}
                style={{
                  filter:     isSelected ? `drop-shadow(0 0 2px ${b.color})` : undefined,
                  transition: "fill 0.4s, opacity 0.4s",
                  transformOrigin: `${b.tipX}px ${b.tipY}px`,
                  animation:  `sway-${li % 3} ${3 + li * 0.5}s ease-in-out infinite`,
                }}
              />
            ))}

            {/* Glow node at tip */}
            <circle
              cx={b.tipX} cy={b.tipY} r={isSelected ? 1.8 : 1.1}
              fill={b.color}
              opacity={isSelected ? 1 : 0.75}
              style={{
                filter:     `drop-shadow(0 0 ${isSelected ? 3 : 1.5}px ${b.color})`,
                transition: "r 0.4s, opacity 0.4s",
              }}
            />

            {/* Clickable label */}
            <g
              onClick={() => onBranchClick(b)}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={b.side === "left" ? b.tipX - 11 : b.tipX - 1}
                y={b.tipY - 3.5}
                width={11} height={4.5}
                rx="1.5"
                fill={isSelected ? b.color : "rgba(10,20,10,0.75)"}
                stroke={b.color}
                strokeWidth="0.3"
                opacity={isSelected ? 0.95 : 0.85}
                style={{ transition: "fill 0.3s" }}
              />
              <text
                x={b.side === "left" ? b.tipX - 5.5 : b.tipX + 4.5}
                y={b.tipY - 0.5}
                textAnchor="middle"
                fontSize="1.55"
                fill={isSelected ? "#000" : b.color}
                fontFamily="system-ui, sans-serif"
                fontWeight={isSelected ? "bold" : "normal"}
                style={{ transition: "fill 0.3s", pointerEvents: "none" }}
              >
                {b.nepali}
                {count > 0 ? ` (${count})` : ""}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  record,
  onClose,
  onNote,
}: {
  record:  ConstitutionalFrameworkRecord;
  onClose: () => void;
  onNote:  (text: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");

  const dharaLabel = record.clause
    ? `धारा ${record.article} खण्ड ${record.clause}`
    : `धारा ${record.article}`;

  return (
    <div
      className="absolute top-0 right-0 h-full w-80 flex flex-col"
      style={{
        background: "rgba(5,10,5,0.95)",
        borderLeft:  "1px solid rgba(74,222,128,0.15)",
        zIndex: 20,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-3 border-b border-white/5">
        <div>
          <p className="text-white font-black text-base leading-snug">
            {record.titleNepali || record.titleEnglish}
          </p>
          <p className="text-green-400/70 text-xs mt-0.5 font-mono">{dharaLabel}</p>
          {record.part && (
            <p className="text-amber-500/60 text-xs mt-0.5">{record.part}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white text-xl leading-none shrink-0 mt-0.5"
        >×</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-none">

        {record.plainNepaliSummary && (
          <div>
            <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-1.5">सार तथा दर्शन</p>
            <p className="text-green-100/80 text-sm leading-relaxed">{record.plainNepaliSummary}</p>
          </div>
        )}

        {record.originalText && (
          <div className="bg-white/3 rounded-xl p-3 border border-white/5">
            <p className="text-xs text-white/30 mb-1">मूल पाठ</p>
            <p className="text-white/60 text-xs leading-relaxed italic">
              &ldquo;{record.originalText}&rdquo;
            </p>
          </div>
        )}

        {record.rights?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-green-400/70 uppercase tracking-wider mb-1.5">अधिकारहरू</p>
            <ul className="space-y-1">
              {record.rights.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-green-200/70">
                  <span className="text-green-500 shrink-0 mt-0.5">•</span>{r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {record.obligations?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-400/70 uppercase tracking-wider mb-1.5">दायित्वहरू</p>
            <ul className="space-y-1">
              {record.obligations.map((o, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-200/70">
                  <span className="text-amber-500 shrink-0 mt-0.5">→</span>{o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {record.affectedGroups?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-purple-400/70 uppercase tracking-wider mb-1.5">प्रभावित समूह</p>
            <div className="flex flex-wrap gap-1">
              {record.affectedGroups.map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/40">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {record.institutions?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-cyan-400/70 uppercase tracking-wider mb-1.5">सम्बन्धित निकाय</p>
            <div className="flex flex-wrap gap-1">
              {record.institutions.map(inst => (
                <span key={inst} className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                  🏛 {inst}
                </span>
              ))}
            </div>
          </div>
        )}

        {record.relatedArticles?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/30 uppercase tracking-wider mb-1">सम्बन्धित धाराहरू</p>
            <div className="flex flex-wrap gap-1">
              {record.relatedArticles.map(a => (
                <span key={a} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                  {a.replace("art-", "धारा ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {record.confidence != null && (
          <div>
            <p className="text-xs text-white/20 mb-1">विश्वास स्तर</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/10">
                <div
                  className="h-1 rounded-full bg-green-400"
                  style={{ width: `${Math.round(record.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs text-green-400/60">{Math.round(record.confidence * 100)}%</span>
            </div>
          </div>
        )}

        {record.sourcePage && (
          <p className="text-xs text-white/20">स्रोत पृष्ठ: {record.sourcePage}</p>
        )}
      </div>

      {/* Sticky note */}
      <div className="px-5 py-4 border-t border-white/5 space-y-2">
        {noteOpen ? (
          <>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="यो धारा बारे note..."
              className="w-full bg-white/5 border border-green-800/40 rounded-xl px-3 py-2 text-xs text-white/80 placeholder-white/20 resize-none focus:outline-none focus:border-green-600/60"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { onNote(noteText); setNoteText(""); setNoteOpen(false); }}
                className="flex-1 text-xs py-1.5 rounded-lg bg-green-800/50 hover:bg-green-700/60 text-green-300 transition-colors"
              >
                Save गर्नुस्
              </button>
              <button
                onClick={() => setNoteOpen(false)}
                className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 transition-colors"
              >
                रद्द
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setNoteOpen(true)}
            className="w-full text-xs py-2 rounded-xl bg-white/5 hover:bg-white/8 text-white/30 hover:text-white/50 border border-white/8 transition-colors text-left px-3"
          >
            📌 Sticky note थप्नुस्
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [records,        setRecords]        = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [search,         setSearch]         = useState("");
  const [mode,           setMode]           = useState<"tree" | "list">("tree");
  const [leafsVisible,   setLeafsVisible]   = useState(false);
  const searchRef                           = useRef<HTMLInputElement>(null);

  // Load public constitution records
  useEffect(() => {
    getDocs(query(
      collection(db, "constitutional_framework"),
      where("publishToJanta", "==", true),
    )).then(snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord)));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Article counts per branch
  const articleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    BRANCHES.forEach(b => {
      counts[b.id] = records.filter(r => {
        const bag = [
          ...(r.sectors ?? []),
          ...(r.constitutionalThemes ?? []),
          ...(r.keywords ?? []),
          r.titleNepali ?? "",
          r.titleEnglish ?? "",
        ].join(" ").toLowerCase();
        return b.keywords.some(k => bag.includes(k.toLowerCase()));
      }).length;
    });
    return counts;
  }, [records]);

  // Articles for the selected branch
  const branchArticles = useMemo(() => {
    if (!selectedBranch) return [];
    return records.filter(r => {
      const bag = [
        ...(r.sectors ?? []),
        ...(r.constitutionalThemes ?? []),
        ...(r.keywords ?? []),
        r.titleNepali ?? "",
        r.titleEnglish ?? "",
      ].join(" ").toLowerCase();
      return selectedBranch.keywords.some(k => bag.includes(k.toLowerCase()));
    }).sort((a, b) => a.article - b.article);
  }, [selectedBranch, records]);

  // Search filter
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return records.filter(r => {
      const bag = [
        r.titleNepali, r.titleEnglish,
        r.plainNepaliSummary, r.originalText,
        ...(r.keywords ?? []),
      ].join(" ").toLowerCase();
      return bag.includes(q);
    }).slice(0, 20);
  }, [search, records]);

  const handleBranchClick = useCallback((b: Branch) => {
    setSelectedBranch(prev => prev?.id === b.id ? null : b);
    setSelectedRecord(null);
    setLeafsVisible(false);
    setTimeout(() => setLeafsVisible(true), 50);
  }, []);

  const handleSaveNote = useCallback(async (text: string) => {
    if (!text.trim() || !selectedRecord) return;
    await addDoc(collection(db, "tree_ui_notes"), {
      treeId:     "constitution",
      targetType: "article",
      targetId:   selectedRecord.articleId ?? `art-${selectedRecord.article}`,
      noteText:   text.trim(),
      status:     "open",
      createdAt:  Timestamp.now(),
    }).catch(() => {});
  }, [selectedRecord]);

  const breadcrumb = selectedRecord
    ? `${selectedRecord.part ?? ""} › ${selectedBranch?.nepali ?? ""} › धारा ${selectedRecord.article}`
    : selectedBranch
    ? `${selectedBranch.nepali} › ${articleCounts[selectedBranch.id] ?? 0} articles`
    : "नेपालको संविधान";

  return (
    <>
      {/* Global animations */}
      <style>{`
        @keyframes sway-0 { 0%,100%{transform:rotate(-3deg) scale(1)} 50%{transform:rotate(3deg) scale(1.02)} }
        @keyframes sway-1 { 0%,100%{transform:rotate(2deg) scale(1)} 50%{transform:rotate(-2deg) scale(1.015)} }
        @keyframes sway-2 { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(2.5deg)} }
        @keyframes pulse-glow { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes rise { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes leaf-rise { from{opacity:0;transform:translateY(8px) scale(.92)} to{opacity:1;transform:none} }
        .leaf-card { animation: leaf-rise .35s ease both; }
        .panel-slide { animation: rise .3s ease both; }
      `}</style>

      {/* Full-screen container */}
      <div
        className="fixed inset-0 overflow-hidden select-none"
        style={{ background: "linear-gradient(to bottom, #030c03 0%, #051405 30%, #061906 55%, #0a2210 75%, #0f2e0a 100%)" }}
      >
        {/* Mountain silhouettes */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1000 200" preserveAspectRatio="none" style={{ zIndex: 1, opacity: 0.5 }}>
          <path d="M0,200 L0,140 L80,60 L160,120 L260,20 L360,100 L440,50 L520,130 L600,30 L700,110 L780,55 L860,120 L940,45 L1000,100 L1000,200 Z"
            fill="#0d1f0a" />
          <path d="M0,200 L0,160 L100,100 L180,150 L280,80 L380,140 L470,90 L560,155 L660,85 L750,145 L840,95 L920,150 L1000,115 L1000,200 Z"
            fill="#0a1908" />
        </svg>

        {/* Atmospheric horizon glow */}
        <div
          className="absolute bottom-0 left-0 w-full"
          style={{
            height: "35%",
            background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(180,100,20,0.06) 0%, transparent 70%)",
            zIndex: 1,
          }}
        />

        {/* Fireflies */}
        <FireflyCanvas />

        {/* Tree SVG */}
        <TreeSVG
          selectedBranch={selectedBranch}
          onBranchClick={handleBranchClick}
          articleCounts={articleCounts}
        />

        {/* ── Top Bar ── */}
        <div
          className="absolute top-0 left-0 right-0 flex items-center gap-3 px-4 py-3"
          style={{ zIndex: 30, background: "linear-gradient(to bottom, rgba(3,12,3,0.9) 0%, transparent 100%)" }}
        >
          <Link
            href="/janta"
            className="text-green-400/50 hover:text-green-400 text-xs transition-colors shrink-0"
          >
            ← जनता
          </Link>

          {/* Search */}
          <div className="relative flex-1 max-w-md mx-auto">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setSelectedRecord(null); }}
              placeholder="खोज्नुहोस्... (धारा, विषय, अधिकार)"
              className="w-full text-sm pl-4 pr-9 py-2 rounded-full text-white placeholder-white/25 focus:outline-none focus:ring-1 focus:ring-green-700/60"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(74,222,128,0.15)" }}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-sm"
              >×</button>
            )}
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-full overflow-hidden shrink-0" style={{ border: "1px solid rgba(74,222,128,0.15)" }}>
            {(["tree","list"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="text-xs px-3 py-1.5 transition-colors"
                style={{
                  background: mode === m ? "rgba(74,222,128,0.18)" : "transparent",
                  color:      mode === m ? "#4ade80" : "rgba(255,255,255,0.3)",
                }}
              >
                {m === "tree" ? "Tree Mode" : "List Mode"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Center title (tree mode, no selection) ── */}
        {mode === "tree" && !selectedBranch && !search && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: "8%", zIndex: 10, textAlign: "center" }}
          >
            <p className="text-2xl font-black text-white/90" style={{ textShadow: "0 0 30px rgba(74,222,128,0.3)" }}>
              नेपाल संविधान
            </p>
            <p className="text-xs text-green-300/40 mt-1">
              जीवित रूख — मौलिक हक, निर्देशक सिद्धान्त, संस्था, र नागरिक अधिकार।
            </p>
            {loading && (
              <p className="text-xs text-green-400/30 mt-1 animate-pulse">loading...</p>
            )}
          </div>
        )}

        {/* ── Search results overlay ── */}
        {search && searchResults.length > 0 && (
          <div
            className="absolute left-1/2 -translate-x-1/2 w-full max-w-lg panel-slide"
            style={{ top: "60px", zIndex: 40, maxHeight: "70vh", overflowY: "auto" }}
          >
            <div
              className="mx-4 rounded-2xl overflow-hidden"
              style={{ background: "rgba(5,14,5,0.97)", border: "1px solid rgba(74,222,128,0.15)", backdropFilter: "blur(12px)" }}
            >
              <div className="px-4 py-2 border-b border-white/5">
                <p className="text-xs text-green-400/60">{searchResults.length} results</p>
              </div>
              {searchResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setSelectedRecord(r); setSearch(""); }}
                  className="w-full text-left px-4 py-3 border-b border-white/4 hover:bg-green-950/30 transition-colors last:border-0"
                >
                  <p className="text-white/80 text-sm font-semibold">
                    {r.titleNepali || r.titleEnglish}
                  </p>
                  <p className="text-green-400/50 text-xs font-mono">धारा {r.article} · {r.part?.slice(0, 30)}</p>
                  {r.plainNepaliSummary && (
                    <p className="text-white/40 text-xs mt-0.5 line-clamp-1">{r.plainNepaliSummary}</p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Branch articles (tree mode, branch selected) ── */}
        {mode === "tree" && selectedBranch && !selectedRecord && (
          <div
            className="absolute left-4 panel-slide"
            style={{
              top: "70px", bottom: "80px",
              width: "260px",
              zIndex: 15,
              overflowY: "auto",
            }}
          >
            <div
              className="rounded-2xl overflow-hidden h-full flex flex-col"
              style={{ background: "rgba(5,14,5,0.92)", border: `1px solid ${selectedBranch.color}25`, backdropFilter: "blur(10px)" }}
            >
              <div className="px-4 py-3 border-b shrink-0" style={{ borderColor: `${selectedBranch.color}20` }}>
                <p className="font-black text-sm" style={{ color: selectedBranch.color }}>
                  {selectedBranch.emoji} {selectedBranch.nepali}
                </p>
                <p className="text-white/30 text-xs mt-0.5">{branchArticles.length} धाराहरू</p>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none">
                {branchArticles.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-8">
                    यो branch मा articles मिलेन — extraction check गर्नुस्
                  </p>
                ) : (
                  branchArticles.map((r, i) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRecord(r)}
                      className="w-full text-left rounded-xl p-3 border transition-colors leaf-card hover:border-white/15"
                      style={{
                        animationDelay:  `${i * 30}ms`,
                        background:      "rgba(255,255,255,0.03)",
                        borderColor:     "rgba(255,255,255,0.07)",
                      }}
                    >
                      <p className="text-white/80 text-xs font-semibold leading-snug line-clamp-2">
                        {r.titleNepali || r.titleEnglish}
                      </p>
                      <p className="font-mono mt-0.5" style={{ fontSize: "10px", color: `${selectedBranch.color}80` }}>
                        धारा {r.article}{r.clause ? ` खण्ड ${r.clause}` : ""}
                      </p>
                      {r.plainNepaliSummary && (
                        <p className="text-white/35 line-clamp-2 mt-1" style={{ fontSize: "10px" }}>
                          {r.plainNepaliSummary}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── List Mode ── */}
        {mode === "list" && (
          <div
            className="absolute inset-0 overflow-y-auto panel-slide"
            style={{ zIndex: 15, paddingTop: "56px", paddingBottom: "60px" }}
          >
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
              {BRANCHES.map(b => (
                <div key={b.id}>
                  <button
                    onClick={() => handleBranchClick(b)}
                    className="w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors"
                    style={{
                      background:  selectedBranch?.id === b.id ? `${b.color}15` : "rgba(255,255,255,0.03)",
                      border:      `1px solid ${b.color}${selectedBranch?.id === b.id ? "40" : "18"}`,
                    }}
                  >
                    <span>{b.emoji}</span>
                    <span className="font-bold text-sm" style={{ color: b.color }}>{b.nepali}</span>
                    <span className="text-white/20 text-xs ml-auto">{articleCounts[b.id] ?? 0} articles</span>
                  </button>
                  {selectedBranch?.id === b.id && branchArticles.length > 0 && (
                    <div className="pl-4 mt-1 space-y-1">
                      {branchArticles.map(r => (
                        <button
                          key={r.id}
                          onClick={() => setSelectedRecord(r)}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                          <span className="text-white/70 text-xs font-medium">
                            {r.titleNepali || r.titleEnglish}
                          </span>
                          <span className="text-white/25 text-xs ml-2">धारा {r.article}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Detail panel ── */}
        {selectedRecord && (
          <DetailPanel
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onNote={handleSaveNote}
          />
        )}

        {/* ── Bottom bar ── */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            zIndex: 25,
            background: "linear-gradient(to top, rgba(3,12,3,0.92) 0%, transparent 100%)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Breadcrumb */}
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-green-400/40 font-mono">{breadcrumb}</p>
          </div>

          {/* Quick access branch chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-none">
            {BRANCHES.map(b => (
              <button
                key={b.id}
                onClick={() => handleBranchClick(b)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={{
                  background:   selectedBranch?.id === b.id ? b.color : "rgba(255,255,255,0.06)",
                  color:        selectedBranch?.id === b.id ? "#000" : b.color,
                  border:       `1px solid ${b.color}30`,
                }}
              >
                <span>{b.emoji}</span>
                <span>{b.nepali}</span>
                {articleCounts[b.id] > 0 && (
                  <span className="opacity-60">({articleCounts[b.id]})</span>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p className="text-center text-white/12 pb-2" style={{ fontSize: "10px" }}>
            नेपालको संविधान २०७२ · ३०८ धारा · ३५ भाग · ९ अनुसूची
          </p>
        </div>
      </div>
    </>
  );
}
