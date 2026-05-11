"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../app/firebase";
import type { MarketRateSnapshot } from "../lib/types/financial";

// Fallback used when Firestore has no rates or during loading
const FALLBACK: MarketRateSnapshot = {
  inflationRate:  6.5,   // NRB headline CPI avg 2020-2025
  riskFreeRate:   6.5,   // 91-day T-bill proxy
  nepseAvgReturn: 12.0,  // NEPSE 3-year rolling avg
  fdRate:         9.0,   // commercial bank FD avg
  epfRate:        8.5,   // EPF declared FY 2023/24
  ssfRate:        8.5,   // SSF declared FY 2023/24
  usdToNprRate:   133,   // mid-market rate
  updatedAt:      "2025-01-01",
};

/**
 * useMarketRates — subscribes to the `market_rates` Firestore collection.
 *
 * Firestore document shape: { id, label, value, source, updatedAt }
 * IDs used: "nepal-inflation" | "risk-free" | "nepse-avg" | "fd-rate"
 *           "epf-rate" | "ssf-rate" | "usd-npr"
 *
 * Falls back to hardcoded Nepal defaults while loading or if collection is empty.
 */
export function useMarketRates() {
  const [rates,   setRates]   = useState<MarketRateSnapshot>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "market_rates"));
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) { setLoading(false); return; }

      const map: Record<string, number> = {};
      let updatedAt = FALLBACK.updatedAt;
      snap.docs.forEach(d => {
        const data = d.data();
        map[d.id] = typeof data.value === "number" ? data.value : 0;
        if (data.updatedAt) updatedAt = data.updatedAt as string;
      });

      setRates({
        inflationRate:  map["nepal-inflation"] ?? FALLBACK.inflationRate,
        riskFreeRate:   map["risk-free"]       ?? FALLBACK.riskFreeRate,
        nepseAvgReturn: map["nepse-avg"]       ?? FALLBACK.nepseAvgReturn,
        fdRate:         map["fd-rate"]         ?? FALLBACK.fdRate,
        epfRate:        map["epf-rate"]        ?? FALLBACK.epfRate,
        ssfRate:        map["ssf-rate"]        ?? FALLBACK.ssfRate,
        usdToNprRate:   map["usd-npr"]         ?? FALLBACK.usdToNprRate,
        updatedAt,
      });
      setLoading(false);
    }, () => setLoading(false));   // on error, keep fallback + stop loading

    return unsub;
  }, []);

  return { rates, loading, isFallback: !loading && rates === FALLBACK };
}
