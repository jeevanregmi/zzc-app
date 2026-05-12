"use client";

import { useState, useMemo } from "react";
import type { HealthInputs, HealthResult } from "../lib/types/financial";
import { calcHealthFull } from "../lib/finance-engine";

export interface HealthSetters {
  setMonthlyIncome:        (v: number) => void;
  setMonthlyExpenses:      (v: number) => void;
  setEmergencyFundBalance: (v: number) => void;
  setLifeInsuranceCover:   (v: number) => void;
  setCurrentAge:           (v: number) => void;
}

const DEFAULT_HEALTH: HealthInputs = {
  monthlyIncome:        50_000,
  monthlyExpenses:      30_000,
  emergencyFundBalance: 0,
  lifeInsuranceCover:   0,
  currentAge:           27,
};

export function useFinancialHealth() {
  const [inputs, setInputs] = useState<HealthInputs>(DEFAULT_HEALTH);

  const result: HealthResult = useMemo(() => calcHealthFull(inputs), [inputs]);

  const setters: HealthSetters = {
    setMonthlyIncome:        (v) => setInputs(p => ({ ...p, monthlyIncome: v })),
    setMonthlyExpenses:      (v) => setInputs(p => ({ ...p, monthlyExpenses: v })),
    setEmergencyFundBalance: (v) => setInputs(p => ({ ...p, emergencyFundBalance: v })),
    setLifeInsuranceCover:   (v) => setInputs(p => ({ ...p, lifeInsuranceCover: v })),
    setCurrentAge:           (v) => setInputs(p => ({ ...p, currentAge: v })),
  };

  return { inputs, setters, result };
}

export type HealthHookReturn = ReturnType<typeof useFinancialHealth>;
