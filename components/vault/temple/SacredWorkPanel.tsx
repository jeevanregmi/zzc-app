"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, limit, getDocs,
  addDoc, updateDoc, doc, deleteDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import type {
  SacredWork, LicenseStatus, SourcePlatform, UsageRight,
} from "../../../lib/types/sacred-work";
import {
  LICENSE_LABELS, LICENSE_COLORS,
  TRADITION_TEXT_COLORS, TRADITION_DOT_COLORS, TRADITION_LABELS,
} from "../../../lib/types/sacred-work";
import type { SpiritualTradition } from "../../../lib/types/semantic-atom";
import type { SacredTextType, SacredLanguage } from "../../../lib/types/sacred-text";
import { SACRED_TEXT_TYPE_LABELS, SACRED_LANGUAGE_LABELS } from "../../../lib/types/sacred-text";
import { SacredWorkspacePanel, type WorkRef } from "./SacredWorkspacePanel";

type WorkDoc = SacredWork & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredWorkPanel]", e?.code ?? e); return fb; });

// ── Source URL helpers ─────────────────────────────────────────────────────────

type SourceType = "text" | "audio" | "image" | "video" | "mixed";

interface SourceInput {
  sourceUrl:    string;
  platform:     SourcePlatform;
  sourceType:   SourceType;
  licenseStatus: LicenseStatus;
  usageAllowed: UsageRight[];
  usageNote:    string;
}

const SOURCE_TYPE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: "text",  label: "📄 Text"  },
  { value: "audio", label: "🎵 Audio" },
  { value: "image", label: "🖼 Image" },
  { value: "video", label: "🎬 Video" },
  { value: "mixed", label: "📦 Mixed" },
];

const SOURCE_USAGE_OPTIONS: Array<{ value: UsageRight; label: string }> = [
  { value: "private_study",      label: "Private Study"      },
  { value: "public_display",     label: "Public Display"     },
  { value: "audio_reuse",        label: "Audio Reuse"        },
  { value: "derivative_allowed", label: "Derivatives Allowed"},
];

const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  internet_archive:     "Internet Archive",
  youtube:              "YouTube",
  website:              "Website",
  scripture_repository: "Scripture Repository",
  personal_recording:   "Personal Recording",
  other:                "Other",
};

function detectPlatformFromUrl(url: string): SourcePlatform {
  if (url.includes("archive.org"))                             return "internet_archive";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "website";
}

function suggestLicense(platform: SourcePlatform): LicenseStatus {
  if (platform === "internet_archive") return "public_domain";
  if (platform === "youtube")          return "unknown";
  return "unknown";
}

function platformGuidance(platform: SourcePlatform, license: LicenseStatus): { text: string; cls: string } {
  if (platform === "internet_archive" && license === "public_domain")
    return { text: "Internet Archive — ancient texts often public domain। Item page मा confirm गर्नुहोस्।", cls: "text-emerald-700" };
  if (platform === "youtube")
    return { text: "YouTube content copyright restricted हुन्छ। Private study मात्र।", cls: "text-amber-600" };
  return { text: "यो source को license manually verify गर्नुहोस्।", cls: "text-zinc-600" };
}

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

// ── Sacred Work Preset Registry ────────────────────────────────────────────────
// Full known-metadata per work. Every field that the system already knows is
// pre-filled; founder edits only what's uncertain or different.

interface SacredWorkPreset {
  canonicalTitle:           string;
  canonicalTitleDevanagari?: string;
  alternateTitles:          string[];
  tradition:                SpiritualTradition;
  textType:                 SacredTextType;
  languageOriginal:         SacredLanguage;
  primaryDeity?:            string;
  author?:                  string;
  attributedAuthor?:        string;
  sourceHint?:              string;
}

