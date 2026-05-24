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
  explain: string;
}

const STRUCT_METRICS: StructMetricDef[] = [
  { id: "atoms",        icon: "⬡", label: "ज्ञान इकाई",  color: "#c084fc", value: p => p.atomCount,          explain: "यस भागमा {val} वटा संवैधानिक अंश (धारा र खण्डहरू) उत्खनन गरिएका छन्।"                                        },
  { id: "dharas",       icon: "📜", label: "धाराहरू",      color: "#a78bfa", value: p => p.dharaCount,         explain: "यस भागमा {val} वटा फरक-फरक धाराहरू छन्।"                                                                   },
  { id: "density",      icon: "◉", label: "घनत्व",        color: "#818cf8", value: p => p.clauseDensity,      explain: "प्रति धारामा औसत {val} वटा खण्डहरू छन्।"                                                                   },
  { id: "rights",       icon: "⚖", label: "अधिकार",       color: "#4ade80", value: p => p.rightsComplexity,   explain: "यस भागले नागरिकलाई {val} वटा अधिकार प्रदान गर्छ।"                                                          },
  { id: "institutions", icon: "🏛", label: "संस्थाहरू",    color: "#60a5fa", value: p => p.institutionCount,   explain: "यस भागले {val} वटा फरक सरकारी निकाय वा संस्थाको उल्लेख गर्छ।"                                             },
  { id: "deps",         icon: "🔗", label: "सम्बन्ध",      color: "#38bdf8", value: p => p.dependencyCount,   explain: "यस भागका धाराहरू संविधानका अन्य {val} वटा धाराहरूसँग जोडिएका छन्।"                                        },
  { id: "groups",       icon: "👥", label: "समूह",          color: "#34d399", value: p => p.affectedGroupCount, explain: "यस भागले {val} वटा फरक नागरिक समूहलाई प्रत्यक्ष असर गर्छ।"                                               },
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
  { id: "total",         icon: "📋", label: "कुल अभिलेख",  color: "#e2e8f0", value: h => h.totalRecords,       explain: "यस भागसँग सम्बन्धित {count} वटा सरकारी प्रतिबद्धता, योजना वा कार्यक्रम।"        },
  { id: "positive",      icon: "✓",  label: "सकारात्मक",   color: "#4ade80", value: h => h.positiveCount,      explain: "लागू भएका, प्रगतिमा रहेका {count} वटा राम्रा कामहरू।"                           },
  { id: "warning",       icon: "⚠",  label: "चेतावनी",     color: "#fde047", value: h => h.warningCount,       explain: "ढिलाइ भएका वा विवादमा परेका {count} वटा कामहरू।"                               },
  { id: "funding",       icon: "₹",  label: "कोष",          color: "#60a5fa", value: h => h.fundingCount,       explain: "बजेट वा आर्थिक सहयोगसँग सम्बन्धित {count} वटा अभिलेख।"                        },
  { id: "progress",      icon: "→",  label: "प्रगति",       color: "#a78bfa", value: h => h.progressCount,      explain: "काम थालिएको वा अगाडि बढिरहेको {count} वटा अभिलेख।"                            },
  { id: "contradiction", icon: "✗",  label: "विरोध",        color: "#f87171", value: h => h.contradictionCount, explain: "असफल वा रद्द भएका {count} वटा काम।"                                           },
];

// ─── Data completeness per part ───────────────────────────────────────────────

function computeCompleteness(
  partNumber: number,
  structural: PartStructuralProfile,
  health: BranchHealth,
  civicAtomCount: number,
): { pct: number; label: string; color: string } {
  let score = 0;
  if (structural.atomCount > 0) score += 30;     // has constitutional atoms
  if (structural.dharaCount > 0) score += 10;    // has dharas mapped
  if (health.totalRecords > 0) score += 25;      // has intelligence records
  if (health.totalRecords >= 3) score += 15;     // sufficient coverage
  if (health.positiveCount > 0) score += 10;     // has positive signals
  if (civicAtomCount > 0) score += 10;           // has civic atoms
  const pct = Math.min(score, 100);
  const label = pct >= 80 ? "पूर्ण" : pct >= 50 ? "मध्यम" : pct >= 20 ? "न्यून" : "खाली";
  const color = pct >= 80 ? "#4ade80" : pct >= 50 ? "#fbbf24" : pct >= 20 ? "#fb923c" : "#f87171";
  return { pct, label, color };
}

// ─── Analytics dashboard ──────────────────────────────────────────────────────

interface AnalyticsStat {
  label: string;
  value: string | number;
  color: string;
  sub?: string;
}

