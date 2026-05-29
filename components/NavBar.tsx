"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESKTOP_LINKS = [
  { href: "/civic",   label: "🏛 Civic",  exact: false },
  { href: "/bhakti",  label: "🛕 Bhakti", exact: false },
  { href: "/janta",   label: "जन्ता",     exact: false },
] as const;

const MOBILE_BOTTOM = [
  { href: "/",       label: "होम",   icon: "⊞", exact: true  },
  { href: "/civic",  label: "Civic", icon: "🏛", exact: false },
  { href: "/janta",  label: "जन्ता", icon: "📰", exact: false },
  { href: "/bhakti", label: "Bhakti",icon: "🛕", exact: false },
  { href: "/vault",  label: "Vault", icon: "⚙", exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();
  const inVault  = pathname.startsWith("/vault");

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

          <Link href="/" className="text-xl sm:text-2xl font-black tracking-tight shrink-0">
            <span className="text-emerald-400">Z</span><span className="text-violet-400">Z</span><span className="text-white">C</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-0.5 text-sm font-semibold">
            {DESKTOP_LINKS.map(({ href, label, exact }) => {
              const active = isActive(pathname, href, exact);
              const isCivic  = href === "/civic";
              const isBhakti = href === "/bhakti";
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-2 rounded-xl transition text-sm font-semibold ${
                    active
                      ? isCivic  ? "text-white bg-emerald-950/60 border border-emerald-800/60"
                      : isBhakti ? "text-white bg-violet-950/60 border border-violet-800/60"
                                 : "text-white bg-zinc-800"
                      : isCivic  ? "text-emerald-400 hover:text-white hover:bg-emerald-950/40"
                      : isBhakti ? "text-violet-400 hover:text-white hover:bg-violet-950/40"
                                 : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  {label}
                </Link>
              );
            })}

            <Link
              href="/vault"
              className={`ml-4 px-3 py-2 rounded-xl transition text-xs border ${
                inVault
                  ? "border-zinc-600 text-zinc-300"
                  : "border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600"
              }`}
            >
              Dashboard →
            </Link>
          </div>

          {/* Mobile: vault shortcut only (bottom nav covers the rest) */}
          <Link
            href="/vault"
            className="sm:hidden text-zinc-600 hover:text-white border border-zinc-800 px-3 py-1.5 rounded-lg transition text-xs"
          >
            Vault →
          </Link>
        </div>
      </nav>

      {/* ── Mobile bottom nav (hidden on sm+, hidden inside vault) ── */}
      {!inVault && (
        <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-black/95 backdrop-blur border-t border-zinc-800">
          <div className="flex items-end justify-around px-2 pt-2 pb-3">
            {MOBILE_BOTTOM.map(({ href, label, icon, exact }) => {
              const active  = isActive(pathname, href, exact);
              const color   = href === "/civic"  ? "text-emerald-400"
                            : href === "/bhakti" ? "text-violet-400"
                            : active             ? "text-white"
                                                 : "text-zinc-500";
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
                    active ? color : "text-zinc-500"
                  }`}
                >
                  <span className="text-lg leading-none">{icon}</span>
                  <span className="text-[10px] font-semibold">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