const KNOWN_WORKS: SacredWorkPreset[] = [
  {
    canonicalTitle:           "Rudrashtakam",
    canonicalTitleDevanagari: "रुद्राष्टकम्",
    alternateTitles:          ["Rudra Ashtakam", "रुद्राष्टकम्", "Shri Rudrashtakam"],
    tradition:                "shaiva",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Shiva",
    author:                   "Goswami Tulsidas",
    sourceHint:               "Ramcharitmanas — Uttara Kanda",
  },
  {
    canonicalTitle:           "Nirvana Shatakam",
    canonicalTitleDevanagari: "निर्वाण षट्कम्",
    alternateTitles:          ["Atma Shatakam", "Nirvana Shatakam", "निर्वाण षट्कम्"],
    tradition:                "advaita_vedanta",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Shiva / Atman",
    author:                   "Adi Shankaracharya",
  },
  {
    canonicalTitle:           "Achyutashtakam",
    canonicalTitleDevanagari: "अच्युताष्टकम्",
    alternateTitles:          ["Achyuta Ashtakam", "अच्युताष्टकम्"],
    tradition:                "vaishnava",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Vishnu / Krishna",
    author:                   "Adi Shankaracharya",
    attributedAuthor:         "attributed to Adi Shankaracharya",
  },
  {
    canonicalTitle:           "Ganesha Pancharatnam",
    canonicalTitleDevanagari: "गणेश पञ्चरत्नम्",
    alternateTitles:          ["Ganesha Pancharatna Stotram", "गणेश पञ्चरत्नम्"],
    tradition:                "ganapatya",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Ganesha",
    author:                   "Adi Shankaracharya",
  },
  {
    canonicalTitle:           "Gauri Dashakam",
    canonicalTitleDevanagari: "गौरी दशकम्",
    alternateTitles:          ["Gauri Dashakam", "गौरी दशकम्"],
    tradition:                "shakta",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Gauri / Devi",
    author:                   "Adi Shankaracharya",
  },
  {
    canonicalTitle:           "Shiva Tandava Stotram",
    canonicalTitleDevanagari: "शिव ताण्डव स्तोत्रम्",
    alternateTitles:          ["Shiva Tandava Stotra", "शिव ताण्डव स्तोत्रम्"],
    tradition:                "shaiva",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Shiva",
    author:                   "Ravana",
    attributedAuthor:         "attributed to Ravana",
  },
  {
    canonicalTitle:           "Bhaja Govindam",
    canonicalTitleDevanagari: "भज गोविन्दम्",
    alternateTitles:          ["Moha Mudgara", "मोह मुद्गर", "भज गोविन्दम्"],
    tradition:                "advaita_vedanta",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Krishna / Govinda",
    author:                   "Adi Shankaracharya",
  },
  {
    canonicalTitle:           "Hanuman Chalisa",
    canonicalTitleDevanagari: "हनुमान चालीसा",
    alternateTitles:          ["हनुमान चालीसा"],
    tradition:                "vaishnava",
    textType:                 "stotra",
    languageOriginal:         "hindi",
    primaryDeity:             "Hanuman",
    author:                   "Goswami Tulsidas",
  },
  {
    canonicalTitle:           "Mahamrityunjaya Mantra",
    canonicalTitleDevanagari: "महामृत्युञ्जय मन्त्र",
    alternateTitles:          ["Tryambakam Mantra", "महामृत्युञ्जय मन्त्र"],
    tradition:                "shaiva",
    textType:                 "mantra_set",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Shiva",
    attributedAuthor:         "Rigveda — Markandeya Rishi",
  },
  {
    canonicalTitle:           "Lalitha Sahasranama",
    canonicalTitleDevanagari: "ललिता सहस्रनाम",
    alternateTitles:          ["Lalitha Sahasranamam", "ललिता सहस्रनाम"],
    tradition:                "shakta",
    textType:                 "stotra",
    languageOriginal:         "sanskrit",
    primaryDeity:             "Lalitha / Tripura Sundari / Devi",
    attributedAuthor:         "Brahmanda Purana — Hayagriva",
  },
];

// ── Work form modal ────────────────────────────────────────────────────────────

interface WorkFormProps {
  editing: WorkDoc | null;
  ownerId: string;
  onSave: (
    data:    Omit<SacredWork, "id" | "ownerId" | "createdAt" | "updatedAt">,
    source?: SourceInput,
  ) => Promise<void>;
  onClose: () => void;
  seed?: SacredWorkPreset;
}

