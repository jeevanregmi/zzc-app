/**
 * Vault Domain — Canonical Contracts
 *
 * The vault is a private, owner-only workspace containing:
 *   media assets (→ lib/types/media.ts: MediaAsset)
 *   documents    (markdown notes, research, strategy docs)
 *   folders      (virtual hierarchy — not filesystem paths)
 *
 * VaultAsset is the universal node type for the vault tree.
 * It holds a refId pointing to the specific entity (MediaAsset, VaultDocument, VaultFolder)
 * rather than embedding the payload. This allows the tree to be queried cheaply
 * without loading full payloads, and lets each entity evolve its schema independently.
 */

import type { MediaContentType, MediaSource, MediaVisibility } from "./media";
export type { MediaContentType, MediaSource, MediaVisibility } from "./media";

// ── VaultAsset (virtual tree node) ───────────────────────────────────────────

export interface VaultAsset {
  id:        string;
  ownerId:   string;
  assetType: "media" | "document" | "folder";
  refId:     string;            // ID of the pointed-to entity
  path:      string;            // virtual path: "zzc/research/2026-05"
  createdAt: string;
}

// ── VaultFolder ───────────────────────────────────────────────────────────────

export interface VaultFolder {
  id:         string;
  ownerId:    string;
  name:       string;
  path:       string;           // full path: "parent/child"
  parentPath: string;           // "" for root folders
  color:      string;           // tailwind class or hex
  icon:       string;           // emoji or icon name; "" for default
  createdAt:  string;
}

// ── VaultDocument ─────────────────────────────────────────────────────────────

export type DocumentCategory =
  | "research" | "strategy" | "ai-notes" | "journal"
  | "founder"  | "legal"    | "playbook"  | "other";

export interface VaultDocument {
  id:        string;
  ownerId:   string;
  title:     string;
  content:   string;            // markdown
  category:  DocumentCategory;
  tags:      string[];
  wordCount: number;
  folder:    string;            // virtual folder path or ""
  createdAt: string;
  updatedAt: string;
}

// ── Upload pipeline (client-side only — never stored in Firestore) ────────────

export interface UploadTask {
  localId:   string;
  fileName:  string;
  progress:  number;            // 0-100
  status:    "pending" | "uploading" | "processing" | "done" | "error";
  error?:    string;
  mediaId?:  string;            // populated when Firestore record created
}

// ── Upload form shape ─────────────────────────────────────────────────────────

export interface UploadMeta {
  folder:          string;
  contentType:     MediaContentType;
  sourceType:      MediaSource;
  visibility:      MediaVisibility;
  generationCost:  number;
  relatedTopics:   string;      // comma-separated; split before storage
  tags:            string;      // comma-separated; split before storage
}
