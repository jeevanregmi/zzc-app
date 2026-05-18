"use client";

import { useEffect, useState } from "react";
import { subscribeIntelligenceTopics } from "../../lib/vault/firestore";
import type { IntelligenceTopic } from "../../lib/types/signals";

export function useIntelligenceTopics(ownerId: string | null) {
  const [topics,  setTopics]  = useState<IntelligenceTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeIntelligenceTopics(ownerId, items => {
      setTopics(items);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { topics, loading, error };
}
