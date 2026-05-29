"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../firebase";
import {
  UniversalKnowledgeCard,
  type UniversalKnowledgeObject,
} from "../../components/UniversalKnowledgeCard";
import type { IntelligenceRecord } from "../../lib/types/intelligence-record";

// ── Helpers ────────────────────────────────────────────────────────────────

const TIER_ORDER: Record<string, number> = { atomic: 0, structured: 1, operational: 2 };

function toUKO(r: IntelligenceRecord): UniversalKnowledgeObject {
  return {
    id:               r.id,
    domain:           "civic",
    objectType:       r.type,
    titleNepali:      r.titleNepali,
    title:            r.title,
    summaryNepali:    r.summaryNepali,
    textEvidence:     r.textEvidence,
    pageNumber:       r.pageNumber,
    sourceQuote:      r.traceability?.sourceQuote,
    sourceTitle:      r.sourceDocTitle,
    sourceDocId:      r.sourceDocId,
    extractionTier:   r.extractionTier as UniversalKnowledgeObject["extractionTier"],
    sector:           r.sector,
    ministry:         r.ministry,
    budgetAmount:     r.budgetAmount,
    target:           r.target,
    fiscalYear:       r.fiscalYear,
    constitutionalRefs: r.constitutionalRefs,
    affectedGroups:   r.affectedGroups,
    tags:             r.tags,
  };
}

const SECTOR_NEPALI: Record<string, string> = {
  education:      "शिक्षा",
  health:         "स्वास्थ्य",
  agriculture:    "कृषि",
  infrastructure: "पूर्वाधार",
  energy:         "ऊर्जा",
  finance:        "वित्त",
  governance:     "शासन",
  employment:     "रोजगार",
  social:         "सामाजिक",
  environment:    "वातावरण",
  judiciary:      "न्यायपालिका",
  transport:      "यातायात",
  other:          "अन्य",
};

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[CivicFeed]", e?.code ?? e); return fb; });

// ── Component ──────────────────────────────────────────────────────────────

export function CivicFeedClient() {
  const [records, setRecords]     = useState<UniversalKnowledgeObject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sector,  setSector]      = useState<string>("all");

  useEffect(() => {
    async function load() {
      const snap = await safe(
        getDocs(query(
          collection(db, "janta_intelligence"),
          where("publishToJanta", "==", true),
          limit(200),
        )),
        null,
      );

      if (!snap) { setLoading(false); return; }

      const rows: UniversalKnowledgeObject[] = snap.docs
        .map(d => toUKO({ id: d.id, ...d.data() } as IntelligenceRecord))
        .sort((a, b) => {
          const ta = TIER_ORDER[a.extractionTier ?? "operational"] ?? 2;
          const tb = TIER_ORDER[b.extractionTier ?? "operational"] ?? 2;
          return ta - tb;
        });

      setRecords(rows);
      setLoading(false);
    }
    load();
  }, []);

  // Detect unique sectors from fetched data
  const sectors = useMemo(() => {
    const seen = new Set<string>();
    records.forEach(r => { if (r.sector) seen.add(r.sector); });
    return Array.from(seen).sort();
  }, [records]);

  const visible = useMemo(
    () => sector === "all" ? records : records.filter(r => r.sector === sector),
    [records, sector],
  );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-zinc-900/40 border border-zinc-800/40 animate-pulse" />
        ))}
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-8 text-center space-y-2">
        <p className="text-zinc-500 text-sm font-semibold">अहिले कुनै प्रकाशित ज्ञान छैन</p>
        <p className="text-zinc-700 text-xs">
          Vault बाट intelligence approve र publish भएपछि यहाँ देखिनेछ।
        </p>
      </div>
    );
  }

  // ── Feed ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header + count */}
      <div className="flex items-center justify-between">
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">
          नागरिक ज्ञान — Knowledge Objects
        </p>
        <span className="text-zinc-700 text-xs font-mono">
          {visible.length}/{records.length} records
        </span>
      </div>

      {/* Sector filter tabs */}
      {sectors.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSector("all")}
            className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
              sector === "all"
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                : "bg-zinc-900/40 text-zinc-600 border-zinc-800/60 hover:text-zinc-400"
            }`}
          >
            सबै
          </button>
          {sectors.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-colors ${
                sector === s
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/60"
                  : "bg-zinc-900/40 text-zinc-600 border-zinc-800/60 hover:text-zinc-400"
              }`}
            >
              {SECTOR_NEPALI[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {visible.map(obj => (
          <UniversalKnowledgeCard key={obj.id} obj={obj} />
        ))}
      </div>

    </div>
  );
}
