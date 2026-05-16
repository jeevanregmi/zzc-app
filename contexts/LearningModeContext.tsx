"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface LearningModeCtx { on: boolean; toggle: () => void; }

const LearningModeContext = createContext<LearningModeCtx>({ on: false, toggle: () => {} });

export function LearningModeProvider({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(localStorage.getItem("zzc-learn") === "1");
  }, []);

  const toggle = () => {
    setOn(prev => {
      const next = !prev;
      localStorage.setItem("zzc-learn", next ? "1" : "0");
      return next;
    });
  };

  return (
    <LearningModeContext.Provider value={{ on, toggle }}>
      {children}
    </LearningModeContext.Provider>
  );
}

export function useLearningMode() {
  return useContext(LearningModeContext);
}
