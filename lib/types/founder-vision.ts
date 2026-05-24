export type VisionEntryType =
  | "vision"
  | "letter"
  | "architecture"
  | "future-feature"
  | "policy-thought"
  | "civic-idea"
  | "philosophy"
  | "roadmap"
  | "emotional-moment";

export type VisionVisibility =
  | "private"
  | "internal"
  | "future-public"
  | "publishable";

export type LetterRecipient =
  | "pm"
  | "future-self"
  | "citizens"
  | "humanity"
  | "team"
  | "other";

export interface FounderVisionEntry {
  id:              string;
  ownerId:         string;
  title:           string;
  body:            string;
  type:            VisionEntryType;
  mood:            string;
  importance:      1 | 2 | 3 | 4 | 5;
  tags:            string[];
  visibility:      VisionVisibility;
  linkedTree:      string | null;
  linkedBranch:    string | null;
  letterRecipient: LetterRecipient | null;
  revisitAt:       string | null;  // ISO date string YYYY-MM-DD
  createdAt:       string;         // ISO datetime string
  updatedAt:       string;
}

export type FounderVisionInput = Omit<FounderVisionEntry, "id" | "ownerId" | "createdAt" | "updatedAt">;
