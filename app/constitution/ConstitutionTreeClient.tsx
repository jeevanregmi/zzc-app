"use client";

// /constitution — Living Nepal Constitution Tree
// Phase 1.5: Cinematic image-driven — forest atmosphere + organic hotspot overlays
// Set TREE_BG_IMAGE to a photorealistic banyan tree image for the full reference look.
// Without it, CSS multi-layer gradients create the forest atmosphere as a fallback.

import { useState, useEffect, useRef, useMemo } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import type { ConstitutionalFrameworkRecord } from "../../lib/types/constitutional-framework";

// ── Swap in a real generated/photorealistic banyan tree image here ─────────────
// e.g. "/banyan-tree.jpg" or a CDN URL — leave empty for CSS fallback
const TREE_BG_IMAGE = "";

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
    id: "women", nepali: "महिला", color: "#f472b6",
    x: 31, y: 27, emoji: "👩",
    keywords: ["महिलाको हक", "women", "gender equality", "महिला"],
  },
  {
    id: "children", nepali: "बालबालिका", color: "#a78bfa",
    x: 52, y: 21, emoji: "👶",
    keywords: ["बालबालिकाको हक", "children", "child rights", "बालबालिका"],
  },
  {
    id: "education", nepali: "शिक्षा", color: "#60a5fa",
    x: 67, y: 27, emoji: "📚",
    keywords: ["शिक्षाको हक", "education", "right to education", "शिक्षा"],
  },
  {
    id: "rights", nepali: "मौलिक हक", color: "#4ade80",
    x: 40, y: 35, emoji: "⚖️",
    keywords: ["मौलिक हक", "fundamental rights", "right to equality", "समानता"],
  },
  {
    id: "federalism", nepali: "संघीयता", color: "#fb923c",
    x: 62, y: 36, emoji: "🗺️",
    keywords: ["संघीय संरचना", "federalism", "province", "pradesh", "संघीयता"],
  },
  {
    id: "health", nepali: "स्वास्थ्य", color: "#f87171",
    x: 22, y: 42, emoji: "🏥",
    keywords: ["स्वास्थ्यको हक", "health", "right to health", "स्वास्थ्य"],
  },
  {
    id: "employment", nepali: "रोजगारी", color: "#fbbf24",
    x: 76, y: 41, emoji: "💼",
    keywords: ["रोजगारीको हक", "employment", "right to employment", "रोजगारी"],
  },
  {
    id: "inclusion", nepali: "समावेशिता", color: "#c084fc",
    x: 19, y: 54, emoji: "🤝",
    keywords: ["दलितको हक", "समावेशी", "inclusion", "dalit", "समावेशिता"],
  },
  {
    id: "justice", nepali: "न्यायपालिका", color: "#818cf8",
    x: 36, y: 52, emoji: "⚖️",
    keywords: ["न्यायपालिका", "सर्वोच्च अदालत", "judiciary", "supreme court", "संवैधानिक इजलास"],
  },
  {
    id: "environment", nepali: "वातावरण", color: "#34d399",
    x: 63, y: 53, emoji: "🌿",
    keywords: ["वातावरणको हक", "environment", "forest", "वातावरण"],
  },
  {
    id: "governance", nepali: "सुशासन", color: "#22d3ee",
    x: 81, y: 53, emoji: "🏛️",
    keywords: ["सुशासन", "good governance", "accountability", "transparency"],
  },
];

