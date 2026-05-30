"use client";

// SacredWorkspacePanel — deep intelligence workspace for a single Sacred Work.
// Shloka analysis (word mapping + छोटो भावार्थ) is the primary feature for known
// works like Rudrashtakam. Approve → writes shloka_atoms + semantic_dictionary.
// Add Anything section handles additional URLs / text / notes.

import { useState, useEffect } from "react";
import {
  collection, query, where, limit, getDocs, addDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import {
  analyzeSacredSource,
  getShlokaTemplate,
  type SacredSourceAnalysis,
  type ConfidenceLevel,
  type ShlokaCard,
} from "../../../lib/vault/sacredSourceEngine";
import {
  TRADITION_TEXT_COLORS,
} from "../../../lib/types/sacred-work";
import type { SpiritualTradition } from "../../../lib/types/semantic-atom";
import { SACRED_LANGUAGE_LABELS } from "../../../lib/types/sacred-text";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WorkRef {
  id:                        string;
  canonicalTitle:            string;
  canonicalTitleDevanagari?: string;
  tradition:                 SpiritualTradition;
}

interface SacredSourceDoc {
  id:            string;
  workId:        string;
  inputType:     "url" | "text";
  rawInput:      string;
  analysis:      SacredSourceAnalysis;
  founderStatus: "approved" | "rejected";
  founderNote?:  string;
  createdAt:     string;
}

interface ApprovedShloka {
  docId:       string;
  shortNepali: string;
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredWorkspacePanel]", e?.code ?? e); return fb; });

const SHLOKA_NUM_NEPALI = ["१", "२", "३", "४", "५", "६", "७", "८", "९", "१०"];

const CONF_CLS: Record<ConfidenceLevel, string> = {
  high:   "text-emerald-400 border-emerald-800/60 bg-emerald-950/20",
  medium: "text-amber-400  border-amber-800/60  bg-amber-950/20",
  low:    "text-zinc-500   border-zinc-700       bg-zinc-900/40",
};

// ── ShlokaCardView ─────────────────────────────────────────────────────────────

function ShlokaCardView({
  card,
  approved,
  saving,
  onApprove,
}: {
  card:      ShlokaCard;
  approved:  ApprovedShloka | undefined;
  saving:    boolean;
  onApprove: (shortNepali: string) => void;
}) {
  const [editedNepali, setEditedNepali] = useState(card.shortNepali);
  const [uncertain,    setUncertain]    = useState(false);
  const isApproved = !!approved;

  return (
    <div className={`rounded-2xl border transition-colors ${
      isApproved ? "border-emerald-900/40 bg-emerald-950/[0.07]" : "border-white/[0.06] bg-white/[0.015]"
    } p-5 space-y-4 relative`}>

      {saving && (
        <div className="absolute inset-0 rounded-2xl bg-black/60 z-10 flex items-center justify-center">
          <span className="text-emerald-400 text-xs animate-pulse">Saving…</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-zinc-600 text-[10px] uppercase tracking-wide">
          श्लोक {SHLOKA_NUM_NEPALI[card.index - 1] ?? card.index}
        </span>
        <div className="flex items-center gap-2">
          {isApproved && (
            <span className="text-[10px] border border-emerald-800/60 bg-emerald-950/20 text-emerald-400 rounded-full px-2.5 py-0.5">
              ✓ Approved
            </span>
          )}
          {uncertain && !isApproved && (
            <span className="text-[10px] border border-amber-800/60 bg-amber-950/20 text-amber-400 rounded-full px-2.5 py-0.5">
              ? Uncertain
            </span>
          )}
        </div>
      </div>

      {/* Sanskrit text */}
      <div className="rounded-xl bg-black/30 border border-white/[0.04] px-4 py-3">
        <p
          className="text-zinc-300 text-[15px] leading-loose whitespace-pre-line"
          style={{ fontFamily: "serif" }}
        >
          {card.sanskrit}
        </p>
      </div>

      {/* Word mapping table */}
      <div className="space-y-1.5">
        <p className="text-zinc-600 text-[10px] uppercase tracking-wide">शब्दार्थ</p>
        <div className="rounded-xl border border-white/[0.04] overflow-hidden">
          {card.wordMappings.map((wm, i) => (
            <div
              key={i}
              className={`grid grid-cols-2 ${
                i % 2 === 0 ? "bg-white/[0.015]" : "bg-transparent"
              } border-b border-white/[0.03] last:border-0`}
            >
              <div className="px-3 py-2 border-r border-white/[0.04]">
                <span
                  className="text-zinc-200 text-[11px]"
                  style={{ fontFamily: "serif" }}
                >
                  {wm.word}
                </span>
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-zinc-400 text-[11px]">{wm.nepali}</span>
                <span className={`text-[9px] border rounded-full px-1.5 py-0.5 shrink-0 ${CONF_CLS[wm.confidence]}`}>
                  {wm.confidence === "high" ? "✓" : wm.confidence === "medium" ? "~" : "?"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* छोटो भावार्थ */}
      <div className="space-y-1.5">
        <p className="text-zinc-600 text-[10px] uppercase tracking-wide">छोटो भावार्थ</p>
        {isApproved ? (
          <div className="rounded-xl bg-emerald-950/10 border border-emerald-900/30 px-4 py-3">
            <p className="text-emerald-300 text-sm leading-relaxed">{approved.shortNepali}</p>
          </div>
        ) : (
          <textarea
            value={editedNepali}
            onChange={e => setEditedNepali(e.target.value)}
            rows={3}
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-800 focus:outline-none focus:border-white/[0.15] resize-none leading-relaxed"
          />
        )}
      </div>

      {/* Action buttons */}
      {!isApproved && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onApprove(editedNepali)}
            disabled={saving}
            className="flex-1 py-2 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-emerald-300 text-xs font-medium hover:bg-emerald-950/40 transition-colors disabled:opacity-40"
          >
            ✅ Approve — Dictionary मा save गर्नुहोस्
          </button>
          <button
            onClick={() => setUncertain(v => !v)}
            disabled={saving}
            className={`px-4 py-2 rounded-xl border text-xs transition-colors ${
              uncertain
                ? "border-amber-800/60 bg-amber-950/20 text-amber-400"
                : "border-zinc-800/60 text-zinc-600 hover:text-zinc-400"
            }`}
          >
            ? Uncertain
          </button>
        </div>
      )}
    </div>
  );
}

// ── Source list item ───────────────────────────────────────────────────────────

function SourceItem({ src }: { src: SacredSourceDoc }) {
  const preview = src.rawInput.length > 100
    ? src.rawInput.slice(0, 100) + "…"
    : src.rawInput;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.03] last:border-0">
      <span className="text-xs shrink-0 mt-0.5 opacity-40">
        {src.inputType === "url" ? "🔗" : "📄"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-zinc-500 text-[10px] leading-relaxed break-all">{preview}</p>
        {src.analysis?.matchedWorkTitle && (
          <p className="text-emerald-700 text-[10px] mt-0.5">✦ {src.analysis.matchedWorkTitle}</p>
        )}
        {src.founderNote && (
          <p className="text-zinc-700 text-[10px] italic mt-0.5">{src.founderNote}</p>
        )}
      </div>
      <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${
        src.founderStatus === "approved"
          ? "text-emerald-400 border-emerald-800/60 bg-emerald-950/20"
          : "text-zinc-600 border-zinc-800 bg-zinc-900/40"
      }`}>
        {src.founderStatus === "approved" ? "✓" : "✕"}
      </span>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function SacredWorkspacePanel({
  work,
  ownerId,
  onClose,
}: {
  work:    WorkRef;
  ownerId: string;
  onClose: () => void;
}) {
  const template = getShlokaTemplate(work.canonicalTitle);
  const tColor   = TRADITION_TEXT_COLORS[work.tradition] ?? "text-zinc-400";

  // Shloka approval state
  const [approvedShlokas, setApprovedShlokas] = useState<Map<number, ApprovedShloka>>(new Map());
  const [savingIdx,       setSavingIdx]       = useState<number | null>(null);
  const [loadingShlokas,  setLoadingShlokas]  = useState(!!template);

  // Add Anything state
  const [addOpen,     setAddOpen]     = useState(!template);
  const [inputMode,   setInputMode]   = useState<"text" | "url">("text");
  const [inputValue,  setInputValue]  = useState("");
  const [analysis,    setAnalysis]    = useState<SacredSourceAnalysis | null>(null);
  const [founderNote, setFounderNote] = useState("");
  const [savingSrc,   setSavingSrc]   = useState(false);
  const [sources,     setSources]     = useState<SacredSourceDoc[]>([]);
  const [loadingSrc,  setLoadingSrc]  = useState(true);

  const langLabels = SACRED_LANGUAGE_LABELS as Record<string, string>;

  // Load existing shloka_atoms for this work (pre-populate approved set)
  useEffect(() => {
    if (!template || !ownerId) { setLoadingShlokas(false); return; }
    safe(
      getDocs(query(
        collection(db, "shloka_atoms"),
        where("ownerId", "==", ownerId),
        limit(200),
      )),
      null,
    ).then(snap => {
      if (snap) {
        const map = new Map<number, ApprovedShloka>();
        snap.docs.forEach(d => {
          const data = d.data() as Record<string, unknown>;
          if (data.workId === work.id && data.founderStatus === "approved") {
            map.set(data.index as number, {
              docId:       d.id,
              shortNepali: data.shortNepali as string,
            });
          }
        });
        setApprovedShlokas(map);
      }
      setLoadingShlokas(false);
    });
  }, [ownerId, work.id, template]);

  // Load saved sacred_sources for this work
  useEffect(() => {
    if (!ownerId) return;
    safe(
      getDocs(query(
        collection(db, "sacred_sources"),
        where("ownerId", "==", ownerId),
        limit(200),
      )),
      null,
    ).then(snap => {
      if (snap) {
        const docs = snap.docs
          .map(d => {
            const data = d.data() as Record<string, unknown>;
            return {
              id:            d.id,
              workId:        data.workId        as string,
              inputType:     data.inputType     as "url" | "text",
              rawInput:      data.rawInput      as string,
              analysis:      data.analysis      as SacredSourceAnalysis,
              founderStatus: data.founderStatus as "approved" | "rejected",
              founderNote:   data.founderNote   as string | undefined,
              createdAt:     data.createdAt     as string,
            };
          })
          .filter(d => d.workId === work.id)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setSources(docs);
      }
      setLoadingSrc(false);
    });
  }, [ownerId, work.id]);

  async function handleApproveShlokaAt(card: ShlokaCard, editedNepali: string) {
    setSavingIdx(card.index);
    const now = new Date().toISOString();
    try {
      const finalNepali = editedNepali.trim() || card.shortNepali;

      // Write shloka_atoms
      const shlokaRef = await addDoc(collection(db, "shloka_atoms"), {
        workId:        work.id,
        ownerId,
        index:         card.index,
        sanskrit:      card.sanskrit,
        wordMappings:  card.wordMappings,
        shortNepali:   finalNepali,
        founderStatus: "approved",
        createdAt:     now,
        updatedAt:     now,
      });

      // Write one semantic_dictionary entry per word mapping
      await Promise.all(
        card.wordMappings.map(wm =>
          addDoc(collection(db, "semantic_dictionary"), {
            domain:          "spiritual",
            ownerId,
            sanskritWord:    wm.word,
            nepaliMeaning:   wm.nepali,
            confidence:      wm.confidence,
            founderApproved: true,
            sacredWorkId:    work.id,
            sourceShlokaId:  shlokaRef.id,
            usageExamples:   [{ shlokaIndex: card.index, sanskrit: card.sanskrit }],
            createdAt:       now,
            updatedAt:       now,
          }).catch(e => console.warn("[dict write]", e?.code ?? e))
        )
      );

      setApprovedShlokas(prev => {
        const next = new Map(prev);
        next.set(card.index, { docId: shlokaRef.id, shortNepali: finalNepali });
        return next;
      });
    } finally {
      setSavingIdx(null);
    }
  }

  function handleAnalyze() {
    const input = inputValue.trim();
    if (!input) return;
    setAnalysis(analyzeSacredSource(input));
  }

  async function handleApproveSource() {
    if (!analysis) return;
    setSavingSrc(true);
    try {
      const now = new Date().toISOString();
      const payload = {
        workId:        work.id,
        ownerId,
        inputType:     analysis.inputType,
        rawInput:      analysis.rawInput,
        analysis,
        founderStatus: "approved",
        founderNote:   founderNote.trim() || null,
        createdAt:     now,
        updatedAt:     now,
      };
      const ref = await addDoc(collection(db, "sacred_sources"), payload);
      setSources(prev => [{
        id:            ref.id,
        workId:        work.id,
        inputType:     analysis.inputType,
        rawInput:      analysis.rawInput,
        analysis,
        founderStatus: "approved",
        founderNote:   founderNote.trim() || undefined,
        createdAt:     now,
      }, ...prev]);
      setInputValue("");
      setAnalysis(null);
      setFounderNote("");
    } finally {
      setSavingSrc(false);
    }
  }

  const approvedCount = approvedShlokas.size;
  const totalShlokas  = template?.length ?? 0;
  const progressPct   = totalShlokas > 0 ? Math.round((approvedCount / totalShlokas) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-3xl bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between gap-4 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-semibold ${tColor}`}>{work.canonicalTitle}</h3>
              {work.canonicalTitleDevanagari && (
                <span className="text-zinc-500 text-sm" style={{ fontFamily: "serif" }}>
                  {work.canonicalTitleDevanagari}
                </span>
              )}
            </div>

            {template && (
              <div className="flex items-center gap-3 mt-2.5">
                <div className="w-32 bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-600">
                  {approvedCount}/{totalShlokas} श्लोक approved
                </span>
                {approvedCount === totalShlokas && totalShlokas > 0 && (
                  <span className="text-[10px] text-emerald-500">✦ सम्पूर्ण</span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors shrink-0 mt-1"
          >
            ✕
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Shloka Analysis (known works only) ── */}
          {template && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-zinc-500 text-[10px] uppercase tracking-wide">
                  श्लोक Analysis
                </p>
                <p className="text-zinc-700 text-[10px]">
                  Approve → shloka_atoms + dictionary
                </p>
              </div>

              {loadingShlokas ? (
                <p className="text-zinc-800 text-xs animate-pulse py-4 text-center">
                  Shlokas load गर्दैछ…
                </p>
              ) : (
                <div className="space-y-4">
                  {template.map(card => (
                    <ShlokaCardView
                      key={card.index}
                      card={card}
                      approved={approvedShlokas.get(card.index)}
                      saving={savingIdx === card.index}
                      onApprove={editedNepali => handleApproveShlokaAt(card, editedNepali)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Add Anything ── */}
          <div className={template ? "border-t border-white/[0.04] pt-5" : ""}>
            <button
              onClick={() => setAddOpen(v => !v)}
              className="flex items-center gap-2 text-zinc-500 text-[11px] hover:text-zinc-300 transition-colors mb-3"
            >
              <span className={`transition-transform text-base leading-none ${addOpen ? "rotate-90" : ""}`}>
                ›
              </span>
              {addOpen
                ? "थप सामग्री — URL, Text, Note"
                : "+ थप सामग्री थप्नुहोस् (URL, PDF link, Note)"}
            </button>

            {addOpen && (
              <div className="space-y-3">

                {/* Mode pills */}
                <div className="flex items-center gap-1">
                  {(["text", "url"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => { setInputMode(mode); setInputValue(""); setAnalysis(null); }}
                      className={`text-[11px] px-3 py-1.5 rounded-lg border transition-colors ${
                        inputMode === mode
                          ? "border-white/15 bg-white/[0.06] text-zinc-300"
                          : "border-white/[0.05] text-zinc-700 hover:text-zinc-500"
                      }`}
                    >
                      {mode === "text" ? "📄 Text / पाठ" : "🔗 URL / Link"}
                    </button>
                  ))}
                </div>

                {inputMode === "text" ? (
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    placeholder={"Sanskrit text, Nepali translation, audio note — जे पनि paste गर्नुहोस्…"}
                    rows={5}
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-800 focus:outline-none focus:border-white/[0.15] resize-none leading-relaxed"
                    style={{ fontFamily: "serif" }}
                  />
                ) : (
                  <input
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleAnalyze(); }}
                    type="url"
                    placeholder="https://archive.org/… वा YouTube URL"
                    className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 text-sm text-zinc-300 placeholder-zinc-800 focus:outline-none focus:border-white/[0.15]"
                  />
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleAnalyze}
                    disabled={!inputValue.trim()}
                    className="px-5 py-2 rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300 text-xs font-medium hover:bg-violet-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Analyze →
                  </button>
                </div>

                {/* Analysis result */}
                {analysis && (
                  <div className="space-y-3 border-t border-white/[0.04] pt-4">
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-zinc-500">
                        {analysis.inputType === "url" ? "🔗 URL" : "📄 Text"} detect
                      </span>
                      {analysis.detectedLanguage && analysis.detectedLanguage !== "unknown" && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-600">
                            {langLabels[analysis.detectedLanguage] ?? analysis.detectedLanguage}
                          </span>
                        </>
                      )}
                      {(analysis.estimatedShlokas ?? 0) > 0 && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-600">~{analysis.estimatedShlokas} shlokas</span>
                        </>
                      )}
                    </div>

                    {analysis.matchedWorkTitle && (
                      <p className="text-emerald-400 text-[11px]">
                        ✦ Match: {analysis.matchedWorkTitle}
                      </p>
                    )}

                    <div className="rounded-xl border border-violet-900/30 bg-violet-950/10 px-4 py-2.5">
                      <p className="text-violet-400 text-[10px]">→ {analysis.recommendation}</p>
                    </div>

                    <input
                      value={founderNote}
                      onChange={e => setFounderNote(e.target.value)}
                      placeholder="Note — e.g. Archive.org license verify गरेको"
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/[0.12]"
                    />

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleApproveSource}
                        disabled={savingSrc}
                        className="flex-1 py-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-emerald-300 text-sm font-medium hover:bg-emerald-950/40 transition-colors disabled:opacity-40"
                      >
                        {savingSrc ? "Saving…" : "✅ Approve — Save गर्नुहोस्"}
                      </button>
                      <button
                        onClick={() => { setAnalysis(null); setInputValue(""); setFounderNote(""); }}
                        disabled={savingSrc}
                        className="px-5 py-2.5 rounded-xl border border-zinc-800/60 text-zinc-600 text-sm hover:text-zinc-400 transition-colors disabled:opacity-40"
                      >
                        ✕ Skip
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Saved Sources ── */}
          {(loadingSrc || sources.length > 0) && (
            <div className="border-t border-white/[0.04] pt-4">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-2">
                Saved Sources{sources.length > 0 ? ` (${sources.length})` : ""}
              </p>
              {loadingSrc ? (
                <p className="text-zinc-800 text-xs animate-pulse py-2">Load गर्दैछ…</p>
              ) : (
                <div>
                  {sources.map(src => <SourceItem key={src.id} src={src} />)}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!template && !analysis && !loadingSrc && sources.length === 0 && (
            <div className="text-center py-6">
              <p className="text-zinc-700 text-[11px]">माथि text paste गर्नुहोस् — system analyze गर्छ</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
