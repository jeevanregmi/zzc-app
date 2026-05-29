// Nepal Economic Intelligence — type definitions
// Every atom is source-traced, time-stamped, and citizen-friendly.
// Budget is one entry point. The real product is Nepal's economic memory.

export type EconomicSector =
  | "शिक्षा"
  | "स्वास्थ्य"
  | "कृषि"
  | "रोजगार"
  | "युवा"
  | "पूर्वाधार"
  | "ऊर्जा"
  | "यातायात"
  | "पर्यटन"
  | "उद्योग"
  | "सामाजिक सुरक्षा"
  | "प्रदेश/स्थानीय"
  | "कर/राजस्व"
  | "ऋण/घाटा"
  | "सुशासन"
  | "डिजिटल/प्रविधि"
  | "अन्य";

export type EconomicAtomType =
  | "budget_allocation"     // Money allocated to sector/program/ministry
  | "revenue"               // Tax/revenue target or change
  | "spending"              // Capital vs recurrent expenditure
  | "debt_deficit"          // Borrowing, deficit, debt service
  | "policy_promise"        // Government commits to do something (without amount)
  | "reform"                // Structural change, institution reform, law change
  | "repeated_promise"      // Same promise appeared in previous year(s)
  | "removed_policy"        // Program/scheme discontinued or not mentioned
  | "economist_commentary"  // Named expert/economist recommendation
  | "institution_response"  // NRB, NPC, MOF, CIAA, Parliament reaction
  | "movement_impact"       // Policy connected to public movement or youth demand
  | "sector_trend";         // Notable shift in sector priority or spending pattern

export type EconomicDocType =
  | "budget_speech"
  | "budget_detail"
  | "monetary_policy"
  | "economic_survey"
  | "npc_plan"
  | "commission_report"
  | "government_program"
  | "other";

export type PeriodType =
  | "annual"
  | "midterm"
  | "quarterly"
  | "event_based";

export type EconomicComparisonStatus =
  | "new"        // First time this year
  | "continued"  // Same as last year, unchanged
  | "increased"  // Amount or priority increased from last year
  | "decreased"  // Amount or priority decreased
  | "removed"    // Was present last year, missing this year
  | "repeated"   // Exact same promise repeated verbatim
  | "unknown";   // No previous year data to compare

export type EconomicActorRole =
  | "economist"
  | "finance_minister"
  | "nrb_governor"
  | "policy_analyst"
  | "commission_chair"
  | "public_intellectual"
  | "institution"
  | "minister"
  | "npc_official"
  | "journalist"
  | "researcher"
  | "other";

export interface EconomicActor {
  id:               string;
  ownerId:          string;
  name:             string;
  nameNepali?:      string;
  role:             EconomicActorRole;
  institution?:     string;
  institutionNepali?: string;
  bio?:             string;
  createdAt:        string;
  updatedAt:        string;
}

export interface EconomicAtom {
  id:      string;
  ownerId: string;

  // Classification
  atomType: EconomicAtomType;
  sector:   EconomicSector;
  ministry?: string;

  // Source — every atom must have these
  sourceDocumentId: string;
  sourceDocTitle:   string;
  sourceDocType:    EconomicDocType;
  pageNumber:       number;
  textEvidence:     string;  // verbatim quote, max 400 chars

  // Time dimension — ESSENTIAL for timeline
  fiscalYear:    string;   // "2081/82"
  nepaliYear:    number;   // 2081
  datePublished?: string;  // ISO date of source doc
  periodType:    PeriodType;

  // Financial data (optional for non-budget atoms)
  amount?:         number;
  amountPrevYear?: number;
  unit?:           string;  // "crore", "arba", "billion", "rupees"
  currency?:       "NPR" | "USD";
  percentChange?:  number;  // ((amount - prev) / prev) * 100

  // Geography
  province?:  string;
  localLevel?: string;
  geoScope:   "national" | "provincial" | "local";

  // Context
  targetGroup?: string;
  policyType?:  string;

  // Year-to-year comparison
  comparisonStatus:       EconomicComparisonStatus;
  previousYearReference?: string;    // Text summary of previous year context
  previousYearAtomIds?:   string[];  // Firestore IDs for cross-linking
  nextYearAtomIds?:        string[];

  // National movement context (Gen Z movement, etc.)
  relatedMovement?:    string;   // e.g. "gen_z_movement_2081"
  beforeAfterContext?: string;   // "Post Gen Z movement — new youth employment language"
  movementDemandMet?:  boolean;  // Was this a direct response to movement demand?

  // Actor (for economist_commentary / institution_response)
  actorId?:          string;
  actorName?:        string;
  actorRole?:        EconomicActorRole;
  actorInstitution?: string;

  // Citizen-friendly content
  summaryNepali:         string;  // 1-2 sentences in Nepali
  citizenMeaningNepali:  string;  // "यो तपाईंलाई कसरी असर गर्छ?"

  // Quality gate
  confidence:        number;  // 0–1
  verificationStatus: "ai_extracted" | "founder_verified" | "needs_revision";
  qualityScore?:     number;  // 0–100
  publishedToPublic: boolean; // false until founder approves

  createdAt: string;
  updatedAt: string;
}

