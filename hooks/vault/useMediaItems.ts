"use client";

import { useState, useEffect } from "react";
import type { VaultMedia } from "../../lib/vault/types";
import { subscribeMedia } from "../../lib/vault/firestore";

export function useMediaItems(ownerId: string | null, folder: string | null = null) {
  const [items,   setItems]   = useState<VaultMedia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setItems([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeMedia(ownerId, folder, data => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [ownerId, folder]);

  return { items, loading };
}
