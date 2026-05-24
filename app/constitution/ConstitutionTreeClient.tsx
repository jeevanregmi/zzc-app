"use client";

// /constitution — Living Nepal Constitutional Tree
// ONE living ecosystem: camera zoom, LOD fog, real constitutional hierarchy

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";
import { useBranchHealth } from "../../hooks/constitution/useBranchHealth";
import { HEALTH_COLORS, type BranchHealth } from "../../lib/constitution/healthComputer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstitutionPart {
  id:          string;
  partNumber:  number;
  partLabel:   string;
  title:       string;
  color:       string;
  theta:       number;   // angle around trunk: 0=front, ±π=back
  radius:      number;   // branch reach in world-px at zoom=1
  ly:          number;   // branch endpoint Y as % of canvas H
  trunkT:      number;   // junction height (0=base, 1=crown)
  atmosphere:  { tintR: number; tintG: number; tintB: number };
}

// theta: orbital angle (0=facing viewer, ±π=behind trunk)
interface Cam { theta: number; x: number; y: number; zoom: number }
type Level = 0 | 1 | 2 | 3;

// ─── Constitutional parts (भागहरू) — all 35 in ascending order (भाग १ → ३५) ───
// Laid top-to-bottom by part number. theta distributes them 360° around trunk:
//   Parts 1–5:   front arc,  fully visible at start
//   Parts 6–10:  near-front, mostly visible
//   Parts 11–15: side arc,   orbit ~60° to see
//   Parts 16–22: far-side,   orbit ~90–120° to see
//   Parts 23–35: behind trunk, orbit ~150–180° to discover

