"use client";

/**
 * DocumentLifecycleCard — founder-friendly 5-question lifecycle summary.
 *
 * Answers in plain Nepali:
 *   1. यो document के हो?
 *   2. यो कहिले update हुन्छ?
 *   3. अर्को version कहिले खोज्ने?
 *   4. पुरानो version राख्ने कि replace गर्ने?
 *   5. अब मैले के गर्ने?
 *
 * Never mentions: schemas, lifecycle types, archive policies, versioning strategy.
 */

import Link from "next/link";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import { getLifecycleProfile, nextCheckLabel, isOverdue } from "../../../lib/vault/lifecycleHelpers";

interface Props {
  doc:     IntelligenceDocument;
  compact?: boolean;   // true = single-row summary, false = full card
}

export function DocumentLifecycleCard({ doc, compact = false }: Props) {
  const profile  = getLifecycleProfile(doc.lifecycleType);
  const overdue  = isOverdue(doc);
  const nextCheck = nextCheckLabel(doc);

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ${
        overdue ? "border-amber-800/50 bg-amber-950/10" : profile.color + " bg-zinc-900/20"
      }`}>
        <span className="text-sm shrink-0">{profile.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-bold truncate ${overdue ? "text-amber-400" : "text-zinc-300"}`}>
            {profile.label}
            {overdue && <span className="ml-1.5 text-amber-500">⚠ update check गर्नुस्</span>}
          </p>
          <p className="text-[9px] text-zinc-600 truncate">{nextCheck}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border p-4 space-y-0 ${
      overdue ? "border-amber-800/50 bg-amber-950/10" : "border-zinc-800 bg-zinc-900/30"
    }`}>

      {/* Overdue banner */}
      {overdue && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/20 border border-amber-800/40 mb-3">
          <span className="text-amber-500 text-sm">⚠</span>
          <p className="text-amber-300 text-xs font-bold">
            यो document को नयाँ version आइसकेको हुन सक्छ — check गर्नुस्।
          </p>
        </div>
      )}

      {/* Q1: यो document के हो? */}
      <Row label="यो document के हो?" value={`${profile.emoji} ${profile.label}`} highlight />
      <Divider />

      {/* Q2: कहिले update हुन्छ? */}
      <Row label="यो कहिले update हुन्छ?" value={profile.frequency} />
      <Divider />

      {/* Q3: अर्को version कहिले? */}
      <Row label="अर्को version कहिले खोज्ने?" value={nextCheck} />
      <Divider />

      {/* Q4: पुरानो राख्ने कि? */}
      <Row label="पुरानो version राख्ने कि?" value={profile.archiveNote} />
      <Divider />

      {/* Q5: अब के गर्ने? */}
      <div className="pt-3">
        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-1.5">अब मैले के गर्ने?</p>
        <p className="text-white text-xs font-bold leading-snug">{profile.nextAction}</p>
      </div>

      {/* Source check button — if we have the original URL */}
      {doc.originalSourceUrl && (
        <div className="pt-3 border-t border-zinc-800/60 mt-3">
          <a
            href={doc.originalSourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
          >
            Official Site Check →
          </a>
        </div>
      )}

      {/* Upload new version button for annual/quarterly */}
      {(doc.lifecycleType === "annual_report" || doc.lifecycleType === "quarterly") && (
        <div className="pt-2">
          <Link
            href={`/vault/documents?upload=1&lifecycle=${doc.lifecycleType}&govFolder=${doc.govFolder ?? ""}&tags=${(doc.tags ?? []).join(",")}`}
            className="inline-flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black transition-colors"
          >
            नयाँ version Upload गर्नुस् →
          </Link>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="py-2.5">
      <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-black mb-0.5">{label}</p>
      <p className={`text-xs leading-snug ${highlight ? "text-white font-bold" : "text-zinc-300"}`}>{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-zinc-800/60" />;
}
