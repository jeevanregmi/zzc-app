/**
 * Vault Firestore Adapter
 *
 * Boundary: FIREBASE SDK ← here → domain hooks
 *
 * All functions take/return canonical domain types (lib/vault/types.ts).
 * Firebase SDK details (Timestamp, DocumentSnapshot, etc.) never leak
 * past this file. This keeps hooks and components free of SDK coupling.
 *
 * TECHNICAL DEBT RISK:
 *   Firestore real-time listeners (onSnapshot) are opened here but must
 *   be unsubscribed in the hook's useEffect cleanup. If a hook forgets
 *   to call the returned unsubscribe function, you leak memory + Firestore
 *   connections. Pattern: always return the unsubscribe fn, always call it.
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc, writeBatch,
  getDocs, onSnapshot, query, where, orderBy, limit, Timestamp,
  arrayUnion,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { VaultMedia, VaultFolder, VaultDocument } from "./types";
import type { IntelligenceDocument } from "../types/documents";
import type { SpiritualCharacter, SpiritualRelationship } from "../types/temple-vault";
import type { SacredText, ShlokaAtom } from "../types/sacred-text";
import type { SpiritualSuggestion, SuggestionStatus, SuggestionPayload } from "../types/spiritual-suggestions";
import type { QueueItem } from "../types/queue";
import type { SourceSignal, MonitoredSource, IntelligenceTopic } from "../types/signals";
import { writeAtomsForDoc } from "./atoms";

// ─── Collection names ────────────────────────────────────────────────────────

const COL_MEDIA           = "vault_media";
const COL_FOLDERS         = "vault_folders";
const COL_DOCUMENTS       = "vault_documents";
const COL_INTEL_DOCS      = "vault_intelligence_docs";
const COL_CONTENT_QUEUE   = "vault_content_queue";
const COL_SOURCE_SIGNALS  = "source_signals";
const COL_MONITORED_SRCS  = "monitored_sources";
const COL_INTEL_TOPICS    = "intelligence_topics";

// ─── Timestamp helpers ───────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }

// ─── VaultMedia ──────────────────────────────────────────────────────────────

export async function createMedia(data: Omit<VaultMedia, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, COL_MEDIA), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMedia(id: string, patch: Partial<VaultMedia>): Promise<void> {
  await updateDoc(doc(db, COL_MEDIA, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteMedia(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_MEDIA, id));
}

export function subscribeMedia(
  ownerId: string,
  folder: string | null,
  onChange: (items: VaultMedia[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  let q = query(
    collection(db, COL_MEDIA),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
  );
  if (folder) {
    q = query(
      collection(db, COL_MEDIA),
      where("ownerId", "==", ownerId),
      where("folder", "==", folder),
      orderBy("createdAt", "desc"),
    );
  }
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as VaultMedia;
    });
    onChange(items);
  }, err => { console.error("subscribeMedia:", err); onError?.(err); });
}

// ─── VaultFolder ─────────────────────────────────────────────────────────────

export async function createFolder(data: Omit<VaultFolder, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, COL_FOLDERS), {
    ...data,
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export async function deleteFolder(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_FOLDERS, id));
}

export function subscribeFolders(
  ownerId: string,
  onChange: (folders: VaultFolder[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_FOLDERS),
    where("ownerId", "==", ownerId),
    orderBy("path"),
  );
  return onSnapshot(q, snap => {
    const folders = snap.docs.map(d => ({
      ...d.data(),
      id:        d.id,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? now(),
    }) as VaultFolder);
    onChange(folders);
  }, err => { console.error("subscribeFolders:", err); onError?.(err); });
}

// ─── VaultDocument ───────────────────────────────────────────────────────────

export async function createDocument(data: Omit<VaultDocument, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const ref = await addDoc(collection(db, COL_DOCUMENTS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateDocument(id: string, patch: Partial<VaultDocument>): Promise<void> {
  await updateDoc(doc(db, COL_DOCUMENTS, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteDocument(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_DOCUMENTS, id));
}

export function subscribeDocuments(
  ownerId: string,
  onChange: (docs: VaultDocument[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_DOCUMENTS),
    where("ownerId", "==", ownerId),
    orderBy("updatedAt", "desc"),
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => ({
      ...d.data(),
      id:        d.id,
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? now(),
      updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? now(),
    }) as VaultDocument);
    onChange(docs);
  }, err => { console.error("subscribeDocuments:", err); onError?.(err); });
}

// ─── IntelligenceDocument ────────────────────────────────────────────────────

export async function createIntelligenceDoc(
  data: Omit<IntelligenceDocument, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_INTEL_DOCS), {
    ...data,
    uploadedAt: Timestamp.now(),
    updatedAt:  Timestamp.now(),
  });
  return ref.id;
}

export async function updateIntelligenceDoc(
  id: string,
  patch: Partial<IntelligenceDocument>,
): Promise<void> {
  await updateDoc(doc(db, COL_INTEL_DOCS, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteIntelligenceDoc(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_INTEL_DOCS, id));
}

/**
 * Patch only identity/classification fields on an existing intelligence doc.
 * Called by the QA Sprint "Link existing document" flow and the metadata
 * backfill tool. Never touches AI fields, processingStatus, or approval state.
 */
