"use client";

// /constitution — Living Nepal Constitutional Tree
// ONE living ecosystem: camera zoom, LOD fog, real constitutional hierarchy

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstitutionPart {
  id:          string;
  partNumber:  number;
  partLabel:   string;   // "भाग ३"
  title:       string;   // "मौलिक हक"
  color:       string;
  lx:          number;   // branch endpoint % of canvas width
  ly:          number;   // branch endpoint % of canvas height
  trunkT:      number;   // 0-1 junction height on trunk (0=base, 1=top)
  depth:       "back" | "mid" | "front";
  atmosphere:  { tintR: number; tintG: number; tintB: number };
}

interface Cam { x: number; y: number; zoom: number }
type Level = 0 | 1 | 2 | 3;

// ─── Constitutional parts (भागहरू) — real Nepal Constitution hierarchy ─────────

const PARTS: ConstitutionPart[] = [
  { id: "bhaag-5",  partNumber: 5,  partLabel: "भाग ५",  title: "राज्यको संरचना",
    color: "#fb923c", lx: 50, ly: 14, trunkT: 0.92, depth: "front",
    atmosphere: { tintR: 80, tintG: 40, tintB: 10 } },
  { id: "bhaag-3",  partNumber: 3,  partLabel: "भाग ३",  title: "मौलिक हक",
    color: "#4ade80", lx: 20, ly: 24, trunkT: 0.82, depth: "front",
    atmosphere: { tintR: 15, tintG: 60, tintB: 20 } },
  { id: "bhaag-11", partNumber: 11, partLabel: "भाग ११", title: "न्यायपालिका",
    color: "#60a5fa", lx: 74, ly: 19, trunkT: 0.86, depth: "mid",
    atmosphere: { tintR: 10, tintG: 30, tintB: 80 } },
  { id: "bhaag-8",  partNumber: 8,  partLabel: "भाग ८",  title: "व्यवस्थापिका",
    color: "#818cf8", lx: 80, ly: 34, trunkT: 0.68, depth: "mid",
    atmosphere: { tintR: 30, tintG: 20, tintB: 80 } },
  { id: "bhaag-33", partNumber: 33, partLabel: "भाग ३३", title: "संवैधानिक निकाय",
    color: "#f472b6", lx: 17, ly: 40, trunkT: 0.56, depth: "back",
    atmosphere: { tintR: 70, tintG: 10, tintB: 50 } },
  { id: "bhaag-7",  partNumber: 7,  partLabel: "भाग ७",  title: "कार्यपालिका",
    color: "#fbbf24", lx: 84, ly: 47, trunkT: 0.52, depth: "mid",
    atmosphere: { tintR: 80, tintG: 60, tintB: 5 } },
  { id: "bhaag-4",  partNumber: 4,  partLabel: "भाग ४",  title: "निर्देशक सिद्धान्त",
    color: "#c084fc", lx: 13, ly: 52, trunkT: 0.44, depth: "back",
    atmosphere: { tintR: 50, tintG: 10, tintB: 70 } },
  { id: "bhaag-2",  partNumber: 2,  partLabel: "भाग २",  title: "नागरिकता",
    color: "#f87171", lx: 73, ly: 63, trunkT: 0.28, depth: "front",
    atmosphere: { tintR: 80, tintG: 20, tintB: 20 } },
  { id: "bhaag-20", partNumber: 20, partLabel: "भाग २०", title: "स्थानीय शासन",
    color: "#34d399", lx: 13, ly: 68, trunkT: 0.20, depth: "mid",
    atmosphere: { tintR: 15, tintG: 65, tintB: 35 } },
];

function articlesForPart(arts: ConstitutionalFrameworkRecord[], p: ConstitutionPart) {
  return arts.filter(a => a.partNumber === p.partNumber);
}

// ─── Seeded RNG ───────────────────────────────────────────────────────────────

