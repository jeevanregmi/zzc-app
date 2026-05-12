/**
 * Vault Types — Adapter Layer
 *
 * This file is the ONLY place in lib/vault/ that defines types.
 * It delegates all enum + structural types to canonical sources in lib/types/.
 *
 * Architecture rule:
 *   lib/types/  = domain contracts (canonical, no implementation)
 *   lib/vault/  = adapters, persistence, storage utilities
 *
 * VaultMedia is defined here because it maps directly to the Firestore
 * "vault_media" collection schema. It uses canonical enums from lib/types/media.ts
 * so enum values are consistent across domain, adapter, and AI layers.
 *
 * Future migration: when VaultMedia and MediaAsset converge field-for-field,
 * this file will become a simple re-export of lib/types/media.ts:MediaAsset.
 */

// ── Re-export canonical types so vault consumers import from one place ────────
export type {
  // Enums from media domain
  MediaMimeType, AIMediaModel, MediaSource,
  MediaContentType, MediaVisibility, MediaUsageStatus, MediaTopic,
} from "../types/media";

export type {
  // Structural types from vault domain
  VaultFolder, VaultDocument, DocumentCategory,
  UploadTask, UploadMeta,
} from "../types/vault";

// ── Pull in for use in VaultMedia below ──────────────────────────────────────
import type {
  MediaMimeType, AIMediaModel, MediaSource,
  MediaContentType, MediaVisibility, MediaUsageStatus, MediaTopic,
} from "../types/media";

// ── VaultMedia — Firestore persistence model for vault_media collection ───────
//
// Differs from lib/types/media.ts:MediaAsset in field naming (costEstimate vs
// generationCost, topic vs relatedTopics array) for backward compat with data
// already in Firestore. Converge these when running a data migration.

export interface VaultMedia {
  id:               string;
  ownerId:          string;
  fileName:         string;
  storagePath:      string;
  downloadUrl:      string;
  mimeType:         MediaMimeType;
  size:             number;
  folder:           string;
  tags:             string[];
  title:            string;
  description:      string;
  aiGenerated:      boolean;
  aiPrompt:         string;
  aiModel:          AIMediaModel;
  width:            number;
  height:           number;
  durationSeconds:  number;
  thumbnailUrl:     string;

  topic:            MediaTopic;
  source:           MediaSource;
  contentType:      MediaContentType;
  visibility:       MediaVisibility;
  usageStatus:      MediaUsageStatus;
  costEstimate:     number;           // USD; field name kept for Firestore compat
  relatedTopics:    string[];
  relatedSchemes:   string[];
  relatedSectors:   string[];
  embeddingId:      string;
  extractedText:    string;

  createdAt:        string;
  updatedAt:        string;
}
