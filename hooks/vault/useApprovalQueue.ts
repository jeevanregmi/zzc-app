"use client";

import { useState, useEffect, useMemo } from "react";
import { approvalAdapter } from "../../lib/business/firestore";
import type { ApprovalQueueItem, ApprovalItemType } from "../../lib/types/economics";

export function useApprovalQueue(ownerId: string | null) {
  const [items,   setItems]   = useState<ApprovalQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setItems([]); setLoading(false); return; }
    const unsub = approvalAdapter.subscribe(ownerId, "createdAt", data => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  async function propose(params: {
    type:        ApprovalItemType;
    title:       string;
    description: string;
    amountUSD:   number;
    amountNPR:   number;
  }): Promise<string> {
    if (!ownerId) return "";
    return approvalAdapter.add(ownerId, {
      ...params,
      status:      "pending",
      requestedAt: new Date().toISOString(),
    });
  }

  async function approve(id: string, notes?: string): Promise<void> {
    await approvalAdapter.update(id, {
      status:     "approved",
      reviewedAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    });
  }

  async function reject(id: string, notes?: string): Promise<void> {
    await approvalAdapter.update(id, {
      status:     "rejected",
      reviewedAt: new Date().toISOString(),
      ...(notes ? { notes } : {}),
    });
  }

  async function remove(id: string): Promise<void> {
    await approvalAdapter.remove(id);
  }

  const pending  = useMemo(() => items.filter(i => i.status === "pending"),  [items]);
  const approved = useMemo(() => items.filter(i => i.status === "approved"), [items]);
  const rejected = useMemo(() => items.filter(i => i.status === "rejected"), [items]);

  return { items, loading, pending, approved, rejected, propose, approve, reject, remove };
}
