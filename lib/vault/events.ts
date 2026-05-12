/**
 * Domain Event Emitter — Firestore adapter for the event bus.
 *
 * Writes events to the "domain_events" Firestore collection.
 * Workers and Cloudflare Functions read and process these.
 *
 * Security: Firestore rules must allow ownerId-scoped writes to domain_events.
 * Add to firestore.rules:
 *   match /domain_events/{docId} {
 *     allow create: if isCreatingAsOwner();
 *     allow read:   if isOwner(resource.data.ownerId);
 *     allow update, delete: if false;  // append-only
 *   }
 */

import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../app/firebase";
import type { DomainEventType, EventEmitter } from "../types/events";

export const firestoreEventEmitter: EventEmitter = {
  async emit<T extends Record<string, unknown>>(
    ownerId:   string,
    eventType: DomainEventType,
    payload:   T,
  ): Promise<string> {
    const ref = await addDoc(collection(db, "domain_events"), {
      eventType,
      ownerId,
      occurredAt:         Timestamp.now(),
      status:             "pending",
      processingAttempts: 0,
      errorMessage:       "",
      payload,
      processedAt:        "",
    });
    return ref.id;
  },
};
