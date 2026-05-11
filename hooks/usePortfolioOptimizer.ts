"use client";

import { useState, useMemo } from "react";
import type { RiskProfile, PortfolioRecommendation } from "../lib/types/financial";
import { calcPortfolioAllocation, type PortfolioOptimizerInputs } from "../lib/finance-engine";
import { useMarketRates } from "./useMarketRates";

export interface PortfolioInputs {
  age:              number;
  monthlyInvestable: number;
  riskTolerance:    RiskProfile;
}

export interface PortfolioSetters {
  setAge:              (v: number) => void;
  setMonthlyInvestable:(v: number) => void;
  setRiskTolerance:    (v: RiskProfile) => void;
}

const DEFAULTS: PortfolioInputs = {
  age:               28,
  monthlyInvestable: 15_000,
  riskTolerance:     "moderate",
};

export function usePortfolioOptimizer() {
  const [inputs, setInputs] = useState<PortfolioInputs>(DEFAULTS);
  const { rates, loading: ratesLoading } = useMarketRates();

  const result: PortfolioRecommendation = useMemo(() => {
    const opts: PortfolioOptimizerInputs = {
      age:              inputs.age,
      monthlyInvestable: inputs.monthlyInvestable,
      riskTolerance:    inputs.riskTolerance,
      existingHoldings: [],
      rates,
    };
    return calcPortfolioAllocation(opts);
  }, [inputs, rates]);

  const setters: PortfolioSetters = {
    setAge:               (v) => setInputs(p => ({ ...p, age: v })),
    setMonthlyInvestable: (v) => setInputs(p => ({ ...p, monthlyInvestable: v })),
    setRiskTolerance:     (v) => setInputs(p => ({ ...p, riskTolerance: v })),
  };

  return { inputs, setters, result, ratesLoading };
}

export type PortfolioHookReturn = ReturnType<typeof usePortfolioOptimizer>;
