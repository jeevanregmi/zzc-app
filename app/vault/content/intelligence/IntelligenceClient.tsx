"use client";

import { useState } from "react";
import { useVaultAuth }         from "../../../../hooks/vault/useVaultAuth";
import { useSourceSignals }     from "../../../../hooks/vault/useSourceSignals";
import { useMonitoredSources }  from "../../../../hooks/vault/useMonitoredSources";
import { useIntelligenceTopics }from "../../../../hooks/vault/useIntelligenceTopics";
import {
  updateSourceSignal,
  deleteSourceSignal,
  createSourceSignal,
  createMonitoredSource,
  deleteMonitoredSource,
  createIntelligenceTopic,
  deleteIntelligenceTopic,
} from "../../../../lib/vault/firestore";
import type { SourceSignal, MonitoredSource, IntelligenceTopic, SignalStatus } from "../../../../lib/types/signals";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<SignalStatus, string> = {
  raw:       "bg-zinc-800 text-zinc-400 border-zinc-700",
  validated: "bg-green-900 text-green-400 border-green-800",
  rejected:  "bg-red-900  text-red-400   border-red-800",
  promoted:  "bg-blue-900 text-blue-400  border-blue-800",
};

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return `${Math.floor(diff / 60000)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Column A: Signal Feed ────────────────────────────────────────────────────

function SignalFeed({
  signals,
  selectedId,
  onSelect,
  filterStatus,
  setFilterStatus,
}: {
  signals:       SourceSignal[];
  selectedId:    string | null;
  onSelect:      (s: SourceSignal) => void;
  filterStatus:  SignalStatus | "all";
  setFilterStatus: (s: SignalStatus | "all") => void;
}) {
  const tabs: (SignalStatus | "all")[] = ["all", "raw", "validated", "promoted", "rejected"];
  const shown = filterStatus === "all" ? signals : signals.filter(s => s.status === filterStatus);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Signal Feed</span>
          {signals.filter(s => s.status === "raw").length > 0 && (
            <span className="bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {signals.filter(s => s.status === "raw").length} raw
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

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
        {shown.length === 0 && (
          <div className="p-6 text-center text-zinc-600 text-sm">No signals yet.<br/>Add a monitored source to start ingesting.</div>
        )}
        {shown.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className={
              "w-full text-left px-4 py-3 hover:bg-zinc-800/50 transition-all " +
              (selectedId === s.id ? "bg-zinc-800/70" : "")
            }
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-sm font-semibold text-white line-clamp-2 leading-snug">{s.title}</span>
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${STATUS_COLOR[s.status]}`}>
                {s.status}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-2">
              <span>{s.sourceName}</span>
              <span>·</span>
              <span>{relTime(s.createdAt)}</span>
              {s.relevanceScore !== undefined && (
                <><span>·</span><span className="text-green-500">{Math.round(s.relevanceScore * 100)}%</span></>
              )}
            </div>
            {s.topics.length > 0 && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {s.topics.slice(0, 3).map(t => (
                  <span key={t} className="text-[10px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{t}</span>
                ))}
              </div>
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
  onUpdate,
}: {
  signal:   SourceSignal | null;
  ownerId:  string;
  onUpdate: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: SignalStatus) {
    if (!signal) return;
    setBusy(true);
    await updateSourceSignal(signal.id, { status, validatedBy: ownerId, validatedAt: new Date().toISOString() });
    setBusy(false);
  }

  async function remove() {
    if (!signal || !confirm("Delete this signal?")) return;
    await deleteSourceSignal(signal.id);
  }

  if (!signal) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        ← Select a signal to review
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h2 className="text-base font-bold text-white leading-snug">{signal.title}</h2>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${STATUS_COLOR[signal.status]}`}>
          {signal.status}
        </span>
      </div>

      <p className="text-sm text-zinc-400 mb-4 leading-relaxed">{signal.summary}</p>

      {signal.aiInsights && signal.aiInsights.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">AI Insights</div>
          <ul className="space-y-1.5">
            {signal.aiInsights.map((ins, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-green-500 shrink-0">›</span>{ins}
              </li>
            ))}
          </ul>
        </div>
      )}

      {signal.contentIdeas && signal.contentIdeas.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">Content Ideas</div>
          <ul className="space-y-1.5">
            {signal.contentIdeas.map((idea, i) => (
              <li key={i} className="flex gap-2 text-sm text-zinc-300">
                <span className="text-blue-400 shrink-0">⚡</span>{idea}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[11px] text-zinc-600 space-y-1 mb-5 border-t border-zinc-900 pt-3">
        <div>Source: <span className="text-zinc-400">{signal.sourceName}</span></div>
        <div>URL: <a href={signal.sourceUrl} target="_blank" rel="noopener" className="text-blue-400 hover:underline truncate">{signal.sourceUrl}</a></div>
        {signal.publishedAt && <div>Published: <span className="text-zinc-400">{new Date(signal.publishedAt).toLocaleDateString()}</span></div>}
        <div>Ingested: <span className="text-zinc-400">{relTime(signal.createdAt)}</span></div>
        {signal.relevanceScore !== undefined && (
          <div>Relevance: <span className="text-green-400">{Math.round(signal.relevanceScore * 100)}%</span></div>
        )}
        {signal.credibility && (
          <div>Credibility: <span className="text-zinc-300 capitalize">{signal.credibility}</span></div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {signal.status === "raw" && (
          <>
            <button
              onClick={() => setStatus("validated")}
              disabled={busy}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-50"
            >✓ Validate</button>
            <button
              onClick={() => setStatus("promoted")}
              disabled={busy}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
            >⚡ Promote</button>
            <button
              onClick={() => setStatus("rejected")}
              disabled={busy}
              className="px-3 py-2 border border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-800 text-sm rounded-lg transition-all"
            >✕</button>
          </>
        )}
        {signal.status === "validated" && (
          <button
            onClick={() => setStatus("promoted")}
            disabled={busy}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all disabled:opacity-50"
          >⚡ Promote to Content</button>
        )}
        <button
          onClick={remove}
          className="px-3 py-2 border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-800 text-sm rounded-lg transition-all"
        >Delete</button>
      </div>
    </div>
  );
}

// ─── Column C: Topics + Sources ───────────────────────────────────────────────

function TopicsAndSources({
  topics,
  sources,
  ownerId,
}: {
  topics:  IntelligenceTopic[];
  sources: MonitoredSource[];
  ownerId: string;
}) {
  const [newTopic, setNewTopic]   = useState("");
  const [newUrl,   setNewUrl]     = useState("");
  const [newName,  setNewName]    = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingestStatus, setIngestStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [ingestMsg, setIngestMsg] = useState("");
  const [busy, setBusy]           = useState(false);

  async function runIngest() {
    if (!ingestUrl.trim()) return;
    setIngestStatus("loading");
    setIngestMsg("");
    try {
      const res = await fetch("/api/ingest-url", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          url:        ingestUrl.trim(),
          sourceName: new URL(ingestUrl.trim()).hostname.replace(/^www\./, ""),
          topics:     topics.map(t => t.name),
        }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; title?: string; summary?: string; relevanceScore?: number; credibility?: string; aiInsights?: string[]; contentIdeas?: string[]; detectedTopics?: string[]; body?: string; publishedAt?: string; taxonomyTags?: { topicId: string; sectorId: string; score: number }[]; primarySectorId?: string; model?: string };
      if (!res.ok || !data.ok) {
        setIngestStatus("error");
        setIngestMsg(data.error ?? "Ingest failed");
        return;
      }
      await createSourceSignal({
        ownerId,
        sourceUrl:     ingestUrl.trim(),
        sourceType:    "url",
        sourceName:    new URL(ingestUrl.trim()).hostname.replace(/^www\./, ""),
        title:         data.title ?? "",
        summary:       data.summary ?? "",
        body:          data.body,
        publishedAt:   data.publishedAt,
        status:        "raw",
        topics:        data.detectedTopics ?? [],
        tags:          [],
        relevanceScore:data.relevanceScore,
        credibility:   data.credibility as SourceSignal["credibility"],
        aiInsights:    data.aiInsights,
        contentIdeas:  data.contentIdeas,
        taxonomyTags:  data.taxonomyTags,
        sectorId:      data.primarySectorId,
        createdAt:     new Date().toISOString(),
        updatedAt:     new Date().toISOString(),
      });
      setIngestStatus("ok");
      setIngestMsg(`Signal added: "${(data.title ?? "").slice(0, 60)}"`);
      setIngestUrl("");
    } catch (err) {
      setIngestStatus("error");
      setIngestMsg(String(err));
    }
  }

  async function addTopic() {
    if (!newTopic.trim()) return;
    setBusy(true);
    await createIntelligenceTopic({
      ownerId, name: newTopic.trim(), description: "", keywords: [],
      priority: "medium", rawSignalCount: 0, validatedSignalCount: 0, contentIdeasCount: 0,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setNewTopic("");
    setBusy(false);
  }

  async function addSource() {
    if (!newUrl.trim() || !newName.trim()) return;
    setBusy(true);
    await createMonitoredSource({
      ownerId, name: newName.trim(), url: newUrl.trim(), sourceType: "url",
      status: "active", schedule: "daily", rawSignalCount: 0, topics: [], tags: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    setNewUrl(""); setNewName("");
    setBusy(false);
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">

      {/* Quick Ingest */}
      <div>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Quick Ingest URL</div>
        <div className="flex gap-2 mb-2">
          <input
            value={ingestUrl}
            onChange={e => { setIngestUrl(e.target.value); setIngestStatus("idle"); }}
            onKeyDown={e => e.key === "Enter" && runIngest()}
            placeholder="https://nrb.org.np/..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
          />
          <button
            onClick={runIngest}
            disabled={ingestStatus === "loading" || !ingestUrl.trim()}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-40 whitespace-nowrap"
          >
            {ingestStatus === "loading" ? "…" : "⚡ Ingest"}
          </button>
        </div>
        {ingestMsg && (
          <div className={`text-[11px] px-2 py-1 rounded ${ingestStatus === "ok" ? "text-green-400 bg-green-950/30" : "text-red-400 bg-red-950/30"}`}>
            {ingestMsg}
          </div>
        )}
      </div>

      {/* Topics */}
      <div>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Tracked Topics</div>
        <div className="space-y-1.5 mb-3">
          {topics.length === 0 && <p className="text-zinc-600 text-xs">No topics yet.</p>}
          {topics.map(t => (
            <div key={t.id} className="flex items-center justify-between bg-zinc-800/50 border border-zinc-800 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-white">{t.name}</div>
                <div className="text-[11px] text-zinc-500">{t.rawSignalCount} raw · {t.validatedSignalCount} validated</div>
              </div>
              <button
                onClick={() => deleteIntelligenceTopic(t.id)}
                className="text-zinc-700 hover:text-red-400 text-xs transition-colors"
              >✕</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newTopic}
            onChange={e => setNewTopic(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTopic()}
            placeholder="Add topic (e.g. EPF)"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
          />
          <button
            onClick={addTopic}
            disabled={busy || !newTopic.trim()}
            className="px-3 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-40"
          >+</button>
        </div>
      </div>

      {/* Monitored Sources */}
      <div>
        <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-3">Monitored Sources</div>
        <div className="space-y-1.5 mb-3">
          {sources.length === 0 && <p className="text-zinc-600 text-xs">No sources yet.</p>}
          {sources.map(s => (
            <div key={s.id} className="bg-zinc-800/50 border border-zinc-800 rounded-lg px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-white">{s.name}</div>
                  <div className="text-[11px] text-zinc-500 truncate max-w-[160px]">{s.url}</div>
                  <div className="text-[10px] text-zinc-600 mt-0.5">{s.schedule} · {s.rawSignalCount} signals · <span className={s.status === "active" ? "text-green-500" : "text-amber-500"}>{s.status}</span></div>
                </div>
                <button
                  onClick={() => deleteMonitoredSource(s.id)}
                  className="text-zinc-700 hover:text-red-400 text-xs transition-colors shrink-0"
                >✕</button>
              </div>
              {s.errorMessage && (
                <div className="mt-1.5 text-[10px] text-red-400 bg-red-950/30 rounded px-2 py-1">{s.errorMessage}</div>
              )}
            </div>
          ))}
        </div>
        <div className="space-y-2">
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
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-600"
            />
            <button
              onClick={addSource}
              disabled={busy || !newUrl.trim() || !newName.trim()}
              className="px-3 py-2 bg-green-600 hover:bg-green-500 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-40"
            >+</button>
          </div>
        </div>
      </div>

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

  const [selected, setSelected]           = useState<SourceSignal | null>(null);
  const [filterStatus, setFilterStatus]   = useState<"all" | "raw" | "validated" | "rejected" | "promoted">("all");

  const loading = authLoading || sigLoading || srcLoading || topicLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh] text-zinc-600 text-sm">
        Loading intelligence layer…
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">

      {/* Header */}
      <div className="border-b border-zinc-900 px-5 py-4 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-green-500 text-[10px] font-semibold tracking-widest uppercase">Intelligence Layer</span>
          </div>
          <h1 className="text-lg font-black text-white">Signal Intelligence</h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>{signals.length} signals</span>
          <span>·</span>
          <span>{sources.length} sources</span>
          <span>·</span>
          <span>{topics.length} topics</span>
        </div>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-[320px_1fr_260px] divide-x divide-zinc-900 overflow-hidden">

        {/* Col A — Signal Feed */}
        <SignalFeed
          signals={signals}
          selectedId={selected?.id ?? null}
          onSelect={setSelected}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
        />

        {/* Col B — Signal Detail */}
        <SignalDetail
          signal={selected}
          ownerId={uid ?? ""}
          onUpdate={() => setSelected(null)}
        />

        {/* Col C — Topics + Sources */}
        <TopicsAndSources
          topics={topics}
          sources={sources}
          ownerId={uid ?? ""}
        />

      </div>
    </div>
  );
}
