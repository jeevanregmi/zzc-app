"use client";

import { useState, useEffect } from "react";

// ─── Pipeline step definitions ────────────────────────────────────────────────

const STEPS = [
  {
    n:        1,
    icon:     "📄",
    title:    "Upload",
    np:       "Document upload",
    short:    "Upload गर्नुहोस्",
    detail:   "सरकारी, आर्थिक, नीतिगत वा अनुसन्धान documents यहाँ आउँछन्।",
    examples: ["बजेट", "NRB report", "नीति", "आयोग प्रतिवेदन", "जनगुनासा", "अदालत फैसला"],
    color:    "cyan",
  },
  {
    n:        2,
    icon:     "🤖",
    title:    "AI Reads",
    np:       "AI ले पढ्छ",
    short:    "AI ले analyze",
    detail:   "AI ले document बाट topics, institutions, laws, constitutional references, citizen impact, promises, risks र opportunities निकाल्छ।",
    examples: ["Institutions", "Laws", "Citizen impact", "Promises", "Risks"],
    color:    "violet",
  },
  {
    n:        3,
    icon:     "📜",
    title:    "Constitution Connection",
    np:       "संविधानसँग जोडिन्छ",
    short:    "संविधान mapping",
    detail:   "AI ले document लाई संविधानका भाग र धारासँग जोड्छ — हरेक policy पछाडि कुन अधिकार छ भनेर।",
    examples: [
      "खाद्य सुरक्षा → धारा ३६",
      "शिक्षा बजेट → धारा ३१",
      "नागरिक गुनासो → मौलिक अधिकार",
    ],
    color:    "amber",
  },
  {
    n:        4,
    icon:     "🧠",
    title:    "Intelligence Layer",
    np:       "Intelligence बन्छ",
    short:    "Intelligence",
    detail:   "System ले Constitutional promises, Government plans, Real-world implementation र Citizen experience तुलना गर्छ — gaps, growth, र warnings देखाउँछ।",
    examples: ["Branch health", "Civic gaps", "Decay warnings", "Growth signals"],
    color:    "green",
  },
  {
    n:        5,
    icon:     "🌳",
    title:    "Public Learning",
    np:       "जनताले सिक्छन्",
    short:    "Citizen learning",
    detail:   "जनताले Constitution Tree explore गर्न, आफ्ना अधिकार बुझ्न, government promises vs reality compare गर्न र policy impact discover गर्न सक्छन्।",
    examples: ["Constitution Tree", "Branch Health", "Rights Tracker", "Policy Gaps"],
    color:    "emerald",
  },
] as const;

type StepColor = typeof STEPS[number]["color"];

