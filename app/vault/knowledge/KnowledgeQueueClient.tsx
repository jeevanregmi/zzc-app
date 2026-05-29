"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection, getDocs, query, where, limit,
  doc, setDoc, updateDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";
import { useFounderMode } from "../../../contexts/FounderModeContext";
import { adaptAnyKnowledgeObject } from "../../../lib/knowledge/adapters";
import { classifyKnowledgeAtom } from "../../../lib/knowledge/classifier";
import {
  PUBLIC_PRODUCT_LABEL,
  type ClassificationSuggestion,
  type KnowledgeClassifications,
  type CivicClassifications,
  type BhaktiClassifications,
  type PublicProduct,
} from "../../../lib/types/knowledge-objects";

// ── Extended stored type ───────────────────────────────────────────────────────
// Fields saved at scan time so the card never needs to re-fetch the source atom.

interface StoredSuggestion extends ClassificationSuggestion {
  // Display / preview
  summaryPreview:     string;
  evidencePreview:    string;   // up to 500 chars of verbatim evidenceText
  objectType:         string;
  domain:             string;
  // Provenance — required for founder approval
  sourceDocTitle:     string;
  pageNumber:         number;
  verificationStatus: string;
  confidence:         number;
  qualityScore:       number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_COLLECTIONS = ["janta_intelligence", "economy_atoms", "promise_atoms"] as const;

const COLLECTION_LABEL: Record<string, string> = {
  janta_intelligence:       "Janta Intelligence",
  economy_atoms:            "आर्थिक Atoms",
  promise_atoms:            "वाचा Atoms",
  constitutional_framework: "संविधान",
};

const ALL_CIVIC_SECTORS = [
  "युवा", "रोजगार", "शिक्षा", "स्वास्थ्य", "कृषि",
  "पूर्वाधार", "ऊर्जा", "यातायात", "पर्यटन", "उद्योग",
  "सामाजिक सुरक्षा", "सुशासन", "भ्रष्टाचार नियन्त्रण",
  "डिजिटल", "वातावरण", "न्याय", "अर्थतन्त्र", "प्रदेश/स्थानीय",
];

const ALL_BHAKTI_TRADITIONS = [
  "shaiva", "vaishnava", "shakta", "ganapatya",
  "buddhist", "advaita_vedanta", "vedic", "bhakti",
];

const ALL_PRODUCTS = Object.entries(PUBLIC_PRODUCT_LABEL) as [PublicProduct, string][];

const STATUS_LABEL: Record<string, string> = {
  pending:  "समीक्षा बाँकी",
  approved: "स्वीकृत",
  edited:   "सम्पादित",
  rejected: "अस्वीकृत",
  deferred: "पछि गर्ने",
};

const STATUS_TW: Record<string, string> = {
  pending:  "text-yellow-400 bg-yellow-950/40 border-yellow-800/40",
  approved: "text-green-400  bg-green-950/40  border-green-800/40",
  edited:   "text-blue-400   bg-blue-950/40   border-blue-800/40",
  rejected: "text-red-400    bg-red-950/40    border-red-800/40",
  deferred: "text-zinc-400   bg-zinc-800/40   border-zinc-700/40",
};

const VERIFICATION_LABEL: Record<string, string> = {
  ai_extracted:     "AI द्वारा निकालिएको",
  founder_reviewed: "Founder ले समीक्षा गरेको",
  human_verified:   "मानव सत्यापित",
  needs_revision:   "संशोधन आवश्यक",
};

const VERIFICATION_TW: Record<string, string> = {
  ai_extracted:     "text-zinc-400",
  founder_reviewed: "text-blue-400",
  human_verified:   "text-green-400",
  needs_revision:   "text-amber-400",
};

const OBJECT_TYPE_LABEL: Record<string, string> = {
  constitution_article: "संविधान Article",
  civic_fact:           "Civic Fact",
  government_promise:   "Government Promise",
  economic_atom:        "Economic Atom",
  shloka_atom:          "श्लोक",
  bhajan_atom:          "भजन / Stuti",
  character_teaching:   "Character Teaching",
  semantic_term:        "Semantic Term",
  media_seed:           "Media Seed",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}

function qualityTw(score: number): string {
  if (score >= 0.8) return "text-green-400";
  if (score >= 0.6) return "text-yellow-400";
  if (score >= 0.4) return "text-amber-400";
  return "text-red-400";
}

function confColor(c: number): string {
  if (c >= 0.8) return "bg-green-500";
  if (c >= 0.6) return "bg-yellow-500";
  return "bg-zinc-600";
}

function fiscalYearOf(s: StoredSuggestion): string | null {
  const cls = s.editedClassifications ?? s.suggestedClassifications;
  if ("timePeriods" in cls) {
    const periods = (cls as CivicClassifications).timePeriods ?? [];
    return periods.length > 0 ? periods[0] : null;
  }
  return null;
}

/**
 * Founder cannot blindly approve. Require minimum provenance.
 * Returns null if OK, or an explanation string if insufficient.
 */
function provenanceGap(s: StoredSuggestion): string | null {
  if (s.evidencePreview.trim().length < 15) {
    return "Evidence (उद्धरण) छैन";
  }
  if (!s.sourceDocTitle.trim() && !s.atomId) {
    return "Source document छैन";
  }
  if (
    (s.objectType === "economic_atom" || s.objectType === "government_promise") &&
    !fiscalYearOf(s) &&
    s.pageNumber <= 0
  ) {
    return "Economic/Promise atom को लागि Fiscal Year चाहिन्छ";
  }
  if (s.qualityScore < 0.25) {
    return "Quality score धेरै कम छ (25% भन्दा कम)";
  }
  return null;
}

function generateWhyText(s: StoredSuggestion): string {
  const cls = s.editedClassifications ?? s.suggestedClassifications;
  const parts: string[] = [];
  if (s.domain === "civic" || s.domain === "shared") {
    const civic = cls as CivicClassifications;
    parts.push(...(civic.sectors ?? []).slice(0, 3));
    if ((civic.relatedMovements ?? []).includes("gen_z_movement_2081")) parts.push("Gen Z Movement २०८१");
    if ((civic.themes ?? []).includes("accountability")) parts.push("accountability");
  } else {
    const bhakti = cls as BhaktiClassifications;
    parts.push(...(bhakti.traditions ?? []).slice(0, 2), ...(bhakti.characters ?? []).slice(0, 2));
  }
  return parts.length > 0
    ? `यो atom मा ${parts.join(", ")} सम्बन्धी संकेत छन्।`
    : "System le classify गरेको।";
}

function buildEditedClassifications(
  s: StoredSuggestion,
  editProducts: PublicProduct[],
  editSectors: string[],
): KnowledgeClassifications {
  const base = s.editedClassifications ?? s.suggestedClassifications;
  if (s.domain === "civic" || s.domain === "shared") {
    const civic = base as CivicClassifications;
    return { ...civic, publicProducts: editProducts, sectors: editSectors };
  }
  const bhakti = base as BhaktiClassifications;
  return { ...bhakti, publicProducts: editProducts, traditions: editSectors };
}

const safe = <T,>(p: Promise<T>, fb: T): Promise<T> =>
  p.catch(e => { console.warn("[knowledge-queue]", e?.code ?? e); return fb; });

// ── Component ─────────────────────────────────────────────────────────────────

export default function KnowledgeQueueClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid = user?.uid ?? null;
  const { isDebug } = useFounderMode();

