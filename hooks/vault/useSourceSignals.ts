"use client";

import { useEffect, useState } from "react";
import { subscribeSourceSignals } from "../../lib/vault/firestore";
import type { SourceSignal } from "../../lib/types/signals";

export function useSourceSignals(
  ownerId: string | null,
  status: SourceSignal["status"] | "all" = "all",
) {
  const [signals, setSignals] = useState<SourceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeSourceSignals(ownerId, status, items => {
      setSignals(items);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId, status]);

  return { signals, loading, error };
}
