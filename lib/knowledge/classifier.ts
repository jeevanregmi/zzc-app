/**
 * lib/knowledge/classifier.ts — Phase 4: Rule-Based Atom Classifier
 *
 * Suggests classifications for a UniversalKnowledgeObject.
 * Returns a ClassificationSuggestion with status: "pending".
 *
 * IMPORTANT CONSTRAINTS:
 * - No automatic public publish. All suggestions require founder approval.
 * - Classifier only SUGGESTS — it never writes to Firestore directly.
 * - Idempotent: same input → same suggestion.
 * - Rule-based first. AI semantic classifier is Phase 8.
 *
 * Pipeline position:
 *   adaptAnyKnowledgeObject() → classifyKnowledgeAtom() → founder review → routeKnowledgeAtom()
 *
 * See: docs/ATOM_POOL_ARCHITECTURE.md
 */

import {
  routeKnowledgeAtom,
  VAULT_ONLY_ROUTE,
  type UniversalKnowledgeObject,
  type ClassificationSuggestion,
  type KnowledgeClassifications,
  type CivicClassifications,
  type BhaktiClassifications,
  type PublicProduct,
  type KnowledgeRoute,
} from "../types/knowledge-objects";

// ── Text utilities ────────────────────────────────────────────────────────────

/** Merge text fields into one lowercase string for keyword matching. */
function searchText(uko: UniversalKnowledgeObject): string {
  return [uko.titleNepali, uko.summaryNepali, uko.meaningNepali, uko.evidenceText]
    .join(" ")
    .toLowerCase();
}

/** Check if any keyword appears in text. */
function hasAny(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k.toLowerCase()));
}

/** Unique merge of two string arrays (preserves order, drops duplicates). */
function mergeUnique(a: string[], b: string[]): string[] {
  const seen = new Set(a);
  const result = [...a];
  for (const v of b) {
    if (!seen.has(v)) { seen.add(v); result.push(v); }
  }
  return result;
}

function mergeProducts(a: PublicProduct[], b: PublicProduct[]): PublicProduct[] {
  return mergeUnique(a as string[], b as string[]) as PublicProduct[];
}

// ── Civic sector keyword map ──────────────────────────────────────────────────
// Keywords are Nepali (Devanagari). Each entry maps one or more keywords
// to the canonical PromiseSector / EconomicSector string used by ZZC.

const CIVIC_SECTOR_KEYWORDS: Array<{ sector: string; keywords: string[] }> = [
  { sector: "युवा",                  keywords: ["युवा", "नवयुवक", "तरुण", "जेनेरेशन"] },
  { sector: "रोजगार",               keywords: ["रोजगार", "रोजगारी", "जागिर", "श्रम", "बेरोजगार", "नियोजन", "सिप", "दक्षता"] },
  { sector: "शिक्षा",               keywords: ["शिक्षा", "विद्यालय", "विश्वविद्यालय", "पाठ्यक्रम", "छात्रवृत्ति", "शैक्षिक", "साक्षरता", "शिक्षक"] },
  { sector: "स्वास्थ्य",            keywords: ["स्वास्थ्य", "अस्पताल", "चिकित्सा", "औषधि", "उपचार", "स्वास्थ्यकर्मी", "खोप", "बीमा"] },
  { sector: "कृषि",                 keywords: ["कृषि", "किसान", "कृषक", "खेती", "सिँचाइ", "बीउ", "मल", "कृषिजन्य"] },
  { sector: "पूर्वाधार",            keywords: ["पूर्वाधार", "सडक", "पुल", "निर्माण", "भवन", "सुरुङ", "ढल", "खानेपानी"] },
  { sector: "ऊर्जा",                keywords: ["ऊर्जा", "बिजुली", "विद्युत", "जलविद्युत", "सौर्य", "नवीकरणीय"] },
  { sector: "यातायात",              keywords: ["यातायात", "रेल", "हवाई", "विमानस्थल", "बस", "ट्राफिक"] },
  { sector: "पर्यटन",               keywords: ["पर्यटन", "पर्यटक", "सम्पदा", "होटल", "ट्रेकिङ"] },
  { sector: "उद्योग",               keywords: ["उद्योग", "कारखाना", "उत्पादन", "निर्यात", "आयात", "व्यापार", "उद्यमी", "स्टार्टअप"] },
  { sector: "सामाजिक सुरक्षा",     keywords: ["सामाजिक सुरक्षा", "वृद्धभत्ता", "उपदान", "राहत", "भत्ता", "कल्याण", "सामाजिक सहायता"] },
  { sector: "सुशासन",               keywords: ["सुशासन", "पारदर्शिता", "जवाफदेही", "जवाफदेहिता", "उत्तरदायित्व", "सार्वजनिक सेवा"] },
  { sector: "भ्रष्टाचार नियन्त्रण", keywords: ["भ्रष्टाचार", "दुर्नीति", "अख्तियार", "सम्पत्ति विवरण", "भ्रष्ट"] },
  { sector: "डिजिटल",               keywords: ["डिजिटल", "प्रविधि", "इन्टरनेट", "सफ्टवेयर", "सूचना प्रविधि", "ई-सेवा", "साइबर"] },
  { sector: "वातावरण",              keywords: ["वातावरण", "जलवायु", "प्रदूषण", "वन", "हरित", "जैविक", "संरक्षण"] },
  { sector: "न्याय",                keywords: ["न्याय", "अदालत", "न्यायालय", "कानुन", "अधिकार", "मानवाधिकार"] },
  { sector: "अर्थतन्त्र",           keywords: ["अर्थतन्त्र", "बजेट", "वित्त", "आर्थिक", "राजस्व", "कर", "ऋण", "घाटा", "मुद्रास्फीति"] },
  { sector: "प्रदेश/स्थानीय",      keywords: ["प्रदेश", "स्थानीय", "नगरपालिका", "गाउँपालिका", "वडा", "संघीय"] },
];

