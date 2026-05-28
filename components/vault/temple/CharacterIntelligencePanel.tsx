"use client";

// SpiritualCharacter Intelligence Explorer.
//
// Architecture: Chambers = UI grouping. SpiritualCharacter = primary intelligence node.
// This panel is the Phase 2 implementation of the Living Spiritual Intelligence Graph.
//
// Layout:
//   Left sidebar — character list (icon + name + tradition)
//   Right panel  — selected character detail:
//     • names/forms   • symbols   • rasa   • teachings
//     • festivals     • scriptures • bhajans
//     • relationship graph (CharacterGraph)
//     • canonicalMediaContext (CanonicalMediaContextPanel)

import { useState, useEffect, useCallback } from "react";
import type { SpiritualCharacter, SpiritualRelationship, DevotionalRasa } from "../../../lib/types/temple-vault";
import {
  getSpiritualCharacters,
  getSpiritualRelationships,
  upsertSpiritualCharacter,
  upsertSpiritualRelationship,
  updateSpiritualCharacter,
} from "../../../lib/vault/firestore";
import {
  SPIRITUAL_CHARACTER_SEEDS,
  SPIRITUAL_RELATIONSHIP_SEEDS,
} from "../../../lib/vault/spiritualSeeds";
import { CharacterGraph } from "./CharacterGraph";
import { CanonicalMediaContextPanel } from "./CanonicalMediaContextPanel";

type CharDoc = SpiritualCharacter & { id: string };
type RelDoc  = SpiritualRelationship & { id: string };

// ── Rasa labels ───────────────────────────────────────────────────────────────

const RASA_NP: Record<DevotionalRasa, { label: string; color: string }> = {
  shanta:   { label: "शान्त",    color: "text-slate-300 border-slate-700 bg-slate-900/40" },
  dasya:    { label: "दास्य",    color: "text-orange-300 border-orange-800 bg-orange-950/30" },
  sakhya:   { label: "सख्य",    color: "text-sky-300 border-sky-800 bg-sky-950/30" },
  vatsalya: { label: "वात्सल्य", color: "text-rose-300 border-rose-800 bg-rose-950/30" },
  madhurya: { label: "माधुर्य",  color: "text-pink-300 border-pink-800 bg-pink-950/30" },
  vira:     { label: "वीर",      color: "text-red-300 border-red-800 bg-red-950/30" },
  rudra:    { label: "रुद्र",    color: "text-violet-300 border-violet-800 bg-violet-950/30" },
  karuna:   { label: "करुण",    color: "text-green-300 border-green-800 bg-green-950/30" },
  adbhuta:  { label: "अद्भुत",   color: "text-amber-300 border-amber-800 bg-amber-950/30" },
};

const TRADITION_COLORS: Record<string, string> = {
  shaiva:          "text-sky-400",
  shakta:          "text-rose-400",
  vaishnava:       "text-amber-400",
  advaita_vedanta: "text-violet-400",
  buddhist:        "text-stone-400",
  vedic:           "text-yellow-400",
  upanishadic:     "text-indigo-400",
  bhakti:          "text-pink-400",
  ganapatya:       "text-orange-400",
  general:         "text-zinc-400",
};

// ── Safe Firestore wrapper ─────────────────────────────────────────────────────

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[CharacterIntelligencePanel]", e?.code ?? e); return fb; });

// ── Section divider ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest px-1">{label}</p>
      {children}
    </div>
  );
}

// ── Pill list ─────────────────────────────────────────────────────────────────

