"use client";

// Canonical Media Context — viewing and editing infrastructure.
//
// RULE: AI visual/media generation is BLOCKED unless this field is filled.
// This enforces the "no generation without grounding" principle from the
// Living Spiritual Intelligence architecture.
//
// The field stores: iconographic description + emotional tone + symbolic
// accuracy notes that ground any future media generation in canonical tradition.

import { useState } from "react";

interface Props {
  characterName: string;
  characterIcon: string;
  value:         string;       // current canonicalMediaContext
  onSave:        (text: string) => Promise<void>;
  readOnly?:     boolean;
}

const PLACEHOLDER = `उदाहरण:
${"—"} रूप: चन्द्र, भस्म, जटा, गङ्गा, त्रिशूल, डमरु, सर्प — यी सबै canonical हुन्
${"—"} भावना: गहन ध्यान वा तांडवको उग्रता — कुनै एक
${"—"} रस: रुद्र (उग्र) वा शान्त (ध्यानस्थ)
${"—"} रङ: भस्म-श्वेत, नीलकण्ठ नीलो
${"—"} प्रकाश: कम, रहस्यमय, दीपक वा चन्द्रमा मात्र

यो description भविष्यमा visual generation को एकमात्र आधार हुनेछ।`;

export function CanonicalMediaContextPanel({ characterName, characterIcon, value, onSave, readOnly }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [saving,  setSaving]  = useState(false);

  const isEmpty = !value.trim();

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
  }

  return (
    <div className="space-y-3">

      {/* Status header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{characterIcon}</span>
          <div>
            <p className="text-zinc-300 text-xs font-semibold">मिडिया Grounding Context</p>
            <p className="text-zinc-600 text-[10px]">Canonical iconographic description for media generation</p>
          </div>
        </div>

        {isEmpty ? (
          <span className="text-[10px] px-2 py-1 rounded-full bg-red-950/50 border border-red-900/50 text-red-400 shrink-0">
            🚫 Generation बन्द
          </span>
        ) : (
          <span className="text-[10px] px-2 py-1 rounded-full bg-green-950/50 border border-green-900/50 text-green-400 shrink-0">
            ✓ Grounded
          </span>
        )}
      </div>

      {/* Enforcement notice — shown when empty */}
      {isEmpty && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/20 px-3 py-2.5 space-y-1">
          <p className="text-red-300 text-xs font-semibold">
            🚫 {characterName} को लागि कुनै पनि AI visual generation अनुमति छैन
          </p>
          <p className="text-red-900/80 text-[10px] leading-relaxed">
            Canonical iconographic description नभएकोले generation गर्न सकिँदैन।
            यो field भर्नुहोस् — तब मात्र भविष्यमा grounded media बन्न सक्छ।
          </p>
        </div>
      )}

      {/* View mode */}
      {!editing && !isEmpty && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 space-y-2">
          <p className="text-zinc-300 text-xs leading-[1.8] whitespace-pre-wrap">{value}</p>
          {!readOnly && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => { setDraft(value); setEditing(true); }}
                className="text-zinc-700 hover:text-zinc-400 text-[10px] transition-colors"
              >
                सम्पादन
              </button>
            </div>
          )}
        </div>
      )}

      {/* Edit mode */}
      {editing && (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={8}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-white/15 resize-none leading-[1.8] transition-colors"
          />
          <p className="text-zinc-700 text-[10px] px-1 leading-relaxed">
            यो description भविष्यमा {characterName} को सबै AI visual/audio generation को canonical आधार हुनेछ।
            Tradition-specific iconography, rasa, र symbolic accuracy यहाँ document गर्नुहोस्।
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 py-2 rounded-xl border border-white/[0.08] text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
            >
              रद्द
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="flex-1 py-2 rounded-xl border border-green-900/60 bg-green-950/30 text-green-400 text-xs font-semibold disabled:opacity-30 hover:bg-green-950/50 transition-colors"
            >
              {saving ? "…" : "सुरक्षित"}
            </button>
          </div>
        </div>
      )}

      {/* Add button when empty and not editing */}
      {isEmpty && !editing && !readOnly && (
        <button
          onClick={() => setEditing(true)}
          className="w-full py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.025] text-zinc-500 text-xs hover:text-zinc-300 hover:border-white/15 transition-all duration-300"
        >
          + Canonical Context थप्नुहोस्
        </button>
      )}

      {/* Philosophy note */}
      <p className="text-zinc-800 text-[9px] leading-relaxed px-1">
        Architecture rule: AI ले {characterName} को कुनै पनि visual generation
        canonicalMediaContext नभई गर्न पाउँदैन। यो ZZC को Living Spiritual Intelligence
        Graph को "no generation without grounding" principle हो।
      </p>
    </div>
  );
}
