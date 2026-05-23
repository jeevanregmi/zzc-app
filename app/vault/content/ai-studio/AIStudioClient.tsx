"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { updateQueueItem, getQueueItem } from "../../../../lib/vault/firestore";
import type { QueueItem } from "../../../../lib/types/queue";
import { useLearningMode } from "../../../../contexts/LearningModeContext";

type Tool = "script" | "thumbnail-prompt" | "publish";
type ScriptFormat = "long-form" | "short" | "reel";
type ThumbnailStyle = "calculator-screen" | "talking-head" | "data-viz" | "split-screen" | "text-only";

interface ScriptSection {
  label: string;
  duration: string;
  script: string;
  visual: string;
}

interface ScriptResult {
  title: string;
  hook: string;
  sections: ScriptSection[];
  ctaText?: string;
  caption?: string;
  description?: string;
  tags?: string[];
  hashtags?: string[];
}

interface ThumbPrompt { variant: string; platform: string; prompt: string; }
interface ThumbnailResult {
  prompts: ThumbPrompt[];
  negativePrompt: string;
  canvaInstructions: string;
}

const PILLAR_OPTIONS = [
  "epf-ssf", "cit-tax", "calculator-demo", "ai-recommend", "nepal-market", "gen-z-finance",
];

const STYLE_OPTIONS: { value: ThumbnailStyle; label: string; desc: string }[] = [
  { value: "calculator-screen", label: "Calculator Screen",  desc: "ZZC tool UI + bold headline" },
  { value: "talking-head",      label: "Talking Head",       desc: "Face + text + green rim light" },
  { value: "data-viz",          label: "Data Visualization", desc: "Chart + stat + title" },
  { value: "split-screen",      label: "Split Screen",       desc: "A vs B comparison" },
  { value: "text-only",         label: "Bold Text",          desc: "Large Nepali typography" },
];

const FORMAT_MAP: Record<string, ScriptFormat> = {
  "youtube-long":  "long-form",
  "shorts":        "short",
  "explainer":     "long-form",
  "facebook-post": "short",
  "carousel":      "short",
  "other":         "long-form",
};

