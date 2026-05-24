"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useVaultAuth } from "../../../../hooks/vault/useVaultAuth";
import { useLearningMode } from "../../../../contexts/LearningModeContext";
import {
  computeAllPartsHealth,
  HEALTH_COLORS,
  type BranchHealth,
  type BranchHealthState,
} from "../../../../lib/constitution/healthComputer";
import {
  computeAllStructuralProfiles,
  type PartStructuralProfile,
} from "../../../../lib/constitution/structuralComputer";
import type { IntelligenceRecord } from "../../../../lib/types/intelligence-record";
import type { CivicAtom } from "../../../../lib/types/atoms";
import type { ConstitutionalFrameworkRecord } from "../../../../lib/types/constitutional-framework";
import { atomsToIntelRecords } from "../../../../lib/vault/atomToIntelBridge";
import { PARTS_META } from "./partsMeta";
import { UPLOAD_GUIDANCE, type VaultCategory } from "../../../../lib/constitution/uploadGuidance";
import {
  computeAllDeepLearnProfiles,
  type PartDeepLearnProfile,
  type MetricDeepLearn,
} from "../../../../lib/constitution/deepLearnComputer";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTION_ORDER: BranchHealthState[] = [
  "healthy", "fruiting", "budding", "weak", "yellow", "dry", "damaged", "unknown",
];

const PART_NUMBERS = Array.from({ length: 35 }, (_, i) => i + 1);

// ─── Layer 1: Structural metric definitions ───────────────────────────────────

interface StructMetricDef {
  id:      string;
  icon:    string;
  label:   string;
  color:   string;
  value:   (p: PartStructuralProfile) => number | string;
  explain: string; // {val} replaced with actual value
}

const STRUCT_METRICS: StructMetricDef[] = [
  {
    id: "atoms", icon: "⬡", label: "ज्ञान इकाई", color: "#c084fc",
    value: p => p.atomCount,
    explain: "यस भागमा {val} वटा संवैधानिक अंश (धारा र खण्डहरू) उत्खनन गरिएका छन्। यी नै संविधानका आधारभूत ज्ञान इकाइहरू हुन्।",
  },
  {
    id: "dharas", icon: "📜", label: "धाराहरू", color: "#a78bfa",
    value: p => p.dharaCount,
    explain: "यस भागमा {val} वटा फरक-फरक धाराहरू छन्। प्रत्येक धाराले एक विशेष संवैधानिक प्रावधान समेट्छ।",
  },
  {
    id: "density", icon: "◉", label: "घनत्व", color: "#818cf8",
    value: p => p.clauseDensity,
    explain: "प्रति धारामा औसत {val} वटा खण्डहरू छन्। घनत्व बढी हुनु भनेको त्यो धारा जटिल र विस्तृत छ।",
  },
  {
    id: "rights", icon: "⚖", label: "अधिकार", color: "#4ade80",
    value: p => p.rightsComplexity,
    explain: "यस भागले नागरिकलाई {val} वटा अधिकार प्रदान गर्छ। यो संख्या बढी हुनु नागरिक हकको बलियो संरक्षण हो।",
  },
  {
    id: "institutions", icon: "🏛", label: "संस्थाहरू", color: "#60a5fa",
    value: p => p.institutionCount,
    explain: "यस भागले {val} वटा फरक सरकारी निकाय वा संस्थाको उल्लेख गर्छ। यी संस्थाहरू संविधान कार्यान्वयनका जिम्मेवार हुन्।",
  },
  {
    id: "deps", icon: "🔗", label: "सम्बन्ध", color: "#38bdf8",
    value: p => p.dependencyCount,
    explain: "यस भागका धाराहरू संविधानका अन्य {val} वटा धाराहरूसँग जोडिएका छन्। धेरै सम्बन्ध = जटिल संवैधानिक संरचना।",
  },
  {
    id: "groups", icon: "👥", label: "समूह", color: "#34d399",
    value: p => p.affectedGroupCount,
    explain: "यस भागले {val} वटा फरक नागरिक समूहलाई प्रत्यक्ष असर गर्छ — महिला, दलित, जनजाति, युवा आदि।",
  },
];

// ─── Layer 2: Live intelligence metric definitions ────────────────────────────

interface LiveMetricDef {
  id:      string;
  icon:    string;
  label:   string;
  color:   string;
  value:   (h: BranchHealth) => number;
  explain: string;
}

