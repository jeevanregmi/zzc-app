"use client";

import { useState, useEffect } from "react";
import type { BusinessGoal } from "../../lib/business/types";
import { goalAdapter } from "../../lib/business/firestore";

export function useKPIs(ownerId: string | null) {
  const [goals,   setGoals]   = useState<BusinessGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setGoals([]); setLoading(false); return; }
    const unsub = goalAdapter.subscribe(ownerId, "updatedAt", data => {
      setGoals(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  const add    = (data: Omit<BusinessGoal, "id" | "createdAt">) =>
    ownerId ? goalAdapter.add(ownerId, data) : Promise.resolve("");
  const update = (id: string, patch: Partial<BusinessGoal>) => goalAdapter.update(id, patch);
  const remove = (id: string) => goalAdapter.remove(id);

  return { goals, loading, add, update, remove };
}
