"use client";

import { useState, useMemo } from "react";
import type { VaultMedia } from "../../lib/vault/types";
import { MediaCard } from "./MediaCard";

interface MediaGridProps {
  items:    VaultMedia[];
  loading:  boolean;
  onSelect: (m: VaultMedia) => void;
}

type SortField = "createdAt" | "title" | "size";

export function MediaGrid({ items, loading, onSelect }: MediaGridProps) {
  const [search,   setSearch]   = useState("");
  const [topicF,   setTopicF]   = useState("");
  const [statusF,  setStatusF]  = useState("");
  const [sortBy,   setSortBy]   = useState<SortField>("createdAt");

  const topics = useMemo(() => {
    const set = new Set<string>();
    items.forEach(m => (m.relatedTopics ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    let out = items.filter(m => {
      if (search) {
        const q = search.toLowerCase();
        if (!m.title.toLowerCase().includes(q) && !m.tags.some(t => t.includes(q))) return false;
      }
      if (topicF && !(m.relatedTopics ?? []).includes(topicF)) return false;
      if (statusF && m.usageStatus !== statusF)              return false;
      return true;
    });

    out = [...out].sort((a, b) => {
      if (sortBy === "title")     return a.title.localeCompare(b.title);
      if (sortBy === "size")      return b.size - a.size;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return out;
  }, [items, search, topicF, statusF, sortBy]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or tags…"
          className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        {topics.length > 0 && (
          <select
            value={topicF}
            onChange={e => setTopicF(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="">All topics</option>
            {topics.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select
          value={statusF}
          onChange={e => setStatusF(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All status</option>
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortField)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="createdAt">Newest first</option>
          <option value="title">A → Z</option>
          <option value="size">Largest first</option>
        </select>
      </div>

      {/* Count */}
      <p className="text-xs text-zinc-600">
        {loading ? "Loading…" : `${filtered.length} of ${items.length} assets`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-zinc-500 text-sm">{items.length === 0 ? "No assets yet. Upload your first file." : "No results match your filters."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map(m => (
            <MediaCard key={m.id} media={m} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}
