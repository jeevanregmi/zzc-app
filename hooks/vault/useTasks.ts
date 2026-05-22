"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, Timestamp,
} from "firebase/firestore";
import { db } from "../../app/firebase";

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory  = "content" | "tech" | "business" | "legal" | "marketing" | "operations";
export type TaskStatus    = "todo" | "in_progress" | "done";

export interface VaultTask {
  id:          string;
  title:       string;
  notes?:      string;
  priority:    TaskPriority;
  category:    TaskCategory;
  status:      TaskStatus;
  dueDate?:    string;  // ISO date string YYYY-MM-DD
  ownerId:     string;
  createdAt:   string;
  completedAt?: string;
}

function isoFromTs(ts: unknown): string {
  if (!ts) return new Date().toISOString();
  if (typeof (ts as { toDate?: () => Date }).toDate === "function")
    return ((ts as { toDate: () => Date }).toDate()).toISOString();
  return String(ts);
}

export function useTasks(ownerId: string | null) {
  const [tasks,   setTasks]   = useState<VaultTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ownerId) { setTasks([]); setLoading(false); return; }
    const q = query(
      collection(db, "vault_tasks"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc"),
    );
    const unsub = onSnapshot(q, snap => {
      setTasks(snap.docs.map(d => {
        const data = d.data();
        return {
          id:           d.id,
          title:        String(data.title ?? ""),
          notes:        data.notes ? String(data.notes) : undefined,
          priority:     (data.priority ?? "medium") as TaskPriority,
          category:     (data.category ?? "operations") as TaskCategory,
          status:       (data.status ?? "todo") as TaskStatus,
          dueDate:      data.dueDate ? String(data.dueDate) : undefined,
          ownerId:      String(data.ownerId),
          createdAt:    isoFromTs(data.createdAt),
          completedAt:  data.completedAt ? isoFromTs(data.completedAt) : undefined,
        };
      }));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [ownerId]);

  async function add(data: Omit<VaultTask, "id" | "createdAt" | "ownerId">): Promise<string> {
    if (!ownerId) return "";
    const ref = await addDoc(collection(db, "vault_tasks"), {
      ...data,
      ownerId,
      createdAt: Timestamp.now(),
    });
    return ref.id;
  }

  async function update(id: string, patch: Partial<VaultTask>): Promise<void> {
    await updateDoc(doc(db, "vault_tasks", id), {
      ...patch,
      updatedAt: Timestamp.now(),
    });
  }

  async function complete(id: string): Promise<void> {
    await updateDoc(doc(db, "vault_tasks", id), {
      status:      "done",
      completedAt: Timestamp.now(),
      updatedAt:   Timestamp.now(),
    });
  }

  async function reopen(id: string): Promise<void> {
    await updateDoc(doc(db, "vault_tasks", id), {
      status:      "todo",
      completedAt: null,
      updatedAt:   Timestamp.now(),
    });
  }

  async function remove(id: string): Promise<void> {
    await deleteDoc(doc(db, "vault_tasks", id));
  }

  const todo        = useMemo(() => tasks.filter(t => t.status === "todo"),        [tasks]);
  const in_progress = useMemo(() => tasks.filter(t => t.status === "in_progress"), [tasks]);
  const done        = useMemo(() => tasks.filter(t => t.status === "done"),        [tasks]);

  const overdue = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== "done");
  }, [tasks]);

  return { tasks, loading, todo, in_progress, done, overdue, add, update, complete, reopen, remove };
}
