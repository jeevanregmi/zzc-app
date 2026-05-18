/**
 * Named Entity Registry — Financial Institutions, Products, Persons
 *
 * WHY ENTITIES MATTER FOR FINTECH INTELLIGENCE:
 *   Raw signals mention "NRB" or "सामाजिक सुरक्षा कोष" in free text.
 *   Without a canonical entity registry, every signal re-invents its own
 *   references. With entities:
 *   - A signal mentioning "EPF" links to Entity["epf"] → which links to its
 *     scheme profiles, relevant topics, and historical signals about it
 *   - You can query: "all signals about EPF in the last 30 days"
 *   - Entity pages become auto-generated from ingested signals
 *   - Contradiction detection: two signals about EPF contradict each other
 *
 * NEPAL-SPECIFIC CONTEXT:
 *   Nepal's financial landscape has a small, well-defined set of major
 *   institutions. Pre-seeding this registry gives the AI immediate grounding —
 *   it can identify "Rastriya Banijya Bank" and "RBB" as the same entity
 *   without learning from examples.
 *
 * FUTURE SCALING:
 *   Entity graph → relationship edges ("NRB regulates EPF") → knowledge graph
 *   → enables semantic search, contradiction detection, entity-aware RAG
 */

export type EntityType =
  | "institution"      // NRB, EPF, SSF, SEBON, IRD
  | "financial_product"// EPF Provident Fund, SSF Home Loan
  | "market_index"     // NEPSE, NEPSE 200
  | "regulation"       // Monetary Policy, Banking Act
  | "person"           // Governor of NRB, CEO of EPF
  | "market_event"     // IPO, dividend announcement, rate change
  | "economic_indicator"; // CPI, GDP, inflation rate

export type EntityStatus = "active" | "deprecated" | "merged";

// ── FinancialEntity — stored in Firestore "entities" ─────────────────────

export interface FinancialEntity {
  id:           string;         // slug: "nrb", "epf", "ssf", "nepse"
  type:         EntityType;
  status:       EntityStatus;

  // ── Names and aliases ─────────────────────────────────────────────────
  name:         string;         // canonical English name
  nameNe:       string;         // Nepali name
  abbreviation: string;         // "NRB", "EPF", "SSF"
  aliases:      string[];       // alternative spellings, transliterations

  // ── Description ───────────────────────────────────────────────────────
  description:  string;         // one-paragraph description
  descriptionNe:string;         // Nepali description

  // ── Relationships ─────────────────────────────────────────────────────
  regulatedBy?: string;         // FK → entities.id
  relatedEntityIds: string[];   // other entities this is commonly mentioned with
  schemeIds:    string[];        // FK → structuredSchemes.id

  // ── Taxonomy link ─────────────────────────────────────────────────────
  primarySectorId?:  string;    // FK → taxonomy sector
  primaryTopicId?:   string;    // FK → taxonomy topic

  // ── Contact / Source ──────────────────────────────────────────────────
  officialUrl?: string;
  dataFeedUrl?: string;         // if this entity has a machine-readable data endpoint

  // ── Signal intelligence ───────────────────────────────────────────────
  signalCount:       number;    // denormalized count of signals mentioning this entity
  lastSignalAt?:     string;    // most recent signal mentioning this entity
  watchlistCount:    number;    // how many admin watchlists include this entity

  // ── Metadata ──────────────────────────────────────────────────────────
  createdAt:    string;
  updatedAt:    string;
}

// ── Seed entities for Nepal financial system ──────────────────────────────
// These are pre-loaded on first deploy. Admin can extend but not remove.

export const SEED_ENTITIES: Omit<FinancialEntity,
  "id" | "signalCount" | "lastSignalAt" | "watchlistCount" | "createdAt" | "updatedAt"
