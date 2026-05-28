"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, query, where, orderBy, limit,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import type { TempleNote, NoteType, TempleVisibility } from "../../../lib/types/temple-vault";
import { SACRED_CHAMBERS } from "../../../lib/types/temple-vault";
import { CharacterIntelligencePanel } from "../../../components/vault/temple/CharacterIntelligencePanel";

type ActiveTab = "mantra" | "charitra";

// ─── Chamber accent palette ────────────────────────────────────────────────────

const CHAMBER_ACCENT: Record<string, string> = {
  shiva:   "from-sky-950/50 border-sky-900/50 hover:border-sky-700/60",
  advaita: "from-violet-950/50 border-violet-900/50 hover:border-violet-700/60",
  krishna: "from-amber-950/50 border-amber-900/50 hover:border-amber-700/60",
  devi:    "from-rose-950/50 border-rose-900/50 hover:border-rose-700/60",
  hanuman: "from-orange-950/50 border-orange-900/50 hover:border-orange-700/60",
  buddha:  "from-stone-900/50 border-stone-800/50 hover:border-stone-600/60",
  vedic:   "from-yellow-950/50 border-yellow-900/50 hover:border-yellow-700/60",
  bhakti:  "from-amber-950/50 border-amber-900/50 hover:border-amber-700/60",
  mantra:  "from-purple-950/50 border-purple-900/50 hover:border-purple-700/60",
  default: "from-indigo-950/50 border-indigo-900/50 hover:border-indigo-700/60",
};

const CHAMBER_TEXT: Record<string, string> = {
  shiva:   "text-sky-300",
  advaita: "text-violet-300",
  krishna: "text-amber-300",
  devi:    "text-rose-300",
  hanuman: "text-orange-300",
  buddha:  "text-stone-300",
  vedic:   "text-yellow-300",
  bhakti:  "text-amber-400",
  mantra:  "text-purple-300",
  default: "text-indigo-300",
};

const CHAMBER_DOT: Record<string, string> = {
  shiva:   "bg-sky-500",
  advaita: "bg-violet-500",
  krishna: "bg-amber-500",
  devi:    "bg-rose-500",
  hanuman: "bg-orange-500",
  buddha:  "bg-stone-500",
  vedic:   "bg-yellow-500",
  bhakti:  "bg-amber-500",
  mantra:  "bg-purple-500",
  default: "bg-indigo-500",
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

const MOOD_LABELS: Record<string, string> = {
  calm:        "शान्त",
  elevated:    "उन्नत",
  grateful:    "कृतज्ञ",
  questioning: "जिज्ञासु",
  turbulent:   "विचलित",
};

// ─── Chamber-specific seed inspiration (shown only in empty chambers) ──────────

const SEED_PROMPTS: Partial<Record<string, { icon: string; lines: string[] }>> = {
  "shiva": {
    icon: "🕉",
    lines: [
      "ॐ नमः शिवाय",
      "शिवको उपस्थिति कहिले अनुभव गर्नुभयो?",
      "एक विचार, एक श्लोक, वा एक मन्त्रबाट सुरु गर्नुहोस्।",
    ],
  },
  "adi-shankaracharya": {
    icon: "📿",
    lines: [
      "अहं ब्रह्मास्मि",
      "अद्वैत दर्शन कसरी तपाईंको दृष्टिलाई बदल्छ?",
      "भज गोविन्दम् वा विवेकचूडामणिको कुनै पङ्क्ति यहाँ राख्नुहोस्।",
    ],
  },
  "bhajans": {
    icon: "🎵",
    lines: [
      "मीराबाई · कबीर · तुकाराम · सूरदास",
      "हृदयमा बसेको कुनै भजन वा कीर्तन यहाँ संरक्षण गर्नुहोस्।",
      "संगीत नभए पनि शब्द नै पर्याप्त छ।",
    ],
  },
};

// ─── Visibility indicator ─────────────────────────────────────────────────────
// private   = no indicator (default, invisible)
// review    = small amber dot (founder flagged as "maybe share someday")
// published = small green dot (a bhakti_atom has been created)

const VISIBILITY_DOT: Record<TempleVisibility, string | null> = {
  private:   null,
  review:    "bg-amber-500",
  published: "bg-emerald-500",
};

const VISIBILITY_LABEL: Record<TempleVisibility, string> = {
  private:   "निजी",
  review:    "समीक्षा",
  published: "प्रकाशित",
};

// ─── DB note shape ─────────────────────────────────────────────────────────────

type NoteDoc = TempleNote & { id: string };

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[temple] read failed:", e?.code ?? e); return fb; });

// ─── Empty chamber with optional seed prompt ───────────────────────────────────

function EmptyChamber({
  chamberId,
  chamberName,
  accentText,
  onWrite,
}: {
  chamberId: string;
  chamberName: string;
  accentText: string;
  onWrite: () => void;
}) {
  const seed = SEED_PROMPTS[chamberId];

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className="text-5xl mb-6 opacity-20 select-none">{seed?.icon ?? "🙏"}</div>

      {seed ? (
        <div className="space-y-2 mb-8">
          <p className={`text-base font-light tracking-wider ${accentText} opacity-70`}>
            {seed.lines[0]}
          </p>
          {seed.lines.slice(1).map((line, i) => (
            <p key={i} className="text-zinc-600 text-xs leading-relaxed max-w-xs mx-auto">
              {line}
            </p>
          ))}
        </div>
      ) : (
        <div className="space-y-1 mb-8">
          <p className="text-zinc-600 text-sm">{chamberName} — अहिले रिक्त छ</p>
          <p className="text-zinc-700 text-xs">शान्त मनले सुरु गर्नुहोस्</p>
        </div>
      )}

      <button
        onClick={onWrite}
        className={`text-xs px-5 py-2.5 rounded-full border border-white/10 bg-white/[0.03] ${accentText} opacity-60 hover:opacity-100 transition-all duration-500`}
      >
        लेख्नुहोस्
      </button>
    </div>
  );
}

