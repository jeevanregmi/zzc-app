"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | "loading" | "result" | "error";
type Risk = "Low" | "Medium" | "High";

interface Sifaris {
  name: string;
  nepaliName: string;
  rank: number;
  kina: string;
  faida: string[];
  savdhan: string;
  jokhimLevel: string;
  anumaanitReturn: string;
}

interface Result {
  sifaris: Sifaris[];
  samgraSalah: string;
  mukhyaSandesh: string;
}

/* ─── Constants ──────────────────────────────────────────── */
const INCOME_PRESETS = [
  { label: "NPR १०,०००–२५,०००", desc: "सुरुवाती / अंशकालिक", value: 17_500 },
  { label: "NPR २५,०००–५०,०००", desc: "सामान्य तलब",          value: 37_500 },
  { label: "NPR ५०,०००–१,००,०००", desc: "राम्रो तलब",          value: 75_000 },
  { label: "NPR १,००,०००–२,००,०००", desc: "उच्च तलब",          value: 150_000 },
  { label: "NPR २,००,०००+",        desc: "अत्यधिक उच्च",       value: 250_000 },
];

const RISK_OPTIONS: { value: Risk; label: string; sub: string; emoji: string }[] = [
  { value: "Low",    label: "कम जोखिम",    sub: "मेरो बचत सुरक्षित राखौं",         emoji: "🛡️" },
  { value: "Medium", label: "मध्यम जोखिम", sub: "सन्तुलित जोखिम र रिटर्न",         emoji: "⚖️" },
  { value: "High",   label: "उच्च जोखिम",  sub: "बढी रिटर्नको लागि बढी जोखिम लिन्छु", emoji: "🚀" },
];

/* Tailwind classes must be static strings for the JIT compiler */
const RISK_SELECTED: Record<Risk, string> = {
  Low:    "border-blue-500 bg-blue-900/20",
  Medium: "border-amber-500 bg-amber-900/20",
  High:   "border-orange-500 bg-orange-900/20",
};

const SCHEME_STYLES: Record<string, { badge: string; glow: string }> = {
  EPF:   { badge: "bg-green-900/60 text-green-300",   glow: "border-green-700" },
  CIT:   { badge: "bg-blue-900/60 text-blue-300",     glow: "border-blue-700" },
  SSF:   { badge: "bg-purple-900/60 text-purple-300", glow: "border-purple-700" },
  NEPSE: { badge: "bg-orange-900/60 text-orange-300", glow: "border-orange-700" },
  Beema: { badge: "bg-pink-900/60 text-pink-300",     glow: "border-pink-700" },
};

const RISK_BADGE: Record<string, string> = {
  "कम":     "bg-blue-900/60 text-blue-300",
  "मध्यम":  "bg-amber-900/60 text-amber-300",
  "उच्च":   "bg-red-900/60 text-red-300",
};

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

