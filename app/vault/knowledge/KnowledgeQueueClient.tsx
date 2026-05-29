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

// ── Extended stored type — includes display fields saved at scan time ─────────

interface StoredSuggestion extends ClassificationSuggestion {
  summaryPreview: string;
  evidencePreview: string;
  objectType:     string;
  domain:         string;
  confidence:     number;
  qualityScore:   number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_COLLECTIONS = ["janta_intelligence", "economy_atoms", "promise_atoms"] as const;

const COLLECTION_LABEL: Record<string, string> = {
  janta_intelligence:    "Janta Intelligence",
  economy_atoms:         "आर्थिक Atoms",
  promise_atoms:         "वाचा Atoms",
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
  approved: "text-green-400 bg-green-950/40 border-green-800/40",
  edited:   "text-blue-400 bg-blue-950/40 border-blue-800/40",
  rejected: "text-red-400 bg-red-950/40 border-red-800/40",
  deferred: "text-zinc-400 bg-zinc-800/40 border-zinc-700/40",
};

const DOMAIN_LABEL: Record<string, string> = {
  civic:  "Civic",
  bhakti: "Bhakti",
  shared: "Shared",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayPrefix(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateWhyText(s: StoredSuggestion): string {
  const cls = s.editedClassifications ?? s.suggestedClassifications;
  const parts: string[] = [];

  if (s.domain === "civic" || s.domain === "shared") {
    const civic = cls as CivicClassifications;
    const sectors = (civic.sectors ?? []).slice(0, 3);
    if (sectors.length) parts.push(...sectors);
    if ((civic.relatedMovements ?? []).includes("gen_z_movement_2081")) {
      parts.push("Gen Z Movement २०८१");
    }
    if ((civic.themes ?? []).includes("accountability")) {
      parts.push("government accountability");
    }
  } else {
    const bhakti = cls as BhaktiClassifications;
    const traditions = (bhakti.traditions ?? []).slice(0, 2);
    const characters = (bhakti.characters ?? []).slice(0, 2);
    if (traditions.length) parts.push(...traditions);
    if (characters.length) parts.push(...characters);
  }

  if (parts.length === 0) return "System le classify गरेको।";
  return `यो atom मा ${parts.join(", ")} सम्बन्धी संकेत छन्।`;
}

function confColor(c: number): string {
  if (c >= 0.8) return "bg-green-500";
  if (c >= 0.6) return "bg-yellow-500";
  return "bg-zinc-600";
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

  // ── Load existing suggestions ───────────────────────────────────────────────

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
    if (snap) {
      setSuggestions(
        snap.docs.map(d => d.data() as StoredSuggestion),
      );
    }
    setLoading(false);
  }, [uid]);

  useEffect(() => { if (!authLoading) loadSuggestions(); }, [authLoading, loadSuggestions]);

  // ── Scan source collections ─────────────────────────────────────────────────

  async function runScan() {
    if (!uid || scanning) return;
    setScanning(true);
    setScanProgress("सुरु गर्दैछ…");

    const existingIds = new Set(suggestions.map(s => s.id));
    let newCount = 0;

    for (const col of SOURCE_COLLECTIONS) {
      setScanProgress(`${COLLECTION_LABEL[col] ?? col} बाट atom load गर्दैछ…`);

      const snap = await safe(
        getDocs(query(
          collection(db, col),
          where("ownerId", "==", uid),
          limit(40),
        )),
        null,
      );
      if (!snap) continue;

      const newDocs = snap.docs.filter(d => {
        const id = `${col}_${d.id}_cls`;
        return !existingIds.has(id);
      });

      setScanProgress(`${COLLECTION_LABEL[col] ?? col}: ${newDocs.length} नयाँ atom classify गर्दैछ…`);

      const batch: StoredSuggestion[] = [];

      for (const d of newDocs) {
        const raw = { ...d.data() as Record<string, unknown>, id: d.id };
        const uko = adaptAnyKnowledgeObject(col, raw, uid);
        if (!uko) continue;

        const suggestion = classifyKnowledgeAtom(uko, uid);

        const stored: StoredSuggestion = {
          ...suggestion,
          summaryPreview: uko.summaryNepali.slice(0, 200),
          evidencePreview: uko.evidenceText.slice(0, 300),
          objectType:    uko.objectType,
          domain:        uko.domain,
          confidence:    uko.confidence,
          qualityScore:  uko.qualityScore,
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

  // ── Actions ─────────────────────────────────────────────────────────────────

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
    if (s.domain === "civic" || s.domain === "shared") {
      setEditSectors([...((cls as CivicClassifications).sectors ?? [])]);
    } else {
      setEditSectors([...((cls as BhaktiClassifications).traditions ?? [])]);
    }
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

  function toggleProduct(p: PublicProduct) {
    setEditProducts(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p],
    );
  }

  function toggleSector(s: string) {
    setEditSectors(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s],
    );
  }

  // ── Computed ─────────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────────

  if (authLoading) return null;
  if (!uid) return (
    <div className="p-8 text-zinc-500 text-sm">कृपया Vault मा Sign In गर्नुहोस्।</div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 space-y-6">

      {/* ── Header ── */}
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

      {/* ── Scan progress ── */}
      {scanProgress && (
        <div className="text-sm text-zinc-400 px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
          {scanProgress}
        </div>
      )}

      {/* ── Summary chips ── */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "समीक्षा बाँकी",   value: stats.pending,       tw: "text-yellow-400 border-yellow-800/40 bg-yellow-950/20" },
          { label: "उच्च विश्वास",    value: stats.highConf,      tw: "text-green-400  border-green-800/40  bg-green-950/20"  },
          { label: "समीक्षा चाहिन्छ", value: stats.needsReview,   tw: "text-amber-400  border-amber-800/40  bg-amber-950/20"  },
          { label: "आज स्वीकृत",      value: stats.approvedToday, tw: "text-blue-400   border-blue-800/40   bg-blue-950/20"   },
          { label: "आज अस्वीकृत",     value: stats.rejectedToday, tw: "text-zinc-400   border-zinc-700/40   bg-zinc-900/40"   },
        ].map(stat => (
          <div key={stat.label} className={`rounded-xl border p-3 text-center ${stat.tw}`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs mt-1 opacity-80">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-1">Domain:</span>
        {["all", "civic", "bhakti", "shared"].map(d => (
          <button
            key={d}
            onClick={() => setDomainFilter(d)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              domainFilter === d
                ? "bg-zinc-700 border-zinc-500 text-zinc-100"
                : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {d === "all" ? "सबै" : DOMAIN_LABEL[d] ?? d}
          </button>
        ))}
        <span className="text-xs text-zinc-500 self-center ml-3 mr-1">Status:</span>
        {["pending", "deferred", "approved", "edited", "rejected", "all"].map(st => (
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

      {/* ── Queue ── */}
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
        <div className="space-y-4">
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
              onToggleProduct={toggleProduct}
              onToggleSector={toggleSector}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Suggestion Card ───────────────────────────────────────────────────────────

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
  const sectors: string[] = (s.domain === "civic" || s.domain === "shared")
    ? ((cls as CivicClassifications).sectors ?? [])
    : ((cls as BhaktiClassifications).traditions ?? []);

  const movements: string[] = (s.domain === "civic" || s.domain === "shared")
    ? ((cls as CivicClassifications).relatedMovements ?? [])
    : [];

  const isResolved = s.status === "approved" || s.status === "edited" || s.status === "rejected";

  return (
    <div className={`rounded-xl border bg-zinc-900/60 p-5 space-y-4 transition-opacity ${isResolved ? "opacity-60" : ""}`}>

      {/* ── Top row: domain + type + status + confidence ── */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-300 border-zinc-700">
          {DOMAIN_LABEL[s.domain] ?? s.domain}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full border bg-zinc-800 text-zinc-400 border-zinc-700 capitalize">
          {s.objectType.replace(/_/g, " ")}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_TW[s.status] ?? STATUS_TW.pending}`}>
          {STATUS_LABEL[s.status] ?? s.status}
        </span>

        {/* Confidence bar */}
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

      {/* ── Title + evidence ── */}
      <div>
        <p className="text-sm font-medium text-zinc-100 leading-relaxed">
          {s.atomPreview}
        </p>
        {s.evidencePreview && (
          <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed border-l-2 border-zinc-700 pl-3 italic">
            {s.evidencePreview.slice(0, 180)}…
          </p>
        )}
      </div>

      {/* ── Summary ── */}
      {s.summaryPreview && (
        <p className="text-xs text-zinc-400 leading-relaxed">{s.summaryPreview.slice(0, 160)}</p>
      )}

      {/* ── Suggested destinations ── */}
      {!isEditing && (
        <div className="space-y-2">
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
              <p className="text-xs text-zinc-500 mb-1.5">🏷 विषय</p>
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
        </div>
      )}

      {/* ── Why explanation ── */}
      {!isEditing && (
        <div className="text-xs text-zinc-400 bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-800">
          <span className="text-zinc-500 mr-1">💡 किन?</span>
          {generateWhyText(s)}
        </div>
      )}

      {/* ── Edit mode ── */}
      {isEditing && (
        <div className="space-y-4 bg-zinc-900 rounded-xl p-4 border border-zinc-700">
          <p className="text-xs font-medium text-zinc-300">📍 कहाँ देखाउने? (सम्पादन गर्नुहोस्)</p>
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

          <p className="text-xs font-medium text-zinc-300 mt-3">
            {s.domain === "bhakti" ? "🛕 परम्परा" : "🏷 विषय"} (सम्पादन गर्नुहोस्)
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

          <div className="flex gap-2 mt-4">
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
        <div className="flex gap-2 pt-1">
          <button
            onClick={onApprove}
            className="flex-1 py-2 text-sm font-medium rounded-lg bg-green-950/60 hover:bg-green-900/60 border border-green-800/60 text-green-300 transition-colors"
          >
            ✓ Approve
          </button>
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

      {/* ── Resolved state: show decision ── */}
      {isResolved && (
        <div className="flex items-center justify-between pt-1">
          <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_TW[s.status]}`}>
            {STATUS_LABEL[s.status]}
            {s.reviewedAt ? ` — ${s.reviewedAt.slice(0, 10)}` : ""}
          </span>
        </div>
      )}

      {/* ── Debug panel ── */}
      {isDebug && (
        <div className="bg-zinc-950 rounded-lg border border-zinc-800 p-3 text-[10px] text-zinc-600 font-mono space-y-1">
          <div>id: {s.id}</div>
          <div>atomId: {s.atomId}</div>
          <div>sourceCollection: {s.sourceCollection}</div>
          <div>generatedBy: {s.generatedBy}</div>
          <div>domain: {s.domain} | objectType: {s.objectType}</div>
          <div>confidence: {s.confidence} | qualityScore: {s.qualityScore}</div>
          <div>routes: {JSON.stringify(s.suggestedRoutes)}</div>
        </div>
      )}
    </div>
  );
}
