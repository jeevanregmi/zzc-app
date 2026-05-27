"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "../../app/firebase";
import { buildCopilotContext, type CopilotContext } from "../../lib/vault/copilotContext";
import { generateInsights, generateInsightsFromContext, type CTOInsight } from "../../lib/vault/ctoEngine";

export const REFRESH_MS = 5 * 60 * 1000; // 5 min — matches prompt cache TTL

export interface UseCopilotContextReturn {
  context:     CopilotContext | null;
  insights:    CTOInsight[];
  loading:     boolean;
  lastRefresh: Date | null;
  refresh:     () => void;
}

export function useCopilotContext(uid: string | null): UseCopilotContextReturn {
  const [context,     setContext]     = useState<CopilotContext | null>(null);
  const [insights,    setInsights]    = useState<CTOInsight[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const ctx = await buildCopilotContext(uid, db);
      setContext(ctx);
      setInsights(generateInsightsFromContext(ctx));
      setLastRefresh(new Date());
    } catch (err) {
      console.warn("[useCopilotContext] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return { context, insights, loading, lastRefresh, refresh: load };
}

// Re-export for callers that only need the legacy SystemSnapshot-based insights
export { generateInsights };
