"use client";

import { useState } from "react";
import type { CivicAtom, AtomType, BranchId } from "../../lib/types/atoms";
import { CONSTITUTION_BRANCHES, atomConfidenceLevel } from "../../lib/types/atoms";

const BC: Record<string, { text: string; bg: string; border: string }> = {
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-950/50",    border: "border-cyan-900"    },
  green:   { text: "text-green-400",   bg: "bg-green-950/50",   border: "border-green-900"   },
  blue:    { text: "text-blue-400",    bg: "bg-blue-950/50",    border: "border-blue-900"    },
  violet:  { text: "text-violet-400",  bg: "bg-violet-950/50",  border: "border-violet-900"  },
  amber:   { text: "text-amber-400",   bg: "bg-amber-950/50",   border: "border-amber-900"   },
  pink:    { text: "text-pink-400",    bg: "bg-pink-950/50",    border: "border-pink-900"    },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-950/50", border: "border-emerald-900" },
  orange:  { text: "text-orange-400",  bg: "bg-orange-950/50",  border: "border-orange-900"  },
};

const TYPE_STYLE: Record<AtomType, { label: string; labelNp: string; cls: string }> = {
  fact:          { label: "Fact",          labelNp: "तथ्य",           cls: "bg-zinc-800 text-zinc-300 border-zinc-700"         },
  promise:       { label: "Promise",       labelNp: "प्रतिबद्धता",    cls: "bg-violet-950 text-violet-300 border-violet-800"   },
  policy_change: { label: "Policy Change", labelNp: "नीति परिवर्तन",  cls: "bg-amber-950 text-amber-300 border-amber-800"      },
  financial:     { label: "Financial",     labelNp: "आर्थिक",         cls: "bg-emerald-950 text-emerald-300 border-emerald-800" },
  risk:          { label: "Risk",          labelNp: "जोखिम",          cls: "bg-red-950 text-red-300 border-red-800"            },
  right:         { label: "Right",         labelNp: "अधिकार",         cls: "bg-cyan-950 text-cyan-300 border-cyan-800"         },
  target:        { label: "Target",        labelNp: "लक्ष्य",          cls: "bg-blue-950 text-blue-300 border-blue-800"         },
  institution:   { label: "Institution",   labelNp: "संस्था",          cls: "bg-pink-950 text-pink-300 border-pink-800"         },
};

const HARVESTED_FROM_LABEL: Record<CivicAtom["harvestedFrom"], string> = {
  key_insight:   "🔍 AI Key Insight",
  policy_change: "📜 Policy Change",
  financial:     "💰 Financial Implication",
  youth_impact:  "👥 Youth Impact",
  ssf_epf:       "🏦 SSF/EPF Relevance",
};

type Tab = "reasoning" | "constitutional" | "confidence" | "flow";

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: "reasoning",      icon: "🧠", label: "Type Reasoning"    },
  { key: "constitutional", icon: "⚖️", label: "Constitutional"    },
  { key: "confidence",     icon: "📊", label: "Confidence"        },
  { key: "flow",           icon: "🔮", label: "Intelligence Flow" },
];

interface Props {
  atom:          CivicAtom;
  allAtoms:      CivicAtom[];
  onBack:        () => void;
  onSelectAtom?: (atom: CivicAtom) => void;
}

