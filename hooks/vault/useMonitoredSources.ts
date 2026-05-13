"use client";

import { useEffect, useState } from "react";
import { subscribeMonitoredSources } from "../../lib/vault/firestore";
import type { MonitoredSource } from "../../lib/types/signals";

export function useMonitoredSources(ownerId: string | null) {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    const unsub = subscribeMonitoredSources(ownerId, items => {
      setSources(items);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { sources, loading };
}
