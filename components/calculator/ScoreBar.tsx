"use client";

interface ScoreBarProps {
  score: number;
  label: string;
  sub?: string;
}

const barColor = (s: number) =>
  s >= 80 ? "bg-green-400" : s >= 60 ? "bg-yellow-400" : s >= 40 ? "bg-orange-400" : "bg-red-400";

const textColor = (s: number) =>
  s >= 80 ? "text-green-400" : s >= 60 ? "text-yellow-400" : s >= 40 ? "text-orange-400" : "text-red-400";

export function ScoreBar({ score, label, sub }: ScoreBarProps) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-zinc-300">{label}</span>
        <span className={"text-sm font-mono font-bold " + textColor(score)}>{pct}/100</span>
      </div>
      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={"h-full rounded-full transition-all duration-500 " + barColor(score)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
