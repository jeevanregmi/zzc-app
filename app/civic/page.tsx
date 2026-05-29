import type { Metadata } from "next";
import Link from "next/link";
import { CivicFeedClient } from "./CivicFeedClient";

export const metadata: Metadata = {
  title: "Civic Chautari — नागरिक ज्ञान",
  description:
    "Nepal's civic intelligence gateway. Constitutional intelligence, government reports, policy explainers — source-backed, founder-verified.",
};

const MAIN_PATHS = [
  {
    href:    "/constitution",
    icon:    "📜",
    title:   "संविधान",
    en:      "Constitutional Intelligence",
    desc:    "Nepal ko sambidhan — article by article, part by part, source-backed civic foundation.",
    color:   "emerald",
    badge:   "Layer 1 · Static",
  },
  {
    href:    "/janta",
    icon:    "📊",
    title:   "जन्ता Intelligence",
    en:      "Public Civic Intelligence Feed",
    desc:    "Verified policy facts, government decisions, and civic explainers from official documents.",
    color:   "teal",
    badge:   "Layer 2 · Live",
  },
  {
    href:    "/janta",
    icon:    "📁",
    title:   "Reports र Documents",
    en:      "Source-Backed Reports",
    desc:    "NHRC, CIAA, Auditor General, NRB — official reports with page-level atomic intelligence.",
    color:   "blue",
    badge:   "Atomic · Page-traced",
  },
] as const;

const CIVIC_TOOLS = [
  { href: "/calculator",  label: "Calculator",    icon: "÷" },
  { href: "/compare",     label: "तुलना",         icon: "⚖" },
  { href: "/recommend",   label: "AI सिफारिस",    icon: "⚡" },
  { href: "/eligibility", label: "योग्यता",        icon: "✓" },
  { href: "/finance",     label: "Finance",        icon: "📈" },
] as const;

const colorMap = {
  emerald: {
    border:  "border-emerald-800/40 hover:border-emerald-700/60",
    bg:      "bg-emerald-950/10 hover:bg-emerald-950/20",
    icon:    "text-emerald-300",
    title:   "text-emerald-300",
    badge:   "bg-emerald-950/60 text-emerald-500 border-emerald-800/50",
    arrow:   "text-emerald-500",
  },
  teal: {
    border:  "border-teal-800/40 hover:border-teal-700/60",
    bg:      "bg-teal-950/10 hover:bg-teal-950/20",
    icon:    "text-teal-300",
    title:   "text-teal-300",
    badge:   "bg-teal-950/60 text-teal-500 border-teal-800/50",
    arrow:   "text-teal-500",
  },
  blue: {
    border:  "border-blue-800/40 hover:border-blue-700/60",
    bg:      "bg-blue-950/10 hover:bg-blue-950/20",
    icon:    "text-blue-300",
    title:   "text-blue-300",
    badge:   "bg-blue-950/60 text-blue-500 border-blue-800/50",
    arrow:   "text-blue-500",
  },
};

export default function CivicPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
        <span>/</span>
        <span className="text-emerald-500">Civic Chautari</span>
      </div>

      {/* Hero */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🏛</span>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white">Civic Chautari</h1>
            <p className="text-emerald-500 text-sm font-semibold">नागरिक ज्ञान चौतारी</p>
          </div>
        </div>
        <p className="text-zinc-400 text-base max-w-xl leading-relaxed">
          Constitutional intelligence, verified government reports, and civic explainers —
          all source-backed and founder-approved.
        </p>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-600 text-xs font-mono">Source-backed · Founder-verified · No fake AI facts</span>
        </div>
      </div>

      {/* Main knowledge paths */}
      <div className="space-y-3">
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">Knowledge Paths</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MAIN_PATHS.map(({ href, icon, title, en, desc, color, badge }) => {
            const c = colorMap[color];
            return (
              <Link
                key={title}
                href={href}
                className={`group flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-200 ${c.border} ${c.bg}`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-2xl ${c.icon}`}>{icon}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.badge}`}>
                    {badge}
                  </span>
                </div>
                <div>
                  <p className={`font-black text-base ${c.title}`}>{title}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{en}</p>
                </div>
                <p className="text-zinc-500 text-xs leading-relaxed flex-1">{desc}</p>
                <div className={`flex items-center gap-1 text-xs font-bold ${c.arrow} group-hover:translate-x-0.5 transition-transform`}>
                  हेर्नुहोस् →
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Live Knowledge Feed ── */}
      <CivicFeedClient />

      {/* Civic utilities — secondary */}
      <div className="space-y-3">
        <p className="text-zinc-600 text-xs uppercase tracking-widest font-mono">Civic Tools</p>
        <div className="flex flex-wrap gap-2">
          {CIVIC_TOOLS.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/60 hover:border-zinc-700 transition text-sm text-zinc-400 hover:text-white"
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
        <p className="text-zinc-700 text-xs">
          Calculators, comparisons र financial tools — civic utilities, not the main identity.
        </p>
      </div>

      {/* Coming soon */}
      <div className="rounded-2xl border border-zinc-800/50 bg-zinc-950/40 px-5 py-4 space-y-2">
        <p className="text-zinc-500 text-xs uppercase tracking-widest font-mono">Coming</p>
        <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
          <span>📰 Civic Media Cards</span>
          <span>·</span>
          <span>📋 Policy Explainers</span>
          <span>·</span>
          <span>🔍 Source Report Explorer</span>
          <span>·</span>
          <span>⚖ Rights Database</span>
        </div>
        <p className="text-zinc-700 text-[11px]">
          Vault बाट atomic intelligence approve भएपछि यी pages live हुनेछन्।
        </p>
      </div>

    </main>
  );
}
