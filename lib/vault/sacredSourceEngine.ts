// lib/vault/sacredSourceEngine.ts
// Rule-based source analysis for SacredWork workspace.
// No API calls — script detection, work matching, metadata suggestion.
// Phase 1: URL + pasted text. Phase 2+: PDF extraction, AI shloka atoms.

import { analyzeSourceUrl, type SourceRightsAnalysis } from "./sourceRightsEngine";
import type { SpiritualTradition } from "../types/semantic-atom";
import type { SacredTextType, SacredLanguage } from "../types/sacred-text";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SourceInputType = "url" | "text";
export type ScriptType      = "devanagari" | "latin" | "mixed" | "unknown";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface SuggestedMetadata {
  canonicalTitle?:  string;
  devanagariTitle?: string;
  tradition?:       SpiritualTradition;
  textType?:        SacredTextType;
  language?:        SacredLanguage;
  primaryDeity?:    string;
  author?:          string;
  shlokaCount?:     number;
}

export interface SacredSourceAnalysis {
  inputType:          SourceInputType;
  rawInput:           string;
  rightsAnalysis?:    SourceRightsAnalysis;   // URL inputs only
  detectedScript?:    ScriptType;             // text inputs only
  detectedLanguage?:  SacredLanguage | "unknown";
  estimatedShlokas?:  number;
  looksLikeVerse?:    boolean;
  suggestedMetadata:  SuggestedMetadata;
  matchedWorkTitle?:  string;
  confidence:         ConfidenceLevel;
  allowedItems:       string[];
  cautionItems:       string[];
  nextActions:        string[];
  recommendation:     string;
}

// ── Known work pattern registry ────────────────────────────────────────────────

interface WorkPattern {
  title:      string;
  devanagari: string;
  deity:      string;
  tradition:  SpiritualTradition;
  textType:   SacredTextType;
  language:   SacredLanguage;
  author?:    string;
  keywords:   RegExp[];
}

const WORK_PATTERNS: WorkPattern[] = [
  {
    title:      "Rudrashtakam",
    devanagari: "रुद्राष्टकम्",
    deity:      "Shiva",
    tradition:  "shaiva",
    textType:   "stotra",
    language:   "sanskrit",
    author:     "Goswami Tulsidas",
    keywords:   [
      /रुद्राष्टकम्|rudrashtakam/i,
      /नमामि\s*श[मं]/i,
      /शम्भु|shambhu/i,
    ],
  },
  {
    title:      "Hanuman Chalisa",
    devanagari: "हनुमान चालीसा",
    deity:      "Hanuman",
    tradition:  "vaishnava",
    textType:   "stotra",
    language:   "hindi",
    author:     "Goswami Tulsidas",
    keywords:   [
      /हनुमान\s+चालीसा|hanuman\s+chalisa/i,
      /बजरंग|bajrang/i,
    ],
  },
  {
    title:      "Mahamrityunjaya Mantra",
    devanagari: "महामृत्युञ्जय मन्त्र",
    deity:      "Shiva",
    tradition:  "shaiva",
    textType:   "mantra_set",
    language:   "sanskrit",
    keywords:   [
      /महामृत्युञ्जय|mahamrityunjaya/i,
      /त्र्यम्बक|tryambak/i,
      /सुगन्धिम्/i,
    ],
  },
  {
    title:      "Nirvana Shatakam",
    devanagari: "निर्वाण षट्कम्",
    deity:      "Atman",
    tradition:  "advaita_vedanta",
    textType:   "stotra",
    language:   "sanskrit",
    author:     "Adi Shankaracharya",
    keywords:   [
      /निर्वाण\s*षट्कम्|nirvana\s*shatakam/i,
      /मनो\s+बुद्धि|mano buddhi/i,
      /चिदानन्द/i,
    ],
  },
  {
    title:      "Shiva Tandava Stotram",
    devanagari: "शिव ताण्डव स्तोत्रम्",
    deity:      "Shiva",
    tradition:  "shaiva",
    textType:   "stotra",
    language:   "sanskrit",
    keywords:   [
      /शिव\s+ताण्डव|shiva\s+tandava/i,
      /जटाटवी|jatatavi/i,
      /जटाकलाप/i,
    ],
  },
  {
    title:      "Bhaja Govindam",
    devanagari: "भज गोविन्दम्",
    deity:      "Krishna",
    tradition:  "advaita_vedanta",
    textType:   "stotra",
    language:   "sanskrit",
    author:     "Adi Shankaracharya",
    keywords:   [
      /भज\s+गोविन्द|bhaja\s+govindam/i,
      /मूढमते|mudhmate/i,
    ],
  },
  {
    title:      "Achyutashtakam",
    devanagari: "अच्युताष्टकम्",
    deity:      "Vishnu",
    tradition:  "vaishnava",
    textType:   "stotra",
    language:   "sanskrit",
    keywords:   [
      /अच्युताष्टकम्|achyutashtakam/i,
      /अच्युतम्\s+केशवम्/i,
    ],
  },
  {
    title:      "Lalitha Sahasranama",
    devanagari: "ललिता सहस्रनाम",
    deity:      "Lalitha Devi",
    tradition:  "shakta",
    textType:   "stotra",
    language:   "sanskrit",
    keywords:   [
      /ललिता\s+सहस्र|lalitha\s+sahasra/i,
      /त्रिपुर\s+सुन्दरी|tripura/i,
    ],
  },
];

