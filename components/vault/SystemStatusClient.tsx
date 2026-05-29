"use client";

import { useEffect, useState, useMemo } from "react";
import Link                              from "next/link";
import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db }                            from "../../app/firebase";
import { useVaultAuth }                  from "../../hooks/vault/useVaultAuth";
import { useSourceSignals }              from "../../hooks/vault/useSourceSignals";
import { useMonitoredSources }           from "../../hooks/vault/useMonitoredSources";
import { useQueueItems }                 from "../../hooks/vault/useQueueItems";
import { useIntelligenceDocs }           from "../../hooks/vault/useIntelligenceDocs";
import { computeFullPipelineState, type PipelineHealth } from "../../lib/vault/fullPipelineState";
// ─── Types ────────────────────────────────────────────────────────────────────

type ProviderStatus = "configured" | "unconfigured" | "ok" | "error" | "credit_low" | "loading";

interface ProviderHealth {
  status:    ProviderStatus;
  model?:    string;
  error?:    string;
  latencyMs?:number;
  costTier?: "cheap" | "standard" | "premium";
}

interface HealthData {
  ok:        boolean;
  timestamp: string;
  gemini:    ProviderHealth;
  bedrock:   ProviderHealth;
  anthropic: ProviderHealth;
  r2:        { status: "ok" | "unconfigured" };
  probe:     boolean;
}

// ─── AI workers ───────────────────────────────────────────────────────────────

const AI_WORKERS = [
  { name: "process-document",      provider: "gemini"    as const, model: "gemini-2.0-flash (→ bedrock-haiku → anthropic)", primary: true },
  { name: "recommend",             provider: "anthropic" as const, model: "claude-opus-4-7",                                primary: false },
  { name: "ingest-url",            provider: "anthropic" as const, model: "claude-haiku-4-5-20251001",                      primary: false },
  { name: "generate-content-idea", provider: "anthropic" as const, model: "claude-haiku-4-5-20251001",                      primary: false },
  { name: "generate-script",       provider: "bedrock"   as const, model: "us.anthropic.claude-3-5-haiku-20241022-v1:0",    primary: false },
  { name: "generate-thumbnail",    provider: "bedrock"   as const, model: "us.anthropic.claude-3-5-haiku-20241022-v1:0",    primary: false },
];