export async function patchDocumentIdentity(
  id: string,
  patch: {
    govFolder?:          string;
    lifecycleType?:      string;
    originalSourceUrl?:  string;
    institutionName?:    string;
    importanceLevel?:    string;
    tags?:               string[];
  },
): Promise<void> {
  // Strip undefined values so we don't accidentally null out existing fields
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== "") clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return;
  await updateDoc(doc(db, COL_INTEL_DOCS, id), { ...clean, updatedAt: Timestamp.now() });
}

// Admin approval gates — called from Admin Intelligence Vault only.
// These are the ONLY paths that set adminApprovalStatus.

export async function approveIntelligenceDocForQueue(id: string): Promise<void> {
  await updateDoc(doc(db, COL_INTEL_DOCS, id), {
    adminApprovalStatus: "approved",
    adminApprovedAt:     new Date().toISOString(),
    updatedAt:           Timestamp.now(),
  });
  // Harvest civic atoms — read the doc we just approved, then write atoms
  const snap = await getDoc(doc(db, COL_INTEL_DOCS, id));
  if (snap.exists()) {
    const data = snap.data();
    const intelligenceDoc: IntelligenceDocument = {
      ...data,
      id,
      uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() ?? now(),
      updatedAt:  data.updatedAt?.toDate?.()?.toISOString()  ?? now(),
    } as IntelligenceDocument;
    await writeAtomsForDoc(intelligenceDoc).catch(err =>
      console.error("atom harvest failed for", id, err)
    );
  }
}

export async function flagIntelligenceDocForRevision(
  id:    string,
  notes: string,
): Promise<void> {
  await updateDoc(doc(db, COL_INTEL_DOCS, id), {
    adminApprovalStatus: "needs_revision",
    adminApprovalNotes:  notes,
    updatedAt:           Timestamp.now(),
  });
}

export function subscribeIntelligenceDocs(
  ownerId: string,
  onChange: (docs: IntelligenceDocument[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_INTEL_DOCS),
    where("ownerId", "==", ownerId),
    orderBy("uploadedAt", "desc"),
  );
  return onSnapshot(q, snap => {
    const docs = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:         d.id,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt:  data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as IntelligenceDocument;
    });
    onChange(docs);
  }, err => { console.error("subscribeIntelligenceDocs:", err); onError?.(err); });
}

// ─── Content Queue ────────────────────────────────────────────────────────────

export async function getQueueItem(id: string): Promise<QueueItem | null> {
  const snap = await getDoc(doc(db, COL_CONTENT_QUEUE, id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    ...data,
    id:        snap.id,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
  } as QueueItem;
}

export async function createQueueItem(
  data: Omit<QueueItem, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_CONTENT_QUEUE), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateQueueItem(
  id: string,
  patch: Partial<QueueItem>,
): Promise<void> {
  await updateDoc(doc(db, COL_CONTENT_QUEUE, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteQueueItem(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_CONTENT_QUEUE, id));
}

export function subscribeQueueItems(
  ownerId: string,
  status: QueueItem["status"] | "all",
  onChange: (items: QueueItem[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = status === "all"
    ? query(
        collection(db, COL_CONTENT_QUEUE),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc"),
      )
    : query(
        collection(db, COL_CONTENT_QUEUE),
        where("ownerId", "==", ownerId),
        where("status",  "==", status),
        orderBy("createdAt", "desc"),
      );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as QueueItem;
    });
    onChange(items);
  }, err => { console.error("subscribeQueueItems:", err); onError?.(err); });
}

// ─── SourceSignal ─────────────────────────────────────────────────────────────

export async function createSourceSignal(
  data: Omit<SourceSignal, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_SOURCE_SIGNALS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateSourceSignal(
  id: string,
  patch: Partial<SourceSignal>,
): Promise<void> {
  await updateDoc(doc(db, COL_SOURCE_SIGNALS, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteSourceSignal(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_SOURCE_SIGNALS, id));
}

export function subscribeSourceSignals(
  ownerId: string,
  status: SourceSignal["status"] | "all",
  onChange: (items: SourceSignal[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = status === "all"
    ? query(
        collection(db, COL_SOURCE_SIGNALS),
        where("ownerId", "==", ownerId),
        orderBy("createdAt", "desc"),
      )
    : query(
        collection(db, COL_SOURCE_SIGNALS),
        where("ownerId", "==", ownerId),
        where("status",  "==", status),
        orderBy("createdAt", "desc"),
      );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as SourceSignal;
    });
    onChange(items);
  }, err => { console.error("subscribeSourceSignals:", err); onError?.(err); });
}

