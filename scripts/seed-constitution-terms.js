"use strict";
/**
 * ZZC Constitution Terms Seeder — Nepal को संविधान २०७२
 *
 * Seeds civic_terms collection with key terms from the Constitution of Nepal
 * 2072 (2015). Each term has:
 *   - Nepali & English name
 *   - Simple Nepali definition (18-35 year old audience)
 *   - Constitutional basis (Article reference)
 *   - Real-world context for young Nepalis
 *   - Related terms for the knowledge graph
 *
 * This is the FOUNDATIONAL DICTIONARY for ZZC Janta public intelligence.
 * Every policy point, budget item, and civic document maps to these terms.
 *
 * Run:
 *   node scripts/seed-constitution-terms.js
 *   node scripts/seed-constitution-terms.js --force   (overwrite existing)
 */

const { initFirebase } = require("./_firebase-init");
const { DEV_OWNER_ID } = require("./_dev-config");

const admin = initFirebase();
const db    = admin.firestore();

const NOW    = new Date().toISOString();
const SOURCE = "nepal-constitution-2072";

// ─── Constitutional Terms ─────────────────────────────────────────────────────
// Language: Flowing Nepali + English technical terms in parentheses
// Audience: 18-35 Nepali youth who want to understand their constitution

const CONSTITUTION_TERMS = [

  // ══════════════════════════════════════════════════════════════════════════
  // PART 1: राज्यको स्वरूप (Nature of the State)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "संघीय लोकतान्त्रिक गणतन्त्र",
    termEnglish:   "Federal Democratic Republic",
    category:      "state-structure",
    articleRef:    "धारा ४ — राज्यको स्वरूप",
    definition:    "Nepal को शासन व्यवस्थाको मूल ढाँचा। 'संघीय (Federal)' मतलब तीन तहको सरकार — संघ (Federal), प्रदेश (Province), र स्थानीय (Local)। 'लोकतान्त्रिक (Democratic)' मतलब जनताले नेता छान्छन्। 'गणतन्त्र (Republic)' मतलब राजा होइन, जनता नै राज्यको मालिक।",
    context:       "२०६३ को जनआन्दोलन II पछि २०६५ मा राजतन्त्र (Monarchy) समाप्त भयो र Nepal Secular Federal Democratic Republic बन्यो। यो Nepal को सबैभन्दा ठूलो राजनीतिक परिवर्तन थियो।",
    youthRelevance: "तपाईंले छानेको नेताले सरकार चलाउँछ — राजाले होइन। Vote गर्नु नागरिक कर्तव्य हो।",
    sectors:       ["governance", "legal", "politics"],
    relatedTerms:  ["संघीयता", "लोकतन्त्र", "सार्वभौमसत्ता"],
  },
  {
    termNepali:    "सार्वभौमसत्ता",
    termEnglish:   "Sovereignty",
    category:      "state-structure",
    articleRef:    "धारा २ — सार्वभौमसत्ता र राजकीयसत्ता",
    definition:    "Sovereignty (सार्वभौमसत्ता) भनेको सर्वोच्च शक्ति — Nepal मा यो जनतामा निहित छ। कुनै बाहिरी शक्तिले Nepal को आन्तरिक मामला मा हस्तक्षेप गर्न पाउँदैन।",
    context:       "Nepal को Constitution ले स्पष्ट भन्छ — 'Nepal को सार्वभौमसत्ता र राजकीयसत्ता Nepal का जनतामा निहित रहनेछ।' यसको मतलब: कुनै पनि व्यक्ति, Party, वा Institution जनतामाथि शासन गर्न पाउँदैन।",
    youthRelevance: "तपाईं — नेपाली नागरिक — देशका असली मालिक हुनुहुन्छ। Election मा Vote गर्नु यो Sovereignty को प्रयोग हो।",
    sectors:       ["governance", "legal", "politics"],
    relatedTerms:  ["संघीय लोकतान्त्रिक गणतन्त्र", "राष्ट्रिय एकता"],
  },
  {
    termNepali:    "संघीयता",
    termEnglish:   "Federalism",
    category:      "state-structure",
    articleRef:    "धारा ५६ — राज्यको संरचना",
    definition:    "Federalism (संघीयता) भनेको शक्ति तीन तहमा बाँड्ने व्यवस्था। १) संघ सरकार (Federal Government) — Kathmandu। २) प्रदेश सरकार (Provincial Government) — ७ वटा। ३) स्थानीय सरकार (Local Government) — ७५३ वटा। हरेक तहको आफ्नै अधिकार र जिम्मेवारी छ।",
    context:       "२०७२ को Constitution पछि Nepal Unitary State बाट Federal State बन्यो। पहिले सबै शक्ति Kathmandu मा केन्द्रित थियो — अब स्थानीय सरकारले आफ्नै बजेट, कानुन, र सेवा Manage गर्छन्।",
    youthRelevance: "तपाईंको गाउँ वा नगरपालिकाले अब आफ्नै निर्णय गर्छ — School, Hospital, Road सबै Local Government ले हेर्छ।",
    sectors:       ["governance", "legal", "politics"],
    relatedTerms:  ["स्थानीय सरकार", "प्रदेश सरकार", "अन्तर-सरकारी सम्बन्ध"],
  },
  {
    termNepali:    "धर्मनिरपेक्षता",
    termEnglish:   "Secularism",
    category:      "state-structure",
    articleRef:    "धारा ४ — राज्यको स्वरूप",
    definition:    "Secularism (धर्मनिरपेक्षता) मतलब सरकारले कुनै एक धर्म मान्दैन। सबै धर्मका नागरिकलाई समान अधिकार। State ले Religious मामलामा Neutral रहन्छ — Hindu, Buddhist, Muslim, Christian — सबैलाई बराबरी।",
    context:       "Nepal संसारकै एकमात्र Hindu Rashtra (State) थियो। २०६३ पछि Secular बन्यो। यो ऐतिहासिक परिवर्तन थियो — धर्मको आधारमा कुनै नागरिकलाई Privilege वा Discrimination नहुने भयो।",
    youthRelevance: "तपाईंको धर्म जे भए पनि — State को नजरमा तपाईं बराबर नागरिक हो।",
    sectors:       ["governance", "legal", "social"],
    relatedTerms:  ["धार्मिक स्वतन्त्रता", "समानता", "मौलिक हक"],
  },
  {
    termNepali:    "समावेशिता",
    termEnglish:   "Inclusiveness",
    category:      "state-structure",
    articleRef:    "धारा ४२ — सामाजिक न्यायको हक",
    definition:    "Inclusiveness (समावेशिता) मतलब हरेक जात, जनजाति, महिला, Disability भएका, र पिछडिएका वर्गलाई State को हरेक Organ मा सहभागिता। Government Job, Parliament, Court — सबैमा Representation।",
    context:       "Nepal को Constitution ले Proportional Inclusion को Guarantee दिन्छ। Dalit, Janajati, Madhesi, Women, Youth, र Disability भएकाहरूलाई State Organ मा Quota र Representation सुनिश्चित छ।",
    youthRelevance: "तपाईंको Community — चाहे Tharu होस्, Tamang होस्, वा Dalit — सरकारमा Representation पाउने अधिकार छ।",
    sectors:       ["governance", "social", "legal"],
    relatedTerms:  ["दलित", "जनजाति", "मधेशी", "आरक्षण"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 2: नागरिकता (Citizenship)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "नागरिकता",
    termEnglish:   "Citizenship",
    category:      "citizenship",
    articleRef:    "धारा ११ — नागरिकतासम्बन्धी व्यवस्था",
    definition:    "Citizenship (नागरिकता) भनेको कुनै देशको Legal Membership। Nepal को नागरिकताले तपाईंलाई Voting, Government Job, Property किन्न, Passport पाउन, र सबै Constitutional Rights दिन्छ।",
    context:       "Nepal को नागरिकता तीन प्रकार: १) Descent (बंशज) — बाबाआमा Nepali भए। २) Birth (जन्मसिद्ध) — Nepal मा जन्मे। ३) Naturalization (अंगीकृत) — निश्चित अवधि Nepal मा बसे। Dual Citizenship अहिले अनुमति छैन — NRN को लागि Debate भइरहेको।",
    youthRelevance: "नागरिकता नभएसम्म Loksewa गर्न, Passport लिन, वा SIM किन्न पनि गाह्रो। 16 वर्षमा Citizenship लिन सकिन्छ।",
    sectors:       ["governance", "legal"],
    relatedTerms:  ["NRN", "Dual Citizenship", "राष्ट्रिय परिचयपत्र"],
  },
  {
    termNepali:    "राष्ट्रिय परिचयपत्र",
    termEnglish:   "National Identity Card",
    category:      "citizenship",
    articleRef:    "धारा १२ — नागरिकताको प्रमाण",
    definition:    "National Identity Card (राष्ट्रिय परिचयपत्र) — Biometric-based Smart Card जसले नागरिकताको प्रमाण दिन्छ। नागरिकता प्रमाणपत्र (Citizenship Certificate) भन्दा बढी Secure र Digital।",
    context:       "Nepal सरकारले National ID Card System लागू गर्दैछ। यसमा Photo, Fingerprint, र Digital Signature हुनेछ। भविष्यमा यही Card बाट eKYC, Bank Account Opening, र सबै Government Service पाइनेछ।",
    youthRelevance: "National ID Card = Digital Identity। Bank, SIM, Government Service — सबै यही Card बाट।",
    sectors:       ["governance", "digital", "banking"],
    relatedTerms:  ["eKYC", "नागरिकता", "Citizen Super App"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 3: मौलिक हक (Fundamental Rights)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "मौलिक हक",
    termEnglish:   "Fundamental Rights",
    category:      "fundamental-rights",
    articleRef:    "धारा १६-४६ — मौलिक हकहरू",
    definition:    "Fundamental Rights (मौलिक हक) भनेका ती अधिकार जुन संविधानले प्रत्येक नागरिकलाई दिएको छ र कुनै सरकार वा कानुनले खोस्न सक्दैन। Nepal को Constitution मा ३१ वटा मौलिक हक छन्।",
    context:       "Nepal को Constitution 2072 ले विश्वकै व्यापक Fundamental Rights मध्ये एक छ। जीवनको हक (Right to Life), समानताको हक (Right to Equality), शिक्षाको हक (Right to Education), स्वास्थ्यको हक (Right to Health) — सबै Constitutional Guarantee।",
    youthRelevance: "तपाईंको Rights: काम गर्ने अधिकार, पढ्ने अधिकार, बोल्ने अधिकार — यी सबै Constitution ले दिएको। कोही खोस्न खोजे Court मा जान सकिन्छ।",
    sectors:       ["legal", "governance", "social"],
    relatedTerms:  ["समानताको हक", "स्वतन्त्रताको हक", "सम्पत्तिको हक", "न्यायिक उपचार"],
  },
  {
    termNepali:    "समानताको हक",
    termEnglish:   "Right to Equality",
    category:      "fundamental-rights",
    articleRef:    "धारा १८ — समानताको हक",
    definition:    "Right to Equality (समानताको हक) — कानुनको नजरमा सबै नागरिक बराबर। जात, लिंग, धर्म, भाषा, वर्ण, वा Origin को आधारमा Discrimination गर्न बन्देज। सबैलाई Law को बराबर संरक्षण।",
    context:       "धारा १८ ले 'Positive Discrimination' (सकारात्मक विभेद) को पनि अनुमति दिन्छ — पिछडिएका वर्गलाई अगाडि ल्याउन Affirmative Action (आरक्षण) दिन पाइन्छ। तर सामान्य अवस्थामा कुनै पनि आधारमा Discrimination गर्न निषेध।",
    youthRelevance: "Workplace, School, वा कुनै पनि सार्वजनिक ठाउँमा Discrimination भए कानुनी उपचार पाउन सकिन्छ।",
    sectors:       ["legal", "social", "employment"],
    relatedTerms:  ["मौलिक हक", "आरक्षण", "लैंगिक समानता"],
  },
  {
    termNepali:    "अभिव्यक्ति स्वतन्त्रता",
    termEnglish:   "Freedom of Expression",
    category:      "fundamental-rights",
    articleRef:    "धारा १७ — स्वतन्त्रताको हक",
    definition:    "Freedom of Expression (अभिव्यक्ति स्वतन्त्रता) — बोल्ने, लेख्ने, र आफ्नो विचार प्रकट गर्ने अधिकार। Press Freedom, Social Media Post, Protest, र Artistic Expression — सबै यही हकअन्तर्गत।",
    context:       "यो अधिकार Absolute छैन — Hate Speech, Defamation (मानहानि), र National Security को विरुद्धमा Restriction लगाउन मिल्छ। Digital Media र Social Media मा यो अधिकारको सीमाहरू अहिले Debate को विषय बनिरहेको छ।",
    youthRelevance: "YouTube Video बनाउने, Blog लेख्ने, वा Protest मा भाग लिने — तपाईंको Constitutional Right। तर Hate Speech गर्दा Legal Consequence हुन्छ।",
    sectors:       ["legal", "digital", "social"],
    relatedTerms:  ["प्रेस स्वतन्त्रता", "सूचनाको हक", "आन्दोलनको हक"],
  },
  {
    termNepali:    "सम्पत्तिको हक",
    termEnglish:   "Right to Property",
    category:      "fundamental-rights",
    articleRef:    "धारा २५ — सम्पत्तिको हक",
    definition:    "Right to Property (सम्पत्तिको हक) — नागरिकले आफ्नो जग्गा, घर, र सम्पत्ति कानुनबमोजिम उपभोग, बेचबिखन, वा उपयोग गर्न पाउने अधिकार। सरकारले सार्वजनिक हितको लागि मात्र उचित क्षतिपूर्ति (Compensation) दिएर अधिग्रहण (Acquisition) गर्न सक्छ।",
    context:       "Nepal मा Land Reform (भूमि सुधार) को इतिहास जटिल छ। Constitution ले Property Right को Guarantee दिन्छ तर Land Ceiling (हदबन्दी) र अधिग्रहण को अधिकार पनि State सँग राखेको छ।",
    youthRelevance: "तपाईंको घर वा जग्गा सरकारले लिन खोजे उचित मुआव्जा (Fair Compensation) पाउने अधिकार छ।",
    sectors:       ["legal", "economy", "governance"],
    relatedTerms:  ["भूमि सुधार", "मुआव्जा", "सार्वजनिक हित"],
  },
  {
    termNepali:    "शिक्षाको हक",
    termEnglish:   "Right to Education",
    category:      "fundamental-rights",
    articleRef:    "धारा ३१ — शिक्षाको हक",
    definition:    "Right to Education (शिक्षाको हक) — प्रत्येक नागरिकलाई आधारभूत शिक्षा (Basic Education) निःशुल्क र अनिवार्य पाउने Constitutional Guarantee। माध्यमिक शिक्षा (Secondary Education) पनि निःशुल्क।",
    context:       "Nepal को Constitution Grade 12 सम्म निःशुल्क शिक्षाको Guarantee दिन्छ। तर Implementation मा Gap छ — Private School को Fee बढ्दैछ, Quality मा असमानता छ।",
    youthRelevance: "सरकारी School मा Grade 12 सम्म निःशुल्क — तपाईंको Constitutional Right। Fee लाग्छ भने Complain गर्न सकिन्छ।",
    sectors:       ["education", "legal", "governance"],
    relatedTerms:  ["आधारभूत शिक्षा", "माध्यमिक शिक्षा", "उच्च शिक्षा"],
  },
  {
    termNepali:    "स्वास्थ्यको हक",
    termEnglish:   "Right to Health",
    category:      "fundamental-rights",
    articleRef:    "धारा ३५ — स्वास्थ्यको हक",
    definition:    "Right to Health (स्वास्थ्यको हक) — प्रत्येक नागरिकलाई आधारभूत स्वास्थ्य सेवा (Basic Health Service) निःशुल्क पाउने अधिकार। Emergency उपचार कुनै पनि Hospital मा अस्वीकार गर्न पाइँदैन।",
    context:       "Nepal को Constitution 2072 मा Health लाई Fundamental Right को रूपमा राखिएको विश्वकै पहिलो Constitutions मध्ये एक हो। Implementation चुनौतीपूर्ण छ — Rural Area मा Health Facility अझै पुग्नु बाँकी छ।",
    youthRelevance: "Emergency Hospital मा गएमा Advance Payment माग्न पाइँदैन — यो तपाईंको Constitutional Right हो।",
    sectors:       ["health", "legal", "governance"],
    relatedTerms:  ["आधारभूत स्वास्थ्य सेवा", "स्वास्थ्य बीमा", "Universal Health Coverage"],
  },
  {
    termNepali:    "खाद्य सम्प्रभुता",
    termEnglish:   "Food Sovereignty",
    category:      "fundamental-rights",
    articleRef:    "धारा ३६ — खाद्य सम्प्रभुताको हक",
    definition:    "Food Sovereignty (खाद्य सम्प्रभुता) — प्रत्येक नागरिकलाई आफ्नो र आफ्नो समुदायको लागि पोषणयुक्त खाना उत्पादन गर्ने अधिकार। State ले खाद्य असुरक्षा (Food Insecurity) बाट नागरिक जोगाउनुपर्छ।",
    context:       "Nepal को Agriculture Policy, Food Security Program, र खाद्य Distribution System यही Constitutional Right को Implementation हो। GMO (Genetically Modified Organism) Seed Import Debate मा यो Right महत्त्वपूर्ण।",
    youthRelevance: "सस्तो र पोषणयुक्त खाना पाउनु Constitutional Right — खाद्यान्न संकट भए सरकारको जिम्मेवारी।",
    sectors:       ["agriculture", "legal", "health"],
    relatedTerms:  ["खाद्य सुरक्षा", "कृषि", "सार्वजनिक वितरण"],
  },
  {
    termNepali:    "रोजगारीको हक",
    termEnglish:   "Right to Employment",
    category:      "fundamental-rights",
    articleRef:    "धारा ३३ — रोजगारीको हक",
    definition:    "Right to Employment (रोजगारीको हक) — प्रत्येक नागरिकलाई काम गर्ने अधिकार। Exploitation (शोषण) र Forced Labour (बाध्यात्मक श्रम) विरुद्ध संरक्षण। Labour Rights (श्रम अधिकार) को Constitutional Guarantee।",
    context:       "यो Right Aspirational (आकांक्षात्मक) हो — सरकारले रोजगारी दिने कोसिस गर्नुपर्छ तर Guarantee गर्दैन। Labour Act 2074 यही Constitutional Right को Implementation हो।",
    youthRelevance: "Unfair Firing, Unpaid Salary, वा Workplace Harassment — सबै विरुद्ध Labour Court मा उजुरी दिन सकिन्छ।",
    sectors:       ["employment", "legal", "social"],
    relatedTerms:  ["श्रम अधिकार", "न्यूनतम पारिश्रमिक", "Trade Union"],
  },
  {
    termNepali:    "महिलाको हक",
    termEnglish:   "Women's Rights",
    category:      "fundamental-rights",
    articleRef:    "धारा ३८ — महिलाको हक",
    definition:    "Women's Rights (महिलाको हक) — महिलालाई समान वंशज अधिकार (Equal Lineage Rights), सम्पत्ति अधिकार, र हर क्षेत्रमा Discrimination विरुद्ध संरक्षण। Reproductive Rights (प्रजनन अधिकार) र Safe Motherhood (सुरक्षित मातृत्व) को Guarantee।",
    context:       "Nepal को Constitution महिलाको हक को सन्दर्भमा दक्षिण एशियाकै सबभन्दा Progressive मध्ये एक हो। ३३% महिला Representation Parliament र Local Government मा Mandatory।",
    youthRelevance: "महिला र पुरुष — सम्पत्तिमा बराबर हक। छोरी र छोरा — कानुनी दृष्टिकोणले समान।",
    sectors:       ["legal", "social", "governance", "women"],
    relatedTerms:  ["लैंगिक समानता", "सम्पत्तिको हक", "Representation"],
  },
  {
    termNepali:    "दलित अधिकार",
    termEnglish:   "Dalit Rights",
    category:      "fundamental-rights",
    articleRef:    "धारा ४० — दलितको हक",
    definition:    "Dalit Rights (दलित अधिकार) — जातिय छुवाछूत (Caste-based Untouchability) र Discrimination सम्पूर्ण रूपमा निषेध। Dalits लाई Education, Employment, र Public Places मा Discrimination Legally Punishable। Positive Discrimination को Constitutional Guarantee।",
    context:       "Nepal मा Caste Discrimination अझै Present छ। Constitution 2072 ले यसलाई Criminal Offence बनायो। Caste-based Discrimination र Untouchability Act 2011 यही Constitution को Implementation।",
    youthRelevance: "जातको आधारमा कुनै पनि ठाउँमा छुवाछूत गरे सजायको व्यवस्था — Police मा Complain गर्न सकिन्छ।",
    sectors:       ["legal", "social", "education"],
    relatedTerms:  ["समानताको हक", "आरक्षण", "सामाजिक न्याय"],
  },
  {
    termNepali:    "सूचनाको हक",
    termEnglish:   "Right to Information",
    category:      "fundamental-rights",
    articleRef:    "धारा २७ — सूचनाको हक",
    definition:    "Right to Information (सूचनाको हक) — प्रत्येक नागरिकलाई सार्वजनिक निकायसँग जानकारी माग्ने अधिकार। Government ले सूचना दिन अस्वीकार गर्न पाउँदैन — बाहेक National Security सम्बन्धी।",
    context:       "RTI (Right to Information) Act 2064 यही Constitutional Right को Implementation। कुनै पनि Government Office बाट तपाईं Officially Letter लेखेर Information माग्न सक्नुहुन्छ — उनीहरूले ७ दिनभित्र जवाफ दिनुपर्छ।",
    youthRelevance: "Municipal Budget कहाँ गयो? Road किन बनेन? — RTI Application मार्फत सूचना माग्न सकिन्छ।",
    sectors:       ["governance", "legal", "digital"],
    relatedTerms:  ["पारदर्शिता", "जनउत्तरदायित्व", "Open Data"],
  },
  {
    termNepali:    "न्यायिक उपचारको हक",
    termEnglish:   "Right to Constitutional Remedy",
    category:      "fundamental-rights",
    articleRef:    "धारा ४६ — संवैधानिक उपचारको हक",
    definition:    "Right to Constitutional Remedy (न्यायिक उपचारको हक) — कुनै पनि Fundamental Right उल्लंघन भएमा Supreme Court मा Writ Petition दायर गरी उपचार पाउने अधिकार। यो 'Rights of Rights' हो — अन्य सबै Rights को सुरक्षा गर्छ।",
    context:       "Habeas Corpus (बन्दी प्रत्यक्षीकरण), Mandamus (आदेशको लेख), Certiorari — यस्ता Legal Writs मार्फत Court बाट उपचार पाइन्छ। Lawyer नलागाई पनि आफैँ Writ दायर गर्न मिल्छ।",
    youthRelevance: "तपाईंको कुनै पनि Constitutional Right उल्लंघन भएमा Supreme Court को ढोका खुला छ।",
    sectors:       ["legal", "governance"],
    relatedTerms:  ["सर्वोच्च अदालत", "मौलिक हक", "Writ Petition"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 4: राज्यका निर्देशक सिद्धान्त (Directive Principles)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "निर्देशक सिद्धान्त",
    termEnglish:   "Directive Principles",
    category:      "directive-principles",
    articleRef:    "धारा ५०-५५ — राज्यका निर्देशक सिद्धान्त",
    definition:    "Directive Principles (निर्देशक सिद्धान्त) भनेका सरकारले Policy बनाउँदा पालन गर्नुपर्ने Guiding Principles हुन्। यी Court मा Enforceable छैनन् — तर Government को Policy Direction निर्धारण गर्छन्।",
    context:       "जस्तो: 'सबैलाई रोजगारी दिने' — यो Directive Principle हो, Fundamental Right होइन। Government ले कोसिस गर्नुपर्छ तर नभए Court मा Complaint गर्न मिल्दैन।",
    youthRelevance: "Government Policy — बजेट, Employment, Agriculture — सबै यी Principles बमोजिम बन्नुपर्छ।",
    sectors:       ["governance", "legal", "economy"],
    relatedTerms:  ["मौलिक हक", "राज्य नीति", "जनकल्याण"],
  },
  {
    termNepali:    "समाजवाद-उन्मुख अर्थतन्त्र",
    termEnglish:   "Socialism-Oriented Economy",
    category:      "directive-principles",
    articleRef:    "धारा ५१ — राज्यका नीतिहरू",
    definition:    "Nepal को Constitution ले Socialist-Oriented Economy (समाजवाद-उन्मुख अर्थतन्त्र) को Directive दिन्छ। मतलब: Free Market (बजार अर्थतन्त्र) को साथमा Public Welfare र Social Justice लाई Priority। Extreme Capitalism र Pure Communism दुवैभन्दा Middle Path।",
    context:       "Nepal Mixed Economy मा काम गर्छ — Private Sector स्वतन्त्र छ तर State ले Key Industries र Social Services को Regulation गर्छ। यो India को 'Socialistic Pattern' जस्तै।",
    youthRelevance: "सरकारी Hospital, School, र Public Service — यही Directive को Implementation। Pure Capitalism भए यी सबै Private हुन्थे।",
    sectors:       ["economy", "governance", "legal"],
    relatedTerms:  ["मिश्रित अर्थव्यवस्था", "सार्वजनिक क्षेत्र", "Social Security"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 5: राज्यको संरचना (State Structure)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "कार्यपालिका",
    termEnglish:   "Executive",
    category:      "state-organs",
    articleRef:    "धारा ७५-९७ — कार्यपालिका",
    definition:    "Executive (कार्यपालिका) भनेको सरकार चलाउने Branch। Nepal मा यो Prime Minister (प्रधानमन्त्री) र Council of Ministers (मन्त्रिपरिषद्) मिलेर बन्छ। Constitution ले Prime Minister लाई Executive Power दिन्छ।",
    context:       "Nepal Parliamentary System (संसदीय व्यवस्था) मा छ। President Ceremonial Head — असली Power Prime Minister सँग। Prime Minister ले Parliament को Confidence पाउनुपर्छ — नपाए Fall हुन्छ।",
    youthRelevance: "Prime Minister = देशको Chief Executive। बजेट, Policy, र Day-to-Day Governance उनको जिम्मा।",
    sectors:       ["governance", "legal", "politics"],
    relatedTerms:  ["व्यवस्थापिका", "न्यायपालिका", "राष्ट्रपति", "प्रधानमन्त्री"],
  },
  {
    termNepali:    "व्यवस्थापिका",
    termEnglish:   "Legislature / Parliament",
    category:      "state-organs",
    articleRef:    "धारा ८३-१०० — संघीय संसद",
    definition:    "Legislature (व्यवस्थापिका) भनेको कानुन बनाउने Branch। Nepal मा Federal Parliament (संघीय संसद) Bicameral (दुई सदन) छ: १) House of Representatives (प्रतिनिधिसभा) — २७५ Members। २) National Assembly (राष्ट्रियसभा) — ५९ Members।",
    context:       "Budget Pass गर्न, Law बनाउन, र Prime Minister छान्न Parliament चाहिन्छ। नागरिकले प्रतिनिधिसभाका Member हरू 5 वर्षमा चुन्छन्।",
    youthRelevance: "तपाईंले Vote गर्ने MP (Member of Parliament) नै तपाईंको Constituency को Law बनाउने प्रतिनिधि हो।",
    sectors:       ["governance", "legal", "politics"],
    relatedTerms:  ["कार्यपालिका", "प्रतिनिधिसभा", "राष्ट्रियसभा", "निर्वाचन"],
  },
  {
    termNepali:    "न्यायपालिका",
    termEnglish:   "Judiciary",
    category:      "state-organs",
    articleRef:    "धारा १२७-१५३ — न्यायपालिका",
    definition:    "Judiciary (न्यायपालिका) भनेको कानुन व्याख्या गर्ने र विवाद मिलाउने Branch। Nepal मा तीन तह: १) Supreme Court (सर्वोच्च अदालत)। २) High Court (उच्च अदालत) — ७ Province मा। ३) District Court (जिल्ला अदालत) — ७७ जिल्लामा।",
    context:       "Independent Judiciary (स्वतन्त्र न्यायपालिका) Democracy को Pillar। Judges को नियुक्ति Judicial Council गर्छ — Political Interference नहोस् भनेर।",
    youthRelevance: "विवाद परेमा Court मा जान सकिन्छ। Small Claims Court, Labour Court, र Consumer Court पनि छन्।",
    sectors:       ["legal", "governance"],
    relatedTerms:  ["सर्वोच्च अदालत", "कानुनी राज", "न्यायिक स्वतन्त्रता"],
  },
  {
    termNepali:    "संवैधानिक आयोग",
    termEnglish:   "Constitutional Commission",
    category:      "state-organs",
    articleRef:    "धारा २३५-२५३ — संवैधानिक आयोगहरू",
    definition:    "Constitutional Commissions (संवैधानिक आयोगहरू) — संविधानले नै स्थापना गरेका Independent Bodies। उदाहरण: CIAA (अख्तियार दुरुपयोग अनुसन्धान आयोग), Election Commission (निर्वाचन आयोग), Human Rights Commission, Lokman आयोग।",
    context:       "यी Commissions को Chairperson र Members को नियुक्ति Constitutional Council (संवैधानिक परिषद्) गर्छ। Government ले Direct Control गर्न नपाउने — Independent काम गर्ने।",
    youthRelevance: "CIAA ले Corruption गर्ने Official लाई पक्राउ गर्छ। Election Commission ले Fair Election सुनिश्चित गर्छ।",
    sectors:       ["governance", "legal"],
    relatedTerms:  ["CIAA", "निर्वाचन आयोग", "मानवअधिकार आयोग"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 6: आर्थिक शब्दावली (Economic Terms)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "राष्ट्रिय प्राकृतिक स्रोत र वित्त आयोग",
    termEnglish:   "National Natural Resources and Fiscal Commission",
    category:      "economic",
    articleRef:    "धारा २५१-२५३ — राष्ट्रिय प्राकृतिक स्रोत तथा वित्त आयोग",
    definition:    "NNRFC (National Natural Resources and Fiscal Commission) — संघ, प्रदेश, र स्थानीय सरकारबीच Revenue र Natural Resources कसरी बाँड्ने भन्ने तय गर्ने संवैधानिक आयोग।",
    context:       "Hydropower, Forest, र Land Revenue — को पाउँछ? यो NNRFC ले तय गर्छ। Federalism को Financial Pillar यही आयोग हो।",
    youthRelevance: "तपाईंको District मा Hydropower Project छ भने Revenue को केही हिस्सा Local Government लाई जानुपर्छ — NNRFC ले सुनिश्चित गर्छ।",
    sectors:       ["economy", "governance", "energy"],
    relatedTerms:  ["संघीयता", "राजस्व बाँडफाँड", "जलविद्युत"],
  },
  {
    termNepali:    "राजस्व",
    termEnglish:   "Revenue",
    category:      "economic",
    articleRef:    "धारा ११९ — संघीय संचित कोष",
    definition:    "Revenue (राजस्व) भनेको सरकारको आम्दानी। मुख्य स्रोत: Income Tax (आयकर), VAT (मूल्य अभिवृद्धि कर), Custom Duty (भन्सार), र Non-Tax Revenue (सरकारी सेवाको शुल्क)।",
    context:       "Nepal को वार्षिक Revenue: रु. ~१,५०० अर्ब। Budget: रु. ~१,८०० अर्ब — Gap Borrowing (ऋण) बाट पूरा गरिन्छ।",
    youthRelevance: "तपाईंले तिर्ने VAT, Income Tax — नै सरकारको आम्दानी। यो पैसाले School, Road, Hospital बन्छ।",
    sectors:       ["economy", "governance"],
    relatedTerms:  ["करप्रणाली", "बजेट", "राजकोषीय घाटा"],
  },
  {
    termNepali:    "मौद्रिक नीति",
    termEnglish:   "Monetary Policy",
    category:      "economic",
    articleRef:    "नेपाल राष्ट्र बैंक ऐन २०५८",
    definition:    "Monetary Policy (मौद्रिक नीति) — NRB (Nepal Rastra Bank) ले Inflation नियन्त्रण गर्न र Credit Flow Manage गर्न लिने नीति। Interest Rate तल-माथि गरेर Economy Regulate गरिन्छ।",
    context:       "NRB ले वर्षमा दुई पटक Monetary Policy जारी गर्छ। Policy Rate (प्रमुख व्याजदर) बढे Commercial Bank को Loan महँगो हुन्छ — Borrowing घट्छ — Inflation नियन्त्रण।",
    youthRelevance: "NRB ले Interest Rate बढाउँदा Home Loan र Car Loan महँगो हुन्छ — तपाईंको EMI बढ्छ।",
    sectors:       ["economy", "banking"],
    relatedTerms:  ["NRB", "व्याजदर", "मुद्रास्फीति", "ऋण"],
  },
  {
    termNepali:    "राजकोषीय नीति",
    termEnglish:   "Fiscal Policy",
    category:      "economic",
    articleRef:    "धारा ११९-१२३ — बजेट प्रक्रिया",
    definition:    "Fiscal Policy (राजकोषीय नीति) — सरकारले Revenue Collect गर्ने र Expenditure गर्ने नीति। Budget नै Fiscal Policy को मुख्य Tool। Tax बढाए Contractionary — Tax घटाए Expansionary Fiscal Policy।",
    context:       "Nepal को Fiscal Year Shrawan-Ashadh (जुलाई-जुन)। Finance Minister ले Budget Ashadh 15 (जुन 29) सम्म Parliament मा Present गर्नुपर्छ।",
    youthRelevance: "Budget मा के छ भनेर थाहा पाउनु महत्त्वपूर्ण — Youth Employment, Scholarship, र Startup Policy यहीँ हुन्छ।",
    sectors:       ["economy", "governance"],
    relatedTerms:  ["बजेट", "राजस्व", "मौद्रिक नीति"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 7: सामाजिक शब्दावली (Social Terms)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "सामाजिक न्याय",
    termEnglish:   "Social Justice",
    category:      "social",
    articleRef:    "धारा ४२ — सामाजिक न्यायको हक",
    definition:    "Social Justice (सामाजिक न्याय) — समाजमा सबैलाई समान अवसर, निष्पक्ष वितरण, र ऐतिहासिक अन्याय सुधार। Marginalized Groups लाई Mainstream मा ल्याउने राज्यको दायित्व।",
    context:       "Nepal को Constitution ले Dalit, Janajati, Madhesi, Women, र अपाङ्ग नागरिकलाई Education, Employment, र Political Representation मा Affirmative Action (सकारात्मक विभेद) दिन्छ।",
    youthRelevance: "Loksewa मा Quota, Scholarship मा Reservation — यी सब Social Justice को Implementation।",
    sectors:       ["social", "legal", "governance"],
    relatedTerms:  ["आरक्षण", "समानताको हक", "समावेशिता"],
  },
  {
    termNepali:    "आरक्षण",
    termEnglish:   "Reservation / Affirmative Action",
    category:      "social",
    articleRef:    "धारा ४०-४२ — विशेष अधिकार",
    definition:    "Reservation (आरक्षण) — ऐतिहासिक रूपमा पिछडिएका समूहलाई Government Job, Education, र Political Representation मा Quota दिने नीति। Nepal मा: Dalit (९%), Janajati (२७%), Madhesi, Muslim, Women (३३%) लाई Quota।",
    context:       "लोकसेवा परीक्षामा Open Competition र Inclusive Group को अलग-अलग Post। Parliament मा ३३% महिला Reservation Mandatory — यो Constitutional Requirement।",
    youthRelevance: "आफ्नो Category मा Eligible भए अलग Quota मा Apply गर्न सकिन्छ — Competition कम।",
    sectors:       ["social", "employment", "legal", "governance"],
    relatedTerms:  ["समावेशिता", "दलित अधिकार", "जनजाति"],
  },
  {
    termNepali:    "संस्कृति र भाषाको हक",
    termEnglish:   "Right to Culture and Language",
    category:      "fundamental-rights",
    articleRef:    "धारा ३२ — संस्कृतिको हक",
    definition:    "Right to Culture and Language (संस्कृति र भाषाको हक) — प्रत्येक समुदायले आफ्नो भाषा, संस्कृति, र धार्मिक परम्परा अभ्यास गर्ने अधिकार। Mother Tongue Education को अधिकार।",
    context:       "Nepal मा १२३ भाषा छन्। Constitution ले सबै भाषालाई राष्ट्रिय भाषाको मान्यता दिन्छ। Mother Tongue मा Primary Education को अधिकार छ।",
    youthRelevance: "Newari, Tamang, Maithili, Tharu — तपाईंको Mother Tongue मा पढ्ने अधिकार Constitution ले दिएको छ।",
    sectors:       ["social", "education", "legal"],
    relatedTerms:  ["भाषिक अधिकार", "सांस्कृतिक सम्पदा", "समावेशिता"],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PART 8: महत्त्वपूर्ण संस्थाहरू (Key Institutions)
  // ══════════════════════════════════════════════════════════════════════════
  {
    termNepali:    "नेपाल राष्ट्र बैंक",
    termEnglish:   "Nepal Rastra Bank (NRB)",
    category:      "institutions",
    articleRef:    "नेपाल राष्ट्र बैंक ऐन २०५८",
    definition:    "NRB (Nepal Rastra Bank) भनेको Nepal को Central Bank (केन्द्रीय बैंक)। मुख्य काम: Monetary Policy, Banking Regulation, र Foreign Exchange Management। Nepal को Currency रुपैयाँ (Nepali Rupee) NRB ले Issue गर्छ।",
    context:       "NRB ले Commercial Bank, Development Bank, Finance Company, र Cooperative (ठूला) हरूलाई Regulate गर्छ। Interest Rate, Loan Policy, र Financial System Stability NRB को जिम्मा।",
    youthRelevance: "तपाईंको Bank Account, Home Loan Interest Rate, र Mobile Banking — सबै NRB ले Regulate गर्छ।",
    sectors:       ["banking", "economy", "governance"],
    relatedTerms:  ["मौद्रिक नीति", "व्याजदर", "वाणिज्य बैंक", "NEPSE"],
  },
  {
    termNepali:    "कर्मचारी सञ्चय कोष",
    termEnglish:   "Employees Provident Fund (EPF)",
    category:      "institutions",
    articleRef:    "कर्मचारी सञ्चय कोष ऐन २०१९",
    definition:    "EPF (Employees Provident Fund — कर्मचारी सञ्चय कोष) — Formal Sector Employee को Retirement Fund। Employer र Employee दुवैले Monthly Salary को निश्चित % Contribute गर्छन्। हाल Interest Rate: ८.५% प्रति वर्ष।",
    context:       "Nepal मा Formal Job गर्ने करिब १५ लाख Worker EPF Member छन्। EPF Fund ले NEPSE मा Investment गर्छ र Housing Loan पनि दिन्छ। EPF-CIT Merger नीति अन्तर्गत यो बदलिँदैछ।",
    youthRelevance: "Formal Job मा काम गरेमा तपाईंको Retirement को लागि पैसा जम्मा हुँदैछ — Retirement पछि एकमुष्ट पाउनुहुनेछ।",
    sectors:       ["employment", "banking", "economy"],
    relatedTerms:  ["SSF", "CIT", "सामाजिक सुरक्षा", "Retirement"],
  },
  {
    termNepali:    "सामाजिक सुरक्षा कोष",
    termEnglish:   "Social Security Fund (SSF)",
    category:      "institutions",
    articleRef:    "सामाजिक सुरक्षा ऐन २०७४",
    definition:    "SSF (Social Security Fund — सामाजिक सुरक्षा कोष) — Worker हरूलाई Medical, Maternity, Accident, र Retirement Benefit दिने Fund। Employer ले Salary को ३.२८% र Employee ले ११% Contribute गर्छन्।",
    context:       "SSF 2075 देखि Formal Sector मा Mandatory भयो। Informal Sector मा अझै Limited Coverage। नयाँ नीतिमा Self-Employed Worker (Freelancer, Driver, Shopkeeper) मा पनि SSF विस्तार हुँदैछ।",
    youthRelevance: "SSF Member भए Accident भए Medical खर्च, Maternity Leave मा Pay, र Retirement Pension — सबै पाइन्छ।",
    sectors:       ["employment", "health", "economy"],
    relatedTerms:  ["EPF", "CIT", "सामाजिक सुरक्षा", "Formal Employment"],
  },
  {
    termNepali:    "NEPSE",
    termEnglish:   "Nepal Stock Exchange",
    category:      "institutions",
    articleRef:    "Securities Act 2063",
    definition:    "NEPSE (Nepal Stock Exchange) — Nepal को Stock Market (शेयर बजार)। Listed Company को Share किनबेच गर्ने Platform। SEBON (Securities Board of Nepal) ले Regulate गर्छ।",
    context:       "NEPSE मा अहिले ३०० भन्दा बढी Companies Listed छन्। Banks, Insurance, Hydropower, Hotel — सबै Sector। NEPSE Index ले Share Market को Overall Health देखाउँछ।",
    youthRelevance: "NEPSE मा Share किन्नु Investment को एक तरिका हो। Demat Account खोलेर Share किन्न सकिन्छ — Minimum Investment सानो छ।",
    sectors:       ["banking", "economy"],
    relatedTerms:  ["SEBON", "ETF", "Mutual Fund", "IPO", "Demat"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const ownerId = process.env.OWNER_ID || DEV_OWNER_ID;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  ZZC Constitution Terms Seeder — Nepal Constitution 2072");
  console.log("  Foundational Dictionary for ZZC Janta Public Intelligence");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  Owner:  ${ownerId}`);
  console.log(`  Terms:  ${CONSTITUTION_TERMS.length}`);
  console.log(`  Target: civic_terms\n`);

  // Check existing
  const existing = await db.collection("civic_terms")
    .where("source", "==", SOURCE)
    .get();

  if (!existing.empty) {
    console.log(`⚠  Found ${existing.size} existing terms for Constitution.`);
    if (!process.argv.includes("--force")) {
      console.log("   Pass --force to overwrite. Exiting.\n");
      process.exit(0);
    }
    console.log("   --force passed — deleting and re-seeding...");
    const batch = db.batch();
    existing.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    console.log(`   ✓ Deleted ${existing.size} existing terms.\n`);
  }

  // Write in batches
  const BATCH_SIZE = 499;
  let written = 0;
  const NOW_TIME = new Date().toISOString();

  for (let i = 0; i < CONSTITUTION_TERMS.length; i += BATCH_SIZE) {
    const chunk = CONSTITUTION_TERMS.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const term of chunk) {
      const ref = db.collection("civic_terms").doc();
      batch.set(ref, {
        id:             ref.id,
        source:         SOURCE,
        sourceTitle:    "नेपालको संविधान, २०७२",
        sourceTitleEn:  "Constitution of Nepal 2072",
        ownerId,
        termNepali:     term.termNepali,
        termEnglish:    term.termEnglish,
        category:       term.category,
        articleRef:     term.articleRef,
        definition:     term.definition,
        context:        term.context,
        youthRelevance: term.youthRelevance,
        sectors:        term.sectors,
        relatedTerms:   term.relatedTerms,
        publishToJanta: true,
        verifiedByAdmin: false,
        createdAt:      NOW_TIME,
        updatedAt:      NOW_TIME,
      });
    }

    await batch.commit();
    written += chunk.length;
    console.log(`  ✓ Written ${written}/${CONSTITUTION_TERMS.length} terms`);
  }

  console.log(`\n  ✓ All ${written} Constitution terms seeded.`);
  console.log(`\n  These form the FOUNDATIONAL DICTIONARY for ZZC Janta.`);
  console.log(`  Every policy point, NRB circular, and budget item maps to these terms.`);
  console.log("═══════════════════════════════════════════════════════════════════\n");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
