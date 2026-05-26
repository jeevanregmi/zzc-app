"use client";

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { MediaAtom } from "../../lib/types/media-atoms";

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(e => {
  console.warn("[useMediaAtoms] read failed:", e?.code ?? e);
  return fb;
});

export function useMediaAtoms(ownerId: string | null) {
  const [atoms,   setAtoms]   = useState<MediaAtom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setAtoms([]); setLoading(false); return; }

    setLoading(true);
    safe(
      getDocs(query(
        collection(db, "media_atoms"),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc"),
        limit(200),
      )),
      null,
    ).then(snap => {
      if (!snap) { setLoading(false); return; }
      setAtoms(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAtom)));
      setLoading(false);
    });
  }, [ownerId]);

  async function createAtom(atom: Omit<MediaAtom, "id">): Promise<string> {
    const ref = await addDoc(collection(db, "media_atoms"), atom);
    setAtoms(prev => [{ id: ref.id, ...atom }, ...prev]);
    return ref.id;
  }

  async function updateAtom(id: string, patch: Partial<MediaAtom>): Promise<void> {
    await updateDoc(doc(db, "media_atoms", id), patch as Record<string, unknown>);
    setAtoms(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  }

  async function deleteAtom(id: string): Promise<void> {
    await deleteDoc(doc(db, "media_atoms", id));
    setAtoms(prev => prev.filter(a => a.id !== id));
  }

  return { atoms, loading, createAtom, updateAtom, deleteAtom };
}
