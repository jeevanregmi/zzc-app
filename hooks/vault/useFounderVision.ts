"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { FounderVisionEntry, FounderVisionInput } from "../../lib/types/founder-vision";

export function useFounderVision(uid: string | null) {
  const [entries, setEntries] = useState<FounderVisionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    // No orderBy here — avoids composite index requirement on founder_vision.
    // Single where("ownerId") works without index. Sort client-side instead.
    const q = query(
      collection(db, "founder_vision"),
      where("ownerId", "==", uid),
    );
    const unsub = onSnapshot(q, snap => {
      const sorted = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FounderVisionEntry))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setEntries(sorted);
      setLoading(false);
    }, err => {
      console.error("[useFounderVision] query failed:", err);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  async function add(input: FounderVisionInput, ownerId: string): Promise<void> {
    const now = new Date().toISOString();
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

  return { entries, loading, add, update, remove };
}
