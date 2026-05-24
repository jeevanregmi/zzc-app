"use client";

// /constitution — Living Nepal Constitution Tree
// Phase 1.5: Cinematic image-driven — forest atmosphere + organic hotspot overlays
// Set TREE_BG_IMAGE to a photorealistic banyan tree image for the full reference look.
// Without it, CSS multi-layer gradients create the forest atmosphere as a fallback.

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

// Drop your generated banyan tree image at /public/banyan-tree.jpg — no code change needed.
const TREE_BG_IMAGE = "/banyan-tree.jpg";

// ─── Branch layout (organic positions on tree, % of the tree canvas area) ─────

interface Branch {
  id:       string;
  nepali:   string;
  color:    string;
  x:        number; // left % within tree canvas
  y:        number; // top % within tree canvas
  keywords: string[];
  emoji:    string;
}

const BRANCHES: Branch[] = [
  {
    id: "rights",
    nepali: "मौलिक हक",
    color: "#4ade80",
    x: 33, y: 26, emoji: "⚖️",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "right to freedom",
               "right to", "समानता", "स्वतन्त्रता", "भाग ३"],
  },
  {
    id: "directives",
    nepali: "राज्यका निर्देशक सिद्धान्त",
    color: "#c084fc",
    x: 20, y: 38, emoji: "🧭",
    keywords: ["निर्देशक सिद्धान्त", "state directives", "directive principles",
               "state policy", "भाग ४", "निर्देशक"],
  },
  {
    id: "federalism",
    nepali: "संघीयता",
    color: "#fb923c",
    x: 52, y: 20, emoji: "🗺️",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "संघ",
               "भाग ५", "भाग ६", "federal structure"],
  },
  {
    id: "executive",
    nepali: "कार्यपालिका",
    color: "#fbbf24",
    x: 72, y: 30, emoji: "🏛️",
    keywords: ["कार्यपालिका", "executive", "प्रधानमन्त्री", "मन्त्रिपरिषद",
               "राष्ट्रपति", "भाग ७", "prime minister", "cabinet"],
  },
  {
    id: "legislature",
    nepali: "व्यवस्थापिका",
    color: "#818cf8",
    x: 83, y: 44, emoji: "🏛️",
    keywords: ["व्यवस्थापिका", "संसद", "प्रतिनिधि सभा", "राष्ट्रिय सभा",
               "parliament", "legislature", "भाग ८", "विधायन"],
  },
  {
    id: "judiciary",
    nepali: "न्यायपालिका",
    color: "#60a5fa",
    x: 68, y: 53, emoji: "⚖️",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "judiciary", "supreme court",
               "संवैधानिक इजलास", "भाग ११", "अदालत"],
  },
  {
    id: "constitutional-bodies",
    nepali: "संवैधानिक अंगहरू",
    color: "#f472b6",
    x: 37, y: 48, emoji: "🏛️",
    keywords: ["संवैधानिक अंग", "constitutional bodies", "commission", "आयोग",
               "भाग ३३", "निर्वाचन आयोग", "अख्तियार"],
  },
  {
    id: "local-govt",
    nepali: "स्थानीय शासन",
    color: "#34d399",
    x: 18, y: 55, emoji: "🏘️",
    keywords: ["स्थानीय", "नगरपालिका", "गाउँपालिका", "local government",
               "भाग २०", "भाग २१", "village council", "municipality"],
  },
  {
    id: "citizenship",
    nepali: "नागरिकता",
    color: "#f87171",
    x: 52, y: 37, emoji: "🪪",
    keywords: ["नागरिकता", "citizenship", "नागरिक", "भाग २", "nationality"],
  },
];

const QUICK_CATS = [
  { label: "मौलिक हक",               branchId: "rights"               },
  { label: "संघीयता",                 branchId: "federalism"           },
  { label: "व्यवस्थापिका",           branchId: "legislature"          },
  { label: "कार्यपालिका",            branchId: "executive"            },
  { label: "न्यायपालिका",            branchId: "judiciary"            },
  { label: "संवैधानिक अंगहरू",       branchId: "constitutional-bodies" },
  { label: "निर्देशक सिद्धान्त",     branchId: "directives"           },
  { label: "स्थानीय शासन",           branchId: "local-govt"           },
  { label: "नागरिकता",               branchId: "citizenship"          },
];

// ─── Keyword matching ─────────────────────────────────────────────────────────

