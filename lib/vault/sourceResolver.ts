// Source resolver: given context (partNumbers, govFolder, documentTypes, tags),
// returns ranked official sources. Higher score = better match.

import { SOURCE_REGISTRY, type OfficialSource, type DocumentType } from "./sourceRegistry";

export interface SourceContext {
  partNumbers?:    number[];
  govFolder?:      string;
  documentTypes?:  DocumentType[];
  tags?:           string[];
  limit?:          number;   // default 4
}

interface ScoredSource {
  source: OfficialSource;
  score:  number;
}

export function getSourcesForContext(ctx: SourceContext): OfficialSource[] {
  const { partNumbers = [], govFolder, documentTypes = [], tags = [], limit = 4 } = ctx;

  const scored: ScoredSource[] = SOURCE_REGISTRY.map(src => {
    let score = 0;

    // Part match — highest weight (3 pts per matched part)
    for (const pn of partNumbers) {
      if (src.relatedParts.includes(pn)) score += 3;
    }

    // GovFolder match (4 pts — very specific)
    if (govFolder && src.relatedGovFolders.some(f => govFolder.toLowerCase().includes(f) || f.includes(govFolder.toLowerCase()))) {
      score += 4;
    }

    // DocumentType match (2 pts per match)
    for (const dt of documentTypes) {
      if (src.documentTypes.includes(dt)) score += 2;
    }

    // Tag match (1 pt per match)
    for (const tag of tags) {
      if (src.tags.includes(tag.toLowerCase().replace(/[\s-]/g, "_"))) score += 1;
    }

    // Trust level bonus: primary gets +2, secondary +1
    if (src.trustLevel === "primary")   score += 2;
    if (src.trustLevel === "secondary") score += 1;

    // Penalty for universal-coverage sources (Law Commission, Gazette) when
    // there are more specific matches — they should appear last in list
    if (score > 0 && (src.sourceId === "law_commission" || src.sourceId === "nepal_gazette")) {
      score -= 1;
    }

    return { source: src, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.source);
}

// Convenience: resolve for a single part number
export function getSourcesForPart(partNumber: number, limit = 4): OfficialSource[] {
  return getSourcesForContext({ partNumbers: [partNumber], limit });
}
