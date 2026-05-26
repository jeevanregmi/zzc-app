"use client";

/**
 * WorkflowGuide — closed-loop, step-by-step admin task guide.
 *
 * Shows exactly where the user is, what's done, what's next, and one
 * primary action. Never shows unrelated counts while a task is active.
 *
 * Usage:
 *   <WorkflowGuide
 *     workflowType="document-intelligence"
 *     steps={DOC_INTEL_STEPS}
 *     currentStep={2}
 *     onAction={handleNextStep}
 *   />
 */

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id:              string;
  labelNp:         string;         // Nepali step name (primary)
  labelEn?:        string;         // English (secondary, optional)
  whyNp:           string;         // why this step matters (Nepali)
  icon:            string;         // emoji icon
  actionLabel?:    string;         // button label (if this step is actionable)
  actionHref?:     string;         // link-based action
  actionCallback?: () => void;     // callback-based action
  skipable?:       boolean;        // can be skipped (shows a lighter UI)
  optional?:       boolean;        // shown with "(optional)" label
}

export interface WorkflowGuideProps {
  workflowType:  string;
  steps:         WorkflowStep[];
  currentStep:   number;          // 0-indexed
  titleNp?:      string;
  compact?:      boolean;         // compact mode — no why/explanation, just action bar
  onStepClick?:  (stepIndex: number) => void;
  className?:    string;
}

// ── Pre-built step sets for reuse ─────────────────────────────────────────────

export const DOC_INTEL_STEPS: WorkflowStep[] = [
  {
    id:       "upload",
    icon:     "📤",
    labelNp:  "Document Upload गर्नुहोस्",
    labelEn:  "Upload document",
    whyNp:    "पहिले document system मा हुनुपर्छ — तब मात्र AI ले पढ्न सक्छ।",
  },
  {
    id:       "analyze",
    icon:     "🤖",
    labelNp:  "AI ले Analyze गर्नुहोस्",
    labelEn:  "AI Analyze",
    whyNp:    "AI ले topics, rights, institutions, promises र risks निकाल्छ।",
    actionLabel: "AI ले Analyze गर्नुहोस्",
  },
  {
    id:       "review",
    icon:     "👁",
    labelNp:  "Admin Review / Approve गर्नुहोस्",
    labelEn:  "Admin review",
    whyNp:    "AI output सही छ कि छैन admin ले confirm गर्नुपर्छ — गलत intelligence public नजाओस्।",
    actionLabel: "Admin Vault मा Review गर्नुहोस्",
    actionHref:  "/vault/admin?tab=documents",
  },
  {
    id:       "extract",
    icon:     "🔍",
    labelNp:  "Deep Extract गर्नुहोस्",
    labelEn:  "Deep extract",
    whyNp:    "Document को पूरा intelligence — Janta cards, policy points र relationships — निकाल्नको लागि।",
    actionLabel: "Deep Extract गर्नुहोस्",
  },
  {
    id:       "match",
    icon:     "🔗",
    labelNp:  "Relationship Match",
    labelEn:  "Relationship match",
    whyNp:    "यो document अरू documents सँग कसरी जोडिन्छ — AI ले map गर्छ। Automatic हुन्छ।",
    skipable: true,
  },
  {
    id:       "health",
    icon:     "🌿",
    labelNp:  "Branch Health Check",
    labelEn:  "Branch health",
    whyNp:    "Constitutional branch कति strong छ — document ले कति भाग कभर गर्छ।",
    actionLabel: "Branch Health हेर्नुहोस्",
    actionHref:  "/vault/constitution/health",
    optional: true,
  },
  {
    id:       "publish",
    icon:     "🌳",
    labelNp:  "Public Tree मा Publish",
    labelEn:  "Publish to tree",
    whyNp:    "जनताले Constitution Tree मा यो intelligence explore गर्न पाउँछन्।",
    actionLabel: "Public Tree हेर्नुहोस्",
    actionHref:  "/tree",
  },
];

