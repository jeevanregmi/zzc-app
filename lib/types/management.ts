/**
 * ZZC Management OS — type definitions.
 *
 * Philosophy:
 * - Departments are management views over the same CopilotContext.
 * - AI Officers read ONE backend brain. No separate Firestore reads.
 * - Tasks reference existing atom graph (docId, partNumber, atomId).
 * - Management OS is an organization layer, not a new intelligence store.
 *
 * See docs/MANAGEMENT_OS.md for full design rationale.
 */

// ─── Department IDs ────────────────────────────────────────────────────────────

export type DepartmentId =
  | "intelligence"   // civic pipeline, constitution, janta extraction
  | "content"        // civic media atoms, scripts, publishing
  | "research"       // source registry, official links, document acquisition
  | "product"        // public Civic Chautari, janta, UX
  | "operations"     // infra, deploy, billing, system health
  | "growth"         // campaigns, social, civic audience
  | "finance"        // AI cost, cloud cost, revenue readiness
  | "strategy"       // vision vault, roadmap, two-worlds philosophy
  | "bhakti"         // Temple Vault + ZZ Bhakti Chautari (spiritual world)
  | "qa";            // QA & Verification — testing queues, sprint, pass/fail

// ─── AI Officer ────────────────────────────────────────────────────────────────

export interface AIOfficer {
  id:          string;       // "cio", "cco", "cro", "cpo", "coo", "cgro", "cfo", "cso"
  title:       string;       // "Chief Intelligence Officer"
  titleNp:     string;       // "मुख्य बुद्धिमत्ता अधिकारी"
  icon:        string;       // emoji
  department:  DepartmentId;
  // What CopilotContext fields this officer primarily reads
  contextFocus: string[];    // e.g. ["pipeline", "intelligence", "branchHealth"]
  // What system capabilities this officer is responsible for
  focusAreas:  string[];     // e.g. ["Document pipeline", "Branch health", "Relationships"]
}

// ─── KPI definitions (static) ─────────────────────────────────────────────────
// Values are computed at runtime from CopilotContext — never stored separately.

export type KPIDirection = "higher_is_better" | "lower_is_better" | "exact_is_better";

export interface KPIDefinition {
  id:        string;
  labelNp:   string;         // "Approved Documents"
  unit:      string;         // "documents", "records", "%", "NPR", "USD"
  target?:   number;         // quantified target, if applicable
  direction: KPIDirection;
  // Which CopilotContext path drives this KPI (for future automated extraction)
  contextPath?: string;      // e.g. "pipeline.approved", "intelligence.intelCount"
}

// ─── Department static definition ─────────────────────────────────────────────

export interface Department {
  id:        DepartmentId;
  name:      string;         // "Intelligence Department"
  nameNp:    string;         // "बुद्धिमत्ता विभाग"
  mission:   string;         // plain Nepali mission statement
  officer:   AIOfficer;
  handles:   string[];       // human-readable list of what this dept owns
  kpis:      KPIDefinition[];
  // Integration points
  firestoreCollections: string[];  // Firestore collections this dept reads
  vaultRoutes:          string[];  // /vault/* routes this dept owns
  primaryRoute:         string;    // main action destination
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export type TaskStatus   = "open" | "in_progress" | "blocked" | "done" | "deferred";
export type TaskPriority = "urgent" | "high" | "medium" | "low";
export type TaskOwner    = "founder" | "ai_officer" | "future_team";
export type CostLevel    = "none" | "low" | "medium" | "high";

export interface ManagementTask {
  id:               string;
  titleNp:          string;         // plain Nepali task title
  bodyNp?:          string;         // optional plain Nepali description
  department:       DepartmentId;
  priority:         TaskPriority;
  status:           TaskStatus;
  owner:            TaskOwner;
  requiresApproval: boolean;
  costLevel:        CostLevel;
  costNote?:        string;         // "~$0.10 per document"

  // Temporal
  createdAt?:       string;         // ISO date
  dueDate?:         string;         // ISO date
  completedAt?:     string;         // ISO date

