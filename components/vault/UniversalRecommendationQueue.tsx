"use client";

import { useState } from "react";
import { patchDocumentIdentity, reviewRecommendation } from "../../lib/vault/firestore";
import { promoteAndLink } from "../../lib/vault/canonicalRegistry";
import type { UniversalRecommendation } from "../../lib/types/recommendations";
import {
  REC_KIND_LABELS,
  REC_KIND_COLORS,
  REC_TARGET_LABELS,
  recConfidenceColor,
  recConfidenceBg,
} from "../../lib/types/recommendations";

interface Props {
  recs:       UniversalRecommendation[];
  onRefresh:  () => void;
  ownerId?:   string;   // required for canonical_promotion approvals
  collapsed?: boolean;
}

function suggestedDisplay(value: unknown): string {
  if (value === null || value === undefined) return "(हटाउनु पर्छ)";
  if (Array.isArray(value)) return (value as string[]).slice(0, 4).join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).slice(0, 60);
}

export function UniversalRecommendationQueue({ recs, onRefresh, ownerId, collapsed: initCollapsed = false }: Props) {
  const [open,   setOpen]   = useState(!initCollapsed);
  const [saving, setSaving] = useState<string | null>(null);

  if (recs.length === 0) return null;

  // Group by targetType
  const groups = recs.reduce<Record<string, UniversalRecommendation[]>>((acc, r) => {
    (acc[r.targetType] ??= []).push(r);
    return acc;
  }, {});

  async function approve(rec: UniversalRecommendation) {
    setSaving(rec.id);
    try {
      if (rec.targetType === "document") {
        if (rec.kind === "canonical_promotion" && ownerId) {
          // Promote doc to canonical_documents + set canonicalId on the doc
          await promoteAndLink(ownerId, rec.targetId, {});
        } else if (rec.field) {
          await patchDocumentIdentity(rec.targetId, { [rec.field]: rec.suggested } as Parameters<typeof patchDocumentIdentity>[1]);
        }
      }
      await reviewRecommendation(rec.id, "approved");
      onRefresh();
    } catch (e) {
      console.warn("[UniversalRecommendationQueue] approve failed:", e);
    } finally {
      setSaving(null);
    }
  }

  async function dismiss(rec: UniversalRecommendation, status: "rejected" | "snoozed") {
    setSaving(rec.id);
    try {
      await reviewRecommendation(rec.id, status);
      onRefresh();
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-sm font-semibold text-white">Intelligence Enrichment</span>
          <span className="text-xs text-zinc-500">
            — {recs.length} थान सुझाव पेन्डिङ
          </span>
        </div>
        <span className="text-zinc-600 text-xs">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="divide-y divide-zinc-800/60">
          {Object.entries(groups).map(([targetType, items]) => (
            <div key={targetType} className="p-4 space-y-3">
              {/* Group label */}
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {REC_TARGET_LABELS[targetType as keyof typeof REC_TARGET_LABELS] ?? targetType}
                <span className="ml-2 text-zinc-700 normal-case">{items.length} थान</span>
              </div>

              {items.map(rec => {
                const isBusy = saving === rec.id;
                return (
                  <div
                    key={rec.id}
                    className={`rounded-lg border p-3 space-y-2 ${recConfidenceBg(rec.confidence)}`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-xs text-zinc-400 truncate font-medium">
                          {rec.targetLabel}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${REC_KIND_COLORS[rec.kind]}`}>
                            {REC_KIND_LABELS[rec.kind]}
                          </span>
                          {rec.field && (
                            <span className="text-[10px] text-zinc-500 font-mono">{rec.field}</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-bold shrink-0 ${recConfidenceColor(rec.confidence)}`}>
                        {rec.confidence}%
                      </span>
                    </div>

                    {/* Suggested value */}
                    <div className="text-xs">
                      <span className="text-zinc-500">सुझाव: </span>
                      <span className="text-white font-mono">{suggestedDisplay(rec.suggested)}</span>
                    </div>

                    {/* Reasoning */}
                    <div className="text-[11px] text-zinc-500 leading-relaxed">{rec.reasoning}</div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => void approve(rec)}
                        disabled={isBusy}
                        className="flex-1 text-xs py-1.5 rounded-md bg-green-900/40 text-green-400 hover:bg-green-900/60 disabled:opacity-40 transition-colors font-medium"
                      >
                        {isBusy ? "…" : "✓ स्वीकार"}
                      </button>
                      <button
                        onClick={() => void dismiss(rec, "snoozed")}
                        disabled={isBusy}
                        className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                      >
                        पछि
                      </button>
                      <button
                        onClick={() => void dismiss(rec, "rejected")}
                        disabled={isBusy}
                        className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-red-500 hover:bg-red-900/30 disabled:opacity-40 transition-colors"
                      >
                        ✗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