// ─── MonitoredSource ──────────────────────────────────────────────────────────

export async function createMonitoredSource(
  data: Omit<MonitoredSource, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_MONITORED_SRCS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateMonitoredSource(
  id: string,
  patch: Partial<MonitoredSource>,
): Promise<void> {
  await updateDoc(doc(db, COL_MONITORED_SRCS, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteMonitoredSource(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_MONITORED_SRCS, id));
}

export function subscribeMonitoredSources(
  ownerId: string,
  onChange: (items: MonitoredSource[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_MONITORED_SRCS),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as MonitoredSource;
    });
    onChange(items);
  }, err => { console.error("subscribeMonitoredSources:", err); onError?.(err); });
}

// ─── IntelligenceTopic ────────────────────────────────────────────────────────

export async function createIntelligenceTopic(
  data: Omit<IntelligenceTopic, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_INTEL_TOPICS), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateIntelligenceTopic(
  id: string,
  patch: Partial<IntelligenceTopic>,
): Promise<void> {
  await updateDoc(doc(db, COL_INTEL_TOPICS, id), { ...patch, updatedAt: Timestamp.now() });
}

export async function deleteIntelligenceTopic(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_INTEL_TOPICS, id));
}

export function subscribeIntelligenceTopics(
  ownerId: string,
  onChange: (items: IntelligenceTopic[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_INTEL_TOPICS),
    where("ownerId", "==", ownerId),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? now(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? now(),
      } as IntelligenceTopic;
    });
    onChange(items);
  }, err => { console.error("subscribeIntelligenceTopics:", err); onError?.(err); });
}

// ─── Market Rates (Public Data Control) ──────────────────────────────────────

const COL_MARKET_RATES = "market_rates";

export interface MarketRateDoc {
  id:         string;
  label:      string;
  value:      number;
  source:     string;
  sourceUrl:  string;
  updatedAt:  string;
  verified:   boolean;
  verifiedBy: string;
  verifiedAt: string;
  published:  boolean;
}

export async function setMarketRate(
  id: string,
  patch: Partial<Omit<MarketRateDoc, "id">>,
): Promise<void> {
  await updateDoc(doc(db, COL_MARKET_RATES, id), {
    ...patch,
    updatedAt: now(),
  });
}

export function subscribeMarketRates(
  onChange: (rates: MarketRateDoc[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(collection(db, COL_MARKET_RATES), snap => {
    const rates = snap.docs.map(d => ({
      ...(d.data() as Omit<MarketRateDoc, "id">),
      id:        d.id,
      verified:  d.data().verified  ?? false,
      published: d.data().published ?? false,
      source:    d.data().source    ?? "",
      sourceUrl: d.data().sourceUrl ?? "",
      verifiedBy: d.data().verifiedBy ?? "",
      verifiedAt: d.data().verifiedAt ?? "",
    } as MarketRateDoc));
    onChange(rates);
  }, err => { console.error("subscribeMarketRates:", err); onError?.(err); });
}

// ─── Structured Schemes (Public scheme catalogue) ─────────────────────────────

const COL_STRUCTURED_SCHEMES = "structuredSchemes";

export interface StructuredScheme {
  id:               string;
  title:            string;
  titleNepali:      string;
  organization:     string;
  category:         string;
  subcategory:      string;
  summary:          string;
  nepaliSummary:    string;
  interestRate:     number | null;
  annualReturn:     number | null;
  riskLevel:        string;
  liquidity:        string;
  benefits:         string[];
  eligibility:      string[];
  documents:        string[];
  compareTags:      string[];
  loanLimit:        string | null;
  retirementSupport: boolean;
  medicalCoverage:  boolean;
  hasInsurance:     boolean;
  calculatorEnabled: boolean;
  sourceUrl:        string;
  verified:         boolean;
  verifiedBy:       string;
  verifiedAt:       string;
  published:        boolean;
  createdAt:        string;
  updatedAt:        string;
}

export async function upsertStructuredScheme(
  id: string,
  data: Partial<Omit<StructuredScheme, "id">>,
): Promise<void> {
  await setDoc(doc(db, COL_STRUCTURED_SCHEMES, id), {
    ...data,
    updatedAt: now(),
  }, { merge: true });
}

export async function deleteStructuredScheme(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_STRUCTURED_SCHEMES, id));
}