export const CONSTITUTION_EXTRACT_STEPS: WorkflowStep[] = [
  {
    id:      "select",
    icon:    "📄",
    labelNp: "Constitution document छान्नुहोस्",
    whyNp:   "केवल constitution document मा नै extract काम गर्छ।",
  },
  {
    id:      "extract-batch",
    icon:    "⚙️",
    labelNp: "22 batches extract गर्नुहोस् (धारा १–३०८)",
    whyNp:   "प्रत्येक batch मा ~14 धाराहरू — सबै batch सकिएपछि constitutional_framework ready हुन्छ।",
    actionLabel: "Extract Start गर्नुहोस्",
  },
  {
    id:      "repair",
    icon:    "🔧",
    labelNp: "PartNumber Repair गर्नुहोस्",
    whyNp:   "पुराना records मा partNumber=0 हुन सक्छ — Repair Button ले ठीक गर्छ।",
    actionLabel: "PartNumber Repair गर्नुहोस्",
    actionHref:  "/vault/constitution",
    optional: true,
  },
  {
    id:      "health",
    icon:    "🌿",
    labelNp: "Branch Health verify गर्नुहोस्",
    whyNp:   "सबै 35 भागहरूमा atoms देखिनुपर्छ — confirm गर्नुहोस्।",
    actionLabel: "Branch Health हेर्नुहोस्",
    actionHref:  "/vault/constitution/health",
  },
  {
    id:      "publish",
    icon:    "🌳",
    labelNp: "Public Tree मा जान्छ",
    whyNp:   "Constitution Tree तयार — जनताले भाग र धाराहरू explore गर्न पाउँछन्।",
    actionLabel: "Tree हेर्नुहोस्",
    actionHref:  "/tree",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowGuide({
  steps,
  currentStep,
  titleNp,
  compact = false,
  onStepClick,
  className = "",
}: WorkflowGuideProps) {
  const [expanded, setExpanded] = useState(true);

  const total     = steps.length;
  const pct       = Math.round(((currentStep) / total) * 100);
  const active    = steps[currentStep] ?? steps[total - 1];
  const isDone    = currentStep >= total;

  if (!expanded) {
    return (
      <div
        className={`rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:border-zinc-700 transition-colors ${className}`}
        onClick={() => setExpanded(true)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{isDone ? "✅" : active.icon}</span>
          <p className="text-white text-sm font-bold truncate">{titleNp ?? "Workflow"}</p>
          {!isDone && (
            <span className="text-zinc-500 text-xs shrink-0">चरण {currentStep + 1}/{total}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${isDone ? 100 : pct}%` }} />
          </div>
          <span className="text-zinc-600 text-xs">▼</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-900/40 transition-colors"
        onClick={() => setExpanded(false)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🧭</span>
          <p className="text-white text-sm font-black">{titleNp ?? "Workflow"}</p>
          {isDone && <span className="text-green-400 text-xs font-bold ml-1">✓ सम्पन्न</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${isDone ? 100 : pct}%` }} />
          </div>
          <span className="text-zinc-500 text-[10px]">{isDone ? "100" : pct}%</span>
          <span className="text-zinc-600 text-xs">▲</span>
        </div>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-0 overflow-x-auto scrollbar-none px-4 py-3 border-b border-zinc-800/60">
        {steps.map((step, i) => {
          const done    = i < currentStep;
          const current = i === currentStep;
          const future  = i > currentStep;
          return (
            <div key={step.id} className="flex items-center gap-0 shrink-0">
              <button
                onClick={() => onStepClick?.(i)}
                disabled={!onStepClick}
                title={step.labelNp}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all
                  ${done    ? "bg-green-950/60 text-green-400 border border-green-900"   : ""}
                  ${current ? "bg-white text-black border border-transparent shadow-lg"  : ""}
                  ${future  ? "bg-zinc-900 text-zinc-600 border border-zinc-800"         : ""}
                `}
              >
                <span>{done ? "✓" : step.icon}</span>
                <span className="hidden sm:inline max-w-[80px] truncate">{step.labelEn ?? step.labelNp}</span>
              </button>
              {i < steps.length - 1 && (
                <span className={`text-[10px] px-0.5 ${done ? "text-green-800" : "text-zinc-800"}`}>›</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Active step panel */}
      {!isDone && !compact && (
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5">{active.icon}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm font-black">{active.labelNp}</p>
                {active.optional && (
                  <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">(optional)</span>
                )}
                {active.skipable && (
                  <span className="text-[10px] text-zinc-500 border border-zinc-700 rounded-full px-2 py-0.5">auto</span>
                )}
              </div>
              <p className="text-zinc-500 text-xs leading-relaxed mt-1">{active.whyNp}</p>
            </div>
          </div>

          {/* Primary action */}
          {(active.actionHref || active.actionCallback) && active.actionLabel && (
            active.actionHref ? (
              <a
                href={active.actionHref}
                className="block w-full text-center bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
              >
                {active.actionLabel} →
              </a>
            ) : (
              <button
                onClick={active.actionCallback}
                className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-2.5 rounded-xl text-sm transition-colors"
              >
                {active.actionLabel} →
              </button>
            )
          )}

          {/* Completed steps summary */}
          {currentStep > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {steps.slice(0, currentStep).map(s => (
                <span key={s.id} className="flex items-center gap-1 text-[10px] text-green-500 bg-green-950/30 border border-green-900/40 rounded-full px-2 py-0.5">
                  ✓ {s.labelEn ?? s.labelNp}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Done state */}
      {isDone && (
        <div className="px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-green-400 font-black text-sm">Workflow सम्पन्न!</p>
            <p className="text-zinc-500 text-xs mt-0.5">सबै {total} चरणहरू पूरा भए।</p>
          </div>
        </div>
      )}

      {/* Compact mode — just show current step label + action */}
      {compact && !isDone && (
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base shrink-0">{active.icon}</span>
            <p className="text-white text-xs font-bold truncate">{active.labelNp}</p>
          </div>
          {active.actionHref && active.actionLabel && (
            <a href={active.actionHref} className="shrink-0 text-xs font-black text-green-400 hover:text-green-300">
              {active.actionLabel} →
            </a>
          )}
          {active.actionCallback && active.actionLabel && (
            <button onClick={active.actionCallback} className="shrink-0 text-xs font-black text-green-400 hover:text-green-300">
              {active.actionLabel} →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helper — derive currentStep from document status ─────────────────────────

export function docIntelStep(doc: {
  processingStatus: string;
  adminApprovalStatus?: string;
  aiSummary?: string;
}): number {
  if (!doc.aiSummary && doc.processingStatus === "ready")     return 1; // needs analyze
  if (doc.processingStatus === "processing_ai")               return 1;
  if (doc.processingStatus === "ai_ready"
      && doc.adminApprovalStatus !== "approved")              return 2; // needs review
  if (doc.adminApprovalStatus === "approved")                 return 3; // ready to deep extract
  return 0;
}