export default function AIStudioClient() {
  const { on: learn } = useLearningMode();
  const searchParams = useSearchParams();
  const queueId    = searchParams.get("queueId") ?? null;
  const queueTitle = searchParams.get("title")   ? decodeURIComponent(searchParams.get("title")!) : null;

  const [tool, setTool] = useState<Tool>("script");

  // Queue context — loaded once on mount from Firestore
  const [queueItem,       setQueueItem]       = useState<QueueItem | null>(null);
  const [contextExpanded, setContextExpanded] = useState(true);

  // Script state
  const [topic,        setTopic]        = useState(queueTitle ?? "");
  const [format,       setFormat]       = useState<ScriptFormat>("long-form");
  const [pillar,       setPillar]       = useState("");
  const [cta,          setCta]          = useState("ZZC calculator मा हेर्नुस्");
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);

  // Thumbnail state
  const [thumbTitle,  setThumbTitle]  = useState(queueTitle ?? "");
  const [headline,    setHeadline]    = useState("");
  const [subline,     setSubline]     = useState("");
  const [style,       setStyle]       = useState<ThumbnailStyle>("calculator-screen");
  const [thumbResult, setThumbResult] = useState<ThumbnailResult | null>(null);
  const [thumbImageUrl, setThumbImageUrl] = useState<string | null>(null);
  const [thumbImageLoading, setThumbImageLoading] = useState(false);

  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [markedInProd,   setMarkedInProd]   = useState(false);
  const [markingInProd,  setMarkingInProd]  = useState(false);

  // Load queue item context once on mount
  useEffect(() => {
    if (!queueId) return;
    getQueueItem(queueId).then(item => {
      if (!item) return;
      setQueueItem(item);
      // Pre-fill topic from queue title if not already set
      const title = item.aiTitle || queueTitle || "";
      setTopic(title);
      setThumbTitle(title);
      // Pre-fill format based on content type
      if (item.contentType) {
        setFormat(FORMAT_MAP[item.contentType] ?? "long-form");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueId]);

  async function generateScript() {
    if (!topic) return;
    setLoading(true);
    setError("");
    setScriptResult(null);
    try {
      const payload: Record<string, unknown> = { topic, format, pillar, cta };
      // Inject signal context if available (makes script grounded in real intelligence)
      if (queueItem?.brief)                       payload.signalBrief = queueItem.brief;
      if (queueItem?.hooks && queueItem.hooks.length > 0) payload.signalHooks = queueItem.hooks;
      if (queueItem?.tags  && queueItem.tags.length > 0)  payload.signalTags  = queueItem.tags;

      const res = await fetch("/api/generate-script", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setScriptResult(data.script);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function generateThumbnailPrompt() {
    if (!thumbTitle || !headline) return;
    setLoading(true);
    setError("");
    setThumbResult(null);
    try {
      const res = await fetch("/api/generate-thumbnail-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: thumbTitle, headline, subline, style }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setThumbResult(data as ThumbnailResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function generateThumbnailImage() {
    if (!thumbResult?.prompts?.[0]?.prompt) return;
    setThumbImageLoading(true);
    setThumbImageUrl(null);
    const seed = Math.floor(Math.random() * 99999);
    const prompt = thumbResult.prompts[0].prompt;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&model=flux&nologo=true&seed=${seed}`;
    // Pre-load to detect errors
    const img = new window.Image();
    img.onload  = () => { setThumbImageUrl(url); setThumbImageLoading(false); };
    img.onerror = () => { setThumbImageUrl(url); setThumbImageLoading(false); }; // show anyway
    img.src = url;
    // Save to queue item
    if (queueId) {
      await updateQueueItem(queueId, { thumbnailImageUrl: url, updatedAt: new Date().toISOString() }).catch(() => {});
    }
  }

  async function markInProduction() {
    if (!queueId) return;
    setMarkingInProd(true);
    try {
      await updateQueueItem(queueId, {
        status: "in_production",
        updatedAt: new Date().toISOString(),
      });
      setMarkedInProd(true);
    } finally {
      setMarkingInProd(false);
    }
  }

  async function publishToJanta() {
    if (!queueId) return;
    const isPublished = queueItem?.publishToJanta;
    await updateQueueItem(queueId, {
      publishToJanta:   !isPublished,
      jantaPublishedAt: !isPublished ? new Date().toISOString() : undefined,
      updatedAt:        new Date().toISOString(),
    });
    setQueueItem(q => q ? { ...q, publishToJanta: !isPublished } : q);
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
        <span className="text-zinc-700">/</span>
        <h1 className="text-xl font-bold text-white">AI Studio</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Bedrock powered</span>
      </div>

      {/* Queue + Signal context banner */}
      {queueId && (
        <div className={`mb-6 rounded-2xl border ${
          markedInProd ? "bg-green-950/40 border-green-800" : "bg-cyan-950/30 border-cyan-900"
        }`}>
          {/* Top row — queue info + actions */}
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${markedInProd ? "text-green-400" : "text-cyan-400"}`}>
                {markedInProd ? "✓ Marked as In Production" : "From Queue"}
              </p>
              <p className="text-white text-sm font-medium truncate">
                {queueItem?.aiTitle ?? queueTitle}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <Link href="/vault/content/queue" className="text-zinc-500 text-xs hover:text-zinc-300 transition-colors">
                  ← Back to Queue
                </Link>
                {queueItem?.sourceSignalId && (
                  <span className="text-zinc-700 text-xs">· Signal-grounded</span>
                )}
                {queueItem?.tags && queueItem.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {queueItem.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-zinc-900 border border-zinc-700 text-zinc-500 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {queueItem?.brief && (
                <button
                  onClick={() => setContextExpanded(e => !e)}
                  className="text-xs px-2 py-1 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded hover:text-zinc-200 transition-colors"
                >
                  {contextExpanded ? "Hide context" : "Show context"}
                </button>
              )}
              {!markedInProd && (
                <button
                  onClick={markInProduction}
                  disabled={markingInProd}
                  className="text-xs px-3 py-1.5 bg-cyan-900/50 hover:bg-cyan-800/60 border border-cyan-800 text-cyan-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {markingInProd ? "Saving…" : "Mark In Production"}
                </button>
              )}
              <button
                onClick={publishToJanta}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors font-bold ${
                  queueItem?.publishToJanta
                    ? "bg-green-900/60 border-green-700 text-green-300 hover:bg-red-950 hover:border-red-800 hover:text-red-400"
                    : "bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-green-950 hover:border-green-800 hover:text-green-300"
                }`}
              >
                {queueItem?.publishToJanta ? "✅ /janta मा Live — Unpublish" : "🚀 /janta मा Publish"}
              </button>
            </div>
          </div>

          {/* Signal context panel — brief + hooks */}
          {queueItem?.brief && contextExpanded && (
            <div className="px-5 pb-4 border-t border-cyan-900/50 pt-3 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Intelligence Brief</p>
                <p className="text-zinc-300 text-xs leading-relaxed">{queueItem.brief}</p>
              </div>
              {queueItem.hooks && queueItem.hooks.length > 0 && (
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-1">Validated Hooks</p>
                  <ul className="space-y-1">
                    {queueItem.hooks.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <span className="text-cyan-800 shrink-0 mt-0.5">{i + 1}.</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-[10px] text-zinc-700">This context is automatically injected into your script generation.</p>
            </div>
          )}
        </div>
      )}

      {/* Tool selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {([
          { id: "script" as Tool,           label: "📝 Script" },
          { id: "thumbnail-prompt" as Tool, label: "🖼 Thumbnail" },
          { id: "publish" as Tool,          label: "📣 Publish Hub" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTool(t.id); setError(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              tool === t.id
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Script Generator ── */}
      {tool === "script" && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Topic *</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. नेपालमा EPF कसरी काम गर्छ?"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Format</label>
                <div className="flex gap-2">
                  {(["long-form", "short", "reel"] as ScriptFormat[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        format === f ? "bg-green-900/40 border border-green-700 text-green-300" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Content Pillar</label>
                <select
                  value={pillar}
                  onChange={e => setPillar(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
                >
                  <option value="">Select pillar…</option>
                  {PILLAR_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">CTA</label>
              <input
                value={cta}
                onChange={e => setCta(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>
            {learn && (
              <div className="text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 space-y-0.5">
                <p className="font-semibold text-zinc-400">⚡ Generate Script</p>
                <p>Provider: AWS Bedrock (us-east-1) · Model: Claude Sonnet 4.6 (inference profile)</p>
                <p className="text-red-400 font-semibold">🔴 Expensive · ~8–15k tokens · Bedrock daily quota applies</p>
                <p>Output: full script JSON with hook, sections, CTA, caption, tags</p>
                <p className="text-amber-400">If you see a 429 error, quota reset is midnight UTC.</p>
              </div>
            )}
            <button
              onClick={generateScript}
              disabled={!topic || loading}
              title="Calls Claude Sonnet 4.6 on AWS Bedrock to generate a full video script. Uses daily token quota."
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg text-sm transition-colors"
            >
              {loading ? "Generating…" : `⚡ Generate Script${learn ? " 🔴" : ""}`}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs px-1">{error}</p>}

          {scriptResult && (
            <>
              <ScriptOutput result={scriptResult} />
              {queueId && !markedInProd && (
                <div className="flex justify-end">
                  <button
                    onClick={markInProduction}
                    disabled={markingInProd}
                    className="text-xs px-4 py-2 bg-cyan-900/50 hover:bg-cyan-800/60 border border-cyan-800 text-cyan-300 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {markingInProd ? "Saving…" : "✓ Mark Queue Item as In Production"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Thumbnail Prompt Generator ── */}
      {tool === "thumbnail-prompt" && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Video Title *</label>
              <input
                value={thumbTitle}
                onChange={e => setThumbTitle(e.target.value)}
                placeholder="e.g. नेपालमा EPF कसरी काम गर्छ?"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Headline (Nepali) *</label>
                <input
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="e.g. EPF को राज खुल्यो"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Subline (optional)</label>
                <input
                  value={subline}
                  onChange={e => setSubline(e.target.value)}
                  placeholder="e.g. नेपाली युवाले नजानेको कुरा"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-2">Style Variant</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STYLE_OPTIONS.map(s => (
                  <button
                    key={s.value}
                    onClick={() => setStyle(s.value)}
                    className={`p-2.5 rounded-lg text-left text-xs transition-colors ${
                      style === s.value
                        ? "bg-green-900/40 border border-green-700 text-green-300"
                        : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-zinc-600 text-xs mt-0.5">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            {learn && (
              <div className="text-[10px] text-zinc-500 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 space-y-0.5">
                <p className="font-semibold text-zinc-400">⚡ Generate Thumbnail Prompts</p>
                <p>Provider: AWS Bedrock (us-east-1) · Model: Claude Sonnet 4.6 (inference profile)</p>
                <p className="text-red-400 font-semibold">🔴 Expensive · Shares Bedrock daily quota with Script Generator</p>
                <p>Output: 3 Midjourney/DALL-E prompts + Canva layout instructions</p>
              </div>
            )}
            <button
              onClick={generateThumbnailPrompt}
              disabled={!thumbTitle || !headline || loading}
              title="Calls Claude Sonnet 4.6 on AWS Bedrock to generate 3 thumbnail prompt variants. Uses daily token quota."
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg text-sm transition-colors"
            >
              {loading ? "Generating…" : `⚡ Generate Prompts${learn ? " 🔴" : ""}`}
            </button>
          </div>

          {error && <p className="text-red-400 text-xs px-1">{error}</p>}

          {thumbResult && (
            <>
              <ThumbnailOutput result={thumbResult} />

              {/* Actual image generation from first prompt */}
              <div className="p-4 bg-zinc-900 border border-purple-900/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-purple-300">🖼 AI Thumbnail Image</p>
                    <p className="text-xs text-zinc-500 mt-0.5">Pollinations.ai (Flux) — free, no API key needed</p>
                  </div>
                  <button
                    onClick={generateThumbnailImage}
                    disabled={thumbImageLoading}
                    className="px-4 py-2 rounded-xl text-xs font-black bg-purple-700 hover:bg-purple-600 text-white transition-colors disabled:opacity-50"
                  >
                    {thumbImageLoading ? "Generate हुँदैछ…" : thumbImageUrl ? "🔄 Regenerate" : "⚡ Generate Image"}
                  </button>
                </div>

                {thumbImageLoading && (
                  <div className="w-full aspect-video bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs text-zinc-500">Flux model generate गर्दैछ (~10–30s)…</p>
                    </div>
                  </div>
                )}

                {thumbImageUrl && !thumbImageLoading && (
                  <div className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbImageUrl}
                      alt="Generated thumbnail"
                      className="w-full rounded-xl border border-zinc-700"
                      style={{ aspectRatio: "16/9", objectFit: "cover" }}
                    />
                    <div className="flex gap-2">
                      <a
                        href={thumbImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="thumbnail.jpg"
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        ⬇ Download
                      </a>
                      <button
                        onClick={() => navigator.clipboard.writeText(thumbImageUrl)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                      >
                        📋 Copy URL
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Publish Hub ── */}
      {tool === "publish" && (
        <div className="space-y-4">
          {/* /janta */}
          <div className="p-4 bg-zinc-950 border border-green-900/50 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-black text-green-400">🌐 ZZC Janta</p>
                <p className="text-xs text-zinc-500">Public Intelligence page — zzc.jeevanregmi.com.np/janta</p>
              </div>
              <button
                onClick={publishToJanta}
                disabled={!queueId}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${
                  queueItem?.publishToJanta
                    ? "bg-green-900/60 border border-green-700 text-green-300 hover:bg-red-950 hover:border-red-800 hover:text-red-400"
                    : "bg-green-700 hover:bg-green-600 text-white"
                }`}
              >
                {queueItem?.publishToJanta ? "✅ Live — Unpublish गर्नुस्" : "🚀 Janta मा Publish"}
              </button>
            </div>
            {queueItem?.publishToJanta && (
              <div className="text-xs text-green-700 bg-green-950/30 rounded-xl px-3 py-2">
                Timeline मा देखिन्छ · Readers ले पढ्न र सुन्न सक्छन् (TTS) · Hero image भए देखिन्छ
              </div>
            )}
          </div>

          {/* Facebook */}
          <div className="p-4 bg-zinc-950 border border-blue-900/50 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-black text-blue-400">📘 Facebook Page</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-600 border border-blue-900">Manual — Copy & Paste</span>
            </div>
            <p className="text-xs text-zinc-500">Script → Caption बनाएर Facebook Page मा paste गर्नुस्। Image: Thumbnail बाट download।</p>

            {/* Caption builder */}
            {scriptResult ? (
              <div className="space-y-2">
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">FB Caption (copy गर्नुस्)</p>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {[
                      scriptResult.hook ?? "",
                      "",
                      scriptResult.caption ?? "",
                      "",
                      scriptResult.hashtags?.join(" ") ?? "#Nepal #ZZC #Finance",
                    ].join("\n")}
                  </p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(
                    [scriptResult.hook ?? "", "", scriptResult.caption ?? "", "", scriptResult.hashtags?.join(" ") ?? "#Nepal #ZZC #Finance"].join("\n")
                  )}
                  className="w-full py-2 rounded-xl text-xs font-bold bg-blue-900/40 hover:bg-blue-900/70 border border-blue-800 text-blue-300 transition-colors"
                >
                  📋 FB Caption Copy गर्नुहोस्
                </button>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-4 text-center">
                <p className="text-xs text-zinc-500">पहिले Script Generator मा script बनाउनुस् — तब FB caption यहाँ तयार हुन्छ।</p>
                <button onClick={() => setTool("script")} className="mt-2 text-xs text-blue-400 hover:text-blue-300 underline">
                  → Script Generate गर्नुस्
                </button>
              </div>
            )}

            {/* Image reminder */}
            {thumbImageUrl ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbImageUrl} alt="thumb" className="w-16 h-9 object-cover rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400">Thumbnail ready</p>
                  <p className="text-[10px] text-zinc-600 truncate">{thumbImageUrl}</p>
                </div>
                <a href={thumbImageUrl} target="_blank" rel="noopener noreferrer"
                   className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400 hover:text-white shrink-0">
                  Download
                </a>
              </div>
            ) : (
              <div className="text-xs text-zinc-600 text-center">
                Thumbnail image छैन —{" "}
                <button onClick={() => setTool("thumbnail-prompt")} className="text-purple-400 hover:text-purple-300 underline">
                  Thumbnail tab मा generate गर्नुस्
                </button>
              </div>
            )}

            {/* Workflow steps */}
            <div className="space-y-1.5 pt-1">
              {[
                "1. Caption copy गर्नुस् (माथि बटन)",
                "2. Thumbnail download गर्नुस्",
                "3. facebook.com/pages → Create Post → Photo",
                "4. Image upload → Caption paste → Schedule 7 PM NST",
                "5. Boost: ₹500 top-performing post 48h पछि",
              ].map(s => (
                <div key={s} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-blue-800 shrink-0">›</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* YouTube */}
          <div className="p-4 bg-zinc-950 border border-red-900/50 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-black text-red-400">▶ YouTube</p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-950 text-red-700 border border-red-900">Manual Upload</span>
            </div>
            <p className="text-xs text-zinc-500">Script record गर्नुस् → Upload। AI ले description + tags ready गरिदिन्छ।</p>

            {scriptResult ? (
              <div className="space-y-2">
                {/* Title */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Video Title</p>
                  <p className="text-xs text-white font-semibold">{scriptResult.title}</p>
                  <button onClick={() => navigator.clipboard.writeText(scriptResult.title)}
                    className="mt-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 underline">Copy</button>
                </div>
                {/* Description */}
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Description</p>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {scriptResult.description ?? [scriptResult.hook, "", "ZZC — Nepal को लागि AI-powered financial intelligence।", "Website: zzc.jeevanregmi.com.np", "", scriptResult.tags?.join(" ") ?? ""].join("\n")}
                  </p>
                  <button
                    onClick={() => navigator.clipboard.writeText(scriptResult.description ?? [scriptResult.hook, "", "ZZC — Nepal को लागि AI-powered financial intelligence।", "Website: zzc.jeevanregmi.com.np", "", scriptResult.tags?.join(" ") ?? ""].join("\n"))}
                    className="mt-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 underline">Copy Description</button>
                </div>
                {/* Tags */}
                {scriptResult.tags && scriptResult.tags.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Tags</p>
                    <p className="text-xs text-zinc-400">{scriptResult.tags.join(", ")}</p>
                    <button onClick={() => navigator.clipboard.writeText(scriptResult.tags!.join(", "))}
                      className="mt-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 underline">Copy Tags</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-4 text-center">
                <p className="text-xs text-zinc-500">Script generate गर्नुस् — YouTube title, description, tags automatically तयार हुन्छ।</p>
                <button onClick={() => setTool("script")} className="mt-2 text-xs text-red-400 hover:text-red-300 underline">
                  → Script Generate गर्नुस्
                </button>
              </div>
            )}

            {/* Upload checklist */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Upload Checklist</p>
              {[
                "Script record गर्नुस् (teleprompter app use गर्नुस्)",
                "Video edit गर्नुस् — captions burn-in गर्नुस् (Nepali)",
                "Thumbnail upload (1280×720, download माथिबाट)",
                "studio.youtube.com → Upload → Title/Desc/Tags paste गर्नुस्",
                "Schedule: 7 PM NST · Visibility: Public",
                "Upload भएपछि Facebook मा short clip post गर्नुस्",
              ].map(s => (
                <div key={s} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-red-800 shrink-0">›</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary status */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {[
              { label: "/janta", status: queueItem?.publishToJanta ? "✅ Live" : "⬜ Not published", color: queueItem?.publishToJanta ? "text-green-400" : "text-zinc-600" },
              { label: "Facebook", status: scriptResult ? "📋 Caption ready" : "⬜ Script चाहिन्छ", color: scriptResult ? "text-blue-400" : "text-zinc-600" },
              { label: "YouTube", status: scriptResult ? "📋 Meta ready" : "⬜ Script चाहिन्छ", color: scriptResult ? "text-red-400" : "text-zinc-600" },
            ].map(c => (
              <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                <p className="text-[10px] text-zinc-600 mb-1">{c.label}</p>
                <p className={`text-xs font-black ${c.color}`}>{c.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier 2 notice */}
      <div className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Coming in Tier 2</p>
        <div className="flex flex-wrap gap-2">
          {["🖼 Image Generation", "🔊 Voice Narration", "📹 Short Video", "💬 Auto-Subtitles"].map(item => (
            <span key={item} className="text-xs px-2 py-1 bg-zinc-800 text-zinc-600 rounded">{item}</span>
          ))}
        </div>
        <p className="text-xs text-zinc-700 mt-2">
          Add <span className="font-mono text-zinc-500">TOGETHER_API_KEY</span> + <span className="font-mono text-zinc-500">ELEVENLABS_API_KEY</span> to Cloudflare Pages env to unlock.
        </p>
      </div>

    </div>
  );
}

function ScriptOutput({ result }: { result: ScriptResult }) {
  return (
    <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
      <div>
        <p className="text-xs text-zinc-500 mb-1">Title</p>
        <p className="text-white font-semibold">{result.title}</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-1">Hook</p>
        <p className="text-zinc-300 text-sm italic">"{result.hook}"</p>
      </div>
      <div>
        <p className="text-xs text-zinc-500 mb-2">Sections</p>
        <div className="space-y-2">
          {result.sections?.map((s, i) => (
            <div key={i} className="p-3 bg-zinc-950 rounded-lg text-xs">
              <div className="flex gap-3 mb-1">
                <span className="text-green-400 font-medium w-28 shrink-0">{s.label}</span>
                <span className="text-zinc-600 font-mono">{s.duration}</span>
              </div>
              <p className="text-zinc-300 mb-1">{s.script}</p>
              {s.visual && <p className="text-zinc-600">Visual: {s.visual}</p>}
            </div>
          ))}
        </div>
      </div>
      {result.ctaText && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">CTA Script</p>
          <p className="text-green-400 text-sm">{result.ctaText}</p>
        </div>
      )}
      {result.tags && result.tags.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1">Tags</p>
          <div className="flex flex-wrap gap-1">
            {result.tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbnailOutput({ result }: { result: ThumbnailResult }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-3">
      {result.prompts?.map(p => (
        <div key={p.variant} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-green-400">Variant {p.variant} — {p.platform}</span>
            <button
              onClick={() => copy(p.prompt, p.variant)}
              className="text-xs px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded"
            >
              {copied === p.variant ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap">{p.prompt}</p>
        </div>
      ))}
      {result.negativePrompt && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-600 mb-1">Negative Prompt</p>
          <p className="text-xs text-zinc-400 font-mono">{result.negativePrompt}</p>
        </div>
      )}
      {result.canvaInstructions && (
        <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <p className="text-xs text-zinc-600 mb-1">Canva Fallback Instructions</p>
          <p className="text-xs text-zinc-400">{result.canvaInstructions}</p>
        </div>
      )}
    </div>
  );
}
