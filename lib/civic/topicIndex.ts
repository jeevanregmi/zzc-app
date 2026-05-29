// Civic Meaning Index — Nepal Constitution & Governance
// Static seed: no AI, no Firestore. Founder-maintained.
// Later expands to Firestore civic_topic_index collection.
// Same pattern will apply to Bhakti (Sanskrit terms) in Phase 5+.

export interface CivicTopic {
  id:                  string;
  termNepali:          string;
  termEnglish:         string;
  aliases:             string[];   // all lowercase — for case-insensitive matching
  relatedParts:        number[];   // constitution part numbers
  relatedArticles:     number[];   // article numbers (approximate)
  relatedSectors:      string[];   // janta_intelligence sector values
  relatedInstitutions: string[];
  explanationNepali:   string;     // 2-3 sentences, citizen-readable
  tags:                string[];
}

export const CIVIC_TOPICS: CivicTopic[] = [
  {
    id:                  "maulik-hak",
    termNepali:          "मौलिक हक",
    termEnglish:         "Fundamental Rights",
    aliases:             ["fundamental rights", "basic rights", "मूलभूत अधिकार", "नागरिक अधिकार", "rights", "hak"],
    relatedParts:        [3],
    relatedArticles:     [16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46],
    relatedSectors:      ["governance", "judiciary", "social"],
    relatedInstitutions: ["Supreme Court", "NHRC"],
    explanationNepali:   "संविधानको भाग ३ मा प्रत्येक नेपाली नागरिकलाई मिल्ने मूलभूत अधिकारहरू उल्लेख छन्। यी अधिकारहरू राज्यले हरण गर्न सक्दैन। सर्वोच्च अदालतमा जाएर यी अधिकारहरूको संरक्षण माग्न सकिन्छ।",
    tags:                ["rights", "fundamental", "constitution", "citizen", "liberty"],
  },
  {
    id:                  "siksha",
    termNepali:          "शिक्षा",
    termEnglish:         "Right to Education",
    aliases:             ["education", "शिक्षा अधिकार", "school", "विद्यालय", "पढ्ने अधिकार", "literacy", "siksha"],
    relatedParts:        [3, 4],
    relatedArticles:     [31],
    relatedSectors:      ["education"],
    relatedInstitutions: ["Ministry of Education"],
    explanationNepali:   "धारा ३१ अनुसार प्रत्येक नागरिकलाई आधारभूत शिक्षा निःशुल्क र अनिवार्य रूपमा पाउने अधिकार छ। माध्यमिक तहसम्म निःशुल्क शिक्षाको व्यवस्था राज्यले गर्नुपर्छ।",
    tags:                ["education", "school", "youth", "literacy", "right"],
  },
  {
    id:                  "rojgar",
    termNepali:          "रोजगार",
    termEnglish:         "Right to Employment",
    aliases:             ["employment", "job", "काम", "रोजगारी", "श्रम", "labor", "labour", "work"],
    relatedParts:        [3, 4],
    relatedArticles:     [33, 34],
    relatedSectors:      ["employment", "social"],
    relatedInstitutions: ["Ministry of Labour"],
    explanationNepali:   "धारा ३३ र ३४ अनुसार नागरिकलाई रोजगार र सामाजिक सुरक्षाको हक छ। श्रमिकलाई उचित पारिश्रमिक र सुरक्षित कार्यस्थल पाउने अधिकार संविधानले दिएको छ।",
    tags:                ["employment", "labor", "job", "wage", "social security"],
  },
  {
    id:                  "mahila-adhikar",
    termNepali:          "महिला अधिकार",
    termEnglish:         "Women's Rights",
    aliases:             ["women rights", "gender equality", "महिला", "लैंगिक समानता", "women", "gender", "girl"],
    relatedParts:        [3],
    relatedArticles:     [38],
    relatedSectors:      ["social", "governance"],
    relatedInstitutions: ["National Women Commission"],
    explanationNepali:   "धारा ३८ अनुसार महिलालाई लिंगको आधारमा भेदभाव गर्न पाइँदैन। प्रजनन स्वास्थ्य र सामाजिक सुरक्षाको हक पनि महिलाहरूलाई संविधानले दिएको छ।",
    tags:                ["women", "gender", "equality", "rights", "social"],
  },
  {
    id:                  "dalit-adhikar",
    termNepali:          "दलित अधिकार",
    termEnglish:         "Rights of Dalits",
    aliases:             ["dalit", "dalits", "untouchability", "caste discrimination", "छुवाछूत", "जातीय भेदभाव", "caste"],
    relatedParts:        [3],
    relatedArticles:     [24, 40],
    relatedSectors:      ["social", "governance"],
    relatedInstitutions: ["National Dalit Commission"],
    explanationNepali:   "धारा २४ र ४० अनुसार छुवाछूत र जातीय भेदभाव संविधानले निषेध गरेको छ। दलित समुदायलाई विशेष अधिकार, शिक्षा र रोजगारमा प्राथमिकताको व्यवस्था छ।",
    tags:                ["dalit", "caste", "discrimination", "equality", "rights"],
  },
  {
    id:                  "ciaa",
    termNepali:          "CIAA — अख्तियार",
    termEnglish:         "Commission for Investigation of Abuse of Authority",
    aliases:             ["ciaa", "अख्तियार", "corruption", "भ्रष्टाचार", "अख्तियार दुरुपयोग", "anti-corruption"],
    relatedParts:        [20],
    relatedArticles:     [238, 239, 240],
    relatedSectors:      ["governance", "judiciary"],
    relatedInstitutions: ["CIAA", "अख्तियार दुरुपयोग अनुसन्धान आयोग"],
    explanationNepali:   "CIAA (अख्तियार दुरुपयोग अनुसन्धान आयोग) भ्रष्टाचारको अनुसन्धान र मुद्दा चलाउने संवैधानिक निकाय हो। यसले सरकारी अधिकारीहरूमाथि कारवाही गर्न सक्छ।",
    tags:                ["corruption", "governance", "accountability", "CIAA"],
  },
  {
    id:                  "nhrc",
    termNepali:          "राष्ट्रिय मानव अधिकार आयोग",
    termEnglish:         "National Human Rights Commission",
    aliases:             ["nhrc", "human rights commission", "मानव अधिकार आयोग", "national human rights"],
    relatedParts:        [24],
    relatedArticles:     [248, 249, 250],
    relatedSectors:      ["governance", "judiciary"],
    relatedInstitutions: ["NHRC", "National Human Rights Commission"],
    explanationNepali:   "NHRC मानव अधिकारको प्रवर्द्धन र संरक्षण गर्ने संवैधानिक निकाय हो। नागरिकले मानव अधिकार उल्लंघनको उजुरी यहाँ दर्ता गर्न सक्छन्।",
    tags:                ["human rights", "commission", "NHRC", "rights"],
  },
  {
    id:                  "mानव-adhikar",
    termNepali:          "मानव अधिकार",
    termEnglish:         "Human Rights",
    aliases:             ["human rights", "मानवाधिकार", "rights", "manav adhikar"],
    relatedParts:        [3, 24],
    relatedArticles:     [16, 17, 18, 22, 24, 248],
    relatedSectors:      ["governance", "judiciary"],
    relatedInstitutions: ["NHRC", "Supreme Court"],
    explanationNepali:   "मानव अधिकार भनेको जन्मसिद्ध अधिकारहरू हुन्। जीउनपाउने, अभिव्यक्ति स्वतन्त्रता, भेदभाव नगरिने — यी सबै संविधानको भाग ३ र NHRC ले संरक्षण गर्छन्।",
    tags:                ["human rights", "rights", "fundamental", "dignity"],
  },
  {
    id:                  "sanghiyata",
    termNepali:          "संघीयता",
    termEnglish:         "Federalism",
    aliases:             ["federal", "federalism", "प्रदेश", "province", "sangha", "sanghiyata"],
    relatedParts:        [5, 6, 7],
    relatedArticles:     [56, 57, 58, 59, 60],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["Federal Parliament", "Provincial Assembly"],
    explanationNepali:   "नेपाल संघीय लोकतान्त्रिक गणतन्त्र हो। ७ प्रदेश र ७५३ स्थानीय तह मिलेर तीन तहको सरकार बन्छ — संघीय, प्रदेश र स्थानीय।",
    tags:                ["federalism", "province", "local government", "governance"],
  },
  {
    id:                  "nagarikata",
    termNepali:          "नागरिकता",
    termEnglish:         "Citizenship",
    aliases:             ["citizenship", "नागरिक", "citizen", "नागरिकता प्रमाणपत्र", "citizenship certificate"],
    relatedParts:        [2],
    relatedArticles:     [10, 11, 12, 13, 14, 15],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["Ministry of Home Affairs"],
    explanationNepali:   "भाग २ मा नेपाली नागरिकता कसरी पाइन्छ भन्ने व्यवस्था छ। वंश, जन्म, वैवाहिक वा अङ्गीकृत — यी चार प्रकारको नागरिकता हुन्छ।",
    tags:                ["citizenship", "identity", "nationality"],
  },
  {
    id:                  "sthaniya-tah",
    termNepali:          "स्थानीय तह",
    termEnglish:         "Local Government",
    aliases:             ["local government", "municipality", "गाउँपालिका", "नगरपालिका", "ward", "palika", "local level"],
    relatedParts:        [6],
    relatedArticles:     [216, 217, 218, 219, 220, 221, 222],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["Municipal Corporation", "Rural Municipality"],
    explanationNepali:   "स्थानीय तह (गाउँपालिका र नगरपालिका) नागरिकसँग सबैभन्दा नजिकको सरकार हो। शिक्षा, स्वास्थ्य, खानेपानी जस्ता दैनिक सेवाहरू स्थानीय तहले दिन्छ।",
    tags:                ["local", "municipality", "ward", "governance", "decentralization"],
  },
  {
    id:                  "bhrashtachar",
    termNepali:          "भ्रष्टाचार",
    termEnglish:         "Corruption",
    aliases:             ["corruption", "bribery", "घूस", "रिसवत", "bhrashtachar", "corrupt"],
    relatedParts:        [20],
    relatedArticles:     [238, 239],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["CIAA"],
    explanationNepali:   "भ्रष्टाचार राज्यको स्रोत-साधनको दुरुपयोग हो। संविधानले CIAA मार्फत भ्रष्टाचारको अनुसन्धान र कारवाहीको व्यवस्था गरेको छ।",
    tags:                ["corruption", "governance", "accountability", "crime"],
  },
  {
    id:                  "suhasasan",
    termNepali:          "सुशासन",
    termEnglish:         "Good Governance",
    aliases:             ["good governance", "transparency", "accountability", "पारदर्शिता", "जवाफदेहिता", "sushasan"],
    relatedParts:        [4, 20, 21],
    relatedArticles:     [50, 51, 238],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["CIAA", "Parliament"],
    explanationNepali:   "सुशासन भनेको पारदर्शी, जवाफदेही र प्रभावकारी सरकार। संविधानको भाग ४ मा राज्यका निर्देशक सिद्धान्तहरूले सुशासनको मार्गदर्शन गर्छन्।",
    tags:                ["governance", "transparency", "accountability", "state"],
  },
  {
    id:                  "nyayalaya",
    termNepali:          "न्यायपालिका",
    termEnglish:         "Judiciary",
    aliases:             ["court", "judiciary", "supreme court", "सर्वोच्च अदालत", "justice", "nyayalaya"],
    relatedParts:        [11, 12],
    relatedArticles:     [128, 129, 130, 131, 133],
    relatedSectors:      ["judiciary"],
    relatedInstitutions: ["Supreme Court", "High Court", "District Court"],
    explanationNepali:   "न्यायपालिका स्वतन्त्र छ। सर्वोच्च अदालत संविधानको व्याख्याता र संरक्षक हो। उच्च र जिल्ला अदालतहरू न्याय प्रदान गर्छन्।",
    tags:                ["judiciary", "court", "justice", "rule of law"],
  },
  {
    id:                  "swasthya",
    termNepali:          "स्वास्थ्य",
    termEnglish:         "Right to Health",
    aliases:             ["health", "healthcare", "hospital", "अस्पताल", "औषधि", "उपचार", "swasthya"],
    relatedParts:        [3, 4],
    relatedArticles:     [35],
    relatedSectors:      ["health"],
    relatedInstitutions: ["Ministry of Health"],
    explanationNepali:   "धारा ३५ अनुसार प्रत्येक नागरिकलाई आधारभूत स्वास्थ्य सेवा निःशुल्क पाउने अधिकार छ। राज्यले स्वास्थ्य सेवा सुलभ र सबैको पहुँचमा बनाउनुपर्छ।",
    tags:                ["health", "medical", "hospital", "right", "citizen"],
  },
  {
    id:                  "sampatti",
    termNepali:          "सम्पत्ति अधिकार",
    termEnglish:         "Property Rights",
    aliases:             ["property", "land", "ownership", "जमिन", "घर जग्गा", "property right"],
    relatedParts:        [3],
    relatedArticles:     [25],
    relatedSectors:      ["governance"],
    relatedInstitutions: [],
    explanationNepali:   "धारा २५ अनुसार प्रत्येक नागरिकलाई कानुनको अधीनमा सम्पत्ति राख्ने, किन्ने र बेच्ने अधिकार छ। राज्यले सार्वजनिक हितमा मात्र अधिग्रहण गर्न सक्छ।",
    tags:                ["property", "land", "ownership", "rights"],
  },
  {
    id:                  "bal-adhikar",
    termNepali:          "बालबालिका अधिकार",
    termEnglish:         "Children's Rights",
    aliases:             ["children", "child rights", "बाल", "बालक", "minor", "bal adhikar"],
    relatedParts:        [3],
    relatedArticles:     [39],
    relatedSectors:      ["social", "education"],
    relatedInstitutions: ["National Child Rights Council"],
    explanationNepali:   "धारा ३९ अनुसार बालबालिकालाई पहिचान, स्वास्थ्य, शिक्षा र शोषणबाट संरक्षण पाउने अधिकार छ। बाल श्रम र बेचबिखन कानुनतः निषेध छ।",
    tags:                ["children", "child rights", "education", "protection"],
  },
  {
    id:                  "samarupantik",
    termNepali:          "समानुपातिक समावेशिता",
    termEnglish:         "Proportional Inclusion",
    aliases:             ["proportional", "inclusion", "समावेशिता", "आरक्षण", "reservation", "inclusive", "quota"],
    relatedParts:        [3, 4, 7],
    relatedArticles:     [42, 84, 176],
    relatedSectors:      ["governance"],
    relatedInstitutions: ["Parliament", "Election Commission"],
    explanationNepali:   "समानुपातिक समावेशिताले महिला, दलित, जनजाति, मधेसी, थारू, मुस्लिम र पिछडा वर्गलाई संसद र सरकारमा उचित प्रतिनिधित्व सुनिश्चित गर्छ।",
    tags:                ["inclusion", "representation", "proportional", "diversity"],
  },
  {
    id:                  "paryavaran",
    termNepali:          "वातावरण",
    termEnglish:         "Environment",
    aliases:             ["environment", "climate", "pollution", "प्रदूषण", "जलवायु", "nature", "forest", "वन"],
    relatedParts:        [3, 4],
    relatedArticles:     [30, 51],
    relatedSectors:      ["environment"],
    relatedInstitutions: ["Ministry of Forests and Environment"],
    explanationNepali:   "धारा ३० अनुसार प्रत्येक नागरिकलाई सफा र स्वस्थ वातावरणमा बाँच्ने हक छ। राज्यले पर्यावरण संरक्षण र दिगो विकास गर्नुपर्छ।",
    tags:                ["environment", "climate", "pollution", "rights", "nature"],
  },
  {
    id:                  "khadya-adhikar",
    termNepali:          "खाद्य अधिकार",
    termEnglish:         "Right to Food",
    aliases:             ["food", "food security", "खाना", "food right", "hunger", "खाद्य सुरक्षा"],
    relatedParts:        [3],
    relatedArticles:     [36],
    relatedSectors:      ["agriculture", "social"],
    relatedInstitutions: [],
    explanationNepali:   "धारा ३६ अनुसार प्रत्येक नागरिकलाई खाद्य सुरक्षाको हक छ। राज्यले पर्याप्त र पौष्टिक आहार सबै नागरिकलाई सुनिश्चित गर्नुपर्छ।",
    tags:                ["food", "agriculture", "security", "rights", "nutrition"],
  },
];

// ── Search helpers ─────────────────────────────────────────────────────────────

const normalize = (s: string) => s.toLowerCase().trim();

export function searchTopics(q: string): CivicTopic[] {
  if (!q || q.trim().length < 1) return [];
  const n = normalize(q);
  return CIVIC_TOPICS.filter(t =>
    normalize(t.termNepali).includes(n) ||
    normalize(t.termEnglish).includes(n) ||
    t.aliases.some(a => a.includes(n)) ||
    t.tags.some(tag => tag.includes(n)) ||
    t.relatedInstitutions.some(inst => normalize(inst).includes(n)),
  );
}