function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function arcRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLeafCluster(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x: number, y: number,
  t: number,
  isBack = false,
) {
  const n = 22 + Math.floor(rng() * 18);
  const span = 18 + rng() * 16;
  const phase = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const lp = phase + i * 0.55;
    const swx = Math.sin(t * 0.00038 + lp) * (1.2 + rng() * 1.8);
    const swy = Math.cos(t * 0.00044 + lp) * 0.7;
    const lx = x + (rng() - 0.5) * span * 2.4 + swx;
    const ly = y + (rng() - 0.30) * span * 1.5 + swy;
    const lw = 2.5 + rng() * 5.5;
    const lh = 1.5 + rng() * 3.5;
    const lr = rng() * Math.PI;
    const g  = 52 + Math.floor(rng() * 72);
    const isY = rng() > 0.88;
    const op = isBack ? 0.12 + rng() * 0.28 : 0.18 + rng() * 0.44;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(lr);
    ctx.beginPath();
    ctx.ellipse(0, 0, lw, lh, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${isY ? 55 : 10},${g},${isY ? 8 : 6},${op})`;
    ctx.fill();
    ctx.restore();
  }
}

function drawSubBranches(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  x: number, y: number,
  angle: number, len: number, wid: number,
  depth: number, t: number,
  isBack = false,
) {
  if (depth === 0 || wid < 0.6) {
    drawLeafCluster(ctx, rng, x, y, t, isBack);
    return;
  }
  const sway = Math.sin(t * 0.00038 + x * 0.0028 + depth * 1.4) * (5 - depth) * 0.009;
  const ex = x + Math.cos(angle + sway) * len;
  const ey = y + Math.sin(angle + sway) * len;
  const bark = 40 + depth * 8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.lineWidth   = wid;
  ctx.strokeStyle = `rgba(${bark},${Math.floor(bark * 0.55)},${Math.floor(bark * 0.18)},0.92)`;
  ctx.lineCap     = "round";
  ctx.stroke();
  const r  = 0.65 + rng() * 0.08;
  const sL = 0.28 + rng() * 0.16;
  const sR = 0.24 + rng() * 0.16;
  drawSubBranches(ctx, rng, ex, ey, angle - sL, len * r, wid * 0.62, depth - 1, t, isBack);
  drawSubBranches(ctx, rng, ex, ey, angle + sR, len * (r - 0.04), wid * 0.60, depth - 1, t, isBack);
  if (depth > 2 && rng() > 0.58) {
    drawSubBranches(ctx, rng, ex, ey, angle + (rng() - 0.5) * 0.5, len * 0.52, wid * 0.48, depth - 2, t, isBack);
  }
}

function drawAerialRoot(
  ctx: CanvasRenderingContext2D, rng: () => number, x: number, y: number, H: number,
) {
  const len = 70 + rng() * 140;
  const ex  = x + (rng() - 0.5) * 18;
  const ey  = Math.min(y + len, H * 0.91);
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

function drawMainBranch(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  jx: number, jy: number,
  ex: number, ey: number,
  part: ConstitutionPart,
  opacity: number,
  wid: number,
  subDepth: number,
  t: number,
  H: number,
) {
  const isActive = opacity > 0.9;
  const sway = Math.sin(t * 0.0005 + jx * 0.002) * 3;
  const c1x  = jx + (ex - jx) * 0.3;
  const c1y  = jy + (ey - jy) * 0.15 + sway;
  const c2x  = jx + (ex - jx) * 0.72;
  const c2y  = jy + (ey - jy) * 0.68 + sway * 0.6;

  ctx.save();
  ctx.globalAlpha = opacity;

  ctx.beginPath();
  ctx.moveTo(jx, jy);
  ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
  ctx.lineWidth   = wid;
  ctx.strokeStyle = isActive ? part.color + "88" : "rgba(52,26,9,0.90)";
  ctx.lineCap     = "round";
  ctx.stroke();

  if (isActive) {
    ctx.beginPath();
    ctx.moveTo(jx, jy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    ctx.lineWidth   = wid * 0.5;
    ctx.strokeStyle = part.color + "40";
    ctx.stroke();
  }

  // Aerial roots from mid-branch
  const rootCount = Math.floor(rng() * 3) + 1;
  for (let i = 0; i < rootCount; i++) {
    drawAerialRoot(ctx, rng, c2x + (rng() - 0.5) * 30, c2y, H);
  }

  const spreadAngle = Math.atan2(ey - jy, ex - jx);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle - 0.35, 42 + rng() * 20, wid * 0.52, subDepth, t, part.depth === "back");
  drawSubBranches(ctx, rng, ex, ey, spreadAngle + 0.28, 38 + rng() * 20, wid * 0.50, subDepth, t, part.depth === "back");
  drawSubBranches(ctx, rng, ex, ey, spreadAngle,        36 + rng() * 16, wid * 0.45, subDepth - 1, t, part.depth === "back");

  ctx.restore();
  return spreadAngle;
}

// ─── Branch label (canvas) ────────────────────────────────────────────────────

function drawPartLabel(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  part: ConstitutionPart,
  opacity: number,
  zoom: number,
) {
  if (zoom > 3.8 || opacity < 0.04) return;
  ctx.save();
  ctx.globalAlpha = opacity;

  const scale = 1 / zoom;
  ctx.translate(x, y);

  const label = part.partLabel;
  const title = part.title;
  const fs    = Math.round(12 * scale);
  const fs2   = Math.round(9  * scale);
  const pad   = 12 * scale;
  const ph    = 28 * scale;

  ctx.font = `600 ${fs}px system-ui, sans-serif`;
  const lw = ctx.measureText(label).width;
  ctx.font = `400 ${fs2}px system-ui, sans-serif`;
  const tw = ctx.measureText(title).width;
  const boxW = Math.max(lw, tw) + pad * 2;
  const boxH = ph + fs2 * 1.5 + 4 * scale;

  // Background pill
  arcRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
  ctx.fillStyle   = "rgba(2,5,2,0.54)";
  ctx.fill();
  ctx.strokeStyle = `${part.color}30`;
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Dot orb above pill
  const dotY = -boxH / 2 - 6 * scale;
  ctx.beginPath();
  ctx.arc(0, dotY, 4 * scale, 0, Math.PI * 2);
  ctx.fillStyle = part.color;
  ctx.shadowColor = part.color;
  ctx.shadowBlur  = 6;
  ctx.fill();
  ctx.shadowBlur  = 0;

  // Part label
  ctx.font = `700 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 0, -boxH / 2 + ph / 2);

  // Title
  ctx.font = `400 ${fs2}px system-ui, sans-serif`;
  ctx.fillStyle = part.color;
  ctx.globalAlpha *= 0.78;
  ctx.fillText(title, 0, boxH / 2 - fs2 * 0.9);

  ctx.restore();
}

