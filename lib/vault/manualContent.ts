// lib/vault/manualContent.ts
// Static content config for /vault/manual dynamic help center.
// Update this file when workflows, terms, or troubleshooting steps change.

// ── Workflow Map ─────────────────────────────────────────────────────────────

export interface WorkflowStep {
  step:        number;
  action:      string;   // what founder does
  founderSees: string;   // visible result
  backendDoes: string;   // system mechanism
  dataCreated: string;   // Firestore collection / field
  verifyAt:    string;   // where to confirm success
  nextAction:  string;   // next step
}

export interface WorkflowDef {
  id:              string;
  icon:            string;
  title:           string;
  purpose:         string;
  startPage:       string;
  startHref:       string;
  steps:           WorkflowStep[];
  collectionsUsed: string[];
  qualityGate:     string;
  publicOutput:    string;
  problems: { problem: string; fix: string; hint?: string }[];
}

export const WORKFLOWS: WorkflowDef[] = [
  {
    id:        "civic",
    icon:      "📋",
    title:     "Official PDF → Civic Knowledge Card",
    purpose:   "सरकारी document बाट civic intelligence atoms निकाल्ने र /janta public feed मा पठाउने।",
    startPage: "Documents",
    startHref: "/vault/documents",
    steps: [
      {
        step: 1,
        action:      "Documents मा PDF upload गर्नुहोस्",
        founderSees: "Document card — status: Ready",
        backendDoes: "PDF R2 cloud मा save हुन्छ, Firestore मा metadata record बन्छ",
        dataCreated: "vault_intelligence_docs (processingStatus: ready)",
        verifyAt:    "/vault/documents — document card देख्नुहोस्",
        nextAction:  "AI Analyze button थिच्नुहोस्",
      },
      {
        step: 2,
        action:      "AI Analyze button थिच्नुहोस्",
        founderSees: "Status: AI Analysis चल्दैछ → ai_ready (1-3 मिनेट)",
        backendDoes: "Gemini/Bedrock AI ले PDF पढेर summary, insights, nepaliExplainer बनाउँछ",
        dataCreated: "aiSummary, aiKeyInsights, nepaliExplainer fields update",
        verifyAt:    "/vault/documents — card मा summary देखिन्छ",
        nextAction:  "Admin Vault → Review गर्नुहोस्",
      },
      {
        step: 3,
        action:      "Admin Vault → AI Summary पढ्नुहोस् → Approve गर्नुहोस्",
        founderSees: "adminApprovalStatus: approved हुन्छ",
        backendDoes: "Document approved — deep extract enable हुन्छ",
        dataCreated: "adminApprovalStatus field: approved",
        verifyAt:    "/vault/admin?tab=documents — badge हेर्नुहोस्",
        nextAction:  "Extract Intelligence button थिच्नुहोस्",
      },
      {
        step: 4,
        action:      "Documents → Extract Intelligence button थिच्नुहोस्",
        founderSees: "intelCount बढ्दै जान्छ (2-5 मिनेट)",
        backendDoes: "Deep AI extract — structured facts, policy points, budgets निकाल्छ",
        dataCreated: "janta_intelligence records, janta_relationships edges",
        verifyAt:    "/vault/system → Pipeline health / intelCount",
        nextAction:  "Quality Gate check गर्नुहोस्",
      },
      {
        step: 5,
        action:      "Quality Gate → हेर्नुहोस्",
        founderSees: "Quality Score, evidence-backed vs weak records",
        backendDoes: "Evidence check — page reference, source URL verify गर्छ",
        dataCreated: "quality flags on janta_intelligence records",
        verifyAt:    "/vault/quality",
        nextAction:  "Knowledge Queue → Classification",
      },
      {
        step: 6,
        action:      "Knowledge Queue → Scan → Classification Approve गर्नुहोस्",
        founderSees: "Classification suggestion cards — Civic/Economy/Promise routing",
        backendDoes: "Rule-based classifier routes atoms to correct public feed",
        dataCreated: "classification_suggestions records",
        verifyAt:    "/vault/knowledge",
        nextAction:  "/janta public feed मा stories देखिन्छन्",
      },
    ],
    collectionsUsed: ["vault_intelligence_docs", "janta_intelligence", "janta_relationships", "classification_suggestions"],
    qualityGate:  "adminApprovalStatus === approved + quality score check",
    publicOutput: "janta_intelligence (publishToJanta: true) → /janta public feed",
    problems: [
      { problem: "AI Analyze stuck / error", fix: "/vault/system → AI Provider status check गर्नुहोस्", hint: "API credits सकिएको हुन सक्छ" },
      { problem: "intelCount = 0 after extract", fix: "adminApprovalStatus approved छ? /vault/admin मा check गर्नुहोस्" },
      { problem: "Document /janta मा देखिएन", fix: "publishToJanta: true set भएको छ? classification approve गर्नुहोस्" },
    ],
  },
  {
    id:        "economy",
    icon:      "📊",
    title:     "Budget / Policy → Economy Intelligence",
    purpose:   "बजेट, मौद्रिक नीति, आर्थिक सर्वेक्षण बाट structured economy atoms निकाल्ने।",
    startPage: "Economy (बजेट Chautari)",
    startHref: "/vault/economy",
    steps: [
      {
        step: 1,
        action:      "Documents upload (budget PDF, NRB circular, etc.)",
        founderSees: "Document in list",
        backendDoes: "Standard document upload flow (R2 + Firestore)",
        dataCreated: "vault_intelligence_docs",
        verifyAt:    "/vault/documents",
        nextAction:  "Economy Chautari मा जानुहोस्",
      },
      {
        step: 2,
        action:      "Economy Chautari → 💰 Economy Extract button",
        founderSees: "Modal: Fiscal Year + Document Type छान्नुहोस्",
        backendDoes: "Background job सुरु हुन्छ — PDF → AI → economy atoms",
        dataCreated: "economy_extraction_jobs (tracking), economy_atoms (result)",
        verifyAt:    "/vault/economy → job progress bar",
        nextAction:  "Job complete → atoms list हेर्नुहोस्",
      },
      {
        step: 3,
        action:      "Economy Chautari → ▼ N atoms हेर्नुहोस् button",
        founderSees: "Inline atom records — sector, amount, evidence",
        backendDoes: "economy_atoms collection read",
        dataCreated: "(read only)",
        verifyAt:    "/vault/economy → per-doc atom expand",
        nextAction:  "Quality review गर्नुहोस्",
      },
      {
        step: 4,
        action:      "Quality Gate → economy atoms review",
        founderSees: "Confidence score, source evidence",
        backendDoes: "Quality check",
        dataCreated: "quality flags",
        verifyAt:    "/vault/quality",
        nextAction:  "Public Ready approve गर्नुहोस् (later Economy Chautari)",
      },
    ],
    collectionsUsed: ["economy_atoms", "economy_extraction_jobs", "economy_extraction_logs"],
    qualityGate:  "publishedToPublic: false by default — founder must explicitly approve",
    publicOutput: "economy_atoms (publishedToPublic: true) → /economy public page (future)",
    problems: [
      { problem: "0 atoms after extract", fix: "Document downloadUrl छ? Re-extract गर्नुहोस्" },
      { problem: "Double extract", fix: "🔄 Re-extract button थिच्नुहोस् — cost warning आउँछ" },
      { problem: "Job stuck", fix: "/vault/system-cleanup → job status check, reset गर्नुहोस्" },
    ],
  },
  {
    id:        "classification",
    icon:      "🔀",
    title:     "Atom → Classification → Routing",
    purpose:   "Atoms को सही public feed मा route गर्ने — Civic, Economy, Promise, वा Bhakti।",
    startPage: "Knowledge Queue",
    startHref: "/vault/knowledge",
    steps: [
      {
        step: 1,
        action:      "Knowledge Queue → Scan button थिच्नुहोस्",
        founderSees: "Classification suggestion cards देखिन्छन्",
        backendDoes: "Rule-based classifier सबै unclassified atoms scan गर्छ",
        dataCreated: "classification_suggestions records",
        verifyAt:    "/vault/knowledge → suggestion count",
        nextAction:  "Suggestions review गर्नुहोस्",
      },
      {
        step: 2,
        action:      "Each suggestion: Approve / Edit / Reject / Defer",
        founderSees: "Suggestion status update हुन्छ",
        backendDoes: "Approved suggestions route atoms to destination collection",
        dataCreated: "classification_suggestions status update",
        verifyAt:    "/vault/knowledge → pending count घट्छ",
        nextAction:  "Routed atoms destination page मा check गर्नुहोस्",
      },
    ],
    collectionsUsed: ["classification_suggestions", "janta_intelligence", "economy_atoms", "promise_atoms"],
    qualityGate:  "Founder must approve each classification — AI never auto-routes",
    publicOutput: "Routes to: janta_intelligence / economy_atoms / promise_atoms based on type",
    problems: [
      { problem: "Suggestions missing", fix: "Scan button थिच्नुहोस् — atoms classify नभएका हुन सक्छन्" },
      { problem: "Wrong route suggested", fix: "Edit गरेर correct route छान्नुहोस् — then Approve" },
    ],
  },
  {
    id:        "constitution",
    icon:      "📜",
    title:     "Constitution Tree",
    purpose:   "नेपालको संविधान Layer 1 intelligence — static, extracted once, always public।",
    startPage: "Constitution",
    startHref: "/vault/constitution",
    steps: [
      {
        step: 1,
        action:      "Constitution Admin → Extract (only once, initial setup)",
        founderSees: "22 batch calls run → framework records created",
        backendDoes: "Constitution PDF → constitutional_framework (Layer 1 static)",
        dataCreated: "constitutional_framework records (per part/article)",
        verifyAt:    "/vault/constitution/health → Branch Health",
        nextAction:  "Branch Health check गर्नुहोस्",
      },
      {
        step: 2,
        action:      "Public users: /constitution → Article search",
        founderSees: "Constitution Tree with articles, meanings",
        backendDoes: "constitutional_framework read (public)",
        dataCreated: "(read only)",
        verifyAt:    "/constitution",
        nextAction:  "Branch Health decay देखे — janta_intelligence add गर्नुहोस्",
      },
    ],
    collectionsUsed: ["constitutional_framework"],
    qualityGate:  "One-time extraction — do NOT re-extract unless constitutional_framework is empty",
    publicOutput: "/constitution public page — always public",
    problems: [
      { problem: "partNumber = 0 on some records", fix: "/vault/constitution → Repair button थिच्नुहोस्" },
      { problem: "Branch Health all grey", fix: "janta_intelligence records add गर्नुहोस् — Layer 2 feeds Branch Health" },
    ],
  },
  {
    id:        "bhakti",
    icon:      "🛕",
    title:     "Temple → Bhakti Chautari (Phase 5)",
    purpose:   "Sacred texts बाट shloka atoms, character graph → Bhakti Chautari public platform।",
    startPage: "मन्दिर (Temple Vault)",
    startHref: "/vault/temple",
    steps: [
      {
        step: 1,
        action:      "Temple Vault → Sacred text upload",
        founderSees: "sacred_texts record created",
        backendDoes: "File stored, metadata in Firestore",
        dataCreated: "sacred_texts",
        verifyAt:    "/vault/temple",
        nextAction:  "Analyze → shloka atoms extract",
      },
      {
        step: 2,
        action:      "Analyze button → shloka extract",
        founderSees: "shloka_atoms created, suggestions appear",
        backendDoes: "AI ले shloka-level atoms निकाल्छ",
        dataCreated: "shloka_atoms, spiritual_suggestions",
        verifyAt:    "/vault/temple → suggestion queue",
        nextAction:  "Review suggestions → approve characters",
      },
      {
        step: 3,
        action:      "Approve character/relationship suggestions",
        founderSees: "spiritual_characters, spiritual_relationships created",
        backendDoes: "Character graph builds",
        dataCreated: "spiritual_characters, spiritual_relationships",
        verifyAt:    "/vault/temple → character graph",
        nextAction:  "Set visibility: review → published for Bhakti Chautari (Phase 5)",
      },
    ],
    collectionsUsed: ["sacred_texts", "shloka_atoms", "spiritual_suggestions", "spiritual_characters", "spiritual_relationships", "bhakti_atoms"],
    qualityGate:  "Founder controls visibility: private → review → published. Nothing auto-publishes.",
    publicOutput: "bhakti_atoms (isPublic: true) → /bhakti public platform (Phase 5+)",
    problems: [
      { problem: "Bhakti Chautari not live yet", fix: "Phase 5 feature — temple intelligence collection is building now" },
    ],
  },
  {
    id:        "sources",
    icon:      "📡",
    title:     "Source Monitoring",
    purpose:   "Government websites/RSS monitor गर्ने — नयाँ documents automatically detect गर्ने।",
    startPage: "Source Radar",
    startHref: "/vault/sources",
    steps: [
      {
        step: 1,
        action:      "Source Radar → Add source (URL/RSS)",
        founderSees: "monitored_sources record created",
        backendDoes: "Source registered for periodic checking",
        dataCreated: "monitored_sources",
        verifyAt:    "/vault/sources → source list",
        nextAction:  "Check Now button वा scheduled check पर्खनुहोस्",
      },
      {
        step: 2,
        action:      "Check Now button वा scheduled check (auto)",
        founderSees: "source_updates list — नयाँ documents detected",
        backendDoes: "URL/RSS fetch → new doc links found → founder alert",
        dataCreated: "source_updates records",
        verifyAt:    "/vault/sources → updates list",
        nextAction:  "Upload interesting docs मा जानुहोस्",
      },
      {
        step: 3,
        action:      "Interesting source update → Upload गर्नुहोस्",
        founderSees: "Document in /vault/documents",
        backendDoes: "Standard upload flow starts",
        dataCreated: "vault_intelligence_docs",
        verifyAt:    "/vault/documents",
        nextAction:  "Civic pipeline start गर्नुहोस् (Workflow A)",
      },
    ],
    collectionsUsed: ["monitored_sources", "source_updates"],
    qualityGate:  "Founder review required before uploading detected documents",
    publicOutput: "Feeds into standard Civic pipeline → eventually /janta",
    problems: [
      { problem: "Check Now fails", fix: "Source URL valid छ? CORS issue हुन सक्छ — /vault/system check" },
      { problem: "No new updates", fix: "Source site update भएको छैन — normal हो" },
    ],
  },
];

