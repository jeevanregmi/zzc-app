"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { IntelligenceRecord } from "../../lib/types/intelligence-record";
import { computeAllPartsHealth, type BranchHealth } from "../../lib/constitution/healthComputer";

const PART_NUMBERS = Array.from({ length: 35 }, (_, i) => i + 1);

export function useBranchHealth() {
  const [healthMap, setHealthMap] = useState<Map<number, BranchHealth>>(new Map());
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let alive = true;

    getDocs(query(
      collection(db, "janta_intelligence"),
      where("publishToJanta", "==", true),
    ))
      .then(snap => {
        if (!alive) return;
        const records: IntelligenceRecord[] = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as IntelligenceRecord));
        setHealthMap(computeAllPartsHealth(PART_NUMBERS, records));
      })
      .catch(err => {
        console.warn("[useBranchHealth] fetch failed:", err?.message ?? err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, []);

  return { healthMap, loading };
}
