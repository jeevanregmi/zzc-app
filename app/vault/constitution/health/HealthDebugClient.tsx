"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase";
import { useVaultAuth } from "../../../../hooks/vault/useVaultAuth";
import {
  computeAllPartsHealth,
  HEALTH_COLORS,
  type BranchHealth,
} from "../../../../lib/constitution/healthComputer";
import type { IntelligenceRecord } from "../../../../lib/types/intelligence-record";
import { PARTS_META } from "./partsMeta";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, state }: { score: number; state: BranchHealth["state"] }) {
  const col = HEALTH_COLORS[state].dot;
  return (
    <div style={{ height: "5px", background: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden", marginTop: "4px" }}>
      <div style={{ width: `${score}%`, height: "100%", background: col, borderRadius: "3px", transition: "width 0.6s ease" }} />
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  if (value === 0) return null;
  return (
    <span style={{ fontSize: "10px", background: "rgba(255,255,255,0.05)", border: `1px solid ${color}33`, color, borderRadius: "10px", padding: "2px 7px", marginRight: "4px" }}>
      {label} {value}
    </span>
  );
}

function HealthRow({ h, title }: { h: BranchHealth; title: string }) {
  const [open, setOpen] = useState(false);
  const col = HEALTH_COLORS[h.state];

  return (
    <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "10px 16px", display: "grid", gridTemplateColumns: "44px 1fr auto", gap: "12px", alignItems: "center" }}
      >
        {/* Part number */}
        <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.30)" }}>भाग {h.partNumber}</span>

        {/* Title + bar */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12.5px", fontWeight: 500, color: "#fde68a" }}>{title}</span>
            <span style={{ fontSize: "10px", color: col.dot, fontWeight: 600, padding: "1px 6px", background: `${col.dot}18`, borderRadius: "8px" }}>{col.label}</span>
          </div>
          <ScoreBar score={h.healthScore} state={h.state} />
        </div>

        {/* Score + record count */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "15px", fontWeight: 700, color: col.dot, margin: 0 }}>{h.healthScore}</p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", margin: 0 }}>{h.totalRecords} रेकर्ड</p>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 12px 72px" }}>
          {/* Signal chips */}
          <div style={{ marginBottom: "8px" }}>
            <StatChip label="✓ सकारात्मक" value={h.positiveCount}      color="#4ade80" />
            <StatChip label="⚠ चेतावनी"   value={h.warningCount}       color="#fde047" />
            <StatChip label="₹ कोष"        value={h.fundingCount}       color="#60a5fa" />
            <StatChip label="✗ विरोध"      value={h.contradictionCount} color="#f87171" />
          </div>

          {/* Reason lines */}
          {h.reasonLines.length > 0 ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "3px" }}>
              {h.reasonLines.map((line, i) => (
                <li key={i} style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>{line}</li>
              ))}
            </ul>
          ) : (
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>कुनै संकेत उपलब्ध छैन</p>
          )}

          {h.lastUpdated && (
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", marginTop: "6px" }}>
              अन्तिम: {new Date(h.lastUpdated).toLocaleDateString("ne-NP")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export default function HealthDebugClient() {
  const { user } = useVaultAuth();
  const [healthList, setHealthList] = useState<BranchHealth[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [totalRecs,  setTotalRecs]  = useState(0);
  const [filter, setFilter] = useState<BranchHealth["state"] | "all">("all");

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "janta_intelligence"), where("publishToJanta", "==", true)))
      .then(snap => {
        const records: IntelligenceRecord[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));
        setTotalRecs(records.length);
        const partNums = Array.from({ length: 35 }, (_, i) => i + 1);
        const map = computeAllPartsHealth(partNums, records);
        setHealthList(Array.from(map.values()).sort((a, b) => b.healthScore - a.healthScore));
      })
      .catch(err => console.error("[HealthDebug]", err))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = filter === "all" ? healthList : healthList.filter(h => h.state === filter);

  const summary = {
    healthy:  healthList.filter(h => h.state === "healthy").length,
    fruiting: healthList.filter(h => h.state === "fruiting").length,
    budding:  healthList.filter(h => h.state === "budding").length,
    weak:     healthList.filter(h => h.state === "weak").length,
    dry:      healthList.filter(h => h.state === "dry").length,
    damaged:  healthList.filter(h => h.state === "damaged").length,
    unknown:  healthList.filter(h => h.state === "unknown").length,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#030a04", color: "#fde68a", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", letterSpacing: "0.12em", fontWeight: 700, marginBottom: "4px" }}>VAULT · CONSTITUTION · HEALTH</p>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 4px" }}>शाखा स्वास्थ्य स्थिति</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", margin: 0 }}>
          {totalRecs} प्रकाशित अभिलेखबाट गणना — क्षेत्र अनुमान प्रयोग गरिएको
        </p>
      </div>

      {/* Summary chips */}
      {!loading && (
        <div style={{ padding: "14px 24px", display: "flex", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          {(Object.entries(summary) as [BranchHealth["state"], number][]).map(([state, count]) => {
            if (count === 0) return null;
            const col = HEALTH_COLORS[state];
            return (
              <button
                key={state}
                onClick={() => setFilter(prev => prev === state ? "all" : state)}
                style={{ fontSize: "11px", padding: "4px 10px", borderRadius: "12px", border: `1px solid ${col.dot}44`, background: filter === state ? `${col.dot}22` : "transparent", color: col.dot, cursor: "pointer", fontWeight: 600 }}
              >
                {col.label} {count}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {loading ? (
        <p style={{ padding: "40px 24px", color: "rgba(255,255,255,0.25)", fontSize: "13px" }}>गणना गर्दै...</p>
      ) : filtered.length === 0 ? (
        <p style={{ padding: "40px 24px", color: "rgba(255,255,255,0.20)", fontSize: "13px" }}>कुनै परिणाम छैन</p>
      ) : (
        <div>
          {filtered.map(h => (
            <HealthRow key={h.partNumber} h={h} title={PARTS_META[h.partNumber] ?? `भाग ${h.partNumber}`} />
          ))}
        </div>
      )}
    </div>
  );
}
