"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DESKTOP_LINKS = [
  { href: "/",           label: "योजनाहरू", exact: true  },
  { href: "/eligibility",label: "योग्यता",  exact: false },
  { href: "/compare",    label: "तुलना",    exact: false },
  { href: "/calculator", label: "Calculator", exact: false },
] as const;

const MOBILE_BOTTOM = [
  { href: "/",           label: "होम",     icon: "⊞", exact: true,  primary: false },
  { href: "/compare",    label: "तुलना",   icon: "⚖", exact: false, primary: false },
  { href: "/recommend",  label: "AI",      icon: "⚡", exact: false, primary: true  },
  { href: "/calculator", label: "Calc",    icon: "÷", exact: false, primary: false },
  { href: "/eligibility",label: "योग्यता", icon: "✓", exact: false, primary: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export default function NavBar() {
  const pathname = usePathname();
  const inVault = pathname.startsWith("/vault");

  return (
    <>
      {/* ── Top bar ── */}
      <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur border-b border-zinc-800 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">

          <Link href="/" className="text-xl sm:text-2xl font-black text-green-400 tracking-tight shrink-0">
            ZZC
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-0.5 text-sm font-semibold">
            {DESKTOP_LINKS.map(({ href, label, exact }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 rounded-xl transition text-sm font-semibold ${
                  isActive(pathname, href, exact)
                    ? "text-white bg-zinc-800"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {label}
              </Link>
            ))}

            <Link
              href="/recommend"
              className={`ml-1 px-3 py-2 rounded-xl transition text-sm font-semibold ${
                isActive(pathname, "/recommend", false)
                  ? "bg-green-600 text-white"
                  : "text-green-400 hover:text-white hover:bg-green-900/40"
              }`}
            >
              ⚡ AI सिफारिस
            </Link>

            <Link
              href="/vault"
              className={`ml-4 px-3 py-2 rounded-xl transition text-xs border ${
                inVault
                  ? "border-green-800 text-green-400"
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
            {MOBILE_BOTTOM.map(({ href, label, icon, exact, primary }) => {
              const active = isActive(pathname, href, exact);
              if (primary) {
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-0.5 -mt-5 bg-green-500 text-black rounded-2xl px-4 py-3 shadow-lg shadow-green-900/50"
                  >
                    <span className="text-lg leading-none">{icon}</span>
                    <span className="text-[10px] font-black">{label}</span>
                  </Link>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
                    active ? "text-green-400" : "text-zinc-500"
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
