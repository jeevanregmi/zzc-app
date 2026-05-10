"use client";

import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES,
  formatNPR, buildSIPRows, calcEMI, calcSSFPension, termPremiumRate,
} from "../../lib/schemes-data";

/* ─── Types ──────────────────────────────────────────────── */
type CalcTab = "investment" | "loan" | "insurance" | "pension";

/* ─── Local alias (buildSIPRows is imported as projectFund equivalent) ──── */
const projectFund = buildSIPRows;

/* ─── Presets (sourced from lib/schemes-data.ts) ─────────── */
const INV_PRESETS = [
  { id: "epf-provident-fund",  label: "EPF भविष्य निधि",  rate: 8.5, color: "border-blue-600 bg-blue-900/20 text-blue-400",    desc: "१०%+१०% योगदान" },
  { id: "cit-esgrs",           label: "CIT ESGRS",         rate: 9,   color: "border-purple-600 bg-purple-900/20 text-purple-400", desc: "कर छुट ३३%"  },
  { id: "cit-citizens-unit-scheme", label: "CIT म्युचुअल फण्ड", rate: 9, color: "border-violet-600 bg-violet-900/20 text-violet-400", desc: "NAV आधारित" },
  { id: "nepse-mutual-fund",   label: "NEPSE म्युचुअल",   rate: 15,  color: "border-green-600 bg-green-900/20 text-green-400",   desc: "बजार आधारित" },
];

const LOAN_PRESETS = [
  { id: "epf-easy-loan",   label: "EPF सहज सापटी",   rate: 11, years: 3,  limit: "कोषको ५०%" },
  { id: "epf-house-loan",  label: "EPF घर सापटी",    rate: 10, years: 20, limit: "६० लाखसम्म" },
  { id: "ssf-home-loan",   label: "SSF घर सापटी",    rate: 9,  years: 15, limit: "कोषको ७०%" },
  { id: "ssf-education-loan", label: "SSF शैक्षिक",  rate: 8,  years: 7,  limit: "कोषको ५०%" },
];

const SUM_PRESETS = [
  { label: "१० लाख",  value: 1_000_000 },
  { label: "२५ लाख",  value: 2_500_000 },
  { label: "५० लाख",  value: 5_000_000 },
  { label: "१ करोड",  value: 10_000_000 },
];