function StatCard({ s }: { s: AnalyticsStat }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${s.color}25`, borderRadius: "10px", padding: "14px 16px", minWidth: "100px" }}>
      <p style={{ fontSize: "24px", fontWeight: 900, color: s.color, margin: 0, lineHeight: 1 }}>{s.value}</p>
      <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", margin: "4px 0 0", lineHeight: 1.4 }}>{s.label}</p>
      {s.sub && <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.18)", margin: "2px 0 0" }}>{s.sub}</p>}
    </div>
  );
}

interface AnalyticsDashboardProps {
  totalCivicAtoms:     number;
  totalJanta:          number;
  totalFramework:      number;
  totalConstitAtoms:   number;
  totalRelationships:  number;
  totalSignals:        number;
  withData:            number;
  avgScore:            number;
  healthMap:           Map<number, BranchHealth>;
  structMap:           Map<number, PartStructuralProfile>;
}

function AnalyticsDashboard(p: AnalyticsDashboardProps) {
  const [tab, setTab] = useState<"overview" | "layer1" | "layer2" | "compare">("overview");

  // Layer 1 totals
  const totalAtoms       = Array.from(p.structMap.values()).reduce((s, x) => s + x.atomCount, 0);
  const totalDharas      = Array.from(p.structMap.values()).reduce((s, x) => s + x.dharaCount, 0);
  const totalRights      = Array.from(p.structMap.values()).reduce((s, x) => s + x.rightsComplexity, 0);
  const totalInstitutions= Array.from(p.structMap.values()).reduce((s, x) => s + x.institutionCount, 0);
  const totalDeps        = Array.from(p.structMap.values()).reduce((s, x) => s + x.dependencyCount, 0);
  const totalGroups      = Array.from(p.structMap.values()).reduce((s, x) => s + x.affectedGroupCount, 0);

  // Layer 2 totals
  const allHealth        = Array.from(p.healthMap.values());
  const totalPositive    = allHealth.reduce((s, h) => s + h.positiveCount, 0);
  const totalWarning     = allHealth.reduce((s, h) => s + h.warningCount, 0);
  const totalFunding     = allHealth.reduce((s, h) => s + h.fundingCount, 0);
  const totalContradict  = allHealth.reduce((s, h) => s + h.contradictionCount, 0);
  const promiseGap       = totalWarning + totalContradict;

  // Comparison: top/bottom 5 by score
  const ranked = allHealth.filter(h => h.state !== "unknown").sort((a, b) => b.healthScore - a.healthScore);
  const top5   = ranked.slice(0, 5);
  const bot5   = [...ranked].reverse().slice(0, 5);

  const TABS = [
    { id: "overview", label: "सिंहावलोकन" },
    { id: "layer1",   label: "तह १ — संरचना" },
    { id: "layer2",   label: "तह २ — बुद्धि" },
    { id: "compare",  label: "तुलना" },
  ] as const;

  return (
    <div style={{ margin: "0 24px 20px", background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", overflow: "hidden" }}>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 16px" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{ padding: "10px 14px", fontSize: "11px", fontWeight: 700, color: tab === t.id ? "#fde68a" : "rgba(255,255,255,0.30)", background: "none", border: "none", borderBottom: `2px solid ${tab === t.id ? "#fde68a" : "transparent"}`, cursor: "pointer", transition: "all 0.15s" }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>

        {/* ── Overview ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {([
                { label: "⚛ Civic Atoms",           value: p.totalCivicAtoms,   color: "#67e8f9", sub: "vault_civic_atoms" },
                { label: "📋 Janta Intelligence",    value: p.totalJanta,        color: "#4ade80", sub: "janta_intelligence" },
                { label: "📜 Constitution Framework",value: p.totalFramework,    color: "#c084fc", sub: "constitutional_framework" },
                { label: "⬡ Constitution Atoms",     value: p.totalConstitAtoms, color: "#a78bfa", sub: "constitutional_atoms" },
                { label: "🔗 Relationships",          value: p.totalRelationships,color: "#38bdf8", sub: "constitutional_relationships" },
                { label: "📡 Civic Signals",          value: p.totalSignals,      color: "#f472b6", sub: "civic_signals" },
                { label: "डेटा भएका भागहरू",         value: `${p.withData}/35`,  color: "#fbbf24", sub: "parts with data" },
                { label: "औसत स्वास्थ्य अंक",       value: `${p.avgScore}/100`, color: "#60a5fa", sub: "overall score" },
              ] as AnalyticsStat[]).map(s => <StatCard key={s.label} s={s} />)}
            </div>
            {/* Promise vs Reality gap */}
            <div style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: "10px", padding: "12px 16px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#f87171", margin: "0 0 4px" }}>⚡ वाचा-यथार्थ खाडल</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: 0 }}>
                  {totalPositive} सकारात्मक बनाम {promiseGap} विलम्बित/असफल = {totalPositive + promiseGap > 0 ? Math.round((promiseGap / (totalPositive + promiseGap)) * 100) : 0}% कार्यान्वयन असफलता दर
                </p>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#fbbf24", margin: "0 0 4px" }}>💰 बजेट कभरेज</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: 0 }}>
                  {totalFunding} वटा भागमा बजेट वा कोष अभिलेख उपलब्ध
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Layer 1: Structure ─────────────────────────────── */}
        {tab === "layer1" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "11px", color: "rgba(192,132,252,0.70)", margin: 0 }}>
              संविधानको स्थायी संरचना — constitutional_framework, constitutional_atoms, constitutional_relationships बाट।
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {([
                { label: "कुल Framework Records", value: p.totalFramework,    color: "#c084fc" },
                { label: "Constitution Atoms",     value: p.totalConstitAtoms, color: "#a78bfa" },
                { label: "कुल धाराहरू",            value: totalDharas,         color: "#818cf8" },
                { label: "कुल ज्ञान इकाई",         value: totalAtoms,          color: "#c084fc" },
                { label: "अधिकारहरू",              value: totalRights,         color: "#4ade80" },
                { label: "संस्थाहरू",              value: totalInstitutions,   color: "#60a5fa" },
                { label: "धारा सम्बन्धहरू",        value: totalDeps,           color: "#38bdf8" },
                { label: "प्रभावित समूह",          value: totalGroups,         color: "#34d399" },
                { label: "Relationships",           value: p.totalRelationships,color: "#06b6d4" },
              ] as AnalyticsStat[]).map(s => <StatCard key={s.label} s={s} />)}
            </div>
            {(p.totalFramework === 0 && p.totalConstitAtoms === 0) && (
              <div style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.20)", borderRadius: "9px", padding: "12px 16px" }}>
                <p style={{ fontSize: "12px", color: "#f87171", margin: "0 0 4px", fontWeight: 700 }}>⚠ तह १ खाली छ</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", margin: 0 }}>
                  constitutional_framework वा constitutional_atoms collections मा data छैन। Constitution Framework पहिले load गर्नुस्।
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Layer 2: Living Intelligence ───────────────────── */}
        {tab === "layer2" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "11px", color: "rgba(74,222,128,0.70)", margin: 0 }}>
              जीवित सरकारी अभिलेख — vault_civic_atoms, janta_intelligence, civic_signals बाट।
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              {([
                { label: "⚛ Civic Atoms",        value: p.totalCivicAtoms,   color: "#67e8f9", sub: "vault_civic_atoms" },
                { label: "📋 Janta Records",      value: p.totalJanta,        color: "#4ade80", sub: "janta_intelligence" },
                { label: "📡 Civic Signals",       value: p.totalSignals,      color: "#f472b6", sub: "civic_signals" },
                { label: "कुल Intelligence",      value: p.totalCivicAtoms + p.totalJanta + p.totalSignals, color: "#e2e8f0" },
                { label: "✓ सकारात्मक संकेत",    value: totalPositive,       color: "#4ade80" },
                { label: "⚠ चेतावनी संकेत",      value: totalWarning,        color: "#fde047" },
                { label: "₹ बजेट अभिलेख",        value: totalFunding,        color: "#60a5fa" },
                { label: "✗ विरोधाभास",           value: totalContradict,     color: "#f87171" },
              ] as AnalyticsStat[]).map(s => <StatCard key={s.label} s={s} />)}
            </div>
            {(p.totalCivicAtoms === 0 && p.totalJanta === 0) && (
              <div style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.20)", borderRadius: "9px", padding: "12px 16px" }}>
                <p style={{ fontSize: "12px", color: "#fbbf24", margin: "0 0 4px", fontWeight: 700 }}>⚠ तह २ खाली छ</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.38)", margin: 0 }}>
                  Documents upload गरेर AI analyze गर्नुस् — अनि admin ले approve गर्नुस्। त्यसपछि civic atoms यहाँ देखिन्छ।
                </p>
                <Link href="/vault/documents" style={{ display: "inline-block", marginTop: "8px", fontSize: "11px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "7px", padding: "5px 12px", textDecoration: "none" }}>
                  📤 Documents upload गर्नुस् →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── Compare ─────────────────────────────────────────── */}
        {tab === "compare" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#4ade80", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 10px" }}>🏆 शीर्ष ५ स्वस्थ भागहरू</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {top5.map((h, i) => (
                  <div key={h.partNumber} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.30)", width: "14px" }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#fde68a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        भाग {h.partNumber} — {PARTS_META[h.partNumber] ?? ""}
                      </p>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginTop: "3px" }}>
                        <div style={{ width: `${h.healthScore}%`, height: "100%", background: HEALTH_COLORS[h.state].dot }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 900, color: HEALTH_COLORS[h.state].dot, width: "30px", textAlign: "right" }}>{h.healthScore}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#f87171", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 10px" }}>⚠ ध्यान चाहिने भागहरू</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {bot5.map((h, i) => (
                  <div key={h.partNumber} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.30)", width: "14px" }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "11px", fontWeight: 600, color: "#fde68a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        भाग {h.partNumber} — {PARTS_META[h.partNumber] ?? ""}
                      </p>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden", marginTop: "3px" }}>
                        <div style={{ width: `${h.healthScore}%`, height: "100%", background: HEALTH_COLORS[h.state].dot }} />
                      </div>
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 900, color: HEALTH_COLORS[h.state].dot, width: "30px", textAlign: "right" }}>{h.healthScore}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
  atoms:        null,
  dharas:       "dharaList",
  density:      null,
  rights:       "rights",
  institutions: "institutions",
  deps:         "dependencies",
  groups:       "affectedGroups",
};

// ─── Deep Learn Card ─────────────────────────────────────────────────────────

function DeepLearnCard({ data, metricLabel, simpleText }: {
  data:        MetricDeepLearn | null;
  metricLabel: string;
  simpleText:  string;
}) {
  const [showAll, setShowAll] = useState(false);

  if (!data) {
    return (
      <div style={{ background: "rgba(8,40,50,0.90)", border: "1px solid #0e7490", borderRadius: "9px", padding: "10px 13px", marginTop: "6px" }}>
        <p style={{ fontSize: "12px", color: "rgba(103,232,249,0.88)", lineHeight: 1.72, margin: 0 }}>{simpleText}</p>
      </div>
    );
  }

  const count     = data.entities.length;
  const meaning   = data.citizenMeaning.replace("{count}", String(count));
  const showLimit = 10;
  const visible   = showAll ? data.entities : data.entities.slice(0, showLimit);
  const remaining = data.entities.length - showLimit;

  return (
    <div style={{ background: "rgba(6,30,40,0.95)", border: "1px solid #0e7490", borderRadius: "10px", padding: "13px 14px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "11px" }}>
      {data.entities.length > 0 && (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 800, color: "#67e8f9", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 7px" }}>
            संविधानले उल्लेख गरेका {metricLabel} ({count})
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {visible.map((e, i) => (
              <span key={i} style={{ fontSize: "10px", color: "rgba(103,232,249,0.80)", background: "rgba(14,116,144,0.18)", border: "1px solid rgba(14,116,144,0.35)", borderRadius: "5px", padding: "2px 8px" }}>{e}</span>
            ))}
            {!showAll && remaining > 0 && (
              <button onClick={() => setShowAll(true)} style={{ fontSize: "10px", color: "#06b6d4", background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: "5px", padding: "2px 8px", cursor: "pointer" }}>
                +{remaining} अझ
              </button>
            )}
          </div>
        </div>
      )}
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#4ade80", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>किन सम्बन्धित?</p>
        <p style={{ fontSize: "11.5px", color: "rgba(255,255,255,0.72)", lineHeight: 1.65, margin: 0 }}>{meaning}</p>
      </div>
      {data.sourceArticles.length > 0 && (
        <div>
          <p style={{ fontSize: "9px", fontWeight: 800, color: "#fbbf24", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 7px" }}>
            संविधानले कहाँ भनेको? ({data.sourceArticles.length} धारा)
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
            {data.sourceArticles.map(a => (
              <span key={a} style={{ fontSize: "10px", color: "rgba(251,191,36,0.80)", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: "5px", padding: "2px 7px" }}>धारा {a}</span>
            ))}
          </div>
        </div>
      )}
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#a78bfa", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>AI ले कसरी बुझ्यो?</p>
        <p style={{ fontSize: "10.5px", color: "rgba(167,139,250,0.75)", lineHeight: 1.65, margin: 0 }}>{data.aiReasoning}</p>
      </div>
      <div>
        <p style={{ fontSize: "9px", fontWeight: 800, color: "#f472b6", letterSpacing: "0.10em", textTransform: "uppercase", margin: "0 0 5px" }}>वास्तविक जीवन सम्बन्ध</p>
        <p style={{ fontSize: "10.5px", color: "rgba(244,114,182,0.75)", lineHeight: 1.65, margin: 0 }}>{data.whyItMatters}</p>
      </div>
    </div>
  );
}

// ─── Structural metric pill ───────────────────────────────────────────────────

function StructPill({ m, profile, activeId, onToggle, learnOn }: {
  m: StructMetricDef; profile: PartStructuralProfile;
  activeId: string | null; onToggle: (id: string) => void; learnOn: boolean;
}) {
  const val = m.value(profile);
  const isActive = activeId === m.id;
  return (
    <button
      onClick={() => learnOn ? onToggle(m.id) : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px", padding: "7px 9px", background: isActive && learnOn ? `${m.color}20` : "rgba(255,255,255,0.03)", border: `1px solid ${isActive && learnOn ? m.color + "55" : m.color + "18"}`, borderRadius: "8px", cursor: learnOn ? "pointer" : "default", position: "relative" }}
    >
      <span style={{ fontSize: "15px", fontWeight: 900, color: m.color, lineHeight: 1 }}>{val}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>{m.icon} {m.label}</span>
      {learnOn && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "13px", height: "13px", borderRadius: "50%", background: isActive ? "#06b6d4" : "#164e63", border: "1px solid #0e7490", color: isActive ? "#fff" : "#67e8f9", fontSize: "8px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isActive ? "×" : "?"}
        </span>
      )}
    </button>
  );
}

// ─── Live metric pill ─────────────────────────────────────────────────────────

function LivePill({ m, health, activeId, onToggle, learnOn }: {
  m: LiveMetricDef; health: BranchHealth;
  activeId: string | null; onToggle: (id: string) => void; learnOn: boolean;
}) {
  const val = m.value(health);
  const isActive = activeId === m.id;
  return (
    <button
      onClick={() => learnOn ? onToggle(m.id) : undefined}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "52px", padding: "7px 9px", background: isActive && learnOn ? `${m.color}20` : "rgba(255,255,255,0.03)", border: `1px solid ${isActive && learnOn ? m.color + "55" : m.color + "18"}`, borderRadius: "8px", cursor: learnOn ? "pointer" : "default", position: "relative" }}
    >
      <span style={{ fontSize: "15px", fontWeight: 900, color: m.color, lineHeight: 1 }}>{val}</span>
      <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", marginTop: "3px", textAlign: "center", lineHeight: 1.3 }}>{m.icon} {m.label}</span>
      {learnOn && (
        <span style={{ position: "absolute", top: "-4px", right: "-4px", width: "13px", height: "13px", borderRadius: "50%", background: isActive ? "#06b6d4" : "#164e63", border: "1px solid #0e7490", color: isActive ? "#fff" : "#67e8f9", fontSize: "8px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isActive ? "×" : "?"}
        </span>
      )}
    </button>
  );
}

// ─── Upload guidance ──────────────────────────────────────────────────────────

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
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 1800); });
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
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{rec.title}</span>
                    <span style={{ fontSize: "9.5px", color: "rgba(255,255,255,0.25)", display: "block", marginTop: "1px" }}>{rec.titleEn}</span>
                  </div>
                  <span style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: pStyle.dot, background: pStyle.bg, border: `1px solid ${pStyle.dot}28`, borderRadius: "6px", padding: "2px 7px" }}>{pStyle.label}</span>
                </div>
                <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", marginBottom: "8px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 700, color: catCol, background: `${catCol}18`, border: `1px solid ${catCol}28`, borderRadius: "5px", padding: "2px 7px" }}>{rec.category}</span>
                  {rec.tags.map(tag => (
                    <span key={tag} style={{ fontSize: "9px", color: "rgba(255,255,255,0.32)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "5px", padding: "2px 6px", fontFamily: "monospace" }}>#{tag}</span>
                  ))}
                </div>
                <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "6px", padding: "7px 10px", display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <span style={{ flex: 1, fontSize: "10.5px", color: "rgba(255,255,255,0.42)", lineHeight: 1.65, fontFamily: "monospace" }}>{rec.template}</span>
                  <button
                    onClick={() => copyTemplate(rec.template, copyKey)}
                    style={{ flexShrink: 0, background: copied === copyKey ? "rgba(74,222,128,0.10)" : "rgba(96,165,250,0.10)", border: `1px solid ${copied === copyKey ? "#4ade8030" : "rgba(96,165,250,0.22)"}`, borderRadius: "5px", color: copied === copyKey ? "#4ade80" : "#60a5fa", fontSize: "9px", fontWeight: 700, padding: "3px 8px", cursor: "pointer" }}
                  >
                    {copied === copyKey ? "✓ copied" : "copy"}
                  </button>
                </div>
                <a href="/vault/documents?upload=1" style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px 12px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "7px", fontSize: "11px", fontWeight: 700, color: "#4ade80", textDecoration: "none" }}>
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

// ─── Part card ────────────────────────────────────────────────────────────────

function PartCard({
  health, structural, deepLearn, learnOn, civicAtomCount,
}: {
  health:         BranchHealth;
  structural:     PartStructuralProfile;
  deepLearn:      PartDeepLearnProfile | undefined;
  learnOn:        boolean;
  civicAtomCount: number;
}) {
  const title = PARTS_META[health.partNumber] ?? `भाग ${health.partNumber}`;
  const col   = HEALTH_COLORS[health.state];

  const [activeStruct, setActiveStruct] = useState<string | null>(null);
  const [activeLive,   setActiveLive]   = useState<string | null>(null);

  const toggleStruct = (id: string) => { setActiveStruct(p => p === id ? null : id); setActiveLive(null); };
  const toggleLive   = (id: string) => { setActiveLive(p => p === id ? null : id);   setActiveStruct(null); };

  const activeStructMeta = STRUCT_METRICS.find(m => m.id === activeStruct);
  const activeLiveMeta   = LIVE_METRICS.find(m => m.id === activeLive);

  const activeDeepLearnData: MetricDeepLearn | null = (() => {
    if (!activeStructMeta || !deepLearn) return null;
    const key = STRUCT_DEEP_KEY[activeStructMeta.id];
    if (!key) return null;
    return deepLearn[key] as MetricDeepLearn;
  })();

  const completeness = computeCompleteness(health.partNumber, structural, health, civicAtomCount);

  return (
    <div style={{ background: "rgba(255,255,255,0.022)", border: `1px solid ${col.dot}25`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "13px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: col.dot, background: `${col.dot}18`, padding: "2px 7px", borderRadius: "8px" }}>भाग {health.partNumber}</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#fde68a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          </div>
          <ScoreBar score={health.healthScore} color={col.dot} />
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "22px", fontWeight: 900, color: col.dot, margin: 0, lineHeight: 1 }}>{health.healthScore}</p>
          <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>/ 100</p>
        </div>
      </div>

      {/* Data completeness bar */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "7px", padding: "8px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
          <span style={{ fontSize: "9px", fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "0.10em", textTransform: "uppercase" }}>डेटा पूर्णता</span>
          <span style={{ fontSize: "10px", fontWeight: 700, color: completeness.color }}>{completeness.pct}% — {completeness.label}</span>
        </div>
        <div style={{ height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{ width: `${completeness.pct}%`, height: "100%", background: completeness.color, borderRadius: "2px", transition: "width 0.3s" }} />
        </div>
        {completeness.pct < 50 && (
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", margin: "5px 0 0", fontStyle: "italic" }}>
            थप documents upload गर्नुस् — तल सुझाव हेर्नुस् ↓
          </p>
        )}
      </div>

      {/* ── Layer 1: Structural ── */}
      <div style={{ background: "rgba(192,132,252,0.04)", border: "1px solid rgba(192,132,252,0.12)", borderRadius: "8px", padding: "10px 12px" }}>
        <LayerLabel label="तह १ · संरचना" sub="constitutional_framework + constitutional_atoms" color="#c084fc" />
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
        {structural.atomCount === 0 && (
          <p style={{ fontSize: "10px", color: "rgba(192,132,252,0.35)", margin: "6px 0 0", fontStyle: "italic" }}>
            यस भागका संविधानिक atoms अझै load भएका छैनन्
          </p>
        )}
      </div>

      {/* ── Layer 2: Live Intelligence ── */}
      <div style={{ background: "rgba(74,222,128,0.03)", border: "1px solid rgba(74,222,128,0.10)", borderRadius: "8px", padding: "10px 12px" }}>
        <LayerLabel label="तह २ · जीवित बुद्धि" sub="vault_civic_atoms + janta_intelligence + civic_signals" color={col.dot} />
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
        {health.reasonLines.length > 0 && (
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "10px", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {health.reasonLines.map((line, i) => (
              <span key={i} style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.38)", fontFamily: "monospace", lineHeight: 1.6 }}>{line}</span>
            ))}
          </div>
        )}
        {health.totalRecords === 0 && (
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.20)", fontStyle: "italic", margin: "4px 0 0" }}>
            कुनै प्रकाशित अभिलेख छैन — document upload र approve गर्नुस्
          </p>
        )}
      </div>

      {/* ── Upload guidance ── */}
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

const EMPTY_STRUCT: PartStructuralProfile = {
  partNumber: 0, atomCount: 0, dharaCount: 0, clauseDensity: 0,
  rightsComplexity: 0, institutionCount: 0, dutyCount: 0, obligationCount: 0,
  dependencyCount: 0, governanceScope: [], keywordCount: 0, affectedGroupCount: 0,
};

function HealthSection({ state, parts, structMap, deepLearnMap, learnOn, civicAtomsByPart }: {
  state:            BranchHealthState;
  parts:            BranchHealth[];
  structMap:        Map<number, PartStructuralProfile>;
  deepLearnMap:     Map<number, PartDeepLearnProfile>;
  learnOn:          boolean;
  civicAtomsByPart: Map<number, number>;
}) {
  const col = HEALTH_COLORS[state];
  const [collapsed, setCollapsed] = useState(false);

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
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.18)", fontStyle: "italic", margin: 0 }}>यस अवस्थामा कुनै भाग छैन</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "14px" }}>
              {parts.map(h => (
                <PartCard
                  key={h.partNumber}
                  health={h}
                  structural={structMap.get(h.partNumber) ?? { ...EMPTY_STRUCT, partNumber: h.partNumber }}
                  deepLearn={deepLearnMap.get(h.partNumber)}
                  learnOn={learnOn}
                  civicAtomCount={civicAtomsByPart.get(h.partNumber) ?? 0}
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
  const { user }        = useVaultAuth();
  const { on: learnOn } = useLearningMode();

  const [healthMap,        setHealthMap]        = useState<Map<number, BranchHealth>>(new Map());
  const [structMap,        setStructMap]        = useState<Map<number, PartStructuralProfile>>(new Map());
  const [deepLearnMap,     setDeepLearnMap]     = useState<Map<number, PartDeepLearnProfile>>(new Map());
  const [civicAtomsByPart, setCivicAtomsByPart] = useState<Map<number, number>>(new Map());
  const [loading,          setLoading]          = useState(true);

  const [totalCivicAtoms,    setTotalCivicAtoms]    = useState(0);
  const [totalJanta,         setTotalJanta]         = useState(0);
  const [totalFramework,     setTotalFramework]     = useState(0);
  const [totalConstitAtoms,  setTotalConstitAtoms]  = useState(0);
  const [totalRelationships, setTotalRelationships] = useState(0);
  const [totalSignals,       setTotalSignals]       = useState(0);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      // ── Layer 2: Living intelligence ──────────────────────────────────────
      getDocs(collection(db, "vault_civic_atoms")),           // new atom system
      getDocs(collection(db, "janta_intelligence")),          // ALL janta records (no filter — fixes 0 count bug)
      getDocs(collection(db, "civic_signals")),               // civic signals feed

      // ── Layer 1: Constitutional structure ──────────────────────────────────
      getDocs(collection(db, "constitutional_framework")),    // ALL framework records (no filter)
      getDocs(collection(db, "constitutional_atoms")),        // separate atom collection if exists
      getDocs(collection(db, "constitutional_relationships")),// cross-article relationships
    ])
      .then(([civicSnap, jantaSnap, signalsSnap, frameworkSnap, constitAtomsSnap, relsSnap]) => {

        // Layer 2 data
        const civicAtoms   = civicSnap.docs.map(d => ({ id: d.id, ...d.data() } as CivicAtom));
        const jantaRecs    = jantaSnap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));

        // Layer 1 data: merge constitutional_framework + constitutional_atoms
        const frameworkRecs   = frameworkSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord));
        const constitAtomRecs = constitAtomsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ConstitutionalFrameworkRecord));
        const allConstRecs    = [...frameworkRecs, ...constitAtomRecs];

        // Build intelligence signal list: bridge atoms + janta records
        const bridged    = atomsToIntelRecords(civicAtoms);
        // Filter janta to only published ones for health scoring, but count all
        const publishedJanta = jantaRecs.filter(r => r.publishToJanta === true);
        const allIntel   = [...bridged, ...publishedJanta];

        // Civic atoms per part (for completeness scoring)
        const byPart = new Map<number, number>();
        for (const atom of civicAtoms) {
          for (const part of (atom.constitutionalParts ?? [])) {
            byPart.set(part, (byPart.get(part) ?? 0) + 1);
          }
        }

        // Update counts
        setTotalCivicAtoms(civicAtoms.length);
        setTotalJanta(jantaRecs.length);
        setTotalFramework(frameworkRecs.length);
        setTotalConstitAtoms(constitAtomRecs.length);
        setTotalRelationships(relsSnap.size);
        setTotalSignals(signalsSnap.size);
        setCivicAtomsByPart(byPart);

        // Compute maps
        setHealthMap(computeAllPartsHealth(PART_NUMBERS, allIntel));
        setStructMap(computeAllStructuralProfiles(PART_NUMBERS, allConstRecs));
        setDeepLearnMap(computeAllDeepLearnProfiles(PART_NUMBERS, allConstRecs));
      })
      .catch(err => console.error("[HealthDebug]", err))
      .finally(() => setLoading(false));
  }, [user]);

  // Group by state
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

      {/* ── OS Navigation Bar ── */}
      <div style={{ background: "rgba(0,0,0,0.60)", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.20)", fontWeight: 700, letterSpacing: "0.12em", marginRight: "6px" }}>TREE OS</span>
        {[
          { href: "/vault/documents",           label: "📄 Documents",     color: "#60a5fa" },
          { href: "/vault/admin",               label: "👁 Review",        color: "#fb923c" },
          { href: "/vault/atoms",               label: "⚛ Atoms OS",      color: "#67e8f9" },
          { href: "/vault/constitution/health", label: "🩺 Branch Health", color: "#4ade80", active: true },
          { href: "/vault/constitution",        label: "📜 Framework",     color: "#a78bfa" },
          { href: "/constitution",              label: "🌳 Public Tree",   color: "#fbbf24" },
          { href: "/vault/vision",              label: "🧠 Vision",        color: "#f472b6" },
          { href: "/vault/system-map",          label: "🗺 System Map",    color: "#94a3b8" },
        ].map(n => (
          <Link key={n.href} href={n.href} style={{
            fontSize: "11px", fontWeight: 700, padding: "4px 10px",
            borderRadius: "20px", border: `1px solid ${n.color}${(n as {active?: boolean}).active ? "90" : "35"}`,
            color: (n as {active?: boolean}).active ? "#fff" : n.color,
            background: (n as {active?: boolean}).active ? `${n.color}22` : "transparent",
            textDecoration: "none", whiteSpace: "nowrap",
          }}>
            {n.label}
          </Link>
        ))}
      </div>

      {/* ── Reads-from info bar ── */}
      <div style={{ background: "rgba(74,222,128,0.05)", borderBottom: "1px solid rgba(74,222,128,0.12)", padding: "8px 24px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "9px", fontWeight: 800, color: "#4ade80", letterSpacing: "0.10em", textTransform: "uppercase" }}>reads from</span>
        {["vault_civic_atoms", "janta_intelligence", "civic_signals", "constitutional_framework", "constitutional_atoms", "constitutional_relationships"].map(col => (
          <span key={col} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(74,222,128,0.70)", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.20)", borderRadius: "4px", padding: "1px 6px" }}>{col}</span>
        ))}
        <Link href="/constitution" style={{ marginLeft: "auto", fontSize: "11px", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.30)", borderRadius: "20px", padding: "4px 12px", textDecoration: "none", whiteSpace: "nowrap" }}>
          🌳 Public Tree →
        </Link>
      </div>

      {/* ── Header ── */}
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.28)" }}>
        <p style={{ fontSize: "10px", color: "rgba(253,230,138,0.35)", letterSpacing: "0.14em", fontWeight: 700, margin: "0 0 5px" }}>VAULT · CONSTITUTION · HEALTH</p>
        <h1 style={{ fontSize: "24px", fontWeight: 900, margin: "0 0 5px" }}>शाखा स्वास्थ्य नियन्त्रण कक्ष</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", margin: 0 }}>
          दुई-तहको बुद्धि — तह १ संरचना (constitutional framework) · तह २ जीवित बुद्धि (civic atoms + intelligence)
        </p>
        {loading && (
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)", margin: "12px 0 0", fontStyle: "italic" }}>सबै तह लोड गर्दै…</p>
        )}
      </div>

      {learnOn && <LearnBanner />}

      {/* ── Architecture legend ── */}
      {!loading && (
        <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#c084fc", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "rgba(192,132,252,0.80)" }}>तह १ — संरचना (constitutional_framework + constitutional_atoms)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "rgba(74,222,128,0.80)" }}>तह २ — जीवित बुद्धि (vault_civic_atoms + janta_intelligence + civic_signals)</span>
          </div>
        </div>
      )}

      {/* ── Analytics Dashboard ── */}
      {!loading && (
        <AnalyticsDashboard
          totalCivicAtoms={totalCivicAtoms}
          totalJanta={totalJanta}
          totalFramework={totalFramework}
          totalConstitAtoms={totalConstitAtoms}
          totalRelationships={totalRelationships}
          totalSignals={totalSignals}
          withData={withData}
          avgScore={avgScore}
          healthMap={healthMap}
          structMap={structMap}
        />
      )}

      {/* ── Part sections ── */}
      {loading ? (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "13px" }}>दुवै तह लोड गर्दै…</p>
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
            civicAtomsByPart={civicAtomsByPart}
          />
        ))
      )}
    </div>
  );
}
