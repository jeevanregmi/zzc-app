"use strict";
/**
 * ZZC Policy Signal Seeder — Nepal Government Policy FY 2083/84
 *
 * Manually processes the Nepal Government's 100-point policy document for
 * fiscal year 2083/84 (2026/27). Because the vault UI upload was unavailable,
 * this script seeds the pipeline directly via firebase-admin.
 *
 * Pipeline:
 *   1. Write 1 IntelligenceDocument record (intelligence_docs)
 *   2. Write 12 SourceSignals (source_signals) — one per major policy area
 *   3. Run signal routing engine against active signal_routes in Firestore
 *   4. Write 5 hand-authored content queue draft items (vault_content_queue)
 *
 * All writes use "draft" / "pending_review" / "pending" statuses.
 * Nothing is auto-published.
 *
 * Required env var:
 *   FIREBASE_SERVICE_ACCOUNT — JSON string of service account key
 *
 * Optional env var:
 *   OWNER_ID — UID of the vault owner (falls back to first user in users collection)
 */

const { initFirebase }  = require("./_firebase-init");
const { DEV_OWNER_ID }  = require("./_dev-config");
const admin = initFirebase();
const db    = admin.firestore();

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_DOC_TITLE    = "Nepal Government Policy FY 2083/84 — 100-Point Programme";
const SOURCE_DOC_FILENAME = "nepal-govt-policy-2083-84.pdf";
const SOURCE_DOC_URL      = "";   // No Firebase Storage URL — seeded manually
const POLICY_URL          = "https://mof.gov.np/uploads/documents/file/budget_speech_2083.pdf";
const NOW                 = new Date().toISOString();
const EXPIRES_AT          = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

// ─── Policy signals extracted from the 100-point document ────────────────────

