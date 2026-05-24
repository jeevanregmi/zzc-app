"use client";

import { useState, useMemo, useEffect } from "react";
import { useVaultAuth }      from "../../../hooks/vault/useVaultAuth";
import { useFounderVision }  from "../../../hooks/vault/useFounderVision";
import type {
  FounderVisionEntry,
  FounderVisionInput,
  VisionEntryType,
  VisionVisibility,
  LetterRecipient,
} from "../../../lib/types/founder-vision";

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CFG: Record<VisionEntryType, { label: string; np: string; color: string; bg: string; border: string; dot: string }> = {
  "vision":           { label: "Vision",          np: "दृष्टि",    color: "text-violet-400",  bg: "bg-violet-950/40",  border: "border-violet-800",  dot: "#8b5cf6" },
  "letter":           { label: "Letter",           np: "पत्र",      color: "text-amber-400",   bg: "bg-amber-950/40",   border: "border-amber-800",   dot: "#f59e0b" },
  "architecture":     { label: "Architecture",     np: "संरचना",    color: "text-cyan-400",    bg: "bg-cyan-950/40",    border: "border-cyan-800",    dot: "#06b6d4" },
  "future-feature":   { label: "Future Feature",   np: "भविष्य",    color: "text-green-400",   bg: "bg-green-950/40",   border: "border-green-800",   dot: "#4ade80" },
  "policy-thought":   { label: "Policy Thought",   np: "नीति",      color: "text-blue-400",    bg: "bg-blue-950/40",    border: "border-blue-800",    dot: "#60a5fa" },
  "civic-idea":       { label: "Civic Idea",       np: "सिभिक",     color: "text-emerald-400", bg: "bg-emerald-950/40", border: "border-emerald-800", dot: "#34d399" },
  "philosophy":       { label: "Philosophy",       np: "दर्शन",     color: "text-purple-400",  bg: "bg-purple-950/40",  border: "border-purple-800",  dot: "#a78bfa" },
  "roadmap":          { label: "Roadmap",          np: "रोडम्याप",  color: "text-orange-400",  bg: "bg-orange-950/40",  border: "border-orange-800",  dot: "#fb923c" },
  "emotional-moment": { label: "Emotional Moment", np: "भावना",     color: "text-rose-400",    bg: "bg-rose-950/40",    border: "border-rose-800",    dot: "#f43f5e" },
};

const VIS_CFG: Record<VisionVisibility, { label: string; tw: string }> = {
  "private":       { label: "Private",       tw: "text-zinc-400 bg-zinc-800 border-zinc-700" },
  "internal":      { label: "Internal",      tw: "text-amber-400 bg-amber-950 border-amber-800" },
  "future-public": { label: "Future Public", tw: "text-sky-400 bg-sky-950 border-sky-800" },
  "publishable":   { label: "Publishable",   tw: "text-green-400 bg-green-950 border-green-800" },
};

const LINKED_TREES = [
  { value: "",                 label: "— no tree —"          },
  { value: "constitution",     label: "Constitution Tree"     },
  { value: "economy",          label: "Economy Tree"          },
  { value: "development-plan", label: "Development Plan Tree" },
  { value: "governance",       label: "Governance Tree"       },
  { value: "budget",           label: "Budget Tree"           },
  { value: "news",             label: "News Tree"             },
  { value: "citizen",          label: "Citizen Tree"          },
];

const LETTER_RECIPIENTS: { value: LetterRecipient; label: string }[] = [
  { value: "future-self", label: "Future Self"       },
  { value: "pm",          label: "Prime Minister"    },
  { value: "citizens",    label: "Citizens of Nepal" },
  { value: "humanity",    label: "Humanity"          },
  { value: "team",        label: "Future Team"       },
  { value: "other",       label: "Other"             },
];

const MOOD_SUGGESTIONS = [
  "🔥 Determined", "🌱 Hopeful", "💡 Inspired", "🎯 Focused",
  "😤 Frustrated", "✨ Excited", "🤔 Reflective", "💪 Confident",
  "🌊 Overwhelmed", "🕊 Peaceful", "🌙 Contemplative", "⚡ Energised",
];

