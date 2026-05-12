"use client";

/**
 * useSIPCalculator — React state wrapper for SIP computation
 *
 * Design rules enforced here:
 *   - ZERO computation: result is 100% derived via useMemo from engine
 *   - ZERO side effects: no API calls, no localStorage, no Firestore
 *   - inputs and result are fully independent (constraint: no hidden coupling)
 *   - Setters are individual field updaters (not a bulk setState)
 *     so components only re-render when their specific field changes
 *
 * TECHNICAL DEBT RISK:
 *   If SIPInputs grows to 10+ fields, individual setters become verbose.
 *   Refactor to useReducer with an SIPAction union type at that point.
 */

import { useState, useMemo } from "react";
import type { SIPInputs, SIPResult } from "../lib/types/financial";
import { calcSIPFull } from "../lib/finance-engine";

export interface SIPSetters {
  setMonthly:        (v: number) => void;
  setAnnualRate:     (v: number) => void;
  setCurrentAge:     (v: number) => void;
  setRetirementAge:  (v: number) => void;
  setInflationRate:  (v: number) => void;
  setStepUpRate:     (v: number) => void;
}

const DEFAULT_SIP: SIPInputs = {
  monthly:        5_000,
  annualRate:     8.5,
  currentAge:     25,
  retirementAge:  60,
  inflationRate:  6.5,
  stepUpRate:     7.0,
};

export function useSIPCalculator() {
  const [inputs, setInputs] = useState<SIPInputs>(DEFAULT_SIP);

  const result: SIPResult = useMemo(() => calcSIPFull(inputs), [inputs]);

  const setters: SIPSetters = {
    setMonthly:       (v) => setInputs(p => ({ ...p, monthly: v })),
    setAnnualRate:    (v) => setInputs(p => ({ ...p, annualRate: v })),
    setCurrentAge:    (v) => setInputs(p => ({ ...p, currentAge: v })),
    setRetirementAge: (v) => setInputs(p => ({ ...p, retirementAge: v })),
    setInflationRate: (v) => setInputs(p => ({ ...p, inflationRate: v })),
    setStepUpRate:    (v) => setInputs(p => ({ ...p, stepUpRate: v })),
  };

  return { inputs, setters, result };
}

export type SIPHookReturn = ReturnType<typeof useSIPCalculator>;
