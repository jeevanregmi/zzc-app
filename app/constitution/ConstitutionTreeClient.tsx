"use client";

// /constitution — Living Nepal Constitution Tree
// Phase 2.1: Full reference look — sidebar + orb labels + floating note + hero image

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

const TREE_BG_IMAGE = "/banyan-tree.png";
const HAS_IMAGE     = !!TREE_BG_IMAGE;
const T             = HAS_IMAGE ? 0.13 : 0.88;
const M             = HAS_IMAGE ? 0.00 : 0.76;

// ─── Branch data ──────────────────────────────────────────────────────────────

interface Branch {
  id:       string;
  nepali:   string;
  color:    string;
  x:        number;  // % of tree canvas
  y:        number;
  part:     string;
  emoji:    string;
  keywords: string[];
}

const BRANCHES: Branch[] = [
  {
    id: "rights", nepali: "मौलिक हक", color: "#4ade80",
    x: 28, y: 22, part: "भाग ३", emoji: "⚖️",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "right to freedom",
               "right to", "समानता", "स्वतन्त्रता", "भाग ३"],
  },
  {
    id: "directives", nepali: "राज्यका निर्देशक सिद्धान्त", color: "#c084fc",
    x: 22, y: 40, part: "भाग ४", emoji: "🧭",
    keywords: ["निर्देशक सिद्धान्त", "state directives", "directive principles",
               "state policy", "भाग ४", "निर्देशक"],
  },
  {
    id: "federalism", nepali: "संघीयता", color: "#fb923c",
    x: 50, y: 14, part: "भाग ५", emoji: "🗺️",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "संघ",
               "भाग ५", "भाग ६", "federal structure"],
  },
  {
    id: "legislature", nepali: "व्यवस्थापिका", color: "#818cf8",
    x: 67, y: 20, part: "भाग ८", emoji: "🏛️",
    keywords: ["व्यवस्थापिका", "संसद", "प्रतिनिधि सभा", "राष्ट्रिय सभा",
               "parliament", "legislature", "भाग ८", "विधायन"],
  },
  {
    id: "executive", nepali: "कार्यपालिका", color: "#fbbf24",
    x: 70, y: 36, part: "भाग ७", emoji: "🏛️",
    keywords: ["कार्यपालिका", "executive", "प्रधानमन्त्री", "मन्त्रिपरिषद",
               "राष्ट्रपति", "भाग ७", "prime minister", "cabinet"],
  },
  {
    id: "judiciary", nepali: "न्यायपालिका", color: "#60a5fa",
    x: 68, y: 52, part: "भाग ११", emoji: "⚖️",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "judiciary", "supreme court",
               "संवैधानिक इजलास", "भाग ११", "अदालत"],
  },
  {
    id: "constitutional-bodies", nepali: "संवैधानिक अंगहरू", color: "#f472b6",
    x: 30, y: 52, part: "भाग ३३", emoji: "🏛️",
    keywords: ["संवैधानिक अंग", "constitutional bodies", "commission", "आयोग",
               "भाग ३३", "निर्वाचन आयोग", "अख्तियार"],
  },
  {
    id: "local-govt", nepali: "स्थानीय शासन", color: "#34d399",
    x: 20, y: 64, part: "भाग २०", emoji: "🏘️",
    keywords: ["स्थानीय", "नगरपालिका", "गाउँपालिका", "local government",
               "भाग २०", "भाग २१", "village council", "municipality"],
  },
  {
    id: "citizenship", nepali: "नागरिकता", color: "#f87171",
    x: 50, y: 44, part: "भाग २", emoji: "🪪",
    keywords: ["नागरिकता", "citizenship", "नागरिक", "भाग २", "nationality"],
  },
];

// ─── Keyword matching ─────────────────────────────────────────────────────────

