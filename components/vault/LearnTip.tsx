"use client";

import { useState } from "react";
import { useLearningMode, GLOSSARY } from "../../contexts/LearningModeContext";

interface LearnTipProps {
  term:     string;         // key in GLOSSARY
  inline?:  boolean;        // render as inline span (default: true)
  children?: React.ReactNode; // optional — wrap an existing label
}

/**
 * Shows a cyan "?" button in Learning Mode that expands a Nepali explanation.
 * When Learning Mode is off, renders nothing (or just children).
 *
 * Usage:
 *   <LearnTip term="AI Summary" />
 *   <LearnTip term="Hook"><span>Hook</span></LearnTip>
 */
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

/**
 * Standalone block-level explainer — shows a full Nepali explanation card.
 * Use for section headers or page-level context.
 */
export function LearnBlock({
  title,
  nepali,
  steps,
}: {
  title:  string;
  nepali: string;
  steps?: string[];
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
