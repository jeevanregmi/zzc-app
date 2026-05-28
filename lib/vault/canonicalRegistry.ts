/**
 * Canonical Document Registry
 *
 * Firestore CRUD for the canonical_documents collection.
 * Provides:
 *   - getOrCreateCanonical: main entry point — looks up existing or creates new
 *   - findByKey: fast lookup by canonicalKey
 *   - getCanonicals: list all for owner
 *   - linkInstance: attach a vault_intelligence_docs ID to a canonical
 *   - promoteDocToCanonical: the full promotion flow from a doc ID
 */

import {
  collection, doc, addDoc, updateDoc, getDocs, getDoc, query,
  where, limit, arrayUnion, Timestamp,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import { computeFingerprint } from "./identityFingerprint";
import { matchDocToCanonicals } from "./canonicalMatcher";
import type { CanonicalDocument, CanonicalPromotionInput, CanonicalMatch } from "../types/canonical-identity";
import { LIFECYCLE_UPDATE_FREQUENCY } from "../types/canonical-identity";

const COL = "canonical_documents";

// ── Read ──────────────────────────────────────────────────────────────────────

export async function getCanonicals(ownerId: string): Promise<CanonicalDocument[]> {
  const snap = await getDocs(query(
    collection(db, COL),
    where("ownerId", "==", ownerId),
    limit(500),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CanonicalDocument));
}

export async function findCanonicalByKey(
  ownerId: string,
  key:     string,
): Promise<CanonicalDocument | null> {
  const snap = await getDocs(query(
    collection(db, COL),
    where("ownerId",      "==", ownerId),
    where("canonicalKey", "==", key),
    limit(1),
  ));
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as CanonicalDocument;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createCanonical(input: CanonicalPromotionInput): Promise<string> {
  const now = new Date().toISOString();
  const canonical: Omit<CanonicalDocument, "id"> = {
    ownerId:           input.ownerId,
    canonicalTitle:    input.canonicalTitle,
    institutionId:     input.institutionId,
    govFolder:         input.govFolder,
    lifecycleType:     input.lifecycleType,
    year:              input.year,
    canonicalKey:      computeFingerprint(input).canonicalKey,
    titleFingerprint:  input.titleFingerprint,
    primarySourceUrl:  input.primarySourceUrl,
    knownAliasUrls:    [],
    knownFilenames:    [input.fileName],
    constitutionalParts: input.constitutionalParts,
    tags:              input.tags,
    primaryInstanceId: input.instanceId,
    allInstanceIds:    [input.instanceId],
    updateFrequency:   input.updateFrequency || LIFECYCLE_UPDATE_FREQUENCY[input.lifecycleType] || "rare",
    status:            "active",
    createdAt:         now,
    updatedAt:         now,
  };
  const ref = await addDoc(collection(db, COL), {
    ...canonical,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function linkInstanceToCanonical(
  canonicalId: string,
  instanceId:  string,
  fileName?:   string,
  aliasUrl?:   string,
): Promise<void> {
  const patch: Record<string, unknown> = {
    allInstanceIds: arrayUnion(instanceId),
    updatedAt:      Timestamp.now(),
  };
  if (fileName) patch.knownFilenames = arrayUnion(fileName);
  if (aliasUrl) patch.knownAliasUrls = arrayUnion(aliasUrl);
  await updateDoc(doc(db, COL, canonicalId), patch);
}

export async function updateCanonical(
  id:    string,
  patch: Partial<Omit<CanonicalDocument, "id" | "ownerId" | "createdAt">>,
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...patch, updatedAt: Timestamp.now() });
}

// ── Promote (main entry point) ────────────────────────────────────────────────

export interface PromoteResult {
  canonicalId: string;
  wasExisting: boolean;
  match?:      CanonicalMatch;
}

/**
 * The main promotion flow:
 *
 *   1. Compute fingerprint from doc metadata
 *   2. Check for existing canonical by key (fast exact lookup)
 *   3. If found → link this instance to existing canonical
 *   4. If not found → run fuzzy matcher against all owner's canonicals
 *   5. If fuzzy match ≥ 90% → link to that canonical
 *   6. Otherwise → create new canonical
 *
 * Returns the canonical ID and whether it was existing or newly created.
 */
export async function promoteDocToCanonical(
  ownerId:   string,
  docId:     string,
  docFields: {
    title?:              string;
    fileName?:           string;
    govFolder?:          string;
    lifecycleType?:      string;
    docYear?:            number | null;
    originalSourceUrl?:  string;
    sourceUrl?:          string;
    institutionName?:    string;
    sourceAuthority?:    string;
    constitutionalParts?: number[];
    tags?:               string[] | string;
    contentHash?:        string;
    updateFrequency?:    string;
  },
): Promise<PromoteResult> {
  const fp = computeFingerprint(docFields);

  // 1. Fast exact lookup by canonicalKey
  const existing = await findCanonicalByKey(ownerId, fp.canonicalKey);
  if (existing) {
    await linkInstanceToCanonical(
      existing.id,
      docId,
      docFields.fileName,
      docFields.originalSourceUrl ?? docFields.sourceUrl,
    );
    return { canonicalId: existing.id, wasExisting: true };
  }

  // 2. Load all canonicals for fuzzy matching
  const allCanonicals = await getCanonicals(ownerId);
  const fuzzyMatches = matchDocToCanonicals(
    { id: docId, contentHash: docFields.contentHash, ...docFields } as Parameters<typeof matchDocToCanonicals>[0],
    allCanonicals,
    90,
  );

  if (fuzzyMatches.length > 0) {
    const best = fuzzyMatches[0];
    await linkInstanceToCanonical(
      best.canonical.id,
      docId,
      docFields.fileName,
      docFields.originalSourceUrl ?? docFields.sourceUrl,
    );
    return { canonicalId: best.canonical.id, wasExisting: true, match: best };
  }

  // 3. Create new canonical
  const rawTags = docFields.tags;
  const tagsArray = Array.isArray(rawTags)
    ? rawTags
    : typeof rawTags === "string"
      ? rawTags.split(/[,;]+/).map(t => t.trim()).filter(Boolean)
      : [];

  const input: CanonicalPromotionInput = {
    ownerId,
    canonicalTitle:    docFields.title ?? docFields.fileName ?? docId,
    institutionId:     fp.institutionId,
    govFolder:         docFields.govFolder ?? "other",
    lifecycleType:     docFields.lifecycleType ?? "other",
    year:              fp.year,
    primarySourceUrl:  docFields.originalSourceUrl ?? docFields.sourceUrl ?? "",
    constitutionalParts: docFields.constitutionalParts ?? [],
    tags:              tagsArray,
    updateFrequency:   docFields.updateFrequency
                       ?? LIFECYCLE_UPDATE_FREQUENCY[docFields.lifecycleType ?? "other"]
                       ?? "rare",
    titleFingerprint:  fp.titleFp,
    instanceId:        docId,
    fileName:          docFields.fileName ?? "",
  };

  const newId = await createCanonical(input);
  return { canonicalId: newId, wasExisting: false };
}

// ── Set canonicalId on vault_intelligence_doc ─────────────────────────────────

/**
 * Write canonicalId back to the vault_intelligence_docs record.
 * Isolated here so canonicalRegistry doesn't depend on the giant firestore.ts.
 */
export async function setDocCanonicalId(docId: string, canonicalId: string): Promise<void> {
  await updateDoc(doc(db, "vault_intelligence_docs", docId), {
    canonicalId,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Full promote + link: promotes a doc to canonical AND sets canonicalId on the doc.
 * This is the single call the UI makes when founder approves promotion.
 */
export async function promoteAndLink(
  ownerId:   string,
  docId:     string,
  docFields: Parameters<typeof promoteDocToCanonical>[2],
): Promise<PromoteResult> {
  const result = await promoteDocToCanonical(ownerId, docId, docFields);
  await setDocCanonicalId(docId, result.canonicalId);
  return result;
}
