"use client";

import type { VaultMedia } from "../../lib/vault/types";

interface MediaCardProps {
  media:    VaultMedia;
  onSelect: (m: VaultMedia) => void;
}

function MimeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("video/"))       return <span className="text-3xl">🎬</span>;
  if (mimeType === "application/pdf")      return <span className="text-3xl">📄</span>;
  if (mimeType.startsWith("audio/"))       return <span className="text-3xl">🎵</span>;
  return <span className="text-3xl">🖼</span>;
}

const STATUS_PILL: Record<string, string> = {
  draft:     "bg-zinc-700 text-zinc-300",
  ready:     "bg-blue-900/60 text-blue-300",
  published: "bg-green-900/60 text-green-300",
  archived:  "bg-zinc-800 text-zinc-500",
};

function fmtSize(bytes: number): string {
  if (bytes < 1024)          return `${bytes} B`;
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function MediaCard({ media, onSelect }: MediaCardProps) {
  const thumb = media.thumbnailUrl || (media.mimeType.startsWith("image/") ? media.downloadUrl : "");

  return (
    <button
      onClick={() => onSelect(media)}
      className="group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-colors text-left"
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-zinc-800 flex items-center justify-center overflow-hidden">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={media.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <MimeIcon mimeType={media.mimeType} />
        )}

        {/* Status badge overlay */}
        <span className={
          "absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full font-medium " +
          (STATUS_PILL[media.usageStatus] ?? STATUS_PILL.draft)
        }>
          {media.usageStatus}
        </span>

        {/* AI badge */}
        {media.aiGenerated && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-purple-900/70 text-purple-300 font-medium">
            AI
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1 flex-1">
        <p className="text-sm font-medium text-white truncate">{media.title || media.fileName}</p>

        {/* Tags */}
        {media.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {media.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {tag}
              </span>
            ))}
            {media.tags.length > 3 && (
              <span className="text-[10px] text-zinc-600">+{media.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span className="text-[10px] text-zinc-600">{media.topic}</span>
          <span className="text-[10px] text-zinc-600">{fmtSize(media.size)}</span>
        </div>
      </div>
    </button>
  );
}