// ── Detection helpers ──────────────────────────────────────────────────────────

function detectScript(text: string): ScriptType {
  const devCount   = (text.match(/[ऀ-ॿ]/g) ?? []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) ?? []).length;
  const total = devCount + latinCount;
  if (total === 0) return "unknown";
  const ratio = devCount / total;
  if (ratio > 0.65) return "devanagari";
  if (ratio < 0.35) return "latin";
  return "mixed";
}

function detectLanguageFromText(text: string, script: ScriptType): SacredLanguage | "unknown" {
  if (script === "latin")   return "english";
  if (script === "unknown") return "unknown";
  const hasSanskrit = /[ः]|ॐ|स्वाहा|नमः|[क-ह][ा-ौ]म्/.test(text);
  const hasNepali   = /छ।|छन।|हुन्छ|गर्छ|भन्/.test(text);
  if (hasSanskrit && !hasNepali) return "sanskrit";
  if (hasNepali   && !hasSanskrit) return "nepali";
  return script === "devanagari" ? "sanskrit" : "unknown";
}

function estimateShlokas(text: string): number {
  const explicit = (text.match(/[॥‖]/g) ?? []).length;
  if (explicit > 0) return explicit;
  const lines = text.split(/\n/).filter(l => l.trim().length > 8).length;
  return Math.max(0, Math.round(lines / 2));
}

function detectVerse(text: string): boolean {
  return /[॥‖]/.test(text) ||
    text.split(/\n/).filter(l => l.trim().length > 5).length >= 4;
}

function matchWork(text: string): WorkPattern | null {
  for (const work of WORK_PATTERNS) {
    if (work.keywords.some(k => k.test(text))) return work;
  }
  return null;
}

// ── Shloka types ──────────────────────────────────────────────────────────────

export interface WordMapping {
  word:       string;
  nepali:     string;
  confidence: ConfidenceLevel;
}

export interface ShlokaCard {
  index:        number;   // 1-based
  sanskrit:     string;
  wordMappings: WordMapping[];
  shortNepali:  string;
}

// ── Rudrashtakam template data ─────────────────────────────────────────────────

