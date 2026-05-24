"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useVaultAuth } from "../../../../hooks/vault/useVaultAuth";
import {
  computeAllPartsHealth,
  HEALTH_COLORS,
  type BranchHealth,
  type BranchHealthState,
} from "../../../../lib/constitution/healthComputer";
import type { IntelligenceRecord } from "../../../../lib/types/intelligence-record";
import { PARTS_META } from "./partsMeta";

// ─── Section order (always shown) ────────────────────────────────────────────

const SECTION_ORDER: BranchHealthState[] = [
  "healthy",
  "fruiting",
  "budding",
  "weak",
  "yellow",
  "dry",
  "damaged",
  "unknown",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div style={{ position: "relative", height: "6px", background: "rgba(255,255,255,0.07)", borderRadius: "4px", overflow: "hidden" }}>
      <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: "4px" }} />
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px", padding: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", border: `1px solid ${color}22` }}>
      <span style={{ fontSize: "15px", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}

function PartCard({ h }: { h: BranchHealth }) {
  const title = PARTS_META[h.partNumber] ?? `भाग ${h.partNumber}`;
  const col   = HEALTH_COLORS[h.state];

  return (
    <div style={{
      background: "rgba(255,255,255,0.025)",
      border: `1px solid ${col.dot}28`,
      borderRadius: "10px",
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: col.dot, background: `${col.dot}18`, padding: "2px 7px", borderRadius: "8px", whiteSpace: "nowrap" }}>
              भाग {h.partNumber}
            </span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </span>
          </div>
          <ScoreBar score={h.healthScore} color={col.dot} />
        </div>

        {/* Score */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "22px", fontWeight: 900, color: col.dot, margin: 0, lineHeight: 1 }}>{h.healthScore}</p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", margin: "2px 0 0", textAlign: "right" }}>/ 100</p>
        </div>
      </div>

      {/* Stats pills */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        <Pill label="कुल अभिलेख"  value={h.totalRecords}       color="#e2e8f0" />
        <Pill label="✓ सकारात्मक" value={h.positiveCount}      color="#4ade80" />
        <Pill label="⚠ चेतावनी"   value={h.warningCount}       color="#fde047" />
        <Pill label="₹ कोष"        value={h.fundingCount}       color="#60a5fa" />
        <Pill label="→ प्रगति"     value={h.progressCount}      color="#a78bfa" />
        <Pill label="✗ विरोध"      value={h.contradictionCount} color="#f87171" />
      </div>

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

      {/* Last updated */}
      {h.lastUpdated && (
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", margin: 0 }}>
          अन्तिम अद्यावधिक: {new Date(h.lastUpdated).toLocaleDateString("en-GB")}
        </p>
      )}
    </div>
  );
}

function HealthSection({
  state,
  parts,
}: {
  state: BranchHealthState;
  parts: BranchHealth[];
}) {
  const col = HEALTH_COLORS[state];
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section style={{ borderBottom: "2px solid rgba(255,255,255,0.06)" }}>
      {/* Section header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: "100%",
          textAlign: "left",
          background: `linear-gradient(90deg,${col.dot}14 0%,transparent 60%)`,
          border: "none",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "14px 24px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Colored dot */}
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: col.dot, flexShrink: 0, boxShadow: `0 0 8px ${col.dot}` }} />

        {/* Label */}
        <span style={{ fontSize: "15px", fontWeight: 800, color: col.dot, flex: 1 }}>{col.label}</span>

        {/* Count badge */}
        <span style={{
          fontSize: "12px", fontWeight: 700,
          color: parts.length === 0 ? "rgba(255,255,255,0.20)" : col.dot,
          background: parts.length === 0 ? "rgba(255,255,255,0.04)" : `${col.dot}18`,
          border: `1px solid ${col.dot}30`,
          borderRadius: "20px",
          padding: "2px 10px",
          minWidth: "28px",
          textAlign: "center",
        }}>
          {parts.length} भाग
        </span>

        {/* Collapse arrow */}
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", transition: "transform 0.2s", transform: collapsed ? "rotate(-90deg)" : "none" }}>▼</span>
      </button>

      {/* Parts grid */}
      {!collapsed && (
        <div style={{ padding: "16px 24px 20px" }}>
          {parts.length === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", margin: 0 }}>
              यस अवस्थामा कुनै भाग छैन
            </p>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "12px",
            }}>
              {parts.map(h => <PartCard key={h.partNumber} h={h} />)}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HealthDebugClient() {
  const { user } = useVaultAuth();
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

  // Group parts by state, sorted by score descending within each group
  const grouped = new Map<BranchHealthState, BranchHealth[]>();
  for (const state of SECTION_ORDER) grouped.set(state, []);
  for (const h of healthMap.values()) {
    grouped.get(h.state)?.push(h);
  }
  for (const [, arr] of grouped) arr.sort((a, b) => b.healthScore - a.healthScore);

  // Summary counts
  const totalParts = healthMap.size;
  const withData   = Array.from(healthMap.values()).filter(h => h.state !== "unknown").length;
  const avgScore   = totalParts > 0
    ? Math.round(Array.from(healthMap.values()).reduce((s, h) => s + h.healthScore, 0) / totalParts)
    : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#020805", color: "#fde68a", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.30)" }}>
        <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", letterSpacing: "0.14em", fontWeight: 700, margin: "0 0 6px" }}>
          VAULT · CONSTITUTION · HEALTH
        </p>
        <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 6px" }}>शाखा स्वास्थ्य नियन्त्रण कक्ष</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.32)", margin: 0 }}>
          संविधानका ३५ भागहरूको जीवित स्वास्थ्य स्थिति — क्षेत्र अनुमानद्वारा गणना
        </p>

        {/* Summary bar */}
        {!loading && totalParts > 0 && (
          <div style={{ display: "flex", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
            {[
              { label: "कुल भागहरू",    value: totalParts,          color: "#e2e8f0" },
              { label: "डेटा भएका",     value: withData,            color: "#4ade80" },
              { label: "औसत स्कोर",     value: avgScore,            color: "#fbbf24" },
              { label: "अभिलेखहरू",     value: totalRecs,           color: "#60a5fa" },
            ].map(s => (
              <div key={s.label}>
                <p style={{ fontSize: "20px", fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.30)", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sections ──────────────────────────────────────────────────────────── */}
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
          />
        ))
      )}
    </div>
  );
}
