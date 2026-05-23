"use client";

// /constitution — Living Nepal Constitution Tree
// UX Principle: Environment first. Data second. Wonder first. Interface second.
// State machine: forest → branch (leaves on tree) → article (floating panel)

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
  tipX:     number;   // SVG viewBox % (0–100)
  tipY:     number;
  fromX:    number;
  fromY:    number;
  cp1X:     number;
  cp1Y:     number;
  cp2X:     number;
  cp2Y:     number;
  side:     "left" | "right";
  keywords: string[];
  emoji:    string;
}

const BRANCHES: Branch[] = [
  {
    id: "justice",     nepali: "न्याय",       color: "#818cf8",
    tipX: 72,  tipY: 19, fromX: 54, fromY: 36, cp1X: 60, cp1Y: 30, cp2X: 66, cp2Y: 22,
    side: "right", emoji: "⚖️",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "संवैधानिक इजलास", "judiciary", "supreme court"],
  },
  {
    id: "rights",      nepali: "मौलिक हक",    color: "#4ade80",
    tipX: 23,  tipY: 26, fromX: 46, fromY: 38, cp1X: 38, cp1Y: 34, cp2X: 30, cp2Y: 28,
    side: "left",  emoji: "📜",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "right to freedom"],
  },
  {
    id: "education",   nepali: "शिक्षा",      color: "#60a5fa",
    tipX: 79,  tipY: 29, fromX: 54, fromY: 44, cp1X: 63, cp1Y: 38, cp2X: 71, cp2Y: 31,
    side: "right", emoji: "📚",
    keywords: ["शिक्षाको हक", "education", "right to education", "school", "university"],
  },
  {
    id: "women",       nepali: "महिला",        color: "#f472b6",
    tipX: 15,  tipY: 40, fromX: 46, fromY: 45, cp1X: 35, cp1Y: 43, cp2X: 24, cp2Y: 40,
    side: "left",  emoji: "👩",
    keywords: ["महिलाको हक", "women", "gender equality", "mahila"],
  },
  {
    id: "governance",  nepali: "सुशासन",       color: "#22d3ee",
    tipX: 68,  tipY: 42, fromX: 53, fromY: 50, cp1X: 60, cp1Y: 46, cp2X: 64, cp2Y: 43,
    side: "right", emoji: "🏛️",
    keywords: ["सुशासन", "good governance", "accountability", "transparency", "corruption"],
  },
  {
    id: "inclusion",   nepali: "समावेशिता",    color: "#c084fc",
    tipX: 20,  tipY: 50, fromX: 47, fromY: 50, cp1X: 37, cp1Y: 50, cp2X: 28, cp2Y: 50,
    side: "left",  emoji: "🤝",
    keywords: ["दलितको हक", "समावेशी", "inclusion", "dalit rights", "janajati"],
  },
  {
    id: "employment",  nepali: "रोजगारी",      color: "#fbbf24",
    tipX: 82,  tipY: 46, fromX: 53, fromY: 55, cp1X: 65, cp1Y: 51, cp2X: 74, cp2Y: 47,
    side: "right", emoji: "💼",
    keywords: ["रोजगारीको हक", "employment", "right to employment", "labor", "shramik"],
  },
  {
    id: "health",      nepali: "स्वास्थ्य",    color: "#f87171",
    tipX: 18,  tipY: 57, fromX: 47, fromY: 54, cp1X: 36, cp1Y: 55, cp2X: 27, cp2Y: 56,
    side: "left",  emoji: "🏥",
    keywords: ["स्वास्थ्यको हक", "health", "right to health", "hospital"],
  },
  {
    id: "children",    nepali: "बालबालिका",    color: "#a78bfa",
    tipX: 79,  tipY: 58, fromX: 53, fromY: 60, cp1X: 63, cp1Y: 59, cp2X: 71, cp2Y: 58,
    side: "right", emoji: "👶",
    keywords: ["बालबालिकाको हक", "children", "child rights", "bal"],
  },
  {
    id: "environment", nepali: "वातावरण",      color: "#34d399",
    tipX: 26,  tipY: 66, fromX: 47, fromY: 62, cp1X: 38, cp1Y: 63, cp2X: 32, cp2Y: 65,
    side: "left",  emoji: "🌿",
    keywords: ["वातावरणको हक", "environment", "clean environment", "forest"],
  },
  {
    id: "federalism",  nepali: "संघीयता",      color: "#fb923c",
    tipX: 76,  tipY: 67, fromX: 53, fromY: 64, cp1X: 62, cp1Y: 65, cp2X: 69, cp2Y: 66,
    side: "right", emoji: "🗺️",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "municipality"],
  },
];

