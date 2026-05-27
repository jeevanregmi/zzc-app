"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../app/firebase";
import { useVaultAuth } from "../../hooks/vault/useVaultAuth";
import { useIntelligenceDocs } from "../../hooks/vault/useIntelligenceDocs";
import { useQueueItems } from "../../hooks/vault/useQueueItems";
import { useSourceSignals } from "../../hooks/vault/useSourceSignals";
import { LearningModeProvider, useLearningMode } from "../../contexts/LearningModeContext";
import { FounderModeProvider, useFounderMode } from "../../contexts/FounderModeContext";
import { CTOAssistant } from "./CTOAssistant";

// ─── Primary nav — always visible ─────────────────────────────────────────────
const PRIMARY_NAV = [
  { href: "/vault",                   icon: "◈", label: "Overview"      },
  { href: "/vault/vision",            icon: "🌱", label: "Vision Vault"  },
  { href: "/vault/qa",                icon: "🎯", label: "QA Sprint"     },
  { href: "/vault/management",        icon: "🏛", label: "Management OS"  },
  { href: "/vault/documents",         icon: "◻", label: "Documents"     },
  { href: "/vault/admin",             icon: "⬡", label: "Admin Vault"   },
  { href: "/vault/content/queue",     icon: "◆", label: "Content Queue" },
  { href: "/vault/business",          icon: "◈", label: "Business"      },
  { href: "/vault/content/ai-studio", icon: "⚡", label: "AI Studio"    },
];

