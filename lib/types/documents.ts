export type DocFileType = "pdf" | "docx" | "md" | "txt" | "image" | "other";

export type DocCategory =
  | "research"
  | "strategy"
  | "legal"
  | "finance"
  | "content"
  | "intelligence"
  | "other";

export type ProcessingStatus =
  | "uploading"
  | "ready"
  | "processing_ai"
  | "ai_ready"
  | "error";

export interface IntelligenceDocument {
  id:               string;
  ownerId:          string;
  title:            string;
  description:      string;
  fileName:         string;
  fileType:         DocFileType;
  mimeType:         string;
  fileSize:         number;
  storagePath:      string;
  downloadUrl:      string;
  folder:           string;
  tags:             string[];
  category:         DocCategory;
  processingStatus: ProcessingStatus;
  // AI fields — populated after processing
  aiSummary?:          string;
  aiKeyInsights?:      string[];
  ocrText?:            string;
  translationNe?:      string;
  confidence?:         number;     // 0-1
  sourceCredibility?:  "high" | "medium" | "low" | "unverified";
  // Optional metadata
  pageCount?:          number;
  language?:           string;
  uploadedAt:          string;
  updatedAt:           string;
}

// Client-side only — never stored in Firestore
export interface DocUploadTask {
  localId:   string;
  fileName:  string;
  progress:  number;               // 0-100
  status:    "uploading" | "creating" | "done" | "error";
  error?:    string;
  docId?:    string;
}