export interface EconomyExtractionJob {
  ownerId:       string;
  docId:         string;
  docTitle:      string;
  fiscalYear:    string;
  nepaliYear:    number;
  docType:       EconomicDocType;
  status:        "processing" | "complete" | "error";
  recordsSaved?: number;
  errorMsg?:     string;
  startedAt:     string;
  completedAt?:  string;
}

// ── Display metadata ──────────────────────────────────────────────────────────

export const SECTOR_META: Record<EconomicSector, { icon: string; tw: string }> = {
  "शिक्षा":          { icon: "📚", tw: "bg-blue-950 text-blue-300 border-blue-800"     },
  "स्वास्थ्य":        { icon: "🏥", tw: "bg-red-950 text-red-300 border-red-800"         },
  "कृषि":            { icon: "🌾", tw: "bg-green-950 text-green-300 border-green-800"    },
  "रोजगार":          { icon: "💼", tw: "bg-orange-950 text-orange-300 border-orange-800" },
  "युवा":            { icon: "⚡", tw: "bg-purple-950 text-purple-300 border-purple-800" },
  "पूर्वाधार":        { icon: "🏗", tw: "bg-zinc-800 text-zinc-300 border-zinc-600"       },
  "ऊर्जा":           { icon: "💡", tw: "bg-yellow-950 text-yellow-300 border-yellow-800" },
  "यातायात":         { icon: "🚌", tw: "bg-cyan-950 text-cyan-300 border-cyan-800"       },
  "पर्यटन":          { icon: "🏔", tw: "bg-pink-950 text-pink-300 border-pink-800"       },
  "उद्योग":          { icon: "🏭", tw: "bg-amber-950 text-amber-300 border-amber-800"    },
  "सामाजिक सुरक्षा":  { icon: "🛡", tw: "bg-teal-950 text-teal-300 border-teal-800"      },
  "प्रदेश/स्थानीय":   { icon: "🗺", tw: "bg-lime-950 text-lime-300 border-lime-800"       },
  "कर/राजस्व":       { icon: "💰", tw: "bg-red-900 text-red-200 border-red-700"          },
  "ऋण/घाटा":        { icon: "📉", tw: "bg-rose-950 text-rose-300 border-rose-800"       },
  "सुशासन":          { icon: "⚖",  tw: "bg-indigo-950 text-indigo-300 border-indigo-800" },
  "डिजिटल/प्रविधि":   { icon: "💻", tw: "bg-violet-950 text-violet-300 border-violet-800" },
  "अन्य":            { icon: "◻",  tw: "bg-zinc-900 text-zinc-400 border-zinc-700"       },
};

export const ATOM_TYPE_LABEL: Record<EconomicAtomType, string> = {
  budget_allocation:    "बजेट विनियोजन",
  revenue:             "राजस्व",
  spending:            "खर्च",
  debt_deficit:        "ऋण / घाटा",
  policy_promise:      "नीति प्रतिबद्धता",
  reform:              "सुधार",
  repeated_promise:    "दोहोरिएको प्रतिबद्धता",
  removed_policy:      "हटाइएको कार्यक्रम",
  economist_commentary: "विशेषज्ञ टिप्पणी",
  institution_response: "संस्थागत प्रतिक्रिया",
  movement_impact:     "आन्दोलन प्रभाव",
  sector_trend:        "क्षेत्रगत प्रवृत्ति",
};

export const COMPARISON_META: Record<EconomicComparisonStatus, { label: string; tw: string }> = {
  new:       { label: "नयाँ",              tw: "text-cyan-400"   },
  continued: { label: "निरन्तर",           tw: "text-zinc-400"   },
  increased: { label: "बढेको ↑",           tw: "text-green-400"  },
  decreased: { label: "घटेको ↓",           tw: "text-red-400"    },
  removed:   { label: "हटाइएको",           tw: "text-rose-400"   },
  repeated:  { label: "दोहोरिएको",         tw: "text-amber-400"  },
  unknown:   { label: "तुलना उपलब्ध छैन",  tw: "text-zinc-600"   },
};

export const DOC_TYPE_LABEL: Record<EconomicDocType, string> = {
  budget_speech:      "बजेट भाषण",
  budget_detail:      "बजेट विस्तृत (रातो किताब)",
  monetary_policy:    "मौद्रिक नीति",
  economic_survey:    "आर्थिक सर्वेक्षण",
  npc_plan:           "योजना आयोग",
  commission_report:  "आयोग प्रतिवेदन",
  government_program: "सरकारी कार्यक्रम",
  other:              "अन्य",
};

export const ECONOMIC_DOC_TYPES: EconomicDocType[] = [
  "budget_speech", "budget_detail", "monetary_policy",
  "economic_survey", "npc_plan", "commission_report",
  "government_program", "other",
];

// Format NPR amount to Nepali shorthand
export function formatNPR(amount: number): string {
  if (amount >= 1_000_000_000) return `रु. ${(amount / 1_000_000_000).toFixed(2)} अर्ब`;
  if (amount >= 10_000_000)    return `रु. ${(amount / 10_000_000).toFixed(2)} करोड`;
  if (amount >= 100_000)       return `रु. ${(amount / 100_000).toFixed(1)} लाख`;
  return `रु. ${amount.toLocaleString("ne-NP")}`;
}
