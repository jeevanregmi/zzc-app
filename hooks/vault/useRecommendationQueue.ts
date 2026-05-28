"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getPendingRecommendations,
  reviewRecommendation,
  saveRecommendations,
} from "../../lib/vault/firestore";
import type { UniversalRecommendation, RecommendationTarget, RecommendationStatus } from "../../lib/types/recommendations";

interface QueueState {
  recs:    UniversalRecommendation[];
  loading: boolean;
  error:   string | null;
}

export function useRecommendationQueue(
  ownerId:     string | null,
  targetType?: RecommendationTarget,
) {
  const [state, setState] = useState<QueueState>({ recs: [], loading: false, error: null });

  const load = useCallback(async () => {
    if (!ownerId) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const recs = await getPendingRecommendations(ownerId, targetType);
      setState({ recs, loading: false, error: null });
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code ?? "unknown";
      console.warn("[useRecommendationQueue] load failed:", code);
      setState(s => ({ ...s, loading: false, error: code }));
    }
  }, [ownerId, targetType]);

  useEffect(() => { void load(); }, [load]);

  const review = useCallback(async (
    id:     string,
    status: RecommendationStatus,
    note?:  string,
  ) => {
    await reviewRecommendation(id, status, note);
    setState(s => ({ ...s, recs: s.recs.filter(r => r.id !== id) }));
  }, []);

  /**
   * Generate fresh recommendations and persist only NEW ones
   * (IDs not already in the current pending set).
   */
  const persist = useCallback(async (generated: UniversalRecommendation[]) => {
    if (!ownerId || generated.length === 0) return;
    const existingIds = new Set(state.recs.map(r => r.id));
    const toSave = generated.filter(r => !existingIds.has(r.id));
    if (toSave.length === 0) return;
    await saveRecommendations(toSave);
    setState(s => ({ ...s, recs: [...s.recs, ...toSave] }));
  }, [ownerId, state.recs]);

  return { ...state, total: state.recs.length, review, persist, refresh: load };
}