// ─── Note card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note,
  accentText,
  onEdit,
  onDelete,
  onVisibilityChange,
}: {
  note: NoteDoc;
  accentText: string;
  onEdit: (n: NoteDoc) => void;
  onDelete: (id: string) => void;
  onVisibilityChange: (id: string, v: TempleVisibility) => void;
}) {
  const date = note.createdAt
    ? new Date(note.createdAt).toLocaleDateString("ne-NP", {
        year: "numeric", month: "long", day: "numeric",
      })
    : "";

  const vis     = note.visibility ?? "private";
  const dot     = VISIBILITY_DOT[vis];
  const isReview    = vis === "review";
  const isPublished = vis === "published";

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 space-y-3 transition-all duration-500 hover:bg-white/[0.035]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full bg-white/5 ${accentText} opacity-70 border border-white/[0.08] shrink-0`}>
            {NOTE_TYPE_LABELS[note.type] ?? note.type}
          </span>
          {note.mood && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-600 border border-white/[0.06] shrink-0">
              {MOOD_LABELS[note.mood] ?? note.mood}
            </span>
          )}
          {note.title && (
            <span className="text-sm font-medium text-zinc-200 truncate">{note.title}</span>
          )}
          {/* Visibility dot — only shown for review/published */}
          {dot && (
            <span
              className={`shrink-0 w-1.5 h-1.5 rounded-full ${dot} opacity-70`}
              title={VISIBILITY_LABEL[vis]}
            />
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Visibility toggle — only private notes can be marked for review */}
          {!isPublished && (
            <button
              onClick={() => onVisibilityChange(note.id, isReview ? "private" : "review")}
              className={`text-[10px] transition-colors duration-300 ${
                isReview
                  ? "text-amber-700 hover:text-amber-500"
                  : "text-zinc-800 hover:text-zinc-600"
              }`}
              title={isReview ? "निजीमा फर्काउनुहोस्" : "समीक्षाको लागि चिह्नित गर्नुहोस्"}
            >
              {isReview ? "निजी ←" : "→ समीक्षा"}
            </button>
          )}
          <button
            onClick={() => onEdit(note)}
            className="text-zinc-700 hover:text-zinc-400 transition-colors duration-300 text-[11px]"
          >
            सम्पादन
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="text-zinc-800 hover:text-zinc-500 transition-colors duration-300 text-[11px]"
          >
            ✕
          </button>
        </div>
      </div>

      <p className="text-zinc-300 text-sm leading-[1.8] whitespace-pre-wrap">{note.body}</p>

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {note.tags.map(tag => (
            <span key={tag} className="text-[10px] text-zinc-700 px-1.5 py-0.5 rounded bg-white/[0.03]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {date && (
        <p className="text-[10px] text-zinc-800 pt-1">{date}</p>
      )}
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
  onSave: (data: Omit<TempleNote, "ownerId" | "createdAt" | "updatedAt" | "visibility">) => Promise<void>;
  onClose: () => void;
}) {
  const [type,   setType]   = useState<NoteType>(editing?.type ?? "reflection");
  const [title,  setTitle]  = useState(editing?.title ?? "");
  const [body,   setBody]   = useState(editing?.body ?? "");
  const [mood,   setMood]   = useState<string>(editing?.mood ?? "");
  const [tags,   setTags]   = useState((editing?.tags ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // small delay so the sheet slides in before focus
    const t = setTimeout(() => textRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      await onSave({
        chamberId,
        type,
        title: title.trim() || undefined,
        body:  body.trim(),
        mood:  (mood || undefined) as TempleNote["mood"],
        tags:  tags.split(",").map(t => t.trim()).filter(Boolean),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-lg bg-[#09091a] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Handle bar for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-white/10" />
        </div>

        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-white/[0.06]">
          <h3 className={`text-sm font-medium ${accentText} opacity-80`}>
            {editing ? "विचार सम्पादन" : `${chamberName} — नयाँ लेखन`}
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          <form id="note-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Note type */}
            <div className="flex flex-wrap gap-1.5">
              {NOTE_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-300 ${
                    type === t
                      ? `bg-white/[0.08] border-white/20 ${accentText}`
                      : "border-white/[0.06] text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {NOTE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>

            {/* Title */}
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="शीर्षक (ऐच्छिक)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
            />

            {/* Body */}
            <textarea
              ref={textRef}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="यहाँ लेख्नुहोस्…"
              rows={5}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-none leading-[1.8] transition-colors"
              required
            />

            {/* Mood */}
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(MOOD_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMood(mood === key ? "" : key)}
                  className={`text-[11px] px-3 py-1.5 rounded-full border transition-all duration-300 ${
                    mood === key
                      ? "bg-white/[0.08] border-white/20 text-zinc-300"
                      : "border-white/[0.06] text-zinc-700 hover:text-zinc-500"
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
              placeholder="ट्याग (अल्पविरामले छुट्याउनुहोस्)"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-xs text-zinc-500 placeholder-zinc-700 focus:outline-none focus:border-white/15 transition-colors"
            />
          </form>
        </div>

        {/* Actions — always visible */}
        <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/[0.08] text-zinc-600 text-sm hover:text-zinc-400 transition-colors duration-300"
          >
            रद्द
          </button>
          <button
            form="note-form"
            type="submit"
            disabled={saving || !body.trim()}
            className={`flex-1 py-3 rounded-xl border border-white/10 bg-white/[0.06] text-sm font-medium transition-all duration-300 disabled:opacity-30 ${accentText}`}
          >
            {saving ? "…" : "सुरक्षित"}
          </button>
        </div>
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
  const theme      = chamber.theme ?? "default";
  const accentText = CHAMBER_TEXT[theme] ?? CHAMBER_TEXT.default;
  const accentDot  = CHAMBER_DOT[theme] ?? CHAMBER_DOT.default;

  const [notes,       setNotes]       = useState<NoteDoc[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showEditor,  setShowEditor]  = useState(false);
  const [editingNote, setEditingNote] = useState<NoteDoc | null>(null);
  const [typeFilter,  setTypeFilter]  = useState<NoteType | "all">("all");

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

  async function handleSave(data: Omit<TempleNote, "ownerId" | "createdAt" | "updatedAt" | "visibility">) {
    const now = new Date().toISOString();
    if (editingNote) {
      await updateDoc(doc(db, "temple_notes", editingNote.id), { ...data, updatedAt: now });
    } else {
      await addDoc(collection(db, "temple_notes"), {
        ...data,
        ownerId:    uid,
        visibility: "private" as TempleVisibility,
        createdAt:  now,
        updatedAt:  now,
      });
    }
    setShowEditor(false);
    setEditingNote(null);
    void loadNotes();
  }

  async function handleDelete(id: string) {
    if (!confirm("यो लेखन मेट्ने?")) return;
    await deleteDoc(doc(db, "temple_notes", id));
    void loadNotes();
  }

  async function handleVisibilityChange(id: string, v: TempleVisibility) {
    await updateDoc(doc(db, "temple_notes", id), {
      visibility: v,
      updatedAt:  new Date().toISOString(),
    });
    setNotes(prev => prev.map(n => n.id === id ? { ...n, visibility: v } : n));
  }

  function openEdit(note: NoteDoc) { setEditingNote(note); setShowEditor(true); }
  function openNew()               { setEditingNote(null); setShowEditor(true); }

  // Types that actually exist in this chamber (for filter pills)
  const presentTypes = Array.from(new Set(notes.map(n => n.type)));

  const visibleNotes = typeFilter === "all"
    ? notes
    : notes.filter(n => n.type === typeFilter);

  return (
    <div className="min-h-screen bg-[#070714]">
      {/* Header */}
      <div className="px-5 sm:px-8 pt-8 pb-6 border-b border-white/[0.04]">
        <button
          onClick={onBack}
          className="text-zinc-700 hover:text-zinc-500 text-xs mb-7 flex items-center gap-2 transition-colors duration-300"
        >
          ← मन्दिर
        </button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <span className="text-3xl sm:text-4xl shrink-0 mt-0.5">{chamber.icon}</span>
            <div className="min-w-0">
              <h1 className={`text-lg sm:text-xl font-semibold ${accentText}`}>
                {chamber.nameNepali}
              </h1>
              {chamber.nameSanskrit && chamber.nameSanskrit !== chamber.nameNepali && (
                <p className="text-zinc-700 text-[11px] mt-0.5">{chamber.nameSanskrit}</p>
              )}
              <p className="text-zinc-600 text-xs mt-1.5 leading-relaxed max-w-sm">
                {chamber.description}
              </p>
            </div>
          </div>

          <button
            onClick={openNew}
            className={`shrink-0 text-xs px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] ${accentText} opacity-60 hover:opacity-100 transition-all duration-500`}
          >
            लेख्नुहोस्
          </button>
        </div>
      </div>

      {/* Type filter — only shown when multiple types exist */}
      {presentTypes.length > 1 && (
        <div className="px-5 sm:px-8 pt-4 pb-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setTypeFilter("all")}
            className={`text-[11px] px-3 py-1 rounded-full border transition-all duration-300 ${
              typeFilter === "all"
                ? `border-white/15 bg-white/[0.06] ${accentText}`
                : "border-white/[0.05] text-zinc-700 hover:text-zinc-500"
            }`}
          >
            सबै
          </button>
          {presentTypes.map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t === typeFilter ? "all" : t)}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all duration-300 ${
                typeFilter === t
                  ? `border-white/15 bg-white/[0.06] ${accentText}`
                  : "border-white/[0.05] text-zinc-700 hover:text-zinc-500"
              }`}
            >
              {NOTE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      )}

      {/* Notes list */}
      <div className="px-5 sm:px-8 py-6 max-w-2xl">
        {loading ? (
          <div className="flex items-center justify-center py-28">
            <div className={`w-1.5 h-1.5 rounded-full ${accentDot} opacity-50 animate-pulse`} />
          </div>
        ) : notes.length === 0 ? (
          <EmptyChamber
            chamberId={chamberId}
            chamberName={chamber.nameNepali}
            accentText={accentText}
            onWrite={openNew}
          />
        ) : visibleNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-zinc-700 text-xs">यस प्रकारको कुनै लेखन छैन</p>
            <button
              onClick={() => setTypeFilter("all")}
              className="text-zinc-700 hover:text-zinc-500 text-xs mt-3 transition-colors"
            >
              सबै हेर्नुहोस् →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                accentText={accentText}
                onEdit={openEdit}
                onDelete={handleDelete}
                onVisibilityChange={handleVisibilityChange}
              />
            ))}
          </div>
        )}
      </div>

      {showEditor && (
        <NoteEditor
          chamberId={chamberId}
          chamberName={chamber.nameNepali}
          accentText={accentText}
          editing={editingNote}
          onSave={handleSave}
          onClose={() => { setShowEditor(false); setEditingNote(null); }}
        />
      )}
    </div>
  );
}

// ─── Landing — chamber sanctuary ──────────────────────────────────────────────

function TempleLanding({ uid, onEnter }: { uid: string; onEnter: (id: string) => void }) {
  const [hasNotes, setHasNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadPresence() {
      const snap = await safe(
        getDocs(query(
          collection(db, "temple_notes"),
          where("ownerId", "==", uid),
          limit(500),
        )),
        null,
      );
      if (!snap) return;
      const present = new Set<string>();
      snap.docs.forEach(d => {
        const cid = (d.data() as Record<string, unknown>).chamberId as string | undefined;
        if (cid) present.add(cid);
      });
      setHasNotes(present);
    }
    void loadPresence();
  }, [uid]);

  return (
    <div className="px-5 sm:px-8 py-14">

      {/* OM header — breathing room, not a banner */}
      <div className="text-center mb-16">
        <div
          className="text-7xl mb-5 opacity-40 select-none"
          style={{ fontFamily: "serif", lineHeight: 1 }}
        >
          ॐ
        </div>
        <h1 className="text-zinc-400 text-base font-light tracking-[0.25em]">मन्दिर</h1>
        <p className="text-zinc-700 text-xs mt-2 tracking-widest">व्यक्तिगत आध्यात्मिक अभिलेखालय</p>
      </div>

      {/* Chambers — 2 columns on mobile, 3 on tablet, contained max-width */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-xl mx-auto">
        {SACRED_CHAMBERS.map(chamber => {
          const chamberId = chamber.name.toLowerCase().replace(/\s+/g, "-");
          const theme     = chamber.theme ?? "default";
          const accent    = CHAMBER_ACCENT[theme] ?? CHAMBER_ACCENT.default;
          const textColor = CHAMBER_TEXT[theme] ?? CHAMBER_TEXT.default;
          const dotColor  = CHAMBER_DOT[theme] ?? CHAMBER_DOT.default;
          const active    = hasNotes.has(chamberId);

          return (
            <button
              key={chamberId}
              onClick={() => onEnter(chamberId)}
              className={`group relative flex flex-col items-start p-5 rounded-2xl border bg-gradient-to-b ${accent} transition-all duration-500 text-left`}
            >
              <span className="text-3xl mb-4 transition-transform duration-500 group-hover:scale-110">
                {chamber.icon}
              </span>
              <span className={`text-sm font-medium leading-snug ${textColor}`}>
                {chamber.nameNepali}
              </span>
              {chamber.nameSanskrit && chamber.nameSanskrit !== chamber.nameNepali && (
                <span className="text-[10px] text-zinc-700 mt-0.5 leading-tight">
                  {chamber.nameSanskrit}
                </span>
              )}

              {/* Presence dot — just shows "has content", no count */}
              {active && (
                <span
                  className={`absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full ${dotColor} opacity-60`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Spiritual dictionary — Phase 3 placeholder */}
      <div className="max-w-xl mx-auto mt-12">
        <div className="rounded-2xl border border-white/[0.04] bg-white/[0.015] p-5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-base opacity-60">📿</span>
            <span className="text-zinc-500 text-xs tracking-wide">संस्कृत शब्दकोश</span>
            <span className="text-[10px] text-zinc-800 px-2 py-0.5 rounded-full border border-white/[0.04]">
              Phase 3
            </span>
          </div>
          <p className="text-zinc-700 text-xs leading-[1.8]">
            धर्म · मोक्ष · आत्मा · ब्रह्म · भक्ति · कर्म
          </p>
          <p className="text-zinc-800 text-[11px] mt-1">
            Monier-Williams स्रोत सहित — तेस्रो चरणमा उपलब्ध
          </p>
        </div>
      </div>

    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function TempleClient() {
  const { user, loading, isOwner } = useVaultAuth();
  const [activeChamber, setActiveChamber] = useState<string | null>(null);
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("mantra");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070714] flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
      </div>
    );
  }

  if (!isOwner || !user) {
    return (
      <div className="min-h-screen bg-[#070714] flex items-center justify-center">
        <p className="text-zinc-800 text-sm">प्रवेश निषेध</p>
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

  return (
    <div className="min-h-screen bg-[#070714]">

      {/* Tab bar — मन्दिर (notes) ↔ चरित्र (intelligence graph) */}
      <div className="flex items-end justify-center gap-10 pt-5 border-b border-white/[0.03]">
        <button
          onClick={() => setActiveTab("mantra")}
          className={`pb-3 text-xs tracking-widest transition-colors duration-300 ${
            activeTab === "mantra"
              ? "text-zinc-400 border-b border-zinc-600"
              : "text-zinc-700 hover:text-zinc-500"
          }`}
        >
          मन्दिर
        </button>
        <button
          onClick={() => setActiveTab("charitra")}
          className={`pb-3 text-xs tracking-widest transition-colors duration-300 ${
            activeTab === "charitra"
              ? "text-zinc-400 border-b border-zinc-600"
              : "text-zinc-700 hover:text-zinc-500"
          }`}
        >
          चरित्र
        </button>
      </div>

      {activeTab === "mantra" ? (
        <TempleLanding uid={user.uid} onEnter={setActiveChamber} />
      ) : (
        <div className="px-5 sm:px-8 py-8">
          <CharacterIntelligencePanel ownerId={user.uid} />
        </div>
      )}
    </div>
  );
}
