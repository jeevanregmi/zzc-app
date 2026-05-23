"use strict";
/**
 * ZZC Policy Points Seeder — Nepal Government नीति तथा कार्यक्रम FY 2083/84
 *
 * Seeds vault_policy_points with all 100 policy points from the President's
 * address to the joint session of Federal Parliament.
 *
 * Run:
 *   node scripts/seed-policy-points.js
 *   node scripts/seed-policy-points.js --prod   (uses serviceAccountKey-prod.json)
 *
 * All points seeded with:
 *   ownerId:       dev-zzc-pipeline-2026
 *   publishToJanta: true
 *   parentDocId:   nepal-niti-2083-84  (static ID for cross-referencing)
 */

const { initFirebase } = require("./_firebase-init");
const { DEV_OWNER_ID } = require("./_dev-config");

const admin = initFirebase();
const db    = admin.firestore();

const NOW            = new Date().toISOString();
const PARENT_DOC_ID  = "nepal-niti-2083-84";
const PARENT_DOC_TITLE = "नेपाल सरकारको आर्थिक वर्ष २०८३-८४ को नीति तथा कार्यक्रम";

// ─── 100 Policy Points ────────────────────────────────────────────────────────
// Language: flowing Nepali + technical terms in English parentheses
// Format:   bilingual, simple enough for 18-35 year old Nepali youth

