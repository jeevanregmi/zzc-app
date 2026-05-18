"use client";

/**
 * useVaultAuth — Firebase Auth state with vault-specific guard.
 *
 * Returns { user, loading, isOwner }.
 * isOwner = true only for jeevanregmi15@gmail.com (single-owner vault).
 *
 * DEV MODE: Set NEXT_PUBLIC_DEV_VAULT_MODE=true in .env.development.local to
 * use anonymous Firebase Auth instead of email sign-in. This gives a real
 * Firebase Auth JWT so Firebase Storage rules (server-side) accept uploads.
 * A client-side mock user has no JWT — Storage rejects every upload with
 * storage/unauthorized even though Firestore has a DEV_UID bypass.
 * Never set this in production — it bypasses email-based ownership checks.
 */

import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously, type User } from "firebase/auth";
import { auth } from "../../app/firebase";

const VAULT_OWNER_EMAIL = "jeevanregmi15@gmail.com";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_VAULT_MODE === "true";

export interface VaultAuthState {
  user:    User | null;
  loading: boolean;
  isOwner: boolean;
}

export function useVaultAuth(): VaultAuthState {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (DEV_MODE) {
      // Anonymous sign-in creates a real Firebase Auth session with a valid JWT.
      // Storage rules enforce request.auth server-side — a client-side mock user
      // produces no JWT, so Storage rejects uploads immediately. Anonymous auth
      // satisfies isSignedIn() && request.auth.uid == userId in storage.rules.
      signInAnonymously(auth).catch(err =>
        console.warn("[useVaultAuth] dev anonymous sign-in failed:", err),
      );
    }

    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return {
    user,
    loading,
    isOwner: DEV_MODE || user?.email === VAULT_OWNER_EMAIL,
  };
}
