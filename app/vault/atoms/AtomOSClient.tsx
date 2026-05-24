"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useVaultAuth }        from "../../../hooks/vault/useVaultAuth";
import { useAtoms }            from "../../../hooks/vault/useAtoms";
import { useIntelligenceDocs } from "../../../hooks/vault/useIntelligenceDocs";
import { harvestAtomsFromDoc } from "../../../lib/vault/atoms";
import { DeepAtomView }        from "../../../components/atoms/DeepAtomView";
import { ActionLearnCard, type ActionLearnData } from "../../../components/vault/LearnTip";
import type { CivicAtom, AtomType, BranchId } from "../../../lib/types/atoms";
import { CONSTITUTION_BRANCHES, atomConfidenceLevel } from "../../../lib/types/atoms";

// ── Colour map (complete strings for Tailwind) ────────────────────────────────

const BC: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  cyan:    { text: "text-cyan-400",    bg: "bg-cyan-950/50",    border: "border-cyan-900",    bar: "bg-cyan-500"    },
  green:   { text: "text-green-400",   bg: "bg-green-950/50",   border: "border-green-900",   bar: "bg-green-500"   },
  blue:    { text: "text-blue-400",    bg: "bg-blue-950/50",    border: "border-blue-900",    bar: "bg-blue-500"    },
  violet:  { text: "text-violet-400",  bg: "bg-violet-950/50",  border: "border-violet-900",  bar: "bg-violet-500"  },
  amber:   { text: "text-amber-400",   bg: "bg-amber-950/50",   border: "border-amber-900",   bar: "bg-amber-500"   },
  pink:    { text: "text-pink-400",    bg: "bg-pink-950/50",    border: "border-pink-900",    bar: "bg-pink-500"    },
  emerald: { text: "text-emerald-400", bg: "bg-emerald-950/50", border: "border-emerald-900", bar: "bg-emerald-500" },
  orange:  { text: "text-orange-400",  bg: "bg-orange-950/50",  border: "border-orange-900",  bar: "bg-orange-500"  },
};

const ATOM_TYPE_STYLE: Record<AtomType, { label: string; labelNp: string; cls: string }> = {
  fact:          { label: "Fact",          labelNp: "तथ्य",           cls: "bg-zinc-800 text-zinc-300 border-zinc-700"          },
  promise:       { label: "Promise",       labelNp: "प्रतिबद्धता",    cls: "bg-violet-950 text-violet-300 border-violet-800"    },
  policy_change: { label: "Policy Change", labelNp: "नीति परिवर्तन",  cls: "bg-amber-950 text-amber-300 border-amber-800"       },
  financial:     { label: "Financial",     labelNp: "आर्थिक",         cls: "bg-emerald-950 text-emerald-300 border-emerald-800"  },
  risk:          { label: "Risk",          labelNp: "जोखिम",          cls: "bg-red-950 text-red-300 border-red-800"             },
  right:         { label: "Right",         labelNp: "अधिकार",         cls: "bg-cyan-950 text-cyan-300 border-cyan-800"          },
  target:        { label: "Target",        labelNp: "लक्ष्य",          cls: "bg-blue-950 text-blue-300 border-blue-800"          },
  institution:   { label: "Institution",   labelNp: "संस्था",          cls: "bg-pink-950 text-pink-300 border-pink-800"          },
};

// ── Confidence bar ────────────────────────────────────────────────────────────

function ConfBar({ confidence, size = "md" }: { confidence: number; size?: "sm" | "md" }) {
  const level = atomConfidenceLevel(confidence);
  const color = level === "high" ? "bg-green-500" : level === "medium" ? "bg-amber-500" : "bg-red-500";
  const h     = size === "sm" ? "h-0.5" : "h-1";
  return (
    <div className={`w-full ${h} bg-zinc-800 rounded-full overflow-hidden`}>
      <div className={`${h} ${color} rounded-full transition-all`} style={{ width: `${Math.round(confidence * 100)}%` }} />
    </div>
  );
}

// ── Atom card ─────────────────────────────────────────────────────────────────

