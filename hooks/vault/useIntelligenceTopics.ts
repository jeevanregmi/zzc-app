"use client";

import { useEffect, useState } from "react";
import { subscribeIntelligenceTopics } from "../../lib/vault/firestore";
import type { IntelligenceTopic } from "../../lib/types/signals";

export function useIntelligenceTopics(ownerId: string | null) {
  const [topics,  setTopics]  = useState<IntelligenceTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    const unsub = subscribeIntelligenceTopics(ownerId, items => {
      setTopics(items);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { topics, loading };
}
