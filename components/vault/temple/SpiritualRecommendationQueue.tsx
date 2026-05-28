"use client";

// Spiritual Recommendation Queue — founder approval interface.
//
// AI analyzes sacred texts → suggestions appear here → founder decides.
// Approved suggestions are applied to the intelligence graph immediately.
// Nothing publishes without founder decision.
//
// Apply logic per suggestion type:
//   shloka_atom            → addShlokaAtom()
//   character_enrichment   → enrichSpiritualCharacter() via arrayUnion
//   character_relationship → upsertSpiritualRelationship()
//   sanskrit_term          → Phase 3 (placeholder — no-op approve)
//   bhajan_media_seed      → Phase 5 (placeholder)
//   public_readiness       → Phase 5 (placeholder)

import { useState, useEffect } from "react";
import type {
  SpiritualSuggestion, SuggestionStatus, SuggestionPayload,
  ShlokaAtomPayload, SanskritTermPayload, CharacterEnrichmentPayload,
  RelationshipPayload,
} from "../../../lib/types/spiritual-suggestions";
import {
  SUGGESTION_TYPE_LABELS, SUGGESTION_TYPE_ICONS,
  SUGGESTION_STATUS_LABELS, SUGGESTION_STATUS_COLORS,
} from "../../../lib/types/spiritual-suggestions";
import type { LeelaRelationType } from "../../../lib/types/temple-vault";
import {
  getSpiritualSuggestions, updateSuggestionStatus,
  addShlokaAtom, enrichSpiritualCharacter, upsertSpiritualRelationship,
} from "../../../lib/vault/firestore";

type SuggDoc = SpiritualSuggestion & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SuggestionQueue]", e?.code ?? e); return fb; });

// ── Apply approved suggestion to the intelligence graph ────────────────────────

async function applyApproved(sugg: SuggDoc, ownerId: string): Promise<void> {
  const payload = (sugg.editedPayload ?? sugg.payload) as SuggestionPayload;

  switch (payload.type) {
    case "shloka_atom": {
      const p = payload as ShlokaAtomPayload;
      await addShlokaAtom({
        ownerId,
        sourceTextId:      sugg.sourceTextId,
        lineIndex:         0,
        originalLine:      p.originalLine,
        nepaliMeaning:     p.nepaliMeaning,
        hindiMeaning:      p.hindiMeaning,
        englishSupport:    p.englishSupport,
        keyTerms:          p.keyTerms ?? [],
        devotionalEmotion: p.devotionalEmotion,
        verified:          true,
      });
      break;
    }
    case "character_enrichment": {
      const p = payload as CharacterEnrichmentPayload;
      if (p.characterId && p.field && p.valueList?.length) {
        await enrichSpiritualCharacter(p.characterId, p.field, p.valueList);
      }
      break;
    }
    case "character_relationship": {
      const p = payload as RelationshipPayload;
      if (p.fromId && p.toId) {
        await upsertSpiritualRelationship({
          id:           `rel_${p.fromId}_${p.toId}_${p.relationType}`,
          ownerId,
          fromId:       p.fromId,
          fromType:     "character",
          fromName:     p.fromName,
          toId:         p.toId,
          toType:       "character",
          toName:       p.toName,
          relationType: p.relationType as LeelaRelationType,
          contextNote:  p.contextNote ? { nepali: p.contextNote } : undefined,
          verified:     true,
        });
      }
      break;
    }
    // sanskrit_term, bhajan_media_seed, public_readiness — Phase 3/5, no-op for now
    default:
      break;
  }
}

// ── Suggestion body — type-specific display ────────────────────────────────────

