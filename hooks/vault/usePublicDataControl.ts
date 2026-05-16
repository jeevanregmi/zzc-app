"use client";

import { useState, useEffect } from "react";
import { subscribeMarketRates, type MarketRateDoc } from "../../lib/vault/firestore";

export const RATE_DEFINITIONS: { id: string; label: string; unit: string; hint: string }[] = [
  { id: "epf-rate",       label: "EPF Return Rate",        unit: "%",   hint: "EPF annual declared return (e.g. 8.5)" },
  { id: "ssf-rate",       label: "SSF Return Rate",        unit: "%",   hint: "SSF annual declared return (e.g. 8.5)" },
  { id: "fd-rate",        label: "FD Rate",                unit: "%",   hint: "Commercial bank FD avg (e.g. 9.0)" },
  { id: "nepal-inflation",label: "Inflation Rate",         unit: "%",   hint: "NRB CPI headline inflation (e.g. 6.5)" },
  { id: "nepse-avg",      label: "NEPSE Avg Return",       unit: "%",   hint: "NEPSE 3-year rolling avg (e.g. 12.0)" },
  { id: "risk-free",      label: "Risk-Free Rate",         unit: "%",   hint: "91-day T-bill proxy (e.g. 6.5)" },
  { id: "usd-npr",        label: "USD/NPR Rate",           unit: "NPR", hint: "Mid-market exchange rate (e.g. 133)" },
];

export function usePublicDataControl() {
  const [rates,   setRates]   = useState<MarketRateDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeMarketRates(docs => {
      setRates(docs);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { rates, loading };
}
