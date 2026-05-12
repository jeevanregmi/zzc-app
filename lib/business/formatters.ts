/** Business metric display formatters — pure, no side effects. */

export function fmtNPR(n: number): string {
  if (n >= 10_000_000) return `NPR ${(n / 10_000_000).toFixed(2)} करोड`;
  if (n >= 100_000)    return `NPR ${(n / 100_000).toFixed(2)} लाख`;
  return `NPR ${Math.round(n).toLocaleString()}`;
}

export function fmtUSD(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

export function fmtPct(n: number, d = 1): string {
  return `${n.toFixed(d)}%`;
}

export function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function trendArrow(current: number, previous: number): "↑" | "↓" | "→" {
  if (current > previous * 1.02) return "↑";
  if (current < previous * 0.98) return "↓";
  return "→";
}

export function trendColor(current: number, previous: number, inverse = false): string {
  const up = current >= previous;
  const good = inverse ? !up : up;
  if (good) return "text-green-400";
  return "text-red-400";
}

/** Format ISO date string to "May 2026" */
export function fmtPeriod(period: string): string {
  const [year, month] = period.split("-");
  const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${MONTHS[parseInt(month)]} ${year}`;
}

export function goalStatusColor(status: string): string {
  if (status === "achieved")  return "text-green-400";
  if (status === "on_track")  return "text-yellow-400";
  if (status === "behind")    return "text-orange-400";
  return "text-red-400";
}

export function goalStatusNepali(status: string): string {
  if (status === "achieved")  return "हासिल";
  if (status === "on_track")  return "लक्षमा";
  if (status === "behind")    return "पछाडि";
  return "छुटेको";
}
