"use client";

import { useState, useMemo } from "react";
import type { RetirementInputs, RetirementResult } from "../lib/types/financial";
import { calcRetirementFull } from "../lib/finance-engine";

export interface RetirementSetters {
  setCurrentSalary:        (v: number) => void;
  setMonthlyExpensesToday: (v: number) => void;
  setCurrentAge:           (v: number) => void;
  setRetirementAge:        (v: number) => void;
  setLifeExpectancy:       (v: number) => void;
  setPostRetirementReturn: (v: number) => void;
  setInflationRate:        (v: number) => void;
  setSalaryGrowthRate:     (v: number) => void;
}

const DEFAULT_RETIREMENT: RetirementInputs = {
  currentSalary:        50_000,
  monthlyExpensesToday: 30_000,
  currentAge:           27,
  retirementAge:        60,
  lifeExpectancy:       78,
  postRetirementReturn: 6.0,
  inflationRate:        6.5,
  salaryGrowthRate:     7.0,
};

export function useRetirementPlanner() {
  const [inputs, setInputs] = useState<RetirementInputs>(DEFAULT_RETIREMENT);

  const result: RetirementResult = useMemo(() => calcRetirementFull(inputs), [inputs]);

  const setters: RetirementSetters = {
    setCurrentSalary:        (v) => setInputs(p => ({ ...p, currentSalary: v })),
    setMonthlyExpensesToday: (v) => setInputs(p => ({ ...p, monthlyExpensesToday: v })),
    setCurrentAge:           (v) => setInputs(p => ({ ...p, currentAge: v })),
    setRetirementAge:        (v) => setInputs(p => ({ ...p, retirementAge: v })),
    setLifeExpectancy:       (v) => setInputs(p => ({ ...p, lifeExpectancy: v })),
    setPostRetirementReturn: (v) => setInputs(p => ({ ...p, postRetirementReturn: v })),
    setInflationRate:        (v) => setInputs(p => ({ ...p, inflationRate: v })),
    setSalaryGrowthRate:     (v) => setInputs(p => ({ ...p, salaryGrowthRate: v })),
  };

  return { inputs, setters, result };
}

export type RetirementHookReturn = ReturnType<typeof useRetirementPlanner>;