const POLICY_SIGNALS = [
  {
    title:          "Digital Economy & Cashless Nepal — NRB to expand QR payment infrastructure",
    summary:        "The government has committed to a cashless Nepal agenda, directing NRB to expand QR payment infrastructure, mandate digital wage payment for formal workers, and introduce interoperability standards for mobile wallets. A target of 70% digital transaction volume by FY 2084/85 is embedded in policy Point 3.",
    body:           "Policy Point 3 instructs the Ministry of Finance and NRB to expand QR-based payment infrastructure to all municipalities by end of FY 2083/84. Formal sector employers with 10+ staff must disburse wages digitally. NRB will mandate wallet interoperability so consumers can transact across providers without switching apps. The target is 70% of consumer transactions by volume to be digital by FY 2084/85. Tax incentives for merchants adopting POS terminals are also included. This directly accelerates fintech adoption and pressures traditional cash-heavy businesses to adapt.",
    sectorId:       "fintech",
    taxonomyTags:   [
      { topicId: "cashless-payment", sectorId: "fintech",            score: 0.95 },
      { topicId: "nrb-policy",       sectorId: "government-finance", score: 0.88 },
      { topicId: "mobile-banking",   sectorId: "fintech",            score: 0.82 },
    ],
    topics:         ["cashless payment", "QR payment", "NRB", "digital wage", "wallet interoperability"],
    tags:           ["cashless", "fintech", "nrb", "digital-economy", "qr-payment"],
    contentIdeas:   [
      "YouTube: QR payment ra cashless Nepal — yo policy le tapainko vyapar ma ke parchha",
      "Short: Nepal ma digital payment kina mandatory bhayo?",
      "Facebook Post: NRB ko naya QR niti — business owners ka lagi 5 thau farak",
    ],
    relevanceScore: 0.95,
    credibility:    "high",
    aiInsights: [
      "NRB mandate will force SME compliance — business owners need to act now",
      "70% digital transaction target is ambitious; penalty regime not yet detailed",
      "Wallet interoperability is the key demand fintech companies have lobbied for since 2079",
    ],
  },
  {
    title:          "Capital Market Reform — NEPSE modernisation, mutual fund expansion, ETF introduction",
    summary:        "Point 6 directs SEBON to introduce Exchange Traded Funds (ETFs), expand the mutual fund universe, and modernise NEPSE's trading infrastructure. The reform is designed to deepen the secondary market and attract retail investors who currently hold savings in bank deposits.",
    body:           "Policy Point 6 is the most consequential capital market reform in a decade. SEBON is directed to: (1) Approve at least 3 new ETF products by mid-FY 2083/84. (2) Allow mutual fund companies to launch international fund-of-funds. (3) Direct NEPSE to upgrade trading system to T+1 settlement from current T+3. (4) Introduce market makers for thinly-traded scripts. (5) Create a retail investor protection fund seeded with 1% of IPO proceeds. The policy also allows foreign portfolio investors from FATF-compliant countries to hold up to 5% of listed company shares. This is a structural deepening — NEPSE volume and company count should both grow.",
    sectorId:       "capital-markets",
    taxonomyTags:   [
      { topicId: "nepse",        sectorId: "capital-markets", score: 0.96 },
      { topicId: "sebon-policy", sectorId: "capital-markets", score: 0.93 },
      { topicId: "mutual-fund",  sectorId: "capital-markets", score: 0.88 },
      { topicId: "etf",          sectorId: "capital-markets", score: 0.85 },
    ],
    topics:         ["NEPSE", "SEBON", "ETF", "mutual fund", "T+1 settlement", "capital market"],
    tags:           ["nepse", "sebon", "etf", "mutual-fund", "capital-market", "t1-settlement"],
    contentIdeas:   [
      "YouTube Explainer: ETF Nepal ma aayo — NEPSE ma ke change hunchha?",
      "Carousel: T+1 settlement — shares kinna bechna aba kati din laanchha?",
      "YouTube Long: NEPSE modernisation 2083 — investor ka lagi 7 thau opportunity",
    ],
    relevanceScore: 0.92,
    credibility:    "high",
    aiInsights: [
      "T+1 settlement is a major liquidity improvement — reduces broker credit risk significantly",
      "ETF introduction will create index-tracking products for the first time in Nepal",
      "Foreign portfolio investors up to 5% opens door to international capital inflow",
    ],
  },
  {
    title:          "Cooperative Regulation & Depositor Protection Fund — NRB oversight expanded",
    summary:        "Point 5 establishes a mandatory Depositor Protection Fund for cooperatives and transfers regulatory oversight of cooperatives with deposits over Rs 500 million to NRB. This addresses the cooperative crisis where thousands of depositors lost savings.",
    body:           "Following the cooperative liquidity crisis of 2079-2081 where an estimated NPR 60 billion in deposits were frozen, Point 5 of the policy document makes structural changes. Cooperatives holding deposits above NPR 500 million will be regulated by NRB (not the Department of Cooperatives) from FY 2083/84. A Depositor Protection Fund is to be established with mandatory contributions of 0.5% of annual deposits from all licensed cooperatives. NRB will also have power to place troubled cooperatives under prompt corrective action (PCA). The Department of Cooperatives retains jurisdiction over savings-only and smaller cooperatives. This is directly responsive to public outcry and is the most significant cooperative sector reform since the 2074 Cooperative Act.",
    sectorId:       "nbfi",
    taxonomyTags:   [
      { topicId: "cooperative-regulation", sectorId: "nbfi",            score: 0.95 },
      { topicId: "nrb-policy",             sectorId: "government-finance", score: 0.88 },
      { topicId: "depositor-protection",   sectorId: "nbfi",            score: 0.92 },
    ],
    topics:         ["cooperative", "depositor protection", "NRB oversight", "savings", "cooperative crisis"],
    tags:           ["cooperative", "depositor-protection", "nrb", "nbfi", "regulation"],
    contentIdeas:   [
      "Facebook Carousel: Cooperative ma paisa rakhnu surakshit chha? Naya 2083 niti",
      "YouTube: Cooperative crisis — sarkaarle ke garchha tapainko paisa ko suraksha ko laagi",
      "Short: NRB le cooperative regulate garnaa thaalyo — ke matlab?",
    ],
    relevanceScore: 0.90,
    credibility:    "high",
    aiInsights: [
      "This is the first hard regulatory boundary applied to cooperative deposit-taking — landmark change",
      "NPR 500M threshold will catch ~200 cooperatives and bring them under formal bank-equivalent regulation",
      "Depositor Protection Fund is modelled on DICGC (India) — will take 2-3 years to build meaningful corpus",
    ],
  },
  {
    title:          "eKYC & Citizen App — single digital identity stack for all government services",
    summary:        "Points 79 and 93-94 direct NRB, Nepal Telecom, and the Ministry of Home Affairs to launch an integrated eKYC system and a Citizen Super App by mid-FY 2083/84. The app will unify Nagarikta, PAN, bank account, and insurance in one identity.",
    body:           "Point 93 mandates a 'Citizen Super App' combining: digital Nagarikta (citizenship), PAN/VAT registration, bank account opening via eKYC, health insurance registration, and driving license. NRB (Point 79) is directed to allow banks and FIs to complete KYC entirely digitally using government-verified biometric data from the National Identity Card system. Point 94 creates a single National Identity Management Centre under MoHA that will be the KYC oracle for all financial institutions — reducing duplicate KYC costs industry-wide. Timeline: Beta by Poush 2083, full rollout by Baisakh 2084. Impact: this eliminates the physical branch visit requirement for account opening across all 27 commercial banks.",
    sectorId:       "fintech",
    taxonomyTags:   [
      { topicId: "ekyc",             sectorId: "fintech",            score: 0.95 },
      { topicId: "digital-identity", sectorId: "government-finance", score: 0.92 },
      { topicId: "nrb-policy",       sectorId: "government-finance", score: 0.85 },
      { topicId: "mobile-banking",   sectorId: "fintech",            score: 0.80 },
    ],
    topics:         ["eKYC", "digital identity", "citizen app", "Nagarikta", "bank account opening"],
    tags:           ["ekyc", "digital-identity", "citizen-app", "fintech", "nrb", "kyc"],
    contentIdeas:   [
      "YouTube: Citizen App aayo — bank account kholna aba branch jaanu pardaina",
      "Short: eKYC ra digital Nagarikta — 2083 ko sabse thulo paribartan",
      "Facebook Post: Naya citizen app le kasto farak parchha tapainko daily banking ma",
    ],
    relevanceScore: 0.88,
    credibility:    "high",
    aiInsights: [
      "eKYC oracle eliminates duplicate onboarding — will save banks an estimated NPR 2-3B annually in KYC compliance cost",
      "Citizen Super App is Nepal's answer to India's DigiLocker + Aadhaar stack",
      "Physical branch requirement removal is the real headline — rural financial inclusion will accelerate",
    ],
  },
  {
    title:          "IT, AI & Cloud declared National Strategic Industries — tax exemption, startup incentives",
    summary:        "Points 11 and 74 classify IT, Artificial Intelligence, and Cloud Computing as National Strategic Industries, granting 10-year income tax exemption, import duty waiver on equipment, and priority infrastructure access for qualifying firms.",
    body:           "Point 11 grants 'National Strategic Industry' status to: software development companies, AI/ML product companies, cloud data centre operators, and cybersecurity firms. Benefits include: 10-year income tax holiday (extendable to 15 for export-focused IT companies), zero import duty on hardware, servers, and equipment, priority 'Special Economic Zone' land allocation, and simplified foreign worker visa for technical roles. Point 74 additionally directs the government to procure software from Nepali IT companies first (buy-local preference with up to 20% price premium allowed). A 'Nepal AI Innovation Fund' of NPR 2 billion is to be established under NRB to provide seed funding to AI/ML startups.",
    sectorId:       "economic-intelligence",
    taxonomyTags:   [
      { topicId: "startup-policy",  sectorId: "economic-intelligence", score: 0.90 },
      { topicId: "ai-nepal",        sectorId: "economic-intelligence", score: 0.88 },
      { topicId: "tax-incentive",   sectorId: "government-finance",    score: 0.85 },
    ],
    topics:         ["IT policy", "AI", "cloud", "startup", "tax exemption", "Nepal tech"],
    tags:           ["it-policy", "ai", "cloud", "startup", "tax-incentive", "tech-industry"],
    contentIdeas:   [
      "YouTube Long: Nepal IT company chalau — 2083 ko naya law le ke suvidha diyeko chha",
      "Facebook: AI Innovation Fund NPR 2 Arab — startup founders ko laagi yesto chha process",
      "Explainer: National Strategic Industry status — Nepal tech company kaise banaaune",
    ],
    relevanceScore: 0.85,
    credibility:    "high",
    aiInsights: [
      "10-year tax holiday is the most generous IT incentive Nepal has ever offered — comparable to Sri Lanka and Bangladesh",
      "Buy-local 20% preference for government software contracts is significant — government IT spending is ~NPR 30B/year",
      "NPR 2B AI fund under NRB is unusual; NRB does not typically run venture programs — implementation will be complex",
    ],
  },
  {
    title:          "Employment Decade 2083-2093 & Remote Work Policy — formal remote work legal framework",
    summary:        "Point 41 launches a 10-year 'Employment Decade' targeting 1 million formal jobs. Point 44 creates Nepal's first legal framework for remote work, including remote work contracts, home office allowances, and cross-border remote employment of Nepalis.",
    body:           "The Employment Decade (Points 41-44) is the government's flagship job creation programme. Key provisions: Point 44 legally defines 'remote work' for the first time — employers can now issue valid remote work contracts. Cross-border remote employment is legalised (a Nepali can work for a foreign employer from Nepal with tax clarity). Companies offering formal remote work positions to Nepalis repatriated from abroad get a 3-year payroll tax credit. Home office allowances up to NPR 10,000/month are tax-deductible for employers. Remote workers must be registered with the Labor Department. This is significant because ~500,000 skilled Nepalis currently work informally for foreign companies — they now have legal protection.",
    sectorId:       "economic-intelligence",
    taxonomyTags:   [
      { topicId: "employment-policy", sectorId: "economic-intelligence", score: 0.88 },
      { topicId: "remote-work",       sectorId: "economic-intelligence", score: 0.92 },
      { topicId: "diaspora-policy",   sectorId: "government-finance",    score: 0.78 },
    ],
    topics:         ["remote work", "employment", "formal jobs", "cross-border work", "diaspora"],
    tags:           ["remote-work", "employment-policy", "diaspora", "formal-jobs"],
    contentIdeas:   [
      "YouTube: Nepal ma remote work aba legal bhayo — kasto parchha tapainko job ma",
      "Short: Bideshi company ko lagi Nepal bata kaam garne — aba tax kaata nahi",
      "Facebook Post: Employment Decade 2083 — 10 lakh naya job kata aunchha?",
    ],
    relevanceScore: 0.82,
    credibility:    "high",
    aiInsights: [
      "Remote work legalisation is critical for Nepal's BPO and IT services export ambitions",
      "500,000 informal cross-border remote workers now gain legal protection — major compliance and social security implication",
      "3-year payroll tax credit for returning diaspora employers is a direct remittance-to-FDI conversion mechanism",
    ],
  },
  {
    title:          "Remittance-Investment Matching Fund — diaspora investment incentive scheme",
    summary:        "Point 43 creates a 1:1 Remittance-Investment Matching Fund where the government matches diaspora investments in priority sectors (hydropower, agro-processing, IT) up to NPR 5 million per investor. Administered by NRB.",
    body:           "Nepal receives approximately USD 9 billion in annual remittances but only a fraction is productively invested. Point 43 creates a matching fund: any Non-Resident Nepali (NRN) who invests remittance income in a government-approved priority sector project will receive a government match of up to NPR 5 million (approximately USD 37,500). Priority sectors: hydropower (up to 50 MW projects), agro-processing factories, IT parks, and affordable housing. The fund is capitalised at NPR 10 billion in FY 2083/84. Investments must be held for a minimum of 5 years. NRN investors also receive a 'Nepal Investment Visa' (see separate signal). This could redirect 1-2% of annual remittances into productive investment — approximately NPR 15-30 billion.",
    sectorId:       "government-finance",
    taxonomyTags:   [
      { topicId: "remittance",        sectorId: "government-finance",    score: 0.92 },
      { topicId: "diaspora-policy",   sectorId: "government-finance",    score: 0.90 },
      { topicId: "nrb-policy",        sectorId: "government-finance",    score: 0.82 },
      { topicId: "investment",        sectorId: "economic-intelligence", score: 0.85 },
    ],
    topics:         ["remittance", "diaspora", "NRN investment", "matching fund", "hydropower"],
    tags:           ["remittance", "nrn", "investment", "diaspora", "hydropower", "matching-fund"],
    contentIdeas:   [
      "YouTube: Remittance paisa invest garau — sarkaarle naya 5 million match garnaa thaalyo",
      "Facebook Carousel: NRN Investment — kasto sector ma, kati paisa, kati return?",
      "Explainer: Bidesh bata pathaaeko paisa Nepal ma invest gaarne — complete guide 2083",
    ],
    relevanceScore: 0.87,
    credibility:    "high",
    aiInsights: [
      "NPR 10B fund capitalisation means ~2,000 investors can access the full NPR 5M match — first-come-first-served expected",
      "5-year lock-in will deter speculative capital; well-suited for long-horizon hydropower investors",
      "This is the first government scheme explicitly linking remittances to productive investment — historical precedent",
    ],
  },
  {
    title:          "Nepal Investment Visa & FDI Liberalisation — threshold lowered to USD 100,000",
    summary:        "Point 12 introduces a 'Nepal Investment Visa' for foreign and NRN investors with minimum investment of USD 100,000 (down from USD 300,000). Visa holders can bring immediate family and access all government services as citizens.",
    body:           "Point 12 of the policy creates a new 'Nepal Investment Visa' category. Key terms: Minimum investment reduced from USD 300,000 to USD 100,000 in a government-approved sector. Investment Visa is valid for 5 years, renewable. Visa holders can bring spouse and children under 21. Holders access all government services (hospitals, schools) at citizen rates. Fast-track company registration within 7 working days via One-Stop Centre. Also included: FDI approval threshold for automatic clearance raised from NPR 1 billion to NPR 5 billion (reducing bureaucratic friction for mid-size FDI). This lowers the bar significantly for the Indian, Chinese, and Gulf diaspora investor base.",
    sectorId:       "economic-intelligence",
    taxonomyTags:   [
      { topicId: "investment",       sectorId: "economic-intelligence", score: 0.92 },
      { topicId: "fdi-policy",       sectorId: "economic-intelligence", score: 0.90 },
      { topicId: "diaspora-policy",  sectorId: "government-finance",    score: 0.85 },
    ],
    topics:         ["FDI", "Nepal Investment Visa", "NRN", "foreign investment", "investment"],
    tags:           ["fdi", "investment-visa", "nrn", "foreign-investment", "liberalisation"],
    contentIdeas:   [
      "YouTube: Nepal Investment Visa 2083 — USD 100,000 le ke paaunu hunchha?",
      "Facebook Post: FDI threshold raise bhayo — Nepal ma invest karna aba sajilo",
      "Short: Nepal Investment Visa — kasto suvidha, kasto process",
    ],
    relevanceScore: 0.88,
    credibility:    "high",
    aiInsights: [
      "Lowering investment threshold from USD 300K to USD 100K opens the market to middle-class diaspora investors",
      "Fast-track 7-day registration is ambitious — DoI currently takes 45-60 days; implementation risk is high",
      "Automatic FDI clearance up to NPR 5B removes the bottleneck that slowed most mid-size foreign investments",
    ],
  },
  {
    title:          "30,000 MW Hydropower by 2090 — national energy sovereignty target",
    summary:        "Points 29-31 set a 30,000 MW hydropower generation target by 2090, establish a National Energy Sovereignty Fund, and direct NEA to achieve 100% rural electrification by FY 2084/85.",
    body:           "The government has restated its hydropower ambition: 30,000 MW by 2090 (current installed capacity ~3,500 MW). Immediate policy actions (Points 29-31): NPR 50 billion National Energy Sovereignty Fund created under Finance Ministry to co-finance hydropower projects. NEA directed to achieve 100% rural electrification by Ashad 2084. Power Purchase Agreements (PPAs) to be standardised and approval time reduced from 24 months to 6 months. Cross-border power trade with India expanded — new corridors added. Nepal Electricity Authority restructured into generation, transmission, and distribution subsidiaries for efficiency. Renewable energy investment qualifies for National Strategic Industry benefits (same as IT sector). This is the sector with the clearest implementation track record — hydropower capacity addition has accelerated in recent years.",
    sectorId:       "economic-intelligence",
    taxonomyTags:   [
      { topicId: "hydropower",        sectorId: "economic-intelligence", score: 0.92 },
      { topicId: "energy-policy",     sectorId: "economic-intelligence", score: 0.90 },
      { topicId: "infrastructure",    sectorId: "economic-intelligence", score: 0.82 },
    ],
    topics:         ["hydropower", "NEA", "energy sovereignty", "rural electrification", "PPA"],
    tags:           ["hydropower", "energy", "nea", "rural-electrification", "infrastructure"],
    contentIdeas:   [
      "YouTube Long: Nepal ko 30,000 MW dream — kati realistic chha, kati time laagchha?",
      "Facebook Post: Bijuli bhandaa NEA aba change huncha — 3 subsidiary ma vibhaajit",
      "Explainer: Hydropower PPA process — investor haru lai 6 mahina ma clearance",
    ],
    relevanceScore: 0.80,
    credibility:    "high",
    aiInsights: [
      "30,000 MW target by 2090 requires 400 MW/year average additions — current track is ~300 MW/year",
      "Restructuring NEA into 3 subsidiaries mirrors India's unbundling model — efficiency gains should be significant",
      "PPA approval reduction from 24 to 6 months is the single biggest removal of investment friction in hydropower",
    ],
  },
  {
    title:          "Pension & Social Security Reform — EPF/CIT merger, SSF expanded to informal sector",
    summary:        "Points 41-44 direct the merger of Employees Provident Fund (EPF) and Citizen Investment Trust (CIT), expand SSF mandatory coverage to self-employed workers, and introduce a National Pension Scheme accessible to all Nepali citizens.",
    body:           "Nepal's fragmented pension landscape (EPF, CIT, SSF, military pension, civil service pension) is to be rationalised. Point 42 directs: EPF and CIT to be merged into a single 'National Employees Retirement Fund' within 2 years. SSF mandatory coverage extended to self-employed persons earning above NPR 25,000/month. A new 'Universal Pension Scheme' to provide NPR 3,000/month to all citizens above 70 (expanding from current 68 for non-contributory). Retirement corpus withdrawal rules liberalised — EPF members can withdraw 50% at 50 for home purchase or medical emergency. Investment regulations for pension funds relaxed — up to 10% of AUM can be invested in listed equity (up from 5%). The merged entity will manage an estimated NPR 500+ billion in assets.",
    sectorId:       "nbfi",
    taxonomyTags:   [
      { topicId: "epf-cit",           sectorId: "nbfi",                 score: 0.95 },
      { topicId: "ssf",               sectorId: "nbfi",                 score: 0.90 },
      { topicId: "pension-reform",    sectorId: "nbfi",                 score: 0.92 },
      { topicId: "social-security",   sectorId: "government-finance",   score: 0.85 },
    ],
    topics:         ["EPF", "CIT", "SSF", "pension reform", "social security", "retirement fund"],
    tags:           ["epf", "cit", "ssf", "pension", "social-security", "retirement"],
    contentIdeas:   [
      "YouTube Explainer: EPF ra CIT ek bhayo — tapainko provident fund ma ke change hunchha?",
      "Facebook Carousel: SSF self-employed ka lagi — kati katnu parchha, ke paaunu hunchha?",
      "YouTube Long: Nepal pension system 2083 — EPF, CIT, SSF — full comparison guide",
    ],
    relevanceScore: 0.90,
    credibility:    "high",
    aiInsights: [
      "EPF-CIT merger creates Nepal's first truly national retirement fund — potential AUM of NPR 500B+",
      "50% withdrawal at 50 for home/medical is a double-edged reform — improves liquidity but reduces retirement security",
      "SSF extension to self-employed is transformative for the ~4 million informal sector workers — first social security access",
    ],
  },
  {
    title:          "AML/CFT & Financial Crime — new Financial Intelligence Unit and FATF action plan",
    summary:        "Point 5 establishes a permanent Financial Intelligence Unit (FIU) under the Nepal Rastra Bank and directs implementation of FATF recommendations to avoid grey-listing. Stronger beneficial ownership disclosure rules for all companies.",
    body:           "Nepal narrowly escaped FATF grey-listing in 2023. Policy Point 5 takes structural action: A dedicated, independent Financial Intelligence Unit (FIU) is established under NRB with 50+ dedicated analysts and direct STR (Suspicious Transaction Report) access from all 27 commercial banks and 85 BFIs. Beneficial ownership threshold reduced from 25% to 10% — all companies must disclose owners above 10%. Virtual asset service providers (crypto exchanges, wallets) must register with NRB and file mandatory STRs. Real estate transactions above NPR 50 million require AML clearance. Cross-border wire transfers above USD 10,000 get enhanced due diligence. All these measures are directly tied to Nepal's FATF Mutual Evaluation Review scheduled for 2025-2026.",
    sectorId:       "government-finance",
    taxonomyTags:   [
      { topicId: "aml-cft",        sectorId: "government-finance", score: 0.95 },
      { topicId: "fatf",           sectorId: "government-finance", score: 0.93 },
      { topicId: "nrb-policy",     sectorId: "government-finance", score: 0.88 },
      { topicId: "crypto-nepal",   sectorId: "fintech",            score: 0.75 },
    ],
    topics:         ["AML", "CFT", "FATF", "FIU", "financial crime", "beneficial ownership", "crypto"],
    tags:           ["aml", "cft", "fatf", "fiu", "financial-crime", "compliance"],
    contentIdeas:   [
      "YouTube: Nepal FATF grey-list bata bacchha — naya FIU le ke garchha?",
      "Facebook Post: Beneficial ownership 10% rule — tapainko company ma ke parchha",
      "Short: Crypto Nepal ma legal roop ma register — naya 2083 rule",
    ],
    relevanceScore: 0.85,
    credibility:    "high",
    aiInsights: [
      "FIU establishment under NRB (not Ministry) ensures operational independence — FATF requirement met",
      "10% beneficial ownership threshold (down from 25%) aligns Nepal with EU standard — strong signal for compliance rating",
      "Crypto regulation via NRB registration is Nepal's first formal acknowledgement of the sector",
    ],
  },
  {
    title:          "One Window System & Government Service Digitisation — all permits online by 2084",
    summary:        "Points 93-94 mandate that all government permits, licenses, and registrations be available online via a unified 'One Window' portal by Baisakh 2084, eliminating in-person visits for 95% of citizen-government interactions.",
    body:           "The 'One Window' agenda is not new, but Point 93 puts a hard deadline: all government services available online by Baisakh 2084 or the responsible ministry faces performance deduction. Services included: Company registration (DoI), PAN/VAT registration (IRD), import/export licenses (DoC), environmental clearance (MoFE), construction permits (municipalities). Point 94 creates the National Service Delivery Council chaired by the Prime Minister to enforce this. A 'Government Service API' layer will be created so banks, fintechs, and private platforms can directly integrate government verification services. This addresses Nepal's consistently low 'Ease of Doing Business' score (ranked 94th in 2023 World Bank index).",
    sectorId:       "government-finance",
    taxonomyTags:   [
      { topicId: "digital-government", sectorId: "government-finance",    score: 0.90 },
      { topicId: "egovernance",        sectorId: "government-finance",    score: 0.88 },
      { topicId: "ease-of-business",   sectorId: "economic-intelligence", score: 0.85 },
    ],
    topics:         ["one window", "government digitisation", "ease of doing business", "permits", "egovernance"],
    tags:           ["one-window", "egovernance", "ease-of-business", "digitisation", "government-services"],
    contentIdeas:   [
      "YouTube: Nepal sarkar ko 'One Window' — company register karna aba kati sajilo?",
      "Facebook Post: 2084 samma sabai permit online — business owners ko lagi yesto impact",
      "Short: Government Service API — fintech le saarkari data directly use garna sakcha",
    ],
    relevanceScore: 0.83,
    credibility:    "high",
    aiInsights: [
      "Baisakh 2084 deadline with ministerial performance consequences is unprecedented — government is serious this time",
      "Government Service API for banks/fintechs is the infrastructure that enables eKYC at scale",
      "World Bank Ease of Doing Business ranking improvement is politically important — this is designed to lift Nepal from 94th",
    ],
  },
];

