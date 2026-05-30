"use client";

// Sacred Source Panel — Source URL / Audio intake + License tracker.
//
// Tab: "स्रोत / Media"
//
// Founder adds:
//   • Source URL (Internet Archive, scripture site, etc.)
//   • Audio URL (chant, bhajan, stotra recording)
//   • Text upload reference (links to a SacredWork)
//   • License check + notes
//
// System responds with:
//   • Matching SacredWork suggestion
//   • License warning if unknown
//   • Next action buttons
//
// Architecture rule: Unknown license = private study only.
// Public Bhakti Chautari publish only after founder verifies license.

import { useState, useEffect, useMemo } from "react";
import {
  collection, query, where, limit, getDocs,
  addDoc, updateDoc, doc, deleteDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import type {
  AudioAsset, AudioType, LicenseStatus, UsageRight, SourceLicense, SourcePlatform,
} from "../../../lib/types/sacred-work";
import {
  AUDIO_TYPE_LABELS, AUDIO_TYPE_ICONS,
  LICENSE_LABELS, LICENSE_COLORS,
} from "../../../lib/types/sacred-work";
import type { SacredWork } from "../../../lib/types/sacred-work";
import type { SacredLanguage } from "../../../lib/types/sacred-text";
import { SACRED_LANGUAGE_LABELS } from "../../../lib/types/sacred-text";
import { SourceRightsAnalyzer } from "./SourceRightsAnalyzer";

type AudioDoc   = AudioAsset    & { id: string };
type LicenseDoc = SourceLicense & { id: string };
type WorkDoc    = SacredWork    & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[SacredSourcePanel]", e?.code ?? e); return fb; });

// ── Constants ──────────────────────────────────────────────────────────────────

const AUDIO_TYPES: AudioType[] = ["stotra", "bhajan", "chant", "kirtan", "pravachan"];
const LICENSE_OPTIONS: LicenseStatus[] = ["public_domain", "open_license", "unknown", "restricted"];
const LANGUAGES = Object.keys(SACRED_LANGUAGE_LABELS) as SacredLanguage[];

const PLATFORM_LABELS: Record<SourcePlatform, string> = {
  internet_archive:    "Internet Archive",
  youtube:             "YouTube",
  website:             "Website",
  scripture_repository:"Scripture Repository",
  personal_recording:  "Personal Recording",
  other:               "Other",
};

const USAGE_OPTIONS: Array<{ value: UsageRight; label: string }> = [
  { value: "private_study",      label: "Private Study" },
  { value: "public_display",     label: "Public Display" },
  { value: "audio_reuse",        label: "Audio Reuse" },
  { value: "derivative_allowed", label: "Derivatives Allowed" },
];

function detectPlatform(url: string): SourcePlatform {
  if (url.includes("archive.org"))  return "internet_archive";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube";
  return "website";
}

// ── Audio form ─────────────────────────────────────────────────────────────────

function AudioForm({
  ownerId,
  works,
  onSave,
  onClose,
}: {
  ownerId: string;
  works: WorkDoc[];
  onSave: (data: Omit<AudioAsset, "id" | "ownerId" | "addedAt">) => Promise<void>;
  onClose: () => void;
}) {
  const [title,           setTitle]           = useState("");
  const [sourceUrl,       setSourceUrl]       = useState("");
  const [audioType,       setAudioType]       = useState<AudioType>("stotra");
  const [language,        setLanguage]        = useState<SacredLanguage>("sanskrit");
  const [performer,       setPerformer]       = useState("");
  const [licenseStatus,   setLicenseStatus]   = useState<LicenseStatus>("unknown");
  const [linkedWorkId,    setLinkedWorkId]    = useState("");
  const [usageAllowed,    setUsageAllowed]    = useState<UsageRight[]>(["private_study"]);
  const [attrRequired,    setAttrRequired]    = useState(false);
  const [saving, setSaving] = useState(false);

  function toggleUsage(u: UsageRight) {
    setUsageAllowed(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !sourceUrl.trim()) return;
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        sourceUrl: sourceUrl.trim(),
        audioType,
        language,
        performer: performer.trim() || undefined,
        licenseStatus,
        usageAllowed: usageAllowed.length > 0 ? usageAllowed : ["private_study"],
        attributionRequired: attrRequired,
        relatedSacredWorkId: linkedWorkId || undefined,
        transcriptStatus: "not_transcribed",
        publicReady: false,
        visibility: "private",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-amber-400">🎵 Audio Asset दर्ता</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <form id="audio-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} required
                placeholder="Rudrashtakam — Pandit Jasraj"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Source URL *</label>
              <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} required type="url"
                placeholder="https://archive.org/…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

            {/* Audio type */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Audio Type</label>
              <div className="flex flex-wrap gap-1.5">
                {AUDIO_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setAudioType(t)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      audioType === t
                        ? "bg-white/[0.08] border-white/20 text-amber-300"
                        : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {AUDIO_TYPE_ICONS[t]} {AUDIO_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Language + performer */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">भाषा</label>
                <select value={language} onChange={e => setLanguage(e.target.value as SacredLanguage)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none">
                  {LANGUAGES.map(l => (
                    <option key={l} value={l} className="bg-zinc-900">{SACRED_LANGUAGE_LABELS[l]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Performer / Speaker</label>
                <input value={performer} onChange={e => setPerformer(e.target.value)}
                  placeholder="Pandit Jasraj"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
            </div>

            {/* Link to SacredWork */}
            {works.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Sacred Work सँग जोड्नुहोस्</label>
                <select value={linkedWorkId} onChange={e => setLinkedWorkId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none">
                  <option value="" className="bg-zinc-900">— छान्नुहोस् (optional) —</option>
                  {works.map(w => (
                    <option key={w.id} value={w.id} className="bg-zinc-900">{w.canonicalTitle}</option>
                  ))}
                </select>
              </div>
            )}

            {/* License */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">License</label>
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

            {/* Usage rights */}
            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Usage Allowed</label>
              <div className="flex flex-wrap gap-1.5">
                {USAGE_OPTIONS.map(u => (
                  <button key={u.value} type="button" onClick={() => toggleUsage(u.value)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      usageAllowed.includes(u.value)
                        ? "bg-white/[0.08] border-white/20 text-zinc-200"
                        : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={attrRequired} onChange={e => setAttrRequired(e.target.checked)}
                className="w-3.5 h-3.5 accent-sky-500" />
              <span className="text-xs text-zinc-500">Attribution required</span>
            </label>

            {licenseStatus === "unknown" && (
              <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3">
                <p className="text-amber-400 text-[11px] font-semibold">⚠ License Unknown</p>
                <p className="text-amber-600 text-[10px] mt-0.5">
                  यो audio private study मात्र। Public Bhakti Chautari मा publish गर्नु भन्दा पहिले license verify गर्नुहोस्।
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-600 text-sm hover:text-zinc-400 transition-colors"
          >
            रद्द
          </button>
          <button form="audio-form" type="submit" disabled={saving || !title.trim() || !sourceUrl.trim()}
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-amber-300 transition-all disabled:opacity-30"
          >
            {saving ? "…" : "Audio दर्ता"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── License checker form ───────────────────────────────────────────────────────

function LicenseForm({
  ownerId,
  works,
  onSave,
  onClose,
}: {
  ownerId: string;
  works: WorkDoc[];
  onSave: (data: Omit<SourceLicense, "id" | "ownerId" | "createdAt">) => Promise<void>;
  onClose: () => void;
}) {
  const [sourceUrl,       setSourceUrl]       = useState("");
  const [sourceTitle,     setSourceTitle]     = useState("");
  const [platform,        setPlatform]        = useState<SourcePlatform>("internet_archive");
  const [licenseStatus,   setLicenseStatus]   = useState<LicenseStatus>("unknown");
  const [usageAllowed,    setUsageAllowed]    = useState<UsageRight[]>(["private_study"]);
  const [attrRequired,    setAttrRequired]    = useState(false);
  const [attrText,        setAttrText]        = useState("");
  const [notes,           setNotes]           = useState("");
  const [linkedWorkId,    setLinkedWorkId]    = useState("");
  const [saving, setSaving] = useState(false);

  function toggleUsage(u: UsageRight) {
    setUsageAllowed(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
    );
  }

  function handleUrlChange(url: string) {
    setSourceUrl(url);
    if (url.trim()) setPlatform(detectPlatform(url));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    setSaving(true);
    try {
      await onSave({
        sourceUrl: sourceUrl.trim(),
        sourceTitle: sourceTitle.trim() || undefined,
        sourcePlatform: platform,
        licenseStatus,
        usageAllowed,
        attributionRequired: attrRequired,
        attributionText: attrText.trim() || undefined,
        notes: notes.trim() || undefined,
        relatedSacredWorkId: linkedWorkId || undefined,
        checkedAt: new Date().toISOString(),
        checkedBy: "founder",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">
        <div className="px-6 pt-5 pb-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-sky-400">🔍 License Check दर्ता</h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="rounded-xl border border-amber-900/30 bg-amber-950/10 px-4 py-3 mb-4">
            <p className="text-amber-500 text-[11px] font-semibold">License Rule</p>
            <p className="text-amber-700 text-[10px] mt-0.5 leading-relaxed">
              Unknown license = private study only। Public Bhakti Chautari publish गर्न license verify गर्नैपर्छ।
              Internet Archive content मा mixed rights हुन्छ — assume नगर्नुहोस्।
            </p>
          </div>

          <form id="license-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Source URL *</label>
              <input value={sourceUrl} onChange={e => handleUrlChange(e.target.value)} required type="url"
                placeholder="https://archive.org/details/…"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
              {sourceUrl && (
                <p className="text-[10px] text-zinc-700">Detected: {PLATFORM_LABELS[platform]}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Source Title</label>
              <input value={sourceTitle} onChange={e => setSourceTitle(e.target.value)}
                placeholder="Rudrashtakam by Goswami Tulsidas"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
              />
            </div>

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
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Usage Allowed</label>
              <div className="flex flex-wrap gap-1.5">
                {USAGE_OPTIONS.map(u => (
                  <button key={u.value} type="button" onClick={() => toggleUsage(u.value)}
                    className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                      usageAllowed.includes(u.value)
                        ? "bg-white/[0.08] border-white/20 text-zinc-200"
                        : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={attrRequired} onChange={e => setAttrRequired(e.target.checked)}
                className="w-3.5 h-3.5 accent-sky-500" />
              <span className="text-xs text-zinc-500">Attribution required</span>
            </label>

            {attrRequired && (
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Attribution Text</label>
                <input value={attrText} onChange={e => setAttrText(e.target.value)}
                  placeholder="© Internet Archive — CC BY 4.0"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15"
                />
              </div>
            )}

            {works.length > 0 && (
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Sacred Work सँग Link</label>
                <select value={linkedWorkId} onChange={e => setLinkedWorkId(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none">
                  <option value="" className="bg-zinc-900">— छान्नुहोस् —</option>
                  {works.map(w => (
                    <option key={w.id} value={w.id} className="bg-zinc-900">{w.canonicalTitle}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-600 uppercase tracking-wide">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="यो source बारे notes… कहाँ check गर्नुभयो, कुन page मा license information थियो…"
                rows={2}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-none"
              />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-zinc-600 text-sm hover:text-zinc-400 transition-colors">
            रद्द
          </button>
          <button form="license-form" type="submit" disabled={saving || !sourceUrl.trim()}
            className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium text-sky-300 transition-all disabled:opacity-30">
            {saving ? "…" : "License Record"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Root component ─────────────────────────────────────────────────────────────

export function SacredSourcePanel({ ownerId }: { ownerId: string }) {
  const [audioAssets,  setAudioAssets]  = useState<AudioDoc[]>([]);
  const [licenses,     setLicenses]     = useState<LicenseDoc[]>([]);
  const [works,        setWorks]        = useState<WorkDoc[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showAudio,    setShowAudio]    = useState(false);
  const [showLicense,  setShowLicense]  = useState(false);
  const [activeSection, setActiveSection] = useState<"audio" | "license">("audio");

  async function loadAll() {
    setLoading(true);
    const [audioSnap, licenseSnap, worksSnap] = await Promise.all([
      safe(getDocs(query(collection(db, "audio_assets"),   where("ownerId", "==", ownerId), limit(200))), null),
      safe(getDocs(query(collection(db, "source_licenses"),where("ownerId", "==", ownerId), limit(200))), null),
      safe(getDocs(query(collection(db, "sacred_works"),   where("ownerId", "==", ownerId), limit(100))), null),
    ]);
    if (audioSnap)   setAudioAssets(audioSnap.docs.map(d => ({ id: d.id, ...d.data() } as AudioDoc)));
    if (licenseSnap) setLicenses(licenseSnap.docs.map(d => ({ id: d.id, ...d.data() } as LicenseDoc)));
    if (worksSnap)   setWorks(worksSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkDoc)));
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [ownerId]);

  async function handleSaveAudio(data: Omit<AudioAsset, "id" | "ownerId" | "addedAt">) {
    const ref = await addDoc(collection(db, "audio_assets"), {
      ...data,
      ownerId,
      addedAt: new Date().toISOString(),
    });
    // If linked to a SacredWork, append audioAssetId there
    if (data.relatedSacredWorkId) {
      const work = works.find(w => w.id === data.relatedSacredWorkId);
      if (work) {
        await updateDoc(doc(db, "sacred_works", work.id), {
          audioAssetIds: [...work.audioAssetIds, ref.id],
          hasAudio: true,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    setShowAudio(false);
    void loadAll();
  }

  async function handleSaveLicense(data: Omit<SourceLicense, "id" | "ownerId" | "createdAt">) {
    await addDoc(collection(db, "source_licenses"), {
      ...data,
      ownerId,
      createdAt: new Date().toISOString(),
    });
    setShowLicense(false);
    void loadAll();
  }

  async function deleteAudio(id: string) {
    if (!confirm("यो audio asset हटाउने?")) return;
    await deleteDoc(doc(db, "audio_assets", id));
    void loadAll();
  }

  async function deleteLicense(id: string) {
    if (!confirm("यो license record हटाउने?")) return;
    await deleteDoc(doc(db, "source_licenses", id));
    void loadAll();
  }

  const unknownCount = useMemo(() => licenses.filter(l => l.licenseStatus === "unknown").length, [licenses]);

  return (
    <div className="space-y-6">
      {/* URL Rights Scanner — primary entry point for all source intake */}
      <SourceRightsAnalyzer ownerId={ownerId} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-200">Audio र License Registry</h2>
          <p className="text-zinc-600 text-xs mt-0.5">
            Verified audio tracks र license records — Scanner बाट save भएपछि यहाँ register गर्नुहोस्
          </p>
        </div>
        {unknownCount > 0 && (
          <span className="text-[10px] border border-amber-800/60 bg-amber-950/20 text-amber-400 rounded-full px-2.5 py-1 shrink-0">
            ⚠ {unknownCount} unknown license{unknownCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* License safety reminder */}
      <div className="rounded-xl border border-white/[0.04] bg-white/[0.015] px-4 py-3 space-y-1">
        <p className="text-zinc-500 text-[11px] font-medium">Sacred Source Safety Rules</p>
        <p className="text-zinc-700 text-[10px] leading-relaxed">
          🔒 <span className="text-amber-600">Unknown license</span> = private study only — Bhakti Chautari मा publish नगर्नुहोस्<br/>
          ✅ <span className="text-emerald-600">Public domain</span> = share freely (cite source)<br/>
          📋 <span className="text-sky-600">Open license</span> = follow license terms (attribution if required)<br/>
          🚫 <span className="text-red-600">Restricted</span> = private study only, no reuse
        </p>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.04] pb-0">
        {(["audio", "license"] as const).map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`text-xs px-4 py-2.5 transition-colors border-b-2 -mb-px ${
              activeSection === s
                ? "text-zinc-300 border-zinc-600"
                : "text-zinc-700 border-transparent hover:text-zinc-500"
            }`}
          >
            {s === "audio" ? `🎵 Audio (${audioAssets.length})` : `🔍 License Records (${licenses.length})`}
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          {activeSection === "audio" && (
            <button onClick={() => setShowAudio(true)}
              className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-amber-400 hover:text-amber-300 transition-colors">
              + Audio
            </button>
          )}
          {activeSection === "license" && (
            <button onClick={() => setShowLicense(true)}
              className="text-[11px] px-3 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] text-sky-400 hover:text-sky-300 transition-colors">
              + License Check
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />)}
        </div>
      ) : activeSection === "audio" ? (
        audioAssets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 opacity-20">🎵</div>
            <p className="text-zinc-700 text-sm">कुनै audio asset दर्ता छैन</p>
            <p className="text-zinc-800 text-xs mt-1">
              Sanskrit stotra recordings, bhajans, kirtan tracks यहाँ दर्ता गर्नुहोस्
            </p>
            <button onClick={() => setShowAudio(true)}
              className="mt-4 text-xs px-4 py-2 rounded-xl border border-white/[0.08] text-amber-400 hover:text-amber-300 transition-colors">
              + पहिलो Audio थप्नुहोस्
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {audioAssets.map(a => {
              const linkedWork = works.find(w => w.id === a.relatedSacredWorkId);
              const licCls = LICENSE_COLORS[a.licenseStatus];
              return (
                <div key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-400 text-sm">{AUDIO_TYPE_ICONS[a.audioType]}</span>
                        <span className="text-zinc-200 text-xs font-medium truncate">{a.title}</span>
                        <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${licCls}`}>
                          {LICENSE_LABELS[a.licenseStatus]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                        <span>{AUDIO_TYPE_LABELS[a.audioType]}</span>
                        <span>{SACRED_LANGUAGE_LABELS[a.language]}</span>
                        {a.performer && <span>{a.performer}</span>}
                        {linkedWork && <span className="text-violet-500">{linkedWork.canonicalTitle}</span>}
                        {a.transcriptStatus !== "not_transcribed" && (
                          <span className="text-emerald-600">{a.transcriptStatus}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => deleteAudio(a.id)}
                      className="text-zinc-800 hover:text-zinc-500 text-[11px] transition-colors shrink-0">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        licenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4 opacity-20">🔍</div>
            <p className="text-zinc-700 text-sm">कुनै license record छैन</p>
            <p className="text-zinc-800 text-xs mt-1">
              बाहिरी sources को license check यहाँ record गर्नुहोस्
            </p>
            <button onClick={() => setShowLicense(true)}
              className="mt-4 text-xs px-4 py-2 rounded-xl border border-white/[0.08] text-sky-400 hover:text-sky-300 transition-colors">
              + License Check थप्नुहोस्
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {licenses.map(l => {
              const linkedWork = works.find(w => w.id === l.relatedSacredWorkId);
              const licCls = LICENSE_COLORS[l.licenseStatus];
              return (
                <div key={l.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${licCls}`}>
                          {LICENSE_LABELS[l.licenseStatus]}
                        </span>
                        {l.sourceTitle && (
                          <span className="text-zinc-300 text-xs truncate">{l.sourceTitle}</span>
                        )}
                        {linkedWork && (
                          <span className="text-violet-500 text-[10px]">{linkedWork.canonicalTitle}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                        <span>{PLATFORM_LABELS[l.sourcePlatform]}</span>
                        <span>{l.usageAllowed.join(", ")}</span>
                        {l.attributionRequired && <span className="text-sky-600">Attribution required</span>}
                        <span className="ml-auto text-zinc-800">
                          {new Date(l.checkedAt).toLocaleDateString("ne-NP")}
                        </span>
                      </div>
                      {l.notes && (
                        <p className="text-zinc-700 text-[10px] mt-1 leading-relaxed">{l.notes}</p>
                      )}
                    </div>
                    <button onClick={() => deleteLicense(l.id)}
                      className="text-zinc-800 hover:text-zinc-500 text-[11px] transition-colors shrink-0">✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {showAudio && (
        <AudioForm
          ownerId={ownerId}
          works={works}
          onSave={handleSaveAudio}
          onClose={() => setShowAudio(false)}
        />
      )}
      {showLicense && (
        <LicenseForm
          ownerId={ownerId}
          works={works}
          onSave={handleSaveLicense}
          onClose={() => setShowLicense(false)}
        />
      )}
    </div>
  );
}
