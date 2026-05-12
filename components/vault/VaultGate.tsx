"use client";

import React from "react";
import { useVaultAuth } from "../../hooks/vault/useVaultAuth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../app/firebase";
import { useState } from "react";

interface VaultGateProps {
  children: React.ReactNode;
}

export function VaultGate({ children }: VaultGateProps) {
  const { user, loading, isOwner } = useVaultAuth();
  const [email, setEmail]          = useState("");
  const [password, setPassword]    = useState("");
  const [error, setError]          = useState("");
  const [signing, setSigning]      = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Vault logo */}
          <div className="text-center mb-8">
            <div className="text-4xl mb-2">🔐</div>
            <h1 className="text-xl font-bold text-white">ZZC Vault</h1>
            <p className="text-zinc-600 text-sm mt-1">Private access only</p>
          </div>

          {/* Login form */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            {error && (
              <div className="bg-red-950/50 border border-red-500/30 text-red-300 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleLogin}
              disabled={signing}
              className="w-full bg-green-500 hover:bg-green-400 disabled:bg-zinc-700 text-black disabled:text-zinc-500 font-semibold py-2 rounded-lg transition-colors text-sm"
            >
              {signing ? "Authenticating..." : "Enter Vault"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;

  async function handleLogin() {
    if (!email || !password) return;
    setSigning(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError("Authentication failed. Check your credentials.");
    } finally {
      setSigning(false);
    }
  }
}
