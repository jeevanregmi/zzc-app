"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc as firestoreDoc, getDocs, query, where } from "firebase/firestore";
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
import { UPLOAD_GUIDANCE, type VaultCategory, type UploadRecommendation } from "../../../../lib/constitution/uploadGuidance";
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

// ─── Static constitutional knowledge — always available, no Firestore needed ──

interface PartStatic {
  purpose:    string;
  dharasHint: string;
  themes:     string[];
}

const PART_STATIC: Record<number, PartStatic> = {
  1:  { purpose: "नेपालको राज्य स्वरूप, सार्वभौमसत्ता, राष्ट्रिय भाषा र चिह्न",         dharasHint: "धारा १–९",     themes: ["सार्वभौमसत्ता","राज्य स्वरूप","राष्ट्रिय चिह्न","भाषा"] },
  2:  { purpose: "नागरिकता प्राप्तिका आधार र नागरिक अधिकार",                              dharasHint: "धारा १०–१४",   themes: ["नागरिकता","वंश","विवाह","आप्रवासी"] },
  3:  { purpose: "नागरिकका मौलिक हक — शिक्षा, स्वास्थ्य, समानता, स्वतन्त्रता",          dharasHint: "धारा १६–४६",   themes: ["शिक्षा","स्वास्थ्य","समानता","स्वतन्त्रता","महिला","दलित","बालबालिका"] },
  4:  { purpose: "राज्यका निर्देशक सिद्धान्त, नीतिगत दायित्व र राज्यको दायित्व",        dharasHint: "धारा ५०–५५",   themes: ["सुशासन","विकास","सामाजिक न्याय","समावेश"] },
  5:  { purpose: "संघ, प्रदेश, स्थानीय तहको तीन-तहीय संरचना र अधिकार बाँडफाँड",        dharasHint: "धारा ५६–५७",   themes: ["संघीयता","राज्य संरचना","अधिकार बाँडफाँड"] },
  6:  { purpose: "राष्ट्रपति र उपराष्ट्रपतिको पद, शक्ति र कर्तव्य",                    dharasHint: "धारा ६१–७४",   themes: ["राष्ट्रपति","उपराष्ट्रपति","कार्यकारी शक्ति"] },
  7:  { purpose: "प्रधानमन्त्री र मन्त्रिपरिषद् — संघीय कार्यकारी शक्ति",              dharasHint: "धारा ७५–८४",   themes: ["प्रधानमन्त्री","मन्त्रिपरिषद्","कार्यपालिका","नीति निर्माण"] },
  8:  { purpose: "संघीय संसद — प्रतिनिधिसभा र राष्ट्रियसभा",                            dharasHint: "धारा ८३–१०१",  themes: ["संसद","प्रतिनिधिसभा","राष्ट्रियसभा","कानुन निर्माण"] },
  9:  { purpose: "संघीय कानून निर्माण प्रक्रिया र विधेयक पारित",                        dharasHint: "धारा १०७–११७", themes: ["कानुन","विधेयक","संसदीय कार्यविधि"] },
  10: { purpose: "संघीय सञ्चित कोष, बजेट, आर्थिक पारदर्शिता",                           dharasHint: "धारा ११८–१२४", themes: ["बजेट","सञ्चित कोष","आर्थिक अनुशासन"] },
  11: { purpose: "सर्वोच्च अदालत, उच्च अदालत, जिल्ला अदालत — स्वतन्त्र न्यायपालिका",  dharasHint: "धारा १२६–१४८", themes: ["न्यायपालिका","सर्वोच्च अदालत","संविधान व्याख्या","न्यायिक स्वतन्त्रता"] },
  12: { purpose: "महान्यायाधिवक्ता — सरकारको कानुनी परामर्शदाता",                       dharasHint: "धारा १५७–१६२", themes: ["कानुन","सरकारी वकिल","अभियोजन"] },
  13: { purpose: "प्रदेश गठन, सिमाना, नाम र अधिकार क्षेत्र",                           dharasHint: "धारा १६३–१६७", themes: ["प्रदेश","संघीयता","स्वायत्तता"] },
  14: { purpose: "प्रदेश मुख्यमन्त्री र मन्त्रिपरिषद्",                                 dharasHint: "धारा १६८–१७४", themes: ["प्रदेश सरकार","मुख्यमन्त्री","प्रदेश कार्यपालिका"] },
  15: { purpose: "प्रदेश सभा — प्रदेशस्तरीय व्यवस्थापिका",                              dharasHint: "धारा १७५–१८५", themes: ["प्रदेश सभा","प्रदेश कानुन","निर्वाचन"] },
  16: { purpose: "प्रदेशस्तरीय कानून निर्माण प्रक्रिया",                                dharasHint: "धारा १९७–२०२", themes: ["प्रदेश कानुन","विधेयक","कार्यविधि"] },
  17: { purpose: "प्रदेशमा उच्च अदालतको न्यायिक व्यवस्था",                             dharasHint: "धारा २०३–२१३", themes: ["उच्च अदालत","प्रदेश न्याय","न्यायिक सेवा"] },
  18: { purpose: "स्थानीय तहको कार्यपालिका — मेयर, उपमेयर, अध्यक्ष",                  dharasHint: "धारा २१४–२१९", themes: ["स्थानीय सरकार","मेयर","अध्यक्ष","वडा"] },
  19: { purpose: "गाउँ सभा र नगर सभा — स्थानीय व्यवस्थापिका",                          dharasHint: "धारा २२०–२२४", themes: ["गाउँसभा","नगरसभा","वडा समिति","स्थानीय कानुन"] },
  20: { purpose: "स्थानीय तहको शासन व्यवस्था र स्वशासन",                               dharasHint: "धारा २२५",     themes: ["स्थानीय शासन","स्वशासन","सेवा प्रवाह"] },
  21: { purpose: "स्थानीय तहको वित्त व्यवस्था, राजस्व र अनुदान",                       dharasHint: "धारा २२६–२२९", themes: ["स्थानीय बजेट","राजस्व","वित्त समानीकरण"] },
  22: { purpose: "संघ, प्रदेश, स्थानीयबीच समन्वय र अन्तरसरकारी सम्बन्ध",              dharasHint: "धारा २३०–२३५", themes: ["समन्वय","अन्तरसरकारी","सहकार्य"] },
  23: { purpose: "राष्ट्रिय प्राकृतिक स्रोत र वित्त आयोग — राजस्व बाँडफाँड",           dharasHint: "धारा २५०–२६५", themes: ["वित्त आयोग","राजस्व बाँडफाँड","प्राकृतिक स्रोत"] },
  24: { purpose: "अख्तियार दुरुपयोग अनुसन्धान आयोग — भ्रष्टाचार नियन्त्रण",            dharasHint: "धारा २३८–२४२", themes: ["भ्रष्टाचार","CIAA","अनुसन्धान","सुशासन"] },
  25: { purpose: "महालेखापरीक्षक — सरकारी खर्चको स्वतन्त्र लेखापरीक्षण",               dharasHint: "धारा २४३–२४६", themes: ["लेखापरीक्षण","आर्थिक पारदर्शिता"] },
  26: { purpose: "लोक सेवा आयोग — निष्पक्ष सरकारी भर्ती र पदस्थापन",                  dharasHint: "धारा २४३–२४७", themes: ["लोक सेवा","भर्ती","समावेश","योग्यता"] },
  27: { purpose: "निर्वाचन आयोग — स्वतन्त्र र निष्पक्ष निर्वाचन सञ्चालन",             dharasHint: "धारा २४५–२५२", themes: ["निर्वाचन","मतदान","राजनीतिक दल","मतदाता"] },
  28: { purpose: "राष्ट्रिय मानव अधिकार आयोग — नागरिक हक संरक्षण",                    dharasHint: "धारा २४८–२५३", themes: ["मानव अधिकार","NHRC","नागरिक सुरक्षा"] },
  29: { purpose: "राष्ट्रिय महिला आयोग — लैंगिक समानता र महिला संरक्षण",              dharasHint: "धारा २५२–२५८", themes: ["महिला अधिकार","लैंगिक समानता","हिंसा निवारण"] },
  30: { purpose: "राष्ट्रिय दलित आयोग — जातीय भेदभाव उन्मूलन",                        dharasHint: "धारा २५५–२६०", themes: ["दलित","जातीय भेदभाव","सामाजिक समावेश"] },
  31: { purpose: "राष्ट्रिय समावेशी आयोग — समानुपातिक र समावेशी प्रतिनिधित्व",       dharasHint: "धारा २६१–२६५", themes: ["समावेश","पिछडिएका वर्ग","समानुपातिक"] },
  32: { purpose: "राष्ट्रिय जनजाति आयोग — आदिवासी जनजातिको अधिकार",                  dharasHint: "धारा २६१–२६७", themes: ["जनजाति","आदिवासी","भाषा","संस्कृति"] },
  33: { purpose: "संवैधानिक निकायहरूको साझा व्यवस्था",                                 dharasHint: "धारा २६६–२७०", themes: ["संवैधानिक निकाय","स्वायत्तता","जवाफदेहिता"] },
  34: { purpose: "मधेसी आयोग — मधेस क्षेत्रको विशेष प्रतिनिधित्व",                    dharasHint: "धारा २७१–२७३", themes: ["मधेसी","तराई","समावेश","प्रतिनिधित्व"] },
  35: { purpose: "संविधान संशोधन, संक्रमणकालीन व्यवस्था र विविध प्रावधान",            dharasHint: "धारा २७४–३०८", themes: ["संशोधन","संक्रमण","विविध","अन्तिम प्रावधान"] },
};

