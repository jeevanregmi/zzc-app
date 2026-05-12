"use client";

import { useState, useEffect, useMemo } from "react";
import type { AICostEntry } from "../../lib/business/types";
import { aiCostAdapter } from "../../lib/business/firestore";
import { aiCostByService, aiMonthllyBurn } from "../../lib/business/aggregators";

export function useAICosts(ownerId: string | null) {
  const [entries, setEntries] = useState<AICostEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setEntries([]); setLoading(false); return; }
    const unsub = aiCostAdapter.subscribe(ownerId, "date", data => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const add    = (data: Omit<AICostEntry, "id" | "createdAt">) =>
    ownerId ? aiCostAdapter.add(ownerId, data) : Promise.resolve("");
  const remove = (id: string) => aiCostAdapter.remove(id);

  const byService  = useMemo(() => aiCostByService(entries), [entries]);
  const monthlyBurn= useMemo(() => aiMonthllyBurn(entries, 6), [entries]);
  const totalUSD   = useMemo(() => entries.reduce((s, e) => s + e.costUSD, 0), [entries]);

  return { entries, loading, add, remove, byService, monthlyBurn, totalUSD };
}
