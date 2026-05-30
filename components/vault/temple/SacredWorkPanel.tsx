"use client";

// Sacred Work Panel — canonical work registry for the Sacred Intelligence Studio.
//
// A SacredWork is the top-level node: Rudrashtakam, Nirvana Shatakam, etc.
// Multiple language versions (Sanskrit + Nepali + Hindi + English) + audio tracks
// all link to ONE canonical SacredWork — no disconnected duplicates.
//
// Pipeline: SacredWork → Link SacredTexts → Add AudioAssets → Extract atoms
//           → SacredAlignment (line-by-line) → Bhakti Chautari publish

import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, limit, getDocs,
  addDoc, updateDoc, doc, deleteDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import type {
  SacredWork, LicenseStatus,
} from "../../../lib/types/sacred-work";
import {
  LICENSE_LABELS, LICENSE_COLORS,
  TRADITION_TEXT_COLORS, TRADITION_DOT_COLORS, TRADITION_LABELS,
} from "../../../lib/types/sacred-work";
import type { SpiritualTradition } from "../../../lib/types/semantic-atom";
import type { SacredTextType, SacredLanguage } from "../../../lib/types/sacred-text";
import { SACRED_TEXT_TYPE_LABELS, SACRED_LANGUAGE_LABELS } from "../../../lib/types/sacred-text";

type WorkDoc = SacredWork & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredWorkPanel]", e?.code ?? e); return fb; });

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

const LICENSE_OPTIONS: LicenseStatus[] = [
  "public_domain", "open_license", "unknown", "restricted",
];

const TEXT_TYPES = Object.keys(SACRED_TEXT_TYPE_LABELS) as SacredTextType[];
const LANGUAGES  = Object.keys(SACRED_LANGUAGE_LABELS)  as SacredLanguage[];

// ── Known sacred works seed — quick-add for founder ──────────────────────────

