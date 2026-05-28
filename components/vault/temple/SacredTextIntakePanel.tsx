"use client";

// Sacred Text Intake — Phase 1 of the Living Spiritual Intelligence Graph.
//
// Pipeline: SacredText → ShlokaAtom (Phase 2) → Character enrichment (Phase 3)
//           → Founder review → Bhakti Chautari (Phase 5)
//
// Everything starts here: authentic text first, no AI generation without source.

import { useState, useEffect } from "react";
import type {
  SacredText, SacredTextType, SacredLanguage, AuthorType,
} from "../../../lib/types/sacred-text";
import {
  SACRED_TEXT_TYPE_LABELS, SACRED_TEXT_TYPE_ICONS,
  SACRED_LANGUAGE_LABELS, AUTHOR_TYPE_LABELS, SACRED_TEXT_STATUS_LABELS,
} from "../../../lib/types/sacred-text";
import type { SpiritualTradition } from "../../../lib/types/semantic-atom";
import type { TempleVisibility, SpiritualCharacter } from "../../../lib/types/temple-vault";
import {
  addSacredText, updateSacredText, deleteSacredText, getSacredTexts,
  getSpiritualCharacters,
} from "../../../lib/vault/firestore";

type TextDoc = SacredText & { id: string };
type CharDoc = SpiritualCharacter & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredTextIntake]", e?.code ?? e); return fb; });

// ── Constants ──────────────────────────────────────────────────────────────────

const TRADITIONS: Array<{ value: SpiritualTradition; label: string }> = [
  { value: "shaiva",          label: "शैव" },
  { value: "vaishnava",       label: "वैष्णव" },
  { value: "shakta",          label: "शाक्त" },
  { value: "advaita_vedanta", label: "अद्वैत वेदान्त" },
  { value: "buddhist",        label: "बौद्ध" },
  { value: "vedic",           label: "वैदिक" },
  { value: "upanishadic",     label: "औपनिषदिक" },
  { value: "bhakti",          label: "भक्ति" },
  { value: "ganapatya",       label: "गाणपत्य" },
  { value: "general",         label: "सामान्य" },
];

const TEXT_TYPES  = Object.keys(SACRED_TEXT_TYPE_LABELS) as SacredTextType[];
const LANGUAGES   = Object.keys(SACRED_LANGUAGE_LABELS)  as SacredLanguage[];
const AUTHOR_TYPES = Object.keys(AUTHOR_TYPE_LABELS)     as AuthorType[];

const STATUS_ORDER = [
  "raw", "atoms_extracted", "character_updated", "review_ready", "published",
] as const;

const TRADITION_COLORS: Record<string, string> = {
  shaiva:          "text-sky-400 border-sky-800/60 bg-sky-950/30",
  shakta:          "text-rose-400 border-rose-800/60 bg-rose-950/30",
  vaishnava:       "text-amber-400 border-amber-800/60 bg-amber-950/30",
  advaita_vedanta: "text-violet-400 border-violet-800/60 bg-violet-950/30",
  buddhist:        "text-stone-400 border-stone-700/60 bg-stone-900/30",
  vedic:           "text-yellow-400 border-yellow-800/60 bg-yellow-950/30",
  upanishadic:     "text-indigo-400 border-indigo-800/60 bg-indigo-950/30",
  bhakti:          "text-pink-400 border-pink-800/60 bg-pink-950/30",
  ganapatya:       "text-orange-400 border-orange-800/60 bg-orange-950/30",
  general:         "text-zinc-400 border-zinc-700/60 bg-zinc-900/30",
};

const TRADITION_DOT: Record<string, string> = {
  shaiva:          "bg-sky-500",
  shakta:          "bg-rose-500",
  vaishnava:       "bg-amber-500",
  advaita_vedanta: "bg-violet-500",
  buddhist:        "bg-stone-500",
  vedic:           "bg-yellow-500",
  upanishadic:     "bg-indigo-500",
  bhakti:          "bg-pink-500",
  ganapatya:       "bg-orange-500",
  general:         "bg-zinc-500",
};

// ── Form state ─────────────────────────────────────────────────────────────────

function defaultForm() {
  return {
    titleNepali:        "",
    titleSanskrit:      "",
    textType:           "stotra"   as SacredTextType,
    tradition:          "shaiva"   as SpiritualTradition,
    primaryLanguage:    "sanskrit" as SacredLanguage,
    authorName:         "",
    authorType:         "unknown"  as AuthorType,
    scriptureRef:       "",
    originalText:       "",
    primaryCharacterId: "",
    founderNote:        "",
    publicDomain:       true,
    licenseNote:        "",
  };
}
type FormState = ReturnType<typeof defaultForm>;