// ─── Advanced nav — behind toggle ─────────────────────────────────────────────
const ADVANCED_GROUPS = [
  {
    label: "Tree Intelligence OS",
    items: [
      { href: "/vault/system-map",           icon: "🗺", label: "System Map"      },
      { href: "/vault/atoms",               icon: "⚛", label: "Civic Atoms OS"  },
      { href: "/vault/constitution/health", icon: "🩺", label: "Branch Health"   },
      { href: "/vault/constitution",        icon: "📜", label: "Constitution"     },
      { href: "/constitution",              icon: "🌳", label: "Public Tree"      },
      { href: "/vault/products",            icon: "📦", label: "Products"         },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/vault/sources",               icon: "📡", label: "Source Radar"  },
      { href: "/vault/content/intelligence",  icon: "◉", label: "Signal Feed"   },
      { href: "/vault/routing",               icon: "◈", label: "Routing"       },
      { href: "/vault/ssf",                   icon: "◎", label: "SSF Copilot"   },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/vault/content",  icon: "▶", label: "Pipeline" },
      { href: "/vault/media",    icon: "◎", label: "Media"    },
      { href: "/vault/calendar", icon: "◆", label: "Calendar" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/vault/revenue",        icon: "◆", label: "Revenue"        },
      { href: "/vault/analytics",      icon: "◉", label: "Analytics"      },
      { href: "/vault/tasks",          icon: "◻", label: "Tasks"          },
      { href: "/vault/finance",        icon: "◈", label: "Finance"        },
      { href: "/vault/public-preview", icon: "◎", label: "Public Preview" },
      { href: "/vault/schemes",        icon: "◻", label: "Schemes"        },
      { href: "/vault/public-data",    icon: "◈", label: "Market Rates"   },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/vault/system",   icon: "◉", label: "System"    },
      { href: "/vault/deploy",   icon: "▶", label: "Deploy"    },
      { href: "/vault/ai-queue", icon: "⚡", label: "AI Queue" },
    ],
  },
];

const ADVANCED_HREFS = new Set(ADVANCED_GROUPS.flatMap(g => g.items.map(i => i.href)));

// Flat list for legacy consumers
export const VAULT_NAV = [
  ...PRIMARY_NAV,
  ...ADVANCED_GROUPS.flatMap(g => g.items),
];

// ─── Founder / Debug mode toggle ─────────────────────────────────────────────

function FounderModeToggle() {
  const { isDebug, toggle } = useFounderMode();
  return (
    <button
      onClick={toggle}
      title={isDebug
        ? "Founder Mode मा फर्कनुहोस् — simplified, guided, Nepali-first"
        : "Debug Mode — raw counts, collection names, developer detail"}
      className={
        "w-full flex items-center gap-2 px-3 py-2 text-xs transition-all rounded-xl border " +
        (isDebug
          ? "text-orange-300 bg-orange-950/50 border-orange-800 hover:bg-orange-950/70"
          : "text-zinc-500 bg-zinc-900/50 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700")
      }
    >
      <span className="text-sm shrink-0">{isDebug ? "🛠" : "🧠"}</span>
      <div className="flex-1 text-left min-w-0">
        <span className="font-bold block leading-none">{isDebug ? "Debug Mode" : "Founder Mode"}</span>
        <span className={`text-[9px] leading-none mt-0.5 block ${isDebug ? "text-orange-500" : "text-zinc-700"}`}>
          {isDebug ? "Technical detail सक्रिय" : "Guided · Nepali-first"}
        </span>
      </div>
      {isDebug && <span className="shrink-0 w-2 h-2 rounded-full bg-orange-400" />}
    </button>
  );
}

// ─── Learning mode toggle ─────────────────────────────────────────────────────

function LearningModeToggle() {
  const { on, toggle } = useLearningMode();
  return (
    <button
      onClick={toggle}
      title={on
        ? "Learning Mode बन्द गर्नुहोस्"
        : "Nepali Learning Mode — हरेक term को Nepali explanation, civic document guidance, pipeline journey"}
      className={
        "w-full flex items-center gap-2 px-3 py-2 text-xs transition-all rounded-xl border " +
        (on
          ? "text-cyan-300 bg-cyan-950/60 border-cyan-800 hover:bg-cyan-950/80"
          : "text-zinc-500 bg-zinc-900/50 border-zinc-800 hover:text-cyan-400 hover:border-cyan-900/50 hover:bg-cyan-950/20")
      }
    >
      <span className="text-sm shrink-0">🎓</span>
      <div className="flex-1 text-left min-w-0">
        <span className="font-bold block leading-none">{on ? "Civic Learning Mode" : "Civic Learning Mode"}</span>
        <span className={`text-[9px] leading-none mt-0.5 block ${on ? "text-cyan-500" : "text-zinc-700"}`}>
          {on ? "सक्रिय — Nepali explanations चालु छन्" : "Nepali मा सिक्नुहोस्"}
        </span>
      </div>
      {on && (
        <span className="shrink-0 w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
      )}
    </button>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function VaultShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Auto-expand advanced section if current page is an advanced page
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    ADVANCED_HREFS.has(pathname) || [...ADVANCED_HREFS].some(h => pathname.startsWith(h + "/")),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const { user } = useVaultAuth();
  const { docs }         = useIntelligenceDocs(user?.uid ?? null);
  const { items: queue } = useQueueItems(user?.uid ?? null, "all");
  const { signals }      = useSourceSignals(user?.uid ?? null, "raw");

  const queuePending     = queue.filter(i => i.status === "pending").length;
  const awaitingAI       = docs.filter(d => d.processingStatus === "ready" || d.processingStatus === "ai_paused").length;
  const rawSignalCount   = signals.length;
  const pendingDocReview = docs.filter(d =>
    d.processingStatus === "ai_ready" &&
    (!d.adminApprovalStatus || d.adminApprovalStatus === "pending_review"),
  ).length;
  const adminVaultTotal  = rawSignalCount + pendingDocReview + queuePending;

  function navBadge(href: string): number | undefined {
    if (href === "/vault/admin"                && adminVaultTotal > 0) return adminVaultTotal;
    if (href === "/vault/documents"            && awaitingAI      > 0) return awaitingAI;
    if (href === "/vault/content/intelligence" && rawSignalCount  > 0) return rawSignalCount;
    if (href === "/vault/content/queue"        && queuePending    > 0) return queuePending;
    return undefined;
  }

  function isActive(href: string) {
    return pathname === href || (href !== "/vault" && pathname.startsWith(href));
  }

  function NavItem({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick?: () => void }) {
    const badge = navBadge(href);
    return (
      <Link
        href={href}
        onClick={onClick}
        className={
          "flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-colors " +
          (isActive(href)
            ? "bg-zinc-800 text-white"
            : "text-zinc-500 hover:text-white hover:bg-zinc-900")
        }
      >
        <span className="text-sm w-4 text-center shrink-0">{icon}</span>
        <span className="truncate flex-1">{label}</span>
        {badge !== undefined && (
          <span className="ml-1 text-xs font-bold leading-none px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 shrink-0">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  // Total pending badge for the "More tools" toggle
  const advancedTotalBadge = (() => {
    const n = navBadge("/vault/content/intelligence");
    return n;
  })();

  function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {/* Primary items */}
        <div className="space-y-0.5">
          {PRIMARY_NAV.map(n => (
            <NavItem key={n.href} {...n} onClick={onNavigate} />
          ))}
        </div>

        {/* Advanced toggle */}
        <button
          onClick={() => setAdvancedOpen(p => !p)}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900 mt-1"
        >
          <span className="w-4 text-center text-base">{advancedOpen ? "▾" : "▸"}</span>
          <span className="flex-1 text-left">More tools</span>
          {!advancedOpen && advancedTotalBadge !== undefined && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400">
              {advancedTotalBadge}
            </span>
          )}
        </button>

        {/* Advanced items */}
        {advancedOpen && (
          <div className="space-y-3 mt-1 border-l border-zinc-800/60 ml-3 pl-2">
            {ADVANCED_GROUPS.map(group => (
              <div key={group.label}>
                <p className="px-2 py-0.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(n => (
                    <NavItem key={n.href} {...n} onClick={onNavigate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  return (
    <LearningModeProvider>
    <FounderModeProvider>
    <div className="min-h-screen bg-black text-white flex">

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-52 bg-zinc-950 border-r border-zinc-900 fixed h-full z-10">
        <div className="p-4 border-b border-zinc-900">
          <Link href="/vault" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <span className="text-base">🔐</span>
            <div>
              <p className="font-bold text-white text-sm leading-none">ZZC Vault</p>
              <p className="text-zinc-600 text-xs mt-0.5">Founder OS</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto space-y-0.5">
          <SidebarContent />
        </nav>

        <div className="p-2 border-t border-zinc-900 space-y-0.5">
          <FounderModeToggle />
          <LearningModeToggle />
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900"
          >
            <span className="w-4 text-center text-base">←</span>
            <span>Public site</span>
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900"
          >
            <span className="w-4 text-center">⎋</span>
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/vault" className="font-bold text-sm text-white flex items-center gap-2">
          <span>🔐</span> ZZC Vault
        </Link>
        <div className="flex items-center gap-2">
          {adminVaultTotal > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
              {adminVaultTotal} pending
            </span>
          )}
          <button
            onClick={() => setMobileOpen(p => !p)}
            className="text-zinc-400 text-lg w-8 h-8 flex items-center justify-center"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* ── Mobile dropdown ──────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-12 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 p-2 max-h-[80vh] overflow-y-auto">
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
          <div className="border-t border-zinc-900 pt-2 mt-2">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-zinc-600 hover:text-zinc-400 rounded-lg"
            >
              ← Public site
            </Link>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-52 pt-12 lg:pt-0 min-h-screen">
        {children}
      </main>

      {/* ── CTO Assistant — persistent floating dock ──────────────────────── */}
      <CTOAssistant uid={user?.uid ?? null} />
    </div>
    </FounderModeProvider>
    </LearningModeProvider>
  );
}
