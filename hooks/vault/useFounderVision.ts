"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { FounderVisionEntry, FounderVisionInput } from "../../lib/types/founder-vision";

export function useFounderVision(uid: string | null) {
  const [entries,    setEntries]    = useState<FounderVisionEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    setLoading(true);
    setQueryError(null);

    // Single where("ownerId") equality filter — no composite index required.
    // Sort descending client-side to avoid the missing-index error that a
    // combined where+orderBy on different fields would trigger.
    const q = query(
      collection(db, "founder_vision"),
      where("ownerId", "==", uid),
    );

    const unsub = onSnapshot(
      q,
      snap => {
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as FounderVisionEntry))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setEntries(sorted);
        setQueryError(null);
        setLoading(false);
      },
      err => {
        console.error("[useFounderVision] Firestore query error:", err.code, err.message);
        setQueryError(`${err.code}: ${err.message}`);
        setLoading(false);
      },
    );
    return unsub;
  }, [uid]);

  async function add(input: FounderVisionInput, ownerId: string): Promise<void> {
    const now = new Date().toISOString();
    console.log("[useFounderVision] add — ownerId:", ownerId, "collection: founder_vision");
    await addDoc(collection(db, "founder_vision"), {
      ...input,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });
  }

  async function update(id: string, patch: Partial<FounderVisionInput>): Promise<void> {
    await updateDoc(doc(db, "founder_vision", id), {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  }

  async function remove(id: string): Promise<void> {
    await deleteDoc(doc(db, "founder_vision", id));
  }

  return { entries, loading, queryError, add, update, remove };
}
