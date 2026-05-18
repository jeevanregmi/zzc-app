"use client";

import { useState, useEffect, useRef } from "react";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { storage } from "../../app/firebase";

export type ProbeStatus = "idle" | "running" | "ok" | "error";

export interface StorageProbeResult {
  status:    ProbeStatus;
  error:     string | null;
  runProbe:  () => void;
}

function storageErrorMessage(err: unknown): string {
  const e    = err as { code?: string; serverResponse?: string; message?: string };
  const code = e.code;

  // Log full details so the browser console has the exact server response.
  console.error("[storage-probe] failed", {
    code,
    message:        e.message,
    serverResponse: e.serverResponse ?? "(none)",
  });

  if (code === "storage/unauthorized")
    return "Access denied (403). Two likely causes: (1) Storage rules not deployed — run: firebase deploy --only storage --project zeneration-z-chautari or (2) Anonymous Auth not enabled in Firebase console → Authentication → Sign-in providers → Anonymous.";
  if (code === "storage/retry-limit-exceeded")
    return "Firebase Storage is not reachable. Most likely cause: Storage has not been activated on this Firebase project. Fix: go to the Firebase console → Storage → click 'Get Started', choose a region, then run: firebase deploy --only storage --project zeneration-z-chautari";
  if (code === "storage/quota-exceeded")
    return "Firebase Storage quota exceeded. Check your Firebase console billing.";
  if (code === "storage/canceled")
    return "Storage probe was cancelled.";
  return `Storage error: ${code ?? String(err)}`;
}

export function useStorageProbe(uid: string | null): StorageProbeResult {
  const [status, setStatus] = useState<ProbeStatus>("idle");
  const [error,  setError]  = useState<string | null>(null);
  const runRef = useRef(false);

  const runProbe = async () => {
    if (!uid) {
      setStatus("error");
      setError("No authenticated user — sign in first or enable dev mode anonymous auth.");
      return;
    }
    setStatus("running");
    setError(null);
    const path     = `vault/${uid}/.health-probe-${Date.now()}.txt`;
    const fileRef  = ref(storage, path);
    const blob     = new Blob(["zzc-health-ok"], { type: "text/plain" });
    try {
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(fileRef, blob, { contentType: "text/plain" });
        task.on("state_changed", null, reject, async () => {
          try {
            await getDownloadURL(task.snapshot.ref);
            resolve();
          } catch (e) { reject(e); }
        });
      });
      await deleteObject(fileRef);
      setStatus("ok");
    } catch (e) {
      setStatus("error");
      setError(storageErrorMessage(e));
    }
  };

  useEffect(() => {
    if (uid && !runRef.current) {
      runRef.current = true;
      runProbe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  return { status, error, runProbe };
}
