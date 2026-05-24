"use client";

// /constitution — Living Nepal Constitutional Tree
// Cinematic banyan world — photorealistic tree IS the structure

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

const TREE_BG_IMAGE = "/banyan-tree.png";

// ─── Branch data ──────────────────────────────────────────────────────────────

interface Branch {
  id:       string;
  nepali:   string;
  color:    string;
  x:        number;  // % of viewport width
  y:        number;  // % of viewport height
  part:     string;
  emoji:    string;
  keywords: string[];
}

const BRANCHES: Branch[] = [
  {
    id: "rights", nepali: "मौलिक हक", color: "#4ade80",
    x: 22, y: 22, part: "भाग ३", emoji: "⚖️",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "right to freedom",
               "right to", "समानता", "स्वतन्त्रता", "भाग ३"],
  },
  {
    id: "directives", nepali: "राज्यका निर्देशक सिद्धान्त", color: "#c084fc",
    x: 38, y: 14, part: "भाग ४", emoji: "🧭",
    keywords: ["निर्देशक सिद्धान्त", "state directives", "directive principles",
               "state policy", "भाग ४", "निर्देशक"],
  },
  {
    id: "federalism", nepali: "संघीयता", color: "#fb923c",
    x: 60, y: 12, part: "भाग ५", emoji: "🗺️",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "संघ",
               "भाग ५", "भाग ६", "federal structure"],
  },
  {
    id: "judiciary", nepali: "न्यायपालिका", color: "#60a5fa",
    x: 74, y: 18, part: "भाग ११", emoji: "⚖️",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "judiciary", "supreme court",
               "संवैधानिक इजलास", "भाग ११", "अदालत"],
  },
  {
    id: "executive", nepali: "कार्यपालिका", color: "#fbbf24",
    x: 74, y: 34, part: "भाग ७", emoji: "🏛️",
    keywords: ["कार्यपालिका", "executive", "प्रधानमन्त्री", "मन्त्रिपरिषद",
               "राष्ट्रपति", "भाग ७", "prime minister", "cabinet"],
  },
  {
    id: "legislature", nepali: "व्यवस्थापिका", color: "#818cf8",
    x: 80, y: 48, part: "भाग ८", emoji: "🏛️",
    keywords: ["व्यवस्थापिका", "संसद", "प्रतिनिधि सभा", "राष्ट्रिय सभा",
               "parliament", "legislature", "भाग ८", "विधायन"],
  },
  {
    id: "constitutional-bodies", nepali: "संवैधानिक अंगहरू", color: "#f472b6",
    x: 26, y: 44, part: "भाग ३३", emoji: "🏛️",
    keywords: ["संवैधानिक अंग", "constitutional bodies", "commission", "आयोग",
               "भाग ३३", "निर्वाचन आयोग", "अख्तियार"],
  },
  {
    id: "local-govt", nepali: "स्थानीय शासन", color: "#34d399",
    x: 18, y: 65, part: "भाग २०", emoji: "🏘️",
    keywords: ["स्थानीय", "नगरपालिका", "गाउँपालिका", "local government",
               "भाग २०", "भाग २१", "village council", "municipality"],
  },
  {
    id: "citizenship", nepali: "नागरिकता", color: "#f87171",
    x: 50, y: 56, part: "भाग २", emoji: "🪪",
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

// ─── Article bloom — fan upward from branch center ───────────────────────────

function bloomPositions(count: number, bx: number, by: number) {
  const n = Math.min(count, 8);
  const spread = n <= 2 ? Math.PI * 0.4 : Math.PI * 0.75;
  return Array.from({ length: n }, (_, i) => {
    const t  = n > 1 ? i / (n - 1) : 0.5;
    const angle = -Math.PI / 2 + (t - 0.5) * spread;
    const r     = 13 + (i % 2) * 3.5;
    return {
      x: Math.max(5, Math.min(93, bx + Math.cos(angle) * r)),
      y: Math.max(8, Math.min(85, by + Math.sin(angle) * r)),
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
    const flies = Array.from({ length: 36 }, () => ({
      x:  Math.random() * innerWidth,
      y:  60 + Math.random() * innerHeight * 0.82,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.16,
      r:  0.6 + Math.random() * 1.5,
      o:  Math.random(),
      od: (Math.random() > 0.5 ? 1 : -1) * (0.006 + Math.random() * 0.012),
      hue: Math.random() > 0.55 ? 58 : 105,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const f of flies) {
        f.x += f.vx; f.y += f.vy; f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0) f.x = c.width;  if (f.x > c.width)  f.x = 0;
        if (f.y < 60) f.y = c.height * 0.88; if (f.y > c.height * 0.88) f.y = 60;
        const a   = Math.max(0, Math.min(1, f.o));
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 9);
        grd.addColorStop(0, `hsla(${f.hue},100%,80%,${a * 0.52})`);
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
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, zIndex: 8, pointerEvents: "none", opacity: 0.78 }} />;
}

// ─── Left sidebar ─────────────────────────────────────────────────────────────

function CategorySidebar({
  branches, articles, activeBranch, onSelect,
}: {
  branches:     Branch[];
  articles:     ConstitutionalFrameworkRecord[];
  activeBranch: Branch | null;
  onSelect:     (b: Branch) => void;
}) {
  return (
    <div style={{
      position: "fixed", left: 0, top: "60px", bottom: "72px",
      width: "192px", zIndex: 50,
      background: "rgba(2,7,2,0.88)",
      backdropFilter: "blur(22px)",
      borderRight: "1px solid rgba(255,255,255,0.06)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      <p style={{
        padding: "12px 14px 8px",
        fontSize: "9px", fontWeight: 800,
        color: "rgba(255,255,255,0.28)",
        letterSpacing: "0.10em", textTransform: "uppercase",
        flexShrink: 0,
      }}>
        संवैधानिक शाखाहरू
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
                background: isActive ? `${b.color}12` : "transparent",
                border: "none", cursor: "pointer", textAlign: "left",
                borderLeft: `2.5px solid ${isActive ? b.color : "transparent"}`,
                transition: "all 0.18s",
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{
                width: "7px", height: "7px", borderRadius: "50%",
                background: b.color,
                boxShadow: isActive ? `0 0 8px ${b.color}` : "none",
                flexShrink: 0, transition: "box-shadow 0.18s",
              }} />
              <span style={{
                fontSize: "12px", fontWeight: isActive ? 700 : 500,
                color: isActive ? b.color : "rgba(255,255,255,0.65)",
                flex: 1, lineHeight: 1.3, transition: "color 0.18s",
              }}>
                {b.nepali}
              </span>
              {count > 0 && (
                <span style={{
                  fontSize: "10px", color: "rgba(255,255,255,0.28)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: "10px", padding: "1px 6px", flexShrink: 0,
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

// ─── Branch label — glass card with moss-glow orb ────────────────────────────

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
        transform: "translate(-50%, -50%)",
        background: isActive ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.48)",
        backdropFilter: "blur(16px)",
        border: `1px solid ${branch.color}${isActive ? "99" : "44"}`,
        borderRadius: "18px",
        padding: "9px 18px 8px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "2px",
        boxShadow: isActive
          ? `0 0 24px ${branch.color}77, 0 0 48px ${branch.color}22, 0 8px 32px rgba(0,0,0,0.55)`
          : `0 0 12px ${branch.color}22, 0 6px 20px rgba(0,0,0,0.45)`,
        cursor: "pointer", pointerEvents: "auto",
        opacity: isDimmed ? 0.22 : 1,
        transition: "all 0.3s ease",
        zIndex: isActive ? 40 : 20,
        animation: "float-label 4s ease-in-out infinite",
        animationDelay: `${(branch.x % 5) * 0.5}s`,
        whiteSpace: "nowrap",
      }}
    >
      {/* Moss-glow orb */}
      <div style={{
        position: "absolute", top: "-9px", left: "50%",
        transform: "translateX(-50%)",
        width: "13px", height: "13px", borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${branch.color}, ${branch.color}88)`,
        boxShadow: `0 0 ${isActive ? "20px" : "8px"} ${branch.color}${isActive ? "cc" : "66"}`,
        animation: isActive ? "orb-pulse 2s ease-in-out infinite" : "none",
        pointerEvents: "none",
      }} />
      <span style={{
        fontSize: "13px", fontWeight: 700,
        color: isActive ? "#fff" : "rgba(255,255,255,0.88)",
      }}>
        {branch.nepali}
      </span>
      <span style={{
        fontSize: "9px", fontWeight: 600,
        color: branch.color, opacity: isActive ? 1 : 0.75,
      }}>
        {branch.part}
      </span>
    </button>
  );
}

// ─── Article leaf — glass card bloom ─────────────────────────────────────────

function ArticleLeaf({
  article, branch, x, y, index, isActive, onClick,
}: {
  article:  ConstitutionalFrameworkRecord;
  branch:   Branch;
  x:        number;
  y:        number;
  index:    number;
  isActive: boolean;
  onClick:  () => void;
}) {
  const rot = ((index * 7) % 13) - 6;
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${x}%`, top: `${y}%`,
        transform: `translate(-50%, -50%) rotate(${rot}deg)`,
        background: isActive ? `${branch.color}1e` : "rgba(3,12,3,0.72)",
        backdropFilter: "blur(14px)",
        border: `1px solid ${branch.color}${isActive ? "77" : "33"}`,
        borderRadius: "13px", padding: "7px 11px",
        maxWidth: "130px", textAlign: "left",
        boxShadow: isActive
          ? `0 0 18px ${branch.color}66, 0 4px 18px rgba(0,0,0,0.55)`
          : `0 0 8px ${branch.color}1a, 0 4px 12px rgba(0,0,0,0.45)`,
        cursor: "pointer", zIndex: 35, pointerEvents: "auto",
        animation: `leaf-bloom 0.45s cubic-bezier(0.34,1.56,0.64,1) ${index * 0.06}s both`,
        transition: "all 0.22s ease",
      }}
    >
      <p style={{ fontSize: "10px", fontWeight: 800, color: branch.color, margin: 0 }}>
        धारा {article.article}
      </p>
      <p style={{
        fontSize: "11px", color: "rgba(255,255,255,0.82)",
        margin: "2px 0 0", lineHeight: 1.3,
      }}>
        {((article.titleNepali || article.titleEnglish) ?? "").slice(0, 28)}
        {((article.titleNepali || article.titleEnglish) ?? "").length > 28 ? "…" : ""}
      </p>
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

// ─── Detail panel — jungle-glass with golden typography ──────────────────────

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
      background: "rgba(3,12,4,0.92)",
      backdropFilter: "blur(32px)",
      borderLeft: "1px solid rgba(100,200,100,0.10)",
      boxShadow: "-4px 0 48px rgba(0,0,0,0.75)",
      display: "flex", flexDirection: "column",
      animation: "panel-slide-in 0.26s ease",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px 10px",
        borderBottom: "1px solid rgba(100,180,100,0.08)",
        background: `linear-gradient(135deg, ${branch.color}0a, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
          {activeArticle && (
            <button onClick={onBack} style={{ background: "none", border: "none", color: "rgba(253,230,138,0.40)", cursor: "pointer", fontSize: "18px", padding: "0 3px", lineHeight: 1, flexShrink: 0 }}>←</button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeArticle ? (
              <>
                <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.38)", marginBottom: "2px" }}>
                  धारा {activeArticle.article}{activeArticle.clause ? ` · खण्ड ${activeArticle.clause}` : ""}
                </p>
                <h3 style={{ fontSize: "16px", fontWeight: 900, color: "#fde68a", textShadow: `0 0 14px ${branch.color}44`, lineHeight: 1.25, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeArticle.titleNepali || activeArticle.titleEnglish}
                </h3>
              </>
            ) : (
              <>
                <p style={{ fontSize: "9px", color: branch.color, marginBottom: "2px", fontWeight: 800, letterSpacing: "0.07em" }}>शाखा</p>
                <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#fde68a", textShadow: `0 0 14px ${branch.color}44`, lineHeight: 1.2, margin: 0 }}>
                  {branch.nepali}
                </h3>
                <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.30)", marginTop: "2px" }}>{articles.length} धाराहरू · {branch.part}</p>
              </>
            )}
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: "50%", width: "28px", height: "28px", color: "rgba(255,255,255,0.40)", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
        </div>

        {activeArticle && (
          <div style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "5px", background: `${branch.color}14`, border: `1px solid ${branch.color}28`, borderRadius: "6px", padding: "2px 8px", fontSize: "10px", color: branch.color, fontWeight: 700 }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: branch.color, display: "inline-block" }} />
            {branch.nepali} · {activeArticle.part ?? branch.part}
          </div>
        )}
      </div>

      {/* LIST MODE */}
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0
            ? <p style={{ padding: "24px 16px", fontSize: "13px", color: "rgba(253,230,138,0.28)", textAlign: "center" }}>यस शाखामा धाराहरू फेला परेनन्</p>
            : articles.map((a, i) => (
              <button key={a.articleId} onClick={() => onArticleSelect(a)}
                style={{ display: "flex", alignItems: "flex-start", gap: "11px", width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.06)", cursor: "pointer", animation: `list-emerge 0.18s ease ${Math.min(i * 0.02, 0.28)}s both` }}
                onMouseEnter={e => (e.currentTarget.style.background = `${branch.color}0c`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ fontSize: "11px", fontWeight: 800, color: branch.color, minWidth: "30px", flexShrink: 0, paddingTop: "1px" }}>{a.article}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a", lineHeight: 1.3, margin: 0 }}>{a.titleNepali || a.titleEnglish}</p>
                  {a.plainNepaliSummary && (
                    <p style={{ fontSize: "11px", color: "rgba(253,230,138,0.40)", marginTop: "3px", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {a.plainNepaliSummary}
                    </p>
                  )}
                </div>
                <span style={{ color: "rgba(253,230,138,0.20)", fontSize: "14px", flexShrink: 0, alignSelf: "center" }}>›</span>
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
                <p style={{ fontSize: "13px", color: "rgba(253,230,138,0.75)", lineHeight: 1.7, fontStyle: "italic" }}>{activeArticle.originalText}</p>
              </Section>
            )}
            {activeArticle.plainNepaliSummary && (
              <Section label="व्याख्या" color="#fbbf24">
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.70)", lineHeight: 1.7 }}>{activeArticle.plainNepaliSummary}</p>
              </Section>
            )}
            {(activeArticle.rights?.length ?? 0) > 0 && (
              <Section label="अधिकार" color="#4ade80">
                {activeArticle.rights!.map((r, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>• {r}</p>)}
              </Section>
            )}
            {(activeArticle.duties?.length ?? 0) > 0 && (
              <Section label="कर्तव्य" color="#fbbf24">
                {activeArticle.duties!.map((d, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>• {d}</p>)}
              </Section>
            )}
            {(activeArticle.obligations?.length ?? 0) > 0 && (
              <Section label="दायित्व" color="#fb923c">
                {activeArticle.obligations!.map((o, i) => <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>• {o}</p>)}
              </Section>
            )}
            {(activeArticle.institutions?.length ?? 0) > 0 && (
              <Section label="सम्बन्धित निकाय" color="#818cf8">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{activeArticle.institutions!.join(" · ")}</p>
              </Section>
            )}
            {(activeArticle.relatedArticles?.length ?? 0) > 0 && (
              <Section label="संबंधित धाराहरू" color="#22d3ee">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.55)" }}>{activeArticle.relatedArticles!.join("  ·  ")}</p>
              </Section>
            )}
            {activeArticle.sourcePage != null && (
              <Section label="स्रोत पृष्ठ" color="rgba(253,230,138,0.30)">
                <p style={{ fontSize: "12px", color: "rgba(253,230,138,0.40)" }}>संविधानको पूर्ण पाठ, पृष्ठ {activeArticle.sourcePage}</p>
              </Section>
            )}
            {activeArticle.confidence != null && (
              <Section label="विश्वसनीयता" color="rgba(253,230,138,0.30)">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(activeArticle.confidence * 100)}%`, background: `linear-gradient(90deg, ${branch.color}, ${branch.color}bb)`, borderRadius: "4px" }} />
                  </div>
                  <span style={{ fontSize: "10px", color: "rgba(253,230,138,0.38)" }}>{Math.round(activeArticle.confidence * 100)}%</span>
                </div>
              </Section>
            )}
            {!addingNote ? (
              <button onClick={() => setAddingNote(true)} style={{ padding: "9px 12px", background: "rgba(253,230,138,0.06)", border: "1px dashed rgba(253,230,138,0.22)", borderRadius: "8px", color: "rgba(253,230,138,0.55)", fontSize: "12px", cursor: "pointer", textAlign: "left" }}>
                📌 नोट थप्नुस्
              </button>
            ) : (
              <div style={{ background: "rgba(253,230,138,0.07)", border: "1px solid rgba(253,230,138,0.22)", borderRadius: "8px", padding: "10px" }}>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="यहाँ नोट लेख्नुस्..." rows={3}
                  style={{ width: "100%", background: "transparent", border: "none", outline: "none", resize: "none", color: "rgba(253,230,138,0.88)", fontSize: "13px", fontFamily: "inherit" }} />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAddingNote(false)} style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", background: "none", border: "none", cursor: "pointer" }}>रद्द</button>
                  <button onClick={submitNote} disabled={saving || !noteText.trim()} style={{ fontSize: "12px", fontWeight: 700, background: "rgba(253,230,138,0.20)", border: "none", borderRadius: "6px", padding: "4px 12px", color: "#fde68a", cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "सेव…" : "सेव गर्नुस्"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(100,180,100,0.08)", display: "flex", gap: "8px", flexShrink: 0 }}>
            <button style={{ flex: 1, padding: "10px", background: branch.color, border: "none", borderRadius: "9px", color: "#000", fontSize: "12px", fontWeight: 800, cursor: "pointer" }}>
              पुरा विवरण हेर्नुहोस्
            </button>
            <button onClick={() => setAddingNote(true)} style={{ flex: 1, padding: "10px", background: "rgba(253,230,138,0.10)", border: "1px solid rgba(253,230,138,0.22)", borderRadius: "9px", color: "#fde68a", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
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
    const cur = { x: 0.5, y: 0.5 }, target = { x: 0.5, y: 0.5 };
    let phase = 0, rafId = 0;
    const onMM = (e: MouseEvent) => { target.x = e.clientX / innerWidth; target.y = e.clientY / innerHeight; };
    if (!isTouch) addEventListener("mousemove", onMM, { passive: true });
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.034;
      cur.y += (target.y - cur.y) * 0.034;
      const dx = (cur.x - 0.5) * 2, dy = (cur.y - 0.5) * 2;
      phase += 0.00018;
      const breathe = 1 + Math.sin(phase) * 0.003;
      if (bgRef.current)     bgRef.current.style.transform     = `scale(${breathe}) translate(${dx * 1.4}%, ${dy * 1.4}%)`;
      if (labelsRef.current) labelsRef.current.style.transform = `translate(${-dx * 0.6}%, ${-dy * 0.6}%)`;
      if (fogRef.current)    fogRef.current.style.transform    = `translate(${dx * 0.35}%, ${dy * 0.20}%)`;
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

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null);  return; }
    };
    addEventListener("keydown", h);
    return () => removeEventListener("keydown", h);
  }, [activeArticle, activeBranch]);

  const panelOpen = activeBranch !== null;

  // Bloom positions for active branch articles
  const bloomLeaves = useMemo(() => {
    if (!activeBranch) return [];
    const positions = bloomPositions(branchArticles.length, activeBranch.x, activeBranch.y);
    return branchArticles.slice(0, 8).map((a, i) => ({ article: a, ...positions[i], index: i }));
  }, [activeBranch, branchArticles]);

  return (
    <>
      <style>{`
        @keyframes panel-slide-in {
          from { opacity: 0; transform: translateX(18px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes float-label {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50%       { transform: translate(-50%, -50%) translateY(-5px); }
        }
        @keyframes leaf-bloom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.25); }
          65%  { opacity: 1; transform: translate(-50%, -50%) scale(1.06); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes orb-pulse {
          0%, 100% { transform: translateX(-50%) scale(1);    opacity: 1; }
          50%       { transform: translateX(-50%) scale(1.35); opacity: 0.78; }
        }
        @keyframes list-emerge {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fog-drift   { 0%,100%{transform:translateX(0) scaleX(1)} 50%{transform:translateX(18px) scaleX(1.012)} }
        @keyframes fog-drift-r { 0%,100%{transform:translateX(0) scaleX(1)} 50%{transform:translateX(-14px) scaleX(1.010)} }
        @keyframes leaf-drift-1 { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.14} 33%{transform:translate(5px,-7px) rotate(4deg);opacity:.18} 66%{transform:translate(-3px,4px) rotate(-3deg);opacity:.11} }
        @keyframes leaf-drift-2 { 0%,100%{transform:translate(0,0) rotate(0deg);opacity:.09} 40%{transform:translate(-7px,-4px) rotate(-5deg);opacity:.14} 75%{transform:translate(4px,7px) rotate(3deg);opacity:.07} }
        @keyframes trunk-glow {
          0%,100%{text-shadow:0 0 18px rgba(253,230,138,0.45),0 0 36px rgba(245,158,11,0.25)}
          50%     {text-shadow:0 0 28px rgba(253,230,138,0.65),0 0 56px rgba(245,158,11,0.40),0 0 80px rgba(245,158,11,0.15)}
        }
        .branch-label:hover { opacity: 1 !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#020802", overflow: "hidden" }}>

        {/* ── Full-screen banyan hero ─────────────────────────────────────────── */}
        <div
          ref={bgRef}
          style={{
            position: "absolute", inset: 0, zIndex: 0,
            backgroundImage: `url(${TREE_BG_IMAGE})`,
            backgroundSize: "cover", backgroundPosition: "center 30%",
            willChange: "transform", transformOrigin: "center center",
          }}
        />

        {/* ── Light cinematic overlay ─────────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.20) 40%, rgba(0,0,0,0.28) 75%, rgba(0,0,0,0.58) 100%)",
        }} />

        {/* ── Subtle god-ray light ────────────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
          background: [
            "linear-gradient(176deg,rgba(255,228,100,0.040) 0%,transparent 44%)",
            "linear-gradient(180deg,rgba(255,235,115,0.025) 0%,transparent 38%)",
          ].join(","),
        }} />

        {/* ── Fog planes ─────────────────────────────────────────────────────── */}
        <div ref={fogRef} style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none", willChange: "transform",
          background: [
            "radial-gradient(ellipse 75% 16% at 28% 74%,rgba(180,215,158,0.022) 0%,transparent 62%)",
            "radial-gradient(ellipse 60% 12% at 72% 82%,rgba(160,205,138,0.015) 0%,transparent 58%)",
          ].join(","),
        }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 90% 10% at 50% 88%,rgba(200,230,180,0.018) 0%,transparent 70%)",
          animation: "fog-drift 34s ease-in-out infinite",
        }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 8% at 35% 78%,rgba(180,220,160,0.012) 0%,transparent 65%)",
          animation: "fog-drift-r 48s ease-in-out infinite 8s",
        }} />

        {/* ── Organic leaf blobs ──────────────────────────────────────────────── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 6, pointerEvents: "none" }}>
          {[
            { left: "3%",  top: "10%", w: 55, h: 45, a: "leaf-drift-1 22s ease-in-out infinite" },
            { left: "87%", top: "6%",  w: 64, h: 52, a: "leaf-drift-2 26s ease-in-out infinite 4s" },
            { left: "6%",  top: "54%", w: 46, h: 38, a: "leaf-drift-1 30s ease-in-out infinite 9s" },
            { left: "90%", top: "48%", w: 58, h: 48, a: "leaf-drift-2 24s ease-in-out infinite 14s" },
          ].map((l, i) => (
            <div key={i} style={{
              position: "absolute", left: l.left, top: l.top, width: l.w, height: l.h,
              borderRadius: "58% 42% 68% 32% / 48% 58% 42% 52%",
              background: "radial-gradient(ellipse,rgba(18,55,8,0.35) 0%,rgba(8,35,4,0.08) 62%,transparent 100%)",
              animation: l.a, filter: "blur(1.5px)",
            }} />
          ))}
        </div>

        <FireflyCanvas />

        {/* ── Edge vignette ───────────────────────────────────────────────────── */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
          background: [
            "linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 16%,transparent 74%,rgba(0,0,0,0.65) 100%)",
            "radial-gradient(ellipse 100% 100% at 50% 50%,transparent 38%,rgba(0,0,0,0.36) 100%)",
          ].join(","),
        }} />

        {/* ── Left sidebar ────────────────────────────────────────────────────── */}
        <CategorySidebar
          branches={BRANCHES}
          articles={articles}
          activeBranch={activeBranch}
          onSelect={handleBranchClick}
        />

        {/* ── Top nav ─────────────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px", zIndex: 200,
          background: "rgba(2,7,2,0.88)", backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
          paddingLeft: "208px", paddingRight: "20px", gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ fontSize: "15px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>ZZC</span>
            <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.26)", fontWeight: 600 }}>JANTA</span>
          </div>
          <div style={{ flex: 1, position: "relative", maxWidth: "400px" }}>
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="संविधान खोज्नुहोस्… धारा, विषय, अधिकार"
              style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: "24px", padding: "7px 16px 7px 36px", color: "white", fontSize: "13px", outline: "none" }}
            />
            <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.28)", fontSize: "14px" }}>🔍</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px", padding: "3px", gap: "2px", flexShrink: 0 }}>
            {(["tree", "list"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)} style={{ padding: "5px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", background: mode === m ? "#4ade80" : "transparent", color: mode === m ? "#000" : "rgba(255,255,255,0.45)", transition: "all 0.2s" }}>
                {m === "tree" ? "🌿 वृक्ष" : "📋 सूची"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tree canvas ─────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "fixed", top: "60px",
            left: "192px",
            right: panelOpen ? "clamp(280px,26vw,360px)" : 0,
            bottom: "36px", zIndex: 10,
            transition: "right 0.3s ease",
          }}
          onClick={e => { if (e.target === e.currentTarget) { setActiveBranch(null); setActiveArticle(null); } }}
        >
          {/* Central trunk text */}
          <div style={{ position: "absolute", left: "50%", top: "58%", transform: "translate(-50%, -50%)", textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15 }}>
            <p style={{ fontSize: "clamp(20px,3.2vw,36px)", fontWeight: 900, color: "#fde68a", animation: "trunk-glow 5s ease-in-out infinite", letterSpacing: "0.04em", lineHeight: 1.2, margin: 0 }}>नेपालको</p>
            <p style={{ fontSize: "clamp(14px,2.4vw,26px)", fontWeight: 700, color: "rgba(253,230,138,0.82)", textShadow: "0 0 14px rgba(245,158,11,0.38)", letterSpacing: "0.08em", margin: "2px 0 0" }}>संविधान</p>
            <p style={{ fontSize: "clamp(9px,1vw,11px)", fontWeight: 500, color: "rgba(253,230,138,0.35)", marginTop: "6px", letterSpacing: "0.04em" }}>हामी जनता, नेपालको सार्वभौमसत्ता…</p>
          </div>

          {/* Nepal flag */}
          <div style={{ position: "absolute", left: "7%", bottom: "16%", fontSize: "clamp(20px,2.5vw,34px)", zIndex: 15, pointerEvents: "none", opacity: 0.68 }}>🇳🇵</div>

          {/* Branch labels — counter-parallax layer */}
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

            {/* Article leaves bloom */}
            {activeBranch && bloomLeaves.map(({ article, x, y, index }) => (
              <ArticleLeaf
                key={article.articleId}
                article={article}
                branch={activeBranch}
                x={x} y={y} index={index}
                isActive={activeArticle?.articleId === article.articleId}
                onClick={() => setActiveArticle(article)}
              />
            ))}
          </div>

          {/* Explore hint */}
          {!activeBranch && !loading && (
            <div style={{ position: "absolute", bottom: "12%", left: "50%", transform: "translateX(-50%)", color: "rgba(253,230,138,0.28)", fontSize: "12px", fontWeight: 500, textAlign: "center", pointerEvents: "none", zIndex: 15, whiteSpace: "nowrap" }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {/* Search overlay */}
          {search.trim() && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", width: "min(480px, 90%)", background: "rgba(3,12,4,0.96)", backdropFilter: "blur(22px)", border: "1px solid rgba(100,180,100,0.10)", borderRadius: "16px", zIndex: 60, maxHeight: "55%", overflowY: "auto" }}>
              <p style={{ padding: "12px 16px 6px", fontSize: "11px", color: "rgba(253,230,138,0.38)" }}>{searchResults.length} धाराहरू फेला</p>
              {searchResults.map(a => (
                <button key={a.articleId}
                  onClick={() => { const b = BRANCHES.find(b => articleMatchesBranch(a, b)); if (b) setActiveBranch(b); setActiveArticle(a); setSearch(""); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: "1px solid rgba(100,180,100,0.06)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,180,100,0.06)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.40)", marginRight: "8px" }}>धारा {a.article}</span>
                  <span style={{ fontSize: "13px", color: "#fde68a", fontWeight: 600 }}>{a.titleNepali || a.titleEnglish}</span>
                </button>
              ))}
            </div>
          )}

          {/* List mode */}
          {mode === "list" && (
            <div style={{ position: "absolute", inset: 0, zIndex: 55, background: "rgba(2,9,3,0.97)", backdropFilter: "blur(22px)", overflowY: "auto", padding: "16px" }}>
              <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "12px", color: "rgba(253,230,138,0.30)", marginBottom: "8px" }}>{articles.length} धाराहरू · Nepal Constitution 2015/2072 BS</p>
                {articles.map(a => {
                  const branch = BRANCHES.find(b => articleMatchesBranch(a, b));
                  return (
                    <button key={a.articleId}
                      onClick={() => { if (branch) setActiveBranch(branch); setActiveArticle(a); setMode("tree"); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "10px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${branch ? branch.color + "18" : "rgba(255,255,255,0.05)"}`, borderRadius: "10px", cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    >
                      <span style={{ fontSize: "11px", fontWeight: 800, color: branch?.color ?? "rgba(253,230,138,0.28)", minWidth: "40px" }}>{a.article}</span>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a" }}>{a.titleNepali || a.titleEnglish}</p>
                        {a.plainNepaliSummary && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", marginTop: "2px", lineHeight: 1.5 }}>{a.plainNepaliSummary.slice(0, 80)}…</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Detail panel ────────────────────────────────────────────────────── */}
        {activeBranch && (
          <DetailPanel
            branch={activeBranch} articles={branchArticles} activeArticle={activeArticle}
            onArticleSelect={a => setActiveArticle(a)}
            onBack={() => setActiveArticle(null)}
            onClose={() => { setActiveBranch(null); setActiveArticle(null); }}
            onNote={handleNote}
          />
        )}

        {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: 0, left: "192px",
          right: panelOpen ? "clamp(280px,26vw,360px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(2,7,2,0.92)", backdropFilter: "blur(14px)",
          borderTop: "1px solid rgba(100,180,100,0.06)",
          display: "flex", alignItems: "center",
          paddingLeft: "16px", paddingRight: "16px", gap: "8px",
          transition: "right 0.3s ease",
        }}>
          {activeBranch ? (
            <span style={{ fontSize: "12px", color: "rgba(253,230,138,0.45)", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ color: "rgba(253,230,138,0.25)" }}>होम</span>
              <span style={{ color: "rgba(253,230,138,0.18)" }}>›</span>
              <span style={{ color: activeBranch.color, fontWeight: 700 }}>● {activeBranch.nepali}</span>
              {activeArticle && <><span style={{ color: "rgba(253,230,138,0.18)" }}>›</span><span style={{ color: "#fde68a" }}>धारा {activeArticle.article}</span></>}
            </span>
          ) : (
            <span style={{ fontSize: "12px", color: "rgba(253,230,138,0.22)" }}>
              नेपालको संविधान २०७२ · {loading ? "लोड हुँदैछ…" : `${articles.length} धाराहरू`}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button onClick={() => { setActiveBranch(null); setActiveArticle(null); }} style={{ fontSize: "11px", color: "rgba(253,230,138,0.24)", background: "none", border: "none", cursor: "pointer" }}>Reset</button>
          <span style={{ color: "rgba(253,230,138,0.10)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "11px", color: "rgba(253,230,138,0.16)" }}>ESC</span>
        </div>

      </div>
    </>
  );
}