function PillList({ items, color = "text-zinc-400 border-zinc-800 bg-white/[0.025]" }: { items: string[]; color?: string }) {
  if (items.length === 0) return <p className="text-zinc-700 text-xs px-1">—</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className={`text-[11px] px-2.5 py-1 rounded-full border ${color}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

// ── Character detail panel ────────────────────────────────────────────────────

function CharacterDetail({
  char,
  allChars,
  relationships,
  onNavigate,
  onContextSaved,
}: {
  char:          CharDoc;
  allChars:      CharDoc[];
  relationships: RelDoc[];
  onNavigate:    (id: string) => void;
  onContextSaved:(id: string, ctx: string) => void;
}) {
  const tradition = char.primaryTradition;
  const tColor    = TRADITION_COLORS[tradition] ?? "text-zinc-400";
  const rasaInfo  = RASA_NP[char.primaryRasa];

  const charRels = relationships.filter(r => r.fromId === char.id || r.toId === char.id);

  async function handleContextSave(text: string) {
    await updateSpiritualCharacter(char.id, { canonicalMediaContext: text });
    onContextSaved(char.id, text);
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Hero header */}
      <div className="flex items-start gap-4">
        <span className="text-5xl mt-1 select-none" aria-hidden>{char.icon ?? "✦"}</span>
        <div className="min-w-0 flex-1">
          <h2 className={`text-xl font-semibold leading-tight ${tColor}`}>
            {char.primaryName?.nepali ?? char.primaryName?.sanskrit}
          </h2>
          {char.primaryName?.sanskrit && char.primaryName.sanskrit !== char.primaryName.nepali && (
            <p className="text-zinc-600 text-xs mt-0.5">{char.primaryName.sanskrit}</p>
          )}
          {char.primaryName?.english && (
            <p className="text-zinc-700 text-[10px] mt-0.5">{char.primaryName.english}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] ${tColor}`}>
              {tradition}
            </span>
            {rasaInfo && (
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${rasaInfo.color}`}>
                {rasaInfo.label} रस
              </span>
            )}
            {!char.verified && (
              <span className="text-[10px] text-zinc-700 px-2 py-0.5 rounded-full border border-zinc-800">
                ai_draft
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Essence */}
      {char.essence?.nepali && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
          <p className="text-zinc-300 text-sm leading-[1.9]">{char.essence.nepali}</p>
          {char.essence.english && (
            <p className="text-zinc-600 text-[10px] mt-1.5 italic leading-relaxed">{char.essence.english}</p>
          )}
        </div>
      )}

      {/* Names & forms */}
      {char.alternateNames.length > 0 && (
        <Section label="नाम र रूपहरू">
          <div className="space-y-1.5">
            {char.alternateNames.map((n, i) => (
              <div key={i} className="flex items-baseline gap-2">
                <span className="text-zinc-300 text-sm font-medium shrink-0">{n.sanskrit ?? n.nepali}</span>
                {n.english && <span className="text-zinc-600 text-[10px]">— {n.english}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Epithets */}
      {char.epithets.length > 0 && (
        <Section label="विशेषण">
          <PillList items={char.epithets} color="text-zinc-400 border-zinc-800 bg-white/[0.02]" />
        </Section>
      )}

      {/* Symbols */}
      {char.symbols.length > 0 && (
        <Section label="प्रतीक र चिह्नहरू">
          <div className="grid grid-cols-2 gap-1">
            {char.symbols.map(s => (
              <div key={s} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                <span className="text-zinc-700">◦</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Moods */}
      {char.moods.length > 0 && (
        <Section label="भाव र मनोदशा">
          <div className="space-y-1">
            {char.moods.map((m, i) => (
              <p key={i} className="text-zinc-500 text-[11px] leading-relaxed pl-3 border-l border-white/[0.06]">
                {m}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* Core teachings */}
      {char.coreTeachings.length > 0 && (
        <Section label="मूल शिक्षाहरू">
          <div className="space-y-3">
            {char.coreTeachings.map((t, i) => (
              <div key={i} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 space-y-0.5">
                {t.sanskrit && (
                  <p className={`text-sm font-medium leading-snug ${tColor} opacity-90`}>{t.sanskrit}</p>
                )}
                {t.nepali && (
                  <p className="text-zinc-300 text-xs leading-relaxed">{t.nepali}</p>
                )}
                {t.english && (
                  <p className="text-zinc-600 text-[10px] italic leading-relaxed">{t.english}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Key shlokas */}
      {char.keyShlokas && char.keyShlokas.length > 0 && (
        <Section label="मुख्य श्लोक र मन्त्र">
          <div className="space-y-1.5">
            {char.keyShlokas.map((s, i) => (
              <p key={i} className="text-zinc-500 text-xs leading-relaxed font-light pl-3 border-l border-white/[0.05]">
                {s}
              </p>
            ))}
          </div>
        </Section>
      )}

      {/* Leela highlights */}
      {char.leelaHighlights.length > 0 && (
        <Section label="लीला र कथाहरू">
          <div className="space-y-2">
            {char.leelaHighlights.map((l, i) => (
              <div key={i} className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2 space-y-0.5">
                {l.sanskrit && (
                  <p className={`text-xs font-medium ${tColor} opacity-80`}>{l.sanskrit}</p>
                )}
                <p className="text-zinc-300 text-xs leading-relaxed">{l.nepali ?? l.english}</p>
                {l.english && l.nepali && (
                  <p className="text-zinc-700 text-[10px] italic">{l.english}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Scriptures */}
      {char.scriptureRefs.length > 0 && (
        <Section label="सम्बन्धित शास्त्रहरू">
          <PillList items={char.scriptureRefs} color="text-indigo-300 border-indigo-900/50 bg-indigo-950/20" />
        </Section>
      )}

      {/* Bhajans */}
      {char.bhajanRefs && char.bhajanRefs.length > 0 && (
        <Section label="सम्बन्धित भजन">
          <PillList items={char.bhajanRefs} color="text-pink-300 border-pink-900/50 bg-pink-950/20" />
        </Section>
      )}

      {/* Festivals */}
      {char.festivals && char.festivals.length > 0 && (
        <Section label="सम्बन्धित पर्वहरू">
          <PillList items={char.festivals} color="text-amber-300 border-amber-900/50 bg-amber-950/20" />
        </Section>
      )}

      {/* Mantras */}
      {char.mantras && char.mantras.length > 0 && (
        <Section label="मन्त्रहरू">
          <div className="space-y-1.5">
            {char.mantras.map(m => (
              <p key={m} className={`text-sm ${tColor} opacity-70 font-light leading-relaxed`}>{m}</p>
            ))}
          </div>
        </Section>
      )}

      {/* Relationship graph */}
      {charRels.length > 0 && (
        <Section label="सम्बन्ध ग्राफ">
          <div className="rounded-2xl border border-white/[0.05] bg-[#080816] p-4">
            <CharacterGraph
              center={char}
              allCharacters={allChars}
              relationships={charRels}
              onNodeClick={onNavigate}
            />
            <p className="text-zinc-700 text-[9px] text-center mt-2">
              नोडमा click गरेर त्यो character खोल्न सकिन्छ
            </p>
          </div>
        </Section>
      )}

      {/* Philosophical note */}
      {char.philosophicalNote && (
        <Section label="दार्शनिक विश्लेषण">
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
            <p className="text-zinc-500 text-xs leading-[1.9]">{char.philosophicalNote}</p>
          </div>
        </Section>
      )}

      {/* Canonical media context */}
      <Section label="मिडिया Grounding Context">
        <CanonicalMediaContextPanel
          characterName={char.primaryName?.nepali ?? char.primaryName?.sanskrit ?? ""}
          characterIcon={char.icon ?? "✦"}
          value={char.canonicalMediaContext ?? ""}
          onSave={handleContextSave}
        />
      </Section>

      {/* Sources */}
      {char.primarySources.length > 0 && (
        <Section label="स्रोत">
          <p className="text-zinc-700 text-[10px] leading-relaxed px-1">
            {char.primarySources.join(" · ")}
            {!char.verified && " · सामग्री AI draft — founder verification आवश्यक"}
          </p>
        </Section>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface PanelProps {
  ownerId: string;
}

export function CharacterIntelligencePanel({ ownerId }: PanelProps) {
  const [characters,    setCharacters]    = useState<CharDoc[]>([]);
  const [relationships, setRelationships] = useState<RelDoc[]>([]);
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [seeding,       setSeeding]       = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [chars, rels] = await Promise.all([
      safe(getSpiritualCharacters(ownerId), []),
      safe(getSpiritualRelationships(ownerId), []),
    ]);
    setCharacters(chars);
    setRelationships(rels);
    if (chars.length > 0 && !selectedId) setSelectedId(chars[0].id);
    setLoading(false);
  }, [ownerId, selectedId]);

  useEffect(() => { void loadAll(); }, [ownerId]);

  async function handleSeed() {
    setSeeding(true);
    try {
      await Promise.all(
        SPIRITUAL_CHARACTER_SEEDS.map(c =>
          upsertSpiritualCharacter({ ...c, ownerId }),
        ),
      );
      await Promise.all(
        SPIRITUAL_RELATIONSHIP_SEEDS.map(r =>
          upsertSpiritualRelationship({ ...r, ownerId }),
        ),
      );
      await loadAll();
    } finally {
      setSeeding(false);
    }
  }

  function handleContextSaved(id: string, ctx: string) {
    setCharacters(prev => prev.map(c => c.id === id ? { ...c, canonicalMediaContext: ctx } : c));
  }

  const selected = characters.find(c => c.id === selectedId) ?? null;

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-50 animate-pulse" />
      </div>
    );
  }

  // ── Empty — offer seeding ─────────────────────────────────────────────────

  if (characters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6 space-y-5">
        <span className="text-4xl opacity-20 select-none">✦</span>
        <div className="space-y-1">
          <p className="text-zinc-300 text-sm font-medium">
            चरित्र Intelligence Graph रिक्त छ
          </p>
          <p className="text-zinc-600 text-xs leading-relaxed max-w-xs mx-auto">
            १२ मूल चरित्रहरू (शिव, कृष्ण, हनुमान, शंकराचार्य...) र
            core relationship edges seed गर्नुहोस्।
          </p>
        </div>
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="text-xs px-6 py-3 rounded-full border border-indigo-800/60 bg-indigo-950/30 text-indigo-300 opacity-80 hover:opacity-100 disabled:opacity-30 transition-all duration-500"
        >
          {seeding ? "Seed हुँदैछ…" : "✦ १२ चरित्र Seed गर्नुहोस्"}
        </button>
      </div>
    );
  }

  // ── Main split view ───────────────────────────────────────────────────────

  return (
    <div className="flex gap-0 min-h-0">

      {/* Left sidebar — character list */}
      <div className="w-16 sm:w-20 shrink-0 flex flex-col gap-1 pt-1 border-r border-white/[0.04] pr-2 overflow-y-auto max-h-[calc(100vh-180px)]">
        {characters.map(c => {
          const tColor = TRADITION_COLORS[c.primaryTradition] ?? "text-zinc-400";
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-300 ${
                active
                  ? "bg-white/[0.06] border border-white/[0.1]"
                  : "hover:bg-white/[0.03] border border-transparent"
              }`}
              title={c.primaryName?.nepali ?? ""}
            >
              <span className="text-xl leading-none">{c.icon ?? "✦"}</span>
              <span className={`text-[9px] leading-tight text-center max-w-[52px] break-words ${active ? tColor : "text-zinc-600"}`}>
                {(c.primaryName?.nepali ?? c.primaryName?.sanskrit ?? "").slice(0, 6)}
              </span>
              {/* Media grounding indicator */}
              {c.canonicalMediaContext ? (
                <span className="w-1 h-1 rounded-full bg-green-600 opacity-60" title="Media grounded" />
              ) : (
                <span className="w-1 h-1 rounded-full bg-red-800 opacity-40" title="No media context" />
              )}
            </button>
          );
        })}
      </div>

      {/* Right panel — character detail */}
      <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-180px)] pl-4 pr-1">
        {selected ? (
          <CharacterDetail
            char={selected}
            allChars={characters}
            relationships={relationships}
            onNavigate={setSelectedId}
            onContextSaved={handleContextSaved}
          />
        ) : (
          <div className="flex items-center justify-center h-40 text-zinc-700 text-xs">
            बायाँबाट एउटा चरित्र छान्नुहोस्
          </div>
        )}
      </div>
    </div>
  );
}