  const [suggestions, setSuggestions]   = useState<StoredSuggestion[]>([]);
  const [loading, setLoading]           = useState(true);
  const [scanning, setScanning]         = useState(false);
  const [scanProgress, setScanProgress] = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [editingId, setEditingId]       = useState<string | null>(null);
  const [editProducts, setEditProducts] = useState<PublicProduct[]>([]);
  const [editSectors, setEditSectors]   = useState<string[]>([]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const loadSuggestions = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const snap = await safe(
      getDocs(query(
        collection(db, "classification_suggestions"),
        where("ownerId", "==", uid),
        limit(200),
      )),
      null,
    );
    if (snap) setSuggestions(snap.docs.map(d => d.data() as StoredSuggestion));
    setLoading(false);
  }, [uid]);

  useEffect(() => { if (!authLoading) loadSuggestions(); }, [authLoading, loadSuggestions]);

  // ── Scan ───────────────────────────────────────────────────────────────────

  async function runScan() {
    if (!uid || scanning) return;
    setScanning(true);
    setScanProgress("सुरु गर्दैछ…");

    const existingIds = new Set(suggestions.map(s => s.id));
    let newCount = 0;

    for (const col of SOURCE_COLLECTIONS) {
      setScanProgress(`${COLLECTION_LABEL[col] ?? col} बाट atom load गर्दैछ…`);

      const snap = await safe(
        getDocs(query(collection(db, col), where("ownerId", "==", uid), limit(40))),
        null,
      );
      if (!snap) continue;

      const newDocs = snap.docs.filter(d => !existingIds.has(`${col}_${d.id}_cls`));
      setScanProgress(`${COLLECTION_LABEL[col] ?? col}: ${newDocs.length} नयाँ atom classify गर्दैछ…`);

      const batch: StoredSuggestion[] = [];

      for (const d of newDocs) {
        const raw = { ...d.data() as Record<string, unknown>, id: d.id };
        const uko = adaptAnyKnowledgeObject(col, raw, uid);
        if (!uko) continue;

        const suggestion = classifyKnowledgeAtom(uko, uid);

        const stored: StoredSuggestion = {
          ...suggestion,
          summaryPreview:     uko.summaryNepali.slice(0, 200),
          evidencePreview:    uko.evidenceText.slice(0, 500),
          objectType:         uko.objectType,
          domain:             uko.domain,
          sourceDocTitle:     uko.sourceDocTitle,
          pageNumber:         uko.pageNumber,
          verificationStatus: uko.verificationStatus,
          confidence:         uko.confidence,
          qualityScore:       uko.qualityScore,
        };

        await safe(
          setDoc(doc(db, "classification_suggestions", stored.id), stored),
          undefined,
        );

        batch.push(stored);
        existingIds.add(stored.id);
        newCount++;
      }

      setSuggestions(prev => [...prev, ...batch]);
    }

    setScanProgress(
      newCount > 0
        ? `${newCount} नयाँ suggestion तयार भयो।`
        : "कुनै नयाँ atom भेटिएन।",
    );
    setScanning(false);
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleApprove(s: StoredSuggestion) {
    const now = new Date().toISOString();
    await safe(
      updateDoc(doc(db, "classification_suggestions", s.id), { status: "approved", reviewedAt: now }),
      undefined,
    );
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: "approved", reviewedAt: now } : x));
  }

  async function handleReject(s: StoredSuggestion) {
    const now = new Date().toISOString();
    await safe(
      updateDoc(doc(db, "classification_suggestions", s.id), { status: "rejected", reviewedAt: now }),
      undefined,
    );
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: "rejected", reviewedAt: now } : x));
  }

  async function handleLater(s: StoredSuggestion) {
    const now = new Date().toISOString();
    await safe(
      updateDoc(doc(db, "classification_suggestions", s.id), { status: "deferred", reviewedAt: now }),
      undefined,
    );
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, status: "deferred", reviewedAt: now } : x));
  }

  function handleStartEdit(s: StoredSuggestion) {
    const cls = s.editedClassifications ?? s.suggestedClassifications;
    setEditProducts([...(cls.publicProducts ?? [])]);
    setEditSectors(
      s.domain === "civic" || s.domain === "shared"
        ? [...((cls as CivicClassifications).sectors ?? [])]
        : [...((cls as BhaktiClassifications).traditions ?? [])],
    );
    setEditingId(s.id);
  }

  async function handleSaveEdit(s: StoredSuggestion) {
    const now = new Date().toISOString();
    const editedClassifications = buildEditedClassifications(s, editProducts, editSectors);
    await safe(
      updateDoc(doc(db, "classification_suggestions", s.id), {
        status: "edited",
        editedClassifications,
        reviewedAt: now,
      }),
      undefined,
    );
    setSuggestions(prev => prev.map(x =>
      x.id === s.id ? { ...x, status: "edited", editedClassifications, reviewedAt: now } : x,
    ));
    setEditingId(null);
  }

  // ── Computed ───────────────────────────────────────────────────────────────

  const today = todayPrefix();

  const filtered = suggestions.filter(s => {
    if (domainFilter !== "all" && s.domain !== domainFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    pending:       suggestions.filter(s => s.status === "pending").length,
    highConf:      suggestions.filter(s => s.confidence >= 0.8).length,
    needsReview:   suggestions.filter(s => s.confidence < 0.6).length,
    approvedToday: suggestions.filter(s => (s.reviewedAt ?? "").startsWith(today) && (s.status === "approved" || s.status === "edited")).length,
    rejectedToday: suggestions.filter(s => (s.reviewedAt ?? "").startsWith(today) && s.status === "rejected").length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (authLoading) return null;
  if (!uid) return (
    <div className="p-8 text-zinc-500 text-sm">कृपया Vault मा Sign In गर्नुहोस्।</div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">ज्ञान Queue</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            System le suggest गर्छ। Founder le approve/reject गर्छ।
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-900/60 hover:bg-blue-800/60 border border-blue-700/60 text-blue-300 disabled:opacity-50 transition-colors"
        >
          {scanning ? "Scan गर्दैछ…" : "नयाँ Scan गर्नुहोस्"}
        </button>
      </div>

      {/* Scan progress */}
      {scanProgress && (
        <div className="text-sm text-zinc-400 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
          {scanProgress}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "समीक्षा बाँकी",    value: stats.pending,       tw: "text-yellow-400 border-yellow-800/40 bg-yellow-950/20" },
          { label: "उच्च विश्वास",     value: stats.highConf,      tw: "text-green-400  border-green-800/40  bg-green-950/20"  },
          { label: "समीक्षा चाहिन्छ",  value: stats.needsReview,   tw: "text-amber-400  border-amber-800/40  bg-amber-950/20"  },
          { label: "आज स्वीकृत",       value: stats.approvedToday, tw: "text-blue-400   border-blue-800/40   bg-blue-950/20"   },
          { label: "आज अस्वीकृत",      value: stats.rejectedToday, tw: "text-zinc-400   border-zinc-700/40   bg-zinc-900/40"   },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.tw}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs mt-1 opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Domain:</span>
        {(["all", "civic", "bhakti", "shared"] as const).map(d => (
          <button
            key={d}
            onClick={() => setDomainFilter(d)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              domainFilter === d
                ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {d === "all" ? "सबै" : d === "civic" ? "Civic" : d === "bhakti" ? "Bhakti" : "Shared"}
          </button>
        ))}
        <span className="text-xs text-zinc-500 self-center ml-3 mr-1">Status:</span>
        {(["pending", "deferred", "approved", "edited", "rejected", "all"] as const).map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              statusFilter === st
                ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {st === "all" ? "सबै" : STATUS_LABEL[st] ?? st}
          </button>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="text-zinc-500 text-sm py-8 text-center">Load गर्दैछ…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <div className="text-4xl mb-3">🧠</div>
          <div className="text-sm">
            {suggestions.length === 0
              ? "कुनै suggestion छैन। माथि नयाँ Scan गर्नुहोस् थिच्नुहोस्।"
              : "यस filter मा कुनै atom छैन।"
            }
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(s => (
            <SuggestionCard
              key={s.id}
              s={s}
              isEditing={editingId === s.id}
              editProducts={editProducts}
              editSectors={editSectors}
              isDebug={isDebug}
              onApprove={() => handleApprove(s)}
              onStartEdit={() => handleStartEdit(s)}
              onSaveEdit={() => handleSaveEdit(s)}
              onCancelEdit={() => setEditingId(null)}
              onReject={() => handleReject(s)}
              onLater={() => handleLater(s)}
              onToggleProduct={p => setEditProducts(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
              onToggleSector={sec => setEditSectors(prev => prev.includes(sec) ? prev.filter(x => x !== sec) : [...prev, sec])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Suggestion Card ────────────────────────────────────────────────────────────

interface CardProps {
  s:              StoredSuggestion;
  isEditing:      boolean;
  editProducts:   PublicProduct[];
  editSectors:    string[];
  isDebug:        boolean;
  onApprove:      () => void;
  onStartEdit:    () => void;
  onSaveEdit:     () => void;
  onCancelEdit:   () => void;
  onReject:       () => void;
  onLater:        () => void;
  onToggleProduct:(p: PublicProduct) => void;
  onToggleSector: (s: string) => void;
}

function SuggestionCard({
  s, isEditing, editProducts, editSectors, isDebug,
  onApprove, onStartEdit, onSaveEdit, onCancelEdit,
  onReject, onLater, onToggleProduct, onToggleSector,
}: CardProps) {
  const cls = s.editedClassifications ?? s.suggestedClassifications;
  const products: PublicProduct[] = cls.publicProducts ?? [];
  const sectors = (s.domain === "civic" || s.domain === "shared")
    ? ((cls as CivicClassifications).sectors ?? [])
    : ((cls as BhaktiClassifications).traditions ?? []);
  const movements = (s.domain === "civic" || s.domain === "shared")
    ? ((cls as CivicClassifications).relatedMovements ?? [])
    : [];

  const fiscalYear = fiscalYearOf(s);
  const gap = provenanceGap(s);
  const isResolved = s.status === "approved" || s.status === "edited" || s.status === "rejected";
  const qualScore = Math.round(s.qualityScore * 100);

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden transition-opacity ${isResolved ? "opacity-60" : ""}`}>

      {/* ── Title row ── */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start gap-2 flex-wrap mb-3">
          <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700">
            {s.domain === "civic" ? "Civic" : s.domain === "bhakti" ? "Bhakti" : "Shared"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-400 border-zinc-700">
            {OBJECT_TYPE_LABEL[s.objectType] ?? s.objectType}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_TW[s.status] ?? STATUS_TW.pending}`}>
            {STATUS_LABEL[s.status] ?? s.status}
          </span>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${confColor(s.confidence)}`}
                style={{ width: `${Math.round(s.confidence * 100)}%` }}
              />
            </div>
            <span className="text-xs text-zinc-500">{Math.round(s.confidence * 100)}%</span>
          </div>
        </div>

        <p className="text-sm font-medium text-zinc-100 leading-relaxed">
          {s.atomPreview}
        </p>
        {s.summaryPreview && s.summaryPreview !== s.atomPreview && (
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            {s.summaryPreview.slice(0, 160)}
          </p>
        )}
      </div>

      {/* ── Provenance section (dark bg, always visible) ── */}
      <div className="mx-5 mb-4 rounded-lg bg-zinc-950 border border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/40">
          <span className="text-xs font-medium text-zinc-400">स्रोत प्रमाण</span>
        </div>

        <div className="px-4 py-3 space-y-2">
          {/* Source document */}
          <ProvenanceRow icon="📄" label="स्रोत">
            {s.sourceDocTitle ? (
              <span className="text-zinc-100 font-medium">{s.sourceDocTitle}</span>
            ) : (
              <span className="text-zinc-600 italic">स्रोत document पाइएन</span>
            )}
          </ProvenanceRow>

          {/* Fiscal year — required for economic/promise atoms */}
          {(s.objectType === "economic_atom" || s.objectType === "government_promise") && (
            <ProvenanceRow icon="📅" label="आर्थिक वर्ष">
              {fiscalYear ? (
                <span className="text-zinc-200">{fiscalYear}</span>
              ) : (
                <span className="text-amber-500 italic">तोकिएको छैन</span>
              )}
            </ProvenanceRow>
          )}

          {/* Page number */}
          <ProvenanceRow icon="📍" label="Page">
            {s.pageNumber > 0 ? (
              <span className="text-zinc-200">{s.pageNumber}</span>
            ) : (
              <span className="text-zinc-600 italic">उपलब्ध छैन</span>
            )}
          </ProvenanceRow>

          {/* Quality score */}
          <ProvenanceRow icon="⭐" label="Quality">
            <span className={`font-medium ${qualityTw(s.qualityScore)}`}>
              {qualScore}/100
            </span>
            <span className="text-zinc-600 text-[10px] ml-2">
              {qualScore >= 80 ? "उत्कृष्ट" : qualScore >= 60 ? "राम्रो" : qualScore >= 40 ? "सामान्य" : "कम"}
            </span>
          </ProvenanceRow>

          {/* Verification status */}
          <ProvenanceRow icon="🔍" label="Status">
            <span className={VERIFICATION_TW[s.verificationStatus] ?? "text-zinc-400"}>
              {VERIFICATION_LABEL[s.verificationStatus] ?? s.verificationStatus}
            </span>
          </ProvenanceRow>
        </div>

        {/* Evidence quote */}
        {s.evidencePreview && (
          <div className="px-4 pb-4">
            <p className="text-[10px] text-zinc-500 mb-1.5 uppercase tracking-wide">उद्धरण (verbatim)</p>
            <blockquote className="text-xs text-zinc-300 leading-relaxed italic border-l-2 border-zinc-600 pl-3">
              &ldquo;{s.evidencePreview}&rdquo;
            </blockquote>
          </div>
        )}

        {/* Provenance gap warning — disables Approve */}
        {gap && (
          <div className="px-4 pb-3">
            <div className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-md px-3 py-2">
              ⚠ Evidence अपूरो छ — {gap}
            </div>
          </div>
        )}
      </div>

      {/* ── Classification suggestion ── */}
      {!isEditing && (
        <div className="px-5 pb-4 space-y-3">
          <p className="text-xs font-medium text-zinc-500">System को सुझाव</p>

          {products.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">📍 कहाँ देखाउने?</p>
              <div className="flex flex-wrap gap-1.5">
                {products.map(p => (
                  <span key={p} className="text-xs px-2 py-0.5 rounded-md border bg-blue-950/30 text-blue-300 border-blue-800/40">
                    {PUBLIC_PRODUCT_LABEL[p] ?? p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {sectors.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">🏷 {s.domain === "bhakti" ? "परम्परा" : "विषय"}</p>
              <div className="flex flex-wrap gap-1.5">
                {sectors.map(sec => (
                  <span key={sec} className="text-xs px-2 py-0.5 rounded-md border bg-zinc-800 text-zinc-300 border-zinc-700">
                    {sec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {movements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {movements.map(m => (
                <span key={m} className="text-xs px-2 py-0.5 rounded-md border bg-amber-950/30 text-amber-400 border-amber-800/40">
                  {m === "gen_z_movement_2081" ? "Gen Z Movement २०८१" : m}
                </span>
              ))}
            </div>
          )}

          <div className="text-xs text-zinc-400 bg-zinc-950/60 rounded-lg px-3 py-2 border border-zinc-800">
            <span className="text-zinc-500 mr-1">💡 किन?</span>
            {generateWhyText(s)}
          </div>
        </div>
      )}

      {/* ── Edit mode ── */}
      {isEditing && (
        <div className="mx-5 mb-4 bg-zinc-950 rounded-xl border border-zinc-700 p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-300 mb-2">📍 कहाँ देखाउने? (छान्नुहोस्)</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PRODUCTS.map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => onToggleProduct(p)}
                  className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                    editProducts.includes(p)
                      ? "bg-blue-900/60 border-blue-600 text-blue-200"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {editProducts.includes(p) ? "✓ " : ""}{label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-300 mb-2">
              {s.domain === "bhakti" ? "🛕 परम्परा" : "🏷 विषय"} (छान्नुहोस्)
            </p>
            <div className="flex flex-wrap gap-2">
              {(s.domain === "bhakti" ? ALL_BHAKTI_TRADITIONS : ALL_CIVIC_SECTORS).map(sec => (
                <button
                  key={sec}
                  onClick={() => onToggleSector(sec)}
                  className={`text-xs px-3 py-1 rounded-md border transition-colors ${
                    editSectors.includes(sec)
                      ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                      : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {editSectors.includes(sec) ? "✓ " : ""}{sec}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onSaveEdit}
              className="px-4 py-1.5 text-sm rounded-lg bg-blue-900/60 hover:bg-blue-800/60 border border-blue-700 text-blue-200 font-medium"
            >
              सुरक्षित गर्नुहोस्
            </button>
            <button
              onClick={onCancelEdit}
              className="px-4 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-300"
            >
              रद्द गर्नुहोस्
            </button>
          </div>
        </div>
      )}

      {/* ── Action buttons ── */}
      {!isEditing && !isResolved && (
        <div className="px-5 pb-5 flex gap-2">
          {gap ? (
            <button
              disabled
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-500 opacity-70 cursor-not-allowed"
              title={gap}
            >
              ⚠ Evidence अपूरो
            </button>
          ) : (
            <button
              onClick={onApprove}
              className="flex-1 py-2 text-sm font-medium rounded-lg bg-green-950/60 hover:bg-green-900/60 border border-green-800/60 text-green-300 transition-colors"
            >
              ✓ Approve
            </button>
          )}
          <button
            onClick={onStartEdit}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/60 text-blue-300 transition-colors"
          >
            ✏ Edit
          </button>
          <button
            onClick={onReject}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800/60 text-red-400 transition-colors"
          >
            ✗ Reject
          </button>
          <button
            onClick={onLater}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-400 transition-colors"
          >
            ⌛ Later
          </button>
        </div>
      )}

      {/* ── Resolved ── */}
      {isResolved && (
        <div className="px-5 pb-4">
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_TW[s.status]}`}>
            {STATUS_LABEL[s.status]}
            {s.reviewedAt ? ` — ${s.reviewedAt.slice(0, 10)}` : ""}
          </span>
        </div>
      )}

      {/* ── Debug panel ── */}
      {isDebug && (
        <div className="mx-5 mb-5 bg-zinc-950 rounded-lg border border-zinc-800 p-3 text-[10px] text-zinc-600 font-mono space-y-1">
          <div>id: {s.id}</div>
          <div>atomId: {s.atomId} | sourceCollection: {s.sourceCollection}</div>
          <div>generatedBy: {s.generatedBy}</div>
          <div>objectType: {s.objectType} | domain: {s.domain}</div>
          <div>confidence: {s.confidence} | qualityScore: {s.qualityScore}</div>
          <div>routes: {JSON.stringify(s.suggestedRoutes)}</div>
        </div>
      )}
    </div>
  );
}

// ── ProvenanceRow utility ─────────────────────────────────────────────────────

function ProvenanceRow({
  icon, label, children,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-zinc-500 w-4 shrink-0 text-xs">{icon}</span>
      <span className="text-zinc-500 text-xs w-24 shrink-0">{label}</span>
      <div className="text-xs">{children}</div>
    </div>
  );
}
