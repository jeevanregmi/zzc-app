// URL Intake Intelligence — client-side, zero API calls.
// Paste a Nepal gov URL → instant institution detection + metadata suggestions.

import type { GovFolder, LifecycleType, ImportanceLevel } from "../types/documents";
import { findSourceByUrl, type OfficialSource } from "./sourceRegistry";

export interface IntakeSuggestion {
  // Detected institution
  institutionNp:    string;
  institutionEn:    string;
  sourceId:         string | null;
  trustLevel:       "primary" | "secondary" | "reference" | null;
  officialUrl:      string | null;
  noteNp:           string | null;  // institution's own noteNp from registry
  // Inferred metadata
  govFolder:        GovFolder;
  lifecycleType:    LifecycleType;
  importanceLevel:  ImportanceLevel;
  relatedParts:     number[];
  tags:             string[];
  // Path-level hints
  detectedDocTypeNp: string;
  suggestedTitle:    string;
  // Confidence
  confidence:        "high" | "medium" | "low";
  explanationNp:     string;  // shown to founder
}

// ── Path keyword → lifecycle ──────────────────────────────────────────────────

const PATH_LIFECYCLE_RULES: Array<[RegExp, LifecycleType]> = [
  [/annual[\-_]?report|barsik[\-_]?pratibedan|yearly/i,    "annual_report"],
  [/quarterly|chaimas|q[1-4][\-_]/i,                        "quarterly"],
  [/circular|paripatra|suchana|notice|notice[\-_]?board/i,  "circular"],
  [/press[\-_]?release|news|update|media/i,                 "news"],
  [/amendment|sansodhan|revision|revised/i,                 "amendment_based"],
  [/constitution|sambidhan|ain\b|act\b|regulation|niyamavali|adhiniyam/i, "perpetual"],
  [/budget|arthik|aarthik|monetary|fiscal|barsik/i,         "annual_report"],
];

// ── sourceId → primary GovFolder ─────────────────────────────────────────────

const SOURCE_FOLDER: Record<string, GovFolder> = {
  law_commission:  "constitution",
  parliament:      "parliament",
  supreme_court:   "judiciary",
  ag_office:       "judiciary",
  mof:             "budget-economy",
  nrb:             "budget-economy",
  ird:             "budget-economy",
  sebon:           "budget-economy",
  npc:             "policy-planning",
  mofaga:          "local-governance",
  moe:             "policy-planning",
  mohp:            "policy-planning",
  moald:           "policy-planning",
  mopit:           "policy-planning",
  moewri:          "policy-planning",
  moict:           "media-signals",
  nhrc:            "citizen-intelligence",
  ncw:             "citizen-intelligence",
  ncdc:            "citizen-intelligence",
  ncij:            "citizen-intelligence",
  nfdin:           "citizen-intelligence",
  nmc:             "citizen-intelligence",
  ohchr_nepal:     "citizen-intelligence",
  ssf:             "policy-planning",
  epf:             "policy-planning",
  ciaa:            "citizen-intelligence",
  oag:             "citizen-intelligence",
  province_gov:    "local-governance",
};

// ── sourceId → default ImportanceLevel ───────────────────────────────────────

const SOURCE_IMPORTANCE: Record<string, ImportanceLevel> = {
  law_commission: "critical",
  parliament:     "critical",
  supreme_court:  "critical",
  mof:            "critical",
  nrb:            "critical",
  npc:            "high",
  ciaa:           "high",
  oag:            "high",
  sebon:          "high",
  nhrc:           "high",
  moe:            "medium",
  mohp:           "medium",
  ssf:            "medium",
  epf:            "medium",
};

// ── sourceId → default lifecycle (when path gives no hint) ───────────────────

const SOURCE_LIFECYCLE: Record<string, LifecycleType> = {
  law_commission:  "perpetual",
  parliament:      "perpetual",
  supreme_court:   "annual_report",
  mof:             "annual_report",
  nrb:             "quarterly",
  sebon:           "quarterly",
  nhrc:            "annual_report",
  ciaa:            "annual_report",
  oag:             "annual_report",
  npc:             "annual_report",
};

// ── Nepali doc-type labels ────────────────────────────────────────────────────

