import type { IntelligenceRecord } from "../types/intelligence-record";

// ─── Branch Health Types ──────────────────────────────────────────────────────

export type BranchHealthState =
  | "healthy"   // strong positive implementation signal
  | "fruiting"  // good progress, active outputs
  | "budding"   // early / newly sprouted movement
  | "weak"      // mixed — some progress, many gaps
  | "yellow"    // warning-heavy: slow progress, mostly delays
  | "dry"       // stalled, mostly unstarted
  | "damaged"   // failures and contradictions dominate
  | "unknown";  // no linked records

export interface BranchHealth {
  partNumber:         number;
  healthScore:        number;  // 0–100
  state:              BranchHealthState;
  totalRecords:       number;
  positiveCount:      number;  // completed + in_progress + started + partially_completed
  warningCount:       number;  // delayed + disputed
  fundingCount:       number;  // budgeted + budget_target type
  progressCount:      number;  // in_progress + started
  contradictionCount: number;  // failed + cancelled
  lastUpdated:        string | null;
  reasonLines:        string[];  // debug display
}

// ─── Sector → Part Number mapping ────────────────────────────────────────────
// Maps sector strings (from IntelligenceRecord.sector / affectedSectors)
// to the constitutional part numbers they relate to.
// Keeps inference coarse-grained — explicit constitutionalRefs always takes priority.

const SECTOR_PARTS: Record<string, number[]> = {
  // ── Fundamental Rights (Part 3) ───────────────────────────────────────────
  human_rights:      [3, 28],
  rights:            [3],
  equality:          [3],
  education:         [3, 4],
  health:            [3, 4],
  employment:        [3, 4],
  labor:             [3, 4],
  food:              [3, 4],
  housing:           [3, 4],
  clean_environment: [3, 4],
  environment:       [3, 4],
  religion:          [3],
  privacy:           [3],
  communication:     [3],
  press:             [3],

  // ── Directive Principles (Part 4) ────────────────────────────────────────
  policy:            [4],
  agriculture:       [4, 3],
  agricultural:      [4],
  infrastructure:    [4],
  energy:            [4],
  electricity:       [4],
  irrigation:        [4],
  science:           [4],
  technology:        [4],
  social:            [3, 4],
  welfare:           [4],
  poverty:           [4],
  drinking_water:    [3, 4],
  water:             [3, 4],
  road:              [4, 20],
  digitalization:    [4],
  digital:           [4],

  // ── Federal Governance (Parts 5–10) ──────────────────────────────────────
  governance:        [5, 7],
  federal:           [5, 8],
  state:             [5],
  president:         [6],
  executive:         [7],
  cabinet:           [7],
  government:        [7],
  ministry:          [7],
  parliament:        [8],
  legislature:       [8, 9],
  legislation:       [9],
  law:               [9, 11],
  budget:            [10, 23],
  fiscal:            [10, 23],
  expenditure:       [10],

  // ── Judiciary (Parts 11–12) ───────────────────────────────────────────────
  judiciary:         [11, 17],
  court:             [11],
  justice:           [11],
  legal:             [11, 12],
  attorney:          [12],
  prosecution:       [12],

  // ── Provincial (Parts 13–17) ─────────────────────────────────────────────
  provincial:        [13, 14, 15, 16, 17],
  province:          [13, 14, 15, 16, 17],
  pradesh:           [13, 14, 15, 16, 17],

  // ── Local (Parts 18–22) ──────────────────────────────────────────────────
  local:             [18, 19, 20, 21, 22],
  municipality:      [18, 19, 20],
  ward:              [18, 19, 20],
  sthaniya:          [18, 19, 20, 21],
  local_finance:     [21],
  intergovernmental: [22],
  coordination:      [22],

  // ── Finance / Revenue (Part 23) ──────────────────────────────────────────
  finance:           [10, 23],
  banking:           [10, 23],
  tax:               [10, 23],
  revenue:           [23],
  monetary:          [23],
  epf:               [3, 10, 23],
  ssf:               [3, 4, 10],
  cit:               [3, 10],
  insurance:         [3, 10, 23],
  pension:           [3, 4],

  // ── Constitutional Bodies (Parts 24–34) ──────────────────────────────────
  corruption:        [24],
  accountability:    [24],
  transparency:      [24],
  audit:             [25],
  civil_service:     [26],
  public_service:    [26],
  election:          [27],
  voting:            [27],
  women:             [29, 3],
  gender:            [29, 3],
  dalit:             [30, 3],
  inclusion:         [31, 3],
  inclusive:         [31],
  indigenous:        [32, 3],
  janajati:          [32, 3],
  madhesi:           [34, 3],
  tharu:             [32, 3],
  nationalities:     [32],

  // ── Security (Parts not in list but mapped to closest) ───────────────────
  security:          [7],
  police:            [7],
  military:          [7],
  defense:           [7],
};

// ─── Part inference ───────────────────────────────────────────────────────────

