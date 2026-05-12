"use client";

interface KPICardProps {
  label:       string;
  value:       string;
  target?:     string;
  trend?:      "up" | "down" | "flat";
  trendGood?:  boolean;
  sub?:        string;
  highlight?:  boolean;
  valueClass?: string;
}

const TREND_ARROW = { up: "↑", down: "↓", flat: "→" };

function trendClass(trend: "up" | "down" | "flat", trendGood: boolean): string {
  if (trend === "flat") return "text-zinc-400";
  const isGood = trendGood ? trend === "up" : trend === "down";
  return isGood ? "text-green-400" : "text-red-400";
}

export function KPICard({ label, value, target, trend, trendGood = true, sub, highlight, valueClass }: KPICardProps) {
  return (
    <div className={
      "p-4 rounded-xl border " +
      (highlight ? "bg-zinc-900 border-green-500/30" : "bg-zinc-900 border-zinc-800")
    }>
      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex items-end gap-2">
        <p className={
          "text-2xl font-bold font-mono " +
          (valueClass ?? (highlight ? "text-green-400" : "text-white"))
        }>
          {value}
        </p>
        {trend && (
          <span className={"text-sm font-mono mb-0.5 " + trendClass(trend, trendGood)}>
            {TREND_ARROW[trend]}
          </span>
        )}
      </div>
      {target && <p className="text-xs text-zinc-600 mt-1">लक्ष्य: {target}</p>}
      {sub    && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
