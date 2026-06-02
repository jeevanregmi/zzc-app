"use client";

// CivicObjectWorkspace — ONE document, ONE workspace.
// Shows pipeline status, what was extracted, and what to do next.
// Phase 1: read-only status + extraction triggers.
// Phase 3+: full extraction inside workspace, deprecate scattered DocumentCard buttons.

import { useState, useEffect, useRef } from "react";
import {
  collection, query, where, limit, getDocs, getDoc,
  updateDoc, addDoc, deleteDoc, setDoc, doc as firestoreDoc,
} from "firebase/firestore";
import { db } from "../../../app/firebase";
import type { IntelligenceDocument } from "../../../lib/types/documents";
import Link from "next/link";
import { RecordLayerViewer, type ActiveLayer } from "./RecordLayerViewer";
import { KnowledgeExtractionViewer } from "./KnowledgeExtractionViewer";

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

function parsePageCount(value: string | number | null | undefined): number {
  const parsed = typeof value === "number"
    ? value
    : parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// ── Public route display ───────────────────────────────────────────────────────

const PUBLIC_ROUTES = [
  { id: "janta",        label: "Janta Intelligence",   href: "/janta",                  icon: "👁" },
  { id: "constitution", label: "Constitution Chautari", href: "/constitution",            icon: "🌳" },
  { id: "economy",      label: "Economy Chautari",      href: "/vault/economy",           icon: "💰" },
  { id: "health",       label: "Branch Health",         href: "/vault/constitution/health", icon: "🩺" },
];

// ── Extraction job types + helpers (module-level) ──────────────────────────────

interface ChunkStatus {
  index:      number;
  start:      number;
  end:        number;
  status:     "pending" | "running" | "done" | "error";
  records:    number;
  paragraphs: number;
  error?:     string;
}

interface ChunkJobStatus {
  status:     string;
  atomCount:  number;
  error?:     string;
  retryCount: number;
}

interface JobRecord {
  jobId:           string;
  expectedPages:   number;
  chunkSize:       number;
  totalChunks:     number;
  status:          "running" | "paused" | "partial_complete" | "complete" | "failed" | "cancelled";
  totalAtomsSaved: number;
  startedAt:       string;
  updatedAt:       string;
  chunkStatuses:   Record<string, ChunkJobStatus>;
}

const CHUNK_PAGES = 3;

function buildChunkPlan(totalPages: number): ChunkStatus[] {
  const plan: ChunkStatus[] = [];
  for (let p = 1; p <= totalPages; p += CHUNK_PAGES) {
    plan.push({
      index: plan.length,
      start: p,
      end:   Math.min(p + CHUNK_PAGES - 1, totalPages),
      status: "pending",
      records: 0, paragraphs: 0,
    });
  }
  return plan;
}

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

  const [intelCount,          setIntelCount]          = useState<number | null>(null);
  const [relCount,            setRelCount]            = useState<number | null>(null);
  const [constCount,          setConstCount]          = useState<number | null>(null);
  const [atomicCount,         setAtomicCount]         = useState<number | null>(null);
  const [fallbackCount,         setFallbackCount]         = useState<number | null>(null);
  const [dangerousFallbackCount,setDangerousFallbackCount] = useState<number | null>(null);
  const [trulyAtomicCount,    setTrulyAtomicCount]    = useState<number | null>(null);
  const [rawExhaustiveCount,  setRawExhaustiveCount]  = useState<number | null>(null);
  const [loading,             setLoading]             = useState(true);
  const [activeLayer,         setActiveLayer]         = useState<ActiveLayer | null>(null);

  // Cleanup state — quarantine/delete fallback atoms
  type CleanupState = "idle" | "confirming_quarantine" | "confirming_delete" | "running" | "done";
  const [cleanupState,  setCleanupState]  = useState<CleanupState>("idle");
  const [cleanupResult, setCleanupResult] = useState<string>("");

  // Full chunked extraction state (Phase 2)
  type FullExtrState = "idle" | "uploading" | "extracting" | "complete" | "error";
  const [fullExtrState,      setFullExtrState]      = useState<FullExtrState>("idle");
  const [fullExtrChunks,     setFullExtrChunks]     = useState<ChunkStatus[]>([]);
  const [fullExtrAtoms,      setFullExtrAtoms]       = useState<number>(0);
  const [fullExtrParagraphs, setFullExtrParagraphs] = useState<number>(0);
  const [fullExtrError,      setFullExtrError]       = useState<string>("");

  // Persistent extraction job (enables resume after reload/network failure)
  const [savedJob,     setSavedJob]     = useState<JobRecord | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);

  // Source Coverage Verification
  const [detectedPageCount,    setDetectedPageCount]    = useState<number | null>(
    ((doc as unknown as Record<string, unknown>).detectedPageCount as number | undefined) ?? null
  );
  const [founderExpectedPages, setFounderExpectedPages] = useState<string>(
    String(((doc as unknown as Record<string, unknown>).expectedPageCount as number | undefined) ?? "")
  );
  const [storedFileUri,        setStoredFileUri]        = useState<string>("");

  // Clean re-run (delete old extraction atoms, keep intel records)
  type CleanRerunState = "idle" | "confirming" | "running" | "done";
  const [cleanRerunState,  setCleanRerunState]  = useState<CleanRerunState>("idle");
  const [cleanRerunResult, setCleanRerunResult] = useState<string>("");

  // Unpublish all unreviewed public-ready records
  type UnpublishAllState = "idle" | "confirming" | "running" | "done";
  const [unpublishAllState, setUnpublishAllState] = useState<UnpublishAllState>("idle");
  const [unpublishAllCount, setUnpublishAllCount] = useState<number>(0);

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

  // ── Clean re-run: delete raw_exhaustive + atomic atoms, keep intel ──────────

  async function handleCleanRerun() {
    setCleanRerunState("running");
    try {
      const snap = await getDocs(query(
        collection(db, "janta_intelligence"),
        where("ownerId",     "==", ownerId),
        where("sourceDocId", "==", doc.id),
        limit(1000),
      ));
      const toDelete = snap.docs.filter(d => {
        const tier = (d.data() as Record<string, unknown>).extractionTier;
        return tier === "raw_exhaustive" || tier === "atomic";
      });
      await Promise.all(toDelete.map(d => deleteDoc(firestoreDoc(db, "janta_intelligence", d.id))));
      await addDoc(collection(db, "document_cleanup_logs"), {
        actionType:    "clean_rerun_delete_extraction_atoms",
        documentId:    doc.id,
        documentTitle: doc.title,
        affectedCount: toDelete.length,
        runBy:         ownerId,
        runAt:         new Date().toISOString(),
        notes:         `Deleted ${toDelete.length} raw_exhaustive + atomic atoms. Intel records preserved.`,
      }).catch(() => {});
      setRawExhaustiveCount(0);
      setAtomicCount(0);
      setTrulyAtomicCount(0);
      setFullExtrState("idle");
      setFullExtrChunks([]);
      setFullExtrAtoms(0);
      setFullExtrParagraphs(0);
      // Mark previous job as cancelled in vault_documents (keep visible for history)
      updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
        "lastExtractionJob.status":    "cancelled",
        "lastExtractionJob.updatedAt": new Date().toISOString(),
      }).catch(e => console.warn("[VaultDoc] cancel job failed:", e?.code ?? e));
      setSavedJob(prev => prev ? { ...prev, status: "cancelled" } : null);
      setCurrentJobId(null);
      setCleanRerunResult(`${toDelete.length} extraction atoms हटाइयो — Intel records सुरक्षित। Fresh extraction को लागि ready।`);
      setCleanRerunState("done");
    } catch (err) {
      setCleanRerunResult(`Clean re-run failed: ${err instanceof Error ? err.message : String(err)}`);
      setCleanRerunState("idle");
    }
  }

  // ── Unpublish all unreviewed public-ready records ─────────────────────────

  async function handleUnpublishUnreviewed() {
    setUnpublishAllState("running");
    try {
      const snap = await getDocs(query(
        collection(db, "janta_intelligence"),
        where("ownerId",     "==", ownerId),
        where("sourceDocId", "==", doc.id),
        limit(500),
      ));
      const unreviewed = snap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return (data.publicReady === true || data.publishToJanta === true)
          && data.founderReviewStatus !== "approved";
      });
      await Promise.all(unreviewed.map(d =>
        updateDoc(firestoreDoc(db, "janta_intelligence", d.id), {
          publishToJanta:      false,
          publicReady:         false,
          founderReviewStatus: "needs_review",
          updatedAt:           new Date().toISOString(),
        })
      ));
      await addDoc(collection(db, "document_cleanup_logs"), {
        actionType:    "unpublish_unreviewed_public_records",
        documentId:    doc.id,
        documentTitle: doc.title,
        affectedCount: unreviewed.length,
        runBy:         ownerId,
        runAt:         new Date().toISOString(),
        notes:         `Unpublished ${unreviewed.length} records that were public without founder approval`,
      }).catch(() => {});
      setUnpublishAllCount(unreviewed.length);
      setUnpublishAllState("done");
    } catch (err) {
      setUnpublishAllState("idle");
    }
  }

  // ── Shared chunk processing loop (used by fresh extraction + resume) ─────────

  async function runChunks(
    chunksToProcess: ChunkStatus[],
    allChunks:       ChunkStatus[],
    fileUri:         string,
    jobId:           string,
    startingAtoms:   number,
  ): Promise<{ totalAtoms: number; failedCount: number }> {
    const sourceYear = ((doc as unknown as Record<string, unknown>).docYear as number | undefined)?.toString()
      ?? new Date(doc.uploadedAt).getFullYear().toString();
    const now         = new Date().toISOString();
    const MAX_RETRIES = 2;
    let totalAtoms  = startingAtoms;
    let failedCount = 0;

    setFullExtrState("extracting");

    for (const chunk of chunksToProcess) {
      let success   = false;
      let lastError = "";

      for (let attempt = 0; attempt <= MAX_RETRIES && !success; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000));

        setFullExtrChunks(prev => prev.map(c =>
          c.index === chunk.index
            ? { ...c, status: "running", error: attempt > 0 ? `retry ${attempt}/${MAX_RETRIES}…` : undefined }
            : c
        ));

        // Update Firestore: chunk in progress
        updateDoc(firestoreDoc(db, "document_extraction_jobs", jobId), {
          [`chunkStatuses.${chunk.index}`]: { status: "processing", atomCount: 0, retryCount: attempt },
          updatedAt: new Date().toISOString(),
        }).catch(() => {});

        try {
          const res = await fetch("/api/chunk-extract", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({
              fileUri,
              startPage:   chunk.start,
              endPage:     chunk.end,
              chunkIndex:  chunk.index,
              totalChunks: allChunks.length,
              docId:       doc.id,
              ownerId,
              docTitle:    doc.title,
              sourceYear,
            }),
          });

          const data = await res.json() as {
            ok:     boolean;
            pages?: Array<{
              pageNumber: number;
              paragraphs: Array<{
                text: string; summaryNepali: string; type: string; orderIndex: number;
                sectionTitle?: string; heading?: string; subheading?: string; isHeading?: boolean;
              }>;
            }>;
            error?: string;
          };

          if (!data.ok) { lastError = (data.error ?? "Chunk failed").slice(0, 120); continue; }

          const pages = data.pages ?? [];
          const savePromises: Promise<unknown>[] = [];
          let chunkAtoms = 0;

          for (const page of pages) {
            for (const para of page.paragraphs) {
              if (!para.text?.trim()) continue;
              // Deterministic ID prevents duplicate atoms on retry
              const atomKey = `${doc.id}_ck${chunk.index}_p${para.orderIndex}`;
              savePromises.push(
                setDoc(firestoreDoc(db, "janta_intelligence", atomKey), {
                  ownerId,
                  sourceDocId:          doc.id,
                  sourceDocTitle:       doc.title,
                  pageNumber:           page.pageNumber,
                  paragraphIndex:       para.orderIndex,
                  originalText:         para.text,
                  summaryNepali:        para.summaryNepali,
                  type:                 para.type,
                  title:                para.text.slice(0, 70).trimEnd() + (para.text.length > 70 ? "…" : ""),
                  sector:               "other",
                  fiscalYear:           sourceYear,
                  sectionTitle:         para.sectionTitle ?? "",
                  heading:              para.heading      ?? "",
                  subheading:           para.subheading   ?? "",
                  isHeading:            para.isHeading    ?? false,
                  extractionTier:       "raw_exhaustive",
                  publishToJanta:       false,
                  published:            false,
                  publicReady:          false,
                  founderReviewStatus:  "needs_review",
                  verificationStatus:   "raw_extracted",
                  domainClassification: null,
                  extractionChunk:      chunk.index,
                  chunkPageRange:       `${chunk.start}-${chunk.end}`,
                  extractionJobId:      jobId,
                  deterministicKey:     atomKey,
                  createdAt:            now,
                  updatedAt:            now,
                })
              );
              chunkAtoms++;
            }
          }
          await Promise.all(savePromises);

          totalAtoms += chunkAtoms;
          setFullExtrAtoms(totalAtoms);
          setFullExtrParagraphs(totalAtoms);
          setFullExtrChunks(prev => prev.map(c =>
            c.index === chunk.index
              ? { ...c, status: "done", records: chunkAtoms, paragraphs: chunkAtoms, error: undefined }
              : c
          ));

          // Update vault_documents.lastExtractionJob + in-memory savedJob: chunk done
          const doneStatus: ChunkJobStatus = {
            status: "done", atomCount: chunkAtoms, retryCount: attempt,
          };
          updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
            [`lastExtractionJob.chunkStatuses.${chunk.index}`]: doneStatus,
            "lastExtractionJob.totalAtomsSaved": totalAtoms,
            "lastExtractionJob.updatedAt":       new Date().toISOString(),
          }).catch(e => console.warn("[VaultDoc] chunk done update failed:", e?.code ?? e));
          setSavedJob(prev => prev ? {
            ...prev,
            totalAtomsSaved: totalAtoms,
            chunkStatuses: { ...prev.chunkStatuses, [String(chunk.index)]: doneStatus },
          } : prev);

          success = true;
        } catch (err) {
          lastError = (err instanceof Error ? err.message : String(err)).slice(0, 120);
        }
      }

      if (!success) {
        failedCount++;
        setFullExtrChunks(prev => prev.map(c =>
          c.index === chunk.index ? { ...c, status: "error", error: lastError } : c
        ));
        const failedStatus: ChunkJobStatus = {
          status: "failed", atomCount: 0, error: lastError, retryCount: MAX_RETRIES,
        };
        updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
          [`lastExtractionJob.chunkStatuses.${chunk.index}`]: failedStatus,
          "lastExtractionJob.updatedAt": new Date().toISOString(),
        }).catch(e => console.warn("[VaultDoc] chunk fail update failed:", e?.code ?? e));
        setSavedJob(prev => prev ? {
          ...prev,
          chunkStatuses: { ...prev.chunkStatuses, [String(chunk.index)]: failedStatus },
        } : prev);
      }
    }

    return { totalAtoms, failedCount };
  }

  // ── Full chunked extraction (Phase 2 — fresh start) ───────────────────────────

  async function handleFullExtraction() {
    setFullExtrAtoms(0);
    setFullExtrParagraphs(0);
    setFullExtrError("");
    setFullExtrState("uploading");

    // Step 1 — Upload PDF to Gemini Files API
    let fileUri = "";
    let resolvedPageCount = 0;
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
      const upData = await upRes.json() as {
        ok: boolean; fileUri?: string; error?: string; pageCount?: number;
      };
      if (!upData.ok || !upData.fileUri) {
        setFullExtrError(upData.error ?? "PDF upload to Gemini Files API failed");
        setFullExtrState("error");
        return;
      }
      fileUri = upData.fileUri;
      setStoredFileUri(fileUri);

      const detectedPages = upData.pageCount ?? 0;
      if (detectedPages > 0) {
        setDetectedPageCount(detectedPages);
        void updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
          detectedPageCount: detectedPages,
        }).catch(() => {});
      }
      const founderOverride = parseInt(founderExpectedPages, 10);
      resolvedPageCount =
        (founderOverride > 0 ? founderOverride : null)
        ?? (detectedPages > 0 ? detectedPages : null)
        ?? Math.ceil(doc.fileSize / 15000);
    } catch (err) {
      setFullExtrError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
      setFullExtrState("error");
      return;
    }

    // Step 2 — Build chunk plan and create job document
    const allChunks = buildChunkPlan(resolvedPageCount);
    setFullExtrChunks(allChunks);

    let jobId = `local_${Date.now()}`;
    try {
      const jobRef = await addDoc(collection(db, "document_extraction_jobs"), {
        sourceDocId:    doc.id,
        ownerId,
        expectedPages:  resolvedPageCount,
        chunkSize:      CHUNK_PAGES,
        totalChunks:    allChunks.length,
        status:         "running",
        extractionMode: "full_chunked_raw_exhaustive",
        startedAt:      new Date().toISOString(),
        updatedAt:      new Date().toISOString(),
        totalAtomsSaved: 0,
        chunkStatuses:  {},
        modelUsed:      "gemini-2.5-flash",
        fileUri,
      });
      jobId = jobRef.id;
      setCurrentJobId(jobId);
    } catch { /* continue without Firestore job if write fails */ }

    // Write job state to vault_documents (uses existing rules — always works)
    const initialJob: JobRecord = {
      jobId,
      expectedPages:   resolvedPageCount,
      chunkSize:       CHUNK_PAGES,
      totalChunks:     allChunks.length,
      status:          "running",
      totalAtomsSaved: 0,
      startedAt:       new Date().toISOString(),
      updatedAt:       new Date().toISOString(),
      chunkStatuses:   {},
    };
    setSavedJob(initialJob);
    // Persist expectedPageCount explicitly when founder provided an override so future sessions read it.
    try {
      void updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
        lastExtractionJob: initialJob,
        expectedPageCount: resolvedPageCount,
      }).catch(e => console.warn("[VaultDoc] initial job write failed:", e?.code ?? e, "— localStorage will handle recovery"));
    } catch {}

    // Step 3 — Process all chunks
    const { totalAtoms, failedCount } = await runChunks(allChunks, allChunks, fileUri, jobId, 0);

    // Step 4 — Finalize
    setRawExhaustiveCount(totalAtoms);
    setAtomicCount(0);
    setTrulyAtomicCount(0);
    setFullExtrState("complete");

    const finalStatus: JobRecord["status"] = failedCount > 0 ? "partial_complete" : "complete";
    // Update vault_documents.lastExtractionJob with final status
    updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
      "lastExtractionJob.status":          finalStatus,
      "lastExtractionJob.totalAtomsSaved": totalAtoms,
      "lastExtractionJob.updatedAt":       new Date().toISOString(),
    }).catch(() => {});
    setSavedJob(prev => prev ? { ...prev, status: finalStatus, totalAtomsSaved: totalAtoms } : null);
  }

  // ── Resume / Retry failed chunks ──────────────────────────────────────────────

  async function handleResume(retryFailedOnly: boolean) {
    if (!savedJob) return;

    // Respect founder override if provided in the UI (founderExpectedPages), else fall back to saved job pages
    const overridePages = parsePageCount(founderExpectedPages);
    const resumeExpectedPages = overridePages > 0 ? overridePages : (savedJob.expectedPages || 0);
    const allChunks = buildChunkPlan(resumeExpectedPages);

    // Restore display chunk grid from saved Firestore state
    const displayChunks: ChunkStatus[] = allChunks.map(c => {
      const cs = savedJob.chunkStatuses[String(c.index)];
      if (!cs) return c;
      if (cs.status === "done")
        return { ...c, status: "done"  as const, records: cs.atomCount, paragraphs: cs.atomCount };
      return { ...c, status: "error" as const, error: cs.error ?? "failed" };
    });
    setFullExtrChunks(displayChunks);
    setFullExtrAtoms(savedJob.totalAtomsSaved);
    setFullExtrParagraphs(savedJob.totalAtomsSaved);
    setFullExtrError("");

    // Decide which chunks to re-process
    const chunksToProcess = allChunks.filter(c => {
      const cs = savedJob.chunkStatuses[String(c.index)];
      if (!cs) return true; // never touched
      if (cs.status === "done") return false;
      if (retryFailedOnly) return cs.status === "failed" || cs.status === "processing";
      return cs.status !== "done";
    });

    if (chunksToProcess.length === 0) { setFullExtrState("complete"); return; }

    // Re-upload PDF (Gemini URI expires in 48h — always get fresh)
    setFullExtrState("uploading");
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
        setFullExtrError(upData.error ?? "PDF re-upload failed");
        setFullExtrState("error");
        return;
      }
      fileUri = upData.fileUri;
      setStoredFileUri(fileUri);
    } catch (err) {
      setFullExtrError(`Upload error: ${err instanceof Error ? err.message : String(err)}`);
      setFullExtrState("error");
      return;
    }

    // Mark resuming chunks as pending in display
    setFullExtrChunks(prev => prev.map(c =>
      chunksToProcess.some(r => r.index === c.index)
        ? { ...c, status: "pending", error: undefined }
        : c
    ));

    const jobId = savedJob.jobId;
    setCurrentJobId(jobId);
    updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
      "lastExtractionJob.status":    "running",
      "lastExtractionJob.updatedAt": new Date().toISOString(),
    }).catch(() => {});
    setSavedJob(prev => prev ? { ...prev, status: "running" } : null);

    const { totalAtoms, failedCount } = await runChunks(
      chunksToProcess, allChunks, fileUri, jobId, savedJob.totalAtomsSaved,
    );

    setRawExhaustiveCount(totalAtoms);
    setFullExtrState("complete");

    const finalStatus: JobRecord["status"] = failedCount > 0 ? "partial_complete" : "complete";
    updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
      "lastExtractionJob.status":          finalStatus,
      "lastExtractionJob.totalAtomsSaved": totalAtoms,
      "lastExtractionJob.updatedAt":       new Date().toISOString(),
    }).catch(() => {});
    setSavedJob(prev => prev
      ? { ...prev, status: finalStatus, totalAtomsSaved: totalAtoms }
      : null
    );
  }

  const isConst    = isConstitutionDoc(doc);
  const isApproved = doc.adminApprovalStatus === "approved";
  const hasAI      = doc.processingStatus === "ai_ready";
  const detectedPageCountNumber = detectedPageCount ?? 0;
  const expectedPageCount = parsePageCount(founderExpectedPages) || savedJob?.expectedPages || detectedPageCountNumber;
  const savedJobExpectedPages = savedJob?.expectedPages ?? 0;
  const pageReviewStatus: "verified" | "mismatch" | "needs_review" = (() => {
    if (expectedPageCount <= 0) return "needs_review";
    if (savedJobExpectedPages > 0) {
      return savedJobExpectedPages === expectedPageCount ? "verified" : "mismatch";
    }
    return "needs_review";
  })();
  // public_ready = page-traced atoms + any intel records marked publishToJanta
  // Approximated as trulyAtomicCount for now; RecordLayerViewer does the exact query
  const allPublicCount = (trulyAtomicCount ?? 0);

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

      const isFallbackRecord = (data: Record<string, unknown>): boolean => {
        if (data.extractionTier === "fallback") return true;
        if (data.verificationStatus === "fallback_ai_summary") return true;
        // old-style: saved as "atomic" but no valid pageNumber (synthesis era)
        if (data.extractionTier === "atomic") {
          const pn = data.pageNumber as number | null | undefined;
          if (pn === null || pn === undefined || pn < 1) return true;
        }
        return false;
      };

      const fallback         = iSnap.docs.filter(d => isFallbackRecord(d.data() as Record<string, unknown>)).length;
      // Dangerous = fallback AND still publicly visible (not yet quarantined)
      const dangerousFallback = iSnap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return isFallbackRecord(data) && (data.publishToJanta === true || data.publicReady === true);
      }).length;
      const rawExhaustive = iSnap.docs.filter(d => (d.data() as Record<string, unknown>).extractionTier === "raw_exhaustive").length;
      const trulyAtomic   = iSnap.docs.filter(d => {
        const data = d.data() as Record<string, unknown>;
        return data.extractionTier === "atomic" && !isFallbackRecord(data);
      }).length;

      setFallbackCount(fallback);
      setDangerousFallbackCount(dangerousFallback);
      setRawExhaustiveCount(rawExhaustive);
      setTrulyAtomicCount(trulyAtomic);
      setIntelCount(total - fallback - rawExhaustive - trulyAtomic);
      setAtomicCount(trulyAtomic);
      setRelCount(relSnap?.docs.length ?? 0);
      setConstCount(constSnap?.docs.length ?? 0);
      setLoading(false);
    };
    void run();
  }, [ownerId, doc.id]);

  // Auto-sync savedJob → localStorage on every change (primary persistence — always works)
  useEffect(() => {
    const key = `zzc_extraction_job_${doc.id}`;
    if (!savedJob) return; // don't clear on null — keep last known state
    try { localStorage.setItem(key, JSON.stringify(savedJob)); } catch {}
  }, [savedJob, doc.id]);

  // Fresh read of vault_documents on mount.
  // Cascades: Firestore.expectedPageCount → job.expectedPages → localStorage.expectedPages
  useEffect(() => {
    if (!ownerId || !doc.id) return;
    void (async () => {
      const snap = await safe(getDoc(firestoreDoc(db, "vault_documents", doc.id)), null);
      const d = snap?.exists() ? (snap.data() as Record<string, unknown>) : {};

      // ── Page count: cascade through all sources ──────────────────────────
      const epc = d.expectedPageCount as number | undefined;
      let resolvedPages = epc && epc > 0 ? epc : 0;

      // Load extraction job: Firestore first, then localStorage
      const firestoreJobRaw = d.lastExtractionJob as Record<string, unknown> | undefined;
      let loadedJob: JobRecord | null = null;

      if (firestoreJobRaw?.jobId) {
        loadedJob = {
          jobId:           (firestoreJobRaw.jobId           as string)  ?? "unknown",
          expectedPages:   (firestoreJobRaw.expectedPages   as number)  ?? 0,
          chunkSize:       (firestoreJobRaw.chunkSize       as number)  ?? CHUNK_PAGES,
          totalChunks:     (firestoreJobRaw.totalChunks     as number)  ?? 0,
          status:          (firestoreJobRaw.status          as JobRecord["status"]) ?? "failed",
          totalAtomsSaved: (firestoreJobRaw.totalAtomsSaved as number)  ?? 0,
          startedAt:       (firestoreJobRaw.startedAt       as string)  ?? "",
          updatedAt:       (firestoreJobRaw.updatedAt       as string)  ?? "",
          chunkStatuses:   (firestoreJobRaw.chunkStatuses   as Record<string, ChunkJobStatus>) ?? {},
        };
        setSavedJob(loadedJob);
      } else {
        try {
          const localStr = localStorage.getItem(`zzc_extraction_job_${doc.id}`);
          if (localStr) {
            const localJob = JSON.parse(localStr) as JobRecord;
            if (localJob?.jobId) { setSavedJob(localJob); loadedJob = localJob; }
          }
        } catch {}
      }

      // Fallback: use job.expectedPages if no explicit expectedPageCount saved
      if (resolvedPages === 0 && loadedJob?.expectedPages && loadedJob.expectedPages > 0) {
        resolvedPages = loadedJob.expectedPages;
      }

      // Also check localStorage for page count even if no job stored there
      if (resolvedPages === 0) {
        try {
          const localStr = localStorage.getItem(`zzc_extraction_job_${doc.id}`);
          const lj = localStr ? (JSON.parse(localStr) as Record<string, unknown>) : null;
          if (lj?.expectedPages && (lj.expectedPages as number) > 0) {
            resolvedPages = lj.expectedPages as number;
          }
        } catch {}
      }

      if (resolvedPages > 0) {
        setFounderExpectedPages(String(resolvedPages));
        // Backfill vault_documents.expectedPageCount so future sessions don't need to cascade
        if (!epc) {
          void updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
            expectedPageCount: resolvedPages,
          }).catch(e => console.warn("[VaultDoc] expectedPageCount backfill:", e?.code ?? e));
        }
      }
    })();
  }, [doc.id, ownerId]);

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

          {/* ── Records & Layer Viewer — shown when a count card is clicked ── */}
          {activeLayer && (
            <RecordLayerViewer
              docId={doc.id}
              ownerId={ownerId}
              layer={activeLayer}
              onClose={() => setActiveLayer(null)}
            />
          )}

          {/* ── Normal workspace content — hidden while viewer is open ── */}
          {!activeLayer && (<>

          {/* ── Phase 1: Coverage Map ── */}
          {!loading && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 space-y-3">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Coverage — यो document को extraction अवस्था</p>

              {/* Honest status banner */}
              {(rawExhaustiveCount ?? 0) > 0 ? (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-sky-500 shrink-0">⚛</span>
                  <p className="text-sky-300 font-semibold leading-snug">
                    {rawExhaustiveCount} raw paragraphs captured — exhaustive extraction।
                    {(trulyAtomicCount ?? 0) > 0 && ` · ${trulyAtomicCount} page-traced atoms पनि छन्।`}
                    <span className="text-sky-600 font-normal"> Domain classification र founder approval बाँकी।</span>
                  </p>
                </div>
              ) : (trulyAtomicCount ?? 0) > 0 ? (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <p className="text-emerald-400 font-semibold">{trulyAtomicCount} page-traced atoms — source-backed।</p>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-xs">
                  <span className="text-amber-500 shrink-0">⚠</span>
                  <p className="text-amber-400 font-semibold leading-snug">
                    यो document fully extracted छैन।
                    {(fallbackCount ?? 0) > 0
                      ? ` अहिले ${fallbackCount} fallback draft मात्र छ — public होइन।`
                      : " Full exhaustive extraction अझै भएको छैन।"}
                  </p>
                </div>
              )}

              {/* Metric grid — each card is clickable → opens RecordLayerViewer */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                {([
                  { label: "Raw paragraphs", count: rawExhaustiveCount ?? 0, color: (rawExhaustiveCount ?? 0) > 0 ? "sky"     : "zinc", layer: "raw_exhaustive" as ActiveLayer },
                  { label: "Page-traced",    count: trulyAtomicCount ?? 0,   color: (trulyAtomicCount ?? 0) > 0   ? "emerald" : "zinc", layer: "atomic"         as ActiveLayer },
                  { label: "Fallback draft", count: fallbackCount ?? 0,      color: (fallbackCount ?? 0) > 0      ? "amber"   : "zinc", layer: "fallback"       as ActiveLayer },
                  { label: "Intel records",  count: intelCount ?? 0,         color: (intelCount ?? 0) > 0         ? "sky"     : "zinc", layer: "intel"          as ActiveLayer },
                  { label: "Relationships",  count: relCount ?? 0,           color: (relCount ?? 0) > 0           ? "violet"  : "zinc", layer: "relationships"  as ActiveLayer },
                  {
                    label: "Public-ready",
                    count: allPublicCount,
                    color: allPublicCount > 0 ? "emerald" : "zinc",
                    layer: "public_ready" as ActiveLayer,
                  },
                ] satisfies Array<{ label: string; count: number; color: string; layer: ActiveLayer }>).map(m => (
                  <button
                    key={m.label}
                    onClick={() => m.count > 0 ? setActiveLayer(m.layer) : undefined}
                    disabled={m.count === 0}
                    className={`rounded-lg border px-2 py-1.5 transition-all group ${
                      m.count > 0 ? "hover:border-white/20 cursor-pointer" : "cursor-default opacity-60"
                    } ${
                      m.color === "emerald" ? "border-emerald-800/40 bg-emerald-950/10" :
                      m.color === "amber"   ? "border-amber-800/40 bg-amber-950/10" :
                      m.color === "sky"     ? "border-sky-800/40 bg-sky-950/10" :
                      m.color === "violet"  ? "border-violet-800/40 bg-violet-950/10" :
                      "border-zinc-800/30 bg-zinc-900/10"
                    }`}
                  >
                    <p className={`text-sm font-black ${
                      m.color === "emerald" ? "text-emerald-400" :
                      m.color === "amber"   ? "text-amber-400" :
                      m.color === "sky"     ? "text-sky-400" :
                      m.color === "violet"  ? "text-violet-400" :
                      "text-zinc-600"
                    }`}>{m.count}</p>
                    <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{m.label}</p>
                    {m.count > 0 && (
                      <p className="text-[8px] text-zinc-700 group-hover:text-zinc-500 mt-0.5 transition-colors">tap →</p>
                    )}
                  </button>
                ))}
              </div>

              {/* Next extraction step */}
              {(rawExhaustiveCount ?? 0) === 0 && (trulyAtomicCount ?? 0) === 0 && (
                <p className="text-zinc-600 text-[10px] leading-relaxed">
                  <span className="text-zinc-400 font-semibold">अर्को step:</span> Full Exhaustive Extraction —
                  हरेक paragraph capture हुन्छ। Budget को लागि ५००+ raw atoms अपेक्षित।
                </p>
              )}
              {(rawExhaustiveCount ?? 0) > 0 && (trulyAtomicCount ?? 0) === 0 && (
                <p className="text-zinc-600 text-[10px] leading-relaxed">
                  <span className="text-zinc-400 font-semibold">अर्को step:</span> Phase 3 — Domain classification।
                  Raw atoms → budget_allocation | policy | program | promise categories।
                  Founder approval पछि public।
                </p>
              )}

              {/* ── Public Safety: Unpublish unreviewed ── */}
              {allPublicCount > 0 && unpublishAllState !== "done" && (
                <div className="rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2.5 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 shrink-0">🔴</span>
                    <div>
                      <p className="text-red-300 text-[11px] font-bold">
                        {allPublicCount} public-ready records — Founder review बाँकी
                      </p>
                      <p className="text-red-500/70 text-[10px] mt-0.5 leading-relaxed">
                        Raw extraction atoms public हुनु हुँदैन। Founder approval मात्र public बनाउँछ।
                      </p>
                    </div>
                  </div>
                  {unpublishAllState === "idle" && (
                    <button
                      onClick={() => setUnpublishAllState("confirming")}
                      className="w-full text-[11px] py-1.5 rounded-lg bg-red-900/40 border border-red-700/60 text-red-200 hover:bg-red-900/60 transition-colors font-semibold"
                    >
                      🔒 सबै unreviewed records unpublish गर्नुहोस्
                    </button>
                  )}
                  {unpublishAllState === "confirming" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleUnpublishUnreviewed()}
                        className="flex-1 text-[11px] py-1.5 rounded-lg bg-red-800/60 border border-red-700 text-red-100 font-bold hover:bg-red-800/80 transition-colors"
                      >
                        हो, unpublish गर्नुहोस्
                      </button>
                      <button
                        onClick={() => setUnpublishAllState("idle")}
                        className="flex-1 text-[11px] py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        रद्द
                      </button>
                    </div>
                  )}
                  {unpublishAllState === "running" && (
                    <p className="text-red-400 text-[10px] animate-pulse text-center">Processing…</p>
                  )}
                </div>
              )}
              {unpublishAllState === "done" && (
                <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/10 px-3 py-2">
                  <p className="text-emerald-300 text-[11px] font-semibold">✓ {unpublishAllCount} records unpublished</p>
                  <p className="text-emerald-600 text-[10px] mt-0.5">
                    publicReady: false · founderReviewStatus: needs_review · सबै founder review को लागि queue मा।
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Fallback atom cleanup banner — only if publicly dangerous fallbacks exist ── */}
          {!loading && (dangerousFallbackCount ?? 0) > 0 && cleanupState !== "done" && (
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

          {/* ── Clean Re-run card ── */}
          {!loading && isApproved && !isConst &&
           ((rawExhaustiveCount ?? 0) > 0 || (trulyAtomicCount ?? 0) > 0) &&
           cleanRerunState !== "done" && (
            <div className="rounded-xl border border-orange-900/40 bg-orange-950/10 px-4 py-3 space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-orange-400 shrink-0 text-base">⟳</span>
                <div>
                  <p className="text-orange-300 text-xs font-bold">Clean Re-run — fresh extraction को लागि</p>
                  <p className="text-orange-600/80 text-[10px] mt-0.5 leading-relaxed">
                    {(rawExhaustiveCount ?? 0) > 0 && `${rawExhaustiveCount} raw_exhaustive atoms`}
                    {(rawExhaustiveCount ?? 0) > 0 && (trulyAtomicCount ?? 0) > 0 && " · "}
                    {(trulyAtomicCount ?? 0) > 0 && `${trulyAtomicCount} page-traced atoms`}
                    {" "}delete हुनेछन्। Intel records ({intelCount ?? 0}) सुरक्षित रहन्छन्।
                    Fresh extraction चलाउनु अगाडि यो गर्नुहोस्।
                  </p>
                </div>
              </div>
              {cleanRerunState === "idle" && (
                <button
                  onClick={() => setCleanRerunState("confirming")}
                  className="w-full text-xs py-2 rounded-xl bg-orange-900/30 border border-orange-700/50 text-orange-200 hover:bg-orange-900/50 transition-colors font-semibold"
                >
                  🗑 Old extraction atoms हटाउनुहोस् (clean slate)
                </button>
              )}
              {cleanRerunState === "confirming" && (
                <div className="space-y-2">
                  <p className="text-orange-200 text-[11px]">
                    {(rawExhaustiveCount ?? 0) + (trulyAtomicCount ?? 0)} extraction atoms permanently delete हुनेछन्।
                    Intel records र cleanup logs सुरक्षित।
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => void handleCleanRerun()}
                      className="flex-1 text-xs py-2 rounded-xl bg-orange-800/50 border border-orange-700 text-orange-100 font-bold hover:bg-orange-800/70 transition-colors"
                    >
                      हो, हटाउनुहोस्
                    </button>
                    <button
                      onClick={() => setCleanRerunState("idle")}
                      className="flex-1 text-xs py-2 rounded-xl border border-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      रद्द
                    </button>
                  </div>
                </div>
              )}
              {cleanRerunState === "running" && (
                <p className="text-orange-400 text-xs animate-pulse text-center py-1">Deleting…</p>
              )}
            </div>
          )}
          {cleanRerunState === "done" && cleanRerunResult && (
            <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/10 px-4 py-3">
              <p className="text-emerald-300 text-xs font-semibold">✓ Clean re-run ready</p>
              <p className="text-emerald-500/80 text-[10px] mt-1">{cleanRerunResult}</p>
            </div>
          )}

          {/* ── Extraction Recovery Panel ── */}
          {!loading && isApproved && !isConst && (() => {
            if (!savedJob) {
              return (
                <div className="rounded-xl border border-zinc-800/30 bg-zinc-900/10 px-4 py-3">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wide mb-1">पिछला Extraction</p>
                  <p className="text-zinc-600 text-[10px]">पहिले कुनै extraction भएको छैन — नयाँ extraction सुरु गर्नुहोस्।</p>
                </div>
              );
            }
            const doneCount    = Object.values(savedJob.chunkStatuses).filter(c => c.status === "done").length;
            const failedCount  = Object.values(savedJob.chunkStatuses).filter(c => c.status === "failed" || c.status === "processing").length;
            const pendingCount = savedJob.totalChunks - Object.keys(savedJob.chunkStatuses).length;
            const isCancelled  = savedJob.status === "cancelled";
            const isComplete   = savedJob.status === "complete";
            const isPartial    = savedJob.status === "partial_complete" || savedJob.status === "running" || savedJob.status === "failed";

            const statusLabel =
              isComplete   ? "✓ Extraction सम्पन्न" :
              isCancelled  ? "पहिलेको extraction हटाइयो" :
              savedJob.status === "running"          ? "Extraction चलिरहेछ…" :
              "Extraction अधूरो — pages बाँकी छन्";

            return (
              <div className={`rounded-xl border px-4 py-3 space-y-2.5 ${
                isComplete   ? "border-emerald-800/40 bg-emerald-950/10"
                : isCancelled ? "border-zinc-700/40 bg-zinc-900/10"
                : isPartial   ? "border-sky-900/50 bg-sky-950/15"
                : "border-zinc-700/40 bg-zinc-900/10"
              }`}>
                {/* Status header */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-zinc-500 text-[10px] uppercase tracking-wide">पिछला Extraction</p>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    isComplete   ? "text-emerald-400 border-emerald-800/50 bg-emerald-950/20"
                    : isCancelled ? "text-zinc-500 border-zinc-700 bg-zinc-800/30"
                    : "text-sky-400 border-sky-800/50 bg-sky-950/20"
                  }`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Progress grid */}
                <div className="grid grid-cols-3 gap-x-3 gap-y-1 text-[10px]">
                  <div className="flex justify-between"><span className="text-zinc-600">कुल pages</span><span className="text-zinc-300 font-bold">{savedJob.expectedPages}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">सफल groups</span><span className="text-emerald-400 font-bold">{doneCount}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Failed groups</span><span className={`font-bold ${failedCount > 0 ? "text-red-400" : "text-zinc-600"}`}>{failedCount}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Expected pages</span><span className={`font-bold ${pageReviewStatus === "verified" ? "text-emerald-400" : pageReviewStatus === "mismatch" ? "text-amber-400" : "text-zinc-400"}`}>{expectedPageCount || "unknown"}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">बाँकी groups</span><span className="text-zinc-500 font-bold">{pendingCount}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Paragraphs saved</span><span className="text-sky-400 font-bold">{savedJob.totalAtomsSaved}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-600">Total groups</span><span className="text-zinc-400 font-bold">{savedJob.totalChunks}</span></div>
                </div>

                {/* Page group progress grid */}
                {savedJob.totalChunks > 0 && (
                  <div className="flex flex-wrap gap-0.5">
                    {Array.from({ length: savedJob.totalChunks }, (_, i) => {
                      const cs = savedJob.chunkStatuses[String(i)];
                      return (
                        <div
                          key={i}
                          title={
                            !cs            ? `Group ${i + 1}: बाँकी` :
                            cs.status === "done"   ? `Group ${i + 1}: ${cs.atomCount ?? 0} paragraphs saved` :
                            `Group ${i + 1}: failed — retry गर्नुस्`
                          }
                          className={`h-4 min-w-[1.5rem] rounded text-[8px] flex items-center justify-center px-0.5 ${
                            !cs                                                     ? "bg-zinc-800/40 border border-zinc-700/30 text-zinc-700"
                            : cs.status === "done"                                 ? "bg-emerald-900/60 border border-emerald-700/60 text-emerald-400"
                            : cs.status === "failed" || cs.status === "processing" ? "bg-red-900/60 border border-red-700/60 text-red-400"
                            : "bg-zinc-800/40 border border-zinc-700/30 text-zinc-600"
                          }`}
                        >
                          {!cs ? "·" : cs.status === "done" ? String(cs.atomCount ?? 0) : "!"}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Status messages */}
                {isCancelled && (
                  <p className="text-zinc-600 text-[10px]">
                    पहिलेको extraction हटाइयो। Fresh extraction चलाउन तयार।
                  </p>
                )}
                {isComplete && (
                  <p className="text-emerald-500/80 text-[10px]">
                    ✓ {savedJob.totalAtomsSaved} paragraphs capture भए · {doneCount}/{savedJob.totalChunks} page groups सफल।
                  </p>
                )}
                {expectedPageCount > 0 && (
                  <p className={`text-[10px] ${pageReviewStatus === "verified" ? "text-emerald-400" : pageReviewStatus === "mismatch" ? "text-amber-400" : "text-zinc-500"}`}>
                    Page review: expected {expectedPageCount} pages {pageReviewStatus === "verified" ? "verified" : pageReviewStatus === "mismatch" ? `— last job used ${savedJobExpectedPages}` : "needs confirmation"}.
                  </p>
                )}
                {isPartial && fullExtrState === "idle" && (
                  <>
                    <p className="text-sky-300 text-[10px] font-semibold leading-relaxed">
                      <span className="text-emerald-400 font-bold">{savedJob.totalAtomsSaved} paragraphs सुरक्षित छन्।</span>
                      {failedCount  > 0 && <span className="text-red-400"> · {failedCount} groups failed।</span>}
                      {pendingCount > 0 && <span className="text-zinc-500"> · {pendingCount} groups बाँकी।</span>}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => void handleResume(false)}
                        className="flex-1 text-xs py-2 rounded-xl bg-sky-900/40 border border-sky-700/60 text-sky-200 hover:bg-sky-900/60 transition-colors font-semibold"
                      >
                        ▶ बाँकी pages continue गर्नुस्
                      </button>
                      {failedCount > 0 && (
                        <button
                          onClick={() => void handleResume(true)}
                          className="flex-1 text-xs py-2 rounded-xl bg-red-900/30 border border-red-800/50 text-red-300 hover:bg-red-900/50 transition-colors font-semibold"
                        >
                          ↺ Failed pages retry गर्नुस् ({failedCount})
                        </button>
                      )}
                    </div>
                    <p className="text-zinc-700 text-[10px]">
                      Retry गर्दा पहिले save भएका paragraphs duplicate हुँदैनन् — safely continue।
                    </p>
                  </>
                )}
              </div>
            );
          })()}

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
                  {/* Page count info + manual override */}
                  <div className="rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500">Auto-detected pages:</span>
                      <span className={`font-bold ${detectedPageCount ? "text-sky-400" : "text-zinc-600"}`}>
                        {detectedPageCount ? `${detectedPageCount} pages` : "Unknown — enter manually below"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-zinc-600 text-[10px] shrink-0">Correct page count:</label>
                      <input
                        type="number"
                        value={founderExpectedPages}
                        onChange={e => {
                          setFounderExpectedPages(e.target.value);
                          const n = parseInt(e.target.value, 10);
                          if (n > 0) {
                            void updateDoc(firestoreDoc(db, "vault_documents", doc.id), {
                              expectedPageCount: n,
                            }).catch(() => {});
                          }
                        }}
                        placeholder={String(detectedPageCount ?? Math.ceil(doc.fileSize / 15000))}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[10px] text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-sky-700"
                      />
                      <span className="text-zinc-700 text-[10px] shrink-0">pages</span>
                    </div>
                    {(() => {
                      const override = parseInt(founderExpectedPages, 10);
                      const base = detectedPageCount ?? Math.ceil(doc.fileSize / 15000);
                      const resolved = override > 0 ? override : base;
                      return (
                        <>
                          <p className="text-zinc-600 text-[10px]">
                            → <span className={`font-medium ${override > 0 ? "text-sky-400" : "text-amber-400"}`}>
                              {Math.ceil(resolved / 3)} chunks
                            </span> (3 pages each) · {resolved} total pages
                            {override === 0 && <span className="text-amber-500"> (size estimate — enter correct count above)</span>}
                          </p>
                          <p className={`text-[10px] ${pageReviewStatus === "verified" ? "text-emerald-400" : pageReviewStatus === "mismatch" ? "text-amber-400" : "text-zinc-500"}`}>
                            Page review: expected {expectedPageCount || "unknown"} pages {pageReviewStatus === "verified" ? "verified" : pageReviewStatus === "mismatch" ? `— last job used ${savedJobExpectedPages}` : "— confirm before extraction"}.
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* ── Page count warning / mismatch ── */}
                  {(() => {
                    const current  = parseInt(founderExpectedPages, 10);
                    const jobPages = savedJob?.expectedPages ?? 0;
                    const sizeEst  = Math.ceil(doc.fileSize / 15000);
                    const isEmpty  = !founderExpectedPages || current <= 0;
                    const isEstimate = current === sizeEst && !founderExpectedPages;
                    const mismatch = jobPages > 0 && current > 0 && current !== jobPages && Math.abs(current - jobPages) > 3;

                    if (isEmpty) {
                      return (
                        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 space-y-1.5">
                          <p className="text-amber-300 text-[10px] font-bold">
                            ⚠ Page count अज्ञात — extraction सुरु गर्नु अगाडि correct page count enter गर्नुस्।
                          </p>
                          {jobPages > 0 && (
                            <button
                              onClick={() => setFounderExpectedPages(String(jobPages))}
                              className="text-[10px] px-2.5 py-1 rounded border border-amber-700/60 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50 transition-colors font-semibold"
                            >
                              ✓ {jobPages} pages use गर्नुस् (पहिलेको extraction बाट)
                            </button>
                          )}
                        </div>
                      );
                    }

                    if (mismatch) {
                      return (
                        <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 space-y-1.5">
                          <p className="text-amber-300 text-[10px] font-bold">
                            ⚠ Page count mismatch — पहिलेको extraction {jobPages} pages मा भएको थियो
                          </p>
                          <p className="text-amber-600 text-[10px]">
                            हाल: {current} pages · पहिले: {jobPages} pages
                          </p>
                          <button
                            onClick={() => setFounderExpectedPages(String(jobPages))}
                            className="text-[10px] px-2.5 py-1 rounded border border-amber-700/60 bg-amber-900/30 text-amber-200 hover:bg-amber-900/50 transition-colors font-semibold"
                          >
                            ✓ {jobPages} pages use गर्नुस्
                          </button>
                        </div>
                      );
                    }

                    if (isEstimate) {
                      return (
                        <p className="text-amber-500 text-[10px]">
                          ⚠ यो estimate मात्र हो (file size बाट) — document को actual page count enter गर्नुस्।
                        </p>
                      );
                    }

                    // All good — confirm
                    return (
                      <p className="text-emerald-600 text-[10px]">
                        ✓ {current} pages confirmed — {Math.ceil(current / 3)} chunks plan।
                      </p>
                    );
                  })()}

                  {((rawExhaustiveCount ?? 0) > 0 || (trulyAtomicCount ?? 0) > 0) && (
                    <p className="text-amber-400 text-[10px] leading-relaxed">
                      ⚠{" "}
                      {(rawExhaustiveCount ?? 0) > 0 && `${rawExhaustiveCount} paragraphs + `}
                      {(trulyAtomicCount ?? 0) > 0 && `${trulyAtomicCount} atoms `}
                      पहिलेदेखि छन् — re-run गर्दा नयाँ atoms थपिन्छन्, पुरानाहरू मिसिन्छन्।
                      <span className="text-amber-600"> माथि "Old extraction atoms हटाउनुहोस्" बाट पहिले हटाउनुहोस्।</span>
                    </p>
                  )}

                  {/* Block extraction if page count is unknown */}
                  {!founderExpectedPages || parseInt(founderExpectedPages, 10) <= 0 ? (
                    <div className="w-full text-center py-2.5 rounded-xl border border-zinc-700/40 text-zinc-600 text-xs">
                      Page count enter गर्नुस् — त्यसपछि extraction button देखिनेछ।
                    </div>
                  ) : (
                    <button
                      onClick={() => void handleFullExtraction()}
                      className="w-full text-xs py-2.5 rounded-xl bg-sky-900/40 border border-sky-700/60 text-sky-200 hover:bg-sky-900/60 transition-colors font-semibold"
                    >
                      📄 Full Document Extraction चलाउनुहोस् ({Math.ceil(parseInt(founderExpectedPages, 10) / 3)} chunks)
                    </button>
                  )}
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
                    <span className="text-emerald-400 font-bold">{fullExtrParagraphs} paragraphs · {fullExtrAtoms} atoms</span>
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
                  {/* Chunk mini-grid — shows paragraph count per chunk */}
                  <div className="flex flex-wrap gap-1">
                    {fullExtrChunks.map(c => (
                      <div
                        key={c.index}
                        title={`Pages ${c.start}–${c.end}: ${c.status === "done" ? `${c.paragraphs} paragraphs / ${c.records} atoms` : c.status === "error" ? c.error : c.status}`}
                        className={`h-5 rounded text-[9px] flex items-center justify-center min-w-[2.5rem] px-1 transition-all ${
                          c.status === "done"    ? "bg-emerald-900/60 border border-emerald-700/60 text-emerald-400" :
                          c.status === "error"   ? "bg-red-900/60 border border-red-700/60 text-red-400" :
                          c.status === "running" ? "bg-amber-900/60 border border-amber-700/60 text-amber-400 animate-pulse" :
                          "bg-zinc-800/40 border border-zinc-700/30 text-zinc-700"
                        }`}
                      >
                        {c.status === "done"    ? `P${c.paragraphs}` :
                         c.status === "error"   ? "!" :
                         c.status === "running" ? "⟳" : "·"}
                      </div>
                    ))}
                  </div>
                  {/* Running chunk info */}
                  {fullExtrChunks.find(c => c.status === "running") && (
                    <p className="text-amber-500/70 text-[10px] animate-pulse">
                      Pages {fullExtrChunks.find(c => c.status === "running")?.start}–
                      {fullExtrChunks.find(c => c.status === "running")?.end} — हरेक paragraph capture गर्दैछ…
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
                      <p className="text-emerald-300 text-xs font-bold">{fullExtrParagraphs} paragraphs → {fullExtrAtoms} raw atoms saved</p>
                      <p className="text-emerald-600 text-[10px]">
                        {fullExtrChunks.filter(c => c.status === "done").length}/{fullExtrChunks.length} chunks सफल ·
                        {fullExtrChunks.filter(c => c.status === "error").length > 0
                          ? ` ${fullExtrChunks.filter(c => c.status === "error").length} chunks failed`
                          : " सबै chunks ठीक"}
                        {" · extractionTier: raw_exhaustive · publicReady: false"}
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
                    onClick={() => { setFullExtrState("idle"); setFullExtrChunks([]); setFullExtrAtoms(0); setFullExtrParagraphs(0); }}
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
                    onClick={() => { setFullExtrState("idle"); setFullExtrError(""); setFullExtrChunks([]); setFullExtrParagraphs(0); setFullExtrAtoms(0); }}
                    className="w-full text-xs py-2 rounded-xl bg-sky-900/30 border border-sky-800/50 text-sky-300 hover:bg-sky-900/50 transition-colors"
                  >
                    फेरि try गर्नुहोस्
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Source Coverage Verification ── */}
          {/* ── Knowledge Extraction Viewer ── */}
          {!loading && isApproved && !isConst && ((rawExhaustiveCount ?? 0) > 0 || (trulyAtomicCount ?? 0) > 0) && (
            <KnowledgeExtractionViewer
              docId={doc.id}
              ownerId={ownerId}
              docDownloadUrl={doc.downloadUrl}
              confirmedExpectedPages={parseInt(founderExpectedPages, 10) || savedJob?.expectedPages || 0}
              jobSummary={savedJob ? {
                totalChunks:   savedJob.totalChunks,
                expectedPages: savedJob.expectedPages,
                chunkStatuses: savedJob.chunkStatuses,
              } : null}
            />
          )}

          {!loading && isApproved && !isConst && (
            <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/10 px-4 py-3 space-y-2">
              <p className="text-zinc-500 text-[10px] uppercase tracking-wide">Source Coverage / स्रोत कभरेज</p>

              {/* Coverage grid */}
              <div className="space-y-1 text-[10px]">
                {/* File info */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">File</span>
                  <span className="text-zinc-400 font-medium truncate max-w-[60%] text-right">{doc.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Size</span>
                  <span className="text-zinc-400">
                    {doc.fileSize < 1024*1024
                      ? `${(doc.fileSize/1024).toFixed(0)} KB`
                      : `${(doc.fileSize/1024/1024).toFixed(1)} MB`}
                  </span>
                </div>
                {/* Detected page count */}
                <div className="flex items-center justify-between">
                  <span className="text-zinc-600">Detected pages (PDF binary)</span>
                  <span className={`font-bold ${detectedPageCount ? "text-sky-400" : "text-zinc-600"}`}>
                    {detectedPageCount ? `${detectedPageCount}` : "अज्ञात"}
                  </span>
                </div>
                {/* Founder expected */}
                {founderExpectedPages && parseInt(founderExpectedPages, 10) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-600">Founder expected</span>
                    <span className="text-violet-400 font-bold">{founderExpectedPages} pages</span>
                  </div>
                )}
                {/* Processed pages */}
                {fullExtrChunks.length > 0 && (() => {
                  const doneChunks  = fullExtrChunks.filter(c => c.status === "done");
                  const errorChunks = fullExtrChunks.filter(c => c.status === "error");
                  const processedPages = doneChunks.reduce((acc, c) => acc + (c.end - c.start + 1), 0);
                  const expectedTotal  = parseInt(founderExpectedPages, 10) || detectedPageCount || Math.ceil(doc.fileSize / 15000);
                  const coveragePct    = expectedTotal > 0 ? Math.round((processedPages / expectedTotal) * 100) : null;
                  const mismatch       = expectedTotal > 0 && processedPages < expectedTotal;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600">Processed pages</span>
                        <span className={`font-bold ${mismatch ? "text-amber-400" : "text-emerald-400"}`}>
                          {processedPages} / {expectedTotal}
                        </span>
                      </div>
                      {coveragePct !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-600">Coverage</span>
                          <span className={`font-bold ${coveragePct < 100 ? "text-amber-400" : "text-emerald-400"}`}>
                            {coveragePct}%
                          </span>
                        </div>
                      )}
                      {errorChunks.length > 0 && (
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-zinc-600 shrink-0">Failed pages</span>
                          <span className="text-red-400 text-right">
                            {errorChunks.map(c => `${c.start}–${c.end}`).join(", ")}
                          </span>
                        </div>
                      )}
                      {/* Mismatch warning */}
                      {mismatch && (
                        <div className="mt-1.5 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2">
                          <p className="text-amber-300 text-[10px] font-bold">
                            ⚠ Page mismatch — document पूरा process भएको छैन।
                          </p>
                          <p className="text-amber-600 text-[10px] mt-0.5 leading-relaxed">
                            {expectedTotal - processedPages} pages अझै बाँकी।
                            Founder override मा correct page count राखेर फेरि extraction चलाउनुहोस्।
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Retry failed chunks if we have a stored fileUri */}
              {storedFileUri && fullExtrState === "complete" &&
               fullExtrChunks.filter(c => c.status === "error").length > 0 && (
                <p className="text-zinc-600 text-[10px]">
                  ⟳ Failed chunks — Gemini Files API URI valid छ (48h)। फेरि extraction run गर्नुहोस् भने failed pages re-process हुन्छन्।
                </p>
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

          {/* ── Database map ── */}
          <div className="rounded-xl border border-zinc-800/30 bg-zinc-900/10 px-4 py-3 space-y-2">
            <p className="text-zinc-600 text-[10px] uppercase tracking-wide">यो Object कुन database layer मा छ?</p>
            <div className="space-y-1">
              {[
                { collection: "vault_documents",       role: "Source document metadata",           action: "Upload, AI analysis, approval status" },
                { collection: "janta_intelligence",    role: "Intel + raw atoms + fallback drafts", action: "Full extraction, atomic extraction, cleanup" },
                { collection: "janta_relationships",   role: "Cross-document graph edges",          action: "Relationship matching" },
                { collection: "document_cleanup_logs", role: "Quarantine / delete audit trail",     action: "Immutable — never modified" },
              ].map(r => (
                <div key={r.collection} className="flex items-start gap-2 text-[9px]">
                  <span className="font-mono text-violet-600 shrink-0 mt-0.5">{r.collection}</span>
                  <span className="text-zinc-700">→ {r.role}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-zinc-700 pt-1 border-t border-zinc-800/30">
              Coverage Map को हरेक number मा tap गर्नुहोस् — actual records देखिन्छन्।
            </p>
          </div>

          </>)} {/* end !activeLayer */}

        </div>
      </div>
    </div>
  );
}