// ── Gen Z movement keywords ────────────────────────────────────────────────────
// Signal: atom is related to the 2081 BS Nepal Gen Z civic movement.

const GEN_Z_KEYWORDS = [
  "आन्दोलन", "युवा आन्दोलन", "जवाफदेही", "जवाफदेहिता",
  "भ्रष्टाचारमुक्त", "पारदर्शी सरकार", "२०८१", "2081",
  "युवा नेतृत्व", "नागरिक आन्दोलन", "जनआन्दोलन",
];

// ── Bhakti tradition keywords ─────────────────────────────────────────────────

const TRADITION_KEYWORDS: Array<{ tradition: string; keywords: string[] }> = [
  { tradition: "shaiva",          keywords: ["शिव", "महादेव", "शंकर", "नटराज", "रुद्र", "भोलेनाथ", "पशुपति", "त्र्यम्बक", "महेश्वर"] },
  { tradition: "vaishnava",       keywords: ["विष्णु", "नारायण", "कृष्ण", "राम", "हरि", "वैकुण्ठ", "लक्ष्मीपति", "माधव"] },
  { tradition: "shakta",          keywords: ["दुर्गा", "काली", "लक्ष्मी", "सरस्वती", "देवी", "अम्बिका", "चण्डी", "भवानी"] },
  { tradition: "ganapatya",       keywords: ["गणेश", "गणपति", "विघ्नेश्वर", "लम्बोदर"] },
  { tradition: "buddhist",        keywords: ["बुद्ध", "बौद्ध", "धम्म", "निर्वाण", "बोधिसत्व"] },
  { tradition: "advaita_vedanta", keywords: ["ब्रह्म", "अद्वैत", "आत्मा", "मोक्ष", "वेदान्त", "शंकराचार्य", "उपनिषद"] },
  { tradition: "vedic",           keywords: ["वेद", "ऋग्वेद", "यजुर्वेद", "सामवेद", "अथर्ववेद", "ऋषि", "यज्ञ", "अग्नि"] },
  { tradition: "bhakti",          keywords: ["भक्ति", "भक्त", "प्रेम", "श्रद्धा", "भजन", "कीर्तन", "सत्संग"] },
];

// ── Bhakti character keywords ─────────────────────────────────────────────────

