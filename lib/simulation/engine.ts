/**
 * ZZC Simulation Engine — Strategic core for probabilistic financial analysis
 *
 * Responsibilities:
 *   Monte Carlo  → stochastic retirement outcomes (1000 trials, Box-Muller)
 *   Scenarios    → deterministic sensitivity analysis (5 Nepal-calibrated cases)
 *
 * Architecture notes:
 *   - Zero React, zero DOM, zero browser APIs — runs in Web Workers, Node.js, or server
 *   - All inputs/outputs are plain serializable objects (no class instances, no functions)
 *   - Deterministic-seeded PRNG is a future upgrade; current Math.random() is adequate
 *     for UX-grade Monte Carlo but not for regulatory stress testing
 *
 * Future extension points (design for, not implement):
 *   - Swap Math.random() for mulberry32(seed) for reproducible simulations
 *   - Add runPortfolioOptimizer(holdings, constraints) for mean-variance optimization
 *   - Add runStressTest(snapshot, shockScenarios) for black swan events
 *   - Parallelize via Worker.postMessage(config) since all state is serializable
 *
 * TECHNICAL DEBT TO WATCH:
 *   1. Histogram bucket count (10) is hardcoded. If corpus ranges span 50x,
 *      the rightmost bucket will be enormous. Use log-scale bucketing for wide ranges.
 *   2. retirementReal comparison uses real-term corpus vs real-term required.
 *      This assumes inflation cancels out symmetrically — valid for central estimates
 *      but may understate tail risk in hyperinflation trials.
 *   3. postRetirementReturn is not stochastic in current impl (only accumulation phase
 *      randomizes). Full simulation should randomize both phases.
 */

import type {
  MonteCarloConfig, MonteCarloResult,
  ScenarioVars, ScenarioResult,
  SIPInputs, RetirementInputs,
} from "../types/financial";
import { calcSIPFull, calcRetirementFull, formatNPR } from "../finance-engine";

// ─── Nepal-calibrated scenario parameters ────────────────────────────────────
//
// Derived from NRB macroeconomic reports 2020-2025:
//   Inflation range:     4%–9% (avg 6.5%)
//   Equity return range: 6.5%–14% (EPF 8.5%, NEPSE avg ~12%)
//   Salary growth range: 4%–12% (avg 7%)

export const NEPAL_SCENARIOS: ScenarioVars[] = [
  { label: "निराशावादी",  inflationRate: 9.0,  nominalReturn: 6.5,  salaryGrowthRate: 4.0  },
  { label: "रूढिवादी",    inflationRate: 8.0,  nominalReturn: 8.0,  salaryGrowthRate: 5.5  },
  { label: "आधारभूत",    inflationRate: 6.5,  nominalReturn: 9.0,  salaryGrowthRate: 7.0  },
  { label: "आशावादी",    inflationRate: 5.0,  nominalReturn: 11.0, salaryGrowthRate: 9.0  },
  { label: "अति-आशावादी", inflationRate: 4.0,  nominalReturn: 14.0, salaryGrowthRate: 12.0 },
];

// ─── Random number generation ────────────────────────────────────────────────

/**
 * Box-Muller transform: two uniform [0,1) samples → N(mean, std).
 * Guard against log(0) by clamping u1 away from 0.
 */
