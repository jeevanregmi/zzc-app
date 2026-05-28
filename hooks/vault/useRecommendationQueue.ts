"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getPendingRecommendations,
  getAllRecommendationIds,
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
  // Tracks ALL rec IDs (pending + reviewed) so persist() never re-creates founder-reviewed recs.
  const knownIds = useRef(new Set<string>());

  const load = useCallback(async () => {
    if (!ownerId) return;
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      const [recs, allIds] = await Promise.all([
        getPendingRecommendations(ownerId, targetType),
        getAllRecommendationIds(ownerId),
      ]);
      knownIds.current = new Set(allIds);
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
    // Keep knownIds in sync so a re-persisted run won't re-add this ID
    knownIds.current.add(id);
    setState(s => ({ ...s, recs: s.recs.filter(r => r.id !== id) }));
  }, []);

  /**
   * Persist only NEW recommendations — those whose IDs are unknown to this owner.
   * Checks ALL statuses (pending + reviewed), not just the visible pending set,
   * so founder review decisions are never erased.
   */
  const persist = useCallback(async (generated: UniversalRecommendation[]) => {
    if (!ownerId || generated.length === 0) return;
    const toSave = generated.filter(r => !knownIds.current.has(r.id));
    if (toSave.length === 0) return;
    await saveRecommendations(toSave);
    toSave.forEach(r => knownIds.current.add(r.id));
    setState(s => ({ ...s, recs: [...s.recs, ...toSave] }));
  }, [ownerId]);

  return { ...state, total: state.recs.length, review, persist, refresh: load };
}
