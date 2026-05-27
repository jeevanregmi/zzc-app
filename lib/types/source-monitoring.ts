// Types for source_watchers and source_updates Firestore collections.

export type WatcherStatus = "active" | "paused" | "error";
export type UpdateStatus  = "new" | "reviewed" | "uploaded" | "ignored";
export type CheckFrequency = "manual" | "daily" | "weekly";

export interface SourceWatcher {
  id:              string;          // Firestore doc ID
  ownerId:         string;
  sourceId:        string;          // matches OfficialSource.sourceId
  url:             string;          // URL to fetch (officialUrl or custom)
  status:          WatcherStatus;
  checkFrequency:  CheckFrequency;
  lastCheckedAt:   string | null;   // ISO
  lastKnownUrls:   string[];        // URLs seen in the last successful check
  createdAt:       string;          // ISO
  errorMessage?:   string;
}

export interface SourceUpdate {
  id:              string;          // Firestore doc ID
  ownerId:         string;
  sourceId:        string;
  watcherId:       string;
  url:             string;
  title:           string;          // extracted from link text or URL
  fileType:        "pdf" | "doc" | "docx" | "html" | "other";
  detectedAt:      string;          // ISO
  status:          UpdateStatus;
  likelyGovFolder: string;
  likelyParts:     number[];
  tags:            string[];
  confidence:      number;          // 0–1: how likely this is a real new document
}

// API response from /api/check-source
export interface CheckSourceResult {
  sourceId:    string;
  url:         string;
  checkedAt:   string;
  foundUrls:   DetectedLink[];
  newUrls:     DetectedLink[];      // not in lastKnownUrls
  error?:      string;
}

export interface DetectedLink {
  url:      string;
  title:    string;
  fileType: "pdf" | "doc" | "docx" | "html" | "other";
}
