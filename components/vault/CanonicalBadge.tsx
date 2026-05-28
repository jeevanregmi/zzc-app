"use client";

/**
 * CanonicalBadge — shows whether a document has a permanent canonical identity.
 *
 * Three states:
 *   canonical   — linked to canonical_documents (stable, deduplicated identity)
 *   promotable  — has enough metadata, just needs promotion action
 *   incomplete  — missing identity fields, can't be made canonical yet
 */

interface Props {
  canonicalId?:  string;
  govFolder?:    string;
  lifecycleType?: string;
  size?: "sm" | "xs";
}

export function CanonicalBadge({ canonicalId, govFolder, lifecycleType, size = "sm" }: Props) {
  const textSize = size === "xs" ? "text-[9px]" : "text-[10px]";
  const px       = size === "xs" ? "px-1.5 py-0.5" : "px-2 py-0.5";

  if (canonicalId) {
    return (
      <span className={`${textSize} ${px} rounded-full font-bold border bg-violet-950/40 text-violet-300 border-violet-800/50`}
        title={`Canonical ID: ${canonicalId}`}
      >
        ⬡ Canonical
      </span>
    );
  }

  if (govFolder && lifecycleType) {
    return (
      <span className={`${textSize} ${px} rounded-full font-bold border bg-amber-950/30 text-amber-400/80 border-amber-800/40`}
        title="Identity fields set — eligible for canonical promotion"
      >
        ◇ Promotable
      </span>
    );
  }

  return (
    <span className={`${textSize} ${px} rounded-full font-bold border bg-zinc-800/50 text-zinc-600 border-zinc-700/50`}
      title="Missing govFolder or lifecycleType — identity incomplete"
    >
      ○ No Identity
    </span>
  );
}
