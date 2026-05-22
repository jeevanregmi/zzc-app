"use client";

/**
 * useForexRate — live USD → NPR rate from NRB official forex API.
 *
 * Cache hierarchy:
 *   1. localStorage (same-day: skip the network entirely)
 *   2. /api/forex-rate (CF Function → NRB API → CF edge cache 24 h)
 *   3. Fallback 135 if network fails
 *
 * Returns the mid-rate (average of NRB buy + sell).
 */

import { useState, useEffect } from "react";

const FALLBACK    = 155; // approximate mid-rate 2026-05-20: buy 154.16, sell 154.76
const STORAGE_KEY = "zzc_forex_usd_npr_v1";

export interface ForexRate {
  rateNPR: number;
  buy?:    number;
  sell?:   number;
  date:    string;
  source:  "NRB" | "NRB-yesterday" | "fallback" | "localStorage";
  loading: boolean;
}

export function useForexRate(): ForexRate {
  const [state, setState] = useState<ForexRate>({
    rateNPR: FALLBACK,
    date:    "",
    source:  "fallback",
    loading: true,
  });

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);

    // 1. Check localStorage — valid for today
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as ForexRate & { cachedDate: string };
        if (cached.cachedDate === today && cached.rateNPR > 0) {
          setState({ ...cached, source: "localStorage", loading: false });
          return;
        }
      }
    } catch { /* ignore parse errors */ }

    // 2. Fetch from CF Function proxy
    fetch("/api/forex-rate")
      .then(r => r.json())
      .then((data: ForexRate) => {
        const next: ForexRate = { ...data, loading: false };
        setState(next);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, cachedDate: today }));
        } catch { /* quota exceeded — ignore */ }
      })
      .catch(() => {
        setState({ rateNPR: FALLBACK, date: today, source: "fallback", loading: false });
      });
  }, []);

  return state;
}
