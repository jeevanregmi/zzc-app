/**
 * Constitutional Framework Record — one article/clause of Nepal's Constitution (2015/2072 BS).
 * These are the ROOT nodes of the entire ZZC governance intelligence graph.
 * All future janta_intelligence records will reference these via constitutionalRefs[].
 */
export interface ConstitutionalFrameworkRecord {
  id?:                   string;

  // ── Identity ────────────────────────────────────────────────────────────────
  articleId:             string;    // canonical ID: "art-18", "art-51-j-3"
  part:                  string;    // "Part 3 — Fundamental Rights"
  partNumber:            number;    // 3
  article:               number;    // 18
  clause?:               string | null; // "1", "a", "j(3)", null

  // ── Text ────────────────────────────────────────────────────────────────────
  titleEnglish:          string;    // "Right to Equality"
  titleNepali:           string;    // "समानताको हक"
  originalText:          string;    // verbatim text from Constitution (max 300 chars)
  plainNepaliSummary:    string;    // simple Nepali explanation (max 100 chars)

  // ── Semantic tags ────────────────────────────────────────────────────────────
  rights:                string[];  // rights guaranteed by this article
  duties:                string[];  // duties imposed on citizens
  obligations:           string[];  // state obligations
  institutions:          string[];  // institutions mentioned or empowered
  governanceStructures:  string[];  // "federal" | "provincial" | "local" | "judiciary" | "executive" | "legislature"
  sectors:               string[];  // "education" | "health" | "finance" | "governance" | etc.
  affectedGroups:        string[];  // "women" | "dalits" | "janajati" | "all citizens" | etc.
  keywords:              string[];

  // ── Graph edges ───────────────────────────────────────────────────────────────
  relatedArticles:       string[];  // other articleId values
  constitutionalThemes:  string[];  // "fundamental rights" | "directive principles" | "governance" | etc.

  // ── Provenance ───────────────────────────────────────────────────────────────
  sourcePage?:           number | null;
  confidence:            number;    // 0–1

  // ── Publishing ───────────────────────────────────────────────────────────────
  publishToJanta:        boolean;
  ownerId:               string;
  sourceDocId:           string;
  sourceDocTitle:        string;
  createdAt:             string;
  updatedAt:             string;
}