// ─── Article node (canvas) ────────────────────────────────────────────────────

function drawArticleNode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  article: ConstitutionalFrameworkRecord,
  part: ConstitutionPart,
  isActive: boolean,
  t: number,
  zoom: number,
  globalOpacity: number,
) {
  ctx.save();
  ctx.globalAlpha = globalOpacity;

  const pulse = 0.65 + Math.sin(t * 0.0018 + x * 0.01 + y * 0.007) * 0.35;
  const nodeR = (isActive ? 8 : 5) / Math.max(1, zoom * 0.45);

  // Glow halo
  const g = ctx.createRadialGradient(x, y, 0, x, y, nodeR * 3.5);
  const hex = Math.round(pulse * (isActive ? 80 : 45)).toString(16).padStart(2, "0");
  g.addColorStop(0, part.color + hex);
  g.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(x, y, nodeR * 3.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Core node
  ctx.beginPath();
  ctx.arc(x, y, nodeR, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? part.color : part.color + "aa";
  if (isActive) {
    ctx.shadowColor = part.color;
    ctx.shadowBlur  = 10;
  }
  ctx.fill();
  ctx.shadowBlur = 0;

  // Article label (visible only at high zoom)
  if (zoom > 3.8) {
    const title = (article.titleNepali || article.titleEnglish || "").slice(0, 16);
    const fs = Math.max(7, 10 / zoom);
    ctx.font = `500 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`${article.article} · ${title}`, x, y + nodeR + 2);
  }

  ctx.restore();
}

// ─── Main render ──────────────────────────────────────────────────────────────

function renderTree(
  canvas: HTMLCanvasElement,
  t: number,
  cam: Cam,
  activePartId: string | null,
  branchArticles: ConstitutionalFrameworkRecord[],
  activeArticleId: string | null,
  bPts: Record<string, { cx: number; cy: number }>,
  aPts: Record<string, { cx: number; cy: number }>,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const W = canvas.width, H = canvas.height;
  const cx = W * 0.5;
  const zoom = cam.zoom;

  ctx.clearRect(0, 0, W, H);

  // ── Background ──────────────────────────────────────────────────────────────

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0,   "#010801");
  bg.addColorStop(0.5, "#030c02");
  bg.addColorStop(1,   "#050f03");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Branch-world atmosphere tint when zoomed into a part
  if (activePartId && zoom > 1.6) {
    const part = PARTS.find(p => p.id === activePartId);
    if (part) {
      const { tintR, tintG, tintB } = part.atmosphere;
      const tintStrength = Math.min(0.08, (zoom - 1.6) * 0.02);
      ctx.fillStyle = `rgba(${tintR},${tintG},${tintB},${tintStrength})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // God-light from top
  const gl = ctx.createRadialGradient(cx, 0, 0, cx, H * 0.1, W * 0.55);
  gl.addColorStop(0,    "rgba(255,185,55,0.09)");
  gl.addColorStop(0.45, "rgba(255,155,35,0.04)");
  gl.addColorStop(1,    "rgba(0,0,0,0)");
  ctx.fillStyle = gl;
  ctx.fillRect(0, 0, W, H);

  // Ground glow
  const gg = ctx.createRadialGradient(cx, H, 0, cx, H, W * 0.6);
  gg.addColorStop(0,   "rgba(30,15,5,0.60)");
  gg.addColorStop(0.5, "rgba(15,8,2,0.30)");
  gg.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, 0, W, H);

  // Sun shafts
  for (let i = 0; i < 4; i++) {
    const sx = cx + (i - 1.5) * W * 0.10;
    const sw = W * 0.06 + i * W * 0.01;
    const sg = ctx.createLinearGradient(sx, 0, sx, H * 0.72);
    sg.addColorStop(0,    `rgba(255,195,65,0.032)`);
    sg.addColorStop(0.55, `rgba(255,175,45,0.010)`);
    sg.addColorStop(1,    "rgba(0,0,0,0)");
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(sx - sw * 0.2, 0);
    ctx.lineTo(sx + sw * 0.2, 0);
    ctx.lineTo(sx + sw * 1.3, H * 0.72);
    ctx.lineTo(sx - sw * 0.9, H * 0.72);
    ctx.closePath();
    ctx.fillStyle = sg;
    ctx.fill();
    ctx.restore();
  }

  // ── Apply camera transform ──────────────────────────────────────────────────
  ctx.save();
  ctx.translate(W / 2 + cam.x, H / 2 + cam.y);
  ctx.scale(zoom, zoom);
  ctx.translate(-W / 2, -H / 2);

  const baseRng = mkRng(42);

  // Ground roots
  const rootSpread = W * 0.38;
  for (let i = 0; i < 8; i++) {
    const angle = -Math.PI + (i / 7) * Math.PI;
    const rlen  = rootSpread * (0.55 + baseRng() * 0.45);
    const ex    = cx + Math.cos(angle) * rlen;
    const ey    = H * 0.97 + Math.sin(angle) * rlen * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx, H * 0.94);
    ctx.quadraticCurveTo(cx + Math.cos(angle) * rlen * 0.55, H * 0.96, ex, ey);
    ctx.strokeStyle = `rgba(25,12,4,${0.55 + baseRng() * 0.25})`;
    ctx.lineWidth   = 8 - i * 0.5;
    ctx.lineCap     = "round";
    ctx.stroke();
  }

  // Trunk
  const trunkSway = Math.sin(t * 0.00035) * 2.5;
  const trunkTop  = H * 0.38;
  const trunkBot  = H * 0.92;

  ctx.beginPath();
  ctx.moveTo(cx - 48, trunkBot);
  ctx.bezierCurveTo(cx - 40 + trunkSway * 0.3, trunkBot * 0.7, cx - 30 + trunkSway, trunkTop + 60, cx - 22 + trunkSway, trunkTop);
  ctx.lineTo(cx + 22 + trunkSway, trunkTop);
  ctx.bezierCurveTo(cx + 30 + trunkSway, trunkTop + 60, cx + 40 + trunkSway * 0.3, trunkBot * 0.7, cx + 48, trunkBot);
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx - 48, 0, cx + 48, 0);
  tg.addColorStop(0,    "rgba(10,4,1,0.98)");
  tg.addColorStop(0.18, "rgba(30,14,4,0.94)");
  tg.addColorStop(0.40, "rgba(52,26,9,0.91)");
  tg.addColorStop(0.60, "rgba(65,33,10,0.92)");
  tg.addColorStop(0.78, "rgba(88,50,16,0.86)");
  tg.addColorStop(0.90, "rgba(116,72,24,0.68)");
  tg.addColorStop(1,    "rgba(55,32,10,0.80)");
  ctx.fillStyle = tg;
  ctx.fill();
  const ts = ctx.createLinearGradient(cx - 48, 0, cx - 8, 0);
  ts.addColorStop(0, `rgba(0,0,0,${0.24 + Math.sin(t * 0.00020) * 0.06})`);
  ts.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = ts;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 3, trunkBot);
  ctx.bezierCurveTo(cx - 2 + trunkSway * 0.4, trunkBot * 0.65, cx + 1 + trunkSway, trunkTop + 80, cx + 2 + trunkSway, trunkTop);
  ctx.lineWidth   = 6;
  ctx.strokeStyle = "rgba(80,44,14,0.30)";
  ctx.stroke();

  // ── Draw main branches (constitutional parts) ───────────────────────────────
  const BDEFS: Record<string, { wid: number; subD: number }> = {
    "bhaag-5":  { wid: 18, subD: 4 },
    "bhaag-3":  { wid: 16, subD: 4 },
    "bhaag-11": { wid: 14, subD: 3 },
    "bhaag-8":  { wid: 16, subD: 4 },
    "bhaag-33": { wid: 12, subD: 3 },
    "bhaag-7":  { wid: 14, subD: 3 },
    "bhaag-4":  { wid: 12, subD: 3 },
    "bhaag-2":  { wid: 12, subD: 3 },
    "bhaag-20": { wid: 12, subD: 3 },
  };

  // Fog: branches fade out when another branch is selected + zoomed
  const fogDepth = activePartId
    ? Math.min(0.88, (zoom - 1.4) * 0.35)
    : 0;

  PARTS.forEach((part, pi) => {
    const jy = trunkBot - (trunkBot - trunkTop) * part.trunkT + trunkSway * part.trunkT;
    const jx = cx + trunkSway * part.trunkT * 0.4;
    const ex = W * (part.lx / 100);
    const ey = H * (part.ly / 100);
    const rng = mkRng(pi * 137 + 42);
    const def = BDEFS[part.id] ?? { wid: 12, subD: 3 };

    const isActive = part.id === activePartId;
    const branchOp = isActive
      ? 1.0
      : Math.max(0.08, 1.0 - fogDepth);

    const sa = drawMainBranch(ctx, rng, jx, jy, ex, ey, part, branchOp, def.wid, def.subD, t, H);
    bPts[part.id] = { cx: ex, cy: ey };

    // ── Article sub-branches (dhara nodes) — appear at zoom > 2.2 ──────────
    if (isActive && zoom > 2.2 && branchArticles.length > 0) {
      const nodeOpacity = Math.min(1, (zoom - 2.2) * 0.8);
      branchArticles.slice(0, 24).forEach((a, ai) => {
        const aRng   = mkRng(a.article * 31 + 17);
        const spread = Math.PI * 1.6;
        const angle  = sa + ((ai / Math.max(branchArticles.length, 1)) - 0.5) * spread;
        const radius = (55 + (ai % 3) * 28 + aRng() * 20);
        const ax = ex + Math.cos(angle) * radius;
        const ay = ey + Math.sin(angle) * radius * 0.72;
        const isActiveNode = activeArticleId === a.articleId;
        drawArticleNode(ctx, ax, ay, a, part, isActiveNode, t, zoom, nodeOpacity);
        aPts[a.articleId] = { cx: ax, cy: ay };
      });
    }
  });

  // Canopy mass
  for (let i = 0; i < 5; i++) {
    const rng  = mkRng(i * 99 + 7);
    const canX = cx + (rng() - 0.5) * W * 0.35;
    const canY = H * (0.08 + rng() * 0.14);
    const sw   = Math.sin(t * 0.0006 + i * 1.2) * 3;
    const cr   = ctx.createRadialGradient(canX + sw, canY, 0, canX + sw, canY, 60 + rng() * 50);
    cr.addColorStop(0,   `rgba(18,55,10,0.30)`);
    cr.addColorStop(0.6, `rgba(10,35,6,0.12)`);
    cr.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = cr;
    ctx.beginPath();
    ctx.ellipse(canX + sw, canY, 80 + rng() * 60, 55 + rng() * 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Part labels (drawn in canvas, camera-transformed, fade out with fog)
  PARTS.forEach(part => {
    const ex = W * (part.lx / 100);
    const ey = H * (part.ly / 100);
    const isActive = part.id === activePartId;
    const labelOp  = isActive ? 1.0 : Math.max(0, 1.0 - fogDepth * 1.1);
    drawPartLabel(ctx, ex, ey, part, labelOp, zoom);
  });

  ctx.restore(); // end camera transform

  // ── Depth fog overlay (drawn in screen space, no camera transform) ──────────
  if (fogDepth > 0.05) {
    const fogColor = `rgba(1,5,1,${fogDepth * 0.6})`;
    ctx.fillStyle = fogColor;
    ctx.fillRect(0, 0, W, H);
  }
}

// ─── Firefly canvas ───────────────────────────────────────────────────────────

function FireflyCanvas({ activePartColor }: { activePartColor: string | null }) {
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

// ─── Detail panel ─────────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "9px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "6px", opacity: 0.82 }}>{label}</p>
      {children}
    </div>
  );
}

