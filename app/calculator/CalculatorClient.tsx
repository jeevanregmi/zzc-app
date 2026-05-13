"use client";

/**
 * CalculatorClient — tab orchestrator.
 *
 * Responsibilities (ONLY these):
 *   1. Instantiate the 5 domain hooks
 *   2. Manage active tab state
 *   3. Render the tab bar
 *   4. Route to the correct tab component
 *
 * All computation is in lib/finance-engine.ts and lib/simulation/engine.ts.
 * All state is in hooks/.
 * All rendering is in components/calculator/ and app/calculator/tabs/.
 *
 * This file should never grow beyond ~100 lines.
 * If it does, a new concern has leaked in — move it out.
 */

import { useState } from "react";
import Link from "next/link";
import { useSIPCalculator }        from "../../hooks/useSIPCalculator";
import { useRetirementPlanner }    from "../../hooks/useRetirementPlanner";
import { useLoanAnalyzer }         from "../../hooks/useLoanAnalyzer";
import { useSchemeMetrics }        from "../../hooks/useSchemeMetrics";
import { useFinancialHealth }      from "../../hooks/useFinancialHealth";
import { usePortfolioOptimizer }   from "../../hooks/usePortfolioOptimizer";
import { SIPTab }        from "./tabs/SIPTab";
import { RetirementTab } from "./tabs/RetirementTab";
import { LoanTab }       from "./tabs/LoanTab";
import { RiskTab }       from "./tabs/RiskTab";
import { HealthTab }     from "./tabs/HealthTab";
import { PortfolioTab }  from "./tabs/PortfolioTab";

type Tab = "sip" | "retirement" | "loan" | "risk" | "health" | "portfolio";

const TABS: { id: Tab; label: string; labelMobile: string; sub: string }[] = [
  { id: "sip",        label: "SIP",          labelMobile: "SIP",    sub: "मासिक लगानी" },
  { id: "retirement", label: "सेवानिवृत्ति",  labelMobile: "Retire", sub: "भविष्य कोष"  },
  { id: "loan",       label: "ऋण / EMI",     labelMobile: "EMI",    sub: "किस्ता गणना" },
  { id: "risk",       label: "जोखिम",        labelMobile: "Risk",   sub: "Sharpe ratio" },
  { id: "health",     label: "स्वास्थ्य",    labelMobile: "Health", sub: "वित्त स्कोर"  },
  { id: "portfolio",  label: "Portfolio",    labelMobile: "Port.",  sub: "आवंटन"        },
];

export default function CalculatorClient() {
  const [tab, setTab] = useState<Tab>("sip");

  const sip        = useSIPCalculator();
  const retirement = useRetirementPlanner();
  const loan       = useLoanAnalyzer();
  const schemes    = useSchemeMetrics();
  const health     = useFinancialHealth();
  const portfolio  = usePortfolioOptimizer();

  return (
    <div className="min-h-screen bg-black text-white">

      {/* ── Page header ── */}
      <div className="border-b border-zinc-900 px-4 sm:px-6 py-7 sm:py-10">
        <div className="max-w-6xl mx-auto">
          <nav className="flex items-center gap-1.5 text-xs text-zinc-600 mb-4">
            <Link href="/" className="hover:text-zinc-400 transition">ZZC</Link>
            <span>/</span>
            <span className="text-zinc-400">क्यालकुलेटर</span>
          </nav>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Nepal Finance Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-2">वित्तीय क्यालकुलेटर</h1>
          <p className="text-zinc-500 text-sm sm:text-base">
            SIP, सेवानिवृत्ति, EMI, जोखिम, स्वास्थ्य स्कोर र पोर्टफोलियो — सबै एकै ठाउँमा।
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">

        {/* ── Tab bar ── */}
        <div className="flex gap-1 mb-6 bg-zinc-900 border border-zinc-800 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex-shrink-0 flex-1 min-w-[56px] sm:min-w-[90px] px-2 sm:px-3 py-2.5 rounded-lg text-center transition-all " +
                (tab === t.id
                  ? "bg-green-500 text-black shadow-sm"
                  : "text-zinc-500 hover:text-white hover:bg-zinc-800")
              }
            >
              <div className="text-xs sm:text-sm font-bold">
                <span className="sm:hidden">{t.labelMobile}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </div>
              <div className="hidden sm:block text-[10px] mt-0.5 opacity-60">{t.sub}</div>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="bg-zinc-900 rounded-2xl p-4 md:p-6 border border-zinc-800">
          {tab === "sip"        && <SIPTab        {...sip} />}
          {tab === "retirement" && <RetirementTab {...retirement} />}
          {tab === "loan"       && <LoanTab       {...loan} />}
          {tab === "risk"       && <RiskTab       {...schemes} />}
          {tab === "health"     && <HealthTab     {...health} />}
          {tab === "portfolio"  && <PortfolioTab  {...portfolio} />}
        </div>

      </div>
    </div>
  );
}