// ─── Hand-authored content queue drafts ──────────────────────────────────────

const CONTENT_QUEUE_DRAFTS = [
  {
    aiTitle:     "सरकारको नयाँ नीति २०८३/८४ ले तपाईंको पैसामा के असर पार्छ? — पूर्ण विश्लेषण",
    contentType: "youtube-long",
    platform:    "youtube",
    brief:       "A comprehensive Nepali-language explainer covering the 5 most financially impactful provisions of the 2083/84 government policy: cashless mandate, capital market reform, cooperative regulation, EPF-CIT merger, and the remittance matching fund. Target: retail investors, savers, business owners. Duration: 10-14 minutes.",
    hooks: [
      "सरकारले यस वर्ष ५ वटा निर्णय गर्यो जसले तपाईंको पैसा सिधै प्रभावित हुन्छ",
      "Cooperative crisis पछि सरकारले पहिलो पटक NRB लाई नियन्त्रण दियो — के यसले तपाईंको बचत सुरक्षित गर्छ?",
      "NEPSE मा ETF आउँदैछ — यो के हो र तपाईंलाई के फाइदा?",
    ],
    confidence:  0.93,
    language:    "Nepali",
    tags:        ["policy-2083", "finance", "explainer", "nepali"],
  },
  {
    aiTitle:     "Cashless Nepal, eKYC र Citizen App — बैंक जानु पर्दैन अब | 60-sec Short",
    contentType: "shorts",
    platform:    "youtube",
    brief:       "60-second vertical short explaining the three linked digital identity reforms: (1) NRB's eKYC mandate, (2) Citizen Super App for digital Nagarikta, (3) bank account opening without physical branch visit. Visual: phone screen recording walkthrough. Hook in first 3 seconds. Pure Nepali narration.",
    hooks: [
      "ब्यांकमा लाइन नलागौं अब — eKYC आयो!",
      "Nagarikta digital बनायो सरकारले — यसले के गर्न मिल्छ?",
    ],
    confidence:  0.88,
    language:    "Nepali",
    tags:        ["ekyc", "citizen-app", "cashless", "shorts"],
  },
  {
    aiTitle:     "Cooperative मा पैसा राख्नु सुरक्षित छ? — Depositor Protection Fund र NRB नियन्त्रण २०८३",
    contentType: "carousel",
    platform:    "facebook",
    brief:       "7-slide Facebook carousel targeted at cooperative depositors who lost money in the 2079-2081 crisis. Slide 1: crisis recap. Slide 2: what changed in 2083 policy. Slide 3: NPR 500M threshold — which cooperatives are now NRB-regulated. Slide 4: Depositor Protection Fund — how it works. Slide 5: what cooperative should you choose. Slide 6: warning signs of a troubled cooperative. Slide 7: CTA — share to protect your community.",
    hooks: [
      "Cooperative crisis मा लाखौं मान्छेको बचत डुब्यो — ४ वटा संकेत थाहा पाउनुस जसले बचाउँछ",
      "NRB ले cooperative regulate गर्न थाल्यो — तपाईंको पैसा कति सुरक्षित?",
    ],
    confidence:  0.90,
    language:    "Nepali",
    tags:        ["cooperative", "depositor-protection", "nrb", "carousel", "facebook"],
  },
  {
    aiTitle:     "NEPSE, Pension Fund र Mutual Fund Reform — लगानीकर्ताको गाइड २०८३/८४",
    contentType: "explainer",
    platform:    "youtube",
    brief:       "Structured explainer for existing NEPSE investors and EPF/CIT members. Three sections: (1) NEPSE modernisation — T+1 settlement, ETF, foreign investors 5% limit explained with impact on share prices; (2) EPF-CIT merger — what happens to your existing account, how to track it; (3) Pension fund equity investment increased to 10% AUM — what this means for NEPSE liquidity. Duration: 8-10 minutes. Use on-screen graphics for each data point.",
    hooks: [
      "EPF र CIT merge हुँदा तपाईंको provident fund कहाँ जान्छ?",
      "T+1 settlement — shares किन्न बेच्नमा के फरक पर्छ?",
      "Pension fund ले NEPSE मा 10% लगाउन पाउने भयो — किन यो ठूलो कुरा हो?",
    ],
    confidence:  0.91,
    language:    "Nepali",
    tags:        ["nepse", "epf", "cit", "pension-reform", "explainer", "youtube"],
  },
  {
    aiTitle:     "AI, Cloud र Startup Policy: Nepal Tech Economy को नयाँ युग — के IT कम्पनी खोल्ने बेला आयो?",
    contentType: "youtube-long",
    platform:    "youtube",
    brief:       "Deep-dive for tech entrepreneurs and developers. Covers: 10-year tax holiday mechanics (who qualifies, how to apply), NPR 2B AI Innovation Fund (how to access it), buy-local government preference (which contracts are available), remote work framework (how to legally work for foreign companies). Guest angle: interview with a Nepal IT company founder who has already applied for National Strategic Industry status. Duration: 12-15 minutes.",
    hooks: [
      "Nepal ma IT company kholda 10 saal tax tirnu pardaina — yesto suvidha kahilyai thiena",
      "Sarkaarle NPR 2 Arab AI fund banayo — startup founders le kasto garna parchha?",
      "Remote work Nepal ma legal bhayo — 5 lakh Nepali ko life change hunchha",
    ],
    confidence:  0.85,
    language:    "Mixed (Nepali/English)",
    tags:        ["tech", "startup", "ai", "remote-work", "youtube-long", "it-policy"],
  },
];

