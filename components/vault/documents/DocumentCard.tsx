"use client";

import { useState } from "react";
import Link from "next/link";
import { LearnTip } from "../LearnTip";
import type { IntelligenceDocument, AdminApprovalStatus, SourceType } from "../../../lib/types/documents";
import { EXTRACTION_TIER_LABELS, EXTRACTION_TIER_BADGE } from "../../../lib/types/extraction-pipeline";
import type { ExtractionTier } from "../../../lib/types/extraction-pipeline";
import { classifyDocument, KNOWLEDGE_TIER_META } from "../../../lib/vault/knowledgePriority";
import { TrustBadge }  from "../TrustBadge";
import { trustFromDoc } from "../../../lib/intelligence/trust-score";

// ── Admin Teacher Panel ───────────────────────────────────────────────────────
// Teaches the admin (as a teacher/curator) what every action button does at the
// backend level: AI thinking pattern → data created → how it reaches citizens.

interface DocActionDef {
  id:         string;
  icon:       string;
  label:      string;
  color:      string;        // tailwind border+text classes
  bgColor:    string;        // tailwind bg class
  // 4 teaching dimensions
  aiSees:     string;        // what input AI receives
  aiThinks:   string;        // what reasoning AI applies (the pattern)
  creates:    string[];      // exact Firestore writes that happen
  reaches:    string[];      // how knowledge flows to citizens
  adminRole:  string;        // what the admin-as-teacher should decide
}