// ── Data Flow Nodes ──────────────────────────────────────────────────────────

export interface DataFlowNode {
  id:          string;
  label:       string;
  sub:         string;
  description: string;
  href?:       string;
  collection?: string;
  isPublic?:   boolean;
  requiresApproval?: boolean;
}

export const DATA_FLOW_NODES: DataFlowNode[] = [
  {
    id:          "source",
    label:       "PDF / URL",
    sub:         "Raw material",
    description: "Government website, budget PDF, NRB circular, constitution — यही ZZC को raw input हो। R2 cloud मा store हुन्छ।",
    href:        "/vault/documents",
    collection:  "R2 + vault_intelligence_docs",
  },
  {
    id:          "ai-analyze",
    label:       "AI Analyze",
    sub:         "Machine reading",
    description: "Gemini/Bedrock AI ले document पढ्छ र summary, key insights, Nepali explainer बनाउँछ। Founder ले approve नगरेसम्म कुनै public output हुँदैन।",
    href:        "/vault/documents",
    requiresApproval: true,
  },
  {
    id:          "intel-extract",
    label:       "Intelligence Extract",
    sub:         "Deep structured facts",
    description: "Approved document बाट structured policy records, budget lines, promises निकाल्छ। janta_intelligence collection मा जान्छ।",
    href:        "/vault/documents",
    collection:  "janta_intelligence + janta_relationships",
    requiresApproval: true,
  },
  {
    id:          "atoms",
    label:       "Atoms",
    sub:         "Atomic / Economy / Shloka",
    description: "Intelligence को सबभन्दा granular form। एउटा fact, एउटा budget line, एउटा shloka — एउटा atom। एउटा atom अनेक public pages मा जान सक्छ।",
    href:        "/vault/economy",
    collection:  "economy_atoms / janta_intelligence / shloka_atoms",
  },
  {
    id:          "quality",
    label:       "Quality Gate",
    sub:         "Evidence check",
    description: "प्रत्येक record मा source page, quote, URL छ? Evidence-backed records मात्र Level 3+ पाउँछन्। Weak records private रहन्छन्।",
    href:        "/vault/quality",
    requiresApproval: true,
  },
  {
    id:          "classification",
    label:       "Classification Queue",
    sub:         "Smart routing",
    description: "Rule-based classifier ले suggest गर्छ: यो atom Civic हो, Economy हो, Promise हो? Founder approve गर्छ — AI auto-route गर्दैन।",
    href:        "/vault/knowledge",
    collection:  "classification_suggestions",
    requiresApproval: true,
  },
  {
    id:          "approval",
    label:       "Founder Approval",
    sub:         "Human gate",
    description: "ZZC को सबभन्दा महत्वपूर्ण gate। AI सँधैं suggest गर्छ, तपाईं सँधैं decide गर्नुहुन्छ। कुनै public output बिना approval हुँदैन।",
    requiresApproval: true,
  },
  {
    id:          "public",
    label:       "Public Chautari",
    sub:         "Nepal को लागि",
    description: "Approved, source-backed intelligence जनतालाई देखाउने ठाउँ। /janta, /economy, /constitution, /bhakti — all consume approved atoms।",
    href:        "/janta",
    isPublic:    true,
  },
];

