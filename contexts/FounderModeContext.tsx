"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type VaultMode = "founder" | "debug";
const MODE_KEY = "zzc_vault_mode";

interface FounderModeCtx {
  mode:      VaultMode;
  isFounder: boolean;
  isDebug:   boolean;
  toggle:    () => void;
}

const Ctx = createContext<FounderModeCtx>({
  mode: "founder", isFounder: true, isDebug: false, toggle: () => {},
});

export function FounderModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<VaultMode>("founder");

  useEffect(() => {
    try {
      if (localStorage.getItem(MODE_KEY) === "debug") setMode("debug");
    } catch { /* ignore */ }
  }, []);

  function toggle() {
    setMode(prev => {
      const next: VaultMode = prev === "founder" ? "debug" : "founder";
      try { localStorage.setItem(MODE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <Ctx.Provider value={{ mode, isFounder: mode === "founder", isDebug: mode === "debug", toggle }}>
      {children}
    </Ctx.Provider>
  );
}

export const useFounderMode = () => useContext(Ctx);
