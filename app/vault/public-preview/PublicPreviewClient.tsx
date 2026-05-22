"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { subscribeMarketRates, subscribeStructuredSchemes, type MarketRateDoc, type StructuredScheme } from "../../../lib/vault/firestore";
import { RATE_DEFINITIONS } from "../../../hooks/vault/usePublicDataControl";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReadinessLevel = "live" | "partial" | "empty" | "static";

interface PageStatus {
  page:        string;
  path:        string;
  readiness:   ReadinessLevel;
  headline:    string;
  detail:      string;
  dataSource:  string;
  adminHref?:  string;
  adminLabel?: string;
}

// ─── Readiness pill ───────────────────────────────────────────────────────────

function ReadinessPill({ level }: { level: ReadinessLevel }) {
  const styles: Record<ReadinessLevel, string> = {
    live:    "bg-green-900/50 text-green-400 border-green-800",
    partial: "bg-amber-900/40 text-amber-400 border-amber-800",
    empty:   "bg-red-900/30  text-red-400   border-red-900",
    static:  "bg-zinc-800    text-zinc-400  border-zinc-700",
  };
  const labels: Record<ReadinessLevel, string> = {
    live:    "◉ Live",
    partial: "◑ Partial",
    empty:   "○ Empty",
    static:  "— Static",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[level]}`}>
      {labels[level]}
    </span>
  );
}

// ─── Page status card ─────────────────────────────────────────────────────────

function PageCard({ status }: { status: PageStatus }) {
  return (
    <div className={`bg-zinc-900 border rounded-xl p-4 space-y-2 ${
      status.readiness === "live"    ? "border-green-900" :
      status.readiness === "partial" ? "border-amber-900" :
      status.readiness === "empty"   ? "border-red-900"   :
      "border-zinc-800"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">{status.page}</p>
            <ReadinessPill level={status.readiness} />
          </div>
          <p className="text-[10px] font-mono text-zinc-600">{status.path}</p>
        </div>
        <Link
          href={status.path}
          target="_blank"
          className="text-[10px] text-zinc-600 hover:text-zinc-400 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 rounded-lg transition-colors shrink-0"
        >
          Preview →
        </Link>
      </div>

      <p className="text-xs text-zinc-300">{status.headline}</p>
      <p className="text-xs text-zinc-500 leading-relaxed">{status.detail}</p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <p className="text-[10px] text-zinc-700 font-mono">Source: {status.dataSource}</p>
        {status.adminHref && (
          <Link
            href={status.adminHref}
            className="text-[10px] text-green-500 hover:text-green-400 transition-colors"
          >
            {status.adminLabel ?? "Manage →"}
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicPreviewClient() {
  const [rates,        setRates]        = useState<MarketRateDoc[]>([]);
  const [schemes,      setSchemes]      = useState<StructuredScheme[]>([]);
  const [ready,        setReady]        = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);

  // Fetch first image document from vault for hero background
  useEffect(() => {
    getDocs(query(
      collection(db, "vault_intelligence_docs"),
      where("fileType", "==", "image"),
      orderBy("uploadedAt", "desc"),
      limit(1),
    )).then(snap => {
      const url = snap.docs[0]?.data()?.downloadUrl as string | undefined;
      if (url) setHeroImageUrl(url);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let ratesReady   = false;
    let schemesReady = false;
    const check = () => { if (ratesReady && schemesReady) setReady(true); };

    const unsubRates   = subscribeMarketRates(r => { setRates(r);   ratesReady   = true; check(); });
    const unsubSchemes = subscribeStructuredSchemes(s => { setSchemes(s); schemesReady = true; check(); });
    return () => { unsubRates(); unsubSchemes(); };
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────

  const ratesLive      = rates.filter(r => r.verified && r.published).length;
  const ratesVerified  = rates.filter(r => r.verified).length;
  const totalRateDefs  = RATE_DEFINITIONS.length;

  const schemesLive    = schemes.filter(s => s.verified && s.published).length;
  const schemesVerified= schemes.filter(s => s.verified).length;
  const schemesByCategory = {
    Investment: schemes.filter(s => s.category === "Investment" && s.published && s.verified).length,
    Loan:       schemes.filter(s => s.category === "Loan"       && s.published && s.verified).length,
    Insurance:  schemes.filter(s => s.category === "Insurance"  && s.published && s.verified).length,
    Pension:    schemes.filter(s => s.category === "Pension"    && s.published && s.verified).length,
  };

  // ── Page statuses ──────────────────────────────────────────────────────────

  function homepageStatus(): PageStatus {
    if (ratesLive === totalRateDefs && schemesLive > 0) return {
      page: "Homepage", path: "/", readiness: "live",
      headline: `${ratesLive}/${totalRateDefs} rates + ${schemesLive} schemes live`,
      detail: "Market rates ticker shows verified data. Scheme explorer has live entries.",
      dataSource: "Firestore: market_rates + structuredSchemes",
      adminHref: "/vault/public-data", adminLabel: "Manage Rates →",
    };
    if (ratesLive > 0 || schemesLive > 0) return {
      page: "Homepage", path: "/", readiness: "partial",
      headline: `${ratesLive}/${totalRateDefs} rates, ${schemesLive} schemes published`,
      detail: [
        ratesLive < totalRateDefs   ? `${totalRateDefs - ratesLive} rate(s) still unpublished.` : "",
        schemesLive === 0           ? "No schemes visible — homepage scheme explorer is empty." : "",
      ].filter(Boolean).join(" "),
      dataSource: "Firestore: market_rates + structuredSchemes",
      adminHref: "/vault/public-data", adminLabel: "Manage Rates →",
    };
    return {
      page: "Homepage", path: "/", readiness: "empty",
      headline: "No verified+published data — ticker shows admin notice",
      detail: "Rates ticker shows Nepali placeholder. Scheme explorer is empty. Publish rates and schemes to make the homepage useful.",
      dataSource: "Firestore: market_rates + structuredSchemes",
      adminHref: "/vault/public-data", adminLabel: "Add Rates →",
    };
  }

  function schemesStatus(): PageStatus {
    if (schemesLive >= 4) return {
      page: "Schemes / Homepage Explorer", path: "/", readiness: "live",
      headline: `${schemesLive} schemes live across ${Object.values(schemesByCategory).filter(c => c > 0).length} categories`,
      detail: `Investment: ${schemesByCategory.Investment} · Loan: ${schemesByCategory.Loan} · Insurance: ${schemesByCategory.Insurance} · Pension: ${schemesByCategory.Pension}`,
      dataSource: "Firestore: structuredSchemes",
      adminHref: "/vault/schemes", adminLabel: "Manage Schemes →",
    };
    if (schemesLive > 0) return {
      page: "Schemes / Homepage Explorer", path: "/", readiness: "partial",
      headline: `${schemesLive} scheme${schemesLive !== 1 ? "s" : ""} published, ${schemesVerified - schemesLive} verified-not-published`,
      detail: `Categories live: ${Object.entries(schemesByCategory).filter(([,c]) => c > 0).map(([k,c]) => `${k}(${c})`).join(" · ") || "none"}. ${schemes.length - schemesLive} total in Firestore.`,
      dataSource: "Firestore: structuredSchemes",
      adminHref: "/vault/schemes", adminLabel: "Manage Schemes →",
    };
    return {
      page: "Schemes / Homepage Explorer", path: "/", readiness: "empty",
      headline: schemes.length > 0 ? `${schemes.length} scheme(s) in Firestore but none published` : "No schemes in Firestore",
      detail: "The homepage scheme explorer is empty. Add and publish schemes via Scheme Management.",
      dataSource: "Firestore: structuredSchemes",
      adminHref: "/vault/schemes", adminLabel: "Add Schemes →",
    };
  }

  const pageStatuses: PageStatus[] = [
    homepageStatus(),
    schemesStatus(),
    {
      page:      "Calculator",
      path:      "/calculator",
      readiness: ratesLive > 0 ? "live" : "partial",
      headline:  ratesLive > 0
        ? `Uses ${ratesLive} live Firestore rate(s) + built-in defaults for missing`
        : "Runs on built-in default rates (no Firestore data published)",
      detail:    "Calculator always works — verified Firestore rates override defaults. Users see up-to-date NRB/EPF/SSF numbers when published.",
      dataSource: "Firestore: market_rates (optional override)",
      adminHref: "/vault/public-data", adminLabel: "Update Rates →",
    },
    {
      page:      "AI Sifarish",
      path:      "/recommend",
      readiness: "static",
      headline:  "Fully operational — no Firestore dependency",
      detail:    "AI recommendation engine uses Claude API directly. No scheme data from Firestore is needed. Always available.",
      dataSource: "Cloudflare Pages Function → Claude API",
    },
    {
      page:      "Compare",
      path:      "/compare",
      readiness: "static",
      headline:  "Fully operational — uses static scheme data",
      detail:    "Compare page reads from lib/schemes-data.ts (static). No Firestore reads. Always shows all schemes.",
      dataSource: "lib/schemes-data.ts (static)",
    },
  ];

  const liveCount    = pageStatuses.filter(p => p.readiness === "live").length;
  const partialCount = pageStatuses.filter(p => p.readiness === "partial").length;
  const emptyCount   = pageStatuses.filter(p => p.readiness === "empty").length;

  return (
    <div className="space-y-0">

    {/* ── Hero Banner ────────────────────────────────────────────────────────── */}
    <div
      className="relative w-full min-h-[420px] flex items-center justify-center overflow-hidden"
      style={heroImageUrl ? {
        backgroundImage: `url(${heroImageUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      } : undefined}
    >
      {/* Cyber gradient base (always shown; image layered on top if available) */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-green-950/30" />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "linear-gradient(rgba(0,255,100,0.15) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,100,0.15) 1px,transparent 1px)", backgroundSize: "40px 40px" }}
      />
      {/* Dark scrim over image */}
      {heroImageUrl && <div className="absolute inset-0 bg-black/60" />}
      {/* Neon glow blobs */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-16 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-green-400 text-xs font-semibold tracking-widest uppercase">Nepal&apos;s AI Intelligence Platform</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight mb-4">
          नेपालको AI वित्तीय<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-400">
            Intelligence Platform
          </span>
        </h1>
        <p className="text-zinc-400 text-lg mb-8 font-medium">
          AI for Nepal. By Nepal. For Nepal.
        </p>
        <Link
          href="/vault"
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-black font-bold px-8 py-3.5 rounded-xl transition-all hover:scale-105 text-base shadow-lg shadow-green-500/25"
        >
          ⚡ Dashboard खोल्नुहोस्
        </Link>
        {heroImageUrl && (
          <p className="text-zinc-700 text-[10px] mt-6 font-mono">
            Hero image: R2 document
          </p>
        )}
      </div>
    </div>

    <div className="p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white">Public Preview</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Data readiness of every public-facing page. Verify and publish data before directing users here.
        </p>
      </div>

      {/* Summary banner */}
      {!ready ? (
        <div className="text-sm text-zinc-600">Loading Firestore…</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Pages Live",    count: liveCount,    color: "text-green-400", bg: "bg-green-950/30 border-green-900" },
            { label: "Partial Data",  count: partialCount, color: "text-amber-400", bg: "bg-amber-950/30 border-amber-900" },
            { label: "Missing Data",  count: emptyCount,   color: "text-red-400",   bg: "bg-red-950/30   border-red-900"   },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-3 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data inventory */}
      {ready && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Firestore Inventory</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-600">Market Rates (published)</span>
              <span className={`font-mono font-bold ${ratesLive === totalRateDefs ? "text-green-400" : ratesLive > 0 ? "text-amber-400" : "text-red-400"}`}>
                {ratesLive}/{totalRateDefs}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Market Rates (verified)</span>
              <span className="font-mono font-bold text-zinc-300">{ratesVerified}/{totalRateDefs}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Schemes (published)</span>
              <span className={`font-mono font-bold ${schemesLive > 0 ? "text-green-400" : "text-amber-400"}`}>{schemesLive}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Schemes (total in Firestore)</span>
              <span className="font-mono font-bold text-zinc-300">{schemes.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Page cards */}
      {ready && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Page Readiness</h2>
          {pageStatuses.map(s => <PageCard key={s.page} status={s} />)}
        </section>
      )}

      {/* Actions */}
      {ready && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Actions</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/vault/public-data" className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
              Manage Market Rates →
            </Link>
            <Link href="/vault/schemes" className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
              Manage Schemes →
            </Link>
            <Link href="/" target="_blank" className="px-4 py-2 text-xs font-semibold rounded-lg bg-green-900/40 text-green-400 border border-green-900 hover:bg-green-900/60 transition-colors">
              View Public Homepage ↗
            </Link>
          </div>
        </section>
      )}
    </div>
    </div>
  );
}
