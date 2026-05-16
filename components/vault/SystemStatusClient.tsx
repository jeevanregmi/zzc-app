"use client";

import { useVaultAuth }        from "../../hooks/vault/useVaultAuth";
import { useSourceSignals }    from "../../hooks/vault/useSourceSignals";
import { useMonitoredSources } from "../../hooks/vault/useMonitoredSources";
import { useQueueItems }       from "../../hooks/vault/useQueueItems";

const AI_WORKERS = [
  { name: "recommend",              provider: "Anthropic",  model: "claude-opus-4-7",             status: "live"    },
  { name: "ingest-url",             provider: "Anthropic",  model: "claude-haiku-4-5-20251001",   status: "live"    },
  { name: "process-document",       provider: "Anthropic",  model: "claude-sonnet-4-6",           status: "live"    },
  { name: "generate-content-idea",  provider: "Anthropic",  model: "claude-haiku-4-5-20251001",   status: "live"    },
  { name: "generate-script",        provider: "Bedrock",    model: "us.anthropic.claude-sonnet-4-6", status: "quota" },
  { name: "generate-thumbnail",     provider: "Bedrock",    model: "us.anthropic.claude-sonnet-4-6", status: "quota" },
];

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-zinc-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-zinc-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function WorkerRow({ w }: { w: typeof AI_WORKERS[number] }) {
  const isQuota = w.status === "quota";
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
      <div>
        <div className="text-sm font-mono text-zinc-200">/api/{w.name}</div>
        <div className="text-xs text-zinc-500">{w.provider} · {w.model}</div>
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        isQuota
          ? "bg-yellow-900/40 text-yellow-400 border border-yellow-800"
          : "bg-emerald-900/40 text-emerald-400 border border-emerald-800"
      }`}>
        {isQuota ? "quota limited" : "live"}
      </span>
    </div>
  );
}

export default function SystemStatusClient() {
  const { user }                     = useVaultAuth();
  const { signals, loading: sigLoad }  = useSourceSignals(user?.uid ?? null, "all");
  const { sources, loading: srcLoad }  = useMonitoredSources(user?.uid ?? null);
  const { items:   queue,  loading: qLoad } = useQueueItems(user?.uid ?? null);

  const rawCount       = signals.filter(s => s.status === "raw").length;
  const validatedCount = signals.filter(s => s.status === "validated").length;
  const rejectedCount  = signals.filter(s => s.status === "rejected").length;
  const promotedCount  = signals.filter(s => s.status === "promoted").length;

  const activeSources = sources.filter(s => s.status === "active");
  const lastChecked   = activeSources
    .filter(s => s.lastCheckedAt)
    .sort((a, b) => (b.lastCheckedAt! > a.lastCheckedAt! ? 1 : -1))[0];

  const pendingQueue   = queue.filter(q => q.status === "pending").length;
  const approvedQueue  = queue.filter(q => q.status === "approved").length;

  const loading = sigLoad || srcLoad || qLoad;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">System Status</h1>
        <p className="text-sm text-zinc-500 mt-1">Live intelligence pipeline + AI worker health</p>
      </div>

      {/* Signal counts */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Intelligence Signals</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Stat label="Total"     value={signals.length} />
            <Stat label="Raw"       value={rawCount}       sub="pending review" />
            <Stat label="Validated" value={validatedCount} />
            <Stat label="Promoted"  value={promotedCount}  sub="in queue" />
            <Stat label="Rejected"  value={rejectedCount}  />
          </div>
        )}
      </section>

      {/* Monitored sources */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Monitored Sources</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Active"    value={activeSources.length} />
            <Stat label="Total"     value={sources.length} />
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

      {/* Content queue */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Content Queue</h2>
        {loading ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Stat label="Total"    value={queue.length} />
            <Stat label="Pending"  value={pendingQueue}  sub="awaiting approval" />
            <Stat label="Approved" value={approvedQueue} sub="ready for AI Studio" />
          </div>
        )}
      </section>

      {/* AI workers */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">AI Workers</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4">
          {AI_WORKERS.map(w => <WorkerRow key={w.name} w={w} />)}
        </div>
        <div className="mt-3 flex items-start gap-2 bg-yellow-950/30 border border-yellow-900/50 rounded-lg px-4 py-3">
          <span className="text-yellow-400 text-sm mt-0.5">⚠</span>
          <div className="text-xs text-yellow-300/80">
            <span className="font-medium">Bedrock daily quota:</span> generate-script and generate-thumbnail-prompt share a daily token quota on AWS Bedrock (us-east-1). If you hit 429 errors, wait for the quota to reset at midnight UTC. To increase: AWS Console → Bedrock → Quotas → Claude Sonnet 4.6 → Request TPM increase.
          </div>
        </div>
      </section>

      {/* Cron jobs */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-3">Scheduled Jobs</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4">
          {[
            { name: "update-rates.yml",             schedule: "Daily 12:15 UTC",  purpose: "Scrape EPF/SSF/CIT market rates" },
            { name: "poll-monitored-sources.yml",   schedule: "Hourly :30",       purpose: "Poll active sources → SourceSignals" },
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
      </section>
    </div>
  );
}
