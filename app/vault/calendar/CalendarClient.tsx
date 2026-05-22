"use client";

import { useMemo, useState } from "react";
import { useVaultAuth }   from "../../../hooks/vault/useVaultAuth";
import { useQueueItems }  from "../../../hooks/vault/useQueueItems";
import type { QueueItem } from "../../../lib/types/queue";

const PLATFORM_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  youtube:   { bg: "bg-red-950/60",    text: "text-red-400",    dot: "bg-red-500" },
  instagram: { bg: "bg-purple-950/60", text: "text-purple-400", dot: "bg-purple-500" },
  facebook:  { bg: "bg-blue-950/60",   text: "text-blue-400",   dot: "bg-blue-500" },
  tiktok:    { bg: "bg-pink-950/60",   text: "text-pink-400",   dot: "bg-pink-500" },
  all:       { bg: "bg-zinc-800/60",   text: "text-zinc-300",   dot: "bg-zinc-500" },
};

const STATUS_ICON: Record<string, string> = {
  pending:      "○",
  approved:     "✓",
  in_production: "▶",
  rejected:     "✗",
  archived:     "◇",
};

const STATUS_COLOR: Record<string, string> = {
  pending:      "text-zinc-500",
  approved:     "text-green-400",
  in_production: "text-cyan-400",
  rejected:     "text-red-400",
  archived:     "text-zinc-600",
};

function getScheduledDate(item: QueueItem): string | null {
  const raw = (item as { scheduledFor?: string; dueDate?: string; targetDate?: string }).scheduledFor
    ?? (item as { scheduledFor?: string; dueDate?: string; targetDate?: string }).dueDate
    ?? (item as { scheduledFor?: string; dueDate?: string; targetDate?: string }).targetDate;
  if (!raw) return null;
  return raw.slice(0, 10);
}

export default function CalendarClient() {
  const { user } = useVaultAuth();
  const uid      = user?.uid ?? null;
  const queue    = useQueueItems(uid, "all");

  const [viewDate,       setViewDate]       = useState(() => new Date());
  const [filterPlatform, setFilterPlatform] = useState<string>("all");

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function prevMonth() {
    setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() - 1); return n; });
  }
  function nextMonth() {
    setViewDate(d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; });
  }

  // Items indexed by date string
  const itemsByDate = useMemo(() => {
    const map = new Map<string, QueueItem[]>();
    for (const item of queue.items) {
      if (filterPlatform !== "all" && item.platform !== filterPlatform) continue;
      const date = getScheduledDate(item) ?? item.createdAt?.slice(0, 10);
      if (!date) continue;
      const existing = map.get(date) ?? [];
      existing.push(item);
      map.set(date, existing);
    }
    return map;
  }, [queue.items, filterPlatform]);

  // Calendar grid
  const firstDay  = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today     = new Date().toISOString().slice(0, 10);
  const cells     = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) return null;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    return { dayNum, dateStr, items: itemsByDate.get(dateStr) ?? [] };
  });

  // Upcoming items (no date or future date)
  const noDate = useMemo(
    () => queue.items.filter(i => !getScheduledDate(i)).slice(0, 8),
    [queue.items],
  );

  // Stats
  const approvedCount      = queue.items.filter(i => i.status === "approved").length;
  const inProductionCount  = queue.items.filter(i => i.status === "in_production").length;
  const pendingCount       = queue.items.filter(i => i.status === "pending").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Content Calendar</h1>
        <p className="text-zinc-500 text-sm mt-0.5">
          {pendingCount} pending · {approvedCount} approved · {inProductionCount} in production
        </p>
      </div>

      {/* Filter bar + nav */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {["all", "youtube", "instagram", "facebook", "tiktok"].map(p => (
            <button
              key={p}
              onClick={() => setFilterPlatform(p)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize ${
                filterPlatform === p
                  ? "bg-zinc-700 text-white border-zinc-600"
                  : "text-zinc-500 border-zinc-800 hover:text-white"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="text-zinc-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ‹
          </button>
          <p className="text-white font-semibold min-w-36 text-center">
            {MONTH_NAMES[month]} {year}
          </p>
          <button
            onClick={nextMonth}
            className="text-zinc-400 hover:text-white text-lg px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-600 font-semibold">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={idx} className="aspect-square rounded-lg bg-zinc-950/30" />;
          }
          const isToday = cell.dateStr === today;
          return (
            <div
              key={cell.dateStr}
              className={`min-h-16 rounded-lg p-1.5 border transition-colors ${
                isToday
                  ? "border-cyan-700 bg-cyan-950/20"
                  : cell.items.length > 0
                    ? "border-zinc-700 bg-zinc-900"
                    : "border-zinc-800/50 bg-zinc-900/30"
              }`}
            >
              <p className={`text-xs font-mono mb-1 ${isToday ? "text-cyan-400 font-bold" : "text-zinc-500"}`}>
                {cell.dayNum}
              </p>
              <div className="space-y-0.5">
                {cell.items.slice(0, 3).map((item, i) => {
                  const pColors = PLATFORM_COLORS[item.platform ?? "all"];
                  return (
                    <div
                      key={i}
                      className={`${pColors.bg} rounded px-1 py-0.5 flex items-center gap-1`}
                      title={item.aiTitle}
                    >
                      <span className={`w-1 h-1 rounded-full ${pColors.dot} shrink-0`} />
                      <span className={`text-xs truncate ${pColors.text} leading-tight`} style={{ fontSize: "9px" }}>
                        {item.aiTitle}
                      </span>
                    </div>
                  );
                })}
                {cell.items.length > 3 && (
                  <p className="text-zinc-600" style={{ fontSize: "9px" }}>+{cell.items.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Unscheduled items */}
      {noDate.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-zinc-300 mb-3">Unscheduled ({noDate.length})</p>
          <div className="space-y-1.5">
            {noDate.map(item => {
              const pColors = PLATFORM_COLORS[item.platform ?? "all"];
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${pColors.dot} shrink-0`} />
                    <span className="text-sm text-zinc-300 truncate">{item.aiTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-mono ${STATUS_COLOR[item.status]}`}>
                      {STATUS_ICON[item.status]} {item.status}
                    </span>
                    <span className={`text-xs ${pColors.text} capitalize`}>{item.platform}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {queue.items.length === 0 && !queue.loading && (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold">No content scheduled yet</p>
          <p className="text-sm mt-1">Approve documents in Intelligence Library to generate queue items</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(PLATFORM_COLORS).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
            <span className="text-zinc-500 text-xs capitalize">{p}</span>
          </div>
        ))}
        <div className="flex items-center gap-3 ml-auto">
          {Object.entries(STATUS_ICON).map(([s, icon]) => (
            <div key={s} className="flex items-center gap-1">
              <span className={`text-xs ${STATUS_COLOR[s]}`}>{icon}</span>
              <span className="text-zinc-600 text-xs capitalize">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
