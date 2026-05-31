"use client";

// CivicObjectWorkspace — ONE document, ONE workspace.
// Shows pipeline status, what was extracted, and what to do next.
// Phase 1: read-only status + extraction triggers.
// Phase 3+: full extraction inside workspace, deprecate scattered DocumentCard buttons.

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, limit, getDocs,
  updateDoc, addDoc, deleteDoc, doc as firestoreDoc,
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

  const [intelCount,       setIntelCount]       = useState<number | null>(null);
  const [relCount,         setRelCount]         = useState<number | null>(null);
  const [constCount,       setConstCount]       = useState<number | null>(null);
  const [atomicCount,      setAtomicCount]      = useState<number | null>(null);
  const [fallbackCount,    setFallbackCount]    = useState<number | null>(null);
  const [trulyAtomicCount, setTrulyAtomicCount] = useState<number | null>(null);
  const [loading,          setLoading]          = useState(true);

  // Cleanup state — quarantine/delete fallback atoms
  type CleanupState = "idle" | "confirming_quarantine" | "confirming_delete" | "running" | "done";
  const [cleanupState,  setCleanupState]  = useState<CleanupState>("idle");
  const [cleanupResult, setCleanupResult] = useState<string>("");

  // Full chunked extraction state (Phase 2)
  type FullExtrState = "idle" | "uploading" | "extracting" | "complete" | "error";
  interface ChunkStatus {
    index:   number;
    start:   number;
    end:     number;
    status:  "pending" | "running" | "done" | "error";
    records: number;
    error?:  string;
  }
  const [fullExtrState,    setFullExtrState]    = useState<FullExtrState>("idle");
  const [fullExtrChunks,   setFullExtrChunks]   = useState<ChunkStatus[]>([]);
  const [fullExtrAtoms,    setFullExtrAtoms]     = useState<number>(0);
  const [fullExtrError,    setFullExtrError]     = useState<string>("");

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

  // ── Fallback atom cleanup helpers ─────────────────────────────────────────────

  async function loadFallbackDocs() {
    const snap = await getDocs(query(
      collection(db, "janta_intelligence"),
      where("ownerId",     "==", ownerId),
      where("sourceDocId", "==", doc.id),
      limit(500),
    ));
    return snap.docs.filter(d => {
      const data = d.data() as Record<string, unknown>;
      if (data.extractionTier === "fallback") return true;
      if (data.verificationStatus === "fallback_ai_summary") return true;
      if (data.extractionTier === "atomic") {
        const pn = data.pageNumber as number | null | undefined;
        if (pn === null || pn === undefined || pn < 1) return true;
      }
      return false;
    });
  }

  async function writeFallbackCleanupLog(actionType: "quarantine_fallback_atoms" | "delete_fallback_atoms" | "keep_fallback_atoms", affectedCount: number) {
    await addDoc(collection(db, "document_cleanup_logs"), {
      actionType,
      documentId:    doc.id,
      documentTitle: doc.title,
      affectedCount,
      runBy:         ownerId,
      runAt:         new Date().toISOString(),
      notes:         actionType === "quarantine_fallback_atoms"
        ? "Quarantined synthesis fallback atoms — publishToJanta:false, internal draft only"
        : actionType === "delete_fallback_atoms"
        ? "Hard deleted fallback atoms — document ready for full extraction"
        : "Founder chose to keep fallback atoms as internal draft",
    }).catch(() => {});
  }

  async function handleQuarantineFallback() {
    setCleanupState("running");
    try {
      const fallbackDocs = await loadFallbackDocs();
      await Promise.all(fallbackDocs.map(d =>
        updateDoc(firestoreDoc(db, "janta_intelligence", d.id), {
          publishToJanta:     false,
          publicReady:        false,
          verificationStatus: "fallback_ai_summary",
          extractionTier:     "fallback",
          confidence:         0.4,
          reviewStatus:       "internal_draft",
          warning:            "AI summary बाट बनेको — full extraction आवश्यक छ",
        })
      ));
      await writeFallbackCleanupLog("quarantine_fallback_atoms", fallbackDocs.length);
      setFallbackCount(fallbackDocs.length);
      setTrulyAtomicCount(0);
      setAtomicCount(0);
      setCleanupResult(`${fallbackDocs.length} fallback atoms quarantined — internal draft मात्र, public होइन।`);
      setCleanupState("done");
    } catch (err) {
      setCleanupResult(`Quarantine failed: ${err instanceof Error ? err.message : String(err)}`);
      setCleanupState("idle");
    }
  }

  async function handleDeleteFallback() {
    setCleanupState("running");
    try {
      const fallbackDocs = await loadFallbackDocs();
      await Promise.all(fallbackDocs.map(d => deleteDoc(firestoreDoc(db, "janta_intelligence", d.id))));
      await writeFallbackCleanupLog("delete_fallback_atoms", fallbackDocs.length);
      setFallbackCount(0);
      setAtomicCount(0);
      setTrulyAtomicCount(0);
      setCleanupResult(`${fallbackDocs.length} fallback atoms deleted — document अब full extraction को लागि ready छ।`);
      setCleanupState("done");
    } catch (err) {
      setCleanupResult(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
      setCleanupState("idle");
    }
  }

  async function handleKeepFallback() {
    await writeFallbackCleanupLog("keep_fallback_atoms", fallbackCount ?? 0);
    setCleanupState("done");
    setCleanupResult(`Fallback atoms internal draft मा राखियो — full extraction अझै आवश्यक छ।`);
  }

  // ── Full chunked extraction (Phase 2) ─────────────────────────────────────────

  async function handleFullExtraction() {
    const CHUNK_PAGES = 3;
    const pageCount   = (doc as unknown as Record<string, unknown>).pageCount as number | undefined
      ?? Math.ceil(doc.fileSize / 15000); // ~15KB per scanned page

    // Build chunk plan
    const chunks: ChunkStatus[] = [];
    for (let p = 1; p <= pageCount; p += CHUNK_PAGES) {
      const start = p;
      const end   = Math.min(p + CHUNK_PAGES - 1, pageCount);
      chunks.push({ index: chunks.length, start, end, status: "pending", records: 0 });
    }
    setFullExtrChunks(chunks);
    setFullExtrAtoms(0);
    setFullExtrError("");
    setFullExtrState("uploading");

    // Step 1 — Upload PDF to Gemini Files API
    let fileUri = "";
    try {
      const upRes = await fetch("/api/gemini-file-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          docId:       doc.id,
          ownerId,
          downloadUrl: doc.downloadUrl,
          mimeType:    doc.mimeType,
          docTitle:    doc.title,
        }),
      });
      const upData = await upRes.json() as { ok: boolean; fileUri?: string; error?: string };
      if (!upData.ok || !upData.fileUri) {
        setFullExtrError(upData.error ?? "PDF upload to Gemini Files API failed");
        setFullExtrState("error");
        return;
      }
      fileUri = upData.fileUri;
    } catch (err) {
      setFullExtrError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
      setFullExtrState("error");
      return;
    }

    // Step 2 — Process each chunk sequentially
    setFullExtrState("extracting");
    const domain     = doc.category === "finance" ? "finance" : "janta";
    const sourceYear = ((doc as unknown as Record<string, unknown>).docYear as number | undefined)?.toString()
      ?? new Date(doc.uploadedAt).getFullYear().toString();
    const now        = new Date().toISOString();
    let totalAtoms   = 0;

    const MAX_RETRIES = 2;

    for (const chunk of chunks) {
      let success = false;
      let lastError = "";

      for (let attempt = 0; attempt <= MAX_RETRIES && !success; attempt++) {
        // Brief pause before retry (not on first attempt)
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 3000));
        }

        setFullExtrChunks(prev => prev.map(c =>
          c.index === chunk.index
            ? { ...c, status: "running", error: attempt > 0 ? `retry ${attempt}/${MAX_RETRIES}…` : undefined }
            : c
        ));

        try {
          const res = await fetch("/api/chunk-extract", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              fileUri,
              startPage:   chunk.start,
              endPage:     chunk.end,
              chunkIndex:  chunk.index,
              totalChunks: chunks.length,
              docId:       doc.id,
              ownerId,
              docTitle:    doc.title,
              sourceYear,
              domain,
            }),
          });
          const data = await res.json() as {
            ok:        boolean;
            records?:  Record<string, unknown>[];
            error?:    string;
            validFound?: number;
          };

          if (!data.ok) {
            lastError = (data.error ?? "Chunk failed").slice(0, 120);
            continue;
          }

          const records = data.records ?? [];

          if (records.length > 0) {
            await Promise.all(records.map(r =>
              addDoc(collection(db, "janta_intelligence"), {
                summaryNepali:   "",
                measurable:      true,
                timeline:        null,
                budgetAmount:    null,
                geoScope:        "national",
                governmentLevel: "federal",
                tags:            [],
                affectedGroups:  [],
                affectedSectors: [],
                department:      null,
                ...r,
                ownerId,
                sourceDocId:          doc.id,
                sourceDocTitle:       doc.title,
                implementationStatus: "announced",
                verificationStatus:   "ai_extracted",
                extractionTier:       "atomic",
                publishToJanta:       true,
                published:            true,
                extractionChunk:      chunk.index,
                chunkPageRange:       `${chunk.start}-${chunk.end}`,
                createdAt:            now,
                updatedAt:            now,
              })
            ));
          }

          totalAtoms += records.length;
          setFullExtrAtoms(totalAtoms);
          setFullExtrChunks(prev => prev.map(c =>
            c.index === chunk.index ? { ...c, status: "done", records: records.length, error: undefined } : c
          ));
          success = true;

        } catch (err) {
          lastError = (err instanceof Error ? err.message : String(err)).slice(0, 120);
        }
      }

      if (!success) {
        setFullExtrChunks(prev => prev.map(c =>
          c.index === chunk.index ? { ...c, status: "error", error: lastError } : c
        ));
      }
    }

    // Update workspace counts
    setTrulyAtomicCount(totalAtoms);
    setAtomicCount(totalAtoms);
    setFallbackCount(0); // full extraction supersedes fallback draft
    setFullExtrState("complete");

    // Write extraction summary log
    addDoc(collection(db, "document_cleanup_logs"), {
      actionType:    "full_chunked_extraction",
      documentId:    doc.id,
      documentTitle: doc.title,
      affectedCount: totalAtoms,
      runBy:         ownerId,
      runAt:         new Date().toISOString(),
      chunkCount:    chunks.length,
      pageCount,
      notes:         `Full chunked extraction via Gemini Files API — ${totalAtoms} page-traced atoms`,
    }).catch(() => {});
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

      // Detect fallback atoms:
      // - explicitly marked new-style (extractionTier:"fallback" or verificationStatus:"fallback_ai_summary")
      // - old-style: saved as "atomic" but pageNumber is null/0 (synthesis fallback before fix)
      const isFallbackRecord = (data: Record<string, unknown>): boolean => {
        if (data.extractionTier === "fallback") return true;
        if (data.verificationStatus === "fallback_ai_summary") return true;
        if (data.extractionTier === "atomic") {
          const pn = data.pageNumber as number | null | undefined;
          if (pn === null || pn === undefined || pn < 1) return true;
        }
        return false;
      };

      const fallback    = iSnap.docs.filter(d => isFallbackRecord(d.data() as Record<string, unknown>)).length;
      const trulyAtomic = iSnap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return data.extractionTier === "atomic" && !isFallbackRecord(data);
      }).length;

      setFallbackCount(fallback);
      setTrulyAtomicCount(trulyAtomic);
      setIntelCount(total - fallback - trulyAtomic);
      setAtomicCount(trulyAtomic);
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
               : (trulyAtomicCount ?? 0) > 0 ? "done"
               : (fallbackCount ?? 0) > 0 ? "available"
               : isApproved && doc.sourceType === "official" && !isConst ? "available"
               : "blocked",
      count:   (trulyAtomicCount ?? 0) > 0 ? (trulyAtomicCount ?? 0) : undefined,
      note:    isExtractingAtomic ? "Page-by-page scan हुँदैछ…"
               : (trulyAtomicCount ?? 0) > 0 ? `${trulyAtomicCount} page-traced atoms · verbatim source`
               : (fallbackCount ?? 0) > 0 ? `⚠ ${fallbackCount} fallback draft मात्र — page-traced होइन। Full extraction आवश्यक।`
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

          {/* ── Phase 1: Coverage Map ── */}
          {!loading && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Coverage — यो document को extraction अवस्था</p>

              {/* Honest status banner */}
              {(trulyAtomicCount ?? 0) === 0 ? (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-amber-500 shrink-0">⚠</span>
                  <p className="text-amber-400 font-semibold leading-snug">
                    यो document fully extracted छैन।
                    {(fallbackCount ?? 0) > 0
                      ? ` अहिले ${fallbackCount} fallback draft मात्र छ — public होइन।`
                      : " Full page-traced extraction अझै भएको छैन।"}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <p className="text-emerald-400 font-semibold">{trulyAtomicCount} page-traced atoms — source-backed।</p>
                </div>
              )}

              {/* Metric grid */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {[
                  { label: "Page-traced", count: trulyAtomicCount ?? 0, color: (trulyAtomicCount ?? 0) > 0 ? "emerald" : "zinc" },
                  { label: "Fallback draft", count: fallbackCount ?? 0,    color: (fallbackCount ?? 0) > 0 ? "amber" : "zinc" },
                  { label: "Intel records",  count: intelCount ?? 0,       color: (intelCount ?? 0) > 0 ? "sky" : "zinc" },
                  { label: "Relationships",  count: relCount ?? 0,         color: (relCount ?? 0) > 0 ? "violet" : "zinc" },
                  { label: "Constitution",   count: constCount ?? 0,       color: (constCount ?? 0) > 0 ? "emerald" : "zinc" },
                  { label: "Public-ready",   count: (trulyAtomicCount ?? 0) > 0 ? (trulyAtomicCount ?? 0) : 0,
                    color: (trulyAtomicCount ?? 0) > 0 ? "emerald" : "zinc" },
                ].map(m => (
                  <div key={m.label} className={`rounded-lg border px-2 py-1.5 ${
                    m.color === "emerald" ? "border-emerald-800/40 bg-emerald-950/10" :
                    m.color === "amber"   ? "border-amber-800/40 bg-amber-950/10" :
                    m.color === "sky"     ? "border-sky-800/40 bg-sky-950/10" :
                    m.color === "violet"  ? "border-violet-800/40 bg-violet-950/10" :
                    "border-zinc-800/30 bg-zinc-900/10"
                  }`}>
                    <p className={`text-sm font-black ${
                      m.color === "emerald" ? "text-emerald-400" :
                      m.color === "amber"   ? "text-amber-400" :
                      m.color === "sky"     ? "text-sky-400" :
                      m.color === "violet"  ? "text-violet-400" :
                      "text-zinc-600"
                    }`}>{m.count}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Next extraction step */}
              {(trulyAtomicCount ?? 0) === 0 && (
                <p className="text-zinc-600 text-[10px] leading-relaxed">
                  <span className="text-zinc-400 font-semibold">अर्को step:</span> Full extraction —
                  chunked Gemini processing (Phase 2 pipeline) — scanned PDF को लागि आवश्यक।
                </p>
              )}
            </div>
          )}

          {/* ── Fallback atom cleanup banner ── */}
          {!loading && (fallbackCount ?? 0) > 0 && cleanupState !== "done" && (
            <div className="rounded-xl border border-amber-800/50 bg-amber-950/15 px-4 py-3 space-y-3">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 text-base shrink-0">⚠</span>
                <div>
                  <p className="text-amber-300 text-xs font-bold">
                    {fallbackCount} fallback atoms भेटिए — public होइनन्
                  </p>
                  <p className="text-amber-500/80 text-[10px] mt-0.5 leading-relaxed">
                    यी atoms AI summary बाट बनेका हुन् — page-traced होइनन्।
                    ZZC को public intelligence को लागि acceptable छैन।
                    Quarantine (internal draft), Delete, वा Keep गर्नुहोस्।
                  </p>
                </div>
              </div>

              {cleanupState === "idle" && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setCleanupState("confirming_quarantine")}
                    className="w-full text-xs py-2 rounded-xl bg-amber-900/40 border border-amber-700/60 text-amber-200 hover:bg-amber-900/60 transition-colors font-semibold"
                  >
                    🔒 Quarantine गर्नुहोस् (Recommended) — internal draft, public नहोस्
                  </button>
                  <button
                    onClick={() => setCleanupState("confirming_delete")}
                    className="w-full text-xs py-2 rounded-xl bg-red-950/30 border border-red-800/50 text-red-300 hover:bg-red-950/50 transition-colors"
                  >
                    🗑 Delete गर्नुहोस् — सबै fallback atoms हटाउनुहोस्
                  </button>
                  <button
                    onClick={handleKeepFallback}
                    className="w-full text-xs py-1.5 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Internal draft राख्नुहोस् (अहिलेलाई छोड्नुहोस्)
                  </button>
                </div>
              )}

              {cleanupState === "confirming_quarantine" && (
                <div className="space-y-2">
                  <p className="text-amber-200 text-[11px] font-semibold">Quarantine गर्दा के हुन्छ?</p>
                  <div className="space-y-0.5 text-[10px] text-amber-500/80 leading-relaxed">
                    <p>• publishToJanta → false (public feed बाट हटाइन्छ)</p>
                    <p>• extractionTier → "fallback" (clearly labeled)</p>
                    <p>• verificationStatus → "fallback_ai_summary"</p>
                    <p>• confidence → 0.4 (draft quality)</p>
                    <p>• Atoms Firestore मा रहन्छन् — internal reference को लागि</p>
                    <p>• Cleanup log लेखिन्छ</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleQuarantineFallback}
                      className="flex-1 text-xs py-2 rounded-xl bg-amber-800/50 border border-amber-700 text-amber-100 font-bold hover:bg-amber-800/70 transition-colors"
                    >
                      हो, Quarantine गर्नुहोस्
                    </button>
                    <button
                      onClick={() => setCleanupState("idle")}
                      className="flex-1 text-xs py-2 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      रद्द
                    </button>
                  </div>
                </div>
              )}

              {cleanupState === "confirming_delete" && (
                <div className="space-y-2">
                  <p className="text-red-300 text-[11px] font-semibold">
                    ⚠ {fallbackCount} fallback atoms permanently delete हुनेछन्
                  </p>
                  <div className="space-y-0.5 text-[10px] text-red-400/70 leading-relaxed">
                    <p>• केवल fallback atoms delete हुन्छन् (extractionTier: fallback वा pageNumber: null)</p>
                    <p>• Page-traced real atoms कहिल्यै delete हुँदैनन्</p>
                    <p>• Cleanup log लेखिन्छ</p>
                    <p>• Document अब full extraction को लागि ready हुन्छ</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteFallback}
                      className="flex-1 text-xs py-2 rounded-xl bg-red-900/50 border border-red-700 text-red-200 font-bold hover:bg-red-900/70 transition-colors"
                    >
                      हो, Delete गर्नुहोस्
                    </button>
                    <button
                      onClick={() => setCleanupState("idle")}
                      className="flex-1 text-xs py-2 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      रद्द
                    </button>
                  </div>
                </div>
              )}

              {cleanupState === "running" && (
                <p className="text-amber-400 text-xs animate-pulse text-center py-2">Processing…</p>
              )}
            </div>
          )}

          {/* ── Cleanup result ── */}
          {cleanupState === "done" && cleanupResult && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 px-4 py-3">
              <p className="text-emerald-300 text-xs font-semibold">✓ Cleanup सम्पन्न</p>
              <p className="text-emerald-500/80 text-[10px] mt-1">{cleanupResult}</p>
              <p className="text-zinc-600 text-[10px] mt-1.5">Next: Phase 2 — full chunked extraction pipeline।</p>
            </div>
          )}

          {/* ── Phase 2: Full Chunked Extraction Panel ── */}
          {!loading && isApproved && !isConst && (
            <div className="rounded-xl border border-sky-900/40 bg-sky-950/10 px-4 py-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sky-400 text-[10px] uppercase tracking-wide">Full Document Extraction</p>
                {fullExtrState === "complete" && (
                  <span className="text-[10px] text-emerald-400 border border-emerald-800/50 bg-emerald-950/20 rounded-full px-2 py-0.5">✓ सम्पन्न</span>
                )}
              </div>

              {/* Idle — show start button */}
              {fullExtrState === "idle" && (
                <div className="space-y-2">
                  <p className="text-zinc-500 text-[10px] leading-relaxed">
                    PDF एक पटक Gemini Files API मा upload हुन्छ, त्यसपछि{" "}
                    <span className="text-sky-400 font-medium">
                      {Math.ceil(
                        (((doc as unknown as Record<string, unknown>).pageCount as number | undefined)
                          ?? Math.ceil(doc.fileSize / 15000)) / 3
                      )} chunks
                    </span>{" "}
                    (3 pages प्रत्येक) sequentially process हुन्छ।
                    प्रत्येक chunk को atoms तुरुन्त save हुन्छन्।
                  </p>
                  {(trulyAtomicCount ?? 0) > 0 && (
                    <p className="text-amber-500/70 text-[10px]">
                      ⚠ {trulyAtomicCount} existing atoms छन् — re-run गर्दा नयाँ atoms थपिन्छन् (existing हटाइँदैनन्)।
                    </p>
                  )}
                  <button
                    onClick={() => void handleFullExtraction()}
                    className="w-full text-xs py-2.5 rounded-xl bg-sky-900/40 border border-sky-700/60 text-sky-200 hover:bg-sky-900/60 transition-colors font-semibold"
                  >
                    📄 Full Document Extraction चलाउनुहोस्
                  </button>
                </div>
              )}

              {/* Uploading */}
              {fullExtrState === "uploading" && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-5 h-5 border-2 border-sky-500/40 border-t-sky-400 rounded-full animate-spin shrink-0" />
                  <div>
                    <p className="text-sky-300 text-xs font-semibold">PDF upload हुँदैछ…</p>
                    <p className="text-sky-600 text-[10px]">Gemini Files API — एकपटक upload, सबै chunks मा reuse</p>
                  </div>
                </div>
              )}

              {/* Extracting */}
              {fullExtrState === "extracting" && (
                <div className="space-y-2.5">
                  {/* Summary bar */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-sky-300 font-semibold">
                      {fullExtrChunks.filter(c => c.status === "done" || c.status === "error").length} / {fullExtrChunks.length} chunks
                    </span>
                    <span className="text-emerald-400 font-bold">{fullExtrAtoms} atoms saved</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                      style={{
                        width: `${fullExtrChunks.length === 0 ? 0
                          : (fullExtrChunks.filter(c => c.status === "done" || c.status === "error").length / fullExtrChunks.length) * 100}%`
                      }}
                    />
                  </div>
                  {/* Chunk mini-grid */}
                  <div className="flex flex-wrap gap-1">
                    {fullExtrChunks.map(c => (
                      <div
                        key={c.index}
                        title={`Pages ${c.start}–${c.end}: ${c.status === "done" ? `${c.records} atoms` : c.status === "error" ? c.error : c.status}`}
                        className={`h-4 rounded text-[9px] flex items-center justify-center min-w-[2rem] px-1 transition-all ${
                          c.status === "done"    ? "bg-emerald-900/60 border border-emerald-700/60 text-emerald-400" :
                          c.status === "error"   ? "bg-red-900/60 border border-red-700/60 text-red-400" :
                          c.status === "running" ? "bg-amber-900/60 border border-amber-700/60 text-amber-400 animate-pulse" :
                          "bg-zinc-800/40 border border-zinc-700/30 text-zinc-700"
                        }`}
                      >
                        {c.status === "done" ? c.records : c.status === "error" ? "!" : c.status === "running" ? "⟳" : "·"}
                      </div>
                    ))}
                  </div>
                  {/* Running chunk info */}
                  {fullExtrChunks.find(c => c.status === "running") && (
                    <p className="text-amber-500/70 text-[10px] animate-pulse">
                      Pages {fullExtrChunks.find(c => c.status === "running")?.start}–
                      {fullExtrChunks.find(c => c.status === "running")?.end} process हुँदैछ…
                    </p>
                  )}
                  {/* Error chunks */}
                  {fullExtrChunks.filter(c => c.status === "error").length > 0 && (
                    <div className="space-y-0.5">
                      {fullExtrChunks.filter(c => c.status === "error").map(c => (
                        <p key={c.index} className="text-red-400/70 text-[10px]">
                          ✗ Chunk {c.index + 1} (pages {c.start}–{c.end}): {c.error ?? "failed"}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Complete */}
              {fullExtrState === "complete" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-base">✓</span>
                    <div>
                      <p className="text-emerald-300 text-xs font-bold">{fullExtrAtoms} page-traced atoms save भए</p>
                      <p className="text-emerald-600 text-[10px]">
                        {fullExtrChunks.filter(c => c.status === "done").length}/{fullExtrChunks.length} chunks सफल ·
                        {fullExtrChunks.filter(c => c.status === "error").length > 0
                          ? ` ${fullExtrChunks.filter(c => c.status === "error").length} chunks failed`
                          : " सबै chunks ठीक"}
                      </p>
                    </div>
                  </div>
                  {/* Failed chunk summary */}
                  {fullExtrChunks.filter(c => c.status === "error").length > 0 && (
                    <div className="rounded-lg border border-red-900/40 bg-red-950/10 px-3 py-2 space-y-0.5">
                      <p className="text-red-400 text-[10px] font-semibold">Failed chunks:</p>
                      {fullExtrChunks.filter(c => c.status === "error").map(c => (
                        <p key={c.index} className="text-red-500/70 text-[10px]">
                          Pages {c.start}–{c.end}: {c.error ?? "unknown error"}
                        </p>
                      ))}
                      <p className="text-zinc-600 text-[10px] mt-1">Re-extraction: Extraction फेरि चलाउनुहोस् — failed pages मात्र re-process गर्न Manual chunk retry coming in Phase 3।</p>
                    </div>
                  )}
                  <button
                    onClick={() => { setFullExtrState("idle"); setFullExtrChunks([]); setFullExtrAtoms(0); }}
                    className="w-full text-[10px] py-1.5 rounded-xl border border-zinc-700/50 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    फेरि run गर्नुहोस् (re-extraction)
                  </button>
                </div>
              )}

              {/* Error */}
              {fullExtrState === "error" && (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 shrink-0">❌</span>
                    <div>
                      <p className="text-red-300 text-xs font-bold">Extraction failed</p>
                      <p className="text-red-500/80 text-[10px] mt-0.5 leading-relaxed">{fullExtrError}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setFullExtrState("idle"); setFullExtrError(""); setFullExtrChunks([]); }}
                    className="w-full text-xs py-2 rounded-xl bg-sky-900/30 border border-sky-800/50 text-sky-300 hover:bg-sky-900/50 transition-colors"
                  >
                    फेरि try गर्नुहोस्
                  </button>
                </div>
              )}
            </div>
          )}

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
