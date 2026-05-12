"use client";

import { VaultGate } from "../../components/vault/VaultGate";
import { VaultShell } from "../../components/vault/VaultShell";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <VaultGate>
      <VaultShell>{children}</VaultShell>
    </VaultGate>
  );
}
