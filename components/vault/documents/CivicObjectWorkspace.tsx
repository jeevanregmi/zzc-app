"use client";

// CivicObjectWorkspace — ONE document, ONE workspace.
// Shows pipeline status, what was extracted, and what to do next.
// Phase 1: read-only status + extraction triggers.
// Phase 3+: full extraction inside workspace, deprecate scattered DocumentCard buttons.

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, limit, getDocs,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CivicObjectWorkspaceProps {
  doc:     IntelligenceDocument;
  ownerId: string;
  onClose: () => void;
  // Extraction triggers (same handlers as DocumentCard — passed from DocumentsClient)
  isProcessing:               boolean;
  onProcess:                  (doc: IntelligenceDocument) => void;
  onExtractIntel?:            (doc: IntelligenceDocument) => void;
  isExtractingIntel?:         boolean;
  isMatchingIntel?:           boolean;
  onExtractConstitution?:     (doc: IntelligenceDocument) => void;
  isExtractingConstitution?:  boolean;
  onExtractAtomic?:           (doc: IntelligenceDocument) => void;
  isExtractingAtomic?:        boolean;
  atomicCostEstimate?:        string;
  // Live job state from DocumentsClient — refreshes workspace without remount
  atomicJobMsg?:        string;   // "⏳ शुरु…" / "✅ 45 records" / "❌ error"
  externalAtomicCount?: number;   // updated by DocumentsClient after completion
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[CivicObjectWorkspace]", e?.code ?? e); return fb; });

// ── Pipeline step definitions ──────────────────────────────────────────────────

type StepStatus = "done" | "running" | "available" | "blocked" | "na";

interface PipelineStep {
  id:      string;
  num:     number;
  label:   string;
  labelNe: string;
  status:  StepStatus;
  count?:  number;
  note?:   string;
  action?: () => void;
  actionLabel?: string;
  link?:   string;
  linkLabel?: string;
}

function stepCls(s: StepStatus) {
  if (s === "done")      return "border-emerald-800/50 bg-emerald-950/10 text-emerald-400";
  if (s === "running")   return "border-amber-800/50   bg-amber-950/10   text-amber-400 animate-pulse";
  if (s === "available") return "border-violet-800/50  bg-violet-950/10  text-violet-300";
  if (s === "blocked")   return "border-zinc-800/40    bg-zinc-900/20    text-zinc-600";
  return                        "border-zinc-800/40    bg-zinc-900/10    text-zinc-600";
}

function stepIcon(s: StepStatus) {
  if (s === "done")      return "✓";
  if (s === "running")   return "⟳";
  if (s === "available") return "→";
  if (s === "blocked")   return "○";
  return "—";
}

function isConstitutionDoc(doc: IntelligenceDocument): boolean {
  const name = `${doc.title ?? ""} ${doc.fileName ?? ""}`.toLowerCase();
  return (
    name.includes("constitution") ||
    name.includes("संविधान")     ||
    name.includes("ंविधान")      ||
    name.includes("samvidhan")
  );
}

// ── Public route display ───────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  { id: "janta",        label: "Janta Intelligence",   href: "/janta",                  icon: "👁" },
  { id: "constitution", label: "Constitution Chautari", href: "/constitution",            icon: "🌳" },
  { id: "economy",      label: "Economy Chautari",      href: "/vault/economy",           icon: "💰" },
  { id: "health",       label: "Branch Health",         href: "/vault/constitution/health", icon: "🩺" },
];

// ── Root component ─────────────────────────────────────────────────────────────

