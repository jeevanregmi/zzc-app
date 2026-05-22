"use client";

import { useRef, useState } from "react";
import { useVaultAuth } from "../../../hooks/vault/useVaultAuth";

interface SSFContribution {
  month:          string;
  employeeAmount: number;
  employerAmount: number;
  total:          number;
}

interface SSFResult {
  ok:                   boolean;
  provider?:            string;
  memberName?:          string;
  memberId?:            string;
  employerName?:        string;
  contributions:        SSFContribution[];
  missingMonths:        string[];
  totalEmployee:        number;
  totalEmployer:        number;
  totalAccumulated:     number;
  contributionPeriod:   string;
  monthsContributed:    number;
  recommendations:      string[];
  nepaliSummary:        string;
  warnings:             string[];
  confidence:           number;
}

const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

function fmtNPR(n: number): string {
  if (!n) return "—";
  return "NPR " + n.toLocaleString("en-NP");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]); // strip data:mime;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function SSFClient() {
  const { user } = useVaultAuth();
  const inputRef  = useRef<HTMLInputElement>(null);

  const [file,      setFile]      = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result,    setResult]    = useState<SSFResult | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (!ALLOWED.includes(f.type)) {
      setError("Only PDF or image files (JPEG, PNG, WebP) are supported.");
      return;
    }
    setFile(f);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/analyze-ssf", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ base64, mimeType: file.type, fileName: file.name }),
      });
      const data = await res.json() as SSFResult & { error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Analysis failed. Retry.");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(`Network error: ${String(err)}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white">SSF Copilot</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Upload your SSF statement — AI extracts contribution history, finds missing months, and gives you actionable recommendations.
        </p>
        <div className="mt-3 flex gap-2 flex-wrap">
          {["No passwords stored", "No auto-transactions", "Read-only analysis", "Founder only"].map(tag => (
            <span key={tag} className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      {!result && (
        <div className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-zinc-700 hover:border-green-600 rounded-2xl p-10 text-center cursor-pointer transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ALLOWED.join(",")}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <p className="text-3xl mb-3">📋</p>
            <p className="text-zinc-400 text-sm">Click to select your SSF statement</p>
            <p className="text-zinc-600 text-xs mt-1">PDF or image (JPEG, PNG, WebP)</p>
            {file && (
              <p className="text-green-400 text-xs mt-2 font-semibold">{file.name} selected</p>
            )}
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-800 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!file || analyzing}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-black py-3 rounded-xl text-sm transition-colors"
          >
            {analyzing ? "Analyzing statement…" : "Analyze with AI →"}
          </button>

          <p className="text-zinc-700 text-xs text-center">
            Statement data is processed by AI and is not stored. Only you can see this analysis.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-black text-lg">{result.memberName ?? "SSF Member"}</p>
                {result.memberId && <p className="text-zinc-500 text-xs">Member ID: {result.memberId}</p>}
                {result.employerName && <p className="text-zinc-500 text-xs">Employer: {result.employerName}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full border font-semibold shrink-0 ${
                result.confidence >= 0.7 ? "bg-green-950 text-green-400 border-green-800"
                : result.confidence >= 0.4 ? "bg-amber-950 text-amber-400 border-amber-800"
                : "bg-red-950 text-red-400 border-red-800"
              }`}>
                {Math.round(result.confidence * 100)}% confidence
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Months Contributed", value: String(result.monthsContributed) },
                { label: "Your Contributions", value: fmtNPR(result.totalEmployee) },
                { label: "Employer Added",     value: fmtNPR(result.totalEmployer) },
                { label: "Total Accumulated",  value: fmtNPR(result.totalAccumulated), highlight: true },
              ].map(stat => (
                <div key={stat.label} className={`rounded-xl p-3 text-center ${stat.highlight ? "bg-green-950/50 border border-green-900" : "bg-zinc-800"}`}>
                  <p className={`text-lg font-black font-mono ${stat.highlight ? "text-green-400" : "text-white"}`}>{stat.value}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {result.contributionPeriod && (
              <p className="text-zinc-500 text-xs">Period: {result.contributionPeriod}</p>
            )}
          </div>

          {/* Nepali summary */}
          {result.nepaliSummary && (
            <div className="bg-blue-950/40 border border-blue-900/50 rounded-2xl p-4">
              <p className="text-blue-400 text-xs font-semibold mb-2">सरल नेपालीमा सारांश</p>
              <p className="text-blue-200 text-sm">{result.nepaliSummary}</p>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="bg-amber-950/40 border border-amber-800 rounded-2xl p-4 space-y-2">
              <p className="text-amber-400 text-xs font-semibold">Warnings</p>
              {result.warnings.map((w, i) => (
                <p key={i} className="text-amber-300 text-sm flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠</span>{w}
                </p>
              ))}
            </div>
          )}

          {/* Missing months */}
          {result.missingMonths.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2">
              <p className="text-red-400 text-xs font-semibold">Missing / Zero Contribution Months ({result.missingMonths.length})</p>
              <div className="flex flex-wrap gap-2">
                {result.missingMonths.map(m => (
                  <span key={m} className="text-xs bg-red-950 text-red-400 border border-red-900 px-2 py-0.5 rounded-full">{m}</span>
                ))}
              </div>
              <p className="text-zinc-600 text-xs">Contact your employer or file at{" "}
                <a href="https://ssf.gov.np" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ssf.gov.np</a>
              </p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
              <p className="text-green-400 text-xs font-semibold">Recommendations</p>
              {result.recommendations.map((r, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-green-600 shrink-0 mt-0.5 text-xs">→</span>
                  <p className="text-zinc-300 text-sm">{r}</p>
                </div>
              ))}
            </div>
          )}

          {/* Contribution history table */}
          {result.contributions.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-800">
                <p className="text-zinc-400 text-xs font-semibold">Contribution History ({result.contributions.length} months)</p>
              </div>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                    <tr>
                      <th className="text-left px-4 py-2 text-zinc-500 font-medium">Month</th>
                      <th className="text-right px-4 py-2 text-zinc-500 font-medium">Employee</th>
                      <th className="text-right px-4 py-2 text-zinc-500 font-medium">Employer</th>
                      <th className="text-right px-4 py-2 text-zinc-500 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.contributions.map((c, i) => (
                      <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="px-4 py-2 text-zinc-300">{c.month}</td>
                        <td className="px-4 py-2 text-right font-mono text-zinc-400">{c.employeeAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-zinc-400">{c.employerAmount.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right font-mono text-green-400">{c.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Provider + re-analyze */}
          <div className="flex items-center justify-between pt-2">
            <p className="text-zinc-700 text-xs">Analyzed by {result.provider ?? "AI"} · Data not stored</p>
            <button
              onClick={() => { setResult(null); setFile(null); }}
              className="text-xs text-zinc-500 hover:text-white transition-colors"
            >
              Analyze another statement →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