const CHARACTER_KEYWORDS: Array<{ character: string; keywords: string[] }> = [
  { character: "shiva",         keywords: ["शिव", "महादेव", "शंकर", "भोलेनाथ", "नटराज", "रुद्र", "त्र्यम्बक"] },
  { character: "vishnu",        keywords: ["विष्णु", "नारायण", "हरि"] },
  { character: "krishna",       keywords: ["कृष्ण", "गोविन्द", "माधव", "द्वारकाधीश", "गोपाल"] },
  { character: "rama",          keywords: ["राम", "रामचन्द्र", "रघुपति", "दशरथनन्दन"] },
  { character: "durga",         keywords: ["दुर्गा", "अम्बे", "भवानी", "महिषासुरमर्दिनी"] },
  { character: "kali",          keywords: ["काली", "महाकाली", "श्यामा"] },
  { character: "lakshmi",       keywords: ["लक्ष्मी", "श्री", "कमला"] },
  { character: "saraswati",     keywords: ["सरस्वती", "वाग्देवी", "शारदा"] },
  { character: "hanuman",       keywords: ["हनुमान", "पवनपुत्र", "बजरंगबली", "अञ्जनेय"] },
  { character: "ganesh",        keywords: ["गणेश", "गणपति", "विघ्नहर्ता"] },
  { character: "shankara",      keywords: ["शंकराचार्य", "आदि शंकर", "भगवत्पाद"] },
];

// ── Bhakti rasa keywords ──────────────────────────────────────────────────────

const RASA_KEYWORDS: Array<{ rasa: string; keywords: string[] }> = [
  { rasa: "shanta",  keywords: ["शान्त", "शान्ति", "मोक्ष", "निर्वाण", "विमुक्ति", "आत्मा"] },
  { rasa: "bhakti",  keywords: ["भक्ति", "प्रेम", "भक्त", "श्रद्धा", "समर्पण"] },
  { rasa: "vira",    keywords: ["वीर", "शक्ति", "बल", "साहस", "जय", "विजय"] },
  { rasa: "adbhuta", keywords: ["अद्भुत", "अनन्त", "असीम", "ब्रह्माण्ड", "अपरिमित"] },
];

// ── Media suitability rules ───────────────────────────────────────────────────

type MediaSuitabilityValue = "short_script" | "explainer_card" | "infographic" | "chant_card" | "devotional_reel" | "timeline_card";

function suggestMediaSuitability(uko: UniversalKnowledgeObject): MediaSuitabilityValue[] {
  const result: MediaSuitabilityValue[] = [];
  if (uko.domain === "bhakti") {
    result.push("chant_card");
    if (uko.objectType === "shloka_atom" || uko.objectType === "bhajan_atom") {
      result.push("devotional_reel");
    }
    return result;
  }
  // Civic
  if (uko.objectType === "government_promise") {
    result.push("explainer_card", "short_script");
  }
  if (uko.objectType === "economic_atom") {
    result.push("infographic", "explainer_card");
  }
  if (uko.objectType === "constitution_article") {
    result.push("explainer_card");
  }
  if (uko.objectType === "civic_fact") {
    result.push("short_script");
  }
  // Atoms with a fiscal year are timeline-suitable
  const hasFiscalYear = (uko.classifications as CivicClassifications).timePeriods?.length > 0;
  if (hasFiscalYear && uko.domain === "civic") {
    result.push("timeline_card");
  }
  return result;
}

// ── Learning level rules ──────────────────────────────────────────────────────

type LearningLevel = "basic" | "intermediate" | "advanced";

function suggestLearningLevel(uko: UniversalKnowledgeObject): LearningLevel[] {
  if (uko.domain === "bhakti") {
    // Sanskrit shlokas are advanced without Nepali translation
    if (uko.objectType === "shloka_atom" && !uko.meaningNepali.trim()) return ["advanced"];
    if (uko.objectType === "shloka_atom") return ["intermediate", "advanced"];
    return ["intermediate"];
  }
  if (uko.objectType === "constitution_article") return ["intermediate", "advanced"];
  if (uko.objectType === "semantic_term")        return ["intermediate", "advanced"];
  if (uko.objectType === "economic_atom")        return ["basic", "intermediate"];
  return ["basic"];
}

// ── Public product suggestion — civic ─────────────────────────────────────────

function suggestCivicProducts(
  uko: UniversalKnowledgeObject,
  sectors: string[],
): PublicProduct[] {
  const products: PublicProduct[] = [];

  switch (uko.objectType) {
    case "constitution_article":
      products.push("constitution_reader");
      break;
    case "government_promise":
      products.push("promise_tracker");
      if (sectors.some(s => ["अर्थतन्त्र", "रोजगार", "उद्योग", "कृषि"].includes(s))) {
        products.push("economy_chautari");
      }
      products.push("civic_feed");
      break;
    case "economic_atom":
      products.push("economy_chautari");
      break;
    case "civic_fact":
      // Finance/banking domain records → economy chautari
      if (uko.sourceCollection === "janta_intelligence") {
        const existing = uko.classifications as CivicClassifications;
        if (existing.domains?.includes("economy")) {
          products.push("economy_chautari");
        }
      }
      products.push("janta_intelligence", "civic_feed");
      break;
    case "media_seed":
      products.push("media_studio");
      break;
    case "semantic_term":
      // Civic terms: not public yet (Phase 3+ of the public civic dictionary)
      break;
  }

  return products;
}

