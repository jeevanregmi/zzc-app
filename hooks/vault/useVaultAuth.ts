"use client";

/**
 * useVaultAuth — Firebase Auth state with vault-specific guard.
 *
 * Returns { user, loading, isOwner }.
 * isOwner = true only for jeevanregmi15@gmail.com (single-owner vault).
 *
 * TECHNICAL DEBT RISK:
 *   VAULT_OWNER_EMAIL is hardcoded. If you add team members or multi-tenancy,
 *   replace with a Firestore "vault_owners" whitelist check.
 */

import { useState, useEffect } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../../app/firebase";

const VAULT_OWNER_EMAIL = "jeevanregmi15@gmail.com";

export interface VaultAuthState {
  user:    User | null;
  loading: boolean;
  isOwner: boolean;
}

export function useVaultAuth(): VaultAuthState {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  return {
    user,
    loading,
    isOwner: user?.email === VAULT_OWNER_EMAIL,
  };
}
