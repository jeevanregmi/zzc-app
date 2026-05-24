"use client";

// /constitution — Living Nepal Constitutional Tree
// Spatial layout: zone-anchored, collision-resolved, depth-layered

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

const TREE_BG_IMAGE = "/banyan-tree.png";

// ─── Branch type ──────────────────────────────────────────────────────────────

interface Branch {
  id:          string;
  nepali:      string;
  short:       string;              // compact label for bloom leaves
  color:       string;
  anchorX:     number;              // desired % x in canvas (pre-collision)
  anchorY:     number;              // desired % y in canvas
  orbitRadius: number;              // bloom radius in %
  depth:       "back" | "mid" | "front";
  part:        string;
  keywords:    string[];
}

// Zone assignments per user spec:
// TOP CANOPY:      न्यायपालिका, संवैधानिक अंगहरू
// UPPER LEFT:      मौलिक हक
// UPPER CENTER:    संघीयता
// UPPER RIGHT:     व्यवस्थापिका
// MID LEFT:        राज्यका निर्देशक सिद्धान्त
// MID RIGHT:       कार्यपालिका
// LOWER LEFT ROOT: स्थानीय शासन
// LOWER RIGHT:     नागरिकता
const BRANCHES: Branch[] = [
  {
    id: "federalism", nepali: "संघीयता", short: "संघीयता",
    color: "#fb923c", anchorX: 50, anchorY: 7, orbitRadius: 14,
    depth: "front", part: "भाग ५",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "संघ", "भाग ५", "भाग ६", "federal structure"],
  },
  {
    id: "judiciary", nepali: "न्यायपालिका", short: "न्यायपालिका",
    color: "#60a5fa", anchorX: 68, anchorY: 14, orbitRadius: 12,
    depth: "mid", part: "भाग ११",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "judiciary", "supreme court", "संवैधानिक इजलास", "भाग ११", "अदालत"],
  },
  {
    id: "constitutional-bodies", nepali: "संवैधानिक अंगहरू", short: "सं. अंगहरू",
    color: "#f472b6", anchorX: 32, anchorY: 14, orbitRadius: 11,
    depth: "back", part: "भाग ३३",
    keywords: ["संवैधानिक अंग", "constitutional bodies", "commission", "आयोग", "भाग ३३", "निर्वाचन आयोग", "अख्तियार"],
  },
  {
    id: "rights", nepali: "मौलिक हक", short: "मौलिक हक",
    color: "#4ade80", anchorX: 16, anchorY: 23, orbitRadius: 14,
    depth: "front", part: "भाग ३",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "right to freedom", "right to", "समानता", "स्वतन्त्रता", "भाग ३"],
  },
  {
    id: "legislature", nepali: "व्यवस्थापिका", short: "व्यवस्थापिका",
    color: "#818cf8", anchorX: 82, anchorY: 23, orbitRadius: 12,
    depth: "mid", part: "भाग ८",
    keywords: ["व्यवस्थापिका", "संसद", "प्रतिनिधि सभा", "राष्ट्रिय सभा", "parliament", "legislature", "भाग ८", "विधायन"],
  },
  {
    id: "directives", nepali: "राज्यका निर्देशक सिद्धान्त", short: "निर्देशक सिद्धान्त",
    color: "#c084fc", anchorX: 13, anchorY: 44, orbitRadius: 11,
    depth: "back", part: "भाग ४",
    keywords: ["निर्देशक सिद्धान्त", "state directives", "directive principles", "state policy", "भाग ४", "निर्देशक"],
  },
  {
    id: "executive", nepali: "कार्यपालिका", short: "कार्यपालिका",
    color: "#fbbf24", anchorX: 84, anchorY: 40, orbitRadius: 12,
    depth: "mid", part: "भाग ७",
    keywords: ["कार्यपालिका", "executive", "प्रधानमन्त्री", "मन्त्रिपरिषद", "राष्ट्रपति", "भाग ७", "prime minister", "cabinet"],
  },
  {
    id: "citizenship", nepali: "नागरिकता", short: "नागरिकता",
    color: "#f87171", anchorX: 68, anchorY: 62, orbitRadius: 11,
    depth: "front", part: "भाग २",
    keywords: ["नागरिकता", "citizenship", "नागरिक", "भाग २", "nationality"],
  },
  {
    id: "local-govt", nepali: "स्थानीय शासन", short: "स्थानीय शासन",
    color: "#34d399", anchorX: 14, anchorY: 68, orbitRadius: 11,
    depth: "mid", part: "भाग २०",
    keywords: ["स्थानीय", "नगरपालिका", "गाउँपालिका", "local government", "भाग २०", "भाग २१", "village council", "municipality"],
  },
];

