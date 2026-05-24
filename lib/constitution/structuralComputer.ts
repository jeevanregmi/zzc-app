import type { ConstitutionalFrameworkRecord } from "../types/constitutional-framework";

// ─── Structural profile — derived ONLY from constitutional atoms ──────────────
// These metrics describe what the constitution SAYS — not what the government does.
// They change only if the constitution text changes.

export interface PartStructuralProfile {
  partNumber:        number;
  atomCount:         number;   // total records (articles + clauses) — constitutional atoms
  dharaCount:        number;   // unique article numbers
  clauseDensity:     number;   // average clauses per dhara (1 decimal)
  rightsComplexity:  number;   // total rights[] entries across all atoms
  institutionCount:  number;   // unique institution names referenced
  dutyCount:         number;   // total duties[] entries
  obligationCount:   number;   // total obligations[] entries
  dependencyCount:   number;   // total relatedArticles[] cross-references
  governanceScope:   string[]; // unique governanceStructures listed
  keywordCount:      number;   // total keywords[] — semantic breadth
  affectedGroupCount:number;   // unique affectedGroups — social reach
}

export function computeStructuralProfile(
  partNumber: number,
  atoms: ConstitutionalFrameworkRecord[],
): PartStructuralProfile {
  const partAtoms = atoms.filter(a => a.partNumber === partNumber);

  if (partAtoms.length === 0) {
    return {
      partNumber,
      atomCount:          0,
      dharaCount:         0,
      clauseDensity:      0,
      rightsComplexity:   0,
      institutionCount:   0,
      dutyCount:          0,
      obligationCount:    0,
      dependencyCount:    0,
      governanceScope:    [],
      keywordCount:       0,
      affectedGroupCount: 0,
    };
  }

  const uniqueArticles    = new Set(partAtoms.map(a => a.article));
  const uniqueInstitutions= new Set(partAtoms.flatMap(a => a.institutions ?? []));
  const uniqueGovScope    = new Set(partAtoms.flatMap(a => a.governanceStructures ?? []));
  const uniqueGroups      = new Set(partAtoms.flatMap(a => a.affectedGroups ?? []));

  // Clause density: articles with more than one record (multi-clause articles)
  const clausesPerArticle = new Map<number, number>();
  for (const a of partAtoms) {
    clausesPerArticle.set(a.article, (clausesPerArticle.get(a.article) ?? 0) + 1);
  }
  const densityValues = Array.from(clausesPerArticle.values());
  const clauseDensity = densityValues.length > 0
    ? Math.round(densityValues.reduce((s, v) => s + v, 0) / densityValues.length * 10) / 10
    : 0;

  return {
    partNumber,
    atomCount:          partAtoms.length,
    dharaCount:         uniqueArticles.size,
    clauseDensity,
    rightsComplexity:   partAtoms.reduce((s, a) => s + (a.rights?.length ?? 0), 0),
    institutionCount:   uniqueInstitutions.size,
    dutyCount:          partAtoms.reduce((s, a) => s + (a.duties?.length ?? 0), 0),
    obligationCount:    partAtoms.reduce((s, a) => s + (a.obligations?.length ?? 0), 0),
    dependencyCount:    partAtoms.reduce((s, a) => s + (a.relatedArticles?.length ?? 0), 0),
    governanceScope:    Array.from(uniqueGovScope),
    keywordCount:       partAtoms.reduce((s, a) => s + (a.keywords?.length ?? 0), 0),
    affectedGroupCount: uniqueGroups.size,
  };
}

export function computeAllStructuralProfiles(
  partNumbers: number[],
  atoms: ConstitutionalFrameworkRecord[],
): Map<number, PartStructuralProfile> {
  const map = new Map<number, PartStructuralProfile>();
  for (const pn of partNumbers) {
    map.set(pn, computeStructuralProfile(pn, atoms));
  }
  return map;
}
