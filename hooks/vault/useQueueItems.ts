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

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    const unsub = subscribeQueueItems(ownerId, status, data => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId, status]);

  return { items, loading };
}
