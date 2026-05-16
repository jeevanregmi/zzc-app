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
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc, setDoc,
  onSnapshot, query, where, orderBy, Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type { VaultMedia, VaultFolder, VaultDocument } from "./types";
import type { IntelligenceDocument } from "../types/documents";
import type { QueueItem } from "../types/queue";
import type { SourceSignal, MonitoredSource, IntelligenceTopic } from "../types/signals";

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
  });
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
  });
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
  });
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

// Admin approval gates — called from Admin Intelligence Vault only.
// These are the ONLY paths that set adminApprovalStatus.

export async function approveIntelligenceDocForQueue(id: string): Promise<void> {
  await updateDoc(doc(db, COL_INTEL_DOCS, id), {
    adminApprovalStatus: "approved",
    adminApprovedAt:     new Date().toISOString(),
    updatedAt:           Timestamp.now(),
  });
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
  });
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
  });
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
  });
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
  });
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
  });
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
  });
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
  });
}

export function subscribePublishedPageModules(
  page: string,
  onChange: (modules: PageModule[]) => void,
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
  });
}
