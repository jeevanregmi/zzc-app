import { Suspense } from "react";
import AIStudioClient from "./AIStudioClient";

export default function AIStudioPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-600 text-sm">Loading…</div>}>
      <AIStudioClient />
    </Suspense>
  );
}
