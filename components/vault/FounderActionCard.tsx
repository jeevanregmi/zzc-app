"use client";

import Link from "next/link";
import { useState } from "react";
import { useFounderMode } from "../../contexts/FounderModeContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type FounderUrgency   = "calm" | "important" | "urgent";
export type FounderCostLevel = "none" | "low" | "medium" | "high";

export interface FounderActionCardProps {
  titleNepali:           string;
  simpleExplanation:     string;
  impact:                string;
  nextStep:              string;
  primaryButtonLabel:    string;
  primaryHref?:          string;
  primaryOnClick?:       () => void;
  secondaryButtonLabel?: string;
  secondaryHref?:        string;
  secondaryOnClick?:     () => void;
  urgency?:              FounderUrgency;
  costLevel?:            FounderCostLevel;
  technicalDetails?:     string | string[];
  className?:            string;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const URGENCY_STYLES: Record<FounderUrgency, {
  border: string; bg: string; dot: string; title: string; label: string;
}> = {
  calm:      { border: "border-zinc-800",      bg: "bg-zinc-950/30",     dot: "bg-zinc-500",  title: "text-white",      label: ""                   },
  important: { border: "border-amber-900/50",  bg: "bg-amber-950/10",    dot: "bg-amber-500", title: "text-amber-100",  label: "ध्यान दिनुहोस्"    },
  urgent:    { border: "border-red-900/50",    bg: "bg-red-950/15",      dot: "bg-red-500",   title: "text-red-100",    label: "अहिले गर्नुहोस्"   },
};

const COST_BADGE: Record<FounderCostLevel, string | null> = {
  none:   null,
  low:    "💰 थोरै खर्च",
  medium: "💰 केही खर्च",
  high:   "💰 धेरै खर्च",
};

const PRIMARY_BTN: Record<FounderUrgency, string> = {
  calm:      "bg-white text-black hover:bg-zinc-100",
  important: "bg-amber-500 text-black hover:bg-amber-400",
  urgent:    "bg-red-500 text-white hover:bg-red-400",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FounderActionCard({
  titleNepali,
  simpleExplanation,
  impact,
  nextStep,
  primaryButtonLabel,
  primaryHref,
  primaryOnClick,
  secondaryButtonLabel,
  secondaryHref,
  secondaryOnClick,
  urgency       = "calm",
  costLevel     = "none",
  technicalDetails,
  className     = "",
}: FounderActionCardProps) {
  const { isDebug } = useFounderMode();
  const [showTech, setShowTech] = useState(false);

  const s        = URGENCY_STYLES[urgency];
  const costBadge = COST_BADGE[costLevel];
  const techLines = Array.isArray(technicalDetails)
    ? technicalDetails
    : technicalDetails ? [technicalDetails] : [];

  const PrimaryBtn = () => primaryHref ? (
    <Link
      href={primaryHref}
      className={`flex-1 text-center text-sm font-black py-2.5 rounded-xl transition-colors ${PRIMARY_BTN[urgency]}`}
    >
      {primaryButtonLabel} →
    </Link>
  ) : (
    <button
      onClick={primaryOnClick}
      className={`flex-1 text-center text-sm font-black py-2.5 rounded-xl transition-colors ${PRIMARY_BTN[urgency]}`}
    >
      {primaryButtonLabel} →
    </button>
  );

  return (
    <div className={`rounded-2xl border p-4 space-y-3.5 ${s.border} ${s.bg} ${className}`}>

      {/* Header: urgency label + dot + cost */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
          {s.label && (
            <span className={`text-[9px] font-black uppercase tracking-widest ${
              urgency === "urgent" ? "text-red-400" : "text-amber-400"
            }`}>
              {s.label}
            </span>
          )}
        </div>
        {costBadge && (
          <span className="text-[9px] text-amber-500/70 font-semibold shrink-0">{costBadge}</span>
        )}
      </div>

      {/* Title */}
      <p className={`text-sm font-black leading-snug ${s.title}`}>{titleNepali}</p>

      {/* Simple explanation */}
      <p className="text-zinc-400 text-xs leading-relaxed">{simpleExplanation}</p>

      {/* Impact + Next step — the 5-part core */}
      <div className="space-y-2 rounded-xl bg-zinc-900/50 border border-zinc-800/50 px-3 py-2.5">
        <div className="flex gap-2 items-start">
          <span className="text-[10px] text-zinc-600 font-bold shrink-0 mt-px w-16">मलाई असर:</span>
          <p className="text-[11px] text-zinc-300 leading-snug flex-1">{impact}</p>
        </div>
        <div className="flex gap-2 items-start border-t border-zinc-800/60 pt-2">
          <span className="text-[10px] text-zinc-500 font-bold shrink-0 mt-px w-16">अब:</span>
          <p className="text-[11px] text-white leading-snug flex-1 font-semibold">{nextStep}</p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <PrimaryBtn />
        {secondaryButtonLabel && (secondaryHref ? (
          <Link
            href={secondaryHref}
            className="px-4 text-center text-sm font-bold py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            {secondaryButtonLabel}
          </Link>
        ) : (
          <button
            onClick={secondaryOnClick}
            className="px-4 text-center text-sm font-bold py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            {secondaryButtonLabel}
          </button>
        ))}
      </div>

      {/* Technical details — Debug Mode only */}
      {isDebug && techLines.length > 0 && (
        <div>
          <button
            onClick={() => setShowTech(p => !p)}
            className="text-[9px] text-zinc-700 hover:text-zinc-500 transition-colors flex items-center gap-1"
          >
            <span>{showTech ? "▾" : "▸"}</span>
            Technical Details
          </button>
          {showTech && (
            <div className="mt-1.5 bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2 space-y-1">
              {techLines.map((line, i) => (
                <p key={i} className="text-[9px] text-zinc-600 font-mono leading-relaxed">{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