// ── Add / Edit form overlay ────────────────────────────────────────────────────

function TextForm({
  initialValues,
  characters,
  editing,
  onSave,
  onClose,
}: {
  initialValues: Partial<FormState>;
  characters:    CharDoc[];
  editing:       boolean;
  onSave:        (data: FormState) => Promise<void>;
  onClose:       () => void;
}) {
  const [form,   setForm]   = useState<FormState>({ ...defaultForm(), ...initialValues });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleNepali.trim() || !form.originalText.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-2xl bg-[#09091a] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.06]">
          <h3 className="text-sm font-medium text-zinc-300">
            {editing ? "ग्रन्थ सम्पादन" : "नयाँ ग्रन्थ Upload"}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="text-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Title */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">शीर्षक *</label>
                <input
                  value={form.titleNepali}
                  onChange={e => set("titleNepali", e.target.value)}
                  placeholder="जस्तै: रुद्राष्टकम्"
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">संस्कृत शीर्षक</label>
                <input
                  value={form.titleSanskrit}
                  onChange={e => set("titleSanskrit", e.target.value)}
                  placeholder="Devanagari / IAST"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
                />
              </div>
            </div>

            {/* Type + Tradition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">ग्रन्थ प्रकार</label>
                <select
                  value={form.textType}
                  onChange={e => set("textType", e.target.value as SacredTextType)}
                  className="w-full bg-[#0d0d20] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-white/15 transition-colors"
                >
                  {TEXT_TYPES.map(t => (
                    <option key={t} value={t}>
                      {SACRED_TEXT_TYPE_ICONS[t]} {SACRED_TEXT_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">परम्परा</label>
                <select
                  value={form.tradition}
                  onChange={e => set("tradition", e.target.value as SpiritualTradition)}
                  className="w-full bg-[#0d0d20] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-white/15 transition-colors"
                >
                  {TRADITIONS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Language pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-widest">मूल भाषा</label>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => set("primaryLanguage", lang)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-300 ${
                      form.primaryLanguage === lang
                        ? "bg-white/[0.08] border-white/20 text-zinc-200"
                        : "border-white/[0.06] text-zinc-700 hover:text-zinc-500"
                    }`}
                  >
                    {SACRED_LANGUAGE_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>

            {/* Author */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">रचयिता</label>
                <input
                  value={form.authorName}
                  onChange={e => set("authorName", e.target.value)}
                  placeholder="जस्तै: आदि शंकराचार्य"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">रचयिता प्रकार</label>
                <select
                  value={form.authorType}
                  onChange={e => set("authorType", e.target.value as AuthorType)}
                  className="w-full bg-[#0d0d20] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-white/15 transition-colors"
                >
                  {AUTHOR_TYPES.map(t => (
                    <option key={t} value={t}>{AUTHOR_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Scripture ref */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-widest">शास्त्र स्रोत</label>
              <input
                value={form.scriptureRef}
                onChange={e => set("scriptureRef", e.target.value)}
                placeholder="जस्तै: Shiva Purana, Rudra Samhita"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
              />
            </div>

            {/* Primary character — shown only if characters have been seeded */}
            {characters.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-zinc-600 uppercase tracking-widest">
                  मुख्य देवता / चरित्र
                </label>
                <select
                  value={form.primaryCharacterId}
                  onChange={e => set("primaryCharacterId", e.target.value)}
                  className="w-full bg-[#0d0d20] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-white/15 transition-colors"
                >
                  <option value="">— कुनै नभए —</option>
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.primaryName?.nepali ?? c.primaryName?.sanskrit ?? c.id}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Original text */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-widest">
                मूल पाठ * — जसरी छ त्यसरी नै टाँस्नुहोस्
              </label>
              <textarea
                value={form.originalText}
                onChange={e => set("originalText", e.target.value)}
                placeholder={"नमामीशमीशान निर्वाणरूपम्\nविभुं व्यापकं ब्रह्मवेदस्वरूपम्\nनिजं निर्गुणं निर्विकल्पं निरीहम्…"}
                rows={9}
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-y leading-[2] transition-colors"
                style={{ fontFamily: "serif" }}
              />
            </div>

            {/* Founder note */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-600 uppercase tracking-widest">
                Founder Note (निजी)
              </label>
              <textarea
                value={form.founderNote}
                onChange={e => set("founderNote", e.target.value)}
                placeholder="किन यो ग्रन्थ महत्वपूर्ण छ, के note गर्न चाहान्छु…"
                rows={3}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-none leading-[1.8] transition-colors"
              />
            </div>

            {/* Public domain toggle */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-zinc-400 text-xs">Public Domain</p>
                <p className="text-zinc-700 text-[10px] mt-0.5">यो पाठ copyright-free छ?</p>
              </div>
              <button
                type="button"
                onClick={() => set("publicDomain", !form.publicDomain)}
                className={`relative w-10 h-5 rounded-full transition-all duration-300 ${
                  form.publicDomain ? "bg-green-800" : "bg-zinc-800"
                }`}
                aria-label="Toggle public domain"
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white/80 transition-all duration-300 ${
                  form.publicDomain ? "left-5" : "left-0.5"
                }`} />
              </button>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
          >
            रद्द
          </button>
          <button
            form="text-form"
            type="submit"
            disabled={saving || !form.titleNepali.trim() || !form.originalText.trim()}
            className="flex-1 py-3 rounded-xl border border-indigo-900/50 bg-indigo-950/30 text-indigo-300 text-sm font-medium disabled:opacity-30 hover:bg-indigo-950/50 transition-all"
          >
            {saving ? "…" : "सुरक्षित"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Text detail panel ──────────────────────────────────────────────────────────

function TextDetail({
  text,
  characters,
  onEdit,
  onDelete,
}: {
  text:       TextDoc;
  characters: CharDoc[];
  onEdit:     () => void;
  onDelete:   () => void;
}) {
  const tradColor   = TRADITION_COLORS[text.tradition] ?? TRADITION_COLORS.general;
  const tradLabel   = TRADITIONS.find(t => t.value === text.tradition)?.label ?? text.tradition;
  const statusIdx   = STATUS_ORDER.indexOf(text.processingStatus as typeof STATUS_ORDER[number]);
  const primaryChar = characters.find(c => c.id === text.primaryCharacterId);

  return (
    <div className="space-y-5 pb-12">

      {/* Hero */}
      <div className="flex items-start gap-4">
        <span className="text-4xl mt-0.5 select-none" aria-hidden>
          {SACRED_TEXT_TYPE_ICONS[text.textType]}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-zinc-200 leading-snug">
            {text.title?.nepali ?? text.title?.sanskrit ?? "—"}
          </h2>
          {text.title?.sanskrit && text.title.sanskrit !== text.title.nepali && (
            <p className="text-zinc-600 text-xs mt-0.5">{text.title.sanskrit}</p>
          )}
          <div className="flex items-center flex-wrap gap-1.5 mt-2">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${tradColor}`}>
              {tradLabel}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-zinc-800 bg-zinc-900/40 text-zinc-400">
              {SACRED_TEXT_TYPE_LABELS[text.textType]}
            </span>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full border border-white/[0.05] text-zinc-600">
              {SACRED_LANGUAGE_LABELS[text.primaryLanguage]}
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline status bar */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 space-y-2">
        <p className="text-[10px] text-zinc-700 uppercase tracking-widest">Pipeline स्थिति</p>
        <div className="flex gap-1">
          {STATUS_ORDER.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= statusIdx ? "bg-indigo-700" : "bg-white/[0.05]"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between">
          {STATUS_ORDER.map((s, i) => (
            <span
              key={s}
              className={`text-[9px] ${i === statusIdx ? "text-indigo-400" : "text-zinc-800"}`}
            >
              {SACRED_TEXT_STATUS_LABELS[s]}
            </span>
          ))}
        </div>
      </div>

      {/* Attribution */}
      {(text.authorName || text.scriptureRef) && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-1">रचयिता / स्रोत</p>
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 space-y-1">
            {text.authorName && (
              <div className="flex items-baseline gap-2">
                <span className="text-zinc-300 text-sm">{text.authorName}</span>
                {text.authorType && text.authorType !== "unknown" && (
                  <span className="text-zinc-700 text-[10px]">
                    {AUTHOR_TYPE_LABELS[text.authorType]}
                  </span>
                )}
              </div>
            )}
            {text.scriptureRef && (
              <p className="text-zinc-500 text-xs">{text.scriptureRef}</p>
            )}
            {text.publicDomain && (
              <p className="text-zinc-700 text-[10px]">Public Domain</p>
            )}
          </div>
        </div>
      )}

      {/* Primary character link */}
      {primaryChar && (
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-2.5">
          <span className="text-xl">{primaryChar.icon}</span>
          <div>
            <p className="text-zinc-400 text-xs">
              {primaryChar.primaryName?.nepali ?? primaryChar.primaryName?.sanskrit}
            </p>
            <p className="text-zinc-700 text-[10px]">
              Character Graph — Phase 3 मा यो ग्रन्थबाट update हुनेछ
            </p>
          </div>
        </div>
      )}

      {/* Founder note */}
      {text.founderNote && (
        <div className="space-y-1">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-1">Founder Note</p>
          <p className="text-zinc-500 text-xs leading-relaxed pl-3 border-l border-white/[0.05]">
            {text.founderNote}
          </p>
        </div>
      )}

      {/* Original text */}
      <div className="space-y-2">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-1">मूल पाठ</p>
        <div className="rounded-2xl border border-white/[0.05] bg-[#060612] px-5 py-5">
          <p
            className="text-zinc-200 text-sm leading-[2.3] whitespace-pre-wrap font-light"
            style={{ fontFamily: "serif" }}
          >
            {text.originalText}
          </p>
        </div>
      </div>

      {/* Phase 2 placeholder */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 space-y-1">
        <p className="text-zinc-700 text-[10px] uppercase tracking-widest">
          Phase 2 — Shloka Atoms
        </p>
        <p className="text-zinc-800 text-[10px] leading-relaxed">
          यो पाठबाट श्लोक atoms extract + Sanskrit terms capture हुनेछन्।
          प्रत्येक atom Character Intelligence Graph लाई समृद्ध गर्नेछ।
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onEdit}
          className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-500 text-xs hover:text-zinc-300 transition-colors"
        >
          सम्पादन
        </button>
        <button
          onClick={onDelete}
          className="px-5 py-2.5 rounded-xl border border-white/[0.04] text-zinc-800 text-xs hover:text-zinc-600 hover:border-zinc-700 transition-colors"
        >
          मेट्नुहोस्
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function SacredTextIntakePanel({ ownerId }: { ownerId: string }) {
  const [texts,       setTexts]       = useState<TextDoc[]>([]);
  const [characters,  setCharacters]  = useState<CharDoc[]>([]);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingText, setEditingText] = useState<TextDoc | null>(null);

  async function loadAll() {
    setLoading(true);
    const [txts, chars] = await Promise.all([
      safe(getSacredTexts(ownerId), []),
      safe(getSpiritualCharacters(ownerId), []),
    ]);
    setTexts(txts);
    setCharacters(chars);
    if (txts.length > 0 && !selectedId) setSelectedId(txts[0].id);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [ownerId]);

  async function handleSave(form: FormState) {
    const payload: Omit<SacredText, "id" | "createdAt" | "updatedAt"> = {
      ownerId,
      title: {
        nepali:   form.titleNepali.trim(),
        sanskrit: form.titleSanskrit.trim() || undefined,
      },
      textType:           form.textType,
      tradition:          form.tradition,
      primaryLanguage:    form.primaryLanguage,
      authorName:         form.authorName.trim()  || undefined,
      authorType:         form.authorType !== "unknown" ? form.authorType : undefined,
      scriptureRef:       form.scriptureRef.trim() || undefined,
      originalText:       form.originalText.trim(),
      primaryCharacterId: form.primaryCharacterId || undefined,
      founderNote:        form.founderNote.trim()  || undefined,
      publicDomain:       form.publicDomain,
      licenseNote:        form.licenseNote.trim()  || undefined,
      processingStatus:   "raw",
      visibility:         "private" as TempleVisibility,
    };

    if (editingText) {
      await updateSacredText(editingText.id, payload);
    } else {
      const newId = await addSacredText(payload);
      setSelectedId(newId);
    }

    setShowForm(false);
    setEditingText(null);
    void loadAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("यो ग्रन्थ मेट्ने? यो कार्य पूर्ववत् हुँदैन।")) return;
    await safe(deleteSacredText(id), undefined);
    setTexts(prev => prev.filter(t => t.id !== id));
    if (selectedId === id) {
      setSelectedId(texts.find(t => t.id !== id)?.id ?? null);
    }
  }

  function openEdit(text: TextDoc) {
    setEditingText(text);
    setShowForm(true);
  }

  const selected = texts.find(t => t.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-50 animate-pulse" />
      </div>
    );
  }

  if (texts.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 text-center px-6 space-y-5">
          <span className="text-4xl opacity-20 select-none" aria-hidden>📿</span>
          <div className="space-y-1.5">
            <p className="text-zinc-300 text-sm font-medium">ग्रन्थ संग्रह रिक्त छ</p>
            <p className="text-zinc-600 text-xs leading-[1.9] max-w-xs mx-auto">
              रुद्राष्टकम्, निर्वाण षट्कम्, वा कुनै पनि भजन / स्तोत्र upload गरेर सुरु गर्नुहोस्।
              प्रत्येक ग्रन्थले Character Intelligence Graph लाई समृद्ध गर्दछ।
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="text-xs px-6 py-3 rounded-full border border-indigo-800/60 bg-indigo-950/30 text-indigo-300 opacity-80 hover:opacity-100 transition-all duration-500"
          >
            + नयाँ ग्रन्थ थप्नुहोस्
          </button>

          <div className="pt-4 space-y-1 max-w-xs mx-auto">
            <p className="text-zinc-800 text-[10px] uppercase tracking-widest">पहिलो ३ ग्रन्थहरू</p>
            {["🙏 रुद्राष्टकम् (शैव स्तोत्र — आदि शंकराचार्य)", "📿 निर्वाण षट्कम् (अद्वैत — आदि शंकराचार्य)", "🎵 कुनै शिव भजन वा आरती"].map(t => (
              <p key={t} className="text-zinc-800 text-[10px]">◦ {t}</p>
            ))}
          </div>
        </div>

        {showForm && (
          <TextForm
            initialValues={{}}
            characters={characters}
            editing={false}
            onSave={handleSave}
            onClose={() => setShowForm(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex gap-0 min-h-0">

        {/* Left sidebar */}
        <div className="w-16 sm:w-20 shrink-0 flex flex-col gap-1 pt-1 border-r border-white/[0.04] pr-2 overflow-y-auto max-h-[calc(100vh-230px)]">
          <button
            onClick={() => { setEditingText(null); setShowForm(true); }}
            className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.12] text-zinc-700 hover:text-zinc-400 transition-all duration-300 mb-1"
            title="नयाँ ग्रन्थ"
          >
            <span className="text-base leading-none">+</span>
            <span className="text-[8px] text-zinc-800">नयाँ</span>
          </button>

          {texts.map(t => {
            const active   = t.id === selectedId;
            const dotColor = TRADITION_DOT[t.tradition] ?? "bg-zinc-500";
            return (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-300 ${
                  active
                    ? "bg-white/[0.06] border border-white/[0.1]"
                    : "hover:bg-white/[0.03] border border-transparent"
                }`}
                title={t.title?.nepali ?? ""}
              >
                <span className="text-xl leading-none">
                  {SACRED_TEXT_TYPE_ICONS[t.textType]}
                </span>
                <span className={`text-[9px] leading-tight text-center max-w-[52px] break-words ${
                  active ? "text-zinc-300" : "text-zinc-600"
                }`}>
                  {(t.title?.nepali ?? t.title?.sanskrit ?? "").slice(0, 6)}
                </span>
                <span className={`w-1 h-1 rounded-full ${dotColor} opacity-50`} />
              </button>
            );
          })}
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 overflow-y-auto max-h-[calc(100vh-230px)] pl-4 pr-1">
          {selected ? (
            <TextDetail
              text={selected}
              characters={characters}
              onEdit={() => openEdit(selected)}
              onDelete={() => { void handleDelete(selected.id); }}
            />
          ) : (
            <div className="flex items-center justify-center h-40 text-zinc-700 text-xs">
              बायाँबाट एउटा ग्रन्थ छान्नुहोस्
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <TextForm
          initialValues={editingText ? {
            titleNepali:        editingText.title?.nepali    ?? "",
            titleSanskrit:      editingText.title?.sanskrit  ?? "",
            textType:           editingText.textType,
            tradition:          editingText.tradition,
            primaryLanguage:    editingText.primaryLanguage,
            authorName:         editingText.authorName       ?? "",
            authorType:         editingText.authorType       ?? "unknown",
            scriptureRef:       editingText.scriptureRef     ?? "",
            originalText:       editingText.originalText,
            primaryCharacterId: editingText.primaryCharacterId ?? "",
            founderNote:        editingText.founderNote      ?? "",
            publicDomain:       editingText.publicDomain,
            licenseNote:        editingText.licenseNote      ?? "",
          } : {}}
          characters={characters}
          editing={!!editingText}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingText(null); }}
        />
      )}
    </>
  );
}