const POLICY_POINTS = [

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 1: सुशासन र कानुनी राज (Good Governance & Rule of Law) — 1-10
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 1,
    title: "भ्रष्टाचार विरुद्ध कडा कारबाही",
    simpleSummary: "सरकारले भ्रष्टाचार (Corruption) विरुद्ध शून्य सहिष्णुता (Zero Tolerance) नीति अपनाउनेछ। CIAA र अख्तियार दुरुपयोग अनुसन्धान आयोग (Commission for Investigation of Abuse of Authority) लाई थप अधिकार दिइनेछ। सरकारी कार्यालयमा डिजिटल अनुगमन (Digital Monitoring) प्रणाली अनिवार्य गरिनेछ।",
    youthImpact: "सरकारी सेवा लिन घुस दिनु नपर्ने वातावरण बन्नेछ — यसले तपाईंको व्यवसाय दर्ता, पासपोर्ट, र सरकारी काम सजिलो हुनेछ।",
    keyFact: "सरकारी सेवाको ९५% Online मार्फत उपलब्ध गराउने लक्ष्य FY २०८४/८५ सम्म।",
    sectors: ["governance", "legal", "digital"],
  },
  {
    pointNumber: 2,
    title: "न्यायपालिका स्वतन्त्रता र सुधार",
    simpleSummary: "न्यायपालिका (Judiciary) लाई पूर्ण स्वतन्त्र र छिटो बनाउने नीति। अदालतमा मुद्दा फर्स्योट (Case Disposal) को समयसीमा निर्धारण गरिनेछ। E-Court प्रणाली मार्फत तपाईं घरबाटै मुद्दाको अवस्था हेर्न सक्नुहुनेछ।",
    youthImpact: "व्यापारिक विवाद (Commercial Dispute) ६ महिनाभित्र टुंग्याउने लक्ष्य — उद्यमशीलता (Entrepreneurship) को लागि ठूलो राहत।",
    keyFact: "अदालतमा थन्किएका ३ लाखभन्दा बढी मुद्दा २ वर्षभित्र फर्छ्यौट गर्ने लक्ष्य।",
    sectors: ["governance", "legal"],
  },
  {
    pointNumber: 3,
    title: "संघीयता कार्यान्वयन — स्थानीय सरकार बलियो",
    simpleSummary: "संघीय प्रणाली (Federal System) अन्तर्गत स्थानीय सरकार (Local Government) लाई थप अधिकार र बजेट दिइनेछ। ७५३ स्थानीय तहले आफ्नै विकास योजना र कर नीति (Tax Policy) बनाउन पाउनेछन्। अन्तर-सरकारी वित्त व्यवस्थापन (Intergovernmental Finance) सुदृढ गरिनेछ।",
    youthImpact: "तपाईंको गाउँ वा नगरले आफ्नै बजेट खर्च गर्न पाउने — स्थानीय रोजगारी र सेवाहरू बढ्नेछन्।",
    keyFact: "स्थानीय सरकारको बजेट हिस्सा राष्ट्रिय बजेटको २०% बाट बढाएर २५% पुर्‍याइनेछ।",
    sectors: ["governance", "economy"],
  },
  {
    pointNumber: 4,
    title: "सार्वजनिक खरिद पारदर्शिता",
    simpleSummary: "सरकारी खरिद (Public Procurement) पूर्ण अनलाइन र पारदर्शी बनाइनेछ। ई-बिडिङ (E-Bidding) अनिवार्य हुनेछ — कागजी टेन्डर हटाइनेछ। खरिद प्रक्रियामा भ्रष्टाचार रोक्न Blockchain Technology प्रयोग गरिनेछ।",
    youthImpact: "साना उद्यमी (Small Entrepreneur) र Startup हरूले सरकारी ठेक्का पाउन सजिलो हुनेछ — पहुँच सबैलाई बराबर।",
    keyFact: "सरकारी खरिदको वार्षिक मूल्य रु. ५०० अर्बभन्दा बढी — यसको ३०% सानो व्यवसायलाई आरक्षित।",
    sectors: ["governance", "economy"],
  },
  {
    pointNumber: 5,
    title: "एकल खिडकी — सबै सेवा एकै ठाउँ",
    simpleSummary: "One Stop Centre मार्फत कम्पनी दर्ता (Company Registration), PAN/VAT, Import/Export License लगायत सबै सरकारी सेवा एकै ठाउँबाट पाइनेछ। Baisakh 2084 सम्म सबै permit र license Online उपलब्ध हुनेछ।",
    youthImpact: "व्यवसाय सुरु गर्न धेरै कार्यालय धाउनु पर्दैन — ७ कार्य दिनमा सबै काम सकिनेछ।",
    keyFact: "अहिले कम्पनी दर्तामा ४५-६० दिन लाग्छ — नयाँ व्यवस्थामा ७ दिनमा सकिनेछ।",
    sectors: ["governance", "economy", "digital"],
  },
  {
    pointNumber: 6,
    title: "राष्ट्रिय परिचयपत्र र eKYC",
    simpleSummary: "राष्ट्रिय परिचयपत्र (National ID Card) र Biometric Data को आधारमा eKYC (Electronic Know Your Customer) प्रणाली लागू हुनेछ। बैंकमा Account खोल्न, SIM लिन, वा सरकारी सेवा लिन Physical उपस्थिति नचाहिने हुनेछ।",
    youthImpact: "घरबाटै Mobile App मार्फत Bank Account खोल्न सकिनेछ — ग्रामीण युवाको लागि ऐतिहासिक परिवर्तन।",
    keyFact: "Beta by Poush 2083, पूर्ण कार्यान्वयन Baisakh 2084 सम्म — २७ वाणिज्य बैंकमा लागू।",
    sectors: ["governance", "banking", "digital"],
  },
  {
    pointNumber: 7,
    title: "सूचनाको हक — सार्वजनिक डेटा खुला",
    simpleSummary: "सरकारी डेटा (Government Data) सार्वजनिक गरिनेछ — Open Data Policy लागू हुनेछ। नागरिकले सरकारी निर्णय र खर्चको जानकारी Online प्राप्त गर्न सक्नेछन्।",
    youthImpact: "Journalist, Researcher, र Developer हरूले सरकारी डेटा Free मा Download गर्न पाउनेछन् — Civic Tech को ढोका खुल्नेछ।",
    keyFact: "सरकारी वेबसाइटहरूमा Open Data API Baisakh 2084 भित्र उपलब्ध गराइनेछ।",
    sectors: ["governance", "digital", "legal"],
  },
  {
    pointNumber: 8,
    title: "मानवअधिकार संरक्षण सुदृढीकरण",
    simpleSummary: "राष्ट्रिय मानवअधिकार आयोग (National Human Rights Commission) लाई स्वतन्त्र र बलियो बनाइनेछ। जातिय भेदभाव (Caste Discrimination), लैंगिक हिंसा (Gender Violence) विरुद्ध कडा कानुन लागू गरिनेछ।",
    youthImpact: "दलित युवा र महिलाहरूले समान अवसर पाउने कानुनी संरचना बलियो हुनेछ।",
    keyFact: "मानवअधिकार उल्लंघनमा ६ महिनाभित्र सुनुवाई सुनिश्चित गरिनेछ।",
    sectors: ["governance", "legal", "youth", "women"],
  },
  {
    pointNumber: 9,
    title: "सञ्चार र प्रेस स्वतन्त्रता",
    simpleSummary: "स्वतन्त्र पत्रकारिता (Free Press) र Digital Media को संरक्षण गरिनेछ। Online Content Regulation को नाममा अभिव्यक्ति स्वतन्त्रता (Freedom of Expression) कुण्ठित नहुने प्रतिबद्धता।",
    youthImpact: "Youth Journalist र Content Creator हरूलाई कानुनी सुरक्षा — Digital Media मा काम गर्न सजिलो।",
    keyFact: "Media Council ले सामाजिक सञ्जाल (Social Media) सम्बन्धी नयाँ नियमावली FY 2083/84 मा जारी गर्नेछ।",
    sectors: ["governance", "digital", "legal"],
  },
  {
    pointNumber: 10,
    title: "राजस्व प्रशासन र कर सुधार",
    simpleSummary: "कर प्रणाली (Tax System) सरल र पारदर्शी बनाइनेछ। Income Tax, VAT, र Custom Duty को Online Filing अनिवार्य हुनेछ। कर चोरी रोक्न AI-based Audit System प्रयोग गरिनेछ।",
    youthImpact: "Freelancer र Startup ले Online मार्फत सजिलैसँग Tax File गर्न सक्नेछन् — Compliance बोझ घट्नेछ।",
    keyFact: "कर दायरा बढाएर थप ५ लाख व्यक्तिलाई Formal Tax Net भित्र ल्याउने लक्ष्य।",
    sectors: ["governance", "economy", "digital"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 2: अर्थतन्त्र र वित्त (Economy & Finance) — 11-25
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 11,
    title: "GDP वृद्धि दर — ७% लक्ष्य",
    simpleSummary: "GDP (Gross Domestic Product) वृद्धि दर ७% पुर्‍याउने लक्ष्य राखिएको छ। विदेशी लगानी (Foreign Direct Investment — FDI) आकर्षित गर्न Investment Friendly वातावरण बनाइनेछ।",
    youthImpact: "GDP वृद्धिले नयाँ रोजगारी सिर्जना हुन्छ — तपाईंको Job Market राम्रो हुनेछ।",
    keyFact: "FY 2083/84 को GDP वृद्धि लक्ष्य: ७% (अघिल्लो वर्ष ५.५%)।",
    sectors: ["economy"],
  },
  {
    pointNumber: 12,
    title: "Nepal Investment Visa — USD १ लाखमा",
    simpleSummary: "विदेशी र NRN (Non-Resident Nepali) लगानीकर्तालाई Nepal Investment Visa दिइनेछ। लगानीको न्यूनतम सीमा USD ३ लाखबाट घटाएर USD १ लाख (करिब रु. १.३ करोड) पुर्‍याइएको छ। Visa धारकले परिवार ल्याउन र नागरिकसरह सेवा पाउने छन्।",
    youthImpact: "विदेशमा रहेका Nepali दाजुभाइ दिदीबहिनीले सजिलैसँग Nepal मा लगानी गर्न सक्नेछन्।",
    keyFact: "Minimum Investment: USD १,००,००० (रु. ~१.३ करोड) — आधा गरियो।",
    sectors: ["economy", "governance"],
  },
  {
    pointNumber: 13,
    title: "FDI स्वतः स्वीकृति — रु. ५ अर्बसम्म",
    simpleSummary: "विदेशी लगानी (FDI — Foreign Direct Investment) को Automatic Approval सीमा रु. १ अर्बबाट बढाएर रु. ५ अर्ब गरिएको छ। यसले ठूला विदेशी कम्पनीहरूले Nepal मा Invest गर्न सरकारी अनुमति कुर्नु नपर्ने हुनेछ।",
    youthImpact: "ठूला Multinational Company Nepal आउँदा हजारौं राम्रा Job Create हुनेछन्।",
    keyFact: "FDI Automatic Clearance Threshold: रु. १ अर्ब → रु. ५ अर्ब।",
    sectors: ["economy", "governance"],
  },
  {
    pointNumber: 14,
    title: "Digital Economy र Cashless Nepal",
    simpleSummary: "Cashless Nepal अभियान अन्तर्गत NRB ले QR Payment Infrastructure सबै Municipality मा विस्तार गर्नेछ। १०+ कर्मचारी भएका Formal Sector का Employer ले Digital मार्फत तलब दिनु अनिवार्य हुनेछ। Mobile Wallet Interoperability लागू हुनेछ — जुनसुकै Wallet बाट कहीं पनि Payment।",
    youthImpact: "तपाईंको तलब Digital मा पाउनुहुनेछ — ATM लाइनको झमेला सकिनेछ।",
    keyFact: "FY 2084/85 सम्म ७०% Consumer Transaction Digital हुने लक्ष्य।",
    sectors: ["economy", "banking", "digital"],
  },
  {
    pointNumber: 15,
    title: "NEPSE आधुनिकीकरण — T+1 Settlement",
    simpleSummary: "NEPSE (Nepal Stock Exchange) को Trading System Upgrade हुनेछ। Share किनबेच गरेको भोलिपल्टै Settlement हुने T+1 प्रणाली लागू हुनेछ — अहिले T+3 लाग्छ। विदेशी Portfolio Investor हरूले Listed Company को ५% सम्म Share किन्न पाउनेछन्।",
    youthImpact: "Share बेचेको पैसा अगाडि २ दिन ढिलो आउँथ्यो — अब भोलिपल्टै Bank Account मा।",
    keyFact: "Settlement: T+3 → T+1 — NEPSE इतिहासकै ठूलो Operational Reform।",
    sectors: ["economy", "banking"],
  },
  {
    pointNumber: 16,
    title: "ETF र Mutual Fund विस्तार",
    simpleSummary: "SEBON ले कम्तीमा ३ वटा नयाँ ETF (Exchange Traded Fund) उत्पादन FY 2083/84 मध्यसम्म अनुमोदन गर्नेछ। Mutual Fund कम्पनीहरूले International Fund-of-Funds Launch गर्न पाउनेछन्। Retail Investor Protection Fund स्थापना हुनेछ।",
    youthImpact: "सिधै Stock नकिनी ETF मार्फत NEPSE मा लगानी गर्न पाइनेछ — कम जोखिम, विविध Portfolio।",
    keyFact: "Nepal मा पहिलो पटक ETF — Index-Tracking Investment Product आउँदैछ।",
    sectors: ["economy", "banking"],
  },
  {
    pointNumber: 17,
    title: "Cooperative नियमन — NRB अधिकार",
    simpleSummary: "रु. ५० करोडभन्दा बढी Deposit भएका Cooperative हरू NRB (Nepal Rastra Bank) को नियमनमा आउनेछन्। Depositor Protection Fund स्थापना हुनेछ — प्रत्येक Cooperative ले वार्षिक Deposit को ०.५% जम्मा गर्नुपर्नेछ।",
    youthImpact: "Cooperative मा राखेको तपाईंको बचत सुरक्षित हुनेछ — Crisis मा सरकारको ग्यारेन्टी।",
    keyFact: "Cooperative Crisis 2079-2081 मा रु. ६० अर्ब Deposit फ्रिज भएको थियो — यो नीतिले रोक्नेछ।",
    sectors: ["economy", "banking", "governance"],
  },
  {
    pointNumber: 18,
    title: "EPF–CIT मर्जर — राष्ट्रिय Retirement Fund",
    simpleSummary: "EPF (Employees Provident Fund) र CIT (Citizen Investment Trust) लाई 'राष्ट्रिय कर्मचारी सेवानिवृत्ति कोष (National Employees Retirement Fund)' मा मर्ज गरिनेछ। EPF सदस्यले ५० वर्षको उमेरमा ५०% रकम घरखरिद वा उपचारको लागि झिक्न पाउनेछन्।",
    youthImpact: "तपाईंको Provident Fund ठूलो र सुरक्षित संस्थामा रहनेछ — Retirement पछि राम्रो जीवन।",
    keyFact: "Merged Fund को कुल Asset: रु. ५०० अर्बभन्दा बढी — Nepal कै ठूलो Fund।",
    sectors: ["economy", "employment", "banking"],
  },
  {
    pointNumber: 19,
    title: "SSF — Self-Employed मा विस्तार",
    simpleSummary: "SSF (Social Security Fund) को अनिवार्य Coverage मासिक रु. २५,०००भन्दा बढी कमाउने Self-Employed व्यक्तिमा समेत विस्तार हुनेछ। Informal Sector का करिब ४० लाख कामदारले पहिलो पटक Social Security पाउनेछन्।",
    youthImpact: "Freelancer, Driver, Shopkeeper — अनौपचारिक काम गर्नेहरूले पनि Pension र Medical Coverage पाउनेछन्।",
    keyFact: "SSF मा थप ४० लाख Self-Employed Worker थपिनेछन् — नेपाल इतिहासकै ठूलो Social Security विस्तार।",
    sectors: ["employment", "economy", "governance"],
  },
  {
    pointNumber: 20,
    title: "Remittance–Investment Matching Fund",
    simpleSummary: "विदेशबाट पठाएको Remittance (विप्रेषण) लाई Priority Sector (Hydropower, Agro-processing, IT) मा Invest गरे सरकारले रु. ५० लाखसम्म थप दिनेछ — 1:1 Matching। यो Fund NRB ले व्यवस्थापन गर्नेछ।",
    youthImpact: "विदेशमा कमाएको पैसा Nepal मा Invest गर्दा Double हुनेछ — Remittance लाई Productive Investment मा रूपान्तरण।",
    keyFact: "Fund Capitalisation: रु. १,००० करोड FY 2083/84 मा — ~२,००० NRN Investor लाई उपलब्ध।",
    sectors: ["economy", "governance"],
  },
  {
    pointNumber: 21,
    title: "AML/CFT — Financial Intelligence Unit",
    simpleSummary: "NRB अन्तर्गत स्वतन्त्र Financial Intelligence Unit (FIU) स्थापना हुनेछ। Beneficial Ownership Threshold २५% बाट घटाएर १०% गरिनेछ। Crypto Exchange र Wallet हरू NRB मा अनिवार्य दर्ता हुनुपर्नेछ।",
    youthImpact: "Crypto Nepal मा पहिलो पटक Legal Framework मा आउँदैछ — Registered Exchange मार्फत Trade गर्न सक्नुहुनेछ।",
    keyFact: "Nepal को FATF Mutual Evaluation Review 2025-2026 सम्म — FIU स्थापना अनिवार्य शर्त।",
    sectors: ["economy", "banking", "digital", "governance"],
  },
  {
    pointNumber: 22,
    title: "Universal Pension — ७० वर्षमाथि सबैलाई",
    simpleSummary: "७० वर्ष (अहिले ६८) माथिका सबै नागरिकलाई मासिक रु. ३,००० Universal Pension दिइनेछ। Contributory Pension Scheme सबै नागरिकलाई उपलब्ध गराइनेछ।",
    youthImpact: "तपाईंका बाबाआमा वा हजुरबाहजुरआमाले Government Pension पाउनेछन् — परिवारको आर्थिक बोझ घट्नेछ।",
    keyFact: "Universal Pension उमेर: ६८ → ७० वर्ष। मासिक रकम: रु. ३,०००।",
    sectors: ["economy", "governance", "youth"],
  },
  {
    pointNumber: 23,
    title: "Pension Fund — Equity Investment बढ्यो",
    simpleSummary: "EPF, CIT, र SSF जस्ता Pension Fund हरूले आफ्नो कुल Asset (AUM — Assets Under Management) को १०% (अघिल्लो ५%) सम्म Listed Equity मा Invest गर्न पाउनेछन्।",
    youthImpact: "NEPSE मा ठूलो Institutional Money आउँदा Share Price Stable हुनेछ — तपाईंको NEPSE Investment सुरक्षित।",
    keyFact: "Pension Fund Equity Limit: ५% → १०% AUM — NEPSE मा थप रु. ५,०००+ करोड आउन सक्ने।",
    sectors: ["economy", "banking"],
  },
  {
    pointNumber: 24,
    title: "व्याजदर स्थिरता र Monetary Policy",
    simpleSummary: "NRB ले Monetary Policy (मौद्रिक नीति) मार्फत Inflation (मुद्रास्फीति) ५.५% भित्र राख्नेछ। Interest Rate (व्याजदर) स्थिर राखी Credit Flow बढाइनेछ।",
    youthImpact: "Home Loan र Education Loan को Interest Rate कम हुनेछ — घर किन्न र पढ्न सजिलो।",
    keyFact: "Inflation Target: ५.५% भित्र। Policy Rate: NRB ले मौद्रिक नीतिमा घोषणा गर्नेछ।",
    sectors: ["economy", "banking"],
  },
  {
    pointNumber: 25,
    title: "बजेट Deficit नियन्त्रण र ऋण व्यवस्थापन",
    simpleSummary: "सरकारले Fiscal Deficit (राजकोषीय घाटा) GDP को ३.५% भन्दा कम राख्नेछ। विदेशी ऋण (External Debt) मा नयाँ सीमा तोकिनेछ — टिकाउ ऋण व्यवस्थापन नीति।",
    youthImpact: "सरकारको ऋण नियन्त्रणमा रहे भविष्यमा तपाईंको पुस्तालाई Tax बढाउनु नपर्ने।",
    keyFact: "Fiscal Deficit Target: GDP को ३.५% भन्दा कम रहनेछ।",
    sectors: ["economy", "governance"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 3: कृषि र भूमि (Agriculture & Land) — 26-33
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 26,
    title: "कृषि आधुनिकीकरण — Agro-Tech",
    simpleSummary: "Agricultural Modernization (कृषि आधुनिकीकरण) अन्तर्गत Precision Farming Technology, Drone Spraying, र Smart Irrigation (स्मार्ट सिँचाइ) प्रयोग प्रोत्साहन गरिनेछ। किसानलाई Agro-Tech Subsidy (अनुदान) दिइनेछ।",
    youthImpact: "Agriculture मा Technology प्रयोग गरी युवाले आधुनिक खेती व्यवसाय गर्न सक्नेछन्।",
    keyFact: "Agro-Tech Subsidy: Drone र Smart Irrigation Equipment मा ५०% सम्म अनुदान।",
    sectors: ["agriculture", "digital", "youth"],
  },
  {
    pointNumber: 27,
    title: "खाद्य सुरक्षा — आत्मनिर्भरता",
    simpleSummary: "Food Self-Sufficiency (खाद्य आत्मनिर्भरता) हासिल गर्न Paddy, Wheat, र Maize उत्पादन बढाइनेछ। खाद्यान्न आयात (Import) घटाएर निर्यात (Export) बढाउने लक्ष्य।",
    youthImpact: "तरकारी र दाल चामलको मूल्य स्थिर हुनेछ — महँगी घट्नेछ।",
    keyFact: "धानको Minimum Support Price (MSP) रु. ४५ प्रति किलोमा तय गरिनेछ।",
    sectors: ["agriculture", "economy"],
  },
  {
    pointNumber: 28,
    title: "Cooperative खेती — सामूहिक उत्पादन",
    simpleSummary: "साना किसानलाई Cooperative Farming (सहकारी खेती) मा आबद्ध गरी ठूलो उत्पादन र राम्रो बजार दिलाइनेछ। Agro-Processing Industry (कृषि प्रशोधन उद्योग) लाई Tax छूट दिइनेछ।",
    youthImpact: "Agriculture Cooperative मा लगानी गरेमा Tax Benefit पाइनेछ — Young Farmer लाई प्रोत्साहन।",
    keyFact: "Agro-Processing Industry: ५ वर्षको Income Tax Holiday दिइनेछ।",
    sectors: ["agriculture", "economy", "youth"],
  },
  {
    pointNumber: 29,
    title: "भूमि सुधार — Ceiling र Registration",
    simpleSummary: "Land Reform (भूमि सुधार) अन्तर्गत जग्गा हदबन्दी (Land Ceiling) पुनर्मूल्यांकन र जग्गा दर्ता (Land Registration) प्रक्रिया सरल हुनेछ। कृषि जग्गा Industrial Purpose मा Convert गर्न Regulation कडा हुनेछ।",
    youthImpact: "जग्गाको कागजी झमेला घट्नेछ — Inheritance र Registration Online हुनेछ।",
    keyFact: "जग्गा दर्ता ऑनलाइन — पुरानो Manual Process हटाइनेछ।",
    sectors: ["agriculture", "governance", "legal"],
  },
  {
    pointNumber: 30,
    title: "Agriculture Loan — किसानलाई सस्तो ऋण",
    simpleSummary: "किसानलाई वार्षिक ५% व्याजदरमा Agriculture Loan (कृषि ऋण) उपलब्ध गराइनेछ। Collateral-free Loan (धितो नचाहिने ऋण) सीमा रु. ५ लाखसम्म हुनेछ।",
    youthImpact: "Young Farmer ले धितो बिना ऋण पाउनेछन् — खेतीमा व्यवसाय सुरु गर्न सजिलो।",
    keyFact: "Agriculture Loan Interest Rate: ५% प्रति वर्ष। Collateral-free Limit: रु. ५ लाख।",
    sectors: ["agriculture", "banking", "youth"],
  },
  {
    pointNumber: 31,
    title: "पशुपालन र मत्स्यपालन — Blue Economy",
    simpleSummary: "Livestock (पशुपालन) र Fishery (मत्स्यपालन) व्यवसाय प्रोत्साहन गरिनेछ। Commercial Fish Farming (व्यावसायिक माछापालन) मा Subsidy र Technical Training दिइनेछ।",
    youthImpact: "माछापालन र कुखुरापालन व्यवसायमा सरकारी अनुदान पाउन सकिनेछ — Rural Youth को लागि अवसर।",
    keyFact: "Fishery Sector मा रु. ५ अर्ब Investment Target — ५०,००० थप रोजगारी।",
    sectors: ["agriculture", "economy"],
  },
  {
    pointNumber: 32,
    title: "कृषि बीमा — जोखिम व्यवस्थापन",
    simpleSummary: "Crop Insurance (बाली बीमा) र Livestock Insurance (पशु बीमा) अनिवार्य गरिनेछ। Premium (बीमा शुल्क) मा सरकारले ७५% Subsidy दिनेछ — किसानले २५% मात्र तिर्नु पर्नेछ।",
    youthImpact: "बाढी वा खडेरीले बाली नष्ट भए पनि Insurance ले क्षतिपूर्ति दिनेछ।",
    keyFact: "बाली बीमा Premium: सरकारले ७५% व्यहोर्नेछ। किसानको भाग: २५% मात्र।",
    sectors: ["agriculture", "banking", "governance"],
  },
  {
    pointNumber: 33,
    title: "Organic Farming र Export",
    simpleSummary: "Organic Farming (जैविक खेती) लाई राष्ट्रिय प्राथमिकता दिइनेछ। Organic Certification (प्रमाणीकरण) र Export Market Access सहज बनाइनेछ। European र Japanese Market मा Nepali Organic Products पुर्‍याउने लक्ष्य।",
    youthImpact: "Organic Farmer ले विदेशमा राम्रो मूल्यमा बेच्न पाउनेछन् — Agriculture Export Business को अवसर।",
    keyFact: "Organic Product Export Target: FY 2083/84 मा रु. ५०० करोड।",
    sectors: ["agriculture", "economy"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 4: वन, वातावरण र जलस्रोत — 34-40
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 34,
    title: "Climate Change — हरित अर्थतन्त्र",
    simpleSummary: "Climate Change (जलवायु परिवर्तन) अनुकूलन र न्यूनीकरणका लागि 'Green Economy (हरित अर्थतन्त्र)' नीति अपनाइनेछ। Carbon Credit (कार्बन क्रेडिट) बजार विकास गरी विदेशी आय बढाइनेछ।",
    youthImpact: "Green Jobs मा काम गर्ने अवसर — Environment Sector नयाँ Career Field बन्नेछ।",
    keyFact: "Nepal ले Carbon Neutral बन्ने लक्ष्य: २०५०। Carbon Credit बिक्रीबाट वार्षिक USD ५ करोड आय लक्ष्य।",
    sectors: ["environment", "economy"],
  },
  {
    pointNumber: 35,
    title: "वन संरक्षण र Community Forest",
    simpleSummary: "Community Forest (सामुदायिक वन) कार्यक्रम विस्तार गरिनेछ। वन विनाश (Deforestation) रोक्न कडा कानुन लागू हुनेछ। Agro-Forestry (कृषि वानिकी) लाई प्रोत्साहन दिइनेछ।",
    youthImpact: "Community Forest को आम्दानी स्थानीय समुदायकै हुनेछ — Rural Youth को आय बढ्नेछ।",
    keyFact: "Nepal को वन क्षेत्र ४४.७% — विश्वकै सर्वाधिक वन भएका देशमध्ये एक।",
    sectors: ["environment", "agriculture"],
  },
  {
    pointNumber: 36,
    title: "सिँचाइ विस्तार — खेतसम्म पानी",
    simpleSummary: "Irrigation (सिँचाइ) सुविधा खेती गर्ने जग्गाको ७०% मा पुर्‍याउने लक्ष्य। Drip Irrigation (थोपा सिँचाइ) र Sprinkler System मा Subsidy दिइनेछ।",
    youthImpact: "वर्षमा एक बालीको सट्टा दुई-तीन बाली गर्न सकिनेछ — किसान परिवारको आय बढ्नेछ।",
    keyFact: "सिँचाइ Coverage: ५५% → ७०% FY 2083/84 सम्म। Investment: रु. ३०० करोड।",
    sectors: ["agriculture", "environment", "infrastructure"],
  },
  {
    pointNumber: 37,
    title: "खानेपानी — सबैलाई सफा पानी",
    simpleSummary: "Clean Drinking Water (खानेपानी) सबै नागरिकलाई उपलब्ध गराउने लक्ष्य। ग्रामीण क्षेत्रमा Piped Water Supply प्रणाली विस्तार गरिनेछ। Water Quality Testing अनिवार्य गरिनेछ।",
    youthImpact: "ग्रामीण क्षेत्रमा पनि घरमै धारा आउने — महिला र बालिकाहरूले पानी भर्न घण्टौं नहिंड्ने।",
    keyFact: "Safe Drinking Water Access: ८५% → ९५% FY 2083/84 सम्म।",
    sectors: ["infrastructure", "environment", "governance"],
  },
  {
    pointNumber: 38,
    title: "Disaster Risk Reduction — भूकम्प र बाढी",
    simpleSummary: "Disaster Risk Reduction (विपद् जोखिम न्यूनीकरण) नीति अन्तर्गत भूकम्प प्रतिरोधी (Earthquake-Resistant) भवन निर्माण अनिवार्य गरिनेछ। Early Warning System (पूर्व सूचना प्रणाली) विस्तार हुनेछ।",
    youthImpact: "नयाँ घर बनाउँदा Earthquake-Resistant Design अनिवार्य — भविष्यमा सुरक्षित घर।",
    keyFact: "Nepal मा वार्षिक औसत Disaster Loss: रु. ५०० करोड — Early Warning ले ५०% घटाउने लक्ष्य।",
    sectors: ["infrastructure", "governance", "environment"],
  },
  {
    pointNumber: 39,
    title: "जलाशय र Dam — दीर्घकालीन पानी भण्डार",
    simpleSummary: "Storage Reservoir (जलाशय) निर्माण अन्तर्गत Dudhkoshi र Sunkoshi जस्ता ठूला Dam Project सुरु हुनेछन्। यसले Hydropower उत्पादन र Irrigation दुवैमा मद्दत गर्नेछ।",
    youthImpact: "ठूला Dam Project ले हजारौं Construction Job र पछि Permanent Energy Job सिर्जना गर्नेछ।",
    keyFact: "Dudhkoshi Storage Project: ६३५ MW — FY 2083/84 मा निर्माण सुरुवात।",
    sectors: ["energy", "environment", "infrastructure"],
  },
  {
    pointNumber: 40,
    title: "Pollution Control — हावा र पानी सफा",
    simpleSummary: "Kathmandu Valley Air Pollution (वायु प्रदूषण) नियन्त्रणका लागि पुराना गाडी बन्द गरिनेछ। Electric Vehicle (EV) लाई Tax Benefit दिइनेछ। Solid Waste Management (फोहोर व्यवस्थापन) सुधार गरिनेछ।",
    youthImpact: "Kathmandu को हावा सफा हुनेछ — Respiratory Disease घट्नेछ। EV किन्दा कम Tax।",
    keyFact: "EV Import Duty: ०% — Petrol/Diesel गाडीभन्दा धेरै सस्तो हुनेछ।",
    sectors: ["environment", "infrastructure", "digital"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 5: ऊर्जा र पूर्वाधार (Energy & Infrastructure) — 41-55
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 41,
    title: "३०,००० MW Hydropower — ऊर्जा सम्प्रभुता",
    simpleSummary: "२०९० सम्म ३०,००० MW Hydropower उत्पादन गर्ने राष्ट्रिय लक्ष्य। अहिले Installed Capacity: ~३,५०० MW। National Energy Sovereignty Fund (राष्ट्रिय ऊर्जा सम्प्रभुता कोष) स्थापना हुनेछ।",
    youthImpact: "Nepal Electricity Export बढेर विदेशी मुद्रा आर्जन हुनेछ — देशको Economy बलियो हुनेछ।",
    keyFact: "Energy Sovereignty Fund: रु. ५,००० करोड — Hydropower Project को Financing को लागि।",
    sectors: ["energy", "economy", "infrastructure"],
  },
  {
    pointNumber: 42,
    title: "PPA Process — ६ महिनामा Clearance",
    simpleSummary: "Hydropower PPA (Power Purchase Agreement) Approval प्रक्रिया २४ महिनाबाट ६ महिनामा झार्ने लक्ष्य। Investors लाई सजिलो बनाइनेछ — Nepal मा Hydropower Investment को सबैभन्दा ठूलो बाधा हटाइनेछ।",
    youthImpact: "Hydropower Sector मा Private Investment बढ्दा हजारौं Engineering र Technical Job आउनेछ।",
    keyFact: "PPA Approval: २४ महिना → ६ महिना — Investment Friction को सबैभन्दा ठूलो Reduction।",
    sectors: ["energy", "governance", "economy"],
  },
  {
    pointNumber: 43,
    title: "NEA — तीन Subsidiary मा पुनर्संरचना",
    simpleSummary: "NEA (Nepal Electricity Authority) लाई Generation (उत्पादन), Transmission (प्रसारण), र Distribution (वितरण) तीन अलग Subsidiary मा पुनर्संरचना गरिनेछ। India को Model अनुसार Unbundling ले Efficiency बढ्नेछ।",
    youthImpact: "बिजुली कटौती घट्नेछ, बिल Payment Online हुनेछ — Daily Life सजिलो।",
    keyFact: "NEA Restructuring: India को Unbundling Model — Efficiency Gain ~२०% अपेक्षित।",
    sectors: ["energy", "governance"],
  },
  {
    pointNumber: 44,
    title: "ग्रामीण विद्युतीकरण — १००% लक्ष्य",
    simpleSummary: "Rural Electrification (ग्रामीण विद्युतीकरण) — सबै घरमा बिजुली पुर्‍याउने। Ashadh 2084 सम्म 100% Rural Electrification लक्ष्य। Solar Power र Mini-Grid Solution मार्फत दुर्गम क्षेत्र Cover गरिनेछ।",
    youthImpact: "गाउँमा बिजुली आए बच्चाहरूले रातमा पढ्न पाउने — Internet र Mobile Charging पनि।",
    keyFact: "Current Rural Electrification: ९२%। Target: Ashadh 2084 सम्म १००%।",
    sectors: ["energy", "infrastructure", "governance"],
  },
  {
    pointNumber: 45,
    title: "Solar र वैकल्पिक ऊर्जा",
    simpleSummary: "Solar Energy (सौर्य ऊर्जा) र Wind Energy (पवन ऊर्जा) विकासलाई प्रोत्साहन। Rooftop Solar मा Subsidy र Net Metering (घरमा बनेको बिजुली Grid मा बेच्ने) System लागू हुनेछ।",
    youthImpact: "घरको छानामा Solar Panel राखी बिजुली बेच्न सकिनेछ — Extra Income को स्रोत।",
    keyFact: "Net Metering: घरको Solar बाट बिजुली NEA लाई बेच्न पाइनेछ — पहिलो पटक Nepal मा।",
    sectors: ["energy", "environment", "economy"],
  },
  {
    pointNumber: 46,
    title: "Cross-border Power Trade — India र Bangladesh",
    simpleSummary: "India र Bangladesh सँग Cross-border Power Trade (सीमापार विद्युत व्यापार) विस्तार हुनेछ। नयाँ Transmission Corridor थपिनेछ। Nepal ले बिजुली बेचेर विदेशी मुद्रा आर्जन गर्नेछ।",
    youthImpact: "Nepal को Hydropower Export बढ्दा GDP बढ्नेछ — Hydropower Sector Job Market राम्रो।",
    keyFact: "Current Power Export to India: ~७०० MW। Target: FY 2083/84 सम्म १,५०० MW।",
    sectors: ["energy", "economy"],
  },
  {
    pointNumber: 47,
    title: "सडक नेटवर्क विस्तार",
    simpleSummary: "National Road Network विस्तार अन्तर्गत सबै जिल्ला सदरमुकाम Road मार्फत जोडिनेछ। Blacktopped Road Coverage बढाइनेछ। Road Maintenance Fund स्थापना हुनेछ।",
    youthImpact: "गाउँबाट शहर पुग्न सजिलो — Products Transport सस्तो हुनेछ।",
    keyFact: "Blacktopped Road Target: ५०% National Highway Network — Investment: रु. २,००० करोड।",
    sectors: ["infrastructure", "economy"],
  },
  {
    pointNumber: 48,
    title: "पुल र सुरुङ मार्ग — छिटो यातायात",
    simpleSummary: "ठूला Bridge र Tunnel Project सुरु हुनेछन्। Kathmandu-Terai Fast Track राजमार्ग र Nagdhunga Tunnel को निर्माण तीव्र पारिनेछ।",
    youthImpact: "Kathmandu-Terai आउजाउ समय ७ घण्टाबाट ४ घण्टामा झर्नेछ।",
    keyFact: "Nagdhunga Tunnel: Pokhara Highway मा — २०२७ सम्म Complete लक्ष्य।",
    sectors: ["infrastructure", "economy"],
  },
  {
    pointNumber: 49,
    title: "रेलवे — Raxaul–Kathmandu र थप",
    simpleSummary: "Raxaul-Kathmandu Railway Project को निर्माण तीव्र पारिनेछ। भित्री Kathmandu Metro Rail को Feasibility Study सम्पन्न गरिनेछ। Railway ले Cargo Transport सस्तो हुनेछ।",
    youthImpact: "Train बाट India जान सकिनेछ — Airfare बिना सस्तो Travel।",
    keyFact: "Raxaul-Kathmandu Railway: ३५ km — Investment USD ३.५ अर्ब (चीन-India सहयोग)।",
    sectors: ["infrastructure", "economy"],
  },
  {
    pointNumber: 50,
    title: "Gautam Buddha Airport — International Hub",
    simpleSummary: "Gautam Buddha International Airport (Bhairahawa) को पूर्ण Operationalize गरिनेछ। Pokhara International Airport को Utilisation बढाइनेछ। Air Cargo Service विस्तार हुनेछ।",
    youthImpact: "Kathmandu बाहिरबाट पनि International Flight — Tourism र Business को लागि सजिलो।",
    keyFact: "Gautam Buddha Airport Capacity: ३० लाख Passenger प्रति वर्ष।",
    sectors: ["infrastructure", "economy"],
  },
  {
    pointNumber: 51,
    title: "Smart City — Kathmandu र Pokhara",
    simpleSummary: "Smart City (स्मार्ट सहर) विकास अन्तर्गत Kathmandu र Pokhara मा Digital Infrastructure, Smart Traffic System, र Integrated Public Transport सुरु हुनेछ।",
    youthImpact: "Smart App मार्फत Bus Track गर्न, Traffic Update पाउन, र City Service Access गर्न सकिनेछ।",
    keyFact: "Kathmandu Smart City Investment: रु. ५०० करोड — FY 2083/84 सुरुवात।",
    sectors: ["infrastructure", "digital", "governance"],
  },
  {
    pointNumber: 52,
    title: "Special Economic Zone — उद्योग क्षेत्र",
    simpleSummary: "SEZ (Special Economic Zone) मा उद्योग स्थापना गर्ने कम्पनीहरूलाई Tax Holiday, Custom Duty Waiver, र Single Window Service दिइनेछ। IT र Manufacturing SEZ को विस्तार हुनेछ।",
    youthImpact: "SEZ मा ठूला Factory आए Manufacturing Job को अवसर — Engineer र Technician को माग बढ्नेछ।",
    keyFact: "SEZ मा उद्योग: १० वर्षको Income Tax Holiday। Custom Duty: शून्य।",
    sectors: ["economy", "infrastructure", "employment"],
  },
  {
    pointNumber: 53,
    title: "पूर्वाधार Financing — PPP Model",
    simpleSummary: "PPP (Public-Private Partnership) Model मार्फत Infrastructure Project को Financing गरिनेछ। सरकारको पैसाले मात्र नपुग्ने ठूला Project मा Private Capital ल्याइनेछ।",
    youthImpact: "PPP Project ले नयाँ Investment आउने — Construction र Infrastructure Job बढ्नेछ।",
    keyFact: "PPP Pipeline: रु. ५,००० करोडको Infrastructure Project — Private Sector सँग साझेदारी।",
    sectors: ["infrastructure", "economy", "governance"],
  },
  {
    pointNumber: 54,
    title: "Postal Network — Rural Connectivity",
    simpleSummary: "Nepal Postal Service (हुलाक सेवा) लाई Digital Transformation गरिनेछ। Post Office मार्फत Banking, Insurance, र Government Service पुर्‍याइनेछ — विशेषत: दुर्गम क्षेत्रमा।",
    youthImpact: "गाउँमा Post Office नै Bank Branch हुनेछ — Rural Youth को Financial Access बढ्नेछ।",
    keyFact: "Nepal Post Office Network: ३,९०० भन्दा बढी — Rural Banking Agent को रूपमा Activate हुनेछ।",
    sectors: ["infrastructure", "banking", "governance"],
  },
  {
    pointNumber: 55,
    title: "Housing — किफायती आवास",
    simpleSummary: "Affordable Housing (किफायती आवास) कार्यक्रम अन्तर्गत मध्यम आय (Middle Income) परिवारको लागि Subsidized Housing Loan र Land Development गरिनेछ।",
    youthImpact: "Young Couple को लागि सस्तो घर — Housing Loan Interest Rate मा Subsidy।",
    keyFact: "Affordable Housing: ५०,०००+ Unit निर्माण लक्ष्य। Loan Interest Subsidy: ३% पोइन्ट।",
    sectors: ["infrastructure", "economy", "youth"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 6: उद्योग, वाणिज्य र पर्यटन — 56-64
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 56,
    title: "IT, AI, Cloud — National Strategic Industry",
    simpleSummary: "IT, Artificial Intelligence (कृत्रिम बुद्धिमत्ता), र Cloud Computing लाई National Strategic Industry घोषणा गरिएको छ। यी क्षेत्रका कम्पनीलाई १०-१५ वर्षको Income Tax Holiday, Hardware Import Duty Zero, र Priority SEZ Land दिइनेछ।",
    youthImpact: "Nepal मा IT Company खोल्दा वा काम गर्दा सबैभन्दा राम्रो Tax Benefit — Tech Career को सुनौलो युग।",
    keyFact: "IT/AI Company: १० वर्ष Income Tax Zero। Export-focused IT: १५ वर्ष Tax Holiday।",
    sectors: ["economy", "digital", "employment", "youth"],
  },
  {
    pointNumber: 57,
    title: "Nepal AI Innovation Fund — Startup को लागि",
    simpleSummary: "AI र ML (Machine Learning) Startup लाई Seed Funding (प्रारम्भिक पुँजी) दिन रु. २०० करोडको Nepal AI Innovation Fund NRB अन्तर्गत स्थापना हुनेछ।",
    youthImpact: "AI Startup सुरु गर्न सरकारी Fund पाउन सकिनेछ — Tech Entrepreneur को लागि Game Changer।",
    keyFact: "AI Innovation Fund: रु. २०० करोड। Eligible: AI/ML Product Companies।",
    sectors: ["digital", "economy", "youth"],
  },
  {
    pointNumber: 58,
    title: "Government Software — Buy Local नीति",
    simpleSummary: "सरकारले Software खरिद गर्दा Nepali IT Company लाई प्राथमिकता दिइनेछ। Local Vendor लाई २०% मूल्य Premium Allow गरिनेछ — Nepali Software छानिनेछ।",
    youthImpact: "Nepali IT Company हरूले Government Contract पाउने अवसर — Local Tech Industry बढ्नेछ।",
    keyFact: "Government IT Spending: वार्षिक ~रु. ३,००० करोड। Local Preference: २०% Premium।",
    sectors: ["digital", "economy", "governance"],
  },
  {
    pointNumber: 59,
    title: "पर्यटन — २० लाख Visitor लक्ष्य",
    simpleSummary: "Tourism (पर्यटन) पुनरुत्थान अन्तर्गत वार्षिक २० लाख International Tourist आकर्षित गर्ने लक्ष्य। Adventure Tourism, Cultural Tourism, र Medical Tourism विकास गरिनेछ।",
    youthImpact: "Tourism Sector मा Guide, Hotel, र Service Job बढ्नेछ — Youth को लागि ठूलो अवसर।",
    keyFact: "Tourist Arrival Target: २० लाख। Tourism GDP Contribution Target: ८%।",
    sectors: ["economy", "infrastructure", "employment"],
  },
  {
    pointNumber: 60,
    title: "Cottage र साना उद्योग — SME नीति",
    simpleSummary: "SME (Small and Medium Enterprises — साना तथा मझौला उद्यम) लाई Collateral-free Loan, Technical Training, र Market Access दिइनेछ। Cottage Industry (घरेलु उद्योग) को Product Export को लागि Support।",
    youthImpact: "Home-based Business र Handicraft को लागि Loan र Export Support — Rural Youth को लागि Income।",
    keyFact: "SME Loan: रु. ५० लाखसम्म Collateral-free। Interest Rate Subsidy: ३%।",
    sectors: ["economy", "employment", "youth"],
  },
  {
    pointNumber: 61,
    title: "Export Promotion — Made in Nepal",
    simpleSummary: "'Made in Nepal' Brand लाई अन्तर्राष्ट्रिय बजारमा स्थापित गरिनेछ। Handicraft, Pashmina, Tea, Coffee, र Herbal Products को Export बढाइनेछ।",
    youthImpact: "Nepal Product विदेशमा बेच्ने अवसर — E-Commerce मार्फत Global Market पुग्न सकिनेछ।",
    keyFact: "Nepal Export Target: USD ३ अर्ब (FY 2083/84 मा USD १.८ अर्बबाट)।",
    sectors: ["economy", "agriculture"],
  },
  {
    pointNumber: 62,
    title: "Industrial Estate — Manufacturing Hub",
    simpleSummary: "Industrial Estate (औद्योगिक क्षेत्र) विकास गरी Manufacturing Cluster बनाइनेछ। Terai क्षेत्रमा ठूला Factory लाई Land, Electricity, र Water सुनिश्चित गरिनेछ।",
    youthImpact: "Terai मा Manufacturing Job — काम को लागि विदेश जानु नपर्ने।",
    keyFact: "Industrial Estate: ५ नयाँ Zones — Employment Target: ५०,०००+।",
    sectors: ["economy", "infrastructure", "employment"],
  },
  {
    pointNumber: 63,
    title: "Startup Ecosystem — Incubator र Hub",
    simpleSummary: "Kathmandu, Pokhara, र Biratnagar मा Startup Incubator (नवउद्यम केन्द्र) स्थापना हुनेछ। Startup को लागि Office Space, Mentorship, र Angel Investment Platform तयार गरिनेछ।",
    youthImpact: "Startup सुरु गर्न Co-working Space र Expert Guidance उपलब्ध हुनेछ — Entrepreneur बन्न सजिलो।",
    keyFact: "Startup Incubator: ३ शहरमा — Annual Cohort: ५०० Startup सम्म।",
    sectors: ["economy", "digital", "youth"],
  },
  {
    pointNumber: 64,
    title: "Intellectual Property — नवाचार संरक्षण",
    simpleSummary: "Intellectual Property Rights (बौद्धिक सम्पत्ति अधिकार) — Patent, Copyright, र Trademark Registration सरल र छिटो गरिनेछ। Innovation (नवाचार) को संरक्षण गरिनेछ।",
    youthImpact: "तपाईंको App, Song, वा Invention कानुनले सुरक्षित हुनेछ — Creator Economy को लागि महत्त्वपूर्ण।",
    keyFact: "IP Registration Timeline: ६ महिना → ३ महिनामा घटाइनेछ।",
    sectors: ["legal", "economy", "digital", "youth"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 7: रोजगारी र सामाजिक सुरक्षा — 65-73
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 65,
    title: "Employment Decade — १० लाख Formal Job",
    simpleSummary: "Employment Decade 2083-2093 (रोजगारी दशक) अन्तर्गत १० वर्षमा १० लाख Formal Sector Job सिर्जना गर्ने लक्ष्य। Formal Employment (औपचारिक रोजगारी) बढाउन Private Sector र सरकारको साझा प्रयास।",
    youthImpact: "थप Formal Job मतलब EPF, SSF, र Labour Law को Protection — Informal मा काम गरेर नहुने।",
    keyFact: "Target: १० वर्षमा १० लाख Formal Job। Annual Target: १ लाख।",
    sectors: ["employment", "economy", "youth"],
  },
  {
    pointNumber: 66,
    title: "Remote Work — पहिलो पटक Legal",
    simpleSummary: "Nepal मा पहिलो पटक Remote Work (टाढाबाट काम) को Legal Framework तयार भएको छ। विदेशी कम्पनीका लागि Nepal बाटै काम गर्दा Tax Clarity र Labour Law Protection पाइनेछ। Home Office Allowance रु. १०,००० प्रति महिनासम्म कर छूट।",
    youthImpact: "Freelancer र Remote Worker को रूपमा काम गर्न अब Legal — Social Security र Tax Clarity।",
    keyFact: "~५ लाख Nepali अहिले Informally विदेशी Company को लागि काम गर्छन् — सबैलाई Legal Protection।",
    sectors: ["employment", "digital", "legal", "youth"],
  },
  {
    pointNumber: 67,
    title: "Minimum Wage वृद्धि",
    simpleSummary: "Minimum Wage (न्यूनतम पारिश्रमिक) बढाइनेछ। Worker को क्रयशक्ति (Purchasing Power) बढाउन र Inflation सँग Align गर्न नियमित Review को व्यवस्था।",
    youthImpact: "कम्तीमा सरकारले तोकेको तलब नदिने Employer को विरुद्ध Legal Action लिन सक्नुहुनेछ।",
    keyFact: "Minimum Wage Review: वार्षिक — Inflation Index सँग Linked।",
    sectors: ["employment", "governance", "legal"],
  },
  {
    pointNumber: 68,
    title: "Labour Migration — Safe र Legal",
    simpleSummary: "Foreign Employment (वैदेशिक रोजगारी) को सुरक्षित र व्यवस्थित बनाइनेछ। Skill Testing Mandatory हुनेछ। Foreign Employment Welfare Fund बाट Emergency Support र Life Insurance।",
    youthImpact: "विदेश जाँदा Skill Certificate लिनुपर्नेछ — तर राम्रो Job र Salary पाउनेछन्।",
    keyFact: "Annual Foreign Employment: ~५ लाख। Welfare Fund: Free Life Insurance Coverage।",
    sectors: ["employment", "governance", "legal"],
  },
  {
    pointNumber: 69,
    title: "Youth Employment — Return Migration",
    simpleSummary: "विदेशबाट फर्केका युवाहरूलाई Nepal मा Business सुरु गर्न Soft Loan र Training दिइनेछ। Return Migrant Entrepreneur (फर्किएका उद्यमी) को लागि Special Program।",
    youthImpact: "विदेशमा सिकेको Skill Nepal मा प्रयोग गरी Business सुरु गर्न सरकारी Support।",
    keyFact: "Return Migrant Business Loan: रु. ५० लाखसम्म ५% Interest मा।",
    sectors: ["employment", "economy", "youth"],
  },
  {
    pointNumber: 70,
    title: "Apprenticeship — काम गर्दै सिक्ने",
    simpleSummary: "Apprenticeship (कार्यस्थल प्रशिक्षण) कार्यक्रम अन्तर्गत युवाहरूले काम गर्दैगर्दा Technical Skill सिक्नेछन्। Company ले Apprentice राखे Tax Benefit पाउनेछ।",
    youthImpact: "Degree छैन भने पनि Apprenticeship मार्फत Career सुरु गर्न सकिनेछ।",
    keyFact: "Apprenticeship Tax Benefit: प्रत्येक Apprentice को Stipend मा कम्पनीले Double Tax Deduction।",
    sectors: ["employment", "education", "youth"],
  },
  {
    pointNumber: 71,
    title: "महिला रोजगारी — Gender Equality",
    simpleSummary: "Workplace Gender Equality (कार्यस्थलमा लैंगिक समानता) कानुन कडा पारिनेछ। Maternity र Paternity Leave (सुत्केरी र पितृत्व विदा) बढाइनेछ। महिला Entrepreneur लाई Special Loan Package।",
    youthImpact: "Women को Career मा Discrimination रोकिनेछ — Equal Pay र Safe Workplace।",
    keyFact: "Maternity Leave: १४ हप्ता → १८ हप्ता। Paternity Leave: १५ दिन थपिनेछ।",
    sectors: ["employment", "women", "legal"],
  },
  {
    pointNumber: 72,
    title: "Skill Development — TVET विस्तार",
    simpleSummary: "TVET (Technical and Vocational Education and Training — प्राविधिक तथा व्यावसायिक शिक्षा) विस्तार गरिनेछ। Industry-aligned Short Courses र Certification Program बढाइनेछ।",
    youthImpact: "४-६ महिनाको Short Course गरी Job पाउन सकिनेछ — Degree नभए पनि Career बन्छ।",
    keyFact: "TVET Enrollment Target: FY 2083/84 मा ५ लाख युवा। New TVET Centers: ५०+।",
    sectors: ["education", "employment", "youth"],
  },
  {
    pointNumber: 73,
    title: "Disability Rights — समावेशी रोजगारी",
    simpleSummary: "Disability (अपाङ्गता) भएका व्यक्तिलाई सरकारी तथा निजी क्षेत्रमा ५% Quota सुनिश्चित गरिनेछ। Accessible Workplace Infrastructure अनिवार्य हुनेछ।",
    youthImpact: "Disability भएका Young People को लागि Job Opportunity सुनिश्चित — Inclusive Society को निर्माण।",
    keyFact: "Government Job Quota for Disability: ५%। Private Sector: ५% (New Policy)।",
    sectors: ["employment", "governance", "legal"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 8: शिक्षा र स्वास्थ्य — 74-83
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 74,
    title: "निःशुल्क र अनिवार्य शिक्षा",
    simpleSummary: "Grade 1-12 सम्म निःशुल्क र अनिवार्य शिक्षा (Free and Compulsory Education) सुनिश्चित गरिनेछ। Private School को Fee Regulation गरिनेछ।",
    youthImpact: "अहिलेका बच्चाहरूको लागि — परिवारको शिक्षा खर्च घट्नेछ।",
    keyFact: "Grade 1-12: पूर्ण निःशुल्क। Private School Fee Cap: वार्षिक बृद्धि १०% भन्दा कम।",
    sectors: ["education", "governance"],
  },
  {
    pointNumber: 75,
    title: "उच्च शिक्षा — International Quality",
    simpleSummary: "Tribhuvan University र अन्य विश्वविद्यालयहरूमा International Accreditation (मान्यता) लिन प्रोत्साहन। Research Budget दोब्बर गरिनेछ। विदेशी University सँग Academic Partnership।",
    youthImpact: "Nepal मा पढेको Degree विदेशमा मान्यता पाउनेछ — विदेश नगई राम्रो Education।",
    keyFact: "Higher Education Research Budget: दोब्बर — International Partnership: ५०+ University।",
    sectors: ["education", "economy", "youth"],
  },
  {
    pointNumber: 76,
    title: "Digital Education — Tablet र E-Learning",
    simpleSummary: "सरकारी School का Grade 6+ का विद्यार्थीलाई Tablet र E-Learning Material उपलब्ध गराइनेछ। High-speed Internet सबै School मा पुर्‍याइनेछ।",
    youthImpact: "Digital Skill बच्चैदेखि सिक्नेछन् — Future Job Market को लागि तयार।",
    keyFact: "Tablets: Grade 6-12 का सबै सरकारी School विद्यार्थी। Internet: सबै School मा।",
    sectors: ["education", "digital", "youth"],
  },
  {
    pointNumber: 77,
    title: "Scholarship — Meritocracy",
    simpleSummary: "Merit-based Scholarship (योग्यता आधारित छात्रवृत्ति) बढाइनेछ। आर्थिक रूपमा कमजोर तर प्रतिभावान विद्यार्थीलाई विदेश पढ्न Full Scholarship।",
    youthImpact: "गरिब परिवारको होशियार बच्चाले पनि विदेशमा पढ्न सक्नेछ — Merit को आधारमा।",
    keyFact: "Annual Merit Scholarship: विदेश पढ्न १,००० Seat। Domestic: ५,००० Seat।",
    sectors: ["education", "youth"],
  },
  {
    pointNumber: 78,
    title: "Universal Health Coverage — सबैलाई स्वास्थ्य",
    simpleSummary: "Universal Health Coverage (सार्वभौम स्वास्थ्य सेवा) अन्तर्गत सबै नागरिकलाई आधारभूत स्वास्थ्य सेवा निःशुल्क। National Health Insurance (राष्ट्रिय स्वास्थ्य बीमा) सबैको लागि Mandatory।",
    youthImpact: "स्वास्थ्य बीमा नभए पनि सरकारी Hospital मा आधारभूत उपचार निःशुल्क।",
    keyFact: "Health Insurance Coverage: ४०% → ७५% FY 2083/84 सम्म।",
    sectors: ["health", "governance"],
  },
  {
    pointNumber: 79,
    title: "Mental Health — युवाको लागि",
    simpleSummary: "Mental Health (मानसिक स्वास्थ्य) लाई Public Health Priority दिइनेछ। सबै जिल्ला Hospital मा Mental Health Service अनिवार्य। Youth Mental Health Helpline सञ्चालन हुनेछ।",
    youthImpact: "Mental Health को लागि Free Counselling र Support — Stigma हटाउने National Campaign।",
    keyFact: "Nepal मा Mental Health Treatment Gap: ९०%। नयाँ नीतिले ५०% मा झार्ने लक्ष्य।",
    sectors: ["health", "youth", "governance"],
  },
  {
    pointNumber: 80,
    title: "Primary Health Centre — गाउँगाउँमा",
    simpleSummary: "Primary Health Centre (प्राथमिक स्वास्थ्य केन्द्र) सबै Ward Level मा स्थापना हुनेछ। Doctor र Nurse को Rural Posting Incentive बढाइनेछ।",
    youthImpact: "गाउँमा बसेर पनि Health Service पाउन सकिनेछ — Kathmandu धाउनु नपर्ने।",
    keyFact: "PHC Target: सबै ६,७४३ Ward — अहिले २,४०० Ward मा मात्र छ।",
    sectors: ["health", "infrastructure", "governance"],
  },
  {
    pointNumber: 81,
    title: "Cancer र Kidney — निःशुल्क उपचार",
    simpleSummary: "Cancer (कर्कट रोग), Kidney Disease, र Rare Disease को उपचार गरिब नागरिकलाई निःशुल्क दिइनेछ। Government Hospital मा Specialist Doctor को संख्या बढाइनेछ।",
    youthImpact: "परिवारमा कोही बिरामी भए ठूलो Medical Debt बाट बच्न सकिनेछ।",
    keyFact: "Cancer, Kidney Disease: Government Hospital मा निःशुल्क। Annual Budget: रु. ५०० करोड।",
    sectors: ["health", "governance"],
  },
  {
    pointNumber: 82,
    title: "Nutrition — बाल कुपोषण अन्त्य",
    simpleSummary: "Child Malnutrition (बाल कुपोषण) अन्त्यका लागि School Nutrition Program, Breast-Feeding Policy, र Community Health Worker बढाइनेछ।",
    youthImpact: "बच्चाहरूको शारीरिक र मानसिक विकास राम्रो हुनेछ — Smart Generation को निर्माण।",
    keyFact: "Nepal Stunting Rate: ३२% → २०% FY 2083/84 सम्म। Investment: रु. २०० करोड।",
    sectors: ["health", "governance", "education"],
  },
  {
    pointNumber: 83,
    title: "Pharmaceutical — दवाइ स्वदेशमा",
    simpleSummary: "Nepal मा Pharmaceutical Industry (औषधि उद्योग) विकास गरी Generic Drug उत्पादन बढाइनेछ। Essential Medicine (आवश्यक औषधि) को Price Regulation गरिनेछ।",
    youthImpact: "महँगो Brand दवाइको सट्टा सस्तो Generic दवाइ उपलब्ध — Health Cost घट्नेछ।",
    keyFact: "Generic Drug Target: ७०% Essential Medicine Nepal मै उत्पादन FY 2083/84 सम्म।",
    sectors: ["health", "economy"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 9: डिजिटल र प्रविधि — 84-91
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 84,
    title: "Citizen Super App — डिजिटल सरकार",
    simpleSummary: "Citizen Super App मा Digital Nagarikta (डिजिटल नागरिकता), PAN/VAT Registration, Bank Account Opening, Health Insurance, र Driving License एकै ठाउँमा पाइनेछ। MoHA अन्तर्गत National Identity Management Centre स्थापना हुनेछ।",
    youthImpact: "Government Service को लागि कार्यालय धाउनु नपर्ने — सबै Mobile बाट।",
    keyFact: "Beta Launch: Poush 2083। Full Rollout: Baisakh 2084। Covers: सबै २७ Commercial Bank।",
    sectors: ["digital", "governance", "banking"],
  },
  {
    pointNumber: 85,
    title: "Broadband — सबैलाई Internet",
    simpleSummary: "National Broadband Policy अन्तर्गत सबै Municipality मा High-Speed Internet पुर्‍याइनेछ। गाउँमा Fiber Optic र Satellite Internet को Hybrid Solution।",
    youthImpact: "गाउँमा बसेर पनि Remote Work, Online Business, र E-Learning गर्न सकिनेछ।",
    keyFact: "Broadband Coverage Target: ७०% → ९५% FY 2083/84 सम्म। Speed: Minimum 25 Mbps।",
    sectors: ["digital", "infrastructure", "youth"],
  },
  {
    pointNumber: 86,
    title: "5G — अर्को पुस्ताको Network",
    simpleSummary: "5G Mobile Network को Pilot Program Kathmandu Valley बाट सुरु हुनेछ। Nepal Telecom र Ncell लाई 5G Spectrum Allocation गरिनेछ।",
    youthImpact: "5G सँगै Smart Device, IoT, र Fast Mobile Internet — Technology Revolution Nepal मा।",
    keyFact: "5G Pilot: Kathmandu 2083। Full Rollout: Metropolitan Cities 2084।",
    sectors: ["digital", "infrastructure", "economy"],
  },
  {
    pointNumber: 87,
    title: "Cybersecurity — Digital सुरक्षा",
    simpleSummary: "National Cybersecurity Policy (राष्ट्रिय साइबर सुरक्षा नीति) लागू हुनेछ। Government System, Bank, र Critical Infrastructure को Cyber Attack बाट जोगाउन CERT (Computer Emergency Response Team) स्थापना।",
    youthImpact: "Online Banking र Digital Payment सुरक्षित हुनेछ — Cyber Fraud को जोखिम घट्नेछ।",
    keyFact: "Nepal CERT: 24/7 Cyber Incident Response। Budget: रु. ५० करोड।",
    sectors: ["digital", "governance", "banking"],
  },
  {
    pointNumber: 88,
    title: "Data Governance — Privacy Law",
    simpleSummary: "Personal Data Protection (व्यक्तिगत तथ्यांक सुरक्षा) ऐन लागू हुनेछ। Company हरूले User Data कसरी Collect र Use गर्छन् त्यसको Regulation हुनेछ। GDPR जस्तै Nepal को आफ्नै Data Privacy Law।",
    youthImpact: "तपाईंको App Data, Bank Data, र Social Media Data को Privacy सुनिश्चित।",
    keyFact: "Nepal Personal Data Protection Act: FY 2083/84 मा लागू — GDPR-aligned Framework।",
    sectors: ["digital", "legal", "governance"],
  },
  {
    pointNumber: 89,
    title: "E-Commerce — Digital Trade",
    simpleSummary: "E-Commerce (डिजिटल व्यापार) को Legal Framework बनाइनेछ। Online Business Registration, Digital Payment, र Consumer Protection Law लागू हुनेछ।",
    youthImpact: "Online Shop खोल्न Legal Framework स्पष्ट — Digital Entrepreneur को लागि सुरक्षित वातावरण।",
    keyFact: "Nepal E-Commerce Market Size: USD ३०० Million। Annual Growth: ४०%+।",
    sectors: ["digital", "economy", "legal", "youth"],
  },
  {
    pointNumber: 90,
    title: "Space Technology — Nepal Satellite",
    simpleSummary: "Nepal को आफ्नै Satellite Development को लागि Research Program सुरु हुनेछ। Space Science Education र Remote Sensing Technology को विकास।",
    youthImpact: "Space Science पढ्ने र काम गर्ने अवसर Nepal मै — Brain Drain घट्नेछ।",
    keyFact: "Nepal's First Student Satellite 'NepaliSat-1' पहिले नै Launch भइसकेको — अब थप Programme।",
    sectors: ["digital", "education", "economy"],
  },
  {
    pointNumber: 91,
    title: "Digital Literacy — सबैको लागि",
    simpleSummary: "Digital Literacy (डिजिटल साक्षरता) कार्यक्रम — गाउँदेखि शहरसम्म। Senior Citizen, Women, र Marginalized Community लाई Smart Phone र Internet सिकाउने Program।",
    youthImpact: "तपाईंको घरका ठूलाबुज्रुकले पनि Digital Payment र Online Service चलाउन सक्नेछन्।",
    keyFact: "Digital Literacy Target: FY 2083/84 मा २० लाख नागरिक trained।",
    sectors: ["digital", "education", "governance"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SECTOR 10: परराष्ट्र, सुरक्षा र लोकसेवा — 92-100
  // ══════════════════════════════════════════════════════════════════════════
  {
    pointNumber: 92,
    title: "विदेश नीति — पञ्चशील र सन्तुलित",
    simpleSummary: "Nepal ले Panchsheel (पञ्चशील) र Non-Aligned Movement (निर्गुट आन्दोलन) को Principle अनुसार Balanced Foreign Policy (सन्तुलित परराष्ट्र नीति) अपनाउनेछ। India र China दुवैसँग समान सम्बन्ध।",
    youthImpact: "Nepal को Geopolitical Stability — व्यापार र Investment को लागि राम्रो वातावरण।",
    keyFact: "Nepal: UN र SAARC मा Active — Global Peace Keeping Mission मा भाग लिइरहेको।",
    sectors: ["governance", "economy"],
  },
  {
    pointNumber: 93,
    title: "NRN — विदेशी नेपालीको अधिकार",
    simpleSummary: "NRN (Non-Resident Nepali — अनिवासी नेपाली) को Dual Citizenship सरल गरिनेछ। NRN ले Nepal मा Property किन्न, Company खोल्न, र Vote गर्न पाउने अधिकार विस्तार।",
    youthImpact: "विदेशमा बस्ने Nepali परिवारले Nepal सँगको सम्बन्ध बलियो राख्न सक्नेछन्।",
    keyFact: "NRN: विश्वका ५०+ देशमा ५० लाख Nepali। Dual Citizenship Process: सरल हुनेछ।",
    sectors: ["governance", "legal", "economy"],
  },
  {
    pointNumber: 94,
    title: "Nepal Army र Police — आधुनिकीकरण",
    simpleSummary: "Security Forces (सुरक्षा निकाय) — Nepal Army, Police, र APF को आधुनिकीकरण गरिनेछ। Cyber Security Unit र Disaster Response Capacity बढाइनेछ।",
    youthImpact: "Security Sector मा Modern Technology — Job Opportunity र Professional Development।",
    keyFact: "Security Modernisation Budget: रु. ३,०००+ करोड — Equipment र Training।",
    sectors: ["governance", "digital"],
  },
  {
    pointNumber: 95,
    title: "SAARC र Regional Cooperation",
    simpleSummary: "SAARC (South Asian Association for Regional Cooperation) फोरम पुनर्जीवित गर्न Nepal अग्रसर भूमिका खेल्नेछ। Regional Trade र Connectivity बढाइनेछ।",
    youthImpact: "South Asia मा Free Trade बढ्दा Nepal को Export बढ्नेछ — Regional Job Market खुल्नेछ।",
    keyFact: "SAARC GDP: USD ४ Trillion — Nepal को Export Potential ठूलो।",
    sectors: ["governance", "economy"],
  },
  {
    pointNumber: 96,
    title: "UN र Multilateral — Global Presence",
    simpleSummary: "UN मा Nepal को भूमिका बलियो पारिनेछ। UN Peacekeeping Mission (शान्ति सेना) मा Nepal को सक्रिय भागीदारी जारी रहनेछ।",
    youthImpact: "UN Mission मा Nepal Army र Police — International Exposure र Remittance।",
    keyFact: "Nepal: UN Peacekeeping मा Global Top-5 Contributor — वार्षिक USD ५ करोड+ Remittance।",
    sectors: ["governance", "employment"],
  },
  {
    pointNumber: 97,
    title: "लोकसेवा सुधार — Meritocracy",
    simpleSummary: "Civil Service (लोकसेवा) भर्ती प्रक्रिया Transparent र Digital बनाइनेछ। Public Service Delivery (सार्वजनिक सेवा प्रवाह) को Quality र Speed सुधार गरिनेछ। Performance-based Promotion System।",
    youthImpact: "Loksewa Exam Online हुनेछ — दूरदराजबाट पनि Apply गर्न सकिनेछ।",
    keyFact: "Loksewa Online: FY 2083/84 बाट। Performance Evaluation: Annual।",
    sectors: ["governance", "digital", "employment"],
  },
  {
    pointNumber: 98,
    title: "खेलकुद — Olympic Preparation",
    simpleSummary: "Sports (खेलकुद) विकासका लागि National Sports Policy लागू हुनेछ। Olympic Games मा Nepal को प्रतिनिधित्व बढाउन National Training Centre स्थापना हुनेछ।",
    youthImpact: "खेलाडीलाई Government Support, Stipend, र Career Pathway — Sports बाट Career।",
    keyFact: "National Sports Fund: रु. ५० करोड। Olympic Athletes: Full Scholarship र Training।",
    sectors: ["youth", "governance"],
  },
  {
    pointNumber: 99,
    title: "सांस्कृतिक सम्पदा — Heritage संरक्षण",
    simpleSummary: "UNESCO World Heritage Sites (विश्व सम्पदा स्थल) को संरक्षण र Promotion गरिनेछ। Cultural Tourism (सांस्कृतिक पर्यटन) बढाइनेछ। Indigenous Culture र Language संरक्षण।",
    youthImpact: "Heritage Sites को Tourism बढ्दा Local Youth को Job Opportunity बढ्नेछ।",
    keyFact: "Nepal: ११ UNESCO World Heritage Sites। Tourism Revenue: रु. २०० करोड+।",
    sectors: ["economy", "governance", "youth"],
  },
  {
    pointNumber: 100,
    title: "राष्ट्रिय एकता — समृद्ध Nepal",
    simpleSummary: "यी सबै १०० नीति तथा कार्यक्रमको मूल उद्देश्य: 'समृद्ध Nepal, सुखी नेपाली (Prosperous Nepal, Happy Nepali)'। संघीय लोकतान्त्रिक गणतन्त्र Nepal को विकास र राष्ट्रिय एकता (National Unity) यो सरकारको सर्वोच्च प्राथमिकता।",
    youthImpact: "यो सरकारको सम्पूर्ण नीति तपाईं — नेपाली युवाको भविष्यका लागि। आफ्नो देशमा बसेर सम्मानजनक जीवन बाँच्न पाउने — यही हो सपना।",
    keyFact: "GDP Target: ७% वृद्धि। Per Capita Income Target: USD ३,५०० FY 2083/84 सम्म।",
    sectors: ["governance", "economy", "youth"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const isProd   = process.argv.includes("--prod");
  const ownerId  = process.env.OWNER_ID || DEV_OWNER_ID;
  const NOW_TIME = new Date().toISOString();

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  ZZC Policy Points Seeder — नीति तथा कार्यक्रम FY 2083/84");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Mode:     ${isProd ? "PRODUCTION ⚠" : "DEV"}`);
  console.log(`  Owner:    ${ownerId}`);
  console.log(`  Points:   ${POLICY_POINTS.length}`);
  console.log(`  Target:   vault_policy_points\n`);

  // Check for existing points (avoid duplicates)
  const existing = await db.collection("vault_policy_points")
    .where("parentDocId", "==", PARENT_DOC_ID)
    .get();

  if (!existing.empty) {
    console.log(`⚠  Found ${existing.size} existing points for this document.`);
    const args = process.argv;
    if (!args.includes("--force")) {
      console.log("   Pass --force to overwrite. Exiting.\n");
      process.exit(0);
    }
    console.log("   --force passed — deleting existing and re-seeding...");
    const batch = db.batch();
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`   ✓ Deleted ${existing.size} existing points.\n`);
  }

  // Write in batches of 500 (Firestore limit)
  const BATCH_SIZE = 499;
  let written = 0;

  for (let i = 0; i < POLICY_POINTS.length; i += BATCH_SIZE) {
    const chunk = POLICY_POINTS.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const pt of chunk) {
      const ref = db.collection("vault_policy_points").doc();
      batch.set(ref, {
        id:              ref.id,
        parentDocId:     PARENT_DOC_ID,
        parentDocTitle:  PARENT_DOC_TITLE,
        ownerId,
        pointNumber:     pt.pointNumber,
        title:           pt.title,
        simpleSummary:   pt.simpleSummary,
        youthImpact:     pt.youthImpact,
        keyFact:         pt.keyFact,
        sectors:         pt.sectors,
        publishToJanta:  true,
        createdAt:       NOW_TIME,
        updatedAt:       NOW_TIME,
      });
    }

    await batch.commit();
    written += chunk.length;
    process.stdout.write(`  ✓ Written ${written}/${POLICY_POINTS.length} points\r`);
  }

  console.log(`\n\n  ✓ All ${written} policy points seeded successfully.`);
  console.log(`\n  Preview at: /janta → Policy Points tab`);
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