const DOC_ACTIONS: DocActionDef[] = [
  {
    id:       "reanalyze",
    icon:     "🔄",
    label:    "नेपालीमा Re-analyze",
    color:    "border-orange-700 text-orange-300",
    bgColor:  "bg-orange-950/30",
    aiSees:   "R2 bucket बाट पुरै document content download गरेर OCR/text extract गर्छ — original PDF/DOCX को हरेक page।",
    aiThinks: "THINKING PATTERN: Document लाई 'नागरिक-पठनीय' बनाउने। AI ले सोच्छ: 'यो NRB circular मा EPF interest rate change छ — नेपाली कर्मचारीले यो कसरी बुझ्छन्? सरल भाषामा explain गर्नुपर्छ।' Nepali explainer = citizen translation, not literal translation।",
    creates:  [
      "vault_intelligence_docs → nepaliExplainer (updated): सरल नेपाली explanation",
      "vault_intelligence_docs → translationNe (updated): Nepali language content",
      "vault_intelligence_docs → aiKeyInsights[] (refreshed): better extracted insights",
      "vault_intelligence_docs → updatedAt: timestamp update",
    ],
    reaches:  [
      "vault_atoms OS → Nepali text improve हुन्छ — Learning Mode cards better",
      "/janta public page → document ko Nepali card content improve",
      "Branch Health: affectedSectors refresh → tree health recalculate",
      "Learning Mode: नागरिकले document बारे Nepali मा बुझ्न पाउँछन्",
    ],
    adminRole: "Admin teacher को निर्णय: 'Nepali content poor quality छ कि Nepali-first audience लाई थप explanation चाहिन्छ?' Re-analyze गर्नु भनेको AI लाई एकपटक फेरि 'नागरिकको भाषामा explain गर्' भन्नु हो।",
  },
  {
    id:       "queue",
    icon:     "➕",
    label:    "Content Queue मा Add",
    color:    "border-cyan-700 text-cyan-300",
    bgColor:  "bg-cyan-950/30",
    aiSees:   "❌ No new AI call — AI ले already document analyse गर्दा contentIdeas[] generate गरेको छ। ती existing ideas नै queue मा transform हुन्छन्।",
    aiThinks: "THINKING PATTERN: Document intelligence → Content production flywheel। AI ले पहिले नै सोचेको: 'यो EPF circular बाट 3 YouTube videos बन्न सक्छन्: (1) EPF withdrawal rules, (2) Interest rate comparison, (3) SSF vs EPF difference।' तपाईं ती ideas लाई production मा move गर्दैहुनुहुन्छ।",
    creates:  [
      "vault_content_queue → contentIdeas.length नयाँ QueueItem records",
      "QueueItem fields: sourceDocId, aiTitle, aiHook, status: 'pending', createdAt",
      "vault_content_queue → links back to this vault_intelligence_docs ID",
      "❌ vault_intelligence_docs unchanged — ideas just copied to queue",
    ],
    reaches:  [
      "/vault/content/queue → Admin queue मा items appear — approve/reject गर्नुपर्छ",
      "Queue approved → /vault/content/ai-studio → YouTube script generate हुन्छ",
      "Script → Thumbnail → YouTube publish → नागरिकसम्म civic intelligence पुग्छ",
      "Analytics: recommendation_clicks → कुन content idea ले बढी engagement पायो track",
    ],
    adminRole: "Admin teacher को निर्णय: 'यो document मा AI ले generate गरेका ideas civic value राख्छन् कि clickbait छन्?' Queue मा add गर्नु भनेको content production pipeline unlock गर्नु हो — त्यसपछि प्रत्येक idea फेरि approve/reject गर्न मिल्छ।",
  },
  {
    id:       "heroimage",
    icon:     "🖼",
    label:    "Janta Hero Image",
    color:    "border-purple-700 text-purple-300",
    bgColor:  "bg-purple-950/30",
    aiSees:   "doc.title + doc.aiSummary + doc.category + doc.affectedSectors — document को core message र visual context।",
    aiThinks: "THINKING PATTERN: Document को core message → Visual metaphor। AI ले सोच्छ: 'साधन सुशासन document = accountability, transparency — visual: scale of justice + digital Nepal + mountain backdrop।' Prompt engineering: civic emotion + Nepal context + professional infographic style।",
    creates:  [
      "API call: Gemini Imagen → 1024×1024 PNG generate",
      "R2 bucket upload → unique path: /hero-images/{docId}.png",
      "vault_intelligence_docs → heroImageUrl: R2 public URL (updated)",
      "vault_intelligence_docs → updatedAt: timestamp update",
    ],
    reaches:  [
      "/janta public page → document card मा hero image देखिन्छ",
      "नागरिकको first impression = visual ले civic content को seriousness convey गर्छ",
      "Social sharing: image = shareable civic intelligence card",
      "YouTube thumbnail base: hero image बाट thumbnail derive गर्न सकिन्छ",
    ],
    adminRole: "Admin teacher को निर्णय: 'यो document जनतासम्म पुग्नु पर्छ — visual identity दिएर attention capture गर्ने।' Hero image = document को public face। नभएमा /janta मा document bland text-only card हुन्छ।",
  },
  {
    id:       "policypoints",
    icon:     "🎯",
    label:    "Policy Points (Gaming Cards)",
    color:    "border-amber-700 text-amber-300",
    bgColor:  "bg-amber-950/30",
    aiSees:   "doc.ocrText वा doc.aiSummary — document को full content, particularly numbered commitments, targets, goals, visions।",
    aiThinks: "THINKING PATTERN: Long policy doc → Atomic swipeable facts। AI ले सोच्छ: 'यो 100-point governance agenda document छ — प्रत्येक point एउटा specific commitment हो। Gaming card format: Title (5 words) + Detail (2 sentences) + Who Benefits + Civic Impact Score (1-10)।' Youth-first design: Tinder-swipe format for civic education।",
    creates:  [
      "policy_points collection → structured PolicyPoint records",
      "Fields: title, detail, beneficiaries, impactScore, constitutionalRef, docId",
      "Typically 20-100 points per complex policy document",
      "vault_intelligence_docs → pointCount updated",
    ],
    reaches:  [
      "/janta → Gaming Cards section → youth swipe civic engagement",
      "Each card = one government commitment → trackable over time",
      "High-impact cards → featured in /janta trending section",
      "Future: Quiz mode — 'के यो commitment fulfilled भयो?'",
    ],
    adminRole: "Admin teacher को निर्णय: 'यो document युवाहरूले swipe गरेर सिक्न मिल्ने छ कि?' Policy Points = complex governance → gamified civic education। 100 pages → 50 swipeable cards।",
  },
  {
    id:       "deepintel",
    icon:     "🏛️",
    label:    "Intelligence Extract (Tier 1.5 — संरचित)",
    color:    "border-indigo-700 text-indigo-300",
    bgColor:  "bg-indigo-950/30",
    aiSees:   "doc.ocrText — chunk by chunk scan (Tier 1.5 Structured Intelligence)। AI ले document लाई 14,000 character chunks मा divide गर्छ र प्रत्येक chunk बाट trackable commitments extract गर्छ। NOTE: यो page-level extraction होइन — page number र verbatim evidence को लागि Tier 2 Atomic Extract चाहिन्छ।",
    aiThinks: "THINKING PATTERN (Tier 1.5 — Structured): Document = government accountability source। AI ले सोच्छ: 'यो budget speech मा शिक्षामा ५ अर्ब भनेको छ → यो एउटा budget_target record हो। Constitutional ref: धारा ३१। Implementation status: announced। Measurable: yes।' प्रत्येक record future मा track हुन्छ। तर page number र verbatim text Tier 1.5 मा store हुँदैन — त्यसको लागि Atomic Extract (Tier 2) चाहिन्छ।",
    creates:  [
      "janta_intelligence → multiple IntelligenceRecord documents",
      "Types: promise, budget_target, project, institution, reform, social_program",
      "Fields: constitutionalRefs[], implementationStatus, traceability {sourceQuote}",
      "janta_relationships → cross-document relationship edges (same commitment found elsewhere?)",
      "⚡ Bridge: vault_civic_atoms health → Branch Health recalculate automatically",
    ],
    reaches:  [
      "🌳 Constitution Tree: Branch Health score change — branches 'grow' वा 'decay'",
      "/vault/constitution/health: नयाँ intel records → branch scores update",
      "Civic Gap detection: promise vs implementation मा gap calculate",
      "Public: Constitution Tree मा real government commitments visible हुन्छन्",
      "Future: Promise Tracker — 2 years later fulfilled भयो कि भएन?",
    ],
    adminRole: "Admin teacher को सबभन्दा महत्वपूर्ण निर्णय: 'AI ले निकालेको intel records accurate छन् कि छैनन्? कुन commitments real हुन्, कुन vague aspirations हुन्?' AI ले extract गर्छ तर तपाईंले curate गर्नुपर्छ — wrong commitment track गर्नु = civic misinformation।",
  },
];

// ── Knowledge Flow Map ────────────────────────────────────────────────────────

const KNOWLEDGE_FLOW = [
  { step: "📄", label: "Document",  sub: "vault_intelligence_docs",  color: "#60a5fa" },
  { step: "🤖", label: "AI Extract", sub: "Gemini / Bedrock",          color: "#fb923c" },
  { step: "⚛",  label: "Atoms",     sub: "vault_civic_atoms",         color: "#67e8f9" },
  { step: "🏛️", label: "Intel",     sub: "janta_intelligence",        color: "#a78bfa" },
  { step: "🌳", label: "Tree",      sub: "Branch Health",             color: "#4ade80" },
  { step: "👁",  label: "Public",   sub: "/janta + /constitution",    color: "#fbbf24" },
];

type ActionId = DocActionDef["id"];