// ── System Dictionary ────────────────────────────────────────────────────────

export interface DictTerm {
  term:             string;
  meaning:          string;
  whenToUse:        string;
  whereSeen:        string;
  commonConfusion?: string;
  businessAnalogy?: string;
}

export const DICTIONARY: DictTerm[] = [
  {
    term:             "AI Analyze",
    meaning:          "AI (Gemini/Bedrock) ले document पढेर summary र key points निकाल्छ।",
    whenToUse:        "Document upload गरेपछि — AI Summary पाउन।",
    whereSeen:        "/vault/documents — document card मा button",
    commonConfusion:  "यो deep extraction होइन — quick reading मात्र। Intelligence Extract अलग step हो।",
    businessAnalogy:  "Raw material को initial quality scan जस्तै।",
  },
  {
    term:             "Intelligence Extract",
    meaning:          "Approved document बाट structured civic intelligence records निकाल्छ। Deep, detailed, searchable।",
    whenToUse:        "adminApprovalStatus === approved भएपछि मात्र।",
    whereSeen:        "/vault/documents — Extract Intelligence button",
    commonConfusion:  "AI Analyze भन्दा अलग — यो approved docs मा मात्र चल्छ र janta_intelligence मा data जान्छ।",
    businessAnalogy:  "Factory मा raw material process गरेर finished goods बनाउने।",
  },
  {
    term:             "Atomic Extract",
    meaning:          "Intelligence records लाई paragraph-level atomic units मा तोड्छ। सबभन्दा granular intelligence।",
    whenToUse:        "Foundation/National tier documents को लागि — budget set गर्नुहोस्।",
    whereSeen:        "/vault/documents — Atomic Queue section",
    commonConfusion:  "Economy Extract अलग हो — Atomic Extract civic intelligence को लागि हो।",
    businessAnalogy:  "Finished goods लाई individual units मा pack गर्ने।",
  },
  {
    term:             "Economy Extract",
    meaning:          "Budget/Policy PDF बाट specific economic facts — amounts, percentages, sector allocations — निकाल्छ।",
    whenToUse:        "Budget speech, NRB monetary policy, economic survey documents को लागि।",
    whereSeen:        "/vault/economy — 💰 Economy Extract button",
    commonConfusion:  "Intelligence Extract भन्दा अलग — Economy Extract को output economy_atoms मा जान्छ।",
    businessAnalogy:  "Financial audit extract जस्तै — numbers र evidence मात्र।",
  },
  {
    term:             "Quality Gate",
    meaning:          "Records मा source evidence छ कि छैन check गर्ने mechanism। Evidence बिना records public हुँदैनन्।",
    whenToUse:        "Intelligence/atomic extract गरेपछि — records review गर्न।",
    whereSeen:        "/vault/quality",
    commonConfusion:  "यो block गर्ने होइन — weak records private रहन्छन्, strong records public जान्छन्।",
    businessAnalogy:  "Quality control department — खराब goods बाहिर जाँदैनन्।",
  },
  {
    term:             "Knowledge Queue",
    meaning:          "Atoms को routing queue — कुन atom कुन public feed मा जाने decide गर्ने ठाउँ।",
    whenToUse:        "Intelligence extract गरेपछि — atoms classify र route गर्न।",
    whereSeen:        "/vault/knowledge",
    commonConfusion:  "यो automatic होइन — Scan → Approve steps founder ले गर्नुपर्छ।",
    businessAnalogy:  "Warehouse बाट सही showroom मा goods पठाउने distribution center।",
  },
  {
    term:             "Atom",
    meaning:          "Intelligence को सबभन्दा सानो unit। एउटा fact, एउटा amount, एउटा promise — एउटा atom।",
    whenToUse:        "Extract गरेपछि — atoms browse गर्न, classify गर्न, approve गर्न।",
    whereSeen:        "/vault/economy, /vault/knowledge, /vault/quality",
    commonConfusion:  "Atom = single extractable claim। एउटा document बाट धेरै atoms आउन सक्छन्।",
    businessAnalogy:  "एउटा document = factory। Atoms = त्यो factory ले बनाएका individual products।",
  },
  {
    term:             "UKO (Universal Knowledge Object)",
    meaning:          "ZZC को सबै knowledge types को common structure — civic, economy, bhakti सबैलाई एउटै format।",
    whenToUse:        "Architecture planning मा — new collection नबनाई existing adapter use गर्न।",
    whereSeen:        "/vault/atoms — Civic Atoms OS",
    commonConfusion:  "UKO = concept/standard। Collection = implementation। Different things।",
    businessAnalogy:  "एउटै standard shipping container — different products, same box size।",
  },
  {
    term:             "Source Evidence",
    meaning:          "Claim को proof — कुन document, कुन page, कुन quote बाट यो information आयो।",
    whenToUse:        "Every public record मा हुनु पर्छ — Level 3+ quality को requirement।",
    whereSeen:        "/vault/quality, atom expand views",
    commonConfusion:  "AI summary ≠ source evidence। Original document + page number = evidence।",
    businessAnalogy:  "Invoice + receipt — claim prove गर्ने कागज।",
  },
  {
    term:             "Public Ready",
    meaning:          "Record public pages मा देखाउन तयार भएको state। Founder ले explicitly set गर्नुपर्छ।",
    whenToUse:        "Quality check गरेपछि — public approve गर्न।",
    whereSeen:        "/vault/quality, /vault/economy → atom status badges",
    commonConfusion:  "publishToJanta true गर्दैमा immediately public हुँदैन — proper classification पनि चाहिन्छ।",
  },
  {
    term:             "Human Verified",
    meaning:          "Founder ले manually check गरेको + approved गरेको record। सबभन्दा trustworthy level।",
    whenToUse:        "Sensitive/accountability claims को लागि — promises, legal articles, amounts।",
    whereSeen:        "Quality Gate badges, admin approval flow",
    commonConfusion:  "AI processed ≠ Human Verified। Human gate छुट्टै step हो।",
    businessAnalogy:  "Senior manager को final stamp।",
  },
  {
    term:             "Classification",
    meaning:          "Atom लाई category assign गर्ने — कुन public feed मा जान्छ decide गर्ने।",
    whenToUse:        "Knowledge Queue → Scan गरेपछि suggestions review गर्न।",
    whereSeen:        "/vault/knowledge",
    commonConfusion:  "AI suggests, founder decides। Auto-classification छैन।",
  },
  {
    term:             "Fiscal Year",
    meaning:          "Nepal को आर्थिक वर्ष — Nepali calendar अनुसार (e.g. 2081/82)।",
    whenToUse:        "Economy Extract modal मा — budget कुन वर्षको हो specify गर्न।",
    whereSeen:        "/vault/economy → extraction modal",
    commonConfusion:  "Nepali Year (BS 2081) र Fiscal Year (2081/82) अलग — दुवै enter गर्नुहोस्।",
  },
  {
    term:             "Page Evidence",
    meaning:          "Document को कुन page नम्बर मा यो information छ — source traceability।",
    whenToUse:        "Atom details मा check गर्न — source verify गर्न।",
    whereSeen:        "/vault/economy → atom expand, /vault/quality",
    commonConfusion:  "AI ले extract गर्दा page number पनि save गर्छ — यो automatically आउँछ।",
  },
  {
    term:             "govFolder",
    meaning:          "Document को government category — Ministry of Finance, NRB, MoE, etc।",
    whenToUse:        "Upload गर्दा set गर्नुहोस् — library view organizing को लागि।",
    whereSeen:        "/vault/documents → Upload modal, Document Library view",
    commonConfusion:  "govFolder = organizing label मात्र। Intelligence routing को लागि classification अलग छ।",
  },
];

