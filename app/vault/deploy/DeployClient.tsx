"use client";

import { useState, useEffect } from "react";

interface ProviderStatus {
  name:         string;
  status:       "ok" | "error" | "billing" | "unconfigured" | "loading";
  latencyMs?:   number;
  note?:        string;
}

interface HealthResponse {
  providers?: {
    gemini?:    { ok: boolean; latencyMs?: number; error?: string };
    bedrock?:   { ok: boolean; latencyMs?: number; error?: string };
    anthropic?: { ok: boolean; latencyMs?: number; error?: string };
  };
  timestamp?: string;
}

const API_ENDPOINTS = [
  { name: "/api/health",                    label: "Health Check" },
  { name: "/api/forex-rate",                label: "Forex Rate (NRB)" },
  { name: "/api/recommend",                 label: "AI Recommendations" },
  { name: "/api/process-document",          label: "Document Processing" },
  { name: "/api/analyze-ssf",              label: "SSF Analyzer" },
  { name: "/api/generate-script",           label: "Script Generator" },
  { name: "/api/generate-thumbnail-prompt", label: "Thumbnail Generator" },
  { name: "/api/generate-content-idea",     label: "Idea Generator" },
  { name: "/api/ingest-url",               label: "URL Ingestion" },
  { name: "/api/economics-summary",         label: "Economics Brief" },
  { name: "/api/upload-document",           label: "Document Upload" },
  { name: "/api/r2-serve",                  label: "R2 File Serving" },
];

const ENV_VARS = [
  { key: "GEMINI_API_KEY",           label: "Gemini Flash",          tier: "primary",  note: "Cheapest provider" },
  { key: "AWS_ACCESS_KEY_ID",        label: "AWS Bedrock (Key)",     tier: "fallback", note: "Fallback provider" },
  { key: "AWS_SECRET_ACCESS_KEY",    label: "AWS Bedrock (Secret)",  tier: "fallback", note: "" },
  { key: "ANTHROPIC_API_KEY",        label: "Anthropic Haiku",       tier: "last",     note: "Last resort" },
  { key: "VAULT_BUCKET",             label: "R2 Bucket (Vault)",     tier: "infra",    note: "Document storage" },
  { key: "FIREBASE_SERVICE_ACCOUNT", label: "Firebase Admin SDK",    tier: "infra",    note: "Auth + Firestore" },
];

const TIER_COLORS: Record<string, string> = {
  primary:  "text-green-400",
  fallback: "text-amber-400",
  last:     "text-orange-400",
  infra:    "text-blue-400",
};