function SuggestionBody({ payload }: { payload: SuggestionPayload }) {
  switch (payload.type) {
    case "shloka_atom": {
      const p = payload as ShlokaAtomPayload;
      return (
        <div className="space-y-2">
          <p className="text-zinc-200 text-sm leading-[1.9] font-light" style={{ fontFamily: "serif" }}>
            {p.originalLine}
          </p>
          <p className="text-zinc-400 text-xs leading-relaxed pl-3 border-l border-white/[0.06]">
            {p.nepaliMeaning}
          </p>
          {p.keyTerms.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {p.keyTerms.map(t => (
                <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-white/[0.03] text-zinc-600 border border-white/[0.05]">
                  {t}
                </span>
              ))}
            </div>
          )}
          {p.devotionalEmotion && (
            <p className="text-[10px] text-zinc-700">रस: {p.devotionalEmotion}</p>
          )}
        </div>
      );
    }
    case "sanskrit_term": {
      const p = payload as SanskritTermPayload;
      return (
        <div className="space-y-1.5">
          <p className="text-zinc-200 text-base font-medium" style={{ fontFamily: "serif" }}>{p.term}</p>
          <p className="text-zinc-400 text-xs leading-relaxed">{p.nepaliMeaning}</p>
          {p.philosophicalConcept && (
            <p className="text-zinc-700 text-[10px] italic">{p.philosophicalConcept}</p>
          )}
        </div>
      );
    }
    case "character_enrichment": {
      const p = payload as CharacterEnrichmentPayload;
      return (
        <div className="space-y-1.5">
          <p className="text-zinc-400 text-xs">
            <span className="text-zinc-300 font-medium">{p.characterName}</span>
            {" → "}
            <span className="text-zinc-600">{p.field}</span>
          </p>
          {p.valueList && p.valueList.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.valueList.map(v => (
                <span key={v} className="text-[11px] px-2.5 py-1 rounded-full border border-white/[0.06] bg-white/[0.02] text-zinc-300">
                  {v}
                </span>
              ))}
            </div>
          )}
          {p.valueSanskrit && <p className="text-zinc-500 text-xs" style={{ fontFamily: "serif" }}>{p.valueSanskrit}</p>}
          {p.valueNepali   && <p className="text-zinc-500 text-xs">{p.valueNepali}</p>}
        </div>
      );
    }
    case "character_relationship": {
      const p = payload as RelationshipPayload;
      return (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-300 font-medium">{p.fromName}</span>
            <span className="text-zinc-600 text-xs">—{p.relationType}→</span>
            <span className="text-zinc-300 font-medium">{p.toName}</span>
          </div>
          {p.contextNote && (
            <p className="text-zinc-500 text-xs leading-relaxed pl-2 border-l border-white/[0.05]">
              {p.contextNote}
            </p>
          )}
        </div>
      );
    }
    case "bhajan_media_seed": {
      const p = payload;
      return (
        <div className="space-y-1.5">
          <p className="text-zinc-300 text-xs font-medium">{p.suggestedTitle}</p>
          <p className="text-zinc-600 text-[10px]">{p.mediaType} · {p.mood ?? ""}</p>
          {p.selectedLines.slice(0, 2).map((line, i) => (
            <p key={i} className="text-zinc-500 text-xs italic" style={{ fontFamily: "serif" }}>{line}</p>
          ))}
        </div>
      );
    }
    case "public_readiness": {
      const p = payload;
      return (
        <div className="space-y-1">
          <p className="text-zinc-400 text-xs leading-relaxed">{p.note}</p>
          {typeof p.readinessScore === "number" && (
            <p className="text-zinc-600 text-[10px]">Readiness: {p.readinessScore}/100</p>
          )}
        </div>
      );
    }
  }
}

// ── Inline edit form — type-specific editable fields ─────────────────────────