// ── Troubleshooting ──────────────────────────────────────────────────────────

export interface TroubleshootItem {
  problem:  string;
  cause:    string;
  fix:      string;
  goTo?:    string;
  goHref?:  string;
  severity: "critical" | "warning" | "info";
}

export const TROUBLESHOOTING: TroubleshootItem[] = [
  {
    problem:  "AI Analyze बटन थिचेपछि error आयो",
    cause:    "AI API credits सकिएको, provider down, वा document corrupt",
    fix:      "System Status → AI Provider check गर्नुहोस्। processingStatus: ai_paused भए document safe छ।",
    goTo:     "System Status",
    goHref:   "/vault/system",
    severity: "critical",
  },
  {
    problem:  "Intelligence Extract पछि intelCount = 0",
    cause:    "adminApprovalStatus approved छैन, वा document downloadUrl छैन",
    fix:      "Admin Vault मा document approved छ confirm गर्नुहोस्। R2 URL valid छ?",
    goTo:     "Admin Vault",
    goHref:   "/vault/admin?tab=documents",
    severity: "critical",
  },
  {
    problem:  "Economy Extract job stuck / loading मात्र देखिन्छ",
    cause:    "Background worker timeout, वा job record inconsistent state",
    fix:      "Data Cleanup मा जानुहोस् — stuck job reset गर्नुहोस्। Document safe छ।",
    goTo:     "Data Cleanup",
    goHref:   "/vault/system-cleanup",
    severity: "warning",
  },
  {
    problem:  "/janta page मा document stories देखिएनन्",
    cause:    "publishToJanta false, वा classification pending",
    fix:      "Knowledge Queue → Scan → Classify → Approve। publishToJanta flag check गर्नुहोस्।",
    goTo:     "Knowledge Queue",
    goHref:   "/vault/knowledge",
    severity: "warning",
  },
  {
    problem:  "Branch Health सबै grey / empty",
    cause:    "janta_intelligence records नभएको, वा constitutional_framework empty",
    fix:      "Constitution Admin → Extract (once). Layer 2 intel records थप्नुहोस्।",
    goTo:     "Constitution Admin",
    goHref:   "/vault/constitution",
    severity: "warning",
  },
  {
    problem:  "Document Library मा govFolder देखिएन",
    cause:    "Upload गर्दा govFolder set गरिएन",
    fix:      "Document card edit गर्नुहोस् — govFolder add गर्नुहोस्।",
    goTo:     "Documents",
    goHref:   "/vault/documents",
    severity: "info",
  },
  {
    problem:  "Classification Queue empty (Scan पछि पनि)",
    cause:    "सबै atoms already classified, वा atoms नै नभएको",
    fix:      "intelligence extract गर्नुहोस् पहिले। Atoms भए Scan again गर्नुहोस्।",
    goTo:     "Knowledge Queue",
    goHref:   "/vault/knowledge",
    severity: "info",
  },
  {
    problem:  "Economy atoms 0 — document list मा देखिँदैन",
    cause:    "Document economy_atoms मा linked छैन, वा extract कहिल्यै गरिएन",
    fix:      "Economy Chautari → 💰 Economy Extract button थिच्नुहोस्।",
    goTo:     "Economy Chautari",
    goHref:   "/vault/economy",
    severity: "info",
  },
  {
    problem:  "Page completely blank / 404",
    cause:    "Auth session expire, वा deployment issue",
    fix:      "Page reload गर्नुहोस्। Auth problem भए logout → login। GitHub Actions deploy status check गर्नुहोस्।",
    severity: "critical",
  },
  {
    problem:  "Quality Score सबै 0 / weak",
    cause:    "Intelligence extract गरेको records मा page evidence छैन",
    fix:      "Source document मा page numbers स्पष्ट छन्? Re-extract गर्नुहोस् better PDF सँग।",
    goTo:     "Quality Gate",
    goHref:   "/vault/quality",
    severity: "warning",
  },
];

