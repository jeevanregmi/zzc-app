"use client";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  valueClass?: string;
}

export function StatCard({ label, value, sub, highlight, valueClass }: StatCardProps) {
  return (
    <div className={"p-4 rounded-lg " + (highlight ? "bg-zinc-800 border border-green-500/25" : "bg-zinc-800/50")}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className={"text-lg font-bold font-mono " + (valueClass ?? (highlight ? "text-green-400" : "text-white"))}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