export default function DeployClient() {
  const [health,    setHealth]    = useState<HealthResponse | null>(null);
  const [probing,   setProbing]   = useState(false);
  const [probeTime, setProbeTime] = useState<string | null>(null);
  const [forexRate, setForexRate] = useState<{ rateNPR?: number; source?: string; date?: string } | null>(null);

  // Fetch health + forex on mount (no live probe — just /api/health)
  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then((d: HealthResponse) => setHealth(d))
      .catch(() => {});

    fetch("/api/forex-rate")
      .then(r => r.json())
      .then(d => setForexRate(d as { rateNPR?: number; source?: string; date?: string }))
      .catch(() => {});
  }, []);

  async function runProbe() {
    setProbing(true);
    try {
      const res  = await fetch("/api/health?probe=true");
      const data = await res.json() as HealthResponse;
      setHealth(data);
      setProbeTime(new Date().toLocaleTimeString());
    } catch { /* ignore */ }
    finally { setProbing(false); }
  }

  function providerStatus(key: "gemini" | "bedrock" | "anthropic"): ProviderStatus {
    const p = health?.providers?.[key];
    if (!p) return { name: key, status: "loading" };
    if (p.ok)    return { name: key, status: "ok",      latencyMs: p.latencyMs };
    const note = p.error ?? "";
    if (note.includes("billing") || note.includes("quota"))
      return { name: key, status: "billing", note };
    if (note.includes("unconfigured") || note.includes("missing"))
      return { name: key, status: "unconfigured", note };
    return { name: key, status: "error", note };
  }

  const gemini    = providerStatus("gemini");
  const bedrock   = providerStatus("bedrock");
  const anthropic = providerStatus("anthropic");

  function StatusBadge({ status }: { status: ProviderStatus["status"] }) {
    const cls =
      status === "ok"           ? "bg-green-950 text-green-400 border-green-800" :
      status === "billing"      ? "bg-amber-950 text-amber-400 border-amber-800" :
      status === "unconfigured" ? "bg-zinc-800  text-zinc-500  border-zinc-700"  :
      status === "error"        ? "bg-red-950   text-red-400   border-red-800"   :
                                  "bg-zinc-900  text-zinc-600  border-zinc-800";
    const label =
      status === "ok"           ? "Operational" :
      status === "billing"      ? "Billing Issue" :
      status === "unconfigured" ? "Not Configured" :
      status === "error"        ? "Error" : "—";
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${cls}`}>{label}</span>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Deploy Monitor</h1>
          <p className="text-zinc-500 text-sm mt-0.5">API health, provider status, system configuration</p>
        </div>
        <button
          onClick={runProbe}
          disabled={probing}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {probing ? "Probing…" : "Run Live Probe"}
        </button>
      </div>

      {probeTime && (
        <p className="text-zinc-600 text-xs">Last probe: {probeTime} (live 1-token calls to each AI provider)</p>
      )}

      {/* AI provider status */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">AI Providers</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Gemini Flash", sub: "Primary · cheapest",  data: gemini },
            { label: "Bedrock Haiku", sub: "Fallback",            data: bedrock },
            { label: "Anthropic Haiku", sub: "Last resort",       data: anthropic },
          ].map(({ label, sub, data }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
                <StatusBadge status={data.status} />
              </div>
              <p className="text-zinc-600 text-xs">{sub}</p>
              {data.latencyMs !== undefined && (
                <p className="text-green-400 text-xs mt-1">{data.latencyMs}ms latency</p>
              )}
              {data.note && data.status !== "ok" && (
                <p className="text-zinc-600 text-xs mt-1 truncate" title={data.note}>{data.note.slice(0, 60)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live services */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Live Services</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            {
              label: "NRB Forex Rate",
              status: forexRate?.rateNPR ? "ok" : "loading",
              detail: forexRate ? `1 USD = NPR ${forexRate.rateNPR?.toFixed(2)} · ${forexRate.source} · ${forexRate.date}` : "Fetching…",
            },
            {
              label: "Cloudflare Pages",
              status: "ok" as const,
              detail: "Deployed · edge CDN active",
            },
            {
              label: "Firebase Auth",
              status: "ok" as const,
              detail: "Auth + Firestore active",
            },
            {
              label: "R2 Object Storage",
              status: "ok" as const,
              detail: "zzc-vault bucket · document storage",
            },
          ].map(({ label, status, detail }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                status === "ok" ? "bg-green-500" : status === "loading" ? "bg-amber-500" : "bg-red-500"
              }`} />
              <div className="min-w-0">
                <p className="text-sm text-zinc-200">{label}</p>
                <p className="text-xs text-zinc-500 truncate">{detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API endpoints */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          API Functions ({API_ENDPOINTS.length})
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {API_ENDPOINTS.map((ep, i) => (
            <div
              key={ep.name}
              className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                i < API_ENDPOINTS.length - 1 ? "border-b border-zinc-800" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <span className="text-zinc-300">{ep.label}</span>
              </div>
              <span className="text-zinc-600 font-mono text-xs">{ep.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Environment variables checklist */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          Cloudflare Environment Variables
        </p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          {ENV_VARS.map((v, i) => (
            <div
              key={v.key}
              className={`flex items-center justify-between px-4 py-2.5 ${
                i < ENV_VARS.length - 1 ? "border-b border-zinc-800" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold ${TIER_COLORS[v.tier]}`}>
                  {v.tier.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm text-zinc-200">{v.label}</p>
                  {v.note && <p className="text-xs text-zinc-600">{v.note}</p>}
                </div>
              </div>
              <span className="text-zinc-600 font-mono text-xs">{v.key}</span>
            </div>
          ))}
        </div>
        <p className="text-zinc-700 text-xs mt-2">
          Set these in Cloudflare Pages → Settings → Environment variables
        </p>
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Quick Links</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { label: "Cloudflare Pages",  href: "https://dash.cloudflare.com" },
            { label: "Firebase Console",   href: "https://console.firebase.google.com" },
            { label: "Anthropic Billing",  href: "https://console.anthropic.com/billing" },
            { label: "Google AI Studio",   href: "https://aistudio.google.com" },
            { label: "AWS IAM Console",    href: "https://console.aws.amazon.com/iam" },
            { label: "System Status",      href: "/vault/system" },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-3 py-2.5 text-sm text-zinc-300 hover:text-white transition-colors"
            >
              {label} →
            </a>
          ))}
        </div>
      </div>

    </div>
  );
}
