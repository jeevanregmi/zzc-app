"use client";

import Link from "next/link";

const SECTION_GROUPS = [
  {
    label: "Content",
    sections: [
      {
        href: "/vault/content",
        icon: "🎬", label: "Content Pipeline",
        desc: "YouTube · Shorts · Facebook",
        stat: "10 ideas · 1 script ready", statColor: "text-yellow-400",
        badge: "Active", badgeColor: "bg-yellow-900/40 text-yellow-400",
        actions: [
          { label: "AI Studio",   href: "/vault/content/ai-studio" },
          { label: "First Video", href: "/vault/content/youtube/first-video" },
          { label: "Ideas",       href: "/vault/content/youtube/ideas" },
        ],
      },
      {
        href: "/vault/content/ai-studio",
        icon: "⚡", label: "AI Studio",
        desc: "Script · Thumbnail · Generation",
        stat: "Bedrock live", statColor: "text-green-400",
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
        href: "/vault/finance",
        icon: "💰", label: "Finance",
        desc: "Budget · Revenue · ROI · Runway",
        stat: "In roadmap", statColor: "text-zinc-600",
        badge: "Soon", badgeColor: "bg-zinc-800 text-zinc-500",
        actions: [],
      },
      {
        href: "/vault/documents",
        icon: "📄", label: "Documents",
        desc: "Contracts · Legal · Reports",
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

const QUICK_ACTIONS = [
  { href: "/vault/content/ai-studio",             label: "⚡ Generate Script",     color: "border-green-900/50 hover:border-green-600" },
  { href: "/vault/content/ai-studio",             label: "🖼 Generate Thumbnail",   color: "border-green-900/50 hover:border-green-600" },
  { href: "/vault/content/youtube/first-video",   label: "🎬 First Video Brief",    color: "border-yellow-900/50 hover:border-yellow-600" },
  { href: "/vault/media",                         label: "📤 Upload Asset",         color: "border-zinc-800 hover:border-zinc-600" },
  { href: "/vault/business",                      label: "📊 Business BI",          color: "border-zinc-800 hover:border-zinc-600" },
  { href: "/vault/deploy",                        label: "🚀 Deploy Status",        color: "border-zinc-800 hover:border-zinc-600" },
];

const PIPELINE_STATUS = [
  { label: "AI Script Gen",        status: "live",    note: "/api/generate-script" },
  { label: "AI Thumbnail Prompt",  status: "live",    note: "/api/generate-thumbnail-prompt" },
  { label: "AI Recommend",         status: "live",    note: "/api/recommend" },
  { label: "Media Upload",         status: "live",    note: "Firebase Storage" },
  { label: "Image Generation",     status: "pending", note: "Needs TOGETHER_API_KEY" },
  { label: "Voice Narration",      status: "pending", note: "Needs ELEVENLABS_API_KEY" },
];

const STATUS_DOT: Record<string, string> = {
  live:    "bg-green-500",
  pending: "bg-zinc-600",
  error:   "bg-red-500",
};

export default function VaultClient() {
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-0.5">Command Center</h1>
        <p className="text-zinc-500 text-sm">ZZC Vault — private operations dashboard</p>
      </div>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUICK_ACTIONS.map(a => (
            <Link
              key={a.label}
              href={a.href}
              className={`px-4 py-3 bg-zinc-900 border rounded-xl text-sm text-zinc-300 hover:text-white transition-colors text-center ${a.color}`}
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
                <div key={s.href} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
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

      {/* Pipeline status */}
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