const PARTS: ConstitutionPart[] = [
  // ── भाग १–५: Crown, front-facing ─────────────────────────────────────────
  { id: "bhaag-1",  partNumber: 1,  partLabel: "भाग १",  title: "प्रारम्भिक",
    color: "#fde68a", theta:  0.00, radius: 290, ly:  7, trunkT: 0.95,
    atmosphere: { tintR: 70, tintG: 65, tintB: 5 } },
  { id: "bhaag-2",  partNumber: 2,  partLabel: "भाग २",  title: "नागरिकता",
    color: "#f87171", theta:  0.50, radius: 280, ly: 11, trunkT: 0.92,
    atmosphere: { tintR: 80, tintG: 20, tintB: 20 } },
  { id: "bhaag-3",  partNumber: 3,  partLabel: "भाग ३",  title: "मौलिक हक",
    color: "#4ade80", theta: -0.50, radius: 280, ly: 14, trunkT: 0.89,
    atmosphere: { tintR: 15, tintG: 60, tintB: 20 } },
  { id: "bhaag-4",  partNumber: 4,  partLabel: "भाग ४",  title: "निर्देशक सिद्धान्त",
    color: "#c084fc", theta:  0.95, radius: 268, ly: 18, trunkT: 0.86,
    atmosphere: { tintR: 50, tintG: 10, tintB: 70 } },
  { id: "bhaag-5",  partNumber: 5,  partLabel: "भाग ५",  title: "राज्यको संरचना",
    color: "#fb923c", theta: -0.95, radius: 268, ly: 21, trunkT: 0.83,
    atmosphere: { tintR: 80, tintG: 40, tintB: 10 } },
  // ── भाग ६–१०: Near-front ─────────────────────────────────────────────────
  { id: "bhaag-6",  partNumber: 6,  partLabel: "भाग ६",  title: "राष्ट्रपति",
    color: "#38bdf8", theta:  1.38, radius: 255, ly: 25, trunkT: 0.80,
    atmosphere: { tintR: 10, tintG: 40, tintB: 70 } },
  { id: "bhaag-7",  partNumber: 7,  partLabel: "भाग ७",  title: "संघीय कार्यपालिका",
    color: "#fbbf24", theta: -1.38, radius: 255, ly: 28, trunkT: 0.77,
    atmosphere: { tintR: 80, tintG: 60, tintB: 5 } },
  { id: "bhaag-8",  partNumber: 8,  partLabel: "भाग ८",  title: "संघीय संसद",
    color: "#818cf8", theta:  1.78, radius: 242, ly: 32, trunkT: 0.74,
    atmosphere: { tintR: 30, tintG: 20, tintB: 80 } },
  { id: "bhaag-9",  partNumber: 9,  partLabel: "भाग ९",  title: "संघीय कानून",
    color: "#a78bfa", theta: -1.78, radius: 242, ly: 35, trunkT: 0.71,
    atmosphere: { tintR: 40, tintG: 15, tintB: 65 } },
  { id: "bhaag-10", partNumber: 10, partLabel: "भाग १०", title: "आर्थिक कार्यविधि",
    color: "#34d399", theta:  2.12, radius: 228, ly: 39, trunkT: 0.68,
    atmosphere: { tintR: 10, tintG: 60, tintB: 30 } },
  // ── भाग ११–१५: Side arc ──────────────────────────────────────────────────
  { id: "bhaag-11", partNumber: 11, partLabel: "भाग ११", title: "न्यायपालिका",
    color: "#60a5fa", theta: -2.12, radius: 228, ly: 42, trunkT: 0.65,
    atmosphere: { tintR: 10, tintG: 30, tintB: 80 } },
  { id: "bhaag-12", partNumber: 12, partLabel: "भाग १२", title: "महान्यायाधिवक्ता",
    color: "#f472b6", theta:  2.42, radius: 212, ly: 46, trunkT: 0.62,
    atmosphere: { tintR: 70, tintG: 10, tintB: 50 } },
  { id: "bhaag-13", partNumber: 13, partLabel: "भाग १३", title: "प्रदेश",
    color: "#86efac", theta: -2.42, radius: 212, ly: 49, trunkT: 0.59,
    atmosphere: { tintR: 20, tintG: 65, tintB: 25 } },
  { id: "bhaag-14", partNumber: 14, partLabel: "भाग १४", title: "प्रदेश कार्यपालिका",
    color: "#fdba74", theta:  2.65, radius: 198, ly: 53, trunkT: 0.56,
    atmosphere: { tintR: 75, tintG: 50, tintB: 10 } },
  { id: "bhaag-15", partNumber: 15, partLabel: "भाग १५", title: "प्रदेश व्यवस्थापिका",
    color: "#93c5fd", theta: -2.65, radius: 198, ly: 56, trunkT: 0.53,
    atmosphere: { tintR: 15, tintG: 35, tintB: 75 } },
  // ── भाग १६–२२: Far-side (orbit ~90–120°) ─────────────────────────────────
  { id: "bhaag-16", partNumber: 16, partLabel: "भाग १६", title: "प्रदेश कानून",
    color: "#d8b4fe", theta:  2.82, radius: 182, ly: 59, trunkT: 0.50,
    atmosphere: { tintR: 55, tintG: 15, tintB: 75 } },
  { id: "bhaag-17", partNumber: 17, partLabel: "भाग १७", title: "प्रदेश न्यायपालिका",
    color: "#6ee7b7", theta: -2.82, radius: 182, ly: 62, trunkT: 0.47,
    atmosphere: { tintR: 15, tintG: 60, tintB: 40 } },
  { id: "bhaag-18", partNumber: 18, partLabel: "भाग १८", title: "स्थानीय कार्यपालिका",
    color: "#fca5a5", theta:  2.94, radius: 168, ly: 65, trunkT: 0.44,
    atmosphere: { tintR: 75, tintG: 25, tintB: 25 } },
  { id: "bhaag-19", partNumber: 19, partLabel: "भाग १९", title: "स्थानीय सभा",
    color: "#5eead4", theta: -2.94, radius: 168, ly: 67, trunkT: 0.41,
    atmosphere: { tintR: 10, tintG: 65, tintB: 55 } },
  { id: "bhaag-20", partNumber: 20, partLabel: "भाग २०", title: "स्थानीय शासन",
    color: "#34d399", theta:  3.02, radius: 155, ly: 70, trunkT: 0.38,
    atmosphere: { tintR: 15, tintG: 65, tintB: 35 } },
  { id: "bhaag-21", partNumber: 21, partLabel: "भाग २१", title: "स्थानीय वित्त",
    color: "#7dd3fc", theta: -3.02, radius: 155, ly: 72, trunkT: 0.35,
    atmosphere: { tintR: 10, tintG: 35, tintB: 72 } },
  { id: "bhaag-22", partNumber: 22, partLabel: "भाग २२", title: "अन्तर सरकारी",
    color: "#f9a8d4", theta:  3.08, radius: 143, ly: 74, trunkT: 0.32,
    atmosphere: { tintR: 70, tintG: 20, tintB: 55 } },
  // ── भाग २३–३५: Behind trunk (orbit ~150–180° to discover) ─────────────────
  { id: "bhaag-23", partNumber: 23, partLabel: "भाग २३", title: "वित्त व्यवस्था",
    color: "#fde047", theta: -3.08, radius: 143, ly: 75, trunkT: 0.30,
    atmosphere: { tintR: 80, tintG: 70, tintB: 5 } },
  { id: "bhaag-24", partNumber: 24, partLabel: "भाग २४", title: "अख्तियार",
    color: "#fb7185", theta:  3.12, radius: 133, ly: 76, trunkT: 0.28,
    atmosphere: { tintR: 80, tintG: 15, tintB: 30 } },
  { id: "bhaag-25", partNumber: 25, partLabel: "भाग २५", title: "महालेखापरीक्षक",
    color: "#a3e635", theta: -3.12, radius: 133, ly: 77, trunkT: 0.26,
    atmosphere: { tintR: 40, tintG: 65, tintB: 10 } },
  { id: "bhaag-26", partNumber: 26, partLabel: "भाग २६", title: "लोक सेवा आयोग",
    color: "#fb923c", theta:  3.05, radius: 123, ly: 78, trunkT: 0.24,
    atmosphere: { tintR: 70, tintG: 45, tintB: 10 } },
  { id: "bhaag-27", partNumber: 27, partLabel: "भाग २७", title: "निर्वाचन आयोग",
    color: "#818cf8", theta: -3.05, radius: 123, ly: 78, trunkT: 0.22,
    atmosphere: { tintR: 30, tintG: 20, tintB: 75 } },
  { id: "bhaag-28", partNumber: 28, partLabel: "भाग २८", title: "मानव अधिकार",
    color: "#4ade80", theta:  2.98, radius: 114, ly: 79, trunkT: 0.20,
    atmosphere: { tintR: 15, tintG: 60, tintB: 20 } },
  { id: "bhaag-29", partNumber: 29, partLabel: "भाग २९", title: "महिला आयोग",
    color: "#e879f9", theta: -2.98, radius: 114, ly: 79, trunkT: 0.18,
    atmosphere: { tintR: 65, tintG: 10, tintB: 65 } },
  { id: "bhaag-30", partNumber: 30, partLabel: "भाग ३०", title: "दलित आयोग",
    color: "#60a5fa", theta:  2.91, radius: 106, ly: 80, trunkT: 0.16,
    atmosphere: { tintR: 10, tintG: 30, tintB: 75 } },
  { id: "bhaag-31", partNumber: 31, partLabel: "भाग ३१", title: "समावेशी आयोग",
    color: "#fbbf24", theta: -2.91, radius: 106, ly: 80, trunkT: 0.14,
    atmosphere: { tintR: 75, tintG: 60, tintB: 5 } },
  { id: "bhaag-32", partNumber: 32, partLabel: "भाग ३२", title: "आदिवासी आयोग",
    color: "#34d399", theta:  2.84, radius: 100, ly: 81, trunkT: 0.12,
    atmosphere: { tintR: 15, tintG: 65, tintB: 35 } },
  { id: "bhaag-33", partNumber: 33, partLabel: "भाग ३३", title: "संवैधानिक निकाय",
    color: "#f472b6", theta: -2.84, radius: 110, ly: 81, trunkT: 0.11,
    atmosphere: { tintR: 70, tintG: 10, tintB: 50 } },
  { id: "bhaag-34", partNumber: 34, partLabel: "भाग ३४", title: "मधेसी आयोग",
    color: "#f97316", theta:  2.77, radius:  98, ly: 82, trunkT: 0.10,
    atmosphere: { tintR: 75, tintG: 40, tintB: 8 } },
  { id: "bhaag-35", partNumber: 35, partLabel: "भाग ३५", title: "विविध",
    color: "#94a3b8", theta: -2.77, radius:  98, ly: 82, trunkT: 0.09,
    atmosphere: { tintR: 35, tintG: 35, tintB: 45 } },
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
  isBack = false,
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
  drawSubBranches(ctx, rng, ex, ey, spreadAngle - 0.35, 42 + rng() * 20, wid * 0.52, subDepth, t, isBack);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle + 0.28, 38 + rng() * 20, wid * 0.50, subDepth, t, isBack);
  drawSubBranches(ctx, rng, ex, ey, spreadAngle,        36 + rng() * 16, wid * 0.45, subDepth - 1, t, isBack);

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
  subCount = 0,
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

  // Article heading label (visible only at high zoom)
  if (zoom > 3.8) {
    const title = (article.titleNepali || article.titleEnglish || "").slice(0, 16);
    const fs = Math.max(7, 10 / zoom);
    ctx.font = `500 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`धारा ${article.article} · ${title}`, x, y + nodeR + 2);
  }

  // Sub-clause count badge
  if (subCount > 1) {
    const bfs = Math.max(5, 8 / zoom);
    const br  = Math.max(4, nodeR * 0.85);
    const bx  = x + nodeR * 0.7;
    const by  = y - nodeR * 0.7;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.fill();
    ctx.font = `700 ${bfs}px system-ui`;
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(subCount), bx, by);
  }

  ctx.restore();
}

function drawSubClauseNode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  clause: ConstitutionalFrameworkRecord,
  part: ConstitutionPart,
  isActive: boolean,
  t: number,
  zoom: number,
  globalOpacity: number,
) {
  ctx.save();
  ctx.globalAlpha = globalOpacity;

  const nodeR = (isActive ? 5 : 3) / Math.max(1, zoom * 0.45);

  // Subtle glow
  const g = ctx.createRadialGradient(x, y, 0, x, y, nodeR * 2.5);
  g.addColorStop(0, part.color + "55");
  g.addColorStop(1, "transparent");
  ctx.beginPath();
  ctx.arc(x, y, nodeR * 2.5, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  // Core — dashed outline marks it as a sub-node
  ctx.beginPath();
  ctx.arc(x, y, nodeR, 0, Math.PI * 2);
  ctx.fillStyle = isActive ? part.color + "dd" : part.color + "66";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 0.5;
  ctx.setLineDash([2, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Clause text (very high zoom only)
  if (zoom > 5.5) {
    const label = (clause.titleNepali || clause.titleEnglish || clause.clause || "").slice(0, 20);
    const fs = Math.max(6, 8 / zoom);
    ctx.font = `400 ${fs}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, x, y + nodeR + 1);
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
  healthMap: Map<number, BranchHealth>,
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
    "bhaag-1":  { wid: 14, subD: 3 }, "bhaag-2":  { wid: 13, subD: 3 },
    "bhaag-3":  { wid: 18, subD: 4 }, "bhaag-4":  { wid: 14, subD: 3 },
    "bhaag-5":  { wid: 20, subD: 4 }, "bhaag-6":  { wid: 12, subD: 3 },
    "bhaag-7":  { wid: 16, subD: 3 }, "bhaag-8":  { wid: 16, subD: 4 },
    "bhaag-9":  { wid: 12, subD: 3 }, "bhaag-10": { wid: 11, subD: 3 },
    "bhaag-11": { wid: 16, subD: 4 }, "bhaag-12": { wid: 10, subD: 2 },
    "bhaag-13": { wid: 12, subD: 3 }, "bhaag-14": { wid: 10, subD: 2 },
    "bhaag-15": { wid: 10, subD: 2 }, "bhaag-16": { wid:  9, subD: 2 },
    "bhaag-17": { wid:  9, subD: 2 }, "bhaag-18": { wid:  9, subD: 2 },
    "bhaag-19": { wid:  9, subD: 2 }, "bhaag-20": { wid:  9, subD: 2 },
    "bhaag-21": { wid:  8, subD: 2 }, "bhaag-22": { wid:  8, subD: 2 },
    "bhaag-23": { wid:  8, subD: 2 }, "bhaag-24": { wid:  7, subD: 2 },
    "bhaag-25": { wid:  7, subD: 2 }, "bhaag-26": { wid:  7, subD: 2 },
    "bhaag-27": { wid:  7, subD: 2 }, "bhaag-28": { wid:  7, subD: 2 },
    "bhaag-29": { wid:  6, subD: 1 }, "bhaag-30": { wid:  6, subD: 1 },
    "bhaag-31": { wid:  6, subD: 1 }, "bhaag-32": { wid:  6, subD: 1 },
    "bhaag-33": { wid: 10, subD: 2 }, "bhaag-34": { wid:  6, subD: 1 },
    "bhaag-35": { wid:  6, subD: 1 },
  };

  // Fog: inactive branches dim when one is focused
  const fogDepth = activePartId
    ? Math.min(0.88, (zoom - 1.4) * 0.35)
    : 0;

  // Sort back-to-front by orbital depth so front branches paint over back ones
  const sorted = [...PARTS].sort((a, b) => {
    const da = Math.cos(a.theta - cam.theta);
    const db = Math.cos(b.theta - cam.theta);
    return da - db;  // back first
  });

  sorted.forEach((part, pi) => {
    // ── Orbital projection ──────────────────────────────────────────────────
    const relTheta = part.theta - cam.theta;
    const cosR = Math.cos(relTheta);
    const sinR = Math.sin(relTheta);

    // Back-face cull: hide branches facing > 120° away from camera
    if (cosR < -0.50) return;

    // Perspective scale: front=1.0, side=0.75, near-back=0.50
    const perspMul = 0.50 + 0.50 * Math.max(0, cosR);
    // Depth opacity: front=1.0, side=0.55, near-back=0.10
    const depthOp  = Math.max(0.10, 0.20 + 0.80 * Math.max(0, cosR));
    const isBack   = cosR < 0.25;

    const origPi = PARTS.indexOf(part);
    const jy = trunkBot - (trunkBot - trunkTop) * part.trunkT + trunkSway * part.trunkT;
    // Slight lateral shift at trunk junction for wrap-around feel
    const jx = cx + sinR * 18 * part.trunkT + trunkSway * part.trunkT * 0.4;
    const ex = cx + sinR * part.radius * perspMul;
    const ey = H * (part.ly / 100);
    const rng = mkRng(origPi * 137 + 42);
    const def = BDEFS[part.id] ?? { wid: 8, subD: 2 };

    const isActive = part.id === activePartId;
    const branchOp = isActive
      ? 1.0
      : Math.max(0.05, depthOp * (1.0 - fogDepth));

    const sa = drawMainBranch(ctx, rng, jx, jy, ex, ey, part, branchOp, def.wid * perspMul, def.subD, t, H, isBack);
    bPts[part.id] = { cx: ex, cy: ey };

    // ── Branch health glow (environmental, not UI) ─────────────────────────
    const health = healthMap.get(part.partNumber);
    if (health && health.state !== "unknown") {
      const hc = HEALTH_COLORS[health.state];
      const pulse = 0.70 + Math.sin(t * 0.0009 + part.theta * 2.3) * 0.30;
      const glowR = (28 + health.healthScore * 0.22) * perspMul;

      ctx.save();
      ctx.globalAlpha = branchOp * pulse;

      // Soft ambient halo at branch endpoint
      const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, glowR);
      hg.addColorStop(0, hc.glow);
      hg.addColorStop(1, "transparent");
      ctx.beginPath();
      ctx.arc(ex, ey, glowR, 0, Math.PI * 2);
      ctx.fillStyle = hg;
      ctx.fill();

      // Tiny health indicator dot at trunk junction
      if (hc.dot !== "transparent") {
        ctx.beginPath();
        ctx.arc(jx, jy, 3.5 * perspMul, 0, Math.PI * 2);
        ctx.fillStyle = hc.dot;
        ctx.shadowColor = hc.dot;
        ctx.shadowBlur  = 6;
        ctx.globalAlpha = branchOp * Math.max(0.40, pulse);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
    }

    // ── Article dhara nodes — grouped by article number ─────────────────────
    if (isActive && zoom > 2.2 && branchArticles.length > 0) {
      const nodeOpacity = Math.min(1, (zoom - 2.2) * 0.8);

      // Group clauses by article number, sorted ascending
      const articleGroups = new Map<number, ConstitutionalFrameworkRecord[]>();
      for (const a of branchArticles) {
        const grp = articleGroups.get(a.article) ?? [];
        grp.push(a);
        articleGroups.set(a.article, grp);
      }
      const articleNums = Array.from(articleGroups.keys()).sort((a, b) => a - b);

      articleNums.slice(0, 28).forEach((artNum, ai) => {
        const group  = articleGroups.get(artNum)!;
        // Parent node: prefer the record with no clause (article heading), else first
        const parent = group.find(r => !r.clause) ?? group[0];
        const aRng   = mkRng(artNum * 31 + 17);
        const spread = Math.PI * 1.6;
        const angle  = sa + ((ai / Math.max(articleNums.length, 1)) - 0.5) * spread;
        const radius = 55 + (ai % 3) * 28 + aRng() * 20;
        const ax     = ex + Math.cos(angle) * radius;
        const ay     = ey + Math.sin(angle) * radius * 0.72;

        const isActiveParent =
          activeArticleId === parent.articleId ||
          group.some(r => r.articleId === activeArticleId);

        drawArticleNode(ctx, ax, ay, parent, part, isActiveParent, t, zoom, nodeOpacity, group.length);
        // Map all group articleIds to the parent position (click detection)
        for (const r of group) aPts[r.articleId] = { cx: ax, cy: ay };

        // Sub-clause satellites around active parent — appear at zoom > 4.5
        if (isActiveParent && zoom > 4.5 && group.length > 1) {
          const subOpacity = Math.min(1, (zoom - 4.5) * 0.8) * nodeOpacity;
          const subclauses = group.filter(r => r !== parent);
          subclauses.forEach((clause, ci) => {
            const subAngle = angle + ((ci / Math.max(subclauses.length - 1, 1)) - 0.5) * Math.PI * 0.85 + Math.PI * 0.5;
            const subR = 26 + ci * 10;
            const sx = ax + Math.cos(subAngle) * subR;
            const sy = ay + Math.sin(subAngle) * subR * 0.72;
            const isActiveSub = activeArticleId === clause.articleId;

            // Connector line
            ctx.save();
            ctx.globalAlpha = subOpacity * 0.35;
            ctx.strokeStyle = part.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(sx, sy);
            ctx.stroke();
            ctx.restore();

            drawSubClauseNode(ctx, sx, sy, clause, part, isActiveSub, t, zoom, subOpacity);
            aPts[clause.articleId] = { cx: sx, cy: sy };
          });
        }
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

  // Part labels — depth-faded by orbital angle, fog-faded when a part is active
  PARTS.forEach(part => {
    const relTheta = part.theta - cam.theta;
    const cosR = Math.cos(relTheta);
    const sinR = Math.sin(relTheta);
    if (cosR < -0.50) return;
    const perspMul = 0.50 + 0.50 * Math.max(0, cosR);
    const depthOp  = Math.max(0.10, 0.20 + 0.80 * Math.max(0, cosR));
    const ex = cx + sinR * part.radius * perspMul;
    const ey = H * (part.ly / 100);
    const isActive = part.id === activePartId;
    const labelOp  = isActive
      ? 1.0
      : Math.max(0, depthOp * (1.0 - fogDepth * 1.1));
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

  // Branch health — fetched once, kept in ref so RAF loop always has latest
  const { healthMap } = useBranchHealth();
  const healthMapRef = useRef<Map<number, BranchHealth>>(new Map());
  useEffect(() => { healthMapRef.current = healthMap; }, [healthMap]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  // Start zoomed in (world larger than viewport) facing the front of the tree
  const camRef    = useRef<Cam>({ theta: 0, x: 0, y: 0, zoom: 1.8 });
  const camTgt    = useRef<Cam>({ theta: 0, x: 0, y: 0, zoom: 1.8 });
  const bPts      = useRef<Record<string, { cx: number; cy: number }>>({});
  const aPts      = useRef<Record<string, { cx: number; cy: number }>>({});
  const drag      = useRef({ active: false, startX: 0, startY: 0, camY: 0, camTheta: 0, moved: false });

  const branchArticles = useMemo(
    () => activePart ? articlesForPart(articles, activePart) : [],
    [activePart, articles],
  );

  // ── Camera helpers ──────────────────────────────────────────────────────────

  const zoomToPart = useCallback((part: ConstitutionPart, H: number) => {
    const ey = H * (part.ly / 100);
    const tz = 3.5;
    // Orbit so this part faces the camera (theta → part.theta), center on its height
    camTgt.current = { theta: part.theta, x: 0, y: (H / 2 - ey) * tz, zoom: tz };
  }, []);

  const zoomToArticle = useCallback((ax: number, ay: number, W: number, H: number) => {
    const tz = 7.0;
    camTgt.current = { ...camTgt.current, x: (W / 2 - ax) * tz, y: (H / 2 - ay) * tz, zoom: tz };
  }, []);

  const zoomOut = useCallback(() => {
    // Return to entrance view: facing front, zoomed in but tree fills + overflows viewport
    camTgt.current = { theta: 0, x: 0, y: 0, zoom: 1.8 };
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
    const lerp  = (a: number, b: number, k: number) => a + (b - a) * k;
    // Lerp angles correctly across the ±π wrap
    const lerpTheta = (a: number, b: number, k: number) => {
      let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      return a + d * k;
    };
    const tick = () => {
      t += 16;
      const c  = camRef.current;
      const ct = camTgt.current;
      c.theta = lerpTheta(c.theta, ct.theta, LERK);
      c.x    = lerp(c.x, ct.x, LERK);
      c.y    = lerp(c.y, ct.y, LERK);
      c.zoom = lerp(c.zoom, ct.zoom, LERK);

      const newLevel: Level = c.zoom < 2.2 ? 0 : c.zoom < 4.0 ? 1 : c.zoom < 9.0 ? 2 : 3;
      setLevel(prev => prev === newLevel ? prev : newLevel);

      renderTree(
        canvas, t, { ...c },
        activePart?.id ?? null,
        branchArticles,
        activeArticle?.articleId ?? null,
        bPts.current,
        aPts.current,
        healthMapRef.current,
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
      const nz     = Math.max(1.0, Math.min(14, camTgt.current.zoom * factor));
      const wx     = (mx - W / 2 - camTgt.current.x) / camTgt.current.zoom;
      const wy     = (my - H / 2 - camTgt.current.y) / camTgt.current.zoom;
      camTgt.current = { ...camTgt.current, x: mx - W / 2 - wx * nz, y: my - H / 2 - wy * nz, zoom: nz };
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
        camY: camTgt.current.y, camTheta: camTgt.current.theta, moved: false,
      };
      setCursor("grabbing");
    };
    const onMove = (e: MouseEvent) => {
      if (!drag.current.active) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
      if (drag.current.moved) {
        // Horizontal drag = orbit around trunk (theta), vertical = pan Y
        camTgt.current = {
          ...camTgt.current,
          theta: drag.current.camTheta - dx * 0.0045,
          y:     drag.current.camY     + dy,
        };
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
          setActivePart(bestPart); setActiveArticle(null); zoomToPart(bestPart, H);
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

          {/* Discovery hint — entrance level only */}
          {!activePart && !loading && level === 0 && (
            <div style={{ position: "absolute", bottom: "8%", left: "50%", transform: "translateX(-50%)", color: "rgba(253,230,138,0.18)", fontSize: "10.5px", textAlign: "center", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap", letterSpacing: "0.05em" }}>
              drag left/right to orbit · scroll to zoom · click a branch to explore
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
