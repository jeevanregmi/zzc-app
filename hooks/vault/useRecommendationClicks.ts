"use client";

import { useState, useEffect } from "react";
import { subscribeRecommendationClicks } from "../../lib/vault/firestore";
import type { RecommendationClick } from "../../lib/types/revenue";

export function useRecommendationClicks(limit?: number) {
  const [clicks, setClicks] = useState<RecommendationClick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeRecommendationClicks({ limit }, items => {
      setClicks(items);
      setLoading(false);
    });
    return unsub;
  }, [limit]);

  return { clicks, loading };
}