export function subscribeStructuredSchemes(
  onChange: (schemes: StructuredScheme[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL_STRUCTURED_SCHEMES), orderBy("updatedAt", "desc")),
    snap => {
      const schemes = snap.docs.map(d => {
        const data = d.data();
        return {
          id:               d.id,
          title:            data.title            ?? "",
          titleNepali:      data.titleNepali      ?? "",
          organization:     data.organization     ?? "",
          category:         data.category         ?? "",
          subcategory:      data.subcategory       ?? "",
          summary:          data.summary           ?? "",
          nepaliSummary:    data.nepaliSummary     ?? "",
          interestRate:     data.interestRate      ?? null,
          annualReturn:     data.annualReturn      ?? null,
          riskLevel:        data.riskLevel         ?? "",
          liquidity:        data.liquidity         ?? "",
          benefits:         data.benefits          ?? [],
          eligibility:      data.eligibility       ?? [],
          documents:        data.documents         ?? [],
          compareTags:      data.compareTags       ?? [],
          loanLimit:        data.loanLimit         ?? null,
          retirementSupport: data.retirementSupport ?? false,
          medicalCoverage:  data.medicalCoverage   ?? false,
          hasInsurance:     data.hasInsurance      ?? false,
          calculatorEnabled: data.calculatorEnabled ?? false,
          sourceUrl:        data.sourceUrl         ?? "",
          verified:         data.verified          ?? false,
          verifiedBy:       data.verifiedBy        ?? "",
          verifiedAt:       data.verifiedAt        ?? "",
          published:        data.published         ?? false,
          createdAt:        data.createdAt         ?? now(),
          updatedAt:        data.updatedAt         ?? now(),
        } as StructuredScheme;
      });
      onChange(schemes);
    },
    err => { console.error("subscribeStructuredSchemes:", err); onError?.(err); },
  );
}

// ─── Signal Routes (admin-configurable routing rules) ─────────────────────────

import type { SignalRoute, MarketRateSuggestion, SchemeSuggestion } from "../types/routing";
import type { PageModule } from "../types/modules";

const COL_SIGNAL_ROUTES        = "signal_routes";
const COL_MARKET_RATE_SUGGESTS = "market_rate_suggestions";
const COL_SCHEME_SUGGESTS      = "scheme_suggestions";
const COL_PAGE_MODULES         = "page_modules";

export async function upsertSignalRoute(
  id: string,
  data: Partial<Omit<SignalRoute, "id">>,
): Promise<void> {
  await setDoc(doc(db, COL_SIGNAL_ROUTES, id), {
    ...data,
    updatedAt: now(),
  }, { merge: true });
}

export async function createSignalRoute(
  data: Omit<SignalRoute, "id" | "createdAt" | "updatedAt" | "matchCount">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_SIGNAL_ROUTES), {
    ...data,
    matchCount: 0,
    createdAt:  now(),
    updatedAt:  now(),
  });
  return ref.id;
}

export async function deleteSignalRoute(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_SIGNAL_ROUTES, id));
}

export function subscribeSignalRoutes(
  onChange: (routes: SignalRoute[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL_SIGNAL_ROUTES), orderBy("createdAt", "desc")),
    snap => {
      const routes = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id:         d.id,
          matchCount: data.matchCount ?? 0,
          active:     data.active     ?? false,
        } as SignalRoute;
      });
      onChange(routes);
    },
    err => { console.error("subscribeSignalRoutes:", err); onError?.(err); },
  );
}

export async function incrementRouteMatchCount(id: string): Promise<void> {
  const { increment } = await import("firebase/firestore");
  await updateDoc(doc(db, COL_SIGNAL_ROUTES, id), {
    lastMatchAt: now(),
    matchCount:  increment(1),
  });
}

// ─── Market Rate Suggestions ──────────────────────────────────────────────────

export async function createMarketRateSuggestion(
  data: Omit<MarketRateSuggestion, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_MARKET_RATE_SUGGESTS), {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

export function subscribeMarketRateSuggestions(
  onChange: (items: MarketRateSuggestion[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL_MARKET_RATE_SUGGESTS), orderBy("createdAt", "desc")),
    snap => {
      const items = snap.docs.map(d => ({
        ...(d.data() as Omit<MarketRateSuggestion, "id">),
        id: d.id,
      } as MarketRateSuggestion));
      onChange(items);
    },
    err => { console.error("subscribeMarketRateSuggestions:", err); onError?.(err); },
  );
}

// ─── Scheme Suggestions ───────────────────────────────────────────────────────

export async function createSchemeSuggestion(
  data: Omit<SchemeSuggestion, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_SCHEME_SUGGESTS), {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

// ─── Page Modules ─────────────────────────────────────────────────────────────

export async function upsertPageModule(
  id: string,
  data: Partial<Omit<PageModule, "id">>,
): Promise<void> {
  await setDoc(doc(db, COL_PAGE_MODULES, id), {
    ...data,
    updatedAt: now(),
  }, { merge: true });
}

export async function createPageModule(
  data: Omit<PageModule, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_PAGE_MODULES), {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

export async function deletePageModule(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_PAGE_MODULES, id));
}

