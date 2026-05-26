"use client";

import { useEffect } from "react";

const SESSION_KEY = "zzc_last_session";
const SESSION_TTL = 8 * 60 * 60 * 1000; // 8h — same-day relevance

export interface SessionState {
  labelNp: string;   // "संविधान भाग-संरचना सुधार बाँकी छ"
  href:    string;   // "/vault/constitution"
  ts:      number;
}

export function useSessionTracker(state: Omit<SessionState, "ts"> | null) {
  const key = state?.labelNp ?? "";
  const href = state?.href ?? "";

  useEffect(() => {
    if (!key) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ labelNp: key, href, ts: Date.now() }));
    } catch { /* ignore */ }
  }, [key, href]);
}

export function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function readLastSession(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessionState;
    if (Date.now() - s.ts > SESSION_TTL) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return s;
  } catch { return null; }
}