const QUICK_CATS = [
  { label: "मौलिक हक",                  branchId: "rights"      },
  { label: "मौलिक कर्तव्य",             branchId: null          },
  { label: "राज्यका निर्देशक सिद्धान्त", branchId: null          },
  { label: "संघीयता",                    branchId: "federalism"  },
  { label: "व्यायपालिका",               branchId: "justice"     },
  { label: "व्यवस्थापिका",              branchId: null          },
  { label: "कार्यपालिका",               branchId: "governance"  },
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

// ─── Article leaf positions around branch hotspot (in % units) ────────────────

function leafOffsets(count: number, bx: number, by: number) {
  return Array.from({ length: Math.min(count, 14) }, (_, i) => {
    const angle = (i / Math.min(count, 14)) * Math.PI * 2 - Math.PI / 2;
    let r = 10 + (i % 3) * 2.5;
    let dx = Math.cos(angle) * r;
    let dy = Math.sin(angle) * r;
    // pull back from edges
    if (bx + dx < 6)  dx = 6  - bx;
    if (bx + dx > 93) dx = 93 - bx;
    if (by + dy < 8)  dy = 8  - by;
    if (by + dy > 84) dy = 84 - by;
    return { dx, dy };
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
      hue: Math.random() > 0.6 ? 60 : 100, // warm gold or cool green
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

// ─── Forest atmosphere (CSS background when no image) ─────────────────────────

const FOREST_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0,
  background: TREE_BG_IMAGE ? `url(${TREE_BG_IMAGE}) center/cover no-repeat` : [
    "radial-gradient(ellipse 90% 90% at 88% -18%, rgba(255,145,25,0.38) 0%, transparent 50%)",
    "radial-gradient(ellipse 55% 38% at 43% 0%, rgba(110,175,225,0.2) 0%, transparent 48%)",
    "radial-gradient(ellipse 22% 55% at 50% 88%, rgba(75,38,4,0.55) 0%, transparent 52%)",
    "radial-gradient(ellipse 42% 38% at 28% 12%, rgba(8,28,4,0.75) 0%, transparent 55%)",
    "radial-gradient(ellipse 38% 90% at 0% 50%, rgba(2,8,1,0.95) 0%, transparent 52%)",
    "radial-gradient(ellipse 38% 90% at 100% 50%, rgba(2,8,1,0.95) 0%, transparent 52%)",
    "linear-gradient(178deg, #0c1a07 0%, #060e03 38%, #040c02 68%, #020700 100%)",
  ].join(", "),
  zIndex: 0,
};

// Atmospheric overlay (darkens top for text contrast + vignette)
const VIGNETTE_STYLE: React.CSSProperties = {
  position: "absolute", inset: 0, zIndex: 9, pointerEvents: "none",
  background: [
    "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.7) 100%)",
    "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.4) 100%)",
  ].join(", "),
};

// ─── Branch label ─────────────────────────────────────────────────────────────

function BranchLabel({
  branch, isActive, isDimmed, articleCount, onClick,
}: {
  branch: Branch; isActive: boolean; isDimmed: boolean;
  articleCount: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute",
        left: `${branch.x}%`,
        top: `${branch.y}%`,
        transform: `translate(-50%, -50%) scale(${isActive ? 1.12 : 1})`,
        zIndex: isActive ? 40 : 20,
        opacity: isDimmed ? 0.28 : 1,
        display: "flex",
        alignItems: "center",
        gap: "7px",
        padding: "7px 16px",
        borderRadius: "100px",
        background: isActive
          ? `rgba(0,0,0,0.75)`
          : "rgba(0,0,0,0.48)",
        border: `1.5px solid ${isActive ? branch.color : "rgba(255,255,255,0.18)"}`,
        boxShadow: isActive
          ? `0 0 24px ${branch.color}90, 0 0 60px ${branch.color}30, inset 0 0 16px ${branch.color}15`
          : `0 2px 12px rgba(0,0,0,0.6)`,
        backdropFilter: "blur(12px)",
        color: "white",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        textShadow: isActive ? `0 0 14px ${branch.color}` : "0 1px 4px rgba(0,0,0,0.8)",
        cursor: "pointer",
        transition: "all 0.25s ease",
        whiteSpace: "nowrap",
      }}
    >
      {/* Pulsing leaf indicator */}
      <span style={{
        width: "8px", height: "8px", borderRadius: "50%",
        background: branch.color,
        boxShadow: `0 0 ${isActive ? "12px" : "5px"} ${branch.color}`,
        display: "inline-block",
        flexShrink: 0,
        animation: isActive ? "pulse-dot 1.5s ease-in-out infinite" : "none",
      }} />
      <span>{branch.nepali}</span>
      {isActive && articleCount > 0 && (
        <span style={{
          fontSize: "10px", fontWeight: 800,
          background: branch.color, color: "black",
          borderRadius: "10px", padding: "1px 6px",
        }}>
          {articleCount}
        </span>
      )}
    </button>
  );
}

// ─── Article leaf (small circle) around branch ────────────────────────────────

function ArticleLeaf({
  article, branch, dx, dy, isActive, index, onClick,
}: {
  article: ConstitutionalFrameworkRecord;
  branch: Branch; dx: number; dy: number;
  isActive: boolean; index: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={article.titleNepali}
      style={{
        position: "absolute",
        left: `${branch.x + dx}%`,
        top:  `${branch.y + dy}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 35,
        width: "40px", height: "40px",
        borderRadius: "50%",
        background: isActive ? branch.color : "rgba(0,0,0,0.65)",
        border: `2px solid ${branch.color}`,
        boxShadow: isActive
          ? `0 0 20px ${branch.color}, 0 0 40px ${branch.color}60`
          : `0 0 8px ${branch.color}70`,
        color: isActive ? "#000" : "#fff",
        fontSize: "11px", fontWeight: 800,
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", backdropFilter: "blur(6px)",
        animation: `leaf-emerge 0.35s ease ${index * 0.04}s both`,
        transition: "all 0.2s ease",
      }}
    >
      {article.article}
    </button>
  );
}

// ─── Floating article detail panel (right sidebar) ────────────────────────────

function DetailPanel({
  article, branch, onClose, onNote,
}: {
  article: ConstitutionalFrameworkRecord;
  branch: Branch;
  onClose: () => void;
  onNote:  (text: string) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [saving, setSaving] = useState(false);

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
        width: "clamp(300px, 28vw, 360px)",
        zIndex: 100,
        background: "rgba(8,16,6,0.92)",
        backdropFilter: "blur(24px)",
        borderLeft: `1px solid rgba(255,255,255,0.1)`,
        boxShadow: `-4px 0 40px rgba(0,0,0,0.6), inset 1px 0 0 rgba(255,255,255,0.05)`,
        display: "flex",
        flexDirection: "column",
        animation: "panel-slide-in 0.3s ease",
        overflow: "hidden",
      }}
    >
      {/* Panel header */}
      <div style={{
        padding: "16px 20px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: `linear-gradient(135deg, rgba(0,0,0,0.3), transparent)`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>
              धारा {article.article}{article.clause ? ` खण्ड ${article.clause}` : ""}
            </p>
            <h3 style={{
              fontSize: "18px", fontWeight: 900, color: "white",
              textShadow: `0 0 20px ${branch.color}60`,
              lineHeight: 1.2,
            }}>
              {article.titleNepali || article.titleEnglish}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "none",
              borderRadius: "50%", width: "28px", height: "28px",
              color: "rgba(255,255,255,0.6)", cursor: "pointer",
              fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
        {article.part && (
          <div style={{
            marginTop: "8px",
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: `${branch.color}22`,
            border: `1px solid ${branch.color}44`,
            borderRadius: "6px",
            padding: "3px 10px",
            fontSize: "11px",
            color: branch.color,
            fontWeight: 600,
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: branch.color, display: "inline-block" }} />
            {article.part}
          </div>
        )}
      </div>

      {/* Panel content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>

        {article.originalText && (
          <Section label="मूल पाठ" color={branch.color}>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.85)", lineHeight: 1.7, fontStyle: "italic" }}>
              {article.originalText}
            </p>
          </Section>
        )}

        {article.plainNepaliSummary && (
          <Section label="सरल व्याख्या" color="#fbbf24">
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.8)", lineHeight: 1.7 }}>
              {article.plainNepaliSummary}
            </p>
          </Section>
        )}

        {(article.rights?.length ?? 0) > 0 && (
          <Section label="अधिकार" color="#4ade80">
            {article.rights!.map((r, i) => (
              <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                • {r}
              </p>
            ))}
          </Section>
        )}

        {(article.duties?.length ?? 0) > 0 && (
          <Section label="कर्तव्य" color="#fbbf24">
            {article.duties!.map((d, i) => (
              <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                • {d}
              </p>
            ))}
          </Section>
        )}

        {(article.obligations?.length ?? 0) > 0 && (
          <Section label="दायित्व" color="#fb923c">
            {article.obligations!.map((o, i) => (
              <p key={i} style={{ fontSize: "12px", color: "rgba(255,255,255,0.75)", lineHeight: 1.6 }}>
                • {o}
              </p>
            ))}
          </Section>
        )}

        {(article.institutions?.length ?? 0) > 0 && (
          <Section label="सम्बन्धित निकाय" color="#818cf8">
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              {article.institutions!.join(" · ")}
            </p>
          </Section>
        )}

        {(article.relatedArticles?.length ?? 0) > 0 && (
          <Section label="सम्बन्धित धाराहरू" color="#22d3ee">
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>
              {article.relatedArticles!.join("  ·  ")}
            </p>
          </Section>
        )}

        {article.sourcePage != null && (
          <Section label="स्रोत पृष्ठ" color="rgba(255,255,255,0.3)">
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>
              संविधानको पूर्ण पाठ, पृष्ठ {article.sourcePage}
            </p>
          </Section>
        )}

        {article.confidence != null && (
          <Section label="विश्वास स्तर" color="rgba(255,255,255,0.3)">
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.round(article.confidence * 100)}%`,
                background: `linear-gradient(90deg, ${branch.color}, ${branch.color}cc)`,
                borderRadius: "4px",
              }} />
            </div>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
              {Math.round(article.confidence * 100)}%
            </p>
          </Section>
        )}

        {/* Sticky note area */}
        {!addingNote ? (
          <button
            onClick={() => setAddingNote(true)}
            style={{
              padding: "10px 14px",
              background: "rgba(255,200,50,0.08)",
              border: "1px dashed rgba(255,200,50,0.3)",
              borderRadius: "10px",
              color: "rgba(255,200,50,0.7)",
              fontSize: "12px",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            📌 नोट थप्नुस् (Sticky note)
          </button>
        ) : (
          <div style={{ background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.3)", borderRadius: "10px", padding: "10px" }}>
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="यहाँ नोट लेख्नुस्..."
              rows={3}
              style={{
                width: "100%", background: "transparent",
                border: "none", outline: "none", resize: "none",
                color: "rgba(255,240,160,0.9)", fontSize: "13px",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button onClick={() => setAddingNote(false)} style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}>
                रद्द
              </button>
              <button onClick={submitNote} disabled={saving || !noteText.trim()} style={{
                fontSize: "12px", fontWeight: 700,
                background: "rgba(255,200,50,0.3)", border: "none",
                borderRadius: "6px", padding: "4px 12px",
                color: "white", cursor: "pointer", opacity: saving ? 0.5 : 1,
              }}>
                {saving ? "सेव…" : "सेव गर्नुस्"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div style={{
        padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex", gap: "8px", flexShrink: 0,
      }}>
        <button style={{
          flex: 1, padding: "10px",
          background: branch.color, border: "none",
          borderRadius: "10px", color: "black",
          fontSize: "12px", fontWeight: 700, cursor: "pointer",
        }}>
          पूरा विवरण हेर्नुहोस्
        </button>
        <button onClick={() => setAddingNote(true)} style={{
          flex: 1, padding: "10px",
          background: "rgba(255,200,50,0.15)",
          border: "1px solid rgba(255,200,50,0.3)",
          borderRadius: "10px", color: "rgba(255,200,50,0.9)",
          fontSize: "12px", fontWeight: 700, cursor: "pointer",
        }}>
          📌 नोट लेख्नुहोस्
        </button>
      </div>
    </div>
  );
}

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function ConstitutionTreeClient() {
  const [articles, setArticles]       = useState<ConstitutionalFrameworkRecord[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeBranch, setActiveBranch] = useState<Branch | null>(null);
  const [activeArticle, setActiveArticle] = useState<ConstitutionalFrameworkRecord | null>(null);
  const [search, setSearch]           = useState("");
  const [mode, setMode]               = useState<"tree" | "list">("tree");

  // Load all published articles
  useEffect(() => {
    getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true)))
      .then(snap => {
        const docs = snap.docs.map(d => d.data() as ConstitutionalFrameworkRecord);
        docs.sort((a, b) => (a.article ?? 0) - (b.article ?? 0));
        setArticles(docs);
      })
      .finally(() => setLoading(false));
  }, []);

  // Articles for the active branch (max 14 leaves)
  const branchArticles = useMemo(() => {
    if (!activeBranch) return [];
    return articles
      .filter(a => articleMatchesBranch(a, activeBranch))
      .slice(0, 14);
  }, [activeBranch, articles]);

  // Search results (list mode or search overlay)
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

  const handleArticleClick = (a: ConstitutionalFrameworkRecord) => {
    setActiveArticle(a);
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

  // ESC: article → branch → forest
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeArticle) { setActiveArticle(null); return; }
      if (activeBranch)  { setActiveBranch(null);  return; }
    };
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }, [activeArticle, activeBranch]);

  const activeBranchForArticle = activeBranch
    ?? (activeArticle
      ? BRANCHES.find(b => articleMatchesBranch(activeArticle, b)) ?? BRANCHES[0]
      : BRANCHES[0]);

  return (
    <>
      {/* ── CSS keyframes ────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes leaf-emerge {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes panel-slide-in {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 6px currentColor; }
          50%       { box-shadow: 0 0 18px currentColor, 0 0 30px currentColor; }
        }
        @keyframes trunk-glow {
          0%, 100% { text-shadow: 0 0 20px #f59e0b, 0 0 40px rgba(245,158,11,0.4); }
          50%       { text-shadow: 0 0 30px #f59e0b, 0 0 60px rgba(245,158,11,0.6), 0 0 80px rgba(245,158,11,0.2); }
        }
        @keyframes float-note {
          0%, 100% { transform: rotate(-2deg) translateY(0); }
          50%       { transform: rotate(-2deg) translateY(-4px); }
        }
        .branch-label:hover { opacity: 1 !important; transform: translate(-50%,-50%) scale(1.06) !important; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, background: "#020600", overflow: "hidden" }}>

        {/* ── Forest background ─────────────────────────────────────────────── */}
        <div style={FOREST_STYLE} />
        <div style={VIGNETTE_STYLE} />
        <FireflyCanvas />

        {/* ── Top navigation ────────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, height: "60px",
          zIndex: 200,
          background: "rgba(4,10,3,0.88)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", paddingLeft: "20px", paddingRight: "20px",
          gap: "16px",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <span style={{
              fontSize: "16px", fontWeight: 900, color: "#4ade80",
              letterSpacing: "-0.03em",
            }}>ZZC</span>
            <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>JANTA</span>
          </div>

          {/* Search */}
          <div style={{
            flex: 1, position: "relative", maxWidth: "420px",
          }}>
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
                color: "white",
                fontSize: "13px",
                outline: "none",
              }}
            />
            <span style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.35)", fontSize: "14px" }}>
              🔍
            </span>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Mode toggle */}
          <div style={{
            display: "flex", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "24px", padding: "3px", gap: "2px",
            flexShrink: 0,
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

          {/* Note button */}
          <button style={{
            padding: "7px 14px", borderRadius: "24px",
            background: "rgba(255,200,50,0.1)",
            border: "1px solid rgba(255,200,50,0.25)",
            color: "rgba(255,200,50,0.85)",
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
            flexShrink: 0,
          }}>
            📌 नोट लेख्नुहोस्
          </button>
        </div>

        {/* ── Tree canvas (everything positioned within this area) ──────────── */}
        <div
          style={{
            position: "fixed", top: "60px", left: 0, right: activeArticle ? "clamp(300px,28vw,360px)" : 0,
            bottom: "100px",
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
          {/* ── Trunk text ─────────────────────────────────────────────────── */}
          <div style={{
            position: "absolute", left: "50%", top: "60%",
            transform: "translate(-50%, -50%)",
            textAlign: "center", pointerEvents: "none", userSelect: "none",
            zIndex: 15,
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

          {/* ── Root words at base ─────────────────────────────────────────── */}
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

          {/* ── Nepal flag ─────────────────────────────────────────────────── */}
          <div style={{
            position: "absolute", left: "12%", bottom: "14%",
            fontSize: "clamp(20px, 2.5vw, 32px)",
            zIndex: 15, pointerEvents: "none", opacity: 0.7,
          }}>🇳🇵</div>

          {/* ── Sample sticky note ─────────────────────────────────────────── */}
          <div style={{
            position: "absolute", left: "58%", top: "19%",
            zIndex: 50, pointerEvents: "none",
            animation: "float-note 5s ease-in-out infinite",
          }}>
            <div style={{
              background: "#fef08a",
              boxShadow: "2px 4px 16px rgba(0,0,0,0.5)",
              padding: "10px 14px",
              borderRadius: "3px",
              maxWidth: "160px",
              transform: "rotate(-3deg)",
              fontSize: "11px",
              color: "#1a1a00",
              lineHeight: 1.5,
              fontWeight: 500,
            }}>
              📌 यो शाखामा एनीमेशन थप गर्नुस्!
              <span style={{ display: "block", marginTop: "6px", fontSize: "10px", color: "#555", fontStyle: "italic" }}>– Admin Note</span>
            </div>
          </div>

          {/* ── Branch labels ──────────────────────────────────────────────── */}
          {BRANCHES.map(branch => {
            const bArticles = articles.filter(a => articleMatchesBranch(a, branch));
            const isActive  = activeBranch?.id === branch.id;
            const isDimmed  = activeBranch !== null && !isActive;
            return (
              <BranchLabel
                key={branch.id}
                branch={branch}
                isActive={isActive}
                isDimmed={isDimmed}
                articleCount={bArticles.length}
                onClick={() => handleBranchClick(branch)}
              />
            );
          })}

          {/* ── Article leaves (appear when branch active) ─────────────────── */}
          {activeBranch && branchArticles.map((article, i) => {
            const offsets = leafOffsets(branchArticles.length, activeBranch.x, activeBranch.y);
            const { dx, dy } = offsets[i] ?? { dx: 0, dy: 0 };
            return (
              <ArticleLeaf
                key={article.articleId}
                article={article}
                branch={activeBranch}
                dx={dx} dy={dy}
                isActive={activeArticle?.articleId === article.articleId}
                index={i}
                onClick={() => handleArticleClick(article)}
              />
            );
          })}

          {/* ── No articles hint ───────────────────────────────────────────── */}
          {!activeBranch && !loading && (
            <div style={{
              position: "absolute", bottom: "16%", left: "50%",
              transform: "translateX(-50%)",
              color: "rgba(255,255,255,0.3)",
              fontSize: "12px", fontWeight: 500,
              textAlign: "center", pointerEvents: "none",
              zIndex: 15,
            }}>
              शाखा छुनुस् र खोज्नुस् · Click any branch to explore
            </div>
          )}

          {/* ── Search results overlay ─────────────────────────────────────── */}
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
              maxHeight: "55%",
              overflowY: "auto",
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
                    cursor: "pointer",
                    transition: "background 0.15s",
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

          {/* ── List mode overlay ──────────────────────────────────────────── */}
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

        {/* ── Right detail panel ────────────────────────────────────────────── */}
        {activeArticle && activeBranch && (
          <DetailPanel
            article={activeArticle}
            branch={activeBranch}
            onClose={() => setActiveArticle(null)}
            onNote={handleNote}
          />
        )}

        {/* ── Bottom bar (breadcrumb + controls) ───────────────────────────── */}
        <div style={{
          position: "fixed", bottom: "44px", left: 0,
          right: activeArticle ? "clamp(300px,28vw,360px)" : 0,
          height: "36px", zIndex: 150,
          background: "rgba(4,10,3,0.85)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          paddingLeft: "16px", paddingRight: "16px",
          gap: "8px",
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
            style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", background: "none", border: "none", cursor: "pointer" }}
          >
            Reset View
          </button>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>ESC छोड्नुस्</span>
        </div>

        {/* ── Quick access pills ────────────────────────────────────────────── */}
        <div style={{
          position: "fixed", bottom: 0, left: 0,
          right: activeArticle ? "clamp(300px,28vw,360px)" : 0,
          height: "44px", zIndex: 150,
          background: "rgba(3,8,2,0.92)", backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          display: "flex", alignItems: "center",
          paddingLeft: "12px", gap: "6px",
          overflowX: "auto",
          transition: "right 0.3s ease",
        }}>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", marginRight: "4px" }}>
            छिटो पहुँचे
          </span>
          {QUICK_CATS.map(cat => {
            const branch = cat.branchId ? BRANCHES.find(b => b.id === cat.branchId) : null;
            const count  = branch
              ? articles.filter(a => articleMatchesBranch(a, branch)).length
              : null;
            return (
              <button
                key={cat.label}
                onClick={() => { if (branch) handleBranchClick(branch); }}
                style={{
                  padding: "4px 12px", borderRadius: "20px",
                  background: branch && activeBranch?.id === branch.id
                    ? `${branch.color}30`
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${branch && activeBranch?.id === branch.id
                    ? branch.color + "60"
                    : "rgba(255,255,255,0.1)"}`,
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "11px", fontWeight: 600,
                  whiteSpace: "nowrap", cursor: branch ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: "5px",
                  flexShrink: 0,
                }}
              >
                {cat.label}
                {count !== null && (
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.4)" }}>({count})</span>
                )}
              </button>
            );
          })}
        </div>

      </div>
    </>
  );
}
