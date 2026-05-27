/**
 * Constitutional Intelligence Infrastructure — type definitions.
 *
 * Three layers on top of the existing constitutional_framework:
 *   1. constitutional_master    — verified canonical article graph
 *   2. constitutional_variants  — raw extractions, OCR, parsing failures
 *   3. constitutional_dictionary — Nepali ↔ English civic term mappings
 *
 * See docs/CONSTITUTIONAL_MASTER.md for full architecture rationale.
 *
 * IMPORTANT: These collections do NOT exist in Firestore yet.
 * Phase 5 (dictionary) and Phase 6 (normalization) will create them.
 * Until then, constitutional_framework remains the active Layer 1 source.
 */

// ─── constitutional_master ─────────────────────────────────────────────────────

export type MasterReviewStatus = "verified" | "ai_suggested" | "needs_review";

export interface ConstitutionalMasterRecord {
  id?:            string;
  ownerId:        string;

  // ── Identity (human-verified, not AI-extracted) ──────────────────────────
  articleId:      string;   // "art-18" — matches constitutional_framework
  partNumber:     number;   // 3 (verified)
  part:           string;   // "Part 3 — Fundamental Rights"
  article:        number;   // 18
  clause?:        string | null;

  // ── Verified bilingual content ────────────────────────────────────────────
  titleEnglish:   string;
  titleNepali:    string;
  textEnglish:    string;   // verbatim English constitutional text
  textNepali:     string;   // verbatim Nepali constitutional text (देवनागरी)
  summaryNepali:  string;   // plain-language citizen summary (max 120 chars)

  // ── Semantic tagging ──────────────────────────────────────────────────────
  constitutionalThemes: string[];
  rights?:        string[];
  institutions?:  string[];
  dictionaryRefs: string[];  // term IDs from constitutional_dictionary

  // ── Source traceability ───────────────────────────────────────────────────
  sourceFrameworkId?: string;  // constitutional_framework record this was derived from
  sourcePage?:    number;
  confidence:     number;      // 0–1; founder-verified = 1.0

  // ── Normalization metadata ────────────────────────────────────────────────
  normalizedAt:   string;      // ISO timestamp
  normalizedBy:   "founder" | "ai_suggestion_accepted";
  reviewStatus:   MasterReviewStatus;
}

// ─── constitutional_variants ──────────────────────────────────────────────────

export type VariantType =
  | "raw_extraction"
  | "ocr_output"
  | "parsing_failure"
  | "historical";

export interface ConstitutionalVariant {
  id?:            string;
  ownerId:        string;
  articleId:      string;      // links to constitutional_master record (may not exist yet)
  variantType:    VariantType;
  rawText:        string;      // exactly as extracted or scanned
  rawPart?:       string;      // raw part field ("भाग ३", "Part 3", "0")
  parsedPartNumber?: number;   // what the parser inferred
  extractedAt:    string;
  sourceDocId?:   string;      // vault_documents docId
  extractionModel?: string;    // "gemini-flash-2.0", "bedrock-sonnet"
  errorNote?:     string;      // why this variant was flagged
}

// ─── constitutional_dictionary ────────────────────────────────────────────────

export type DictionaryDomain =
  | "fundamental_rights"
  | "governance"
  | "federal_structure"
  | "social_justice"
  | "economic_rights"
  | "cultural_rights"
  | "judicial"
  | "constitutional_principles";

export type DifficultyLevel = "citizen" | "educated" | "legal";

export interface ConstitutionalDictionaryTerm {
  id?:               string;
  ownerId:           string;

  // ── Core bilingual mapping ────────────────────────────────────────────────
  termEnglish:       string;   // "egalitarian"
  termNepali:        string;   // "समतामूलक"
  definitionEnglish: string;
  definitionNepali:  string;
  usageExamples:     string[]; // how term appears in constitution

  // ── Constitutional grounding ──────────────────────────────────────────────
  articleRefs:       string[];  // ["art-18", "art-4"]
  partRefs:          number[];  // [3, 4]
  relatedTerms:      string[];  // other term IDs

  // ── Classification ────────────────────────────────────────────────────────
  domain:            DictionaryDomain;
  difficultyLevel:   DifficultyLevel;

  // ── Metadata ──────────────────────────────────────────────────────────────
  addedAt:           string;
  addedBy:           "founder" | "ai_suggestion";
  verified:          boolean;
}

