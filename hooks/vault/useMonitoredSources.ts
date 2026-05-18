"use client";

import { useEffect, useState } from "react";
import { subscribeMonitoredSources } from "../../lib/vault/firestore";
import type { MonitoredSource } from "../../lib/types/signals";

export function useMonitoredSources(ownerId: string | null) {
  const [sources, setSources] = useState<MonitoredSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeMonitoredSources(ownerId, items => {
      setSources(items);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { sources, loading, error };
}
