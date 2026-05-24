/**
 * atomToIntelBridge.ts
 *
 * Phase 1 Bridge: converts approved CivicAtoms (vault_civic_atoms) into the
 * IntelligenceRecord shape that computePartHealth understands.
 *
 * This lets the constitution tree and branch health dashboard read from the
 * new atom system WITHOUT migrating janta_intelligence data yet.
 *
 * Key insight: CivicAtom.constitutionalParts carries explicit part numbers
 * (1-35) — computePartHealth treats constitutionalRefs as the priority signal,
 * bypassing sector inference entirely for these atoms.
 */

import type { CivicAtom } from "../types/atoms";
import type {
  IntelligenceRecord,
  IntelRecordType,
  ImplementationStatus,
} from "../types/intelligence-record";

// ── How each atom type maps to a health signal ────────────────────────────────
// The health computer scores branches based on implementationStatus.
// We map atom types to the closest meaningful status.

const ATOM_STATUS: Record<CivicAtom["type"], ImplementationStatus> = {
  fact:           "completed",    // verified fact = something that IS
  promise:        "announced",    // government commitment = stated, not done
  policy_change:  "in_progress",  // enacted policy = being implemented
  financial:      "budgeted",     // financial data = budget/money allocated
  risk:           "delayed",      // risk = warning signal (hurts score)
  right:          "completed",    // constitutional right = established
  target:         "started",      // numerical goal = work has begun
  institution:    "in_progress",  // institutional decision = ongoing
};

const ATOM_INTEL_TYPE: Record<CivicAtom["type"], IntelRecordType> = {
  fact:           "project",
  promise:        "promise",
  policy_change:  "reform",
  financial:      "budget_target",
  risk:           "other",
  right:          "reform",
  target:         "employment_target",
  institution:    "institution",
};

// ── Bridge function ───────────────────────────────────────────────────────────

/**
 * Convert an array of CivicAtoms into IntelligenceRecord shape.
 * The resulting records are fed into computeAllPartsHealth alongside
 * any existing janta_intelligence records.
 */
export function atomsToIntelRecords(atoms: CivicAtom[]): IntelligenceRecord[] {
  return atoms.map(a => {
    const rec: IntelligenceRecord = {
      id:      a.id,
      ownerId: a.ownerId,
      domain:  "janta",

      sourceDocId:    a.sourceDocId,
      sourceDocTitle: a.sourceDocTitle,

      type:          ATOM_INTEL_TYPE[a.type],
      title:         a.text.slice(0, 120),
      titleNepali:   a.textNepali ?? a.text.slice(0, 120),
      summaryNepali: a.textNepali ?? a.text,

      sector:         a.affectedSectors[0] ?? "policy",
      ministry:       a.sourceAuthority ?? "",
      measurable:     a.type === "target" || a.type === "financial",

      geoScope:        "national",
      governmentLevel: "federal",

      implementationStatus: ATOM_STATUS[a.type],
      verificationStatus:   a.confidence >= 0.75 ? "human_verified" : "ai_extracted",

      affectedGroups:  a.citizenGroups,
      affectedSectors: a.affectedSectors,

      // ── The key bridge field ─────────────────────────────────────────────
      // constitutionalRefs (part numbers) are used FIRST by inferParts()
      // in healthComputer.ts — this bypasses sector inference entirely.
      constitutionalRefs: a.constitutionalParts,

      tags:       a.affectedSectors,
      confidence: a.confidence,

      publishToJanta: true,
      published:      true,

      createdAt: a.harvestedAt,
      updatedAt: a.harvestedAt,
    };
    return rec;
  });
}