const RUDRASHTAKAM_SHLOKAS: ShlokaCard[] = [
  {
    index: 1,
    sanskrit: "नमामीशमीशाननिर्वाणरूपं विभुं व्यापकं ब्रह्मवेदस्वरूपम्।\nनिजं निर्गुणं निर्विकल्पं निरीहं चिदाकाशमाकाशवासं भजेऽहम्॥१॥",
    shortNepali: "म मोक्षस्वरूप, सर्वव्यापक, निर्गुण, इच्छारहित, चेतनाकाश भगवान शिवलाई नमस्कार गर्छु।",
    wordMappings: [
      { word: "नमामि",         nepali: "म नमस्कार गर्छु",     confidence: "high" },
      { word: "ईशम्",          nepali: "शिवलाई",              confidence: "high" },
      { word: "निर्वाणरूपम्", nepali: "मोक्षस्वरूप",         confidence: "high" },
      { word: "विभुम्",        nepali: "सर्वव्यापक",          confidence: "high" },
      { word: "व्यापकम्",      nepali: "सबैमा व्याप्त",       confidence: "high" },
      { word: "निर्गुणम्",     nepali: "गुणरहित",             confidence: "high" },
      { word: "निर्विकल्पम्", nepali: "विकल्परहित",          confidence: "high" },
      { word: "निरीहम्",       nepali: "इच्छारहित",           confidence: "high" },
      { word: "चिदाकाशम्",    nepali: "चेतना-आकाश",          confidence: "medium" },
      { word: "आकाशवासम्",    nepali: "आकाशमा वास गर्ने",    confidence: "high" },
      { word: "भजे अहम्",     nepali: "म भजन गर्छु",         confidence: "high" },
    ],
  },
  {
    index: 2,
    sanskrit: "निराकारमोंकारमूलं तुरीयं गिरा ग्यान गोतीतमीशं गिरीशम्।\nकरालं महाकालकालं कृपालुं गुणागारसंसारपारं नतोऽहम्॥२॥",
    shortNepali: "रूपरहित, ओंकारका मूल, वाणी-ज्ञानभन्दा परे, पहाडका स्वामी, महाकालका पनि काल, कृपालु शिवलाई म नमस्कार गर्छु।",
    wordMappings: [
      { word: "निराकारम्",        nepali: "रूपरहित",                  confidence: "high" },
      { word: "ओंकारमूलम्",      nepali: "ओंकारको मूल",              confidence: "high" },
      { word: "तुरीयम्",          nepali: "परमचेतना (चौथो अवस्था)",  confidence: "medium" },
      { word: "गिरीशम्",          nepali: "पहाडका स्वामी",            confidence: "high" },
      { word: "करालम्",           nepali: "भयंकर",                    confidence: "high" },
      { word: "महाकालकालम्",     nepali: "महाकालको पनि काल",         confidence: "high" },
      { word: "कृपालुम्",         nepali: "कृपालु",                   confidence: "high" },
      { word: "संसारपारम्",       nepali: "संसारभन्दा पर",            confidence: "high" },
      { word: "नतः अहम्",        nepali: "म नमस्कार गर्छु",          confidence: "high" },
    ],
  },
  {
    index: 3,
    sanskrit: "तुषाराद्रिसंकाशगौरं गभीरं मनोभूतकोटिप्रभाश्री शरीरम्।\nस्फुरन्मौलिकल्लोलिनी चारुगंगा लसद्भालबालेन्दु कण्ठे भुजंगा॥३॥",
    shortNepali: "हिमालयजस्ता गोरा, गहिरा, दिव्य शरीर भएका, शिरमा गंगा लहराइएका, निधारमा नयाँ चन्द्रमा र गलामा सर्प भएका शिव।",
    wordMappings: [
      { word: "तुषाराद्रिसंकाश", nepali: "हिमालयजस्तो",         confidence: "high" },
      { word: "गौरम्",            nepali: "उज्यालो/सेतो",         confidence: "high" },
      { word: "गभीरम्",           nepali: "गहिरो",                confidence: "high" },
      { word: "शरीरम्",           nepali: "शरीर",                 confidence: "high" },
      { word: "स्फुरन्",          nepali: "चमकिरहेको",            confidence: "high" },
      { word: "मौलि",             nepali: "शिरमा",                confidence: "high" },
      { word: "कल्लोलिनी",       nepali: "लहरिँदो",              confidence: "medium" },
      { word: "चारुगंगा",        nepali: "सुन्दर गंगा",           confidence: "high" },
      { word: "बालेन्दु",         nepali: "नयाँ चन्द्रमा",       confidence: "high" },
      { word: "कण्ठे भुजंगा",    nepali: "गलामा सर्प",           confidence: "high" },
    ],
  },
  {
    index: 4,
    sanskrit: "चलत्कुण्डलं शुभ्रनेत्रं विशालं प्रसन्नाननं नीलकण्ठं दयालम्।\nमृगाधीशचर्माम्बरं मुण्डमालं प्रियं शंकरं सर्वनाथं भजामि॥४॥",
    shortNepali: "हल्लिरहेका कुण्डल, उज्यालो आँखा, प्रसन्न मुख, नीलो कण्ठ, दयालु, सिंहछालाको वस्त्र र खप्परमाला भएका शिव-शंकरलाई म भजन गर्छु।",
    wordMappings: [
      { word: "चलत् कुण्डलम्",    nepali: "हल्लिरहेका कुण्डल",       confidence: "high" },
      { word: "शुभ्रनेत्रम्",      nepali: "उज्यालो आँखा",            confidence: "high" },
      { word: "प्रसन्नाननम्",      nepali: "प्रसन्न मुखमण्डल",        confidence: "high" },
      { word: "नीलकण्ठम्",        nepali: "नीलो कण्ठ भएका",           confidence: "high" },
      { word: "दयालम्",            nepali: "दयालु",                    confidence: "high" },
      { word: "मृगाधीशचर्माम्बरम्", nepali: "सिंहछालाको वस्त्र",     confidence: "high" },
      { word: "मुण्डमालम्",        nepali: "खप्परको माला",             confidence: "high" },
      { word: "शंकरम्",            nepali: "शंकर",                     confidence: "high" },
      { word: "सर्वनाथम्",         nepali: "सबैका स्वामी",             confidence: "high" },
      { word: "भजामि",             nepali: "म भजन गर्छु",              confidence: "high" },
    ],
  },
  {
    index: 5,
    sanskrit: "प्रचण्डं प्रकृष्टं प्रगल्भं परेशं अखण्डं अजं भानुकोटिप्रकाशम्।\nत्रयःशूलनिर्मूलनं शूलपाणिं भजेऽहं भवानीपतिं भावगम्यम्॥५॥",
    shortNepali: "प्रचण्ड, श्रेष्ठ, अखण्ड, अजन्मा, करोड सूर्यसमान प्रकाशित, तीन कष्ट नाश गर्ने, हातमा त्रिशूल भएका, भवानीका पति शिवलाई म भजन गर्छु।",
    wordMappings: [
      { word: "प्रचण्डम्",           nepali: "अत्यन्त तीव्र",         confidence: "high" },
      { word: "प्रकृष्टम्",          nepali: "श्रेष्ठ",               confidence: "high" },
      { word: "परेशम्",              nepali: "परम ईश्वर",              confidence: "high" },
      { word: "अखण्डम्",            nepali: "अखण्ड",                  confidence: "high" },
      { word: "अजम्",               nepali: "अजन्मा",                 confidence: "high" },
      { word: "भानुकोटिप्रकाशम्", nepali: "करोड सूर्यको प्रकाश",    confidence: "high" },
      { word: "त्रयःशूलनिर्मूलनम्", nepali: "तीन कष्ट नाश गर्ने",   confidence: "high" },
      { word: "शूलपाणिम्",          nepali: "हातमा त्रिशूल भएका",    confidence: "high" },
      { word: "भवानीपतिम्",         nepali: "भवानीका पति",            confidence: "high" },
      { word: "भावगम्यम्",          nepali: "भावनाले मात्र प्राप्त",  confidence: "medium" },
    ],
  },
  {
    index: 6,
    sanskrit: "कलातीतकल्याणकल्पान्तकारी सदा सज्जनानन्ददाता पुरारी।\nचिदानन्दसंदोहमोहापहारी प्रसीद प्रसीद प्रभो मन्मथारी॥६॥",
    shortNepali: "कलाभन्दा परे, सज्जनलाई आनन्द दिने, त्रिपुरासुर नाश गर्ने, चेतनानन्दका समूह, मोह हरण गर्ने हे मन्मथारी प्रभु, प्रसन्न हुनुहोस्।",
    wordMappings: [
      { word: "कलातीत",          nepali: "कलाभन्दा परे",         confidence: "high" },
      { word: "कल्पान्तकारी",   nepali: "प्रलयकर्ता",            confidence: "high" },
      { word: "सज्जनानन्ददाता", nepali: "सज्जनलाई आनन्द दिने",  confidence: "high" },
      { word: "पुरारी",          nepali: "त्रिपुरासुर नाश गर्ने", confidence: "high" },
      { word: "चिदानन्द",        nepali: "चेतनानन्द",             confidence: "high" },
      { word: "मोहापहारी",       nepali: "मोह हरण गर्ने",        confidence: "high" },
      { word: "प्रसीद",          nepali: "प्रसन्न हुनुहोस्",      confidence: "high" },
      { word: "मन्मथारी",        nepali: "कामदेव नाश गर्ने",     confidence: "high" },
    ],
  },
  {
    index: 7,
    sanskrit: "न यावद् उमानाथपादारविन्दं भजन्तीह लोके परे वा नराणाम्।\nन तावत्सुखं शान्ति सन्तापनाशं प्रसीद प्रभो सर्वभूताधिवासम्॥७॥",
    shortNepali: "जबसम्म मान्छेहरू उमाका पति शिवका चरणकमल भजन गर्दैनन्, तबसम्म न सुख छ, न शान्ति। हे सर्वव्यापी प्रभु, प्रसन्न हुनुहोस्।",
    wordMappings: [
      { word: "उमानाथ",          nepali: "उमाका पति (शिव)",      confidence: "high" },
      { word: "पादारविन्दम्",    nepali: "चरणकमल",               confidence: "high" },
      { word: "भजन्ति",          nepali: "भजन गर्छन्",            confidence: "high" },
      { word: "इह लोके",         nepali: "यो जीवनमा",            confidence: "high" },
      { word: "परे",              nepali: "परलोकमा",              confidence: "high" },
      { word: "नराणाम्",         nepali: "मान्छेहरूका",           confidence: "high" },
      { word: "सन्तापनाशम्",     nepali: "कष्ट नाश",             confidence: "high" },
      { word: "प्रसीद",          nepali: "प्रसन्न हुनुहोस्",      confidence: "high" },
      { word: "सर्वभूताधिवासम्", nepali: "सबै प्राणीमा वास गर्ने", confidence: "high" },
    ],
  },
  {
    index: 8,
    sanskrit: "न जानामि योगं जपं नैव पूजां नतोऽहं सदा सर्वदा शम्भुतुभ्यम्।\nजराजन्मदुःखौघतातप्यमानं प्रभो पाहि आपन्नमामीश शम्भो॥८॥",
    shortNepali: "म योग, जप, पूजा केही जान्दिन। हे शम्भु, म सधैं तपाईंलाई नमस्कार गर्छु। जन्म-जराका दुःखमा तड्पिरहेको मलाई, हे ईश शम्भु, रक्षा गर्नुहोस्।",
    wordMappings: [
      { word: "न जानामि",      nepali: "म जान्दिन",            confidence: "high" },
      { word: "योगम्",          nepali: "योग",                  confidence: "high" },
      { word: "जपम्",           nepali: "जप",                   confidence: "high" },
      { word: "पूजाम्",         nepali: "पूजा",                 confidence: "high" },
      { word: "नतः अहम्",      nepali: "म नमस्कार गर्छु",      confidence: "high" },
      { word: "शम्भु",          nepali: "हे शम्भु",             confidence: "high" },
      { word: "जरा जन्म",       nepali: "बुढापाको र जन्मको",   confidence: "high" },
      { word: "दुःखौघ",         nepali: "दुःखका लहर",           confidence: "high" },
      { word: "तातप्यमानम्",   nepali: "तड्पिरहेको",           confidence: "high" },
      { word: "पाहि",           nepali: "रक्षा गर्नुहोस्",      confidence: "high" },
      { word: "आपन्नम् माम्",  nepali: "संकटमा परेको मलाई",   confidence: "high" },
    ],
  },
];

