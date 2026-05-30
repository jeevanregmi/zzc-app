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

// ── Main export ────────────────────────────────────────────────────────────────

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