// ── Testing SOP ──────────────────────────────────────────────────────────────

export interface TestStage {
  stage:    number;
  title:    string;
  where:    string;
  href:     string;
  checks:   string[];
  ifFails:  string;
}

export const TESTING_STAGES: TestStage[] = [
  {
    stage: 0,
    title: "System Health Check",
    where: "System Status",
    href:  "/vault/system",
    checks: [
      "Firebase Auth: Signed in ✓",
      "R2 Storage: Configured ✓",
      "AI Provider: कम्तिमा एउटा active ✓",
      "Pipeline: Zero stuck docs ✓",
    ],
    ifFails: "Infrastructure fix गर्नुहोस् — test सुरु नगर्नुहोस्",
  },
  {
    stage: 1,
    title: "Document Upload",
    where: "Documents",
    href:  "/vault/documents",
    checks: [
      "Document list मा देखियो ✓",
      "processingStatus: ready ✓",
      "downloadUrl present ✓",
      "govFolder set ✓",
      "System → Pipeline: Action चाहिन्छ ✓",
    ],
    ifFails: "R2 bucket connection check गर्नुहोस्",
  },
  {
    stage: 2,
    title: "AI Analysis",
    where: "Documents → AI Analyze",
    href:  "/vault/documents",
    checks: [
      "Status: ai_ready ✓ (error छैन)",
      "aiSummary populated ✓",
      "aiKeyInsights meaningful ✓",
      "nepaliExplainer readable ✓",
      "System → Review बाँकी ✓",
    ],
    ifFails: "API credits check गर्नुहोस् — ai_paused status भए document safe छ",
  },
  {
    stage: 3,
    title: "Admin Review & Approve",
    where: "Admin Vault",
    href:  "/vault/admin?tab=documents",
    checks: [
      "AI summary correct छ ✓",
      "nepaliExplainer accurate ✓",
      "Approve button थिचियो ✓",
      "adminApprovalStatus: approved ✓",
      "System → Extract बाँकी ✓",
    ],
    ifFails: "Needs Revision mark गर्नुहोस् — कारण note गर्नुहोस्",
  },
  {
    stage: 4,
    title: "Intelligence Extract",
    where: "Documents → Extract Intelligence",
    href:  "/vault/documents",
    checks: [
      "intelCount > 0 ✓",
      "System-cleanup → Intel NN ✓",
      "Quality tab मा records ✓",
      "System → Pipeline पूरा ✓",
    ],
    ifFails: "adminApprovalStatus approved confirm गर्नुहोस्",
  },
  {
    stage: 5,
    title: "Atomic Extract (Optional)",
    where: "Documents → Atomic Queue",
    href:  "/vault/documents",
    checks: [
      "Only foundation/national tier docs ✓",
      "Budget set गरिएको ✓",
      "atomicCount > 0 ✓",
      "Atomic History shows run ✓",
    ],
    ifFails: "Budget exceeded? knowledgeTier check गर्नुहोस्",
  },
  {
    stage: 6,
    title: "Public Ready Check",
    where: "Janta Feed",
    href:  "/janta",
    checks: [
      "Stories देखियो ✓",
      "Title, sector, summary correct ✓",
      "TTS कम्तिमा एउटा card मा works ✓",
      "Test data public feed मा छैन ✓",
    ],
    ifFails: "publishToJanta + classification check गर्नुहोस्",
  },
];

