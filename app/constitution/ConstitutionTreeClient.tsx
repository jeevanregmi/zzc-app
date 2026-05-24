"use client";

// /constitution — Living Nepal Constitutional Tree
// Full procedural canvas banyan tree — no photo, modeled from code

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

// ─── Branch config ────────────────────────────────────────────────────────────

interface Branch {
  id:          string;
  nepali:      string;
  short:       string;
  color:       string;
  lx:          number;   // label x % in canvas
  ly:          number;   // label y % in canvas
  orbitRadius: number;
  depth:       "back" | "mid" | "front";
  part:        string;
  keywords:    string[];
}

const BRANCHES: Branch[] = [
  { id: "federalism", nepali: "संघीयता", short: "संघीयता",
    color: "#fb923c", lx: 50, ly: 16, orbitRadius: 14, depth: "front", part: "भाग ५",
    keywords: ["संघीय संरचना","federalism","province","pradesh","संघ","भाग ५","भाग ६","federal structure"] },
  { id: "rights", nepali: "मौलिक हक", short: "मौलिक हक",
    color: "#4ade80", lx: 20, ly: 26, orbitRadius: 14, depth: "front", part: "भाग ३",
    keywords: ["मौलिक हक","fundamental rights","right to equality","right to freedom","समानता","स्वतन्त्रता","भाग ३"] },
  { id: "judiciary", nepali: "न्यायपालिका", short: "न्यायपालिका",
    color: "#60a5fa", lx: 72, ly: 20, orbitRadius: 12, depth: "mid", part: "भाग ११",
    keywords: ["न्यायपालिका","सर्वोच्च अदालत","judiciary","supreme court","भाग ११","अदालत"] },
  { id: "legislature", nepali: "व्यवस्थापिका", short: "व्यवस्थापिका",
    color: "#818cf8", lx: 78, ly: 34, orbitRadius: 12, depth: "mid", part: "भाग ८",
    keywords: ["व्यवस्थापिका","संसद","प्रतिनिधि सभा","parliament","legislature","भाग ८"] },
  { id: "constitutional-bodies", nepali: "संवैधानिक अंगहरू", short: "सं. अंगहरू",
    color: "#f472b6", lx: 18, ly: 40, orbitRadius: 11, depth: "back", part: "भाग ३३",
    keywords: ["संवैधानिक अंग","constitutional bodies","commission","आयोग","भाग ३३","अख्तियार"] },
  { id: "executive", nepali: "कार्यपालिका", short: "कार्यपालिका",
    color: "#fbbf24", lx: 82, ly: 46, orbitRadius: 12, depth: "mid", part: "भाग ७",
    keywords: ["कार्यपालिका","executive","प्रधानमन्त्री","मन्त्रिपरिषद","भाग ७","prime minister"] },
  { id: "directives", nepali: "राज्यका निर्देशक सिद्धान्त", short: "निर्देशक सिद्धान्त",
    color: "#c084fc", lx: 14, ly: 52, orbitRadius: 11, depth: "back", part: "भाग ४",
    keywords: ["निर्देशक सिद्धान्त","state directives","directive principles","भाग ४"] },
  { id: "citizenship", nepali: "नागरिकता", short: "नागरिकता",
    color: "#f87171", lx: 72, ly: 63, orbitRadius: 11, depth: "front", part: "भाग २",
    keywords: ["नागरिकता","citizenship","नागरिक","भाग २","nationality"] },
  { id: "local-govt", nepali: "स्थानीय शासन", short: "स्थानीय शासन",
    color: "#34d399", lx: 14, ly: 68, orbitRadius: 11, depth: "mid", part: "भाग २०",
    keywords: ["स्थानीय","नगरपालिका","गाउँपालिका","local government","भाग २०","municipality"] },
];