export function DeepAtomView({ atom, allAtoms, onBack, onSelectAtom }: Props) {
  const [tab, setTab] = useState<Tab>("reasoning");

  const typeStyle = TYPE_STYLE[atom.type];
  const level     = atomConfidenceLevel(atom.confidence);
  const confColor = level === "high" ? "text-green-400" : level === "medium" ? "text-amber-400" : "text-red-400";
  const confBar   = level === "high" ? "bg-green-500"   : level === "medium" ? "bg-amber-500"   : "bg-red-500";
  const confLabel = level === "high" ? "भरपर्दो"        : level === "medium" ? "मध्यम"           : "अनिश्चित";

  const relatedAtoms = allAtoms
    .filter(a =>
      a.id !== atom.id &&
      a.constitutionalBranches.some(b => atom.constitutionalBranches.includes(b)) &&
      a.sourceDocId !== atom.sourceDocId,
    )
    .slice(0, 4);

  const primaryBranch = atom.constitutionalBranches[0]
    ? CONSTITUTION_BRANCHES.find(b => b.id === atom.constitutionalBranches[0])
    : null;
  const bc = primaryBranch ? (BC[primaryBranch.color] ?? BC.cyan) : BC.cyan;

  return (
    <div className="min-h-screen bg-black">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className={`border-b ${bc.border} px-4 pt-5 pb-4 space-y-3`}>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-zinc-400 hover:text-white text-sm transition-colors">
            ← वापस
          </button>
          <span className="text-zinc-700 text-xs font-mono ml-auto">{atom.id.slice(-16)}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${typeStyle.cls}`}>
            {typeStyle.labelNp}
          </span>
          {atom.constitutionalBranches.map(bid => {
            const b = CONSTITUTION_BRANCHES.find(x => x.id === bid);
            if (!b) return null;
            const bbc = BC[b.color] ?? BC.cyan;
            return (
              <span key={bid} className={`text-xs px-2 py-0.5 rounded border ${bbc.border} ${bbc.text}`}>
                {b.icon} {b.article}
              </span>
            );
          })}
          <span className={`ml-auto text-sm font-black ${confColor}`}>
            {Math.round(atom.confidence * 100)}% {confLabel}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-5 max-w-2xl pb-16">

        {/* ── Atom text ───────────────────────────────────────────────────── */}
        <div className={`rounded-2xl border ${bc.border} ${bc.bg} p-4`}>
          <p className="text-white text-base leading-relaxed font-medium">{atom.text}</p>
        </div>

        {/* ── Confidence bar ───────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>AI Confidence</span>
            <span className={confColor}>{Math.round(atom.confidence * 100)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${confBar} rounded-full`}
              style={{ width: `${Math.round(atom.confidence * 100)}%` }}
            />
          </div>
        </div>

        {/* ── AI Reasoning tabs ────────────────────────────────────────────── */}
        <div className="space-y-0">
          <div className="flex gap-0 border-b border-zinc-900 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.key
                    ? "border-cyan-500 text-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-b-2xl bg-zinc-900/40 border border-t-0 border-zinc-800 p-4">

            {tab === "reasoning" && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  AI ले यो atom "{typeStyle.labelNp}" किन वर्गीकरण गर्यो
                </p>
                <p className="text-zinc-200 text-sm leading-relaxed">
                  {atom.typeReasoning ?? `${typeStyle.label} type: standard pattern matching applied.`}
                </p>
                <div className="border-t border-zinc-800 pt-3">
                  <p className="text-zinc-600 text-[10px]">
                    Source field: {HARVESTED_FROM_LABEL[atom.harvestedFrom]} ·
                    Harvested: {new Date(atom.harvestedAt).toLocaleDateString("ne-NP")}
                  </p>
                </div>
              </div>
            )}

            {tab === "constitutional" && (
              <div className="space-y-4">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  Constitutional Mapping Reasoning
                </p>
                <p className="text-zinc-200 text-sm leading-relaxed">
                  {atom.constitutionalLinkReasoning ?? "Constitutional mapping: sectors matched to branches."}
                </p>

                {atom.constitutionalRefs.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">संविधानको धारा</p>
                    <div className="flex flex-wrap gap-1.5">
                      {atom.constitutionalRefs.map((ref, i) => (
                        <span key={i} className="text-xs bg-amber-950/40 border border-amber-900/50 text-amber-300 px-2.5 py-1 rounded-full font-semibold">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {atom.constitutionalParts.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
                      Constitutional Parts (Nepal 2072)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {atom.constitutionalParts.map(p => (
                        <span key={p} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
                          Part {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {atom.constitutionalBranches.length > 0 && (
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Mapped Branches</p>
                    <div className="space-y-1.5">
                      {atom.constitutionalBranches.map(bid => {
                        const b = CONSTITUTION_BRANCHES.find(x => x.id === bid);
                        if (!b) return null;
                        const bbc = BC[b.color] ?? BC.cyan;
                        return (
                          <div key={bid} className={`flex items-center gap-2 rounded-xl border ${bbc.border} ${bbc.bg} px-3 py-2`}>
                            <span className="text-lg">{b.icon}</span>
                            <div>
                              <p className={`text-xs font-bold ${bbc.text}`}>{b.title}</p>
                              <p className="text-zinc-600 text-[10px]">{b.article} · {b.titleEn}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === "confidence" && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  Confidence Factors — यो {Math.round(atom.confidence * 100)}% किन?
                </p>
                {(atom.confidenceFactors && atom.confidenceFactors.length > 0)
                  ? atom.confidenceFactors.map((f, i) => {
                      const isPos  = f.startsWith("✅");
                      const isNeg  = f.startsWith("❌");
                      const isWarn = f.startsWith("⚠");
                      const cls = isPos  ? "border-green-900/50 bg-green-950/30 text-green-300"
                                : isNeg  ? "border-red-900/50 bg-red-950/30 text-red-300"
                                : isWarn ? "border-amber-900/50 bg-amber-950/30 text-amber-300"
                                :          "border-zinc-800 bg-zinc-900/50 text-zinc-400";
                      return (
                        <div key={i} className={`border rounded-xl px-3 py-2 text-xs leading-relaxed ${cls}`}>{f}</div>
                      );
                    })
                  : <p className="text-zinc-600 text-sm">
                      Confidence {Math.round(atom.confidence * 100)}% — source document बाट inherit भयो।
                    </p>
                }
              </div>
            )}

            {tab === "flow" && (
              <div className="space-y-3">
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                  Intelligence Flow — यो atom OS मा कहाँ जान्छ?
                </p>
                {(atom.intelligenceFlow && atom.intelligenceFlow.length > 0)
                  ? atom.intelligenceFlow.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <p className="text-zinc-300 text-sm leading-relaxed">{f}</p>
                      </div>
                    ))
                  : <p className="text-zinc-600 text-sm">यो atom public intelligence corpus मा contribute हुन्छ।</p>
                }
              </div>
            )}

          </div>
        </div>

        {/* ── Source document ──────────────────────────────────────────────── */}
        <div className="border border-zinc-800 rounded-2xl p-3.5 space-y-2">
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">स्रोत दस्तावेज</p>
          <p className="text-zinc-200 text-sm font-semibold leading-tight">{atom.sourceDocTitle}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
            <span>{HARVESTED_FROM_LABEL[atom.harvestedFrom]}</span>
            {atom.sourceAuthority && <span>· {atom.sourceAuthority}</span>}
            <span>· {atom.sourceCategory}</span>
          </div>
          <p className="text-zinc-700 text-[10px]">
            Uploaded: {new Date(atom.uploadedAt).toLocaleDateString("ne-NP")} ·
            Harvested: {new Date(atom.harvestedAt).toLocaleDateString("ne-NP")}
          </p>
        </div>

        {/* ── Citizen groups ───────────────────────────────────────────────── */}
        {atom.citizenGroups.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">प्रभावित नागरिक</p>
            <div className="flex flex-wrap gap-1.5">
              {atom.citizenGroups.map((g, i) => (
                <span key={i} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Affected sectors ─────────────────────────────────────────────── */}
        {atom.affectedSectors.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Affected Sectors</p>
            <div className="flex flex-wrap gap-1.5">
              {atom.affectedSectors.map((s, i) => (
                <span key={i} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Related atoms ────────────────────────────────────────────────── */}
        {relatedAtoms.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
              सम्बन्धित Atoms — यही branch, अर्को document
            </p>
            <div className="space-y-2">
              {relatedAtoms.map(rel => {
                const relType  = TYPE_STYLE[rel.type];
                const relLevel = atomConfidenceLevel(rel.confidence);
                const relConf  = relLevel === "high" ? "text-green-400" : relLevel === "medium" ? "text-amber-400" : "text-red-400";
                return (
                  <button
                    key={rel.id}
                    onClick={() => onSelectAtom?.(rel)}
                    className="w-full text-left border border-zinc-800 rounded-xl p-3 space-y-1.5 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${relType.cls}`}>
                        {relType.labelNp}
                      </span>
                      <span className={`ml-auto text-xs font-bold ${relConf}`}>
                        {Math.round(rel.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2">{rel.text}</p>
                    <p className="text-zinc-600 text-[10px]">↗ {rel.sourceDocTitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