function AtomCard({
  atom,
  showDetail,
  onSelect,
}: {
  atom:        CivicAtom;
  showDetail?: boolean;
  onSelect?:   (atom: CivicAtom) => void;
}) {
  const [open, setOpen] = useState(false);
  const typeStyle = ATOM_TYPE_STYLE[atom.type];
  const level     = atomConfidenceLevel(atom.confidence);
  const confColor = level === "high" ? "text-green-400" : level === "medium" ? "text-amber-400" : "text-red-400";

  return (
    <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40 hover:border-zinc-700 transition-colors">
      <div className="px-4 py-3 space-y-2">
        {/* Type + confidence header */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${typeStyle.cls}`}>
            {typeStyle.labelNp}
          </span>
          {atom.constitutionalBranches.slice(0, 2).map(bid => {
            const branch = CONSTITUTION_BRANCHES.find(b => b.id === bid);
            if (!branch) return null;
            const bc = BC[branch.color] ?? BC.cyan;
            return (
              <span key={bid} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${bc.border} ${bc.text}`}>
                {branch.icon} {branch.article}
              </span>
            );
          })}
          <span className={`ml-auto text-xs font-bold ${confColor}`}>
            {Math.round(atom.confidence * 100)}%
          </span>
        </div>

        {/* Atom text */}
        <p className="text-sm text-zinc-200 leading-relaxed">{atom.text}</p>

        {/* Confidence bar */}
        <ConfBar confidence={atom.confidence} />

        {/* Source + actions */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-zinc-600 text-xs truncate">
            ↗ {atom.sourceDocTitle}
            {atom.sourceAuthority && ` · ${atom.sourceAuthority}`}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {onSelect && (
              <button
                onClick={() => onSelect(atom)}
                className="text-[10px] text-cyan-700 hover:text-cyan-400 font-semibold transition-colors"
              >
                🔬 Inspect
              </button>
            )}
            <button
              onClick={() => setOpen(p => !p)}
              className="text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              {open ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Expanded inline detail */}
        {(open || showDetail) && (
          <div className="border-t border-zinc-900 pt-2 space-y-2">
            {atom.citizenGroups.length > 0 && (
              <div>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1">प्रभावित नागरिक</p>
                <div className="flex flex-wrap gap-1">
                  {atom.citizenGroups.map((g, i) => (
                    <span key={i} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              </div>
            )}
            {atom.constitutionalRefs.length > 0 && (
              <div>
                <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1">संविधान सन्दर्भ</p>
                <div className="flex flex-wrap gap-1">
                  {atom.constitutionalRefs.map((ref, i) => (
                    <span key={i} className="text-xs bg-amber-950/40 border border-amber-900/50 text-amber-400 px-2 py-0.5 rounded-full">{ref}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-zinc-700 text-[10px]">
              Source: {atom.harvestedFrom.replace("_", " ")} · Harvested: {new Date(atom.harvestedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── View: Atom Feed ───────────────────────────────────────────────────────────

const ATOM_TYPES: { key: AtomType | "all"; label: string; np: string }[] = [
  { key: "all",          label: "All",          np: "सबै"           },
  { key: "promise",      label: "Promises",     np: "प्रतिबद्धता"   },
  { key: "policy_change",label: "Policy",       np: "नीति"          },
  { key: "financial",    label: "Financial",    np: "आर्थिक"        },
  { key: "fact",         label: "Facts",        np: "तथ्य"          },
  { key: "risk",         label: "Risks",        np: "जोखिम"         },
  { key: "right",        label: "Rights",       np: "अधिकार"        },
  { key: "target",       label: "Targets",      np: "लक्ष्य"         },
];

function AtomFeedView({ atoms, onSelectAtom }: { atoms: CivicAtom[]; onSelectAtom: (a: CivicAtom) => void }) {
  const [typeFilter,       setTypeFilter]       = useState<AtomType | "all">("all");
  const [branchFilter,     setBranchFilter]     = useState<BranchId | "all">("all");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [search,           setSearch]           = useState("");

  const filtered = useMemo(() => atoms.filter(a => {
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (branchFilter !== "all" && !a.constitutionalBranches.includes(branchFilter)) return false;
    if (confidenceFilter !== "all" && atomConfidenceLevel(a.confidence) !== confidenceFilter) return false;
    if (search && !a.text.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [atoms, typeFilter, branchFilter, confidenceFilter, search]);

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="atom खोज्नुहोस्…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ATOM_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`shrink-0 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              typeFilter === t.key
                ? "bg-zinc-700 border-zinc-600 text-white"
                : "border-zinc-800 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.np}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value as BranchId | "all")}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">सबै branches</option>
          {CONSTITUTION_BRANCHES.map(b => (
            <option key={b.id} value={b.id}>{b.icon} {b.title}</option>
          ))}
        </select>
        <select
          value={confidenceFilter}
          onChange={e => setConfidenceFilter(e.target.value as typeof confidenceFilter)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">सबै confidence</option>
          <option value="high">High (75%+)</option>
          <option value="medium">Medium (45–75%)</option>
          <option value="low">Low (&lt;45%)</option>
        </select>
        <span className="text-zinc-600 text-xs self-center ml-auto">{filtered.length} atoms</span>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-600 text-sm">
          {atoms.length === 0
            ? "कुनै atoms छैन — documents approve गर्नुहोस्"
            : "यो filter मा कुनै atoms भेटिएन"}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(atom => (
            <AtomCard key={atom.id} atom={atom} onSelect={onSelectAtom} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── View: Cross-tree Relationship Engine ──────────────────────────────────────

function CrossTreeView({ atoms, onSelectAtom }: { atoms: CivicAtom[]; onSelectAtom: (a: CivicAtom) => void }) {
  const [activeBranch, setActiveBranch] = useState<BranchId | null>(null);

  const branchStats = useMemo(() => {
    return CONSTITUTION_BRANCHES.map(branch => {
      const branchAtoms = atoms.filter(a => a.constitutionalBranches.includes(branch.id));
      const promises    = branchAtoms.filter(a => a.type === "promise");
      const risks       = branchAtoms.filter(a => a.type === "risk");
      const crossLinks  = new Set<BranchId>();
      branchAtoms.forEach(a => a.constitutionalBranches.forEach(b => { if (b !== branch.id) crossLinks.add(b); }));
      return { branch, atoms: branchAtoms, promises, risks, crossLinks: Array.from(crossLinks) };
    });
  }, [atoms]);

  const activeStats = activeBranch ? branchStats.find(b => b.branch.id === activeBranch) : null;

  return (
    <div className="space-y-4">
      <p className="text-zinc-600 text-xs">हरेक संविधानको शाखामा कति atoms — branch थिचेर cross-connections हेर्नुहोस्</p>

      <div className="grid grid-cols-2 gap-2">
        {branchStats.map(({ branch, atoms: ba, promises, risks, crossLinks }) => {
          const bc       = BC[branch.color] ?? BC.cyan;
          const isActive = activeBranch === branch.id;
          return (
            <button
              key={branch.id}
              onClick={() => setActiveBranch(isActive ? null : branch.id)}
              className={`text-left p-3 rounded-2xl border transition-all ${
                isActive ? `${bc.bg} ${bc.border}` : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{branch.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-black truncate ${bc.text}`}>{branch.title}</p>
                  <p className="text-zinc-600 text-[10px]">{branch.article}</p>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <p className={`text-xl font-black ${ba.length > 0 ? bc.text : "text-zinc-700"}`}>{ba.length}</p>
                  <p className="text-zinc-600 text-[10px]">atoms</p>
                </div>
                {promises.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-violet-400">{promises.length}</p>
                    <p className="text-zinc-600 text-[10px]">promises</p>
                  </div>
                )}
                {risks.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-red-400">{risks.length}</p>
                    <p className="text-zinc-600 text-[10px]">risks</p>
                  </div>
                )}
                {crossLinks.length > 0 && (
                  <div className="ml-auto">
                    <p className="text-sm font-bold text-orange-400">{crossLinks.length}</p>
                    <p className="text-zinc-600 text-[10px]">links</p>
                  </div>
                )}
              </div>
              <div className="mt-2 h-0.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bc.bar}`}
                  style={{ width: `${Math.min(100, (ba.length / Math.max(1, atoms.length)) * 100 * 5)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {activeStats && (
        <div className={`rounded-2xl border ${BC[activeStats.branch.color]?.border ?? "border-zinc-800"} ${BC[activeStats.branch.color]?.bg ?? "bg-zinc-900/40"} p-4 space-y-4`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activeStats.branch.icon}</span>
            <div>
              <p className={`font-black ${BC[activeStats.branch.color]?.text ?? "text-white"}`}>{activeStats.branch.title}</p>
              <p className="text-zinc-500 text-xs">{activeStats.branch.article} · {activeStats.branch.titleEn}</p>
            </div>
          </div>

          {activeStats.crossLinks.length > 0 && (
            <div>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">यो branch जोडिएको अन्य branches</p>
              <div className="flex flex-wrap gap-2">
                {activeStats.crossLinks.map(bid => {
                  const linked     = CONSTITUTION_BRANCHES.find(b => b.id === bid);
                  if (!linked) return null;
                  const lbc        = BC[linked.color] ?? BC.cyan;
                  const sharedAtoms = activeStats.atoms.filter(a => a.constitutionalBranches.includes(bid));
                  return (
                    <button
                      key={bid}
                      onClick={() => setActiveBranch(bid)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border ${lbc.border} ${lbc.bg} transition-colors`}
                    >
                      <span>{linked.icon}</span>
                      <span className={`text-xs font-semibold ${lbc.text}`}>{linked.title}</span>
                      <span className="text-zinc-500 text-[10px]">{sharedAtoms.length} shared</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">
              {activeStats.atoms.length} atoms · यो branch मा
            </p>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {activeStats.atoms.map(a => <AtomCard key={a.id} atom={a} onSelect={onSelectAtom} />)}
              {activeStats.atoms.length === 0 && (
                <p className="text-zinc-700 text-xs text-center py-4">यो branch मा अझै कुनै atom छैन</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── View: Branch Health (Living Constitution) ─────────────────────────────────

function BranchHealthView({ atoms, onSelectAtom }: { atoms: CivicAtom[]; onSelectAtom: (a: CivicAtom) => void }) {
  const [activeBranch, setActiveBranch] = useState<BranchId | null>(null);

  const healthData = useMemo(() => {
    return CONSTITUTION_BRANCHES.map(branch => {
      const ba       = atoms.filter(a => a.constitutionalBranches.includes(branch.id));
      const promises = ba.filter(a => a.type === "promise").length;
      const facts    = ba.filter(a => a.type === "fact").length;
      const policies = ba.filter(a => a.type === "policy_change").length;
      const risks    = ba.filter(a => a.type === "risk").length;
      const targets  = ba.filter(a => a.type === "target").length;
      const rights   = ba.filter(a => a.type === "right").length;
      const unmet    = Math.max(0, promises - facts - policies); // promises with no evidence
      // Health: facts/policies/rights = growth; risks = decay; unmet promises = drag
      const score    = Math.max(0, Math.min(100,
        50 + facts * 4 + policies * 2 + rights * 2 + promises * 1 - risks * 5 - unmet * 2,
      ));
      const vitality = score >= 70 ? "thriving" : score >= 35 ? "growing" : "declining";
      return { branch, ba, promises, facts, policies, risks, targets, rights, unmet, score, vitality };
    }).sort((a, b) => b.score - a.score);
  }, [atoms]);

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-zinc-300 text-xs font-bold">🌿 Living Constitution — Branch Health</p>
        <p className="text-zinc-600 text-xs">
          Facts/policies = growth · Risks = decay · Unmet promises = drag
        </p>
      </div>

      <div className="space-y-2">
        {healthData.map(({ branch, ba, promises, facts, risks, unmet, score, vitality }) => {
          const bc       = BC[branch.color] ?? BC.cyan;
          const isActive = activeBranch === branch.id;
          const statusIcon  = vitality === "thriving" ? "🌿" : vitality === "growing" ? "🌱" : "🍂";
          const statusColor = vitality === "thriving" ? "text-green-400" : vitality === "growing" ? "text-amber-400" : "text-red-400";
          const barColor    = vitality === "thriving" ? "bg-green-500" : vitality === "growing" ? "bg-amber-500" : "bg-red-500";

          return (
            <div key={branch.id}>
              <button
                onClick={() => setActiveBranch(isActive ? null : branch.id)}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  isActive ? `${bc.bg} ${bc.border}` : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{branch.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-black truncate ${bc.text}`}>{branch.title}</p>
                    <p className="text-zinc-600 text-[10px]">{branch.article}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-lg font-black leading-none ${statusColor}`}>{score}</p>
                    <p className="text-[10px] text-zinc-600">/ 100</p>
                  </div>
                  <span className="text-xl shrink-0">{statusIcon}</span>
                </div>

                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all`}
                    style={{ width: `${score}%` }}
                  />
                </div>

                <div className="flex gap-3 text-[10px] text-zinc-600">
                  <span className="text-violet-400">{promises} promises</span>
                  <span className="text-green-400">{facts} facts</span>
                  {risks > 0   && <span className="text-red-400">{risks} risks</span>}
                  {unmet > 0   && <span className="text-orange-400">{unmet} unmet</span>}
                  <span className="ml-auto">{ba.length} atoms</span>
                </div>
              </button>

              {isActive && (
                <div className="mt-2 pl-2 space-y-1.5">
                  {ba.length === 0 ? (
                    <p className="text-zinc-700 text-xs text-center py-3">यो branch मा अझै कुनै atom छैन</p>
                  ) : (
                    <>
                      {ba.slice(0, 6).map(a => (
                        <button
                          key={a.id}
                          onClick={() => onSelectAtom(a)}
                          className="w-full text-left border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-colors space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${ATOM_TYPE_STYLE[a.type].cls}`}>
                              {ATOM_TYPE_STYLE[a.type].labelNp}
                            </span>
                            <span className={`ml-auto text-[10px] font-bold ${
                              atomConfidenceLevel(a.confidence) === "high"   ? "text-green-400"
                            : atomConfidenceLevel(a.confidence) === "medium" ? "text-amber-400"
                            :                                                  "text-red-400"
                            }`}>
                              {Math.round(a.confidence * 100)}%
                            </span>
                          </div>
                          <p className="text-zinc-300 text-xs line-clamp-2">{a.text}</p>
                        </button>
                      ))}
                      {ba.length > 6 && (
                        <p className="text-zinc-600 text-[10px] text-center py-1">+ {ba.length - 6} more — Inspect tab मा हेर्नुहोस्</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── View: Civic Gap Detection ─────────────────────────────────────────────────

function CivicGapView({ atoms }: { atoms: CivicAtom[] }) {
  const [selectedBranch, setSelectedBranch] = useState<BranchId | null>(null);

  const gapData = useMemo(() => {
    return CONSTITUTION_BRANCHES.map(branch => {
      const ba        = atoms.filter(a => a.constitutionalBranches.includes(branch.id));
      const promises  = ba.filter(a => a.type === "promise");
      const targets   = ba.filter(a => a.type === "target");
      const facts     = ba.filter(a => a.type === "fact");
      const policies  = ba.filter(a => a.type === "policy_change");
      const risks     = ba.filter(a => a.type === "risk");
      const committed   = promises.length + targets.length;
      const implemented = facts.length + policies.length;
      const gapScore    = committed > 0 ? Math.max(0, 1 - implemented / (committed + 1)) : null;
      const gapPct      = gapScore !== null ? Math.round(gapScore * 100) : null;
      return { branch, promises, targets, facts, policies, risks, committed, implemented, gapScore, gapPct, total: ba.length };
    }).sort((a, b) => (b.gapScore ?? -1) - (a.gapScore ?? -1));
  }, [atoms]);

  const withGap  = gapData.filter(g => g.gapScore !== null);
  const noData   = gapData.filter(g => g.gapScore === null);
  const selected = selectedBranch ? gapData.find(g => g.branch.id === selectedBranch) : null;

  return (
    <div className="space-y-4">
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl px-4 py-3 space-y-1">
        <p className="text-zinc-300 text-xs font-bold">Civic Gap = Promise − Implementation</p>
        <p className="text-zinc-600 text-xs">सरकारले गरेको प्रतिबद्धता र implement भएको काम बीचको फरक। High gap = unfulfilled promises।</p>
      </div>

      <div className="space-y-2">
        {withGap.map(({ branch, gapPct, committed, implemented, risks, total }) => {
          const bc      = BC[branch.color] ?? BC.cyan;
          const isHigh  = (gapPct ?? 0) >= 60;
          const isMed   = (gapPct ?? 0) >= 30;
          const gapColor = isHigh ? "bg-red-500" : isMed ? "bg-amber-500" : "bg-green-500";
          const gapText  = isHigh ? "text-red-400" : isMed ? "text-amber-400" : "text-green-400";
          return (
            <button
              key={branch.id}
              onClick={() => setSelectedBranch(selectedBranch === branch.id ? null : branch.id)}
              className={`w-full text-left p-3 rounded-2xl border transition-all ${
                selectedBranch === branch.id ? `${bc.bg} ${bc.border}` : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span>{branch.icon}</span>
                <span className={`text-xs font-bold ${bc.text}`}>{branch.title}</span>
                {risks.length > 0 && (
                  <span className="text-[10px] text-red-400 bg-red-950/40 border border-red-900/50 px-1.5 rounded ml-1">
                    {risks.length} risks
                  </span>
                )}
                <span className={`ml-auto text-sm font-black ${gapText}`}>{gapPct}% gap</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-1">
                <div className={`h-full ${gapColor} rounded-full`} style={{ width: `${gapPct}%` }} />
              </div>
              <div className="flex gap-4 text-[10px] text-zinc-600">
                <span className="text-violet-400">{committed} प्रतिबद्धता</span>
                <span className="text-green-400">{implemented} implemented</span>
                <span>{total} atoms total</span>
              </div>
            </button>
          );
        })}
        {noData.map(({ branch }) => (
          <div key={branch.id} className="flex items-center gap-2 px-3 py-2.5 border border-zinc-900 rounded-xl opacity-40">
            <span>{branch.icon}</span>
            <span className="text-zinc-600 text-xs">{branch.title}</span>
            <span className="ml-auto text-zinc-700 text-xs">data छैन</span>
          </div>
        ))}
      </div>

      {selected && (
        <div className={`rounded-2xl border ${BC[selected.branch.color]?.border ?? "border-zinc-800"} p-4 space-y-3`}>
          <p className={`font-black ${BC[selected.branch.color]?.text ?? "text-white"}`}>
            {selected.branch.icon} {selected.branch.title} — Civic Gap Detail
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "प्रतिबद्धताहरू", atoms: selected.promises, color: "text-violet-400", empty: "कुनै promise detect भएन" },
              { label: "Targets/Goals",  atoms: selected.targets,  color: "text-blue-400",   empty: "कुनै target detect भएन" },
              { label: "Facts/Evidence", atoms: selected.facts,    color: "text-green-400",  empty: "कुनै evidence detect भएन" },
              { label: "Policy Changes", atoms: selected.policies, color: "text-amber-400",  empty: "कुनै policy change detect भएन" },
            ].map(({ label, atoms: ga, color, empty }) => (
              <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-2.5">
                <p className={`text-xs font-bold ${color} mb-1`}>{label} ({ga.length})</p>
                {ga.length === 0
                  ? <p className="text-zinc-700 text-xs">{empty}</p>
                  : ga.slice(0, 3).map(a => (
                    <p key={a.id} className="text-zinc-400 text-xs line-clamp-2 mb-1">· {a.text.slice(0, 80)}…</p>
                  ))}
              </div>
            ))}
          </div>
          {selected.risks.length > 0 && (
            <div className="bg-red-950/30 border border-red-900/50 rounded-xl p-2.5">
              <p className="text-red-400 text-xs font-bold mb-1">⚠ {selected.risks.length} Risks Detected</p>
              {selected.risks.map(r => (
                <p key={r.id} className="text-red-300/70 text-xs line-clamp-1 mb-0.5">· {r.text}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── View: Timeline ────────────────────────────────────────────────────────────

function TimelineView({ atoms }: { atoms: CivicAtom[] }) {
  const monthly = useMemo(() => {
    const groups: Record<string, CivicAtom[]> = {};
    for (const atom of atoms) {
      const d   = new Date(atom.uploadedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(atom);
    }
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, monthAtoms]) => ({
        month,
        label:      new Date(month + "-01").toLocaleDateString("ne-NP", { year: "numeric", month: "long" }),
        atoms:      monthAtoms,
        promises:   monthAtoms.filter(a => a.type === "promise").length,
        policies:   monthAtoms.filter(a => a.type === "policy_change").length,
        financials: monthAtoms.filter(a => a.type === "financial").length,
        risks:      monthAtoms.filter(a => a.type === "risk").length,
        avgConf:    monthAtoms.reduce((s, a) => s + a.confidence, 0) / monthAtoms.length,
      }));
  }, [atoms]);

  const maxCount   = Math.max(...monthly.map(m => m.atoms.length), 1);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const activeData = monthly.find(m => m.month === activeMonth);

  if (monthly.length === 0) {
    return <p className="text-zinc-600 text-sm text-center py-12">Timeline को लागि atoms चाहिन्छ — documents approve गर्नुहोस्</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-zinc-600 text-xs">Atoms over time — month थिचेर detail हेर्नुहोस्</p>

      <div className="flex items-end gap-2 overflow-x-auto pb-2">
        {monthly.map(m => {
          const heightPct = (m.atoms.length / maxCount) * 100;
          const isActive  = activeMonth === m.month;
          return (
            <button
              key={m.month}
              onClick={() => setActiveMonth(isActive ? null : m.month)}
              className="flex flex-col items-center gap-1 shrink-0 group"
            >
              <span className="text-zinc-500 text-[10px] font-bold">{m.atoms.length}</span>
              <div
                className={`w-10 rounded-t-lg transition-all ${isActive ? "bg-cyan-500" : "bg-zinc-700 group-hover:bg-zinc-600"}`}
                style={{ height: `${Math.max(8, heightPct * 1.2)}px` }}
              >
                {m.promises > 0 && (
                  <div
                    className="w-full bg-violet-500 rounded-t-lg"
                    style={{ height: `${(m.promises / m.atoms.length) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-zinc-700 text-[9px] text-center w-10 leading-tight">{m.month.slice(5)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-4 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500 inline-block" />Total atoms</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-500 inline-block" />Promises</span>
      </div>

      {activeData && (
        <div className="border border-zinc-800 rounded-2xl p-4 space-y-3">
          <p className="text-white font-black">{activeData.label}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "जम्मा atoms",    val: activeData.atoms.length,                                                          color: "text-white"       },
              { label: "Avg confidence", val: `${Math.round(activeData.avgConf * 100)}%`,                                       color: activeData.avgConf >= 0.7 ? "text-green-400" : "text-amber-400" },
              { label: "Promises",       val: activeData.promises,                                                              color: "text-violet-400"  },
              { label: "Policy changes", val: activeData.policies,                                                              color: "text-amber-400"   },
              { label: "Financial",      val: activeData.financials,                                                            color: "text-emerald-400" },
              { label: "Risks",          val: activeData.risks,                                                                 color: "text-red-400"     },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-zinc-900/50 border border-zinc-800 rounded-xl px-2.5 py-2">
                <p className="text-zinc-500 text-[10px]">{label}</p>
                <p className={`font-black text-sm ${color}`}>{val}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activeData.atoms.slice(0, 5).map(a => <AtomCard key={a.id} atom={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── View: Public Learning from Real Atoms ─────────────────────────────────────

function LearningView({ atoms }: { atoms: CivicAtom[] }) {
  const [idx, setIdx] = useState(0);

  const teachingAtoms = useMemo(() => {
    const buckets = {
      promise:       atoms.filter(a => a.type === "promise").slice(0, 4),
      financial:     atoms.filter(a => a.type === "financial").slice(0, 4),
      policy_change: atoms.filter(a => a.type === "policy_change").slice(0, 3),
      risk:          atoms.filter(a => a.type === "risk").slice(0, 3),
      fact:          atoms.filter(a => a.type === "fact").slice(0, 3),
    };
    return [...buckets.promise, ...buckets.financial, ...buckets.policy_change, ...buckets.risk, ...buckets.fact];
  }, [atoms]);

  if (teachingAtoms.length === 0) {
    return (
      <div className="text-center py-12 space-y-2">
        <p className="text-3xl">🎓</p>
        <p className="text-zinc-400 text-sm">Learning mode को लागि real atoms चाहिन्छ</p>
        <p className="text-zinc-600 text-xs">Documents approve गर्नुहोस् — atoms generate हुन्छन्</p>
      </div>
    );
  }

  const atom   = teachingAtoms[idx % teachingAtoms.length];
  const branch = atom.constitutionalBranches[0]
    ? CONSTITUTION_BRANCHES.find(b => b.id === atom.constitutionalBranches[0])
    : null;
  const type   = ATOM_TYPE_STYLE[atom.type];
  const level  = atomConfidenceLevel(atom.confidence);
  const bc     = branch ? (BC[branch.color] ?? BC.cyan) : BC.cyan;

  const contextMap: Record<AtomType, string> = {
    promise:       "सरकारले गरेको प्रतिबद्धता — जनताले यो track गर्न सक्छन्",
    financial:     "आर्थिक तथ्य — नागरिकको बचत, ऋण, वा करमा असर पर्छ",
    policy_change: "नीति परिवर्तन — नियम, ऐन, वा विनियमनमा भएको बदलाव",
    risk:          "चेतावनी — यो विषयमा सावधान हुनुपर्छ",
    right:         "संवैधानिक हक — नागरिकको guaranteed अधिकार",
    target:        "सरकारी लक्ष्य — achieve भयो कि भएन track गर्न सकिन्छ",
    fact:          "प्रमाणित तथ्य — document बाट directly निकालिएको",
    institution:   "संस्थागत निर्णय — सरकारी निकायको action",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-zinc-400 text-sm font-semibold">🎓 नागरिक सिक्ने मोड</p>
        <p className="text-zinc-600 text-xs">{idx + 1} / {teachingAtoms.length}</p>
      </div>

      <div className={`rounded-3xl border ${bc.border} ${bc.bg} p-5 space-y-4`}>
        {branch && (
          <div className="flex items-center gap-2">
            <span className="text-2xl">{branch.icon}</span>
            <div>
              <p className={`text-xs font-black ${bc.text}`}>{branch.title}</p>
              <p className="text-zinc-500 text-[10px]">{branch.article}</p>
            </div>
          </div>
        )}
        <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-full border ${type.cls}`}>
          {type.labelNp}
        </span>
        <p className="text-white text-base leading-relaxed font-medium">{atom.text}</p>
        <div className="bg-black/30 rounded-2xl px-3 py-2.5">
          <p className="text-zinc-300 text-xs leading-relaxed">{contextMap[atom.type]}</p>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>AI को निश्चितता</span>
            <span className={level === "high" ? "text-green-400" : level === "medium" ? "text-amber-400" : "text-red-400"}>
              {Math.round(atom.confidence * 100)}% — {level === "high" ? "भरपर्दो" : level === "medium" ? "मध्यम" : "अनिश्चित"}
            </span>
          </div>
          <ConfBar confidence={atom.confidence} />
        </div>
        {atom.citizenGroups.length > 0 && (
          <div>
            <p className="text-zinc-500 text-[10px] font-bold mb-1.5">यसले प्रभावित गर्छ:</p>
            <div className="flex flex-wrap gap-1.5">
              {atom.citizenGroups.map((g, i) => (
                <span key={i} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">{g}</span>
              ))}
            </div>
          </div>
        )}
        <p className="text-zinc-600 text-[10px]">
          स्रोत: {atom.sourceDocTitle}
          {atom.sourceAuthority && ` · ${atom.sourceAuthority}`}
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => setIdx(p => Math.max(0, p - 1))}
          disabled={idx === 0}
          className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold disabled:opacity-30"
        >
          ← अघिल्लो
        </button>
        <button
          onClick={() => setIdx(p => Math.min(teachingAtoms.length - 1, p + 1))}
          disabled={idx === teachingAtoms.length - 1}
          className="flex-1 py-2.5 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl text-sm font-semibold disabled:opacity-30"
        >
          अर्को →
        </button>
      </div>
    </div>
  );
}

// ── OS Header stats ───────────────────────────────────────────────────────────

function OSStats({ atoms }: { atoms: CivicAtom[] }) {
  const branchesCovered = new Set(atoms.flatMap(a => a.constitutionalBranches)).size;
  const promises        = atoms.filter(a => a.type === "promise").length;
  const highConf        = atoms.filter(a => atomConfidenceLevel(a.confidence) === "high").length;
  const avgConf         = atoms.length > 0
    ? Math.round(atoms.reduce((s, a) => s + a.confidence, 0) / atoms.length * 100)
    : 0;

  const stats = [
    { label: "atoms",             val: atoms.length,         color: "text-white"       },
    { label: "branches covered",  val: `${branchesCovered}/8`, color: "text-cyan-400"  },
    { label: "प्रतिबद्धताहरू",     val: promises,             color: "text-violet-400"  },
    { label: "avg confidence",    val: `${avgConf}%`,         color: avgConf >= 70 ? "text-green-400" : "text-amber-400" },
    { label: "high confidence",   val: highConf,             color: "text-green-400"   },
  ];

  return (
    <div className="flex gap-5 overflow-x-auto pb-1">
      {stats.map(s => (
        <div key={s.label} className="shrink-0">
          <p className={`text-xl font-black leading-none ${s.color}`}>{s.val}</p>
          <p className="text-zinc-600 text-[10px] mt-0.5">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── OS Intelligence Panel — teaches the founder what the OS is ───────────────

function AtomOSIntel({ atomCount }: { atomCount: number }) {
  const osAction: ActionLearnData = {
    icon:  "⚡",
    title: "Civic Intelligence OS",
    color: "cyan",
    does:  `यो page Nepal को सम्पूर्ण civic intelligence एकै ठाउँमा देखाउँछ। Documents होइन — extracted atoms नै product हो। हरेक atom = एउटा स्वतन्त्र civic fact जुन संविधानसँग linked छ र नागरिकलाई directly explain गर्न मिल्छ।`,
    creates: [
      `Atoms — approved documents बाट automatically harvested (vault_civic_atoms collection)`,
      `हरेक atom मा: type, branches, confidence, typeReasoning, constitutionalLinkReasoning, intelligenceFlow`,
      `Branch Health scores — facts + promises - risks formula बाट compute`,
      `Civic Gap — promises vs implementation को real-time calculation`,
    ],
    flows: [
      `vault_civic_atoms → subscribeAtoms() → useAtoms() hook → यो page`,
      `Atom Inspect (🔬) → DeepAtomView: AI reasoning, constitutional linkage, intelligence flow`,
      `Branch Health (🌿) → शाखा स्वास्थ्य: constitution tree को living state`,
      `Civic Gap (📊) → unmet promises को quantification`,
      `Learning (🎓) → नागरिकलाई teach गर्ने cards`,
    ],
    future: [
      "Public Constitution Tree: atoms visually on branches — citizens see live governance",
      "Cross-document Relationship Engine: atom-to-atom links across all documents",
      "Citizen Alert System: high-risk atoms → notification to affected citizens",
      "Time Evolution: branch health history — governance trajectory over months/years",
      "Policy Promise Tracker: promise atoms → fulfilled/unfulfilled public dashboard",
    ],
    example: atomCount > 0
      ? `अहिले ${atomCount} atoms active छन् — approve गरिएका documents बाट harvested। हरेक atom 🔬 Inspect गरेर AI को full reasoning हेर्न सकिन्छ।`
      : `अहिले atoms छैनन् — /vault/admin मा documents approve गर्नुहोस्। Approve हुनासाथ atoms यहाँ automatically appear हुन्छन्।`,
  };

  return <ActionLearnCard actions={[osAction]} />;
}

// ── Live atom harvesting from approved docs (fallback when collection empty) ──

function useLiveAtoms(
  ownerId:       string | null,
  firestoreAtoms: CivicAtom[],
  approvedDocs:  ReturnType<typeof useIntelligenceDocs>["docs"],
) {
  return useMemo(() => {
    if (firestoreAtoms.length > 0) return firestoreAtoms;
    return approvedDocs
      .filter(d => d.adminApprovalStatus === "approved")
      .flatMap(d => harvestAtomsFromDoc(d).map(a => ({ ...a, id: (a as unknown as { id: string }).id ?? `${d.id}-x` }))) as CivicAtom[];
  }, [firestoreAtoms, approvedDocs]);
}

// ── Main ──────────────────────────────────────────────────────────────────────

type OSView = "atoms" | "crosstree" | "branches" | "gaps" | "timeline" | "learn";

const VIEWS: { key: OSView; icon: string; np: string }[] = [
  { key: "atoms",     icon: "⚡", np: "Intelligence" },
  { key: "crosstree", icon: "🌳", np: "अन्तर-शाखा"  },
  { key: "branches",  icon: "🌿", np: "शाखा स्वास्थ्य" },
  { key: "gaps",      icon: "📊", np: "नागरिक अन्तर"  },
  { key: "timeline",  icon: "⏱", np: "इतिहास"        },
  { key: "learn",     icon: "🎓", np: "सिक्नुहोस्"    },
];

export default function AtomOSClient() {
  const [view,         setView]         = useState<OSView>("atoms");
  const [selectedAtom, setSelectedAtom] = useState<CivicAtom | null>(null);

  const { user, loading: authLoading, isOwner } = useVaultAuth();
  const uid = user?.uid ?? null;
  const { atoms: firestoreAtoms, loading: atomLoading } = useAtoms(uid);
  const { docs, loading: docsLoading } = useIntelligenceDocs(uid);

  const atoms   = useLiveAtoms(uid, firestoreAtoms, docs);
  const loading = authLoading || atomLoading || docsLoading;

  if (!authLoading && !isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-4xl">🔒</p>
          <p className="text-white font-bold">Access Denied</p>
          <Link href="/vault" className="text-xs text-cyan-600 hover:text-cyan-400">← Back</Link>
        </div>
      </div>
    );
  }

  // ── Deep Atom Inspector overlay ────────────────────────────────────────────
  if (selectedAtom) {
    return (
      <DeepAtomView
        atom={selectedAtom}
        allAtoms={atoms}
        onBack={() => setSelectedAtom(null)}
        onSelectAtom={setSelectedAtom}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black">

      {/* ── OS Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-900 px-4 pt-6 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <h1 className="text-lg font-black text-white tracking-tight">Nepal Civic Intelligence OS</h1>
            </div>
            <p className="text-zinc-600 text-xs mt-0.5">
              नेपालको सार्वजनिक intelligence — documents होइन, atoms नै product हो
            </p>
          </div>
          <Link
            href="/vault/documents"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors shrink-0 mt-1"
          >
            Documents →
          </Link>
        </div>
        {!loading && <OSStats atoms={atoms} />}
        {!loading && <AtomOSIntel atomCount={atoms.length} />}
      </div>

      {/* ── View nav ──────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-zinc-900 overflow-x-auto">
        {VIEWS.map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
              view === v.key
                ? "border-cyan-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.np}</span>
          </button>
        ))}
      </div>

      {/* ── View content ──────────────────────────────────────────────────── */}
      <div className="p-4 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
            Loading intelligence…
          </div>
        ) : (
          <>
            {view === "atoms"     && <AtomFeedView     atoms={atoms} onSelectAtom={setSelectedAtom} />}
            {view === "crosstree" && <CrossTreeView     atoms={atoms} onSelectAtom={setSelectedAtom} />}
            {view === "branches"  && <BranchHealthView  atoms={atoms} onSelectAtom={setSelectedAtom} />}
            {view === "gaps"      && <CivicGapView      atoms={atoms} />}
            {view === "timeline"  && <TimelineView      atoms={atoms} />}
            {view === "learn"     && <LearningView      atoms={atoms} />}
          </>
        )}

        {/* Empty state */}
        {!loading && atoms.length === 0 && (
          <div className="mt-8 border border-zinc-900 rounded-2xl p-8 text-center space-y-3">
            <p className="text-3xl">⚡</p>
            <p className="text-zinc-300 text-sm font-semibold">Intelligence OS तयार छ — atoms नै बाँकी छ</p>
            <p className="text-zinc-600 text-xs max-w-xs mx-auto">
              Documents upload गरेर AI analysis गर्नुहोस्, त्यसपछि Admin मा approve गर्नुहोस् — atoms automatically यहाँ आउँछन्
            </p>
            <div className="flex gap-2 justify-center">
              <Link href="/vault/documents" className="text-xs px-4 py-2 bg-cyan-950 border border-cyan-800 text-cyan-300 rounded-xl font-semibold">
                📄 Documents →
              </Link>
              <Link href="/vault/admin" className="text-xs px-4 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-xl font-semibold">
                👁 Admin →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
