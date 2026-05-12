"use client";

import { useState } from "react";
import Link from "next/link";

type Tool = "script" | "thumbnail-prompt";
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

export default function AIStudioPage() {
  const [tool, setTool] = useState<Tool>("script");

  // Script state
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState<ScriptFormat>("long-form");
  const [pillar, setPillar] = useState("");
  const [cta, setCta] = useState("ZZC calculator मा हेर्नुस्");
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);

  // Thumbnail state
  const [thumbTitle, setThumbTitle] = useState("");
  const [headline, setHeadline] = useState("");
  const [subline, setSubline] = useState("");
  const [style, setStyle] = useState<ThumbnailStyle>("calculator-screen");
  const [thumbResult, setThumbResult] = useState<ThumbnailResult | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateScript() {
    if (!topic) return;
    setLoading(true);
    setError("");
    setScriptResult(null);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, format, pillar, cta }),
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

  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">AI Studio</h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400">Bedrock powered</span>
        </div>

        {/* Tool selector */}
        <div className="flex gap-2 mb-6">
          {([
            { id: "script" as Tool,           label: "📝 Script Generator" },
            { id: "thumbnail-prompt" as Tool, label: "🖼 Thumbnail Prompt" },
          ]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); setError(""); setScriptResult(null); setThumbResult(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
              <button
                onClick={generateScript}
                disabled={!topic || loading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg text-sm transition-colors"
              >
                {loading ? "Generating…" : "⚡ Generate Script"}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            {scriptResult && <ScriptOutput result={scriptResult} />}
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
              <button
                onClick={generateThumbnailPrompt}
                disabled={!thumbTitle || !headline || loading}
                className="w-full py-2.5 bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-bold rounded-lg text-sm transition-colors"
              >
                {loading ? "Generating…" : "⚡ Generate Prompts"}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            {thumbResult && <ThumbnailOutput result={thumbResult} />}
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
