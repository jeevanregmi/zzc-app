"use client";

// ── Universal Knowledge Object ─────────────────────────────────────────────
// The public rendering atom for all ZZC Knowledge Objects.
// Civic domain: maps from janta_intelligence / constitutional_framework
// Bhakti domain (future): maps from shloka_atoms / bhakti_atoms
//
// One component. Two visual themes. Same data spine.

export type KnowledgeDomain = "civic" | "bhakti";

export interface UniversalKnowledgeObject {
  id:             string;
  domain:         KnowledgeDomain;
  objectType:     string;   // civic: "promise" | "budget_target" | "reform" | ...
                            // bhakti: "shloka" | "bhajan" | "character" | "teaching"
  titleNepali:    string;
  title?:         string;
  summaryNepali:  string;
  textEvidence?:  string;   // verbatim page quote (atomic tier)
  pageNumber?:    number;
  sourceQuote?:   string;   // structured-tier source trace
  sourceTitle?:   string;
  sourceDocId?:   string;
  extractionTier?: "operational" | "structured" | "atomic";
  sector?:        string;
  ministry?:      string;
  budgetAmount?:  string;
  target?:        string;
  fiscalYear?:    string;
  constitutionalRefs?: number[];
  affectedGroups?: string[];
  tags?:          string[];
  // Future bhakti fields — zero breaking changes when these populate
  shlokaText?:    string;
  characterName?: string;
}

// ── Type labels ────────────────────────────────────────────────────────────

const CIVIC_TYPE_LABELS: Record<string, string> = {
  promise:            "प्रतिबद्धता",
  budget_target:      "बजेट",
  project:            "आयोजना",
  institution:        "संस्था",
  employment_target:  "रोजगार लक्ष्य",
  social_program:     "सामाजिक",
  reform:             "सुधार",
  digital_policy:     "डिजिटल नीति",
  financial_inclusion:"वित्तीय पहुँच",
  bank_directive:     "निर्देशन",
  interest_rate:      "ब्याजदर",
  loan_rule:          "ऋण नियम",
  epf_rule:           "EPF",
  ssf_rule:           "SSF",
  cit_rule:           "CIT",
  insurance_rule:     "बीमा",
  nepse_rule:         "NEPSE",
  monetary_policy:    "मौद्रिक नीति",
  financial_complaint:"उजुरी",
  other:              "जानकारी",
};

const BHAKTI_TYPE_LABELS: Record<string, string> = {
  shloka:    "श्लोक",
  bhajan:    "भजन",
  character: "चरित्र",
  teaching:  "शिक्षा",
  stotra:    "स्तोत्र",
  mantra:    "मन्त्र",
  leela:     "लीला",
};

const SECTOR_LABELS: Record<string, string> = {
  education:      "शिक्षा",
  health:         "स्वास्थ्य",
  agriculture:    "कृषि",
  infrastructure: "पूर्वाधार",
  energy:         "ऊर्जा",
  finance:        "वित्त",
  governance:     "शासन",
  employment:     "रोजगार",
  social:         "सामाजिक",
  environment:    "वातावरण",
  judiciary:      "न्यायपालिका",
  transport:      "यातायात",
  other:          "अन्य",
};

// ── Domain themes ──────────────────────────────────────────────────────────

const DOMAIN_THEME = {
  civic: {
    accent:       "border-l-emerald-600",
    typeBg:       "bg-emerald-950/60 text-emerald-400 border-emerald-800/60",
    tierAtomic:   "bg-violet-950/60 text-violet-400 border-violet-800/60",
    tierStructured:"bg-teal-950/60 text-teal-500 border-teal-800/50",
    evidenceBg:   "bg-emerald-950/20 border-emerald-900/40",
    evidenceText: "text-emerald-200/80",
    pageRef:      "text-emerald-700",
    sourceDot:    "bg-emerald-700",
    sourceText:   "text-zinc-500",
    constBg:      "bg-zinc-900/60 text-zinc-500 border-zinc-800",
    tagBg:        "bg-zinc-900/40 text-zinc-600 border-zinc-800/60",
  },
  bhakti: {
    accent:        "border-l-violet-600",
    typeBg:        "bg-violet-950/60 text-violet-400 border-violet-800/60",
    tierAtomic:    "bg-amber-950/60 text-amber-400 border-amber-800/60",
    tierStructured:"bg-indigo-950/60 text-indigo-500 border-indigo-800/50",
    evidenceBg:    "bg-violet-950/20 border-violet-900/40",
    evidenceText:  "text-violet-200/80",
    pageRef:       "text-violet-700",
    sourceDot:     "bg-violet-700",
    sourceText:    "text-zinc-500",
    constBg:       "bg-zinc-900/60 text-zinc-500 border-zinc-800",
    tagBg:         "bg-zinc-900/40 text-zinc-600 border-zinc-800/60",
  },
};

