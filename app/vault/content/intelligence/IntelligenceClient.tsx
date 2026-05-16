"use client";

import { useState, useMemo, useCallback } from "react";
import { useVaultAuth }          from "../../../../hooks/vault/useVaultAuth";
import { useSourceSignals }      from "../../../../hooks/vault/useSourceSignals";
import { useMonitoredSources }   from "../../../../hooks/vault/useMonitoredSources";
import { useIntelligenceTopics } from "../../../../hooks/vault/useIntelligenceTopics";
import { routeSignalToSchemes }  from "../../../../lib/vault/scheme-routing";
import {
  updateSourceSignal,
  deleteSourceSignal,
  createSourceSignal,
  createMonitoredSource,
  deleteMonitoredSource,
  createIntelligenceTopic,
  deleteIntelligenceTopic,
  createQueueItem,
} from "../../../../lib/vault/firestore";
import type { SourceSignal, MonitoredSource, IntelligenceTopic, SignalStatus } from "../../../../lib/types/signals";
import type { QueueItem } from "../../../../lib/types/queue";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<SignalStatus, string> = {
  raw:       "bg-zinc-800 text-zinc-400 border-zinc-700",
  validated: "bg-green-900 text-green-400 border-green-800",
  rejected:  "bg-red-900 text-red-400 border-red-800",
  promoted:  "bg-blue-900 text-blue-400 border-blue-800",
};