const DEFAULT_INPUT: FounderVisionInput = {
  title: "", body: "", type: "vision", mood: "", importance: 3,
  tags: [], visibility: "private", linkedTree: null, linkedBranch: null,
  letterRecipient: null, revisitAt: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function groupByMonth(entries: FounderVisionEntry[]) {
  const map = new Map<string, FounderVisionEntry[]>();
  for (const e of entries) {
    const d   = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ImportanceDots({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5" title={`Importance: ${n}/5`}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: "8px", color: i <= n ? "#f59e0b" : "#3f3f46" }}>●</span>
      ))}
    </div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="text-5xl mb-4">🌱</div>
      <h3 className="text-xl font-bold text-white mb-2">Vision Vault is empty</h3>
      <p className="text-zinc-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
        Your first thought becomes ZZC&apos;s institutional memory.<br />
        Record it — ideas, letters, architecture, philosophy.
      </p>
      <button
        onClick={onNew}
        className="bg-violet-700 hover:bg-violet-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
      >
        + Record First Vision
      </button>
    </div>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl flex items-start gap-2 ${
      type === "success"
        ? "bg-green-950 border border-green-800 text-green-300"
        : "bg-red-950 border border-red-800 text-red-300"
    }`}>
      <span className="shrink-0 mt-0.5">{type === "success" ? "✓" : "✗"}</span>
      <span className="leading-relaxed">{msg}</span>
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryCard({ entry, onEdit, onDelete }: {
  entry:    FounderVisionEntry;
  onEdit:   (e: FounderVisionEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded,   setExpanded]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const tc = TYPE_CFG[entry.type];
  const vc = VIS_CFG[entry.visibility];

  const today = new Date().toISOString().slice(0, 10);
  const revisitDue = entry.revisitAt && entry.revisitAt <= today;

  return (
    <div className="relative pl-4 pb-5" style={{ borderLeft: `2px solid ${tc.dot}` }}>
      {/* Timeline dot */}
      <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full"
           style={{ background: tc.dot, boxShadow: `0 0 7px ${tc.dot}88` }} />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">

        {/* Top badges */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${tc.bg} ${tc.color} ${tc.border}`}>
              {tc.np} · {tc.label}
            </span>
            {entry.type === "letter" && entry.letterRecipient && (
              <span className="text-xs text-zinc-500">
                To: <span className="text-amber-400 font-semibold">
                  {LETTER_RECIPIENTS.find(r => r.value === entry.letterRecipient)?.label ?? entry.letterRecipient}
                </span>
              </span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${vc.tw}`}>
              {vc.label}
            </span>
          </div>
          <ImportanceDots n={entry.importance} />
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-base leading-snug mb-1">
          {entry.type === "letter" && <span className="text-amber-400 mr-2">✉</span>}
          {entry.title}
        </h3>

        {entry.mood && (
          <p className="text-xs text-zinc-500 mb-3">{entry.mood}</p>
        )}

        {/* Body */}
        <div className={`text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap ${expanded ? "" : "line-clamp-3"}`}>
          {entry.body}
        </div>
        {entry.body.length > 220 && (
          <button onClick={() => setExpanded(p => !p)}
            className={`text-xs mt-1.5 font-semibold ${tc.color} hover:opacity-75 transition-opacity`}>
            {expanded ? "↑ Collapse" : "↓ Read full entry"}
          </button>
        )}

        {/* Tags */}
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {entry.tags.map(tag => (
              <span key={tag} className="text-xs text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full font-mono">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta + actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 gap-2 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-zinc-600 flex-wrap">
            <span>{fmt(entry.createdAt)}</span>
            {entry.linkedTree && (
              <span>🌳 {LINKED_TREES.find(t => t.value === entry.linkedTree)?.label ?? entry.linkedTree}</span>
            )}
            {entry.revisitAt && (
              <span className={revisitDue ? "text-amber-400 font-semibold" : "text-zinc-600"}>
                ⏰ {revisitDue ? "Revisit now · " : "Revisit "}{fmt(entry.revisitAt + "T00:00:00")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(entry)}
              className="text-xs text-zinc-600 hover:text-zinc-300 px-2 py-1 rounded-lg hover:bg-zinc-800 transition-colors">
              Edit
            </button>
            {confirming ? (
              <>
                <button onClick={() => { onDelete(entry.id); setConfirming(false); }}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-950/30 transition-colors">
                  Confirm delete
                </button>
                <button onClick={() => setConfirming(false)} className="text-xs text-zinc-600 px-1 py-1">
                  ✕
                </button>
              </>
            ) : (
              <button onClick={() => setConfirming(true)}
                className="text-xs text-zinc-700 hover:text-red-400 px-2 py-1 rounded-lg transition-colors">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────────────

function EntryForm({ initial, onSave, onCancel, saving, title }: {
  initial:  FounderVisionInput;
  onSave:   (input: FounderVisionInput) => Promise<void>;
  onCancel: () => void;
  saving:   boolean;
  title:    string;
}) {
  const [form,     setForm]     = useState<FounderVisionInput>(initial);
  const [tagInput, setTagInput] = useState(initial.tags.join(", "));

  function set<K extends keyof FounderVisionInput>(k: K, v: FounderVisionInput[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }

  async function handleSave() {
    const tags = tagInput
      .split(",")
      .map(t => t.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter(Boolean);
    await onSave({ ...form, tags });
  }

  const isLetter = form.type === "letter";

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-white font-bold text-lg">{title}</h2>
        <button onClick={onCancel} className="text-zinc-600 hover:text-zinc-300 text-lg leading-none">✕</button>
      </div>

      {/* Type selector */}
      <div className="mb-4">
        <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-2">Entry Type</label>
        <div className="flex flex-wrap gap-1.5">
          {(Object.entries(TYPE_CFG) as [VisionEntryType, typeof TYPE_CFG[VisionEntryType]][]).map(([type, cfg]) => (
            <button key={type} onClick={() => set("type", type)}
              className={`text-xs px-2.5 py-1 rounded-full border font-semibold transition-all ${
                form.type === type
                  ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                  : "text-zinc-600 border-zinc-800 hover:text-zinc-400 hover:border-zinc-700"
              }`}>
              {cfg.np} {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Letter recipient */}
      {isLetter && (
        <div className="mb-4 bg-amber-950/20 border border-amber-900/40 rounded-xl p-3">
          <label className="text-xs text-amber-400 font-bold block mb-2">✉ To:</label>
          <div className="flex flex-wrap gap-1.5">
            {LETTER_RECIPIENTS.map(r => (
              <button key={r.value} onClick={() => set("letterRecipient", r.value)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                  form.letterRecipient === r.value
                    ? "bg-amber-950 text-amber-300 border-amber-700"
                    : "text-zinc-600 border-zinc-800 hover:text-amber-400 hover:border-amber-900"
                }`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Title */}
      <div className="mb-3">
        <input type="text"
          placeholder={isLetter ? "Subject / Title…" : "Title — what is this thought?"}
          value={form.title}
          onChange={e => set("title", e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-semibold text-base placeholder-zinc-700 focus:outline-none focus:border-violet-600 transition-colors"
        />
      </div>

      {/* Body */}
      <div className="mb-4">
        <textarea rows={9}
          placeholder={
            isLetter
              ? "Dear [recipient],\n\nI write this from…"
              : "Write your thought, vision, idea, or insight.\n\nBe as detailed or as raw as you need. This is institutional memory — nothing is too small."
          }
          value={form.body}
          onChange={e => set("body", e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-300 text-sm placeholder-zinc-700 focus:outline-none focus:border-violet-600 resize-none leading-relaxed transition-colors"
        />
      </div>

      {/* Row: mood + importance + visibility */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Mood</label>
          <input list="mood-suggestions" type="text" placeholder="🔥 Determined…"
            value={form.mood}
            onChange={e => set("mood", e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-violet-600 transition-colors"
          />
          <datalist id="mood-suggestions">
            {MOOD_SUGGESTIONS.map(m => <option key={m} value={m} />)}
          </datalist>
        </div>

        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Importance</label>
          <div className="flex items-center gap-1 h-[38px]">
            {[1,2,3,4,5].map(n => (
              <button key={n} onClick={() => set("importance", n as 1|2|3|4|5)}
                className="text-2xl transition-all hover:scale-110"
                style={{ color: n <= form.importance ? "#f59e0b" : "#3f3f46" }}>
                ●
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Visibility</label>
          <select value={form.visibility} onChange={e => set("visibility", e.target.value as VisionVisibility)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-600">
            <option value="private">Private</option>
            <option value="internal">Internal</option>
            <option value="future-public">Future Public</option>
            <option value="publishable">Publishable</option>
          </select>
        </div>
      </div>

      {/* Row: tags + linked tree + revisit */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Tags</label>
          <input type="text" placeholder="civic, idea, education…"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-violet-600 transition-colors"
          />
        </div>
        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Linked Tree</label>
          <select value={form.linkedTree ?? ""} onChange={e => set("linkedTree", e.target.value || null)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-600">
            {LINKED_TREES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Revisit Date</label>
          <input type="date" value={form.revisitAt ?? ""}
            onChange={e => set("revisitAt", e.target.value || null)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-violet-600"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave}
          disabled={saving || !form.title.trim() || !form.body.trim()}
          className="bg-violet-700 hover:bg-violet-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
          {saving ? "Saving…" : "Save Entry"}
        </button>
        <button onClick={onCancel} className="text-zinc-500 hover:text-zinc-300 text-sm px-3 py-2.5 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function VisionClient() {
  const { user }                        = useVaultAuth();
  const { entries, loading, add, update, remove } = useFounderVision(user?.uid ?? null);

  const [showForm,   setShowForm]   = useState(false);
  const [editEntry,  setEditEntry]  = useState<FounderVisionEntry | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [filterType, setFilterType] = useState<VisionEntryType | "all">("all");
  const [filterVis,  setFilterVis]  = useState<VisionVisibility | "all">("all");
  const [viewMode,   setViewMode]   = useState<"timeline" | "letters">("timeline");
  const [toast,      setToast]      = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
  }

  const filtered = useMemo(() => {
    let list = entries;
    if (viewMode === "letters")  list = list.filter(e => e.type === "letter");
    if (filterType !== "all")    list = list.filter(e => e.type === filterType);
    if (filterVis  !== "all")    list = list.filter(e => e.visibility === filterVis);
    return list;
  }, [entries, filterType, filterVis, viewMode]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const letterCount  = entries.filter(e => e.type === "letter").length;
  const today        = new Date().toISOString().slice(0, 10);
  const revisitCount = entries.filter(e => e.revisitAt && e.revisitAt <= today).length;

  async function handleSave(input: FounderVisionInput) {
    if (!user) {
      showToast("Not signed in — please refresh and try again.", "error");
      return;
    }
    const payload = { ...input, ownerId: user.uid };
    console.log("[VisionVault] saving:", payload);
    setSaving(true);
    try {
      if (editEntry) {
        await update(editEntry.id, input);
        setEditEntry(null);
        showToast("Entry updated successfully.", "success");
      } else {
        await add(input, user.uid);
        setShowForm(false);
        showToast("Vision saved to institutional memory.", "success");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[VisionVault] save error:", err);
      showToast(`Save failed: ${msg}`, "error");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(e: FounderVisionEntry) {
    setEditEntry(e);
    setShowForm(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const formInitial: FounderVisionInput = editEntry ? {
    title: editEntry.title, body: editEntry.body, type: editEntry.type,
    mood: editEntry.mood, importance: editEntry.importance, tags: editEntry.tags,
    visibility: editEntry.visibility, linkedTree: editEntry.linkedTree,
    linkedBranch: editEntry.linkedBranch, letterRecipient: editEntry.letterRecipient,
    revisitAt: editEntry.revisitAt,
  } : DEFAULT_INPUT;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">🌱</span>
            <h1 className="text-2xl font-black text-white">Founder Vision Vault</h1>
          </div>
          <p className="text-zinc-500 text-sm">
            ZZC&apos;s institutional memory — ideas, letters, architecture, philosophy, civic dreams.
          </p>
          {!loading && entries.length > 0 && (
            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-600">
              <span><span className="text-white font-bold">{entries.length}</span> entries</span>
              {letterCount > 0 && (
                <span><span className="text-amber-400 font-bold">{letterCount}</span> letters</span>
              )}
              {revisitCount > 0 && (
                <span className="text-amber-500 font-semibold">⏰ {revisitCount} to revisit</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowForm(true); setEditEntry(null); }}
          className="bg-violet-700 hover:bg-violet-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors whitespace-nowrap shrink-0"
        >
          + New Entry
        </button>
      </div>

      {/* New entry form */}
      {showForm && !editEntry && (
        <EntryForm
          title="New Entry"
          initial={DEFAULT_INPUT}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
          saving={saving}
        />
      )}

      {/* Edit form */}
      {editEntry && (
        <EntryForm
          title={`Edit · ${editEntry.title}`}
          initial={formInitial}
          onSave={handleSave}
          onCancel={() => setEditEntry(null)}
          saving={saving}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16">
          <p className="text-zinc-600 text-sm">Loading vision vault…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && entries.length === 0 && !showForm && (
        <EmptyState onNew={() => setShowForm(true)} />
      )}

      {/* Content */}
      {!loading && entries.length > 0 && (
        <>
          {/* View + Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">

            {/* View mode */}
            <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => { setViewMode("timeline"); setFilterType("all"); }}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${
                  viewMode === "timeline" ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-white"
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => { setViewMode("letters"); setFilterType("all"); }}
                className={`text-xs px-3 py-1 rounded-md font-semibold transition-colors ${
                  viewMode === "letters" ? "bg-amber-900/60 text-amber-300" : "text-zinc-500 hover:text-white"
                }`}
              >
                ✉ Letters {letterCount > 0 && `(${letterCount})`}
              </button>
            </div>

            {/* Type filter (not shown in letters mode) */}
            {viewMode === "timeline" && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterType("all")}
                  className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                    filterType === "all" ? "bg-zinc-700 text-white border-zinc-600" : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                  }`}
                >
                  All
                </button>
                {(Object.entries(TYPE_CFG) as [VisionEntryType, typeof TYPE_CFG[VisionEntryType]][]).map(([type, cfg]) => (
                  <button key={type} onClick={() => setFilterType(type)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition-colors ${
                      filterType === type
                        ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                        : "text-zinc-600 border-zinc-800 hover:text-zinc-400"
                    }`}>
                    {cfg.np}
                  </button>
                ))}
              </div>
            )}

            {/* Visibility filter */}
            <div className="ml-auto">
              <select
                value={filterVis}
                onChange={e => setFilterVis(e.target.value as VisionVisibility | "all")}
                className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
              >
                <option value="all">All visibility</option>
                <option value="private">Private</option>
                <option value="internal">Internal</option>
                <option value="future-public">Future Public</option>
                <option value="publishable">Publishable</option>
              </select>
            </div>
          </div>

          {/* Letters mode header */}
          {viewMode === "letters" && (
            <div className="mb-5 p-4 bg-amber-950/20 border border-amber-900/30 rounded-xl">
              <p className="text-amber-400 font-semibold text-sm mb-0.5">✉ Letters to the Future</p>
              <p className="text-amber-700 text-xs">
                Letters to yourself, to Nepal&apos;s future leaders, to citizens, to humanity.
                Words written today that will matter tomorrow.
              </p>
            </div>
          )}

          {/* Timeline */}
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-sm text-center py-12">
              No entries match the current filter.
            </p>
          ) : (
            <div className="space-y-10">
              {grouped.map(([monthKey, monthEntries]) => (
                <div key={monthKey}>
                  {/* Month header */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest whitespace-nowrap">
                      {monthLabel(monthKey)}
                    </span>
                    <span className="text-xs text-zinc-700">{monthEntries.length}</span>
                    <div className="flex-1 border-t border-zinc-800/70" />
                  </div>

                  {/* Entries */}
                  <div className="ml-2 space-y-0">
                    {monthEntries.map(entry => (
                      <EntryCard
                        key={entry.id}
                        entry={entry}
                        onEdit={startEdit}
                        onDelete={id => remove(id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Type legend at bottom */}
      {!loading && entries.length > 0 && (
        <div className="mt-12 pt-6 border-t border-zinc-900">
          <p className="text-xs text-zinc-700 font-bold uppercase tracking-wider mb-3">Entry Types</p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(TYPE_CFG) as [VisionEntryType, typeof TYPE_CFG[VisionEntryType]][]).map(([type, cfg]) => {
              const count = entries.filter(e => e.type === type).length;
              return (
                <div key={type} className="flex items-center gap-1.5">
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                  <span className="text-xs text-zinc-600">{cfg.np} {cfg.label}</span>
                  {count > 0 && <span className="text-xs text-zinc-700 font-bold">{count}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