// ── Public product suggestion — bhakti ───────────────────────────────────────

function suggestBhaktiProducts(uko: UniversalKnowledgeObject): PublicProduct[] {
  const products: PublicProduct[] = [];
  switch (uko.objectType) {
    case "shloka_atom":
      products.push("shloka_explorer", "bhakti_chautari");
      break;
    case "bhajan_atom":
      products.push("bhakti_chautari");
      break;
    case "character_teaching":
      products.push("bhakti_chautari");
      break;
    case "media_seed":
      // Sacred text documents — suggest bhakti once text is published
      if (uko.publicReady) products.push("bhakti_chautari", "shloka_explorer");
      break;
    case "semantic_term":
      // Sanskrit dictionary: not public yet
      break;
  }
  return products;
}

// ── Confidence / movement score helper ────────────────────────────────────────

function movementConfidence(text: string): number {
  const hits = GEN_Z_KEYWORDS.filter(k => text.includes(k.toLowerCase())).length;
  if (hits >= 3) return 0.9;
  if (hits >= 2) return 0.7;
  if (hits === 1) return 0.4;
  return 0;
}

// ── Suggest preview text ──────────────────────────────────────────────────────

function atomPreview(uko: UniversalKnowledgeObject): string {
  return uko.titleNepali.slice(0, 120) || uko.summaryNepali.slice(0, 120);
}

// ── Deterministic suggestion ID ───────────────────────────────────────────────
// Stable across multiple runs so callers can upsert safely.

function suggestionId(uko: UniversalKnowledgeObject): string {
  return `${uko.sourceCollection}_${uko.id}_cls`;
}

// ── Preview route — what routes WOULD be if founder approves ─────────────────
// Uses a synthetic UKO with classificationStatus:"approved", publicReady:true,
// verificationStatus:"founder_reviewed" so routeKnowledgeAtom sees the full route.
// This is a preview for the founder's review UI — it does not grant public access.

function previewRoutes(
  uko: UniversalKnowledgeObject,
  suggestedClassifications: KnowledgeClassifications,
): KnowledgeRoute {
  const synthetic: UniversalKnowledgeObject = {
    ...uko,
    classifications:      suggestedClassifications,
    classificationStatus: "approved",
    publicReady:          true,
    verificationStatus:   "founder_reviewed",
  };
  return routeKnowledgeAtom(synthetic);
}

// ── Main classifier ───────────────────────────────────────────────────────────

/**
 * classifyKnowledgeAtom — rule-based classifier.
 *
 * Merges existing classifications (from adapter) with newly inferred ones.
 * Returns a ClassificationSuggestion with status: "pending".
 * Does NOT write to Firestore. Does NOT trigger any routing.
 * Caller (Phase 6 vault UI) is responsible for storing and presenting to founder.
 *
 * Idempotent: same UKO → same suggestion (stable suggestionId).
 */