// ── Component ──────────────────────────────────────────────────────────────

interface Props {
  obj:     UniversalKnowledgeObject;
  compact?: boolean;  // narrower cards for sidebars/lists
}

export function UniversalKnowledgeCard({ obj, compact = false }: Props) {
  const t        = DOMAIN_THEME[obj.domain];
  const typeLabel = obj.domain === "bhakti"
    ? (BHAKTI_TYPE_LABELS[obj.objectType] ?? obj.objectType)
    : (CIVIC_TYPE_LABELS[obj.objectType]  ?? obj.objectType);
  const sectorLabel = obj.sector ? (SECTOR_LABELS[obj.sector] ?? obj.sector) : null;

  const evidence = obj.textEvidence ?? obj.sourceQuote;
  const hasEvidence = !!evidence && evidence.length > 10;

  return (
    <article className={`
      flex flex-col gap-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60
      border-l-2 ${t.accent}
      ${compact ? "p-4" : "p-5"}
      transition-colors hover:bg-zinc-900/80
    `}>

      {/* ── Top: type + sector + tier ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${t.typeBg}`}>
          {typeLabel}
        </span>
        {sectorLabel && (
          <span className="text-[10px] text-zinc-600 font-medium">{sectorLabel}</span>
        )}
        {obj.extractionTier === "atomic" && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded border ${t.tierAtomic}`}>
            ⚛ Atomic
          </span>
        )}
        {obj.extractionTier === "structured" && (
          <span className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded border ${t.tierStructured}`}>
            ✦ Structured
          </span>
        )}
      </div>

      {/* ── Title — the "what" ── */}
      <div className="space-y-1.5">
        <h2 className={`font-black text-white leading-snug ${compact ? "text-base" : "text-lg"}`}>
          {obj.titleNepali}
        </h2>

        {/* Bhakti: show shloka text above summary */}
        {obj.shlokaText && (
          <p className="text-violet-300/70 text-sm font-serif italic leading-relaxed">
            {obj.shlokaText}
          </p>
        )}

        {/* ── Summary — the "so what" (plain Nepali, citizen-readable) ── */}
        <p className="text-zinc-300 text-sm leading-relaxed">
          {obj.summaryNepali}
        </p>
      </div>

      {/* ── Specifics: budget, target ── */}
      {(obj.budgetAmount || obj.target) && (
        <div className="flex flex-wrap gap-2">
          {obj.budgetAmount && (
            <span className="text-xs text-amber-400 font-mono font-bold px-2 py-1 rounded-lg bg-amber-950/20 border border-amber-900/30">
              {obj.budgetAmount}
            </span>
          )}
          {obj.target && (
            <span className="text-xs text-zinc-400 font-mono px-2 py-1 rounded-lg bg-zinc-800/40 border border-zinc-700/30">
              {obj.target}
            </span>
          )}
          {obj.fiscalYear && (
            <span className="text-xs text-zinc-600 px-2 py-0.5 rounded bg-zinc-900/60">
              {obj.fiscalYear}
            </span>
          )}
        </div>
      )}

      {/* ── Evidence — the "proof" (atomic/structured source trace) ── */}
      {hasEvidence && (
        <blockquote className={`rounded-lg border px-3 py-2.5 space-y-1 ${t.evidenceBg}`}>
          <p className={`text-xs italic leading-relaxed line-clamp-3 ${t.evidenceText}`}>
            &ldquo;{evidence}&rdquo;
          </p>
          {obj.pageNumber && (
            <p className={`text-[10px] font-mono ${t.pageRef}`}>— Page {obj.pageNumber}</p>
          )}
        </blockquote>
      )}

      {/* ── Footer: source + constitutional refs ── */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1 border-t border-zinc-800/40">
        {/* Source */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${t.sourceDot}`} />
          <span className={`text-[11px] truncate ${t.sourceText}`}>
            {obj.sourceTitle ?? "Official Source"}
          </span>
        </div>

        {/* Constitutional refs */}
        {obj.constitutionalRefs && obj.constitutionalRefs.length > 0 && (
          <div className="flex items-center gap-1 shrink-0">
            {obj.constitutionalRefs.slice(0, 3).map(ref => (
              <span
                key={ref}
                className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${t.constBg}`}
              >
                भाग {ref}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Tags (collapsed, only if compact=false and tags exist) ── */}
      {!compact && obj.tags && obj.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {obj.tags.slice(0, 4).map(tag => (
            <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border ${t.tagBg}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

    </article>
  );
}
