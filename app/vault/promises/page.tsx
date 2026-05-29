import { Suspense } from "react";
import PromiseVaultClient from "./PromiseVaultClient";

export default function PromisesVaultPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading…</div>}>
      <PromiseVaultClient />
    </Suspense>
  );
}
