"use client";

import { useEffect, useState } from "react";
import { subscribeQueueItems } from "../../lib/vault/firestore";
import type { QueueItem } from "../../lib/types/queue";

export function useQueueItems(
  ownerId: string | null,
  status:  QueueItem["status"] | "all" = "all",
) {
  const [items,   setItems]   = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeQueueItems(ownerId, status, data => {
      setItems(data);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId, status]);

  return { items, loading, error };
}