function DocActionTeachPanel({ doc }: { doc: IntelligenceDocument }) {
  const [open,   setOpen]   = useState(false);
  const [active, setActive] = useState<ActionId | null>(null);

  if (doc.adminApprovalStatus !== "approved") return null;

  // Only show actions that are relevant for this doc
  const relevant = DOC_ACTIONS.filter(a => {
    if (a.id === "heroimage" && doc.heroImageUrl) return false;   // already has image
    if (a.id === "queue"     && (doc.contentIdeas?.length ?? 0) === 0) return false;
    if (a.id === "deepintel" && isConstitutionDoc(doc)) return false; // constitution has its own extract
    return true;
  });

  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      {/* Toggle row */}
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-zinc-900/40 hover:bg-zinc-900/70 transition-colors text-left"
      >
        <span className="text-sm">🧠</span>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-white">Admin Teacher Mode</span>
          <span className="text-zinc-600 text-xs ml-2">— यी buttons ले backend मा के हुन्छ?</span>
        </div>
        <span className="text-zinc-600 text-xs shrink-0">{relevant.length} actions</span>
        <span className="text-zinc-600 text-xs">{open ? "↑" : "↓"}</span>
      </button>

      {open && (
        <div className="border-t border-zinc-900 divide-y divide-zinc-900">

          {/* Knowledge Flow Strip */}
          <div className="px-3 py-2.5 bg-zinc-950/50">
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-2">
              📡 Knowledge Graph — Document बाट जनतासम्म
            </p>
            <div className="flex items-center gap-0 overflow-x-auto">
              {KNOWLEDGE_FLOW.map((f, i) => (
                <div key={f.step} className="flex items-center shrink-0">
                  <div className="flex flex-col items-center gap-0.5 px-2 py-1">
                    <span className="text-sm leading-none">{f.step}</span>
                    <span className="text-[9px] font-bold leading-none" style={{ color: f.color }}>{f.label}</span>
                    <span className="text-[8px] text-zinc-700 leading-none font-mono">{f.sub}</span>
                  </div>
                  {i < KNOWLEDGE_FLOW.length - 1 && (
                    <span className="text-zinc-800 text-xs shrink-0">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action list */}
          {relevant.map(action => (
            <div key={action.id}>
              {/* Action header */}
              <button
                onClick={() => setActive(p => p === action.id ? null : action.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900/40 ${active === action.id ? action.bgColor : ""}`}
              >
                <span className="text-base shrink-0">{action.icon}</span>
                <span className={`text-xs font-bold flex-1 ${action.color.split(" ")[1]}`}>{action.label}</span>
                <span className="text-zinc-700 text-[10px] shrink-0">{active === action.id ? "↑ बन्द" : "↓ सिक्नुहोस्"}</span>
              </button>

              {/* Action detail — 4 teaching dimensions */}
              {active === action.id && (
                <div className={`px-3 pb-3 space-y-2 ${action.bgColor}`}>

                  {/* AI Sees */}
                  <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-2.5 py-2 space-y-1">
                    <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">👁 AI ले के INPUT पाउँछ</p>
                    <p className="text-xs text-zinc-300 leading-relaxed">{action.aiSees}</p>
                  </div>

                  {/* AI Thinks — the key teaching */}
                  <div className="rounded-lg bg-zinc-900/80 border border-zinc-700 px-2.5 py-2.5 space-y-1">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wider">🧠 AI को THINKING PATTERN</p>
                    <p className="text-xs text-amber-200/80 leading-relaxed">{action.aiThinks}</p>
                  </div>

                  {/* Creates */}
                  <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-2.5 py-2 space-y-1">
                    <p className="text-[9px] font-bold text-cyan-500 uppercase tracking-wider">📦 के DATA बन्छ (Firestore writes)</p>
                    <ul className="space-y-0.5">
                      {action.creates.map((line, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-cyan-200/70">
                          <span className="text-cyan-800 shrink-0 mt-0.5">→</span>
                          <span className="font-mono text-[10px] leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Reaches citizens */}
                  <div className="rounded-lg bg-zinc-900/60 border border-zinc-800 px-2.5 py-2 space-y-1">
                    <p className="text-[9px] font-bold text-green-500 uppercase tracking-wider">🌐 जनतासम्म कसरी पुग्छ</p>
                    <ul className="space-y-0.5">
                      {action.reaches.map((line, i) => (
                        <li key={i} className="flex gap-1.5 text-xs text-green-200/70">
                          <span className="text-green-800 shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Admin Role — the teacher's decision */}
                  <div className="rounded-lg bg-amber-950/40 border border-amber-800/60 px-2.5 py-2.5 space-y-1">
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">🎓 Admin Teacher को भूमिका</p>
                    <p className="text-xs text-amber-200/80 leading-relaxed">{action.adminRole}</p>
                  </div>

                </div>
              )}
            </div>
          ))}

          {/* Bottom: navigation to downstream pages */}
          <div className="px-3 py-2.5 flex gap-2 flex-wrap">
            <p className="text-[9px] text-zinc-600 w-full font-bold uppercase tracking-wider mb-1">यो document approve भएपछि यहाँ हेर्नुहोस्:</p>
            {[
              { href: "/vault/atoms",               label: "⚛ Atoms OS",    color: "text-cyan-400 border-cyan-900" },
              { href: "/vault/constitution/health", label: "🩺 Branch Health", color: "text-green-400 border-green-900" },
              { href: "/constitution",              label: "🌳 Public Tree",  color: "text-amber-400 border-amber-900" },
              { href: "/janta",                     label: "👁 /janta",      color: "text-violet-400 border-violet-900" },
            ].map(n => (
              <Link
                key={n.href}
                href={n.href}
                className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${n.color} bg-zinc-900/50 hover:bg-zinc-800 transition-colors`}
              >
                {n.label}
              </Link>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}

const FILE_ICONS: Record<string, string> = {
  pdf:   "📄",
  docx:  "📝",
  md:    "📋",
  txt:   "📃",
  image: "🖼",
  other: "📁",
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  uploading:     { label: "Uploading",   cls: "bg-blue-900  text-blue-300"                  },
  ready:         { label: "Ready",       cls: "bg-zinc-800  text-zinc-400"                  },
  processing_ai: { label: "Analyzing…",  cls: "bg-amber-900 text-amber-300 animate-pulse"   },
  ai_ready:      { label: "AI Ready",    cls: "bg-green-900 text-green-400"                 },
  ai_paused:     { label: "AI Paused",   cls: "bg-amber-900 text-amber-400"                 },
  error:         { label: "Error",       cls: "bg-red-900   text-red-400"                   },
};

const APPROVAL_BADGE: Record<AdminApprovalStatus, { label: string; cls: string }> = {
  pending_review: { label: "Pending Review", cls: "bg-amber-900 text-amber-300 border border-amber-800" },
  approved:       { label: "Approved",       cls: "bg-green-900 text-green-300 border border-green-800" },
  needs_revision: { label: "Needs Revision", cls: "bg-red-900   text-red-300   border border-red-800"   },
};

const CAT_COLORS: Record<string, string> = {
  research:     "border-purple-800",
  strategy:     "border-blue-800",
  legal:        "border-rose-800",
  finance:      "border-green-800",
  content:      "border-amber-800",
  intelligence: "border-cyan-800",
  other:        "border-zinc-800",
};

function formatSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

interface Props {
  doc:               IntelligenceDocument;
  isProcessing:      boolean;
  queueCount?:       number;
  onView:            (doc: IntelligenceDocument) => void;
  onProcess:         (doc: IntelligenceDocument) => void;
  onDelete:          (doc: IntelligenceDocument) => void;
  onGenerateQueue?:  (doc: IntelligenceDocument) => void;
  onResetStuck?:     (doc: IntelligenceDocument) => void;
  onGenerateImage?:  (doc: IntelligenceDocument) => void;
  isGeneratingImage?: boolean;
  onExtractPoints?:  (doc: IntelligenceDocument) => void;
  isExtractingPoints?: boolean;
  pointCount?:       number;
  onExtractPromises?: (doc: IntelligenceDocument) => void;
  isExtractingPromises?: boolean;
  promiseCount?:     number;
  onExtractIntel?:         (doc: IntelligenceDocument) => void;
  isExtractingIntel?:      boolean;
  isMatchingIntel?:        boolean;
  intelCount?:             number;
  relCount?:               number;
  onExtractConstitution?:  (doc: IntelligenceDocument) => void;
  isExtractingConstitution?: boolean;
  constitutionBatch?:      number; // 1–22 = which of 22 article-range batches is running
  constitutionCount?:      number;
  onExtractAtomic?:        (doc: IntelligenceDocument) => void;
  isExtractingAtomic?:     boolean;
  atomicIntelCount?:       number;
  atomicCostEstimate?:     string; // e.g. "~$0.30"
  atomicStatusMsg?:        string; // inline status (replaces alert())
  onArchive?:              (doc: IntelligenceDocument) => void;
  isArchiving?:            boolean;
}

const PROVIDER_LABEL: Record<string, string> = {
  "gemini-flash":    "Gemini",
  "bedrock-sonnet":  "Bedrock",
  "anthropic-sonnet":"Anthropic",
};

const SOURCE_TYPE_BADGE: Record<SourceType, { label: string; cls: string }> = {
  official:   { label: "✓ Official",   cls: "bg-green-950  text-green-400  border border-green-800"  },
  unofficial: { label: "⚠ Unofficial", cls: "bg-amber-950  text-amber-400  border border-amber-800"  },
  research:   { label: "◎ Research",   cls: "bg-blue-950   text-blue-400   border border-blue-800"   },
  unknown:    { label: "? Unknown",    cls: "bg-zinc-800   text-zinc-500   border border-zinc-700"   },
};

function isConstitutionDoc(doc: IntelligenceDocument): boolean {
  const name = `${doc.title ?? ""} ${doc.fileName ?? ""}`.toLowerCase();
  return (
    name.includes("constitution") ||
    name.includes("संविधान")     ||
    name.includes("ंविधान")      || // handles "स_ंविधान" filename with underscore split
    name.includes("samvidhan")
  );
}

export function DocumentCard({ doc, isProcessing, queueCount = 0, onView, onProcess, onDelete, onGenerateQueue, onResetStuck, onGenerateImage, isGeneratingImage = false, onExtractPoints, isExtractingPoints = false, pointCount = 0, onExtractPromises, isExtractingPromises = false, promiseCount = 0, onExtractIntel, isExtractingIntel = false, isMatchingIntel = false, intelCount = 0, relCount = 0, onExtractConstitution, isExtractingConstitution = false, constitutionBatch = 0, constitutionCount = 0, onExtractAtomic, isExtractingAtomic = false, atomicIntelCount = 0, atomicCostEstimate, atomicStatusMsg, onArchive, isArchiving = false }: Props) {
  const [showFullNotes,      setShowFullNotes]      = useState(false);
  const [confirmAtomic,      setConfirmAtomic]      = useState(false);
  const displayStatus  = isProcessing ? "processing_ai" : doc.processingStatus;
  const tier           = (doc.extractionTier ?? "none") as ExtractionTier;
  const tierMeta       = EXTRACTION_TIER_LABELS[tier];
  const tierBadge      = EXTRACTION_TIER_BADGE[tier];
  const knowledgeTier  = doc.knowledgeTier ?? classifyDocument({
    title: doc.title, fileName: doc.fileName, sourceAuthority: doc.sourceAuthority,
    institutionName: doc.institutionName, govFolder: doc.govFolder,
    sourceType: doc.sourceType, tags: doc.tags, category: doc.category,
    description: doc.description,
  }).tier;
  const kMeta          = KNOWLEDGE_TIER_META[knowledgeTier];

  // Detect stuck: Firestore says processing_ai but this browser session isn't the one running it
  const isStuck = doc.processingStatus === "processing_ai" && !isProcessing;
  const status         = STATUS_BADGE[displayStatus] ?? STATUS_BADGE.ready;
  const border         = CAT_COLORS[doc.category] ?? "border-zinc-800";
  // AI can be retried from ready, ai_paused, or legacy error states
  const canProcess     = !isProcessing && ["ready", "ai_paused", "error"].includes(doc.processingStatus);
  const approvalStatus = doc.adminApprovalStatus;
  const isApproved     = approvalStatus === "approved";
  const canGenerateQueue = isApproved && !!onGenerateQueue && (doc.contentIdeas?.length ?? 0) > 0 && queueCount === 0;
  const trust          = trustFromDoc(doc);

  return (
    <div className={`bg-zinc-900 border ${border} rounded-2xl p-4 flex flex-col gap-3 hover:border-zinc-600 transition-colors`}>

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl shrink-0">{FILE_ICONS[doc.fileType] ?? "📁"}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-snug line-clamp-2">{doc.title}</p>
            <p className="text-zinc-500 text-xs mt-0.5">{doc.fileName}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {isStuck ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900 text-red-300 animate-pulse">Stuck</span>
          ) : (
            <span className={`text-xs px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
          )}
          {/* Extraction tier — honest label (never says "deep" unless atomic) */}
          <span
            title={tierMeta.desc}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${tierBadge.bg} ${tierBadge.color} ${tierBadge.border}`}
          >
            {tierMeta.np}
          </span>
          {/* Knowledge priority tier — what kind of intelligence asset this is */}
          <span
            title={`Knowledge Priority: ${kMeta.en}`}
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${kMeta.bg} ${kMeta.color} ${kMeta.border}`}
          >
            {kMeta.np}
          </span>
          {doc.processingStatus === "ai_ready" && <TrustBadge trust={trust} />}
        </div>
      </div>

      {/* Description */}
      {doc.description && (
        <p className="text-zinc-400 text-xs line-clamp-2">{doc.description}</p>
      )}

      {/* Source type + authority — trust header */}
      {doc.sourceType && doc.sourceType !== "unknown" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SOURCE_TYPE_BADGE[doc.sourceType].cls}`}>
            {SOURCE_TYPE_BADGE[doc.sourceType].label}
          </span>
          {doc.sourceAuthority && (
            <span className="text-zinc-500 text-xs truncate">{doc.sourceAuthority}</span>
          )}
        </div>
      )}

      {/* AI Summary */}
      {doc.aiSummary && (
        <div className="bg-zinc-800/60 rounded-xl p-3 border border-zinc-700">
          <p className="text-zinc-500 text-xs mb-1 font-semibold">AI Summary</p>
          <p className="text-zinc-300 text-xs line-clamp-3">{doc.aiSummary}</p>
        </div>
      )}

      {/* Nepali explainer — public trust layer */}
      {doc.nepaliExplainer && (
        <div className="bg-blue-950/40 rounded-xl p-3 border border-blue-900/50">
          <p className="text-blue-400 text-xs mb-1 font-semibold">सरल नेपालीमा</p>
          <p className="text-blue-200 text-xs line-clamp-3">{doc.nepaliExplainer}</p>
        </div>
      )}

      {/* Key Insights */}
      {doc.aiKeyInsights && doc.aiKeyInsights.length > 0 && (
        <ul className="space-y-1">
          {doc.aiKeyInsights.slice(0, 3).map((insight, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-400">
              <span className="text-green-600 shrink-0 mt-0.5">•</span>
              <span className="line-clamp-2">{insight}</span>
            </li>
          ))}
          {doc.aiKeyInsights.length > 3 && (
            <li className="text-xs text-zinc-600 pl-3">+{doc.aiKeyInsights.length - 3} more insights</li>
          )}
        </ul>
      )}

      {/* Affected sectors */}
      {doc.affectedSectors && doc.affectedSectors.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.affectedSectors.slice(0, 4).map(sector => (
            <span key={sector} className="text-xs bg-purple-950 text-purple-400 border border-purple-900 px-2 py-0.5 rounded-full">
              {sector}
            </span>
          ))}
          {doc.affectedSectors.length > 4 && (
            <span className="text-xs text-zinc-600">+{doc.affectedSectors.length - 4}</span>
          )}
        </div>
      )}

      {/* Youth impact — if exists and no Nepali explainer */}
      {doc.youthImpact && !doc.nepaliExplainer && (
        <div className="bg-zinc-800/40 rounded-xl p-3 border border-zinc-700/60">
          <p className="text-zinc-500 text-xs mb-1 font-semibold">युवाहरूलाई असर</p>
          <p className="text-zinc-400 text-xs line-clamp-2">{doc.youthImpact}</p>
        </div>
      )}

      {/* Content Ideas — flywheel connector with queue traceability */}
      {doc.contentIdeas && doc.contentIdeas.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-zinc-500 text-xs font-semibold">Content Ideas</p>
            {queueCount > 0 ? (
              <Link
                href="/vault/content/queue"
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                {queueCount} in queue →
              </Link>
            ) : (
              <span className="text-xs text-zinc-700">{doc.contentIdeas.length} generated</span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {doc.contentIdeas.slice(0, 3).map((idea, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-zinc-600 text-xs shrink-0 mt-0.5">→</span>
                <p className="text-zinc-400 text-xs line-clamp-2">{idea}</p>
              </div>
            ))}
            {doc.contentIdeas.length > 3 && (
              <p className="text-zinc-600 text-xs pl-3">+{doc.contentIdeas.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.tags.slice(0, 4).map(tag => (
            <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
          {doc.tags.length > 4 && (
            <span className="text-xs text-zinc-600">+{doc.tags.length - 4}</span>
          )}
        </div>
      )}

      {/* Detected topics */}
      {doc.detectedTopics && doc.detectedTopics.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {doc.detectedTopics.map(topic => (
            <span key={topic} className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-900 px-2 py-0.5 rounded-full">{topic}</span>
          ))}
        </div>
      )}

      {/* Stuck recovery banner — processing_ai but no active browser session */}
      {isStuck && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl px-3 py-2.5 space-y-2">
          <p className="text-xs text-red-300 font-semibold">Analysis अड्किएको छ (Stuck)</p>
          <p className="text-xs text-red-400/80">
            AI analysis सुरु भएको थियो तर सकिएन — browser बन्द भयो वा timeout भयो।
            Document सुरक्षित छ।
          </p>
          <button
            onClick={() => onResetStuck?.(doc)}
            className="w-full text-xs font-bold py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white transition-colors"
          >
            🔄 Reset गरेर फेरि Analyze गर्नुहोस्
          </button>
        </div>
      )}

      {/* AI paused — prominent retry banner */}
      {doc.processingStatus === "ai_paused" && (
        <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl px-3 py-2.5 space-y-1">
          <p className="text-xs text-amber-400 font-semibold flex items-center gap-1">
            AI Analysis रोकिएको छ <LearnTip term="AI Paused" />
          </p>
          {doc.aiProcessingError && (
            <p className="text-xs text-amber-600/80 line-clamp-2">{doc.aiProcessingError}</p>
          )}
          <p className="text-xs text-zinc-500">Document सुरक्षित छ — पछि retry गर्न सकिन्छ</p>
        </div>
      )}

      {/* Source metadata — traceability footer */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-zinc-700">
        <span>{formatSize(doc.fileSize)}</span>
        <span>·</span>
        <span>{doc.category}</span>
        {doc.confidence !== undefined && (
          <>
            <span>·</span>
            <span className={doc.confidence >= 0.7 ? "text-green-700" : doc.confidence >= 0.4 ? "text-yellow-700" : "text-red-700"}>
              {Math.round(doc.confidence * 100)}% confidence
            </span>
          </>
        )}
        {doc.aiProvider && (
          <>
            <span>·</span>
            <span className="text-zinc-600">{PROVIDER_LABEL[doc.aiProvider] ?? doc.aiProvider}</span>
          </>
        )}
        {doc.language && doc.language !== "English" && (
          <>
            <span>·</span>
            <span>{doc.language}</span>
          </>
        )}
      </div>

      {/* Admin approval status — shown after AI processing */}
      {approvalStatus && doc.processingStatus === "ai_ready" && (
        <div className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between gap-2 ${APPROVAL_BADGE[approvalStatus].cls}`}>
          <span className="font-semibold flex items-center gap-1">
            {APPROVAL_BADGE[approvalStatus].label}
            {approvalStatus === "pending_review" && <LearnTip term="pending_review" />}
          </span>
          {approvalStatus === "pending_review" && (
            <Link href="/vault/admin?tab=documents" className="underline hover:no-underline">
              Review in Admin Vault →
            </Link>
          )}
          {approvalStatus === "needs_revision" && doc.adminApprovalNotes && (
            <button
              onClick={() => setShowFullNotes(p => !p)}
              className="opacity-75 text-left hover:opacity-100 transition-opacity"
            >
              <span className={showFullNotes ? "" : "line-clamp-1"}>{doc.adminApprovalNotes}</span>
              {!showFullNotes && doc.adminApprovalNotes.length > 60 && (
                <span className="text-red-400 ml-1 text-xs">more ↓</span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Footer actions */}
      {/* Full-width AI retry — only when paused/ready and not stuck */}
      {canProcess && !isProcessing && !isStuck && (
        <button
          onClick={() => onProcess(doc)}
          className={`w-full text-xs font-bold py-2 rounded-xl transition-colors ${
            doc.processingStatus === "ai_paused"
              ? "bg-amber-600 hover:bg-amber-500 text-black"
              : "bg-zinc-800 hover:bg-zinc-700 text-amber-400"
          }`}
        >
          {doc.processingStatus === "ai_paused" ? "🔄 AI Analysis Retry गर्नुहोस्" : "🤖 AI ले Analyze गर्नुहोस्"}
        </button>
      )}

      {/* Re-analyze for approved docs — to get Nepali content */}
      {isApproved && !isProcessing && (
        <button
          onClick={() => onProcess(doc)}
          className="w-full text-xs py-1.5 rounded-xl text-zinc-500 hover:text-amber-400 border border-zinc-800 hover:border-amber-900 transition-colors"
        >
          🔄 नेपालीमा Re-analyze गर्नुहोस्
        </button>
      )}

      {canGenerateQueue && !isProcessing && (
        <button
          onClick={() => onGenerateQueue!(doc)}
          className="w-full text-xs font-bold py-2 rounded-xl bg-cyan-900/50 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition-colors"
        >
          ➕ Content Queue मा Add गर्नुहोस्
        </button>
      )}

      {isApproved && !!onGenerateImage && !doc.heroImageUrl && !isGeneratingImage && (
        <button
          onClick={() => onGenerateImage!(doc)}
          className="w-full text-xs font-bold py-2 rounded-xl bg-purple-900/50 hover:bg-purple-900 text-purple-300 border border-purple-800 transition-colors"
        >
          🖼 Janta Hero Image Generate गर्नुहोस्
        </button>
      )}
      {isGeneratingImage && (
        <div className="w-full text-xs py-2 rounded-xl bg-purple-900/30 text-purple-400 border border-purple-800 text-center animate-pulse">
          🖼 Image generate हुँदैछ…
        </div>
      )}
      {isApproved && doc.heroImageUrl && (
        <div className="w-full text-xs py-2 rounded-xl bg-green-900/30 text-green-400 border border-green-800 text-center">
          ✅ Hero Image ready — /janta मा देखिन्छ
        </div>
      )}

      {/* Policy point extraction — for complex multi-point docs like "100 नीति" */}
      {isApproved && !!onExtractPoints && !isExtractingPoints && pointCount === 0 && (
        <button
          onClick={() => onExtractPoints!(doc)}
          className="w-full text-xs font-bold py-2 rounded-xl bg-amber-900/40 hover:bg-amber-900 text-amber-300 border border-amber-800 transition-colors"
        >
          🎯 Policy Points निकाल्नुहोस् (Gaming Cards)
        </button>
      )}
      {isExtractingPoints && (
        <div className="w-full text-xs py-2 rounded-xl bg-amber-900/20 text-amber-400 border border-amber-800 text-center animate-pulse">
          🎯 Points निकाल्दैछ — Gemini ले analyze गर्दैछ…
        </div>
      )}
      {isApproved && pointCount > 0 && !isExtractingPoints && (
        <div className="w-full text-xs py-2 rounded-xl bg-amber-900/20 text-amber-400 border border-amber-800 text-center flex items-center justify-center gap-2">
          <span>🎯 {pointCount} gaming points ready</span>
          <button
            onClick={() => onExtractPoints?.(doc)}
            className="underline text-amber-500 hover:text-amber-300 text-xs"
          >
            Re-extract
          </button>
        </div>
      )}

      {/* Constitution Framework Extract — full 35 parts, 6 batches */}
      {isApproved && isConstitutionDoc(doc) && !!onExtractConstitution && !isExtractingConstitution && constitutionCount === 0 && (
        <button
          onClick={() => onExtractConstitution!(doc)}
          className="w-full text-xs font-bold py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
        >
          📜 सम्पूर्ण संविधान Extract गर्नुस् (३०८ धाराहरू)
        </button>
      )}
      {isExtractingConstitution && (
        <div className="w-full rounded-xl bg-amber-950/40 border border-amber-800 px-3 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-amber-300 text-xs font-bold animate-pulse">📜 संविधान extract हुँदैछ…</p>
            <span className="text-amber-600 text-xs font-mono">{constitutionBatch}/22 बैच</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1">
            <div
              className="bg-amber-500 h-1 rounded-full transition-all duration-500"
              style={{ width: `${(constitutionBatch / 22) * 100}%` }}
            />
          </div>
          <p className="text-amber-700/80 text-xs">
            {constitutionBatch === 1  && "धारा १–१४ — राज्यको परिभाषा, भौगोलिक क्षेत्र"}
            {constitutionBatch === 2  && "धारा १५–२८ — नागरिकता"}
            {constitutionBatch === 3  && "धारा २९–४२ — मौलिक हक (जीवन, स्वतन्त्रता)"}
            {constitutionBatch === 4  && "धारा ४३–५६ — मौलिक हक (स्वास्थ्य, शिक्षा)"}
            {constitutionBatch === 5  && "धारा ५७–७० — राज्य शक्ति बाँडफाँड, निर्देशक सिद्धान्त"}
            {constitutionBatch === 6  && "धारा ७१–८४ — राज्यको दायित्व, राष्ट्रपति"}
            {constitutionBatch === 7  && "धारा ८५–९८ — संघीय संसद (प्रतिनिधिसभा)"}
            {constitutionBatch === 8  && "धारा ९९–११२ — राष्ट्रिय सभा, व्यवस्थापिका"}
            {constitutionBatch === 9  && "धारा ११३–१२६ — संघीय कानून निर्माण प्रक्रिया"}
            {constitutionBatch === 10 && "धारा १२७–१४० — प्रधानमन्त्री, मन्त्रिपरिषद्"}
            {constitutionBatch === 11 && "धारा १४१–१५४ — अख्तियार, महालेखा"}
            {constitutionBatch === 12 && "धारा १५५–१६८ — न्यायपालिका (सर्वोच्च अदालत)"}
            {constitutionBatch === 13 && "धारा १६९–१८२ — उच्च अदालत, जिल्ला अदालत"}
            {constitutionBatch === 14 && "धारा १८३–१९६ — न्याय परिषद्, प्रदेश सुरु"}
            {constitutionBatch === 15 && "धारा १९७–२१० — प्रदेश कार्यपालिका"}
            {constitutionBatch === 16 && "धारा २११–२२४ — प्रदेश न्यायपालिका, स्थानीय"}
            {constitutionBatch === 17 && "धारा २२५–२३८ — संघ-प्रदेश-स्थानीय अन्तरसम्बन्ध"}
            {constitutionBatch === 18 && "धारा २३९–२५२ — सुरक्षा परिषद्, निर्वाचन आयोग"}
            {constitutionBatch === 19 && "धारा २५३–२६६ — लोक सेवा, संवैधानिक निकाय"}
            {constitutionBatch === 20 && "धारा २६७–२८० — महिला, दलित, आदिवासी आयोग"}
            {constitutionBatch === 21 && "धारा २८१–२९४ — मानव अधिकार, राजस्व आयोग"}
            {constitutionBatch === 22 && "धारा २९५–३०८ — संविधान संशोधन, संक्रमणकालीन व्यवस्था"}
            {constitutionBatch === 0  && "सुरु गर्दैछ…"}
          </p>
          {constitutionCount > 0 && (
            <p className="text-amber-600 text-xs">{constitutionCount} धाराहरू save भए</p>
          )}
        </div>
      )}
      {isApproved && isConstitutionDoc(doc) && constitutionCount > 0 && !isExtractingConstitution && (
        <div className="w-full rounded-xl bg-amber-950/30 border border-amber-800/60 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-amber-300 text-xs font-bold">📜 {constitutionCount} धाराहरू extracted</span>
            <button
              onClick={() => onExtractConstitution?.(doc)}
              className="text-xs text-amber-600 hover:text-amber-400 underline shrink-0"
            >
              Re-extract
            </button>
          </div>
        </div>
      )}

      {/* Intelligence Extract — structured janta_intelligence records */}
      {isApproved && !isConstitutionDoc(doc) && !!onExtractIntel && !isExtractingIntel && !isMatchingIntel && intelCount === 0 && (
        <button
          onClick={() => onExtractIntel!(doc)}
          className="w-full text-xs font-bold py-2.5 rounded-xl bg-indigo-900/50 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 transition-colors"
        >
          🏛️ Intelligence निकाल्नुहोस्
        </button>
      )}

      {isExtractingIntel && (
        <div className="w-full rounded-xl bg-indigo-950/40 border border-indigo-800 px-3 py-3 space-y-1.5">
          <p className="text-indigo-300 text-xs font-bold animate-pulse">🏛️ Intelligence extraction चल्दैछ…</p>
          <p className="text-indigo-600/80 text-xs leading-relaxed">
            सबै sections scan गर्दैछ — budget lines, projects, institutions, targets, reforms सबै निकाल्दैछ।
          </p>
        </div>
      )}

      {isMatchingIntel && !isExtractingIntel && (
        <div className="w-full rounded-xl bg-violet-950/40 border border-violet-800 px-3 py-2.5 space-y-1">
          <p className="text-violet-300 text-xs font-bold animate-pulse">🔗 Relationship matching चल्दैछ…</p>
          <p className="text-violet-600/80 text-xs">
            Prior documents सँग cross-reference गर्दैछ — connected records खोज्दैछ।
          </p>
        </div>
      )}

      {isApproved && intelCount > 0 && !isExtractingIntel && !isMatchingIntel && (
        <div className="w-full rounded-xl bg-indigo-950/30 border border-indigo-800/60 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-indigo-300 text-xs font-bold">🏛️ {intelCount} intel records</span>
            <button
              onClick={() => onExtractIntel?.(doc)}
              className="text-xs text-indigo-600 hover:text-indigo-400 underline shrink-0"
            >
              Re-extract
            </button>
          </div>
          {relCount > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              <span className="text-violet-400 text-xs">{relCount} relationships found across documents</span>
            </div>
          )}
        </div>
      )}

      {/* Atomic Deep Extract — Tier 2, founder-confirmed, official docs only */}
      {isApproved && !isConstitutionDoc(doc) && doc.sourceType === "official" && tier !== "atomic" && !!onExtractAtomic && !isExtractingAtomic && atomicIntelCount === 0 && (
        <>
          {!confirmAtomic ? (
            <button
              onClick={() => setConfirmAtomic(true)}
              className="w-full text-xs font-bold py-2.5 rounded-xl bg-violet-900/40 hover:bg-violet-900/70 text-violet-300 border border-violet-800 transition-colors"
            >
              ⚛ Atomic Deep Extract — page/paragraph traced
            </button>
          ) : (
            <div className="rounded-xl border border-violet-700 bg-violet-950/50 px-3 py-3 space-y-2.5">
              <p className="text-violet-200 text-xs font-bold">⚛ Atomic Intelligence — पक्का गर्नुहोस्</p>
              <div className="space-y-1 text-[11px] text-violet-400/80 leading-relaxed">
                <p>• प्रत्येक तथ्य page number + verbatim quote सहित save हुन्छ</p>
                <p>• Tier 2 — source-traced, evidence-backed intelligence</p>
                {atomicCostEstimate && (
                  <p className="text-amber-400 font-bold">अनुमानित खर्च: {atomicCostEstimate}</p>
                )}
                <p className="text-zinc-500">Official trusted document मा मात्र run गर्नुहोस्।</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmAtomic(false); onExtractAtomic!(doc); }}
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
        </>
      )}

      {isExtractingAtomic && (
        <div className="w-full rounded-xl bg-violet-950/40 border border-violet-800 px-3 py-3 space-y-1.5">
          {atomicStatusMsg ? (
            <p className="text-violet-300 text-xs font-bold animate-pulse">{atomicStatusMsg}</p>
          ) : (
            <>
              <p className="text-violet-300 text-xs font-bold animate-pulse">⚛ Atomic extraction चल्दैछ — page by page…</p>
              <p className="text-violet-600/80 text-xs leading-relaxed">
                हरेक page scan गर्दैछ — तथ्य, संख्या, संस्था, सिफारिस — page number र verbatim quote सहित।
              </p>
            </>
          )}
        </div>
      )}

      {/* Job status message when not actively extracting */}
      {!isExtractingAtomic && atomicStatusMsg && atomicIntelCount === 0 && (
        <div className="w-full rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-3 py-2">
          <p className="text-xs text-zinc-400">{atomicStatusMsg}</p>
        </div>
      )}

      {isApproved && atomicIntelCount > 0 && !isExtractingAtomic && (
        <div className="w-full rounded-xl bg-violet-950/30 border border-violet-800/60 px-3 py-2.5 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-violet-300 text-xs font-bold">⚛ {atomicIntelCount} atomic records — source-traced</span>
            <button
              onClick={() => setConfirmAtomic(true)}
              className="text-xs text-violet-700 hover:text-violet-400 underline shrink-0"
            >
              Re-extract
            </button>
          </div>
          <p className="text-violet-700/70 text-[10px]">प्रत्येक record मा page number + verbatim quote छ</p>
        </div>
      )}

      {/* Economy Intelligence Extract — deep-link to /vault/economy */}
      {!isConstitutionDoc(doc) && (
        <Link
          href={`/vault/economy?docId=${doc.id}`}
          className="w-full flex items-center justify-center gap-2 text-xs font-bold py-2.5 rounded-xl bg-yellow-950/40 hover:bg-yellow-950/70 text-yellow-300 border border-yellow-800/60 transition-colors"
        >
          💰 Economy Extract गर्नुहोस् — Nepal Economic Intelligence
        </Link>
      )}

      {/* Admin Teacher Panel — shown for approved docs */}
      <DocActionTeachPanel doc={doc} />

      <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
        <span className="text-zinc-600 text-xs">{new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        <div className="flex items-center gap-3">
          {isProcessing && (
            <span className="text-xs text-amber-400">Analyzing…</span>
          )}
          <button
            onClick={() => onView(doc)}
            className="text-xs text-zinc-400 hover:text-white font-semibold transition-colors"
          >
            View
          </button>
          {onArchive && (
            <button
              onClick={() => onArchive(doc)}
              disabled={isArchiving}
              className="text-xs text-zinc-600 hover:text-amber-400 transition-colors disabled:opacity-40"
              title="Archive this document and delete its extracted records"
            >
              {isArchiving ? "…" : "Archive"}
            </button>
          )}
          <button
            onClick={() => onDelete(doc)}
            className="text-xs text-zinc-700 hover:text-red-400 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