// ── Future Consolidation Rules ───────────────────────────────────────────────

export const TRUTH_LEVELS = [
  { level: 0, label: "Raw Upload",          desc: "Document मात्र — कुनै analysis छैन।",                          color: "text-zinc-500", bar: "bg-zinc-700" },
  { level: 1, label: "AI Summary",          desc: "AI summary छ — useful तर public-trustworthy होइन।",            color: "text-blue-400", bar: "bg-blue-800" },
  { level: 2, label: "Intelligence Extract", desc: "Structured records — page evidence कम हुन सक्छ।",             color: "text-cyan-400", bar: "bg-cyan-800" },
  { level: 3, label: "Atomic Source-Backed", desc: "Evidence + page + source — public-worthy।",                   color: "text-yellow-400", bar: "bg-yellow-700" },
  { level: 4, label: "Founder Reviewed",    desc: "Founder ले manually checked + approved।",                      color: "text-orange-400", bar: "bg-orange-700" },
  { level: 5, label: "Human Verified",      desc: "Public-grade civic trust। Accountability pages को लागि।",      color: "text-green-400", bar: "bg-green-700" },
];

export const CONSOLIDATION_RULES = [
  { no: 1,  rule: "Source बिना public feature नबनाउनुहोस्",     detail: "Claim trace back गर्न नसकिए — draft/private राख्नुहोस्।" },
  { no: 2,  rule: "नयाँ brain collection नबनाउनुहोस्",           detail: "Existing atom pool, UKO adapters, classifier, router use गर्नुहोस्।" },
  { no: 3,  rule: "Duplicate intelligence नबनाउनुहोस्",          detail: "One atom, many routes। Same fact 5 collections मा हुनु हुँदैन।" },
  { no: 4,  rule: "Evidence बिना public claim नबनाउनुहोस्",      detail: "Source + page + quote — सबै public records मा चाहिन्छ।" },
  { no: 5,  rule: "AI recommends, founder approves",             detail: "AI ले silently publish गर्दैन — human gate सँधैं छ।" },
  { no: 6,  rule: "Long-running jobs को progress देखाउनुहोस्",   detail: "Blind extract/load acceptable छैन।" },
  { no: 7,  rule: "Closed-loop workflows मात्र",                 detail: "Start → progress → result → next action — every workflow।" },
  { no: 8,  rule: "हर page ले 4 questions answer गर्नुपर्छ",    detail: "के हो? के गर्ने? Success कस्तो? Problem आए?" },
  { no: 9,  rule: "Manual evolve with system",                   detail: "New workflow थपे — /vault/manual update गर्नुहोस्।" },
  { no: 10, rule: "Stabilization before expansion",              detail: "Data messy छ भने — pipeline fix गर्नुहोस् पहिले।" },
];