function articleMatchesBranch(a: ConstitutionalFrameworkRecord, b: Branch): boolean {
  const haystack = [
    a.titleEnglish, a.titleNepali, a.part,
    ...(a.sectors              ?? []),
    ...(a.constitutionalThemes ?? []),
    ...(a.keywords             ?? []),
    ...(a.institutions         ?? []),
    ...(a.governanceStructures ?? []),
    ...(a.affectedGroups       ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return b.keywords.some(k => haystack.includes(k.toLowerCase()));
}

// ─── World SVG — always-visible depth stack ────────────────────────────────────

function WorldSVG() {
  return (
    <svg viewBox="0 0 1200 900" preserveAspectRatio="xMidYMax meet" aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 2, pointerEvents: "none" }}>
      <defs>
        <radialGradient id="wg-trunk" cx="50%" cy="90%" r="70%">
          <stop offset="0%"   stopColor="#3d1e06" />
          <stop offset="65%"  stopColor="#1a0e04" />
          <stop offset="100%" stopColor="#050301" />
        </radialGradient>
        <linearGradient id="wg-root" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#2a1408" />
          <stop offset="100%" stopColor="#090502" />
        </linearGradient>
        <radialGradient id="wg-light" cx="44%" cy="0%" r="65%">
          <stop offset="0%"   stopColor="rgba(255,220,100,0.10)" />
          <stop offset="100%" stopColor="rgba(255,220,100,0)" />
        </radialGradient>
      </defs>

      <ellipse cx="490" cy="180" rx="200" ry="580" fill="url(#wg-light)" opacity="0.7" />

      {/* Mountains */}
      <path opacity={M} fill="#060e08"
        d="M0 490 L90 312 L182 402 L292 228 L412 344 L502 204 L602 306 L692 174 L802 286 L902 196 L1002 276 L1102 214 L1200 296 V520 H0Z" />
      <path opacity={M * 0.72} fill="#050c06"
        d="M0 468 L72 346 L152 416 L258 280 L368 376 L458 252 L548 326 L638 200 L742 316 L842 232 L942 306 L1042 244 L1142 310 L1200 270 V498 H0Z" />

      {/* Canopy masses */}
      <ellipse cx="195" cy="188" rx="218" ry="158" fill="#071505" opacity={T * 0.96} />
      <ellipse cx="112" cy="238" rx="158" ry="118" fill="#060f04" opacity={T * 0.88} />
      <ellipse cx="272" cy="156" rx="178" ry="130" fill="#081806" opacity={T * 0.82} />
      <ellipse cx="512" cy="122" rx="288" ry="184" fill="#0a1e07" opacity={T}        />
      <ellipse cx="498" cy="90"  rx="240" ry="150" fill="#0c2208" opacity={T * 0.90} />
      <ellipse cx="538" cy="158" rx="220" ry="140" fill="#081905" opacity={T * 0.84} />
      <ellipse cx="828" cy="186" rx="240" ry="154" fill="#071505" opacity={T * 0.96} />
      <ellipse cx="955" cy="238" rx="188" ry="130" fill="#060f04" opacity={T * 0.88} />
      <ellipse cx="764" cy="156" rx="172" ry="124" fill="#081806" opacity={T * 0.82} />

      {/* Main trunk */}
      <path opacity={T} fill="url(#wg-trunk)"
        d="M426 840 C432 728 440 646 452 562 C462 478 472 418 484 348 C496 275 504 226 512 188
           C520 226 528 275 540 348 C552 418 562 478 572 562 C584 646 592 728 598 840Z" />

      {/* Secondary trunks */}
      <path opacity={T * 0.76} stroke="#2a1408" strokeWidth="22" fill="none" strokeLinecap="round"
        d="M340 840 C347 752 354 672 366 598 C378 524 394 468 412 412 C428 362 440 312 448 278" />
      <path opacity={T * 0.76} stroke="#2a1408" strokeWidth="22" fill="none" strokeLinecap="round"
        d="M660 840 C653 752 646 672 634 598 C622 524 606 468 588 412 C573 362 560 312 552 278" />

      {/* Aerial roots — left */}
      <path opacity={T * 0.70} stroke="url(#wg-root)" strokeWidth="12" fill="none" strokeLinecap="round" d="M360 344 C350 436 344 526 338 648 C334 712 331 768 328 840"/>
      <path opacity={T * 0.62} stroke="url(#wg-root)" strokeWidth="9"  fill="none" strokeLinecap="round" d="M316 370 C305 462 299 552 293 676 C290 736 287 782 284 840"/>
      <path opacity={T * 0.54} stroke="url(#wg-root)" strokeWidth="7"  fill="none" strokeLinecap="round" d="M272 396 C260 488 254 578 248 702 C245 758 242 798 240 840"/>
      <path opacity={T * 0.44} stroke="url(#wg-root)" strokeWidth="5"  fill="none" strokeLinecap="round" d="M228 422 C216 514 210 604 204 728 C201 778 198 808 196 840"/>
      <path opacity={T * 0.34} stroke="url(#wg-root)" strokeWidth="4"  fill="none" strokeLinecap="round" d="M184 448 C172 540 166 628 160 752 C157 798 154 820 152 840"/>
      <path opacity={T * 0.24} stroke="url(#wg-root)" strokeWidth="3"  fill="none" strokeLinecap="round" d="M142 468 C130 558 124 644 118 768 C115 808 112 822 110 840"/>

      {/* Aerial roots — right */}
      <path opacity={T * 0.70} stroke="url(#wg-root)" strokeWidth="12" fill="none" strokeLinecap="round" d="M640 344 C650 436 656 526 662 648 C666 712 669 768 672 840"/>
      <path opacity={T * 0.62} stroke="url(#wg-root)" strokeWidth="9"  fill="none" strokeLinecap="round" d="M684 370 C695 462 701 552 707 676 C710 736 713 782 716 840"/>
      <path opacity={T * 0.54} stroke="url(#wg-root)" strokeWidth="7"  fill="none" strokeLinecap="round" d="M728 396 C740 488 746 578 752 702 C755 758 758 798 760 840"/>
      <path opacity={T * 0.44} stroke="url(#wg-root)" strokeWidth="5"  fill="none" strokeLinecap="round" d="M772 422 C784 514 790 604 796 728 C799 778 802 808 804 840"/>
      <path opacity={T * 0.34} stroke="url(#wg-root)" strokeWidth="4"  fill="none" strokeLinecap="round" d="M816 448 C828 540 834 628 840 752 C843 798 846 820 848 840"/>
      <path opacity={T * 0.24} stroke="url(#wg-root)" strokeWidth="3"  fill="none" strokeLinecap="round" d="M858 468 C870 558 876 644 882 768 C885 808 888 822 890 840"/>

      {/* Ground roots */}
      <path opacity={T * 0.55} stroke="#1a0e05" strokeWidth="20" fill="none" strokeLinecap="round"
        d="M244 818 C308 806 370 802 430 804 C470 806 496 806 514 806 C532 806 558 806 600 804 C660 802 722 806 786 818"/>
      <path opacity={T * 0.40} stroke="#120a03" strokeWidth="13" fill="none" strokeLinecap="round"
        d="M186 826 C262 814 340 810 410 812 C454 814 486 814 514 814 C542 814 574 814 618 812 C690 810 764 814 834 826"/>

      {/* Foreground vines — always full opacity */}
      <path opacity="0.92" stroke="#010a01" strokeWidth="26" fill="none" strokeLinecap="round"
        d="M-10 -10 C18 118 -14 246 16 390 C46 534 70 634 44 778 C32 832 16 876 4 910"/>
      <path opacity="0.76" stroke="#010901" strokeWidth="16" fill="none" strokeLinecap="round"
        d="M30 -10 C58 98 28 216 52 350 C76 484 96 580 76 722 C66 784 54 840 44 910"/>
      <path opacity="0.50" stroke="#010901" strokeWidth="8"  fill="none" strokeLinecap="round"
        d="M58 80 C78 168 62 254 80 362 C98 470 110 548 96 660 C86 728 76 790 68 900"/>
      <ellipse cx="16"   cy="148" rx="46" ry="29" fill="#010d01" transform="rotate(-12 16 148)"   opacity="0.82"/>
      <ellipse cx="14"   cy="344" rx="60" ry="38" fill="#010c01" transform="rotate(-34 14 344)"   opacity="0.95"/>
      <ellipse cx="40"   cy="532" rx="70" ry="42" fill="#010b01" transform="rotate(24 40 532)"    opacity="0.92"/>
      <ellipse cx="26"   cy="728" rx="54" ry="34" fill="#010a01" transform="rotate(-18 26 728)"   opacity="0.85"/>
      <ellipse cx="78"   cy="290" rx="38" ry="24" fill="#010d01" transform="rotate(15 78 290)"    opacity="0.70"/>
      <path opacity="0.92" stroke="#010a01" strokeWidth="26" fill="none" strokeLinecap="round"
        d="M1210 -10 C1182 118 1214 246 1184 390 C1154 534 1130 634 1156 778 C1168 832 1184 876 1196 910"/>
      <path opacity="0.76" stroke="#010901" strokeWidth="16" fill="none" strokeLinecap="round"
        d="M1170 -10 C1142 98 1172 216 1148 350 C1124 484 1104 580 1124 722 C1134 784 1146 840 1156 910"/>
      <path opacity="0.50" stroke="#010901" strokeWidth="8"  fill="none" strokeLinecap="round"
        d="M1142 80 C1122 168 1138 254 1120 362 C1102 470 1090 548 1104 660 C1114 728 1124 790 1132 900"/>
      <ellipse cx="1184" cy="148" rx="46" ry="29" fill="#010d01" transform="rotate(12 1184 148)"  opacity="0.82"/>
      <ellipse cx="1186" cy="344" rx="60" ry="38" fill="#010c01" transform="rotate(34 1186 344)"  opacity="0.95"/>
      <ellipse cx="1160" cy="532" rx="70" ry="42" fill="#010b01" transform="rotate(-24 1160 532)" opacity="0.92"/>
      <ellipse cx="1174" cy="728" rx="54" ry="34" fill="#010a01" transform="rotate(18 1174 728)"  opacity="0.85"/>
      <ellipse cx="1122" cy="290" rx="38" ry="24" fill="#010d01" transform="rotate(-15 1122 290)" opacity="0.70"/>
    </svg>
  );
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
    const flies = Array.from({ length: 38 }, () => ({
      x: Math.random() * innerWidth,
      y: 60 + Math.random() * innerHeight * 0.82,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.18,
      r:  0.7 + Math.random() * 1.6,
      o:  Math.random(),
      od: (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.013),
      hue: Math.random() > 0.55 ? 58 : 105,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const f of flies) {
        f.x += f.vx; f.y += f.vy; f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0) f.x = c.width; if (f.x > c.width) f.x = 0;
        if (f.y < 60) f.y = c.height * 0.88; if (f.y > c.height * 0.88) f.y = 60;
        const a = Math.max(0, Math.min(1, f.o));
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 9);
        grd.addColorStop(0, `hsla(${f.hue},100%,80%,${a * 0.55})`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${f.hue},100%,94%,${a})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none", opacity: 0.82 }} />;
}

// ─── Left sidebar ─────────────────────────────────────────────────────────────

function CategorySidebar({
  branches, articles, activeBranch, onSelect,
}: {
  branches:    Branch[];
  articles:    ConstitutionalFrameworkRecord[];
  activeBranch: Branch | null;
  onSelect:    (b: Branch) => void;
}) {
  return (
    <div style={{
      position: "fixed", left: 0, top: "60px", bottom: "72px",
      width: "192px", zIndex: 50,
      background: "rgba(3,8,2,0.90)",
      backdropFilter: "blur(20px)",
      borderRight: "1px solid rgba(255,255,255,0.07)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <p style={{
        padding: "12px 14px 8px",
        fontSize: "9px", fontWeight: 800,
        color: "rgba(255,255,255,0.32)",
        letterSpacing: "0.10em", textTransform: "uppercase",
        flexShrink: 0,
      }}>
        रखको संसपना
      </p>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {branches.map(b => {
          const count    = articles.filter(a => articleMatchesBranch(a, b)).length;
          const isActive = activeBranch?.id === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b)}
              style={{
                display: "flex", alignItems: "center", gap: "9px",
                width: "100%", padding: "8px 14px",
                background: isActive ? `${b.color}14` : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                borderLeft: `2.5px solid ${isActive ? b.color : "transparent"}`,
                transition: "all 0.18s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              {/* Color dot */}
              <span style={{
                width: "8px", height: "8px", borderRadius: "50%",
                background: b.color,
                boxShadow: isActive ? `0 0 8px ${b.color}` : "none",
                flexShrink: 0,
                transition: "box-shadow 0.18s",
              }} />
              <span style={{
                fontSize: "12px", fontWeight: isActive ? 700 : 500,
                color: isActive ? b.color : "rgba(255,255,255,0.68)",
                flex: 1, lineHeight: 1.3,
                transition: "color 0.18s",
              }}>
                {b.nepali}
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: "10px", color: "rgba(255,255,255,0.32)",
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: "10px", padding: "1px 6px",
                  flexShrink: 0,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Branch label — orb + pill with part number ───────────────────────────────

function BranchLabel({
  branch, isActive, isDimmed, onClick,
}: {
  branch: Branch; isActive: boolean; isDimmed: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="branch-label"
      style={{
        position: "absolute",
        left: `${branch.x}%`,
        top:  `${branch.y}%`,
        transform: `translate(-50%, -50%) scale(${isActive ? 1.06 : 1})`,
        background: isActive ? "rgba(0,0,0,0.82)" : "rgba(0,0,0,0.58)",
        border: `1.5px solid ${branch.color}${isActive ? "cc" : "55"}`,
        borderRadius: "100px",
        padding: "7px 16px 6px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
        boxShadow: isActive
          ? `0 0 22px ${branch.color}88, 0 0 44px ${branch.color}30, inset 0 0 12px ${branch.color}10`
          : `0 0 10px ${branch.color}30, 0 2px 12px rgba(0,0,0,0.6)`,
        backdropFilter: "blur(14px)",
        cursor: "pointer",
        pointerEvents: "auto",
        opacity: isDimmed ? 0.20 : 1,
        transition: "all 0.28s ease",
        zIndex: isActive ? 40 : 20,
        whiteSpace: "nowrap",
      }}
    >
      {/* Orb above the label */}
      <div style={{
        position: "absolute",
        top: "-10px", left: "50%",
        transform: "translateX(-50%)",
        width: "14px", height: "14px",
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${branch.color}ff, ${branch.color}88)`,
        boxShadow: `0 0 ${isActive ? "18px" : "8px"} ${branch.color}${isActive ? "cc" : "66"}, 0 0 ${isActive ? "36px" : "14px"} ${branch.color}${isActive ? "44" : "22"}`,
        animation: isActive ? "orb-pulse 2.2s ease-in-out infinite" : "none",
        transition: "box-shadow 0.3s",
      }} />
      {/* Branch name */}
      <span style={{
        fontSize: "13px", fontWeight: 800,
        color: isActive ? "#fff" : "rgba(255,255,255,0.90)",
        textShadow: isActive
          ? `0 0 10px ${branch.color}88, 0 1px 6px rgba(0,0,0,0.9)`
          : `0 1px 5px rgba(0,0,0,0.85)`,
        letterSpacing: "0.01em",
      }}>
        {branch.nepali}
      </span>
      {/* Part number */}
      <span style={{
        fontSize: "10px", fontWeight: 600,
        color: branch.color,
        opacity: isActive ? 1 : 0.78,
      }}>
        ({branch.part})
      </span>
    </button>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "5px" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  branch, articles, activeArticle, onArticleSelect, onBack, onClose, onNote,
}: {
  branch:          Branch;
  articles:        ConstitutionalFrameworkRecord[];
  activeArticle:   ConstitutionalFrameworkRecord | null;
  onArticleSelect: (a: ConstitutionalFrameworkRecord) => void;
  onBack:          () => void;
  onClose:         () => void;
  onNote:          (text: string) => void;
}) {
  const [noteText,   setNoteText]   = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { setNoteText(""); setAddingNote(false); }, [activeArticle?.articleId]);

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try { await onNote(noteText.trim()); setNoteText(""); setAddingNote(false); }
    finally { setSaving(false); }
  };

  return (
    <div style={{
      position: "fixed",
      right: 0, top: "60px", bottom: 0,
      width: "clamp(280px, 26vw, 360px)",
      zIndex: 100,
      background: "rgba(4,9,3,0.95)",
      backdropFilter: "blur(28px)",
      borderLeft: `1px solid rgba(255,255,255,0.08)`,
      boxShadow: `-4px 0 48px rgba(0,0,0,0.75)`,
      display: "flex", flexDirection: "column",
      animation: "panel-slide-in 0.26s ease",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: `linear-gradient(135deg, ${branch.color}0a, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          {activeArticle && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.40)", cursor: "pointer", fontSize: "18px", padding: "0 3px", lineHeight: 1, flexShrink: 0 }}>←</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeArticle ? (
              <>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.36)", marginBottom: "2px" }}>
                  धारा {activeArticle.article}{activeArticle.clause ? ` · खण्ड ${activeArticle.clause}` : ""}
                </p>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#fff", textShadow: `0 0 14px ${branch.color}55`, lineHeight: 1.25, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeArticle.titleNepali || activeArticle.titleEnglish}
                </h3>
              </>
            ) : (
              <>
                <p style={{ fontSize: "9px", color: branch.color, marginBottom: "2px", fontWeight: 800, letterSpacing: "0.07em" }}>शाखा</p>
                <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#fff", textShadow: `0 0 14px ${branch.color}55`, lineHeight: 1.2, margin: 0 }}>
                  {branch.nepali}
                </h3>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", marginTop: "2px" }}>{articles.length} धाराहरू · {branch.part}</p>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%", width: "28px", height: "28px", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>

        {activeArticle && (
          <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "5px", background: `${branch.color}18`, border: `1px solid ${branch.color}30`, borderRadius: "6px", padding: "2px 8px", fontSize: "10px", color: branch.color, fontWeight: 700 }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: branch.color, display: "inline-block" }} />
            {branch.nepali} · {activeArticle.part ?? branch.part}
          </div>
        )}
      </div>

      {/* LIST MODE */}
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0
            ? <p style={{ padding: "24px 16px", fontSize: "13px", color: "rgba(255,255,255,0.28)", textAlign: "center" }}>यस शाखामा धाराहरू फेला परेनन्</p>
            : articles.map((a, i) => (
              <button key={a.articleId} onClick={() => onArticleSelect(a)}
                style={{ display: "flex", alignItems: "flex-start", gap: "11px", width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", animation: `list-emerge 0.18s ease ${Math.min(i * 0.02, 0.28)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${branch.color}0c`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: branch.color, minWidth: "30px", flexShrink: 0, paddingTop: "1px" }}>{a.article}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.86)", lineHeight: 1.3, margin: 0 }}>{a.titleNepali || a.titleEnglish}</p>
                  {a.plainNepaliSummary && (
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.36)", marginTop: "3px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {a.plainNepaliSummary}
                    </p>
                  )}
                </div>
                <span style={{ color: "rgba(255,255,255,0.16)", fontSize: "14px", flexShrink: 0, alignSelf: "center" }}>›</span>
              </button>
            ))
          }
        </div>
      )}

      {/* DETAIL MODE */}
      {activeArticle && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "13px" }}>
            {activeArticle.originalText && (
              <Section label="मूल पाठ" color={branch.color}>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.80)", lineHeight: 1.7, fontStyle: "italic" }}>{activeArticle.originalText}</p>
              </Section>
            )}
            {activeArticle.plainNepaliSummary && (
              <Section label="व्याख्या" color="#fbbf24">
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.76)", lineHeight: 1.7 }}>{activeArticle.plainNepaliSummary}</p>
              </Section>
            )}
            {(activeArticle.rights?.length ?? 0) > 0 && (
              <Section label="अधिकार" color="#4ade80">
                {activeArticle.rights!.map((r, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>• {r}</p>)}
              </Section>
            )}
            {(activeArticle.duties?.length ?? 0) > 0 && (
              <Section label="कर्तव्य" color="#fbbf24">
                {activeArticle.duties!.map((d, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>• {d}</p>)}
              </Section>
            )}
            {(activeArticle.obligations?.length ?? 0) > 0 && (
              <Section label="दायित्व" color="#fb923c">
                {activeArticle.obligations!.map((o, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6 }}>• {o}</p>)}
              </Section>
            )}
            {(activeArticle.institutions?.length ?? 0) > 0 && (
              <Section label="सम्बन्धित निकाय" color="#818cf8">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>{activeArticle.institutions!.join(" · ")}</p>
              </Section>
            )}
            {(activeArticle.relatedArticles?.length ?? 0) > 0 && (
              <Section label="संबंधित धाराहरू" color="#22d3ee">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.60)" }}>{activeArticle.relatedArticles!.join("  ·  ")}</p>
              </Section>
            )}
            {activeArticle.sourcePage != null && (
              <Section label="स्रोत पृष्ठ" color="rgba(255,255,255,0.26)">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)" }}>संविधानको पूर्ण पाठ, पृष्ठ {activeArticle.sourcePage}</p>
              </Section>
            )}
            {activeArticle.confidence != null && (
              <Section label="स्थिति" color="rgba(255,255,255,0.26)">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(activeArticle.confidence * 100)}%`, background: `linear-gradient(90deg, ${branch.color}, ${branch.color}bb)`, borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)" }}>{Math.round(activeArticle.confidence * 100)}%</span>
                </div>
              </Section>
            )}
            {!addingNote ? (
              <button onClick={() => setAddingNote(true)} style={{ padding: "9px 12px", background: "rgba(255,200,50,0.07)", border: "1px dashed rgba(255,200,50,0.26)", borderRadius: "8px", color: "rgba(255,200,50,0.62)", fontSize: "12px", cursor: "pointer", textAlign: "left" }}>
                📌 नोट थप्नुस्
              </button>
            ) : (
              <div style={{ background: "rgba(255,200,50,0.08)", border: "1px solid rgba(255,200,50,0.26)", borderRadius: "8px", padding: "10px" }}>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="यहाँ नोट लेख्नुस्..." rows={3}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "rgba(255,240,160,0.86)", fontSize: "13px", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAddingNote(false)} style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", background: "none", border: "none", cursor: "pointer" }}>रद्द</button>
                  <button onClick={submitNote} disabled={saving || !noteText.trim()} style={{ fontSize: "12px", fontWeight: 700, background: "rgba(255,200,50,0.26)", border: "none", borderRadius: "6px", padding: "4px 12px", color: "white", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "सेव…" : "सेव गर्नुस्"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "8px", flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "10px", background: branch.color, border: "none", borderRadius: "9px", color: "#000", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
              पुरा विवरण हेर्नुहोस्
            </button>
            <button onClick={() => setAddingNote(true)} style={{ flex: 1, padding: "10px", background: "rgba(255,200,50,0.14)", border: "1px solid rgba(255,200,50,0.28)", borderRadius: "9px", color: "rgba(255,200,50,0.88)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
              📌 नोट लेख्नुहोस्
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Parallax hook ────────────────────────────────────────────────────────────

function useParallax(
  bgRef:     React.RefObject<HTMLDivElement | null>,
  labelsRef: React.RefObject<HTMLDivElement | null>,
  fogRef:    React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const cur = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
    let phase = 0, rafId = 0;
    const onMM = (e: MouseEvent) => { target.x = e.clientX / innerWidth; target.y = e.clientY / innerHeight; };
    if (!isTouch) addEventListener("mousemove", onMM, { passive: true });
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.036;
      cur.y += (target.y - cur.y) * 0.036;
      const dx = (cur.x - 0.5) * 2, dy = (cur.y - 0.5) * 2;
      phase += 0.00020;
      const breathe = 1 + Math.sin(phase) * 0.0032;
      if (bgRef.current)     bgRef.current.style.transform     = `scale(${breathe}) translate(${dx * 1.5}%, ${dy * 1.5}%)`;
      if (labelsRef.current) labelsRef.current.style.transform = `translate(${-dx * 0.7}%, ${-dy * 0.7}%)`;
      if (fogRef.current)    fogRef.current.style.transform    = `translate(${dx * 0.38}%, ${dy * 0.22}%)`;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(rafId); if (!isTouch) removeEventListener("mousemove", onMM); };
  }, [bgRef, labelsRef, fogRef]);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [articles,      setArticles]      = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeBranch,  setActiveBranch]  = useState<Branch | null>(null);
  const [activeArticle, setActiveArticle] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [search,        setSearch]        = useState("");
  const [mode,          setMode]          = useState<"tree" | "list">("tree");

  const bgRef     = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const fogRef    = useRef<HTMLDivElement>(null);
  useParallax(bgRef, labelsRef, fogRef);

  useEffect(() => {
    getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true)))
      .then(snap => {
        const docs = snap.docs.map(d => d.data() as ConstitutionalFrameworkRecord);
        docs.sort((a, b) => (a.article ?? 0) - (b.article ?? 0));
        setArticles(docs);
      })
      .finally(() => setLoading(false));
  }, []);

  const branchArticles = useMemo(() => {
    if (!activeBranch) return [];
    return articles.filter(a => articleMatchesBranch(a, activeBranch));
  }, [activeBranch, articles]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return articles.filter(a =>
      [a.titleEnglish, a.titleNepali, a.plainNepaliSummary, ...(a.keywords ?? [])]
        .some(f => f?.toLowerCase().includes(q))
    ).slice(0, 30);
  }, [search, articles]);

  const handleBranchClick = (b: Branch) => {
    if (activeBranch?.id === b.id) { setActiveBranch(null); setActiveArticle(null); }
    else { setActiveBranch(b); setActiveArticle(null); }
  };

  const handleNote = async (text: string) => {
    if (!activeArticle || !activeBranch) return;
    await addDoc(collection(db, "tree_ui_notes"), {
      treeId: "nepal-constitution", targetType: "article",
      targetId: activeArticle.articleId, branchId: activeBranch.id,
      noteText: text, status: "active", createdAt: new Date().toISOString(),
    });
  };

  const panelOpen = activeBranch !== null;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null);  return; }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [activeArticle, activeBranch]);

  // Style constants
  const FOREST: React.CSSProperties = {
    position: "absolute", inset: 0, zIndex: 0,
    backgroundImage: TREE_BG_IMAGE ? `url(${TREE_BG_IMAGE})` : undefined,
    backgroundSize: "cover", backgroundPosition: "center 30%",
    backgroundColor: "#030802",
  };
  const ATMO: React.CSSProperties = {
    position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
    background: HAS_IMAGE
      ? ["radial-gradient(ellipse 110% 30% at 50% 0%, rgba(0,0,0,0.60) 0%, transparent 100%)",
         "radial-gradient(ellipse 35% 70% at 0% 50%, rgba(0,0,0,0.52) 0%, transparent 62%)",
         "radial-gradient(ellipse 35% 70% at 100% 50%, rgba(0,0,0,0.52) 0%, transparent 62%)",
         "linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.45) 100%)"].join(", ")
      : ["radial-gradient(ellipse 90% 90% at 88% -18%, rgba(255,145,25,0.32) 0%, transparent 50%)",
         "radial-gradient(ellipse 40% 90% at 0% 50%, rgba(1,6,1,0.92) 0%, transparent 52%)",
         "radial-gradient(ellipse 40% 90% at 100% 50%, rgba(1,6,1,0.92) 0%, transparent 52%)",
         "linear-gradient(178deg, #0c1a07 0%, #060e03 38%, #040c02 68%, #020600 100%)"].join(", "),
  };

  return (
    <>
      <style>{`
        @keyframes panel-slide-in { from{opacity:0;transform:translateX(18px)} to{opacity:1;transform:translateX(0)} }
        @keyframes trunk-glow {
          0%,100%{text-shadow:0 0 18px #f59e0b,0 0 36px rgba(245,158,11,0.38)}
          50%{text-shadow:0 0 28px #f59e0b,0 0 56px rgba(245,158,11,0.58),0 0 80px rgba(245,158,11,0.18)}
        }
        @keyframes orb-pulse {
          0%,100%{transform:translateX(-50%) scale(1); opacity:1}
          50%{transform:translateX(-50%) scale(1.35); opacity:0.75}
        }
        @keyframes list-emerge { from{opacity:0;transform:translateX(6px)} to{opacity:1;transform:translateX(0)} }
        @keyframes float-note  { 0%,100%{transform:rotate(-3deg) translateY(0)} 50%{transform:rotate(-3deg) translateY(-5px)} }
        @keyframes fog-drift   { 0%,100%{transform:translateX(0) scaleX(1)} 50%{transform:translateX(18px) scaleX(1.012)} }
        @keyframes fog-drift-r { 0%,100%{transform:translateX(0) scaleX(1)} 50%{transform:translateX(-14px) scaleX(1.010)} }
        @keyframes leaf-drift-1 { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.16} 33%{transform:translate(5px,-7px) rotate(4deg);opacity:.20} 66%{transform:translate(-3px,4px) rotate(-3deg);opacity:.13} }
        @keyframes leaf-drift-2 { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.10} 40%{transform:translate(-7px,-4px) rotate(-5deg);opacity:.16} 75%{transform:translate(4px,7px) rotate(3deg);opacity:.08} }
        .branch-label:hover { opacity:1!important; }
        .branch-label:hover span:first-of-type { color:#fff!important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#020600", overflow: "hidden" }}>

        {/* Hero image */}
        <div ref={bgRef} style={{ ...FOREST, willChange: "transform", transformOrigin: "center center" }} />

        {/* World SVG */}
        <WorldSVG />

        {/* Atmosphere */}
        <div style={ATMO} />

        {/* God-ray light */}
        <div style={{ position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
          background: ["linear-gradient(176deg,rgba(255,228,100,0.055) 0%,transparent 44%)",
                       "linear-gradient(180deg,rgba(255,235,115,0.038) 0%,transparent 38%)",
                       "linear-gradient(173deg,rgba(255,218,80,0.028) 0%,transparent 36%)"].join(",") }} />

        {/* Fog planes */}
        <div ref={fogRef} style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", willChange: "transform",
          background: ["radial-gradient(ellipse 75% 16% at 28% 74%,rgba(180,215,158,0.030) 0%,transparent 62%)",
                       "radial-gradient(ellipse 60% 12% at 72% 82%,rgba(160,205,138,0.020) 0%,transparent 58%)"].join(",") }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 90% 10% at 50% 88%,rgba(200,230,180,0.026) 0%,transparent 70%)",
          animation: "fog-drift 34s ease-in-out infinite" }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 8% at 35% 78%,rgba(180,220,160,0.016) 0%,transparent 65%)",
          animation: "fog-drift-r 48s ease-in-out infinite 8s" }} />

        {/* Organic leaf blobs */}
        <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
          {[
            { left: "4%",  top: "12%", w: 55, h: 45, a: "leaf-drift-1 20s ease-in-out infinite" },
            { left: "87%", top: "7%",  w: 64, h: 52, a: "leaf-drift-2 24s ease-in-out infinite 4s" },
            { left: "7%",  top: "52%", w: 46, h: 38, a: "leaf-drift-1 28s ease-in-out infinite 9s" },
            { left: "90%", top: "46%", w: 58, h: 48, a: "leaf-drift-2 22s ease-in-out infinite 14s" },
          ].map((l, i) => (
            <div key={i} style={{ position: "absolute", left: l.left, top: l.top, width: l.w, height: l.h,
              borderRadius: "58% 42% 68% 32% / 48% 58% 42% 52%",
              background: "radial-gradient(ellipse,rgba(18,55,8,0.45) 0%,rgba(8,35,4,0.12) 62%,transparent 100%)",
              animation: l.a, filter: "blur(1.5px)" }} />
          ))}
        </div>

        <FireflyCanvas />

        {/* Vignette */}
        <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
          background: ["linear-gradient(to bottom,rgba(0,0,0,0.52) 0%,transparent 18%,transparent 72%,rgba(0,0,0,0.72) 100%)",
                       "radial-gradient(ellipse 100% 100% at 50% 50%,transparent 38%,rgba(0,0,0,0.42) 100%)"].join(",") }} />

        {/* ── Left category sidebar ─────────────────────────────────────────────── */}
        <CategorySidebar
          branches={BRANCHES}
          articles={articles}
          activeBranch={activeBranch}
          onSelect={handleBranchClick}
        />

        {/* ── Top nav ───────────────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px", zIndex: 200,
          background: "rgba(3,8,2,0.90)", backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          paddingLeft: "208px", paddingRight: "20px", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ fontSize: "15px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>ZZC</span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", fontWeight: 600 }}>JANTA</span>
          </div>
          <div style={{ flex: 1, position: "relative", maxWidth: "400px" }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="संविधान खोज्नुहोस्... (धारा, विषय, अधिकार)"
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: "24px", padding: "7px 16px 7px 36px", color: "white", fontSize: "13px", outline: "none" }} />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.30)", fontSize: "14px" }}>🔍</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "24px", padding: "3px", gap: "2px", flexShrink: 0 }}>
            {(["tree", "list"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#4ade80" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.48)", transition: "all 0.2s" }}>
                {m === "tree" ? "Tree Mode" : "List Mode"}
              </button>
            ))}
          </div>
          <button style={{ padding: "7px 14px", borderRadius: "24px", background: "rgba(255,200,50,0.10)", border: "1px solid rgba(255,200,50,0.24)", color: "rgba(255,200,50,0.84)", fontSize: "12px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            📌 नोट लेख्नुहोस्
          </button>
        </div>

        {/* ── Tree canvas ───────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "fixed", top: "60px",
            left: "192px",
            right: panelOpen ? "clamp(280px,26vw,360px)" : 0,
            bottom: "72px", zIndex: 10,
            transition: "right 0.3s ease",
          }}
          onClick={e => { if (e.target === e.currentTarget) { setActiveBranch(null); setActiveArticle(null); } }}
        >
          {/* Trunk text */}
          <div style={{ position: "absolute", left: "50%", top: "60%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15 }}>
            <p style={{ fontSize: "clamp(22px,3.5vw,38px)", fontWeight: 900, color: "#f59e0b", animation: "trunk-glow 4.5s ease-in-out infinite", letterSpacing: "0.04em", lineHeight: 1.2 }}>नेपालको</p>
            <p style={{ fontSize: "clamp(16px,2.6vw,28px)", fontWeight: 700, color: "#fde68a", textShadow: "0 0 14px rgba(245,158,11,0.48)", letterSpacing: "0.08em" }}>संविधान</p>
            <p style={{ fontSize: "clamp(9px,1.1vw,12px)", fontWeight: 500, color: "rgba(253,230,138,0.42)", marginTop: "6px", letterSpacing: "0.04em" }}>हामी जनता, नेपालको सार्वभौमसत्ता…</p>
          </div>

          {/* Root words */}
          <div style={{ position: "absolute", bottom: "3%", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "clamp(10px,2vw,24px)", pointerEvents: "none", zIndex: 15 }}>
            {["जनता", "सार्वभौमसत्ता", "लोकतन्त्र", "स्वतन्त्रता", "संविधानको मूल आधार"].map(w => (
              <span key={w} style={{ fontSize: "clamp(9px,1vw,11px)", fontWeight: 600, color: "rgba(253,230,138,0.55)", textShadow: "0 0 7px rgba(245,158,11,0.30)", whiteSpace: "nowrap" }}>{w}</span>
            ))}
          </div>

          {/* Nepal flag */}
          <div style={{ position: "absolute", left: "8%", bottom: "18%", fontSize: "clamp(22px,2.8vw,38px)", zIndex: 15, pointerEvents: "none", opacity: 0.72 }}>🇳🇵</div>

          {/* Floating sticky note */}
          <div style={{ position: "absolute", left: "56%", top: "28%", zIndex: 50, pointerEvents: "none", animation: "float-note 5s ease-in-out infinite" }}>
            <div style={{ background: "#fef08a", boxShadow: "2px 4px 18px rgba(0,0,0,0.55)", padding: "10px 13px", borderRadius: "3px", maxWidth: "155px", transform: "rotate(-3deg)", fontSize: "11px", color: "#1a1a00", lineHeight: 1.55, fontWeight: 500 }}>
              📌 यो शाखामा नागरिकता र पहिचान संस्थाहरूको महत्वपूर्ण धाराहरू छन्!
              <span style={{ display: "block", marginTop: "5px", fontSize: "10px", color: "#555", fontStyle: "italic" }}>– Admin Note</span>
            </div>
          </div>

          {/* Branch labels — counter-parallax */}
          <div ref={labelsRef} style={{ position: "absolute", inset: 0, willChange: "transform", pointerEvents: "none" }}>
            {BRANCHES.map(branch => (
              <BranchLabel
                key={branch.id}
                branch={branch}
                isActive={activeBranch?.id === branch.id}
                isDimmed={activeBranch !== null && activeBranch.id !== branch.id}
                onClick={() => handleBranchClick(branch)}
              />
            ))}
          </div>

          {/* Explore hint */}
          {!activeBranch && !loading && (
            <div style={{ position: "absolute", bottom: "14%", left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,0.22)", fontSize: "12px", fontWeight: 500, textAlign: "center", pointerEvents: "none", zIndex: 15 }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {/* Search overlay */}
          {search.trim() && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 90%)", background: "rgba(4,10,3,0.96)", backdropFilter: "blur(22px)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "16px", zIndex: 60, maxHeight: "55%", overflowY: "auto" }}>
              <p style={{ padding: "12px 16px 6px", fontSize: "11px", color: "rgba(255,255,255,0.36)" }}>{searchResults.length} धाराहरू फेला</p>
              {searchResults.map(a => (
                <button key={a.articleId}
                  onClick={() => { const b = BRANCHES.find(b => articleMatchesBranch(a, b)); if (b) setActiveBranch(b); setActiveArticle(a); setSearch(""); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.36)", marginRight: "8px" }}>धारा {a.article}</span>
                  <span style={{ fontSize: "13px", color: "white", fontWeight: 600 }}>{a.titleNepali || a.titleEnglish}</span>
                </button>
              ))}
            </div>
          )}

          {/* List mode */}
          {mode === "list" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(3,8,2,0.96)", backdropFilter: "blur(22px)", overflowY: "auto", padding: "16px" }}>
              <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", marginBottom: "8px" }}>{articles.length} धाराहरू · Nepal Constitution 2015/2072 BS</p>
                {articles.map(a => {
                  const branch = BRANCHES.find(b => articleMatchesBranch(a, b));
                  return (
                    <button key={a.articleId}
                      onClick={() => { if (branch) setActiveBranch(branch); setActiveArticle(a); setMode("tree"); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${branch ? branch.color + "1e" : "rgba(255,255,255,0.06)"}`, borderRadius: "10px", cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 800, color: branch?.color ?? "rgba(255,255,255,0.28)", minWidth: "40px" }}>{a.article}</span>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>{a.titleNepali || a.titleEnglish}</p>
                        {a.plainNepaliSummary && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.36)", marginTop: "2px", lineHeight: 1.5 }}>{a.plainNepaliSummary.slice(0, 80)}…</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {activeBranch && (
          <DetailPanel
            branch={activeBranch} articles={branchArticles} activeArticle={activeArticle}
            onArticleSelect={a => setActiveArticle(a)}
            onBack={() => setActiveArticle(null)}
            onClose={() => { setActiveBranch(null); setActiveArticle(null); }}
            onNote={handleNote}
          />
        )}

        {/* ── Bottom bar — breadcrumb ───────────────────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: "36px", left: "192px",
          right: panelOpen ? "clamp(280px,26vw,360px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(3,8,2,0.90)", backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
          paddingLeft: "16px", paddingRight: "16px", gap: "8px",
          transition: "right 0.3s ease",
        }}>
          {activeBranch ? (
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)" }}>तपाई यहाँ हुनुहुन्छः</span>
              <span style={{ color: "rgba(255,255,255,0.28)" }}>होम</span>
              <span style={{ color: "rgba(255,255,255,0.20)" }}>›</span>
              <span style={{ color: activeBranch.color, fontWeight: 700 }}>● {activeBranch.nepali}</span>
              {activeArticle && <><span style={{ color: "rgba(255,255,255,0.20)" }}>›</span><span style={{ color: "white" }}>धारा {activeArticle.article}</span></>}
            </span>
          ) : (
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)" }}>
              नेपालको संविधान २०७२ · {articles.length} धाराहरू{loading && " · लोड हुँदैछ…"}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => { setActiveBranch(null); setActiveArticle(null); }} style={{ fontSize: "11px", color: "rgba(255,255,255,0.26)", background: "none", border: "none", cursor: "pointer" }}>Reset</button>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.18)" }}>ESC</span>
        </div>

        {/* ── Bottom quick pills with article counts ────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: 0, left: "192px",
          right: panelOpen ? "clamp(280px,26vw,360px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(2,6,1,0.94)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center",
          paddingLeft: "12px", gap: "5px", overflowX: "auto",
          transition: "right 0.3s ease",
        }}>
          {BRANCHES.map(b => {
            const count    = articles.filter(a => articleMatchesBranch(a, b)).length;
            const isActive = activeBranch?.id === b.id;
            return (
              <button key={b.id} onClick={() => handleBranchClick(b)} style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "3px 11px", borderRadius: "20px",
                background: isActive ? `${b.color}22` : "rgba(255,255,255,0.05)",
                border: `1px solid ${isActive ? b.color + "55" : "rgba(255,255,255,0.08)"}`,
                color: isActive ? b.color : "rgba(255,255,255,0.55)",
                fontSize: "11px", fontWeight: 600,
                whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0,
                transition: "all 0.2s",
              }}>
                <span style={{ fontSize: "8px" }}>⬣</span>
                {b.nepali}
                {count > 0 && (
                  <span style={{ fontSize: "10px", color: isActive ? b.color : "rgba(255,255,255,0.35)", fontWeight: 700 }}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
}
