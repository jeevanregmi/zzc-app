/**
 * Gen Z Government Promise Tracker — Type System
 *
 * A government promise is a source-backed public commitment extracted from
 * official documents. Each promise has an accountability lifecycle.
 *
 * NON-PARTISAN RULE (enforced in prompts and UI):
 *   - Calm, factual, evidence-based language only
 *   - Status = what evidence shows, not editorial opinion
 *   - "Progress evidence अझै भेटिएको छैन" — never "सरकार झुटो"
 */

// ── Sectors (civic, not financial) ────────────────────────────────────────────

export type PromiseSector =
  | "युवा"
  | "रोजगार"
  | "शिक्षा"
  | "स्वास्थ्य"
  | "सुशासन"
  | "भ्रष्टाचार नियन्त्रण"
  | "डिजिटल"
  | "कृषि"
  | "अर्थतन्त्र"
  | "पूर्वाधार"
  | "सामाजिक सुरक्षा"
  | "न्याय"
  | "वातावरण"
  | "अन्य";

// ── Promise accountability status ─────────────────────────────────────────────

export type PromiseStatus =
  | "announced"       // 🟡 घोषणा भयो — only a statement, no action evidence yet
  | "in_progress"     // 🔵 काम हुँदैछ — evidence of implementation started
  | "partially_done"  // 🟠 आंशिक पूरा — some parts done, some pending
  | "completed"       // 🟢 पूरा भयो — evidence of full completion
  | "delayed"         // 🔴 ढिला — deadline passed, not completed
  | "broken"          // 🔴 पूरा भएन — explicitly reversed or abandoned
  | "unclear";        // ⚪ अस्पष्ट — insufficient evidence to assess

export type PromiseVerificationStatus =
  | "ai_extracted"      // Extracted by AI, not yet founder-reviewed
  | "founder_reviewed"  // Founder has confirmed accuracy
  | "human_verified"    // Third-party document cross-check done
  | "needs_revision";   // Founder flagged as incorrect

export type RelatedMovement =
  | "gen_z_movement_2081"  // Nepal Gen Z movement 2081 BS
  | "none";

// ── Source document reference ──────────────────────────────────────────────────

export type PromiseSourceDocType =
  | "budget_speech"
  | "niti_karyakram"        // नीति तथा कार्यक्रम
  | "monetary_policy"
  | "cabinet_decision"
  | "ministry_circular"
  | "parliamentary_document"
  | "pmo_announcement"
  | "other_official";

// ── Core promise atom ─────────────────────────────────────────────────────────

export interface PromiseAtom {
  id:                    string;
  ownerId:               string;

  // ── What was promised ───────────────────────────────────────────────────────
  titleNepali:           string;       // One-line summary of the promise
  plainNepaliMeaning:    string;       // "यसले नागरिकलाई के हुन्छ?"
  promisedAction:        string;       // Specific action the govt committed to
  promisedOutput?:       string;       // Expected deliverable / quantity
  deadlineText?:         string;       // "आर्थिक वर्ष 2083/84 सम्म" (verbatim or parsed)
  measurableIndicator?:  string;       // How to verify completion

  // ── Source ──────────────────────────────────────────────────────────────────
  originalTextEvidence:  string;       // Verbatim quote from source (max 500 chars)
  sourceDocumentId:      string;       // vault_intelligence_docs ID
  sourceDocTitle:        string;       // Human-readable doc title
  sourceDocType:         PromiseSourceDocType;
  pageNumber:            number;       // Exact page — must be present
  fiscalYear:            string;       // "2083/84"
  nepaliYear:            number;       // 2083

  // ── Classification ──────────────────────────────────────────────────────────
  sector:                PromiseSector;
  responsibleInstitution?: string;     // "Ministry of Youth and Sports"
  targetGroup?:          string;       // "युवा उद्यमी / विद्यार्थी / कर्मचारी"
  budgetAmount?:         number;       // Allocated budget if any (NPR)
  budgetUnit?:           string;       // "rupees"
  relatedEconomyAtomIds?: string[];    // Links to economy_atoms for budget evidence

  // ── Movement context ────────────────────────────────────────────────────────
  relatedMovement?:      RelatedMovement;
  movementDemandType?:   string;       // "युवा सशक्तिकरण / रोजगार सिर्जना / सुशासन"
  movementConfidence?:   number;       // 0–1, rule-based score

  // ── Accountability status ────────────────────────────────────────────────────
  promiseStatus:         PromiseStatus;
  isRepeatFromLastYear:  boolean;      // Same promise appeared in previous year's doc
  previousYearEvidence?: string;       // Quote/reference from previous year
  previousYearDocTitle?: string;
  accountabilityScore?:  number;       // 0–1 (budget-backed + measurable = higher)

  // ── Verification & publication ───────────────────────────────────────────────
  verificationStatus:    PromiseVerificationStatus;
  founderNote?:          string;       // Private founder annotation
  publicReady:           boolean;      // Only true after founder explicitly approves

  // ── Tracking ────────────────────────────────────────────────────────────────
  lastCheckedAt?:        string;       // ISO — when status was last assessed
  nextCheckDueAt?:       string;       // ISO — when to check again
  statusHistory?:        PromiseStatusEntry[];

