// Official Nepal government source registry.
// Each source maps to constitutional parts, gov folders, and document types
// so the resolver can match context → relevant sources automatically.

export type TrustLevel = "primary" | "secondary" | "reference";
export type DocumentType =
  | "act" | "regulation" | "directive" | "budget" | "report"
  | "policy" | "gazette" | "amendment" | "circular" | "constitution";

export interface OfficialSource {
  sourceId:          string;
  nameNp:            string;          // Primary Nepali name
  nameEn:            string;          // English name
  officialUrl:       string;          // Direct portal/landing page
  searchUrl?:        string;          // Search URL (use {query} placeholder)
  domain:            string;          // gov domain for display badge
  trustLevel:        TrustLevel;
  relatedParts:      number[];        // Constitutional part numbers
  relatedGovFolders: string[];        // vault govFolder values
  documentTypes:     DocumentType[];  // what kind of docs this source provides
  tags:              string[];        // additional match tags
  noteNp?:           string;          // Optional Nepali note for founder
}

export const SOURCE_REGISTRY: OfficialSource[] = [

  // ── Constitutional & Legal Foundation ────────────────────────────────────────

  {
    sourceId:          "law_commission",
    nameNp:            "कानून आयोग",
    nameEn:            "Law Commission Nepal",
    officialUrl:       "https://lawcommission.gov.np",
    searchUrl:         "https://lawcommission.gov.np/search/?s={query}",
    domain:            "lawcommission.gov.np",
    trustLevel:        "primary",
    relatedParts:      [1, 2, 3, 4, 9, 11, 12, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
    relatedGovFolders: ["legislative", "judiciary", "constitutional"],
    documentTypes:     ["act", "amendment", "constitution", "regulation"],
    tags:              ["act", "law", "legal", "amendment", "constitution"],
    noteNp:            "नेपालका सबै ऐन, नियम, संशोधनहरू यहाँ पाइन्छ।",
  },

  {
    sourceId:          "parliament",
    nameNp:            "संसद सचिवालय",
    nameEn:            "Parliament Secretariat Nepal",
    officialUrl:       "https://www.parliament.gov.np",
    searchUrl:         "https://www.parliament.gov.np/en/category/legislation/",
    domain:            "parliament.gov.np",
    trustLevel:        "primary",
    relatedParts:      [8, 9, 5, 6, 7],
    relatedGovFolders: ["legislative", "parliament"],
    documentTypes:     ["act", "amendment", "directive", "regulation"],
    tags:              ["parliament", "legislation", "bill", "law", "amendment"],
    noteNp:            "संसदमा पारित ऐन र विधेयकहरूको अभिलेख।",
  },

  {
    sourceId:          "nepal_gazette",
    nameNp:            "नेपाल राजपत्र",
    nameEn:            "Nepal Gazette (Rajpatra)",
    officialUrl:       "https://rajpatra.dop.gov.np",
    searchUrl:         "https://rajpatra.dop.gov.np/Search",
    domain:            "rajpatra.dop.gov.np",
    trustLevel:        "primary",
    relatedParts:      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
    relatedGovFolders: ["legislative", "executive", "constitutional", "finance"],
    documentTypes:     ["gazette", "act", "amendment", "regulation"],
    tags:              ["gazette", "official", "rajpatra", "notification"],
    noteNp:            "सबै सरकारी अधिसूचना, नियम, नियमावली प्रकाशित हुने ठाउँ।",
  },

  // ── Ministry of Home Affairs ──────────────────────────────────────────────────

  {
    sourceId:          "moha",
    nameNp:            "गृह मन्त्रालय",
    nameEn:            "Ministry of Home Affairs",
    officialUrl:       "https://moha.gov.np",
    domain:            "moha.gov.np",
    trustLevel:        "primary",
    relatedParts:      [2, 3, 7],
    relatedGovFolders: ["ministry_home", "citizenship", "security"],
    documentTypes:     ["act", "directive", "circular", "regulation"],
    tags:              ["citizenship", "nagarikta", "home", "security", "police"],
    noteNp:            "नागरिकता, सुरक्षा र आन्तरिक प्रशासन सम्बन्धी कागजातहरू।",
  },

  // ── Ministry of Finance ───────────────────────────────────────────────────────

  {
    sourceId:          "mof",
    nameNp:            "अर्थ मन्त्रालय",
    nameEn:            "Ministry of Finance",
    officialUrl:       "https://www.mof.gov.np",
    searchUrl:         "https://www.mof.gov.np/en/category/budget/",
    domain:            "mof.gov.np",
    trustLevel:        "primary",
    relatedParts:      [10, 23],
    relatedGovFolders: ["ministry_finance", "budget", "fiscal"],
    documentTypes:     ["budget", "report", "policy", "regulation"],
    tags:              ["budget", "fiscal", "finance", "revenue", "expenditure", "tax"],
    noteNp:            "वार्षिक बजेट, आर्थिक सर्वेक्षण, राजस्व नीति।",
  },

  {
    sourceId:          "nrb",
    nameNp:            "नेपाल राष्ट्र बैंक",
    nameEn:            "Nepal Rastra Bank",
    officialUrl:       "https://www.nrb.org.np",
    searchUrl:         "https://www.nrb.org.np/category/publications/",
    domain:            "nrb.org.np",
    trustLevel:        "primary",
    relatedParts:      [23, 10],
    relatedGovFolders: ["finance", "banking"],
    documentTypes:     ["report", "regulation", "directive", "policy"],
    tags:              ["banking", "monetary", "nrb", "finance", "insurance", "credit"],
    noteNp:            "मौद्रिक नीति, बैंक तथा वित्तीय संस्था नियमन।",
  },

  {
    sourceId:          "ird",
    nameNp:            "आन्तरिक राजस्व विभाग",
    nameEn:            "Inland Revenue Department",
    officialUrl:       "https://ird.gov.np",
    domain:            "ird.gov.np",
    trustLevel:        "primary",
    relatedParts:      [23, 10],
    relatedGovFolders: ["finance", "tax"],
    documentTypes:     ["act", "directive", "circular", "regulation"],
    tags:              ["tax", "revenue", "cit", "vat", "income_tax", "ird"],
    noteNp:            "आयकर, मूल्य अभिवृद्धि कर, राजस्व नियम।",
  },

  // ── Ministry of Law ───────────────────────────────────────────────────────────

  {
    sourceId:          "molja",
    nameNp:            "कानून, न्याय तथा संसदीय मामिला मन्त्रालय",
    nameEn:            "Ministry of Law, Justice and Parliamentary Affairs",
    officialUrl:       "https://www.moljpa.gov.np",
    domain:            "moljpa.gov.np",
    trustLevel:        "primary",
    relatedParts:      [9, 11, 12],
    relatedGovFolders: ["judiciary", "legislative", "ministry_law"],
    documentTypes:     ["act", "regulation", "policy", "directive"],
    tags:              ["law", "justice", "judiciary", "legal", "attorney"],
    noteNp:            "न्याय, कानून र संसदीय मामिलाहरू।",
  },

  {
    sourceId:          "supreme_court",
    nameNp:            "सर्वोच्च अदालत",
    nameEn:            "Supreme Court of Nepal",
    officialUrl:       "https://supremecourt.gov.np",
    domain:            "supremecourt.gov.np",
    trustLevel:        "primary",
    relatedParts:      [11],
    relatedGovFolders: ["judiciary"],
    documentTypes:     ["report", "directive", "regulation"],
    tags:              ["court", "judiciary", "supreme", "justice"],
    noteNp:            "सर्वोच्च अदालतका फैसला, वार्षिक प्रतिवेदन।",
  },

  {
    sourceId:          "ag_office",
    nameNp:            "महान्यायाधिवक्ताको कार्यालय",
    nameEn:            "Office of the Attorney General",
    officialUrl:       "https://ag.gov.np",
    domain:            "ag.gov.np",
    trustLevel:        "primary",
    relatedParts:      [12, 11],
    relatedGovFolders: ["judiciary", "ministry_law"],
    documentTypes:     ["report", "act", "regulation"],
    tags:              ["attorney", "prosecution", "legal", "ag"],
    noteNp:            "महान्यायाधिवक्ता कार्यालयका प्रतिवेदन र ऐनहरू।",
  },

  // ── Election Commission ───────────────────────────────────────────────────────

  {
    sourceId:          "election_commission",
    nameNp:            "निर्वाचन आयोग",
    nameEn:            "Election Commission Nepal",
    officialUrl:       "https://election.gov.np",
    domain:            "election.gov.np",
    trustLevel:        "primary",
    relatedParts:      [27],
    relatedGovFolders: ["election"],
    documentTypes:     ["act", "directive", "regulation", "report"],
    tags:              ["election", "voting", "electoral", "commission"],
    noteNp:            "निर्वाचन सम्बन्धी कानून, निर्देशिका र प्रतिवेदन।",
  },

  // ── Commission for the Investigation of Abuse of Authority ───────────────────

  {
    sourceId:          "ciaa",
    nameNp:            "अख्तियार दुरुपयोग अनुसन्धान आयोग",
    nameEn:            "Commission for the Investigation of Abuse of Authority",
    officialUrl:       "https://ciaa.gov.np",
    domain:            "ciaa.gov.np",
    trustLevel:        "primary",
    relatedParts:      [24],
    relatedGovFolders: ["constitutional_bodies", "corruption"],
    documentTypes:     ["act", "report", "directive"],
    tags:              ["corruption", "accountability", "ciaa", "transparency", "abuse"],
    noteNp:            "भ्रष्टाचार अनुसन्धान र सुशासन सम्बन्धी कागजातहरू।",
  },

  // ── Auditor General ───────────────────────────────────────────────────────────

  {
    sourceId:          "oag",
    nameNp:            "महालेखापरीक्षकको कार्यालय",
    nameEn:            "Office of the Auditor General",
    officialUrl:       "https://oag.gov.np",
    domain:            "oag.gov.np",
    trustLevel:        "primary",
    relatedParts:      [25, 10, 23],
    relatedGovFolders: ["audit", "finance"],
    documentTypes:     ["report", "act", "directive"],
    tags:              ["audit", "accountability", "oag", "public_finance"],
    noteNp:            "सरकारी खर्चको लेखापरीक्षण र प्रतिवेदन।",
  },

  // ── Public Service Commission ─────────────────────────────────────────────────

  {
    sourceId:          "psc",
    nameNp:            "लोक सेवा आयोग",
    nameEn:            "Public Service Commission",
    officialUrl:       "https://psc.gov.np",
    domain:            "psc.gov.np",
    trustLevel:        "primary",
    relatedParts:      [26],
    relatedGovFolders: ["civil_service", "public_service"],
    documentTypes:     ["act", "regulation", "report", "directive"],
    tags:              ["civil_service", "public_service", "recruitment", "psc"],
    noteNp:            "सरकारी सेवा भर्ती र लोक सेवा आयोगका कागजातहरू।",
  },

  // ── Ministry of Federal Affairs ───────────────────────────────────────────────

  {
    sourceId:          "mofa_fed",
    nameNp:            "संघीय मामिला तथा सामान्य प्रशासन मन्त्रालय",
    nameEn:            "Ministry of Federal Affairs and General Administration",
    officialUrl:       "https://www.mofaga.gov.np",
    domain:            "mofaga.gov.np",
    trustLevel:        "primary",
    relatedParts:      [5, 22, 18, 19, 20, 21],
    relatedGovFolders: ["federal", "local_government"],
    documentTypes:     ["act", "directive", "policy", "report", "regulation"],
    tags:              ["federal", "local", "municipality", "sthaniya", "ward", "intergovernmental"],
    noteNp:            "स्थानीय सरकार, संघीय प्रशासन र अन्तर-सरकारी समन्वय।",
  },

  // ── Ministry of Education ─────────────────────────────────────────────────────

  {
    sourceId:          "moe",
    nameNp:            "शिक्षा, विज्ञान तथा प्रविधि मन्त्रालय",
    nameEn:            "Ministry of Education, Science and Technology",
    officialUrl:       "https://moest.gov.np",
    domain:            "moest.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4],
    relatedGovFolders: ["education", "science"],
    documentTypes:     ["act", "policy", "report", "regulation", "directive"],
    tags:              ["education", "school", "university", "science", "technology", "digital"],
    noteNp:            "शिक्षा नीति, विश्वविद्यालय ऐन, विज्ञान तथा प्रविधि।",
  },

  // ── Ministry of Health ────────────────────────────────────────────────────────

  {
    sourceId:          "mohp",
    nameNp:            "स्वास्थ्य तथा जनसंख्या मन्त्रालय",
    nameEn:            "Ministry of Health and Population",
    officialUrl:       "https://mohp.gov.np",
    domain:            "mohp.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4],
    relatedGovFolders: ["health"],
    documentTypes:     ["act", "policy", "report", "regulation", "directive"],
    tags:              ["health", "hospital", "medical", "population", "insurance"],
    noteNp:            "स्वास्थ्य नीति, राष्ट्रिय स्वास्थ्य बीमा, अस्पताल नियमन।",
  },

  // ── Ministry of Agriculture ───────────────────────────────────────────────────

  {
    sourceId:          "moald",
    nameNp:            "कृषि तथा पशुपंछी विकास मन्त्रालय",
    nameEn:            "Ministry of Agriculture and Livestock Development",
    officialUrl:       "https://moald.gov.np",
    domain:            "moald.gov.np",
    trustLevel:        "primary",
    relatedParts:      [4, 3],
    relatedGovFolders: ["agriculture"],
    documentTypes:     ["policy", "act", "report", "directive"],
    tags:              ["agriculture", "farming", "food", "land", "irrigation", "livestock"],
    noteNp:            "कृषि नीति, सिँचाइ, खाद्य सुरक्षा सम्बन्धी कागजातहरू।",
  },

  // ── National Planning Commission ──────────────────────────────────────────────

  {
    sourceId:          "npc",
    nameNp:            "राष्ट्रिय योजना आयोग",
    nameEn:            "National Planning Commission",
    officialUrl:       "https://npc.gov.np",
    domain:            "npc.gov.np",
    trustLevel:        "primary",
    relatedParts:      [4, 5, 10],
    relatedGovFolders: ["planning", "policy"],
    documentTypes:     ["policy", "report", "budget"],
    tags:              ["planning", "development", "poverty", "infrastructure", "policy", "five_year_plan"],
    noteNp:            "राष्ट्रिय योजना, दीर्घकालीन सोच र विकास लक्ष्यहरू।",
  },

  // ── Ministry of Physical Infrastructure ──────────────────────────────────────

  {
    sourceId:          "mopit",
    nameNp:            "भौतिक पूर्वाधार तथा यातायात मन्त्रालय",
    nameEn:            "Ministry of Physical Infrastructure and Transport",
    officialUrl:       "https://mopit.gov.np",
    domain:            "mopit.gov.np",
    trustLevel:        "primary",
    relatedParts:      [4, 20],
    relatedGovFolders: ["infrastructure", "transport"],
    documentTypes:     ["policy", "report", "act", "directive"],
    tags:              ["infrastructure", "road", "transport", "bridge", "energy"],
    noteNp:            "सडक, पुल, यातायात पूर्वाधार नीति र प्रतिवेदन।",
  },

  // ── Ministry of Energy ────────────────────────────────────────────────────────

  {
    sourceId:          "moewri",
    nameNp:            "ऊर्जा, जलस्रोत तथा सिँचाइ मन्त्रालय",
    nameEn:            "Ministry of Energy, Water Resources and Irrigation",
    officialUrl:       "https://www.moewri.gov.np",
    domain:            "moewri.gov.np",
    trustLevel:        "primary",
    relatedParts:      [4],
    relatedGovFolders: ["energy", "water"],
    documentTypes:     ["policy", "act", "report", "directive"],
    tags:              ["energy", "electricity", "water", "irrigation", "hydropower"],
    noteNp:            "जलविद्युत, सिँचाइ र जलस्रोत नीतिहरू।",
  },

  // ── Social Inclusion / Identity Commissions ───────────────────────────────────

  {
    sourceId:          "ncw",
    nameNp:            "राष्ट्रिय महिला आयोग",
    nameEn:            "National Women Commission",
    officialUrl:       "https://ncw.gov.np",
    domain:            "ncw.gov.np",
    trustLevel:        "primary",
    relatedParts:      [29, 3],
    relatedGovFolders: ["women", "social_inclusion"],
    documentTypes:     ["report", "act", "directive", "policy"],
    tags:              ["women", "gender", "equality", "inclusion", "rights"],
    noteNp:            "महिला अधिकार, लैंगिक समानता र महिला विरुद्धको हिंसा।",
  },

  {
    sourceId:          "ncdc",
    nameNp:            "राष्ट्रिय दलित आयोग",
    nameEn:            "National Dalit Commission",
    officialUrl:       "https://ndcnepal.gov.np",
    domain:            "ndcnepal.gov.np",
    trustLevel:        "primary",
    relatedParts:      [30, 3],
    relatedGovFolders: ["dalit", "social_inclusion"],
    documentTypes:     ["report", "act", "directive"],
    tags:              ["dalit", "inclusion", "discrimination", "rights"],
    noteNp:            "दलित अधिकार, विभेद अन्त्य र सामाजिक समावेशन।",
  },

  {
    sourceId:          "ncij",
    nameNp:            "राष्ट्रिय समावेशी आयोग",
    nameEn:            "National Inclusion Commission",
    officialUrl:       "https://nic.gov.np",
    domain:            "nic.gov.np",
    trustLevel:        "primary",
    relatedParts:      [31, 3],
    relatedGovFolders: ["social_inclusion"],
    documentTypes:     ["report", "act", "directive"],
    tags:              ["inclusion", "inclusive", "minority", "rights"],
    noteNp:            "समावेशी विकास र अल्पसंख्यक समुदायका अधिकार।",
  },

  {
    sourceId:          "nfdin",
    nameNp:            "राष्ट्रिय जनजाति उत्थान प्रतिष्ठान",
    nameEn:            "National Foundation for Development of Indigenous Nationalities",
    officialUrl:       "https://nfdin.gov.np",
    domain:            "nfdin.gov.np",
    trustLevel:        "primary",
    relatedParts:      [32, 3],
    relatedGovFolders: ["indigenous", "janajati"],
    documentTypes:     ["report", "act", "directive", "policy"],
    tags:              ["indigenous", "janajati", "nationalities", "tharu", "rights"],
    noteNp:            "आदिवासी जनजाति अधिकार र उत्थान सम्बन्धी कागजातहरू।",
  },

  {
    sourceId:          "nmc",
    nameNp:            "राष्ट्रिय मधेश आयोग",
    nameEn:            "National Madhesh Commission",
    officialUrl:       "https://madheshcommission.gov.np",
    domain:            "madheshcommission.gov.np",
    trustLevel:        "primary",
    relatedParts:      [34, 3],
    relatedGovFolders: ["madhesh"],
    documentTypes:     ["report", "act", "directive"],
    tags:              ["madhesi", "madhesh", "terai", "rights"],
    noteNp:            "मधेश क्षेत्र र मधेसी समुदायका अधिकार।",
  },

  // ── Human Rights Commission ───────────────────────────────────────────────────

  {
    sourceId:          "nhrc",
    nameNp:            "राष्ट्रिय मानव अधिकार आयोग",
    nameEn:            "National Human Rights Commission",
    officialUrl:       "https://nhrcnepal.org",
    domain:            "nhrcnepal.org",
    trustLevel:        "primary",
    relatedParts:      [28, 3],
    relatedGovFolders: ["human_rights"],
    documentTypes:     ["report", "act", "directive"],
    tags:              ["human_rights", "rights", "nhrc", "torture", "freedom"],
    noteNp:            "मानव अधिकार आयोगका प्रतिवेदन र सिफारिसहरू।",
  },

  // ── Social Security / Labour ──────────────────────────────────────────────────

  {
    sourceId:          "ssf",
    nameNp:            "सामाजिक सुरक्षा कोष",
    nameEn:            "Social Security Fund",
    officialUrl:       "https://ssf.gov.np",
    domain:            "ssf.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4, 10],
    relatedGovFolders: ["labour", "social_security"],
    documentTypes:     ["act", "directive", "report", "regulation"],
    tags:              ["ssf", "social_security", "pension", "employment", "labour"],
    noteNp:            "सामाजिक सुरक्षा कोष नियमन र योजनाहरू।",
  },

  {
    sourceId:          "molehr",
    nameNp:            "श्रम, रोजगार तथा सामाजिक सुरक्षा मन्त्रालय",
    nameEn:            "Ministry of Labour, Employment and Social Security",
    officialUrl:       "https://www.moless.gov.np",
    domain:            "moless.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4],
    relatedGovFolders: ["labour", "employment"],
    documentTypes:     ["act", "policy", "report", "directive"],
    tags:              ["labour", "employment", "worker", "foreign_employment", "social"],
    noteNp:            "श्रम ऐन, रोजगार नीति र वैदेशिक रोजगारका कागजातहरू।",
  },

  // ── Land / Environment ────────────────────────────────────────────────────────

  {
    sourceId:          "mofe",
    nameNp:            "वन तथा वातावरण मन्त्रालय",
    nameEn:            "Ministry of Forests and Environment",
    officialUrl:       "https://mofe.gov.np",
    domain:            "mofe.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4],
    relatedGovFolders: ["environment", "forest"],
    documentTypes:     ["act", "policy", "report", "directive"],
    tags:              ["environment", "clean_environment", "forest", "biodiversity", "climate"],
    noteNp:            "वातावरण संरक्षण, वन ऐन र जलवायु परिवर्तन नीति।",
  },

  // ── ICT / Digital ─────────────────────────────────────────────────────────────

  {
    sourceId:          "mocit",
    nameNp:            "सञ्चार तथा सूचना प्रविधि मन्त्रालय",
    nameEn:            "Ministry of Communication and Information Technology",
    officialUrl:       "https://mocit.gov.np",
    domain:            "mocit.gov.np",
    trustLevel:        "primary",
    relatedParts:      [3, 4],
    relatedGovFolders: ["ict", "media"],
    documentTypes:     ["act", "policy", "report", "directive"],
    tags:              ["digital", "ict", "internet", "press", "media", "communication", "technology"],
    noteNp:            "डिजिटल नेपाल, सञ्चार नीति र सूचना प्रविधि ऐन।",
  },

  // ── Provincial (generic — for all 7 provinces) ────────────────────────────────

  {
    sourceId:          "province_gov",
    nameNp:            "प्रदेश सरकार (प्रदेश १–७)",
    nameEn:            "Provincial Governments (Provinces 1–7)",
    officialUrl:       "https://www.mofaga.gov.np/provincial-government",
    domain:            "mofaga.gov.np",
    trustLevel:        "secondary",
    relatedParts:      [13, 14, 15, 16, 17],
    relatedGovFolders: ["provincial"],
    documentTypes:     ["act", "budget", "policy", "report", "directive"],
    tags:              ["provincial", "province", "pradesh", "state"],
    noteNp:            "सातवटा प्रदेश सरकारका कानून, नीति र बजेट।",
  },

  // ── NHRC / International reference ───────────────────────────────────────────

  {
    sourceId:          "ohchr_nepal",
    nameNp:            "संयुक्त राष्ट्र मानव अधिकार (नेपाल)",
    nameEn:            "OHCHR Nepal",
    officialUrl:       "https://www.ohchr.org/en/countries/nepal",
    domain:            "ohchr.org",
    trustLevel:        "reference",
    relatedParts:      [3, 28, 29, 30, 31, 32],
    relatedGovFolders: ["human_rights"],
    documentTypes:     ["report"],
    tags:              ["human_rights", "international", "rights", "un", "treaty"],
    noteNp:            "संयुक्त राष्ट्रका मानव अधिकार प्रतिवेदन र सन्धि-समीक्षा।",
  },
];

// ─── Fast lookup by sourceId ──────────────────────────────────────────────────

export const SOURCE_BY_ID: Record<string, OfficialSource> = Object.fromEntries(
  SOURCE_REGISTRY.map(s => [s.sourceId, s]),
);
