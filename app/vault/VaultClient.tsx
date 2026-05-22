"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useVaultAuth }        from "../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../hooks/vault/useIntelligenceDocs";
import { useQueueItems }       from "../../hooks/vault/useQueueItems";
import { useSourceSignals }    from "../../hooks/vault/useSourceSignals";
import type { IntelligenceDocument } from "../../lib/types/documents";
import type { QueueItem }            from "../../lib/types/queue";

// ─── Utilities ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1)  return "भर्खर";
  if (m < 60) return `${m} मिनेट अघि`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} घण्टा अघि`;
  return `${Math.floor(h / 24)} दिन अघि`;
}

// ─── Workflow Breadcrumb ──────────────────────────────────────────────────────

function WorkflowBreadcrumb({
  docCount, awaitingAI, pendingReview, queuePending, inProduction,
}: {
  docCount: number; awaitingAI: number; pendingReview: number;
  queuePending: number; inProduction: number;
}) {
  const steps = [
    {
      label:  "Upload",
      nepali: "Upload",
      value:  docCount,
      href:   "/vault/documents",
      done:   docCount > 0,
      active: docCount === 0,
    },
    {
      label:  "AI Analysis",
      nepali: "AI विश्लेषण",
      value:  awaitingAI,
      href:   "/vault/documents",
      done:   docCount > 0 && awaitingAI === 0,
      active: awaitingAI > 0,
    },
    {
      label:  "Admin Review",
      nepali: "Review",
      value:  pendingReview,
      href:   "/vault/admin?tab=documents",
      done:   pendingReview === 0 && docCount > 0,
      active: pendingReview > 0,
    },
    {
      label:  "Content Queue",
      nepali: "Queue",
      value:  queuePending,
      href:   "/vault/content/queue",
      done:   queuePending === 0 && inProduction > 0,
      active: queuePending > 0,
    },
    {
      label:  "Production",
      nepali: "Production",
      value:  inProduction,
      href:   "/vault/content/queue",
      done:   inProduction > 0,
      active: false,
    },
  ];

  return (
    <div className="mb-5 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
        Content Flywheel — स्रोत → विश्लेषण → Review → Publish
      </p>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center gap-1 shrink-0">
            <Link
              href={step.href}
              className={`flex flex-col items-center px-3 py-2 rounded-xl transition-colors text-center min-w-16 ${
                step.active
                  ? "bg-cyan-900/40 border border-cyan-700"
                  : step.done
                  ? "bg-green-950/40 border border-green-900"
                  : "bg-zinc-800/50 border border-zinc-800"
              }`}
            >
              <span className={`text-lg font-black leading-none ${
                step.active ? "text-cyan-400" : step.done ? "text-green-400" : "text-zinc-600"
              }`}>
                {step.active && step.value > 0 ? step.value : step.done ? "✓" : "–"}
              </span>
              <span className={`text-xs mt-0.5 whitespace-nowrap ${
                step.active ? "text-cyan-300" : step.done ? "text-green-400" : "text-zinc-600"
              }`}>
                {step.nepali}
              </span>
            </Link>
            {i < steps.length - 1 && (
              <span className="text-zinc-700 text-xs px-0.5">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Founder Focus ("आज के गर्ने?") ──────────────────────────────────────────

interface FocusAction {
  level:  "urgent" | "normal" | "good";
  icon:   string;
  title:  string;
  nepali: string;
  href:   string;
  cta:    string;
}

function buildFocusActions(
  awaitingAI: number,
  pendingReview: number,
  queuePending: number,
  docCount: number,
): FocusAction[] {
  const actions: FocusAction[] = [];

  if (pendingReview > 0) {
    actions.push({
      level:  "urgent",
      icon:   "📋",
      title:  `${pendingReview} document${pendingReview > 1 ? "s" : ""} need your approval`,
      nepali: `${pendingReview} document${pendingReview > 1 ? "हरू" : ""} review को लागि पर्खिरहेको छ — AI analysis सकिएको छ`,
      href:   "/vault/admin?tab=documents",
      cta:    "Review गर्नुहोस् →",
    });
  }

  if (awaitingAI > 0) {
    actions.push({
      level:  "urgent",
      icon:   "🤖",
      title:  `${awaitingAI} document${awaitingAI > 1 ? "s" : ""} waiting for AI analysis`,
      nepali: `${awaitingAI} document upload भइसकेको छ — AI ले अझै analyze गरेको छैन`,
      href:   "/vault/documents",
      cta:    "Analyze गर्नुहोस् →",
    });
  }

  if (queuePending > 0) {
    actions.push({
      level:  "normal",
      icon:   "📥",
      title:  `${queuePending} content idea${queuePending > 1 ? "s" : ""} pending queue review`,
      nepali: `${queuePending} content idea queue मा छ — approve गर्नुहोस् वा reject गर्नुहोस्`,
      href:   "/vault/content/queue",
      cta:    "Queue हेर्नुहोस् →",
    });
  }

  if (docCount === 0) {
    actions.push({
      level:  "normal",
      icon:   "📤",
      title:  "Upload your first intelligence document",
      nepali: "NRB circular, EPF document, वा research file upload गर्नुहोस् — AI ले analyze गर्नेछ",
      href:   "/vault/documents",
      cta:    "Upload गर्नुहोस् →",
    });
  }

  if (actions.length === 0) {
    actions.push({
      level:  "good",
      icon:   "✅",
      title:  "Everything looks good!",
      nepali: "सबै कुरा ठिक छ — नयाँ document upload गर्न वा content generate गर्न सुरु गर्नुहोस्",
      href:   "/vault/content/ai-studio",
      cta:    "Content Generate गर्नुहोस् →",
    });
  }

  return actions;
}

function FounderFocus({
  awaitingAI, pendingReview, queuePending, docCount,
}: {
  awaitingAI: number; pendingReview: number; queuePending: number; docCount: number;
}) {
  const actions = useMemo(
    () => buildFocusActions(awaitingAI, pendingReview, queuePending, docCount),
    [awaitingAI, pendingReview, queuePending, docCount],
  );

  const hasUrgent = actions.some(a => a.level === "urgent");

  return (
    <div className={`mb-5 rounded-2xl border p-4 ${
      hasUrgent
        ? "bg-amber-950/20 border-amber-900/60"
        : "bg-green-950/20 border-green-900/40"
    }`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${
        hasUrgent ? "text-amber-400" : "text-green-400"
      }`}>
        आज के गर्ने? — Today&apos;s Priorities
      </p>
      <div className="space-y-2">
        {actions.map((a, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
            a.level === "urgent" ? "bg-amber-950/40 border border-amber-900/60" :
            a.level === "good"   ? "bg-green-950/40 border border-green-900/40" :
                                   "bg-zinc-800/60  border border-zinc-700/60"
          }`}>
            <span className="text-xl shrink-0 mt-0.5">{a.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{a.title}</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{a.nepali}</p>
            </div>
            <Link
              href={a.href}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors ${
                a.level === "urgent" ? "bg-amber-600 hover:bg-amber-500 text-black" :
                a.level === "good"   ? "bg-green-700 hover:bg-green-600 text-white" :
                                       "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              {a.cta}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

type ActivityEntry = {
  time: string; icon: string; color: string; label: string; nepali: string; detail: string; href: string;
};

function buildActivityFeed(docs: IntelligenceDocument[], queue: QueueItem[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  docs.forEach(doc => {
    entries.push({
      time:   doc.uploadedAt,
      icon:   "📤",
      color:  "text-zinc-400",
      label:  "Uploaded",
      nepali: "Upload भयो",
      detail: doc.fileName,
      href:   "/vault/documents",
    });
    if (doc.processingStatus === "ai_ready") {
      entries.push({
        time:   doc.updatedAt,
        icon:   "🤖",
        color:  "text-green-400",
        label:  "AI analyzed",
        nepali: "AI analysis सकियो",
        detail: doc.title,
        href:   "/vault/admin?tab=documents",
      });
    }
    if (doc.adminApprovalStatus === "approved") {
      entries.push({
        time:   doc.adminApprovedAt ?? doc.updatedAt,
        icon:   "✓",
        color:  "text-green-400",
        label:  "Approved",
        nepali: "Approved भयो",
        detail: doc.title,
        href:   "/vault/documents",
      });
    }
    if (doc.adminApprovalStatus === "needs_revision") {
      entries.push({
        time:   doc.updatedAt,
        icon:   "⚠",
        color:  "text-amber-400",
        label:  "Revision needed",
        nepali: "Revision चाहिन्छ",
        detail: doc.title,
        href:   "/vault/admin?tab=documents",
      });
    }
  });

  queue.forEach(item => {
    entries.push({
      time:   item.createdAt,
      icon:   "💡",
      color:  "text-cyan-400",
      label:  "Idea queued",
      nepali: "Idea queue मा",
      detail: item.aiTitle,
      href:   "/vault/content/queue",
    });
    if (item.status === "approved" && item.approvedAt) {
      entries.push({
        time:   item.approvedAt,
        icon:   "✓",
        color:  "text-green-400",
        label:  "Queue approved",
        nepali: "Queue approved",
        detail: item.aiTitle,
        href:   "/vault/content/ai-studio",
      });
    }
    if (item.status === "in_production") {
      entries.push({
        time:   item.updatedAt,
        icon:   "🚀",
        color:  "text-emerald-400",
        label:  "In production",
        nepali: "Production मा",
        detail: item.aiTitle,
        href:   "/vault/content/queue",
      });
    }
  });

  return entries.sort((a, b) => b.time.localeCompare(a.time)).slice(0, 6);
}

function ActivityFeed({ docs, queue }: { docs: IntelligenceDocument[]; queue: QueueItem[] }) {
  const entries = useMemo(() => buildActivityFeed(docs, queue), [docs, queue]);
  if (entries.length === 0) return null;

  return (
    <section className="mb-5">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        हालसालैका काम — Recent Activity
      </h2>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {entries.map((e, i) => (
          <Link
            key={`${e.time}-${i}`}
            href={e.href}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors border-b border-zinc-800/60 last:border-b-0 group"
          >
            <span className={`text-sm w-5 text-center shrink-0 ${e.color}`}>{e.icon}</span>
            <span className="text-xs text-zinc-500 w-24 shrink-0">{e.nepali}</span>
            <span className="text-xs text-zinc-300 flex-1 truncate group-hover:text-white transition-colors">{e.detail}</span>
            <span className="text-xs text-zinc-600 shrink-0 tabular-nums">{timeAgo(e.time)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions({
  awaitingAI, pendingReview, queuePending,
}: {
  awaitingAI: number; pendingReview: number; queuePending: number;
}) {
  const actions = [
    ...(pendingReview > 0
      ? [{ href: "/vault/admin?tab=documents", label: `📋 Approve Documents (${pendingReview})`, color: "border-amber-800 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60" }]
      : []
    ),
    ...(awaitingAI > 0
      ? [{ href: "/vault/documents", label: `🤖 Analyze Documents (${awaitingAI})`, color: "border-yellow-800 bg-yellow-950/30 text-yellow-300 hover:bg-yellow-950/60" }]
      : [{ href: "/vault/documents", label: "📤 Upload Document", color: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500" }]
    ),
    ...(queuePending > 0
      ? [{ href: "/vault/content/queue", label: `📥 Review Queue (${queuePending})`, color: "border-cyan-800 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-950/60" }]
      : [{ href: "/vault/content/queue", label: "📥 Content Queue", color: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500" }]
    ),
    { href: "/vault/content/ai-studio", label: "⚡ Generate Script",    color: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500" },
    { href: "/vault/business",          label: "📊 Business Dashboard", color: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500" },
    { href: "/vault/admin",             label: "🔐 Admin Vault",        color: "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500" },
  ];

  return (
    <section className="mb-5">
      <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        एक क्लिक Actions
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {actions.map(a => (
          <Link
            key={a.label}
            href={a.href}
            className={`px-3 py-2.5 border rounded-xl text-xs font-medium transition-colors text-center ${a.color}`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

// ─── Section grid ─────────────────────────────────────────────────────────────

function SectionGrid({
  docCount, awaitingAI, pendingReview, queuePending, queueApproved,
}: {
  docCount: number; awaitingAI: number; pendingReview: number;
  queuePending: number; queueApproved: number;
}) {
  const GROUPS = [
    {
      label: "Intelligence Pipeline",
      nepali: "दस्तावेज → AI → Review → Content",
      items: [
        {
          href: "/vault/documents", icon: "📄", label: "Intelligence Library",
          nepali: "NRB, EPF, SSF documents upload र AI analysis",
          stat: docCount > 0
            ? `${docCount} docs${awaitingAI > 0 ? ` · ${awaitingAI} AI pending` : pendingReview > 0 ? ` · ${pendingReview} review pending` : " · up to date"}`
            : "कोही document छैन — upload गर्नुहोस्",
          statColor: awaitingAI > 0 ? "text-yellow-400" : pendingReview > 0 ? "text-amber-400" : docCount > 0 ? "text-green-400" : "text-zinc-600",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "NRB circulars, EPF/SSF policy documents, research files — AI ले analyze गर्छ र content ideas generate गर्छ",
        },
        {
          href: "/vault/admin?tab=documents", icon: "📋", label: "Admin Approval",
          nepali: "AI analysis भएका documents review र approve गर्नुहोस्",
          stat: pendingReview > 0
            ? `${pendingReview} document${pendingReview > 1 ? "s" : ""} review को पर्खाइमा`
            : "Review queue खाली छ",
          statColor: pendingReview > 0 ? "text-amber-400" : "text-zinc-600",
          badge: pendingReview > 0 ? "Action needed" : "All clear",
          badgeColor: pendingReview > 0 ? "bg-amber-900/40 text-amber-400" : "bg-zinc-800 text-zinc-500",
          tip: "Document approve भएपछि मात्र content queue generation unlock हुन्छ",
        },
        {
          href: "/vault/content/queue", icon: "📥", label: "Content Queue",
          nepali: "Approved ideas — content production को लागि review",
          stat: queuePending > 0
            ? `${queuePending} pending · ${queueApproved} approved`
            : queueApproved > 0
            ? `${queueApproved} approved — production ready`
            : "Queue खाली छ",
          statColor: queuePending > 0 ? "text-cyan-400" : queueApproved > 0 ? "text-green-400" : "text-zinc-600",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Document approve → queue items generate → admin approve → AI Studio मा script/thumbnail generate",
        },
      ],
    },
    {
      label: "Content Production",
      nepali: "Script, Thumbnail, YouTube, Shorts",
      items: [
        {
          href: "/vault/content/ai-studio", icon: "⚡", label: "AI Studio",
          nepali: "Script र thumbnail AI ले generate गर्छ",
          stat: "Bedrock + Anthropic active",
          statColor: "text-green-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Approved queue items लिएर AI Studio मा script र thumbnail prompt generate गर्नुहोस्",
        },
        {
          href: "/vault/content", icon: "🎬", label: "Content Pipeline",
          nepali: "YouTube, Shorts, Facebook — सबै platforms",
          stat: "YouTube · Facebook · Shorts",
          statColor: "text-zinc-400",
          badge: "Active", badgeColor: "bg-zinc-800 text-zinc-400",
          tip: "Platform-specific content strategy र production workflow",
        },
        {
          href: "/vault/calendar", icon: "📅", label: "Calendar",
          nepali: "Content publishing schedule — monthly view",
          stat: "Publishing calendar",
          statColor: "text-zinc-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Queue items लाई date assign गरेर publishing schedule बनाउनुहोस्",
        },
      ],
    },
    {
      label: "Business Intelligence",
      nepali: "Revenue, खर्च, AI लागत, Analytics",
      items: [
        {
          href: "/vault/business", icon: "📊", label: "Business Dashboard",
          nepali: "Revenue, खर्च, NRB rate, Founder brief",
          stat: "Live NRB rate · NPR/USD",
          statColor: "text-blue-400",
          badge: "Live", badgeColor: "bg-blue-900/40 text-blue-400",
          tip: "Revenue track गर्नुहोस्, खर्च record गर्नुहोस्, AI ले financial brief दिन्छ",
        },
        {
          href: "/vault/finance", icon: "💰", label: "Finance",
          nepali: "P&L, runway, monthly burn rate",
          stat: "Full P&L dashboard",
          statColor: "text-green-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Revenue vs expenses, monthly trend, annual projection",
        },
        {
          href: "/vault/analytics", icon: "📈", label: "Analytics",
          nepali: "Pipeline throughput, AI usage, leads",
          stat: "Platform intelligence",
          statColor: "text-purple-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Document pipeline, recommendation clicks, audience leads",
        },
      ],
    },
    {
      label: "Operations",
      nepali: "Tasks, Deploy, AI Queue",
      items: [
        {
          href: "/vault/tasks", icon: "✅", label: "Tasks",
          nepali: "Kanban board — content, tech, business tasks",
          stat: "Todo · In Progress · Done",
          statColor: "text-zinc-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Priority, category, due date सहित task manage गर्नुहोस्",
        },
        {
          href: "/vault/ai-queue", icon: "🤖", label: "AI Queue",
          nepali: "AI job log, cost, failed analysis retry",
          stat: "Job log · Retry center",
          statColor: "text-zinc-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Failed AI jobs retry गर्नुहोस्, cost per call हेर्नुहोस्",
        },
        {
          href: "/vault/deploy", icon: "🚀", label: "Deploy Monitor",
          nepali: "API health, environment variables check",
          stat: "API · Providers · Config",
          statColor: "text-zinc-400",
          badge: "Live", badgeColor: "bg-green-900/40 text-green-400",
          tip: "Cloudflare Pages deploy status, AI provider health check",
        },
      ],
    },
  ];

  return (
    <section className="mb-6 space-y-5">
      {GROUPS.map(group => (
        <div key={group.label}>
          <div className="flex items-baseline gap-2 mb-2">
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{group.label}</h2>
            <span className="text-xs text-zinc-600">{group.nepali}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {group.items.map(s => (
              <Link
                key={s.href + s.label}
                href={s.href}
                title={s.tip}
                className="p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl transition-colors group block"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span className="font-semibold text-sm text-white group-hover:text-green-400 transition-colors">
                      {s.label}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${s.badgeColor}`}>{s.badge}</span>
                </div>
                <p className="text-xs text-zinc-500 mb-2 leading-relaxed">{s.nepali}</p>
                <p className={`text-xs font-medium ${s.statColor}`}>{s.stat}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VaultClient() {
  const { user }  = useVaultAuth();
  const uid       = user?.uid ?? null;

  const { docs,         error: docErr   } = useIntelligenceDocs(uid);
  const { items: queue, error: queueErr  } = useQueueItems(uid, "all");
  const { signals }                        = useSourceSignals(uid, "all");

  const docCount      = docs.length;
  const awaitingAI    = docs.filter(d => d.processingStatus === "ready" || d.processingStatus === "ai_paused").length;
  const pendingReview = docs.filter(d => d.adminApprovalStatus === "pending_review" && d.processingStatus === "ai_ready").length;
  const queuePending  = queue.filter(i => i.status === "pending").length;
  const queueApproved = queue.filter(i => i.status === "approved").length;
  const inProduction  = queue.filter(i => i.status === "in_production").length;
  const rawSignals    = signals.filter(s => s.status === "raw").length;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-white">ZZC Vault</h1>
          {rawSignals > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-800">
              {rawSignals} new signals
            </span>
          )}
        </div>
        <p className="text-zinc-500 text-sm mt-0.5">
          Founder Operating System — Nepal&apos;s Civic Intelligence Platform
        </p>
      </div>

      {/* Error banners */}
      {docErr   && <div className="mb-4 flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3 text-xs text-red-300/90">⚠ Intelligence library: {docErr}</div>}
      {queueErr && <div className="mb-4 flex items-start gap-2 bg-red-950/40 border border-red-900/60 rounded-xl px-4 py-3 text-xs text-red-300/90">⚠ Content queue: {queueErr}</div>}

      {/* TODAY'S PRIORITIES — always first */}
      <FounderFocus
        awaitingAI={awaitingAI}
        pendingReview={pendingReview}
        queuePending={queuePending}
        docCount={docCount}
      />

      {/* Workflow breadcrumb */}
      <WorkflowBreadcrumb
        docCount={docCount}
        awaitingAI={awaitingAI}
        pendingReview={pendingReview}
        queuePending={queuePending}
        inProduction={inProduction}
      />

      {/* Recent activity */}
      <ActivityFeed docs={docs} queue={queue} />

      {/* One-click actions */}
      <QuickActions
        awaitingAI={awaitingAI}
        pendingReview={pendingReview}
        queuePending={queuePending}
      />

      {/* Section grid — all pages with Nepali explanations */}
      <SectionGrid
        docCount={docCount}
        awaitingAI={awaitingAI}
        pendingReview={pendingReview}
        queuePending={queuePending}
        queueApproved={queueApproved}
      />

    </div>
  );
}
