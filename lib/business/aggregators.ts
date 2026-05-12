/**
 * Business Intelligence Aggregators — pure computation functions
 *
 * Takes raw Firestore records → produces computed summaries (MonthlyPL, MRRSummary, etc.)
 * Pure functions: no side effects, no Firestore calls. Safe to test in isolation.
 *
 * TECHNICAL DEBT RISK:
 *   These run on the client over full dataset arrays. At 1000+ records,
 *   consider moving aggregation to a Firestore summary document updated
 *   by a Cloud Function on each write. For Phase 0-3, client-side is fine.
 */

import type {
  RevenueEntry, ExpenseEntry, AICostEntry, Subscription,
  MonthlyPL, MRRSummary, RevenueSource, ExpenseCategory,
  SubscriptionTier,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodOf(isoDate: string): string {
  return isoDate.slice(0, 7); // "2026-05-10" → "2026-05"
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    groups[k] = groups[k] ?? [];
    groups[k].push(item);
  }
  return groups;
}

// ─── Monthly P&L ─────────────────────────────────────────────────────────────

export function buildMonthlyPL(
  revenues:  RevenueEntry[],
  expenses:  ExpenseEntry[],
  aiCosts:   AICostEntry[],
  period:    string,           // "2026-05"
): MonthlyPL {
  const revMonth = revenues.filter(r => periodOf(r.date) === period);
  const expMonth = expenses.filter(e => periodOf(e.date) === period);
  const aiMonth  = aiCosts.filter(a => periodOf(a.date) === period);

  const totalRevenueNPR  = revMonth.reduce((s, r) => s + r.amountNPR, 0);
  const totalExpensesNPR = expMonth.reduce((s, e) => s + e.amountNPR, 0);
  const capexNPR  = expMonth.filter(e => e.classification === "CAPEX").reduce((s, e) => s + e.amountNPR, 0);
  const opexNPR   = expMonth.filter(e => e.classification === "OPEX").reduce((s, e) => s + e.amountNPR, 0);
  const aiCostUSD = aiMonth.reduce((s, a) => s + a.costUSD, 0);

  // By revenue source
  const bySource = (Object.entries(
    groupBy(revMonth, r => r.source)
  ) as [RevenueSource, RevenueEntry[]][]).map(([source, entries]) => ({
    source,
    amountNPR: entries.reduce((s, e) => s + e.amountNPR, 0),
  }));

  // By expense category
  const byCategory = (Object.entries(
    groupBy(expMonth, e => e.category)
  ) as [ExpenseCategory, ExpenseEntry[]][]).map(([category, entries]) => ({
    category,
    amountNPR: entries.reduce((s, e) => s + e.amountNPR, 0),
  }));

  return {
    period,
    totalRevenueNPR:  Math.round(totalRevenueNPR),
    totalExpensesNPR: Math.round(totalExpensesNPR),
    netProfitNPR:     Math.round(totalRevenueNPR - totalExpensesNPR),
    capexNPR:         Math.round(capexNPR),
    opexNPR:          Math.round(opexNPR),
    aiCostUSD:        parseFloat(aiCostUSD.toFixed(4)),
    bySource,
    byCategory,
  };
}

/** Build P&L for the last N months. */
export function buildPLTimeline(
  revenues: RevenueEntry[],
  expenses: ExpenseEntry[],
  aiCosts:  AICostEntry[],
  months:   number = 12,
): MonthlyPL[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods.map(p => buildMonthlyPL(revenues, expenses, aiCosts, p));
}

// ─── MRR (Monthly Recurring Revenue) ─────────────────────────────────────────

export function buildMRRSummary(subs: Subscription[], period: string): MRRSummary {
  const active  = subs.filter(s => s.status === "active" && periodOf(s.startDate) <= period);
  const trials  = subs.filter(s => s.status === "trial");
  const newSubs = subs.filter(s => periodOf(s.startDate) === period);
  const churned = subs.filter(s => s.status === "cancelled" && periodOf(s.cancelledAt) === period);

  const mrrNPR = active.reduce((s, sub) => {
    if (sub.endDate && sub.endDate < period + "-01") return s; // expired
    return s + sub.amountNPR;
  }, 0);

  const churnRate = active.length > 0 ? (churned.length / active.length) * 100 : 0;

  const byTier = (["free", "pro", "enterprise"] as SubscriptionTier[]).map(tier => {
    const tierSubs = active.filter(s => s.tier === tier);
    return {
      tier,
      count:  tierSubs.length,
      mrrNPR: tierSubs.reduce((s, sub) => s + sub.amountNPR, 0),
    };
  });

  return {
    period,
    mrrNPR:       Math.round(mrrNPR),
    activeCount:  active.length,
    trialCount:   trials.length,
    newCount:     newSubs.length,
    churnedCount: churned.length,
    churnRate:    parseFloat(churnRate.toFixed(1)),
    byTier,
  };
}

// ─── AI Cost Analysis ─────────────────────────────────────────────────────────

/** Group AI costs by service with totals. */
export function aiCostByService(aiCosts: AICostEntry[]): { service: string; costUSD: number; operations: number }[] {
  const grouped = groupBy(aiCosts, a => a.service);
  return Object.entries(grouped).map(([service, entries]) => ({
    service,
    costUSD:    parseFloat(entries.reduce((s, e) => s + e.costUSD, 0).toFixed(4)),
    operations: entries.length,
  })).sort((a, b) => b.costUSD - a.costUSD);
}

/** Monthly AI spend burn rate (USD). */
export function aiMonthllyBurn(aiCosts: AICostEntry[], months = 3): { period: string; costUSD: number }[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods.map(p => ({
    period:  p,
    costUSD: parseFloat(
      aiCosts.filter(a => periodOf(a.date) === p).reduce((s, a) => s + a.costUSD, 0).toFixed(4)
    ),
  }));
}

// ─── Revenue growth rate ──────────────────────────────────────────────────────

/** Month-over-month growth % for a given period. */
export function revenueGrowthPct(pl: MonthlyPL[]): (MonthlyPL & { growthPct: number | null })[] {
  return pl.map((m, i) => ({
    ...m,
    growthPct: i === 0 || pl[i - 1].totalRevenueNPR === 0
      ? null
      : parseFloat((((m.totalRevenueNPR - pl[i - 1].totalRevenueNPR) / pl[i - 1].totalRevenueNPR) * 100).toFixed(1)),
  }));
}
