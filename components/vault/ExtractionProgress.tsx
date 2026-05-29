"use client";

/**
 * ExtractionProgress — reusable live job progress panel.
 *
 * Subscribes to a Firestore job doc via onSnapshot and renders:
 *   - Current step (Nepali label)
 *   - Progress bar
 *   - Telemetry: pages, atoms, provider, cost
 *   - Stuck detection (no heartbeat for 3+ minutes)
 *   - Error state with message
 *
 * Used by: EconomyVaultClient, DocumentCard (atomic), future pipelines.
 */

import { useEffect, useState, useRef } from "react";
import { onSnapshot, doc as fsDoc } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { ExtractionJob } from "../../lib/types/extraction-job";
import { isJobStuck, formatCostUSD } from "../../lib/types/extraction-job";

interface Props {
  docId:          string;
  collectionName: string;  // e.g. "economy_extraction_jobs"
  onComplete?:    (recordsSaved: number) => void;
  onError?:       (msg: string) => void;
  onRetry?:       () => void;
}

function secondsAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
}

function formatSecondsAgo(secs: number): string {
  if (secs < 5)   return "भर्खरै";
  if (secs < 60)  return `${secs} seconds अघि`;
  if (secs < 120) return "१ मिनेट अघि";
  return `${Math.floor(secs / 60)} मिनेट अघि`;
}

export function ExtractionProgress({ docId, collectionName, onComplete, onError, onRetry }: Props) {
  const [job, setJob]   = useState<ExtractionJob | null>(null);
  const [tick, setTick] = useState(0);
  const notifiedRef     = useRef(false);

  // Tick every 5s so "last updated X seconds ago" stays fresh
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to job doc
  useEffect(() => {
    if (!docId) return;
    const unsub = onSnapshot(
      fsDoc(db, collectionName, docId),
      snap => {
        if (!snap.exists()) return;
        const data = snap.data() as Record<string, unknown>;
        setJob({ id: snap.id, ...(data as Omit<ExtractionJob, "id">) });
      },
      err => console.warn("[ExtractionProgress] snapshot error:", err?.code ?? err),
    );
    return unsub;
  }, [docId, collectionName]);

  // Fire callbacks exactly once
  useEffect(() => {
    if (!job || notifiedRef.current) return;
    if (job.status === "completed") {
      notifiedRef.current = true;
      onComplete?.(job.recordsExtracted ?? 0);
    } else if (job.status === "failed") {
      notifiedRef.current = true;
      onError?.(job.errorMessage ?? "Extraction failed");
    }
  }, [job, onComplete, onError]);

  if (!job) {
    return (
      <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-3">
        <p className="text-cyan-400 text-xs animate-pulse">Job doc load हुँदैछ…</p>
      </div>
    );
  }

  const stuck        = isJobStuck(job);
  const lastSecs     = secondsAgo(job.lastHeartbeatAt ?? job.updatedAt);
  const isTerminal   = job.status === "completed" || job.status === "failed";
  const pct          = Math.max(0, Math.min(100, job.progressPercent ?? 0));

  // ── Error state ─────────────────────────────────────────────────────────────
  if (job.status === "failed") {
    return (
      <div className="rounded-xl bg-red-950/40 border border-red-800 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">❌</span>
          <p className="text-red-300 text-sm font-bold">Extraction गल्ती भयो</p>
        </div>
        {job.errorMessage && (
          <p className="text-red-400 text-xs leading-relaxed">{job.errorMessage}</p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-red-200 transition-colors"
          >
            🔄 फेरि प्रयास गर्नुहोस्
          </button>
        )}
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  if (job.status === "completed") {
    return (
      <div className="rounded-xl bg-green-950/40 border border-green-800 px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-base">✅</span>
          <p className="text-green-300 text-sm font-bold">
            {job.recordsExtracted ?? 0} economic atoms निकालियो
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] text-green-600">
          {job.fiscalYear     && <span>📅 {job.fiscalYear}</span>}
          {job.recordsRejected != null && job.recordsRejected > 0 && (
            <span>⚠ {job.recordsRejected} rejected</span>
          )}
          {job.estimatedCostUSD != null && (
            <span>💰 {formatCostUSD(job.estimatedCostUSD)}</span>
          )}
          {job.providerUsed   && <span>🤖 {job.providerUsed}</span>}
        </div>
      </div>
    );
  }

  // ── In-progress / stuck state ────────────────────────────────────────────────
  return (
    <div className={`rounded-xl border px-4 py-3 space-y-3 ${
      stuck
        ? "bg-amber-950/40 border-amber-800"
        : "bg-zinc-900/80 border-zinc-700"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {!stuck && (
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          )}
          {stuck && <span className="text-sm shrink-0">⚠️</span>}
          <p className={`text-sm font-bold truncate ${stuck ? "text-amber-300" : "text-cyan-300"}`}>
            {stuck ? "Job अड्किएको हुन सक्छ" : "Economy Extract चल्दैछ"}
          </p>
        </div>
        <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
          {!isTerminal && formatSecondsAgo(lastSecs)}
        </span>
      </div>

      {/* Current step */}
      <p className="text-xs text-zinc-300 leading-snug">
        {job.currentStepNepali || "काम भइरहेको छ…"}
      </p>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>{job.status}</span>
          <span>{pct}%</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full transition-all duration-700 ${
              stuck ? "bg-amber-500" : "bg-cyan-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Telemetry grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {job.pageCount != null && (
          <Stat label="Pages" value={
            job.pagesProcessed != null
              ? `${job.pagesProcessed} / ${job.pageCount}`
              : String(job.pageCount)
          } />
        )}
        {job.recordsExtracted != null && job.recordsExtracted > 0 && (
          <Stat label="Atoms अहिलेसम्म" value={String(job.recordsExtracted)} highlight />
        )}
        {job.fileSizeMB != null && (
          <Stat label="File size" value={`${job.fileSizeMB} MB`} />
        )}
        {job.providerUsed && (
          <Stat label="AI Provider" value={job.providerUsed} />
        )}
        {job.estimatedCostUSD != null && (
          <Stat label="अनुमानित खर्च" value={formatCostUSD(job.estimatedCostUSD)} />
        )}
        {job.inputTokens != null && job.inputTokens > 0 && (
          <Stat label="Tokens (in/out)" value={`${Math.round(job.inputTokens / 1000)}k / ${Math.round((job.outputTokens ?? 0) / 1000)}k`} />
        )}
      </div>

      {/* Stuck warning */}
      {stuck && (
        <div className="bg-amber-950/60 border border-amber-800/60 rounded-lg px-3 py-2 space-y-1.5">
          <p className="text-amber-300 text-xs font-bold">
            {Math.floor(lastSecs / 60)} मिनेटदेखि कुनै update छैन
          </p>
          <p className="text-amber-500/80 text-[11px] leading-relaxed">
            Background job अझै चलिरहेको हुन सक्छ। Page reload गर्न सक्नुहुन्छ
            वा केही मिनेट पर्खनुहोस्। Document सुरक्षित छ।
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-800 hover:bg-amber-700 text-amber-200 transition-colors"
            >
              🔄 फेरि Extract गर्नुहोस्
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-600 uppercase tracking-wider leading-none">{label}</p>
      <p className={`text-xs font-medium mt-0.5 ${highlight ? "text-cyan-300" : "text-zinc-300"}`}>
        {value}
      </p>
    </div>
  );
}