// ─── Collision avoidance ──────────────────────────────────────────────────────
// Simple distance-based repulsion — no physics, just stable separation

function resolvePositions(branches: Branch[]): Map<string, { x: number; y: number }> {
  const pos = new Map(branches.map(b => [b.id, { x: b.anchorX, y: b.anchorY }]));
  const ids = branches.map(b => b.id);
  const MIN = 18; // minimum separation in %

  for (let iter = 0; iter < 14; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = pos.get(ids[i])!;
        const b = pos.get(ids[j])!;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        // Aspect-correct: canvas is ~1.5× wider than tall
        const dist = Math.sqrt(dx * dx + (dy * 1.55) * (dy * 1.55));
        if (dist < MIN && dist > 0.01) {
          const push = ((MIN - dist) / MIN) * 0.38;
          const nx   = dx / dist;
          const nyRaw = dy / dist;
          const half = push * MIN * 0.5;
          a.x = Math.max(7, Math.min(91, a.x - nx   * half));
          a.y = Math.max(5, Math.min(80, a.y - nyRaw * half));
          b.x = Math.max(7, Math.min(91, b.x + nx   * half));
          b.y = Math.max(5, Math.min(80, b.y + nyRaw * half));
        }
      }
    }
  }
  return pos;
}

// Computed once at module level (static branches — no need for useMemo)
const RESOLVED = resolvePositions(BRANCHES);

// ─── Article bloom — fan toward tree center ───────────────────────────────────

function bloomPositions(
  count:       number,
  anchorX:     number,
  anchorY:     number,
  orbitRadius: number,
) {
  const n = Math.min(count, 8);
  if (n === 0) return [];
  // Always fan toward the center of the canvas (50%, 45%)
  const baseAngle = Math.atan2(45 - anchorY, 50 - anchorX);
  const spread    = n <= 1 ? 0 : n <= 3 ? Math.PI * 0.5 : Math.PI * 0.88;
  return Array.from({ length: n }, (_, i) => {
    const t     = n > 1 ? i / (n - 1) : 0.5;
    const angle = baseAngle + (t - 0.5) * spread;
    const r     = orbitRadius + (i % 3) * 2;
    return {
      x: Math.max(5, Math.min(93, anchorX + Math.cos(angle) * r)),
      y: Math.max(5, Math.min(85, anchorY + Math.sin(angle) * r)),
    };
  });
}

// ─── Keyword matching ─────────────────────────────────────────────────────────