export function subscribePageModules(
  page: string | null,
  onChange: (modules: PageModule[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = page
    ? query(
        collection(db, COL_PAGE_MODULES),
        where("page",  "==", page),
        orderBy("order", "asc"),
      )
    : query(
        collection(db, COL_PAGE_MODULES),
        orderBy("order", "asc"),
      );

  return onSnapshot(q, snap => {
    const modules = snap.docs.map(d => ({
      ...(d.data() as Omit<PageModule, "id">),
      id: d.id,
    } as PageModule));
    onChange(modules);
  }, err => { console.error("subscribePageModules:", err); onError?.(err); });
}

export function subscribePublishedPageModules(
  page: string,
  onChange: (modules: PageModule[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_PAGE_MODULES),
    where("page",          "==", page),
    where("publishStatus", "==", "published"),
    where("hidden",        "==", false),
    orderBy("order", "asc"),
  );
  return onSnapshot(q, snap => {
    const modules = snap.docs.map(d => ({
      ...(d.data() as Omit<PageModule, "id">),
      id: d.id,
    } as PageModule));
    onChange(modules);
  }, err => { console.error("subscribePublishedPageModules:", err); onError?.(err); });
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTENT PIPELINE COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

import type { NormalizedContent, AIEnrichment, Publication, AuditLog } from "../types/pipeline";
import type { Job } from "../types/jobs";
import type { FinancialEntity } from "../types/entities";

const COL_NORMALIZED   = "normalized_content";
const COL_ENRICHMENTS  = "ai_enrichments";
const COL_PUBLICATIONS = "publications";
const COL_JOBS         = "jobs";
const COL_AUDIT_LOGS   = "audit_logs";
const COL_ENTITIES     = "entities";

// ─── NormalizedContent ────────────────────────────────────────────────────────

export async function createNormalizedContent(
  data: Omit<NormalizedContent, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_NORMALIZED), {
    ...data,
    normalizedAt: now(),
    updatedAt:    now(),
  });
  return ref.id;
}

export async function updateNormalizedContent(
  id: string,
  patch: Partial<NormalizedContent>,
): Promise<void> {
  await updateDoc(doc(db, COL_NORMALIZED, id), { ...patch, updatedAt: now() });
}

export function subscribeNormalizedContent(
  opts: { limit?: number; enrichmentStatus?: string } = {},
  onChange: (items: NormalizedContent[]) => void,
): Unsubscribe {
  let q = opts.enrichmentStatus
    ? query(
        collection(db, COL_NORMALIZED),
        where("enrichmentStatus", "==", opts.enrichmentStatus),
        orderBy("normalizedAt", "desc"),
      )
    : query(
        collection(db, COL_NORMALIZED),
        orderBy("normalizedAt", "desc"),
      );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({
      ...(d.data() as Omit<NormalizedContent, "id">),
      id: d.id,
    } as NormalizedContent));
    onChange(opts.limit ? items.slice(0, opts.limit) : items);
  });
}

// ─── AIEnrichment ────────────────────────────────────────────────────────────

export async function createAIEnrichment(
  data: Omit<AIEnrichment, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_ENRICHMENTS), {
    ...data,
    enrichedAt: now(),
    updatedAt:  now(),
  });
  return ref.id;
}

export async function updateAIEnrichment(
  id: string,
  patch: Partial<AIEnrichment>,
): Promise<void> {
  await updateDoc(doc(db, COL_ENRICHMENTS, id), { ...patch, updatedAt: now() });
}

export function subscribeAIEnrichments(
  opts: { normalizedContentId?: string; limit?: number } = {},
  onChange: (items: AIEnrichment[]) => void,
): Unsubscribe {
  const q = opts.normalizedContentId
    ? query(
        collection(db, COL_ENRICHMENTS),
        where("normalizedContentId", "==", opts.normalizedContentId),
        orderBy("enrichedAt", "desc"),
      )
    : query(
        collection(db, COL_ENRICHMENTS),
        orderBy("enrichedAt", "desc"),
      );

  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({
      ...(d.data() as Omit<AIEnrichment, "id">),
      id: d.id,
    } as AIEnrichment));
    onChange(opts.limit ? items.slice(0, opts.limit) : items);
  });
}

// ─── Publications ─────────────────────────────────────────────────────────────

