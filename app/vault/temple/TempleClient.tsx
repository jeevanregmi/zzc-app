"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type { TempleNote, NoteType } from "../../../lib/types/temple-vault";
import { SACRED_CHAMBERS } from "../../../lib/types/temple-vault";

// ─── Chamber accent palette ────────────────────────────────────────────────────
const CHAMBER_ACCENT: Record<string, string> = {
  shiva:   "from-sky-950/60 border-sky-800/40 hover:border-sky-600/60",
  advaita: "from-violet-950/60 border-violet-800/40 hover:border-violet-600/60",
  krishna: "from-amber-950/60 border-amber-800/40 hover:border-amber-600/60",
  devi:    "from-rose-950/60 border-rose-800/40 hover:border-rose-600/60",
  hanuman: "from-orange-950/60 border-orange-800/40 hover:border-orange-600/60",
  buddha:  "from-stone-900/60 border-stone-700/40 hover:border-stone-500/60",
  vedic:   "from-yellow-950/60 border-yellow-800/40 hover:border-yellow-600/60",
  bhakti:  "from-amber-950/60 border-amber-800/40 hover:border-amber-600/60",
  mantra:  "from-purple-950/60 border-purple-800/40 hover:border-purple-600/60",
  default: "from-indigo-950/60 border-indigo-800/40 hover:border-indigo-600/60",
};

const CHAMBER_TEXT: Record<string, string> = {
  shiva:   "text-sky-300",
  advaita: "text-violet-300",
  krishna: "text-amber-300",
  devi:    "text-rose-300",
  hanuman: "text-orange-300",
  buddha:  "text-stone-300",
  vedic:   "text-yellow-300",
  bhakti:  "text-amber-300",
  mantra:  "text-purple-300",
  default: "text-indigo-300",
};

const CHAMBER_DOT: Record<string, string> = {
  shiva:   "bg-sky-400",
  advaita: "bg-violet-400",
  krishna: "bg-amber-400",
  devi:    "bg-rose-400",
  hanuman: "bg-orange-400",
  buddha:  "bg-stone-400",
  vedic:   "bg-yellow-400",
  bhakti:  "bg-amber-400",
  mantra:  "bg-purple-400",
  default: "bg-indigo-400",
};

// ─── Note type Nepali labels ───────────────────────────────────────────────────
const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  reflection:  "विचार",
  shloka:      "श्लोक",
  mantra:      "मन्त्र",
  prayer:      "प्रार्थना",
  dream:       "स्वप्न",
  teaching:    "शिक्षा",
  bhajan_note: "भजन",
  gratitude:   "कृतज्ञता",
  question:    "जिज्ञासा",
  insight:     "अन्तर्दृष्टि",
};

const NOTE_TYPES = Object.keys(NOTE_TYPE_LABELS) as NoteType[];

// ─── Mood Nepali labels ────────────────────────────────────────────────────────
const MOOD_LABELS: Record<string, string> = {
  calm:        "शान्त",
  elevated:    "उन्नत",
  grateful:    "कृतज्ञ",
  questioning: "जिज्ञासु",
  turbulent:   "विचलित",
};

// ─── DB note shape ─────────────────────────────────────────────────────────────
type NoteDoc = TempleNote & { id: string };

// ─── Safe fetch helper ─────────────────────────────────────────────────────────
const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[temple] read failed:", e?.code ?? e); return fb; });

// ─── Empty landing ─────────────────────────────────────────────────────────────
function EmptyChamber({ chamberName }: { chamberName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4 opacity-30">🙏</div>
      <p className="text-zinc-600 text-sm">{chamberName} — अहिले रिक्त छ</p>
      <p className="text-zinc-700 text-xs mt-1">पहिलो विचार थप्नुहोस्</p>
    </div>
  );
}