function EditForm({
  payload,
  onSave,
  onCancel,
}: {
  payload:  SuggestionPayload;
  onSave:   (edited: SuggestionPayload) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<SuggestionPayload>({ ...payload });

  function setField(k: string, v: unknown) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  return (
    <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
      {payload.type === "shloka_atom" && (
        <>
          <textarea
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 resize-none focus:outline-none focus:border-white/15 leading-[1.9]"
            rows={2}
            value={(draft as ShlokaAtomPayload).nepaliMeaning}
            onChange={e => setField("nepaliMeaning", e.target.value)}
            placeholder="नेपाली अर्थ"
          />
          <input
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
            value={(draft as ShlokaAtomPayload).keyTerms.join(", ")}
            onChange={e => setField("keyTerms", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
            placeholder="Sanskrit terms, comma separated"
          />
        </>
      )}
      {payload.type === "sanskrit_term" && (
        <>
          <input
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
            value={(draft as SanskritTermPayload).nepaliMeaning}
            onChange={e => setField("nepaliMeaning", e.target.value)}
            placeholder="नेपाली अर्थ"
          />
          <input
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
            value={(draft as SanskritTermPayload).philosophicalConcept ?? ""}
            onChange={e => setField("philosophicalConcept", e.target.value)}
            placeholder="Philosophical concept (English)"
          />
        </>
      )}
      {payload.type === "character_enrichment" && (
        <input
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
          value={((draft as CharacterEnrichmentPayload).valueList ?? []).join(", ")}
          onChange={e => setField("valueList", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
          placeholder="Values, comma separated"
        />
      )}
      {payload.type === "character_relationship" && (
        <input
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
          value={(draft as RelationshipPayload).contextNote ?? ""}
          onChange={e => setField("contextNote", e.target.value)}
          placeholder="Context note (Nepali)"
        />
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-1.5 rounded-lg border border-white/[0.06] text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
        >
          रद्द
        </button>
        <button
          onClick={() => onSave(draft)}
          className="flex-1 py-1.5 rounded-lg border border-sky-900/50 bg-sky-950/30 text-sky-300 text-xs font-medium hover:bg-sky-950/50 transition-colors"
        >
          ✓ Edit गरेर Approve
        </button>
      </div>
    </div>
  );
}

// ── Suggestion card ────────────────────────────────────────────────────────────

function SuggestionCard({
  sugg,
  onApprove,
  onReject,
  onDefer,
  onEditApprove,
}: {
  sugg:          SuggDoc;
  onApprove:     (s: SuggDoc) => Promise<void>;
  onReject:      (id: string) => Promise<void>;
  onDefer:       (id: string) => Promise<void>;
  onEditApprove: (s: SuggDoc, edited: SuggestionPayload) => Promise<void>;
}) {
  const [acting,  setActing]  = useState(false);
  const [editing, setEditing] = useState(false);

  const statusColor = SUGGESTION_STATUS_COLORS[sugg.status];
  const isPending   = sugg.status === "pending";
  const displayPayload = sugg.editedPayload ?? sugg.payload;

  async function act(fn: () => Promise<void>) {
    setActing(true);
    try { await fn(); } finally { setActing(false); }
  }

  return (
    <div className={`rounded-2xl border bg-white/[0.02] p-4 space-y-3 transition-all duration-300 ${
      isPending ? "border-white/[0.07] hover:border-white/[0.1]" : "border-white/[0.04] opacity-70"
    }`}>
      {/* Card header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{SUGGESTION_TYPE_ICONS[sugg.suggestionType]}</span>
          <div className="min-w-0">
            <p className="text-zinc-400 text-[10px] uppercase tracking-widest">
              {SUGGESTION_TYPE_LABELS[sugg.suggestionType]}
            </p>
            {sugg.sourceTextTitle && (
              <p className="text-zinc-700 text-[9px] truncate max-w-[160px]">
                {sugg.sourceTextTitle}
              </p>
            )}
          </div>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}>
          {SUGGESTION_STATUS_LABELS[sugg.status]}
        </span>
      </div>

      {/* Suggestion content */}
      {editing ? (
        <EditForm
          payload={sugg.payload}
          onSave={async (edited) => {
            setEditing(false);
            await act(() => onEditApprove(sugg, edited));
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <SuggestionBody payload={displayPayload} />
      )}

      {/* Actions — only shown for pending suggestions */}
      {isPending && !editing && (
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => act(() => onApprove(sugg))}
            disabled={acting}
            className="flex-1 py-1.5 rounded-lg border border-green-900/50 bg-green-950/20 text-green-400 text-[11px] hover:bg-green-950/40 disabled:opacity-30 transition-all"
          >
            ✓ Approve
          </button>
          <button
            onClick={() => setEditing(true)}
            disabled={acting}
            className="flex-1 py-1.5 rounded-lg border border-white/[0.08] text-zinc-500 text-[11px] hover:text-zinc-300 disabled:opacity-30 transition-colors"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => act(() => onReject(sugg.id))}
            disabled={acting}
            className="py-1.5 px-3 rounded-lg border border-white/[0.05] text-zinc-700 text-[11px] hover:text-zinc-500 disabled:opacity-30 transition-colors"
          >
            ✗
          </button>
          <button
            onClick={() => act(() => onDefer(sugg.id))}
            disabled={acting}
            className="py-1.5 px-3 rounded-lg border border-white/[0.05] text-zinc-700 text-[11px] hover:text-zinc-500 disabled:opacity-30 transition-colors"
          >
            ◎
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main queue panel ───────────────────────────────────────────────────────────

interface QueueProps {
  ownerId:         string;
  sourceTextId?:   string;  // if set, shows only this text's suggestions
  onPendingCount?: (n: number) => void;
}

export function SpiritualRecommendationQueue({ ownerId, sourceTextId, onPendingCount }: QueueProps) {
  const [suggestions, setSuggestions] = useState<SuggDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState<SuggestionStatus | "all">("pending");

  async function loadSuggestions() {
    setLoading(true);
    const all = await safe(getSpiritualSuggestions(ownerId, sourceTextId), []);
    setSuggestions(all);
    const pendingCount = all.filter(s => s.status === "pending").length;
    onPendingCount?.(pendingCount);
    setLoading(false);
  }

  useEffect(() => { void loadSuggestions(); }, [ownerId, sourceTextId]);

  async function handleApprove(sugg: SuggDoc) {
    await safe(applyApproved(sugg, ownerId), undefined);
    await safe(updateSuggestionStatus(sugg.id, "approved"), undefined);
    setSuggestions(prev => prev.map(s => s.id === sugg.id ? { ...s, status: "approved" } : s));
    onPendingCount?.(suggestions.filter(s => s.status === "pending" && s.id !== sugg.id).length);
  }

  async function handleReject(id: string) {
    await safe(updateSuggestionStatus(id, "rejected"), undefined);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
    onPendingCount?.(suggestions.filter(s => s.status === "pending" && s.id !== id).length);
  }

  async function handleDefer(id: string) {
    await safe(updateSuggestionStatus(id, "deferred"), undefined);
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: "deferred" } : s));
    onPendingCount?.(suggestions.filter(s => s.status === "pending" && s.id !== id).length);
  }

  async function handleEditApprove(sugg: SuggDoc, edited: SuggestionPayload) {
    await safe(applyApproved({ ...sugg, editedPayload: edited }, ownerId), undefined);
    await safe(updateSuggestionStatus(sugg.id, "edited", { editedPayload: edited }), undefined);
    setSuggestions(prev => prev.map(s =>
      s.id === sugg.id ? { ...s, status: "edited", editedPayload: edited } : s,
    ));
    onPendingCount?.(suggestions.filter(s => s.status === "pending" && s.id !== sugg.id).length);
  }

  const pendingCount = suggestions.filter(s => s.status === "pending").length;

  const filtered = filter === "all"
    ? suggestions
    : suggestions.filter(s => s.status === filter);

  const FILTER_TABS: Array<{ value: SuggestionStatus | "all"; label: string }> = [
    { value: "pending",  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { value: "approved", label: "अनुमोदित" },
    { value: "edited",   label: "सम्पादित" },
    { value: "rejected", label: "अस्वीकृत" },
    { value: "deferred", label: "स्थगित" },
    { value: "all",      label: "सबै" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-50 animate-pulse" />
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6 space-y-3">
        <span className="text-3xl opacity-20 select-none" aria-hidden>◎</span>
        <p className="text-zinc-500 text-sm">
          {sourceTextId
            ? "यो ग्रन्थको लागि अझ कुनै suggestion छैन"
            : "अझ कुनै suggestion छैन"}
        </p>
        <p className="text-zinc-700 text-xs max-w-xs leading-relaxed">
          ग्रन्थ upload गरेर AI विश्लेषण गर्नुहोस् — suggestions यहाँ देखिनेछन्
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-300 ${
              filter === tab.value
                ? tab.value === "pending"
                  ? "border-amber-700/60 bg-amber-950/30 text-amber-300"
                  : "border-white/15 bg-white/[0.06] text-zinc-300"
                : "border-white/[0.05] text-zinc-700 hover:text-zinc-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-zinc-700 text-xs">यस फिल्टरमा कुनै suggestion छैन</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(sugg => (
            <SuggestionCard
              key={sugg.id}
              sugg={sugg}
              onApprove={handleApprove}
              onReject={handleReject}
              onDefer={handleDefer}
              onEditApprove={handleEditApprove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