const COLOR_MAP: Record<StepColor, { bg: string; border: string; text: string; dot: string; activeBg: string }> = {
  cyan:    { bg: "bg-cyan-950/30",    border: "border-cyan-800",    text: "text-cyan-300",    dot: "bg-cyan-500",    activeBg: "bg-cyan-950/60"    },
  violet:  { bg: "bg-violet-950/30",  border: "border-violet-800",  text: "text-violet-300",  dot: "bg-violet-500",  activeBg: "bg-violet-950/60"  },
  amber:   { bg: "bg-amber-950/30",   border: "border-amber-800",   text: "text-amber-300",   dot: "bg-amber-500",   activeBg: "bg-amber-950/60"   },
  green:   { bg: "bg-green-950/30",   border: "border-green-800",   text: "text-green-300",   dot: "bg-green-500",   activeBg: "bg-green-950/60"   },
  emerald: { bg: "bg-emerald-950/30", border: "border-emerald-800", text: "text-emerald-300", dot: "bg-emerald-500", activeBg: "bg-emerald-950/60" },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CivicIntelligencePipeline({
  activeDocs   = 0,
  approvedDocs = 0,
  currentPage  = "documents",
}: {
  activeDocs?:   number;
  approvedDocs?: number;
  currentPage?:  "documents" | "admin" | "review";
}) {
  const [open,     setOpen]     = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    setOpen(localStorage.getItem("zzc-pipeline-open") === "1");
  }, []);

  function toggle() {
    setOpen(prev => {
      const next = !prev;
      localStorage.setItem("zzc-pipeline-open", next ? "1" : "0");
      return next;
    });
  }

  // Infer active step based on context + data
  const activeStep =
    currentPage === "admin"   ? 3 :
    approvedDocs > 0          ? 5 :
    activeDocs > 0            ? 2 :
    1;

  return (
    <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">

      {/* ── Toggle header ─────────────────────────────────────────────────── */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/60 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span>🌳</span>
          <div>
            <span className="text-xs font-bold text-zinc-200">Civic Intelligence Journey</span>
            <span className="text-zinc-600 text-xs ml-2 hidden sm:inline">
              — document बाट जनता सम्म
            </span>
          </div>
          {/* Passive step indicator when collapsed */}
          {!open && (
            <div className="hidden sm:flex items-center gap-1 ml-3">
              {STEPS.map((s, i) => {
                const done = s.n < activeStep;
                const active = s.n === activeStep;
                return (
                  <span key={s.n} className="flex items-center gap-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        done   ? "bg-green-500" :
                        active ? COLOR_MAP[s.color].dot :
                        "bg-zinc-700"
                      }`}
                    />
                    {i < STEPS.length - 1 && <span className="text-zinc-800 text-[9px]">›</span>}
                  </span>
                );
              })}
            </div>
          )}
        </div>
        <span className="text-zinc-600 text-xs shrink-0">{open ? "▲" : "▼ कसरी काम गर्छ?"}</span>
      </button>

      {/* ── Expanded content ──────────────────────────────────────────────── */}
      {open && (
        <div className="border-t border-zinc-800">

          {/* Step pills — horizontal scrollable */}
          <div className="flex items-center gap-0 overflow-x-auto px-3 py-3 scrollbar-none">
            {STEPS.map((step, i) => {
              const done    = step.n < activeStep;
              const active  = step.n === activeStep;
              const isOpen  = expanded === step.n;
              const c       = COLOR_MAP[step.color];
              return (
                <div key={step.n} className="flex items-center gap-0 shrink-0">
                  <button
                    onClick={() => setExpanded(isOpen ? null : step.n)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                      isOpen  ? `${c.activeBg} border ${c.border} ${c.text}` :
                      done    ? "bg-green-950/30 border border-green-900/50 text-green-500" :
                      active  ? "bg-zinc-800 border border-zinc-600 text-white" :
                      "text-zinc-600 border border-transparent hover:text-zinc-400 hover:border-zinc-800"
                    }`}
                  >
                    <span>{step.icon}</span>
                    <span className="hidden md:inline">{step.np}</span>
                    <span className="md:hidden">{step.short}</span>
                    {done && <span className="text-green-400 text-[9px] font-black">✓</span>}
                  </button>
                  {i < STEPS.length - 1 && (
                    <span className="text-zinc-700 text-xs mx-1.5">→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step detail panel */}
          {expanded !== null && (() => {
            const step = STEPS.find(s => s.n === expanded);
            if (!step) return null;
            const c = COLOR_MAP[step.color];
            return (
              <div className={`mx-3 mb-3 rounded-xl border ${c.border} ${c.bg} p-4`}>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">{step.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white leading-none">{step.title}</p>
                    <p className={`text-xs mt-0.5 ${c.text}`}>{step.np}</p>
                  </div>
                </div>
                <p className={`text-xs leading-relaxed mb-3 ${c.text} opacity-80`}>{step.detail}</p>
                <div className="flex flex-wrap gap-1.5">
                  {step.examples.map(ex => (
                    <span
                      key={ex}
                      className={`text-xs px-2 py-0.5 rounded-full border ${c.border} ${c.bg} ${c.text} font-medium`}
                    >
                      {ex}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Bottom: architectural principle */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-zinc-700 leading-relaxed border-t border-zinc-800/60 pt-2">
              <span className="text-zinc-500 font-semibold">Architecture: </span>
              Document final product होइन — document बाट निकालिएको intelligence नै असली product हो।
              हरेक document Constitution Tree मा एउटा leaf थप्छ।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
