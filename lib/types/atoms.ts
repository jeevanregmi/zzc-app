/**
 * CivicAtom — the atomic unit of Nepal's civic intelligence.
 *
 * A document is an input. An atom is the output.
 * Every atom is a self-contained civic fact that can be:
 *   - displayed to a citizen independently
 *   - linked to a constitutional branch
 *   - tracked over time (promise → in-progress → implemented)
 *   - connected to other atoms across documents
 *
 * Collection: vault_civic_atoms
 */

export type AtomType =
  | "fact"           // verified factual statement from a document
  | "promise"        // government commitment ("X गरिनेछ")
  | "policy_change"  // rule / regulation change
  | "financial"      // monetary fact — amount, rate, budget line
  | "risk"           // identified risk, challenge, or concern
  | "right"          // constitutional right reference or reaffirmation
  | "target"         // numerical goal (enrollment %, GDP, deadline)
  | "institution";   // institutional decision or mandate

export type AtomConfidenceLevel = "high" | "medium" | "low";

export function atomConfidenceLevel(confidence: number): AtomConfidenceLevel {
  if (confidence >= 0.75) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

/** Which constitutional branch this atom belongs to */
export type BranchId =
  | "education"
  | "health"
  | "employment"
  | "housing"
  | "food"
  | "social"
  | "finance"
  | "information";

export interface ConstitutionBranch {
  id:       BranchId;
  article:  string;   // "धारा ३१"
  title:    string;   // "शिक्षाको हक"
  titleEn:  string;
  icon:     string;
  color:    string;   // Tailwind color key
  sectors:  string[]; // keywords that map to this branch
}

export const CONSTITUTION_BRANCHES: ConstitutionBranch[] = [
  {
    id: "education", article: "धारा ३१", title: "शिक्षाको हक", titleEn: "Right to Education",
    icon: "📚", color: "cyan",
    sectors: ["education", "school", "university", "student", "curriculum", "literacy", "शिक्षा", "विद्यालय"],
  },
  {
    id: "health", article: "धारा ३५", title: "स्वास्थ्यको हक", titleEn: "Right to Health",
    icon: "🏥", color: "green",
    sectors: ["health", "hospital", "medicine", "medical", "doctor", "nurse", "स्वास्थ्य", "अस्पताल"],
  },
  {
    id: "employment", article: "धारा ३३", title: "रोजगारीको हक", titleEn: "Right to Employment",
    icon: "💼", color: "blue",
    sectors: ["employment", "labor", "ssf", "epf", "job", "worker", "रोजगार", "श्रम", "कर्मचारी", "cia", "pension"],
  },
  {
    id: "housing", article: "धारा ३७", title: "आवासको हक", titleEn: "Right to Housing",
    icon: "🏠", color: "violet",
    sectors: ["housing", "shelter", "real estate", "land", "घर", "जग्गा", "आवास"],
  },
  {
    id: "food", article: "धारा ३६", title: "खाद्यको हक", titleEn: "Right to Food",
    icon: "🌾", color: "amber",
    sectors: ["food", "agriculture", "farming", "farmer", "खाद्य", "कृषि", "किसान"],
  },
  {
    id: "social", article: "धारा ४०", title: "सामाजिक न्यायको हक", titleEn: "Right to Social Justice",
    icon: "⚖️", color: "pink",
    sectors: ["social", "dalit", "women", "indigenous", "disability", "महिला", "दलित", "जनजाति"],
  },
  {
    id: "finance", article: "धारा ११९", title: "सार्वजनिक वित्त", titleEn: "Public Finance",
    icon: "💰", color: "emerald",
    sectors: ["finance", "budget", "banking", "nrb", "tax", "revenue", "fiscal", "बजेट", "बैंक", "कर"],
  },
  {
    id: "information", article: "धारा २७", title: "सूचनाको हक", titleEn: "Right to Information",
    icon: "📡", color: "orange",
    sectors: ["information", "press", "media", "rti", "transparency", "सूचना", "पारदर्शिता"],
  },
];

export interface CivicAtom {
  id:              string;    // "docId-type-index"

  // ── The atomic fact ────────────────────────────────────────────────────────
  text:            string;    // the civic fact in its source language
  textNepali?:     string;    // citizen-readable Nepali version

  // ── Classification ─────────────────────────────────────────────────────────
  type:            AtomType;
  confidence:      number;    // 0-1 — inherited from source document
  constitutionalBranches: BranchId[];
  constitutionalRefs:     string[];  // ["धारा ३१", "धारा ५१(घ)"]
  constitutionalParts:    number[];  // part numbers 1-35 in the Constitution of Nepal

  // ── Impact scope ──────────────────────────────────────────────────────────
  affectedSectors: string[];
  citizenGroups:   string[];

  // ── Source provenance ─────────────────────────────────────────────────────
  sourceDocId:     string;
  sourceDocTitle:  string;
  sourceCategory:  string;
  sourceAuthority?: string;
  harvestedFrom:   "key_insight" | "policy_change" | "financial" | "youth_impact" | "ssf_epf";

  // ── AI Explainability — why the AI classified this atom this way ───────────
  typeReasoning?:               string;  // "यो 'promise' हो किनकि 'गरिनेछ' keyword छ"
  constitutionalLinkReasoning?: string;  // "शिक्षा sector → धारा ३१ mapped"
  confidenceFactors?:           string[]; // what raises/lowers confidence
  intelligenceFlow?:            string[]; // where this atom flows next in the OS

  // ── Temporal ──────────────────────────────────────────────────────────────
  ownerId:         string;
  uploadedAt:      string;    // source doc upload date — used for timeline
  harvestedAt:     string;    // when atom was extracted
}
