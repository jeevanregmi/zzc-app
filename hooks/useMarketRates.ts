"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../app/firebase";
import type { MarketRateSnapshot } from "../lib/types/financial";

/**
 * Calculator-safe defaults — used ONLY for the calculator and internal tools.
 * Never displayed publicly as "live" data.
 */
export const CALCULATOR_DEFAULTS: MarketRateSnapshot = {
  inflationRate:  6.5,
  riskFreeRate:   6.5,
  nepseAvgReturn: 12.0,
  fdRate:         9.0,
  epfRate:        8.5,
  ssfRate:        8.5,
  usdToNprRate:   133,
  updatedAt:      "—",
};

/**
 * useMarketRates — subscribes to the `market_rates` Firestore collection.
 *
 * Returns:
 *   rates           — values from Firestore if available, else CALCULATOR_DEFAULTS
 *   loading         — true while initial Firestore fetch is in-flight
 *   hasVerifiedData — true only when Firestore has at least one published+verified doc
 *   updatedAt       — ISO string of most recent Firestore update, or null
 *   source          — text description of data source from Firestore, or null
 *
 * Public UI should only display rate data when hasVerifiedData === true.
 * The calculator may always use `rates` as internal defaults.
 */
export function useMarketRates() {
  const [rates,           setRates]           = useState<MarketRateSnapshot>(CALCULATOR_DEFAULTS);
  const [loading,         setLoading]         = useState(true);
  const [hasVerifiedData, setHasVerifiedData] = useState(false);
  const [updatedAt,       setUpdatedAt]       = useState<string | null>(null);
  const [source,          setSource]          = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "market_rates"));
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) {
        setLoading(false);
        setHasVerifiedData(false);
        return;
      }

      const map: Record<string, number> = {};
      let latestUpdatedAt = "";
      let latestSource    = "";
      let anyVerifiedPublished = false;

      snap.docs.forEach(d => {
        const data = d.data();
        const isPublished = data.published === true;
        const isVerified  = data.verified  === true;

        if (isPublished && isVerified) {
          anyVerifiedPublished = true;
          if (typeof data.value === "number") map[d.id] = data.value;
          if (data.updatedAt && data.updatedAt > latestUpdatedAt) {
            latestUpdatedAt = data.updatedAt as string;
          }
          if (data.source) latestSource = data.source as string;
        }
      });

      if (anyVerifiedPublished) {
        setRates({
          inflationRate:  map["nepal-inflation"] ?? CALCULATOR_DEFAULTS.inflationRate,
          riskFreeRate:   map["risk-free"]       ?? CALCULATOR_DEFAULTS.riskFreeRate,
          nepseAvgReturn: map["nepse-avg"]       ?? CALCULATOR_DEFAULTS.nepseAvgReturn,
          fdRate:         map["fd-rate"]         ?? CALCULATOR_DEFAULTS.fdRate,
          epfRate:        map["epf-rate"]        ?? CALCULATOR_DEFAULTS.epfRate,
          ssfRate:        map["ssf-rate"]        ?? CALCULATOR_DEFAULTS.ssfRate,
          usdToNprRate:   map["usd-npr"]         ?? CALCULATOR_DEFAULTS.usdToNprRate,
          updatedAt:      latestUpdatedAt || "—",
        });
        setUpdatedAt(latestUpdatedAt || null);
        setSource(latestSource || null);
      }

      setHasVerifiedData(anyVerifiedPublished);
      setLoading(false);
    }, () => {
      setLoading(false);
      setHasVerifiedData(false);
    });

    return unsub;
  }, []);

  return { rates, loading, hasVerifiedData, updatedAt, source };
}