export const CONSOLIDATION_PHASES = [
  {
    phase: "A",
    label: "Stabilize",
    color: "border-red-700 bg-red-950/20",
    items: ["Data cleanup — test/demo files delete", "Golden dataset — 10 real docs through pipeline", "Reliable jobs — no stuck/orphaned jobs", "Quality gate functional"],
  },
  {
    phase: "B",
    label: "Unify",
    color: "border-amber-700 bg-amber-950/20",
    items: ["All source records adapt to UKO", "Public pages consume UKO only", "Classification queue routes all atoms", "No raw collection rendering publicly"],
  },
  {
    phase: "C",
    label: "Integrate",
    color: "border-yellow-700 bg-yellow-950/20",
    items: ["Civic + Economy + Promise + Bhakti share source evidence", "Shared quality score + founder approval", "Public routing unified", "Discussion layer attached to atoms"],
  },
  {
    phase: "D",
    label: "Deepen",
    color: "border-cyan-700 bg-cyan-950/20",
    items: ["Paragraph-level atoms", "Shloka-level atoms", "Relationship graph visual", "Timeline/trend analysis", "Semantic search"],
  },
  {
    phase: "E",
    label: "Public Civilization",
    color: "border-green-700 bg-green-950/20",
    items: ["Source-backed public explainers", "Promise accountability live", "Civic education layer", "Bhakti learning platform", "Discussion insights", "Media outputs"],
  },
];
