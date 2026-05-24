"use client";

import { useEffect, useState } from "react";
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
import type { IntelligenceRecord } from "../../../../lib/types/intelligence-record";
import { PARTS_META } from "./partsMeta";

// ─── Metric definitions ───────────────────────────────────────────────────────

interface MetricDef {
  id:      string;
  icon:    string;
  label:   string;
  color:   string;
  value:   (h: BranchHealth) => number;
  explain: string; // {count} is replaced with actual number
}

const METRICS: MetricDef[] = [
  {
    id:    "total",
    icon:  "📋",
    label: "कुल अभिलेख",
    color: "#e2e8f0",
    value: h => h.totalRecords,
    explain:
      "यस भागसँग सम्बन्धित {count} वटा सरकारी प्रतिबद्धता, योजना वा कार्यक्रम फेला परेका छन्। " +
      "संख्या जति बढी, त्यति बढी यस क्षेत्रमा सरकारको ध्यान गएको देखिन्छ।",
  },
  {
    id:    "positive",
    icon:  "✓",
    label: "सकारात्मक",
    color: "#4ade80",
    value: h => h.positiveCount,
    explain:
      "यो शाखामा सफलतापूर्वक लागू भएका, प्रगतिमा रहेका वा थालिएका {count} वटा राम्रा कामहरू छन्। " +
      "यो संख्या बढी हुनु राम्रो संकेत हो — सरकारले भनेको कुरा गरिरहेको छ।",
  },
  {
    id:    "warning",
    icon:  "⚠",
    label: "चेतावनी",
    color: "#fde047",
    value: h => h.warningCount,
    explain:
      "यस भागमा ढिलाइ भएका वा विवादमा परेका {count} वटा कामहरू फेला परेका छन्। " +
      "यो संख्या बढी हुनु भनेको सरकारका वाचाहरू समयमा पूरा भइरहेका छैनन् भन्ने हो — ध्यान दिन जरुरी।",
  },
  {
    id:    "funding",
    icon:  "₹",
    label: "कोष",
    color: "#60a5fa",
    value: h => h.fundingCount,
    explain:
      "यस क्षेत्रमा बजेट, लगानी वा आर्थिक सहयोगसँग सम्बन्धित {count} वटा अभिलेख छन्। " +
      "पैसा छुट्याउनु राम्रो कदम हो, तर मात्र खर्च हुनु महत्वपूर्ण छ।",
  },
  {
    id:    "progress",
    icon:  "→",
    label: "प्रगति",
    color: "#a78bfa",
    value: h => h.progressCount,
    explain:
      "यो शाखामा काम थालिएको वा अगाडि बढिरहेको देखाउने {count} वटा अभिलेख छन्। " +
      "कागजमा लेखिएको योजना मात्र होइन — वास्तवमा काम भइरहेको छ भन्ने संकेत।",
  },
  {
    id:    "contradiction",
    icon:  "✗",
    label: "विरोध",
    color: "#f87171",
    value: h => h.contradictionCount,
    explain:
      "यस क्षेत्रमा संविधान वा वाचाविपरीत गएका, असफल भएका वा रद्द भएका {count} वटा काम भेटिएका छन्। " +
      "यो संख्या बढी हुनु भनेको सरकारले आफ्नै वाचा तोडिरहेको छ — गम्भीर समस्याको संकेत।",
  },
];

// ─── Section order ────────────────────────────────────────────────────────────

const SECTION_ORDER: BranchHealthState[] = [
  "healthy", "fruiting", "budding", "weak", "yellow", "dry", "damaged", "unknown",
];

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px" }} />
    </div>
  );
}

// ─── Metric pill — learning-aware ─────────────────────────────────────────────

