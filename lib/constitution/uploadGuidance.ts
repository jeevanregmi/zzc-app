// Upload guidance per constitutional part.
// Tells admin exactly which documents to upload to feed that branch's intelligence.
// Source links are resolved dynamically via lib/vault/sourceResolver — not stored here.

export type VaultCategory =
  | "intelligence" | "research" | "legal" | "finance" | "strategy" | "other";

export interface UploadRecommendation {
  title:    string;          // Nepali document type name
  titleEn:  string;          // English for clarity
  category: VaultCategory;
  tags:     string[];        // suggested tags to add when uploading
  template: string;          // pre-written description template to paste
  priority: "high" | "medium" | "low";
}

export interface PartUploadGuidance {
  partNumber: number;
  guidance:   UploadRecommendation[];
}

export const UPLOAD_GUIDANCE: Record<number, UploadRecommendation[]> = {
  1: [
    { title: "संविधान पाठ", titleEn: "Nepal Constitution 2015 full text", category: "legal", tags: ["constitution", "2072", "nepal", "fundamental-law"], template: "नेपालको संविधान २०७२ को पूर्ण पाठ — सबै भागहरूको मूल स्रोत।", priority: "high" },
    { title: "संवैधानिक संशोधन", titleEn: "Constitutional amendments", category: "legal", tags: ["amendment", "constitution", "parliament"], template: "नेपालको संविधानमा भएको संशोधन {n} — संसदद्वारा पारित।", priority: "high" },
  ],
  2: [
    { title: "नागरिकता ऐन", titleEn: "Citizenship Act", category: "legal", tags: ["citizenship", "nagarikta", "identity", "act"], template: "नेपालको नागरिकता ऐन — नागरिकता प्रदान गर्ने प्रक्रिया र मापदण्ड।", priority: "high" },
    { title: "गृह मन्त्रालय नागरिकता निर्देशिका", titleEn: "MoHA citizenship directives", category: "intelligence", tags: ["citizenship", "ministry-home", "directive", "nagarikta"], template: "गृह मन्त्रालयले जारी गरेको नागरिकता सम्बन्धी निर्देशिका वा परिपत्र।", priority: "medium" },
    { title: "नागरिकता वितरण तथ्यांक", titleEn: "Citizenship distribution statistics", category: "research", tags: ["citizenship", "statistics", "data", "gender"], template: "वार्षिक नागरिकता वितरण तथ्यांक — लिंग, प्रदेश र जातीयताको आधारमा।", priority: "medium" },
  ],
  3: [
    { title: "शिक्षा नीति", titleEn: "National Education Policy", category: "intelligence", tags: ["education", "policy", "fundamental-rights", "ministry-education"], template: "राष्ट्रिय शिक्षा नीति — शिक्षाको मौलिक हक कार्यान्वयनको आधार।", priority: "high" },
    { title: "स्वास्थ्य नीति", titleEn: "National Health Policy", category: "intelligence", tags: ["health", "policy", "fundamental-rights", "ministry-health"], template: "राष्ट्रिय स्वास्थ्य नीति — स्वास्थ्यको मौलिक हक कार्यान्वयन।", priority: "high" },
    { title: "श्रम ऐन / रोजगार नीति", titleEn: "Labour Act / Employment Policy", category: "legal", tags: ["labour", "employment", "rights", "ministry-labour"], template: "श्रम ऐन वा रोजगार नीति — रोजगारीको हकको कानूनी आधार।", priority: "high" },
    { title: "अदालती फैसला (हक सम्बन्धी)", titleEn: "Court decisions on fundamental rights", category: "legal", tags: ["court", "fundamental-rights", "judiciary", "landmark"], template: "मौलिक हकसँग सम्बन्धित सर्वोच्च अदालतको उल्लेखनीय फैसला।", priority: "high" },
    { title: "मानव अधिकार आयोगको वार्षिक प्रतिवेदन", titleEn: "NHRC Annual Report", category: "research", tags: ["human-rights", "NHRC", "annual-report", "monitoring"], template: "राष्ट्रिय मानव अधिकार आयोगको वार्षिक प्रतिवेदन — हक उल्लंघनको अवस्था।", priority: "high" },
    { title: "नागरिक गुनासो तथा सार्वजनिक सुनुवाइ", titleEn: "Citizen complaints / public hearings", category: "intelligence", tags: ["complaints", "citizen", "public-hearing", "rights-violation"], template: "नागरिकका गुनासा र सार्वजनिक सुनुवाइका अभिलेख — मौलिक हकको व्यावहारिक कार्यान्वयन।", priority: "medium" },
    { title: "खाद्य सुरक्षा प्रतिवेदन", titleEn: "Food security report", category: "research", tags: ["food-security", "nutrition", "rights", "poverty"], template: "खाद्य सुरक्षा र पोषणस्थिति सम्बन्धी प्रतिवेदन — खाद्यको हक (धारा ३६)।", priority: "medium" },
  ],
  4: [
    { title: "आवधिक योजना", titleEn: "Periodic Plan (NPC)", category: "strategy", tags: ["periodic-plan", "NPC", "development", "niti-aayog"], template: "राष्ट्रिय योजना आयोगको {n} आवधिक योजना — निर्देशक सिद्धान्तको कार्यान्वयन खाका।", priority: "high" },
    { title: "वार्षिक बजेट", titleEn: "Annual Federal Budget", category: "finance", tags: ["budget", "annual", "federal", "ministry-finance"], template: "संघीय सरकारको आर्थिक वर्ष {year} को बजेट — निर्देशक सिद्धान्त कार्यान्वयन कोष।", priority: "high" },
    { title: "नीति तथा कार्यक्रम", titleEn: "Government Policy and Program (Niti tatha Karyakram)", category: "intelligence", tags: ["niti-karyakram", "government-program", "annual", "federal"], template: "सरकारको वार्षिक नीति तथा कार्यक्रम — सरकारको प्राथमिकता र प्रतिबद्धताहरू।", priority: "high" },
    { title: "क्षेत्रगत रणनीति", titleEn: "Sectoral strategy (agriculture, energy, etc.)", category: "strategy", tags: ["sectoral", "strategy", "agriculture", "energy", "directive-principles"], template: "क्षेत्रगत रणनीति — {sector} क्षेत्रको दीर्घकालीन विकास योजना।", priority: "medium" },
    { title: "दिगो विकास लक्ष्य (SDG) प्रतिवेदन", titleEn: "SDG Progress Report", category: "research", tags: ["SDG", "development", "international", "monitoring"], template: "नेपालको दिगो विकास लक्ष्य (SDG) प्रगति प्रतिवेदन — निर्देशक सिद्धान्तसँग तुलना।", priority: "medium" },
  ],
  5: [
    { title: "संघीयता कार्यान्वयन प्रतिवेदन", titleEn: "Federalism implementation report", category: "research", tags: ["federalism", "state-structure", "implementation", "MoFAGA"], template: "संघीयता कार्यान्वयनको अवस्था सम्बन्धी प्रतिवेदन — शक्ति बाँडफाँटको व्यावहारिक स्थिति।", priority: "high" },
    { title: "संघ-प्रदेश सम्बन्ध समन्वय कागज", titleEn: "Federal-Provincial coordination documents", category: "intelligence", tags: ["federalism", "coordination", "province", "federal-relations"], template: "संघ र प्रदेश बीचको समन्वय बैठकका निर्णय वा सम्झौता।", priority: "medium" },
  ],
  6: [
    { title: "राष्ट्रपति कार्यालयको वार्षिक प्रतिवेदन", titleEn: "President's Office Annual Report", category: "intelligence", tags: ["president", "annual-report", "constitution"], template: "राष्ट्रपति कार्यालयको वार्षिक प्रतिवेदन — संवैधानिक भूमिका र कार्यहरू।", priority: "low" },
  ],
  7: [
    { title: "मन्त्रिपरिषद् निर्णयहरू", titleEn: "Cabinet decisions", category: "intelligence", tags: ["cabinet", "government-decision", "federal-executive"], template: "मन्त्रिपरिषद्का प्रमुख निर्णयहरू — कार्यपालिकाको नीतिगत दिशा।", priority: "high" },
    { title: "मन्त्रालयगत वार्षिक प्रतिवेदन", titleEn: "Ministry annual reports", category: "intelligence", tags: ["ministry", "annual-report", "program", "implementation"], template: "{ministry} मन्त्रालयको वार्षिक प्रतिवेदन — कार्यक्रम कार्यान्वयनको अवस्था।", priority: "high" },
    { title: "प्रधानमन्त्री कार्यालयको प्रतिवेदन", titleEn: "PMO report / progress review", category: "intelligence", tags: ["PMO", "progress", "government", "executive"], template: "प्रधानमन्त्री कार्यालयको सरकारी कार्यक्रम प्रगति समीक्षा।", priority: "medium" },
  ],
  8: [
    { title: "संसदीय समिति प्रतिवेदन", titleEn: "Parliamentary committee reports", category: "research", tags: ["parliament", "committee", "oversight", "legislation"], template: "संघीय संसदको {committee} समितिको अनुसन्धान वा अनुगमन प्रतिवेदन।", priority: "high" },
    { title: "संसद् बैठकका निर्णय/कार्यसूची", titleEn: "Parliament session proceedings", category: "intelligence", tags: ["parliament", "session", "proceedings", "legislation"], template: "संघीय संसदको अधिवेशन कार्यसूची वा प्रमुख निर्णयहरू।", priority: "medium" },
  ],
  9: [
    { title: "ऐन/नियमावली", titleEn: "Federal Acts and regulations", category: "legal", tags: ["act", "law", "regulation", "federal"], template: "{act-name} ऐन — संघीय कानून निर्माण प्रक्रियाको उपज।", priority: "high" },
    { title: "कानूनी समीक्षा प्रतिवेदन", titleEn: "Law Commission review report", category: "legal", tags: ["law-commission", "legal-review", "reform"], template: "कानून आयोगको {topic} सम्बन्धी कानूनी समीक्षा प्रतिवेदन।", priority: "medium" },
  ],
  10: [
    { title: "सार्वजनिक वित्त व्यवस्थापन रणनीति", titleEn: "Public Financial Management strategy", category: "finance", tags: ["PFM", "financial-procedure", "treasury", "federal"], template: "सार्वजनिक वित्त व्यवस्थापन रणनीति — संघीय आर्थिक कार्यविधि सुदृढीकरण।", priority: "high" },
    { title: "महालेखा नियन्त्रकको प्रतिवेदन", titleEn: "Comptroller General's report", category: "finance", tags: ["comptroller", "expenditure", "budget-execution", "treasury"], template: "महालेखा नियन्त्रक कार्यालयको बजेट कार्यान्वयन वार्षिक प्रतिवेदन।", priority: "medium" },
  ],
  11: [
    { title: "सर्वोच्च अदालतको वार्षिक प्रतिवेदन", titleEn: "Supreme Court Annual Report", category: "legal", tags: ["supreme-court", "judiciary", "annual-report", "justice"], template: "सर्वोच्च अदालतको वार्षिक प्रतिवेदन — न्याय प्रशासनको अवस्था।", priority: "high" },
    { title: "न्याय परिषद् प्रतिवेदन", titleEn: "Judicial Council report", category: "legal", tags: ["judicial-council", "judges", "appointment", "discipline"], template: "न्याय परिषद्को वार्षिक प्रतिवेदन — न्यायाधीश नियुक्ति र अनुशासन।", priority: "high" },
    { title: "न्याय सुधार प्रतिवेदन", titleEn: "Justice reform / access to justice report", category: "research", tags: ["justice-reform", "access-to-justice", "legal-aid"], template: "न्याय पहुँच र न्याय सुधार सम्बन्धी अध्ययन प्रतिवेदन।", priority: "high" },
    { title: "उल्लेखनीय अदालती फैसलाहरू", titleEn: "Landmark court decisions", category: "legal", tags: ["court-decision", "landmark", "precedent", "judiciary"], template: "सर्वोच्च वा उच्च अदालतको {topic} सम्बन्धी उल्लेखनीय फैसला।", priority: "medium" },
  ],
  12: [
    { title: "महान्यायाधिवक्ताको वार्षिक प्रतिवेदन", titleEn: "Attorney General Annual Report", category: "legal", tags: ["attorney-general", "prosecution", "legal-opinion", "annual"], template: "महान्यायाधिवक्ता कार्यालयको वार्षिक प्रतिवेदन — सरकारी मुद्दा र कानूनी सल्लाह।", priority: "medium" },
  ],
  13: [
    { title: "प्रदेश सरकारको वार्षिक प्रतिवेदन", titleEn: "Provincial government annual report", category: "intelligence", tags: ["province", "annual-report", "provincial-government"], template: "प्रदेश {n} सरकारको वार्षिक प्रतिवेदन — प्रदेश शासनको अवस्था।", priority: "high" },
    { title: "प्रदेश बजेट", titleEn: "Provincial budget", category: "finance", tags: ["province", "budget", "provincial-finance"], template: "प्रदेश {n} को वार्षिक बजेट — प्रदेश तहको वित्तीय प्राथमिकता।", priority: "high" },
    { title: "संघीयता अनुगमन प्रतिवेदन", titleEn: "Federalism monitoring report (MoFAGA)", category: "research", tags: ["federalism", "monitoring", "MoFAGA", "province"], template: "संघीय मामिला तथा सामान्य प्रशासन मन्त्रालयको संघीयता अनुगमन प्रतिवेदन।", priority: "medium" },
  ],
  14: [
    { title: "प्रदेश मन्त्रिपरिषद् निर्णय", titleEn: "Provincial Cabinet decisions", category: "intelligence", tags: ["provincial-cabinet", "executive", "decision", "province"], template: "प्रदेश {n} मन्त्रिपरिषद्का प्रमुख निर्णयहरू।", priority: "medium" },
  ],
  15: [
    { title: "प्रदेश सभाका विधेयक/निर्णय", titleEn: "Provincial Assembly bills/decisions", category: "legal", tags: ["provincial-assembly", "legislation", "province", "bills"], template: "प्रदेश {n} सभाले पारित गरेका विधेयक वा प्रमुख निर्णयहरू।", priority: "medium" },
  ],
  16: [
    { title: "प्रदेश ऐन/नियमावली", titleEn: "Provincial laws and regulations", category: "legal", tags: ["provincial-law", "regulation", "province", "act"], template: "प्रदेश {n} ले निर्माण गरेको {topic} सम्बन्धी ऐन वा नियमावली।", priority: "medium" },
  ],
  17: [
    { title: "उच्च अदालत प्रतिवेदन", titleEn: "High Court (provincial) annual report", category: "legal", tags: ["high-court", "provincial-judiciary", "justice", "province"], template: "प्रदेश {n} उच्च अदालतको वार्षिक प्रतिवेदन।", priority: "medium" },
  ],
  18: [
    { title: "स्थानीय सरकार वार्षिक प्रतिवेदन", titleEn: "Municipal / rural municipality annual report", category: "intelligence", tags: ["local-government", "municipality", "annual-report", "gaunpalika"], template: "{municipality} नगरपालिका/गाउँपालिकाको वार्षिक प्रतिवेदन — स्थानीय शासनको अवस्था।", priority: "high" },
    { title: "वडा समिति निर्णयहरू", titleEn: "Ward committee decisions / notices", category: "intelligence", tags: ["ward", "local", "decision", "notice"], template: "वडा {n} को समिति निर्णय वा सार्वजनिक सूचना।", priority: "medium" },
  ],
  19: [
    { title: "स्थानीय सभाका निर्णय", titleEn: "Local assembly (council) decisions", category: "intelligence", tags: ["local-assembly", "palika-sabha", "local-legislation"], template: "{municipality} नगर/गाउँसभाका प्रमुख निर्णय वा विनियमावली।", priority: "medium" },
  ],
  20: [
    { title: "स्थानीय सरकार सञ्चालन ऐन", titleEn: "Local Government Operation Act", category: "legal", tags: ["local-governance", "act", "palika", "operation"], template: "स्थानीय सरकार सञ्चालन ऐन — स्थानीय शासनको कानूनी आधार।", priority: "high" },
    { title: "नगर/गाउँपालिकाको आवधिक योजना", titleEn: "Municipality periodic/master plan", category: "strategy", tags: ["municipality", "plan", "local-development", "periodic-plan"], template: "{municipality} को {n} आवधिक योजना — स्थानीय विकासको रोडम्याप।", priority: "high" },
    { title: "सेवा प्रवाह सुधार प्रतिवेदन", titleEn: "Local service delivery improvement report", category: "research", tags: ["service-delivery", "local", "improvement", "citizen"], template: "स्थानीय सरकारको सेवा प्रवाह अवस्था र सुधारसम्बन्धी प्रतिवेदन।", priority: "medium" },
  ],
  21: [
    { title: "स्थानीय तह वित्त अनुगमन", titleEn: "Local government finance monitoring (FCGO)", category: "finance", tags: ["local-finance", "monitoring", "FCGO", "municipality"], template: "महालेखा नियन्त्रक कार्यालयको स्थानीय तह वित्त अनुगमन प्रतिवेदन।", priority: "high" },
    { title: "नगरपालिकाको वार्षिक बजेट", titleEn: "Municipality annual budget", category: "finance", tags: ["municipality", "budget", "local-finance", "annual"], template: "{municipality} को आर्थिक वर्ष {year} को वार्षिक बजेट।", priority: "high" },
    { title: "राजस्व बाँडफाँट प्रतिवेदन", titleEn: "Revenue sharing / fiscal transfer report", category: "finance", tags: ["revenue-sharing", "fiscal-transfer", "local", "grant"], template: "संघ-प्रदेश-स्थानीय तहबीच राजस्व बाँडफाँट तथा वित्तीय हस्तान्तरण प्रतिवेदन।", priority: "medium" },
  ],
  22: [
    { title: "अन्तर सरकारी वित्तीय हस्तान्तरण प्रतिवेदन", titleEn: "Intergovernmental fiscal transfer report", category: "finance", tags: ["intergovernmental", "fiscal-transfer", "coordination", "NPC"], template: "राष्ट्रिय प्राकृतिक स्रोत तथा वित्त आयोगको वित्तीय हस्तान्तरण प्रतिवेदन।", priority: "high" },
    { title: "समन्वय परिषद् बैठकका निर्णय", titleEn: "Coordination council meeting decisions", category: "intelligence", tags: ["coordination", "inter-government", "meeting", "federal"], template: "अन्तर प्रदेश परिषद् वा समन्वय परिषद्का बैठकका निर्णयहरू।", priority: "medium" },
  ],
  23: [
    { title: "राष्ट्रिय प्राकृतिक स्रोत तथा वित्त आयोग प्रतिवेदन", titleEn: "NNRFC report", category: "finance", tags: ["NNRFC", "fiscal-system", "natural-resources", "finance"], template: "राष्ट्रिय प्राकृतिक स्रोत तथा वित्त आयोगको वार्षिक प्रतिवेदन।", priority: "high" },
    { title: "राजस्व नीति", titleEn: "Revenue / Tax policy documents", category: "finance", tags: ["tax", "revenue", "policy", "IRD"], template: "आन्तरिक राजस्व विभागको राजस्व नीति वा कर सम्बन्धी दिशानिर्देश।", priority: "high" },
    { title: "NRB मौद्रिक नीति", titleEn: "NRB Monetary Policy", category: "finance", tags: ["NRB", "monetary-policy", "banking", "interest-rate"], template: "राष्ट्र बैंकको वार्षिक मौद्रिक नीति — वित्त व्यवस्थाको मुख्य साधन।", priority: "medium" },
  ],
  24: [
    { title: "अख्तियार दुरुपयोग अनुसन्धान आयोगको वार्षिक प्रतिवेदन", titleEn: "CIAA Annual Report", category: "research", tags: ["CIAA", "corruption", "accountability", "annual-report"], template: "अख्तियार दुरुपयोग अनुसन्धान आयोगको वार्षिक प्रतिवेदन — भ्रष्टाचार नियन्त्रणको अवस्था।", priority: "high" },
    { title: "भ्रष्टाचार मुद्दाको सारांश", titleEn: "Corruption case summary / Special Court decisions", category: "legal", tags: ["corruption", "special-court", "CIAA", "prosecution"], template: "विशेष अदालतमा दायर भ्रष्टाचार मुद्दाहरूको सारांश र फैसला।", priority: "high" },
    { title: "सुशासन सूचकांक", titleEn: "Good governance index / report", category: "research", tags: ["governance", "transparency", "index", "accountability"], template: "सुशासन सूचकांक वा पारदर्शिता मूल्यांकन प्रतिवेदन।", priority: "medium" },
  ],
  25: [
    { title: "महालेखापरीक्षकको वार्षिक प्रतिवेदन", titleEn: "Auditor General Annual Report", category: "finance", tags: ["auditor-general", "audit", "annual-report", "irregularity"], template: "महालेखापरीक्षकको वार्षिक प्रतिवेदन — सरकारी खर्चको लेखापरीक्षण।", priority: "high" },
    { title: "बेरुजु फर्छ्यौट प्रगति", titleEn: "Audit irregularity clearance report", category: "finance", tags: ["audit", "irregularity", "clearance", "accountability"], template: "बेरुजु फर्छ्यौटको प्रगति प्रतिवेदन — सरकारी जवाफदेहिताको मापन।", priority: "medium" },
  ],
  26: [
    { title: "लोक सेवा आयोगको वार्षिक प्रतिवेदन", titleEn: "PSC Annual Report", category: "research", tags: ["PSC", "civil-service", "recruitment", "annual-report"], template: "लोक सेवा आयोगको वार्षिक प्रतिवेदन — निजामती सेवा भर्ना र परीक्षाको अवस्था।", priority: "high" },
    { title: "निजामती सेवा सुधार प्रतिवेदन", titleEn: "Civil service reform report", category: "strategy", tags: ["civil-service", "reform", "capacity", "governance"], template: "निजामती सेवा सुधार र क्षमता विकाससम्बन्धी प्रतिवेदन।", priority: "medium" },
  ],
  27: [
    { title: "निर्वाचन आयोगको वार्षिक प्रतिवेदन", titleEn: "Election Commission Annual Report", category: "research", tags: ["election", "commission", "annual-report", "democracy"], template: "निर्वाचन आयोगको वार्षिक प्रतिवेदन — निर्वाचन प्रक्रिया र परिणाम।", priority: "high" },
    { title: "निर्वाचन परिणाम तथ्यांक", titleEn: "Election results data", category: "research", tags: ["election-results", "data", "statistics", "representation"], template: "{year} सालको {election-type} निर्वाचनको परिणाम तथ्यांक।", priority: "medium" },
    { title: "निर्वाचन सुधार प्रस्ताव", titleEn: "Electoral reform proposal/report", category: "strategy", tags: ["electoral-reform", "democracy", "representation", "commission"], template: "निर्वाचन प्रणाली सुधारसम्बन्धी प्रतिवेदन वा प्रस्ताव।", priority: "medium" },
  ],
  28: [
    { title: "राष्ट्रिय मानव अधिकार आयोग प्रतिवेदन", titleEn: "NHRC Annual Report", category: "research", tags: ["NHRC", "human-rights", "monitoring", "annual-report"], template: "राष्ट्रिय मानव अधिकार आयोगको वार्षिक प्रतिवेदन — मानव अधिकारको अवस्था।", priority: "high" },
    { title: "संयुक्त राष्ट्रसंघ UPR प्रतिवेदन", titleEn: "UN Universal Periodic Review (UPR) report", category: "research", tags: ["UPR", "UN", "human-rights", "international"], template: "नेपालको यूपीआर (Universal Periodic Review) प्रतिवेदन — अन्तर्राष्ट्रिय मानव अधिकार समीक्षा।", priority: "medium" },
    { title: "मानव तस्करी तथा श्रम शोषण प्रतिवेदन", titleEn: "Human trafficking / labour exploitation report", category: "research", tags: ["trafficking", "labour", "exploitation", "rights"], template: "मानव तस्करी र श्रम शोषण नियन्त्रणसम्बन्धी प्रतिवेदन।", priority: "medium" },
  ],
  29: [
    { title: "राष्ट्रिय महिला आयोगको वार्षिक प्रतिवेदन", titleEn: "National Women Commission Annual Report", category: "research", tags: ["women", "gender", "commission", "annual-report"], template: "राष्ट्रिय महिला आयोगको वार्षिक प्रतिवेदन — महिला अधिकार र समानताको अवस्था।", priority: "high" },
    { title: "लैंगिक समानता नीति", titleEn: "Gender equality policy documents", category: "intelligence", tags: ["gender", "equality", "policy", "women"], template: "लैंगिक समानता तथा सामाजिक समावेशीकरण नीति।", priority: "high" },
    { title: "महिला हिंसा तथ्यांक", titleEn: "GBV / Violence against women statistics", category: "research", tags: ["GBV", "women", "violence", "statistics"], template: "लैंगिक हिंसाविरुद्धको संघर्ष — महिला हिंसाका तथ्यांक र प्रतिवेदन।", priority: "medium" },
  ],
  30: [
    { title: "राष्ट्रिय दलित आयोग प्रतिवेदन", titleEn: "National Dalit Commission report", category: "research", tags: ["dalit", "commission", "inclusion", "discrimination"], template: "राष्ट्रिय दलित आयोगको प्रतिवेदन — दलित समुदायको अधिकार र समावेशिताको अवस्था।", priority: "high" },
    { title: "जातीय भेदभाव उन्मूलन प्रतिवेदन", titleEn: "Caste discrimination elimination report", category: "research", tags: ["caste", "discrimination", "dalit", "social-inclusion"], template: "जातीय भेदभाव उन्मूलनको प्रगति प्रतिवेदन — सामाजिक न्यायको मापन।", priority: "medium" },
  ],
  31: [
    { title: "राष्ट्रिय समावेशी आयोग प्रतिवेदन", titleEn: "National Inclusive Commission report", category: "research", tags: ["inclusion", "commission", "disability", "marginalized"], template: "राष्ट्रिय समावेशी आयोगको प्रतिवेदन — समावेशीकरणको अवस्था।", priority: "high" },
    { title: "अपाङ्गता अधिकार प्रतिवेदन", titleEn: "Disability rights report", category: "research", tags: ["disability", "inclusion", "rights", "accessibility"], template: "अपाङ्गता भएका व्यक्तिहरूको अधिकार र पहुँचसम्बन्धी प्रतिवेदन।", priority: "medium" },
  ],
  32: [
    { title: "राष्ट्रिय जनजाति आयोग प्रतिवेदन", titleEn: "National Indigenous Nationalities Commission report", category: "research", tags: ["janajati", "indigenous", "commission", "culture"], template: "राष्ट्रिय जनजाति आयोगको प्रतिवेदन — आदिवासी जनजातिको हक र संस्कृतिको अवस्था।", priority: "high" },
    { title: "भाषा संरक्षण नीति", titleEn: "Language / culture preservation policy", category: "intelligence", tags: ["language", "culture", "indigenous", "preservation"], template: "आदिवासी भाषा संरक्षण तथा सम्वर्द्धनसम्बन्धी नीति वा कार्यक्रम।", priority: "medium" },
  ],
  33: [
    { title: "संवैधानिक निकायहरूको सामूहिक प्रतिवेदन", titleEn: "Constitutional bodies combined overview", category: "research", tags: ["constitutional-bodies", "oversight", "commission", "monitoring"], template: "सबै संवैधानिक निकायको अवस्था र कार्यसम्पादनको तुलनात्मक समीक्षा।", priority: "medium" },
  ],
  34: [
    { title: "राष्ट्रिय मधेसी आयोग प्रतिवेदन", titleEn: "National Madhesi Commission report", category: "research", tags: ["madhesi", "commission", "terai", "inclusion"], template: "राष्ट्रिय मधेसी आयोगको प्रतिवेदन — मधेसी समुदायको प्रतिनिधित्व र अधिकारको अवस्था।", priority: "high" },
  ],
  35: [
    { title: "संविधान कार्यान्वयन अनुगमन प्रतिवेदन", titleEn: "Constitution implementation monitoring report", category: "research", tags: ["constitution", "implementation", "monitoring", "overall"], template: "संविधान कार्यान्वयनको समग्र अनुगमन प्रतिवेदन — विविध प्रावधानको अवस्था।", priority: "medium" },
    { title: "संक्रमणकालीन प्रावधानको कार्यान्वयन", titleEn: "Transitional provisions implementation", category: "intelligence", tags: ["transitional", "implementation", "constitution", "provision"], template: "संविधानका संक्रमणकालीन प्रावधानहरूको कार्यान्वयन अवस्था।", priority: "low" },
  ],
};
