"use client";

import { useState, useEffect, useMemo } from "react";
import type { ExpenseEntry } from "../../lib/business/types";
import { expenseAdapter } from "../../lib/business/firestore";

export function useExpenses(ownerId: string | null) {
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setEntries([]); setLoading(false); return; }
    const unsub = expenseAdapter.subscribe(ownerId, "date", data => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const add    = (data: Omit<ExpenseEntry, "id" | "createdAt">) =>
    ownerId ? expenseAdapter.add(ownerId, data) : Promise.resolve("");
  const remove = (id: string) => expenseAdapter.remove(id);

  const currentPeriod = new Date().toISOString().slice(0, 7);

  const thisMonthNPR = useMemo(() =>
    entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.amountNPR, 0),
    [entries, currentPeriod],
  );

  const capexNPR = useMemo(() =>
    entries.filter(e => e.classification === "CAPEX").reduce((s, e) => s + e.amountNPR, 0),
    [entries],
  );

  const opexNPR = useMemo(() =>
    entries.filter(e => e.classification === "OPEX").reduce((s, e) => s + e.amountNPR, 0),
    [entries],
  );

  return { entries, loading, add, remove, thisMonthNPR, capexNPR, opexNPR };
}