// ─── Priority seed terms ──────────────────────────────────────────────────────
// First 20 dictionary entries to add manually in Phase 5.

export const DICTIONARY_SEED_TERMS: Array<{
  termEnglish: string;
  termNepali:  string;
  domain:      DictionaryDomain;
  difficultyLevel: DifficultyLevel;
}> = [
  { termEnglish: "egalitarian",                termNepali: "समतामूलक",                          domain: "constitutional_principles", difficultyLevel: "educated" },
  { termEnglish: "equity",                     termNepali: "न्यायोचित समान पहुँच",                 domain: "social_justice",           difficultyLevel: "educated" },
  { termEnglish: "social justice",             termNepali: "सामाजिक न्याय",                      domain: "social_justice",           difficultyLevel: "citizen"  },
  { termEnglish: "federal democratic republic",termNepali: "संघीय लोकतान्त्रिक गणतन्त्र",         domain: "governance",               difficultyLevel: "citizen"  },
  { termEnglish: "fundamental rights",         termNepali: "मौलिक हकहरू",                         domain: "fundamental_rights",       difficultyLevel: "citizen"  },
  { termEnglish: "directive principles",       termNepali: "राज्यका निर्देशक सिद्धान्तहरू",        domain: "constitutional_principles", difficultyLevel: "educated" },
  { termEnglish: "constitutional body",        termNepali: "संवैधानिक निकाय",                     domain: "governance",               difficultyLevel: "educated" },
  { termEnglish: "sovereignty",                termNepali: "सार्वभौमसत्ता",                       domain: "constitutional_principles", difficultyLevel: "citizen"  },
  { termEnglish: "separation of powers",       termNepali: "शक्ति पृथकीकरण",                     domain: "governance",               difficultyLevel: "educated" },
  { termEnglish: "rule of law",                termNepali: "कानुनको शासन",                        domain: "judicial",                 difficultyLevel: "citizen"  },
  { termEnglish: "judicial review",            termNepali: "न्यायिक पुनरावलोकन",                  domain: "judicial",                 difficultyLevel: "legal"    },
  { termEnglish: "proportional representation",termNepali: "समानुपातिक प्रतिनिधित्व",              domain: "governance",               difficultyLevel: "educated" },
  { termEnglish: "secularism",                 termNepali: "धर्मनिरपेक्षता",                      domain: "constitutional_principles", difficultyLevel: "citizen"  },
  { termEnglish: "positive discrimination",    termNepali: "सकारात्मक विभेद",                     domain: "social_justice",           difficultyLevel: "educated" },
  { termEnglish: "citizenship",                termNepali: "नागरिकता",                             domain: "constitutional_principles", difficultyLevel: "citizen"  },
  { termEnglish: "human dignity",              termNepali: "मानवीय मर्यादा",                      domain: "fundamental_rights",       difficultyLevel: "citizen"  },
  { termEnglish: "due process",                termNepali: "उचित कानुनी प्रक्रिया",               domain: "judicial",                 difficultyLevel: "legal"    },
  { termEnglish: "public interest",            termNepali: "सार्वजनिक हित",                       domain: "constitutional_principles", difficultyLevel: "citizen"  },
  { termEnglish: "constitutional amendment",   termNepali: "संविधान संशोधन",                      domain: "governance",               difficultyLevel: "educated" },
  { termEnglish: "impeachment",               termNepali: "महाभियोग",                             domain: "judicial",                 difficultyLevel: "legal"    },
];

// ─── Normalization pipeline status ────────────────────────────────────────────
// Tracks whether a constitutional_framework record has been normalized.

export type NormalizationStatus =
  | "pending"           // not yet processed through normalization pipeline
  | "repairable"        // partNumber === 0, can be auto-repaired from `part` field
  | "unclassified"      // partNumber null/undefined — needs manual review
  | "normalized"        // written to constitutional_master (ai_suggested)
  | "verified";         // founder verified in constitutional_master

export function classifyFrameworkRecord(record: {
  partNumber?: number | null;
  part?: string | null;
}): NormalizationStatus {
  if (record.partNumber == null)                return "unclassified";
  if (record.partNumber === 0 && !!record.part) return "repairable";
  if (record.partNumber === 0)                  return "unclassified";
  return "pending";
}
