import { Suspense } from "react";
import EconomyVaultClient from "./EconomyVaultClient";

export default function EconomyVaultPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading...</div>}>
      <EconomyVaultClient />
    </Suspense>
  );
}
