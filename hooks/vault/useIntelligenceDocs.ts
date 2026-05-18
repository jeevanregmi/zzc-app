"use client";

import { useEffect, useState } from "react";
import { subscribeIntelligenceDocs } from "../../lib/vault/firestore";
import type { IntelligenceDocument } from "../../lib/types/documents";

export function useIntelligenceDocs(ownerId: string | null) {
  const [docs,    setDocs]    = useState<IntelligenceDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeIntelligenceDocs(ownerId, items => {
      setDocs(items);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { docs, loading, error };
}
