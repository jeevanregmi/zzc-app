"use client";

// SacredWorkspacePanel — source-first workspace for a single Sacred Work.
// Founder pastes text or URL → system detects script/language, matches known
// work, suggests metadata → Approve saves to sacred_sources collection.
// Phase 1: URL + pasted text. No forms — system proposes, founder approves.

import { useState, useEffect } from "react";
import {
  collection, query, where, limit, getDocs, addDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import {
  analyzeSacredSource,
  type SacredSourceAnalysis,
  type ConfidenceLevel,
} from "../../../lib/vault/sacredSourceEngine";
import {
  TRADITION_TEXT_COLORS,
  TRADITION_LABELS,
} from "../../../lib/types/sacred-work";
import type { SpiritualTradition } from "../../../lib/types/semantic-atom";
import {
  SACRED_TEXT_TYPE_LABELS,
  SACRED_LANGUAGE_LABELS,
} from "../../../lib/types/sacred-text";

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

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredWorkspacePanel]", e?.code ?? e); return fb; });

// ── Confidence display constants ───────────────────────────────────────────────

const CONF_LABELS: Record<ConfidenceLevel, string> = {
  high:   "उच्च",
  medium: "मध्यम",
  low:    "कम",
};
const CONF_CLS: Record<ConfidenceLevel, string> = {
  high:   "text-emerald-400 border-emerald-800/60 bg-emerald-950/20",
  medium: "text-amber-400 border-amber-800/60 bg-amber-950/20",
  low:    "text-zinc-500 border-zinc-700 bg-zinc-900/40",
};

// ── Analysis card ──────────────────────────────────────────────────────────────