export function classifyKnowledgeAtom(
  uko: UniversalKnowledgeObject,
  ownerId: string,
): ClassificationSuggestion {
  const now  = new Date().toISOString();
  const text = searchText(uko);

  // ── Civic classification ─────────────────────────────────────────────────────
  if (uko.domain === "civic" || uko.domain === "shared") {
    const existing = uko.classifications as Partial<CivicClassifications>;

    // Sector inference: keyword scan over all text fields
    const inferredSectors: string[] = [];
    for (const { sector, keywords } of CIVIC_SECTOR_KEYWORDS) {
      if (hasAny(text, keywords)) inferredSectors.push(sector);
    }

    const sectors = mergeUnique(existing.sectors ?? [], inferredSectors);

    // Theme inference from objectType + sectors
    const inferredThemes: string[] = [];
    if (uko.objectType === "government_promise")  inferredThemes.push("accountability", "government_promise");
    if (uko.objectType === "economic_atom")       inferredThemes.push("public_finance");
    if (uko.objectType === "constitution_article") inferredThemes.push("fundamental_rights", "governance");
    if (sectors.includes("भ्रष्टाचार नियन्त्रण")) inferredThemes.push("anti_corruption");
    if (sectors.includes("सुशासन"))             inferredThemes.push("good_governance");
    if (sectors.includes("युवा"))               inferredThemes.push("youth_empowerment");
    if (sectors.includes("रोजगार"))             inferredThemes.push("employment");

    const themes = mergeUnique(existing.themes ?? [], inferredThemes);

    // Movement detection
    const mvScore   = movementConfidence(text);
    const hasMovement = mvScore >= 0.4;
    const relatedMovements = hasMovement
      ? mergeUnique(existing.relatedMovements ?? [], ["gen_z_movement_2081"])
      : (existing.relatedMovements ?? []);

    // Public product suggestion
    const inferredProducts = suggestCivicProducts(uko, sectors);
    const publicProducts   = mergeProducts(existing.publicProducts ?? [], inferredProducts);

    // Media suitability
    const mediaSuitability = mergeUnique(
      existing.mediaSuitability ?? [],
      suggestMediaSuitability(uko) as string[],
    );

    // Learning level
    const learningLevel = mergeUnique(
      existing.learningLevel ?? [],
      suggestLearningLevel(uko) as string[],
    ) as ("basic" | "intermediate" | "advanced")[];

    const suggestedClassifications: CivicClassifications = {
      domains:          mergeUnique(existing.domains ?? ["civic"], []),
      sectors,
      themes,
      audiences:        existing.audiences ?? [],
      sourceTypes:      existing.sourceTypes ?? [],
      timePeriods:      existing.timePeriods ?? [],
      publicProducts,
      mediaSuitability,
      learningLevel,
      relatedMovements,
    };

    return {
      id:                       suggestionId(uko),
      ownerId,
      atomId:                   uko.id,
      sourceCollection:         uko.sourceCollection,
      atomPreview:              atomPreview(uko),
      suggestedClassifications,
      suggestedRoutes:          previewRoutes(uko, suggestedClassifications),
      generatedBy:              "rule_engine",
      status:                   "pending",
      createdAt:                now,
    };
  }

  // ── Bhakti classification ─────────────────────────────────────────────────────
  const existing = uko.classifications as Partial<BhaktiClassifications>;

  // Tradition detection
  const inferredTraditions: string[] = [];
  for (const { tradition, keywords } of TRADITION_KEYWORDS) {
    if (hasAny(text, keywords)) inferredTraditions.push(tradition);
  }
  const traditions = mergeUnique(existing.traditions ?? [], inferredTraditions);

  // Character detection
  const inferredCharacters: string[] = [];
  for (const { character, keywords } of CHARACTER_KEYWORDS) {
    if (hasAny(text, keywords)) inferredCharacters.push(character);
  }
  const characters = mergeUnique(existing.characters ?? [], inferredCharacters);

  // Rasa detection
  const inferredRasas: string[] = [];
  for (const { rasa, keywords } of RASA_KEYWORDS) {
    if (hasAny(text, keywords)) inferredRasas.push(rasa);
  }
  const rasas = mergeUnique(existing.rasas ?? [], inferredRasas);

  // Languages — Sanskrit detection
  const hasSanskrit = /[ं-ॿ]/.test(uko.evidenceText) || hasAny(text, ["संस्कृत", "देवनागरी", "श्लोक", "मन्त्र"]);
  const hasNepali   = hasAny(text, ["नेपाली", "नेपाल"]);
  const inferredLanguages: string[] = [
    ...(hasSanskrit ? ["sanskrit"] : []),
    ...(hasNepali   ? ["nepali"]   : []),
  ];
  const languages = mergeUnique(existing.languages ?? [], inferredLanguages);

  // Text type inference
  const inferredTextTypes: string[] = [];
  if (hasAny(text, ["स्तोत्र", "stotra"]))          inferredTextTypes.push("stotra");
  if (hasAny(text, ["भजन", "bhajan"]))               inferredTextTypes.push("bhajan");
  if (hasAny(text, ["मन्त्र", "mantra"]))            inferredTextTypes.push("mantra_set");
  if (hasAny(text, ["श्लोक", "shloka", "verse"]))    inferredTextTypes.push("shloka");
  if (hasAny(text, ["उपनिषद", "upanishad"]))         inferredTextTypes.push("upanishad");
  if (hasAny(text, ["गीता", "gita", "भगवद"]))        inferredTextTypes.push("gita_chapter");
  const textTypes = mergeUnique(existing.textTypes ?? [], inferredTextTypes);

  // Public product suggestion
  const inferredProducts = suggestBhaktiProducts(uko);
  const publicProducts   = mergeProducts(existing.publicProducts ?? [], inferredProducts);

  // Media suitability
  const mediaSuitability = mergeUnique(
    existing.mediaSuitability ?? [],
    suggestMediaSuitability(uko) as string[],
  );

  const suggestedClassifications: BhaktiClassifications = {
    domains:          mergeUnique(existing.domains ?? ["bhakti"], []),
    traditions,
    characters,
    textTypes,
    rasas,
    languages,
    publicProducts,
    mediaSuitability,
  };

  return {
    id:                       suggestionId(uko),
    ownerId,
    atomId:                   uko.id,
    sourceCollection:         uko.sourceCollection,
    atomPreview:              atomPreview(uko),
    suggestedClassifications,
    suggestedRoutes:          previewRoutes(uko, suggestedClassifications),
    generatedBy:              "rule_engine",
    status:                   "pending",
    createdAt:                now,
  };
}

