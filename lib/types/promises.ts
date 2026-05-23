/**
 * PolicyPromise — Nepal Civic Accountability Layer
 *
 * Every government document makes commitments. This schema captures them
 * in a structured, trackable form so ZZC Janta can surface:
 *   - what was promised
 *   - who is responsible
 *   - what was allocated
 *   - whether it was delivered
 *
 * Collection: policy_promises
 */

export type PromiseStatus =
  | "promised"      // stated in document, no evidence of action yet
  | "in-progress"   // work has started, not complete
  | "implemented"   // verified as done
  | "delayed"       // past deadline, not done
  | "cancelled"     // officially dropped or contradicted
  | "unknown";      // no tracking data available yet

export type PromiseCategory =
  | "budget-allocation"   // money promised/allocated
  | "infrastructure"      // physical construction/development
  | "policy-reform"       // law/regulation change
  | "social-program"      // welfare/subsidy/benefit
  | "institution"         // new body/committee/agency
  | "target"              // numerical goal (enrollment %, GDP, etc.)
  | "timeline"            // specific deadline commitment
  | "other";

export interface PolicyPromise {
  id: string;
  ownerId: string;

  // ── Source ────────────────────────────────────────────────────────────────────
  sourceDocId:     string;    // vault_intelligence_docs document ID
  sourceDocTitle:  string;    // human-readable source name
  sourceDocType?:  string;    // "budget" | "niti-karyakram" | "manifesto" | "act" | ...
  sourceYear?:     string;    // "2083/84" or "2081"
  sourceSection?:  string;    // which section/page of the document

  // ── The Promise ───────────────────────────────────────────────────────────────
  promiseText:    string;     // exact or close-to-exact quote from document
  promiseNepali:  string;     // simplified citizen-readable Nepali (1-2 sentences)
  promiseEnglish?: string;    // English translation for reference
  category:       PromiseCategory;

  // ── Accountability Fields ─────────────────────────────────────────────────────
  responsibleMinistry:  string;    // "Ministry of Finance" / "अर्थ मन्त्रालय"
  responsiblePerson?:   string;    // specific official if named
  timeline?:            string;    // "आर्थिक वर्ष २०८३/८४ भित्र" or specific date
  budgetAmount?:        string;    // "रु. ५ अर्ब" — as stated in document
  budgetAmountNum?:     number;    // parsed numeric value in NPR crore for sorting

  // ── Impact ───────────────────────────────────────────────────────────────────
  affectedGroups:   string[];  // ["युवा", "कृषक", "महिला", "दलित", ...]
  affectedSectors:  string[];  // ["agriculture", "education", "energy", ...]
  affectedProvinces?: string[]; // ["Koshi", "Bagmati", ...] — if specific

  // ── Tracking ─────────────────────────────────────────────────────────────────
  status:          PromiseStatus;
  statusNote?:     string;     // brief note on why delayed/cancelled/done
  statusEvidence?: string;     // which document confirms the status update
  statusDocId?:    string;     // vault_intelligence_docs ID of evidence doc
  statusUpdatedAt?: string;

  // ── Related ──────────────────────────────────────────────────────────────────
  relatedPromiseIds?: string[];  // links to prior/follow-up promises on same topic
  relatedPolicyPointId?: string; // vault_policy_points ID if connected

  // ── Publishing ────────────────────────────────────────────────────────────────
  publishToJanta:  boolean;    // publicly visible on /janta
  featured?:       boolean;    // highlighted in accountability rail

  // ── Timestamps ───────────────────────────────────────────────────────────────
  createdAt:  string;
  updatedAt:  string;
}
