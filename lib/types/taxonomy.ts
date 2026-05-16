/**
 * Nepal Financial Intelligence Taxonomy — Type Definitions
 *
 * The taxonomy is a static, code-versioned registry — NOT stored in Firestore.
 * It is the canonical source of truth that all ZZC subsystems reference:
 *   - Signal ingestion (ingest-url worker) — for topic detection and sector routing
 *   - Content pipeline — for automatic categorisation of queue items
 *   - Recommendation engine — for routing users to relevant schemes
 *   - Future: semantic retrieval, knowledge graph, multilingual search
 *
 * Design principles:
 *   - Additive only: never remove a sector or topic ID once published (routes and
 *     stored signals reference them by ID)
 *   - IDs are kebab-case slugs, stable across renames
 *   - Keywords are lowercase and include both English and key Nepali transliterations
 *   - schemeIds reference SCHEMES array ids in lib/schemes-data.ts (read-only link)
 *   - calculatorTab references the CalculatorClient tab id
 */

export type SectorId =
  | "banking"
  | "microfinance"
  | "nbfi"
  | "cooperatives"
  | "capital-markets"
  | "economic-intelligence"
  | "government-finance"   // Government-owned banks + public finance + national savings
  | "insurance";           // Non-life, general, and specialised insurance

export interface FinancialSector {
  id:          SectorId;
  name:        string;
  nameNe:      string;
  description: string;
  topicIds:    TopicId[];
  icon:        string;
  priority:    1 | 2 | 3;
}

export type TopicId =
  | "commercial-banks"
  | "development-banks"
  | "finance-companies"
  | "bank-interest-rates"
  | "bank-home-loans"
  | "digital-banking"
  | "microfinance-institutions"
  | "rural-finance"
  | "financial-inclusion"
  | "epf"
  | "ssf"
  | "cit"
  | "life-insurance"
  | "health-insurance"
  | "merchant-banking"
  | "pension-systems"
  | "savings-cooperatives"
  | "credit-cooperatives"
  | "cooperative-governance"
  | "nepse"
  | "ipo-fpo"
  | "mutual-funds"
  | "stock-brokers"
  | "debentures-bonds"
  | "sebon"
  | "nrb-policy"
  | "inflation"
  | "remittance"
  | "government-budget"
  | "interest-rates"
  | "foreign-exchange"
  // Government Finance sector topics
  | "government-owned-banks"    // ADBL, RBB, NBL — state-owned banking institutions
  | "national-savings"          // NSB, government savings certificates, post-office savings
  | "public-debt"               // T-bills, development bonds, government borrowing
  // Insurance sector topics
  | "non-life-insurance"        // Motor, property, travel, cargo, fire insurance
  | "reinsurance"               // Nepal Reinsurance Company (NepRe)
  | "insurance-regulation";     // Beema Pradhikaran — Insurance Authority of Nepal

export type CalculatorTab = "sip" | "retirement" | "loan" | "risk" | "health" | "portfolio";

export interface FinancialTopic {
  id:              TopicId;
  sectorId:        SectorId;
  name:            string;
  nameNe:          string;
  description:     string;
  keywords:        string[];
  aliases:         string[];
  relatedTopicIds: TopicId[];
  schemeIds:       string[];
  calculatorTab?:  CalculatorTab;
  priority:        "high" | "medium" | "low";
}

export interface TopicMatch {
  topic:        FinancialTopic;
  score:        number;
  matchedTerms: string[];
}

export interface SectorRouting {
  sector: FinancialSector;
  topics: FinancialTopic[];
  score:  number;
}

export interface TaxonomyTag {
  topicId:  TopicId;
  sectorId: SectorId;
  score:    number;
}
