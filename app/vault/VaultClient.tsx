"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useVaultAuth } from "../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../hooks/vault/useIntelligenceDocs";
import { useQueueItems } from "../../hooks/vault/useQueueItems";
import type { IntelligenceDocument } from "../../lib/types/documents";
import type { QueueItem } from "../../lib/types/queue";

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Pipeline status config (static + live below) ────────────────────────────

const PIPELINE_STATUS = [
  { label: "AI Script Generation",   status: "live",    note: "/api/generate-script → Bedrock" },
  { label: "AI Thumbnail Prompts",   status: "live",    note: "/api/generate-thumbnail-prompt → Bedrock" },
  { label: "AI Recommend",           status: "live",    note: "/api/recommend → Bedrock" },
  { label: "Document Intelligence",  status: "live",    note: "/api/process-document → Anthropic" },
  { label: "Content Queue",          status: "live",    note: "vault_content_queue → Firestore" },
  { label: "Media Upload",           status: "live",    note: "Firebase Storage" },
  { label: "Image Generation",       status: "pending", note: "Needs TOGETHER_API_KEY" },
  { label: "Voice Narration",        status: "pending", note: "Needs ELEVENLABS_API_KEY" },
];

const STATUS_DOT: Record<string, string> = {
  live:    "bg-green-500",
  pending: "bg-zinc-600",
  error:   "bg-red-500",
};

// ─── Flywheel bar ─────────────────────────────────────────────────────────────

