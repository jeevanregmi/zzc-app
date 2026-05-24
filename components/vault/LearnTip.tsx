"use client";

import { useState } from "react";
import { useLearningMode, GLOSSARY } from "../../contexts/LearningModeContext";

// ── LearnTip ──────────────────────────────────────────────────────────────────
// Shows a cyan "?" button in Learning Mode that expands a Nepali explanation.

interface LearnTipProps {
  term:      string;
  children?: React.ReactNode;
}

export function LearnTip({ term, children }: LearnTipProps) {
  const { on }         = useLearningMode();
  const [open, setOpen] = useState(false);
  const entry           = GLOSSARY[term];

  if (!on || !entry) return children ? <>{children}</> : null;

  return (
    <span className="inline-flex items-start gap-1 flex-wrap">
      {children}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-3.5 h-3.5 rounded-full bg-cyan-900 border border-cyan-700 text-cyan-400 text-[9px] font-black flex items-center justify-center hover:bg-cyan-800 transition-colors shrink-0 mt-0.5"
        title={`${entry.nepali}: ${entry.explain}`}
        aria-label={`${entry.nepali} बारे थप जान्नुहोस्`}
      >
        ?
      </button>
      {open && (
        <span className="block w-full mt-1 bg-cyan-950/80 border border-cyan-800 rounded-lg px-2.5 py-2 text-xs leading-relaxed">
          <strong className="text-cyan-300 block mb-0.5">{entry.nepali}</strong>
          <span className="text-cyan-200/80">{entry.explain}</span>
        </span>
      )}
    </span>
  );
}

// ── LearnBlock ────────────────────────────────────────────────────────────────
// Standalone block-level explainer for section headers.

export function LearnBlock({
  title,
  nepali,
  steps,
}: {
  title:   string;
  nepali:  string;
  steps?:  string[];
}) {
  const { on } = useLearningMode();
  if (!on) return null;

  return (
    <div className="mb-4 bg-cyan-950/30 border border-cyan-900/50 rounded-2xl p-4">
      <p className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-sm text-cyan-200 leading-relaxed">{nepali}</p>
      {steps && steps.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-cyan-200/80">
              <span className="w-4 h-4 rounded-full bg-cyan-900 text-cyan-400 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[9px]">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── ActionLearnCard ───────────────────────────────────────────────────────────
// Always-visible (no Learning Mode gate) — teaches the founder what every
// consequential pipeline action does at the backend level.
//
// Shows 4 dimensions of intelligence for each action:
//   🎯 के गर्छ   — what the action does
//   📦 के बन्छ   — what Firestore records are created/changed
//   🔄 कहाँ जान्छ — where data flows next in the OS
//   🔮 Future    — which future systems depend on this action
// Plus a dynamic example computed from the current document context.

export interface ActionLearnData {
  icon:    string;
  title:   string;     // action name in Nepali
  color:   "green" | "amber" | "cyan" | "violet" | "red";
  does:    string;     // what this action does (Nepali)
  creates: string[];   // Firestore changes that happen
  flows:   string[];   // where data goes next
  future:  string[];   // future systems that depend on this
  example?: string;    // real context from the current document
}

const ACTION_COLORS: Record<ActionLearnData["color"], {
  text: string; bg: string; border: string; pill: string; tab: string;
}> = {
  green:  { text: "text-green-300",   bg: "bg-green-950/40",   border: "border-green-900/60",   pill: "bg-green-950 border-green-800 text-green-300",   tab: "border-green-500"  },
  amber:  { text: "text-amber-300",   bg: "bg-amber-950/40",   border: "border-amber-900/60",   pill: "bg-amber-950 border-amber-800 text-amber-300",   tab: "border-amber-500"  },
  cyan:   { text: "text-cyan-300",    bg: "bg-cyan-950/40",    border: "border-cyan-900/60",    pill: "bg-cyan-950 border-cyan-800 text-cyan-300",    tab: "border-cyan-500"   },
  violet: { text: "text-violet-300",  bg: "bg-violet-950/40",  border: "border-violet-900/60",  pill: "bg-violet-950 border-violet-800 text-violet-300",  tab: "border-violet-500" },
  red:    { text: "text-red-300",     bg: "bg-red-950/40",     border: "border-red-900/60",     pill: "bg-red-950 border-red-800 text-red-300",     tab: "border-red-500"    },
};

type DimKey = "does" | "creates" | "flows" | "future";

const DIMS: { key: DimKey; icon: string; label: string }[] = [
  { key: "does",    icon: "🎯", label: "के गर्छ"    },
  { key: "creates", icon: "📦", label: "के बन्छ"    },
  { key: "flows",   icon: "🔄", label: "कहाँ जान्छ" },
  { key: "future",  icon: "🔮", label: "Future"     },
];

export function ActionLearnCard({ actions }: { actions: ActionLearnData[] }) {
  const [open,         setOpen]         = useState(false);
  const [activeAction, setActiveAction] = useState(0);
  const [dim,          setDim]          = useState<DimKey>("does");

  const action = actions[Math.min(activeAction, actions.length - 1)];
  const col    = ACTION_COLORS[action.color];

  const content: Record<DimKey, string[]> = {
    does:    [action.does],
    creates: action.creates,
    flows:   action.flows,
    future:  action.future,
  };

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-900/50 transition-colors text-left"
      >
        <span className="text-[11px]">🎓</span>
        <span className="text-zinc-600 text-xs">यी actions ले backend मा के गर्छन्?</span>
        <span className="ml-auto text-zinc-700 text-[10px]">{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-900 p-3 space-y-3">

          {/* Action selector — only shown if multiple actions */}
          {actions.length > 1 && (
            <div className="flex gap-1.5 flex-wrap">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveAction(i); setDim("does"); }}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    activeAction === i
                      ? ACTION_COLORS[a.color].pill
                      : "border-zinc-800 text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  <span>{a.icon}</span>
                  <span>{a.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Dimension tabs */}
          <div className="flex gap-0 border-b border-zinc-800 overflow-x-auto">
            {DIMS.map(d => (
              <button
                key={d.key}
                onClick={() => setDim(d.key)}
                className={`flex items-center gap-1 px-2.5 py-2 text-[10px] font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  dim === d.key
                    ? `${col.tab} text-white`
                    : "border-transparent text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <span>{d.icon}</span>
                <span>{d.label}</span>
              </button>
            ))}
          </div>

          {/* Dimension content */}
          <div className={`rounded-xl px-3 py-3 border text-xs leading-relaxed space-y-2 ${col.bg} ${col.border}`}>
            {content[dim].map((line, i) => (
              <div key={i} className="flex items-start gap-2">
                {content[dim].length > 1 && (
                  <span className={`shrink-0 mt-0.5 font-bold ${col.text} text-[10px]`}>
                    {dim === "flows" ? i + 1 : "→"}
                  </span>
                )}
                <span className={col.text}>{line}</span>
              </div>
            ))}
          </div>

          {/* Real example from current document context */}
          {action.example && (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl px-3 py-2.5 space-y-0.5">
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">📄 यो document मा</p>
              <p className="text-zinc-300 text-xs leading-relaxed">{action.example}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
