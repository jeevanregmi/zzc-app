import { Suspense } from "react";
import KnowledgeQueueClient from "./KnowledgeQueueClient";

export default function KnowledgePage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-500 text-sm">Loading…</div>}>
      <KnowledgeQueueClient />
    </Suspense>
  );
}
