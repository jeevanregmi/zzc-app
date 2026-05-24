"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { IntelligenceRecord } from "../../lib/types/intelligence-record";
import type { CivicAtom } from "../../lib/types/atoms";
import { computeAllPartsHealth, type BranchHealth } from "../../lib/constitution/healthComputer";
import { atomsToIntelRecords } from "../../lib/vault/atomToIntelBridge";

const PART_NUMBERS = Array.from({ length: 35 }, (_, i) => i + 1);

/**
 * Phase 1 Bridge: reads BOTH vault_civic_atoms (new) AND janta_intelligence (old)
 * so the public constitution tree and branch health dashboard show real
 * approved-document intelligence without requiring a data migration.
 */
export function useBranchHealth() {
  const [healthMap, setHealthMap] = useState<Map<number, BranchHealth>>(new Map());
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    let alive = true;

    Promise.all([
      // New system: all approved civic atoms
      getDocs(collection(db, "vault_civic_atoms")),
      // Old system: published janta intelligence records
      getDocs(query(
        collection(db, "janta_intelligence"),
        where("publishToJanta", "==", true),
      )),
    ])
      .then(([atomSnap, jantaSnap]) => {
        if (!alive) return;

        const atoms = atomSnap.docs.map(d => ({ id: d.id, ...d.data() } as CivicAtom));
        const janta = jantaSnap.docs.map(d => ({ id: d.id, ...d.data() } as IntelligenceRecord));

        // Bridge atoms into intel record shape, then merge with janta records
        const merged = [...atomsToIntelRecords(atoms), ...janta];
        setHealthMap(computeAllPartsHealth(PART_NUMBERS, merged));
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