function inferDocTypeNp(path: string, lifecycle: LifecycleType): string {
  const p = path.toLowerCase();
  if (/annual[\-_]?report|barsik/.test(p))  return "वार्षिक प्रतिवेदन";
  if (/quarterly|chaimas/.test(p))           return "त्रैमासिक प्रतिवेदन";
  if (/circular|paripatra/.test(p))          return "परिपत्र / सूचना";
  if (/budget/.test(p))                      return "बजेट";
  if (/monetary/.test(p))                    return "मौद्रिक नीति";
  if (/amendment|sansodhan/.test(p))         return "संशोधन";
  if (/constitution|sambidhan/.test(p))      return "संविधान सम्बन्धी";
  if (/ain\b|act\b/.test(p))                 return "ऐन / नियमावली";
  if (/press[\-_]?release/.test(p))          return "प्रेस विज्ञप्ति";
  if (/report|pratibedan/.test(p))           return "प्रतिवेदन";
  if (/directive|nirdesh/.test(p))           return "निर्देशिका";
  if (/policy|niti/.test(p))                 return "नीति";
  const LIFECYCLE_NP: Record<LifecycleType, string> = {
    perpetual:       "ऐन / कानून",
    amendment_based: "संशोधन आधारित",
    annual_report:   "वार्षिक प्रतिवेदन",
    quarterly:       "त्रैमासिक",
    circular:        "परिपत्र",
    news:            "समाचार / सूचना",
  };
  return LIFECYCLE_NP[lifecycle];
}

// ── Path-based GovFolder fallback ────────────────────────────────────────────

function folderFromPath(path: string): GovFolder | null {
  const p = path.toLowerCase();
  if (/budget|arthik|monetary|fiscal|finance/.test(p)) return "budget-economy";
  if (/parliament|sambad|bill\b|legislation/.test(p))  return "parliament";
  if (/court|faisala|judiciary|legal/.test(p))         return "judiciary";
  if (/policy|plan|yojana|niti|strategy/.test(p))      return "policy-planning";
  if (/municipality|ward|palika|local/.test(p))        return "local-governance";
  if (/rights|adhikar|complaint|nhrc/.test(p))         return "citizen-intelligence";
  if (/news|media|press/.test(p))                      return "media-signals";
  return null;
}

// ── Confidence explanation ────────────────────────────────────────────────────

function buildExplanation(
  source: OfficialSource | null,
  confidence: "high" | "medium" | "low",
): string {
  if (confidence === "high" && source) {
    return `${source.nameNp} को domain पहिचान भयो। सबै fields auto-fill गरिएको छ — हेर्नुस् र confirm गर्नुहोस्।`;
  }
  if (confidence === "medium" && source) {
    return `${source.nameNp} को website detect भयो, तर URL बाट document को exact type पूर्ण पहिचान हुन सकेन। Fields verify गर्नुहोस्।`;
  }
  return "Domain थाहा नभएको URL। Manual fields fill गर्नुहोस् — AI fetch गर्दा थप जानकारी आउनेछ।";
}

// ── Main export ───────────────────────────────────────────────────────────────

export function analyzeUrl(rawUrl: string): IntakeSuggestion | null {
  if (!rawUrl.trim()) return null;

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return null;
  }

  const source     = findSourceByUrl(rawUrl);
  const fullPath   = parsed.pathname + parsed.search;
  const pathDepth  = parsed.pathname.split("/").filter(Boolean).length;

  // ── Lifecycle: path pattern wins, then institution default, then "circular" ──
  let lifecycleType: LifecycleType = "circular";
  for (const [re, type] of PATH_LIFECYCLE_RULES) {
    if (re.test(fullPath)) { lifecycleType = type; break; }
  }
  if (lifecycleType === "circular" && source && SOURCE_LIFECYCLE[source.sourceId]) {
    lifecycleType = SOURCE_LIFECYCLE[source.sourceId];
  }

  // ── GovFolder: source wins, then path, then "other" ──────────────────────────
  const govFolder: GovFolder =
    (source && SOURCE_FOLDER[source.sourceId]) ??
    folderFromPath(fullPath) ??
    "other";

  // ── Importance ────────────────────────────────────────────────────────────────
  const importanceLevel: ImportanceLevel =
    (source && SOURCE_IMPORTANCE[source.sourceId]) ?? "medium";

  // ── Confidence ────────────────────────────────────────────────────────────────
  const confidence: "high" | "medium" | "low" = !source
    ? "low"
    : pathDepth >= 2
    ? "high"
    : "medium";

  return {
    institutionNp:     source?.nameNp    ?? "अज्ञात संस्था",
    institutionEn:     source?.nameEn    ?? "Unknown Institution",
    sourceId:          source?.sourceId  ?? null,
    trustLevel:        source?.trustLevel ?? null,
    officialUrl:       source?.officialUrl ?? null,
    noteNp:            source?.noteNp    ?? null,
    govFolder,
    lifecycleType,
    importanceLevel,
    relatedParts:      source?.relatedParts  ?? [],
    tags:              source?.tags?.slice(0, 6) ?? [],
    detectedDocTypeNp: inferDocTypeNp(fullPath, lifecycleType),
    suggestedTitle:    "",
    confidence,
    explanationNp:     buildExplanation(source, confidence),
  };
}
