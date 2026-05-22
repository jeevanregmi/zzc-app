"use client";

import { useState, useEffect } from "react";
import { subscribeAudienceLeads } from "../../lib/vault/firestore";
import type { AudienceLead } from "../../lib/types/revenue";

export function useAudienceLeads(limit?: number) {
  const [leads, setLeads] = useState<AudienceLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAudienceLeads({ limit }, items => {
      setLeads(items);
      setLoading(false);
    });
    return unsub;
  }, [limit]);

  return { leads, loading };
}
