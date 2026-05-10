"use client";

import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { SCHEMES, LOAN_SCHEMES } from "../../lib/schemes-data";
import type { Scheme } from "../../lib/schemes-data";
import {
  NEPAL_INFLATION, NEPAL_RISK_FREE, LIFE_EXPECTANCY_NP,
  realReturnRate, toRealValue, calcCAGR,
  calcSIP, buildSIPRows,
  calcRequiredCorpusReal, calcPensionSustainability, calcReplacementRatio,
  calcAdequacyScore, calcMonthlySavingsNeeded, projectedFinalSalary,
  calcLoanAnalysis,
  calcSharpeScore, schemeRiskScore, schemeLiquidityScore,
  calcSSFPension, calcFinancialHealth, termPremiumRate,
  formatNPR, formatPct, scoreLabel, scoreColor, scoreBg,
  sharpeColor, realReturnColor,
} from "../../lib/finance-engine";

type CalcTab = "sip" | "retirement" | "loan" | "risk" | "health";
type SortCol = "nominalReturn" | "realReturn" | "riskScore" | "liquidityScore" | "sharpeScore";

// ─── Static color maps (no template literals) ────────────────────────────────
const ORG_BADGE: Record<string, string> = {
  EPF:   "bg-blue-900/60 text-blue-300",
  CIT:   "bg-purple-900/60 text-purple-300",
  SSF:   "bg-orange-900/60 text-orange-300",
  NEPSE: "bg-green-900/60 text-green-300",
  Beema: "bg-rose-900/60 text-rose-300",
};

const DTI_BADGE: Record<string, string> = {
  safe:   "bg-green-900/40 text-green-300 border border-green-800",
  ok:     "bg-yellow-900/40 text-yellow-300 border border-yellow-800",
  tight:  "bg-orange-900/40 text-orange-300 border border-orange-800",
  danger: "bg-red-900/40 text-red-300 border border-red-800",
};

function dtiCategory(dti: number): keyof typeof DTI_BADGE {
  if (dti < 30) return "safe";
  if (dti < 40) return "ok";
  if (dti < 50) return "tight";
  return "danger";
}

const DTI_LABEL: Record<string, string> = {
  safe: "सुरक्षित (<30%)",
  ok: "ठीकै छ (30–40%)",
  tight: "तनावमा (40–50%)",
  danger: "खतरनाक (>50%)",
};