  // ── Timestamps ──────────────────────────────────────────────────────────────
  createdAt:             string;
  updatedAt:             string;
}

export interface PromiseStatusEntry {
  status:    PromiseStatus;
  setAt:     string;        // ISO
  evidence?: string;        // What changed
  setBy:     "ai" | "founder";
}

// ── Display helpers ────────────────────────────────────────────────────────────

export const PROMISE_STATUS_META: Record<PromiseStatus, {
  label:      string;
  labelNepali: string;
  icon:       string;
  tw:         string;
}> = {
  announced:     { label: "Announced",      labelNepali: "घोषणा भयो",      icon: "🟡", tw: "text-yellow-400 bg-yellow-950/40 border-yellow-800/50" },
  in_progress:   { label: "In Progress",    labelNepali: "काम हुँदैछ",     icon: "🔵", tw: "text-blue-400   bg-blue-950/40   border-blue-800/50"   },
  partially_done:{ label: "Partial",        labelNepali: "आंशिक पूरा",     icon: "🟠", tw: "text-orange-400 bg-orange-950/40 border-orange-800/50" },
  completed:     { label: "Completed",      labelNepali: "पूरा भयो",       icon: "🟢", tw: "text-green-400  bg-green-950/40  border-green-800/50"  },
  delayed:       { label: "Delayed",        labelNepali: "ढिला भयो",       icon: "🔴", tw: "text-red-400    bg-red-950/40    border-red-800/50"    },
  broken:        { label: "Not Fulfilled",  labelNepali: "पूरा भएन",       icon: "🔴", tw: "text-red-400    bg-red-950/40    border-red-800/50"    },
  unclear:       { label: "Unclear",        labelNepali: "अस्पष्ट",        icon: "⚪", tw: "text-zinc-400   bg-zinc-800/60   border-zinc-700"      },
};

export const PROMISE_SECTOR_META: Record<PromiseSector, { icon: string; tw: string }> = {
  "युवा":                 { icon: "🌱", tw: "bg-green-950/60  text-green-300  border-green-800/60"  },
  "रोजगार":              { icon: "💼", tw: "bg-blue-950/60   text-blue-300   border-blue-800/60"   },
  "शिक्षा":              { icon: "📚", tw: "bg-indigo-950/60 text-indigo-300 border-indigo-800/60" },
  "स्वास्थ्य":           { icon: "🏥", tw: "bg-red-950/60    text-red-300    border-red-800/60"    },
  "सुशासन":              { icon: "⚖️", tw: "bg-purple-950/60 text-purple-300 border-purple-800/60" },
  "भ्रष्टाचार नियन्त्रण":{ icon: "🔍", tw: "bg-amber-950/60  text-amber-300  border-amber-800/60"  },
  "डिजिटल":              { icon: "💻", tw: "bg-cyan-950/60   text-cyan-300   border-cyan-800/60"   },
  "कृषि":                { icon: "🌾", tw: "bg-lime-950/60   text-lime-300   border-lime-800/60"   },
  "अर्थतन्त्र":          { icon: "📊", tw: "bg-yellow-950/60 text-yellow-300 border-yellow-800/60" },
  "पूर्वाधार":           { icon: "🏗️", tw: "bg-stone-900/60  text-stone-300  border-stone-700"     },
  "सामाजिक सुरक्षा":    { icon: "🤝", tw: "bg-teal-950/60   text-teal-300   border-teal-800/60"   },
  "न्याय":               { icon: "🏛️", tw: "bg-violet-950/60 text-violet-300 border-violet-800/60" },
  "वातावरण":             { icon: "🌿", tw: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60" },
  "अन्य":               { icon: "◻",  tw: "bg-zinc-900      text-zinc-400   border-zinc-700"      },
};

export const SOURCE_DOC_TYPE_LABEL: Record<PromiseSourceDocType, string> = {
  budget_speech:         "Budget Speech",
  niti_karyakram:        "नीति तथा कार्यक्रम",
  monetary_policy:       "Monetary Policy",
  cabinet_decision:      "Cabinet Decision",
  ministry_circular:     "Ministry Circular",
  parliamentary_document:"Parliamentary Document",
  pmo_announcement:      "PMO Announcement",
  other_official:        "Other Official",
};

export const PROMISE_SOURCE_DOC_TYPES: PromiseSourceDocType[] = [
  "budget_speech",
  "niti_karyakram",
  "monetary_policy",
  "cabinet_decision",
  "ministry_circular",
  "parliamentary_document",
  "pmo_announcement",
  "other_official",
];

// ── Accountability score calculation ──────────────────────────────────────────
// Pure function. Higher = more credible / trackable promise.
// Budget-backed: +0.4, Measurable indicator: +0.3, Deadline stated: +0.2,
// Responsible institution named: +0.1

export function computeAccountabilityScore(p: Pick<
  PromiseAtom,
  "budgetAmount" | "measurableIndicator" | "deadlineText" | "responsibleInstitution"
>): number {
  let score = 0;
  if ((p.budgetAmount ?? 0) > 0)      score += 0.4;
  if (p.measurableIndicator?.trim())  score += 0.3;
  if (p.deadlineText?.trim())         score += 0.2;
  if (p.responsibleInstitution?.trim()) score += 0.1;
  return Math.round(score * 10) / 10;
}
