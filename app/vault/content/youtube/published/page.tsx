"use client";

import Link from "next/link";
import type { PublishingRecord } from "../../../../../lib/types/content";

const RECORDS: PublishingRecord[] = [];

export default function PublishedPage() {
  return (

      <div className="p-4 sm:p-6 max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-center gap-2 flex-wrap">
          <Link href="/vault/content" className="text-zinc-600 hover:text-zinc-400 text-sm">← Content</Link>
          <span className="text-zinc-700">/</span>
          <Link href="/vault/content/youtube" className="text-zinc-600 hover:text-zinc-400 text-sm">YouTube</Link>
          <span className="text-zinc-700">/</span>
          <h1 className="text-xl font-bold text-white">Published</h1>
        </div>

        {RECORDS.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-4">▶</p>
            <p className="text-zinc-400 font-medium mb-1">No videos published yet</p>
            <p className="text-zinc-600 text-sm mb-6">First video is in production. Check back after publish.</p>
            <Link
              href="/vault/content/youtube/ideas"
              className="text-sm text-green-400 hover:text-green-300"
            >
              View content pipeline →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {RECORDS.map(r => (
              <div key={r.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-white text-sm">{r.title}</p>
                  <span className="text-xs text-zinc-600">{r.publishedAt}</span>
                </div>
                <div className="flex gap-4 text-xs text-zinc-500 flex-wrap">
                  {r.views     !== undefined && <span>👁 {r.views.toLocaleString()}</span>}
                  {r.likes     !== undefined && <span>👍 {r.likes.toLocaleString()}</span>}
                  {r.comments  !== undefined && <span>💬 {r.comments.toLocaleString()}</span>}
                  {r.ctrPct    !== undefined && <span>CTR: {r.ctrPct}%</span>}
                  {r.avgViewSec !== undefined && <span>Avg view: {Math.round(r.avgViewSec / 60)}m{r.avgViewSec % 60}s</span>}
                </div>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-400 hover:text-green-300 mt-2 inline-block"
                  >
                    Watch on YouTube →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

  );
}
