"use client";

import { useState } from "react";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "../../../app/firebase";

// ── Investigation type ────────────────────────────────────────────────────────

export type InvestigationActionType =
  | "find_related"
  | "compare_year"
  | "repeated_check"
  | "open_source"
  | "copilot_analysis"
  | "custom";

export interface KnowledgeInvestigation {
  id:                  string;
  ownerId:             string;
  atomId:              string;
  sourceCollection:    string;
  atomPreview:         string;
  founderInstruction:  string;
  actionType:          InvestigationActionType;
  status:              "pending" | "running" | "completed" | "failed";
  relatedDocIds:       string[];
  relatedAtomIds:      string[];
  resultSummaryNepali: string;
  suggestedActions:    string[];
  createdAt:           string;
  updatedAt:           string;
}

// ── Quick action presets ──────────────────────────────────────────────────────

const QUICK_ACTIONS: Array<{
  icon:   string;
  label:  string;
  text:   string;
  type:   InvestigationActionType;
  forEconomic?: boolean;   // only show for economic_atom / government_promise
}> = [
  {
    icon: "🔎", label: "Related खोज",
    text: "यस atom सँग अर्थ, विषय, वा keyword मिल्दा अन्य atom खोज।",
    type: "find_related",
  },
  {
    icon: "🔁", label: "Repeated?",
    text: "यो promise वा fact पहिलेको year मा पनि आएको थियो कि check गर।",
    type: "repeated_check",
  },
  {
    icon: "📊", label: "Year Compare",
    text: "यो metric वा target current year को document मा कति छ? Compare गर।",
    type: "compare_year",
    forEconomic: true,
  },
  {
    icon: "🧠", label: "Copilot Analysis",
    text: "यो atom को थप context, related policy, र civic impact explain गर।",
    type: "copilot_analysis",
  },
];

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_INFO: Record<KnowledgeInvestigation["status"], { label: string; tw: string }> = {
  pending:   { label: "⏳ System ले process गर्नेछ",  tw: "text-yellow-500" },
  running:   { label: "🔄 Processing…",               tw: "text-blue-400"   },
  completed: { label: "✅ Complete",                    tw: "text-green-400"  },
  failed:    { label: "❌ Failed",                      tw: "text-red-400"    },
};

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[investigation-panel]", e?.code ?? e); return fb; });

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  ownerId:           string;
  atomId:            string;
  atomPreview:       string;
  sourceCollection:  string;
  sourceDocumentId?: string;
  objectType:        string;
  fiscalYear:        string | null;
  investigations:    KnowledgeInvestigation[];
  onSubmitted:       (inv: KnowledgeInvestigation) => void;
}

export function InvestigationPanel({
  ownerId, atomId, atomPreview, sourceCollection, sourceDocumentId,
  objectType, fiscalYear, investigations, onSubmitted,
}: Props) {
  const [text, setText]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const isEconomicOrPromise =
    objectType === "economic_atom" || objectType === "government_promise";

  const visibleActions = QUICK_ACTIONS.filter(
    qa => !qa.forEconomic || isEconomicOrPromise,
  );

  function prefill(preset: string, extraContext?: string) {
    const fullText = extraContext ? `${extraContext} — ${preset}` : preset;
    setText(fullText);
  }

  async function handleSubmit(actionType: InvestigationActionType = "custom") {
    if (!text.trim() || submitting) return;
    setSubmitting(true);

    const invId  = `inv_${atomId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 20)}_${Date.now()}`;
    const now    = new Date().toISOString();

    const inv: KnowledgeInvestigation = {
      id:                  invId,
      ownerId,
      atomId,
      sourceCollection,
      atomPreview:         atomPreview.slice(0, 120),
      founderInstruction:  text.trim(),
      actionType,
      status:              "pending",
      relatedDocIds:       [],
      relatedAtomIds:      [],
      resultSummaryNepali: "",
      suggestedActions:    [],
      createdAt:           now,
      updatedAt:           now,
    };

    await safe(
      setDoc(doc(collection(db, "knowledge_investigations"), invId), inv),
      undefined,
    );

    onSubmitted(inv);
    setText("");
    setJustSubmitted(true);
    setTimeout(() => setJustSubmitted(false), 2000);
    setSubmitting(false);
  }

  return (
    <div className="space-y-4">

      {/* ── Previous investigations for this atom ── */}
      {investigations.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-zinc-500 uppercase tracking-wide">पहिलेका instructions</p>
          {investigations.slice(0, 4).map(inv => (
            <div key={inv.id} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs text-zinc-300 leading-relaxed flex-1">
                  {inv.founderInstruction}
                </p>
                <span className={`text-[10px] shrink-0 ${STATUS_INFO[inv.status]?.tw ?? "text-zinc-500"}`}>
                  {STATUS_INFO[inv.status]?.label ?? inv.status}
                </span>
              </div>
              {inv.resultSummaryNepali && (
                <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-800 leading-relaxed">
                  {inv.resultSummaryNepali}
                </p>
              )}
              {inv.suggestedActions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {inv.suggestedActions.map((a, i) => (
                    <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {a}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-zinc-700 mt-1.5">{inv.createdAt.slice(0, 10)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick action buttons ── */}
      <div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-2">Quick Actions</p>
        <div className="flex flex-wrap gap-1.5">
          {visibleActions.map(qa => (
            <button
              key={qa.type}
              onClick={() => {
                const extra = qa.forEconomic && fiscalYear
                  ? `Fiscal Year: ${fiscalYear}`
                  : undefined;
                prefill(qa.text, extra);
              }}
              className="text-xs px-2.5 py-1 rounded-md border bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 transition-colors"
            >
              {qa.icon} {qa.label}
            </button>
          ))}

          {/* Source document link */}
          {sourceDocumentId && (
            <a
              href={`/vault/documents?doc=${sourceDocumentId}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-2.5 py-1 rounded-md border bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 transition-colors"
            >
              📄 Source खोल
            </a>
          )}
        </div>
      </div>

      {/* ── Instruction text area ── */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="यो atom बारे system लाई के भन्नु छ? जस्तै: यो last year को हो, current year सँग compare गर।"
          rows={3}
          className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500"
        />

        {text.trim() && (
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit("custom")}
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-900/60 hover:bg-blue-800/60 border border-blue-700 text-blue-200 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Submit गर्दैछ…" : "📩 Submit"}
            </button>
            <button
              onClick={() => setText("")}
              className="px-3 py-1.5 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400"
            >
              Clear
            </button>
          </div>
        )}

        {justSubmitted && (
          <p className="text-xs text-green-400">✓ Instruction save भयो। System ले process गर्नेछ।</p>
        )}
      </div>
    </div>
  );
}
