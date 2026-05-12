"use client";

import { useState, useEffect, useMemo } from "react";
import type { RevenueEntry } from "../../lib/business/types";
import { revenueAdapter } from "../../lib/business/firestore";
import { buildPLTimeline } from "../../lib/business/aggregators";

export function useRevenue(ownerId: string | null) {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setEntries([]); setLoading(false); return; }
    const unsub = revenueAdapter.subscribe(ownerId, "date", data => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const add    = (data: Omit<RevenueEntry, "id" | "createdAt">) =>
    ownerId ? revenueAdapter.add(ownerId, data) : Promise.resolve("");
  const remove = (id: string) => revenueAdapter.remove(id);

  // Current month totals
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const thisMonthNPR = useMemo(() =>
    entries
      .filter(e => e.date.startsWith(currentPeriod))
      .reduce((s, e) => s + e.amountNPR, 0),
    [entries, currentPeriod],
  );

  const timeline = useMemo(() => buildPLTimeline(entries, [], [], 6), [entries]);

  return { entries, loading, add, remove, thisMonthNPR, timeline };
}
