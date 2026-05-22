/**
 * Business Intelligence Firestore Adapter
 *
 * Boundary: FIREBASE SDK ← here → domain hooks
 *
 * Covers all 8 business collections. All functions return canonical BI types.
 * Firestore Timestamps are converted to ISO strings at this boundary.
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../app/firebase";
import type {
  RevenueEntry, ExpenseEntry, AICostEntry,
  YouTubeSnapshot, PlayStoreSnapshot, AnalyticsSnapshot,
  ContentEntry, AffiliateEntry, BusinessGoal, Subscription,
} from "./types";
import type { ApprovalQueueItem } from "../types/economics";

// ─── Collection names ────────────────────────────────────────────────────────

const C = {
  REVENUE:        "business_revenue",
  EXPENSES:       "business_expenses",
  AI_COSTS:       "business_ai_costs",
  YOUTUBE:        "business_youtube",
  PLAYSTORE:      "business_playstore",
  ANALYTICS:      "business_analytics",
  CONTENT:        "business_content",
  AFFILIATES:     "business_affiliates",
  GOALS:          "business_goals",
  SUBSCRIPTIONS:  "business_subscriptions",
  APPROVAL_QUEUE: "vault_approval_queue",
} as const;

// ─── Timestamp helper ────────────────────────────────────────────────────────

function iso(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function") {
    return ((ts as { toDate: () => Date }).toDate()).toISOString();
  }
  return String(ts);
}

function toDoc<T extends { id: string }>(d: { id: string; data: () => Record<string, unknown> }): T {
  const data = d.data();
  const result: Record<string, unknown> = {
    ...data,
    id:        d.id,
    createdAt: iso(data.createdAt),
  };
  if (data.updatedAt)  result.updatedAt  = iso(data.updatedAt);
  if (data.recordedAt) result.recordedAt = iso(data.recordedAt);
  return result as unknown as T;
}

// ─── Generic CRUD factory ────────────────────────────────────────────────────

function makeAdapter<T extends { id: string }>(colName: string) {
  return {
    async add(ownerId: string, data: Omit<T, "id" | "createdAt">): Promise<string> {
      const ref = await addDoc(collection(db, colName), {
        ...data,
        ownerId,
        createdAt: Timestamp.now(),
      });
      return ref.id;
    },

    async update(id: string, patch: Partial<T>): Promise<void> {
      await updateDoc(doc(db, colName, id), {
        ...patch,
        updatedAt: Timestamp.now(),
      });
    },

    async remove(id: string): Promise<void> {
      await deleteDoc(doc(db, colName, id));
    },

    subscribe(
      ownerId: string,
      sortField: string,
      onChange: (items: T[]) => void,
    ): Unsubscribe {
      const q = query(
        collection(db, colName),
        where("ownerId", "==", ownerId),
        orderBy(sortField, "desc"),
      );
      return onSnapshot(q, snap => {
        onChange(snap.docs.map(d => toDoc<T>(d as Parameters<typeof toDoc>[0])));
      });
    },
  };
}

// ─── Collection adapters ─────────────────────────────────────────────────────

export const revenueAdapter      = makeAdapter<RevenueEntry>(C.REVENUE);
export const expenseAdapter      = makeAdapter<ExpenseEntry>(C.EXPENSES);
export const aiCostAdapter       = makeAdapter<AICostEntry>(C.AI_COSTS);
export const youtubeAdapter      = makeAdapter<YouTubeSnapshot>(C.YOUTUBE);
export const playstoreAdapter    = makeAdapter<PlayStoreSnapshot>(C.PLAYSTORE);
export const analyticsAdapter    = makeAdapter<AnalyticsSnapshot>(C.ANALYTICS);
export const contentAdapter      = makeAdapter<ContentEntry>(C.CONTENT);
export const affiliateAdapter    = makeAdapter<AffiliateEntry>(C.AFFILIATES);
export const goalAdapter         = makeAdapter<BusinessGoal>(C.GOALS);
export const subscriptionAdapter  = makeAdapter<Subscription>(C.SUBSCRIPTIONS);
export const approvalAdapter      = makeAdapter<ApprovalQueueItem>(C.APPROVAL_QUEUE);
