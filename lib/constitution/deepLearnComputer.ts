import type { ConstitutionalFrameworkRecord } from "../types/constitutional-framework";

// ─── Deep constitutional intelligence — per metric per part ───────────────────
// Extracted from actual constitutional atoms (ConstitutionalFrameworkRecord).
// Every number becomes: count → actual entities → source dharas → meaning.
// DO NOT hallucinate — only data present in atoms is surfaced here.

export interface MetricDeepLearn {
  entities:       string[];   // actual entity strings (deduplicated, sorted)
  sourceArticles: number[];   // unique article numbers where entities appear
  citizenMeaning: string;     // simple Nepali — {count} replaced at render time
  aiReasoning:    string;     // how AI extracted this
  whyItMatters:   string;     // real-world significance
}

export interface PartDeepLearnProfile {
  partNumber:    number;
  institutions:  MetricDeepLearn;
  rights:        MetricDeepLearn;
  duties:        MetricDeepLearn;
  obligations:   MetricDeepLearn;
  affectedGroups:MetricDeepLearn;
  govScope:      MetricDeepLearn;
  keywords:      MetricDeepLearn; // top 20 by frequency
  dharaList:     MetricDeepLearn; // article numbers in this part
  dependencies:  MetricDeepLearn; // relatedArticles cross-refs
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectEntityMap(
  atoms: ConstitutionalFrameworkRecord[],
  field: "institutions" | "rights" | "duties" | "obligations" | "affectedGroups" | "governanceStructures",
): { entities: string[]; sourceArticles: number[] } {
  const entityArts = new Map<string, Set<number>>();
  for (const a of atoms) {
    const vals = a[field] as string[] | undefined;
    if (!vals) continue;
    for (const v of vals) {
      const key = v.trim();
      if (!key) continue;
      const set = entityArts.get(key) ?? new Set<number>();
      set.add(a.article);
      entityArts.set(key, set);
    }
  }
  const entities = Array.from(entityArts.keys()).sort();
  const allArts  = new Set<number>();
  for (const set of entityArts.values()) for (const a of set) allArts.add(a);
  return { entities, sourceArticles: Array.from(allArts).sort((a, b) => a - b) };
}

// ─── Compute ──────────────────────────────────────────────────────────────────

export function computeDeepLearnProfile(
  partNumber: number,
  atoms: ConstitutionalFrameworkRecord[],
): PartDeepLearnProfile {
  const pa = atoms.filter(a => a.partNumber === partNumber);

  // Institutions
  const inst = collectEntityMap(pa, "institutions");
  // Rights
  const rts  = collectEntityMap(pa, "rights");
  // Duties
  const dts  = collectEntityMap(pa, "duties");
  // Obligations
  const obs  = collectEntityMap(pa, "obligations");
  // Affected groups
  const grps = collectEntityMap(pa, "affectedGroups");
  // Governance scope
  const gov  = collectEntityMap(pa, "governanceStructures");

  // Keywords — top 20 by frequency
  const kwFreq  = new Map<string, number>();
  const kwArts  = new Map<string, Set<number>>();
  for (const a of pa) {
    for (const kw of a.keywords ?? []) {
      kwFreq.set(kw, (kwFreq.get(kw) ?? 0) + 1);
      const s = kwArts.get(kw) ?? new Set<number>();
      s.add(a.article);
      kwArts.set(kw, s);
    }
  }
  const topKws    = Array.from(kwFreq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([k]) => k);
  const kwSrcArts = new Set<number>();
  for (const kw of topKws) for (const a of kwArts.get(kw) ?? []) kwSrcArts.add(a);

  // Dhara list — unique article numbers in this part
  const dharaNums = Array.from(new Set(pa.map(a => a.article))).sort((a, b) => a - b);

  // Dependencies — relatedArticles cross-refs (stored as strings e.g. "16", "17")
  const depSet = new Set<string>();
  for (const a of pa) for (const r of a.relatedArticles ?? []) depSet.add(String(r));
  const depSorted = Array.from(depSet).sort((a, b) => Number(a) - Number(b));

  return {
    partNumber,

    institutions: {
      ...inst,
      citizenMeaning: "यस भागमा {count} वटा सरकारी निकाय र संस्थाहरूको उल्लेख छ। यी संस्थाहरू संविधान कार्यान्वयनका जिम्मेवार हुन्।",
      aiReasoning:    "AI ले constitutional atoms मा 'आयोग', 'अदालत', 'सरकार', 'परिषद', 'मन्त्रालय', 'निकाय' जस्ता शब्द पहिचान गरेर संस्थाहरू extract गरेको हो।",
      whyItMatters:   "धेरै संस्थाहरू सम्बन्धित हुनु भनेको यो अधिकारको कार्यान्वयन जटिल छ र धेरै निकायहरू मिलेर काम गर्नुपर्छ।",
    },

    rights: {
      ...rts,
      citizenMeaning: "यस भागले नागरिकलाई {count} वटा अधिकार प्रदान गर्छ। यी अधिकारहरू संवैधानिक रूपमा संरक्षित छन् — कुनैले पनि खोस्न मिल्दैन।",
      aiReasoning:    "AI ले 'अधिकार', 'हक', 'right', 'स्वतन्त्रता' जस्ता शब्द र उनीहरूपछि आउने नामबाट अधिकारहरू extract गरेको हो।",
      whyItMatters:   "अधिकार सूची लामो हुनु संविधानको प्रगतिशील दृष्टिकोण हो — तर प्रत्येक अधिकारको कार्यान्वयन बराबर हुँदैन।",
    },

    duties: {
      ...dts,
      citizenMeaning: "यस भागमा नागरिकका {count} वटा कर्तव्यहरू उल्लेख छन् — अधिकारसँगै आउने जिम्मेवारी।",
      aiReasoning:    "AI ले 'कर्तव्य', 'दायित्व', 'पालना गर्नु' जस्ता शब्दहरूबाट नागरिक कर्तव्यहरू extract गरेको हो।",
      whyItMatters:   "अधिकार र कर्तव्य सँगसँगै आउँछन् — संविधानले दुवैलाई सँगसँगै परिभाषित गर्छ।",
    },

    obligations: {
      ...obs,
      citizenMeaning: "यस भागमा सरकारका {count} वटा दायित्वहरू छन् जुन पूरा गर्नु अनिवार्य छ।",
      aiReasoning:    "AI ले 'गर्नु पर्छ', 'व्यवस्था गर्नेछ', 'सुनिश्चित गर्नेछ' जस्ता वाक्यांशहरूबाट सरकारी दायित्वहरू चिनेको हो।",
      whyItMatters:   "सरकारी दायित्व बढी हुनु भनेको संविधानले सरकारलाई बढी जवाफदेही बनाएको हो।",
    },

    affectedGroups: {
      ...grps,
      citizenMeaning: "यस भागले {count} वटा फरक नागरिक समूहलाई प्रत्यक्ष असर गर्छ — महिला, दलित, जनजाति, युवा आदि।",
      aiReasoning:    "AI ले 'महिला', 'दलित', 'जनजाति', 'युवा', 'अपाङ्गता', 'अल्पसंख्यक' जस्ता समूहवाचक शब्दहरूबाट प्रभावित समूह पहिचान गरेको हो।",
      whyItMatters:   "धेरै समूह समेटिएको भाग समावेशी र न्यायपूर्ण संविधानको सूचक हो।",
    },

    govScope: {
      ...gov,
      citizenMeaning: "यस भागले सरकारका {count} वटा तह वा संरचनालाई स्पर्श गर्छ।",
      aiReasoning:    "AI ले 'संघ', 'प्रदेश', 'स्थानीय', 'जिल्ला', 'केन्द्र' जस्ता शासन तहवाचक शब्दहरूबाट शासन संरचना extract गरेको हो।",
      whyItMatters:   "धेरै शासन तह समेटिएको भाग भनेको त्यो विषय संघीयताको सबै तहमा प्रासंगिक छ।",
    },

    keywords: {
      entities:       topKws,
      sourceArticles: Array.from(kwSrcArts).sort((a, b) => a - b),
      citizenMeaning: "यस भागका {count} वटा प्रमुख अवधारणाहरू पहिचान गरिएका छन्।",
      aiReasoning:    "AI ले constitutional atoms मा सबैभन्दा बढी दोहोरिएका महत्वपूर्ण शब्दहरूलाई keywords मा सूचीबद्ध गरेको हो।",
      whyItMatters:   "Keywords ले भागको मुख्य विषयवस्तु एक नजरमा बुझाउँछ।",
    },

    dharaList: {
      entities:       dharaNums.map(n => `धारा ${n}`),
      sourceArticles: dharaNums,
      citizenMeaning: "यस भागमा {count} वटा फरक धाराहरू छन्। प्रत्येक धाराले एक विशेष संवैधानिक प्रावधान समेट्छ।",
      aiReasoning:    "AI ले constitutional atoms मा प्रत्येक अंशको article नम्बर फिल्डबाट धाराहरूको सूची बनाएको हो।",
      whyItMatters:   "धाराहरूको सूचीले संविधानको कुन-कुन प्रावधान यस भागमा पर्छ भनी प्रत्यक्ष देखाउँछ।",
    },

    dependencies: {
      entities:       depSorted.map(n => `धारा ${n}`),
      sourceArticles: depSorted.map(Number),
      citizenMeaning: "यस भागका धाराहरू संविधानका अन्य {count} वटा धाराहरूसँग जोडिएका छन्।",
      aiReasoning:    "AI ले प्रत्येक धाराको 'relatedArticles' फिल्डबाट अन्तर-सम्बन्धित धाराहरू extract गरेको हो।",
      whyItMatters:   "धेरै अन्तर-सम्बन्ध हुनु भनेको यो भाग अन्य भागहरूसँग गाँसिएको छ — अलगिएर हेर्नु हुँदैन।",
    },
  };
}

export function computeAllDeepLearnProfiles(
  partNumbers: number[],
  atoms: ConstitutionalFrameworkRecord[],
): Map<number, PartDeepLearnProfile> {
  const map = new Map<number, PartDeepLearnProfile>();
  for (const pn of partNumbers) {
    map.set(pn, computeDeepLearnProfile(pn, atoms));
  }
  return map;
}