function inferParts(rec: IntelligenceRecord): Set<number> {
  const parts = new Set<number>();

  // Explicit refs win — no inference needed
  if (rec.constitutionalRefs && rec.constitutionalRefs.length > 0) {
    for (const p of rec.constitutionalRefs) parts.add(p);
    return parts;
  }

  // Sector inference
  const sectors = [
    rec.sector,
    ...(rec.affectedSectors ?? []),
  ];
  for (const s of sectors) {
    if (!s) continue;
    const key = s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    const mapped = SECTOR_PARTS[key] ?? [];
    for (const p of mapped) parts.add(p);
  }

  return parts;
}

// ─── Score computation ────────────────────────────────────────────────────────

function stateFromScore(score: number, total: number): BranchHealthState {
  if (total === 0)    return "unknown";
  if (score >= 78)    return "healthy";
  if (score >= 63)    return "fruiting";
  if (score >= 50)    return "budding";
  if (score >= 38)    return "weak";
  if (score >= 25)    return "yellow";
  if (score >= 14)    return "dry";
  return "damaged";
}

export function computePartHealth(
  partNumber: number,
  records: IntelligenceRecord[],
): BranchHealth {
  const relevant = records.filter(r => inferParts(r).has(partNumber));

  if (relevant.length === 0) {
    return {
      partNumber,
      healthScore:        0,
      state:              "unknown",
      totalRecords:       0,
      positiveCount:      0,
      warningCount:       0,
      fundingCount:       0,
      progressCount:      0,
      contradictionCount: 0,
      lastUpdated:        null,
      reasonLines:        ["कुनै सम्बन्धित अभिलेख छैन"],
    };
  }

  // Baseline neutral — moves up or down with evidence
  let score = 40;
  let positiveCount      = 0;
  let warningCount       = 0;
  let fundingCount       = 0;
  let progressCount      = 0;
  let contradictionCount = 0;
  let lastUpdated: string | null = null;
  const reasonLines: string[] = [];

  for (const r of relevant) {
    if (!lastUpdated || r.updatedAt > lastUpdated) lastUpdated = r.updatedAt;

    const label = r.titleNepali || r.title || "—";

    switch (r.implementationStatus) {
      case "completed":
        score += 20; positiveCount++;
        reasonLines.push(`✓ पूरा: ${label}`);
        break;
      case "in_progress":
        score += 12; positiveCount++; progressCount++;
        reasonLines.push(`→ जारी: ${label}`);
        break;
      case "started":
        score += 8; positiveCount++; progressCount++;
        break;
      case "partially_completed":
        score += 10; positiveCount++;
        reasonLines.push(`◑ आंशिक: ${label}`);
        break;
      case "budgeted":
        score += 5; fundingCount++;
        reasonLines.push(`₹ बजेट: ${label}`);
        break;
      case "announced":
        score += 2;
        break;
      case "delayed":
        score -= 10; warningCount++;
        reasonLines.push(`⚠ ढिलाइ: ${label}`);
        break;
      case "failed":
        score -= 20; contradictionCount++;
        reasonLines.push(`✗ असफल: ${label}`);
        break;
      case "cancelled":
        score -= 15; contradictionCount++;
        reasonLines.push(`✗ रद्द: ${label}`);
        break;
      case "disputed":
        score -= 8; warningCount++;
        reasonLines.push(`? विवादित: ${label}`);
        break;
    }

    // Type bonuses
    if (r.type === "reform")          score += 3;
    if (r.type === "budget_target")   fundingCount++;
  }

  const healthScore = Math.round(Math.max(0, Math.min(100, score)));

  return {
    partNumber,
    healthScore,
    state:              stateFromScore(healthScore, relevant.length),
    totalRecords:       relevant.length,
    positiveCount,
    warningCount,
    fundingCount,
    progressCount,
    contradictionCount,
    lastUpdated,
    reasonLines:        reasonLines.slice(0, 10),
  };
}

export function computeAllPartsHealth(
  partNumbers: number[],
  records: IntelligenceRecord[],
): Map<number, BranchHealth> {
  const map = new Map<number, BranchHealth>();
  for (const pn of partNumbers) {
    map.set(pn, computePartHealth(pn, records));
  }
  return map;
}

// ─── Visual palette per state ─────────────────────────────────────────────────

export const HEALTH_COLORS: Record<BranchHealthState, { glow: string; dot: string; label: string }> = {
  healthy:  { glow: "rgba(74,222,128,0.18)",  dot: "#4ade80", label: "स्वस्थ" },
  fruiting: { glow: "rgba(251,191,36,0.16)",  dot: "#fbbf24", label: "फल्दै/फुल्दै" },
  budding:  { glow: "rgba(134,239,172,0.13)", dot: "#86efac", label: "नयाँ पालुवा" },
  weak:     { glow: "rgba(148,163,184,0.12)", dot: "#94a3b8", label: "कमजोर" },
  yellow:   { glow: "rgba(253,224,71,0.12)",  dot: "#fde047", label: "पहेँलो/ढिलो" },
  dry:      { glow: "rgba(120,53,15,0.14)",   dot: "#92400e", label: "सुक्खा" },
  damaged:  { glow: "rgba(239,68,68,0.22)",   dot: "#ef4444", label: "क्षतिग्रस्त" },
  unknown:  { glow: "transparent",             dot: "#475569", label: "अज्ञात/डेटा नभएको" },
};
