"use client";

import type { SchemeMetricsHookReturn } from "../../../hooks/useSchemeMetrics";
import { InsightBox } from "../../../components/calculator";
import { SchemeSortTable } from "../../../components/calculator";

export function RiskTab({ metrics, sortCol, sortAsc, toggleSort }: SchemeMetricsHookReturn) {
  const negativeRealReturns = metrics.filter(m => m.realReturn < 0).length;
  const negativeSharpie     = metrics.filter(m => m.sharpeScore < 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">जोखिम विश्लेषण</h2>
        <p className="text-xs text-zinc-500">{metrics.length} योजनाहरू</p>
      </div>

      {negativeRealReturns > 0 && (
        <InsightBox type="danger">
          <strong>{negativeRealReturns} योजना</strong>को वास्तविक रिटर्न नकारात्मक छ (मुद्रास्फीति भन्दा कम)।
          यी योजनामा लगानी गर्नुले क्रय शक्ति घटाउँछ।
        </InsightBox>
      )}

      {negativeSharpie > 0 && (
        <InsightBox type="warning">
          <strong>{negativeSharpie} योजना</strong>को Sharpe Score नकारात्मक — जोखिम-समायोजित रिटर्न
          नेपाल T-bill (६.५%) भन्दा कम।
        </InsightBox>
      )}

      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-1">
        <SchemeSortTable
          metrics={metrics}
          sortCol={sortCol}
          sortAsc={sortAsc}
          onSort={toggleSort}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-500">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="font-semibold text-zinc-400 mb-1">वास्तविक रिटर्न</p>
          <p>नाममात्र% − मुद्रास्फीति (Fisher Equation)। नकारात्मक = क्रय शक्ति गुम।</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="font-semibold text-zinc-400 mb-1">Sharpe Score</p>
          <p>(रिटर्न − जोखिम-रहित दर) ÷ अस्थिरता। &gt;2 = उत्कृष्ट। नकारात्मक = खराब।</p>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <p className="font-semibold text-zinc-400 mb-1">जोखिम/तरलता</p>
          <p>1–10 स्केल। उच्च जोखिम = ९+। SSF/EPF = तरलता कम तर सुरक्षित।</p>
        </div>
      </div>
    </div>
  );
}