export function CivicObjectWorkspace({
  doc,
  ownerId,
  onClose,
  isProcessing,
  onProcess,
  onExtractIntel,
  isExtractingIntel = false,
  isMatchingIntel   = false,
  onExtractConstitution,
  isExtractingConstitution = false,
  onExtractAtomic,
  isExtractingAtomic = false,
  atomicCostEstimate,
  atomicJobMsg,
  externalAtomicCount,
}: CivicObjectWorkspaceProps) {

  const [intelCount,  setIntelCount]  = useState<number | null>(null);
  const [relCount,    setRelCount]    = useState<number | null>(null);
  const [constCount,  setConstCount]  = useState<number | null>(null);
  const [atomicCount, setAtomicCount] = useState<number | null>(null);
  const [loading,     setLoading]     = useState(true);

  const [confirmAtomic,  setConfirmAtomic]  = useState(false);
  // localAtomicMsg: immediate feedback, set synchronously on button click.
  // Does NOT depend on parent re-render or prop propagation.
  // effectiveAtomicMsg below uses parent's atomicJobMsg if available (authoritative).
  const [localAtomicMsg, setLocalAtomicMsg] = useState<string>("");

  // 5-second safety net: if local shows "⏳" but parent never responds, warn
  useEffect(() => {
    if (!localAtomicMsg.startsWith("⏳")) return;
    const t = setTimeout(() => {
      setLocalAtomicMsg(prev =>
        prev.startsWith("⏳")
          ? "⚠ ५ सेकेन्ड भयो — backend ले response दिएन। Retry गर्नुहोस् वा page reload गर्नुहोस्।"
          : prev
      );
    }, 5000);
    return () => clearTimeout(t);
  }, [localAtomicMsg]);

  // Reset local msg when confirm opens (fresh attempt)
  useEffect(() => { if (confirmAtomic) setLocalAtomicMsg(""); }, [confirmAtomic]);

  // Close confirm dialog as soon as parent job starts
  const prevExtractingRef = useRef(isExtractingAtomic);
  useEffect(() => {
    if (!prevExtractingRef.current && isExtractingAtomic) setConfirmAtomic(false);
    prevExtractingRef.current = isExtractingAtomic;
  }, [isExtractingAtomic]);

  // Parent's atomicJobMsg is authoritative; local is the immediate fallback
  const effectiveAtomicMsg = atomicJobMsg || localAtomicMsg;

  function handleAtomicConfirm() {
    console.log("[CivicObjectWorkspace] handleAtomicConfirm fired", {
      docId: doc.id,
      hasHandler: !!onExtractAtomic,
      isExtractingAtomic,
    });
    setConfirmAtomic(false);

    if (!onExtractAtomic) {
      console.error("[CivicObjectWorkspace] onExtractAtomic prop is undefined — check DocumentsClient wiring");
      setLocalAtomicMsg("❌ Atomic extraction handler जोडिएको छैन — page reload गर्नुहोस्।");
      return;
    }

    setLocalAtomicMsg("⏳ Atomic extraction शुरु हुँदैछ…");
    console.log("[CivicObjectWorkspace] calling onExtractAtomic…");

    try {
      onExtractAtomic(doc);
      console.log("[CivicObjectWorkspace] onExtractAtomic called — waiting for parent state");
    } catch (err) {
      console.error("[CivicObjectWorkspace] onExtractAtomic threw:", err);
      setLocalAtomicMsg(
        `❌ Handler error: ${err instanceof Error ? err.message : String(err)}`.slice(0, 150)
      );
    }
  }

  const isConst    = isConstitutionDoc(doc);
  const isApproved = doc.adminApprovalStatus === "approved";
  const hasAI      = doc.processingStatus === "ai_ready";

  // externalAtomicCount overrides local count when parent reports a fresh value
  const effectiveAtomicCount = externalAtomicCount ?? atomicCount ?? 0;

  // Load counts on mount
  useEffect(() => {
    if (!ownerId || !doc.id) { setLoading(false); return; }
    const run = async () => {
      const [intelSnap, relSnap, constSnap] = await Promise.all([
        safe(getDocs(query(
          collection(db, "janta_intelligence"),
          where("ownerId",     "==", ownerId),
          where("sourceDocId", "==", doc.id),
          limit(500),
        )), null),
        safe(getDocs(query(
          collection(db, "janta_relationships"),
          where("ownerId",     "==", ownerId),
          where("sourceDocId", "==", doc.id),
          limit(200),
        )), null),
        safe(getDocs(query(
          collection(db, "constitutional_framework"),
          where("ownerId",     "==", ownerId),
          where("sourceDocId", "==", doc.id),
          limit(500),
        )), null),
      ]);

      const iSnap = intelSnap ?? { docs: [] };
      const total = iSnap.docs.length;
      const atomic = iSnap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return data.extractionTier === "atomic" || (data.traceability as Record<string,unknown>)?.pageNumber;
      }).length;
      setIntelCount(total - atomic);
      setAtomicCount(atomic);
      setRelCount(relSnap?.docs.length ?? 0);
      setConstCount(constSnap?.docs.length ?? 0);
      setLoading(false);
    };
    void run();
  }, [ownerId, doc.id]);

  // Build pipeline steps
  const steps: PipelineStep[] = [
    {
      id:      "upload",
      num:     1,
      label:   "Upload & Identity",
      labelNe: "Upload र पहिचान",
      status:  "done",
      note:    `${doc.fileType?.toUpperCase() ?? "File"} · ${doc.sourceType ?? "unknown"} source`,
    },
    {
      id:      "ai",
      num:     2,
      label:   "AI Analysis",
      labelNe: "AI विश्लेषण",
      status:  isProcessing ? "running" : hasAI ? "done" : "available",
      note:    hasAI ? (doc.aiProvider ?? "AI") + " — complete" : "AI summary र key insights",
      action:  !hasAI && !isProcessing ? () => onProcess(doc) : undefined,
      actionLabel: "🤖 AI Analyze गर्नुहोस्",
    },
    {
      id:      "review",
      num:     3,
      label:   "Admin Review",
      labelNe: "Admin समीक्षा",
      status:  isApproved ? "done"
               : doc.adminApprovalStatus === "needs_revision" ? "blocked"
               : hasAI ? "available" : "blocked",
      note:    isApproved ? "Approved ✓"
               : doc.adminApprovalStatus === "needs_revision" ? "Needs revision"
               : "Admin Vault मा review गर्नुहोस्",
      link:    !isApproved && hasAI ? "/vault/admin?tab=documents" : undefined,
      linkLabel: "Admin Vault मा जानुहोस् →",
    },
    {
      id:      "intel",
      num:     4,
      label:   "Intelligence Extraction",
      labelNe: "Intelligence निकाल्नुहोस्",
      status:  isExtractingIntel || isMatchingIntel ? "running"
               : (intelCount ?? 0) > 0 ? "done"
               : isApproved && !isConst ? "available"
               : isConst ? "na"
               : "blocked",
      count:   intelCount ?? undefined,
      note:    isExtractingIntel ? "Extracting…"
               : isMatchingIntel ? "Relationships matching…"
               : (intelCount ?? 0) > 0 ? `${intelCount} records · ${relCount ?? 0} relationships`
               : isConst ? "Constitution document — Step 5 use गर्नुहोस्"
               : "Policy commitments, budgets, institutions, projects",
      action:  isApproved && !isConst && (intelCount ?? 0) === 0 && !isExtractingIntel
               ? () => onExtractIntel?.(doc) : undefined,
      actionLabel: "🏛️ Intelligence निकाल्नुहोस्",
    },
    {
      id:      "constitution",
      num:     5,
      label:   "Constitution Extraction",
      labelNe: "संविधान निकाल्नुहोस्",
      status:  isExtractingConstitution ? "running"
               : (constCount ?? 0) > 0 ? "done"
               : isApproved && isConst ? "available"
               : "na",
      count:   constCount ?? undefined,
      note:    isExtractingConstitution ? "Extracting…"
               : (constCount ?? 0) > 0 ? `${constCount} धाराहरू extracted`
               : isConst ? "३०८ धाराहरू — full constitution"
               : "Non-constitution document — N/A",
      action:  isApproved && isConst && (constCount ?? 0) === 0 && !isExtractingConstitution
               ? () => onExtractConstitution?.(doc) : undefined,
      actionLabel: "📜 संविधान Extract गर्नुहोस्",
    },
    {
      id:      "atomic",
      num:     6,
      label:   "Atomic Deep Extract",
      labelNe: "Atomic (Page-traced)",
      status:  isExtractingAtomic ? "running"
               : effectiveAtomicCount > 0 ? "done"
               : isApproved && doc.sourceType === "official" && !isConst ? "available"
               : "blocked",
      count:   effectiveAtomicCount > 0 ? effectiveAtomicCount : undefined,
      note:    isExtractingAtomic ? "Page-by-page scan हुँदैछ… (background job चलिरहेको छ)"
               : effectiveAtomicCount > 0 ? `${effectiveAtomicCount} atomic records · page + verbatim traced`
               : doc.sourceType !== "official" ? "Official documents मात्र"
               : "प्रत्येक तथ्य page number + verbatim quote सहित",
      action:  isApproved && doc.sourceType === "official" && !isConst
               && effectiveAtomicCount === 0 && !isExtractingAtomic && !atomicJobMsg && !localAtomicMsg
               ? () => setConfirmAtomic(true) : undefined,
      actionLabel: "⚛ Atomic Extract गर्नुहोस्",
    },
    {
      id:      "economy",
      num:     7,
      label:   "Economy Analysis",
      labelNe: "Economy Intelligence",
      status:  "available",
      note:    "Budget lines, variables, GDP, inflation — Nepal Economic Intelligence",
      link:    `/vault/economy?docId=${doc.id}`,
      linkLabel: "💰 Economy Chautari →",
    },
    {
      id:      "public",
      num:     8,
      label:   "Public Routing",
      labelNe: "Public मा कहाँ देखाउने?",
      status:  isApproved && hasAI ? "available" : "blocked",
      note:    isApproved ? "/janta, Constitution Chautari, Economy Chautari" : "Approve गरेपछि route गर्न सकिन्छ",
    },
  ];

  const nextStep = steps.find(s => s.status === "available" && (s.action || s.link));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-[#09091a] border border-white/[0.08] rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-5 pt-4 pb-3 border-b border-white/[0.06] flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] border border-sky-800/50 bg-sky-950/20 text-sky-400 rounded-full px-2 py-0.5 shrink-0">
                Civic Object
              </span>
              {doc.sourceType === "official" && (
                <span className="text-[10px] border border-emerald-800/50 bg-emerald-950/20 text-emerald-400 rounded-full px-2 py-0.5 shrink-0">
                  ✓ Official
                </span>
              )}
              {isApproved && (
                <span className="text-[10px] border border-emerald-800/50 bg-emerald-950/20 text-emerald-400 rounded-full px-2 py-0.5 shrink-0">
                  Approved
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-zinc-200 mt-1.5 leading-snug line-clamp-2">
              {doc.title}
            </h3>
            {doc.institutionName && (
              <p className="text-zinc-600 text-[10px] mt-0.5">{doc.institutionName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors shrink-0 mt-1"
          >
            ✕
          </button>
        </div>

        {/* ── Atomic job status — pinned below header, always visible ── */}
        {effectiveAtomicMsg && (
          <div className={`mx-5 mt-3 rounded-xl border px-4 py-3 flex items-start gap-3 text-xs leading-relaxed shrink-0 ${
            effectiveAtomicMsg.startsWith("✅")
              ? "border-emerald-800/50 bg-emerald-950/15 text-emerald-300"
              : effectiveAtomicMsg.startsWith("❌")
              ? "border-red-800/50 bg-red-950/15 text-red-300"
              : effectiveAtomicMsg.startsWith("⚠")
              ? "border-amber-700/60 bg-amber-950/20 text-amber-200"
              : "border-violet-700/60 bg-violet-950/20 text-violet-200 animate-pulse"
          }`}>
            <span className="text-base shrink-0">
              {effectiveAtomicMsg.startsWith("✅") ? "✅"
               : effectiveAtomicMsg.startsWith("❌") ? "❌"
               : effectiveAtomicMsg.startsWith("⚠") ? "⚠"
               : "⚛"}
            </span>
            <div className="min-w-0">
              <p className="font-semibold">Atomic Extraction</p>
              <p className="mt-0.5 opacity-90">{effectiveAtomicMsg.replace(/^[✅❌⏳⚛⚠]\s*/, "")}</p>
            </div>
          </div>
        )}

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* ── AI Summary ── */}
          {doc.aiSummary && (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] px-4 py-3">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-1.5">AI Summary</p>
              <p className="text-zinc-300 text-xs leading-relaxed line-clamp-4">{doc.aiSummary}</p>
            </div>
          )}

          {/* ── "Next recommended action" banner ── */}
          {nextStep && (
            <div className="rounded-xl border border-violet-800/40 bg-violet-950/15 px-4 py-3 space-y-2">
              <p className="text-violet-400 text-[10px] uppercase tracking-wide">अब के गर्नुपर्छ?</p>
              <p className="text-violet-200 text-xs font-medium">{nextStep.labelNe}</p>
              <div className="flex items-center gap-2">
                {nextStep.action && nextStep.actionLabel && (
                  <button
                    onClick={nextStep.action}
                    className="text-xs px-4 py-2 rounded-xl border border-violet-700/60 bg-violet-900/30 text-violet-200 hover:bg-violet-900/50 transition-colors font-medium"
                  >
                    {nextStep.actionLabel}
                  </button>
                )}
                {nextStep.link && nextStep.linkLabel && (
                  <Link
                    href={nextStep.link}
                    className="text-xs px-4 py-2 rounded-xl border border-sky-800/50 bg-sky-950/20 text-sky-300 hover:bg-sky-950/40 transition-colors"
                  >
                    {nextStep.linkLabel}
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* ── Pipeline roadmap ── */}
          <div className="space-y-2">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wide">Pipeline — यो document बाट के निस्कियो / के बाँकी छ</p>

            {loading ? (
              <div className="space-y-1.5">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-12 rounded-xl bg-white/[0.02] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {steps.map(step => (
                  step.status === "na" ? null : (
                    <div
                      key={step.id}
                      className={`rounded-xl border px-4 py-2.5 flex items-center justify-between gap-3 ${stepCls(step.status)}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-[10px] font-mono w-3 shrink-0">
                          {stepIcon(step.status)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-medium">{step.labelNe}</span>
                            {step.count !== undefined && step.count > 0 && (
                              <span className="text-[10px] opacity-70">{step.count} records</span>
                            )}
                          </div>
                          {step.note && (
                            <p className="text-[10px] opacity-50 mt-0.5 leading-snug">{step.note}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {step.action && step.actionLabel && (
                          <button
                            onClick={step.action}
                            className="text-[11px] px-3 py-1.5 rounded-lg border border-current/30 bg-current/5 hover:bg-current/15 transition-colors"
                          >
                            {step.actionLabel}
                          </button>
                        )}
                        {step.link && step.linkLabel && (
                          <Link
                            href={step.link}
                            className="text-[11px] px-3 py-1.5 rounded-lg border border-sky-800/40 bg-sky-950/20 text-sky-400 hover:bg-sky-950/40 transition-colors"
                          >
                            {step.linkLabel}
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>

          {/* ── Atomic confirm dialog ── */}
          {confirmAtomic && !isExtractingAtomic && (
            <div className="rounded-xl border border-violet-700 bg-violet-950/50 px-4 py-4 space-y-3">
              <p className="text-violet-200 text-xs font-bold">⚛ Atomic Intelligence — पक्का गर्नुहोस्</p>
              <div className="space-y-1 text-[11px] text-violet-400/80 leading-relaxed">
                <p>• प्रत्येक तथ्य page number + verbatim quote सहित save हुन्छ</p>
                <p>• Official trusted document मा मात्र run गर्नुहोस्</p>
                {atomicCostEstimate && (
                  <p className="text-amber-400 font-bold">अनुमानित खर्च: {atomicCostEstimate}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAtomicConfirm}
                  className="flex-1 text-xs font-bold py-2 rounded-xl bg-violet-700 hover:bg-violet-600 text-white transition-colors"
                >
                  हो, चलाउनुहोस्
                </button>
                <button
                  onClick={() => setConfirmAtomic(false)}
                  className="flex-1 text-xs py-2 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  रद्द गर्नुहोस्
                </button>
              </div>
            </div>
          )}

          {/* status shown pinned above scrollable area — nothing here */}

          {/* ── Key insights ── */}
          {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
            <div className="space-y-2">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide">Key Insights</p>
              <div className="space-y-1">
                {doc.aiKeyInsights.slice(0, 5).map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                    <span className="text-emerald-700 shrink-0 mt-0.5">•</span>
                    <span className="leading-snug">{insight}</span>
                  </div>
                ))}
                {doc.aiKeyInsights.length > 5 && (
                  <p className="text-zinc-700 text-[10px] pl-3">+{doc.aiKeyInsights.length - 5} more</p>
                )}
              </div>
            </div>
          )}

          {/* ── Nepali explainer ── */}
          {doc.nepaliExplainer && (
            <div className="rounded-xl border border-sky-900/30 bg-sky-950/10 px-4 py-3">
              <p className="text-sky-500 text-[10px] uppercase tracking-wide mb-1.5">सरल नेपालीमा</p>
              <p className="text-sky-200 text-xs leading-relaxed">{doc.nepaliExplainer}</p>
            </div>
          )}

          {/* ── Public routing ── */}
          <div className="space-y-2">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wide">Public मा कहाँ देखाउने?</p>
            <div className="grid grid-cols-2 gap-2">
              {PUBLIC_ROUTES.map(r => (
                <Link
                  key={r.id}
                  href={r.href}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5 hover:bg-white/[0.05] transition-colors"
                >
                  <span className="text-base">{r.icon}</span>
                  <span className="text-zinc-400 text-[11px]">{r.label}</span>
                  <span className="text-zinc-700 text-[10px] ml-auto">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Affected sectors ── */}
          {doc.affectedSectors && doc.affectedSectors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-zinc-600 text-[10px] uppercase tracking-wide">Affected Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {doc.affectedSectors.map(s => (
                  <span key={s} className="text-[10px] bg-violet-950/30 text-violet-400 border border-violet-900/40 px-2 py-0.5 rounded-full">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Source info ── */}
          <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3 space-y-1">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wide mb-1">Source / Lineage</p>
            <div className="space-y-1 text-[10px] text-zinc-500">
              <p>File: {doc.fileName}</p>
              {doc.sourceAuthority && <p>Authority: {doc.sourceAuthority}</p>}
              {doc.govFolder && <p>Folder: {doc.govFolder}</p>}
              <p>Uploaded: {new Date(doc.uploadedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
              {doc.fileSize > 0 && (
                <p>Size: {doc.fileSize < 1024*1024 ? `${(doc.fileSize/1024).toFixed(0)} KB` : `${(doc.fileSize/1024/1024).toFixed(1)} MB`}</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