export async function createPublication(
  data: Omit<Publication, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_PUBLICATIONS), {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

export async function updatePublication(
  id: string,
  patch: Partial<Publication>,
): Promise<void> {
  await updateDoc(doc(db, COL_PUBLICATIONS, id), { ...patch, updatedAt: now() });
}

export function subscribePublications(
  opts: { publishStatus?: string; surface?: string; limit?: number } = {},
  onChange: (items: Publication[]) => void,
): Unsubscribe {
  let q = opts.publishStatus
    ? query(
        collection(db, COL_PUBLICATIONS),
        where("publishStatus", "==", opts.publishStatus),
        orderBy("createdAt", "desc"),
      )
    : query(
        collection(db, COL_PUBLICATIONS),
        orderBy("createdAt", "desc"),
      );

  return onSnapshot(q, snap => {
    let items = snap.docs.map(d => ({
      ...(d.data() as Omit<Publication, "id">),
      id: d.id,
    } as Publication));
    if (opts.surface) items = items.filter(p => p.surfaces.includes(opts.surface as Publication["surfaces"][number]));
    onChange(opts.limit ? items.slice(0, opts.limit) : items);
  });
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(
  data: Omit<Job, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  // Idempotency check: if idempotencyKey is set, don't create duplicate
  if (data.idempotencyKey) {
    const existing = await import("firebase/firestore").then(({ getDocs, query: q2, where: w }) =>
      getDocs(q2(collection(db, COL_JOBS), w("idempotencyKey", "==", data.idempotencyKey), w("status", "in", ["pending", "claimed"]))),
    );
    if (!existing.empty) return existing.docs[0].id;
  }

  const ref = await addDoc(collection(db, COL_JOBS), {
    ...data,
    createdAt: now(),
    updatedAt: now(),
  });
  return ref.id;
}

export async function updateJob(
  id: string,
  patch: Partial<Job>,
): Promise<void> {
  await updateDoc(doc(db, COL_JOBS, id), { ...patch, updatedAt: now() });
}

export function subscribeJobs(
  opts: { status?: Job["status"]; type?: Job["type"]; limit?: number } = {},
  onChange: (jobs: Job[]) => void,
): Unsubscribe {
  const q = opts.status
    ? query(
        collection(db, COL_JOBS),
        where("status", "==", opts.status),
        orderBy("createdAt", "desc"),
      )
    : query(
        collection(db, COL_JOBS),
        orderBy("createdAt", "desc"),
      );

  return onSnapshot(q, snap => {
    let jobs = snap.docs.map(d => ({
      ...(d.data() as Omit<Job, "id">),
      id: d.id,
    } as Job));
    if (opts.type) jobs = jobs.filter(j => j.type === opts.type);
    onChange(opts.limit ? jobs.slice(0, opts.limit) : jobs);
  });
}

// ─── Audit Logs (append-only) ─────────────────────────────────────────────────

export async function writeAuditLog(
  data: Omit<AuditLog, "id">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_AUDIT_LOGS), {
    ...data,
    occurredAt: data.occurredAt ?? now(),
  });
  return ref.id;
}

export function subscribeAuditLogs(
  opts: { entityId?: string; limit?: number } = {},
  onChange: (logs: AuditLog[]) => void,
): Unsubscribe {
  const q = opts.entityId
    ? query(
        collection(db, COL_AUDIT_LOGS),
        where("entityId", "==", opts.entityId),
        orderBy("occurredAt", "desc"),
      )
    : query(
        collection(db, COL_AUDIT_LOGS),
        orderBy("occurredAt", "desc"),
      );

  return onSnapshot(q, snap => {
    const logs = snap.docs.map(d => ({
      ...(d.data() as Omit<AuditLog, "id">),
      id: d.id,
    } as AuditLog));
    onChange(opts.limit ? logs.slice(0, opts.limit) : logs);
  });
}

// ─── Entities ────────────────────────────────────────────────────────────────

export async function upsertEntity(
  id: string,
  data: Partial<Omit<FinancialEntity, "id">>,
): Promise<void> {
  await setDoc(doc(db, COL_ENTITIES, id), {
    ...data,
    updatedAt: now(),
  }, { merge: true });
}

export function subscribeEntities(
  onChange: (entities: FinancialEntity[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(db, COL_ENTITIES), orderBy("name", "asc")),
    snap => {
      const entities = snap.docs.map(d => ({
        ...(d.data() as Omit<FinancialEntity, "id">),
        id: d.id,
      } as FinancialEntity));
      onChange(entities);
    },
  );
}

// ─── Revenue: Recommendation Clicks ──────────────────────────────────────────

import type { RecommendationClick, AudienceLead } from "../types/revenue";

const COL_REC_CLICKS  = "recommendation_clicks";
const COL_AUDIENCE_LEADS = "audience_leads";

export async function createRecommendationClick(
  data: Omit<RecommendationClick, "id">,
): Promise<void> {
  await addDoc(collection(db, COL_REC_CLICKS), {
    ...data,
    timestamp: data.timestamp ?? now(),
  });
}

