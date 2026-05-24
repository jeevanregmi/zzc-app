"use client";

import { useEffect, useState } from "react";
import { subscribeAtoms } from "../../lib/vault/atoms";
import type { CivicAtom } from "../../lib/types/atoms";

export function useAtoms(ownerId: string | null) {
  const [atoms,   setAtoms]   = useState<CivicAtom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    setError(null);
    const unsub = subscribeAtoms(ownerId, items => {
      setAtoms(items);
      setLoading(false);
    }, err => {
      setError(err.message);
      setLoading(false);
    });
    return unsub;
  }, [ownerId]);

  return { atoms, loading, error };
}