>[] = [
  {
    type: "institution", status: "active",
    name: "Nepal Rastra Bank", nameNe: "नेपाल राष्ट्र बैंक",
    abbreviation: "NRB",
    aliases: ["central bank", "nrb", "rastriya bank", "national bank of nepal"],
    description: "Central bank of Nepal. Issues monetary policy, regulates banks, publishes interest rates and CPI.",
    descriptionNe: "नेपालको केन्द्रीय बैंक। मौद्रिक नीति जारी गर्छ, बैंकहरू नियमन गर्छ।",
    relatedEntityIds: ["epf", "ssf", "sebon", "ird"],
    schemeIds: [], primarySectorId: "government-finance", primaryTopicId: "nrb-policy",
    officialUrl: "https://nrb.org.np", dataFeedUrl: "https://nrb.org.np/statistics/",
  },
  {
    type: "institution", status: "active",
    name: "Employees Provident Fund", nameNe: "कर्मचारी सञ्चय कोष",
    abbreviation: "EPF",
    aliases: ["karmachari sanchaya kosh", "provident fund", "ksk", "epf nepal"],
    description: "Nepal's largest government-backed retirement savings fund. Manages contributions of formal sector employees.",
    descriptionNe: "नेपालको सबैभन्दा ठूलो सरकारी निवृत्तिभरण बचत कोष।",
    relatedEntityIds: ["ssf", "nrb", "cit"],
    schemeIds: ["epf-provident-fund"],
    primarySectorId: "nbfi", primaryTopicId: "epf",
    officialUrl: "https://epf.gov.np",
  },
  {
    type: "institution", status: "active",
    name: "Social Security Fund", nameNe: "सामाजिक सुरक्षा कोष",
    abbreviation: "SSF",
    aliases: ["ssk", "samajik suraksha kosh", "social security", "ssf nepal"],
    description: "Social security institution covering formal, informal, and foreign employment sectors.",
    descriptionNe: "औपचारिक, अनौपचारिक र वैदेशिक रोजगारी क्षेत्रलाई समेट्ने सामाजिक सुरक्षा संस्था।",
    relatedEntityIds: ["epf", "nrb"],
    schemeIds: [], primarySectorId: "nbfi", primaryTopicId: "ssf",
    officialUrl: "https://ssf.gov.np",
  },
  {
    type: "institution", status: "active",
    name: "Nepal Stock Exchange", nameNe: "नेपाल स्टक एक्सचेन्ज",
    abbreviation: "NEPSE",
    aliases: ["nepse", "stock market", "share market", "nepal stock exchange"],
    description: "Nepal's sole stock exchange. Hosts trading of equity, mutual funds, debentures.",
    descriptionNe: "नेपालको एक मात्र शेयर बजार।",
    relatedEntityIds: ["sebon"],
    schemeIds: [], primarySectorId: "capital-markets", primaryTopicId: "nepse",
    officialUrl: "https://nepalstock.com.np",
  },
  {
    type: "institution", status: "active",
    name: "Securities Board of Nepal", nameNe: "धितोपत्र बोर्ड",
    abbreviation: "SEBON",
    aliases: ["sebon", "securities board", "dhitopatra board"],
    description: "Capital market regulator. Oversees IPO/FPO approvals, mutual funds, and broker licenses.",
    descriptionNe: "पूँजी बजार नियामक। आईपीओ अनुमोदन, म्युचुअल फण्ड र दलाल इजाजत हेर्छ।",
    relatedEntityIds: ["nepse", "nrb"],
    schemeIds: [], primarySectorId: "capital-markets", primaryTopicId: "sebon",
    officialUrl: "https://sebon.gov.np",
  },
  {
    type: "institution", status: "active",
    name: "Citizen Investment Trust", nameNe: "नागरिक लगानी कोष",
    abbreviation: "CIT",
    aliases: ["cit", "nagarik lagani kosh", "citizen investment"],
    description: "Government mutual fund offering savings schemes and home loan products to citizens.",
    descriptionNe: "नागरिकलाई बचत योजना र घर ऋण उत्पादन प्रदान गर्ने सरकारी म्युचुअल फण्ड।",
    relatedEntityIds: ["epf", "nrb"],
    schemeIds: [], primarySectorId: "nbfi", primaryTopicId: "cit",
    officialUrl: "https://cit.gov.np",
  },
  {
    type: "market_index", status: "active",
    name: "NEPSE Index", nameNe: "नेप्से सूचकांक",
    abbreviation: "NEPSE",
    aliases: ["nepse index", "stock index", "share index", "nepse points"],
    description: "Primary benchmark index of Nepal Stock Exchange. Tracks all listed equities.",
    descriptionNe: "नेपाल स्टक एक्सचेन्जको प्राथमिक बेन्चमार्क सूचकांक।",
    relatedEntityIds: ["nepse", "sebon"],
    schemeIds: [], primarySectorId: "capital-markets", primaryTopicId: "nepse",
  },
  {
    type: "economic_indicator", status: "active",
    name: "Consumer Price Index", nameNe: "उपभोक्ता मूल्य सूचकांक",
    abbreviation: "CPI",
    aliases: ["cpi", "inflation rate", "mahanga", "mahangai", "मूल्यवृद्धि"],
    description: "NRB-published Consumer Price Index measuring headline inflation in Nepal.",
    descriptionNe: "नेपालमा समग्र मूल्यवृद्धि नाप्ने नेपाल राष्ट्र बैंकद्वारा प्रकाशित सूचकांक।",
    relatedEntityIds: ["nrb"],
    schemeIds: [], primarySectorId: "economic-intelligence", primaryTopicId: "inflation",
  },
];