function MetricPill({
  metric,
  value,
  activeId,
  onToggle,
  learnOn,
}: {
  metric:    MetricDef;
  value:     number;
  activeId:  string | null;
  onToggle:  (id: string) => void;
  learnOn:   boolean;
}) {
  const isActive = activeId === metric.id;

  return (
    <button
      onClick={() => learnOn ? onToggle(metric.id) : undefined}
      style={{
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        minWidth:       "56px",
        padding:        "8px 10px",
        background:     isActive && learnOn ? `${metric.color}20` : "rgba(255,255,255,0.04)",
        borderRadius:   "9px",
        border:         `1px solid ${isActive && learnOn ? metric.color + "55" : metric.color + "20"}`,
        cursor:         learnOn ? "pointer" : "default",
        position:       "relative",
        transition:     "background 0.15s, border-color 0.15s",
      }}
    >
      <span style={{ fontSize: "17px", fontWeight: 900, color: metric.color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>
        {metric.icon} {metric.label}
      </span>

      {/* Learning mode indicator dot */}
      {learnOn && (
        <span style={{
          position:    "absolute",
          top:         "-4px",
          right:       "-4px",
          width:       "13px",
          height:      "13px",
          borderRadius:"50%",
          background:  isActive ? "#06b6d4" : "#164e63",
          border:      "1px solid #0e7490",
          color:       isActive ? "#fff" : "#67e8f9",
          fontSize:    "8px",
          fontWeight:  900,
          display:     "flex",
          alignItems:  "center",
          justifyContent: "center",
          lineHeight:  1,
        }}>
          {isActive ? "×" : "?"}
        </span>
      )}
    </button>
  );
}

// ─── Learning explanation card ────────────────────────────────────────────────

function LearnExplainCard({ metric, value }: { metric: MetricDef; value: number }) {
  return (
    <div style={{
      background:   "rgba(8,40,50,0.92)",
      border:       "1px solid #0e7490",
      borderRadius: "10px",
      padding:      "12px 14px",
      marginTop:    "4px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{
          fontSize: "11px", fontWeight: 800, color: metric.color,
          background: `${metric.color}18`, padding: "2px 8px",
          borderRadius: "8px", border: `1px solid ${metric.color}30`,
        }}>
          {metric.icon} {metric.label} — {value}
        </span>
      </div>
      <p style={{ fontSize: "12.5px", color: "rgba(103,232,249,0.88)", lineHeight: 1.75, margin: 0 }}>
        {metric.explain.replace("{count}", String(value))}
      </p>
    </div>
  );
}

// ─── Part card ────────────────────────────────────────────────────────────────

function PartCard({ h, learnOn }: { h: BranchHealth; learnOn: boolean }) {
  const title       = PARTS_META[h.partNumber] ?? `भाग ${h.partNumber}`;
  const col         = HEALTH_COLORS[h.state];
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);

  const toggleMetric = (id: string) =>
    setActiveMetricId(prev => prev === id ? null : id);

  const activeMetric = METRICS.find(m => m.id === activeMetricId) ?? null;

  return (
    <div style={{
      background:    "rgba(255,255,255,0.025)",
      border:        `1px solid ${col.dot}28`,
      borderRadius:  "10px",
      padding:       "14px 16px",
      display:       "flex",
      flexDirection: "column",
      gap:           "10px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <span style={{
              fontSize: "10px", fontWeight: 700, color: col.dot,
              background: `${col.dot}18`, padding: "2px 7px", borderRadius: "8px",
            }}>
              भाग {h.partNumber}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
          </div>
          <ScoreBar score={h.healthScore} color={col.dot} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "22px", fontWeight: 900, color: col.dot, margin: 0, lineHeight: 1 }}>{h.healthScore}</p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>/ 100</p>
        </div>
      </div>

      {/* Metric pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {METRICS.map(m => (
          <MetricPill
            key={m.id}
            metric={m}
            value={m.value(h)}
            activeId={activeMetricId}
            onToggle={toggleMetric}
            learnOn={learnOn}
          />
        ))}
      </div>

      {/* Learning mode explanation card */}
      {learnOn && activeMetric && (
        <LearnExplainCard metric={activeMetric} value={activeMetric.value(h)} />
      )}

      {/* Reason lines */}
      {h.reasonLines.length > 0 ? (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {h.reasonLines.map((line, i) => (
            <span key={i} style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)", fontFamily: "monospace", lineHeight: 1.6 }}>{line}</span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", fontStyle: "italic", margin: 0 }}>
          यस भागसँग सम्बन्धित कुनै प्रकाशित अभिलेख छैन
        </p>
      )}

      {h.lastUpdated && (
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", margin: 0 }}>
          अन्तिम अद्यावधिक: {new Date(h.lastUpdated).toLocaleDateString("en-GB")}
        </p>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function HealthSection({
  state,
  parts,
  learnOn,
}: {
  state:   BranchHealthState;
  parts:   BranchHealth[];
  learnOn: boolean;
}) {
  const col = HEALTH_COLORS[state];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section style={{ borderBottom: "2px solid rgba(255,255,255,0.06)" }}>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width:          "100%",
          textAlign:      "left",
          background:     `linear-gradient(90deg,${col.dot}14 0%,transparent 60%)`,
          border:         "none",
          borderBottom:   "1px solid rgba(255,255,255,0.05)",
          padding:        "14px 24px",
          cursor:         "pointer",
          display:        "flex",
          alignItems:     "center",
          gap:            "12px",
        }}
      >
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.dot, flexShrink: 0, boxShadow: `0 0 8px ${col.dot}` }} />
        <span style={{ fontSize: "15px", fontWeight: 800, color: col.dot, flex: 1 }}>{col.label}</span>
        <span style={{
          fontSize:   "12px",
          fontWeight: 700,
          color:      parts.length === 0 ? "rgba(255,255,255,0.20)" : col.dot,
          background: parts.length === 0 ? "rgba(255,255,255,0.04)" : `${col.dot}18`,
          border:     `1px solid ${col.dot}30`,
          borderRadius: "20px",
          padding:    "2px 10px",
          minWidth:   "28px",
          textAlign:  "center",
        }}>
          {parts.length} भाग
        </span>
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }}>▼</span>
      </button>

      {!collapsed && (
        <div style={{ padding: "16px 24px 20px" }}>
          {parts.length === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", margin: 0 }}>
              यस अवस्थामा कुनै भाग छैन
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: "12px" }}>
              {parts.map(h => <PartCard key={h.partNumber} h={h} learnOn={learnOn} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Learning mode banner ─────────────────────────────────────────────────────

function LearnBanner() {
  return (
    <div style={{
      margin:       "0 24px 0",
      background:   "rgba(8,40,50,0.70)",
      border:       "1px solid #0e7490",
      borderTop:    "none",
      borderRadius: "0 0 12px 12px",
      padding:      "12px 16px",
      display:      "flex",
      alignItems:   "flex-start",
      gap:          "10px",
    }}>
      <span style={{ fontSize: "16px", flexShrink: 0 }}>🌿</span>
      <div>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "#67e8f9", margin: "0 0 3px" }}>
          सिकाइ मोड सक्रिय छ
        </p>
        <p style={{ fontSize: "11.5px", color: "rgba(103,232,249,0.75)", margin: 0, lineHeight: 1.65 }}>
          प्रत्येक कार्ड मा रहेका संख्याहरूमा <strong style={{ color: "#67e8f9" }}>? थिच्नुहोस्</strong> — त्यो संख्याको वास्तविक अर्थ र महत्व सजिलो नेपालीमा देखिनेछ।
          यो जानकारी नागरिकहरूलाई आफ्नो सरकार बुझ्न मद्दत गर्न बनाइएको छ।
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HealthDebugClient() {
  const { user }  = useVaultAuth();
  const { on: learnOn } = useLearningMode();
  const [healthMap, setHealthMap] = useState<Map<number, BranchHealth>>(new Map());
  const [loading,   setLoading]   = useState(true);
  const [totalRecs, setTotalRecs] = useState(0);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "janta_intelligence"), where("publishToJanta", "==", true)))
      .then(snap => {
        const records: IntelligenceRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));
        setTotalRecs(records.length);
        const partNums = Array.from({ length: 35 }, (_, i) => i + 1);
        setHealthMap(computeAllPartsHealth(partNums, records));
      })
      .catch(err => console.error("[HealthDebug]", err))
      .finally(() => setLoading(false));
  }, [user]);

  // Group parts by state, sorted by score desc within each group
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

      {/* Header */}
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.30)" }}>
        <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", letterSpacing: "0.14em", fontWeight: 700, margin: "0 0 6px" }}>
          VAULT · CONSTITUTION · HEALTH
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 6px" }}>शाखा स्वास्थ्य नियन्त्रण कक्ष</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", margin: 0 }}>
          संविधानका ३५ भागहरूको जीवित स्वास्थ्य स्थिति — क्षेत्र अनुमानद्वारा गणना
        </p>

        {!loading && totalParts > 0 && (
          <div style={{ display: "flex", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              { label: "कुल भागहरू", value: totalParts, color: "#e2e8f0" },
              { label: "डेटा भएका",  value: withData,   color: "#4ade80" },
              { label: "औसत स्कोर",  value: avgScore,   color: "#fbbf24" },
              { label: "अभिलेखहरू",  value: totalRecs,  color: "#60a5fa" },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "20px", fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning mode banner — appears directly below header */}
      {learnOn && <LearnBanner />}

      {/* Sections */}
      {loading ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "14px" }}>अभिलेखहरू लोड गर्दै...</p>
        </div>
      ) : (
        SECTION_ORDER.map(state => (
          <HealthSection
            key={state}
            state={state}
            parts={grouped.get(state) ?? []}
            learnOn={learnOn}
          />
        ))
      )}
    </div>
  );
}