function SchemeCard({ s, isTop }: { s: Sifaris; isTop: boolean }) {
  const styles = SCHEME_STYLES[s.name] ?? {
    badge: "bg-zinc-800 text-zinc-300",
    glow: "border-zinc-700",
  };

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
          {isTop && (
            <span className="text-2xl" title="शीर्ष सिफारिस">🏆</span>
          )}
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
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              RISK_BADGE[s.jokhimLevel] ?? "bg-zinc-800 text-zinc-400"
            }`}
          >
            {s.jokhimLevel} जोखिम
          </span>
          <span className="text-green-400 font-black text-sm">{s.anumaanitReturn}</span>
        </div>
      </div>

      {/* Why */}
      <div className="bg-black/30 rounded-2xl p-4">
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-1">
          किन उपयुक्त?
        </p>
        <p className="text-zinc-200 text-sm leading-relaxed">{s.kina}</p>
      </div>

      {/* Benefits */}
      <div>
        <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider mb-2">
          मुख्य फाइदाहरू
        </p>
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
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */

export default function RecommendClient() {
  const [step, setStep] = useState<Step>(1);
  const [age, setAge] = useState(25);
  const [income, setIncome] = useState<number | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setStep(1);
    setAge(25);
    setIncome(null);
    setRisk(null);
    setResult(null);
    setErrorMsg("");
  };

  const handleSubmit = async () => {
    if (!income || !risk) return;
    setStep("loading");
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age, income, risk }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data as Result);
      setStep("result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "अज्ञात त्रुटि भयो।");
      setStep("error");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white px-4 py-12">
      <div className="max-w-lg mx-auto">

        {/* ── Page Header ── */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-4xl font-black text-white mb-3">
            AI <span className="text-green-400">लगानी सिफारिस</span>
          </h1>
          <p className="text-zinc-400 text-base">
            ३ प्रश्नको जवाफ दिनुस् — Claude AI ले तपाईंको लागि
            उत्तम नेपाली लगानी योजनाहरू सिफारिस गर्नेछ।
          </p>
        </div>

        {/* ── Step Dots ── */}
        {(step === 1 || step === 2 || step === 3) && (
          <StepDots current={step as number} />
        )}

        {/* ════════════════════════════════════ */}
        {/* Step 1 — Age                        */}
        {/* ════════════════════════════════════ */}
        {step === 1 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-8">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">
                प्रश्न १ / ३
              </p>
              <h2 className="text-2xl font-black text-white">उमेर कति हो?</h2>
            </div>

            <div className="text-center">
              <div className="text-9xl font-black text-green-400 tabular-nums leading-none">
                {age}
              </div>
              <p className="text-zinc-500 text-sm mt-2">वर्ष</p>
            </div>

            <div className="space-y-2">
              <input
                type="range"
                min={18}
                max={65}
                step={1}
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full h-2 rounded-full accent-green-400 cursor-pointer bg-zinc-700"
              />
              <div className="flex justify-between text-xs text-zinc-600 font-medium">
                <span>१८</span>
                <span>२५</span>
                <span>३५</span>
                <span>४५</span>
                <span>५५</span>
                <span>६५</span>
              </div>
            </div>

            {/* Age insight */}
            <div className="bg-green-900/20 border border-green-900/40 rounded-2xl px-4 py-3 text-sm text-green-300">
              {age < 25
                ? "युवा उमेर — अहिले लगानी सुरु गर्नुभयो भने सबैभन्दा फाइदाजनक हुन्छ!"
                : age < 35
                ? "उत्तम उमेर — दीर्घकालीन लगानीका लागि अझै धेरै समय छ।"
                : age < 45
                ? "मध्यम उमेर — सन्तुलित रणनीति सबैभन्दा उपयुक्त।"
                : "परिपक्व उमेर — सुरक्षित र स्थिर लगानीलाई प्राथमिकता दिनुस्।"}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-green-500 hover:bg-green-400 active:bg-green-600 text-black font-black py-4 rounded-2xl text-lg transition-colors"
            >
              अगाडि →
            </button>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* Step 2 — Income                     */}
        {/* ════════════════════════════════════ */}
        {step === 2 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">
                प्रश्न २ / ३
              </p>
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
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 active:bg-green-600 text-black font-black py-4 rounded-2xl text-lg transition-colors"
              >
                अगाडि →
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* Step 3 — Risk                       */}
        {/* ════════════════════════════════════ */}
        {step === 3 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 space-y-6">
            <div>
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-1">
                प्रश्न ३ / ३
              </p>
              <h2 className="text-2xl font-black text-white">जोखिम क्षमता के छ?</h2>
              <p className="text-zinc-500 text-sm mt-1">
                लगानी गुम्ने सम्भावनामा तपाईं कति सहज हुनुहुन्छ?
              </p>
            </div>

            <div className="space-y-3">
              {RISK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRisk(opt.value)}
                  className={`w-full text-left px-5 py-5 rounded-2xl border transition-all ${
                    risk === opt.value
                      ? RISK_SELECTED[opt.value]
                      : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{opt.emoji}</span>
                    <div>
                      <div className="font-black text-lg text-white">{opt.label}</div>
                      <div className="text-sm text-zinc-400 mt-0.5">{opt.sub}</div>
                    </div>
                    {risk === opt.value && (
                      <span className="ml-auto text-green-400 text-xl">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-4 rounded-2xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 font-semibold transition-colors"
              >
                ← पछाडि
              </button>
              <button
                onClick={handleSubmit}
                disabled={risk === null}
                className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-zinc-800 disabled:text-zinc-600 active:bg-green-600 text-black font-black py-4 rounded-2xl text-base transition-colors"
              >
                🤖 AI सिफारिस पाउनुस्
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* Loading                             */}
        {/* ════════════════════════════════════ */}
        {step === "loading" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <LoadingView />
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* Error                               */}
        {/* ════════════════════════════════════ */}
        {step === "error" && (
          <div className="bg-zinc-900 border border-red-900/50 rounded-3xl p-8 text-center space-y-6">
            <div className="text-5xl">😔</div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">सिफारिस लिन सकिएन</h2>
              <p className="text-red-400 text-sm">{errorMsg}</p>
            </div>
            <button
              onClick={reset}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-4 rounded-2xl text-lg transition-colors"
            >
              पुनः प्रयास गर्नुस्
            </button>
          </div>
        )}

        {/* ════════════════════════════════════ */}
        {/* Result                              */}
        {/* ════════════════════════════════════ */}
        {step === "result" && result && (
          <div className="space-y-6">
            {/* Result header */}
            <div className="text-center">
              <p className="text-zinc-400 text-sm uppercase tracking-widest font-semibold mb-2">
                तपाईंको AI सिफारिस
              </p>
              <h2 className="text-3xl font-black text-white">
                उमेर <span className="text-green-400">{age}</span> ·{" "}
                {income && income >= 100_000
                  ? `NPR ${(income / 100_000).toFixed(1)} लाख`
                  : income
                  ? `NPR ${income.toLocaleString()}`
                  : ""}{" "}
                · {risk === "Low" ? "कम" : risk === "Medium" ? "मध्यम" : "उच्च"} जोखिम
              </h2>
            </div>

            {/* Key message */}
            {result.mukhyaSandesh && (
              <div className="bg-green-900/20 border border-green-700/50 rounded-2xl px-5 py-4">
                <p className="text-xs text-green-500 font-semibold uppercase tracking-wider mb-1">
                  💡 मुख्य सन्देश
                </p>
                <p className="text-green-100 text-sm leading-relaxed">{result.mukhyaSandesh}</p>
              </div>
            )}

            {/* Scheme cards */}
            {Array.isArray(result.sifaris) &&
              [...result.sifaris]
                .sort((a, b) => a.rank - b.rank)
                .map((s, i) => (
                  <SchemeCard key={i} s={s} isTop={i === 0} />
                ))}

            {/* Overall advice */}
            {result.samgraSalah && (
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-6 space-y-2">
                <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">
                  📊 समग्र लगानी सल्लाह
                </p>
                <p className="text-zinc-200 text-sm leading-relaxed">{result.samgraSalah}</p>
              </div>
            )}

            {/* CTA */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
              <Link
                href="/"
                className="flex-1 text-center bg-green-500 hover:bg-green-400 text-black font-black py-3 rounded-xl transition-colors text-sm"
              >
                योजनाहरू हेर्नुस् →
              </Link>
              <button
                onClick={reset}
                className="flex-1 text-center border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold py-3 rounded-xl transition-colors text-sm"
              >
                पुनः सिफारिस लिनुस्
              </button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-zinc-700 text-xs px-4 pb-6">
              यो AI सिफारिस शैक्षिक उद्देश्यको लागि मात्र हो। लगानी निर्णय गर्नुअघि
              वित्तीय विशेषज्ञसँग सल्लाह लिनुस्।
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