function articleMatchesBranch(a: ConstitutionalFrameworkRecord, b: Branch): boolean {
  const haystack = [
    a.titleEnglish, a.titleNepali, a.part,
    ...(a.sectors            ?? []),
    ...(a.constitutionalThemes ?? []),
    ...(a.keywords            ?? []),
    ...(a.institutions        ?? []),
    ...(a.governanceStructures ?? []),
    ...(a.affectedGroups      ?? []),
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
    resize();
    addEventListener("resize", resize);

    const flies = Array.from({ length: 42 }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight * 0.88,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.22,
      r: 0.8 + Math.random() * 1.8,
      o: Math.random(),
      od: (Math.random() > 0.5 ? 1 : -1) * (0.008 + Math.random() * 0.015),
      hue: Math.random() > 0.6 ? 60 : 100,
    }));

    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const f of flies) {
        f.x += f.vx; f.y += f.vy;
        f.o += f.od;
        if (f.o > 1 || f.o < 0) f.od *= -1;
        if (f.x < 0) f.x = c.width;
        if (f.x > c.width) f.x = 0;
        if (f.y < 0) f.y = c.height * 0.88;
        if (f.y > c.height * 0.88) f.y = 0;

        const a = Math.max(0, Math.min(1, f.o));
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 8);
        grd.addColorStop(0, `hsla(${f.hue},100%,80%,${a * 0.6})`);
        grd.addColorStop(1, "transparent");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 8, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = `hsla(${f.hue},100%,92%,${a})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(id); removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute", inset: 0, zIndex: 8,
        pointerEvents: "none", opacity: 0.9,
      }}
    />
  );
}

// ─── Forest atmosphere ────────────────────────────────────────────────────────

const FOREST_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0, zIndex: 0,
  backgroundImage: TREE_BG_IMAGE ? `url(${TREE_BG_IMAGE})` : undefined,
  backgroundSize: "cover",
  backgroundPosition: "center bottom",
  backgroundColor: "#040a03",
};

const ATMOSPHERE_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
  background: TREE_BG_IMAGE
    ? [
        "radial-gradient(ellipse 100% 25% at 50% 0%, rgba(0,0,0,0.55) 0%, transparent 100%)",
        "radial-gradient(ellipse 30% 60% at 0% 50%, rgba(0,0,0,0.5) 0%, transparent 65%)",
        "radial-gradient(ellipse 30% 60% at 100% 50%, rgba(0,0,0,0.5) 0%, transparent 65%)",
      ].join(", ")
    : [
        "radial-gradient(ellipse 90% 90% at 88% -18%, rgba(255,145,25,0.38) 0%, transparent 50%)",
        "radial-gradient(ellipse 55% 38% at 43% 0%, rgba(110,175,225,0.2) 0%, transparent 48%)",
        "radial-gradient(ellipse 22% 55% at 50% 88%, rgba(75,38,4,0.55) 0%, transparent 52%)",
        "radial-gradient(ellipse 42% 38% at 28% 12%, rgba(8,28,4,0.75) 0%, transparent 55%)",
        "radial-gradient(ellipse 38% 90% at 0% 50%, rgba(2,8,1,0.95) 0%, transparent 52%)",
        "radial-gradient(ellipse 38% 90% at 100% 50%, rgba(2,8,1,0.95) 0%, transparent 52%)",
        "linear-gradient(178deg, #0c1a07 0%, #060e03 38%, #040c02 68%, #020700 100%)",
      ].join(", "),
};

const VIGNETTE_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
  background: [
    "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.7) 100%)",
    "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
  ].join(", "),
};

// ─── Branch label — ambient text, no pill/box ─────────────────────────────────

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
        background: "none",
        border: "none",
        padding: "10px 14px",
        cursor: "pointer",
        pointerEvents: "auto",
        opacity: isDimmed ? 0.18 : 1,
        transition: "opacity 0.35s ease",
        zIndex: isActive ? 40 : 20,
      }}
    >
      {/* Canopy-light glow — no border, no box */}
      <div style={{
        position: "absolute",
        inset: "-18px",
        borderRadius: "50%",
        background: isActive
          ? `radial-gradient(ellipse, ${branch.color}28 0%, transparent 65%)`
          : `radial-gradient(ellipse, ${branch.color}0e 0%, transparent 70%)`,
        transition: "background 0.45s ease",
        pointerEvents: "none",
      }} />
      {/* Volumetric shaft behind active label */}
      {isActive && (
        <div style={{
          position: "absolute",
          left: "50%", bottom: "100%",
          transform: "translateX(-50%)",
          width: "2px", height: "40px",
          background: `linear-gradient(to bottom, transparent, ${branch.color}40)`,
          pointerEvents: "none",
        }} />
      )}
      {/* Pure atmospheric text — the only visible element */}
      <span style={{
        position: "relative",
        fontSize: isActive ? "15px" : "13px",
        fontWeight: 800,
        color: isActive ? "#fff" : "rgba(255,255,255,0.78)",
        textShadow: isActive
          ? `0 0 12px ${branch.color}, 0 0 24px ${branch.color}99, 0 0 48px ${branch.color}44, 0 2px 8px rgba(0,0,0,0.95)`
          : `0 0 6px ${branch.color}66, 0 2px 6px rgba(0,0,0,0.85)`,
        fontFamily: "'Georgia', serif",
        whiteSpace: "nowrap",
        letterSpacing: "0.02em",
        transition: "all 0.3s ease",
        display: "block",
      }}>
        {branch.nepali}
      </span>
    </button>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ fontSize: "10px", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Detail panel — list mode + article detail mode ───────────────────────────

function DetailPanel({
  branch, articles, activeArticle, onArticleSelect, onBack, onClose, onNote,
}: {
  branch:         Branch;
  articles:       ConstitutionalFrameworkRecord[];
  activeArticle:  ConstitutionalFrameworkRecord | null;
  onArticleSelect: (a: ConstitutionalFrameworkRecord) => void;
  onBack:         () => void;
  onClose:        () => void;
  onNote:         (text: string) => void;
}) {
  const [noteText,    setNoteText]    = useState("");
  const [addingNote,  setAddingNote]  = useState(false);
  const [saving,      setSaving]      = useState(false);

  // Reset note state when article changes
  useEffect(() => { setNoteText(""); setAddingNote(false); }, [activeArticle?.articleId]);

  const submitNote = async () => {
    if (!noteText.trim()) return;
    setSaving(true);
    try { await onNote(noteText.trim()); setNoteText(""); setAddingNote(false); }
    finally { setSaving(false); }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0, top: "60px", bottom: 0,
        width: "clamp(300px, 28vw, 380px)",
        zIndex: 100,
        background: "rgba(6,12,5,0.94)",
        backdropFilter: "blur(24px)",
        borderLeft: `1px solid rgba(255,255,255,0.08)`,
        boxShadow: `-4px 0 40px rgba(0,0,0,0.7), inset 1px 0 0 rgba(255,255,255,0.04)`,
        display: "flex",
        flexDirection: "column",
        animation: "panel-slide-in 0.28s ease",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: "14px 18px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        background: `linear-gradient(135deg, ${branch.color}08, transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {activeArticle && (
            <button
              onClick={onBack}
              style={{
                background: "none", border: "none",
                color: "rgba(255,255,255,0.45)", cursor: "pointer",
                fontSize: "18px", padding: "0 4px",
                flexShrink: 0, lineHeight: 1,
              }}
              title="Back to list"
            >
              ←
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {activeArticle ? (
              <>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.38)", marginBottom: "2px" }}>
                  धारा {activeArticle.article}{activeArticle.clause ? ` · खण्ड ${activeArticle.clause}` : ""}
                </p>
                <h3 style={{
                  fontSize: "16px", fontWeight: 900, color: "white",
                  textShadow: `0 0 18px ${branch.color}55`,
                  lineHeight: 1.25, margin: 0,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {activeArticle.titleNepali || activeArticle.titleEnglish}
                </h3>
              </>
            ) : (
              <>
                <p style={{ fontSize: "10px", color: branch.color, marginBottom: "2px", fontWeight: 700, letterSpacing: "0.06em" }}>
                  शाखा
                </p>
                <h3 style={{
                  fontSize: "17px", fontWeight: 900, color: "white",
                  textShadow: `0 0 18px ${branch.color}55`,
                  lineHeight: 1.2, margin: 0,
                }}>
                  {branch.nepali}
                </h3>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "2px" }}>
                  {articles.length} धाराहरू
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)", border: "none",
              borderRadius: "50%", width: "28px", height: "28px",
              color: "rgba(255,255,255,0.5)", cursor: "pointer",
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {activeArticle?.part && (
          <div style={{
            marginTop: "8px",
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `${branch.color}1a`,
            border: `1px solid ${branch.color}33`,
            borderRadius: "6px", padding: "2px 8px",
            fontSize: "10px", color: branch.color, fontWeight: 600,
          }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: branch.color, display: "inline-block" }} />
            {activeArticle.part}
          </div>
        )}
      </div>

      {/* ── LIST MODE: article rows ───────────────────────────────────────────── */}
      {!activeArticle && (
        <div style={{ flex: 1, overflowY: "auto" }}>
          {articles.length === 0 ? (
            <p style={{ padding: "24px 18px", fontSize: "13px", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
              यस शाखामा धाराहरू फेला परेनन्
            </p>
          ) : (
            articles.map((a, i) => (
              <button
                key={a.articleId}
                onClick={() => onArticleSelect(a)}
                style={{
                  display: "flex", alignItems: "flex-start", gap: "12px",
                  width: "100%", textAlign: "left",
                  padding: "11px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  cursor: "pointer",
                  transition: "background 0.15s",
                  animation: `list-row-emerge 0.2s ease ${i * 0.025}s both`,
                }}
                onMouseEnter={e => (e.currentTarget.style.background = `${branch.color}0d`)}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Article number badge */}
                <span style={{
                  fontSize: "11px", fontWeight: 800,
                  color: branch.color,
                  minWidth: "32px", flexShrink: 0,
                  paddingTop: "1px",
                }}>
                  {a.article}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    fontSize: "13px", fontWeight: 600,
                    color: "rgba(255,255,255,0.88)",
                    lineHeight: 1.35, margin: 0,
                  }}>
                    {a.titleNepali || a.titleEnglish}
                  </p>
                  {a.plainNepaliSummary && (
                    <p style={{
                      fontSize: "11px", color: "rgba(255,255,255,0.38)",
                      marginTop: "3px", lineHeight: 1.5,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}>
                      {a.plainNepaliSummary}
                    </p>
                  )}
                </div>
                <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "14px", flexShrink: 0, alignSelf: "center" }}>›</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* ── DETAIL MODE: article content ─────────────────────────────────────── */}
      {activeArticle && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

            {activeArticle.originalText && (
              <Section label="मूल पाठ" color={branch.color}>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.7, fontStyle: "italic" }}>
                  {activeArticle.originalText}
                </p>
              </Section>
            )}

            {activeArticle.plainNepaliSummary && (
              <Section label="सरल व्याख्या" color="#fbbf24">
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>
                  {activeArticle.plainNepaliSummary}
                </p>
              </Section>
            )}

            {(activeArticle.rights?.length ?? 0) > 0 && (
              <Section label="अधिकार" color="#4ade80">
                {activeArticle.rights!.map((r, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>• {r}</p>
                ))}
              </Section>
            )}

            {(activeArticle.duties?.length ?? 0) > 0 && (
              <Section label="कर्तव्य" color="#fbbf24">
                {activeArticle.duties!.map((d, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>• {d}</p>
                ))}
              </Section>
            )}

            {(activeArticle.obligations?.length ?? 0) > 0 && (
              <Section label="दायित्व" color="#fb923c">
                {activeArticle.obligations!.map((o, i) => (
                  <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.72)", lineHeight: 1.6 }}>• {o}</p>
                ))}
              </Section>
            )}

            {(activeArticle.institutions?.length ?? 0) > 0 && (
              <Section label="सम्बन्धित निकाय" color="#818cf8">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                  {activeArticle.institutions!.join(" · ")}
                </p>
              </Section>
            )}

            {(activeArticle.relatedArticles?.length ?? 0) > 0 && (
              <Section label="सम्बन्धित धाराहरू" color="#22d3ee">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                  {activeArticle.relatedArticles!.join("  ·  ")}
                </p>
              </Section>
            )}

            {activeArticle.sourcePage != null && (
              <Section label="स्रोत पृष्ठ" color="rgba(255,255,255,0.28)">
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                  संविधानको पूर्ण पाठ, पृष्ठ {activeArticle.sourcePage}
                </p>
              </Section>
            )}

            {activeArticle.confidence != null && (
              <Section label="विश्वास स्तर" color="rgba(255,255,255,0.28)">
                <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.round(activeArticle.confidence * 100)}%`,
                    background: `linear-gradient(90deg, ${branch.color}, ${branch.color}bb)`,
                    borderRadius: "4px",
                  }} />
                </div>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>
                  {Math.round(activeArticle.confidence * 100)}%
                </p>
              </Section>
            )}

            {/* Sticky note */}
            {!addingNote ? (
              <button
                onClick={() => setAddingNote(true)}
                style={{
                  padding: "9px 12px",
                  background: "rgba(255,200,50,0.07)",
                  border: "1px dashed rgba(255,200,50,0.28)",
                  borderRadius: "8px",
                  color: "rgba(255,200,50,0.65)",
                  fontSize: "12px", cursor: "pointer", textAlign: "left",
                }}
              >
                📌 नोट थप्नुस्
              </button>
            ) : (
              <div style={{ background: "rgba(255,200,50,0.08)", border: "1px solid rgba(255,200,50,0.28)", borderRadius: "8px", padding: "10px" }}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="यहाँ नोट लेख्नुस्..."
                  rows={3}
                  style={{
                    width: "100%", background: "transparent",
                    border: "none", outline: "none", resize: "none",
                    color: "rgba(255,240,160,0.88)", fontSize: "13px",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button onClick={() => setAddingNote(false)} style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}>
                    रद्द
                  </button>
                  <button onClick={submitNote} disabled={saving || !noteText.trim()} style={{
                    fontSize: "12px", fontWeight: 700,
                    background: "rgba(255,200,50,0.28)", border: "none",
                    borderRadius: "6px", padding: "4px 12px",
                    color: "white", cursor: "pointer", opacity: saving ? 0.5 : 1,
                  }}>
                    {saving ? "सेव…" : "सेव गर्नुस्"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.07)",
            display: "flex", gap: "8px", flexShrink: 0,
          }}>
            <button
              onClick={onBack}
              style={{
                flex: 1, padding: "9px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "rgba(255,255,255,0.6)",
                fontSize: "12px", fontWeight: 600, cursor: "pointer",
              }}
            >
              ← सूचीमा फर्कनुस्
            </button>
            <button onClick={() => setAddingNote(true)} style={{
              flex: 1, padding: "9px",
              background: "rgba(255,200,50,0.1)",
              border: "1px solid rgba(255,200,50,0.25)",
              borderRadius: "8px", color: "rgba(255,200,50,0.85)",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
            }}>
              📌 नोट
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Parallax breathing hook ──────────────────────────────────────────────────
// All DOM updates happen outside React via direct style mutation — zero re-renders.

function useParallax(
  bgRef:     React.RefObject<HTMLDivElement | null>,
  labelsRef: React.RefObject<HTMLDivElement | null>,
  fogRef:    React.RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    const cur    = { x: 0.5, y: 0.5 };
    const target = { x: 0.5, y: 0.5 };
    let phase    = 0;
    let rafId    = 0;

    const BG_SHIFT    = 1.5;
    const LABEL_SHIFT = 0.65;
    const LERP        = isTouch ? 0 : 0.038;
    const BREATHE_AMP = 0.0035;
    const BREATHE_SPD = 0.00022;

    const onMouseMove = (e: MouseEvent) => {
      target.x = e.clientX / window.innerWidth;
      target.y = e.clientY / window.innerHeight;
    };

    if (!isTouch) window.addEventListener("mousemove", onMouseMove, { passive: true });

    const tick = () => {
      cur.x += (target.x - cur.x) * LERP;
      cur.y += (target.y - cur.y) * LERP;

      const dx = (cur.x - 0.5) * 2;
      const dy = (cur.y - 0.5) * 2;

      phase += BREATHE_SPD;
      const breathe = 1 + Math.sin(phase) * BREATHE_AMP;

      if (bgRef.current) {
        bgRef.current.style.transform =
          `scale(${breathe}) translate(${dx * BG_SHIFT}%, ${dy * BG_SHIFT}%)`;
      }

      if (labelsRef.current) {
        labelsRef.current.style.transform =
          `translate(${-dx * LABEL_SHIFT}%, ${-dy * LABEL_SHIFT}%)`;
      }

      if (fogRef.current) {
        fogRef.current.style.transform =
          `translate(${dx * 0.4}%, ${dy * 0.25}%) scaleX(${1 + Math.sin(phase * 0.4) * 0.008})`;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (!isTouch) window.removeEventListener("mousemove", onMouseMove);
    };
  }, [bgRef, labelsRef, fogRef]);
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [articles, setArticles]           = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [activeBranch, setActiveBranch]   = useState<Branch | null>(null);
  const [activeArticle, setActiveArticle] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [search, setSearch]               = useState("");
  const [mode, setMode]                   = useState<"tree" | "list">("tree");

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

  // Articles for the active branch (all, displayed in panel list)
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
    if (activeBranch?.id === b.id) {
      setActiveBranch(null);
      setActiveArticle(null);
    } else {
      setActiveBranch(b);
      setActiveArticle(null);
    }
  };

  const handleNote = async (text: string) => {
    if (!activeArticle || !activeBranch) return;
    await addDoc(collection(db, "tree_ui_notes"), {
      treeId:     "nepal-constitution",
      targetType: "article",
      targetId:   activeArticle.articleId,
      branchId:   activeBranch.id,
      noteText:   text,
      status:     "active",
      createdAt:  new Date().toISOString(),
    });
  };

  const panelOpen = activeBranch !== null;

  // ESC: article detail → list → forest
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null);  return; }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [activeArticle, activeBranch]);

  return (
    <>
      {/* ── CSS keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes panel-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes trunk-glow {
          0%, 100% { text-shadow: 0 0 20px #f59e0b, 0 0 40px rgba(245,158,11,0.4); }
          50%       { text-shadow: 0 0 30px #f59e0b, 0 0 60px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2); }
        }
        @keyframes float-note {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50%       { transform: rotate(-2deg) translateY(-4px); }
        }
        @keyframes leaf-drift-1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.18; }
          33%       { transform: translate(6px, -8px) rotate(5deg); opacity: 0.22; }
          66%       { transform: translate(-4px, 4px) rotate(-3deg); opacity: 0.15; }
        }
        @keyframes leaf-drift-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); opacity: 0.12; }
          40%       { transform: translate(-8px, -5px) rotate(-6deg); opacity: 0.18; }
          75%       { transform: translate(5px, 8px) rotate(4deg); opacity: 0.1; }
        }
        @keyframes list-row-emerge {
          from { opacity: 0; transform: translateX(8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .branch-label:hover span { color: #fff !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#020600", overflow: "hidden" }}>

        {/* ── Forest background ────────────────────────────────────────────────── */}
        <div
          ref={bgRef}
          style={{
            ...FOREST_STYLE,
            willChange: "transform",
            transformOrigin: "center center",
          }}
        />
        <div style={ATMOSPHERE_STYLE} />

        {/* ── Fog drift layer ───────────────────────────────────────────────────── */}
        <div
          ref={fogRef}
          style={{
            position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
            willChange: "transform",
            background: [
              "radial-gradient(ellipse 70% 18% at 30% 72%, rgba(180,210,160,0.035) 0%, transparent 65%)",
              "radial-gradient(ellipse 55% 14% at 70% 80%, rgba(160,200,140,0.025) 0%, transparent 60%)",
            ].join(", "),
          }}
        />

        <div style={VIGNETTE_STYLE} />

        {/* ── Foreground leaf silhouettes ───────────────────────────────────────── */}
        <div style={{ position: "absolute", inset: 0, zIndex: 11, pointerEvents: "none" }}>
          {[
            { left: "3%",  top: "15%", size: 60, anim: "leaf-drift-1 18s ease-in-out infinite" },
            { left: "88%", top: "8%",  size: 70, anim: "leaf-drift-2 22s ease-in-out infinite 3s" },
            { left: "6%",  top: "55%", size: 50, anim: "leaf-drift-1 25s ease-in-out infinite 8s" },
            { left: "91%", top: "48%", size: 65, anim: "leaf-drift-2 20s ease-in-out infinite 12s" },
            { left: "1%",  top: "75%", size: 55, anim: "leaf-drift-1 30s ease-in-out infinite 5s" },
            { left: "85%", top: "72%", size: 72, anim: "leaf-drift-2 16s ease-in-out infinite 9s" },
          ].map((l, i) => (
            <div key={i} style={{
              position: "absolute",
              left: l.left, top: l.top,
              width: l.size, height: l.size,
              borderRadius: "60% 40% 70% 30% / 50% 60% 40% 55%",
              background: "radial-gradient(ellipse, rgba(20,60,10,0.5) 0%, rgba(10,40,5,0.15) 60%, transparent 100%)",
              animation: l.anim,
              filter: "blur(1px)",
            }} />
          ))}
        </div>

        <FireflyCanvas />

        {/* ── Top navigation ────────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px",
          zIndex: 200,
          background: "rgba(4,10,3,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px",
          gap: "16px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{ fontSize: "16px", fontWeight: 900, color: "#4ade80", letterSpacing: "-0.03em" }}>ZZC</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>JANTA</span>
          </div>

          <div style={{ flex: 1, position: "relative", maxWidth: "420px" }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="खोज्नुहोस्... (धारा, विषय, अधिकार)"
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "24px",
                padding: "8px 16px 8px 38px",
                color: "white", fontSize: "13px", outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>
              🔍
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{
            display: "flex", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px", padding: "3px", gap: "2px", flexShrink: 0,
          }}>
            {(["tree", "list"] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "5px 14px", borderRadius: "20px", fontSize: "12px",
                  fontWeight: 600, border: "none", cursor: "pointer",
                  background: mode === m ? "#4ade80" : "transparent",
                  color: mode === m ? "#000" : "rgba(255,255,255,0.5)",
                  transition: "all 0.2s",
                }}
              >
                {m === "tree" ? "Tree Mode" : "List Mode"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tree canvas ───────────────────────────────────────────────────────── */}
        <div
          style={{
            position: "fixed", top: "60px", left: 0,
            right: panelOpen ? "clamp(300px,28vw,380px)" : 0,
            bottom: "80px",
            zIndex: 10,
            transition: "right 0.3s ease",
          }}
          onClick={e => {
            if (e.target === e.currentTarget) {
              setActiveBranch(null);
              setActiveArticle(null);
            }
          }}
        >
          {/* Trunk text */}
          <div style={{
            position: "absolute", left: "50%", top: "60%",
            transform: "translate(-50%, -50%)",
            textAlign: "center", pointerEvents: "none", userSelect: "none", zIndex: 15,
          }}>
            <p style={{
              fontSize: "clamp(22px, 3.5vw, 36px)", fontWeight: 900,
              color: "#f59e0b",
              animation: "trunk-glow 4s ease-in-out infinite",
              letterSpacing: "0.04em", lineHeight: 1.25,
            }}>
              नेपालको
            </p>
            <p style={{
              fontSize: "clamp(16px, 2.5vw, 26px)", fontWeight: 700,
              color: "#fde68a",
              textShadow: "0 0 16px rgba(245,158,11,0.5)",
              letterSpacing: "0.08em",
            }}>
              संविधान
            </p>
          </div>

          {/* Root words */}
          <div style={{
            position: "absolute", bottom: "4%", left: "50%",
            transform: "translateX(-50%)",
            display: "flex", gap: "clamp(12px, 2.5vw, 28px)",
            pointerEvents: "none", zIndex: 15,
          }}>
            {["जनता", "सार्वभौमसत्ता", "लोकतन्त्र", "स्वतन्त्रता", "संविधानको मूल आधार"].map(w => (
              <span key={w} style={{
                fontSize: "clamp(9px, 1.1vw, 12px)", fontWeight: 600,
                color: "rgba(253,230,138,0.65)",
                textShadow: "0 0 8px rgba(245,158,11,0.35)",
                whiteSpace: "nowrap",
              }}>{w}</span>
            ))}
          </div>

          {/* Nepal flag */}
          <div style={{
            position: "absolute", left: "12%", bottom: "14%",
            fontSize: "clamp(20px, 2.5vw, 32px)",
            zIndex: 15, pointerEvents: "none", opacity: 0.7,
          }}>🇳🇵</div>

          {/* Branch labels — counter-parallax container */}
          <div
            ref={labelsRef}
            style={{
              position: "absolute", inset: 0,
              willChange: "transform",
              pointerEvents: "none",
            }}
          >
            {BRANCHES.map(branch => {
              const isActive = activeBranch?.id === branch.id;
              const isDimmed = activeBranch !== null && !isActive;
              return (
                <BranchLabel
                  key={branch.id}
                  branch={branch}
                  isActive={isActive}
                  isDimmed={isDimmed}
                  onClick={() => handleBranchClick(branch)}
                />
              );
            })}
          </div>

          {/* Explore hint */}
          {!activeBranch && !loading && (
            <div style={{
              position: "absolute", bottom: "16%", left: "50%",
              transform: "translateX(-50%)",
              color: "rgba(255,255,255,0.28)",
              fontSize: "12px", fontWeight: 500,
              textAlign: "center", pointerEvents: "none", zIndex: 15,
            }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {/* Search results overlay */}
          {search.trim() && searchResults.length > 0 && (
            <div style={{
              position: "absolute", top: "8px", left: "50%",
              transform: "translateX(-50%)",
              width: "min(500px, 90%)",
              background: "rgba(5,14,3,0.95)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              zIndex: 60,
              maxHeight: "55%", overflowY: "auto",
            }}>
              <p style={{ padding: "12px 16px 6px", fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
                {searchResults.length} धाराहरू फेला
              </p>
              {searchResults.map(a => (
                <button
                  key={a.articleId}
                  onClick={() => {
                    const branch = BRANCHES.find(b => articleMatchesBranch(a, b));
                    if (branch) setActiveBranch(branch);
                    setActiveArticle(a);
                    setSearch("");
                  }}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    padding: "10px 16px",
                    background: "transparent", border: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginRight: "8px" }}>
                    धारा {a.article}
                  </span>
                  <span style={{ fontSize: "13px", color: "white", fontWeight: 600 }}>
                    {a.titleNepali || a.titleEnglish}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* List mode overlay */}
          {mode === "list" && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 55,
              background: "rgba(4,10,3,0.95)", backdropFilter: "blur(20px)",
              overflowY: "auto", padding: "16px",
            }}>
              <div style={{ maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "4px" }}>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", marginBottom: "8px" }}>
                  {articles.length} धाराहरू · Nepal Constitution 2015/2072 BS
                </p>
                {articles.map(a => {
                  const branch = BRANCHES.find(b => articleMatchesBranch(a, b));
                  return (
                    <button
                      key={a.articleId}
                      onClick={() => {
                        if (branch) setActiveBranch(branch);
                        setActiveArticle(a);
                        setMode("tree");
                      }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "12px",
                        padding: "10px 14px",
                        background: "rgba(255,255,255,0.03)",
                        border: `1px solid ${branch ? branch.color + "20" : "rgba(255,255,255,0.06)"}`,
                        borderRadius: "10px", cursor: "pointer",
                        textAlign: "left", width: "100%",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                    >
                      <span style={{
                        fontSize: "11px", fontWeight: 800,
                        color: branch?.color ?? "rgba(255,255,255,0.3)",
                        minWidth: "40px",
                      }}>
                        {a.article}
                      </span>
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>
                          {a.titleNepali || a.titleEnglish}
                        </p>
                        {a.plainNepaliSummary && (
                          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px", lineHeight: 1.5 }}>
                            {a.plainNepaliSummary.slice(0, 80)}…
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Right detail panel ────────────────────────────────────────────────── */}
        {activeBranch && (
          <DetailPanel
            branch={activeBranch}
            articles={branchArticles}
            activeArticle={activeArticle}
            onArticleSelect={a => setActiveArticle(a)}
            onBack={() => setActiveArticle(null)}
            onClose={() => { setActiveBranch(null); setActiveArticle(null); }}
            onNote={handleNote}
          />
        )}

        {/* ── Bottom bar ────────────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: "36px", left: 0,
          right: panelOpen ? "clamp(300px,28vw,380px)" : 0,
          height: "34px", zIndex: 150,
          background: "rgba(4,10,3,0.85)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          paddingLeft: "16px", paddingRight: "16px", gap: "8px",
          transition: "right 0.3s ease",
        }}>
          {activeBranch ? (
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: activeBranch.color }}>● {activeBranch.nepali}</span>
              {activeArticle && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>›</span>
                  <span style={{ color: "white" }}>धारा {activeArticle.article}</span>
                </>
              )}
            </span>
          ) : (
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
              नेपालको संविधान २०७२ · {articles.length} धाराहरू
              {loading && " · लोड हुँदैछ…"}
            </span>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={() => { setActiveBranch(null); setActiveArticle(null); }}
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}
          >
            Reset View
          </button>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)" }}>ESC छोड्नुस्</span>
        </div>

        {/* ── Quick access pills ────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0,
          right: panelOpen ? "clamp(300px,28vw,380px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(3,8,2,0.92)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
          paddingLeft: "12px", gap: "6px",
          overflowX: "auto",
          transition: "right 0.3s ease",
        }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", whiteSpace: "nowrap", marginRight: "4px" }}>
            छिटो पहुँचे
          </span>
          {QUICK_CATS.map(cat => {
            const branch = cat.branchId ? BRANCHES.find(b => b.id === cat.branchId) : null;
            const isActive = branch && activeBranch?.id === branch.id;
            return (
              <button
                key={cat.label}
                onClick={() => { if (branch) handleBranchClick(branch); }}
                style={{
                  padding: "3px 11px", borderRadius: "20px",
                  background: isActive ? `${branch!.color}25` : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isActive ? branch!.color + "55" : "rgba(255,255,255,0.08)"}`,
                  color: isActive ? branch!.color : "rgba(255,255,255,0.6)",
                  fontSize: "11px", fontWeight: 600,
                  whiteSpace: "nowrap", cursor: branch ? "pointer" : "default",
                  flexShrink: 0, transition: "all 0.2s",
                }}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
}