// ─── Small components ─────────────────────────────────────────────────────────

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function ProviderBadge({ status }: { status: ProviderStatus }) {
  const cfg: Record<ProviderStatus, { label: string; cls: string }> = {
    loading:      { label: "checking…",     cls: "bg-zinc-800 text-zinc-400 border-zinc-700" },
    configured:   { label: "configured",    cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800" },
    ok:           { label: "live ✓",   cls: "bg-emerald-900/40 text-emerald-400 border-emerald-800" },
    unconfigured: { label: "not set",       cls: "bg-zinc-800 text-zinc-500 border-zinc-700" },
    error:        { label: "error",         cls: "bg-red-900/40 text-red-400 border-red-800" },
    credit_low:   { label: "credit low ⚠", cls: "bg-amber-900/40 text-amber-400 border-amber-800" },
  };
  const { label, cls } = cfg[status] ?? cfg.loading;
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cls}`}>
      {label}
    </span>
  );
}

function WorkerRow({ w, health }: { w: typeof AI_WORKERS[number]; health: HealthData | null }) {
  const providerHealth = health
    ? (w.provider === "gemini" ? health.gemini : w.provider === "bedrock" ? health.bedrock : health.anthropic)
    : null;
  const status: ProviderStatus = providerHealth?.status ?? "loading";
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div className="min-w-0 flex-1 mr-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-zinc-200">/api/{w.name}</span>
          {w.primary && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-400 border border-cyan-800">primary</span>}
        </div>
        <div className="text-xs text-zinc-500 mt-0.5 truncate">
          {w.provider === "bedrock" ? "AWS Bedrock" : w.provider === "gemini" ? "Google Gemini" : "Anthropic"} &middot; <span className="font-mono">{w.model}</span>
        </div>
      </div>
      <ProviderBadge status={status} />
    </div>
  );
}

// ─── Setup Checklist ──────────────────────────────────────────────────────────

type CheckStatus = "ok" | "warn" | "error" | "loading";

interface CheckItem {
  label:   string;
  status:  CheckStatus;
  detail?: string;
  fix?:    React.ReactNode;
}

function CheckRow({ item }: { item: CheckItem }) {
  const icon: Record<CheckStatus, string> = {
    ok:      "✓",
    warn:    "⚠",
    error:   "✕",
    loading: "…",
  };
  const cls: Record<CheckStatus, string> = {
    ok:      "text-emerald-400",
    warn:    "text-amber-400",
    error:   "text-red-400",
    loading: "text-zinc-500",
  };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800 last:border-0">
      <span className={`text-sm font-bold shrink-0 mt-0.5 ${cls[item.status]}`}>{icon[item.status]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-zinc-200">{item.label}</span>
        </div>
        {item.detail && <p className="text-xs text-zinc-500 mt-0.5">{item.detail}</p>}
        {item.fix && <div className="mt-2">{item.fix}</div>}
      </div>
    </div>
  );
}

function FixLink({ href, children }: { href: string; children: React.ReactNode }) {
  const isExternal = href.startsWith("http");
  const cls = "inline-block text-xs text-cyan-400 hover:text-cyan-300 underline";
  if (isExternal) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>;
  return <Link href={href} className={cls}>{children}</Link>;
}

function FixBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-400 space-y-1">
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SystemStatusClient() {
  const { user, isOwner }  = useVaultAuth();
  const uid = user?.uid ?? null;

  const { signals, loading: sigLoad, error: sigErr }  = useSourceSignals(uid, "all");
  const { sources, loading: srcLoad, error: srcErr }  = useMonitoredSources(uid);
  const { items: queue, loading: qLoad, error: qErr } = useQueueItems(uid);
  const { docs,         loading: docLoad               } = useIntelligenceDocs(uid);

  const [health, setHealth]         = useState<HealthData | null>(null);
  const [healthErr, setHealthErr]   = useState<string | null>(null);
  const [intelCountByDoc, setIntelCountByDoc] = useState<Record<string, number>>({});
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [techExpanded, setTechExpanded]       = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json() as Promise<HealthData>)
      .then(setHealth)
      .catch(err => setHealthErr(`Health check failed: ${String(err)}`));
  }, []);

  // Load intel counts for pipeline health summary
  useEffect(() => {
    if (!uid) { setPipelineLoading(false); return; }
    getDocs(query(collection(db, "janta_intelligence"), where("ownerId", "==", uid), limit(2000)))
      .then(snap => {
        const map: Record<string, number> = {};
        snap.docs.forEach(d => {
          const srcId = d.data().sourceDocId as string | undefined;
          if (srcId) map[srcId] = (map[srcId] ?? 0) + 1;
        });
        setIntelCountByDoc(map);
      })
      .catch(() => {})
      .finally(() => setPipelineLoading(false));
  }, [uid]);

  const pipelineStates = useMemo(() => {
    if (pipelineLoading || docLoad) return null;
    return docs.map(doc => computeFullPipelineState({
      id:                  doc.id,
      title:               doc.title,
      fileName:            doc.fileName,
      processingStatus:    doc.processingStatus,
      adminApprovalStatus: doc.adminApprovalStatus,
      aiSummary:           doc.aiSummary,
      downloadUrl:         doc.downloadUrl,
      sourceUrl:           doc.sourceUrl,
      originalSourceUrl:   doc.originalSourceUrl,
      extractionTier:      doc.extractionTier as string | undefined,
      atomicCompleted:     doc.atomicCompleted,
      govFolder:           doc.govFolder,
      uploadedAt:          doc.uploadedAt,
      tags:                doc.tags,
      intelCount:          intelCountByDoc[doc.id] ?? 0,
      atomicCount:         0,
      economyCount:        0,
      classificationCount: 0,
      classificationApprovedCount: 0,
    }));
  }, [docs, intelCountByDoc, pipelineLoading, docLoad]);

  const healthTally = useMemo(() => {
    if (!pipelineStates) return null;
    const t: Partial<Record<PipelineHealth, number>> = {};
    for (const s of pipelineStates) t[s.health] = (t[s.health] ?? 0) + 1;
    return t;
  }, [pipelineStates]);

  const loading = sigLoad || srcLoad || qLoad || docLoad;

  // ── Checklist items ─────────────────────────────────────────────────────────

  const isUsable  = (s?: ProviderStatus) => s === "ok" || s === "configured";
  const geminiOk  = isUsable(health?.gemini.status);
  const bedrockOk = isUsable(health?.bedrock.status);
  const anthropicOk = isUsable(health?.anthropic.status);
  const anyAiOk   = geminiOk || bedrockOk || anthropicOk;
  const geminiCredit    = health?.gemini.status    === "credit_low";
  const bedrockCredit   = health?.bedrock.status   === "credit_low";
  const anthropicCredit = health?.anthropic.status === "credit_low";
  const anyCredit = geminiCredit || bedrockCredit || anthropicCredit;

  const checks: CheckItem[] = [
    {
      label:  "Firebase Auth",
      status: uid ? "ok" : "error",
      detail: uid
        ? `Signed in${user?.isAnonymous ? " (anonymous dev session)" : ` as ${user?.email}`}`
        : "Not signed in — most vault operations will fail.",
      fix: !uid ? (
        <FixBox>
          <p>If running in dev mode, set <code className="bg-zinc-800 px-1 rounded">NEXT_PUBLIC_DEV_VAULT_MODE=true</code> in <code className="bg-zinc-800 px-1 rounded">.env.development.local</code> and restart.</p>
          <p>If running in production, sign in at the vault login page.</p>
        </FixBox>
      ) : undefined,
    },
    {
      label:  "R2 Document Storage",
      status: health === null              ? "loading"
             : health.r2.status === "ok"  ? "ok"
             :                              "error",
      detail: health === null             ? "Checking…"
             : health.r2.status === "ok"  ? "VAULT_BUCKET binding present — uploads will work."
             :                             "VAULT_BUCKET R2 binding not configured. Documents cannot be uploaded.",
      fix: health && health.r2.status !== "ok" ? (
        <FixBox>
          <p className="font-semibold text-zinc-300">Step 1 — Create the R2 bucket (one-time):</p>
          <p>
            <FixLink href="https://dash.cloudflare.com">
              Cloudflare Dashboard → R2 → Create bucket → name it <code className="bg-zinc-800 px-1 rounded">zzc-vault</code>
            </FixLink>
          </p>
          <p className="mt-1 font-semibold text-zinc-300">Step 2 — Bind bucket to this Pages project:</p>
          <p>
            <FixLink href="https://dash.cloudflare.com">
              Cloudflare Pages → zeneration-z-chautari → Settings → Functions → R2 bucket bindings → Add binding
            </FixLink>
          </p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Variable name: <code className="bg-zinc-800 px-1 rounded">VAULT_BUCKET</code> · R2 bucket: <code className="bg-zinc-800 px-1 rounded">zzc-vault</code>
          </p>
          <p className="mt-1 font-semibold text-zinc-300">Step 3 — Redeploy to pick up the new binding:</p>
          <code className="block bg-zinc-800 px-2 py-1 rounded mt-0.5">git push  # triggers Cloudflare Pages redeploy</code>
        </FixBox>
      ) : undefined,
    },
    {
      label:  "Firestore (signals)",
      status: sigErr ? "error" : sigLoad ? "loading" : "ok",
      detail: sigErr ?? (sigLoad ? "Loading…" : `${signals.length} signals readable`),
      fix: sigErr ? (
        <FixBox>
          <p>Firestore read failed. Check that your Firestore rules are deployed and this user has read access.</p>
          <p>Deploy rules: <code className="bg-zinc-800 px-1 rounded">npx firebase deploy --only firestore:rules --project zeneration-z-chautari</code></p>
        </FixBox>
      ) : undefined,
    },
    {
      label:  "AI Providers (document analysis)",
      status: health === null ? "loading"
             : anyAiOk        ? "ok"
             : anyCredit       ? "warn"
             :                  "error",
      detail: health === null
        ? "Checking…"
        : anyAiOk
          ? `Active: ${[geminiOk && "Gemini", bedrockOk && "Bedrock", anthropicOk && "Anthropic"].filter(Boolean).join(" + ")}`
          : anyCredit
            ? "All configured providers have exhausted credits. Documents are safe. Top up to resume AI analysis."
            : "No AI provider is configured. Add at least one provider key to enable document analysis.",
      fix: health && !anyAiOk ? (
        <FixBox>
          <p className="font-semibold text-zinc-300">Add at least one provider (cheapest first):</p>
          <div className="mt-2 space-y-2">
            <div className="border border-emerald-900/60 rounded-lg p-2">
              <p className="text-emerald-400 font-semibold text-xs">1. Gemini Flash — Recommended ($0.10/1M tokens, free tier available)</p>
              <p className="mt-0.5">Get key: <FixLink href="https://aistudio.google.com/app/apikey">aistudio.google.com → Get API key</FixLink></p>
              <p className="mt-0.5">Add <code className="bg-zinc-800 px-1 rounded">GEMINI_API_KEY</code> to Cloudflare Pages env vars</p>
            </div>
            <div className="border border-zinc-700 rounded-lg p-2">
              <p className="text-zinc-300 font-semibold text-xs">2. AWS Bedrock ($3/1M tokens, no PDF support)</p>
              <p className="mt-0.5">Add <code className="bg-zinc-800 px-1 rounded">AWS_ACCESS_KEY_ID</code>, <code className="bg-zinc-800 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>, <code className="bg-zinc-800 px-1 rounded">AWS_REGION</code></p>
            </div>
            <div className="border border-zinc-700 rounded-lg p-2">
              <p className="text-zinc-300 font-semibold text-xs">3. Anthropic ($3/1M tokens, best PDF support)</p>
              <p className="mt-0.5">Add <code className="bg-zinc-800 px-1 rounded">ANTHROPIC_API_KEY</code> — <FixLink href="https://console.anthropic.com/billing">Top up at console.anthropic.com/billing</FixLink></p>
            </div>
          </div>
          <p className="mt-2 text-zinc-500">After adding keys, redeploy: <code className="bg-zinc-800 px-1 rounded">npm run deploy</code></p>
        </FixBox>
      ) : health && anyCredit && !anyAiOk ? (
        <FixBox>
          <p className="font-semibold text-amber-300">AI analysis paused — सबै providers को credit सकियो।</p>
          {anthropicCredit && <p className="mt-1">Anthropic: <FixLink href="https://console.anthropic.com/billing">console.anthropic.com/billing</FixLink></p>}
          {geminiCredit    && <p className="mt-1">Gemini: <FixLink href="https://console.cloud.google.com/billing">console.cloud.google.com/billing</FixLink></p>}
          <p className="mt-1 text-zinc-500">Documents are safe in R2. AI analysis resumes automatically once any provider has credits.</p>
        </FixBox>
      ) : undefined,
    },
    {
      label:  "Seed data",
      status: sigLoad || docLoad ? "loading"
             : signals.length > 0 || docs.length > 0 ? "ok"
             : "warn",
      detail: sigLoad || docLoad ? "Checking…"
             : signals.length > 0 || docs.length > 0
               ? `${signals.length} signals · ${docs.length} intelligence documents`
               : "No signals or documents found — run setup script to seed initial data.",
      fix: signals.length === 0 && docs.length === 0 && !sigLoad && !docLoad ? (
        <FixBox>
          <p>Run the one-time setup script from the project root:</p>
          <code className="block bg-zinc-800 px-2 py-1 rounded mt-1">node scripts/setup.js</code>
          <p className="mt-1">Prerequisite: <code className="bg-zinc-800 px-1 rounded">serviceAccountKey-prod.json</code> must be in the project root (already done if you just ran setup).</p>
        </FixBox>
      ) : undefined,
    },
  ];

  const allOk    = checks.every(c => c.status === "ok");
  const hasError = checks.some(c => c.status === "error");

  // ── Data derived for stats ──────────────────────────────────────────────────

  const rawCount       = signals.filter(s => s.status === "raw").length;
  const validatedCount = signals.filter(s => s.status === "validated").length;
  const rejectedCount  = signals.filter(s => s.status === "rejected").length;
  const promotedCount  = signals.filter(s => s.status === "promoted").length;

  const activeSources = sources.filter(s => s.status === "active");
  const lastChecked   = activeSources
    .filter(s => s.lastCheckedAt)
    .sort((a, b) => (b.lastCheckedAt! > a.lastCheckedAt! ? 1 : -1))[0];

  const pendingQueue  = queue.filter(q => q.status === "pending").length;
  const approvedQueue = queue.filter(q => q.status === "approved").length;

  const errors = [sigErr, srcErr, qErr, healthErr].filter(Boolean) as string[];

  const HCFG: Record<PipelineHealth, { label: string; dot: string; cls: string }> = {
    healthy:      { label: "Pipeline पूरा",  dot: "bg-emerald-400", cls: "text-emerald-400" },
    in_progress:  { label: "प्रक्रियामा",    dot: "bg-blue-400",    cls: "text-blue-400"    },
    needs_action: { label: "Action चाहिन्छ", dot: "bg-amber-400",   cls: "text-amber-400"   },
    stuck:        { label: "अड्किएको",       dot: "bg-red-400",     cls: "text-red-400"     },
    suspect:      { label: "संदिग्ध",        dot: "bg-zinc-500",    cls: "text-zinc-500"    },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* ── Founder header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Vault Health</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Pipeline · Infrastructure · AI Providers
          </p>
        </div>
        <Link
          href="/vault/system-cleanup"
          className="text-xs border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 rounded-lg px-3 py-1.5 transition-colors shrink-0"
        >
          🧹 Data Cleanup →
        </Link>
      </div>

      {/* ── Pipeline Health ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Document Pipeline</h2>
        {(pipelineLoading || docLoad) ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-900 animate-pulse" />)}
          </div>
        ) : pipelineStates && pipelineStates.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-4 flex items-center gap-3">
            <span className="text-zinc-600 text-sm">कुनै document upload भएको छैन।</span>
            <Link href="/vault/documents?upload=1" className="text-xs text-cyan-400 hover:text-cyan-300 underline ml-auto">
              Document Upload गर्नुहोस् →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Health tally cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 sm:col-span-1">
                <div className="text-2xl font-black text-white">{pipelineStates?.length ?? 0}</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Documents</div>
              </div>
              {(["healthy", "needs_action", "stuck", "suspect"] as PipelineHealth[]).map(h => {
                const count = healthTally?.[h] ?? 0;
                const cfg   = HCFG[h];
                return (
                  <div key={h} className={`bg-zinc-900 border rounded-xl px-4 py-3 ${
                    count > 0 && h !== "healthy" ? "border-zinc-700" : "border-zinc-800"
                  }`}>
                    <div className={`text-2xl font-black ${count > 0 ? cfg.cls : "text-zinc-700"}`}>{count}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${count > 0 ? cfg.dot : "bg-zinc-800"}`} />
                      <span className="text-[11px] text-zinc-500">{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action-needed docs */}
            {pipelineStates && pipelineStates.filter(s => s.health === "stuck" || s.health === "needs_action").length > 0 && (
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl px-4 py-3 space-y-1.5">
                <p className="text-amber-400 text-xs font-semibold mb-2">Action चाहिन्छ:</p>
                {pipelineStates
                  .filter(s => s.health === "stuck" || s.health === "needs_action")
                  .slice(0, 5)
                  .map(s => (
                    <div key={s.docId} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${HCFG[s.health].dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs truncate">{s.title}</p>
                        <p className="text-zinc-500 text-[10px]">{s.statusNp}</p>
                      </div>
                      <Link href={s.nextActionHref} className="text-cyan-500 text-[10px] hover:text-cyan-400 shrink-0">
                        Fix →
                      </Link>
                    </div>
                  ))
                }
                {pipelineStates.filter(s => s.health === "stuck" || s.health === "needs_action").length > 5 && (
                  <Link href="/vault/system-cleanup" className="text-zinc-600 text-[10px] hover:text-zinc-400">
                    + {pipelineStates.filter(s => s.health === "stuck" || s.health === "needs_action").length - 5} more — Data Cleanup हेर्नुहोस् →
                  </Link>
                )}
              </div>
            )}

            {/* All healthy banner */}
            {pipelineStates && healthTally && !healthTally.stuck && !healthTally.needs_action && (
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-emerald-400 text-lg">✓</span>
                <p className="text-emerald-400 text-sm">सबै documents pipeline मा OK छन्</p>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Firestore errors (separate from checklist) */}
      {errors.map(e => (
        <div key={e} className="flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3">
          <span className="text-red-400 text-sm mt-0.5">✕</span>
          <p className="text-xs text-red-300/90">{e}</p>
        </div>
      ))}

      {/* ── Setup Checklist ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">System Health</h2>
          {allOk && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-800">
              All systems operational
            </span>
          )}
          {hasError && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-800">
              Action required
            </span>
          )}
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4">
          {checks.map(item => <CheckRow key={item.label} item={item} />)}
        </div>
      </section>

      {/* ── Signal counts ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Intelligence Signals</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : sigErr ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat label="Total"     value={signals.length} />
            <Stat label="Raw"       value={rawCount}       sub="pending review" />
            <Stat label="Validated" value={validatedCount} />
            <Stat label="Promoted"  value={promotedCount}  sub="in queue" />
            <Stat label="Rejected"  value={rejectedCount}  />
          </div>
        )}
      </section>

      {/* ── Monitored sources ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Monitored Sources</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : srcErr ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Active" value={activeSources.length} />
            <Stat label="Total"  value={sources.length} />
            <Stat
              label="Last checked"
              value={lastChecked?.name ?? "—"}
              sub={lastChecked?.lastCheckedAt
                ? new Date(lastChecked.lastCheckedAt).toLocaleString()
                : undefined}
            />
          </div>
        )}
      </section>

      {/* ── Content queue ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Content Queue</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : qErr ? null : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total"    value={queue.length} />
            <Stat label="Pending"  value={pendingQueue}  sub="awaiting approval" />
            <Stat label="Approved" value={approvedQueue} sub="ready for AI Studio" />
          </div>
        )}
      </section>

      {/* ── AI Provider Diagnostics ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            AI Provider Diagnostics
          </h2>
          {health && (
            <a href="/api/health?probe=true" target="_blank" rel="noopener noreferrer"
               className="text-xs text-zinc-500 hover:text-zinc-300 underline">
              Run live probe ↗
            </a>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              key:      "gemini" as const,
              label:    "Gemini Flash",
              tier:     "cheap",
              tierColor:"text-emerald-400",
              cost:     "$0.075 / 1M tokens",
              supports: "Text · PDF · Images",
              setupLink:"https://aistudio.google.com/app/apikey",
              setupVar: "GEMINI_API_KEY",
            },
            {
              key:      "bedrock" as const,
              label:    "Bedrock Haiku",
              tier:     "standard",
              tierColor:"text-blue-400",
              cost:     "$0.80 / 1M tokens",
              supports: "Text · Images (no PDF)",
              setupLink:"https://console.aws.amazon.com/bedrock",
              setupVar: "AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION",
            },
            {
              key:      "anthropic" as const,
              label:    "Anthropic Sonnet",
              tier:     "premium",
              tierColor:"text-purple-400",
              cost:     "$3 / 1M tokens",
              supports: "Text · PDF · Images",
              setupLink:"https://console.anthropic.com/billing",
              setupVar: "ANTHROPIC_API_KEY",
            },
          ].map(p => {
            const h      = health ? health[p.key] : null;
            const status = h?.status ?? "loading";
            const isCredit = status === "credit_low";
            const isOk     = status === "ok" || status === "configured";
            const isUnset  = status === "unconfigured";
            return (
              <div key={p.key} className={`bg-zinc-900 border rounded-xl p-4 space-y-2 ${
                isCredit ? "border-amber-800/60" : isOk ? "border-zinc-700" : "border-zinc-800"
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-white">{p.label}</span>
                  <ProviderBadge status={status} />
                </div>
                <div className={`text-xs font-medium ${p.tierColor}`}>{p.cost}</div>
                <div className="text-xs text-zinc-500">{p.supports}</div>
                {h?.model && <div className="text-xs text-zinc-600 font-mono truncate">{h.model}</div>}
                {h?.latencyMs && <div className="text-xs text-zinc-600">{h.latencyMs}ms</div>}
                {isCredit && (
                  <a href={p.setupLink} target="_blank" rel="noopener noreferrer"
                     className="block text-xs text-amber-400 underline hover:text-amber-300">
                    Top up credits ↗
                  </a>
                )}
                {isUnset && (
                  <div className="text-xs text-zinc-600">
                    <span className="font-mono bg-zinc-800 px-1 rounded">{p.setupVar}</span>
                  </div>
                )}
                {h?.error && !isCredit && (
                  <div className="text-xs text-red-400 truncate">{h.error}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Technical Details (collapsible) ── */}
      <section>
        <button
          onClick={() => setTechExpanded(p => !p)}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <span>{techExpanded ? "▾" : "▸"}</span>
          Technical Details
        </button>

        {techExpanded && (
          <div className="mt-4 space-y-6">
            {/* AI workers */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">
                AI Workers
                {health && (
                  <span className="ml-2 text-zinc-700 font-normal normal-case tracking-normal">
                    — checked {new Date(health.timestamp).toLocaleTimeString()}
                  </span>
                )}
              </h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4">
                {AI_WORKERS.map(w => <WorkerRow key={w.name} w={w} health={health} />)}
              </div>
            </div>

            {/* Scheduled jobs */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-600 mb-3">Scheduled Jobs</h3>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4">
                {[
                  { name: "update-rates.yml",          schedule: "Daily 12:15 UTC", purpose: "Scrape EPF/SSF/CIT market rates" },
                  { name: "poll-monitored-sources.yml", schedule: "Hourly :30",     purpose: "Poll active sources → SourceSignals" },
                ].map(job => (
                  <div key={job.name} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                    <div>
                      <div className="text-sm font-mono text-zinc-200">{job.name}</div>
                      <div className="text-xs text-zinc-500">{job.purpose}</div>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono">{job.schedule}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Quick links ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Quick Links</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[
            { label: "Firebase Console",           href: "https://console.firebase.google.com/project/zeneration-z-chautari" },
            { label: "Firebase Authentication",    href: "https://console.firebase.google.com/project/zeneration-z-chautari/authentication/providers" },
            { label: "Firebase Storage",           href: "https://console.firebase.google.com/project/zeneration-z-chautari/storage" },
            { label: "Cloudflare Pages",           href: "https://dash.cloudflare.com" },
            { label: "Admin Vault",                href: "/vault/admin" },
            { label: "Data Cleanup",               href: "/vault/system-cleanup" },
            { label: "Content Queue",              href: "/vault/content/queue" },
          ].map(l => (
            l.href.startsWith("http") ? (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                 className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                <span>{l.label}</span>
                <span className="text-zinc-600">↗</span>
              </a>
            ) : (
              <Link key={l.label} href={l.href}
                    className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors">
                <span>{l.label}</span>
                <span className="text-zinc-600">→</span>
              </Link>
            )
          ))}
        </div>
      </section>
    </div>
  );
}