function WorkForm({ editing, ownerId, onSave, onClose, seed }: WorkFormProps) {
  // Work fields — all initialized from preset when seed is provided
  const [canonicalTitle,     setCanonicalTitle]     = useState(editing?.canonicalTitle                        ?? seed?.canonicalTitle             ?? "");
  const [canonicalTitleDev,  setCanonicalTitleDev]  = useState(editing?.canonicalTitleDevanagari              ?? seed?.canonicalTitleDevanagari    ?? "");
  const [alternateTitles,    setAlternateTitles]    = useState((editing?.alternateTitles ?? seed?.alternateTitles ?? []).join(", "));
  const [tradition,          setTradition]          = useState<SpiritualTradition>(editing?.tradition          ?? seed?.tradition                  ?? "general");
  const [textType,           setTextType]           = useState<SacredTextType>(editing?.textType              ?? seed?.textType                   ?? "stotra");
  const [author,             setAuthor]             = useState(editing?.author                                ?? seed?.author                     ?? "");
  const [attributedAuthor,   setAttributedAuthor]   = useState(editing?.attributedAuthor                      ?? seed?.attributedAuthor           ?? "");
  const [languageOriginal,   setLanguageOriginal]   = useState<SacredLanguage>(editing?.languageOriginal      ?? seed?.languageOriginal           ?? "sanskrit");
  const [primaryDeity,       setPrimaryDeity]       = useState(editing?.primaryDeity                          ?? seed?.primaryDeity               ?? "");
  const [licenseStatus,      setLicenseStatus]      = useState<LicenseStatus>(editing?.licenseStatus ?? "unknown");
  const [publicDomainStatus, setPublicDomainStatus] = useState(editing?.publicDomainStatus ?? false);
  const [founderNotes,       setFounderNotes]       = useState(editing?.founderNotes ?? seed?.sourceHint ?? "");

  // Source URL fields
  const [showSource,    setShowSource]    = useState(false);
  const [sourceUrl,     setSourceUrl]     = useState("");
  const [sourcePlatform,setSourcePlatform]= useState<SourcePlatform>("internet_archive");
  const [sourceType,    setSourceType]    = useState<SourceType>("text");
  const [srcLicense,    setSrcLicense]    = useState<LicenseStatus>("unknown");
  const [srcUsage,      setSrcUsage]      = useState<UsageRight[]>(["private_study"]);
  const [usageNote,     setUsageNote]     = useState("");

  const [saving, setSaving] = useState(false);

  function handleUrlChange(url: string) {
    setSourceUrl(url);
    if (url.trim()) {
      const plat = detectPlatformFromUrl(url);
      setSourcePlatform(plat);
      setSrcLicense(suggestLicense(plat));
    }
  }

  function toggleUsage(u: UsageRight) {
    setSrcUsage(prev => prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canonicalTitle.trim()) return;
    setSaving(true);
    try {
      const workData: Omit<SacredWork, "id" | "ownerId" | "createdAt" | "updatedAt"> = {
        canonicalTitle:           canonicalTitle.trim(),
        canonicalTitleDevanagari: canonicalTitleDev.trim() || undefined,
        alternateTitles:          alternateTitles.split(",").map(s => s.trim()).filter(Boolean),
        tradition,
        textType,
        author:           author.trim() || undefined,
        attributedAuthor: attributedAuthor.trim() || undefined,
        languageOriginal,
        primaryDeity:     primaryDeity.trim() || undefined,
        sourceRefs:       sourceUrl.trim() ? [sourceUrl.trim()] : [],
        licenseStatus,
        publicDomainStatus,
        licenseNotes:     undefined,
        relatedTextIds:   editing?.relatedTextIds ?? [],
        audioAssetIds:    editing?.audioAssetIds  ?? [],
        imageRefs:        editing?.imageRefs      ?? [],
        videoRefs:        editing?.videoRefs      ?? [],
        alignmentIds:     editing?.alignmentIds   ?? [],
        atomIds:          editing?.atomIds        ?? [],
        hasLanguage: {
          sanskrit: languageOriginal === "sanskrit" ? true : undefined,
          nepali:   languageOriginal === "nepali"   ? true : undefined,
          hindi:    languageOriginal === "hindi"    ? true : undefined,
          english:  languageOriginal === "english"  ? true : undefined,
        },
        hasAudio:    false,
        founderNotes: founderNotes.trim() || undefined,
        publicReady: false,
        visibility:  "private",
      };

      const source: SourceInput | undefined = sourceUrl.trim() ? {
        sourceUrl:    sourceUrl.trim(),
        platform:     sourcePlatform,
        sourceType,
        licenseStatus: srcLicense,
        usageAllowed: srcUsage.length > 0 ? srcUsage : ["private_study"],
        usageNote:    usageNote.trim(),
      } : undefined;

      await onSave(workData, source);
    } finally {
      setSaving(false);
    }
  }

  const tColor    = TRADITION_TEXT_COLORS[tradition] ?? "text-zinc-400";
  const guidance  = sourceUrl ? platformGuidance(sourcePlatform, srcLicense) : null;

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

            {/* Preset auto-filled note */}
            {seed && !editing && (
              <div className="rounded-xl border border-sky-900/30 bg-sky-950/15 px-4 py-2.5 flex items-center gap-2">
                <span className="text-sky-400 text-sm">✦</span>
                <p className="text-sky-400 text-[11px]">
                  Preset metadata auto-filled — edit गर्न मिल्छ।
                </p>
              </div>
            )}

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
                placeholder="देवनागरी शीर्षक थप्नुहोस्…"
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
                placeholder="Alternate title थप्नुहोस्…"
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
                placeholder="देवता / Character नाम थप्नुहोस्…"
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
                  placeholder="रचयिताको नाम थप्नुहोस्…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">परम्परागत श्रेय</label>
                <input
                  value={attributedAuthor}
                  onChange={e => setAttributedAuthor(e.target.value)}
                  placeholder="परम्परागत attribution थप्नुहोस्…"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
            </div>

            {/* Original text license */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">मूल ग्रन्थको License</label>
              <p className="text-[10px] text-zinc-700 -mt-1">यो sacred text आफैंको license — ancient texts usually public domain।</p>
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

            {/* ── SOURCE URL SECTION ──────────────────────────────────────────── */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSource(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.025] hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sky-400">🔗</span>
                  <span className="text-xs font-medium text-zinc-400">स्रोत URL थप्नुहोस्</span>
                  <span className="text-[10px] text-zinc-700">(Internet Archive / YouTube / Website)</span>
                  {sourceUrl && (
                    <span className="text-[10px] border border-sky-800/50 bg-sky-950/20 text-sky-400 rounded-full px-2 py-0.5">
                      linked
                    </span>
                  )}
                </div>
                <span className="text-zinc-700 text-[10px]">{showSource ? "▲" : "▼"}</span>
              </button>

              {showSource && (
                <div className="px-4 pb-4 pt-3 space-y-4 border-t border-white/[0.04] bg-white/[0.01]">

                  {/* URL input */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Source URL</label>
                    <input
                      value={sourceUrl}
                      onChange={e => handleUrlChange(e.target.value)}
                      type="url"
                      placeholder="https://archive.org/details/…"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-sky-800/60"
                    />
                    {sourceUrl && (
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] border border-sky-800/50 bg-sky-950/20 text-sky-400 rounded-full px-2 py-0.5 shrink-0 mt-0.5">
                          {PLATFORM_LABELS[sourcePlatform]}
                        </span>
                        {guidance && (
                          <span className={`text-[10px] leading-relaxed ${guidance.cls}`}>{guidance.text}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Source type */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Source Type</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SOURCE_TYPE_OPTIONS.map(t => (
                        <button key={t.value} type="button" onClick={() => setSourceType(t.value)}
                          className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                            sourceType === t.value
                              ? "bg-white/[0.08] border-sky-700/50 text-sky-300"
                              : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Source license */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] text-zinc-600 uppercase tracking-wide">यो URL को License</label>
                      {sourceUrl && (
                        <span className="text-[10px] text-zinc-700 italic">system suggestion — verify गर्नुहोस्</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {LICENSE_OPTIONS.map(l => (
                        <button key={l} type="button" onClick={() => setSrcLicense(l)}
                          className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                            srcLicense === l ? LICENSE_COLORS[l] : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                          }`}
                        >
                          {LICENSE_LABELS[l]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Usage allowed */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Usage Allowed</label>
                    <div className="flex flex-wrap gap-1.5">
                      {SOURCE_USAGE_OPTIONS.map(u => (
                        <button key={u.value} type="button" onClick={() => toggleUsage(u.value)}
                          className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                            srcUsage.includes(u.value)
                              ? "bg-white/[0.08] border-white/20 text-zinc-200"
                              : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                          }`}
                        >
                          {u.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Usage note */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Usage Note</label>
                    <input
                      value={usageNote}
                      onChange={e => setUsageNote(e.target.value)}
                      placeholder="License page check गरेको, CC BY-SA confirmed…"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                    />
                  </div>

                  {/* License warning or confirmation */}
                  {sourceUrl && srcLicense === "unknown" && (
                    <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
                      <p className="text-amber-400 text-[11px] font-semibold">⚠ License Unknown — Private Study Only</p>
                      <p className="text-amber-700 text-[10px] mt-0.5 leading-relaxed">
                        Bhakti Chautari publish गर्नु भन्दा पहिले license verify गर्नुहोस्।
                      </p>
                    </div>
                  )}
                  {sourceUrl && srcLicense === "public_domain" && (
                    <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3">
                      <p className="text-emerald-400 text-[11px] font-semibold">✅ Public Domain — Share freely</p>
                      <p className="text-emerald-700 text-[10px] mt-0.5">
                        Source URL को specific item page मा license confirm गर्नुभएको छ भने यो record safe।
                      </p>
                    </div>
                  )}
                  {sourceUrl && srcLicense === "restricted" && (
                    <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3">
                      <p className="text-red-400 text-[11px] font-semibold">🚫 Restricted — Private Study Only</p>
                      <p className="text-red-700 text-[10px] mt-0.5">यो source reuse वा publish गर्न मिल्दैन।</p>
                    </div>
                  )}

                </div>
              )}
            </div>

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
            {saving ? "…" : editing ? "अपडेट" : sourceUrl ? "दर्ता + स्रोत link" : "दर्ता गर्नुहोस्"}
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
  onOpenWorkspace,
}: {
  work:            WorkDoc;
  onEdit:          (w: WorkDoc) => void;
  onDelete:        (id: string) => void;
  onOpenWorkspace: (w: WorkDoc) => void;
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
          <button
            onClick={() => onOpenWorkspace(work)}
            className="text-[11px] px-2.5 py-1 rounded-lg border border-violet-800/40 text-violet-400 hover:bg-violet-950/30 transition-colors"
          >
            Workspace →
          </button>
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
      <div className="flex items-center gap-4 flex-wrap text-[10px]">
        <span className={work.relatedTextIds.length > 0 ? "text-sky-400" : "text-zinc-700"}>
          📄 {work.relatedTextIds.length} text{work.relatedTextIds.length !== 1 ? "s" : ""}
        </span>
        <span className={work.audioAssetIds.length > 0 ? "text-amber-400" : "text-zinc-700"}>
          🎵 {work.audioAssetIds.length} audio
        </span>
        <span className={work.atomIds.length > 0 ? "text-violet-400" : "text-zinc-700"}>
          ⚛ {work.atomIds.length} atom{work.atomIds.length !== 1 ? "s" : ""}
        </span>
        {work.sourceRefs.length > 0 && (
          <span className="text-sky-500">
            🔗 {work.sourceRefs.length} source{work.sourceRefs.length !== 1 ? "s" : ""}
          </span>
        )}
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
  seed: SacredWorkPreset;
  existing: boolean;
  onAdd: (seed: SacredWorkPreset) => void;
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
  const [seedForm,    setSeedForm]    = useState<SacredWorkPreset | null>(null);
  const [filterTrad,    setFilterTrad]    = useState<SpiritualTradition | "all">("all");
  const [search,        setSearch]        = useState("");
  const [workspaceWork, setWorkspaceWork] = useState<WorkDoc | null>(null);

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

  async function handleSave(
    data:    Omit<SacredWork, "id" | "ownerId" | "createdAt" | "updatedAt">,
    source?: SourceInput,
  ) {
    const now = new Date().toISOString();
    let workId: string;

    if (editingWork) {
      await updateDoc(doc(db, "sacred_works", editingWork.id), { ...data, updatedAt: now });
      workId = editingWork.id;
    } else {
      const ref = await addDoc(collection(db, "sacred_works"), {
        ...data, ownerId, createdAt: now, updatedAt: now,
      });
      workId = ref.id;
    }

    if (source?.sourceUrl) {
      await addDoc(collection(db, "source_licenses"), {
        sourceUrl:           source.sourceUrl,
        sourcePlatform:      source.platform,
        licenseStatus:       source.licenseStatus,
        usageAllowed:        source.usageAllowed,
        attributionRequired: false,
        notes:               source.usageNote || undefined,
        relatedSacredWorkId: workId,
        checkedAt:           now,
        checkedBy:           "founder",
        ownerId,
        createdAt:           now,
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
  function openNew(seed?: SacredWorkPreset) {
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
            <WorkCard key={w.id} work={w} onEdit={openEdit} onDelete={handleDelete} onOpenWorkspace={setWorkspaceWork} />
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

      {/* Workspace modal */}
      {workspaceWork && (
        <SacredWorkspacePanel
          work={workspaceWork as WorkRef}
          ownerId={ownerId}
          onClose={() => setWorkspaceWork(null)}
        />
      )}
    </div>
  );
}