// ── Batch classification ──────────────────────────────────────────────────────

/**
 * classifyMany — classify a batch of UKOs.
 * Returns suggestions only — no side effects, no Firestore writes.
 * Caller is responsible for storing results and presenting to founder.
 */
export function classifyMany(
  ukos: UniversalKnowledgeObject[],
  ownerId: string,
): ClassificationSuggestion[] {
  return ukos.map(uko => classifyKnowledgeAtom(uko, ownerId));
}

// ── Classification diff helper ─────────────────────────────────────────────────

/**
 * classificationDiff — returns what the classifier is adding vs what already exists.
 * Useful for the vault review UI to highlight new suggestions.
 */
export interface ClassificationDiff {
  newSectors:       string[];
  newThemes:        string[];
  newProducts:      PublicProduct[];
  newTraditions:    string[];
  newCharacters:    string[];
  newMovements:     string[];
  newMediaFormats:  string[];
  routesPreview:    KnowledgeRoute;
}

export function classificationDiff(
  uko: UniversalKnowledgeObject,
  suggestion: ClassificationSuggestion,
): ClassificationDiff {
  const existing = uko.classifications;
  const suggested = suggestion.suggestedClassifications;

  const existingProducts     = new Set<string>(existing.publicProducts ?? []);
  const suggestedProducts    = new Set<string>(suggested.publicProducts ?? []);
  const newProducts          = [...suggestedProducts].filter(p => !existingProducts.has(p)) as PublicProduct[];

  const existingMedia        = new Set<string>((existing as CivicClassifications).mediaSuitability ?? []);
  const suggestedMedia       = new Set<string>((suggested as CivicClassifications).mediaSuitability ?? []);
  const newMedia             = [...suggestedMedia].filter(m => !existingMedia.has(m));

  if (uko.domain === "civic" || uko.domain === "shared") {
    const ex  = existing  as Partial<CivicClassifications>;
    const sug = suggested as CivicClassifications;
    const exSectors   = new Set<string>(ex.sectors   ?? []);
    const exThemes    = new Set<string>(ex.themes    ?? []);
    const exMovements = new Set<string>(ex.relatedMovements ?? []);
    return {
      newSectors:      sug.sectors.filter(s => !exSectors.has(s)),
      newThemes:       sug.themes.filter(t => !exThemes.has(t)),
      newProducts,
      newTraditions:   [],
      newCharacters:   [],
      newMovements:    sug.relatedMovements.filter(m => !exMovements.has(m)),
      newMediaFormats: newMedia,
      routesPreview:   suggestion.suggestedRoutes,
    };
  }

  const ex  = existing  as Partial<BhaktiClassifications>;
  const sug = suggested as BhaktiClassifications;
  const exTrad  = new Set<string>(ex.traditions ?? []);
  const exChar  = new Set<string>(ex.characters ?? []);
  return {
    newSectors:      [],
    newThemes:       [],
    newProducts,
    newTraditions:   sug.traditions.filter(t => !exTrad.has(t)),
    newCharacters:   sug.characters.filter(c => !exChar.has(c)),
    newMovements:    [],
    newMediaFormats: newMedia,
    routesPreview:   suggestion.suggestedRoutes,
  };
}