export function subscribeRecommendationClicks(
  opts: { limit?: number } = {},
  onChange: (clicks: RecommendationClick[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_REC_CLICKS),
    orderBy("timestamp", "desc"),
  );
  return onSnapshot(q, snap => {
    const clicks = snap.docs.map(d => ({
      ...(d.data() as Omit<RecommendationClick, "id">),
      id: d.id,
    } as RecommendationClick));
    onChange(opts.limit ? clicks.slice(0, opts.limit) : clicks);
  });
}

// ─── Revenue: Audience Leads ──────────────────────────────────────────────────

export async function createAudienceLead(
  email: string,
  source: string,
): Promise<void> {
  await addDoc(collection(db, COL_AUDIENCE_LEADS), {
    email,
    source,
    createdAt: now(),
  });
}

export function subscribeAudienceLeads(
  opts: { limit?: number } = {},
  onChange: (leads: AudienceLead[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, COL_AUDIENCE_LEADS),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, snap => {
    const leads = snap.docs.map(d => ({
      ...(d.data() as Omit<AudienceLead, "id">),
      id: d.id,
    } as AudienceLead));
    onChange(opts.limit ? leads.slice(0, opts.limit) : leads);
  });
}


// ─── Spiritual Characters ─────────────────────────────────────────────────────

const COL_SPIRITUAL_CHARS = "spiritual_characters";
const COL_SPIRITUAL_RELS  = "spiritual_relationships";

export async function upsertSpiritualCharacter(
  character: Omit<SpiritualCharacter, "createdAt" | "updatedAt"> & { id: string },
): Promise<void> {
  const { id, ...data } = character;
  const ref = doc(db, COL_SPIRITUAL_CHARS, id);
  const snap = await getDoc(ref);
  const now = Timestamp.now();
  if (snap.exists()) {
    await updateDoc(ref, { ...data, updatedAt: now.toDate().toISOString() });
  } else {
    await setDoc(ref, { ...data, createdAt: now.toDate().toISOString(), updatedAt: now.toDate().toISOString() });
  }
}

export async function updateSpiritualCharacter(
  id: string,
  patch: Partial<SpiritualCharacter>,
): Promise<void> {
  await updateDoc(doc(db, COL_SPIRITUAL_CHARS, id), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function getSpiritualCharacters(ownerId: string): Promise<(SpiritualCharacter & { id: string })[]> {
  const snap = await getDocs(query(
    collection(db, COL_SPIRITUAL_CHARS),
    where("ownerId", "==", ownerId),
    limit(50),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SpiritualCharacter & { id: string }));
}

export async function getSpiritualRelationships(
  ownerId: string,
  characterId?: string,
): Promise<(SpiritualRelationship & { id: string })[]> {
  const constraints = [where("ownerId", "==", ownerId), limit(200)] as const;
  const snap = await getDocs(query(collection(db, COL_SPIRITUAL_RELS), ...constraints));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpiritualRelationship & { id: string }));
  if (!characterId) return all;
  return all.filter(r => r.fromId === characterId || r.toId === characterId);
}

export async function upsertSpiritualRelationship(
  rel: Omit<SpiritualRelationship, "createdAt"> & { id: string },
): Promise<void> {
  const { id, ...data } = rel;
  await setDoc(doc(db, COL_SPIRITUAL_RELS, id), {
    ...data,
    createdAt: new Date().toISOString(),
  });
}

// ─── Sacred Text Intake ──────────────────────────────────────────────────────
// Phase 1: store uploaded sacred texts in the temple vault.
// Phase 2+: shloka atom extraction + character graph enrichment.

const COL_SACRED_TEXTS  = "sacred_texts";
const COL_SHLOKA_ATOMS  = "shloka_atoms";

export async function addSacredText(
  text: Omit<SacredText, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const ts = now();
  const ref = await addDoc(collection(db, COL_SACRED_TEXTS), {
    ...text,
    createdAt: ts,
    updatedAt: ts,
  });
  return ref.id;
}

export async function updateSacredText(id: string, patch: Partial<SacredText>): Promise<void> {
  await updateDoc(doc(db, COL_SACRED_TEXTS, id), { ...patch, updatedAt: now() });
}

export async function getSacredTexts(
  ownerId: string,
): Promise<(SacredText & { id: string })[]> {
  const snap = await getDocs(query(
    collection(db, COL_SACRED_TEXTS),
    where("ownerId", "==", ownerId),
    limit(200),
  ));
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SacredText & { id: string }));
}

export async function deleteSacredText(id: string): Promise<void> {
  await deleteDoc(doc(db, COL_SACRED_TEXTS, id));
}