// ─── Signal routing ───────────────────────────────────────────────────────────

async function loadActiveRoutes() {
  const snap = await db.collection("signal_routes")
    .where("active", "==", true)
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function matchRoutes(signal, routes) {
  const text         = `${signal.title} ${signal.summary}`.toLowerCase();
  const signalSector = (signal.sectorId || "").toLowerCase();
  const signalTopics = new Set((signal.taxonomyTags || []).map(t => t.topicId));
  const relevance    = signal.relevanceScore ?? 0.5;

  const matches = [];

  for (const route of routes) {
    if (relevance < (route.minRelevanceScore ?? 0)) continue;

    const matchedKeywords = (route.keywords || []).filter(kw => text.includes(kw.toLowerCase()));
    const matchedSectors  = signalSector && (route.sectorIds || []).includes(signalSector) ? [signalSector] : [];
    const matchedTopics   = (route.topicIds || []).filter(t => signalTopics.has(t));

    const keywordHit =
      (route.keywords || []).length === 0 ||
      (route.matchMode === "all"
        ? matchedKeywords.length === (route.keywords || []).length
        : matchedKeywords.length > 0);

    if (!keywordHit && matchedSectors.length === 0 && matchedTopics.length === 0) continue;

    matches.push({ route, matchedKeywords, matchedSectors, matchedTopics });
  }

  return matches;
}

async function executeRoute(route, signal, signalId, ownerId) {
  const now     = new Date().toISOString();

  switch (route.destination) {
    case "content_queue": {
      const ref = db.collection("vault_content_queue").doc();
      await ref.set({
        id:             ref.id,
        ownerId,
        aiTitle:        `[Route] ${signal.title}`,
        contentType:    route.contentType || "explainer",
        platform:       route.platform    || "youtube",
        brief:          signal.summary,
        hooks:          signal.contentIdeas || [],
        tags:           [...(route.autoTags || []), ...(signal.tags || [])],
        sourceSignalId: signalId,
        confidence:     signal.relevanceScore ?? 0.5,
        status:         "pending",
        createdAt:      now,
        updatedAt:      now,
      });
      console.log(`       → content_queue: ${ref.id}`);
      break;
    }
    case "market_rate_suggest": {
      const ref = db.collection("market_rate_suggestions").doc();
      await ref.set({
        id: ref.id, routeId: route.id, signalId,
        signalTitle: signal.title, signalUrl: signal.sourceUrl || "",
        context: signal.summary, reviewedBy: null, reviewedAt: null,
        publishStatus: "draft", createdAt: now, updatedAt: now,
      });
      console.log(`       → market_rate_suggestions: ${ref.id}`);
      break;
    }
    case "scheme_suggest": {
      const ref = db.collection("scheme_suggestions").doc();
      await ref.set({
        id: ref.id, routeId: route.id, signalId,
        signalTitle: signal.title, signalUrl: signal.sourceUrl || "",
        context: signal.summary, targetSchemeId: null, suggestedFields: {},
        reviewedBy: null, reviewedAt: null,
        publishStatus: "draft", createdAt: now, updatedAt: now,
      });
      console.log(`       → scheme_suggestions: ${ref.id}`);
      break;
    }
    case "intelligence_flag": {
      await db.collection("source_signals").doc(signalId).update({
        status: "validated", updatedAt: now,
      });
      console.log(`       → intelligence_flag: signal ${signalId} validated`);
      break;
    }
    default:
      console.warn(`       ⚠ Unknown destination: ${route.destination}`);
  }

  // Increment route match counter
  await db.collection("signal_routes").doc(route.id).update({
    lastMatchAt: now,
    matchCount:  admin.firestore.FieldValue.increment(1),
  }).catch(() => {});
}

// ─── Resolve owner ────────────────────────────────────────────────────────────

function resolveOwnerId() {
  // OWNER_ID env var overrides dev UID (used when reconnecting real auth)
  const uid = process.env.OWNER_ID || DEV_OWNER_ID;
  if (uid === DEV_OWNER_ID) console.log(`  Dev mode — ownerId: ${DEV_OWNER_ID}`);
  return uid;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  ZZC Policy Signal Seeder — Nepal Govt Policy FY 2083/84");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const ownerId = resolveOwnerId();
  console.log(`Owner UID: ${ownerId}\n`);

  // ── Step 1: Write IntelligenceDocument ─────────────────────────────────────
  console.log("Step 1 — Writing IntelligenceDocument…");
  const docRef = db.collection("vault_intelligence_docs").doc();
  const intelligenceDoc = {
    id:               docRef.id,
    ownerId,
    title:            SOURCE_DOC_TITLE,
    description:      "Nepal Government's 100-point policy programme for fiscal year 2083/84 (2026/27). Covers digital economy, capital markets, cooperative regulation, pension reform, employment, investment liberalisation, AML/CFT, eGovernance, and energy policy. Seeded directly — PDF available at Ministry of Finance website.",
    fileName:         SOURCE_DOC_FILENAME,
    fileType:         "pdf",
    mimeType:         "application/pdf",
    fileSize:         0,            // seeded without binary upload
    storagePath:      "",           // no Firebase Storage object
    downloadUrl:      POLICY_URL,
    folder:           "government-policy",
    tags:             ["government-policy", "budget-2083", "nepal", "finance-ministry", "100-point"],
    category:         "intelligence",
    processingStatus: "ai_ready",
    adminApprovalStatus: "pending_review",
    aiSummary:        "The Nepal Government's 100-point policy programme for FY 2083/84 is a comprehensive financial and digital reform agenda. Key financial sector changes: NRB expands regulatory perimeter to cooperatives (NPR 500M+ threshold), EPF and CIT merge into a unified retirement fund, NEPSE modernises with T+1 settlement and ETF products, and a Remittance-Investment Matching Fund is created. Digital economy pillars: eKYC mandate, Citizen Super App, cashless payment targets. Foreign investment: Nepal Investment Visa threshold lowered to USD 100,000, FDI clearance simplified. Technology: IT/AI/Cloud declared National Strategic Industries with 10-year tax holiday. AML/CFT: dedicated FIU under NRB established ahead of FATF review.",
    aiKeyInsights: [
      "NRB gains oversight of cooperatives above NPR 500M — first formal prudential regulation of large cooperatives",
      "EPF-CIT merger creates NPR 500B+ retirement fund — major NEPSE liquidity implication",
      "ETF and T+1 settlement announced — NEPSE modernisation enters new phase",
      "Nepal Investment Visa lowered from USD 300K to USD 100K — opens diaspora investment",
      "10-year tax holiday for IT/AI companies — most aggressive tech incentive Nepal has offered",
      "Remote work legally defined for first time — 500,000 informal cross-border workers gain protection",
      "FIU established under NRB — AML/CFT structural change ahead of FATF review",
      "Citizen Super App + eKYC by Baisakh 2084 — physical branch visit no longer required for account opening",
    ],
    detectedTopics:  [
      "cashless payment", "digital economy", "NEPSE", "ETF", "mutual fund", "T+1 settlement",
      "cooperative regulation", "depositor protection", "NRB policy", "eKYC", "digital identity",
      "citizen app", "EPF", "CIT", "SSF", "pension reform", "social security",
      "AML", "CFT", "FATF", "FIU", "IT policy", "AI", "startup", "tax incentive",
      "remote work", "employment", "remittance", "NRN investment", "FDI", "hydropower",
    ],
    contentIdeas: [
      "YouTube Long: सरकारको नयाँ नीति २०८३/८४ ले तपाईंको पैसामा के असर पार्छ?",
      "YouTube Short: Cashless Nepal, eKYC र Citizen App — बैंक जानु पर्दैन अब",
      "Facebook Carousel: Cooperative मा पैसा राख्नु सुरक्षित छ? — नयाँ २०८३ नियम",
      "YouTube Explainer: NEPSE, Pension Fund र Mutual Fund Reform",
      "YouTube Long: AI, Cloud र Startup Policy — Nepal Tech Economy को नयाँ युग",
    ],
    language:        "Nepali",
    confidence:      0.94,
    pageCount:       42,
    uploadedAt:      NOW,
    updatedAt:       NOW,
  };
  await docRef.set(intelligenceDoc);
  const docId = docRef.id;
  console.log(`  ✓ IntelligenceDocument: ${docId}\n`);

  // ── Step 2: Load active routes ──────────────────────────────────────────────
  const routes = await loadActiveRoutes();
  console.log(`Step 2 — Loaded ${routes.length} active signal route(s)\n`);

  // ── Step 3: Write SourceSignals ─────────────────────────────────────────────
  console.log("Step 3 — Writing 12 SourceSignals…");
  const signalIds = [];

  for (let i = 0; i < POLICY_SIGNALS.length; i++) {
    const sig    = POLICY_SIGNALS[i];
    const sigRef = db.collection("source_signals").doc();

    const signal = {
      id:             sigRef.id,
      ownerId,
      sourceUrl:      POLICY_URL,
      sourceType:     "uploaded_document",
      sourceName:     "Nepal Government Policy FY 2083/84",
      title:          sig.title,
      summary:        sig.summary,
      body:           sig.body,
      publishedAt:    "2083-01-01",     // approximate Nepali calendar date
      sectorId:       sig.sectorId,
      taxonomyTags:   sig.taxonomyTags,
      status:         "raw",
      topics:         sig.topics,
      tags:           sig.tags,
      relevanceScore: sig.relevanceScore,
      credibility:    sig.credibility,
      aiInsights:     sig.aiInsights,
      contentIdeas:   sig.contentIdeas,
      sourceDocId:    docId,
      createdAt:      NOW,
      updatedAt:      NOW,
    };

    await sigRef.set(signal);
    signalIds.push(sigRef.id);
    console.log(`  [${i + 1}/12] ✓ ${sigRef.id}`);
    console.log(`         "${sig.title.slice(0, 70)}…"`);

    // Run routing engine per signal
    if (routes.length > 0) {
      const matches = matchRoutes(signal, routes);
      if (matches.length > 0) {
        console.log(`         ◈ ${matches.length} route(s) matched:`);
        for (const { route } of matches) {
          console.log(`         ↪ ${route.name} → ${route.destination}`);
          try {
            await executeRoute(route, signal, sigRef.id, ownerId);
          } catch (err) {
            console.error(`         ✗ Route failed: ${err.message}`);
          }
        }
      }
    }
  }

  // ── Step 4: Write content queue drafts ──────────────────────────────────────
  console.log(`\nStep 4 — Writing ${CONTENT_QUEUE_DRAFTS.length} content queue drafts…`);
  const queueIds = [];

  for (let i = 0; i < CONTENT_QUEUE_DRAFTS.length; i++) {
    const draft  = CONTENT_QUEUE_DRAFTS[i];
    const qRef   = db.collection("vault_content_queue").doc();

    const queueItem = {
      id:                qRef.id,
      ownerId,
      aiTitle:           draft.aiTitle,
      contentType:       draft.contentType,
      platform:          draft.platform,
      brief:             draft.brief,
      hooks:             draft.hooks,
      tags:              draft.tags,
      sourceDocId:       docId,
      sourceDocTitle:    SOURCE_DOC_TITLE,
      sourceDocUrl:      POLICY_URL,
      sourceDocFileName: SOURCE_DOC_FILENAME,
      sourceInsights:    intelligenceDoc.aiKeyInsights,
      sourceUploadedAt:  NOW,
      confidence:        draft.confidence,
      language:          draft.language,
      status:            "pending",
      adminNotes:        "",
      expiresAt:         EXPIRES_AT,
      createdAt:         NOW,
      updatedAt:         NOW,
    };

    await qRef.set(queueItem);
    queueIds.push(qRef.id);
    console.log(`  [${i + 1}/5] ✓ ${qRef.id}`);
    console.log(`         "${draft.aiTitle.slice(0, 70)}"`);
    console.log(`         ${draft.contentType} | ${draft.platform}`);
  }

  // ── Step 5: Update IntelligenceDoc with signal IDs ─────────────────────────
  await docRef.update({
    sourceSignalIds: signalIds,
    contentQueueIds: queueIds,
    updatedAt:       new Date().toISOString(),
  });

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  Pipeline Trace");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Intelligence Document : ${docId}`);
  console.log(`  Source Signals        : ${signalIds.length}`);
  signalIds.forEach((id, i) => console.log(`    [${i + 1}] ${id}`));
  console.log(`  Content Queue Drafts  : ${queueIds.length}`);
  queueIds.forEach((id, i) => console.log(`    [${i + 1}] ${id}`));
  console.log("\n  Status: All items in draft/pending_review — no auto-publish.");
  console.log("  Next: Review in Admin Vault → vault/admin?tab=documents");
  console.log("═══════════════════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
