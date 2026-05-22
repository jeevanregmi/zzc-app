"use client";

/**
 * useVaultAIUsage — global admin view of vault_ai_usage collection.
 *
 * Reads all auto-tracked AI calls (from process-document, analyze-ssf, ingest-url).
 * Computes provider economics, burn summary, and cost-per-analysis.
 * No ownerId filter — this is founder-level visibility into the full AI infrastructure.
 */

import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { VaultAIUsageEntry, ProviderEconomics, BurnSummary } from "../../lib/types/economics";

function periodOf(iso: string): string {
  return iso.slice(0, 7); // "2026-05"
}

function isoFromTs(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
    return ((ts as { toDate: () => Date }).toDate()).toISOString();
  }
  return String(ts);
}

export function useVaultAIUsage() {
  const [entries, setEntries] = useState<VaultAIUsageEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "vault_ai_usage"),
      orderBy("createdAt", "desc"),
      limit(500),
    );
    const unsub = onSnapshot(q, snap => {
      const rows: VaultAIUsageEntry[] = snap.docs.map(d => {
        const data = d.data();
        return {
          id:            d.id,
          provider:      String(data.provider ?? "unknown"),
          model:         String(data.model ?? ""),
          tokensIn:      Number(data.tokensIn ?? 0),
          tokensOut:     Number(data.tokensOut ?? 0),
          estimatedCost: Number(data.estimatedCost ?? 0),
          documentId:    data.documentId ? String(data.documentId) : undefined,
          userId:        data.userId     ? String(data.userId)     : undefined,
          date:          data.date       ? String(data.date)       : isoFromTs(data.createdAt).slice(0, 10),
          status:        data.status === "error" ? "error" : "success",
          createdAt:     isoFromTs(data.createdAt),
        };
      });
      setEntries(rows);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  // ── Computed values ───────────────────────────────────────────────────────────

  const currentPeriod = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const lastPeriod    = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const successEntries = useMemo(() => entries.filter(e => e.status === "success"), [entries]);

  const totalCostUSD = useMemo(
    () => successEntries.reduce((s, e) => s + e.estimatedCost, 0),
    [successEntries],
  );

  const avgCostPerAnalysis = useMemo(
    () => successEntries.length > 0 ? totalCostUSD / successEntries.length : 0,
    [totalCostUSD, successEntries],
  );

  const providerEconomics = useMemo<ProviderEconomics[]>(() => {
    const map = new Map<string, { cost: number; count: number; success: number }>();
    for (const e of entries) {
      const key = e.provider;
      const s   = map.get(key) ?? { cost: 0, count: 0, success: 0 };
      map.set(key, {
        cost:    s.cost + e.estimatedCost,
        count:   s.count + 1,
        success: s.success + (e.status === "success" ? 1 : 0),
      });
    }
    return Array.from(map.entries())
      .map(([provider, s]) => ({
        provider,
        totalCostUSD: parseFloat(s.cost.toFixed(6)),
        callCount:    s.count,
        avgCostUSD:   s.count > 0 ? parseFloat((s.cost / s.count).toFixed(6)) : 0,
        successRate:  s.count > 0 ? parseFloat((s.success / s.count).toFixed(3)) : 0,
      }))
      .sort((a, b) => b.totalCostUSD - a.totalCostUSD);
  }, [entries]);

  const thisMonthUSD = useMemo(
    () => entries.filter(e => e.date.startsWith(currentPeriod)).reduce((s, e) => s + e.estimatedCost, 0),
    [entries, currentPeriod],
  );

  const lastMonthUSD = useMemo(
    () => entries.filter(e => e.date.startsWith(lastPeriod)).reduce((s, e) => s + e.estimatedCost, 0),
    [entries, lastPeriod],
  );

  // Extrapolate this month: cost_so_far / elapsed_days × days_in_month
  const projectedMonthlyUSD = useMemo(() => {
    const now      = new Date();
    const dayOfMonth  = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (dayOfMonth === 0 || thisMonthUSD === 0) return 0;
    return parseFloat(((thisMonthUSD / dayOfMonth) * daysInMonth).toFixed(4));
  }, [thisMonthUSD]);

  const burnSummary = useMemo<BurnSummary>(() => {
    const twoMonthsAgo = (() => {
      const d = new Date();
      d.setMonth(d.getMonth() - 2);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    })();
    const twoMonthUSD = entries
      .filter(e => e.date.startsWith(twoMonthsAgo))
      .reduce((s, e) => s + e.estimatedCost, 0);

    const avg = (thisMonthUSD + lastMonthUSD + twoMonthUSD) / 3;
    return {
      thisMonthUSD:  parseFloat(thisMonthUSD.toFixed(4)),
      lastMonthUSD:  parseFloat(lastMonthUSD.toFixed(4)),
      avgMonthlyUSD: parseFloat(avg.toFixed(4)),
      projectedUSD:  projectedMonthlyUSD,
      aiAutoUSD:     parseFloat(thisMonthUSD.toFixed(4)),
      aiManualUSD:   0,   // filled by BusinessClient from useAICosts
      infraUSD:      0,   // filled by BusinessClient from useExpenses
    };
  }, [thisMonthUSD, lastMonthUSD, projectedMonthlyUSD, entries]);

  // Daily burn — last 30 days
  const dailyBurnUSD = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const sum = entries
      .filter(e => new Date(e.date) >= cutoff)
      .reduce((s, e) => s + e.estimatedCost, 0);
    return parseFloat((sum / 30).toFixed(6));
  }, [entries]);

  // Recent 30 days by date for sparkline
  const dailyTimeline = useMemo(() => {
    const map = new Map<string, number>();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    for (const e of entries) {
      const d = e.date.slice(0, 10);
      if (new Date(d) >= cutoff) {
        map.set(d, (map.get(d) ?? 0) + e.estimatedCost);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, costUSD]) => ({ date: date.slice(5), costUSD: parseFloat(costUSD.toFixed(6)) }));
  }, [entries]);

  return {
    entries,
    loading,
    totalCostUSD:       parseFloat(totalCostUSD.toFixed(4)),
    avgCostPerAnalysis: parseFloat(avgCostPerAnalysis.toFixed(6)),
    providerEconomics,
    thisMonthUSD:       parseFloat(thisMonthUSD.toFixed(4)),
    lastMonthUSD:       parseFloat(lastMonthUSD.toFixed(4)),
    projectedMonthlyUSD,
    dailyBurnUSD,
    dailyTimeline,
    burnSummary,
    totalAnalyses:      successEntries.length,
    periodOf,
  };
}