function DetailPanel({ part, articles, activeArticle, onArticleSelect, onBack, onClose, onNote }: {
  part: ConstitutionPart; articles: ConstitutionalFrameworkRecord[];
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
    <div style={{ position: "fixed", right: 0, top: "52px", bottom: 0, width: "clamp(260px,24vw,340px)", zIndex: 100, background: "rgba(2,9,3,0.95)", backdropFilter: "blur(28px)", borderLeft: "1px solid rgba(100,200,100,0.08)", boxShadow: "-2px 0 40px rgba(0,0,0,0.85)", display: "flex", flexDirection: "column", animation: "panel-slide-in 0.24s ease", overflow: "hidden" }}>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid rgba(100,180,100,0.07)", background: `linear-gradient(160deg,${part.color}09,transparent 60%)`, flexShrink: 0 }}>
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
                <p style={{ fontSize: "8.5px", color: part.color, marginBottom: "3px", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.80 }}>{part.partLabel}</p>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fde68a", lineHeight: 1.25, margin: 0 }}>{part.title}</h3>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.28)", marginTop: "3px" }}>{articles.length} धाराहरू</p>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: "26px", height: "26px", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>
      </div>
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0
            ? <p style={{ padding: "28px 18px", fontSize: "12px", color: "rgba(253,230,138,0.24)", textAlign: "center" }}>यस भागमा धाराहरू फेला परेनन्</p>
            : articles.map((a, i) => (
              <button key={a.articleId} onClick={() => onArticleSelect(a)} style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%", textAlign: "left", padding: "11px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.05)", cursor: "pointer", animation: `list-emerge 0.16s ease ${Math.min(i * 0.018, 0.22)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${part.color}09`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontSize: "10px", fontWeight: 700, color: part.color, minWidth: "28px", flexShrink: 0, paddingTop: "1px", opacity: 0.85 }}>{a.article}</span>
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
            {activeArticle.originalText && <Section label="मूल पाठ" color={part.color}><p style={{ fontSize: "12px", color: "rgba(253,230,138,0.68)", lineHeight: 1.80, fontStyle: "italic" }}>{activeArticle.originalText}</p></Section>}
            {activeArticle.plainNepaliSummary && <Section label="व्याख्या" color="rgba(253,230,138,0.55)"><p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.78 }}>{activeArticle.plainNepaliSummary}</p></Section>}
            {(activeArticle.rights?.length ?? 0) > 0 && <Section label="अधिकार" color="#4ade80">{activeArticle.rights!.map((r, ri) => <p key={ri} style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>· {r}</p>)}</Section>}
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
            <button style={{ flex: 1, padding: "9px", background: part.color, border: "none", borderRadius: "8px", color: "#000", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>पुरा विवरण</button>
            <button onClick={() => setAdding(true)} style={{ flex: 1, padding: "9px", background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.18)", borderRadius: "8px", color: "#fde68a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>📌 नोट</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [articles,     setArticles]     = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activePart,   setActivePart]   = useState<ConstitutionPart | null>(null);
  const [activeArticle, setActiveArticle] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [level,        setLevel]        = useState<Level>(0);
  const [cursor,       setCursor]       = useState<"grab" | "grabbing">("grab");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const camRef    = useRef<Cam>({ x: 0, y: 0, zoom: 1 });
  const camTgt    = useRef<Cam>({ x: 0, y: 0, zoom: 1 });
  const bPts      = useRef<Record<string, { cx: number; cy: number }>>({});
  const aPts      = useRef<Record<string, { cx: number; cy: number }>>({});
  const drag      = useRef({ active: false, startX: 0, startY: 0, camX: 0, camY: 0, moved: false });

  const branchArticles = useMemo(
    () => activePart ? articlesForPart(articles, activePart) : [],
    [activePart, articles],
  );

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const zoomToPart = useCallback((part: ConstitutionPart, W: number, H: number) => {
    const ex = W * (part.lx / 100);
    const ey = H * (part.ly / 100);
    const tz = 3.2;
    camTgt.current = { x: (W / 2 - ex) * tz, y: (H / 2 - ey) * tz, zoom: tz };
  }, []);

  const zoomToArticle = useCallback((ax: number, ay: number, W: number, H: number) => {
    const tz = 6.5;
    camTgt.current = { x: (W / 2 - ax) * tz, y: (H / 2 - ay) * tz, zoom: tz };
  }, []);

  const zoomOut = useCallback(() => {
    camTgt.current = { x: 0, y: 0, zoom: 1 };
  }, []);

  // ── RAF loop ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
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
    const LERK = 0.090;
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const tick = () => {
      t += 16;
      const c  = camRef.current;
      const ct = camTgt.current;
      c.x    = lerp(c.x, ct.x, LERK);
      c.y    = lerp(c.y, ct.y, LERK);
      c.zoom = lerp(c.zoom, ct.zoom, LERK);

      const newLevel: Level = c.zoom < 1.8 ? 0 : c.zoom < 4.0 ? 1 : c.zoom < 9.0 ? 2 : 3;
      setLevel(prev => prev === newLevel ? prev : newLevel);

      renderTree(
        canvas, t, { ...c },
        activePart?.id ?? null,
        branchArticles,
        activeArticle?.articleId ?? null,
        bPts.current,
        aPts.current,
      );
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, [activePart, branchArticles, activeArticle]);

  // ── Wheel zoom ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect   = canvas.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      const W      = canvas.width;
      const H      = canvas.height;
      const factor = e.deltaY < 0 ? 1.13 : 0.88;
      const nz     = Math.max(0.5, Math.min(14, camTgt.current.zoom * factor));
      const wx     = (mx - W / 2 - camTgt.current.x) / camTgt.current.zoom;
      const wy     = (my - H / 2 - camTgt.current.y) / camTgt.current.zoom;
      camTgt.current = { x: mx - W / 2 - wx * nz, y: my - H / 2 - wy * nz, zoom: nz };
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  // ── Mouse drag + click ──────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onDown = (e: MouseEvent) => {
      drag.current = {
        active: true, startX: e.clientX, startY: e.clientY,
        camX: camTgt.current.x, camY: camTgt.current.y, moved: false,
      };
      setCursor("grabbing");
    };
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      if (drag.current.moved) {
        camTgt.current = { ...camTgt.current, x: drag.current.camX + dx, y: drag.current.camY + dy };
      }
    };
    const onUp = (e: MouseEvent) => {
      if (!drag.current.active) return;
      drag.current.active = false;
      setCursor("grab");
      if (drag.current.moved) return;

      const rect = canvas.getBoundingClientRect();
      const sx   = e.clientX - rect.left;
      const sy   = e.clientY - rect.top;
      const W    = canvas.width;
      const H    = canvas.height;
      const c    = camRef.current;
      // Screen → canvas world
      const wx = (sx - W / 2 - c.x) / c.zoom + W / 2;
      const wy = (sy - H / 2 - c.y) / c.zoom + H / 2;

      // Check article nodes first
      if (c.zoom > 2.2 && activePart) {
        let best: ConstitutionalFrameworkRecord | null = null;
        let minD = 40 / c.zoom;
        for (const [aid, pt] of Object.entries(aPts.current)) {
          const d = Math.hypot(pt.cx - wx, pt.cy - wy);
          if (d < minD) { minD = d; best = branchArticles.find(a => a.articleId === aid) ?? null; }
        }
        if (best) {
          const aPos = aPts.current[best.articleId];
          setActiveArticle(best);
          if (aPos) zoomToArticle(aPos.cx, aPos.cy, W, H);
          return;
        }
      }

      // Check part branches
      let bestPart: ConstitutionPart | null = null;
      let minD = 60 / c.zoom;
      for (const [bid, pt] of Object.entries(bPts.current)) {
        const d = Math.hypot(pt.cx - wx, pt.cy - wy);
        if (d < minD) { minD = d; bestPart = PARTS.find(p => p.id === bid) ?? null; }
      }
      if (bestPart) {
        if (activePart?.id === bestPart.id) {
          setActivePart(null); setActiveArticle(null); zoomOut();
        } else {
          setActivePart(bestPart); setActiveArticle(null); zoomToPart(bestPart, W, H);
        }
        return;
      }

      // Click empty space
      if (activePart) { setActivePart(null); setActiveArticle(null); zoomOut(); }
    };

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      canvas.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [activePart, branchArticles, zoomToPart, zoomToArticle, zoomOut]);

  // ── Keyboard ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activePart)    { setActivePart(null); zoomOut(); return; }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [activeArticle, activePart, zoomOut]);

  // ── Firestore ────────────────────────────────────────────────────────────────

  useEffect(() => {
    getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true)))
      .then(snap => {
        const docs = snap.docs.map(d => d.data() as ConstitutionalFrameworkRecord);
        docs.sort((a, b) => (a.article ?? 0) - (b.article ?? 0));
        setArticles(docs);
      }).finally(() => setLoading(false));
  }, []);

  const handleNote = async (text: string) => {
    if (!activeArticle || !activePart) return;
    await addDoc(collection(db, "tree_ui_notes"), {
      treeId: "nepal-constitution", targetType: "article",
      targetId: activeArticle.articleId, branchId: activePart.id,
      noteText: text, status: "active", createdAt: new Date().toISOString(),
    });
  };

  const panelOpen = activePart !== null;
  const levelLabels: Record<Level, string> = {
    0: "संविधान वृक्ष",
    1: activePart ? activePart.partLabel : "शाखा",
    2: "धाराहरू",
    3: "विवरण",
  };

  const trunkTextOp = level === 0 ? 1.0 : level === 1 ? 0.30 : 0.0;

  return (
    <>
      <style>{`
        @keyframes panel-slide-in { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes trunk-glow     { 0%,100%{opacity:.80} 50%{opacity:1} }
        @keyframes list-emerge    { from{opacity:0;transform:translateX(5px)} to{opacity:1;transform:translateX(0)} }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#010801", overflow: "hidden" }}>

        {/* Top nav — minimal */}
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: "52px", zIndex: 200, background: "rgba(1,4,1,0.72)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", padding: "0 18px", gap: "12px" }}>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em", flexShrink: 0 }}>ZZC</span>
          <span style={{ fontSize: "8px", color: "rgba(255,255,255,0.20)", fontWeight: 600, flexShrink: 0 }}>JANTA</span>
          <div style={{ flex: 1 }} />
          {activePart && (
            <span style={{ fontSize: "11px", fontWeight: 600, color: activePart.color }}>
              {activePart.partLabel} · {activePart.title}
              {branchArticles.length > 0 && <span style={{ color: "rgba(255,255,255,0.28)", fontWeight: 400 }}> · {branchArticles.length} धाराहरू</span>}
            </span>
          )}
          <span style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.14)", fontFamily: "monospace", letterSpacing: "0.04em", flexShrink: 0 }}>
            {levelLabels[level]}
          </span>
          {activePart && (
            <button onClick={() => { setActivePart(null); setActiveArticle(null); zoomOut(); }}
              style={{ fontSize: "10px", color: "rgba(253,230,138,0.36)", background: "none", border: "1px solid rgba(253,230,138,0.12)", borderRadius: "14px", padding: "3px 10px", cursor: "pointer", flexShrink: 0 }}>
              ← वापस
            </button>
          )}
          {!loading && <span style={{ fontSize: "8.5px", color: "rgba(255,255,255,0.10)", flexShrink: 0 }}>{articles.length} धाराहरू</span>}
        </div>

        {/* Canvas — full remaining space */}
        <div style={{ position: "fixed", top: "52px", left: 0, right: panelOpen ? "clamp(260px,24vw,340px)" : 0, bottom: 0, zIndex: 10, cursor, transition: "right 0.30s ease" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <FireflyCanvas activePartColor={activePart?.color ?? null} />

          {/* Trunk inscription — fades on zoom */}
          <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15, opacity: trunkTextOp, animation: "trunk-glow 6s ease-in-out infinite", transition: "opacity 0.6s ease" }}>
            <p style={{ fontSize: "clamp(16px,2.5vw,26px)", fontWeight: 800, color: "#fde68a", letterSpacing: "0.05em", lineHeight: 1.2, margin: 0, textShadow: "0 2px 20px rgba(0,0,0,0.90)" }}>नेपालको</p>
            <p style={{ fontSize: "clamp(12px,1.9vw,20px)", fontWeight: 600, color: "rgba(253,230,138,0.72)", letterSpacing: "0.09em", margin: "3px 0 0", textShadow: "0 2px 16px rgba(0,0,0,0.80)" }}>संविधान</p>
            <p style={{ fontSize: "clamp(7px,0.8vw,9px)", fontWeight: 400, color: "rgba(253,230,138,0.26)", marginTop: "7px", letterSpacing: "0.04em" }}>हामी जनता, नेपालको सार्वभौमसत्ता…</p>
          </div>

          {/* Discovery hint — level 0 only */}
          {!activePart && !loading && level === 0 && (
            <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "rgba(253,230,138,0.18)", fontSize: "10.5px", textAlign: "center", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
              scroll to zoom · drag to pan · click a branch to explore
            </div>
          )}

          {/* Level 1 hint: article nodes coming */}
          {activePart && level === 1 && branchArticles.length > 0 && (
            <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.14)", fontSize: "10px", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap" }}>
              zoom in deeper to reveal {branchArticles.length} dharas
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activePart && (
          <DetailPanel
            part={activePart}
            articles={branchArticles}
            activeArticle={activeArticle}
            onArticleSelect={a => {
              setActiveArticle(a);
              const aPos = aPts.current[a.articleId];
              if (aPos && canvasRef.current) {
                const { width: W, height: H } = canvasRef.current;
                zoomToArticle(aPos.cx, aPos.cy, W, H);
              }
            }}
            onBack={() => setActiveArticle(null)}
            onClose={() => { setActivePart(null); setActiveArticle(null); zoomOut(); }}
            onNote={handleNote}
          />
        )}
      </div>
    </>
  );
}
