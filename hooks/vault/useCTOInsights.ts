"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../app/firebase";
import { generateInsights, type CTOInsight, type SystemSnapshot } from "../../lib/vault/ctoEngine";

const REFRESH_MS = 5 * 60 * 1000; // 5 min

export function useCTOInsights(uid: string | null) {
  const [insights,    setInsights]    = useState<CTOInsight[]>([]);
  const [snapshot,    setSnapshot]    = useState<SystemSnapshot | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const safe = <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(() => fb);
      const EMPTY = { docs: [], size: 0 } as unknown as import("firebase/firestore").QuerySnapshot;

      const [docsSnap, intelSnap, frameworkSnap, relSnap, signalSnap] = await Promise.all([
        safe(getDocs(query(collection(db, "vault_intelligence_docs"), where("ownerId", "==", uid), limit(200))), EMPTY),
        safe(getDocs(query(collection(db, "janta_intelligence"),    where("ownerId", "==", uid), limit(500))), EMPTY),
        safe(getDocs(query(collection(db, "constitutional_framework"), where("ownerId", "==", uid), limit(500))), EMPTY),
        safe(getDocs(query(collection(db, "janta_relationships"),   where("ownerId", "==", uid), limit(200))), EMPTY),
        safe(getDocs(query(collection(db, "civic_signals"),         where("ownerId", "==", uid), limit(50))),  EMPTY),
      ]);

      // ── Process documents ─────────────────────────────────────────────────
      type DocRow = Record<string, unknown> & { id: string };
      const docs: DocRow[] = (docsSnap.docs ?? []).map(d => ({ id: d.id, ...(d.data() as Record<string, unknown>) }));
      const visible = docs.filter(d => !d.archived);

      const neverAnalyzed    = visible.filter(d => d.processingStatus === "ready" && !d.aiSummary);
      const pendingReview    = visible.filter(d =>
        d.processingStatus === "ai_ready" &&
        (!d.adminApprovalStatus || d.adminApprovalStatus === "pending_review")
      );
      const approved         = visible.filter(d => d.adminApprovalStatus === "approved");
      const paused           = visible.filter(d => d.processingStatus === "ai_paused");

      // ── Intel per doc ─────────────────────────────────────────────────────
      const intelByDoc: Record<string, number> = {};
      let lowConf = 0;
      (intelSnap.docs ?? []).forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const srcId = data.sourceDocId as string | undefined;
        if (srcId) intelByDoc[srcId] = (intelByDoc[srcId] ?? 0) + 1;
        if (typeof data.confidence === "number" && data.confidence < 0.6) lowConf++;
      });

      const approvedNoExtract = approved.filter(d =>
        (intelByDoc[d.id] ?? 0) === 0 && (frameworkByDoc[d.id] ?? 0) === 0
      );

      // ── Constitutional parts ──────────────────────────────────────────────
      // Also track which docs have framework records — Constitution uses
      // constitutional_framework (not janta_intelligence), so those docs must
      // be excluded from the "approved but not extracted" count.
      const frameworkByDoc: Record<string, number> = {};
      const partCounts = new Map<number, number>();
      let brokenFrameworkRecords = 0;
      (frameworkSnap.docs ?? []).forEach(d => {
        const data = d.data() as Record<string, unknown>;
        const srcId = data.sourceDocId as string | undefined;
        if (srcId) frameworkByDoc[srcId] = (frameworkByDoc[srcId] ?? 0) + 1;
        const pn = data.partNumber as number | undefined;
        if (typeof pn === "number" && pn > 0) {
          partCounts.set(pn, (partCounts.get(pn) ?? 0) + 1);
        } else {
          brokenFrameworkRecords++;
        }
      });
      const emptyParts: number[] = [];
      for (let p = 1; p <= 35; p++) {
        if ((partCounts.get(p) ?? 0) === 0) emptyParts.push(p);
      }
      const partsWithData = Math.min(35 - emptyParts.length, 35);

      // ── Signal recency ────────────────────────────────────────────────────
      let daysSinceLastSignal: number | null = null;
      let recentSignalCount = 0;
      if ((signalSnap.docs ?? []).length > 0) {
        const dates = (signalSnap.docs ?? [])
          .map(d => {
            const data = d.data() as Record<string, unknown>;
            return (data.createdAt ?? data.fetchedAt ?? "") as string;
          })
          .filter(Boolean)
          .sort()
          .reverse();
        if (dates[0]) {
          daysSinceLastSignal = Math.floor((Date.now() - new Date(dates[0]).getTime()) / 86_400_000);
        }
        const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
        recentSignalCount = dates.filter(d => d > cutoff).length;
      }

      const snap: SystemSnapshot = {
        docsTotal:               visible.length,
        docsNeverAnalyzed:       neverAnalyzed.length,
        neverAnalyzedTitles:     neverAnalyzed.slice(0, 2).map(d => String(d.title ?? d.fileName ?? "Untitled")),
        docsPendingReview:       pendingReview.length,
        pendingReviewTitles:     pendingReview.slice(0, 2).map(d => String(d.title ?? "Untitled")),
        docsApprovedNoExtract:   approvedNoExtract.length,
        approvedNoExtractTitles: approvedNoExtract.slice(0, 2).map(d => String(d.title ?? "Untitled")),
        docsPaused:              paused.length,
        totalFramework:          frameworkSnap.size ?? 0,
        brokenFrameworkRecords,
        emptyParts,
        partsWithData,
        totalIntel:              intelSnap.size ?? 0,
        lowConfidenceIntel:      lowConf,
        totalRelationships:      relSnap.size ?? 0,
        daysSinceLastSignal,
        recentSignalCount,
      };

      setSnapshot(snap);
      setInsights(generateInsights(snap));
      setLastRefresh(new Date());
    } catch (err) {
      console.warn("[CTOInsights] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return { insights, snapshot, loading, lastRefresh, refresh: load };
}
