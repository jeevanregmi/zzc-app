"use client";

import { useState } from "react";
import Link from "next/link";
import {
  INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES,
  type Scheme, type SchemeCategory,
} from "../../lib/schemes-data";
import { createRecommendationClick } from "../../lib/vault/firestore";

/* ─── Types ──────────────────────────────────────────────── */
type Category = "investment" | "loan" | "insurance" | "pension";
type Step = "category" | 1 | 2 | 3 | "loading" | "result" | "error";
type Risk = "Low" | "Medium" | "High";

interface Sifaris {
  name: string;
  nepaliName: string;
  rank: number;
  kina: string;
  faida: string[];
  savdhan: string;
  // Investment
  jokhimLevel?: string;
  anumaanitReturn?: string;
  projectedValue?: string;
  // Loan
  estimatedLoan?: string;
  byajDar?: string;
  avadhi?: string;
  monthlyEMI?: string;
  // Insurance
  coverageType?: string;
  estimatedPremium?: string;
  suggestedCoverage?: string;
  // Pension
  estimatedMonthlyPension?: string;
  totalCorpus?: string;
  vestingPeriod?: string;
}

interface Result {
  category: Category;
  sifaris: Sifaris[];
  samgraSalah: string;
  mukhyaSandesh: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const CATEGORY_OPTIONS: {
  value: Category;
  icon: string;
  label: string;
  nepali: string;
  desc: string;
  schemes: string;
  count: number;
}[] = [
  {
    value: "investment",
    icon: "📈",
    label: "Investment",
    nepali: "लगानी",
    desc: "पैसा बढाउनुस्",
    schemes: INVESTMENT_SCHEMES.map((s) => s.organization).filter((v, i, a) => a.indexOf(v) === i).join(" · "),
    count: INVESTMENT_SCHEMES.length,
  },
  {
    value: "loan",
    icon: "🏠",
    label: "Loan",
    nepali: "ऋण",
    desc: "सही ऋण छान्नुस्",
    schemes: `EPF ${LOAN_SCHEMES.filter((s) => s.organization === "EPF").length} प्रकार · SSF ${LOAN_SCHEMES.filter((s) => s.organization === "SSF").length} प्रकार`,
    count: LOAN_SCHEMES.length,
  },
  {
    value: "insurance",
    icon: "🛡️",
    label: "Insurance",
    nepali: "बीमा",
    desc: "परिवार सुरक्षित राख्नुस्",
    schemes: INSURANCE_SCHEMES.map((s) => s.organization).filter((v, i, a) => a.indexOf(v) === i).join(" · "),
    count: INSURANCE_SCHEMES.length,
  },
  {
    value: "pension",
    icon: "🎯",
    label: "Pension",
    nepali: "पेन्सन",
    desc: "सेवानिवृत्तिको तयारी",
    schemes: PENSION_SCHEMES.map((s) => s.organization).filter((v, i, a) => a.indexOf(v) === i).join(" · "),
    count: PENSION_SCHEMES.length,
  },
];

const INCOME_PRESETS = [
  { label: "NPR १०,०००–२५,०००", desc: "सुरुवाती / अंशकालिक", value: 17_500 },
  { label: "NPR २५,०००–५०,०००", desc: "सामान्य तलब",          value: 37_500 },
  { label: "NPR ५०,०००–१,००,०००", desc: "राम्रो तलब",          value: 75_000 },
  { label: "NPR १,००,०००–२,००,०००", desc: "उच्च तलब",          value: 150_000 },
  { label: "NPR २,००,०००+",        desc: "अत्यधिक उच्च",       value: 250_000 },
];

const RISK_OPTIONS: { value: Risk; label: string; sub: string; emoji: string }[] = [
  { value: "Low",    label: "कम जोखिम",    sub: "मेरो बचत सुरक्षित राखौं",           emoji: "🛡️" },
  { value: "Medium", label: "मध्यम जोखिम", sub: "सन्तुलित जोखिम र रिटर्न",           emoji: "⚖️" },
  { value: "High",   label: "उच्च जोखिम",  sub: "बढी रिटर्नको लागि बढी जोखिम लिन्छु", emoji: "🚀" },
];

const LOAN_PURPOSES = [
  { value: "गृह खरिद", label: "गृह खरिद", emoji: "🏠" },
  { value: "गृह निर्माण", label: "गृह निर्माण", emoji: "🔨" },
  { value: "शिक्षा", label: "शिक्षा", emoji: "🎓" },
  { value: "व्यवसाय", label: "व्यवसाय", emoji: "💼" },
  { value: "आपतकालीन", label: "आपतकालीन", emoji: "🚨" },
];

const LOAN_AMOUNTS = [
  { label: "NPR ५०,०००–५ लाख",   value: 275_000 },
  { label: "NPR ५–१० लाख",       value: 750_000 },
  { label: "NPR १०–२५ लाख",      value: 1_750_000 },
  { label: "NPR २५–५० लाख",      value: 3_750_000 },
  { label: "NPR ५० लाख+",        value: 7_500_000 },
];

/* Tailwind static class maps */
const RISK_SELECTED: Record<Risk, string> = {
  Low:    "border-blue-500 bg-blue-900/20",
  Medium: "border-amber-500 bg-amber-900/20",
  High:   "border-orange-500 bg-orange-900/20",
};

const SCHEME_STYLES: Record<string, { badge: string; glow: string }> = {
  EPF:             { badge: "bg-green-900/60 text-green-300",   glow: "border-green-700" },
  CIT:             { badge: "bg-blue-900/60 text-blue-300",     glow: "border-blue-700" },
  SSF:             { badge: "bg-purple-900/60 text-purple-300", glow: "border-purple-700" },
  NEPSE:           { badge: "bg-orange-900/60 text-orange-300", glow: "border-orange-700" },
  "Jeevan Beema":  { badge: "bg-pink-900/60 text-pink-300",     glow: "border-pink-700" },
  "Swasthya Beema":{ badge: "bg-teal-900/60 text-teal-300",     glow: "border-teal-700" },
  "EPF Loan":      { badge: "bg-green-900/60 text-green-300",   glow: "border-green-700" },
  "Home Loan":     { badge: "bg-amber-900/60 text-amber-300",   glow: "border-amber-700" },
  "EPF Pension":   { badge: "bg-green-900/60 text-green-300",   glow: "border-green-700" },
};

const RISK_BADGE: Record<string, string> = {
  "कम":    "bg-blue-900/60 text-blue-300",
  "मध्यम": "bg-amber-900/60 text-amber-300",
  "उच्च":  "bg-red-900/60 text-red-300",
};

const CATEGORY_HEADER: Record<Category, { icon: string; label: string; accentClass: string }> = {
  investment: { icon: "📈", label: "लगानी सिफारिस",  accentClass: "text-green-400" },
  loan:       { icon: "🏠", label: "ऋण सिफारिस",     accentClass: "text-amber-400" },
  insurance:  { icon: "🛡️", label: "बीमा सिफारिस",   accentClass: "text-pink-400" },
  pension:    { icon: "🎯", label: "पेन्सन सिफारिस", accentClass: "text-purple-400" },
};

/* ─── Affiliate portal map ───────────────────────────────── */
const SCHEME_PORTAL: Record<string, string> = {
  "EPF":             "https://epf.gov.np",
  "SSF":             "https://ssf.gov.np",
  "CIT":             "https://online.cit.com.np",
  "NEPSE":           "https://tms.nepsegroup.com",
  "Jeevan Beema":    "https://nlic.gov.np",
  "Swasthya Beema":  "https://nhic.gov.np",
  "EPF Loan":        "https://epf.gov.np",
  "EPF Pension":     "https://epf.gov.np",
  "Home Loan":       "https://epf.gov.np",
};

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const key = "zzc_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
}

