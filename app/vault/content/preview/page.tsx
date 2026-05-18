import { Suspense } from "react";
import PreviewClient from "./PreviewClient";

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-zinc-600 text-sm">Loading preview…</div>}>
      <PreviewClient />
    </Suspense>
  );
}