// ─── Shared Components ───────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = "text-white", small }: {
  label: string; value: string; sub?: string; color?: string; small?: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <p className="text-zinc-500 text-xs mb-1">{label}</p>
      <p className={`font-black ${small ? "text-base" : "text-xl"} ${color}`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function ScoreBar({ label, score, target }: { label: string; score: number; target?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-2 text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className={`font-black ${scoreColor(score)}`}>{score}/100 — {scoreLabel(score)}</span>
      </div>
      <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${scoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {target && <p className="text-zinc-600 text-xs mt-1">{target}</p>}
    </div>
  );
}

function InsightBox({ icon, text, color }: { icon: string; text: string; color: "green" | "yellow" | "red" | "blue" }) {
  const cls = {
    green:  "bg-green-950/40 border-green-900/60 text-green-300",
    yellow: "bg-yellow-950/40 border-yellow-900/60 text-yellow-300",
    red:    "bg-red-950/40 border-red-900/60 text-red-300",
    blue:   "bg-blue-950/40 border-blue-900/60 text-blue-300",
  }[color];
  return (
    <div className={`border rounded-2xl px-5 py-3 text-sm flex gap-3 items-start ${cls}`}>
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function NumInput({ label, value, onChange, min, max, step, prefix, suffix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string; suffix?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-semibold text-zinc-400 mb-2">{label}</label>
      <div className="relative flex items-center">
        {prefix && <span className="absolute left-4 text-zinc-500 text-sm pointer-events-none">{prefix}</span>}
        <input
          type="number" value={value} min={min} max={max} step={step ?? 1}
          onChange={e => onChange(Number(e.target.value))}
          className={`w-full bg-black border border-zinc-700 rounded-2xl py-3 text-lg font-bold focus:outline-none focus:border-green-500 ${prefix ? "pl-10 pr-4" : suffix ? "pl-4 pr-12" : "px-4"}`}
        />
        {suffix && <span className="absolute right-4 text-zinc-500 text-sm pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );
}

function SliderInput({ label, value, onChange, min, max, step, unit, note }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; unit: string; note?: string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-sm font-semibold text-zinc-400">{label}</label>
        <span className="text-white font-black text-sm">{value}{unit}</span>
      </div>
      <input
        type="range" value={value} min={min} max={max} step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-green-400 h-1.5 rounded-full"
      />
      {note && <p className="text-zinc-600 text-xs mt-1">{note}</p>}
    </div>
  );
}

function SortTh({ col, label, active, dir, onSort }: {
  col: SortCol; label: string; active: boolean; dir: 1 | -1;
  onSort: (c: SortCol) => void;
}) {
  return (
    <th
      className="text-left px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}{active ? (dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );
}

// ─── SIP Scheme presets ──────────────────────────────────────────────────────
const SIP_PRESETS = [
  { label: "EPF भविष्य निधि", rate: 8.5,  riskLevel: "Low",         color: "border-blue-700 text-blue-300"   },
  { label: "SSF कोष",          rate: 8.5,  riskLevel: "Very Low",    color: "border-orange-700 text-orange-300"},
  { label: "CIT नागरिक",       rate: 5.0,  riskLevel: "Low",         color: "border-purple-700 text-purple-300"},
  { label: "CIT ESGRS",        rate: 3.75, riskLevel: "Low",         color: "border-violet-700 text-violet-300"},
  { label: "NEPSE म्युचुअल",   rate: 15,   riskLevel: "High",        color: "border-green-700 text-green-300" },
];

const LOAN_PRESETS_DATA = [
  { label: "SSF घर",   rate: 5.85, years: 15, org: "SSF" },
  { label: "EPF घर",   rate: 7.0,  years: 20, org: "EPF" },
  { label: "CIT घर",   rate: 7.0,  years: 15, org: "CIT" },
  { label: "EPF सहज",  rate: 5.75, years: 3,  org: "EPF" },
];

// ─── Main Component ──────────────────────────────────────────────────────────
export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<CalcTab>("sip");

  // ── Tab 1: SIP Builder ──────────────────────────────────
  const [sipMonthly,       setSipMonthly]       = useState(5000);
  const [sipRate,          setSipRate]          = useState(8.5);
  const [sipCurrentAge,    setSipCurrentAge]    = useState(25);
  const [sipRetirementAge, setSipRetirementAge] = useState(60);
  const [sipInflation,     setSipInflation]     = useState(NEPAL_INFLATION);
  const [sipStepUp,        setSipStepUp]        = useState(7);

  // ── Tab 2: Retirement ───────────────────────────────────
  const [retSalary,        setRetSalary]        = useState(50_000);
  const [retExpenses,      setRetExpenses]      = useState(35_000);
  const [retCurrentAge,    setRetCurrentAge]    = useState(25);
  const [retRetirementAge, setRetRetirementAge] = useState(60);
  const [retLifeExp,       setRetLifeExp]       = useState(LIFE_EXPECTANCY_NP);
  const [retPostReturn,    setRetPostReturn]    = useState(7.0);
  const [retInflation,     setRetInflation]     = useState(NEPAL_INFLATION);

  // ── Tab 3: Loan ─────────────────────────────────────────
  const [loanPrincipal, setLoanPrincipal] = useState(2_000_000);
  const [loanRate,      setLoanRate]      = useState(7.0);
  const [loanYears,     setLoanYears]     = useState(15);
  const [loanIncome,    setLoanIncome]    = useState(50_000);

  // ── Tab 4: Risk Analyzer ────────────────────────────────
  const [riskSortCol, setRiskSortCol] = useState<SortCol>("sharpeScore");
  const [riskSortDir, setRiskSortDir] = useState<1 | -1>(-1);

  // ── Tab 5: Health ───────────────────────────────────────
  const [hlthIncome,    setHlthIncome]    = useState(50_000);
  const [hlthExpenses,  setHlthExpenses]  = useState(35_000);
  const [hlthEmergency, setHlthEmergency] = useState(100_000);
  const [hlthInsurance, setHlthInsurance] = useState(2_000_000);
  const [hlthAge,       setHlthAge]       = useState(27);

  // ════════════ COMPUTED: Tab 1 ════════════
  const sipRows = useMemo(
    () => buildSIPRows(sipMonthly, sipRate, sipCurrentAge, sipRetirementAge, sipInflation, sipStepUp),
    [sipMonthly, sipRate, sipCurrentAge, sipRetirementAge, sipInflation, sipStepUp]
  );
  const sipFinal     = sipRows[sipRows.length - 1];
  const sipNominal   = sipFinal?.nominal   ?? 0;
  const sipReal      = sipFinal?.real      ?? 0;
  const sipContrib   = sipFinal?.contributed ?? 0;
  const sipErosion   = sipNominal - sipReal;
  const sipYears     = sipRetirementAge - sipCurrentAge;
  const sipCagr      = calcCAGR(sipContrib, sipNominal, sipYears);
  const sipMultiplier = sipContrib > 0 ? sipNominal / sipContrib : 0;
  const sipRealRate  = realReturnRate(sipRate, sipInflation);
  const retYearsBasic = Math.max(1, 80 - sipRetirementAge);
  const sipMonthlyNominalPension = Math.round(sipNominal / (retYearsBasic * 12));
  const sipMonthlyRealPension    = Math.round(sipReal / (retYearsBasic * 12));

  // ════════════ COMPUTED: Tab 2 ════════════
  const retYearsToRetire    = Math.max(0, retRetirementAge - retCurrentAge);
  const retYearsInRetirement = Math.max(0, retLifeExp - retRetirementAge);

  const retSSF = useMemo(
    () => calcSSFPension(retSalary, retCurrentAge, retRetirementAge),
    [retSalary, retCurrentAge, retRetirementAge]
  );

  const retRequiredReal = useMemo(
    () => calcRequiredCorpusReal(retExpenses, retYearsInRetirement, retPostReturn, retInflation),
    [retExpenses, retYearsInRetirement, retPostReturn, retInflation]
  );

  // Deflate nominal SSF corpus to today's purchasing power
  const retSSFReal       = toRealValue(retSSF.corpus, retInflation, retYearsToRetire);
  const retGap           = retRequiredReal - retSSFReal;
  const retAdequacy      = calcAdequacyScore(retSSFReal, retRequiredReal);
  const retFinalSalary   = projectedFinalSalary(retSalary, retYearsToRetire, 7);
  const retReplacement   = calcReplacementRatio(retSSF.monthlyPension, retFinalSalary);

  // Sustainability: how long does nominal SSF corpus fund inflated expenses?
  const retExpensesAtRet = Math.round(retExpenses * Math.pow(1 + retInflation / 100, retYearsToRetire));
  const retSustainability = calcPensionSustainability(retSSF.corpus, retExpensesAtRet, retPostReturn);

  // Monthly extra savings to close gap (investing at EPF 8.5%)
  const retMonthlyGap = retGap > 0
    ? calcMonthlySavingsNeeded(retGap, 8.5, retYearsToRetire)
    : 0;

  // Scenario comparison: 6% vs 8% inflation
  const retRequired6 = calcRequiredCorpusReal(retExpenses, retYearsInRetirement, retPostReturn, 6.0);
  const retRequired8 = calcRequiredCorpusReal(retExpenses, retYearsInRetirement, retPostReturn, 8.0);
  const retSSFReal6  = toRealValue(retSSF.corpus, 6.0, retYearsToRetire);
  const retSSFReal8  = toRealValue(retSSF.corpus, 8.0, retYearsToRetire);

  // ════════════ COMPUTED: Tab 3 ════════════
  const loanAnalysis = useMemo(
    () => calcLoanAnalysis(loanPrincipal, loanRate, loanYears, loanIncome),
    [loanPrincipal, loanRate, loanYears, loanIncome]
  );
  const loanDtiCat = dtiCategory(loanAnalysis.dti);

  // ════════════ COMPUTED: Tab 4 ════════════
  const schemeMetrics = useMemo(() => {
    type SM = {
      id: string; titleNepali: string; org: string; category: string;
      nominalReturn: number; realReturn: number;
      riskScore: number; liquidityScore: number; sharpeScore: number;
      govtBacked: boolean;
    };
    const raw: SM[] = [];
    for (const s of SCHEMES) {
      const nr = (s as any).annualReturn ?? s.interestRate ?? null;
      if (nr === null || nr === undefined) continue;
      raw.push({
        id: s.id,
        titleNepali: s.titleNepali,
        org: s.organization,
        category: s.category,
        nominalReturn: nr,
        realReturn: parseFloat(realReturnRate(nr, NEPAL_INFLATION).toFixed(2)),
        riskScore: schemeRiskScore(s.riskLevel),
        liquidityScore: schemeLiquidityScore(s.liquidity),
        sharpeScore: calcSharpeScore(nr, NEPAL_RISK_FREE, s.riskLevel),
        govtBacked: s.organization === "EPF" || s.organization === "SSF",
      });
    }
    return raw.sort((a, b) => riskSortDir * (b[riskSortCol] - a[riskSortCol]));
  }, [riskSortCol, riskSortDir]);

  function toggleSort(col: SortCol) {
    if (col === riskSortCol) setRiskSortDir(d => d === -1 ? 1 : -1);
    else { setRiskSortCol(col); setRiskSortDir(-1); }
  }

  // ════════════ COMPUTED: Tab 5 ════════════
  const health = useMemo(
    () => calcFinancialHealth(
      hlthIncome, hlthExpenses, hlthEmergency, hlthInsurance,
      Math.max(1, 60 - hlthAge)
    ),
    [hlthIncome, hlthExpenses, hlthEmergency, hlthInsurance, hlthAge]
  );
  const insTermPremium = Math.round(hlthInsurance * termPremiumRate(hlthAge));

  // ─── Tab config ─────────────────────────────────────────
  const TABS: { value: CalcTab; label: string; icon: string }[] = [
    { value: "sip",        label: "SIP",         icon: "📈" },
    { value: "retirement", label: "सेवानिवृत्ति", icon: "🎯" },
    { value: "loan",       label: "ऋण",           icon: "🏠" },
    { value: "risk",       label: "जोखिम",        icon: "📊" },
    { value: "health",     label: "स्वास्थ्य",    icon: "🩺" },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-4xl font-black text-green-400 mb-2">वित्तीय क्यालकुलेटर</h1>
        <p className="text-zinc-500 mb-8 text-sm">
          वास्तविक लगानी निर्णय प्रणाली — मूल्यवृद्धि, जोखिम र समय क्षितिज सहित।
        </p>

        {/* Tab bar */}
        <div className="flex gap-1.5 mb-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5">
          {TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === t.value ? "bg-green-500 text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════════ TAB 1: SIP BUILDER ══════════════════ */}
        {activeTab === "sip" && (
          <div className="space-y-6">

            {/* Scheme selector */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-4">📈 SIP बिल्डर — मुद्रास्फीति समायोजित</h2>
              <p className="text-zinc-500 text-xs mb-5">
                नाममात्र (nominal) र वास्तविक (real) दुवै कोष देखाउँछ।
                मूल्यवृद्धिले तपाईंको बचतको क्रयशक्ति कसरी घटाउँछ, त्यो यहाँ देखिन्छ।
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {SIP_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => setSipRate(p.rate)}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      sipRate === p.rate
                        ? `${p.color} border-current`
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {p.label} · {p.rate}%
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <NumInput label="मासिक योगदान (NPR)" value={sipMonthly} onChange={setSipMonthly} min={500} step={500} prefix="₹" />
                <NumInput label="वार्षिक ब्याज दर" value={sipRate} onChange={setSipRate} min={0} max={30} step={0.25} suffix="%" />
                <NumInput label="हालको उमेर" value={sipCurrentAge} onChange={setSipCurrentAge} min={15} max={58} />
                <NumInput label="सेवानिवृत्ति उमेर" value={sipRetirementAge} onChange={setSipRetirementAge} min={40} max={70} />
                <SliderInput label="मूल्यवृद्धि दर" value={sipInflation} onChange={setSipInflation}
                  min={3} max={12} step={0.5} unit="%" note={`नेपाल औसत: ${NEPAL_INFLATION}%`} />
                <SliderInput label="वार्षिक योगदान वृद्धि" value={sipStepUp} onChange={setSipStepUp}
                  min={0} max={20} step={0.5} unit="%" note="तलब वृद्धि अनुसार योगदान बढ्छ" />
              </div>
            </div>

            {sipRows.length > 0 && (
              <>
                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="नाममात्र कोष (भविष्यको रुपैयाँमा)"
                    value={formatNPR(sipNominal)} color="text-green-400" />
                  <StatCard label="वास्तविक कोष (आजको क्रयशक्तिमा)"
                    value={formatNPR(sipReal)} color="text-orange-400"
                    sub="मूल्यवृद्धि काटिसकेपछि" />
                  <StatCard label="मूल्यवृद्धिले खायो"
                    value={formatNPR(sipErosion)} color="text-red-400"
                    sub={`${((sipErosion / sipNominal) * 100).toFixed(0)}% कोष नष्ट`} />
                  <StatCard label="कुल योगदान"
                    value={formatNPR(sipContrib)} color="text-blue-400" />
                  <StatCard label="वार्षिक CAGR"
                    value={formatPct(sipCagr)} color="text-purple-400"
                    sub="वार्षिक चक्रवृद्धि दर" />
                  <StatCard label="लगानी गुणक"
                    value={`${sipMultiplier.toFixed(1)}×`} color="text-cyan-400"
                    sub="प्रति रुपैयाँ बृद्धि" />
                </div>

                {/* Monthly pension estimate */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <StatCard label="अनुमानित मासिक पेन्सन (नाममात्र)"
                    value={formatNPR(sipMonthlyNominalPension)} color="text-green-400"
                    sub={`${retYearsBasic} वर्षसम्म`} />
                  <StatCard label="अनुमानित मासिक पेन्सन (वास्तविक)"
                    value={formatNPR(sipMonthlyRealPension)} color="text-orange-400"
                    sub="आजको क्रयशक्तिमा" />
                </div>

                {/* Real return insight */}
                {sipRealRate < 0 ? (
                  <InsightBox icon="🚨" color="red"
                    text={`चेतावनी: ${sipRate}% ब्याजमा ${sipInflation}% मूल्यवृद्धि काट्दा वास्तविक प्रतिफल ${sipRealRate.toFixed(2)}% छ — नकारात्मक। तपाईंको क्रयशक्ति घट्दैछ।`}
                  />
                ) : sipRealRate < 2 ? (
                  <InsightBox icon="⚠️" color="yellow"
                    text={`वास्तविक प्रतिफल केवल ${sipRealRate.toFixed(2)}%। उच्च मूल्यवृद्धिले नाममात्र ${sipRate}% को अधिकांश खाइरहेको छ।`}
                  />
                ) : (
                  <InsightBox icon="✅" color="green"
                    text={`वास्तविक प्रतिफल ${sipRealRate.toFixed(2)}%। मूल्यवृद्धि काटिसकेपछि पनि राम्रो बृद्धि भइरहेको छ।`}
                  />
                )}
                {sipStepUp === 0 && (
                  <InsightBox icon="💡" color="blue"
                    text="सुझाव: वार्षिक योगदान वृद्धि ७% थप्नुस् — तलब बढेसँगै योगदान बढाउँदा कोष उल्लेखनीय रूपले बढ्छ।"
                  />
                )}

                {/* Chart: nominal vs real vs contributed */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <h2 className="text-lg font-black mb-1">कोष वृद्धि — नाममात्र vs वास्तविक</h2>
                  <p className="text-zinc-500 text-xs mb-5">
                    हरियो = भविष्यको रुपैयाँमा | सुन्तला = आजको क्रयशक्तिमा | नीलो = कुल योगदान
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={sipRows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={52}
                        tickFormatter={v => v >= 10_000_000 ? `${(v/10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v/100_000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                      />
                      <Tooltip formatter={(v: unknown) => formatNPR(Number(v))} labelFormatter={l => `उमेर ${l}`} />
                      <Area type="monotone" dataKey="nominal"     stroke="#4ade80" fill="#052e16" strokeWidth={2} name="नाममात्र" />
                      <Area type="monotone" dataKey="real"        stroke="#fb923c" fill="#431407" strokeWidth={2} name="वास्तविक" />
                      <Area type="monotone" dataKey="contributed" stroke="#3b82f6" fill="#1e3a5f" strokeWidth={1.5} strokeDasharray="4 4" name="योगदान" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════ TAB 2: RETIREMENT RADAR ══════════════════ */}
        {activeTab === "retirement" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-2">🎯 सेवानिवृत्ति Radar</h2>
              <p className="text-zinc-500 text-xs mb-5">
                सबै रकम <strong className="text-zinc-300">आजको क्रयशक्तिमा</strong> (real terms) देखाइएको छ।
                SSF ३१% योगदान मानिएको छ। आवश्यक बनाम अनुमानित कोष तुलना।
              </p>

              <div className="grid sm:grid-cols-2 gap-5">
                <NumInput label="मासिक तलब (NPR)" value={retSalary} onChange={setRetSalary} min={10_000} step={1_000} prefix="₹" />
                <NumInput label="अहिलेको मासिक खर्च" value={retExpenses} onChange={setRetExpenses} min={5_000} step={1_000} prefix="₹" />
                <NumInput label="हालको उमेर" value={retCurrentAge} onChange={setRetCurrentAge} min={18} max={58} />
                <NumInput label="सेवानिवृत्ति उमेर" value={retRetirementAge} onChange={setRetRetirementAge} min={45} max={70} />
                <NumInput label="अनुमानित आयु" value={retLifeExp} onChange={setRetLifeExp} min={60} max={100} />
                <NumInput label="सेवानिवृत्ति पश्चात् ब्याज (%)" value={retPostReturn} onChange={setRetPostReturn} min={3} max={15} step={0.25} suffix="%" />
                <SliderInput label="मूल्यवृद्धि दर" value={retInflation} onChange={setRetInflation}
                  min={3} max={12} step={0.5} unit="%" />
              </div>
            </div>

            {/* Gap analysis */}
            <div className="grid sm:grid-cols-2 gap-3">
              <StatCard label="आवश्यक कोष (आजको मूल्यमा)"
                value={formatNPR(retRequiredReal)} color="text-red-400"
                sub={`${retYearsInRetirement} वर्ष सेवानिवृत्तिका लागि`} />
              <StatCard label="SSF कोष (आजको मूल्यमा)"
                value={formatNPR(retSSFReal)} color={retSSFReal >= retRequiredReal ? "text-green-400" : "text-orange-400"}
                sub={`नाममात्र: ${formatNPR(retSSF.corpus)}`} />
              <StatCard label={retGap > 0 ? "कमी (Gap)" : "अधिशेष (Surplus)"}
                value={formatNPR(Math.abs(retGap))}
                color={retGap <= 0 ? "text-green-400" : "text-red-400"}
                sub={retGap > 0 ? `थप ${formatNPR(retMonthlyGap)}/महिना चाहिन्छ` : "लक्ष्यभन्दा अगाडि!"} />
              <StatCard label="आयु प्रतिस्थापन अनुपात"
                value={formatPct(retReplacement)}
                color={retReplacement >= 70 ? "text-green-400" : retReplacement >= 50 ? "text-yellow-400" : "text-red-400"}
                sub="लक्ष्य: ७०%+ (CFA मानक)" />
              <StatCard label="पेन्सन स्थायित्व"
                value={retSustainability >= 99 ? "अनन्त" : `${retSustainability.toFixed(0)} वर्ष`}
                color={retSustainability >= retYearsInRetirement ? "text-green-400" : "text-red-400"}
                sub={`सेवानिवृत्तिमा ${retYearsInRetirement} वर्ष चाहिन्छ`} />
              <StatCard label="मासिक SSF पेन्सन"
                value={formatNPR(retSSF.monthlyPension)} color="text-purple-400"
                sub={`SSF फार्मुला: तलब × ${retYearsToRetire}वर्ष × १.३३%`} />
            </div>

            {/* Adequacy score */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-3">
              <h3 className="font-black">कोष पर्याप्तता स्कोर</h3>
              <ScoreBar
                label="SSF कोष पर्याप्तता"
                score={retAdequacy}
                target={`आवश्यक ${formatNPR(retRequiredReal)} | अनुमानित ${formatNPR(retSSFReal)}`}
              />
            </div>

            {/* Insights */}
            {retGap > 0 && retMonthlyGap > 0 && (
              <InsightBox icon="📌" color="yellow"
                text={`कमी पूर्ति गर्न थप ${formatNPR(retMonthlyGap)}/महिना EPF/CIT मा लगानी गर्नुस् (८.५% मा)।`}
              />
            )}
            {retReplacement < 50 && (
              <InsightBox icon="🚨" color="red"
                text={`SSF पेन्सनले अन्तिम तलबको केवल ${retReplacement.toFixed(0)}% मात्र ढाक्छ। CIT ESGRS वा थप लगानीमार्फत पूरक आय सुनिश्चित गर्नुस्।`}
              />
            )}
            {retSustainability < retYearsInRetirement && retSustainability > 0 && (
              <InsightBox icon="⏳" color="red"
                text={`कोष ${retSustainability.toFixed(0)} वर्षपछि सकिन्छ। तर सेवानिवृत्तिमा ${retYearsInRetirement} वर्ष चाहिन्छ। दीर्घायु जोखिम (Longevity Risk) छ।`}
              />
            )}

            {/* Inflation scenario comparison */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h3 className="font-black mb-1">मूल्यवृद्धि परिदृश्य तुलना</h3>
              <p className="text-zinc-500 text-xs mb-4">मूल्यवृद्धि दर फरक भए के हुन्थ्यो?</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "६% मूल्यवृद्धि", required: retRequired6, projected: retSSFReal6 },
                  { label: "८% मूल्यवृद्धि", required: retRequired8, projected: retSSFReal8 },
                ].map(s => {
                  const gap = s.required - s.projected;
                  const ok = gap <= 0;
                  return (
                    <div key={s.label} className={`border rounded-2xl p-4 ${ok ? "border-green-900/40" : "border-red-900/40"}`}>
                      <p className="text-zinc-400 text-xs font-bold mb-3">{s.label}</p>
                      <p className="text-zinc-500 text-xs">आवश्यक</p>
                      <p className="text-white font-black text-sm mb-1">{formatNPR(s.required)}</p>
                      <p className="text-zinc-500 text-xs">अनुमानित</p>
                      <p className={`font-black text-sm mb-2 ${ok ? "text-green-400" : "text-orange-400"}`}>{formatNPR(s.projected)}</p>
                      <p className={`text-xs font-bold ${ok ? "text-green-400" : "text-red-400"}`}>
                        {ok ? `✓ +${formatNPR(Math.abs(gap))} अधिशेष` : `✗ −${formatNPR(gap)} कमी`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB 3: LOAN INTELLIGENCE ══════════════════ */}
        {activeTab === "loan" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-2">🏠 ऋण Intelligence</h2>
              <p className="text-zinc-500 text-xs mb-5">
                DTI अनुपात, अवसर लागत र ऋणको वास्तविक मूल्य विश्लेषण।
              </p>

              <div className="flex flex-wrap gap-2 mb-5">
                {LOAN_PRESETS_DATA.map(p => (
                  <button
                    key={p.label}
                    onClick={() => { setLoanRate(p.rate); setLoanYears(p.years); }}
                    className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      loanRate === p.rate && loanYears === p.years
                        ? "border-amber-500 bg-amber-900/20 text-amber-300"
                        : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                    }`}
                  >
                    {p.label} · {p.rate}% · {p.years}yr
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <NumInput label="ऋण रकम (NPR)" value={loanPrincipal} onChange={setLoanPrincipal} min={100_000} step={50_000} prefix="₹" />
                <NumInput label="वार्षिक ब्याज दर" value={loanRate} onChange={setLoanRate} min={0} max={25} step={0.25} suffix="%" />
                <NumInput label="अवधि (वर्ष)" value={loanYears} onChange={setLoanYears} min={1} max={30} />
                <NumInput label="मासिक आय (NPR)" value={loanIncome} onChange={setLoanIncome} min={10_000} step={1_000} prefix="₹" />
              </div>
            </div>

            {loanAnalysis.emi > 0 && (
              <>
                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <StatCard label="मासिक EMI" value={formatNPR(loanAnalysis.emi)} color="text-amber-400" />
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <p className="text-zinc-500 text-xs mb-1">ऋण-आय अनुपात (DTI)</p>
                    <p className="text-white font-black text-xl">{formatPct(loanAnalysis.dti)}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${DTI_BADGE[loanDtiCat]}`}>
                      {DTI_LABEL[loanDtiCat]}
                    </span>
                  </div>
                  <StatCard label="कुल भुक्तानी"
                    value={formatNPR(loanAnalysis.totalPayment)} color="text-red-400"
                    sub={`ब्याज: ${formatNPR(loanAnalysis.totalInterest)}`} />
                  <StatCard label="प्रत्येक रु.१ को खर्च"
                    value={`रु.${loanAnalysis.costPerRupee.toFixed(2)}`} color="text-orange-400"
                    sub="मूलधन प्रति भुक्तानी" />
                  <StatCard label="अवसर लागत"
                    value={formatNPR(loanAnalysis.opportunityCost)} color="text-purple-400"
                    sub="EMI लगानी गरेको भए (८.५% मा)" />
                  <StatCard label="सामर्थ्य स्कोर"
                    value={`${loanAnalysis.affordabilityScore}/100`}
                    color={scoreColor(loanAnalysis.affordabilityScore)} />
                </div>

                {/* DTI insight */}
                {loanDtiCat === "danger" && (
                  <InsightBox icon="🚨" color="red"
                    text={`DTI ${formatPct(loanAnalysis.dti)} — धेरै जोखिमपूर्ण। बैंकहरूले ५०% भन्दा माथि DTI भएको ऋण प्राय: अस्वीकार गर्छन्। ऋण रकम वा अवधि पुनर्विचार गर्नुस्।`}
                  />
                )}
                {loanAnalysis.opportunityCost > loanAnalysis.totalPayment && (
                  <InsightBox icon="💡" color="blue"
                    text={`यदि EMI ${formatNPR(loanAnalysis.emi)}/महिना EPF मा लगानी गरेको भए ${formatNPR(loanAnalysis.opportunityCost)} पाउनुहुन्थ्यो — ऋणको कुल भुक्तानीभन्दा बढी।`}
                  />
                )}

                {/* Amortization chart */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <h2 className="text-lg font-black mb-1">भुक्तानी विश्लेषण</h2>
                  <p className="text-zinc-500 text-xs mb-5">संचित मूलधन र ब्याज</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={loanAnalysis.rows} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 11 }} label={{ value: "वर्ष", position: "insideBottom", offset: -2, fill: "#52525b", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 10 }} width={52}
                        tickFormatter={v => v >= 100_000 ? `${(v/100_000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                      />
                      <Tooltip formatter={(v: unknown) => formatNPR(Number(v))} labelFormatter={l => `वर्ष ${l}`} />
                      <Area type="monotone" dataKey="cumPrincipal" stackId="1" stroke="#3b82f6" fill="#1e3a5f" strokeWidth={2} name="मूलधन" />
                      <Area type="monotone" dataKey="cumInterest"  stackId="1" stroke="#ef4444" fill="#450a0a" strokeWidth={2} name="ब्याज" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Available loan schemes */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5">
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-3">उपलब्ध ऋण योजनाहरू</p>
                  <div className="space-y-2">
                    {LOAN_SCHEMES.filter(s => s.interestRate != null).map(s => (
                      <div key={s.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${ORG_BADGE[s.organization] ?? "bg-zinc-700 text-zinc-300"}`}>{s.organization}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 text-sm font-semibold truncate">{s.titleNepali}</p>
                          <p className="text-zinc-500 text-xs">{s.interestRate}% · {s.loanLimit ?? "—"}</p>
                        </div>
                        <button onClick={() => setLoanRate(s.interestRate!)}
                          className="text-xs text-amber-400 hover:text-amber-300 font-bold shrink-0">
                          प्रयोग
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════ TAB 4: RISK ANALYZER ══════════════════ */}
        {activeTab === "risk" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-2">📊 जोखिम-समायोजित विश्लेषण</h2>
              <p className="text-zinc-500 text-xs mb-1">
                <strong className="text-zinc-300">Sharpe स्कोर</strong> = प्रति जोखिम इकाई अर्जित अतिरिक्त प्रतिफल।
                उच्च = राम्रो। नकारात्मक = जोखिम-मुक्त दरभन्दा कम।
              </p>
              <p className="text-zinc-600 text-xs mb-5">
                जोखिम-मुक्त दर: {NEPAL_RISK_FREE}% | मूल्यवृद्धि: {NEPAL_INFLATION}%
              </p>

              <div className="overflow-x-auto -mx-2">
                <table className="min-w-[680px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left px-3 py-3 text-xs font-bold text-zinc-500 uppercase tracking-wider w-40">योजना</th>
                      <SortTh col="nominalReturn"  label="दर%"           active={riskSortCol === "nominalReturn"}  dir={riskSortDir} onSort={toggleSort} />
                      <SortTh col="realReturn"     label="वास्तविक%"     active={riskSortCol === "realReturn"}     dir={riskSortDir} onSort={toggleSort} />
                      <SortTh col="riskScore"      label="जोखिम(१-१०)"   active={riskSortCol === "riskScore"}      dir={riskSortDir} onSort={toggleSort} />
                      <SortTh col="liquidityScore" label="तरलता(१-१०)"   active={riskSortCol === "liquidityScore"} dir={riskSortDir} onSort={toggleSort} />
                      <SortTh col="sharpeScore"    label="Sharpe"        active={riskSortCol === "sharpeScore"}    dir={riskSortDir} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {schemeMetrics.map((m, i) => (
                      <tr key={m.id} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${i % 2 === 0 ? "" : "bg-zinc-900/30"}`}>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full w-fit ${ORG_BADGE[m.org] ?? "bg-zinc-700 text-zinc-300"}`}>{m.org}</span>
                            <span className="text-zinc-300 text-xs font-semibold leading-tight">{m.titleNepali.length > 22 ? m.titleNepali.slice(0, 22) + "…" : m.titleNepali}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-black text-white">{m.nominalReturn}%</td>
                        <td className={`px-3 py-2.5 font-black ${realReturnColor(m.realReturn)}`}>
                          {m.realReturn > 0 ? "+" : ""}{m.realReturn.toFixed(2)}%
                        </td>
                        <td className={`px-3 py-2.5 font-bold ${m.riskScore <= 2 ? "text-green-400" : m.riskScore <= 5 ? "text-yellow-400" : "text-red-400"}`}>
                          {m.riskScore}/10
                        </td>
                        <td className={`px-3 py-2.5 font-bold ${m.liquidityScore >= 7 ? "text-green-400" : m.liquidityScore >= 4 ? "text-yellow-400" : "text-zinc-500"}`}>
                          {m.liquidityScore}/10
                        </td>
                        <td className={`px-3 py-2.5 font-black ${sharpeColor(m.sharpeScore)}`}>
                          {m.sharpeScore > 0 ? "+" : ""}{m.sharpeScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key insights from data */}
            <div className="grid sm:grid-cols-2 gap-3">
              {(() => {
                const best = [...schemeMetrics].sort((a, b) => b.sharpeScore - a.sharpeScore)[0];
                const worst = [...schemeMetrics].sort((a, b) => a.realReturn - b.realReturn)[0];
                return (
                  <>
                    {best && (
                      <InsightBox icon="🏆" color="green"
                        text={`सर्वोत्तम जोखिम-समायोजित: ${best.titleNepali} (Sharpe ${best.sharpeScore.toFixed(2)})। प्रति जोखिम इकाई सबभन्दा बढी प्रतिफल।`}
                      />
                    )}
                    {worst && worst.realReturn < 0 && (
                      <InsightBox icon="📉" color="red"
                        text={`${worst.titleNepali} को वास्तविक प्रतिफल ${worst.realReturn.toFixed(2)}% — नकारात्मक। मूल्यवृद्धिले यो योजनाको क्रयशक्ति नष्ट गर्दैछ।`}
                      />
                    )}
                  </>
                );
              })()}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-xs text-zinc-500 space-y-1">
              <p><strong className="text-zinc-300">Sharpe स्कोर</strong> = (प्रतिफल − जोखिम-मुक्त दर) ÷ अस्थिरता प्रोक्सी</p>
              <p><strong className="text-zinc-300">वास्तविक प्रतिफल</strong> = Fisher समीकरण: (१+नाममात्र) ÷ (१+मूल्यवृद्धि) − १</p>
              <p><strong className="text-zinc-300">जोखिम स्कोर</strong> = १ (अत्यन्त कम) देखि १० (अत्यन्त उच्च) सम्म</p>
              <p><strong className="text-zinc-300">तरलता</strong> = कति सजिलो निकाल्न मिल्छ — १ (सेवानिवृत्तिमा) देखि १० (जुनसुकै बेला) सम्म</p>
            </div>
          </div>
        )}

        {/* ══════════════════ TAB 5: FINANCIAL HEALTH ══════════════════ */}
        {activeTab === "health" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h2 className="text-xl font-black mb-2">🩺 वित्तीय स्वास्थ्य जाँच</h2>
              <p className="text-zinc-500 text-xs mb-5">
                आपतकालीन कोष, बचत दर र बीमा पर्याप्तता — तीनवटा स्तम्भ।
              </p>

              <div className="grid sm:grid-cols-2 gap-5">
                <NumInput label="मासिक आय (NPR)" value={hlthIncome} onChange={setHlthIncome} min={10_000} step={1_000} prefix="₹" />
                <NumInput label="मासिक खर्च (NPR)" value={hlthExpenses} onChange={setHlthExpenses} min={5_000} step={1_000} prefix="₹" />
                <NumInput label="आपतकालीन कोष (NPR)" value={hlthEmergency} onChange={setHlthEmergency} min={0} step={10_000} prefix="₹" />
                <NumInput label="जीवन बीमा रकम (NPR)" value={hlthInsurance} onChange={setHlthInsurance} min={0} step={100_000} prefix="₹" />
                <NumInput label="हालको उमेर" value={hlthAge} onChange={setHlthAge} min={18} max={59} />
              </div>
            </div>

            {/* Overall score */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 text-center">
              <p className="text-zinc-500 text-sm mb-2">समग्र वित्तीय स्वास्थ्य स्कोर</p>
              <p className={`text-7xl font-black mb-1 ${scoreColor(health.overallScore)}`}>{health.overallScore}</p>
              <p className={`text-lg font-bold ${scoreColor(health.overallScore)}`}>{scoreLabel(health.overallScore)}</p>
              <p className="text-zinc-600 text-xs mt-2">आपतकालीन ३५% + बचत ४०% + बीमा २५%</p>
            </div>

            {/* Three score bars */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">
              <ScoreBar
                label={`आपतकालीन कोष — ${health.emergencyMonths} महिना (लक्ष्य: ६ महिना)`}
                score={health.emergencyScore}
                target={`लक्ष्य: ${formatNPR(hlthExpenses * 6)} | हालको: ${formatNPR(hlthEmergency)}`}
              />
              <ScoreBar
                label={`बचत दर — ${health.savingsRate.toFixed(1)}% (लक्ष्य: २०%+)`}
                score={health.savingsScore}
                target={`मासिक बचत: ${formatNPR(Math.max(0, hlthIncome - hlthExpenses))}`}
              />
              <ScoreBar
                label={`बीमा पर्याप्तता — ${health.insuranceCoverage}% HLV ढाकिएको`}
                score={health.insuranceScore}
                target={`मानव जीवन मूल्य (HLV): ${formatNPR(health.hlv)} | हालको कभर: ${formatNPR(hlthInsurance)}`}
              />
            </div>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="मानव जीवन मूल्य (HLV)"
                value={formatNPR(health.hlv)} color="text-blue-400"
                sub="भविष्यको आय धारा (PV)" small />
              <StatCard label="टर्म बीमा प्रिमियम (अनुमान)"
                value={formatNPR(insTermPremium) + "/वर्ष"} color="text-pink-400"
                sub={`${hlthAge} वर्ष उमेर, ${formatNPR(hlthInsurance)} कभर`} small />
              <StatCard label="बचत रकम"
                value={formatNPR(Math.max(0, hlthIncome - hlthExpenses)) + "/महिना"}
                color={health.savingsRate >= 20 ? "text-green-400" : "text-orange-400"} small />
              <StatCard label="बीमा कमी"
                value={health.hlv > hlthInsurance ? formatNPR(health.hlv - hlthInsurance) : "पूर्ण ढाकिएको"}
                color={health.hlv > hlthInsurance ? "text-red-400" : "text-green-400"} small />
            </div>

            {/* Action items */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <p className="font-black text-sm">कार्य योजना</p>
              {health.emergencyScore < 60 && (
                <InsightBox icon="🏦" color="yellow"
                  text={`आपतकालीन कोष कम छ। लक्ष्य ${formatNPR(hlthExpenses * 6)} — थप ${formatNPR(hlthExpenses * 6 - hlthEmergency)} चाहिन्छ।`}
                />
              )}
              {health.savingsRate < 20 && (
                <InsightBox icon="💰" color="yellow"
                  text={`बचत दर ${health.savingsRate.toFixed(1)}% — लक्ष्य २०%। मासिक खर्च ${formatNPR(Math.max(0, hlthIncome * 0.8 - hlthExpenses))} ले घटाउन प्रयास गर्नुस्।`}
                />
              )}
              {health.hlv > hlthInsurance && (
                <InsightBox icon="🛡️" color="red"
                  text={`बीमा कमी: ${formatNPR(health.hlv - hlthInsurance)}। टर्म बीमा सस्तो र प्रभावकारी विकल्प हो — वार्षिक करिब ${formatNPR(Math.round((health.hlv - hlthInsurance) * termPremiumRate(hlthAge)))} प्रिमियमले पूर्ण HLV ढाक्न सकिन्छ।`}
                />
              )}
              {health.overallScore >= 80 && (
                <InsightBox icon="✅" color="green"
                  text="वित्तीय स्वास्थ्य उत्कृष्ट छ! अब लगानी विविधीकरण र सेवानिवृत्ति योजनामा ध्यान दिनुस्।"
                />
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