// ── Main export ────────────────────────────────────────────────────────────────

export function getShlokaTemplate(workTitle: string): ShlokaCard[] | null {
  const normalized = workTitle.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("rudrashtakam") || normalized.includes("रुद्राष्टकम")) {
    return RUDRASHTAKAM_SHLOKAS;
  }
  return null;
}


export function analyzeSacredSource(input: string): SacredSourceAnalysis {
  const trimmed = input.trim();
  return /^https?:\/\//i.test(trimmed)
    ? analyzeAsUrl(trimmed)
    : analyzeAsText(trimmed);
}

function analyzeAsUrl(url: string): SacredSourceAnalysis {
  const rights = analyzeSourceUrl(url);
  const nextActions: string[] = [];

  if (rights.licenseSignal === "public_domain" || rights.licenseSignal === "open_license") {
    nextActions.push("यो URL Sacred Work मा Source मा add गर्नुहोस्");
    nextActions.push("Source type (Text / Audio / PDF) select गर्नुहोस्");
  } else if (rights.licenseSignal === "creator_permission_needed") {
    nextActions.push("Audio reuse: आफ्नै recitation plan गर्नुहोस्");
    nextActions.push("Text meaning Nepali मा लेख्नुहोस् — reuse होइन");
    nextActions.push("Permission चाहिन्छ भने Permission Task बनाउनुहोस्");
  } else {
    nextActions.push("Source item page खोलेर 'Rights' / 'License' field check गर्नुहोस्");
    nextActions.push("License confirm भएपछि Approve गर्नुहोस्");
  }

  const confidence: ConfidenceLevel =
    rights.licenseSignal === "public_domain" ? "high"
    : rights.licenseSignal === "open_license" ? "medium"
    : "low";

  return {
    inputType:         "url",
    rawInput:          url,
    rightsAnalysis:    rights,
    suggestedMetadata: {},
    confidence,
    allowedItems:      [...rights.allowedItems],
    cautionItems:      [...rights.cautionItems, ...rights.blockedItems],
    nextActions,
    recommendation:    rights.recommendedAction,
  };
}