// ─── Leaf positions — organic fan from branch tip ─────────────────────────────

function leafPositions(b: Branch, total: number): Array<{ x: number; y: number }> {
  const dx  = b.tipX - b.fromX;
  const dy  = b.tipY - b.fromY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux  = dx / len;
  const uy  = dy / len;
  const px  = -uy;  // perpendicular
  const py  = ux;

  return Array.from({ length: total }, (_, i) => {
    const t       = total <= 1 ? 0.5 : i / (total - 1);
    const forward = 4 + (i % 4) * 2.5;
    const spread  = (t - 0.5) * 14 + Math.sin(i * 1.8) * 3;
    return {
      x: b.tipX + ux * forward + px * spread,
      y: b.tipY + uy * forward + py * spread,
    };
  });
}

// ─── Firefly Canvas ───────────────────────────────────────────────────────────

function FireflyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c   = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let id: number;
    const r = () => { c.width = innerWidth; c.height = innerHeight; };
    r(); addEventListener("resize", r);
    const fs = Array.from({ length: 45 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight * 0.9,
      vx: (Math.random() - .5) * .35,
      vy: (Math.random() - .5) * .25,
      ra: Math.random() * 2 + .8,
      o: Math.random(),
      od: (Math.random() > .5 ? 1 : -1) * (.008 + Math.random() * .012),
      h: Math.random() > .65 ? 45 : 80,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      fs.forEach(f => {
        f.x += f.vx; f.y += f.vy;
        f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0) f.x = c.width;
        if (f.x > c.width) f.x = 0;
        if (f.y < 0) f.y = c.height * .9;
        if (f.y > c.height * .9) f.y = 0;
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.ra * 4);
        g.addColorStop(0, `hsla(${f.h},90%,80%,${f.o})`);
        g.addColorStop(1, `hsla(${f.h},90%,60%,0)`);
        ctx.beginPath(); ctx.arc(f.x, f.y, f.ra * 4, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      });
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", r); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }} />;
}

// ─── SVG World ───────────────────────────────────────────────────────────────