/* ─── Shared Components ──────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-zinc-500 text-sm mb-1">{label}</p>
      <p className={`font-black text-xl ${color}`}>{value}</p>
      {sub && <p className="text-zinc-700 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function InputField({ label, value, onChange, min, max, step, prefix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string;
}) {
  return (
    <div>
      <label className="block font-bold mb-2 text-sm">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">{prefix}</span>}
        <input
          type="number" value={value} min={min} max={max} step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full bg-black border border-zinc-700 rounded-2xl py-3 text-xl font-bold focus:outline-none focus:border-green-500 ${prefix ? "pl-12 pr-5" : "px-5"}`}
        />
      </div>
    </div>
  );
}

function CustomTooltipInv({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm">
      <p className="font-bold text-white mb-1">उमेर {label}</p>
      <p className="text-green-400">कोष: {formatNPR(payload[0]?.value)}</p>
      <p className="text-blue-400">योगदान: {formatNPR(payload[1]?.value)}</p>
    </div>
  );
}

function CustomTooltipLoan({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl px-4 py-3 text-sm">
      <p className="font-bold text-white mb-1">वर्ष {label}</p>
      <p className="text-blue-400">मूलधन: {formatNPR(payload[0]?.value)}</p>
      <p className="text-red-400">ब्याज: {formatNPR(payload[1]?.value)}</p>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function CalculatorPage() {
  const [activeTab, setActiveTab] = useState<CalcTab>("investment");

  /* Investment state */
  const [invMonthly, setInvMonthly] = useState(3000);
  const [invRate, setInvRate] = useState(8.5);
  const [invCurrentAge, setInvCurrentAge] = useState(25);
  const [invRetirementAge, setInvRetirementAge] = useState(60);

  /* Loan state */
  const [loanPrincipal, setLoanPrincipal] = useState(1_000_000);
  const [loanRate, setLoanRate] = useState(11);
  const [loanYears, setLoanYears] = useState(3);

  /* Insurance state */
  const [insAge, setInsAge] = useState(25);
  const [insSumAssured, setInsSumAssured] = useState(2_500_000);

  /* Pension state */
  const [penSalary, setPenSalary] = useState(40_000);
  const [penCurrentAge, setPenCurrentAge] = useState(25);
  const [penRetirementAge, setPenRetirementAge] = useState(60);

  /* ── Investment computed ── */
  const invData = useMemo(
    () => projectFund(invMonthly, invRate, invCurrentAge, invRetirementAge),
    [invMonthly, invRate, invCurrentAge, invRetirementAge]
  );
  const invFinal = invData[invData.length - 1];
  const invFund = invFinal?.fund ?? 0;
  const invContrib = invFinal?.contributed ?? 0;
  const invInterest = invFund - invContrib;
  const yearsInRet = Math.max(0, 80 - invRetirementAge);
  const invMonthlyPension = yearsInRet > 0 ? Math.round(invFund / (yearsInRet * 12)) : 0;

  /* ── Loan computed ── */
  const loanData = useMemo(
    () => calcEMI(loanPrincipal, loanRate, loanYears),
    [loanPrincipal, loanRate, loanYears]
  );

  /* ── Insurance computed ── */
  const insTermPremium  = Math.round(insSumAssured * termPremiumRate(insAge));
  const insEndowPremium = Math.round(insSumAssured * termPremiumRate(insAge) * 2.5 + insSumAssured * 0.04);
  const insGovtHealth   = 2500;
  const insPrivHealth   = Math.round(Math.min(insSumAssured, 500_000) * 0.025);

  /* ── Pension computed ── */
  const penData = useMemo(
    () => calcSSFPension(penSalary, penCurrentAge, penRetirementAge),
    [penSalary, penCurrentAge, penRetirementAge]
  );

  const TABS: { value: CalcTab; label: string; icon: string }[] = [
    { value: "investment", label: "लगानी",  icon: "📈" },
    { value: "loan",       label: "ऋण",     icon: "🏠" },
    { value: "insurance",  label: "बीमा",   icon: "🛡️" },
    { value: "pension",    label: "पेन्सन", icon: "🎯" },
  ];

  return (
    <main className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-4xl mx-auto">

        <h1 className="text-5xl font-black text-green-400 mb-3">क्यालकुलेटर</h1>
        <p className="text-zinc-400 text-lg mb-8">लगानी, ऋण, बीमा र पेन्सन — सबै एकै ठाउँमा।</p>

        {/* Tab bar */}
        <div className="flex gap-2 mb-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-1.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === t.value
                  ? "bg-green-500 text-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ══════════════ INVESTMENT TAB ══════════════ */}
        {activeTab === "investment" && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-black mb-6">लगानी क्यालकुलेटर</h2>

              {/* Rate presets */}
              <div className="mb-6">
                <p className="text-sm text-zinc-500 font-semibold mb-3">योजना छान्नुस्</p>
                <div className="flex gap-2 flex-wrap">
                  {INV_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setInvRate(p.rate)}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                        invRate === p.rate ? p.color : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                      }`}
                    >
                      {p.label} · {p.rate}%
                      {invRate === p.rate && <span className="block text-xs font-normal mt-0.5 opacity-70">{p.desc}</span>}
                    </button>
                  ))}
                </div>
                {/* Scheme info strip for selected preset */}
                {(() => {
                  const sel = INV_PRESETS.find((p) => p.rate === invRate);
                  const scheme = sel ? INVESTMENT_SCHEMES.find((s) => s.id === sel.id) : null;
                  if (!scheme) return null;
                  return (
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span className="bg-zinc-800 px-3 py-1 rounded-full">जोखिम: {scheme.riskLevel}</span>
                      <span className="bg-zinc-800 px-3 py-1 rounded-full">तरलता: {scheme.liquidity}</span>
                      {scheme.contributionEmployee && (
                        <span className="bg-zinc-800 px-3 py-1 rounded-full">
                          योगदान: {scheme.contributionEmployee}%+{scheme.contributionEmployer}%
                        </span>
                      )}
                      <span className="bg-zinc-800 px-3 py-1 rounded-full">{scheme.nepaliSummary.slice(0, 55)}…</span>
                    </div>
                  );
                })()}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <InputField label="मासिक योगदान (NPR)" value={invMonthly} onChange={setInvMonthly} min={100} step={500} />
                <InputField label="वार्षिक ब्याज दर (%)" value={invRate} onChange={setInvRate} min={0} max={30} step={0.1} />
                <InputField label="हालको उमेर" value={invCurrentAge} onChange={setInvCurrentAge} min={15} max={59} />
                <InputField label="सेवानिवृत्ति उमेर" value={invRetirementAge} onChange={setInvRetirementAge} min={40} max={70} />
              </div>
            </div>

            {invData.length > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard label="सेवानिवृत्तिमा कोष"      value={formatNPR(invFund)}          color="text-green-400" />
                  <StatCard label="कुल योगदान"               value={formatNPR(invContrib)}        color="text-blue-400" />
                  <StatCard label="आर्जित ब्याज"             value={formatNPR(invInterest)}       color="text-purple-400" />
                  <StatCard label="अनुमानित मासिक पेन्सन"   value={formatNPR(invMonthlyPension)} color="text-orange-400" sub={`${yearsInRet} वर्षमा`} />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                  <h2 className="text-xl font-black mb-1">कोष वृद्धि</h2>
                  <p className="text-zinc-500 text-sm mb-6">
                    उमेर {invCurrentAge} → {invRetirementAge} · {invRetirementAge - invCurrentAge} वर्ष · {invRate}%/वर्ष
                  </p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={invData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={50}
                        tickFormatter={(v) => v >= 10_000_000 ? `${(v/10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v/100_000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                      />
                      <Tooltip content={<CustomTooltipInv />} />
                      <Line type="monotone" dataKey="fund" stroke="#4ade80" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="contributed" stroke="#3b82f6" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 mt-4 text-sm">
                    <span className="flex items-center gap-2 text-zinc-400"><span className="w-4 h-0.5 bg-green-400 inline-block" /> कुल कोष</span>
                    <span className="flex items-center gap-2 text-zinc-400"><span className="w-4 h-0.5 bg-blue-500 inline-block" /> योगदान</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════ LOAN TAB ══════════════ */}
        {activeTab === "loan" && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-black mb-6">ऋण / EMI क्यालकुलेटर</h2>

              {/* Loan presets */}
              <div className="mb-6">
                <p className="text-sm text-zinc-500 font-semibold mb-3">ऋण प्रकार</p>
                <div className="flex gap-2 flex-wrap">
                  {LOAN_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => { setLoanRate(p.rate); setLoanYears(p.years); }}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all text-left ${
                        loanRate === p.rate && loanYears === p.years
                          ? "border-amber-500 bg-amber-900/20 text-amber-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                      }`}
                    >
                      {p.label}
                      <span className="block text-xs font-normal mt-0.5 opacity-80">{p.rate}% · {p.years}yr · {p.limit}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <InputField label="ऋण रकम (NPR)" value={loanPrincipal} onChange={setLoanPrincipal} min={10_000} step={10_000} />
                <InputField label="वार्षिक ब्याज दर (%)" value={loanRate} onChange={setLoanRate} min={0} max={30} step={0.1} />
                <InputField label="अवधि (वर्ष)" value={loanYears} onChange={setLoanYears} min={1} max={30} />
              </div>
            </div>

            {loanData.emi > 0 && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <StatCard label="मासिक EMI"      value={formatNPR(loanData.emi)}          color="text-amber-400" />
                  <StatCard label="कुल भुक्तानी"   value={formatNPR(loanData.totalPayment)} color="text-red-400" />
                  <StatCard label="कुल ब्याज"      value={formatNPR(loanData.totalInterest)} color="text-zinc-400"
                    sub={`ब्याज: ${((loanData.totalInterest / loanPrincipal) * 100).toFixed(1)}%`}
                  />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                  <h2 className="text-xl font-black mb-1">भुक्तानी विवरण</h2>
                  <p className="text-zinc-500 text-sm mb-6">संचित मूलधन र ब्याज भुक्तानी</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={loanData.rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="year" tick={{ fill: "#71717a", fontSize: 12 }}
                        label={{ value: "वर्ष", position: "insideBottom", offset: -2, fill: "#52525b" }}
                      />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={50}
                        tickFormatter={(v) => v >= 100_000 ? `${(v/100_000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                      />
                      <Tooltip content={<CustomTooltipLoan />} />
                      <Area type="monotone" dataKey="cumPrincipal" stackId="1" stroke="#3b82f6" fill="#1e3a5f" strokeWidth={2} name="मूलधन" />
                      <Area type="monotone" dataKey="cumInterest"  stackId="1" stroke="#ef4444" fill="#450a0a" strokeWidth={2} name="ब्याज" />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 mt-4 text-sm">
                    <span className="flex items-center gap-2 text-zinc-400"><span className="w-4 h-2 bg-blue-700 inline-block rounded" /> मूलधन</span>
                    <span className="flex items-center gap-2 text-zinc-400"><span className="w-4 h-2 bg-red-900 inline-block rounded" /> ब्याज</span>
                  </div>
                </div>

                {/* Loan info from data file */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4">उपलब्ध ऋण योजनाहरू</p>
                  <div className="space-y-3">
                    {LOAN_SCHEMES.filter((s) => s.interestRate !== null).map((s) => (
                      <div key={s.id} className="flex items-start gap-3 text-sm border-b border-zinc-800 pb-3 last:border-0 last:pb-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          s.organization === "EPF" ? "bg-blue-900/60 text-blue-300"
                          : s.organization === "CIT" ? "bg-purple-900/60 text-purple-300"
                          : "bg-orange-900/60 text-orange-300"
                        }`}>
                          {s.organization}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 font-semibold truncate">{s.titleNepali}</p>
                          <p className="text-zinc-500 text-xs mt-0.5">{s.interestRate}% ब्याज · {s.loanLimit ?? "—"}</p>
                        </div>
                        <button
                          onClick={() => { setLoanRate(s.interestRate!); }}
                          className="text-xs text-amber-400 hover:text-amber-300 shrink-0 font-semibold"
                        >
                          प्रयोग गर्नुस्
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════ INSURANCE TAB ══════════════ */}
        {activeTab === "insurance" && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-black mb-6">बीमा प्रिमियम अनुमानक</h2>

              {/* Sum assured presets */}
              <div className="mb-6">
                <p className="text-sm text-zinc-500 font-semibold mb-3">बीमा रकम</p>
                <div className="flex gap-2 flex-wrap">
                  {SUM_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setInsSumAssured(p.value)}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                        insSumAssured === p.value
                          ? "border-pink-500 bg-pink-900/20 text-pink-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <InputField label="उमेर" value={insAge} onChange={setInsAge} min={18} max={60} />
                <InputField label="बीमा रकम (NPR)" value={insSumAssured} onChange={setInsSumAssured} min={100_000} step={100_000} />
              </div>
            </div>

            {/* Insurance comparison */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-zinc-900 border border-pink-900/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pink-900/60 text-pink-300">जीवन बीमा</span>
                  <span className="text-zinc-500 text-xs">टर्म इन्स्योरेन्स</span>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">वार्षिक प्रिमियम</p>
                  <p className="text-pink-400 font-black text-2xl">{formatNPR(insTermPremium)}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">NPR {insTermPremium.toLocaleString()} / वर्ष</p>
                </div>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li className="flex gap-2"><span className="text-green-400">✓</span> शुद्ध जीवन सुरक्षा</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> कम प्रिमियम, उच्च कभरेज</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> {formatNPR(insSumAssured)} को कभरेज</li>
                </ul>
              </div>

              <div className="bg-zinc-900 border border-purple-900/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300">जीवन बीमा</span>
                  <span className="text-zinc-500 text-xs">एन्डाउमेन्ट</span>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">वार्षिक प्रिमियम</p>
                  <p className="text-purple-400 font-black text-2xl">{formatNPR(insEndowPremium)}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">बचत + सुरक्षा दुवै</p>
                </div>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li className="flex gap-2"><span className="text-green-400">✓</span> बचत + जीवन सुरक्षा</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> परिपक्वतामा एकमुस्त रकम</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> ४–७% अनुमानित रिटर्न</li>
                </ul>
              </div>

              <div className="bg-zinc-900 border border-teal-900/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300">स्वास्थ्य बीमा</span>
                  <span className="text-zinc-500 text-xs">सरकारी</span>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">वार्षिक प्रिमियम</p>
                  <p className="text-teal-400 font-black text-2xl">{formatNPR(insGovtHealth)}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">NPR १ लाख परिवार कभरेज</p>
                </div>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li className="flex gap-2"><span className="text-green-400">✓</span> परिवारको NPR १ लाख कभरेज</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> सरकारी अस्पताल नि:शुल्क</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> सबैभन्दा सस्तो विकल्प</li>
                </ul>
              </div>

              <div className="bg-zinc-900 border border-blue-900/40 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300">स्वास्थ्य बीमा</span>
                  <span className="text-zinc-500 text-xs">निजी</span>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs mb-1">अनुमानित प्रिमियम</p>
                  <p className="text-blue-400 font-black text-2xl">{formatNPR(insPrivHealth)}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{formatNPR(Math.min(insSumAssured, 500_000))} कभरेज</p>
                </div>
                <ul className="space-y-1 text-sm text-zinc-400">
                  <li className="flex gap-2"><span className="text-green-400">✓</span> निजी अस्पतालमा पनि</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> उच्च कभरेज सम्भव</li>
                  <li className="flex gap-2"><span className="text-green-400">✓</span> क्याशलेस सुविधा</li>
                </ul>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4">SSF बीमा सुविधाहरू (औपचारिक कर्मचारीहरूको लागि)</p>
              <div className="space-y-2 text-sm text-zinc-400">
                {[
                  ["SSF स्वास्थ्य बीमा", "SSF योगदानमा समावेश"],
                  ["SSF दुर्घटना बीमा", "NPR १४ लाखसम्म"],
                  ["SSF मातृत्व सुविधा", "प्रसूति खर्च NPR ३०,०००सम्म"],
                  ["CIT नागरिक बीमा (CICI)", "सरकारी कर्मचारीहरूको लागि"],
                ].map(([name, val]) => (
                  <div key={name} className="flex justify-between items-center py-2 border-b border-zinc-800 last:border-0">
                    <span>{name}</span>
                    <span className="text-green-400 font-semibold text-xs">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-zinc-700 text-xs text-center">* प्रिमियम अनुमान मात्र हो। वास्तविक प्रिमियमका लागि बीमा कम्पनीसँग सम्पर्क गर्नुस्।</p>
          </div>
        )}

        {/* ══════════════ PENSION TAB ══════════════ */}
        {activeTab === "pension" && (
          <div className="space-y-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
              <h2 className="text-2xl font-black mb-2">पेन्सन क्यालकुलेटर</h2>
              <p className="text-zinc-500 text-sm mb-6">SSF पेन्सन फार्मुला: तलब × सेवा वर्ष × १.३३%</p>

              <div className="grid md:grid-cols-2 gap-6">
                <InputField label="मासिक तलब (NPR)" value={penSalary} onChange={setPenSalary} min={10_000} step={1_000} />
                <InputField label="हालको उमेर" value={penCurrentAge} onChange={setPenCurrentAge} min={18} max={59} />
                <InputField label="सेवानिवृत्ति उमेर" value={penRetirementAge} onChange={setPenRetirementAge} min={50} max={70} />
                <div className="bg-black/30 rounded-2xl p-4 flex items-center">
                  <div>
                    <p className="text-zinc-500 text-xs mb-1">सेवा वर्ष</p>
                    <p className="text-white font-black text-3xl">{Math.max(0, penRetirementAge - penCurrentAge)}</p>
                    <p className="text-zinc-600 text-xs mt-1">मासिक योगदान (३१%): {formatNPR(penData.monthlyContrib)}</p>
                  </div>
                </div>
              </div>
            </div>

            {penData.rows.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <StatCard label="अनुमानित मासिक पेन्सन"   value={formatNPR(penData.monthlyPension)} color="text-purple-400" sub="SSF फार्मुला अनुसार" />
                  <StatCard label="संचित SSF कोष (अनुमानित)" value={formatNPR(penData.corpus)}         color="text-green-400" sub="८.५% वार्षिक ब्याजमा" />
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                  <h2 className="text-xl font-black mb-1">SSF कोष वृद्धि</h2>
                  <p className="text-zinc-500 text-sm mb-6">
                    उमेर {penCurrentAge} → {penRetirementAge} · {Math.max(0, penRetirementAge - penCurrentAge)} वर्ष · ८.५%/वर्ष
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={penData.rows} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="age" tick={{ fill: "#71717a", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#71717a", fontSize: 11 }} width={55}
                        tickFormatter={(v) => v >= 10_000_000 ? `${(v/10_000_000).toFixed(1)}Cr` : v >= 100_000 ? `${(v/100_000).toFixed(0)}L` : `${(v/1000).toFixed(0)}K`}
                      />
                      <Tooltip formatter={(v: unknown) => formatNPR(Number(v))} labelFormatter={(l) => `उमेर ${l}`} />
                      <Line type="monotone" dataKey="corpus" stroke="#a855f7" strokeWidth={2.5} dot={false} name="संचित कोष" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4">पेन्सन विकल्प तुलना</p>
                  <div className="space-y-3">
                    {[
                      { name: "SSF पेन्सन",       val: `${formatNPR(penData.monthlyPension)}/महिना`,  note: "न्यूनतम १५ वर्ष सेवा पछि ६० वर्षमा" },
                      { name: "EPF एकमुस्त",       val: formatNPR(penData.corpus * 0.65),             note: "संचित EPF + ग्राच्युटी (अनुमानित)" },
                      { name: "CIT पेन्सन पूरक",   val: `${formatNPR(penData.monthlyContrib * 0.3)}/महिना`, note: "CIT मा थप लगानी गर्दा" },
                    ].map((row) => (
                      <div key={row.name} className="flex justify-between items-start py-3 border-b border-zinc-800 last:border-0">
                        <div>
                          <p className="text-white font-semibold text-sm">{row.name}</p>
                          <p className="text-zinc-600 text-xs mt-0.5">{row.note}</p>
                        </div>
                        <p className="text-green-400 font-black text-sm shrink-0 ml-4">{row.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <p className="text-zinc-700 text-xs text-center">* SSF पेन्सन फार्मुला: तलब × सेवा वर्ष × १.३३% = मासिक पेन्सन। वास्तविक पेन्सन SSF नियमानुसार फरक हुन सक्छ।</p>
          </div>
        )}

      </div>
    </main>
  );
}
