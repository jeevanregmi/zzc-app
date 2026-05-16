/**
 * Nepal Financial Intelligence Taxonomy — Registry + Utilities
 *
 * The authoritative source of truth for all ZZC financial intelligence
 * classification. Referenced by: ingest worker, content pipeline, recommendation
 * engine, AI prompts, and future semantic/vector retrieval systems.
 *
 * Stability contract: sector and topic IDs are permanent slugs.
 * Rename display names freely; never reuse or delete an ID.
 */

import type {
  FinancialSector, FinancialTopic, TopicMatch, SectorRouting, TaxonomyTag,
  SectorId, TopicId,
} from "../types/taxonomy";

// =========================================================================
// TOPICS REGISTRY
// =========================================================================

export const TOPICS: FinancialTopic[] = [

  // --- Banking Sector ------------------------------------------------------

  {
    id:          "commercial-banks",
    sectorId:    "banking",
    name:        "Commercial Banks",
    nameNe:      "वाणिज्य बैंक",
    description: "Nepal's 20 A-class commercial banks regulated by NRB, covering deposit products, lending, trade finance, and retail banking services.",
    keywords:    [
      "commercial bank", "vanijya bank", "a-class bank", "nrb", "deposit",
      "savings account", "fixed deposit", "fd", "nic asia", "nabil", "global ime",
      "everest bank", "siddhartha bank", "machhapuchchhre bank", "laxmi sunrise bank",
      "kumari bank", "citizens bank", "sanima bank", "prime bank", "himalayan bank",
      "agriculture development bank", "adbl", "rastriya banijya bank", "rbb",
      "nepal bank limited", "nbl", "prabhu bank", "mega bank", "civil bank",
      "base rate", "lending rate", "deposit rate", "bank balance", "current account",
    ],
    aliases:     ["A-class bank", "commercial banking", "vanijya bank"],
    relatedTopicIds: ["bank-interest-rates", "bank-home-loans", "digital-banking", "nrb-policy"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "development-banks",
    sectorId:    "banking",
    name:        "Development Banks",
    nameNe:      "विकास बैंक",
    description: "Nepal's B-class development banks serving regional lending, agriculture loans, and SME financing under NRB regulation.",
    keywords:    [
      "development bank", "bikas bank", "b-class bank", "regional bank", "sme loan",
      "small business loan", "agriculture loan", "muktinath", "jyoti bikas bank",
      "mahalaxmi bikas bank", "garima bikas bank", "kamana sewa bikas bank",
      "shangrila development bank",
    ],
    aliases:     ["B-class bank", "bikas bank"],
    relatedTopicIds: ["commercial-banks", "microfinance-institutions", "rural-finance"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "finance-companies",
    sectorId:    "banking",
    name:        "Finance Companies",
    nameNe:      "वित्त कम्पनी",
    description: "Nepal's C-class finance companies (NBFCs) providing consumer finance, hire-purchase, leasing, and personal credit.",
    keywords:    [
      "finance company", "nbfc", "c-class", "hire purchase", "leasing",
      "consumer finance", "personal loan", "progressive finance", "icfc finance",
      "rl finance", "pokhara finance",
    ],
    aliases:     ["C-class", "NBFC"],
    relatedTopicIds: ["commercial-banks", "bank-home-loans"],
    schemeIds:   [],
    priority:    "low",
  },

  {
    id:          "bank-interest-rates",
    sectorId:    "banking",
    name:        "Bank Interest Rates",
    nameNe:      "बैंक ब्याजदर",
    description: "Commercial bank deposit and lending rates in Nepal, including base rate, fixed deposit rates, savings account rates, and the NRB spread rate cap.",
    keywords:    [
      "interest rate", "byajdar", "byaj dar", "base rate", "fixed deposit rate", "fd rate",
      "savings rate", "lending rate", "spread rate", "deposit rate", "fd interest",
      "bank byaj", "bank rate", "saving account rate", "term deposit",
      "8%", "9%", "10%", "11%", "12%", "rate cut", "rate hike", "interest cut",
      "borrowing cost", "nrb rate", "repo rate", "reverse repo",
    ],
    aliases:     ["byajdar", "deposit rate", "lending rate"],
    relatedTopicIds: ["commercial-banks", "nrb-policy", "interest-rates", "epf"],
    schemeIds:   [],
    calculatorTab: "sip",
    priority:    "high",
  },

  {
    id:          "bank-home-loans",
    sectorId:    "banking",
    name:        "Home Loans from Banks",
    nameNe:      "बैंक घर ऋण",
    description: "Mortgage and home construction loans from commercial banks in Nepal, including interest rates, LTV ratios, EMI calculations, and eligibility.",
    keywords:    [
      "home loan", "ghar rin", "mortgage", "house loan", "housing loan",
      "property loan", "land loan", "construction loan", "real estate loan",
      "emi", "monthly instalment", "home purchase", "ghar kharid",
      "10%", "10.5%", "11%", "ltv", "loan to value", "bank rin",
    ],
    aliases:     ["mortgage", "housing loan", "ghar rin"],
    relatedTopicIds: ["bank-interest-rates", "epf", "nrb-policy"],
    schemeIds:   ["epf-house-loan", "epf-house-maintenance-loan", "epf-land-loan", "cit-unit-home-loan", "ssf-home-loan"],
    calculatorTab: "loan",
    priority:    "high",
  },

  {
    id:          "digital-banking",
    sectorId:    "banking",
    name:        "Digital Banking & Fintech",
    nameNe:      "डिजिटल बैंकिङ",
    description: "Mobile banking, internet banking, digital wallets, QR payments, and fintech innovation reshaping how young Nepalis manage money.",
    keywords:    [
      "mobile banking", "internet banking", "digital wallet", "esewa", "khalti",
      "fonepay", "connectips", "qr payment", "digital payment", "online banking",
      "imepay", "prabhu pay", "bank app", "fintech", "cashless", "e-wallet",
      "mobile payment", "online transfer", "neft", "rtgs",
    ],
    aliases:     ["mobile banking", "e-banking", "fintech"],
    relatedTopicIds: ["commercial-banks", "remittance"],
    schemeIds:   [],
    priority:    "medium",
  },

  // --- Microfinance Sector -------------------------------------------------

  {
    id:          "microfinance-institutions",
    sectorId:    "microfinance",
    name:        "Microfinance Institutions",
    nameNe:      "लघुवित्त संस्था",
    description: "Nepal's D-class MFIs providing small group-lending, micro-savings, and micro-insurance to low-income households and rural entrepreneurs.",
    keywords:    [
      "microfinance", "mfi", "laghu bitta", "laghubitta", "micro credit",
      "group loan", "nirdhan", "chhimek", "swabalamban", "deprosc microfinance",
      "d-class", "microloan", "micro savings", "rural credit", "village loan",
      "poverty alleviation", "entrepreneurship loan", "women empowerment loan",
    ],
    aliases:     ["laghubitta", "MFI", "D-class"],
    relatedTopicIds: ["rural-finance", "financial-inclusion", "savings-cooperatives"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "rural-finance",
    sectorId:    "microfinance",
    name:        "Rural & Agricultural Finance",
    nameNe:      "ग्रामीण तथा कृषि वित्त",
    description: "Agricultural loans, rural credit schemes, subsidised farming finance, and livestock/equipment financing for Nepal's farming communities.",
    keywords:    [
      "agriculture loan", "krishi rin", "farming loan", "rural loan", "agricultural credit",
      "subsidy loan", "agricultural development bank", "adbl", "rural finance",
      "livestock loan", "crop loan", "irrigation loan", "fertiliser loan",
      "kisan card", "agriculture subsidy", "concessional rate", "5% rate",
      "youth self-employment", "prime minister employment",
    ],
    aliases:     ["krishi rin", "agri loan", "farming credit"],
    relatedTopicIds: ["microfinance-institutions", "financial-inclusion", "government-budget"],
    schemeIds:   [],
    priority:    "low",
  },

  {
    id:          "financial-inclusion",
    sectorId:    "microfinance",
    name:        "Financial Inclusion",
    nameNe:      "वित्तीय समावेशिता",
    description: "NRB and government programs to bring unbanked Nepalis into the formal financial system, including branchless banking and agent banking.",
    keywords:    [
      "financial inclusion", "vittiya samaveshshita", "unbanked", "branchless banking",
      "agent banking", "bank access", "basic bank account", "zero balance account",
      "financial literacy", "vittiya saksharta", "underserved", "rural banking",
      "mobile money", "banking penetration",
    ],
    aliases:     ["financial literacy", "banking access"],
    relatedTopicIds: ["microfinance-institutions", "digital-banking", "rural-finance"],
    schemeIds:   [],
    priority:    "low",
  },

  // --- NBFI — Non-Banking Financial Institutions ---------------------------

  {
    id:          "epf",
    sectorId:    "nbfi",
    name:        "EPF — Employee Provident Fund",
    nameNe:      "कर्मचारी सञ्चय कोष",
    description: "Nepal's largest compulsory retirement savings institution for formal-sector employees. Employee and employer each contribute 10% of basic salary. Funds earn 8.5% annual interest. Members can take housing, education, and personal loans against their balance.",
    keywords:    [
      "epf", "employee provident fund", "karmachari sanchay kosh", "sanchay kosh",
      "provident fund", "8.5%", "8.5 percent", "retirement savings", "pf",
      "epf interest", "epf rate", "sanchay kosh byaj", "epf loan", "epf housing loan",
      "epf house loan", "epf education loan", "epf easy loan", "epf special loan",
      "epf land loan", "epf maintenance loan", "epf accident insurance", "epf pension",
      "epf withdrawal", "epf balance", "epf contribution", "employer contribution",
      "10% contribution", "basic salary contribution", "retirement fund",
      "epf member", "epf account", "epf online", "epf portal",
    ],
    aliases:     ["Sanchay Kosh", "Provident Fund", "PF"],
    relatedTopicIds: ["ssf", "cit", "pension-systems", "bank-home-loans", "bank-interest-rates"],
    schemeIds:   [
      "epf-provident-fund", "epf-house-loan", "epf-special-loan",
      "epf-education-loan", "epf-easy-loan", "epf-house-maintenance-loan",
      "epf-land-loan", "epf-accident-insurance", "epf-pension-gratuity",
    ],
    calculatorTab: "retirement",
    priority:    "high",
  },

  {
    id:          "ssf",
    sectorId:    "nbfi",
    name:        "SSF — Social Security Fund",
    nameNe:      "सामाजिक सुरक्षा कोष",
    description: "Nepal's comprehensive social security institution covering formal and informal workers. Provides old-age pension, healthcare, accident/disability, dependent family, housing loan, and education loan benefits.",
    keywords:    [
      "ssf", "social security fund", "samajik suraksha kosh", "suraksha kosh",
      "ssf pension", "old age pension", "ssf healthcare", "ssf home loan",
      "ssf education loan", "ssf accident", "ssf disability", "ssf dependent",
      "ssf special loan", "ssf contribution", "11%", "20%", "31%", "formal sector",
      "informal sector", "foreign employment ssf", "ssf retirement", "ssf benefit",
      "ssf member", "ssf portal",
    ],
    aliases:     ["Samajik Suraksha Kosh", "Social Security"],
    relatedTopicIds: ["epf", "cit", "pension-systems", "health-insurance", "bank-home-loans"],
    schemeIds:   [
      "ssf-home-loan", "ssf-education-loan", "ssf-special-loan",
      "ssf-dependent-family", "ssf-accident-disability", "ssf-healthcare", "ssf-old-age-pension",
    ],
    calculatorTab: "retirement",
    priority:    "high",
  },

  {
    id:          "cit",
    sectorId:    "nbfi",
    name:        "CIT — Citizens Investment Trust",
    nameNe:      "नागरिक लगानी कोष",
    description: "Nepal's government-owned investment fund offering unit schemes (Citizens Unit Scheme, ESGRS), life insurance, term deposits, and loans to unit-holders.",
    keywords:    [
      "cit", "citizens investment trust", "nagarik lagani kosh", "citizens unit scheme",
      "cit unit", "cit return", "cit interest", "cit byaj", "esgrs",
      "cit insurance", "term life insurance", "narc insurance", "cit loan",
      "cit home loan", "cit personal loan", "cit education loan", "kbbak",
      "citizens pension", "cit fund", "unit price", "cit nav",
      "citizens investment", "cit balance", "cit withdrawal", "cit dividend",
    ],
    aliases:     ["Citizens Investment", "Nagarik Lagani", "CIT Nepal"],
    relatedTopicIds: ["epf", "ssf", "mutual-funds", "life-insurance", "pension-systems"],
    schemeIds:   [
      "cit-citizens-unit-scheme", "cit-esgrs", "cit-term-life-insurance",
      "cit-narc-insurance", "cit-unit-home-loan", "cit-unit-personal-loan",
      "cit-unit-education-loan", "cit-kbbak", "cit-citizens-pension",
    ],
    calculatorTab: "sip",
    priority:    "high",
  },

  {
    id:          "life-insurance",
    sectorId:    "nbfi",
    name:        "Life Insurance",
    nameNe:      "जीवन बीमा",
    description: "Life insurance products in Nepal including term insurance, endowment plans, whole-life policies offered by Nepal Life, Asian Life, National Life, and other licensed insurers.",
    keywords:    [
      "life insurance", "jeevan bima", "jeevan beema", "term insurance",
      "endowment plan", "whole life", "insurance policy", "bima", "beema",
      "life cover", "death benefit", "premium", "insurance premium",
      "nepal life", "asian life", "national life", "metlife nepal",
      "rastriya beema sansthan", "beema samiti", "insurance board",
      "cit term life", "insurance maturity", "insurance claim", "sum assured",
    ],
    aliases:     ["jeevan beema", "bima", "term life"],
    relatedTopicIds: ["health-insurance", "ssf", "cit"],
    schemeIds:   ["beema-jeevan", "cit-term-life-insurance"],
    priority:    "high",
  },

  {
    id:          "health-insurance",
    sectorId:    "nbfi",
    name:        "Health Insurance",
    nameNe:      "स्वास्थ्य बीमा",
    description: "Medical and health insurance in Nepal covering hospitalisation, OPD, maternity, and accident costs, including government health insurance and SSF healthcare coverage.",
    keywords:    [
      "health insurance", "swasthya bima", "swasthya beema", "medical insurance",
      "hospitalisation", "ipd", "opd", "maternity cover", "accident cover",
      "government health insurance", "health insurance scheme", "sarkari bima",
      "ssf healthcare", "ssf medical", "health card", "insurance card",
      "non-life insurance", "nepal insurance", "shikhar insurance",
      "prudential insurance nepal", "prabhu insurance",
    ],
    aliases:     ["swasthya beema", "medical insurance", "non-life insurance"],
    relatedTopicIds: ["life-insurance", "ssf", "government-budget"],
    schemeIds:   ["beema-swasthya", "ssf-healthcare"],
    calculatorTab: "health",
    priority:    "high",
  },

  {
    id:          "merchant-banking",
    sectorId:    "nbfi",
    name:        "Merchant Banking & Portfolio Management",
    nameNe:      "मर्चेन्ट बैंकिङ",
    description: "SEBON-licensed merchant bankers providing issue management for IPOs/rights shares, portfolio management, and underwriting services.",
    keywords:    [
      "merchant bank", "merchant banking", "portfolio manager", "issue manager",
      "ipo manager", "rights share manager", "underwriter", "share registrar",
      "nibl ace capital", "siddhartha capital", "nmbcl", "sunrise capital",
      "sanima capital", "portfolio management",
    ],
    aliases:     ["merchant banker", "issue manager", "portfolio manager"],
    relatedTopicIds: ["ipo-fpo", "sebon", "nepse"],
    schemeIds:   [],
    priority:    "low",
  },

  {
    id:          "pension-systems",
    sectorId:    "nbfi",
    name:        "Pension & Retirement Systems",
    nameNe:      "निवृत्तिभरण तथा सेवानिवृत्ति",
    description: "All formal pension systems in Nepal: EPF pension, SSF old-age pension, CIT pension, civil service pension, and gratuity entitlements across public and private sectors.",
    keywords:    [
      "pension", "nivrittibharan", "retirement", "sewa nrivritti", "senivritti",
      "old age pension", "bridha bhatta", "gratuity", "upadan", "retirement fund",
      "retirement savings", "pension formula", "pension calculation",
      "civil service pension", "cgas", "sarkari pension", "army pension",
      "ssf pension", "epf pension gratuity", "citizens pension", "cit pension",
      "voluntary retirement", "early retirement", "pension age 60",
    ],
    aliases:     ["retirement fund", "gratuity", "pension"],
    relatedTopicIds: ["epf", "ssf", "cit", "government-budget"],
    schemeIds:   ["ssf-old-age-pension", "epf-pension-gratuity", "cit-citizens-pension"],
    calculatorTab: "retirement",
    priority:    "high",
  },

  // --- Cooperatives --------------------------------------------------------

  {
    id:          "savings-cooperatives",
    sectorId:    "cooperatives",
    name:        "Savings & Credit Cooperatives",
    nameNe:      "बचत तथा ऋण सहकारी",
    description: "Member-owned savings and credit cooperatives (SACCOs) offering higher-than-bank savings rates and accessible loans to members.",
    keywords:    [
      "cooperative", "sahakari", "savings cooperative", "saccos",
      "bacchat sahakari", "credit cooperative", "cooperative loan",
      "cooperative savings", "cooperative interest", "cooperative byaj",
      "department of cooperatives", "cooperative act", "cooperative dividend",
    ],
    aliases:     ["sahakari", "SACCOS"],
    relatedTopicIds: ["microfinance-institutions", "financial-inclusion", "credit-cooperatives"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "credit-cooperatives",
    sectorId:    "cooperatives",
    name:        "Credit Unions",
    nameNe:      "ऋण सहकारी",
    description: "Cooperative credit societies providing peer-lending, group credit, and small enterprise financing outside the formal banking system.",
    keywords:    [
      "credit cooperative", "credit union", "loan cooperative", "rin sahakari",
      "group credit", "cooperative lending", "peer lending", "cooperative fund",
    ],
    aliases:     ["rin sahakari", "loan cooperative"],
    relatedTopicIds: ["savings-cooperatives", "microfinance-institutions"],
    schemeIds:   [],
    priority:    "low",
  },

  {
    id:          "cooperative-governance",
    sectorId:    "cooperatives",
    name:        "Cooperative Governance & Regulation",
    nameNe:      "सहकारी शासन",
    description: "Policy, regulatory framework, and governance issues affecting Nepal's cooperative sector, including fraud, regulation reform, and the Cooperative Act.",
    keywords:    [
      "cooperative regulation", "cooperative act", "cooperative fraud", "sahakari thagi",
      "department of cooperatives", "cooperative board", "cooperative reform",
      "cooperative collapse", "cooperative scam", "cooperative mismanagement",
    ],
    aliases:     ["cooperative regulation"],
    relatedTopicIds: ["savings-cooperatives", "credit-cooperatives"],
    schemeIds:   [],
    priority:    "medium",
  },

  // --- Capital Markets -----------------------------------------------------

  {
    id:          "nepse",
    sectorId:    "capital-markets",
    name:        "NEPSE — Stock Exchange",
    nameNe:      "नेपाल स्टक एक्सचेञ्ज",
    description: "Nepal Stock Exchange (NEPSE) — the sole stock exchange of Nepal. Covers daily trading, market indices, listed companies, market capitalisation, and trading volume.",
    keywords:    [
      "nepse", "nepal stock exchange", "share market", "share bazar", "stock market",
      "nepse index", "market index", "share price", "share rate",
      "listed company", "trading", "market cap", "market capitalisation",
      "bull market", "bear market", "market correction", "circuit breaker",
      "nepse high", "nepse low", "nepse today", "share daam",
      "secondary market", "floor price", "trading halt",
    ],
    aliases:     ["share market", "share bazar", "stock exchange Nepal"],
    relatedTopicIds: ["ipo-fpo", "mutual-funds", "stock-brokers", "sebon"],
    schemeIds:   [],
    calculatorTab: "risk",
    priority:    "high",
  },

  {
    id:          "ipo-fpo",
    sectorId:    "capital-markets",
    name:        "IPOs, FPOs & Rights Shares",
    nameNe:      "आईपीओ / एफपीओ / हकप्रद",
    description: "Primary market offerings in Nepal: IPOs, FPOs, rights share issuance, and the allotment process — a high-engagement topic for young Nepali investors.",
    keywords:    [
      "ipo", "fpo", "rights share", "hakprad", "initial public offering",
      "ipo allotment", "ipo result", "ipo apply", "meroshare", "mero share",
      "cdsc", "asba", "ipo form", "share allotment", "refund",
      "ipo opening", "ipo closing", "lock in period", "promoter share",
      "ordinary share", "ipo price", "ipo prospectus", "sebon approval",
      "ipo news", "upcoming ipo",
    ],
    aliases:     ["IPO", "share offering", "hakprad", "rights shares"],
    relatedTopicIds: ["nepse", "sebon", "stock-brokers", "merchant-banking"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "mutual-funds",
    sectorId:    "capital-markets",
    name:        "Mutual Funds",
    nameNe:      "म्युचुअल फन्ड",
    description: "Open-ended and closed-ended mutual funds in Nepal. Includes NAV tracking, fund performance, SIP in mutual funds, and comparison with EPF/CIT returns.",
    keywords:    [
      "mutual fund", "myuchual fund", "fund", "nav", "net asset value",
      "open ended fund", "closed ended fund", "nabil equity fund",
      "siddhartha equity fund", "sunrise first mutual fund", "nmbhf",
      "laxmi equity fund", "sanima equity fund", "fund manager",
      "sip mutual fund", "systematic investment plan", "fund return",
      "fund performance", "dividend", "fund units", "collective investment scheme",
    ],
    aliases:     ["fund", "collective investment"],
    relatedTopicIds: ["nepse", "cit", "ipo-fpo", "sebon"],
    schemeIds:   ["nepse-mutual-fund", "cit-citizens-unit-scheme", "cit-esgrs"],
    calculatorTab: "sip",
    priority:    "high",
  },

  {
    id:          "stock-brokers",
    sectorId:    "capital-markets",
    name:        "Stock Brokers & DMAT",
    nameNe:      "शेयर दलाल तथा डिम्याट",
    description: "SEBON-licensed stock brokers facilitating NEPSE trading, DMAT account opening, TMS login, and share transfer for retail investors.",
    keywords:    [
      "broker", "stock broker", "share broker", "dmat", "demat account",
      "tms", "trading management system", "cdsc", "mero share",
      "broker list", "broker fee", "brokerage", "broker commission",
      "share transfer", "dmat opening", "demat opening", "tms login",
      "online trading", "share buy", "share sell",
    ],
    aliases:     ["dmat", "broker", "share dalal"],
    relatedTopicIds: ["nepse", "ipo-fpo", "sebon"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "debentures-bonds",
    sectorId:    "capital-markets",
    name:        "Bonds & Debentures",
    nameNe:      "ऋणपत्र तथा बण्ड",
    description: "Government treasury bills, development bonds, and corporate debentures listed on NEPSE — a fixed-income alternative for conservative Nepali investors.",
    keywords:    [
      "debenture", "bond", "rinapatra", "government bond", "treasury bill", "t-bill",
      "development bond", "corporate debenture", "nrb bond", "savings bond",
      "fixed income", "coupon rate", "yield", "maturity", "face value",
      "government securities", "gilt", "debt instrument",
    ],
    aliases:     ["bond", "government securities"],
    relatedTopicIds: ["nepse", "nrb-policy", "interest-rates"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "sebon",
    sectorId:    "capital-markets",
    name:        "SEBON — Securities Regulation",
    nameNe:      "धितोपत्र बोर्ड",
    description: "Securities Board of Nepal (SEBON) — the capital market regulator. Covers SEBON circulars, securities law changes, IPO approval timelines, and investor protection.",
    keywords:    [
      "sebon", "securities board", "dhitopatra board", "securities regulation",
      "sebon circular", "sebon notice", "capital market regulation",
      "securities act", "sebon approval", "sebon rule", "investor protection",
      "securities law", "market regulation", "sebon directive",
    ],
    aliases:     ["Securities Board", "sebon nepal"],
    relatedTopicIds: ["nepse", "ipo-fpo", "merchant-banking", "mutual-funds"],
    schemeIds:   [],
    priority:    "medium",
  },

  // --- Economic Intelligence -----------------------------------------------

  {
    id:          "nrb-policy",
    sectorId:    "economic-intelligence",
    name:        "NRB Monetary Policy",
    nameNe:      "राष्ट्र बैंक मौद्रिक नीति",
    description: "Nepal Rastra Bank monetary policy decisions including policy rate, CRR, SLR, bank rate, repo/reverse-repo rates, credit growth targets, and their downstream effects on savings rates and loan EMIs.",
    keywords:    [
      "nrb", "nepal rastra bank", "rastra bank", "monetary policy", "moudrik niti",
      "policy rate", "crr", "cash reserve ratio", "slr", "statutory liquidity ratio",
      "bank rate", "repo rate", "reverse repo", "open market operation",
      "credit growth", "nrb notice", "nrb circular", "nrb directive",
      "monetary policy 2081", "monetary policy 2080", "half yearly review",
      "interest rate corridor", "nrb press release", "nrb report",
      "nrb governor", "nrb regulation", "nrb data",
    ],
    aliases:     ["NRB", "Rastra Bank", "Nepal Rastra Bank"],
    relatedTopicIds: ["bank-interest-rates", "interest-rates", "inflation", "commercial-banks", "epf"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "inflation",
    sectorId:    "economic-intelligence",
    name:        "Inflation & Cost of Living",
    nameNe:      "मूल्यवृद्धि",
    description: "Nepal's consumer price inflation (CPI), food and non-food inflation, inflation effects on savings returns and loan costs, and NRB's inflation management targets.",
    keywords:    [
      "inflation", "mulya vriddhi", "mahangai", "cpi", "consumer price index",
      "food inflation", "non-food inflation", "price level", "cost of living",
      "price rise", "price hike", "inflation rate", "inflation data",
      "nrb inflation", "cbs data", "central bureau statistics", "inflation target",
      "5%", "6%", "7%", "real interest rate", "deflation", "price stability",
    ],
    aliases:     ["CPI", "mahangai", "price rise"],
    relatedTopicIds: ["nrb-policy", "interest-rates", "government-budget", "remittance"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "remittance",
    sectorId:    "economic-intelligence",
    name:        "Remittance & Foreign Exchange",
    nameNe:      "विप्रेषण",
    description: "Remittance flows into Nepal, USD/NPR exchange rates, remittance channels, and implications for inflation, liquidity, and household savings.",
    keywords:    [
      "remittance", "viprashan", "foreign remittance", "usd npr",
      "dollar rate", "exchange rate", "money transfer", "western union", "ria",
      "ime", "remit", "inward remittance", "nrb remittance data",
      "migrant worker", "foreign employment", "saudi riyal", "qatari riyal",
      "malaysian ringgit", "remittance gdp", "remittance billion", "dollars",
    ],
    aliases:     ["viprashan", "foreign remittance"],
    relatedTopicIds: ["foreign-exchange", "inflation", "nrb-policy", "digital-banking"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "government-budget",
    sectorId:    "economic-intelligence",
    name:        "Government Budget & Fiscal Policy",
    nameNe:      "सरकारी बजेट",
    description: "Nepal's annual government budget announcements, tax slab changes, tax exemptions on EPF/insurance/investments, capital expenditure, social security spending, and their personal finance implications.",
    keywords:    [
      "budget", "bhajet", "government budget", "fiscal policy", "annual budget",
      "tax", "kar", "income tax", "aaykar", "tax slab", "tax rate",
      "tax exemption", "tax free", "epf tax", "insurance tax", "investment tax",
      "vat", "customs duty", "excise duty", "budget 2081", "budget 2082",
      "ministry of finance", "mof", "budget speech", "budget day",
      "capital expenditure", "recurrent expenditure", "deficit budget",
      "social security budget", "subsidy", "grant",
    ],
    aliases:     ["budget", "bhajet", "fiscal policy", "tax"],
    relatedTopicIds: ["inflation", "nrb-policy", "epf", "ssf", "health-insurance"],
    schemeIds:   [],
    priority:    "high",
  },

  {
    id:          "interest-rates",
    sectorId:    "economic-intelligence",
    name:        "Interest Rate Intelligence",
    nameNe:      "ब्याजदर बुद्धिमत्ता",
    description: "Cross-sector interest rate movements in Nepal — a unified view connecting NRB policy rate changes to EPF returns, bank deposit rates, mutual fund NAVs, and loan EMI impacts.",
    keywords:    [
      "interest rate", "byajdar", "byaj", "rate", "interest cut", "rate hike",
      "rate change", "rate update", "new rate", "revised rate", "epf rate",
      "bank rate", "deposit rate", "lending rate", "savings rate",
      "fixed deposit rate", "fd rate", "byaj ghattyo", "byaj badhyo",
      "interest 2081", "byajdar 2081",
    ],
    aliases:     ["byajdar", "rate change"],
    relatedTopicIds: ["nrb-policy", "bank-interest-rates", "epf", "inflation"],
    schemeIds:   [],
    calculatorTab: "sip",
    priority:    "high",
  },

  // --- Government Finance --------------------------------------------------

  {
    id:          "government-owned-banks",
    sectorId:    "government-finance",
    name:        "Government-Owned Banks",
    nameNe:      "सरकारी स्वामित्वका बैंक",
    description: "Nepal's state-owned banking institutions — Rastriya Banijya Bank (RBB), Agriculture Development Bank (ADBL), and Nepal Bank Limited (NBL) — providing development finance, agricultural credit, and government-directed lending.",
    keywords:    [
      "rastriya banijya bank", "rbb", "nepal bank limited", "nbl",
      "agriculture development bank", "adbl", "krishi bank", "sarkari bank",
      "government bank", "state owned bank", "public sector bank",
      "government banking", "development bank nepal", "adbl loan",
      "rbb deposit", "nbl service",
    ],
    aliases:     ["RBB", "ADBL", "NBL", "sarkari bank"],
    relatedTopicIds: ["commercial-banks", "rural-finance", "government-budget"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "national-savings",
    sectorId:    "government-finance",
    name:        "National Savings & Post-Office Finance",
    nameNe:      "राष्ट्रिय बचत",
    description: "Government-backed savings instruments including National Savings Certificates, Post-Office savings accounts, and NSB (National Savings Bank) products offering secure, government-guaranteed returns.",
    keywords:    [
      "national savings", "national savings bank", "nsb", "rastriya bachat",
      "savings certificate", "savings bond", "post office savings", "postal savings",
      "government savings", "sarkari bachat", "bachat patra", "savings scheme",
      "government guaranteed", "risk free savings", "fixed return",
    ],
    aliases:     ["NSB", "bachat patra", "savings certificate"],
    relatedTopicIds: ["government-owned-banks", "public-debt", "epf", "cit"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "public-debt",
    sectorId:    "government-finance",
    name:        "Public Debt & Government Securities",
    nameNe:      "सार्वजनिक ऋण",
    description: "Nepal government's domestic and external borrowing — Treasury Bills (T-bills), Development Bonds, NRB Bonds, and foreign loans — and their impact on interest rates and capital market liquidity.",
    keywords:    [
      "treasury bill", "t-bill", "development bond", "government bond",
      "nrb bond", "public debt", "sarvajanik rin", "government borrowing",
      "fiscal deficit", "government loan", "external debt", "internal debt",
      "bond auction", "bond yield", "debt management", "government securities",
      "gilt", "sovereign bond", "budget deficit",
    ],
    aliases:     ["T-bill", "government bond", "sarvajanik rin"],
    relatedTopicIds: ["government-budget", "nrb-policy", "debentures-bonds", "interest-rates"],
    schemeIds:   [],
    priority:    "medium",
  },

  // --- Insurance Sector ----------------------------------------------------

  {
    id:          "non-life-insurance",
    sectorId:    "insurance",
    name:        "Non-Life & General Insurance",
    nameNe:      "निर्जीवन बीमा",
    description: "Motor, property, fire, travel, cargo, and agricultural insurance products in Nepal offered by SEBON-regulated non-life insurers. Includes third-party liability, comprehensive motor cover, and crop insurance.",
    keywords:    [
      "non-life insurance", "general insurance", "nirjeevan bima", "motor insurance",
      "vehicle insurance", "bike insurance", "car insurance", "property insurance",
      "fire insurance", "travel insurance", "cargo insurance", "crop insurance",
      "third party insurance", "comprehensive insurance", "shikhar insurance",
      "nepal insurance", "prudential insurance", "himalayan general insurance",
      "sagarmatha insurance", "neco insurance", "asian life property",
    ],
    aliases:     ["general insurance", "motor bima", "nirjeevan bima"],
    relatedTopicIds: ["life-insurance", "health-insurance", "insurance-regulation"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "reinsurance",
    sectorId:    "insurance",
    name:        "Reinsurance",
    nameNe:      "पुनर्बीमा",
    description: "Nepal Reinsurance Company (NepRe) — the mandatory reinsurer for all Nepal insurers — and international reinsurance arrangements for catastrophic risk coverage.",
    keywords:    [
      "reinsurance", "punarbima", "nepal reinsurance", "nepre",
      "mandatory reinsurance", "catastrophe cover", "cat cover",
      "reinsurer", "insurance risk", "reinsurance treaty", "quota share",
    ],
    aliases:     ["NepRe", "punarbima"],
    relatedTopicIds: ["non-life-insurance", "life-insurance", "insurance-regulation"],
    schemeIds:   [],
    priority:    "low",
  },

  {
    id:          "insurance-regulation",
    sectorId:    "insurance",
    name:        "Insurance Regulation — Beema Pradhikaran",
    nameNe:      "बीमा प्राधिकरण",
    description: "Insurance Authority of Nepal (Beema Pradhikaran) — the insurance sector regulator. Covers licensing, premium directives, solvency requirements, product approval, and consumer protection rules.",
    keywords:    [
      "beema pradhikaran", "insurance authority", "insurance board",
      "insurance regulation", "insurance regulator", "beema niyam",
      "insurance act", "insurance directive", "premium rate", "solvency ratio",
      "insurance license", "insurance policy", "insurance claim settlement",
      "consumer protection insurance", "grievance insurance",
    ],
    aliases:     ["Beema Pradhikaran", "Insurance Authority Nepal"],
    relatedTopicIds: ["non-life-insurance", "life-insurance", "health-insurance", "reinsurance"],
    schemeIds:   [],
    priority:    "medium",
  },

  {
    id:          "foreign-exchange",
    sectorId:    "economic-intelligence",
    name:        "Foreign Exchange & Reserves",
    nameNe:      "विदेशी विनिमय",
    description: "Nepal's foreign exchange reserves, USD/NPR rate, NRB forex management, import cover, balance of payments, and current account data.",
    keywords:    [
      "forex", "foreign exchange", "reserve", "usd npr", "dollar nepal",
      "exchange rate", "nrb reserve", "foreign currency reserve",
      "balance of payment", "current account", "import cover",
      "gold reserve", "forex management", "currency conversion",
      "inr npr", "indian rupee", "dollar today",
    ],
    aliases:     ["forex", "currency reserve"],
    relatedTopicIds: ["remittance", "nrb-policy", "inflation"],
    schemeIds:   [],
    priority:    "medium",
  },
];

// =========================================================================
// SECTORS REGISTRY
// =========================================================================

export const SECTORS: FinancialSector[] = [
  {
    id:          "banking",
    name:        "Banking Sector",
    nameNe:      "बैंकिङ क्षेत्र",
    description: "Nepal's A/B/C class banks regulated by NRB — covering deposits, loans, digital banking, and interest rate intelligence.",
    topicIds:    ["bank-interest-rates", "commercial-banks", "bank-home-loans", "digital-banking", "development-banks", "finance-companies"],
    icon:        "🏦",
    priority:    1,
  },
  {
    id:          "nbfi",
    name:        "Non-Banking Financial Institutions",
    nameNe:      "गैर-बैंकिङ वित्तीय संस्था",
    description: "EPF, SSF, CIT, insurance companies — the formal savings and social protection ecosystem for Nepal's formal-sector workforce.",
    topicIds:    ["epf", "ssf", "cit", "pension-systems", "life-insurance", "health-insurance", "merchant-banking"],
    icon:        "🏛",
    priority:    1,
  },
  {
    id:          "capital-markets",
    name:        "Capital Markets",
    nameNe:      "पूँजी बजार",
    description: "NEPSE stock exchange, IPOs, mutual funds, brokers, and SEBON regulation — Nepal's primary and secondary investment markets.",
    topicIds:    ["nepse", "ipo-fpo", "mutual-funds", "stock-brokers", "debentures-bonds", "sebon"],
    icon:        "📈",
    priority:    1,
  },
  {
    id:          "economic-intelligence",
    name:        "Economic Intelligence",
    nameNe:      "आर्थिक बुद्धिमत्ता",
    description: "NRB monetary policy, inflation, remittance, government budget, and cross-sector interest rate movements shaping Nepal's macro environment.",
    topicIds:    ["interest-rates", "nrb-policy", "government-budget", "inflation", "remittance", "foreign-exchange"],
    icon:        "🧭",
    priority:    1,
  },
  {
    id:          "microfinance",
    name:        "Microfinance Sector",
    nameNe:      "लघुवित्त क्षेत्र",
    description: "D-class MFIs, rural credit, agricultural finance, and financial inclusion programs reaching underserved Nepali communities.",
    topicIds:    ["microfinance-institutions", "rural-finance", "financial-inclusion"],
    icon:        "🌱",
    priority:    2,
  },
  {
    id:          "cooperatives",
    name:        "Cooperatives",
    nameNe:      "सहकारी",
    description: "Member-owned savings and credit cooperatives providing accessible savings rates and loans outside the formal banking sector.",
    topicIds:    ["savings-cooperatives", "credit-cooperatives", "cooperative-governance"],
    icon:        "🤝",
    priority:    3,
  },
  {
    id:          "government-finance",
    name:        "Government Finance",
    nameNe:      "सरकारी वित्त",
    description: "State-owned banks, national savings instruments, and government securities — Nepal's public financial infrastructure including ADBL, RBB, NBL, NSB, T-bills, and development bonds.",
    topicIds:    ["government-owned-banks", "national-savings", "public-debt"],
    icon:        "🏛",
    priority:    2,
  },
  {
    id:          "insurance",
    name:        "Insurance",
    nameNe:      "बीमा क्षेत्र",
    description: "Nepal's non-life insurance sector — motor, property, fire, travel, crop, and cargo insurance — regulated by Beema Pradhikaran, plus national reinsurance through NepRe.",
    topicIds:    ["non-life-insurance", "reinsurance", "insurance-regulation"],
    icon:        "🛡",
    priority:    2,
  },
];

// =========================================================================
// INDEXED LOOKUPS
// =========================================================================

const TOPIC_INDEX  = new Map<string, FinancialTopic>(TOPICS.map(t => [t.id, t]));
const SECTOR_INDEX = new Map<string, FinancialSector>(SECTORS.map(s => [s.id, s]));

export function getTopic(id: string): FinancialTopic | undefined {
  return TOPIC_INDEX.get(id);
}

export function getSector(id: string): FinancialSector | undefined {
  return SECTOR_INDEX.get(id);
}

export function getTopicsBySector(sectorId: SectorId): FinancialTopic[] {
  return TOPICS.filter(t => t.sectorId === sectorId);
}

export function getRelatedTopics(topicId: TopicId): FinancialTopic[] {
  const topic = TOPIC_INDEX.get(topicId);
  if (!topic) return [];
  return topic.relatedTopicIds.map(id => TOPIC_INDEX.get(id)).filter(Boolean) as FinancialTopic[];
}

export function getTopicsBySchemeId(schemeId: string): FinancialTopic[] {
  return TOPICS.filter(t => t.schemeIds.includes(schemeId));
}

export function getTopicsByCalculatorTab(tab: string): FinancialTopic[] {
  return TOPICS.filter(t => t.calculatorTab === tab);
}

// =========================================================================
// TOPIC MATCHING — keyword-based NLP, used by ingest worker and content pipeline
// =========================================================================

const PRIORITY_WEIGHT = { high: 1.4, medium: 1.0, low: 0.7 };

export function matchTopics(text: string, maxResults = 8): TopicMatch[] {
  const normalised = text.toLowerCase();

  const scored: TopicMatch[] = TOPICS.map(topic => {
    const allTerms = [
      ...topic.keywords,
      ...topic.aliases.map(a => a.toLowerCase()),
    ];
    const matched: string[] = [];
    for (const term of allTerms) {
      if (normalised.includes(term)) matched.push(term);
    }
    const unique = Array.from(new Set(matched));
    const rawScore = unique.length / Math.max(allTerms.length, 1);
    const score = rawScore * PRIORITY_WEIGHT[topic.priority];
    return { topic, score: Math.min(score, 1), matchedTerms: unique };
  });

  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

export function matchSectors(topicIds: string[]): SectorRouting[] {
  const map = new Map<SectorId, { topics: FinancialTopic[]; score: number }>();
  for (const id of topicIds) {
    const topic = TOPIC_INDEX.get(id);
    if (!topic) continue;
    const existing = map.get(topic.sectorId);
    if (existing) {
      existing.topics.push(topic);
      existing.score += 1;
    } else {
      map.set(topic.sectorId, { topics: [topic], score: 1 });
    }
  }
  return Array.from(map.entries())
    .map(([sectorId, { topics, score }]) => ({
      sector: SECTOR_INDEX.get(sectorId)!,
      topics,
      score,
    }))
    .filter(r => r.sector)
    .sort((a, b) => b.score - a.score);
}

export function resolveTopicTags(text: string, maxResults = 5): TaxonomyTag[] {
  return matchTopics(text, maxResults).map(m => ({
    topicId:  m.topic.id as TopicId,
    sectorId: m.topic.sectorId,
    score:    Math.round(m.score * 100) / 100,
  }));
}

// =========================================================================
// AI PROMPT HELPERS
// =========================================================================

export function taxonomySummaryForPrompt(): string {
  return SECTORS.map(sector => {
    const sectorTopics = getTopicsBySector(sector.id as SectorId);
    const topicList = sectorTopics
      .map(t => `    - ${t.id} (${t.name}): ${t.keywords.slice(0, 5).join(", ")}`)
      .join("\n");
    return `  [${sector.id}] ${sector.name}\n${topicList}`;
  }).join("\n\n");
}

export function topicIdsForPrompt(): string {
  return TOPICS.map(t => `${t.id} — ${t.name} (sector: ${t.sectorId})`).join("\n");
}