function articleMatchesBranch(a: ConstitutionalFrameworkRecord, b: Branch): boolean {
  const hay = [a.titleEnglish, a.titleNepali, a.part,
    ...(a.sectors ?? []), ...(a.constitutionalThemes ?? []),
    ...(a.keywords ?? []), ...(a.institutions ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return b.keywords.some(k => hay.includes(k.toLowerCase()));
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─── Canvas tree ──────────────────────────────────────────────────────────────

function drawSubBranches(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x: number, y: number,
  angle: number, len: number, wid: number,
  depth: number, t: number,
) {
  if (depth === 0 || wid < 0.5) {
    // Leaf cluster
    const n = 6 + Math.floor(rng() * 8);
    const phase = rng() * Math.PI * 2;
    const sway  = Math.sin(t * 0.0007 + phase) * 2.5;
    for (let i = 0; i < n; i++) {
      const lx = x + (rng() - 0.5) * 28 + sway;
      const ly = y + (rng() - 0.38) * 20;
      const lw = 7  + rng() * 13;
      const lh = 4  + rng() * 8;
      const lr = rng() * Math.PI;
      const g  = 65 + Math.floor(rng() * 55);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(lr);
      ctx.beginPath();
      ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(14,${g},8,${0.50 + rng() * 0.38})`;
      ctx.fill();
      ctx.restore();
    }
    return;
  }
  const sway  = Math.sin(t * 0.00055 + x * 0.0035 + depth * 1.3) * (5 - depth) * 0.012;
  const ex    = x + Math.cos(angle + sway) * len;
  const ey    = y + Math.sin(angle + sway) * len;
  const bark  = 40 + depth * 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineWidth   = wid;
  ctx.strokeStyle = `rgba(${bark},${Math.floor(bark * 0.55)},${Math.floor(bark * 0.18)},0.92)`;
  ctx.lineCap     = "round";
  ctx.stroke();
  const r   = 0.65 + rng() * 0.08;
  const sL  = 0.28 + rng() * 0.16;
  const sR  = 0.24 + rng() * 0.16;
  drawSubBranches(ctx, rng, ex, ey, angle - sL, len * r,  wid * 0.62, depth - 1, t);
  drawSubBranches(ctx, rng, ex, ey, angle + sR, len * (r - 0.04), wid * 0.60, depth - 1, t);
  if (depth > 2 && rng() > 0.58) {
    drawSubBranches(ctx, rng, ex, ey, angle + (rng() - 0.5) * 0.5, len * 0.52, wid * 0.48, depth - 2, t);
  }
}

function drawAerialRoot(ctx: CanvasRenderingContext2D, rng: () => number, x: number, y: number, H: number) {
  const len  = 70 + rng() * 140;
  const ex   = x + (rng() - 0.5) * 18;
  const ey   = Math.min(y + len, H * 0.91);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x + (rng() - 0.5) * 12, y + len * 0.33,
    ex + (rng() - 0.5) * 12, y + len * 0.68,
    ex, ey,
  );
  ctx.strokeStyle = `rgba(20,9,3,${0.28 + rng() * 0.22})`;
  ctx.lineWidth   = 0.7 + rng() * 1.4;
  ctx.stroke();
}

// Main branch: bezier from trunk junction to label position, then sub-branches
function drawMainBranch(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  jx: number, jy: number,       // junction on trunk (px)
  ex: number, ey: number,       // endpoint / label position (px)
  color: string,
  isActive: boolean,
  wid: number,
  subDepth: number,
  t: number,
  W: number, H: number,
) {
  const sway = Math.sin(t * 0.0005 + jx * 0.002) * 3;
  const c1x  = jx + (ex - jx) * 0.3;
  const c1y  = jy + (ey - jy) * 0.15 + sway;
  const c2x  = jx + (ex - jx) * 0.72;
  const c2y  = jy + (ey - jy) * 0.68 + sway * 0.6;

  // Trunk-to-branch bezier
  const dark = parseInt(color.slice(1, 3), 16);
  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
  ctx.lineWidth   = wid;
  ctx.strokeStyle = isActive ? color + "88" : `rgba(52,26,9,0.90)`;
  ctx.lineCap     = "round";
  ctx.stroke();

  if (isActive) {
    // Highlight glow on active branch
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    ctx.lineWidth   = wid * 0.5;
    ctx.strokeStyle = color + "44";
    ctx.stroke();
  }

  // Aerial roots from midpoint
  const mx = c2x, my = c2y;
  const rootCount = Math.floor(rng() * 3) + 1;
  for (let i = 0; i < rootCount; i++) {
    drawAerialRoot(ctx, rng, mx + (rng() - 0.5) * 30, my, H);
  }

  // Sub-branches from endpoint
  const spreadAngle = Math.atan2(ey - jy, ex - jx);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle - 0.35, 42 + rng() * 20, wid * 0.52, subDepth, t);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle + 0.28, 38 + rng() * 20, wid * 0.50, subDepth, t);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle,        36 + rng() * 16, wid * 0.45, subDepth - 1, t);
}

function renderTree(canvas: HTMLCanvasElement, t: number, activeBranchId: string | null) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const cx = W * 0.5;

  ctx.clearRect(0, 0, W, H);

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   "#010801");
  bg.addColorStop(0.5, "#030c02");
  bg.addColorStop(1,   "#050f03");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Warm god-light from top center
  const gl = ctx.createRadialGradient(cx, 0, 0, cx, H * 0.1, W * 0.55);
  gl.addColorStop(0,   "rgba(255,185,55,0.09)");
  gl.addColorStop(0.45,"rgba(255,155,35,0.04)");
  gl.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);

  // Ground glow
  const gg = ctx.createRadialGradient(cx, H, 0, cx, H, W * 0.6);
  gg.addColorStop(0,   "rgba(30,15,5,0.60)");
  gg.addColorStop(0.5, "rgba(15,8,2,0.30)");
  gg.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, H);

  const baseRng = mkRng(42);

  // Ground roots spread
  const rootSpread = W * 0.28;
  for (let i = 0; i < 8; i++) {
    const angle  = -Math.PI + (i / 7) * Math.PI;
    const rlen   = rootSpread * (0.55 + baseRng() * 0.45);
    const ex     = cx + Math.cos(angle) * rlen;
    const ey     = H * 0.97 + Math.sin(angle) * rlen * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx, H * 0.94);
    ctx.quadraticCurveTo(
      cx + Math.cos(angle) * rlen * 0.55, H * 0.96,
      ex, ey,
    );
    ctx.strokeStyle = `rgba(25,12,4,${0.55 + baseRng() * 0.25})`;
    ctx.lineWidth   = 8 - i * 0.5;
    ctx.lineCap     = "round";
    ctx.stroke();
  }

  // TRUNK — main column with slight sway
  const trunkSway = Math.sin(t * 0.00035) * 2.5;
  const trunkTop  = H * 0.38;
  const trunkBot  = H * 0.92;

  // Trunk shadow/depth (darker inner)
  ctx.beginPath();
  ctx.moveTo(cx - 22, trunkBot);
  ctx.bezierCurveTo(
    cx - 18 + trunkSway * 0.3, trunkBot * 0.7,
    cx - 14 + trunkSway,       trunkTop + 60,
    cx - 10 + trunkSway,       trunkTop,
  );
  ctx.lineTo(cx + 10 + trunkSway, trunkTop);
  ctx.bezierCurveTo(
    cx + 14 + trunkSway,       trunkTop + 60,
    cx + 18 + trunkSway * 0.3, trunkBot * 0.7,
    cx + 22,                   trunkBot,
  );
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0);
  tg.addColorStop(0,    "rgba(20,9,3,0.95)");
  tg.addColorStop(0.25, "rgba(52,26,9,0.90)");
  tg.addColorStop(0.5,  "rgba(62,32,10,0.92)");
  tg.addColorStop(0.75, "rgba(45,22,7,0.90)");
  tg.addColorStop(1,    "rgba(18,8,2,0.95)");
  ctx.fillStyle = tg;
  ctx.fill();

  // Trunk center highlight
  ctx.beginPath();
  ctx.moveTo(cx - 3, trunkBot);
  ctx.bezierCurveTo(
    cx - 2 + trunkSway * 0.4, trunkBot * 0.65,
    cx + 1 + trunkSway,       trunkTop + 80,
    cx + 2 + trunkSway,       trunkTop,
  );
  ctx.lineWidth   = 4;
  ctx.strokeStyle = "rgba(72,38,12,0.35)";
  ctx.stroke();

  // Branch definitions: [junction t along trunk, label position lx%,ly%]
  // Matches BRANCHES array order exactly
  type BDef = { id: string; t: number; wid: number; subD: number };
  const BDEFS: BDef[] = [
    { id: "federalism",            t: 0.90, wid: 10, subD: 4 },
    { id: "rights",                t: 0.70, wid: 9,  subD: 4 },
    { id: "judiciary",             t: 0.80, wid: 8,  subD: 3 },
    { id: "legislature",           t: 0.62, wid: 9,  subD: 4 },
    { id: "constitutional-bodies", t: 0.50, wid: 7,  subD: 3 },
    { id: "executive",             t: 0.55, wid: 8,  subD: 3 },
    { id: "directives",            t: 0.40, wid: 7,  subD: 3 },
    { id: "citizenship",           t: 0.22, wid: 7,  subD: 3 },
    { id: "local-govt",            t: 0.18, wid: 7,  subD: 3 },
  ];

  BDEFS.forEach(def => {
    const branch  = BRANCHES.find(b => b.id === def.id)!;
    const jy      = trunkBot - (trunkBot - trunkTop) * def.t + trunkSway * def.t;
    const jx      = cx + trunkSway * def.t * 0.4;
    const ex      = W * (branch.lx / 100);
    const ey      = H * (branch.ly / 100);
    const rng     = mkRng(BDEFS.indexOf(def) * 137 + 42);
    drawMainBranch(ctx, rng, jx, jy, ex, ey, branch.color, activeBranchId === def.id, def.wid, def.subD, t, W, H);
  });

  // Canopy mass at top (behind labels)
  for (let i = 0; i < 5; i++) {
    const rng = mkRng(i * 99 + 7);
    const canX = cx + (rng() - 0.5) * W * 0.35;
    const canY = H * (0.08 + rng() * 0.14);
    const sway = Math.sin(t * 0.0006 + i * 1.2) * 3;
    const cr   = ctx.createRadialGradient(canX + sway, canY, 0, canX + sway, canY, 60 + rng() * 50);
    cr.addColorStop(0,   `rgba(18,55,10,0.55)`);
    cr.addColorStop(0.6, `rgba(10,35,6,0.28)`);
    cr.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = cr;
    ctx.beginPath();
    ctx.ellipse(canX + sway, canY, 80 + rng() * 60, 55 + rng() * 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ─── Bloom positions ──────────────────────────────────────────────────────────

function bloomPositions(count: number, lx: number, ly: number, r: number) {
  const n     = Math.min(count, 8);
  if (!n) return [];
  const base  = Math.atan2(45 - ly, 50 - lx);
  const spread = n <= 2 ? Math.PI * 0.45 : Math.PI * 0.85;
  return Array.from({ length: n }, (_, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const a = base + (t - 0.5) * spread;
    return {
      x: Math.max(5, Math.min(93, lx + Math.cos(a) * (r + (i % 3) * 2))),
      y: Math.max(5, Math.min(85, ly + Math.sin(a) * (r + (i % 3) * 2))),
    };
  });
}

// ─── Firefly canvas ───────────────────────────────────────────────────────────

function FireflyCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let id: number;
    const resize = () => { c.width = innerWidth; c.height = innerHeight; };
    resize(); addEventListener("resize", resize);
    const flies = Array.from({ length: 28 }, () => ({
      x: Math.random() * innerWidth, y: 60 + Math.random() * innerHeight * 0.82,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.12,
      r: 0.5 + Math.random() * 1.2, o: Math.random(),
      od: (Math.random() > 0.5 ? 1 : -1) * (0.004 + Math.random() * 0.010),
      hue: Math.random() > 0.55 ? 55 : 108,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const f of flies) {
        f.x += f.vx; f.y += f.vy; f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0) f.x = c.width; if (f.x > c.width) f.x = 0;
        if (f.y < 60) f.y = c.height * 0.88; if (f.y > c.height * 0.88) f.y = 60;
        const a = Math.max(0, Math.min(1, f.o));
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 7);
        g.addColorStop(0, `hsla(${f.hue},100%,80%,${a * 0.42})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${f.hue},100%,94%,${a})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none", opacity: 0.72 }} />;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function CategorySidebar({ branches, articles, activeBranch, onSelect }: {
  branches: Branch[]; articles: ConstitutionalFrameworkRecord[];
  activeBranch: Branch | null; onSelect: (b: Branch) => void;
}) {
  return (
    <div style={{ position: "fixed", left: 0, top: "60px", bottom: "36px", width: "176px", zIndex: 50, background: "rgba(1,5,1,0.88)", backdropFilter: "blur(18px)", borderRight: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <p style={{ padding: "11px 13px 7px", fontSize: "8px", fontWeight: 800, color: "rgba(255,255,255,0.20)", letterSpacing: "0.14em", textTransform: "uppercase", flexShrink: 0 }}>संवैधानिक शाखाहरू</p>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {branches.map(b => {
          const count = articles.filter(a => articleMatchesBranch(a, b)).length;
          const active = activeBranch?.id === b.id;
          return (
            <button key={b.id} onClick={() => onSelect(b)} style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 13px", background: active ? `${b.color}0e` : "transparent", border: "none", cursor: "pointer", textAlign: "left", borderLeft: `2px solid ${active ? b.color : "transparent"}`, transition: "all 0.16s" }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: b.color, boxShadow: active ? `0 0 6px ${b.color}` : "none", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", fontWeight: active ? 700 : 400, color: active ? b.color : "rgba(255,255,255,0.52)", flex: 1, lineHeight: 1.3 }}>{b.nepali}</span>
              {count > 0 && <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.20)", background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "1px 5px", flexShrink: 0 }}>{count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Branch label ─────────────────────────────────────────────────────────────

function BranchLabel({ branch, isActive, isDimmed, onClick }: {
  branch: Branch; isActive: boolean; isDimmed: boolean; onClick: () => void;
}) {
  const scale   = isActive ? 1.06 : branch.depth === "back" ? 0.88 : branch.depth === "mid" ? 0.94 : 1.0;
  const opacity = isDimmed ? 0.14 : isActive ? 1.0 : branch.depth === "back" ? 0.56 : branch.depth === "mid" ? 0.74 : 0.90;
  return (
    <button onClick={onClick} className="branch-label" style={{
      position: "absolute", left: `${branch.lx}%`, top: `${branch.ly}%`,
      transform: `translate(-50%,-50%) scale(${scale})`,
      background: isActive ? "rgba(2,6,2,0.82)" : "rgba(2,5,2,0.46)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${branch.color}${isActive ? "66" : "28"}`,
      borderRadius: "14px", padding: "8px 15px 7px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
      boxShadow: isActive ? `0 0 8px ${branch.color}38, 0 3px 18px rgba(0,0,0,0.80)` : `0 2px 12px rgba(0,0,0,0.72)`,
      cursor: "pointer", pointerEvents: "auto", opacity,
      transition: "opacity 0.28s, box-shadow 0.28s, border-color 0.28s",
      zIndex: isActive ? 40 : branch.depth === "front" ? 25 : branch.depth === "mid" ? 20 : 15,
      animation: "float-label 5.5s ease-in-out infinite",
      animationDelay: `${(branch.lx % 7) * 0.38}s`,
      filter: branch.depth === "back" && !isActive ? "blur(0.4px)" : "none",
      whiteSpace: "nowrap",
    }}>
      <div style={{ position: "absolute", top: "-8px", left: "50%", transform: "translateX(-50%)", width: isActive ? "12px" : "9px", height: isActive ? "12px" : "9px", borderRadius: "50%", background: branch.color, boxShadow: isActive ? `0 0 10px ${branch.color}99` : `0 0 4px ${branch.color}66`, animation: isActive ? "orb-pulse 2.4s ease-in-out infinite" : "none", transition: "width 0.28s, height 0.28s", pointerEvents: "none" }} />
      <span style={{ fontSize: branch.depth === "back" ? "11px" : "12px", fontWeight: 600, color: isActive ? "#fff" : "rgba(255,255,255,0.84)" }}>{branch.nepali}</span>
      <span style={{ fontSize: "8.5px", fontWeight: 500, color: branch.color, opacity: isActive ? 0.88 : 0.60 }}>{branch.part}</span>
    </button>
  );
}

// ─── Article leaf ─────────────────────────────────────────────────────────────

function ArticleLeaf({ article, branch, x, y, index, isActive, onClick }: {
  article: ConstitutionalFrameworkRecord; branch: Branch;
  x: number; y: number; index: number; isActive: boolean; onClick: () => void;
}) {
  const rot   = ((index * 7) % 11) - 5;
  const title = (article.titleNepali || article.titleEnglish) ?? "";
  return (
    <button onClick={onClick} style={{
      position: "absolute", left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) rotate(${rot}deg)`,
      background: isActive ? `${branch.color}16` : "rgba(2,9,2,0.72)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${branch.color}${isActive ? "55" : "25"}`,
      borderRadius: "10px", padding: "6px 10px", maxWidth: "126px", textAlign: "left",
      boxShadow: isActive ? `0 0 10px ${branch.color}44, 0 3px 14px rgba(0,0,0,0.70)` : `0 2px 10px rgba(0,0,0,0.65)`,
      cursor: "pointer", zIndex: 35, pointerEvents: "auto",
      animation: `leaf-bloom 0.42s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.055}s both`,
      transition: "all 0.20s ease",
    }}>
      <p style={{ fontSize: "9px", fontWeight: 700, color: branch.color, margin: 0 }}>धारा {article.article}</p>
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.78)", margin: "2px 0 0", lineHeight: 1.35 }}>
        {title.slice(0, 26)}{title.length > 26 ? "…" : ""}
      </p>
    </button>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "9px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "6px", opacity: 0.82 }}>{label}</p>
      {children}
    </div>
  );
}

function DetailPanel({ branch, articles, activeArticle, onArticleSelect, onBack, onClose, onNote }: {
  branch: Branch; articles: ConstitutionalFrameworkRecord[];
  activeArticle: ConstitutionalFrameworkRecord | null;
  onArticleSelect: (a: ConstitutionalFrameworkRecord) => void;
  onBack: () => void; onClose: () => void; onNote: (t: string) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [adding,   setAdding]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  useEffect(() => { setNoteText(""); setAdding(false); }, [activeArticle?.articleId]);
  const submit = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try { await onNote(noteText.trim()); setNoteText(""); setAdding(false); } finally { setSaving(false); }
  };
  return (
    <div style={{ position: "fixed", right: 0, top: "60px", bottom: 0, width: "clamp(260px,24vw,340px)", zIndex: 100, background: "rgba(2,9,3,0.95)", backdropFilter: "blur(28px)", borderLeft: "1px solid rgba(100,200,100,0.08)", boxShadow: "-2px 0 40px rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", animation: "panel-slide-in 0.24s ease", overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(100,180,100,0.07)", background: `linear-gradient(160deg,${branch.color}09,transparent 60%)`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          {activeArticle && <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(253,230,138,0.36)", cursor: "pointer", fontSize: "16px", padding: "2px 2px 0", lineHeight: 1, flexShrink: 0, marginTop: "2px" }}>←</button>}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeArticle ? (
              <>
                <p style={{ fontSize: "9.5px", color: "rgba(253,230,138,0.38)", marginBottom: "3px" }}>धारा {activeArticle.article}{activeArticle.clause ? ` · खण्ड ${activeArticle.clause}` : ""}</p>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fde68a", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeArticle.titleNepali || activeArticle.titleEnglish}</h3>
              </>
            ) : (
              <>
                <p style={{ fontSize: "8.5px", color: branch.color, marginBottom: "3px", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.80 }}>शाखा</p>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fde68a", lineHeight: 1.25, margin: 0 }}>{branch.nepali}</h3>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.28)", marginTop: "3px" }}>{articles.length} धाराहरू · {branch.part}</p>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: "26px", height: "26px", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>
      </div>
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0
            ? <p style={{ padding: "28px 18px", fontSize: "12px", color: "rgba(253,230,138,0.24)", textAlign: "center" }}>यस शाखामा धाराहरू फेला परेनन्</p>
            : articles.map((a, i) => (
              <button key={a.articleId} onClick={() => onArticleSelect(a)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%", textAlign: "left", padding: "11px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.05)", cursor: "pointer", animation: `list-emerge 0.16s ease ${Math.min(i * 0.018, 0.22)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${branch.color}09`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: branch.color, minWidth: "28px", flexShrink: 0, paddingTop: "1px", opacity: 0.85 }}>{a.article}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#fde68a", lineHeight: 1.35, margin: 0 }}>{a.titleNepali || a.titleEnglish}</p>
                  {a.plainNepaliSummary && <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", marginTop: "3px", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.plainNepaliSummary}</p>}
                </div>
                <span style={{ color: "rgba(253,230,138,0.18)", fontSize: "13px", flexShrink: 0, alignSelf: "center" }}>›</span>
              </button>
            ))}
        </div>
      )}
      {activeArticle && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {activeArticle.originalText && <Section label="मूल पाठ" color={branch.color}><p style={{ fontSize: "12px", color: "rgba(253,230,138,0.68)", lineHeight: 1.80, fontStyle: "italic" }}>{activeArticle.originalText}</p></Section>}
            {activeArticle.plainNepaliSummary && <Section label="व्याख्या" color="rgba(253,230,138,0.55)"><p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.78 }}>{activeArticle.plainNepaliSummary}</p></Section>}
            {(activeArticle.rights?.length ?? 0) > 0 && <Section label="अधिकार" color="#4ade80">{activeArticle.rights!.map((r, i) => <p key={i} style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>· {r}</p>)}</Section>}
            {(activeArticle.institutions?.length ?? 0) > 0 && <Section label="निकाय" color="#818cf8"><p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)" }}>{activeArticle.institutions!.join("  ·  ")}</p></Section>}
            {activeArticle.sourcePage != null && <Section label="स्रोत पृष्ठ" color="rgba(253,230,138,0.28)"><p style={{ fontSize: "11px", color: "rgba(253,230,138,0.38)" }}>पृष्ठ {activeArticle.sourcePage}</p></Section>}
            {!adding ? (
              <button onClick={() => setAdding(true)} style={{ padding: "9px 13px", background: "rgba(253,230,138,0.05)", border: "1px dashed rgba(253,230,138,0.18)", borderRadius: "7px", color: "rgba(253,230,138,0.48)", fontSize: "11px", cursor: "pointer", textAlign: "left" }}>📌 नोट थप्नुस्</button>
            ) : (
              <div style={{ background: "rgba(253,230,138,0.06)", border: "1px solid rgba(253,230,138,0.18)", borderRadius: "7px", padding: "10px" }}>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="यहाँ नोट लेख्नुस्..." rows={3} style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "rgba(253,230,138,0.84)", fontSize: "12px", fontFamily: "inherit", lineHeight: 1.65 }} />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAdding(false)} style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer" }}>रद्द</button>
                  <button onClick={submit} disabled={saving || !noteText.trim()} style={{ fontSize: "11px", fontWeight: 700, background: "rgba(253,230,138,0.16)", border: "none", borderRadius: "5px", padding: "4px 11px", color: "#fde68a", cursor: "pointer" }}>{saving ? "…" : "सेव"}</button>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(100,180,100,0.07)", display: "flex", gap: "7px", flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "9px", background: branch.color, border: "none", borderRadius: "8px", color: "#000", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>पुरा विवरण</button>
            <button onClick={() => setAdding(true)} style={{ flex: 1, padding: "9px", background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.18)", borderRadius: "8px", color: "#fde68a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>📌 नोट</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [articles,      setArticles]      = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeBranch,  setActiveBranch]  = useState<Branch | null>(null);
  const [activeArticle, setActiveArticle] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [search,        setSearch]        = useState("");
  const [mode,          setMode]          = useState<"tree" | "list">("tree");

  const treeCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef        = useRef<number>(0);

  // Canvas RAF animation loop
  useEffect(() => {
    const canvas = treeCanvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width  = p.clientWidth;
      canvas.height = p.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    let t = 0;
    const tick = () => {
      t += 16;
      renderTree(canvas, t, activeBranch?.id ?? null);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [activeBranch]);

  useEffect(() => {
    getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true)))
      .then(snap => {
        const docs = snap.docs.map(d => d.data() as ConstitutionalFrameworkRecord);
        docs.sort((a, b) => (a.article ?? 0) - (b.article ?? 0));
        setArticles(docs);
      }).finally(() => setLoading(false));
  }, []);

  const branchArticles = useMemo(() => activeBranch ? articles.filter(a => articleMatchesBranch(a, activeBranch)) : [], [activeBranch, articles]);
  const bloomLeaves    = useMemo(() => {
    if (!activeBranch) return [];
    const pos = bloomPositions(branchArticles.length, activeBranch.lx, activeBranch.ly, activeBranch.orbitRadius);
    return branchArticles.slice(0, 8).map((a, i) => ({ article: a, ...pos[i], index: i }));
  }, [activeBranch, branchArticles]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return articles.filter(a => [a.titleEnglish, a.titleNepali, a.plainNepaliSummary, ...(a.keywords ?? [])].some(f => f?.toLowerCase().includes(q))).slice(0, 28);
  }, [search, articles]);

  const handleBranchClick = (b: Branch) => {
    if (activeBranch?.id === b.id) { setActiveBranch(null); setActiveArticle(null); }
    else { setActiveBranch(b); setActiveArticle(null); }
  };

  const handleNote = async (text: string) => {
    if (!activeArticle || !activeBranch) return;
    await addDoc(collection(db, "tree_ui_notes"), { treeId: "nepal-constitution", targetType: "article", targetId: activeArticle.articleId, branchId: activeBranch.id, noteText: text, status: "active", createdAt: new Date().toISOString() });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null);  return; }
    };
    addEventListener("keydown", h); return () => removeEventListener("keydown", h);
  }, [activeArticle, activeBranch]);

  const panelOpen = activeBranch !== null;
  const depthOrder = (["back", "mid", "front"] as const).flatMap(d => BRANCHES.filter(b => b.depth === d));

  return (
    <>
      <style>{`
        @keyframes panel-slide-in { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes float-label    { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-5px)} }
        @keyframes leaf-bloom     { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.22)} 65%{opacity:1;transform:translate(-50%,-50%) scale(1.05)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
        @keyframes orb-pulse      { 0%,100%{box-shadow:0 0 10px currentColor} 50%{box-shadow:0 0 18px currentColor} }
        @keyframes list-emerge    { from{opacity:0;transform:translateX(5px)} to{opacity:1;transform:translateX(0)} }
        @keyframes trunk-glow     { 0%,100%{opacity:.80} 50%{opacity:1} }
        .branch-label:hover { opacity:1!important; filter:none!important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#010801", overflow: "hidden" }}>

        {/* Sidebar */}
        <CategorySidebar branches={BRANCHES} articles={articles} activeBranch={activeBranch} onSelect={handleBranchClick} />

        {/* Top nav */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "60px", zIndex: 200, background: "rgba(1,5,1,0.88)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,0.045)", display: "flex", alignItems: "center", paddingLeft: "192px", paddingRight: "20px", gap: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            <span style={{ fontSize: "14px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>ZZC</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", fontWeight: 600 }}>JANTA</span>
          </div>
          <div style={{ flex: 1, position: "relative", maxWidth: "380px" }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="संविधान खोज्नुहोस्…"
              style={{ width: "100%", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "22px", padding: "6px 15px 6px 33px", color: "white", fontSize: "12px", outline: "none" }} />
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.26)", fontSize: "13px" }}>🔍</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "22px", padding: "3px", gap: "2px", flexShrink: 0 }}>
            {(["tree","list"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "4px 13px", borderRadius: "18px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#4ade80" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.40)", transition: "all 0.18s" }}>
                {m === "tree" ? "🌿 वृक्ष" : "📋 सूची"}
              </button>
            ))}
          </div>
        </div>

        {/* Tree canvas area */}
        <div style={{ position: "fixed", top: "60px", left: "176px", right: panelOpen ? "clamp(260px,24vw,340px)" : 0, bottom: "36px", zIndex: 10, transition: "right 0.28s ease" }}
          onClick={e => { if (e.target === e.currentTarget) { setActiveBranch(null); setActiveArticle(null); } }}>

          {/* Procedural tree canvas */}
          <canvas ref={treeCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1 }} />

          <FireflyCanvas />

          {/* Center trunk text */}
          <div style={{ position: "absolute", left: "50%", top: "57%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15, animation: "trunk-glow 6s ease-in-out infinite" }}>
            <p style={{ fontSize: "clamp(16px,2.5vw,28px)", fontWeight: 800, color: "#fde68a", letterSpacing: "0.05em", lineHeight: 1.2, margin: 0, textShadow: "0 2px 20px rgba(0,0,0,0.90)" }}>नेपालको</p>
            <p style={{ fontSize: "clamp(12px,1.9vw,21px)", fontWeight: 600, color: "rgba(253,230,138,0.72)", letterSpacing: "0.09em", margin: "3px 0 0", textShadow: "0 2px 16px rgba(0,0,0,0.80)" }}>संविधान</p>
            <p style={{ fontSize: "clamp(7px,0.8vw,9px)", fontWeight: 400, color: "rgba(253,230,138,0.28)", marginTop: "7px", letterSpacing: "0.04em" }}>हामी जनता, नेपालको सार्वभौमसत्ता…</p>
          </div>

          {/* Branch labels */}
          <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none" }}>
            {depthOrder.map(branch => (
              <BranchLabel key={branch.id} branch={branch}
                isActive={activeBranch?.id === branch.id}
                isDimmed={activeBranch !== null && activeBranch.id !== branch.id}
                onClick={() => handleBranchClick(branch)} />
            ))}
            {activeBranch && bloomLeaves.map(({ article, x, y, index }) => (
              <ArticleLeaf key={article.articleId} article={article} branch={activeBranch}
                x={x} y={y} index={index}
                isActive={activeArticle?.articleId === article.articleId}
                onClick={() => setActiveArticle(article)} />
            ))}
          </div>

          {!activeBranch && !loading && (
            <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", color: "rgba(253,230,138,0.20)", fontSize: "11px", textAlign: "center", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {search.trim() && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", width: "min(440px,88%)", background: "rgba(1,7,2,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(100,180,100,0.09)", borderRadius: "14px", zIndex: 60, maxHeight: "52%", overflowY: "auto" }}>
              <p style={{ padding: "11px 16px 5px", fontSize: "10px", color: "rgba(253,230,138,0.32)" }}>{searchResults.length} धाराहरू फेला</p>
              {searchResults.map(a => (
                <button key={a.articleId}
                  onClick={() => { const b = BRANCHES.find(b => articleMatchesBranch(a, b)); if (b) setActiveBranch(b); setActiveArticle(a); setSearch(""); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.05)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,180,100,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span style={{ fontSize: "10px", color: "rgba(253,230,138,0.36)", marginRight: "8px" }}>धारा {a.article}</span>
                  <span style={{ fontSize: "12px", color: "#fde68a", fontWeight: 500 }}>{a.titleNepali || a.titleEnglish}</span>
                </button>
              ))}
            </div>
          )}

          {mode === "list" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(1,7,2,0.97)", backdropFilter: "blur(20px)", overflowY: "auto", padding: "16px" }}>
              <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.28)", marginBottom: "10px" }}>{articles.length} धाराहरू · Nepal Constitution 2015</p>
                {articles.map(a => {
                  const b = BRANCHES.find(b => articleMatchesBranch(a, b));
                  return (
                    <button key={a.articleId} onClick={() => { if (b) setActiveBranch(b); setActiveArticle(a); setMode("tree"); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: "11px", padding: "9px 13px", background: "rgba(255,255,255,0.02)", border: `1px solid ${b ? b.color + "14" : "rgba(255,255,255,0.04)"}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.045)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: b?.color ?? "rgba(253,230,138,0.26)", minWidth: "36px" }}>{a.article}</span>
                      <div>
                        <p style={{ fontSize: "12px", fontWeight: 500, color: "#fde68a" }}>{a.titleNepali || a.titleEnglish}</p>
                        {a.plainNepaliSummary && <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.34)", marginTop: "2px", lineHeight: 1.55 }}>{a.plainNepaliSummary.slice(0, 80)}…</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {activeBranch && <DetailPanel branch={activeBranch} articles={branchArticles} activeArticle={activeArticle} onArticleSelect={a => setActiveArticle(a)} onBack={() => setActiveArticle(null)} onClose={() => { setActiveBranch(null); setActiveArticle(null); }} onNote={handleNote} />}

        {/* Bottom bar */}
        <div style={{ position: "fixed", bottom: 0, left: "176px", right: panelOpen ? "clamp(260px,24vw,340px)" : 0, height: "36px", zIndex: 150, background: "rgba(1,5,1,0.92)", backdropFilter: "blur(12px)", borderTop: "1px solid rgba(100,180,100,0.05)", display: "flex", alignItems: "center", paddingLeft: "14px", paddingRight: "14px", gap: "7px", transition: "right 0.28s ease" }}>
          {activeBranch ? (
            <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.40)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "rgba(253,230,138,0.20)" }}>होम</span>
              <span style={{ color: "rgba(253,230,138,0.14)" }}>›</span>
              <span style={{ color: activeBranch.color, fontWeight: 600 }}>● {activeBranch.nepali}</span>
              {activeArticle && <><span style={{ color: "rgba(253,230,138,0.14)" }}>›</span><span style={{ color: "#fde68a" }}>धारा {activeArticle.article}</span></>}
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.18)" }}>नेपालको संविधान २०७२ · {loading ? "लोड हुँदैछ…" : `${articles.length} धाराहरू`}</span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => { setActiveBranch(null); setActiveArticle(null); }} style={{ fontSize: "10px", color: "rgba(253,230,138,0.20)", background: "none", border: "none", cursor: "pointer" }}>Reset</button>
          <span style={{ color: "rgba(253,230,138,0.08)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "10px", color: "rgba(253,230,138,0.14)" }}>ESC</span>
        </div>

      </div>
    </>
  );
}