function sampleNormal(mean: number, std: number): number {
  const u1 = Math.max(1e-15, Math.random());
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

// ─── Percentile helper ────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

// ─── Monte Carlo Simulation ───────────────────────────────────────────────────

/**
 * Run Monte Carlo retirement simulation.
 *
 * Algorithm:
 *   For each trial:
 *     1. ACCUMULATION: step-up contributions with stochastic annual returns
 *     2. Deflate corpus to real terms using stochastic inflation path
 *     3. Compare vs deterministic required corpus (real terms)
 *     4. SUCCESS = corpus_real >= required_real at retirement
 *
 * Returns percentile outcomes, probability of success, expected shortfall.
 *
 * @param config  All inputs — must be serializable (safe for Web Worker transfer)
 */
export function runMonteCarlo(config: MonteCarloConfig): MonteCarloResult {
  const {
    trials,
    monthlyContrib,
    stepUpRate,
    yearsToRetirement,
    yearsInRetirement,
    monthlyExpensesToday,
    postRetirementReturn,
    returnMean,
    returnStd,
    inflationMean,
    inflationStd,
  } = config;

  // Deterministic required corpus benchmark (real terms, base inflation)
  // This is the fixed target — randomness is only on the accumulation side
  const rRealBase = ((1 + postRetirementReturn / 100) / (1 + inflationMean / 100) - 1) / 12;
  const nRet = yearsInRetirement * 12;
  const requiredCorpus = Math.abs(rRealBase) > 1e-10
    ? monthlyExpensesToday * (1 - Math.pow(1 + rRealBase, -nRet)) / rRealBase
    : monthlyExpensesToday * nRet;

  const finalCorporeaReal: number[] = [];
  let successCount = 0;
  let shortfallSum = 0;

  for (let t = 0; t < trials; t++) {
    // ACCUMULATION PHASE: month-by-month with annual return re-draw
    let corpus = 0;
    let monthly = monthlyContrib;

    for (let y = 0; y < yearsToRetirement; y++) {
      // Clamp returns: floor at -50% (no complete loss in a single year)
      const annualReturn = Math.max(-50, sampleNormal(returnMean, returnStd));
      const r = annualReturn / 100 / 12;
      for (let m = 0; m < 12; m++) {
        corpus = corpus * (1 + r) + monthly;
      }
      monthly *= 1 + stepUpRate / 100;
    }

    // Deflate nominal corpus to real (stochastic inflation path)
    const avgInflation = Math.max(0, sampleNormal(inflationMean, inflationStd));
    const corpusReal = corpus / Math.pow(1 + avgInflation / 100, yearsToRetirement);
    finalCorporeaReal.push(corpusReal);

    if (corpusReal >= requiredCorpus) {
      successCount++;
    } else {
      shortfallSum += requiredCorpus - corpusReal;
    }
  }

  finalCorporeaReal.sort((a, b) => a - b);

  // Histogram: 10 equal-width buckets across the full outcome range
  const minVal = finalCorporeaReal[0] ?? 0;
  const maxVal = finalCorporeaReal[finalCorporeaReal.length - 1] ?? 0;
  const bucketWidth = maxVal > minVal ? (maxVal - minVal) / 10 : 1;
  const histogram = Array.from({ length: 10 }, (_, i) => {
    const lo = minVal + i * bucketWidth;
    const hi = lo + bucketWidth;
    const count = finalCorporeaReal.filter(v => v >= lo && v < hi).length;
    return { bucket: formatNPR(lo), count };
  });
  // Ensure last bucket captures max
  if (histogram.length > 0) {
    histogram[histogram.length - 1].count += finalCorporeaReal.filter(
      v => v >= minVal + 9 * bucketWidth,
    ).length - histogram[histogram.length - 1].count;
  }

  const failCount = trials - successCount;
  return {
    trials,
    percentiles: {
      p10: percentile(finalCorporeaReal, 10),
      p25: percentile(finalCorporeaReal, 25),
      p50: percentile(finalCorporeaReal, 50),
      p75: percentile(finalCorporeaReal, 75),
      p90: percentile(finalCorporeaReal, 90),
    },
    probabilityOfSuccess: Math.round((successCount / trials) * 100),
    expectedShortfall: failCount > 0 ? Math.round(shortfallSum / failCount) : 0,
    requiredCorpus: Math.round(requiredCorpus),
    histogram,
  };
}

// ─── Deterministic Scenario Analysis ─────────────────────────────────────────

/**
 * Run deterministic scenario analysis across macro assumption sets.
 *
 * Each scenario answers: "If Nepal's economy follows this path, am I funded?"
 * Returns a ScenarioResult per scenario — sortable by adequacy score or funded status.
 *
 * @param sipInputs    Base SIP inputs (rate/inflation overridden per scenario)
 * @param retInputs    Base retirement inputs (inflation/salary growth overridden)
 * @param scenarios    Scenario set — defaults to NEPAL_SCENARIOS
 */
export function runScenarios(
  sipInputs: SIPInputs,
  retInputs: RetirementInputs,
  scenarios: ScenarioVars[] = NEPAL_SCENARIOS,
): ScenarioResult[] {
  return scenarios.map(scenario => {
    const adjSIP: SIPInputs = {
      ...sipInputs,
      annualRate:    scenario.nominalReturn,
      inflationRate: scenario.inflationRate,
    };
    const adjRet: RetirementInputs = {
      ...retInputs,
      inflationRate:    scenario.inflationRate,
      salaryGrowthRate: scenario.salaryGrowthRate,
    };

    const sipResult = calcSIPFull(adjSIP);
    const retResult = calcRetirementFull(adjRet);

    return {
      scenario,
      sipFinalNominal:         sipResult.finalNominal,
      sipFinalReal:            sipResult.finalReal,
      retirementAdequacyScore: retResult.adequacyScore,
      retirementCorpusReal:    retResult.projectedCorpusReal,
      requiredCorpusReal:      retResult.requiredCorpusReal,
      isFunded:                retResult.projectedCorpusReal >= retResult.requiredCorpusReal,
    };
  });
}
