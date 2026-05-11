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
  { id: "sip",        label: "SIP",         labelMobile: "SIP",    sub: "लगानी" },
  { id: "retirement", label: "सेवानिवृत्ति", labelMobile: "Retire", sub: "corpus" },
  { id: "loan",       label: "ऋण",          labelMobile: "ऋण",    sub: "EMI" },
  { id: "risk",       label: "जोखिम",       labelMobile: "Risk",   sub: "Sharpe" },
  { id: "health",     label: "स्वास्थ्य",   labelMobile: "Health", sub: "स्कोर" },
  { id: "portfolio",  label: "Portfolio",   labelMobile: "Port.",  sub: "alloc." },
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
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-green-400 mb-1">वित्तीय विश्लेषण</h1>
          <p className="text-sm text-zinc-500">नेपाली लगानीकर्ताका लागि निर्णय इन्जिन</p>
        </div>

        {/* Tab bar — scrollable on mobile, full labels on desktop */}
        <div className="flex gap-1 mb-6 bg-zinc-900 p-1 rounded-xl overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                "flex-shrink-0 flex-1 min-w-[56px] sm:min-w-[80px] px-2 sm:px-3 py-2 rounded-lg text-center transition-colors " +
                (tab === t.id
                  ? "bg-green-500 text-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800")
              }
            >
              <div className="text-xs sm:text-sm font-medium">
                <span className="sm:hidden">{t.labelMobile}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </div>
              <div className="hidden sm:block text-xs opacity-70">{t.sub}</div>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-zinc-900/50 rounded-2xl p-4 md:p-6 border border-zinc-800">
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
