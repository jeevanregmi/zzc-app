"use client";

import type { BusinessGoal } from "../../lib/business/types";
import { goalStatusColor, goalStatusNepali, fmtPct } from "../../lib/business/formatters";

interface GoalProgressProps {
  goal: BusinessGoal;
}

export function GoalProgress({ goal }: GoalProgressProps) {
  const pct = goal.targetValue > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : 0;

  const barColor = goal.status === "achieved" ? "bg-green-400"
    : goal.status === "on_track"              ? "bg-yellow-400"
    : goal.status === "behind"                ? "bg-orange-400"
    : "bg-red-400";

  return (
    <div className="p-3 bg-zinc-800/50 rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-sm text-white font-medium">{goal.label}</p>
          {goal.notes && <p className="text-xs text-zinc-500 mt-0.5">{goal.notes}</p>}
        </div>
        <span className={"text-xs font-mono " + goalStatusColor(goal.status)}>
          {goalStatusNepali(goal.status)}
        </span>
      </div>
      <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden mb-1">
        <div className={"h-full rounded-full transition-all " + barColor} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500">
        <span>{goal.currentValue.toLocaleString()}</span>
        <span>{fmtPct(pct)} of {goal.targetValue.toLocaleString()}</span>
      </div>
    </div>
  );
}
