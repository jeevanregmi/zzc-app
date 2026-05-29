/**
 * lib/knowledge/router.ts — Phase 5: Routing Layer
 *
 * Higher-level helpers on top of routeKnowledgeAtom() (defined in lib/types/knowledge-objects.ts).
 *
 * Responsibilities:
 * - applyApprovedSuggestion()  — merge an approved ClassificationSuggestion into a UKO
 * - routeBatch()               — route a list of UKOs
 * - Firestore query helpers    — which route flag to filter by for each public product
 *
 * IMPORTANT: This module is pure — no Firestore writes, no side effects.
 * All writes happen in Phase 6 vault UI, which calls these helpers
 * and then persists the result.
 *
 * Pipeline position:
 *   classifyKnowledgeAtom() → founder approves → applyApprovedSuggestion() → persist
 *
 * See: docs/ATOM_POOL_ARCHITECTURE.md
 */

import {
  routeKnowledgeAtom,
  computeUKOQualityScore,
  VAULT_ONLY_ROUTE,
  type UniversalKnowledgeObject,
  type ClassificationSuggestion,
  type KnowledgeRoute,
  type PublicProduct,
} from "../types/knowledge-objects";

export { routeKnowledgeAtom, VAULT_ONLY_ROUTE };

// ── Apply approved suggestion ─────────────────────────────────────────────────

/**
 * applyApprovedSuggestion — merge an approved ClassificationSuggestion into a UKO.
 *
 * Called by the Phase 6 vault UI when the founder clicks "Approve" or "Approve + Edit".
 * Returns a new UKO with:
 *  - classifications  updated from the suggestion (or editedClassifications if provided)
 *  - classificationStatus set to "approved" (or "edited" if founder edited)
 *  - routes recomputed via routeKnowledgeAtom()
 *  - qualityScore recomputed
 *  - updatedAt set to now
 *
 * Does NOT mutate the original. Does NOT write to Firestore.
 */
export function applyApprovedSuggestion(
  uko: UniversalKnowledgeObject,
  suggestion: ClassificationSuggestion,
): UniversalKnowledgeObject {
  const classifications = suggestion.editedClassifications ?? suggestion.suggestedClassifications;
  const classificationStatus = suggestion.editedClassifications ? "edited" : "approved";

  const updated: UniversalKnowledgeObject = {
    ...uko,
    classifications,
    classificationStatus,
    updatedAt: new Date().toISOString(),
  };

  // Recompute quality score and routes from the merged state
  updated.qualityScore = computeUKOQualityScore(updated);
  updated.routes       = routeKnowledgeAtom(updated);

  return updated;
}

/**
 * applyRejectedSuggestion — mark a UKO's classificationStatus as "rejected".
 * Routes reset to VAULT_ONLY_ROUTE — atom stays private.
 */
export function applyRejectedSuggestion(
  uko: UniversalKnowledgeObject,
): UniversalKnowledgeObject {
  return {
    ...uko,
    classificationStatus: "rejected",
    routes:               VAULT_ONLY_ROUTE,
    updatedAt:            new Date().toISOString(),
  };
}

// ── Batch routing ─────────────────────────────────────────────────────────────

/**
 * routeBatch — apply routeKnowledgeAtom to a list of UKOs.
 * Returns new UKOs with updated routes (does not mutate).
 */
export function routeBatch(
  ukos: UniversalKnowledgeObject[],
): UniversalKnowledgeObject[] {
  return ukos.map(uko => ({ ...uko, routes: routeKnowledgeAtom(uko) }));
}

// ── Product → route flag map ──────────────────────────────────────────────────

/**
 * PRODUCT_ROUTE_FLAG — maps a PublicProduct to the KnowledgeRoute boolean flag name.
 * Used by Firestore query helpers to filter atoms by their routing state.
 *
 * Firestore does not support querying nested fields with dot notation in compound
 * queries, so callers must filter in memory after fetching by collection.
 * These keys are the field names to check on the `routes` sub-object.
 */
export const PRODUCT_ROUTE_FLAG: Record<PublicProduct, keyof KnowledgeRoute> = {
  civic_feed:           "showInCivicFeed",
  constitution_reader:  "showInConstitutionReader",
  janta_intelligence:   "showInJantaFeed",
  economy_chautari:     "showInEconomyChautari",
  promise_tracker:      "showInPromiseTracker",
  bhakti_chautari:      "showInBhaktiChautari",
  shloka_explorer:      "showInSlokhaExplorer",
  media_studio:         "showInMediaStudio",
  discussion_forum:     "showInDiscussionQueue",
  ai_tutor:             "showInAITutor",
};

/**
 * filterByProduct — filter an in-memory list of UKOs to those routed to a product.
 * Use this after fetching atoms from any source collection.
 */
export function filterByProduct(
  ukos: UniversalKnowledgeObject[],
  product: PublicProduct,
): UniversalKnowledgeObject[] {
  const flag = PRODUCT_ROUTE_FLAG[product];
  return ukos.filter(uko => uko.routes[flag] === true);
}

/**
 * filterPublic — return only atoms with keepVaultOnly === false.
 * These are the atoms that are allowed to appear in at least one public product.
 */
export function filterPublic(ukos: UniversalKnowledgeObject[]): UniversalKnowledgeObject[] {
  return ukos.filter(uko => !uko.routes.keepVaultOnly);
}

/**
 * filterVaultOnly — return atoms that are NOT yet cleared for any public product.
 * Useful for the vault review queue: atoms that still need classification.
 */
export function filterVaultOnly(ukos: UniversalKnowledgeObject[]): UniversalKnowledgeObject[] {
  return ukos.filter(uko => uko.routes.keepVaultOnly);
}

// ── Route summary ─────────────────────────────────────────────────────────────

/**
 * activeProducts — returns the list of PublicProducts this atom is currently routed to.
 * Inverse of PRODUCT_ROUTE_FLAG: reads flags and maps back to product names.
 */
export function activeProducts(uko: UniversalKnowledgeObject): PublicProduct[] {
  if (uko.routes.keepVaultOnly) return [];

  return (Object.entries(PRODUCT_ROUTE_FLAG) as Array<[PublicProduct, keyof KnowledgeRoute]>)
    .filter(([, flag]) => uko.routes[flag] === true)
    .map(([product]) => product);
}

/**
 * routeSummary — human-readable routing summary for vault UI.
 * Returns empty string if vault-only.
 */
export function routeSummary(uko: UniversalKnowledgeObject): string {
  const products = activeProducts(uko);
  if (products.length === 0) return "";
  return products.join(", ");
}

// ── Suggestion state helpers ──────────────────────────────────────────────────

/**
 * suggestionNeedsReview — true if a suggestion is still pending founder action.
 */
export function suggestionNeedsReview(suggestion: ClassificationSuggestion): boolean {
  return suggestion.status === "pending";
}

/**
 * suggestionIsResolved — true if founder has taken a final action (not pending/deferred).
 */
export function suggestionIsResolved(suggestion: ClassificationSuggestion): boolean {
  return suggestion.status === "approved" || suggestion.status === "edited" || suggestion.status === "rejected";
}
