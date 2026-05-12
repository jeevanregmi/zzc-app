"use client";

import type { SchemeMetric, SortCol } from "../../lib/types/financial";

interface SchemeSortTableProps {
  metrics:    SchemeMetric[];
  sortCol:    SortCol;
  sortAsc:    boolean;
  onSort:     (col: SortCol) => void;
}

const COLS: { id: SortCol; label: string; nepali: string }[] = [
  { id: "nominalReturn",  label: "Return%",  nepali: "नाममात्र%" },
  { id: "realReturn",     label: "Real%",    nepali: "वास्तविक%" },
  { id: "riskScore",      label: "Risk",     nepali: "जोखिम" },
  { id: "liquidityScore", label: "Liquidity",nepali: "तरलता" },
  { id: "sharpeScore",    label: "Sharpe",   nepali: "शार्प" },
];

function realColor(r: number) {
  if (r >= 2)  return "text-green-400";
  if (r >= 0)  return "text-yellow-400";
  return "text-red-400";
}
function sharpeColor(s: number) {
  if (s >= 2)  return "text-green-400";
  if (s >= 1)  return "text-yellow-400";
  if (s >= 0)  return "text-orange-400";
  return "text-red-400";
}
function riskColor(r: number) {
  if (r <= 2)  return "text-green-400";
  if (r <= 5)  return "text-yellow-400";
  if (r <= 7)  return "text-orange-400";
  return "text-red-400";
}

export function SchemeSortTable({ metrics, sortCol, sortAsc, onSort }: SchemeSortTableProps) {
  const arrow = (col: SortCol) =>
    col !== sortCol ? "" : sortAsc ? " ↑" : " ↓";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-2 px-2 text-zinc-400 font-medium sticky left-0 bg-zinc-950">योजना</th>
            <th className="text-left py-2 px-2 text-zinc-400 font-medium">संस्था</th>
            {COLS.map(c => (
              <th
                key={c.id}
                onClick={() => onSort(c.id)}
                className="text-right py-2 px-2 text-zinc-400 font-medium cursor-pointer select-none hover:text-green-400 transition-colors whitespace-nowrap"
              >
                {c.nepali}{arrow(c.id)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map(m => (
            <tr key={m.schemeId} className="border-b border-zinc-800 hover:bg-zinc-800/30">
              <td className="py-2 px-2 text-white font-medium sticky left-0 bg-zinc-950 max-w-[160px] truncate" title={m.titleNepali}>
                {m.titleNepali}
              </td>
              <td className="py-2 px-2 text-zinc-400">{m.org}</td>
              <td className="py-2 px-2 text-right font-mono text-white">{m.nominalReturn.toFixed(2)}%</td>
              <td className={"py-2 px-2 text-right font-mono " + realColor(m.realReturn)}>
                {m.realReturn >= 0 ? "+" : ""}{m.realReturn.toFixed(2)}%
              </td>
              <td className={"py-2 px-2 text-right font-mono " + riskColor(m.riskScore)}>{m.riskScore}/10</td>
              <td className="py-2 px-2 text-right font-mono text-zinc-300">{m.liquidityScore}/10</td>
              <td className={"py-2 px-2 text-right font-mono " + sharpeColor(m.sharpeScore)}>
                {m.sharpeScore >= 0 ? "+" : ""}{m.sharpeScore.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