const EMPTY_STRUCT: PartStructuralProfile = {
  partNumber: 0, atomCount: 0, dharaCount: 0, clauseDensity: 0,
  rightsComplexity: 0, institutionCount: 0, dutyCount: 0, obligationCount: 0,
  dependencyCount: 0, governanceScope: [], keywordCount: 0, affectedGroupCount: 0,
};

const EMPTY_HEALTH: BranchHealth = {
  partNumber: 0, state: "unknown", healthScore: 0,
  totalRecords: 0, positiveCount: 0, warningCount: 0,
  fundingCount: 0, progressCount: 0, contradictionCount: 0,
  lastUpdated: null, reasonLines: [],
};

// ─── Part roadmap card — always renders for all 35 parts ─────────────────────

function PartRoadmapCard({
  partNumber, health, structural, deepLearn, learnOn, civicAtomCount,
}: {
  partNumber:     number;
  health:         BranchHealth | undefined;
  structural:     PartStructuralProfile;
  deepLearn:      PartDeepLearnProfile | undefined;
  learnOn:        boolean;
  civicAtomCount: number;
}) {
  const title    = PARTS_META[partNumber] ?? `भाग ${partNumber}`;
  const st       = PART_STATIC[partNumber] ?? { purpose: "", dharasHint: "", themes: [] };
  const h        = health ?? { ...EMPTY_HEALTH, partNumber };
  const col      = HEALTH_COLORS[h.state];
  const hasL1    = structural.atomCount > 0 || structural.dharaCount > 0;
  const hasL2    = h.totalRecords > 0;
  const completeness = computeCompleteness(partNumber, structural, h, civicAtomCount);

  const [activeStruct, setActiveStruct] = useState<string | null>(null);
  const [activeLive,   setActiveLive]   = useState<string | null>(null);
  const toggleStruct = (id: string) => { setActiveStruct(p => p === id ? null : id); setActiveLive(null); };
  const toggleLive   = (id: string) => { setActiveLive(p => p === id ? null : id);   setActiveStruct(null); };
  const activeStructMeta = STRUCT_METRICS.find(m => m.id === activeStruct);
  const activeLiveMeta   = LIVE_METRICS.find(m => m.id === activeLive);
  const activeDeepLearnData: MetricDeepLearn | null = (() => {
    if (!activeStructMeta || !deepLearn) return null;
    const key = STRUCT_DEEP_KEY[activeStructMeta.id];
    return key ? deepLearn[key] as MetricDeepLearn : null;
  })();

  return (
    <div style={{ background: "rgba(255,255,255,0.018)", border: `1px solid ${hasL2 ? col.dot + "30" : "rgba(255,255,255,0.06)"}`, borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* ── Header (always visible) ── */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "4px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "2px 8px", borderRadius: "8px", flexShrink: 0 }}>भाग {partNumber}</span>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#fde68a" }}>{title}</span>
            {hasL2 && (
              <span style={{ fontSize: "9px", fontWeight: 700, color: col.dot, background: `${col.dot}15`, border: `1px solid ${col.dot}30`, padding: "1px 7px", borderRadius: "10px" }}>
                {HEALTH_COLORS[h.state].label}
              </span>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.42)", margin: 0, lineHeight: 1.5 }}>{st.purpose}</p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: hasL2 ? "22px" : "14px", fontWeight: 900, color: hasL2 ? col.dot : "rgba(255,255,255,0.15)", margin: 0, lineHeight: 1 }}>{hasL2 ? h.healthScore : "—"}</p>
          <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.18)", margin: "2px 0 0" }}>/ 100</p>
        </div>
      </div>

      {/* ── Data completeness bar ── */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${completeness.pct}%`, height: "100%", background: completeness.color, borderRadius: "2px" }} />
      </div>

      {/* ── Layer 1: संविधान संरचना (ALWAYS shows) ── */}
      <div style={{ background: "rgba(192,132,252,0.04)", border: "1px solid rgba(192,132,252,0.12)", borderRadius: "8px", padding: "10px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
          <LayerLabel label="तह १ · संविधान संरचना" sub={st.dharasHint} color="#c084fc" />
          <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 8px", borderRadius: "8px",
            color: hasL1 ? "#4ade80" : "#fbbf24",
            background: hasL1 ? "rgba(74,222,128,0.10)" : "rgba(251,191,36,0.10)",
            border: `1px solid ${hasL1 ? "rgba(74,222,128,0.25)" : "rgba(251,191,36,0.25)"}` }}>
            {hasL1 ? `✓ ${structural.dharaCount} धाराहरू extract भए` : "⚠ अझै extract भएन"}
          </span>
        </div>

        {/* Purpose + themes — always shown */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: hasL1 ? "8px" : "0" }}>
          {st.themes.map(t => (
            <span key={t} style={{ fontSize: "9px", color: "rgba(192,132,252,0.70)", background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.18)", borderRadius: "5px", padding: "2px 7px" }}>{t}</span>
          ))}
        </div>

        {/* Structural metrics — only if data exists */}
        {hasL1 ? (
          <>
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
          </>
        ) : (
          <a href="/vault/documents" style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "10px", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.22)", borderRadius: "7px", padding: "5px 11px", textDecoration: "none" }}>
            📜 Documents मा गएर संविधान extract गर्नुस् →
          </a>
        )}
      </div>

      {/* ── Layer 2: जीवित बुद्धि (always shows, empty state if no data) ── */}
      <div style={{ background: hasL2 ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.02)", border: `1px solid ${hasL2 ? "rgba(74,222,128,0.12)" : "rgba(255,255,255,0.06)"}`, borderRadius: "8px", padding: "10px 12px" }}>
        <LayerLabel label="तह २ · जीवित बुद्धि" sub="janta_intelligence + civic_atoms + signals" color={hasL2 ? col.dot : "rgba(255,255,255,0.25)"} />

        {hasL2 ? (
          <>
            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
              {LIVE_METRICS.map(m => (
                <LivePill key={m.id} m={m} health={h} activeId={activeLive} onToggle={toggleLive} learnOn={learnOn} />
              ))}
            </div>
            {learnOn && activeLiveMeta && (
              <DeepLearnCard data={null} metricLabel={activeLiveMeta.label}
                simpleText={activeLiveMeta.explain.replace("{count}", String(activeLiveMeta.value(h)))} />
            )}
            {h.reasonLines && h.reasonLines.length > 0 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "8px", paddingTop: "6px" }}>
                {h.reasonLines.map((line, i) => (
                  <span key={i} style={{ fontSize: "10px", color: "rgba(255,255,255,0.30)", display: "block", fontFamily: "monospace", lineHeight: 1.6 }}>{line}</span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.22)", fontStyle: "italic", margin: 0 }}>
              अझै live data छैन — documents upload गरेर AI extract गर्नुस्
            </p>
            <a href="/vault/documents?upload=1" style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.22)", borderRadius: "7px", padding: "4px 10px", textDecoration: "none", whiteSpace: "nowrap" }}>
              📤 Upload →
            </a>
          </div>
        )}
      </div>

      {/* ── Recommended uploads ── */}
      <UploadGuidanceSection partNumber={partNumber} />
    </div>
  );
}

// ─── Founder Guidance Panel ───────────────────────────────────────────────────
// Surfaces the most urgent upload gaps across all 35 parts in one view.
// Answers: empty branches, weak branches, top priority next uploads.

interface FounderGuidancePanelProps {
  healthMap:  Map<number, BranchHealth>;
  structMap:  Map<number, PartStructuralProfile>;
}

function FounderGuidancePanel({ healthMap, structMap }: FounderGuidancePanelProps) {
  const [tab, setTab] = useState<"empty" | "weak" | "uploads">("uploads");

  // Empty branches: Layer 2 = 0 records
  const emptyParts = PART_NUMBERS.filter(n => {
    const h = healthMap.get(n);
    return !h || h.totalRecords === 0;
  });

  // Weak branches: have some data but healthScore < 40
  const weakParts = PART_NUMBERS.filter(n => {
    const h = healthMap.get(n);
    return h && h.totalRecords > 0 && h.healthScore < 40;
  }).sort((a, b) => (healthMap.get(a)!.healthScore) - (healthMap.get(b)!.healthScore));

  // Top upload priorities: high-priority recs from empty parts first, then weak
  const urgentUploads: Array<{ partNumber: number; rec: UploadRecommendation; isEmpty: boolean }> = [];
  const priorityParts = [...emptyParts, ...weakParts.filter(n => !emptyParts.includes(n))];
  for (const n of priorityParts) {
    const recs = UPLOAD_GUIDANCE[n] ?? [];
    for (const rec of recs.filter(r => r.priority === "high")) {
      urgentUploads.push({ partNumber: n, rec, isEmpty: emptyParts.includes(n) });
      if (urgentUploads.length >= 12) break;
    }
    if (urgentUploads.length >= 12) break;
  }

  const TABS = [
    { id: "uploads" as const, label: "📥 अर्को Upload",  count: urgentUploads.length },
    { id: "empty"   as const, label: "⬜ खाली शाखा",    count: emptyParts.length },
    { id: "weak"    as const, label: "🔴 कमजोर शाखा",   count: weakParts.length },
  ];

  return (
    <div style={{ margin: "0 24px 20px", background: "rgba(96,165,250,0.03)", border: "1px solid rgba(96,165,250,0.12)", borderRadius: "14px", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <p style={{ fontSize: "12px", fontWeight: 800, color: "#60a5fa", margin: "0 0 2px" }}>📥 Founder Upload Guidance</p>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: 0 }}>
            कुन branch खाली छ · कुन कमजोर छ · अर्को के upload गर्ने
          </p>
        </div>
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{ fontSize: "10px", fontWeight: 700, padding: "4px 10px", borderRadius: "20px", cursor: "pointer", border: `1px solid ${tab === t.id ? "rgba(96,165,250,0.60)" : "rgba(255,255,255,0.10)"}`, color: tab === t.id ? "#60a5fa" : "rgba(255,255,255,0.35)", background: tab === t.id ? "rgba(96,165,250,0.10)" : "transparent" }}
            >
              {t.label} <span style={{ opacity: 0.6 }}>({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 18px" }}>

        {/* ── Tab: Top priority uploads ── */}
        {tab === "uploads" && (
          urgentUploads.length === 0 ? (
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", fontStyle: "italic", margin: 0 }}>सबै शाखामा high-priority documents छन् — excellent!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: "0 0 4px" }}>
                खाली शाखाबाट high-priority recommendations — यीनलाई पहिले upload गर्नुस्
              </p>
              {urgentUploads.map(({ partNumber, rec, isEmpty }, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: isEmpty ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.04)", border: `1px solid ${isEmpty ? "rgba(239,68,68,0.15)" : "rgba(251,191,36,0.12)"}`, borderRadius: "9px" }}>
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: "42px" }}>
                    <p style={{ fontSize: "9px", fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.12)", padding: "2px 6px", borderRadius: "6px", margin: 0, whiteSpace: "nowrap" }}>भाग {partNumber}</p>
                    <p style={{ fontSize: "8px", color: isEmpty ? "#ef4444" : "#fbbf24", margin: "3px 0 0", fontWeight: 700 }}>{isEmpty ? "खाली" : "कमजोर"}</p>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0", margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.title}</p>
                    <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", margin: "0 0 5px" }}>{rec.titleEn}</p>
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "9px", color: CATEGORY_COLOR[rec.category], background: `${CATEGORY_COLOR[rec.category]}18`, border: `1px solid ${CATEGORY_COLOR[rec.category]}28`, borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>{rec.category}</span>
                      {rec.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "4px", padding: "1px 5px", fontFamily: "monospace" }}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`/vault/documents?upload=1`}
                    style={{ flexShrink: 0, fontSize: "10px", fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: "7px", padding: "6px 10px", textDecoration: "none", whiteSpace: "nowrap", alignSelf: "center" }}
                  >
                    📤 Upload →
                  </a>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Tab: Empty branches ── */}
        {tab === "empty" && (
          emptyParts.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, margin: 0 }}>✓ सबै भागमा live intelligence data छ!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: "0 0 4px" }}>
                यी {emptyParts.length} भागमा Layer 2 data छैन — documents upload गरेर fill गर्नुस्
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {emptyParts.map(n => {
                  const hasL1 = (structMap.get(n)?.dharaCount ?? 0) > 0;
                  const recs  = UPLOAD_GUIDANCE[n] ?? [];
                  const topRec = recs.find(r => r.priority === "high");
                  return (
                    <div key={n} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "8px", minWidth: "200px", flex: "1 1 200px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#fde68a", margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          भाग {n} — {PARTS_META[n] ?? ""}
                        </p>
                        <p style={{ fontSize: "9px", margin: 0, color: hasL1 ? "rgba(74,222,128,0.60)" : "rgba(251,191,36,0.60)" }}>
                          {hasL1 ? `✓ L1 संरचना छ` : "⚠ L1 पनि खाली"} · {recs.length} सुझाव
                        </p>
                        {topRec && <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>→ {topRec.title}</p>}
                      </div>
                      <a href="/vault/documents?upload=1" style={{ flexShrink: 0, fontSize: "9px", fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.22)", borderRadius: "6px", padding: "4px 8px", textDecoration: "none" }}>Upload</a>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        )}

        {/* ── Tab: Weak branches ── */}
        {tab === "weak" && (
          weakParts.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, margin: 0 }}>✓ कुनै पनि भाग कमजोर अवस्थामा छैन!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.28)", margin: "0 0 4px" }}>
                यी भागमा data छ तर health score कम छ — अझ documents थप्नुस्
              </p>
              {weakParts.map(n => {
                const h = healthMap.get(n)!;
                const col = HEALTH_COLORS[h.state];
                const recs = UPLOAD_GUIDANCE[n] ?? [];
                const topRec = recs.find(r => r.priority === "high") ?? recs[0];
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 12px", background: `${col.dot}08`, border: `1px solid ${col.dot}22`, borderRadius: "8px" }}>
                    <div style={{ flexShrink: 0, width: "36px", textAlign: "center" }}>
                      <p style={{ fontSize: "18px", fontWeight: 900, color: col.dot, margin: 0, lineHeight: 1 }}>{h.healthScore}</p>
                      <p style={{ fontSize: "8px", color: "rgba(255,255,255,0.25)", margin: "1px 0 0" }}>/ 100</p>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "11px", fontWeight: 700, color: "#fde68a", margin: "0 0 1px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        भाग {n} — {PARTS_META[n] ?? ""}
                      </p>
                      <p style={{ fontSize: "9px", color: col.dot, margin: "0 0 2px" }}>{col.label} · {h.totalRecords} records</p>
                      {topRec && <p style={{ fontSize: "9px", color: "rgba(255,255,255,0.30)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>→ {topRec.title} upload गर्नुस्</p>}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                      <div style={{ width: "60px" }}>
                        <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${h.healthScore}%`, height: "100%", background: col.dot }} />
                        </div>
                      </div>
                      <a href="/vault/documents?upload=1" style={{ fontSize: "9px", fontWeight: 700, color: "#60a5fa", background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.22)", borderRadius: "6px", padding: "4px 8px", textDecoration: "none" }}>Upload</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

      </div>
    </div>
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

  // ── Dedup constitutional_framework by articleId ──────────────────────────
  const [deduping, setDeduping] = useState(false);

  const handleDedup = async () => {
    if (!user || deduping) return;
    setDeduping(true);
    try {
      const snap = await getDocs(collection(db, "constitutional_framework"));
      const byKey = new Map<string, { id: string; createdAt: string }[]>();
      for (const d of snap.docs) {
        const data = d.data() as Record<string, unknown>;
        const key = `${String(data.articleId ?? "unknown")}_${String(data.sourceDocId ?? "")}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push({ id: d.id, createdAt: String(data.createdAt ?? "") });
      }
      let deleted = 0;
      for (const [, recs] of byKey) {
        if (recs.length <= 1) continue;
        recs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        for (const r of recs.slice(1)) {
          await deleteDoc(firestoreDoc(db, "constitutional_framework", r.id));
          deleted++;
        }
      }
      alert(`✅ Dedup सम्पन्न! ${deleted} duplicate records हटाइए।\n\nPage reload गर्दैछ…`);
      window.location.reload();
    } catch (err) {
      alert(`Dedup error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeduping(false);
    }
  };

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
        <div style={{ marginTop: "12px" }}>
          <button
            onClick={handleDedup}
            disabled={deduping}
            style={{ fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "20px", border: "1px solid rgba(251,191,36,0.50)", color: deduping ? "rgba(251,191,36,0.40)" : "#fbbf24", background: "rgba(251,191,36,0.08)", cursor: deduping ? "default" : "pointer" }}
          >
            {deduping ? "🧹 Duplicate हटाउँदैछ…" : "🧹 Duplicate Records हटाउनुस्"}
          </button>
          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)", marginLeft: "10px" }}>
            Extraction दोहोरियो भने यहाँ click गर्नुस् — पुरानो records राखेर नयाँ हटाउँछ
          </span>
        </div>
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

      {/* ── Founder Upload Guidance Panel ── */}
      {!loading && (
        <FounderGuidancePanel
          healthMap={healthMap}
          structMap={structMap}
        />
      )}

      {/* ── All 35 parts — always shown, data-aware not data-dependent ── */}
      <div style={{ padding: "16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            ३५ भाग रोडम्याप
          </span>
          {loading && <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>live data लोड हुँदैछ…</span>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(340px,1fr))", gap: "14px" }}>
          {PART_NUMBERS.map(n => (
            <PartRoadmapCard
              key={n}
              partNumber={n}
              health={healthMap.get(n)}
              structural={structMap.get(n) ?? { ...EMPTY_STRUCT, partNumber: n }}
              deepLearn={deepLearnMap.get(n)}
              learnOn={learnOn}
              civicAtomCount={civicAtomsByPart.get(n) ?? 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