const CREDIBILITY_COLOR: Record<string, string> = {
  high:       "text-green-400",
  medium:     "text-amber-400",
  low:        "text-orange-400",
  unverified: "text-zinc-500",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

type MobilePane = "feed" | "detail" | "config";

// ─── Column A: Signal Feed ────────────────────────────────────────────────────

function SignalFeed({
  signals,
  selectedId,
  onSelect,
  filterStatus,
  setFilterStatus,
}: {
  signals:         SourceSignal[];
  selectedId:      string | null;
  onSelect:        (id: string) => void;
  filterStatus:    SignalStatus | "all";
  setFilterStatus: (s: SignalStatus | "all") => void;
}) {
  const tabs: (SignalStatus | "all")[] = ["all", "raw", "validated", "promoted", "rejected"];
  const shown = filterStatus === "all" ? signals : signals.filter(s => s.status === filterStatus);
  const rawCount = signals.filter(s => s.status === "raw").length;

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="p-3 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-green-500 text-[10px] font-semibold tracking-widest uppercase">Signal Feed</span>
          {rawCount > 0 && (
            <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {rawCount} raw
            </span>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setFilterStatus(t)}
              className={
                "px-2 py-0.5 rounded text-[10px] font-semibold uppercase border transition-all " +
                (filterStatus === t
                  ? "bg-zinc-700 text-white border-zinc-600"
                  : "text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300")
              }
            >{t}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900/50 min-h-0">
        {shown.length === 0 && (
          <div className="p-6 text-center text-zinc-600 text-sm leading-relaxed">
            No signals yet.<br />
            <span className="text-zinc-700">Use Quick Ingest to add a URL.</span>
          </div>
        )}
        {shown.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={
              "w-full text-left px-3 py-3 transition-all " +
              (selectedId === s.id ? "bg-zinc-800" : "hover:bg-zinc-800/40")
            }
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-white line-clamp-2 leading-snug">{s.title || s.sourceUrl}</span>
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_COLOR[s.status]}`}>
                {s.status}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 flex-wrap">
              <span className="truncate max-w-[120px]">{s.sourceName}</span>
              <span>·</span>
              <span>{relTime(s.createdAt)}</span>
              {s.relevanceScore !== undefined && (
                <>
                  <span>·</span>
                  <span className={s.relevanceScore >= 0.7 ? "text-green-500" : s.relevanceScore >= 0.4 ? "text-amber-500" : "text-zinc-600"}>
                    {Math.round(s.relevanceScore * 100)}%
                  </span>
                </>
              )}
            </div>
            {/* Taxonomy sector badge */}
            {s.sectorId && (
              <span className="inline-block mt-1.5 text-[9px] bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 uppercase tracking-wide">
                {s.sectorId}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Column B: Signal Detail ──────────────────────────────────────────────────

function SignalDetail({
  signal,
  ownerId,
  onDeleted,
}: {
  signal:    SourceSignal | null;
  ownerId:   string;
  onDeleted: () => void;
}) {
  const [busy,            setBusy]           = useState(false);
  const [generateBusy,    setGenerateBusy]   = useState(false);
  const [generateMsg,     setGenerateMsg]    = useState("");
  const [generateStatus,  setGenerateStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error,           setError]          = useState("");

  const schemeRouting = useMemo(
    () => signal ? routeSignalToSchemes(signal.taxonomyTags ?? []) : null,
    [signal],
  );

  const setStatus = useCallback(async (status: SignalStatus) => {
    if (!signal) return;
    setBusy(true);
    setError("");
    try {
      await updateSourceSignal(signal.id, {
        status,
        validatedBy: ownerId,
        validatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(`Update failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [signal, ownerId]);

  const remove = useCallback(async () => {
    if (!signal || !confirm("Delete this signal permanently?")) return;
    setBusy(true);
    try {
      await deleteSourceSignal(signal.id);
      onDeleted();
    } catch (e) {
      setError(`Delete failed: ${String(e)}`);
      setBusy(false);
    }
  }, [signal, onDeleted]);

  const generateContent = useCallback(async () => {
    if (!signal) return;
    setGenerateBusy(true);
    setGenerateMsg("");
    setGenerateStatus("idle");
    try {
      const res = await fetch("/api/generate-content-idea", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ signal, ownerId }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string;
        title?: string; type?: string; platform?: string;
        brief?: string; hooks?: string[];
      };
      if (!res.ok || !data.ok) {
        setGenerateStatus("error");
        setGenerateMsg(data.error ?? "Generation failed");
        return;
      }
      // Write to content queue
      await createQueueItem({
        ownerId,
        aiTitle:     data.title ?? signal.title,
        contentType: (data.type ?? "explainer") as QueueItem["contentType"],
        platform:    (data.platform ?? "youtube") as QueueItem["platform"],
        status:      "pending",
        sourceSignalId: signal.id,
        brief:       data.brief,
        hooks:       data.hooks,
        aiModel:     "claude-haiku-4-5-20251001",
        confidence:  signal.relevanceScore ?? 0.5,
        tags:        signal.taxonomyTags?.map(t => t.topicId) ?? [],
        createdAt:   new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      });
      setGenerateStatus("ok");
      setGenerateMsg("Content idea added to queue!");
    } catch (e) {
      setGenerateStatus("error");
      setGenerateMsg(String(e));
    } finally {
      setGenerateBusy(false);
    }
  }, [signal, ownerId]);

  if (!signal) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-700 text-sm gap-2 p-8 text-center">
        <span className="text-3xl">🧠</span>
        <span>Select a signal to review it</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto min-h-0">
      <div className="p-5">

        {/* Title + status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-base font-bold text-white leading-snug">{signal.title}</h2>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_COLOR[signal.status]}`}>
            {signal.status}
          </span>
        </div>

        {/* Taxonomy tags */}
        {signal.taxonomyTags && signal.taxonomyTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {signal.taxonomyTags.slice(0, 5).map(t => (
              <span key={t.topicId} className="text-[9px] bg-zinc-900 border border-zinc-700 px-1.5 py-0.5 rounded text-zinc-400 uppercase tracking-wide">
                {t.topicId}
              </span>
            ))}
          </div>
        )}

        {/* Scheme routing */}
        {schemeRouting && schemeRouting.schemeIds.length > 0 && (
          <div className="mb-3 bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Matched Schemes</span>
              <span className="text-[9px] text-zinc-600">
                {Math.round(schemeRouting.confidence * 100)}% confidence
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {schemeRouting.schemeIds.slice(0, 6).map(id => (
                <span key={id} className="text-[9px] bg-blue-950/50 border border-blue-900/60 px-1.5 py-0.5 rounded text-blue-300 font-mono">
                  {id}
                </span>
              ))}
              {schemeRouting.schemeIds.length > 6 && (
                <span className="text-[9px] text-zinc-600">+{schemeRouting.schemeIds.length - 6} more</span>
              )}
            </div>
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{signal.summary}</p>

        {/* AI Insights */}
        {signal.aiInsights && signal.aiInsights.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">AI Insights</div>
            <ul className="space-y-1.5">
              {signal.aiInsights.map((ins, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-green-500 shrink-0 mt-0.5">›</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Ideas */}
        {signal.contentIdeas && signal.contentIdeas.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Content Ideas</div>
            <ul className="space-y-1.5">
              {signal.contentIdeas.map((idea, i) => (
                <li key={i} className="flex gap-2 text-sm text-zinc-300">
                  <span className="text-blue-400 shrink-0 mt-0.5">⚡</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Meta */}
        <div className="text-[11px] space-y-1 mb-4 border-t border-zinc-900 pt-3">
          <div className="text-zinc-600">Source: <span className="text-zinc-400">{signal.sourceName}</span></div>
          <div className="text-zinc-600">
            URL:{" "}
            <a href={signal.sourceUrl} target="_blank" rel="noopener noreferrer"
               className="text-blue-400 hover:underline break-all">
              {signal.sourceUrl.slice(0, 60)}{signal.sourceUrl.length > 60 ? "…" : ""}
            </a>
          </div>
          {signal.publishedAt && (
            <div className="text-zinc-600">Published: <span className="text-zinc-400">{new Date(signal.publishedAt).toLocaleDateString("en-NP")}</span></div>
          )}
          <div className="text-zinc-600">Ingested: <span className="text-zinc-400">{relTime(signal.createdAt)}</span></div>
          {signal.relevanceScore !== undefined && (
            <div className="text-zinc-600">
              Relevance: <span className={signal.relevanceScore >= 0.7 ? "text-green-400" : signal.relevanceScore >= 0.4 ? "text-amber-400" : "text-zinc-500"}>
                {Math.round(signal.relevanceScore * 100)}%
              </span>
            </div>
          )}
          {signal.credibility && (
            <div className="text-zinc-600">
              Credibility: <span className={CREDIBILITY_COLOR[signal.credibility] ?? "text-zinc-400"}>{signal.credibility}</span>
            </div>
          )}
          {signal.sectorId && (
            <div className="text-zinc-600">Sector: <span className="text-zinc-300 uppercase text-[10px]">{signal.sectorId}</span></div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="text-[11px] text-red-400 bg-red-950/30 rounded px-2 py-1.5 mb-3">{error}</div>
        )}

        {/* Generate content feedback */}
        {generateMsg && (
          <div className={`text-[11px] rounded px-2 py-1.5 mb-3 ${generateStatus === "ok" ? "text-green-400 bg-green-950/30" : "text-red-400 bg-red-950/30"}`}>
            {generateMsg}
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-2">
          {/* Status actions */}
          <div className="flex gap-2 flex-wrap">
            {signal.status === "raw" && (
              <>
                <button onClick={() => setStatus("validated")} disabled={busy}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-40">
                  ✓ Validate
                </button>
                <button onClick={() => setStatus("promoted")} disabled={busy}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-40">
                  ⚡ Promote
                </button>
                <button onClick={() => setStatus("rejected")} disabled={busy}
                  className="px-3 py-2 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-800 text-sm rounded-lg transition-all">
                  ✕
                </button>
              </>
            )}
            {signal.status === "validated" && (
              <button onClick={() => setStatus("promoted")} disabled={busy}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-40">
                ⚡ Promote to Content
              </button>
            )}
            {signal.status === "rejected" && (
              <button onClick={() => setStatus("raw")} disabled={busy}
                className="flex-1 py-2 border border-zinc-700 text-zinc-400 hover:text-white text-sm rounded-lg transition-all disabled:opacity-40">
                ↩ Restore
              </button>
            )}
          </div>

          {/* Generate content idea */}
          {(signal.status === "validated" || signal.status === "promoted") && (
            <button onClick={generateContent} disabled={generateBusy || generateStatus === "ok"}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-lg transition-all disabled:opacity-40">
              {generateBusy ? "Generating…" : generateStatus === "ok" ? "✓ Added to queue" : "🎬 Generate Content Idea"}
            </button>
          )}

          {/* Delete */}
          <button onClick={remove} disabled={busy}
            className="w-full py-1.5 border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800 text-xs rounded-lg transition-all disabled:opacity-40">
            Delete signal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Column C: Config (Topics + Sources + Quick Ingest) ───────────────────────

function ConfigPanel({
  topics,
  sources,
  ownerId,
  signals,
}: {
  topics:  IntelligenceTopic[];
  sources: MonitoredSource[];
  ownerId: string;
  signals: SourceSignal[];
}) {
  const [newTopic,      setNewTopic]      = useState("");
  const [topicError,    setTopicError]    = useState("");
  const [newUrl,        setNewUrl]        = useState("");
  const [newName,       setNewName]       = useState("");
  const [sourceError,   setSourceError]   = useState("");
  const [ingestUrl,     setIngestUrl]     = useState("");
  const [ingestStatus,  setIngestStatus]  = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [ingestMsg,     setIngestMsg]     = useState("");
  const [busy,          setBusy]          = useState(false);

  // URL deduplication check
  const isDuplicate = useMemo(
    () => isValidHttpUrl(ingestUrl.trim()) && signals.some(s => s.sourceUrl === ingestUrl.trim()),
    [ingestUrl, signals],
  );

  async function runIngest() {
    const url = ingestUrl.trim();
    if (!isValidHttpUrl(url)) {
      setIngestStatus("error");
      setIngestMsg("Enter a valid https:// URL");
      return;
    }
    setIngestStatus("loading");
    setIngestMsg("");
    try {
      const res = await fetch("/api/ingest-url", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          url,
          sourceName: new URL(url).hostname.replace(/^www\./, ""),
          topics:     topics.map(t => t.name),
        }),
      });
      const data = await res.json() as {
        ok?: boolean; error?: string;
        title?: string; summary?: string; body?: string;
        relevanceScore?: number; credibility?: string;
        aiInsights?: string[]; contentIdeas?: string[];
        detectedTopics?: string[]; publishedAt?: string;
        taxonomyTags?: { topicId: string; sectorId: string; score: number }[];
        primarySectorId?: string;
      };
      if (!res.ok || !data.ok) {
        setIngestStatus("error");
        setIngestMsg(data.error ?? "Ingest failed — check the URL and try again");
        return;
      }
      await createSourceSignal({
        ownerId,
        sourceUrl:     url,
        sourceType:    "url",
        sourceName:    new URL(url).hostname.replace(/^www\./, ""),
        title:         data.title ?? "",
        summary:       data.summary ?? "",
        body:          data.body,
        publishedAt:   data.publishedAt,
        status:        "raw",
        topics:        data.detectedTopics ?? [],
        tags:          [],
        relevanceScore: data.relevanceScore,
        credibility:   data.credibility as SourceSignal["credibility"],
        aiInsights:    data.aiInsights,
        contentIdeas:  data.contentIdeas,
        taxonomyTags:  data.taxonomyTags,
        sectorId:      data.primarySectorId,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      });
      setIngestStatus("ok");
      setIngestMsg(`Signal added: "${(data.title ?? url).slice(0, 55)}"`);
      setIngestUrl("");
      setTimeout(() => setIngestStatus("idle"), 5000);
    } catch (e) {
      setIngestStatus("error");
      setIngestMsg(`Error: ${String(e)}`);
    }
  }

  async function addTopic() {
    const name = newTopic.trim();
    if (!name) return;
    setTopicError("");
    setBusy(true);
    try {
      await createIntelligenceTopic({
        ownerId, name, description: "", keywords: [],
        priority: "medium", rawSignalCount: 0, validatedSignalCount: 0, contentIdeasCount: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setNewTopic("");
    } catch (e) {
      setTopicError(`Failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function addSource() {
    const url  = newUrl.trim();
    const name = newName.trim();
    if (!name) { setSourceError("Name is required"); return; }
    if (!isValidHttpUrl(url)) { setSourceError("Enter a valid https:// URL"); return; }
    setSourceError("");
    setBusy(true);
    try {
      await createMonitoredSource({
        ownerId, name, url, sourceType: "url",
        status: "active", schedule: "daily", rawSignalCount: 0, topics: [], tags: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
      setNewUrl(""); setNewName("");
    } catch (e) {
      setSourceError(`Failed: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function removeTopic(id: string) {
    try { await deleteIntelligenceTopic(id); }
    catch (e) { alert(`Delete failed: ${String(e)}`); }
  }

  async function removeSource(id: string) {
    if (!confirm("Remove this monitored source?")) return;
    try { await deleteMonitoredSource(id); }
    catch (e) { alert(`Delete failed: ${String(e)}`); }
  }

  return (
    <div className="h-full overflow-y-auto min-h-0 p-4 space-y-5">

      {/* Quick Ingest */}
      <section>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Quick Ingest URL</div>
        <div className="flex gap-2 mb-1">
          <input
            value={ingestUrl}
            onChange={e => { setIngestUrl(e.target.value); setIngestStatus("idle"); setIngestMsg(""); }}
            onKeyDown={e => e.key === "Enter" && runIngest()}
            placeholder="https://nrb.org.np/..."
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
          />
          <button
            onClick={runIngest}
            disabled={ingestStatus === "loading" || !ingestUrl.trim()}
            className="shrink-0 px-3 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-40"
          >
            {ingestStatus === "loading" ? "…" : "⚡"}
          </button>
        </div>
        {isDuplicate && ingestStatus !== "loading" && (
          <div className="text-[11px] text-amber-400 px-1 mb-1">Already ingested — will create duplicate</div>
        )}
        {ingestMsg && (
          <div className={`text-[11px] px-2 py-1 rounded ${ingestStatus === "ok" ? "text-green-400 bg-green-950/30" : "text-red-400 bg-red-950/30"}`}>
            {ingestMsg}
          </div>
        )}
      </section>

      {/* Tracked Topics */}
      <section>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Tracked Topics</div>
        {topics.length === 0 && <p className="text-zinc-600 text-xs mb-2">No topics yet.</p>}
        <div className="space-y-1 mb-2">
          {topics.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium text-white">{t.name}</div>
                <div className="text-[10px] text-zinc-600">{t.rawSignalCount} raw · {t.validatedSignalCount} validated</div>
              </div>
              <button onClick={() => removeTopic(t.id)} className="text-zinc-700 hover:text-red-400 text-xs transition-colors ml-2">✕</button>
            </div>
          ))}
        </div>
        {topicError && <div className="text-[11px] text-red-400 mb-1">{topicError}</div>}
        <div className="flex gap-2">
          <input
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTopic()}
            placeholder="Add topic (e.g. EPF)"
            className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
          />
          <button onClick={addTopic} disabled={busy || !newTopic.trim()}
            className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-40">
            +
          </button>
        </div>
      </section>

      {/* Monitored Sources */}
      <section>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Monitored Sources</div>
        {sources.length === 0 && <p className="text-zinc-600 text-xs mb-2">No sources yet.</p>}
        <div className="space-y-1.5 mb-2">
          {sources.map(s => (
            <div key={s.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{s.name}</div>
                  <div className="text-[10px] text-zinc-600 truncate">{s.url}</div>
                  <div className="text-[10px] text-zinc-700 mt-0.5">
                    {s.schedule} · {s.rawSignalCount} signals ·{" "}
                    <span className={s.status === "active" ? "text-green-500" : "text-amber-500"}>{s.status}</span>
                  </div>
                </div>
                <button onClick={() => removeSource(s.id)} className="text-zinc-700 hover:text-red-400 text-xs shrink-0 transition-colors">✕</button>
              </div>
              {s.errorMessage && (
                <div className="mt-1 text-[10px] text-red-400 bg-red-950/30 rounded px-2 py-0.5">{s.errorMessage}</div>
              )}
            </div>
          ))}
        </div>
        {sourceError && <div className="text-[11px] text-red-400 mb-1">{sourceError}</div>}
        <div className="space-y-1.5">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Source name (e.g. NRB Press)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
          />
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addSource()}
              placeholder="https://..."
              className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
            />
            <button onClick={addSource} disabled={busy || !newUrl.trim() || !newName.trim()}
              className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-40">
              +
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Mobile tab bar ───────────────────────────────────────────────────────────

function MobileTabBar({ active, setActive, rawCount }: { active: MobilePane; setActive: (p: MobilePane) => void; rawCount: number }) {
  const tabs: { id: MobilePane; label: string }[] = [
    { id: "feed",   label: "Feed" },
    { id: "detail", label: "Detail" },
    { id: "config", label: "Config" },
  ];
  return (
    <div className="flex border-b border-zinc-800 shrink-0 lg:hidden">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setActive(t.id)}
          className={
            "flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide transition-all relative " +
            (active === t.id ? "text-white border-b-2 border-green-500" : "text-zinc-500 hover:text-zinc-300")
          }
        >
          {t.label}
          {t.id === "feed" && rawCount > 0 && (
            <span className="absolute top-1.5 right-2 bg-amber-500 text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {rawCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IntelligenceClient() {
  const { user, loading: authLoading } = useVaultAuth();
  const uid = user?.uid ?? null;

  const { signals, loading: sigLoading }   = useSourceSignals(uid, "all");
  const { sources, loading: srcLoading }   = useMonitoredSources(uid);
  const { topics,  loading: topicLoading } = useIntelligenceTopics(uid);

  // Store selected ID only — derive full signal from real-time array (never stale)
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [filterStatus,  setFilterStatus]  = useState<SignalStatus | "all">("all");
  const [mobilePane,    setMobilePane]    = useState<MobilePane>("feed");

  const selectedSignal = useMemo(
    () => signals.find(s => s.id === selectedId) ?? null,
    [signals, selectedId],
  );

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setMobilePane("detail");
  }, []);

  const handleDeleted = useCallback(() => {
    setSelectedId(null);
    setMobilePane("feed");
  }, []);

  const rawCount = useMemo(() => signals.filter(s => s.status === "raw").length, [signals]);
  const loading  = authLoading || sigLoading || srcLoading || topicLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-zinc-600 text-sm">
        Loading intelligence layer…
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-black">

      {/* Header */}
      <div className="border-b border-zinc-900 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
          <span className="text-green-500 text-[10px] font-semibold tracking-widest uppercase">Intelligence Layer</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-600">
          <span>{signals.length} signals</span>
          <span>·</span>
          <span>{sources.length} sources</span>
          <span>·</span>
          <span>{topics.length} topics</span>
        </div>
      </div>

      {/* Mobile tab bar */}
      <MobileTabBar active={mobilePane} setActive={setMobilePane} rawCount={rawCount} />

      {/* Desktop: 3-column | Mobile: single pane */}
      <div className="flex-1 min-h-0 overflow-hidden">

        {/* Desktop layout */}
        <div className="hidden lg:grid lg:grid-cols-[300px_1fr_260px] lg:divide-x lg:divide-zinc-900 h-full">
          <SignalFeed
            signals={signals}
            selectedId={selectedId}
            onSelect={handleSelect}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
          <SignalDetail
            signal={selectedSignal}
            ownerId={uid ?? ""}
            onDeleted={handleDeleted}
          />
          <ConfigPanel
            topics={topics}
            sources={sources}
            ownerId={uid ?? ""}
            signals={signals}
          />
        </div>

        {/* Mobile layout — one pane at a time */}
        <div className="lg:hidden h-full">
          {mobilePane === "feed" && (
            <SignalFeed
              signals={signals}
              selectedId={selectedId}
              onSelect={handleSelect}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
            />
          )}
          {mobilePane === "detail" && (
            <SignalDetail
              signal={selectedSignal}
              ownerId={uid ?? ""}
              onDeleted={handleDeleted}
            />
          )}
          {mobilePane === "config" && (
            <ConfigPanel
              topics={topics}
              sources={sources}
              ownerId={uid ?? ""}
              signals={signals}
            />
          )}
        </div>
      </div>
    </div>
  );
}