function articleMatchesBranch(a: ConstitutionalFrameworkRecord, b: Branch): boolean {
  const haystack = [
    a.titleEnglish, a.titleNepali, a.part,
    ...(a.sectors ?? []), ...(a.constitutionalThemes ?? []),
    ...(a.keywords ?? []), ...(a.institutions ?? []),
    ...(a.governanceStructures ?? []), ...(a.affectedGroups ?? []),
  ].filter(Boolean).join(" ").toLowerCase();
  return b.keywords.some(k => haystack.includes(k.toLowerCase()));
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
    const flies = Array.from({ length: 30 }, () => ({
      x: Math.random() * innerWidth, y: 60 + Math.random() * innerHeight * 0.82,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.14,
      r: 0.5 + Math.random() * 1.3, o: Math.random(),
      od: (Math.random() > 0.5 ? 1 : -1) * (0.005 + Math.random() * 0.011),
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
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 8);
        g.addColorStop(0, `hsla(${f.hue},100%,80%,${a * 0.45})`);
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `hsla(${f.hue},100%,94%,${a})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none", opacity: 0.70 }} />;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function CategorySidebar({
  branches, articles, activeBranch, onSelect,
}: {
  branches: Branch[]; articles: ConstitutionalFrameworkRecord[];
  activeBranch: Branch | null; onSelect: (b: Branch) => void;
}) {
  return (
    <div style={{
      position: "fixed", left: 0, top: "60px", bottom: "36px",
      width: "180px", zIndex: 50,
      background: "rgba(1,5,1,0.85)", backdropFilter: "blur(18px)",
      borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <p style={{ padding: "11px 13px 7px", fontSize: "8.5px", fontWeight: 800, color: "rgba(255,255,255,0.22)", letterSpacing: "0.12em", textTransform: "uppercase", flexShrink: 0 }}>
        संवैधानिक शाखाहरू
      </p>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {branches.map(b => {
          const count    = articles.filter(a => articleMatchesBranch(a, b)).length;
          const isActive = activeBranch?.id === b.id;
          return (
            <button key={b.id} onClick={() => onSelect(b)} style={{
              display: "flex", alignItems: "center", gap: "8px",
              width: "100%", padding: "7px 13px",
              background: isActive ? `${b.color}0e` : "transparent",
              border: "none", cursor: "pointer", textAlign: "left",
              borderLeft: `2px solid ${isActive ? b.color : "transparent"}`,
              transition: "all 0.16s",
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: b.color, boxShadow: isActive ? `0 0 6px ${b.color}` : "none", flexShrink: 0 }} />
              <span style={{ fontSize: "11px", fontWeight: isActive ? 700 : 400, color: isActive ? b.color : "rgba(255,255,255,0.55)", flex: 1, lineHeight: 1.3 }}>
                {b.nepali}
              </span>
              {count > 0 && (
                <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)", background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "1px 5px", flexShrink: 0 }}>
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

// ─── Branch label — depth-aware glass card ────────────────────────────────────

function BranchLabel({
  branch, isActive, isDimmed, finalX, finalY, onClick,
}: {
  branch: Branch; isActive: boolean; isDimmed: boolean;
  finalX: number; finalY: number; onClick: () => void;
}) {
  const depthScale = branch.depth === "back" ? 0.86 :
                     branch.depth === "mid"  ? 0.94 : 1.0;
  const baseOpacity = branch.depth === "back" ? 0.58 :
                      branch.depth === "mid"  ? 0.76 : 0.92;
  const opacity = isDimmed ? 0.16 : isActive ? 1.0 : baseOpacity;
  const scale   = isActive ? 1.04 : depthScale;
  const zIdx    = isActive ? 40 : branch.depth === "front" ? 25 : branch.depth === "mid" ? 20 : 15;

  return (
    <button
      onClick={onClick}
      className="branch-label"
      style={{
        position: "absolute",
        left: `${finalX}%`, top: `${finalY}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
        background: isActive ? "rgba(2,6,2,0.78)" : "rgba(2,5,2,0.44)",
        backdropFilter: "blur(10px)",
        border: `1px solid ${branch.color}${isActive ? "66" : "28"}`,
        borderRadius: "14px",
        padding: "8px 15px 7px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
        boxShadow: isActive
          ? `0 0 8px ${branch.color}38, 0 3px 18px rgba(0,0,0,0.75)`
          : `0 2px 12px rgba(0,0,0,0.62)`,
        cursor: "pointer", pointerEvents: "auto",
        opacity,
        transition: "opacity 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease",
        zIndex: zIdx,
        animation: "float-label 5.5s ease-in-out infinite",
        animationDelay: `${(finalX % 7) * 0.38 + (branch.depth === "back" ? 1.8 : 0)}s`,
        filter: branch.depth === "back" && !isActive ? "blur(0.4px)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {/* Orb */}
      <div style={{
        position: "absolute", top: "-8px", left: "50%",
        transform: "translateX(-50%)",
        width: isActive ? "12px" : "9px",
        height: isActive ? "12px" : "9px",
        borderRadius: "50%",
        background: branch.color,
        boxShadow: isActive
          ? `0 0 10px ${branch.color}99, 0 0 20px ${branch.color}33`
          : `0 0 4px ${branch.color}66`,
        animation: isActive ? "orb-pulse 2.4s ease-in-out infinite" : "none",
        pointerEvents: "none",
        transition: "width 0.28s, height 0.28s, box-shadow 0.28s",
      }} />
      <span style={{
        fontSize: branch.depth === "back" ? "11px" : "12px",
        fontWeight: 600,
        color: isActive ? "#fff" : "rgba(255,255,255,0.84)",
        letterSpacing: "0.005em",
      }}>
        {branch.nepali}
      </span>
      <span style={{
        fontSize: "8.5px", fontWeight: 500,
        color: branch.color, opacity: isActive ? 0.88 : 0.60,
      }}>
        {branch.part}
      </span>
    </button>
  );
}

// ─── Article leaf — glass card ────────────────────────────────────────────────

function ArticleLeaf({
  article, branch, x, y, index, isActive, onClick,
}: {
  article: ConstitutionalFrameworkRecord; branch: Branch;
  x: number; y: number; index: number; isActive: boolean; onClick: () => void;
}) {
  const rot = ((index * 7) % 11) - 5;
  const title = (article.titleNepali || article.titleEnglish) ?? "";
  return (
    <button onClick={onClick} style={{
      position: "absolute",
      left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
      background: isActive ? `${branch.color}16` : "rgba(2,9,2,0.68)",
      backdropFilter: "blur(10px)",
      border: `1px solid ${branch.color}${isActive ? "55" : "25"}`,
      borderRadius: "10px", padding: "6px 10px",
      maxWidth: "126px", textAlign: "left",
      boxShadow: isActive
        ? `0 0 10px ${branch.color}44, 0 3px 14px rgba(0,0,0,0.65)`
        : `0 2px 10px rgba(0,0,0,0.55)`,
      cursor: "pointer", zIndex: 35, pointerEvents: "auto",
      animation: `leaf-bloom 0.42s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.055}s both`,
      transition: "all 0.20s ease",
    }}>
      <p style={{ fontSize: "9px", fontWeight: 700, color: branch.color, margin: 0, opacity: 0.88 }}>
        धारा {article.article}
      </p>
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.78)", margin: "2px 0 0", lineHeight: 1.35 }}>
        {title.slice(0, 26)}{title.length > 26 ? "…" : ""}
      </p>
    </button>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "2px" }}>
      <p style={{ fontSize: "9px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: "6px", opacity: 0.85 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Detail panel — jungle-glass with golden typography ──────────────────────

function DetailPanel({
  branch, articles, activeArticle, onArticleSelect, onBack, onClose, onNote,
}: {
  branch: Branch; articles: ConstitutionalFrameworkRecord[];
  activeArticle: ConstitutionalFrameworkRecord | null;
  onArticleSelect: (a: ConstitutionalFrameworkRecord) => void;
  onBack: () => void; onClose: () => void; onNote: (text: string) => void;
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
      position: "fixed", right: 0, top: "60px", bottom: 0,
      width: "clamp(260px, 24vw, 340px)", zIndex: 100,
      background: "rgba(2,9,3,0.94)",
      backdropFilter: "blur(28px)",
      borderLeft: "1px solid rgba(100,200,100,0.08)",
      boxShadow: "-2px 0 40px rgba(0,0,0,0.80)",
      display: "flex", flexDirection: "column",
      animation: "panel-slide-in 0.24s ease",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 18px 12px",
        borderBottom: "1px solid rgba(100,180,100,0.07)",
        background: `linear-gradient(160deg, ${branch.color}09, transparent 60%)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          {activeArticle && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(253,230,138,0.36)", cursor: "pointer", fontSize: "16px", padding: "2px 2px 0", lineHeight: 1, flexShrink: 0, marginTop: "2px" }}>←</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeArticle ? (
              <>
                <p style={{ fontSize: "9.5px", color: "rgba(253,230,138,0.38)", marginBottom: "3px" }}>
                  धारा {activeArticle.article}{activeArticle.clause ? ` · खण्ड ${activeArticle.clause}` : ""}
                </p>
                <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fde68a", lineHeight: 1.3, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeArticle.titleNepali || activeArticle.titleEnglish}
                </h3>
              </>
            ) : (
              <>
                <p style={{ fontSize: "8.5px", color: branch.color, marginBottom: "3px", fontWeight: 700, letterSpacing: "0.08em", opacity: 0.80 }}>शाखा</p>
                <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fde68a", lineHeight: 1.25, margin: 0 }}>
                  {branch.nepali}
                </h3>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.28)", marginTop: "3px" }}>{articles.length} धाराहरू · {branch.part}</p>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "none", borderRadius: "50%", width: "26px", height: "26px", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>
        {activeArticle && (
          <div style={{ marginTop: "9px", display: "inline-flex", alignItems: "center", gap: "4px", background: `${branch.color}11`, border: `1px solid ${branch.color}22`, borderRadius: "5px", padding: "2px 7px", fontSize: "9.5px", color: branch.color, fontWeight: 600 }}>
            <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: branch.color, display: "inline-block" }} />
            {branch.nepali} · {activeArticle.part ?? branch.part}
          </div>
        )}
      </div>

      {/* LIST */}
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0
            ? <p style={{ padding: "28px 18px", fontSize: "12px", color: "rgba(253,230,138,0.24)", textAlign: "center" }}>यस शाखामा धाराहरू फेला परेनन्</p>
            : articles.map((a, i) => (
              <button key={a.articleId} onClick={() => onArticleSelect(a)}
                style={{ display: "flex", alignItems: "flex-start", gap: "10px", width: "100%", textAlign: "left", padding: "11px 18px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.05)", cursor: "pointer", animation: `list-emerge 0.16s ease ${Math.min(i * 0.018, 0.24)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${branch.color}09`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "10px", fontWeight: 700, color: branch.color, minWidth: "28px", flexShrink: 0, paddingTop: "1px", opacity: 0.88 }}>{a.article}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "12px", fontWeight: 500, color: "#fde68a", lineHeight: 1.35, margin: 0 }}>{a.titleNepali || a.titleEnglish}</p>
                  {a.plainNepaliSummary && (
                    <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", marginTop: "3px", lineHeight: 1.55, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {a.plainNepaliSummary}
                    </p>
                  )}
                </div>
                <span style={{ color: "rgba(253,230,138,0.18)", fontSize: "13px", flexShrink: 0, alignSelf: "center" }}>›</span>
              </button>
            ))
          }
        </div>
      )}

      {/* DETAIL */}
      {activeArticle && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "16px" }}>
            {activeArticle.originalText && (
              <Section label="मूल पाठ" color={branch.color}>
                <p style={{ fontSize: "12px", color: "rgba(253,230,138,0.68)", lineHeight: 1.80, fontStyle: "italic" }}>{activeArticle.originalText}</p>
              </Section>
            )}
            {activeArticle.plainNepaliSummary && (
              <Section label="व्याख्या" color="rgba(253,230,138,0.55)">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.78 }}>{activeArticle.plainNepaliSummary}</p>
              </Section>
            )}
            {(activeArticle.rights?.length ?? 0) > 0 && (
              <Section label="अधिकार" color="#4ade80">
                {activeArticle.rights!.map((r, i) => <p key={i} style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>· {r}</p>)}
              </Section>
            )}
            {(activeArticle.duties?.length ?? 0) > 0 && (
              <Section label="कर्तव्य" color="#fbbf24">
                {activeArticle.duties!.map((d, i) => <p key={i} style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>· {d}</p>)}
              </Section>
            )}
            {(activeArticle.obligations?.length ?? 0) > 0 && (
              <Section label="दायित्व" color="#fb923c">
                {activeArticle.obligations!.map((o, i) => <p key={i} style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.62)", lineHeight: 1.65 }}>· {o}</p>)}
              </Section>
            )}
            {(activeArticle.institutions?.length ?? 0) > 0 && (
              <Section label="सम्बन्धित निकाय" color="#818cf8">
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.50)" }}>{activeArticle.institutions!.join("  ·  ")}</p>
              </Section>
            )}
            {activeArticle.sourcePage != null && (
              <Section label="स्रोत पृष्ठ" color="rgba(253,230,138,0.28)">
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.38)" }}>संविधानको पूर्ण पाठ, पृष्ठ {activeArticle.sourcePage}</p>
              </Section>
            )}
            {!addingNote ? (
              <button onClick={() => setAddingNote(true)} style={{ padding: "9px 13px", background: "rgba(253,230,138,0.05)", border: "1px dashed rgba(253,230,138,0.18)", borderRadius: "7px", color: "rgba(253,230,138,0.48)", fontSize: "11px", cursor: "pointer", textAlign: "left" }}>
                📌 नोट थप्नुस्
              </button>
            ) : (
              <div style={{ background: "rgba(253,230,138,0.06)", border: "1px solid rgba(253,230,138,0.18)", borderRadius: "7px", padding: "10px" }}>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="यहाँ नोट लेख्नुस्..." rows={3}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "rgba(253,230,138,0.84)", fontSize: "12px", fontFamily: "inherit", lineHeight: 1.65 }} />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAddingNote(false)} style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", background: "none", border: "none", cursor: "pointer" }}>रद्द</button>
                  <button onClick={submitNote} disabled={saving || !noteText.trim()} style={{ fontSize: "11px", fontWeight: 700, background: "rgba(253,230,138,0.16)", border: "none", borderRadius: "5px", padding: "4px 11px", color: "#fde68a", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "…" : "सेव"}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(100,180,100,0.07)", display: "flex", gap: "7px", flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "9px", background: branch.color, border: "none", borderRadius: "8px", color: "#000", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
              पुरा विवरण
            </button>
            <button onClick={() => setAddingNote(true)} style={{ flex: 1, padding: "9px", background: "rgba(253,230,138,0.08)", border: "1px solid rgba(253,230,138,0.18)", borderRadius: "8px", color: "#fde68a", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
              📌 नोट
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
    const cur = { x: 0.5, y: 0.5 }, tgt = { x: 0.5, y: 0.5 };
    let phase = 0, raf = 0;
    const onMM = (e: MouseEvent) => { tgt.x = e.clientX / innerWidth; tgt.y = e.clientY / innerHeight; };
    if (!isTouch) addEventListener("mousemove", onMM, { passive: true });
    const tick = () => {
      cur.x += (tgt.x - cur.x) * 0.032;
      cur.y += (tgt.y - cur.y) * 0.032;
      const dx = (cur.x - 0.5) * 2, dy = (cur.y - 0.5) * 2;
      phase += 0.00016;
      const br = 1 + Math.sin(phase) * 0.0028;
      if (bgRef.current)     bgRef.current.style.transform     = `scale(${br}) translate(${dx * 1.3}%, ${dy * 1.3}%)`;
      if (labelsRef.current) labelsRef.current.style.transform = `translate(${-dx * 0.55}%, ${-dy * 0.55}%)`;
      if (fogRef.current)    fogRef.current.style.transform    = `translate(${dx * 0.32}%, ${dy * 0.18}%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (!isTouch) removeEventListener("mousemove", onMM); };
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

  const bloomLeaves = useMemo(() => {
    if (!activeBranch) return [];
    const pos = RESOLVED.get(activeBranch.id) ?? { x: activeBranch.anchorX, y: activeBranch.anchorY };
    const positions = bloomPositions(branchArticles.length, pos.x, pos.y, activeBranch.orbitRadius);
    return branchArticles.slice(0, 8).map((a, i) => ({ article: a, ...positions[i], index: i }));
  }, [activeBranch, branchArticles]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return articles.filter(a =>
      [a.titleEnglish, a.titleNepali, a.plainNepaliSummary, ...(a.keywords ?? [])]
        .some(f => f?.toLowerCase().includes(q))
    ).slice(0, 28);
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null); return; }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [activeArticle, activeBranch]);

  const panelOpen = activeBranch !== null;

  // Render branches in depth order: back → mid → front (so front draws on top)
  const depthOrder = (["back", "mid", "front"] as const).flatMap(d =>
    BRANCHES.filter(b => b.depth === d)
  );

  return (
    <>
      <style>{`
        @keyframes panel-slide-in  { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
        @keyframes float-label     { 0%,100%{transform:translate(-50%,-50%) translateY(0)} 50%{transform:translate(-50%,-50%) translateY(-5px)} }
        @keyframes leaf-bloom      { 0%{opacity:0;transform:translate(-50%,-50%) scale(0.22) rotate(var(--rot,0deg))} 65%{opacity:1;transform:translate(-50%,-50%) scale(1.05) rotate(var(--rot,0deg))} 100%{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(var(--rot,0deg))} }
        @keyframes orb-pulse       { 0%,100%{box-shadow:0 0 10px var(--oc)} 50%{box-shadow:0 0 18px var(--oc), 0 0 30px var(--oc2)} }
        @keyframes list-emerge     { from{opacity:0;transform:translateX(5px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fog-drift       { 0%,100%{transform:translateX(0)} 50%{transform:translateX(16px)} }
        @keyframes fog-drift-r     { 0%,100%{transform:translateX(0)} 50%{transform:translateX(-12px)} }
        @keyframes leaf-drift-1    { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.12} 50%{transform:translate(5px,-6px) rotate(4deg);opacity:.16} }
        @keyframes leaf-drift-2    { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.08} 50%{transform:translate(-6px,5px) rotate(-4deg);opacity:.12} }
        @keyframes trunk-glow      { 0%,100%{opacity:.82} 50%{opacity:1} }
        .branch-label:hover { opacity:1 !important; filter:none !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#010601", overflow: "hidden" }}>

        {/* Banyan hero */}
        <div ref={bgRef} style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `url(${TREE_BG_IMAGE})`,
          backgroundSize: "cover", backgroundPosition: "center 28%",
          willChange: "transform", transformOrigin: "center center",
        }} />

        {/* Light cinematic overlay */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.36) 0%, rgba(0,0,0,0.16) 38%, rgba(0,0,0,0.22) 72%, rgba(0,0,0,0.60) 100%)",
        }} />

        {/* Subtle top light */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
          background: "linear-gradient(178deg, rgba(255,228,100,0.032) 0%, transparent 42%)",
        }} />

        {/* Fog */}
        <div ref={fogRef} style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", willChange: "transform",
          background: "radial-gradient(ellipse 70% 14% at 30% 76%,rgba(180,215,158,0.018) 0%,transparent 60%)",
        }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 88% 9% at 50% 88%,rgba(200,230,180,0.015) 0%,transparent 68%)",
          animation: "fog-drift 36s ease-in-out infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 75% 7% at 38% 80%,rgba(180,220,160,0.010) 0%,transparent 62%)",
          animation: "fog-drift-r 50s ease-in-out infinite 10s",
        }} />

        {/* Organic leaf blobs */}
        <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
          {[
            { l: "2%", t: "9%",  w: 50, h: 40, a: "leaf-drift-1 22s ease-in-out infinite" },
            { l: "88%",t: "5%",  w: 58, h: 48, a: "leaf-drift-2 27s ease-in-out infinite 4s" },
            { l: "5%", t: "56%", w: 42, h: 34, a: "leaf-drift-1 31s ease-in-out infinite 9s" },
            { l: "91%",t: "50%", w: 52, h: 44, a: "leaf-drift-2 25s ease-in-out infinite 15s" },
          ].map((l, i) => (
            <div key={i} style={{
              position: "absolute", left: l.l, top: l.t, width: l.w, height: l.h,
              borderRadius: "58% 42% 68% 32% / 48% 58% 42% 52%",
              background: "radial-gradient(ellipse,rgba(15,48,7,0.30) 0%,rgba(6,28,3,0.07) 62%,transparent 100%)",
              animation: l.a, filter: "blur(1.5px)",
            }} />
          ))}
        </div>

        <FireflyCanvas />

        {/* Edge vignette */}
        <div style={{ position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
          background: [
            "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, transparent 14%, transparent 76%, rgba(0,0,0,0.62) 100%)",
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.30) 100%)",
          ].join(","),
        }} />

        {/* Sidebar */}
        <CategorySidebar
          branches={BRANCHES} articles={articles}
          activeBranch={activeBranch} onSelect={handleBranchClick}
        />

        {/* Top nav */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px", zIndex: 200,
          background: "rgba(1,5,1,0.86)", backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,0.045)",
          display: "flex", alignItems: "center",
          paddingLeft: "196px", paddingRight: "20px", gap: "14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: 0 }}>
            <span style={{ fontSize: "14px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>ZZC</span>
            <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.24)", fontWeight: 600 }}>JANTA</span>
          </div>
          <div style={{ flex: 1, position: "relative", maxWidth: "380px" }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="संविधान खोज्नुहोस्… धारा, विषय, अधिकार"
              style={{ width: "100%", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: "22px", padding: "6px 15px 6px 33px", color: "white", fontSize: "12px", outline: "none" }} />
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.26)", fontSize: "13px" }}>🔍</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "22px", padding: "3px", gap: "2px", flexShrink: 0 }}>
            {(["tree", "list"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "4px 13px", borderRadius: "18px", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#4ade80" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.40)", transition: "all 0.18s" }}>
                {m === "tree" ? "🌿 वृक्ष" : "📋 सूची"}
              </button>
            ))}
          </div>
        </div>

        {/* Tree canvas */}
        <div
          style={{
            position: "fixed", top: "60px",
            left: "180px",
            right: panelOpen ? "clamp(260px,24vw,340px)" : 0,
            bottom: "36px", zIndex: 10,
            transition: "right 0.28s ease",
          }}
          onClick={e => { if (e.target === e.currentTarget) { setActiveBranch(null); setActiveArticle(null); } }}
        >
          {/* Center trunk text */}
          <div style={{ position: "absolute", left: "50%", top: "56%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15, animation: "trunk-glow 6s ease-in-out infinite" }}>
            <p style={{ fontSize: "clamp(18px,2.8vw,32px)", fontWeight: 800, color: "#fde68a", letterSpacing: "0.05em", lineHeight: 1.2, margin: 0, textShadow: "0 2px 20px rgba(0,0,0,0.80)" }}>नेपालको</p>
            <p style={{ fontSize: "clamp(13px,2.1vw,23px)", fontWeight: 600, color: "rgba(253,230,138,0.75)", textShadow: "0 2px 16px rgba(0,0,0,0.70)", letterSpacing: "0.09em", margin: "3px 0 0" }}>संविधान</p>
            <p style={{ fontSize: "clamp(8px,0.9vw,10px)", fontWeight: 400, color: "rgba(253,230,138,0.30)", marginTop: "7px", letterSpacing: "0.04em" }}>हामी जनता, नेपालको सार्वभौमसत्ता…</p>
          </div>

          {/* Nepal flag */}
          <div style={{ position: "absolute", left: "5%", bottom: "14%", fontSize: "clamp(18px,2.2vw,30px)", zIndex: 15, pointerEvents: "none", opacity: 0.58 }}>🇳🇵</div>

          {/* Branch labels + article bloom — counter-parallax */}
          <div ref={labelsRef} style={{ position: "absolute", inset: 0, willChange: "transform", pointerEvents: "none" }}>
            {depthOrder.map(branch => {
              const pos = RESOLVED.get(branch.id) ?? { x: branch.anchorX, y: branch.anchorY };
              return (
                <BranchLabel
                  key={branch.id}
                  branch={branch}
                  isActive={activeBranch?.id === branch.id}
                  isDimmed={activeBranch !== null && activeBranch.id !== branch.id}
                  finalX={pos.x}
                  finalY={pos.y}
                  onClick={() => handleBranchClick(branch)}
                />
              );
            })}

            {/* Article leaves bloom */}
            {activeBranch && bloomLeaves.map(({ article, x, y, index }) => (
              <ArticleLeaf
                key={article.articleId}
                article={article} branch={activeBranch}
                x={x} y={y} index={index}
                isActive={activeArticle?.articleId === article.articleId}
                onClick={() => setActiveArticle(article)}
              />
            ))}
          </div>

          {/* Explore hint */}
          {!activeBranch && !loading && (
            <div style={{ position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)", color: "rgba(253,230,138,0.22)", fontSize: "11px", fontWeight: 400, textAlign: "center", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {/* Search overlay */}
          {search.trim() && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", width: "min(440px, 88%)", background: "rgba(1,7,2,0.97)", backdropFilter: "blur(20px)", border: "1px solid rgba(100,180,100,0.09)", borderRadius: "14px", zIndex: 60, maxHeight: "52%", overflowY: "auto" }}>
              <p style={{ padding: "11px 16px 5px", fontSize: "10px", color: "rgba(253,230,138,0.32)" }}>{searchResults.length} धाराहरू फेला</p>
              {searchResults.map(a => (
                <button key={a.articleId}
                  onClick={() => { const b = BRANCHES.find(b => articleMatchesBranch(a, b)); if (b) setActiveBranch(b); setActiveArticle(a); setSearch(""); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.05)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,180,100,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "10px", color: "rgba(253,230,138,0.36)", marginRight: "8px" }}>धारा {a.article}</span>
                  <span style={{ fontSize: "12px", color: "#fde68a", fontWeight: 500 }}>{a.titleNepali || a.titleEnglish}</span>
                </button>
              ))}
            </div>
          )}

          {/* List mode */}
          {mode === "list" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(1,7,2,0.97)", backdropFilter: "blur(20px)", overflowY: "auto", padding: "16px" }}>
              <div style={{ maxWidth: "640px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "3px" }}>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.28)", marginBottom: "10px" }}>{articles.length} धाराहरू · Nepal Constitution 2015/2072 BS</p>
                {articles.map(a => {
                  const branch = BRANCHES.find(b => articleMatchesBranch(a, b));
                  return (
                    <button key={a.articleId}
                      onClick={() => { if (branch) setActiveBranch(branch); setActiveArticle(a); setMode("tree"); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: "11px", padding: "9px 13px", background: "rgba(255,255,255,0.02)", border: `1px solid ${branch ? branch.color + "14" : "rgba(255,255,255,0.04)"}`, borderRadius: "8px", cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.045)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    >
                      <span style={{ fontSize: "10px", fontWeight: 700, color: branch?.color ?? "rgba(253,230,138,0.26)", minWidth: "36px" }}>{a.article}</span>
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

        {/* Bottom bar */}
        <div style={{
          position: "fixed", bottom: 0, left: "180px",
          right: panelOpen ? "clamp(260px,24vw,340px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(1,5,1,0.90)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(100,180,100,0.05)",
          display: "flex", alignItems: "center",
          paddingLeft: "14px", paddingRight: "14px", gap: "7px",
          transition: "right 0.28s ease",
        }}>
          {activeBranch ? (
            <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.40)", display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ color: "rgba(253,230,138,0.20)" }}>होम</span>
              <span style={{ color: "rgba(253,230,138,0.14)" }}>›</span>
              <span style={{ color: activeBranch.color, fontWeight: 600 }}>● {activeBranch.nepali}</span>
              {activeArticle && <><span style={{ color: "rgba(253,230,138,0.14)" }}>›</span><span style={{ color: "#fde68a" }}>धारा {activeArticle.article}</span></>}
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.18)" }}>
              नेपालको संविधान २०७२ · {loading ? "लोड हुँदैछ…" : `${articles.length} धाराहरू`}
            </span>
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
