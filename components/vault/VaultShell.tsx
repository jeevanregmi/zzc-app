"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../app/firebase";

export const VAULT_NAV = [
  { href: "/vault",           icon: "◈",  label: "Overview" },
  { href: "/vault/media",     icon: "🎞", label: "Media" },
  { href: "/vault/content",   icon: "🎬", label: "Content" },
  { href: "/vault/documents", icon: "📄", label: "Documents" },
  { href: "/vault/business",  icon: "📊", label: "Business BI" },
  { href: "/vault/ai-queue",  icon: "⚡", label: "AI Queue" },
];

export function VaultShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-52 bg-zinc-950 border-r border-zinc-900 fixed h-full z-10">
        <div className="p-4 border-b border-zinc-900">
          <Link href="/vault" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-lg">🔐</span>
            <span className="font-bold text-white text-sm">ZZC Vault</span>
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {VAULT_NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className={
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                ((pathname === n.href || (n.href !== "/vault" && pathname.startsWith(n.href)))
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-900")
              }
            >
              <span className="text-base">{n.icon}</span>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-900 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900"
          >
            <span>←</span> Public site
          </Link>
          <button
            onClick={() => signOut(auth)}
            className="w-full text-left px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors rounded-lg hover:bg-zinc-900"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href="/vault" className="font-bold text-sm text-white">🔐 ZZC Vault</Link>
        <button onClick={() => setMobileOpen(p => !p)} className="text-zinc-400 text-lg">
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="lg:hidden fixed top-12 left-0 right-0 z-20 bg-zinc-950 border-b border-zinc-900 p-3 space-y-0.5">
          {VAULT_NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setMobileOpen(false)}
              className={
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors " +
                ((pathname === n.href || (n.href !== "/vault" && pathname.startsWith(n.href)))
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900")
              }
            >
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-zinc-900 mt-2">
            <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 rounded-lg">
              ← Public site
            </Link>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 lg:ml-52 pt-14 lg:pt-0 min-h-screen">
        {children}
      </main>
    </div>
  );
}