function WorldSVG({
  activeBranch,
  leaves,
  hoveredLeaf,
  onBranchClick,
  onLeafClick,
  onLeafHover,
  articleCounts,
}: {
  activeBranch: Branch | null;
  leaves: Array<{ record: ConstitutionalFrameworkRecord; x: number; y: number }>;
  hoveredLeaf: string | null;
  onBranchClick: (b: Branch) => void;
  onLeafClick: (r: ConstitutionalFrameworkRecord) => void;
  onLeafHover: (id: string | null) => void;
  articleCounts: Record<string, number>;
}) {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full" style={{ zIndex: 3 }}>
      <defs>
        <radialGradient id="tg" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#7a4510" />
          <stop offset="100%" stopColor="#2d1505" />
        </radialGradient>
        <radialGradient id="gg" cx="50%" cy="100%" r="60%">
          <stop offset="0%" stopColor="rgba(74,222,128,0.06)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <filter id="leaf-glow">
          <feGaussianBlur stdDeviation="0.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Ground glow */}
      <ellipse cx="50" cy="85" rx="32" ry="5" fill="url(#gg)" />

      {/* Roots */}
      {[
        "M 49 81 C 40 84 30 87 22 92",
        "M 49 82 C 43 86 37 89 30 94",
        "M 50 83 C 50 88 50 92 50 97",
        "M 51 82 C 57 86 63 89 70 94",
        "M 51 81 C 60 84 70 87 78 92",
      ].map((d, i) => (
        <path key={i} d={d} stroke="#3d2008" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      ))}

      {/* Root words */}
      {[
        { t: "जनता",              x: 22, y: 93.5 },
        { t: "सार्वभौमसत्ता",      x: 36, y: 96 },
        { t: "लोकतन्त्र",         x: 50, y: 98.5 },
        { t: "स्वतन्त्रता",       x: 64, y: 96 },
        { t: "मूल आधार",          x: 78, y: 93.5 },
      ].map(r => (
        <text key={r.t} x={r.x} y={r.y} textAnchor="middle" fontSize="1.3"
          fill="rgba(180,140,80,0.45)" fontFamily="serif">{r.t}</text>
      ))}

      {/* Trunk */}
      <path
        d="M 47.5 82 C 45 70 44 58 45 46 C 46 36 48 26 49.5 18 C 51 26 53 36 55 46 C 56 58 55 70 52.5 82 Z"
        fill="url(#tg)"
      />
      {/* Bark lines */}
      {[72, 62, 52, 42, 32].map(y => (
        <path key={y} d={`M ${46.5} ${y} Q 50 ${y - 0.8} ${53.5} ${y}`}
          stroke="rgba(0,0,0,0.18)" strokeWidth="0.2" fill="none" />
      ))}

      {/* Trunk text */}
      <text x="50" y="54" textAnchor="middle" fontSize="2"
        fill="rgba(255,215,120,0.65)" fontFamily="serif" fontWeight="bold">
        नेपालको संविधान
      </text>

      {/* Branches */}
      {BRANCHES.map(b => {
        const active  = activeBranch?.id === b.id;
        const dimmed  = activeBranch && !active;
        const count   = articleCounts[b.id] ?? 0;
        return (
          <g key={b.id}>
            {/* Branch path */}
            <path
              d={`M ${b.fromX} ${b.fromY} C ${b.cp1X} ${b.cp1Y}, ${b.cp2X} ${b.cp2Y}, ${b.tipX} ${b.tipY}`}
              stroke={active ? b.color : dimmed ? "#2a1806" : "#5a3010"}
              strokeWidth={active ? "0.9" : "0.5"}
              fill="none" strokeLinecap="round"
              style={{ transition: "stroke .5s, stroke-width .4s, filter .4s",
                filter: active ? `drop-shadow(0 0 1.5px ${b.color})` : undefined }}
            />

            {/* Leaf clusters at tip */}
            {[{dx:0,dy:0,rx:2,ry:1.4},{dx:-1,dy:-1,rx:1.4,ry:1},{dx:1.2,dy:-.9,rx:1.3,ry:.9},{dx:.1,dy:-2,rx:1.1,ry:.8}].map((lf, i) => (
              <ellipse key={i}
                cx={b.tipX + lf.dx} cy={b.tipY + lf.dy}
                rx={lf.rx} ry={lf.ry}
                fill={active ? b.color : dimmed ? "#0d1a0d" : "#183018"}
                opacity={active ? .85 : dimmed ? .25 : .6}
                style={{ transition: "fill .5s, opacity .5s",
                  animation: active ? `sway-${i%3} ${3+i*.6}s ease-in-out infinite` : undefined }}
              />
            ))}

            {/* Glow dot */}
            <circle cx={b.tipX} cy={b.tipY} r={active ? 1.5 : .9}
              fill={b.color} opacity={dimmed ? .2 : active ? 1 : .7}
              style={{ transition: "r .4s, opacity .4s",
                filter: active ? `drop-shadow(0 0 3px ${b.color})` : undefined }} />

            {/* Label — hidden when another branch is active */}
            {!dimmed && (
              <g onClick={() => onBranchClick(b)} style={{ cursor: "pointer" }}>
                <rect
                  x={b.side === "left" ? b.tipX - 12 : b.tipX - 1}
                  y={b.tipY - 3.5} width={12} height={4.5} rx="1.5"
                  fill={active ? b.color : "rgba(8,18,8,0.82)"}
                  stroke={b.color} strokeWidth="0.25"
                  opacity={active ? .95 : .85}
                  style={{ transition: "fill .3s" }}
                />
                <text
                  x={b.side === "left" ? b.tipX - 6 : b.tipX + 5}
                  y={b.tipY - 0.4}
                  textAnchor="middle" fontSize="1.5"
                  fill={active ? "#000" : b.color}
                  fontFamily="system-ui" fontWeight={active ? "bold" : "normal"}
                  style={{ pointerEvents: "none", transition: "fill .3s" }}
                >
                  {b.nepali}{count > 0 ? ` (${count})` : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Leaf nodes — only when branch selected */}
      {activeBranch && leaves.map(({ record, x, y }, i) => {
        const hovered = hoveredLeaf === record.id;
        return (
          <g key={record.id}
            style={{ animation: `leaf-emerge ${200 + i * 40}ms ease both`, cursor: "pointer" }}
            onMouseEnter={() => onLeafHover(record.id ?? null)}
            onMouseLeave={() => onLeafHover(null)}
            onClick={() => onLeafClick(record)}
          >
            {/* Glow halo */}
            <circle cx={x} cy={y} r={hovered ? 2.5 : 1.8}
              fill={activeBranch.color} opacity={hovered ? .18 : .08}
              style={{ transition: "r .25s, opacity .25s",
                filter: `drop-shadow(0 0 2px ${activeBranch.color})` }}
            />
            {/* Leaf dot */}
            <circle cx={x} cy={y} r={hovered ? 1.2 : .9}
              fill={hovered ? activeBranch.color : "#183018"}
              stroke={activeBranch.color} strokeWidth={hovered ? "0.35" : "0.25"}
              style={{ transition: "r .25s, fill .25s",
                filter: hovered ? `drop-shadow(0 0 1.5px ${activeBranch.color})` : undefined }}
            />
            {/* Tiny title on hover */}
            {hovered && (
              <text x={x + (x > 50 ? -2 : 2)} y={y - 1.8}
                textAnchor={x > 50 ? "end" : "start"}
                fontSize="1.3" fill={activeBranch.color}
                fontFamily="system-ui"
                style={{ filter: `drop-shadow(0 0 2px rgba(0,0,0,.9))` }}>
                {(record.titleNepali || record.titleEnglish || "").slice(0, 20)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Floating Glass Detail Panel ──────────────────────────────────────────────

function FloatingPanel({
  record,
  branch,
  onClose,
  onNote,
}: {
  record:  ConstitutionalFrameworkRecord;
  branch:  Branch | null;
  onClose: () => void;
  onNote:  (t: string) => void;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const color = branch?.color ?? "#4ade80";

  return (
    <div className="absolute inset-0 pointer-events-none flex items-start justify-center"
      style={{ zIndex: 50, paddingTop: "10vh" }}>
      <div
        className="pointer-events-auto w-full max-w-sm mx-4 rounded-2xl overflow-hidden panel-float"
        style={{
          background: "rgba(4, 10, 4, 0.88)",
          border: `1px solid ${color}30`,
          backdropFilter: "blur(18px)",
          boxShadow: `0 0 40px ${color}15, 0 20px 60px rgba(0,0,0,.6)`,
        }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3"
          style={{ borderBottom: `1px solid ${color}15` }}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-snug">
              {record.titleNepali || record.titleEnglish}
            </p>
            <p className="font-mono mt-1" style={{ fontSize: "11px", color: `${color}90` }}>
              धारा {record.article}{record.clause ? ` खण्ड ${record.clause}` : ""} · {record.part?.slice(0, 28)}
            </p>
          </div>
          <button onClick={onClose}
            className="shrink-0 text-white/30 hover:text-white transition-colors text-lg leading-none mt-0.5">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-64 overflow-y-auto scrollbar-none">
          {record.plainNepaliSummary && (
            <p className="text-green-100/75 text-sm leading-relaxed">{record.plainNepaliSummary}</p>
          )}
          {record.originalText && (
            <p className="text-white/35 text-xs italic leading-relaxed border-l-2 pl-3"
              style={{ borderColor: `${color}30` }}>
              &ldquo;{record.originalText.slice(0, 180)}&rdquo;
            </p>
          )}
          {record.rights?.length > 0 && (
            <div>
              <p className="text-xs mb-1" style={{ color: `${color}70` }}>अधिकारहरू</p>
              {record.rights.map((r, i) => (
                <p key={i} className="text-white/55 text-xs flex gap-1.5 mb-0.5">
                  <span style={{ color }}>•</span>{r}
                </p>
              ))}
            </div>
          )}
          {record.obligations?.length > 0 && (
            <div>
              <p className="text-xs mb-1 text-amber-400/60">दायित्वहरू</p>
              {record.obligations.map((o, i) => (
                <p key={i} className="text-white/50 text-xs flex gap-1.5 mb-0.5">
                  <span className="text-amber-500">→</span>{o}
                </p>
              ))}
            </div>
          )}
          {record.affectedGroups?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {record.affectedGroups.map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${color}12`, color: `${color}90`, border: `1px solid ${color}20` }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          {record.confidence != null && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-0.5 rounded-full bg-white/8">
                <div className="h-0.5 rounded-full" style={{ width: `${Math.round(record.confidence*100)}%`, background: color }} />
              </div>
              <span className="text-xs" style={{ color: `${color}50` }}>{Math.round(record.confidence*100)}%</span>
            </div>
          )}
        </div>

        {/* Sticky note */}
        <div className="px-5 pb-4 pt-2" style={{ borderTop: `1px solid ${color}10` }}>
          {noteOpen ? (
            <div className="space-y-2">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="यो धारा बारे note..."
                className="w-full text-xs rounded-xl px-3 py-2 resize-none focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${color}25`, color: "rgba(255,255,255,.7)" }}
                rows={2} />
              <div className="flex gap-2">
                <button onClick={() => { onNote(noteText); setNoteText(""); setNoteOpen(false); }}
                  className="flex-1 text-xs py-1.5 rounded-lg transition-colors"
                  style={{ background: `${color}20`, color }}>
                  Save
                </button>
                <button onClick={() => setNoteOpen(false)}
                  className="text-xs px-3 py-1.5 rounded-lg text-white/25 hover:text-white/40 transition-colors">
                  रद्द
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNoteOpen(true)}
              className="text-xs text-white/20 hover:text-white/40 transition-colors">
              📌 Note थप्नुस्
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [records,      setRecords]      = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [activeRecord, setActiveRecord] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [hoveredLeaf,  setHoveredLeaf]  = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [showSearch,   setShowSearch]   = useState(false);
  const [mode,         setMode]         = useState<"tree" | "list">("tree");
  const searchRef                       = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true)))
      .then(snap => setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord))))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ESC to go back
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (activeRecord)     { setActiveRecord(null); return; }
        if (activeBranch)     { setActiveBranch(null); return; }
        if (showSearch)       { setShowSearch(false); setSearch(""); }
      }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [activeRecord, activeBranch, showSearch]);

  // Focus search input when opened
  useEffect(() => {
    if (showSearch) setTimeout(() => searchRef.current?.focus(), 50);
  }, [showSearch]);

  // Article counts — tighter matching (only specific branch keywords)
  const articleCounts = useMemo(() => {
    const c: Record<string, number> = {};
    BRANCHES.forEach(b => {
      c[b.id] = records.filter(r => {
        const bag = [
          ...(r.sectors ?? []),
          ...(r.constitutionalThemes ?? []),
          r.titleNepali ?? "",
          r.titleEnglish ?? "",
        ].join(" ").toLowerCase();
        return b.keywords.some(k => bag.includes(k.toLowerCase()));
      }).length;
    });
    return c;
  }, [records]);

  // Articles for active branch (max 20 visible leaves)
  const branchArticles = useMemo(() => {
    if (!activeBranch) return [];
    const matched = records.filter(r => {
      const bag = [
        ...(r.sectors ?? []),
        ...(r.constitutionalThemes ?? []),
        r.titleNepali ?? "",
        r.titleEnglish ?? "",
      ].join(" ").toLowerCase();
      return activeBranch.keywords.some(k => bag.includes(k.toLowerCase()));
    }).sort((a, b) => a.article - b.article);
    return matched.slice(0, 20);
  }, [activeBranch, records]);

  // Leaf positions in SVG space
  const leaves = useMemo(() => {
    if (!activeBranch || !branchArticles.length) return [];
    const positions = leafPositions(activeBranch, branchArticles.length);
    return branchArticles.map((r, i) => ({ record: r, ...positions[i] }));
  }, [activeBranch, branchArticles]);

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return records.filter(r =>
      [r.titleNepali, r.titleEnglish, r.plainNepaliSummary, ...(r.keywords ?? [])]
        .join(" ").toLowerCase().includes(q)
    ).slice(0, 15);
  }, [search, records]);

  const handleBranchClick = useCallback((b: Branch) => {
    setActiveBranch(prev => prev?.id === b.id ? null : b);
    setActiveRecord(null);
  }, []);

  const handleSaveNote = useCallback(async (text: string) => {
    if (!text.trim() || !activeRecord) return;
    await addDoc(collection(db, "tree_ui_notes"), {
      treeId: "constitution", targetType: "article",
      targetId: activeRecord.articleId ?? `art-${activeRecord.article}`,
      noteText: text.trim(), status: "open", createdAt: Timestamp.now(),
    }).catch(() => {});
  }, [activeRecord]);

  const hasData = records.length > 0;

  return (
    <>
      <style>{`
        @keyframes sway-0{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}
        @keyframes sway-1{0%,100%{transform:rotate(2deg)}50%{transform:rotate(-2deg)}}
        @keyframes sway-2{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(2deg)}}
        @keyframes leaf-emerge{from{opacity:0;transform:scale(.3)}to{opacity:1;transform:scale(1)}}
        @keyframes panel-float{from{opacity:0;transform:translateY(-16px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes fade-in{from{opacity:0}to{opacity:1}}
        .panel-float{animation:panel-float .3s cubic-bezier(.16,1,.3,1) both}
        .fade-in{animation:fade-in .4s ease both}
      `}</style>

      {/* Full-screen world */}
      <div className="fixed inset-0 overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #020a02 0%, #041004 25%, #061506 50%, #091d07 72%, #0d260a 100%)" }}
        onClick={e => {
          // Click on empty space: close panels
          if ((e.target as HTMLElement).closest("svg") || (e.target as HTMLElement).closest("[data-ui]")) return;
          if (activeRecord) { setActiveRecord(null); return; }
        }}
      >
        {/* Mountain silhouettes */}
        <svg className="absolute bottom-0 left-0 w-full pointer-events-none" viewBox="0 0 1000 220"
          preserveAspectRatio="none" style={{ zIndex: 1, opacity: .45 }}>
          <path d="M0,220 L0,145 L80,65 L160,125 L260,20 L360,105 L440,52 L520,135 L600,32 L700,115 L780,58 L860,125 L940,48 L1000,105 L1000,220Z" fill="#0d2008" />
          <path d="M0,220 L0,165 L100,105 L180,155 L280,82 L380,145 L470,92 L560,158 L660,88 L750,148 L840,98 L920,155 L1000,118 L1000,220Z" fill="#0a1a07" />
        </svg>

        {/* Atmospheric glow behind trunk */}
        <div className="absolute pointer-events-none" style={{
          left: "35%", right: "35%", top: "15%", bottom: "5%", zIndex: 1,
          background: "radial-gradient(ellipse at center 70%, rgba(120,60,10,0.12) 0%, transparent 70%)",
        }} />

        <FireflyCanvas />

        {/* Main tree world */}
        <WorldSVG
          activeBranch={activeBranch}
          leaves={leaves}
          hoveredLeaf={hoveredLeaf}
          onBranchClick={handleBranchClick}
          onLeafClick={r => setActiveRecord(r)}
          onLeafHover={id => setHoveredLeaf(id)}
          articleCounts={articleCounts}
        />

        {/* ── Floating UI layer ── */}

        {/* Top search toggle */}
        <div data-ui className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2"
          style={{ zIndex: 40 }}>
          {showSearch ? (
            <div className="relative fade-in">
              <input ref={searchRef} type="text" value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="धारा, विषय, अधिकार खोज्नुस्..."
                className="text-sm pl-4 pr-8 py-2.5 rounded-full text-white placeholder-white/25 focus:outline-none w-72"
                style={{ background: "rgba(5,14,5,0.9)", border: "1px solid rgba(74,222,128,0.2)", backdropFilter: "blur(12px)" }}
              />
              <button onClick={() => { setShowSearch(false); setSearch(""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">×</button>
            </div>
          ) : (
            <button data-ui onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white/40 hover:text-white/70 transition-colors text-sm"
              style={{ background: "rgba(5,14,5,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
              🔍 <span>खोज्नुस्...</span>
            </button>
          )}
        </div>

        {/* Search results dropdown */}
        {showSearch && search && searchResults.length > 0 && (
          <div data-ui className="absolute left-1/2 -translate-x-1/2 w-80 fade-in"
            style={{ top: "64px", zIndex: 45, maxHeight: "60vh", overflowY: "auto" }}>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(4,12,4,0.97)", border: "1px solid rgba(74,222,128,0.12)", backdropFilter: "blur(16px)" }}>
              {searchResults.map(r => (
                <button key={r.id}
                  onClick={() => { setActiveRecord(r); setShowSearch(false); setSearch(""); }}
                  className="w-full text-left px-4 py-3 border-b border-white/4 hover:bg-green-950/25 transition-colors last:border-0">
                  <p className="text-white/75 text-sm font-medium">{r.titleNepali || r.titleEnglish}</p>
                  <p className="text-green-400/45 text-xs font-mono mt-0.5">धारा {r.article} · {r.part?.slice(0,25)}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode toggle — top right */}
        <div data-ui className="absolute top-4 right-4" style={{ zIndex: 40 }}>
          <div className="flex rounded-full overflow-hidden text-xs"
            style={{ background: "rgba(5,14,5,0.7)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
            {(["tree","list"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="px-3 py-1.5 transition-colors"
                style={{ background: mode===m ? "rgba(74,222,128,0.18)" : "transparent",
                  color: mode===m ? "#4ade80" : "rgba(255,255,255,.3)" }}>
                {m === "tree" ? "Tree" : "List"}
              </button>
            ))}
          </div>
        </div>

        {/* ← Back nav — top left, minimal */}
        <Link href="/janta" data-ui
          className="absolute top-4 left-4 text-white/20 hover:text-white/50 transition-colors text-xs"
          style={{ zIndex: 40 }}>
          ← जनता
        </Link>

        {/* Floating article detail panel */}
        {activeRecord && (
          <FloatingPanel
            record={activeRecord}
            branch={activeBranch}
            onClose={() => setActiveRecord(null)}
            onNote={handleSaveNote}
          />
        )}

        {/* List mode overlay */}
        {mode === "list" && (
          <div data-ui className="absolute inset-0 overflow-y-auto fade-in"
            style={{ zIndex: 35, paddingTop: "64px", paddingBottom: "48px",
              background: "rgba(2,8,2,0.92)", backdropFilter: "blur(4px)" }}>
            <div className="max-w-lg mx-auto px-4 py-4 space-y-1.5">
              <p className="text-green-400/40 text-xs text-center mb-4">
                {hasData ? `${records.length} articles extracted` : "Loading..."}
              </p>
              {BRANCHES.map(b => (
                <div key={b.id}>
                  <button onClick={() => { setActiveBranch(prev => prev?.id===b.id ? null : b); setMode("tree"); }}
                    className="w-full text-left px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${b.color}18` }}>
                    <span>{b.emoji}</span>
                    <span className="font-bold text-sm" style={{ color: b.color }}>{b.nepali}</span>
                    <span className="text-white/20 text-xs ml-auto">{articleCounts[b.id]??0} articles</span>
                    <span style={{ color: `${b.color}60` }} className="text-xs">→ tree</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Branch active — minimal top hint */}
        {activeBranch && !activeRecord && mode === "tree" && (
          <div data-ui className="absolute top-16 left-1/2 -translate-x-1/2 fade-in"
            style={{ zIndex: 30 }}>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs"
              style={{ background: "rgba(4,12,4,0.8)", border: `1px solid ${activeBranch.color}25`,
                backdropFilter: "blur(8px)", color: `${activeBranch.color}80` }}>
              {activeBranch.emoji} {activeBranch.nepali} ·{" "}
              <span className="text-white/30">{branchArticles.length} leaves — click to explore</span>
              <button onClick={() => setActiveBranch(null)} className="text-white/20 hover:text-white/50 ml-1">×</button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-green-400/30 text-xs animate-pulse"
            style={{ zIndex: 30 }}>
            संविधान load हुँदैछ...
          </div>
        )}

        {/* Default hint */}
        {!loading && hasData && !activeBranch && !activeRecord && mode === "tree" && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-center"
            style={{ zIndex: 10, pointerEvents: "none" }}>
            <p className="text-white/15 text-xs">शाखा छुनुस् र खोज्नुस्</p>
          </div>
        )}

        {/* No data hint */}
        {!loading && !hasData && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 fade-in text-center"
            style={{ zIndex: 30 }}>
            <Link href="/vault/documents" data-ui
              className="text-xs px-4 py-2 rounded-full text-amber-300/70 hover:text-amber-300 transition-colors"
              style={{ background: "rgba(120,60,0,0.3)", border: "1px solid rgba(180,100,0,0.2)" }}>
              📜 Constitution Extract गर्नुस् →
            </Link>
          </div>
        )}

        {/* Subtle footer */}
        <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white/8 text-center pointer-events-none"
          style={{ fontSize: "10px", zIndex: 10 }}>
          नेपालको संविधान २०७२ · ३०८ धारा · ३५ भाग
        </p>
      </div>
    </>
  );
}