// ─── Note card ─────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  accent,
  onEdit,
  onDelete,
}: {
  note: NoteDoc;
  accent: string;
  onEdit: (n: NoteDoc) => void;
  onDelete: (id: string) => void;
}) {
  const date = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString("ne-NP", { year: "numeric", month: "short", day: "numeric" })
    : "";

  return (
    <div className={`rounded-2xl border bg-gradient-to-b ${accent} p-5 space-y-3 transition-all duration-300`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
            {NOTE_TYPE_LABELS[note.type] ?? note.type}
          </span>
          {note.mood && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-500 border border-white/10">
              {MOOD_LABELS[note.mood] ?? note.mood}
            </span>
          )}
          {note.title && (
            <span className="text-sm font-medium text-zinc-200">{note.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(note)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors text-xs"
          >
            सम्पादन
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="text-zinc-700 hover:text-red-400 transition-colors text-xs"
          >
            मेट्नुहोस्
          </button>
        </div>
      </div>

      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{note.body}</p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded bg-white/5">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {date && <p className="text-[10px] text-zinc-700">{date}</p>}
    </div>
  );
}

// ─── Note editor overlay ───────────────────────────────────────────────────────
function NoteEditor({
  chamberId,
  chamberName,
  accentText,
  editing,
  onSave,
  onClose,
}: {
  chamberId: string;
  chamberName: string;
  accentText: string;
  editing: NoteDoc | null;
  onSave: (data: Omit<TempleNote, "ownerId" | "createdAt" | "updatedAt" | "isPrivate">) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType]   = useState<NoteType>(editing?.type ?? "reflection");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody]   = useState(editing?.body ?? "");
  const [mood, setMood]   = useState<string>(editing?.mood ?? "");
  const [tags, setTags]   = useState(editing?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    await onSave({
      chamberId,
      type,
      title: title.trim() || undefined,
      body:  body.trim(),
      mood:  (mood || undefined) as TempleNote["mood"],
      tags:  tags.split(",").map(t => t.trim()).filter(Boolean),
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg bg-[#0a0a1a] border border-white/10 rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${accentText}`}>
            {editing ? "विचार सम्पादन" : `${chamberName} — नयाँ लेखन`}
          </h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type selector */}
          <div className="flex flex-wrap gap-1.5">
            {NOTE_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  type === t
                    ? "bg-white/10 border-white/30 text-white"
                    : "border-white/10 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {NOTE_TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Title (optional) */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="शीर्षक (ऐच्छिक)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/20"
          />

          {/* Body */}
          <textarea
            ref={textRef}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="यहाँ लेख्नुहोस्..."
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none leading-relaxed"
            required
          />

          {/* Mood */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(MOOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setMood(mood === key ? "" : key)}
                className={`text-xs px-3 py-1 rounded-full border transition-all ${
                  mood === key
                    ? "bg-white/10 border-white/30 text-white"
                    : "border-white/10 text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tags */}
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="ट्याग — अल्पविराम (,) ले छुट्याउनुहोस्"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-zinc-400 placeholder-zinc-700 focus:outline-none focus:border-white/20"
          />

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
            >
              रद्द गर्नुहोस्
            </button>
            <button
              type="submit"
              disabled={saving || !body.trim()}
              className="flex-1 py-3 rounded-xl bg-white/10 border border-white/20 text-zinc-200 text-sm font-medium hover:bg-white/15 transition-all disabled:opacity-40"
            >
              {saving ? "सुरक्षित..." : "सुरक्षित गर्नुहोस्"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Chamber view ──────────────────────────────────────────────────────────────
function ChamberView({
  chamberId,
  uid,
  onBack,
}: {
  chamberId: string;
  uid: string;
  onBack: () => void;
}) {
  const chamber    = SACRED_CHAMBERS.find(c => c.name.toLowerCase().replace(/\s+/g, "-") === chamberId)
                  ?? SACRED_CHAMBERS[0];
  const theme      = chamber?.theme ?? "default";
  const accent     = CHAMBER_ACCENT[theme] ?? CHAMBER_ACCENT.default;
  const accentText = CHAMBER_TEXT[theme] ?? CHAMBER_TEXT.default;
  const accentDot  = CHAMBER_DOT[theme] ?? CHAMBER_DOT.default;

  const [notes, setNotes]         = useState<NoteDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDoc | null>(null);

  async function loadNotes() {
    setLoading(true);
    const snap = await safe(
      getDocs(query(
        collection(db, "temple_notes"),
        where("ownerId", "==", uid),
        where("chamberId", "==", chamberId),
        orderBy("createdAt", "desc"),
        limit(100),
      )),
      null,
    );
    if (snap) {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as NoteDoc)));
    }
    setLoading(false);
  }

  useEffect(() => { void loadNotes(); }, [chamberId, uid]);

  async function handleSave(data: Omit<TempleNote, "ownerId" | "createdAt" | "updatedAt" | "isPrivate">) {
    const now = new Date().toISOString();
    if (editingNote) {
      await updateDoc(doc(db, "temple_notes", editingNote.id), {
        ...data,
        updatedAt: now,
      });
    } else {
      await addDoc(collection(db, "temple_notes"), {
        ...data,
        ownerId:   uid,
        isPrivate: true as const,
        createdAt: now,
        updatedAt: now,
      });
    }
    setShowEditor(false);
    setEditingNote(null);
    void loadNotes();
  }

  async function handleDelete(id: string) {
    if (!confirm("यो विचार मेट्ने?")) return;
    await deleteDoc(doc(db, "temple_notes", id));
    void loadNotes();
  }

  function openEdit(note: NoteDoc) {
    setEditingNote(note);
    setShowEditor(true);
  }

  function openNew() {
    setEditingNote(null);
    setShowEditor(true);
  }

  return (
    <div className="min-h-screen bg-[#070714]">
      {/* Header */}
      <div className="px-6 pt-8 pb-6 border-b border-white/5">
        <button onClick={onBack} className="text-zinc-600 hover:text-zinc-400 text-xs mb-6 flex items-center gap-1.5 transition-colors">
          ← मन्दिर
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{chamber?.icon}</span>
            <div>
              <h1 className={`text-xl font-semibold ${accentText}`}>{chamber?.nameNepali}</h1>
              <p className="text-zinc-600 text-xs mt-0.5">{chamber?.nameSanskrit && chamber.nameSanskrit !== chamber.nameNepali ? chamber.nameSanskrit : ""}</p>
              <p className="text-zinc-500 text-xs mt-1 max-w-xs">{chamber?.description}</p>
            </div>
          </div>
          <button
            onClick={openNew}
            className={`shrink-0 text-xs px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200 hover:bg-white/10 transition-all`}
          >
            + लेख्नुहोस्
          </button>
        </div>
      </div>

      {/* Notes */}
      <div className="px-6 py-6 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className={`w-2 h-2 rounded-full ${accentDot} animate-pulse`} />
          </div>
        ) : notes.length === 0 ? (
          <EmptyChamber chamberName={chamber?.nameNepali ?? chamberId} />
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                accent={accent}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <NoteEditor
          chamberId={chamberId}
          chamberName={chamber?.nameNepali ?? chamberId}
          accentText={accentText}
          editing={editingNote}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}

// ─── Landing — chamber grid ────────────────────────────────────────────────────
function TempleLanding({ uid, onEnter }: { uid: string; onEnter: (id: string) => void }) {
  const [noteCounts, setNoteCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadCounts() {
      const snap = await safe(
        getDocs(query(
          collection(db, "temple_notes"),
          where("ownerId", "==", uid),
          limit(500),
        )),
        null,
      );
      if (!snap) return;
      const counts: Record<string, number> = {};
      snap.docs.forEach(d => {
        const chamberId = (d.data() as Record<string, unknown>).chamberId as string | undefined;
        if (chamberId) counts[chamberId] = (counts[chamberId] ?? 0) + 1;
      });
      setNoteCounts(counts);
    }
    void loadCounts();
  }, [uid]);

  return (
    <div className="min-h-screen bg-[#070714] px-6 py-12">
      {/* OM Symbol header */}
      <div className="text-center mb-14">
        <div className="text-6xl mb-4 opacity-60 select-none">ॐ</div>
        <h1 className="text-zinc-300 text-lg font-light tracking-widest">मन्दिर</h1>
        <p className="text-zinc-600 text-xs mt-2 tracking-wide">व्यक्तिगत आध्यात्मिक अभिलेखालय</p>
      </div>

      {/* Chamber grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
        {SACRED_CHAMBERS.map(chamber => {
          const chamberId = chamber.name.toLowerCase().replace(/\s+/g, "-");
          const theme     = chamber.theme ?? "default";
          const accent    = CHAMBER_ACCENT[theme] ?? CHAMBER_ACCENT.default;
          const textColor = CHAMBER_TEXT[theme] ?? CHAMBER_TEXT.default;
          const count     = noteCounts[chamberId] ?? 0;

          return (
            <button
              key={chamberId}
              onClick={() => onEnter(chamberId)}
              className={`group relative flex flex-col items-start p-4 rounded-2xl border bg-gradient-to-b ${accent} transition-all duration-300 text-left`}
            >
              <span className="text-2xl mb-3">{chamber.icon}</span>
              <span className={`text-sm font-medium ${textColor}`}>{chamber.nameNepali}</span>
              {chamber.nameSanskrit && chamber.nameSanskrit !== chamber.nameNepali && (
                <span className="text-[10px] text-zinc-600 mt-0.5">{chamber.nameSanskrit}</span>
              )}
              {count > 0 && (
                <span className="absolute top-3 right-3 text-[10px] text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Dictionary placeholder */}
      <div className="max-w-3xl mx-auto mt-10">
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-lg">📿</span>
            <span className="text-zinc-400 text-sm">संस्कृत शब्दकोश</span>
            <span className="text-[10px] text-zinc-700 px-2 py-0.5 rounded-full border border-white/5">Phase 3</span>
          </div>
          <p className="text-zinc-600 text-xs leading-relaxed">
            धर्म · मोक्ष · आत्मा · ब्रह्म · भक्ति · कर्म — Monier-Williams स्रोत सहित शब्दार्थ संरक्षण।
            तेस्रो चरणमा उपलब्ध हुनेछ।
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────────
export default function TempleClient() {
  const { user, loading, isOwner } = useVaultAuth();
  const [activeChamber, setActiveChamber] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070714] flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
      </div>
    );
  }

  if (!isOwner || !user) {
    return (
      <div className="min-h-screen bg-[#070714] flex items-center justify-center">
        <p className="text-zinc-600 text-sm">प्रवेश निषेध</p>
      </div>
    );
  }

  if (activeChamber) {
    return (
      <ChamberView
        chamberId={activeChamber}
        uid={user.uid}
        onBack={() => setActiveChamber(null)}
      />
    );
  }

  return <TempleLanding uid={user.uid} onEnter={setActiveChamber} />;
}
