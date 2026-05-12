"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../app/firebase";

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { href: "/vault",                       icon: "◈",  label: "Overview" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/vault/content",               icon: "🎬", label: "Content Pipeline" },
      { href: "/vault/content/ai-studio",     icon: "⚡", label: "AI Studio" },
      { href: "/vault/media",                 icon: "🎞", label: "Media" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/vault/business",              icon: "📊", label: "Business BI" },
      { href: "/vault/analytics",             icon: "📈", label: "Analytics" },
      { href: "/vault/tasks",                 icon: "✅", label: "Tasks" },
      { href: "/vault/calendar",              icon: "📅", label: "Calendar" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/vault/finance",               icon: "💰", label: "Finance" },
      { href: "/vault/documents",             icon: "📄", label: "Documents" },
      { href: "/vault/deploy",                icon: "🚀", label: "Deploy" },
      { href: "/vault/ai-queue",              icon: "🤖", label: "AI Queue" },
    ],
  },
];

export const VAULT_NAV = NAV_GROUPS.flatMap(g => g.items);

export function VaultShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  function isActive(href: string) {
    return pathname === href || (href !== "/vault" && pathname.startsWith(href));
  }

  function NavItem({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick?: () => void }) {
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
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-56 bg-zinc-950 border-r border-zinc-900 fixed h-full z-10">
        <div className="p-4 border-b border-zinc-900">
          <Link href="/vault" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <span className="text-base">🔐</span>
            <div>
              <p className="font-bold text-white text-sm leading-none">ZZC Vault</p>
              <p className="text-zinc-600 text-xs mt-0.5">Operating System</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto space-y-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && (
                <p className="px-3 pt-1 pb-0.5 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map(n => (
                  <NavItem key={n.href} {...n} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-2 border-t border-zinc-900 space-y-0.5">
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

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/vault" className="font-bold text-sm text-white flex items-center gap-2">
          <span>🔐</span> ZZC Vault
        </Link>
        <button
          onClick={() => setMobileOpen(p => !p)}
          className="text-zinc-400 text-lg w-8 h-8 flex items-center justify-center"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-12 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 p-2 max-h-[80vh] overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="mb-2">
              {group.label && (
                <p className="px-3 py-1 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.items.map(n => (
                <NavItem key={n.href} {...n} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
          ))}
          <div className="border-t border-zinc-900 pt-2 mt-1">
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

      {/* Main content */}
      <main className="flex-1 lg:ml-56 pt-12 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
