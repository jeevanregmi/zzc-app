"use client";

import { useState, useEffect } from "react";
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { FounderVisionEntry, FounderVisionInput } from "../../lib/types/founder-vision";

export function useFounderVision(uid: string | null) {
  const [entries, setEntries] = useState<FounderVisionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    const q = query(
      collection(db, "founder_vision"),
      where("ownerId", "==", uid),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as FounderVisionEntry)));
      setLoading(false);
    }, () => setLoading(false));
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