function AnalysisCard({ analysis }: { analysis: SacredSourceAnalysis }) {
  const { suggestedMetadata: meta } = analysis;
  const hasMeta = Object.values(meta).some(v => v !== undefined);
  const langLabels = SACRED_LANGUAGE_LABELS as Record<string, string>;
  const typeLabels = SACRED_TEXT_TYPE_LABELS as Record<string, string>;

  return (
    <div className="space-y-3">

      {/* Detection header */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-zinc-500">
          {analysis.inputType === "url" ? "🔗 URL" : "📄 Text paste"} detect भयो
        </span>
        {analysis.detectedScript === "devanagari" && (
          <><span className="text-zinc-700">·</span><span className="text-zinc-600">देवनागरी</span></>
        )}
        {analysis.detectedScript === "latin" && (
          <><span className="text-zinc-700">·</span><span className="text-zinc-600">Latin script</span></>
        )}
        {analysis.detectedScript === "mixed" && (
          <><span className="text-zinc-700">·</span><span className="text-zinc-600">Mixed script</span></>
        )}
        {analysis.detectedLanguage && analysis.detectedLanguage !== "unknown" && (
          <><span className="text-zinc-700">·</span>
          <span className="text-zinc-600">{langLabels[analysis.detectedLanguage] ?? analysis.detectedLanguage}</span></>
        )}
        {(analysis.estimatedShlokas ?? 0) > 0 && (
          <><span className="text-zinc-700">·</span>
          <span className="text-zinc-600">~{analysis.estimatedShlokas} shlokas</span></>
        )}
        {analysis.rightsAnalysis && (
          <><span className="text-zinc-700">·</span>
          <span className="text-zinc-600 capitalize">
            {analysis.rightsAnalysis.platform.replace(/_/g, " ")}
          </span></>
        )}
      </div>

      {/* Work match */}
      {analysis.matchedWorkTitle ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-emerald-400 text-base">✦</span>
          <span className="text-emerald-400 text-[11px] font-semibold">
            Match: {analysis.matchedWorkTitle}
          </span>
          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${CONF_CLS[analysis.confidence]}`}>
            {CONF_LABELS[analysis.confidence]} confidence
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 text-[10px]">Work match भएन —</span>
          <span className={`text-[10px] border rounded-full px-2 py-0.5 ${CONF_CLS[analysis.confidence]}`}>
            {CONF_LABELS[analysis.confidence]}
          </span>
        </div>
      )}

      {/* Metadata suggestions */}
      {hasMeta && (
        <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-4 py-3 space-y-2">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-1">System सुझाव</p>
          {meta.canonicalTitle && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-600 text-[10px] shrink-0">Title</span>
              <div className="text-right">
                <span className="text-zinc-200 text-[11px]">{meta.canonicalTitle}</span>
                {meta.devanagariTitle && (
                  <span className="text-zinc-500 text-[10px] ml-2" style={{ fontFamily: "serif" }}>
                    {meta.devanagariTitle}
                  </span>
                )}
              </div>
            </div>
          )}
          {meta.tradition && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Tradition</span>
              <span className="text-zinc-300 text-[10px]">{TRADITION_LABELS[meta.tradition] ?? meta.tradition}</span>
            </div>
          )}
          {meta.primaryDeity && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Deity</span>
              <span className="text-zinc-300 text-[10px]">{meta.primaryDeity}</span>
            </div>
          )}
          {meta.textType && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Type</span>
              <span className="text-zinc-300 text-[10px]">{typeLabels[meta.textType] ?? meta.textType}</span>
            </div>
          )}
          {meta.language && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Language</span>
              <span className="text-zinc-300 text-[10px]">{langLabels[meta.language] ?? meta.language}</span>
            </div>
          )}
          {meta.author && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Author</span>
              <span className="text-zinc-300 text-[10px]">{meta.author}</span>
            </div>
          )}
          {(meta.shlokaCount ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-zinc-600 text-[10px]">Shlokas</span>
              <span className="text-zinc-300 text-[10px]">~{meta.shlokaCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Rights analysis (URL mode) */}
      {analysis.rightsAnalysis && (
        <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/30 px-4 py-3 space-y-1">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-1">Rights</p>
          {analysis.rightsAnalysis.allowedItems.map((t, i) => (
            <p key={i} className="text-[10px] text-emerald-500">✅ {t}</p>
          ))}
          {analysis.rightsAnalysis.cautionItems.map((t, i) => (
            <p key={i} className="text-[10px] text-amber-500">⚠ {t}</p>
          ))}
          {analysis.rightsAnalysis.blockedItems.map((t, i) => (
            <p key={i} className="text-[10px] text-red-500">❌ {t}</p>
          ))}
        </div>
      )}

      {/* Text allowed / caution */}
      {!analysis.rightsAnalysis && (analysis.allowedItems.length + analysis.cautionItems.length > 0) && (
        <div className="space-y-1">
          {analysis.allowedItems.map((t, i) => (
            <p key={i} className="text-[10px] text-emerald-500">✅ {t}</p>
          ))}
          {analysis.cautionItems.map((t, i) => (
            <p key={i} className="text-[10px] text-amber-500">⚠ {t}</p>
          ))}
        </div>
      )}

      {/* Next actions */}
      {analysis.nextActions.length > 0 && (
        <div className="space-y-1">
          <p className="text-zinc-600 text-[10px] uppercase tracking-wide">अर्को कदम</p>
          {analysis.nextActions.map((t, i) => (
            <p key={i} className="text-sky-500 text-[10px]">→ {t}</p>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="rounded-xl border border-violet-900/30 bg-violet-950/10 px-4 py-2.5">
        <p className="text-violet-400 text-[10px]">→ {analysis.recommendation}</p>
      </div>
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
        {src.analysis.matchedWorkTitle && (
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
  const [inputMode,   setInputMode]   = useState<"text" | "url">("text");
  const [inputValue,  setInputValue]  = useState("");
  const [analysis,    setAnalysis]    = useState<SacredSourceAnalysis | null>(null);
  const [founderNote, setFounderNote] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [sources,     setSources]     = useState<SacredSourceDoc[]>([]);
  const [loadingSrc,  setLoadingSrc]  = useState(true);

  const tColor = TRADITION_TEXT_COLORS[work.tradition] ?? "text-zinc-400";

  // Load saved sources for this work on mount
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

  function handleModeSwitch(mode: "text" | "url") {
    setInputMode(mode);
    setInputValue("");
    setAnalysis(null);
  }

  function handleAnalyze() {
    const input = inputValue.trim();
    if (!input) return;
    setAnalysis(analyzeSacredSource(input));
  }

  async function handleApprove() {
    if (!analysis) return;
    setSaving(true);
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
      setSaving(false);
    }
  }

  function handleSkip() {
    setAnalysis(null);
    setInputValue("");
    setFounderNote("");
  }

  const approvedCount = sources.filter(s => s.founderStatus === "approved").length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06] flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-sm font-semibold ${tColor}`}>{work.canonicalTitle}</h3>
              {work.canonicalTitleDevanagari && (
                <span className="text-zinc-600 text-xs" style={{ fontFamily: "serif" }}>
                  {work.canonicalTitleDevanagari}
                </span>
              )}
              <span className="text-zinc-700 text-[10px]">· Workspace</span>
            </div>
            <p className="text-zinc-700 text-[10px] mt-0.5">
              PDF, URL, text, notes — जे पनि paste गर्नुहोस् → system analyze गर्छ
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {approvedCount > 0 && (
              <span className="text-[10px] border border-emerald-800/60 bg-emerald-950/20 text-emerald-400 rounded-full px-2.5 py-1">
                {approvedCount} source{approvedCount !== 1 ? "s" : ""}
              </span>
            )}
            <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">✕</button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* ── Add Anything ── */}
          <div className="space-y-3">

            {/* Mode toggle */}
            <div className="flex items-center gap-1">
              {(["text", "url"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => handleModeSwitch(mode)}
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

            {/* Input field */}
            {inputMode === "text" ? (
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder={"Sanskrit text, Nepali translation, personal notes — जे पनि paste गर्नुहोस्…\n\nउदाहरण:\nनमामि शमीशान निर्वाणरूपं\nविभुं व्यापकं ब्रह्मवेदस्वरूपम्…"}
                rows={6}
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

            {/* Analyze button */}
            <div className="flex justify-end">
              <button
                onClick={handleAnalyze}
                disabled={!inputValue.trim()}
                className="px-5 py-2 rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300 text-xs font-medium hover:bg-violet-900/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Analyze →
              </button>
            </div>
          </div>

          {/* ── Analysis result + approval ── */}
          {analysis && (
            <div className="space-y-4 border-t border-white/[0.04] pt-5">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide">Analysis</p>
              <AnalysisCard analysis={analysis} />

              <div className="space-y-3 border-t border-white/[0.04] pt-4">
                <input
                  value={founderNote}
                  onChange={e => setFounderNote(e.target.value)}
                  placeholder="Optional note — e.g. Archive.org मा license verify गरेको, Tulsidas edition"
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/[0.12]"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl border border-emerald-800/60 bg-emerald-950/20 text-emerald-300 text-sm font-medium hover:bg-emerald-950/40 transition-colors disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "✅ Approve — Save गर्नुहोस्"}
                  </button>
                  <button
                    onClick={handleSkip}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl border border-zinc-800/60 text-zinc-600 text-sm hover:text-zinc-400 transition-colors disabled:opacity-40"
                  >
                    ✕ Skip
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Saved sources list ── */}
          {(loadingSrc || sources.length > 0) && (
            <div className="border-t border-white/[0.04] pt-4">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-2">
                Saved Sources{sources.length > 0 ? ` (${sources.length})` : ""}
              </p>
              {loadingSrc ? (
                <p className="text-zinc-800 text-xs animate-pulse py-3">Load गर्दैछ…</p>
              ) : sources.length === 0 ? null : (
                <div>
                  {sources.map(src => <SourceItem key={src.id} src={src} />)}
                </div>
              )}
            </div>
          )}

          {/* Empty state when no analysis and no sources */}
          {!analysis && !loadingSrc && sources.length === 0 && (
            <div className="text-center py-4">
              <p className="text-zinc-700 text-[11px]">माथि text paste गर्नुहोस् — system analyze गर्छ</p>
              <p className="text-zinc-800 text-[10px] mt-1">
                उदाहरण: Rudrashtakam text paste गरेर Analyze थिच्नुहोस्
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