export async function addShlokaAtom(
  atom: Omit<ShlokaAtom, "id" | "createdAt">,
): Promise<string> {
  const ref = await addDoc(collection(db, COL_SHLOKA_ATOMS), {
    ...atom,
    createdAt: now(),
  });
  return ref.id;
}

export async function getShlokaAtoms(
  ownerId: string,
  sourceTextId?: string,
): Promise<(ShlokaAtom & { id: string })[]> {
  const snap = await getDocs(query(
    collection(db, COL_SHLOKA_ATOMS),
    where("ownerId", "==", ownerId),
    limit(500),
  ));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as ShlokaAtom & { id: string }));
  if (!sourceTextId) return all;
  return all.filter(a => a.sourceTextId === sourceTextId);
}

// ─── Spiritual Recommendation Queue ─────────────────────────────────────────
// AI suggestions flow: analyze text → create suggestions → founder reviews →
// approved suggestions update the intelligence graph.

const COL_SPIRITUAL_SUGGESTIONS = "spiritual_suggestions";

export async function createSpiritualSuggestions(
  suggestions: Omit<SpiritualSuggestion, "id" | "createdAt" | "reviewedAt">[],
): Promise<void> {
  const ts = now();
  await Promise.all(
    suggestions.map(s =>
      addDoc(collection(db, COL_SPIRITUAL_SUGGESTIONS), { ...s, createdAt: ts }),
    ),
  );
}

export async function getSpiritualSuggestions(
  ownerId: string,
  sourceTextId?: string,
): Promise<(SpiritualSuggestion & { id: string })[]> {
  const snap = await getDocs(query(
    collection(db, COL_SPIRITUAL_SUGGESTIONS),
    where("ownerId", "==", ownerId),
    limit(500),
  ));
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as SpiritualSuggestion & { id: string }));
  if (!sourceTextId) return all;
  return all.filter(s => s.sourceTextId === sourceTextId);
}

export async function updateSuggestionStatus(
  id: string,
  status: SuggestionStatus,
  opts?: { founderNote?: string; editedPayload?: SuggestionPayload },
): Promise<void> {
  await updateDoc(doc(db, COL_SPIRITUAL_SUGGESTIONS, id), {
    status,
    founderNote:   opts?.founderNote   ?? null,
    editedPayload: opts?.editedPayload ?? null,
    reviewedAt:    now(),
  });
}

// Append values to an array field on a SpiritualCharacter atomically.
// Used when a character_enrichment suggestion is approved.
export async function enrichSpiritualCharacter(
  characterId: string,
  field: string,
  values: string[],
): Promise<void> {
  await updateDoc(doc(db, COL_SPIRITUAL_CHARS, characterId), {
    [field]:    arrayUnion(...values),
    updatedAt:  now(),
  } as Record<string, unknown>);
}

// ─── Universal Recommendation Queue ──────────────────────────────────────────

import type { UniversalRecommendation, RecommendationTarget, RecommendationStatus } from "../types/recommendations";

const COL_REC_QUEUE = "recommendation_queue";

/**
 * Persist recommendations to Firestore using deterministic IDs.
 * Only writes recs whose IDs are not already in the pending set passed by caller
 * (caller calls getPendingRecommendations first, then filters).
 * Batched in groups of 499 to respect Firestore write limits.
 */
export async function saveRecommendations(recs: UniversalRecommendation[]): Promise<void> {
  if (recs.length === 0) return;
  const CHUNK = 499;
  for (let i = 0; i < recs.length; i += CHUNK) {
    const batch = writeBatch(db);
    recs.slice(i, i + CHUNK).forEach(rec => {
      batch.set(doc(db, COL_REC_QUEUE, rec.id), rec);
    });
    await batch.commit();
  }
}

/**
 * Fetch all pending recommendations for the owner.
 * Optional targetType filter narrows to a single object class.
 */
export async function getPendingRecommendations(
  ownerId:     string,
  targetType?: RecommendationTarget,
): Promise<UniversalRecommendation[]> {
  const snap = await getDocs(query(
    collection(db, COL_REC_QUEUE),
    where("ownerId",  "==", ownerId),
    where("status",   "==", "pending"),
    limit(500),
  ));
  const all = snap.docs.map(d => ({ ...d.data(), id: d.id } as UniversalRecommendation));
  return targetType ? all.filter(r => r.targetType === targetType) : all;
}

/**
 * Mark a recommendation as approved / rejected / snoozed.
 * Does NOT apply the patch — caller is responsible for patching the target object.
 */
export async function reviewRecommendation(
  id:     string,
  status: RecommendationStatus,
  note?:  string,
): Promise<void> {
  const patch: Record<string, unknown> = { status, reviewedAt: now() };
  if (note) patch.reviewNote = note;
  await updateDoc(doc(db, COL_REC_QUEUE, id), patch);
}