const KNOWN_WORKS = [
  { canonicalTitle: "Rudrashtakam",         tradition: "shaiva",          primaryDeity: "Shiva",       textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Nirvana Shatakam",     tradition: "advaita_vedanta", primaryDeity: "Shiva",       textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Achyutashtakam",       tradition: "vaishnava",       primaryDeity: "Vishnu",      textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Ganesha Pancharatnam", tradition: "ganapatya",       primaryDeity: "Ganesha",     textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Gauri Dashakam",       tradition: "shakta",          primaryDeity: "Devi",        textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Shiva Tandava Stotram",tradition: "shaiva",          primaryDeity: "Shiva",       textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Bhaja Govindam",       tradition: "advaita_vedanta", primaryDeity: "Krishna",     textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Hanuman Chalisa",      tradition: "vaishnava",       primaryDeity: "Hanuman",     textType: "stotra",   languageOriginal: "hindi"   as SacredLanguage },
  { canonicalTitle: "Mahamrityunjaya Mantra",tradition:"shaiva",          primaryDeity: "Shiva",       textType: "mantra_set",languageOriginal: "sanskrit" as SacredLanguage },
  { canonicalTitle: "Lalitha Sahasranama",  tradition: "shakta",          primaryDeity: "Devi",        textType: "stotra",   languageOriginal: "sanskrit" as SacredLanguage },
];

// ── Work form modal ────────────────────────────────────────────────────────────

interface WorkFormProps {
  editing: WorkDoc | null;
  ownerId: string;
  onSave: (data: Omit<SacredWork, "id" | "ownerId" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
  seed?: typeof KNOWN_WORKS[0];
}

function WorkForm({ editing, ownerId, onSave, onClose, seed }: WorkFormProps) {
  const [canonicalTitle,        setCanonicalTitle]        = useState(editing?.canonicalTitle ?? seed?.canonicalTitle ?? "");
  const [canonicalTitleDev,     setCanonicalTitleDev]     = useState(editing?.canonicalTitleDevanagari ?? "");
  const [alternateTitles,       setAlternateTitles]       = useState((editing?.alternateTitles ?? []).join(", "));
  const [tradition,             setTradition]             = useState<SpiritualTradition>(editing?.tradition ?? seed?.tradition as SpiritualTradition ?? "general");
  const [textType,              setTextType]              = useState<SacredTextType>(editing?.textType ?? seed?.textType as SacredTextType ?? "stotra");
  const [author,                setAuthor]                = useState(editing?.author ?? "");
  const [attributedAuthor,      setAttributedAuthor]      = useState(editing?.attributedAuthor ?? "");
  const [languageOriginal,      setLanguageOriginal]      = useState<SacredLanguage>(editing?.languageOriginal ?? seed?.languageOriginal ?? "sanskrit");
  const [primaryDeity,          setPrimaryDeity]          = useState(editing?.primaryDeity ?? seed?.primaryDeity ?? "");
  const [sourceRefs,            setSourceRefs]            = useState((editing?.sourceRefs ?? []).join(", "));
  const [licenseStatus,         setLicenseStatus]         = useState<LicenseStatus>(editing?.licenseStatus ?? "unknown");
  const [publicDomainStatus,    setPublicDomainStatus]    = useState(editing?.publicDomainStatus ?? false);
  const [founderNotes,          setFounderNotes]          = useState(editing?.founderNotes ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canonicalTitle.trim()) return;
    setSaving(true);
    try {
      await onSave({
        canonicalTitle:          canonicalTitle.trim(),
        canonicalTitleDevanagari: canonicalTitleDev.trim() || undefined,
        alternateTitles:          alternateTitles.split(",").map(s => s.trim()).filter(Boolean),
        tradition,
        textType,
        author:                   author.trim() || undefined,
        attributedAuthor:         attributedAuthor.trim() || undefined,
        languageOriginal,
        primaryDeity:             primaryDeity.trim() || undefined,
        sourceRefs:               sourceRefs.split(",").map(s => s.trim()).filter(Boolean),
        licenseStatus,
        publicDomainStatus,
        licenseNotes:             undefined,
        relatedTextIds:           editing?.relatedTextIds   ?? [],
        audioAssetIds:            editing?.audioAssetIds    ?? [],
        imageRefs:                editing?.imageRefs        ?? [],
        videoRefs:                editing?.videoRefs        ?? [],
        alignmentIds:             editing?.alignmentIds     ?? [],
        atomIds:                  editing?.atomIds          ?? [],
        hasLanguage: {
          sanskrit: languageOriginal === "sanskrit" ? true : undefined,
          nepali:   languageOriginal === "nepali"   ? true : undefined,
          hindi:    languageOriginal === "hindi"    ? true : undefined,
          english:  languageOriginal === "english"  ? true : undefined,
        },
        hasAudio:                 false,
        founderNotes:             founderNotes.trim() || undefined,
        publicReady:              false,
        visibility:               "private",
      });
    } finally {
      setSaving(false);
    }
  }

  const tColor = TRADITION_TEXT_COLORS[tradition] ?? "text-zinc-400";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className={`text-sm font-semibold ${tColor}`}>
            {editing ? "Sacred Work सम्पादन" : "नयाँ Sacred Work दर्ता"}
          </h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="work-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Canonical title */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Canonical Title *</label>
              <input
                value={canonicalTitle}
                onChange={e => setCanonicalTitle(e.target.value)}
                placeholder="Rudrashtakam"
                required
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            {/* Devanagari title */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Devanagari शीर्षक</label>
              <input
                value={canonicalTitleDev}
                onChange={e => setCanonicalTitleDev(e.target.value)}
                placeholder="रुद्राष्टकम्"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                style={{ fontFamily: "serif" }}
              />
            </div>

            {/* Alternate titles */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Alternate Titles (अल्पविरामले छुट्याउनुहोस्)</label>
              <input
                value={alternateTitles}
                onChange={e => setAlternateTitles(e.target.value)}
                placeholder="Rudra Ashtakam, रुद्राष्टकम्"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            {/* Tradition */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">परम्परा</label>
              <div className="flex flex-wrap gap-1.5">
                {TRADITIONS.map(t => (
                  <button key={t.value} type="button" onClick={() => setTradition(t.value)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      tradition === t.value
                        ? `bg-white/[0.08] border-white/20 ${TRADITION_TEXT_COLORS[t.value] ?? "text-zinc-300"}`
                        : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text type + Original language */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Text Type</label>
                <select
                  value={textType}
                  onChange={e => setTextType(e.target.value as SacredTextType)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
                >
                  {TEXT_TYPES.map(t => (
                    <option key={t} value={t} className="bg-zinc-900">{SACRED_TEXT_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">मूल भाषा</label>
                <select
                  value={languageOriginal}
                  onChange={e => setLanguageOriginal(e.target.value as SacredLanguage)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-white/15"
                >
                  {LANGUAGES.map(l => (
                    <option key={l} value={l} className="bg-zinc-900">{SACRED_LANGUAGE_LABELS[l]}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Primary deity */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">प्राथमिक देवता / Character</label>
              <input
                value={primaryDeity}
                onChange={e => setPrimaryDeity(e.target.value)}
                placeholder="Shiva, Vishnu, Devi, Ganesha…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-300 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            {/* Author */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">रचयिता</label>
                <input
                  value={author}
                  onChange={e => setAuthor(e.target.value)}
                  placeholder="Goswami Tulsidas"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">परम्परागत श्रेय</label>
                <input
                  value={attributedAuthor}
                  onChange={e => setAttributedAuthor(e.target.value)}
                  placeholder="attributed to Pushpadanta"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
            </div>

            {/* Source refs */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">स्रोत सन्दर्भ (अल्पविरामले छुट्याउनुहोस्)</label>
              <input
                value={sourceRefs}
                onChange={e => setSourceRefs(e.target.value)}
                placeholder="Ramcharitmanas - Bala Kanda, Internet Archive"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            {/* License */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">License Status</label>
              <div className="flex flex-wrap gap-1.5">
                {LICENSE_OPTIONS.map(l => (
                  <button key={l} type="button" onClick={() => setLicenseStatus(l)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      licenseStatus === l ? LICENSE_COLORS[l] : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {LICENSE_LABELS[l]}
                  </button>
                ))}
              </div>
              {licenseStatus === "unknown" && (
                <p className="text-[10px] text-amber-600">
                  ⚠ Unknown license = private study only. Bhakti Chautari मा publish गर्नु भन्दा पहिले verify गर्नुहोस्।
                </p>
              )}
            </div>

            {/* Public domain checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={publicDomainStatus}
                onChange={e => setPublicDomainStatus(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-500"
              />
              <span className="text-xs text-zinc-400">Public domain verified (pre-1925 वा explicit dedication)</span>
            </label>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Founder Notes</label>
              <textarea
                value={founderNotes}
                onChange={e => setFounderNotes(e.target.value)}
                placeholder="यो work बारे personal notes…"
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
          >
            रद्द
          </button>
          <button form="work-form" type="submit" disabled={saving || !canonicalTitle.trim()}
            className={`flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium transition-all disabled:opacity-30 ${tColor}`}
          >
            {saving ? "…" : editing ? "अपडेट" : "दर्ता गर्नुहोस्"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Work card ──────────────────────────────────────────────────────────────────

function WorkCard({
  work,
  onEdit,
  onDelete,
}: {
  work: WorkDoc;
  onEdit: (w: WorkDoc) => void;
  onDelete: (id: string) => void;
}) {
  const tColor   = TRADITION_TEXT_COLORS[work.tradition] ?? "text-zinc-400";
  const tDot     = TRADITION_DOT_COLORS[work.tradition]  ?? "bg-zinc-500";
  const tLabel   = TRADITION_LABELS[work.tradition]      ?? work.tradition;
  const licCls   = LICENSE_COLORS[work.licenseStatus];

  const langFlags = [
    work.hasLanguage.sanskrit && "𝑆",
    work.hasLanguage.nepali   && "न",
    work.hasLanguage.hindi    && "ह",
    work.hasLanguage.english  && "E",
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 space-y-3 transition-all hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${tColor}`}>{work.canonicalTitle}</span>
            {work.canonicalTitleDevanagari && (
              <span className="text-zinc-600 text-xs" style={{ fontFamily: "serif" }}>
                {work.canonicalTitleDevanagari}
              </span>
            )}
          </div>
          {work.primaryDeity && (
            <p className="text-zinc-600 text-[11px] mt-0.5">{work.primaryDeity}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onEdit(work)} className="text-zinc-700 hover:text-zinc-400 text-[11px] transition-colors">
            सम्पादन
          </button>
          <button onClick={() => onDelete(work.id)} className="text-zinc-800 hover:text-zinc-500 text-[11px] transition-colors">
            ✕
          </button>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-[10px]">
          <span className={`w-1.5 h-1.5 rounded-full ${tDot}`} />
          <span className="text-zinc-500">{tLabel}</span>
        </span>
        <span className={`text-[10px] border rounded-full px-2 py-0.5 ${licCls}`}>
          {LICENSE_LABELS[work.licenseStatus]}
        </span>
        {work.publicDomainStatus && (
          <span className="text-[10px] border border-emerald-800/50 bg-emerald-950/20 text-emerald-400 rounded-full px-2 py-0.5">
            PD verified
          </span>
        )}
        {langFlags.length > 0 && (
          <span className="text-[10px] text-zinc-600 border border-zinc-800/50 rounded-full px-2 py-0.5">
            {langFlags.join(" · ")}
          </span>
        )}
      </div>

      {/* Linked content counts */}
      <div className="flex items-center gap-4 text-[10px]">
        <span className={work.relatedTextIds.length > 0 ? "text-sky-400" : "text-zinc-700"}>
          📄 {work.relatedTextIds.length} text{work.relatedTextIds.length !== 1 ? "s" : ""}
        </span>
        <span className={work.audioAssetIds.length > 0 ? "text-amber-400" : "text-zinc-700"}>
          🎵 {work.audioAssetIds.length} audio
        </span>
        <span className={work.atomIds.length > 0 ? "text-violet-400" : "text-zinc-700"}>
          ⚛ {work.atomIds.length} atom{work.atomIds.length !== 1 ? "s" : ""}
        </span>
        {work.publicReady && (
          <span className="text-emerald-400 ml-auto">✓ Public ready</span>
        )}
      </div>

      {work.founderNotes && (
        <p className="text-zinc-700 text-[10px] leading-relaxed italic">{work.founderNotes}</p>
      )}
    </div>
  );
}

// ── Quick-add seed row ─────────────────────────────────────────────────────────

function SeedRow({
  seed,
  existing,
  onAdd,
}: {
  seed: typeof KNOWN_WORKS[0];
  existing: boolean;
  onAdd: (seed: typeof KNOWN_WORKS[0]) => void;
}) {
  const tColor = TRADITION_TEXT_COLORS[seed.tradition as SpiritualTradition] ?? "text-zinc-400";
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/[0.025] group">
      <span className={`text-xs ${existing ? "text-zinc-600 line-through" : tColor}`}>
        {seed.canonicalTitle}
      </span>
      {!existing && (
        <button
          onClick={() => onAdd(seed)}
          className="text-[10px] text-zinc-700 group-hover:text-zinc-400 transition-colors"
        >
          + दर्ता
        </button>
      )}
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function SacredWorkPanel({ ownerId }: { ownerId: string }) {
  const [works,       setWorks]       = useState<WorkDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingWork, setEditingWork] = useState<WorkDoc | null>(null);
  const [seedForm,    setSeedForm]    = useState<typeof KNOWN_WORKS[0] | null>(null);
  const [filterTrad,  setFilterTrad]  = useState<SpiritualTradition | "all">("all");
  const [search,      setSearch]      = useState("");

  async function loadWorks() {
    setLoading(true);
    const snap = await safe(
      getDocs(query(
        collection(db, "sacred_works"),
        where("ownerId", "==", ownerId),
        limit(200),
      )),
      null,
    );
    if (snap) {
      setWorks(snap.docs.map(d => ({ id: d.id, ...d.data() } as WorkDoc)));
    }
    setLoading(false);
  }

  useEffect(() => { void loadWorks(); }, [ownerId]);

  async function handleSave(data: Omit<SacredWork, "id" | "ownerId" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    if (editingWork) {
      await updateDoc(doc(db, "sacred_works", editingWork.id), { ...data, updatedAt: now });
    } else {
      await addDoc(collection(db, "sacred_works"), {
        ...data,
        ownerId,
        createdAt: now,
        updatedAt: now,
      });
    }
    setShowForm(false);
    setEditingWork(null);
    setSeedForm(null);
    void loadWorks();
  }

  async function handleDelete(id: string) {
    if (!confirm("यो Sacred Work हटाउने? (Linked texts र audio assets हट्दैनन्)")) return;
    await deleteDoc(doc(db, "sacred_works", id));
    void loadWorks();
  }

  function openEdit(work: WorkDoc) { setEditingWork(work); setSeedForm(null); setShowForm(true); }
  function openNew(seed?: typeof KNOWN_WORKS[0]) {
    setEditingWork(null);
    setSeedForm(seed ?? null);
    setShowForm(true);
  }

  const existingTitles = useMemo(() => new Set(works.map(w => w.canonicalTitle.toLowerCase())), [works]);

  const visible = useMemo(() => {
    let rows = works;
    if (filterTrad !== "all") rows = rows.filter(w => w.tradition === filterTrad);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(w =>
        w.canonicalTitle.toLowerCase().includes(q) ||
        (w.primaryDeity ?? "").toLowerCase().includes(q) ||
        w.alternateTitles.some(t => t.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [works, filterTrad, search]);

  const usedTraditions = useMemo(() => Array.from(new Set(works.map(w => w.tradition))), [works]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">Sacred Works Registry</h2>
          <p className="text-zinc-600 text-xs mt-0.5">
            Canonical works — एक काम, धेरै भाषा versions र audio tracks एकसाथ
          </p>
        </div>
        <button
          onClick={() => openNew()}
          className="text-xs px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          + नयाँ Work
        </button>
      </div>

      {/* Filter + search */}
      {works.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterTrad("all")}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
              filterTrad === "all" ? "border-white/15 bg-white/[0.06] text-zinc-300" : "border-white/[0.05] text-zinc-700"
            }`}
          >
            सबै
          </button>
          {usedTraditions.map(t => (
            <button
              key={t}
              onClick={() => setFilterTrad(filterTrad === t ? "all" : t)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                filterTrad === t
                  ? `border-white/15 bg-white/[0.06] ${TRADITION_TEXT_COLORS[t] ?? "text-zinc-300"}`
                  : "border-white/[0.05] text-zinc-700"
              }`}
            >
              {TRADITION_LABELS[t] ?? t}
            </button>
          ))}
          <input
            type="text"
            placeholder="खोज्नुहोस्…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="ml-auto bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15 w-40"
          />
        </div>
      )}

      {/* Works list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map(w => (
            <WorkCard key={w.id} work={w} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      ) : works.length === 0 ? null : (
        <p className="text-zinc-700 text-xs text-center py-8">खोज नतिजा छैन</p>
      )}

      {/* Known works quick-add (only when no works or seed not all present) */}
      {!loading && (
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-4 space-y-2">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wide mb-3">प्रसिद्ध Sacred Works — Quick add</p>
          {KNOWN_WORKS.map(s => (
            <SeedRow
              key={s.canonicalTitle}
              seed={s}
              existing={existingTitles.has(s.canonicalTitle.toLowerCase())}
              onAdd={seed => openNew(seed)}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <WorkForm
          editing={editingWork}
          ownerId={ownerId}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingWork(null); setSeedForm(null); }}
          seed={seedForm ?? undefined}
        />
      )}
    </div>
  );
}