function FlywheelBar({
  docCount, awaitingAI, queueTotal, queuePending, inProduction,
}: {
  docCount: number; awaitingAI: number; queueTotal: number; queuePending: number; inProduction: number;
}) {
  const nodes = [
    {
      label: "Documents",
      value: docCount,
      href:  "/vault/documents",
      color: docCount > 0 ? "text-zinc-200" : "text-zinc-600",
      pulse: false,
    },
    {
      label: "Awaiting AI",
      value: awaitingAI,
      href:  "/vault/documents",
      color: awaitingAI > 0 ? "text-yellow-400" : "text-zinc-600",
      pulse: awaitingAI > 0,
    },
    {
      label: "In Queue",
      value: queueTotal,
      href:  "/vault/content/queue",
      color: queuePending > 0 ? "text-cyan-400" : queueTotal > 0 ? "text-zinc-300" : "text-zinc-600",
      pulse: false,
    },
    {
      label: "Production",
      value: inProduction,
      href:  "/vault/content/queue",
      color: inProduction > 0 ? "text-green-400" : "text-zinc-600",
      pulse: inProduction > 0,
    },
  ];

  const isActive = docCount > 0 || queueTotal > 0;

  return (
    <div className="mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Intelligence Flywheel</span>
        <span className={`text-xs flex items-center gap-1.5 ${isActive ? "text-green-500" : "text-zinc-600"}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-zinc-600"}`} />
          {isActive ? "active" : "empty"}
        </span>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        {nodes.map((node, i) => (
          <div key={node.label} className="flex items-center gap-1 sm:gap-2 flex-1">
            <Link
              href={node.href}
              className="flex-1 flex flex-col items-center py-2.5 px-1 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors text-center"
            >
              <span className={`text-2xl font-black leading-none tabular-nums ${node.color} ${node.pulse ? "animate-pulse" : ""}`}>
                {node.value}
              </span>
              <span className="text-xs text-zinc-500 mt-1 leading-tight">{node.label}</span>
            </Link>
            {i < nodes.length - 1 && (
              <span className="text-zinc-700 text-xs shrink-0">→</span>
            )}
          </div>
        ))}
      </div>
      {queuePending > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
          <p className="text-xs text-cyan-400">
            {queuePending} item{queuePending !== 1 ? "s" : ""} pending review in queue
          </p>
          <Link href="/vault/content/queue" className="text-xs text-cyan-600 hover:text-cyan-400 ml-auto transition-colors">
            Review →
          </Link>
        </div>
      )}
      {awaitingAI > 0 && queuePending === 0 && (
        <div className="mt-3 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
          <p className="text-xs text-yellow-400">
            {awaitingAI} document{awaitingAI !== 1 ? "s" : ""} awaiting AI analysis
          </p>
          <Link href="/vault/documents" className="text-xs text-yellow-600 hover:text-yellow-400 ml-auto transition-colors">
            Analyze →
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

type ActivityEntry = {
  time: string; icon: string; color: string; label: string; detail: string; href: string;
};

function buildActivityFeed(docs: IntelligenceDocument[], queue: QueueItem[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  docs.forEach(doc => {
    entries.push({
      time:   doc.uploadedAt,
      icon:   "📤",
      color:  "text-zinc-500",
      label:  "Uploaded",
      detail: doc.fileName,
      href:   "/vault/documents",
    });
    if (doc.processingStatus === "ai_ready") {
      entries.push({
        time:   doc.updatedAt,
        icon:   "🤖",
        color:  "text-green-500",
        label:  "AI analyzed",
        detail: doc.title,
        href:   "/vault/documents",
      });
    }
    if (doc.processingStatus === "processing_ai") {
      entries.push({
        time:   doc.updatedAt,
        icon:   "⚙",
        color:  "text-amber-500",
        label:  "Analyzing…",
        detail: doc.title,
        href:   "/vault/documents",
      });
    }
  });

  queue.forEach(item => {
    entries.push({
      time:   item.createdAt,
      icon:   "💡",
      color:  "text-cyan-500",
      label:  "Idea queued",
      detail: item.aiTitle,
      href:   "/vault/content/queue",
    });
    if (item.approvedAt) {
      entries.push({
        time:   item.approvedAt,
        icon:   "✓",
        color:  "text-green-400",
        label:  "Approved",
        detail: item.aiTitle,
        href:   `/vault/content/ai-studio?queueId=${item.id}&title=${encodeURIComponent(item.aiTitle)}`,
      });
    }
    if (item.status === "in_production") {
      entries.push({
        time:   item.updatedAt,
        icon:   "🚀",
        color:  "text-emerald-400",
        label:  "In production",
        detail: item.aiTitle,
        href:   "/vault/content/queue",
      });
    }
  });

  return entries.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8);
}

function ActivityFeed({ docs, queue }: { docs: IntelligenceDocument[]; queue: QueueItem[] }) {
  const entries = useMemo(() => buildActivityFeed(docs, queue), [docs, queue]);

  if (entries.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent Activity</h2>
        <span className="text-xs text-zinc-700">last {entries.length} events</span>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {entries.map((e, i) => (
          <Link
            key={`${e.time}-${i}`}
            href={e.href}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/60 last:border-b-0 group"
          >
            <span className={`text-sm w-5 text-center shrink-0 ${e.color}`}>{e.icon}</span>
            <span className="text-xs text-zinc-500 w-20 shrink-0">{e.label}</span>
            <span className="text-xs text-zinc-300 flex-1 truncate group-hover:text-white transition-colors">{e.detail}</span>
            <span className="text-xs text-zinc-600 shrink-0 tabular-nums">{timeAgo(e.time)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VaultClient() {
  const { user } = useVaultAuth();
  const { docs,         error: docErr  } = useIntelligenceDocs(user?.uid ?? null);
  const { items: queue, error: queueErr } = useQueueItems(user?.uid ?? null, "all");

  const docCount     = docs.length;
  const awaitingAI   = docs.filter(d => d.processingStatus === "ready").length;
  const queuePending = queue.filter(i => i.status === "pending").length;
  const queueApproved = queue.filter(i => i.status === "approved").length;
  const inProduction = queue.filter(i => i.status === "in_production").length;
  const queueActive  = queue.filter(i => i.status === "pending" || i.status === "approved").length;

  // ── Section groups (live-aware) ──────────────────────────────────────────
  const SECTION_GROUPS = [
    {
      label: "Content",
      sections: [
        {
          href: "/vault/content",
          icon: "🎬", label: "Content Pipeline",
          desc: "YouTube · Shorts · Facebook",
          stat: "Production hub", statColor: "text-zinc-400",
          badge: "Active", badgeColor: "bg-zinc-800 text-zinc-400",
          actions: [
            { label: "First Video Brief", href: "/vault/content/youtube/first-video" },
            { label: "Ideas",             href: "/vault/content/youtube/ideas" },
          ],
        },
        {
          href: "/vault/content/queue",
          icon: "📥", label: "Validation Queue",
          desc: "AI ideas → admin review → production",
          stat: queuePending > 0
            ? `${queuePending} pending review`
            : queueApproved > 0
            ? `${queueApproved} approved`
            : queue.length > 0
            ? `${queue.length} total`
            : "No items yet",
          statColor: queuePending > 0 ? "text-cyan-400" : queueApproved > 0 ? "text-green-400" : "text-zinc-600",
          badge: queuePending > 0 ? "Needs review" : "Live",
          badgeColor: queuePending > 0 ? "bg-cyan-900/40 text-cyan-400" : "bg-green-900/40 text-green-400",
          actions: [
            {
              label: queuePending > 0 ? `Review (${queuePending})` : queue.length > 0 ? "View Queue" : "Empty",
              href: "/vault/content/queue",
            },
          ],
        },
        {
          href: "/vault/content/ai-studio",
          icon: "⚡", label: "AI Studio",
          desc: "Script · Thumbnail · Generation",
          stat: "Bedrock + Anthropic live", statColor: "text-green-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          actions: [
            { label: "Generate Script",    href: "/vault/content/ai-studio" },
            { label: "Generate Thumbnail", href: "/vault/content/ai-studio" },
          ],
        },
        {
          href: "/vault/media",
          icon: "🎞", label: "Media",
          desc: "Firebase Storage · Asset vault",
          stat: "Upload zone active", statColor: "text-green-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          actions: [
            { label: "Upload", href: "/vault/media" },
            { label: "Browse", href: "/vault/media" },
          ],
        },
      ],
    },
    {
      label: "Operations",
      sections: [
        {
          href: "/vault/business",
          icon: "📊", label: "Business BI",
          desc: "Revenue · Expenses · AI costs",
          stat: "Dashboard active", statColor: "text-blue-400",
          badge: "Live", badgeColor: "bg-blue-900/40 text-blue-400",
          actions: [{ label: "BI Dashboard", href: "/vault/business" }],
        },
        {
          href: "/vault/analytics",
          icon: "📈", label: "Analytics",
          desc: "Traffic · Engagement · Conversions",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
        {
          href: "/vault/tasks",
          icon: "✅", label: "Tasks",
          desc: "Kanban · Sprint · Operations",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
        {
          href: "/vault/calendar",
          icon: "📅", label: "Calendar",
          desc: "Publishing · Scheduling · YT / IG / FB",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
      ],
    },
    {
      label: "System",
      sections: [
        {
          href: "/vault/documents",
          icon: "📄", label: "Intelligence Library",
          desc: "NRB circulars · EPF docs · Research files",
          stat: docCount > 0
            ? `${docCount} doc${docCount !== 1 ? "s" : ""}${awaitingAI > 0 ? ` · ${awaitingAI} awaiting AI` : ""}`
            : "No documents yet",
          statColor: awaitingAI > 0 ? "text-yellow-400" : docCount > 0 ? "text-green-400" : "text-zinc-600",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          actions: [
            { label: "Upload Document", href: "/vault/documents" },
            ...(awaitingAI > 0 ? [{ label: `Analyze (${awaitingAI})`, href: "/vault/documents" }] : []),
          ],
        },
        {
          href: "/vault/finance",
          icon: "💰", label: "Finance",
          desc: "Budget · Revenue · ROI · Runway",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
        {
          href: "/vault/deploy",
          icon: "🚀", label: "Deploy Monitor",
          desc: "Cloudflare · Build status · Domain",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
        {
          href: "/vault/ai-queue",
          icon: "🤖", label: "AI Queue",
          desc: "Scheduled generation jobs",
          stat: "In roadmap", statColor: "text-zinc-600",
          badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
          actions: [],
        },
      ],
    },
  ];

  // ── Quick actions (context-aware) ─────────────────────────────────────────
  const QUICK_ACTIONS = [
    ...(awaitingAI > 0
      ? [{ href: "/vault/documents",       label: `🤖 Analyze (${awaitingAI})`,           color: "border-yellow-900/50 hover:border-yellow-500 text-yellow-300 hover:text-yellow-200" }]
      : [{ href: "/vault/documents",       label: "📤 Upload Document",                    color: "border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white" }]
    ),
    ...(queuePending > 0
      ? [{ href: "/vault/content/queue",   label: `📥 Review Queue (${queuePending})`,     color: "border-cyan-900/50 hover:border-cyan-500 text-cyan-300 hover:text-cyan-200" }]
      : [{ href: "/vault/content/queue",   label: "📥 View Queue",                         color: "border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white" }]
    ),
    { href: "/vault/content/ai-studio",    label: "⚡ Generate Script",                    color: "border-green-900/50 hover:border-green-600 text-zinc-300 hover:text-white" },
    { href: "/vault/content/ai-studio",    label: "🖼 Generate Thumbnail",                 color: "border-green-900/50 hover:border-green-600 text-zinc-300 hover:text-white" },
    { href: "/vault/media",                label: "📤 Upload Asset",                       color: "border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white" },
    { href: "/vault/business",             label: "📊 Business BI",                        color: "border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-0.5">Command Center</h1>
        <p className="text-zinc-500 text-sm">ZZC Vault — private operations dashboard</p>
      </div>

      {/* Firestore error banners */}
      {docErr   && <div className="mb-4 flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3"><span className="text-red-400 text-sm">✕</span><p className="text-xs text-red-300/90">Intelligence library unavailable: {docErr}</p></div>}
      {queueErr && <div className="mb-4 flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3"><span className="text-red-400 text-sm">✕</span><p className="text-xs text-red-300/90">Content queue unavailable: {queueErr}</p></div>}

      {/* Intelligence Flywheel — live pipeline state */}
      <FlywheelBar
        docCount={docCount}
        awaitingAI={awaitingAI}
        queueTotal={queue.length}
        queuePending={queuePending}
        inProduction={inProduction}
      />

      {/* Recent Activity Feed */}
      <ActivityFeed docs={docs} queue={queue} />

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.label}
              href={a.href}
              className={`px-4 py-3 bg-zinc-900 border rounded-xl text-sm transition-colors text-center ${a.color}`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Sections — grouped */}
      <section className="mb-8 space-y-6">
        {SECTION_GROUPS.map(group => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{group.label}</h2>
            <div className="space-y-2">
              {group.sections.map(s => (
                <div key={s.href + s.label} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link href={s.href} className="font-semibold text-white text-sm hover:text-green-400 transition-colors">
                            {s.label}
                          </Link>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-medium shrink-0 ml-2 ${s.statColor}`}>{s.stat}</span>
                  </div>
                  {s.actions.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {s.actions.map(a => (
                        <Link
                          key={a.href + a.label}
                          href={a.href}
                          className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-lg transition-colors"
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* AI Pipeline Status */}
      <section>
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">AI Pipeline Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PIPELINE_STATUS.map(p => (
            <div key={p.label} className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
              <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[p.status]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-300 font-medium">{p.label}</p>
                <p className="text-xs text-zinc-600 truncate">{p.note}</p>
              </div>
              <span className={`text-xs ${p.status === "live" ? "text-green-500" : "text-zinc-600"}`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