  // Links into existing atom graph — tasks reference, never duplicate
  linkedDocId?:     string;         // vault_documents doc id
  linkedPartNumber?: number;        // constitutional_framework part number
  linkedAtomId?:    string;         // janta_intelligence or media_atoms id

  // Action
  actionLabel:      string;         // button text (Nepali)
  actionHref:       string;         // navigation destination
  suggestedNextAction?: string;     // what to do after this task

  // Block info
  blockedReason?:   string;         // why is this task blocked?
  blockedBy?:       string;         // task id that is blocking this one
}

// ─── Founder Work Step ────────────────────────────────────────────────────────
// One stop in the founder's daily/weekly execution cycle.

export type StepUrgency = "must_do" | "should_do" | "nice_to_have";

export interface FounderWorkStep {
  order:            number;         // 1-8 (ordered by priority, not fixed by department)
  department:       DepartmentId;
  officer:          AIOfficer;
  durationMins:     number;         // recommended time budget in minutes
  reason:           string;         // why this step is needed RIGHT NOW (Nepali)
  primaryTask:      string;         // single specific task to complete (Nepali)
  actionLabel:      string;         // action button label (Nepali)
  actionHref:       string;         // where to navigate to complete the work
  successCondition: string;         // when can you move to the next step? (Nepali)
  urgency:          StepUrgency;
  canSkip:          boolean;        // can this step wait until tomorrow?
  skipReason?:      string;         // why it's ok to skip (if canSkip)
}

// ─── Founder Work Cycle ───────────────────────────────────────────────────────
// Generated from CopilotContext — dynamic, not stored in Firestore.

export interface FounderWorkCycle {
  generatedAt:    string;           // ISO timestamp
  totalSteps:     number;
  totalMins:      number;           // sum of all durationMins
  steps:          FounderWorkStep[];
  topDecision?:   string;           // most important founder decision right now
  weekFocus:      string;           // strategic theme for this week (Nepali)
  // Summary stats
  mustDoSteps:    number;           // urgency === "must_do"
  shouldDoSteps:  number;
  niceToHaveSteps: number;
}

// ─── Department Briefing ──────────────────────────────────────────────────────
// Computed view of a department's state. Derived from CopilotContext at runtime.

export type DepartmentStatus = "critical" | "needs_attention" | "on_track" | "idle";

export interface KPIValue {
  definition:  KPIDefinition;
  value:       number | string;
  isOnTarget:  boolean;
  trend?:      "up" | "down" | "stable";
}

export interface DepartmentBriefing {
  department:       DepartmentId;
  status:           DepartmentStatus;
  statusNp:         string;          // "तुरुन्त हेर्नुस्" | "ध्यान दिनुस्" | "राम्रो" | "सक्रिय छैन"
  officer:          AIOfficer;
  topTasks:         ManagementTask[]; // max 3, sorted by priority
  blockers:         ManagementTask[]; // tasks with status === "blocked"
  kpis:             KPIValue[];
  founderDecision?: string;           // a decision only the founder can make
  nextAction:       string;           // single most important next action (Nepali)
  nextActionHref:   string;
  nextActionLabel:  string;
}

// ─── Test Item ────────────────────────────────────────────────────────────────
// A workflow checkpoint the founder should verify. Computed from system state.
// Not stored in Firestore (Phase 4+) — generated at runtime.

export type TestStatus   = "pending" | "passed" | "failed";
export type TestItemType = "ui_test" | "pipeline_test" | "data_test" | "workflow_test";

export interface TestItem {
  id:          string;
  title:       string;        // "Temple Vault mobile layout"
  department:  DepartmentId;
  testType:    TestItemType;
  status:      TestStatus;    // always "pending" until founder marks done (Phase 4)
  href:        string;        // where to go to test
  description: string;        // what to verify (Nepali)
}

// ─── COO Briefing ─────────────────────────────────────────────────────────────
// The orchestration layer. Synthesizes all department states into one voice.
// This is what the founder reads FIRST — before any department detail.

export interface COOBriefing {
  focusStatement:  string;        // ONE directive sentence: what to do RIGHT NOW
  systemStatus:    "healthy" | "attention_needed" | "critical";
  systemStatusNp:  string;        // Nepali label
  attentionCount:  number;        // departments with needs_attention or critical
  criticalCount:   number;        // departments with critical status
  blockerCount:    number;        // total blocked tasks
  testingItems:    TestItem[];    // workflow checkpoints needing verification
  ctoFeedback:     string[];      // 3-5 clean sentences summarizing operational state for CTO
  operationalNote: string;        // one calm sentence about overall system health
}

// ─── Management OS State ──────────────────────────────────────────────────────
// The full rendered state for /vault/management.
// Computed from CopilotContext — never persisted to Firestore (until Phase 4 tasks).

export interface ManagementOSState {
  cooBriefing:     COOBriefing;
  cycle:           FounderWorkCycle;
  departments:     DepartmentBriefing[];
  urgentCount:     number;           // departments with status === "critical"
  blockerCount:    number;           // total blocked tasks across all departments
  openDecisions:   string[];         // pending founder decisions
  computedAt:      string;           // ISO timestamp
  durationMs:      number;           // computation time
}

// ─── Founder Decision ─────────────────────────────────────────────────────────
// A decision that requires founder input. Generated by officers, awaiting founder.

export type DecisionType =
  | "approve_task"       // approve a suggested task before starting
  | "approve_cost"       // approve AI cost before triggering extraction
  | "strategic_choice"   // choose between strategic directions
  | "policy_call"        // decide how to handle a data or content policy question
  | "scope_question";    // "should we build X?"

export interface FounderDecision {
  id:            string;
  type:          DecisionType;
  questionNp:    string;             // the decision question in plain Nepali
  contextNp:     string;             // why this decision matters
  options:       Array<{
    label:   string;                 // short option label
    href?:   string;                 // navigation if selected
    costNote?: string;               // cost implication if any
  }>;
  department:    DepartmentId;
  priority:      TaskPriority;
  createdAt:     string;
  expiresAt?:    string;
}

// ─── Weekly Review ────────────────────────────────────────────────────────────
// Summary of the week — Phase 5+ feature.

export interface WeeklyReview {
  weekOf:             string;        // ISO date (Monday of the week)
  departmentSummaries: Array<{
    department:       DepartmentId;
    highlights:       string[];      // what went well
    gaps:             string[];      // what didn't happen
    nextWeekFocus:    string;
  }>;
  tasksCompleted:     number;
  tasksCreated:       number;
  documentsProcessed: number;
  intelligenceAdded:  number;
  costSpent?:         string;        // approximate AI/cloud cost
  founderNote?:       string;        // founder reflection (free text)
  generatedAt:        string;
}

// ─── Static Registry ──────────────────────────────────────────────────────────
// The canonical list of departments and officers.
// Imported by the management engine and UI — defined once, used everywhere.

export const AI_OFFICERS: Record<DepartmentId, AIOfficer> = {
  intelligence: {
    id: "cio", title: "Chief Intelligence Officer", titleNp: "मुख्य बुद्धिमत्ता अधिकारी",
    icon: "🧠", department: "intelligence",
    contextFocus: ["pipeline", "intelligence", "branchHealth"],
    focusAreas: ["Document pipeline", "Deep extraction", "Branch health", "Janta intelligence"],
  },
  content: {
    id: "cco", title: "Chief Content Officer", titleNp: "मुख्य सामग्री अधिकारी",
    icon: "🎬", department: "content",
    contextFocus: ["media"],
    focusAreas: ["Media atoms", "Script generation", "Content publishing"],
  },
  research: {
    id: "cro", title: "Chief Research Officer", titleNp: "मुख्य अनुसन्धान अधिकारी",
    icon: "🔍", department: "research",
    contextFocus: ["sourceMonitoring", "branchHealth"],
    focusAreas: ["Source registry", "Official link discovery", "Document acquisition"],
  },
  product: {
    id: "cpo", title: "Chief Product Officer", titleNp: "मुख्य उत्पाद अधिकारी",
    icon: "🌳", department: "product",
    contextFocus: ["branchHealth", "intelligence"],
    focusAreas: ["Civic Chautari", "Public Constitution Tree", "Janta page", "UX quality"],
  },
  operations: {
    id: "coo", title: "Chief Operations Officer", titleNp: "मुख्य सञ्चालन अधिकारी",
    icon: "⚙️", department: "operations",
    contextFocus: ["pipeline", "costRisk"],
    focusAreas: ["Infra health", "Billing", "Deploy", "System settings", "Stuck documents"],
  },
  growth: {
    id: "cgro", title: "Chief Growth Officer", titleNp: "मुख्य वृद्धि अधिकारी",
    icon: "🚀", department: "growth",
    contextFocus: ["media", "intelligence"],
    focusAreas: ["Civic campaigns", "Social presence", "Audience building", "Public launch"],
  },
  finance: {
    id: "cfo", title: "Chief Finance Officer", titleNp: "मुख्य वित्त अधिकारी",
    icon: "💰", department: "finance",
    contextFocus: ["costRisk", "pipeline"],
    focusAreas: ["AI token costs", "Cloud costs", "Revenue readiness", "Monetization"],
  },
  strategy: {
    id: "cso", title: "Chief Strategy Officer", titleNp: "मुख्य रणनीति अधिकारी",
    icon: "🎯", department: "strategy",
    contextFocus: ["qa", "intelligence", "media"],
    focusAreas: ["Vision Vault", "Two-worlds architecture", "Roadmap", "ZZC philosophy"],
  },
  bhakti: {
    id: "cbdo", title: "Chief Bhakti & Devotional Officer", titleNp: "मुख्य भक्ति अधिकारी",
    icon: "🛕", department: "bhakti",
    contextFocus: ["temple"],
    focusAreas: ["Temple Vault", "Sacred notes review", "Bhakti Chautari pipeline", "Sanskrit dictionary"],
  },
  qa: {
    id: "cqao", title: "Chief QA & Verification Officer", titleNp: "मुख्य QA अधिकारी",
    icon: "✅", department: "qa",
    contextFocus: ["qa", "pipeline", "intelligence"],
    focusAreas: ["QA sprint", "Pipeline verification", "Testing queues", "Pass/fail scoring"],
  },
};

export const DEPARTMENT_NAMES: Record<DepartmentId, { name: string; nameNp: string }> = {
  intelligence: { name: "Intelligence",  nameNp: "नागरिक बुद्धिमत्ता" },
  content:      { name: "Content",       nameNp: "सामग्री"             },
  research:     { name: "Research",      nameNp: "स्रोत अनुसन्धान"     },
  product:      { name: "Product",       nameNp: "सार्वजनिक अनुभव"    },
  operations:   { name: "Operations",    nameNp: "संरचना सञ्चालन"      },
  growth:       { name: "Growth",        nameNp: "वृद्धि"               },
  finance:      { name: "Finance",       nameNp: "वित्त"                },
  strategy:     { name: "Strategy",      nameNp: "दीर्घकालीन रणनीति"   },
  bhakti:       { name: "Bhakti",        nameNp: "भक्ति चौतारी"        },
  qa:           { name: "QA",            nameNp: "QA र परीक्षण"        },
};

// ─── Work cycle prioritization order ──────────────────────────────────────────
// Defines the base priority order for the Founder Work Cycle.
// The engine reorders this based on CopilotContext urgency signals.

export const DEFAULT_WORK_ORDER: DepartmentId[] = [
  "operations",    // 1. Fix broken things first
  "qa",            // 2. Verify what was built
  "intelligence",  // 3. Keep pipeline moving
  "research",      // 4. Fill data gaps
  "content",       // 5. Turn intelligence into content
  "bhakti",        // 6. Spiritual world progress
  "growth",        // 7. Publish and amplify
  "finance",       // 8. Cost awareness
  "product",       // 9. Public experience polish
  "strategy",      // 10. Long-term alignment
];
