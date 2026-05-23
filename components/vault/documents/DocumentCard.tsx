"use client";

import { useState } from "react";
import Link from "next/link";
import { LearnTip } from "../LearnTip";
import type { IntelligenceDocument, AdminApprovalStatus, SourceType } from "../../../lib/types/documents";
import { TrustBadge }  from "../TrustBadge";
import { trustFromDoc } from "../../../lib/intelligence/trust-score";

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
  constitutionCount?:      number;
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

export function DocumentCard({ doc, isProcessing, queueCount = 0, onView, onProcess, onDelete, onGenerateQueue, onResetStuck, onGenerateImage, isGeneratingImage = false, onExtractPoints, isExtractingPoints = false, pointCount = 0, onExtractPromises, isExtractingPromises = false, promiseCount = 0, onExtractIntel, isExtractingIntel = false, isMatchingIntel = false, intelCount = 0, relCount = 0, onExtractConstitution, isExtractingConstitution = false, constitutionCount = 0, onArchive, isArchiving = false }: Props) {
  const [showFullNotes, setShowFullNotes] = useState(false);
  const displayStatus  = isProcessing ? "processing_ai" : doc.processingStatus;

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

      {/* Constitution Framework Extract — root ontology button */}
      {isApproved && isConstitutionDoc(doc) && !!onExtractConstitution && !isExtractingConstitution && constitutionCount === 0 && (
        <button
          onClick={() => onExtractConstitution!(doc)}
          className="w-full text-xs font-bold py-2.5 rounded-xl bg-amber-900/50 hover:bg-amber-900 text-amber-200 border border-amber-700 transition-colors"
        >
          📜 संविधान Framework निकाल्नुहोस्
        </button>
      )}
      {isExtractingConstitution && (
        <div className="w-full rounded-xl bg-amber-950/40 border border-amber-800 px-3 py-3 space-y-1.5">
          <p className="text-amber-300 text-xs font-bold animate-pulse">📜 Constitutional framework निकाल्दैछ…</p>
          <p className="text-amber-700/80 text-xs leading-relaxed">Article-by-article root ontology बनाउँदैछ — fundamental rights, institutions, state obligations।</p>
        </div>
      )}
      {isApproved && isConstitutionDoc(doc) && constitutionCount > 0 && !isExtractingConstitution && (
        <div className="w-full rounded-xl bg-amber-950/30 border border-amber-800/60 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-amber-300 text-xs font-bold">📜 {constitutionCount} constitutional articles</span>
            <button
              onClick={() => onExtractConstitution?.(doc)}
              className="text-xs text-amber-600 hover:text-amber-400 underline shrink-0"
            >
              Re-extract
            </button>
          </div>
        </div>
      )}

      {/* Deep Intelligence Extract — national civic memory layer */}
      {isApproved && !isConstitutionDoc(doc) && !!onExtractIntel && !isExtractingIntel && !isMatchingIntel && intelCount === 0 && (
        <button
          onClick={() => onExtractIntel!(doc)}
          className="w-full text-xs font-bold py-2.5 rounded-xl bg-indigo-900/50 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 transition-colors"
        >
          🏛️ Deep Intelligence निकाल्नुहोस्
        </button>
      )}

      {isExtractingIntel && (
        <div className="w-full rounded-xl bg-indigo-950/40 border border-indigo-800 px-3 py-3 space-y-1.5">
          <p className="text-indigo-300 text-xs font-bold animate-pulse">🏛️ Deep extraction चल्दैछ…</p>
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
