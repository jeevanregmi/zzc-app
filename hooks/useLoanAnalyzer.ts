"use client";

import { useState, useMemo } from "react";
import type { LoanInputs, LoanResult } from "../lib/types/financial";
import { calcLoanFull } from "../lib/finance-engine";

export interface LoanSetters {
  setPrincipal:     (v: number) => void;
  setAnnualRate:    (v: number) => void;
  setTenureYears:   (v: number) => void;
  setMonthlyIncome: (v: number) => void;
}

const DEFAULT_LOAN: LoanInputs = {
  principal:     2_000_000,
  annualRate:    8.5,
  tenureYears:   20,
  monthlyIncome: 50_000,
};

export function useLoanAnalyzer() {
  const [inputs, setInputs] = useState<LoanInputs>(DEFAULT_LOAN);

  const result: LoanResult = useMemo(() => calcLoanFull(inputs), [inputs]);

  const setters: LoanSetters = {
    setPrincipal:     (v) => setInputs(p => ({ ...p, principal: v })),
    setAnnualRate:    (v) => setInputs(p => ({ ...p, annualRate: v })),
    setTenureYears:   (v) => setInputs(p => ({ ...p, tenureYears: v })),
    setMonthlyIncome: (v) => setInputs(p => ({ ...p, monthlyIncome: v })),
  };

  return { inputs, setters, result };
}

export type LoanHookReturn = ReturnType<typeof useLoanAnalyzer>;
