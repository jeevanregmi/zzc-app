/**
 * AI Cost Tracker — pure functions, no side effects.
 *
 * All cost calculations live here. Orchestrators and Workers call these
 * functions before and after each generation to estimate and record costs.
 *
 * The results feed into:
 *   - AIGenerationLog.estimatedCostUSD  (Firestore)
 *   - ExpenseEntry.linkedGenerationIds  (cost attribution)
 *   - ProviderUsageSnapshot             (observability dashboard)
 */

import { PROVIDER_CONFIGS, IMAGE_PRICING_USD } from "../providers/config";

// ── Cost estimation ───────────────────────────────────────────────────────────

export function estimateTextCostUSD(
  modelId:      string,
  inputTokens:  number,
  outputTokens: number,
): number {
  const cfg = PROVIDER_CONFIGS[modelId];
  if (!cfg) return 0;
  return (
    (inputTokens  / 1000) * cfg.costPer1kInputTokens +
    (outputTokens / 1000) * cfg.costPer1kOutputTokens
  );
}

export function estimateImageCostUSD(modelId: string, imageCount = 1): number {
  const price = IMAGE_PRICING_USD[modelId];
  return price ? price * imageCount : 0;
}

// ── Usage snapshot ────────────────────────────────────────────────────────────

export interface ProviderUsageSnapshot {
  period:       string;            // "2026-05"
  modelId:      string;
  provider:     string;
  callCount:    number;
  inputTokens:  number;
  outputTokens: number;
  imageCount:   number;
  totalCostUSD: number;
  avgLatencyMs: number;
  failureCount: number;
  failureRate:  number;            // 0-1
}

export function buildUsageSnapshot(
  period:  string,
  modelId: string,
  provider: string,
  entries: Array<{
    inputTokens:     number;
    outputTokens:    number;
    imageCount?:     number;
    estimatedCostUSD:number;
    latencyMs:       number;
    failed:          boolean;
  }>,
): ProviderUsageSnapshot {
  const failures = entries.filter(e => e.failed).length;
  const totalMs  = entries.reduce((s, e) => s + e.latencyMs, 0);

  return {
    period,
    modelId,
    provider,
    callCount:    entries.length,
    inputTokens:  entries.reduce((s, e) => s + e.inputTokens,  0),
    outputTokens: entries.reduce((s, e) => s + e.outputTokens, 0),
    imageCount:   entries.reduce((s, e) => s + (e.imageCount ?? 0), 0),
    totalCostUSD: entries.reduce((s, e) => s + e.estimatedCostUSD, 0),
    avgLatencyMs: entries.length ? Math.round(totalMs / entries.length) : 0,
    failureCount: failures,
    failureRate:  entries.length ? failures / entries.length : 0,
  };
}

// ── ROI calculation ───────────────────────────────────────────────────────────

export function calcContentROI(
  revenueNPR:  number,
  aiCostUSD:   number,
  usdToNprRate:number,
): number {
  const costNPR = aiCostUSD * usdToNprRate;
  if (costNPR === 0) return 0;
  return parseFloat((revenueNPR / costNPR).toFixed(2));
}

// ── Budget guard ──────────────────────────────────────────────────────────────
// Call before each generation to prevent runaway costs.

export interface BudgetCheck {
  allowed:       boolean;
  remainingUSD:  number;
  reason:        string;
}

export function checkBudget(
  estimatedCostUSD:  number,
  spentThisPeriodUSD:number,
  dailyLimitUSD:     number,
): BudgetCheck {
  const remaining = dailyLimitUSD - spentThisPeriodUSD;
  if (estimatedCostUSD > remaining) {
    return {
      allowed:      false,
      remainingUSD: remaining,
      reason:       `Estimated cost $${estimatedCostUSD.toFixed(4)} exceeds remaining daily budget $${remaining.toFixed(4)}`,
    };
  }
  return { allowed: true, remainingUSD: remaining - estimatedCostUSD, reason: "" };
}