const LIVE_METRICS: LiveMetricDef[] = [
  {
    id: "total", icon: "📋", label: "कुल अभिलेख", color: "#e2e8f0",
    value: h => h.totalRecords,
    explain: "यस भागसँग सम्बन्धित {count} वटा सरकारी प्रतिबद्धता, योजना वा कार्यक्रम फेला परेका छन्।",
  },
  {
    id: "positive", icon: "✓", label: "सकारात्मक", color: "#4ade80",
    value: h => h.positiveCount,
    explain: "लागू भएका, प्रगतिमा रहेका वा थालिएका {count} वटा राम्रा कामहरू छन्। बढी हुनु = सरकार वाचामा खरो।",
  },
  {
    id: "warning", icon: "⚠", label: "चेतावनी", color: "#fde047",
    value: h => h.warningCount,
    explain: "ढिलाइ भएका वा विवादमा परेका {count} वटा कामहरू — ध्यान दिन जरुरी।",
  },
  {
    id: "funding", icon: "₹", label: "कोष", color: "#60a5fa",
    value: h => h.fundingCount,
    explain: "बजेट वा आर्थिक सहयोगसँग सम्बन्धित {count} वटा अभिलेख। पैसा छुट्याउनु राम्रो — खर्च हुनु महत्वपूर्ण।",
  },
  {
    id: "progress", icon: "→", label: "प्रगति", color: "#a78bfa",
    value: h => h.progressCount,
    explain: "काम थालिएको वा अगाडि बढिरहेको देखाउने {count} वटा अभिलेख — वास्तवमा भइरहेको कामको संकेत।",
  },
  {
    id: "contradiction", icon: "✗", label: "विरोध", color: "#f87171",
    value: h => h.contradictionCount,
    explain: "संविधान वा वाचाविपरीत गएका, असफल वा रद्द भएका {count} वटा काम — गम्भीर समस्याको संकेत।",
  },
];

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "3px", overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "3px" }} />
    </div>
  );
}

// ─── Metric → deep learn key mapping ─────────────────────────────────────────

type DeepLearnKey = keyof Omit<PartDeepLearnProfile, "partNumber">;

const STRUCT_DEEP_KEY: Record<string, DeepLearnKey | null> = {
  atoms:        null,           // statistical only
  dharas:       "dharaList",
  density:      null,           // statistical only
  rights:       "rights",
  institutions: "institutions",
  deps:         "dependencies",
  groups:       "affectedGroups",
};

// ─── Deep Learn Card ─────────────────────────────────────────────────────────