function analyzeAsText(text: string): SacredSourceAnalysis {
  const script   = detectScript(text);
  const language = detectLanguageFromText(text, script);
  const shlokas  = estimateShlokas(text);
  const isVerse  = detectVerse(text);
  const matched  = matchWork(text);

  const suggestedMetadata: SuggestedMetadata = matched
    ? {
        canonicalTitle:  matched.title,
        devanagariTitle: matched.devanagari,
        tradition:       matched.tradition,
        textType:        matched.textType,
        language:        matched.language,
        primaryDeity:    matched.deity,
        author:          matched.author,
        shlokaCount:     shlokas || undefined,
      }
    : {
        language:    language !== "unknown" ? language : undefined,
        textType:    isVerse ? "stotra" : undefined,
        shlokaCount: shlokas || undefined,
      };

  const allowedItems = ["Sanskrit पाठ — private study र reference मिल्छ"];
  if (language === "sanskrit") {
    allowedItems.push("Nepali translation र meaning explain — मिल्छ");
  }
  const cautionItems = ["Original source verify गर्नुहोस् — attribution अनिवार्य"];

  const nextActions: string[] = [];
  if (matched) {
    nextActions.push(`"${matched.title}" Sacred Work मा यो text save गर्नुहोस्`);
    if (shlokas > 0) {
      nextActions.push(`${shlokas} shloka atoms — Phase 2 मा AI extraction`);
    }
    nextActions.push("Source approve गरेर Shloka Atoms बनाउन तयार गर्नुहोस्");
  } else {
    nextActions.push("यो text manually Sacred Work assign गर्नुहोस्");
    nextActions.push("Relevant Sacred Work नभएमा नयाँ Work बनाउनुहोस्");
  }

  const confidence: ConfidenceLevel = matched ? "high" : isVerse ? "medium" : "low";

  return {
    inputType:         "text",
    rawInput:          text,
    detectedScript:    script,
    detectedLanguage:  language,
    estimatedShlokas:  shlokas,
    looksLikeVerse:    isVerse,
    suggestedMetadata,
    matchedWorkTitle:  matched?.title,
    confidence,
    allowedItems,
    cautionItems,
    nextActions,
    recommendation:    matched
      ? `"${matched.title}" match भयो — Approve गरेर यो Work मा save गर्नुहोस्।`
      : isVerse
        ? "Sanskrit verse detect भयो — manually work assign गरेर save गर्नुहोस्।"
        : "Source verify गरेर manually classify गर्नुहोस्।",
  };
}
