// Media atoms are a PUBLICATION WRAPPER around existing intelligence atoms.
// They NEVER store civic intelligence — they reference it via sourceAtomId.
// ONE brain principle: all content traces back to constitutional_framework or janta_intelligence.

export type MediaAtomStatus   = "draft" | "script_ready" | "approved" | "published";
export type MediaAtomType     = "short" | "reel" | "explainer" | "scene";
export type MediaAtomTone     = "informative" | "urgent" | "hopeful" | "critical";
export type MediaAtomAudience = "general" | "youth" | "rural" | "urban";
export type MediaAtomPlatform = "tiktok" | "facebook_reels" | "youtube_shorts" | "instagram";

export interface MediaAtom {
  id?:              string;
  ownerId:          string;

  // Source reference — ONE of these, never both
  sourceCollection: "constitutional_framework" | "janta_intelligence";
  sourceAtomId:     string;

  // Denormalized from source for query efficiency (NOT duplicated intelligence)
  linkedBranch?:    number;    // partNumber from constitutional_framework
  linkedArticle?:   string;    // e.g. "धारा ३१"
  linkedTopic?:     string;    // topic from janta_intelligence

  // AI-generated media content — admin-editable
  scriptNepali:     string;    // 60–150 word educational script
  narrationText:    string;    // TTS-ready version (cleaned punctuation)
  visualPrompt:     string;    // English prompt for external image/video tool
  captionText:      string;    // social media caption with hashtags

  // Classification
  mediaType:        MediaAtomType;
  emotionalTone:    MediaAtomTone;
  targetAudience:   MediaAtomAudience;
  sourceRefs:       string[];  // citations: doc IDs, URLs

  // Status state machine: draft → script_ready → approved → published
  status:           MediaAtomStatus;

  // Timestamps
  createdAt:        string;
  approvedAt?:      string;
  publishedAt?:     string;

  // Publishing (filled when marking as published — ZZC does NOT auto-publish)
  platforms?:       MediaAtomPlatform[];
  publishedUrls?:   Record<string, string>;  // platform → URL
}