function DeepLearnCard({ data, metricLabel, simpleText }: {
  data:        MetricDeepLearn | null;
  metricLabel: string;
  simpleText:  string;   // fallback for statistical metrics
}) {
  const [showAll, setShowAll] = useState(false);

  if (!data) {
    return (
      <div style={{ background: "rgba(8,40,50,0.90)", border: "1px solid #0e7490", borderRadius: "9px", padding: "10px 13px", marginTop: "6px" }}>
        <p style={{ fontSize: "12px", color: "rgba(103,232,249,0.88)", lineHeight: 1.72, margin: 0 }}>{simpleText}</p>
      </div>
    );
  }

  const count      = data.entities.length;
  const meaning    = data.citizenMeaning.replace("{count}", String(count));
  const showLimit  = 10;
  const visible    = showAll ? data.entities : data.entities.slice(0, showLimit);
  const remaining  = data.entities.length - showLimit;

  return (
    <div style={{ background: "rgba(6,30,40,0.95)", border: "1px solid #0e7490", borderRadius: "10px", padding: "13px 14px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "11px" }}>

      {/* Section 1 — Entities */}
      {data.entities.length > 0 && (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 800, color: "#67e8f9", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 7px" }}>
            संविधानले उल्लेख गरेका {metricLabel} ({count})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {visible.map((e, i) => (
              <span key={i} style={{ fontSize: "10px", color: "rgba(103,232,249,0.80)", background: "rgba(14,116,144,0.18)", border: "1px solid rgba(14,116,144,0.35)", borderRadius: "5px", padding: "2px 8px" }}>
                {e}
              </span>
            ))}
            {!showAll && remaining > 0 && (
              <button onClick={() => setShowAll(true)} style={{ fontSize: "10px", color: "#06b6d4", background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>
                +{remaining} अझ
              </button>
            )}
          </div>
        </div>
      )}

      {/* Section 2 — Citizen meaning */}
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#4ade80", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>किन सम्बन्धित?</p>
        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, margin: 0 }}>{meaning}</p>
      </div>

      {/* Section 3 — Dhara refs */}
      {data.sourceArticles.length > 0 && (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 7px" }}>
            संविधानले कहाँ भनेको? ({data.sourceArticles.length} धारा)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {data.sourceArticles.map(a => (
              <span key={a} style={{ fontSize: "10px", color: "rgba(251,191,36,0.80)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: "5px", padding: "2px 7px" }}>
                धारा {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section 4 — AI reasoning */}
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>AI ले कसरी बुझ्यो?</p>
        <p style={{ fontSize: "10.5px", color: "rgba(167,139,250,0.75)", lineHeight: 1.65, margin: 0 }}>{data.aiReasoning}</p>
      </div>

      {/* Section 5 — Real-world impact */}
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#f472b6", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>वास्तविक जीवन सम्बन्ध</p>
        <p style={{ fontSize: "10.5px", color: "rgba(244,114,182,0.75)", lineHeight: 1.65, margin: 0 }}>{data.whyItMatters}</p>
      </div>
    </div>
  );
}

// ─── Layer 1: Structural metric pill ─────────────────────────────────────────

function StructPill({
  m, profile, activeId, onToggle, learnOn,
}: {
  m: StructMetricDef; profile: PartStructuralProfile;
  activeId: string | null; onToggle: (id: string) => void; learnOn: boolean;
}) {
  const val      = m.value(profile);
  const isActive = activeId === m.id;
  return (
    <button
      onClick={() => learnOn ? onToggle(m.id) : undefined}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        minWidth: "52px", padding: "7px 9px",
        background: isActive && learnOn ? `${m.color}20` : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive && learnOn ? m.color + "55" : m.color + "18"}`,
        borderRadius: "8px", cursor: learnOn ? "pointer" : "default",
        position: "relative",
      }}
    >
      <span style={{ fontSize: "15px", fontWeight: 900, color: m.color, lineHeight: 1 }}>{val}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>
        {m.icon} {m.label}
      </span>
      {learnOn && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "13px", height: "13px", borderRadius: "50%", background: isActive ? "#06b6d4" : "#164e63", border: "1px solid #0e7490", color: isActive ? "#fff" : "#67e8f9", fontSize: "8px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isActive ? "×" : "?"}
        </span>
      )}
    </button>
  );
}

// ─── Layer 2: Live metric pill ────────────────────────────────────────────────

function LivePill({
  m, health, activeId, onToggle, learnOn,
}: {
  m: LiveMetricDef; health: BranchHealth;
  activeId: string | null; onToggle: (id: string) => void; learnOn: boolean;
}) {
  const val      = m.value(health);
  const isActive = activeId === m.id;
  return (
    <button
      onClick={() => learnOn ? onToggle(m.id) : undefined}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        minWidth: "52px", padding: "7px 9px",
        background: isActive && learnOn ? `${m.color}20` : "rgba(255,255,255,0.03)",
        border: `1px solid ${isActive && learnOn ? m.color + "55" : m.color + "18"}`,
        borderRadius: "8px", cursor: learnOn ? "pointer" : "default",
        position: "relative",
      }}
    >
      <span style={{ fontSize: "15px", fontWeight: 900, color: m.color, lineHeight: 1 }}>{val}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>
        {m.icon} {m.label}
      </span>
      {learnOn && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "13px", height: "13px", borderRadius: "50%", background: isActive ? "#06b6d4" : "#164e63", border: "1px solid #0e7490", color: isActive ? "#fff" : "#67e8f9", fontSize: "8px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isActive ? "×" : "?"}
        </span>
      )}
    </button>
  );
}

// ─── Upload guidance helpers ──────────────────────────────────────────────────

const PRIORITY_STYLE = {
  high:   { bg: "rgba(239,68,68,0.12)",   dot: "#ef4444", label: "उच्च" },
  medium: { bg: "rgba(251,191,36,0.12)",  dot: "#fbbf24", label: "मध्यम" },
  low:    { bg: "rgba(148,163,184,0.10)", dot: "#94a3b8", label: "कम" },
} as const;

const CATEGORY_COLOR: Record<VaultCategory, string> = {
  intelligence: "#4ade80",
  research:     "#60a5fa",
  legal:        "#a78bfa",
  finance:      "#fbbf24",
  strategy:     "#f472b6",
  other:        "#94a3b8",
};

function UploadGuidanceSection({ partNumber }: { partNumber: number }) {
  const recs = UPLOAD_GUIDANCE[partNumber] ?? [];
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (recs.length === 0) return null;

  const copyTemplate = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", padding: 0 }}
      >
        <span style={{ fontSize: "13px" }}>📥</span>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#60a5fa", flex: 1 }}>
          अब के upload गर्ने? <span style={{ fontWeight: 400, color: "rgba(96,165,250,0.55)" }}>({recs.length} सुझाव)</span>
        </span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", transform: open ? "none" : "rotate(-90deg)", transition: "transform 0.18s" }}>▼</span>
      </button>

      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
          {recs.map((rec, i) => {
            const pStyle = PRIORITY_STYLE[rec.priority];
            const catCol = CATEGORY_COLOR[rec.category];
            const copyKey = `${partNumber}-${i}`;
            return (
              <div key={i} style={{ background: "rgba(96,165,250,0.04)", border: "1px solid rgba(96,165,250,0.10)", borderRadius: "8px", padding: "10px 12px" }}>

                {/* Title + priority */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{rec.title}</span>
                    <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.25)", display: "block", marginTop: "1px" }}>{rec.titleEn}</span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: pStyle.dot, background: pStyle.bg, border: `1px solid ${pStyle.dot}28`, borderRadius: "6px", padding: "2px 7px" }}>
                    {pStyle.label}
                  </span>
                </div>

                {/* Category + tags */}
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: catCol, background: `${catCol}18`, border: `1px solid ${catCol}28`, borderRadius: "5px", padding: "2px 7px" }}>
                    {rec.category}
                  </span>
                  {rec.tags.map(tag => (
                    <span key={tag} style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 6px", fontFamily: "monospace" }}>
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* Template + copy */}
                <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ flex: 1, fontSize: "10.5px", color: "rgba(255,255,255,0.42)", lineHeight: 1.65, fontFamily: "monospace" }}>{rec.template}</span>
                  <button
                    onClick={() => copyTemplate(rec.template, copyKey)}
                    style={{ flexShrink: 0, background: copied === copyKey ? "rgba(74,222,128,0.10)" : "rgba(96,165,250,0.10)", border: `1px solid ${copied === copyKey ? "#4ade8030" : "rgba(96,165,250,0.22)"}`, borderRadius: "5px", color: copied === copyKey ? "#4ade80" : "#60a5fa", fontSize: "9px", fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}
                  >
                    {copied === copyKey ? "✓ copied" : "copy"}
                  </button>
                </div>

                {/* Direct upload button per recommendation */}
                <a
                  href="/vault/documents?upload=1"
                  style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 12px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "7px", fontSize: "11px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}
                >
                  📤 यो document अहिले upload गर्नुहोस्
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Layer divider label ──────────────────────────────────────────────────────

function LayerLabel({ label, sub, color }: { label: string; sub: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
      <span style={{ fontSize: "9px", fontWeight: 800, color, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.22)" }}>{sub}</span>
    </div>
  );
}

// ─── Part card — two layers ───────────────────────────────────────────────────

function PartCard({
  health, structural, deepLearn, learnOn,
}: {
  health:     BranchHealth;
  structural: PartStructuralProfile;
  deepLearn:  PartDeepLearnProfile | undefined;
  learnOn:    boolean;
}) {
  const title = PARTS_META[health.partNumber] ?? `भाग ${health.partNumber}`;
  const col   = HEALTH_COLORS[health.state];

  const [activeStruct, setActiveStruct] = useState<string | null>(null);
  const [activeLive,   setActiveLive]   = useState<string | null>(null);

  const toggleStruct = (id: string) => { setActiveStruct(p => p === id ? null : id); setActiveLive(null); };
  const toggleLive   = (id: string) => { setActiveLive(p => p === id ? null : id);   setActiveStruct(null); };

  const activeStructMeta = STRUCT_METRICS.find(m => m.id === activeStruct);
  const activeLiveMeta   = LIVE_METRICS.find(m => m.id === activeLive);

  // Resolve deep learn data for the active structural metric
  const activeDeepLearnData: MetricDeepLearn | null = (() => {
    if (!activeStructMeta || !deepLearn) return null;
    const key = STRUCT_DEEP_KEY[activeStructMeta.id];
    if (!key) return null;
    return deepLearn[key] as MetricDeepLearn;
  })();

  return (
    <div style={{ background: "rgba(255,255,255,0.022)", border: `1px solid ${col.dot}25`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "13px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: col.dot, background: `${col.dot}18`, padding: "2px 7px", borderRadius: "8px" }}>
              भाग {health.partNumber}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
          </div>
          <ScoreBar score={health.healthScore} color={col.dot} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "22px", fontWeight: 900, color: col.dot, margin: 0, lineHeight: 1 }}>{health.healthScore}</p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>/ 100</p>
        </div>
      </div>

      {/* ── Layer 1: Structural ──────────────────────────────────────────────── */}
      <div style={{ background: "rgba(192,132,252,0.04)", border: "1px solid rgba(192,132,252,0.12)", borderRadius: "8px", padding: "10px 12px" }}>
        <LayerLabel label="तह १ · संरचना" sub="constitution atoms only" color="#c084fc" />
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {STRUCT_METRICS.map(m => (
            <StructPill key={m.id} m={m} profile={structural} activeId={activeStruct} onToggle={toggleStruct} learnOn={learnOn} />
          ))}
        </div>
        {learnOn && activeStructMeta && (
          <DeepLearnCard
            data={activeDeepLearnData}
            metricLabel={activeStructMeta.label}
            simpleText={activeStructMeta.explain.replace("{val}", String(activeStructMeta.value(structural)))}
          />
        )}
      </div>

      {/* ── Layer 2: Live Intelligence ───────────────────────────────────────── */}
      <div style={{ background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.10)", borderRadius: "8px", padding: "10px 12px" }}>
        <LayerLabel label="तह २ · जीवित बुद्धि" sub="vault_civic_atoms + janta" color={col.dot} />
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {LIVE_METRICS.map(m => (
            <LivePill key={m.id} m={m} health={health} activeId={activeLive} onToggle={toggleLive} learnOn={learnOn} />
          ))}
        </div>
        {learnOn && activeLiveMeta && (
          <DeepLearnCard
            data={null}
            metricLabel={activeLiveMeta.label}
            simpleText={activeLiveMeta.explain.replace("{count}", String(activeLiveMeta.value(health)))}
          />
        )}

        {/* Reason lines */}
        {health.reasonLines.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "10px", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {health.reasonLines.map((line, i) => (
              <span key={i} style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.38)", fontFamily: "monospace", lineHeight: 1.6 }}>{line}</span>
            ))}
          </div>
        )}

        {health.totalRecords === 0 && (
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", margin: "4px 0 0" }}>
            कुनै प्रकाशित अभिलेख छैन — तह २ डेटा उपलब्ध नभएको
          </p>
        )}
      </div>

      {/* ── Upload guidance ──────────────────────────────────────────────────── */}
      <UploadGuidanceSection partNumber={health.partNumber} />

      {health.lastUpdated && (
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.16)", margin: 0 }}>
          अन्तिम अद्यावधिक: {new Date(health.lastUpdated).toLocaleDateString("en-GB")}
        </p>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function HealthSection({
  state, parts, structMap, deepLearnMap, learnOn,
}: {
  state:        BranchHealthState;
  parts:        BranchHealth[];
  structMap:    Map<number, PartStructuralProfile>;
  deepLearnMap: Map<number, PartDeepLearnProfile>;
  learnOn:      boolean;
}) {
  const col = HEALTH_COLORS[state];
  const [collapsed, setCollapsed] = useState(false);

  const EMPTY_STRUCT: PartStructuralProfile = { partNumber: 0, atomCount: 0, dharaCount: 0, clauseDensity: 0, rightsComplexity: 0, institutionCount: 0, dutyCount: 0, obligationCount: 0, dependencyCount: 0, governanceScope: [], keywordCount: 0, affectedGroupCount: 0 };

  return (
    <section style={{ borderBottom: "2px solid rgba(255,255,255,0.05)" }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{ width: "100%", textAlign: "left", background: `linear-gradient(90deg,${col.dot}12 0%,transparent 55%)`, border: "none", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "14px 24px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}
      >
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.dot, flexShrink: 0, boxShadow: `0 0 8px ${col.dot}` }} />
        <span style={{ fontSize: "15px", fontWeight: 800, color: col.dot, flex: 1 }}>{col.label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color: parts.length === 0 ? "rgba(255,255,255,0.18)" : col.dot, background: parts.length === 0 ? "rgba(255,255,255,0.04)" : `${col.dot}18`, border: `1px solid ${col.dot}28`, borderRadius: "20px", padding: "2px 10px" }}>
          {parts.length} भाग
        </span>
        <span style={{ color: "rgba(255,255,255,0.20)", fontSize: "12px", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {!collapsed && (
        <div style={{ padding: "16px 24px 20px" }}>
          {parts.length === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)", fontStyle: "italic", margin: 0 }}>
              यस अवस्थामा कुनै भाग छैन
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "14px" }}>
              {parts.map(h => (
                <PartCard
                  key={h.partNumber}
                  health={h}
                  structural={structMap.get(h.partNumber) ?? { ...EMPTY_STRUCT, partNumber: h.partNumber }}
                  deepLearn={deepLearnMap.get(h.partNumber)}
                  learnOn={learnOn}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Learning banner ──────────────────────────────────────────────────────────

function LearnBanner() {
  return (
    <div style={{ margin: "0 24px", background: "rgba(8,40,50,0.70)", border: "1px solid #0e7490", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "11px 16px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
      <span style={{ fontSize: "15px", flexShrink: 0 }}>🌿</span>
      <p style={{ fontSize: "11.5px", color: "rgba(103,232,249,0.80)", margin: 0, lineHeight: 1.65 }}>
        <strong style={{ color: "#67e8f9" }}>सिकाइ मोड:</strong> प्रत्येक कार्डमा <strong style={{ color: "#67e8f9" }}>?</strong> भएको संख्यामा थिच्नुहोस् — त्यो संख्याको वास्तविक अर्थ सजिलो नेपालीमा देखिनेछ।
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HealthDebugClient() {
  const { user }          = useVaultAuth();
  const { on: learnOn }   = useLearningMode();
  const [healthMap,      setHealthMap]      = useState<Map<number, BranchHealth>>(new Map());
  const [structMap,      setStructMap]      = useState<Map<number, PartStructuralProfile>>(new Map());
  const [deepLearnMap,   setDeepLearnMap]   = useState<Map<number, PartDeepLearnProfile>>(new Map());
  const [loading,        setLoading]        = useState(true);
  const [totalIntel,     setTotalIntel]     = useState(0);
  const [totalAtoms,     setTotalAtoms]     = useState(0);
  const [totalCivicAtoms, setTotalCivicAtoms] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      // New system: vault_civic_atoms
      getDocs(collection(db, "vault_civic_atoms")),
      // Old system: janta_intelligence
      getDocs(query(collection(db, "janta_intelligence"), where("publishToJanta", "==", true))),
      // Static skeleton: constitutional_framework
      getDocs(query(collection(db, "constitutional_framework"), where("publishToJanta", "==", true))),
    ])
      .then(([civicSnap, intelSnap, constitSnap]) => {
        const civicAtoms = civicSnap.docs.map(d => ({ id: d.id, ...d.data() } as CivicAtom));
        const jantaRecs  = intelSnap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));
        const constAtoms = constitSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord));

        // Bridge civic atoms into intel record shape, then merge with janta records
        const bridged  = atomsToIntelRecords(civicAtoms);
        const allIntel = [...bridged, ...jantaRecs];

        setTotalCivicAtoms(civicAtoms.length);
        setTotalIntel(jantaRecs.length);
        setTotalAtoms(constAtoms.length);
        setHealthMap(computeAllPartsHealth(PART_NUMBERS, allIntel));
        setStructMap(computeAllStructuralProfiles(PART_NUMBERS, constAtoms));
        setDeepLearnMap(computeAllDeepLearnProfiles(PART_NUMBERS, constAtoms));
      })
      .catch(err => console.error("[HealthDebug]", err))
      .finally(() => setLoading(false));
  }, [user]);

  // Group by health state
  const grouped = new Map<BranchHealthState, BranchHealth[]>();
  for (const state of SECTION_ORDER) grouped.set(state, []);
  for (const h of healthMap.values()) grouped.get(h.state)?.push(h);
  for (const [, arr] of grouped) arr.sort((a, b) => b.healthScore - a.healthScore);

  const totalParts = healthMap.size;
  const withData   = Array.from(healthMap.values()).filter(h => h.state !== "unknown").length;
  const avgScore   = totalParts > 0
    ? Math.round(Array.from(healthMap.values()).reduce((s, h) => s + h.healthScore, 0) / totalParts)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#020805", color: "#fde68a", fontFamily: "system-ui, sans-serif" }}>

      {/* ── OS Navigation Bar ───────────────────────────────────────────────── */}
      <div style={{ background: "rgba(0,0,0,0.60)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)", fontWeight: 700, letterSpacing: "0.12em", marginRight: "6px" }}>TREE OS</span>
        {[
          { href: "/vault/documents",          label: "📄 Documents",       color: "#60a5fa" },
          { href: "/vault/admin",              label: "👁 Review",          color: "#fb923c" },
          { href: "/vault/atoms",              label: "⚛ Atoms OS",        color: "#67e8f9" },
          { href: "/vault/constitution/health",label: "🩺 Branch Health",   color: "#4ade80", active: true },
          { href: "/vault/constitution",       label: "📜 Framework",       color: "#a78bfa" },
          { href: "/constitution",             label: "🌳 Public Tree",     color: "#fbbf24" },
          { href: "/vault/vision",             label: "🧠 Vision",          color: "#f472b6" },
          { href: "/vault/products",           label: "📦 Products",        color: "#34d399" },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            fontSize: "11px", fontWeight: 700, padding: "4px 10px",
            borderRadius: "20px", border: `1px solid ${n.color}${n.active ? "90" : "35"}`,
            color: n.active ? "#fff" : n.color,
            background: n.active ? `${n.color}22` : "transparent",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* ── OS Page Info Bar ────────────────────────────────────────────────── */}
      <div style={{ background: "rgba(74,222,128,0.05)", borderBottom: "1px solid rgba(74,222,128,0.12)", padding: "10px 24px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "9px", fontWeight: 800, color: "#4ade80", letterSpacing: "0.10em", textTransform: "uppercase", marginRight: "4px" }}>reads from</span>
          {["vault_civic_atoms", "janta_intelligence", "constitutional_framework"].map(col => (
            <span key={col} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(74,222,128,0.70)", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.20)", borderRadius: "4px", padding: "1px 6px" }}>
              {col}
            </span>
          ))}
        </div>
        <Link href="/constitution" style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)", borderRadius: "20px", padding: "4px 12px", textDecoration: "none", whiteSpace: "nowrap" }}>
          🌳 Public Tree हेर्नुहोस् →
        </Link>
      </div>

      {/* Header */}
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.28)" }}>
        <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", letterSpacing: "0.14em", fontWeight: 700, margin: "0 0 5px" }}>
          VAULT · CONSTITUTION · HEALTH
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 5px" }}>शाखा स्वास्थ्य नियन्त्रण कक्ष</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", margin: 0 }}>
          तीन तहको बुद्धि — Civic Atoms · Janta Intelligence · Constitutional Skeleton
        </p>

        {!loading && (
          <div style={{ display: "flex", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              { label: "⚛ Civic Atoms",       value: totalCivicAtoms, color: "#67e8f9" },
              { label: "📋 Janta Records",     value: totalIntel,      color: "#4ade80" },
              { label: "📜 Constitution Atoms", value: totalAtoms,      color: "#c084fc" },
              { label: "डेटा भएका भागहरू",    value: withData,        color: "#fbbf24" },
              { label: "औसत स्वास्थ्य",       value: `${avgScore}/100`, color: "#60a5fa" },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "20px", fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {learnOn && <LearnBanner />}

      {/* Two-layer architecture legend */}
      {!loading && (
        <div style={{ padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#c084fc", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "rgba(192,132,252,0.80)" }}>तह १ — संरचना (constitution atoms)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "rgba(74,222,128,0.80)" }}>तह २ — जीवित बुद्धि (intelligence records)</span>
          </div>
        </div>
      )}

      {/* Sections */}
      {loading ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "13px" }}>दुवै तह लोड गर्दै...</p>
        </div>
      ) : (
        SECTION_ORDER.map(state => (
          <HealthSection
            key={state}
            state={state}
            parts={grouped.get(state) ?? []}
            structMap={structMap}
            deepLearnMap={deepLearnMap}
            learnOn={learnOn}
          />
        ))
      )}
    </div>
  );
}
