"use client";

import type { TrustScore, TrustLevel } from "../../lib/types/trust";

// ─── Style config ─────────────────────────────────────────────────────────────

const LEVEL_STYLE: Record<TrustLevel, { pill: string; bar: string; label: string }> = {
  high:   { pill: "bg-emerald-950 border-emerald-800 text-emerald-400", bar: "bg-emerald-500", label: "HIGH"   },
  medium: { pill: "bg-amber-950   border-amber-800   text-amber-400",   bar: "bg-amber-500",   label: "MED"    },
  low:    { pill: "bg-orange-950  border-orange-800  text-orange-400",  bar: "bg-orange-500",  label: "LOW"    },
  risky:  { pill: "bg-red-950     border-red-800     text-red-400",     bar: "bg-red-500",     label: "RISKY"  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  trust:   TrustScore;
  /** "compact" = score + level only (default for inline use)
   *  "bar"     = compact + 5-segment component bar on hover/detail */
  variant?: "compact" | "bar";
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TrustBadge({ trust, variant = "compact", className = "" }: Props) {
  const style   = LEVEL_STYLE[trust.level];
  const tooltip = [
    `Trust score: ${trust.score}/100 (${trust.level.toUpperCase()})`,
    "",
    ...trust.reasons,
    "",
    `Official source: ${trust.officialSource}/30`,
    `Source quality:  ${trust.sourceQuality}/25`,
    `AI confidence:   ${trust.aiConfidence}/25`,
    `Freshness:       ${trust.freshness}/15`,
    `Admin verified:  ${trust.adminVerified}/5`,
  ].join("\n");

  if (variant === "bar") {
    return (
      <div className={`flex flex-col gap-1 ${className}`} title={tooltip}>
        {/* Score pill */}
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.pill}`}>
            {trust.score} {style.label}
          </span>
          <span className="text-[10px] text-zinc-600">trust</span>
        </div>
        {/* Component bar — 5 segments */}
        <div className="flex gap-0.5 items-end h-2" title={tooltip}>
          <Segment pts={trust.officialSource} max={30} bar={style.bar} label="Official" />
          <Segment pts={trust.sourceQuality}  max={25} bar={style.bar} label="Quality"  />
          <Segment pts={trust.aiConfidence}   max={25} bar={style.bar} label="AI conf." />
          <Segment pts={trust.freshness}      max={15} bar={style.bar} label="Fresh"    />
          <Segment pts={trust.adminVerified}  max={5}  bar={style.bar} label="Verified" />
        </div>
      </div>
    );
  }

  // compact (default)
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${style.pill} ${className}`}
      title={tooltip}
    >
      <span className="opacity-60">🛡</span>
      {trust.score} {style.label}
    </span>
  );
}

function Segment({ pts, max, bar, label }: {
  pts: number; max: number; bar: string; label: string;
}) {
  const pct = max > 0 ? Math.round((pts / max) * 100) : 0;
  return (
    <div
      className="flex-1 bg-zinc-800 rounded-sm overflow-hidden"
      title={`${label}: ${pts}/${max}`}
    >
      <div
        className={`${bar} transition-all`}
        style={{ height: `${Math.max(2, Math.round(8 * pct / 100))}px` }}
      />
    </div>
  );
}
