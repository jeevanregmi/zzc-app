"use client";

/**
 * useSchemeMetrics — derives SchemeMetric[] from static schemes data.
 *
 * This hook has NO inputs (scheme data is static). It runs once on mount.
 * Result is memoized forever — schemes don't change at runtime.
 *
 * Boundary: CALCULATION ← here → VISUALIZATION (RiskTab)
 *
 * TECHNICAL DEBT RISK:
 *   If schemes become dynamic (admin-editable at runtime), this hook needs
 *   a useEffect + Firestore subscription instead of a static useMemo.
 *   The interface stays the same; only the data source changes.
 */

import { useMemo, useState } from "react";
import type { SchemeMetric, SortCol } from "../lib/types/financial";
import { SCHEMES } from "../lib/schemes-data";
import {
  calcSharpeScore,
  schemeRiskScore,
  schemeLiquidityScore,
  realReturnRate,
  NEPAL_RISK_FREE,
  NEPAL_INFLATION,
} from "../lib/finance-engine";

export function useSchemeMetrics() {
  const [sortCol, setSortCol]   = useState<SortCol>("sharpeScore");
  const [sortAsc, setSortAsc]   = useState(false);

  const metrics: SchemeMetric[] = useMemo(() => {
    return SCHEMES
      .filter(s => s.interestRate !== null || s.annualReturn !== null)
      .map(s => {
        const rate    = (s.annualReturn ?? s.interestRate) as number;
        const riskLvl = s.riskLevel;
        return {
          schemeId:        s.id,
          title:           s.title,
          titleNepali:     s.titleNepali,
          org:             s.organization,
          category:        s.category,
          nominalReturn:   rate,
          realReturn:      parseFloat(realReturnRate(rate, NEPAL_INFLATION).toFixed(2)),
          riskScore:       schemeRiskScore(riskLvl),
          liquidityScore:  schemeLiquidityScore(s.liquidity),
          sharpeScore:     calcSharpeScore(rate, NEPAL_RISK_FREE, riskLvl),
          governmentBacked: s.organization === "EPF" || s.organization === "SSF",
        };
      });
  }, []);

  const sorted: SchemeMetric[] = useMemo(() => {
    return [...metrics].sort((a, b) => {
      const diff = a[sortCol] - b[sortCol];
      return sortAsc ? diff : -diff;
    });
  }, [metrics, sortCol, sortAsc]);

  function toggleSort(col: SortCol) {
    if (col === sortCol) {
      setSortAsc(p => !p);
    } else {
      setSortCol(col);
      setSortAsc(false);
    }
  }

  return { metrics: sorted, sortCol, sortAsc, toggleSort };
}

export type SchemeMetricsHookReturn = ReturnType<typeof useSchemeMetrics>;