function trackClick(schemeName: string, schemeOrg: string, category: string, targetUrl: string) {
  createRecommendationClick({
    schemeName,
    schemeOrg,
    category,
    targetUrl,
    sessionId:  getSessionId(),
    timestamp:  new Date().toISOString(),
  }).catch(() => {});
}

/* ─── Sub-components ─────────────────────────────────────── */

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-10">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className={`rounded-full transition-all duration-300 ${
            n === current
              ? "w-8 h-3 bg-green-400"
              : n < current
              ? "w-3 h-3 bg-green-700"
              : "w-3 h-3 bg-zinc-700"
          }`}
        />
      ))}
    </div>
  );
}

function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6 text-center">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-zinc-700" />
        <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-t-green-400 animate-spin" />
        <span className="absolute inset-0 flex items-center justify-center text-3xl">🤖</span>
      </div>
      <div>
        <p className="text-xl font-bold text-white mb-1">AI सोच्दैछ…</p>
        <p className="text-zinc-500 text-sm">तपाईंको लागि उत्तम योजनाहरू खोजिँदैछ</p>
      </div>
      <div className="flex gap-2 mt-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-green-500 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function SchemeCard({ s, isTop, category }: { s: Sifaris; isTop: boolean; category: Category }) {
  const styles = SCHEME_STYLES[s.name] ?? { badge: "bg-zinc-800 text-zinc-300", glow: "border-zinc-700" };

  return (
    <div
      className={`rounded-3xl border p-6 space-y-4 ${
        isTop
          ? `${styles.glow} bg-zinc-900/80 shadow-lg shadow-green-900/20`
          : "border-zinc-800 bg-zinc-900/50"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {isTop && <span className="text-2xl">🏆</span>}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${styles.badge}`}>
                {s.name}
              </span>
              {isTop && (
                <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-900/60 text-green-300">
                  #१ सिफारिस
                </span>
              )}
            </div>
            <h3 className="font-black text-lg text-white mt-1">{s.nepaliName}</h3>
          </div>
        </div>

        {/* Category-specific stat badge */}
        <div className="flex flex-col items-end gap-1 shrink-0 text-right">
          {category === "investment" && s.anumaanitReturn && (
            <>
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${RISK_BADGE[s.jokhimLevel ?? ""] ?? "bg-zinc-800 text-zinc-400"}`}>
                {s.jokhimLevel} जोखिम
              </span>
              <span className="text-green-400 font-black text-sm">{s.anumaanitReturn}</span>
            </>
          )}
          {category === "loan" && s.byajDar && (
            <>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-900/60 text-amber-300">
                {s.avadhi}
              </span>
              <span className="text-amber-400 font-black text-sm">{s.byajDar} ब्याज</span>
            </>
          )}
          {category === "insurance" && s.coverageType && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-pink-900/60 text-pink-300">
              {s.coverageType}
            </span>
          )}
          {category === "pension" && s.vestingPeriod && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-900/60 text-purple-300">
              {s.vestingPeriod}
            </span>
          )}
        </div>
      </div>

      {/* Why */}
      <div className="bg-black/30 rounded-2xl p-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">किन उपयुक्त?</p>
        <p className="text-zinc-200 text-sm leading-relaxed">{s.kina}</p>
      </div>

      {/* Category-specific calculator stats */}
      {category === "investment" && s.projectedValue && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-900/10 border border-green-900/30 rounded-2xl p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">अनुमानित रिटर्न</p>
            <p className="text-green-400 font-black text-sm">{s.anumaanitReturn}</p>
          </div>
          <div className="bg-green-900/10 border border-green-900/30 rounded-2xl p-3 text-center">
            <p className="text-xs text-zinc-500 mb-1">भविष्यको मूल्य</p>
            <p className="text-green-400 font-black text-sm">{s.projectedValue}</p>
          </div>
        </div>
      )}
      {category === "loan" && (s.estimatedLoan || s.monthlyEMI) && (
        <div className="grid grid-cols-2 gap-3">
          {s.estimatedLoan && (
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">अनुमानित ऋण</p>
              <p className="text-amber-400 font-black text-sm">{s.estimatedLoan}</p>
            </div>
          )}
          {s.monthlyEMI && (
            <div className="bg-amber-900/10 border border-amber-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">मासिक EMI</p>
              <p className="text-amber-400 font-black text-sm">{s.monthlyEMI}</p>
            </div>
          )}
        </div>
      )}
      {category === "insurance" && (s.estimatedPremium || s.suggestedCoverage) && (
        <div className="grid grid-cols-2 gap-3">
          {s.estimatedPremium && (
            <div className="bg-pink-900/10 border border-pink-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">वार्षिक प्रिमियम</p>
              <p className="text-pink-400 font-black text-sm">{s.estimatedPremium}</p>
            </div>
          )}
          {s.suggestedCoverage && (
            <div className="bg-pink-900/10 border border-pink-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">सुझावित कभरेज</p>
              <p className="text-pink-400 font-black text-sm">{s.suggestedCoverage}</p>
            </div>
          )}
        </div>
      )}
      {category === "pension" && (s.estimatedMonthlyPension || s.totalCorpus) && (
        <div className="grid grid-cols-2 gap-3">
          {s.estimatedMonthlyPension && (
            <div className="bg-purple-900/10 border border-purple-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">मासिक पेन्सन</p>
              <p className="text-purple-400 font-black text-sm">{s.estimatedMonthlyPension}</p>
            </div>
          )}
          {s.totalCorpus && (
            <div className="bg-purple-900/10 border border-purple-900/30 rounded-2xl p-3 text-center">
              <p className="text-xs text-zinc-500 mb-1">संचित कोष</p>
              <p className="text-purple-400 font-black text-sm">{s.totalCorpus}</p>
            </div>
          )}
        </div>
      )}

      {/* Benefits */}
      <div>
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">मुख्य फाइदाहरू</p>
        <ul className="space-y-1.5">
          {s.faida.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
              <span className="text-green-400 shrink-0 mt-0.5">✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Caution */}
      {s.savdhan && (
        <div className="flex items-start gap-2 border border-amber-900/50 bg-amber-900/10 rounded-xl px-4 py-3">
          <span className="text-amber-400 shrink-0">⚠</span>
          <p className="text-amber-200/80 text-sm">{s.savdhan}</p>
        </div>
      )}

      {/* Apply CTA */}
      {SCHEME_PORTAL[s.name] && (
        <a
          href={SCHEME_PORTAL[s.name]}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(s.name, s.name.split(" ")[0], category, SCHEME_PORTAL[s.name])}
          className={`block w-full text-center font-black text-sm py-3 rounded-2xl transition-colors ${
            isTop
              ? "bg-green-500 hover:bg-green-400 text-black"
              : "border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white"
          }`}
        >
          अहिले नै आवेदन गर्नुस् →
        </a>
      )}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function RecommendClient() {
  const [step, setStep] = useState<Step>("category");
  const [category, setCategory] = useState<Category | null>(null);
  const [age, setAge] = useState(25);
  const [income, setIncome] = useState<number | null>(null);
  // Investment
  const [risk, setRisk] = useState<Risk | null>(null);
  // Loan
  const [loanPurpose, setLoanPurpose] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  // Insurance
  const [dependents, setDependents] = useState<number | null>(null);
  // Pension
  const [retirementAge, setRetirementAge] = useState(60);
  // Result
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setStep("category");
    setCategory(null);
    setAge(25);
    setIncome(null);
    setRisk(null);
    setLoanPurpose(null);
    setLoanAmount(null);
    setDependents(null);
    setRetirementAge(60);
    setResult(null);
    setErrorMsg("");
  };

  const step3Valid = (): boolean => {
    if (!category) return false;
    if (category === "investment") return risk !== null;
    if (category === "loan") return loanPurpose !== null && loanAmount !== null;
    if (category === "insurance") return dependents !== null;
    if (category === "pension") return retirementAge > age;
    return false;
  };

  const handleSubmit = async () => {
    if (!income || !category) return;
    setStep("loading");
    try {
      const payload: Record<string, unknown> = { category, age, income };
      if (category === "investment") payload.risk = risk;
      if (category === "loan") { payload.loanPurpose = loanPurpose; payload.loanAmount = loanAmount; }
      if (category === "insurance") payload.dependents = dependents;
      if (category === "pension") payload.retirementAge = retirementAge;

      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const rawText = await res.text();
      let data: { error?: string } & Partial<Result>;
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        setErrorMsg(`AI सेवा अस्थायी रूपमा बन्द छ (HTTP ${res.status})। केही मिनेट पछि पुनः प्रयास गर्नुस्।`);
        setStep("error");
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? `सर्भर त्रुटि (HTTP ${res.status})। केही मिनेट पछि पुनः प्रयास गर्नुस्।`);
        setStep("error");
        return;
      }

      setResult(data as Result);
      setStep("result");
    } catch {
      setErrorMsg("नेटवर्क समस्या भयो। इन्टरनेट जडान जाँच गर्नुस् र पुनः प्रयास गर्नुस्।");
      setStep("error");
    }
  };

  const meta = category ? CATEGORY_HEADER[category] : null;

  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-lg mx-auto">

        {/* ── Page Header ── */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-500 text-xs font-semibold tracking-widest uppercase">Nepal Finance Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            AI <span className="text-green-400">सिफारिस</span>
          </h1>
          <p className="text-zinc-500 text-sm">
            श्रेणी छान्नुस् — Claude AI ले तपाईंको लागि उत्तम नेपाली योजना सिफारिस गर्नेछ।
          </p>
        </div>

        {/* ── Step Dots (steps 1–3 only) ── */}
        {(step === 1 || step === 2 || step === 3) && (
          <StepDots current={step as number} />
        )}

        {/* ════════════ Category Selection ════════════ */}
        {step === "category" && (
          <div className="space-y-4">
            <p className="text-center text-zinc-400 text-sm font-semibold uppercase tracking-widest mb-6">
              के जान्न चाहनुहुन्छ?
            </p>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                onClick={() => { setCategory(cat.value); setStep(1); }}
                className="w-full text-left px-6 py-5 rounded-2xl border border-zinc-700 hover:border-green-600 hover:bg-zinc-900/60 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg text-white">{cat.nepali}</span>
                      <span className="text-xs text-zinc-600 font-medium">{cat.label}</span>
                      <span className="text-xs bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{cat.count} योजना</span>
                    </div>
                    <p className="text-zinc-500 text-sm">{cat.desc}</p>
                    <p className="text-zinc-700 text-xs mt-0.5">{cat.schemes}</p>
                  </div>
                  <span className="text-zinc-600 group-hover:text-green-400 transition-colors text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ════════════ Step 1 — Age ════════════ */}
        {step === 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न १ / ३</p>
              <h2 className="text-2xl font-black text-white">उमेर कति हो?</h2>
            </div>
            <div className="text-center">
              <div className="text-9xl font-black text-green-400 tabular-nums leading-none">{age}</div>
              <p className="text-zinc-500 text-sm mt-2">वर्ष</p>
            </div>
            <div className="space-y-2">
              <input
                type="range" min={18} max={65} step={1} value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-green-400 cursor-pointer bg-zinc-700"
              />
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                {["१८", "२५", "३५", "४५", "५५", "६५"].map((l) => <span key={l}>{l}</span>)}
              </div>
            </div>
            <div className="bg-green-900/20 border border-green-900/40 rounded-2xl px-4 py-3 text-sm text-green-300">
              {age < 25 ? "युवा उमेर — अहिले सुरु गर्नुभयो भने सबैभन्दा फाइदाजनक हुन्छ!"
                : age < 35 ? "उत्तम उमेर — दीर्घकालीन योजनाको लागि धेरै समय छ।"
                : age < 45 ? "मध्यम उमेर — सन्तुलित रणनीति उपयुक्त।"
                : "परिपक्व उमेर — सुरक्षित र स्थिर योजनालाई प्राथमिकता दिनुस्।"}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep("category")}
                className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors"
              >
                ← पछाडि
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl text-lg transition-colors"
              >
                अगाडि →
              </button>
            </div>
          </div>
        )}

        {/* ════════════ Step 2 — Income ════════════ */}
        {step === 2 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न २ / ३</p>
              <h2 className="text-2xl font-black text-white">मासिक आय कति छ?</h2>
              <p className="text-zinc-500 text-sm mt-1">आफ्नो तलब / आम्दानीको दायरा छान्नुस्।</p>
            </div>
            <div className="space-y-3">
              {INCOME_PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setIncome(p.value)}
                  className={`w-full text-left px-5 py-4 rounded-2xl border transition-all ${
                    income === p.value
                      ? "border-green-500 bg-green-900/20 text-white"
                      : "border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="font-bold text-base">{p.label}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors"
              >
                ← पछाडि
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={income === null}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl text-lg transition-colors"
              >
                अगाडि →
              </button>
            </div>
          </div>
        )}

        {/* ════════════ Step 3 — Category-specific ════════════ */}
        {step === 3 && category === "investment" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न ३ / ३</p>
              <h2 className="text-2xl font-black text-white">जोखिम क्षमता के छ?</h2>
              <p className="text-zinc-500 text-sm mt-1">लगानी गुम्ने सम्भावनामा तपाईं कति सहज हुनुहुन्छ?</p>
            </div>
            <div className="space-y-3">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRisk(opt.value)}
                  className={`w-full text-left px-5 py-5 rounded-2xl border transition-all ${
                    risk === opt.value ? RISK_SELECTED[opt.value] : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{opt.emoji}</span>
                    <div>
                      <div className="font-black text-lg text-white">{opt.label}</div>
                      <div className="text-sm text-zinc-400 mt-0.5">{opt.sub}</div>
                    </div>
                    {risk === opt.value && <span className="ml-auto text-green-400 text-xl">✓</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors">← पछाडि</button>
              <button onClick={handleSubmit} disabled={!step3Valid()} className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl text-base transition-colors">🤖 सिफारिस पाउनुस्</button>
            </div>
          </div>
        )}

        {step === 3 && category === "loan" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न ३ / ३</p>
              <h2 className="text-2xl font-black text-white">ऋणको विवरण</h2>
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-semibold mb-3">ऋणको उद्देश्य</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {LOAN_PURPOSES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setLoanPurpose(p.value)}
                    className={`px-4 py-3 rounded-2xl border text-sm font-semibold transition-all ${
                      loanPurpose === p.value
                        ? "border-amber-500 bg-amber-900/20 text-white"
                        : "border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className="block text-xl mb-1">{p.emoji}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-zinc-400 text-sm font-semibold mb-3">आवश्यक रकम</p>
              <div className="space-y-2">
                {LOAN_AMOUNTS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setLoanAmount(a.value)}
                    className={`w-full text-left px-5 py-3 rounded-2xl border transition-all ${
                      loanAmount === a.value
                        ? "border-amber-500 bg-amber-900/20 text-white"
                        : "border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:bg-zinc-800/50"
                    }`}
                  >
                    <span className="font-bold text-sm">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors">← पछाडि</button>
              <button onClick={handleSubmit} disabled={!step3Valid()} className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl text-base transition-colors">🤖 सिफारिस पाउनुस्</button>
            </div>
          </div>
        )}

        {step === 3 && category === "insurance" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न ३ / ३</p>
              <h2 className="text-2xl font-black text-white">आश्रित परिवार कति जना?</h2>
              <p className="text-zinc-500 text-sm mt-1">तपाईंको आयमा निर्भर परिवारका सदस्यहरू।</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setDependents(n)}
                  className={`py-6 rounded-2xl border text-center transition-all ${
                    dependents === n
                      ? "border-pink-500 bg-pink-900/20 text-white"
                      : "border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="text-2xl font-black text-white">{n === 5 ? "५+" : n}</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {n === 0 ? "आफू मात्र" : n === 1 ? "१ जना" : `${n} जना`}
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors">← पछाडि</button>
              <button onClick={handleSubmit} disabled={!step3Valid()} className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl text-base transition-colors">🤖 सिफारिस पाउनुस्</button>
            </div>
          </div>
        )}

        {step === 3 && category === "pension" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">प्रश्न ३ / ३</p>
              <h2 className="text-2xl font-black text-white">कति उमेरमा सेवानिवृत्त हुन चाहनुहुन्छ?</h2>
            </div>
            <div className="text-center">
              <div className="text-9xl font-black text-purple-400 tabular-nums leading-none">{retirementAge}</div>
              <p className="text-zinc-500 text-sm mt-2">वर्ष ({retirementAge - age} वर्ष बाँकी)</p>
            </div>
            <div className="space-y-2">
              <input
                type="range" min={Math.max(age + 5, 50)} max={70} step={1}
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-purple-400 cursor-pointer bg-zinc-700"
              />
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                {["५०", "५५", "६०", "६५", "७०"].map((l) => <span key={l}>{l}</span>)}
              </div>
            </div>
            <div className="bg-purple-900/20 border border-purple-900/40 rounded-2xl px-4 py-3 text-sm text-purple-300">
              {retirementAge - age >= 30
                ? "दीर्घकालीन योजना — SSF र EPF दुवैमा लगानी सुरु गर्नुस्।"
                : retirementAge - age >= 20
                ? "राम्रो समय छ — नियमित योगदान गर्दा राम्रो पेन्सन मिल्छ।"
                : "छोटो समय — बढी योगदान र सुरक्षित लगानी आवश्यक।"}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors">← पछाडि</button>
              <button onClick={handleSubmit} disabled={!step3Valid()} className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black font-black py-4 rounded-2xl text-base transition-colors">🤖 सिफारिस पाउनुस्</button>
            </div>
          </div>
        )}

        {/* ════════════ Loading ════════════ */}
        {step === "loading" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <LoadingView />
          </div>
        )}

        {/* ════════════ Error ════════════ */}
        {step === "error" && (
          <div className="bg-zinc-900 border border-red-900/50 rounded-3xl p-8 text-center space-y-6">
            <div className="text-5xl">😔</div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">सिफारिस लिन सकिएन</h2>
              <p className="text-red-400 text-sm">{errorMsg}</p>
            </div>
            <button onClick={reset} className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl text-lg transition-colors">पुनः प्रयास गर्नुस्</button>
          </div>
        )}

        {/* ════════════ Result ════════════ */}
        {step === "result" && result && meta && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{meta.icon}</div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">तपाईंको AI सिफारिस</p>
              <h2 className={`text-3xl font-black ${meta.accentClass}`}>{meta.label}</h2>
            </div>

            {result.mukhyaSandesh && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-2xl px-5 py-4">
                <p className="text-xs text-green-500 font-semibold uppercase tracking-wider mb-1">💡 मुख्य सन्देश</p>
                <p className="text-green-100 text-sm leading-relaxed">{result.mukhyaSandesh}</p>
              </div>
            )}

            {Array.isArray(result.sifaris) &&
              [...result.sifaris]
                .sort((a, b) => a.rank - b.rank)
                .map((s, i) => (
                  <SchemeCard key={i} s={s} isTop={i === 0} category={result.category} />
                ))}

            {result.samgraSalah && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 space-y-2">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">📊 समग्र सल्लाह</p>
                <p className="text-zinc-200 text-sm leading-relaxed">{result.samgraSalah}</p>
              </div>
            )}

            {/* Related schemes from data file */}
            {(() => {
              const catMap: Record<Category, Scheme[]> = {
                investment: INVESTMENT_SCHEMES,
                loan:       LOAN_SCHEMES,
                insurance:  INSURANCE_SCHEMES,
                pension:    PENSION_SCHEMES,
              };
              const schemes = catMap[result.category];
              if (!schemes.length) return null;
              return (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                  <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-4">
                    📋 उपलब्ध {result.category === "investment" ? "लगानी" : result.category === "loan" ? "ऋण" : result.category === "insurance" ? "बीमा" : "पेन्सन"} योजनाहरू
                  </p>
                  <div className="space-y-3">
                    {schemes.map((s) => (
                      <div key={s.id} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${
                          s.organization === "EPF"   ? "bg-blue-900/60 text-blue-300"
                          : s.organization === "CIT" ? "bg-purple-900/60 text-purple-300"
                          : s.organization === "SSF" ? "bg-orange-900/60 text-orange-300"
                          : s.organization === "NEPSE" ? "bg-green-900/60 text-green-300"
                          : "bg-rose-900/60 text-rose-300"
                        }`}>
                          {s.organization}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 font-semibold text-sm">{s.titleNepali}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            <span className="text-zinc-600 text-xs">{s.riskLevel}</span>
                            {s.interestRate && <span className="text-zinc-600 text-xs">· {s.interestRate}% ब्याज</span>}
                            {s.loanLimit && <span className="text-zinc-600 text-xs">· {s.loanLimit.split(" ")[2] ?? s.loanLimit}</span>}
                            {s.pensionFormula && <span className="text-zinc-600 text-xs">· {s.pensionFormula}</span>}
                          </div>
                        </div>
                        <span className="text-xs text-zinc-700 font-medium shrink-0">{s.liquidity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
              <Link href="/" className="flex-1 text-center bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-xl transition-colors text-sm">
                योजनाहरू हेर्नुस् →
              </Link>
              <button onClick={reset} className="flex-1 text-center border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                पुनः सिफारिस लिनुस्
              </button>
            </div>

            <p className="text-center text-zinc-700 text-xs px-4 pb-6">
              यो AI सिफारिस शैक्षिक उद्देश्यको लागि मात्र हो। लगानी निर्णय गर्नुअघि वित्तीय विशेषज्ञसँग सल्लाह लिनुस्।
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
