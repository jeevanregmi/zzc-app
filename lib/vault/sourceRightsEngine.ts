// lib/vault/sourceRightsEngine.ts
// Pure rule-based source rights analysis for Temple Vault.
// No API calls — URL pattern matching + platform rules.
// Rule: AI ले license संकेत मात्र पढ्छ — founder ले verify गर्नुपर्छ।

// ── Types ──────────────────────────────────────────────────────────────────────

export type DetectedPlatform =
  | "internet_archive"
  | "youtube"
  | "website"
  | "pdf"
  | "audio_file"
  | "image_file"
  | "unknown";

export type DetectedMediaType =
  | "audio"
  | "video"
  | "text"
  | "pdf"
  | "image"
  | "mixed"
  | "unknown";

export type RightsClear =
  | "allowed"
  | "likely_allowed"
  | "needs_review"
  | "needs_permission"
  | "not_allowed"
  | "not_applicable";

export type MonetizationSafety =
  | "safe"
  | "likely_safe"
  | "risky"
  | "blocked"
  | "needs_permission";

export type ReviewStatus =
  | "pending_analysis"
  | "analyzed"
  | "saved_private"
  | "permission_needed"
  | "public_ready"
  | "monetization_ready"
  | "rejected";

export interface SourceRightsAnalysis {
  url:                  string;
  platform:             DetectedPlatform;
  mediaType:            DetectedMediaType;
  licenseSignal:        "public_domain" | "open_license" | "unknown" | "restricted" | "creator_permission_needed";
  privateStudy:         RightsClear;
  publicDisplay:        RightsClear;
  audioReuse:           RightsClear;
  derivativeVideo:      RightsClear;
  monetization:         MonetizationSafety;
  attributionRequired:  boolean | "unknown";
  allowedItems:         string[];   // ✅
  cautionItems:         string[];   // ⚠
  blockedItems:         string[];   // ❌
  safeAlternatives:     string[];
  recommendedAction:    string;
  platformNote:         string;
}

// ── Platform / media detection ─────────────────────────────────────────────────

export function detectPlatform(url: string): DetectedPlatform {
  const l = url.toLowerCase();
  if (l.includes("archive.org")) return "internet_archive";
  if (l.includes("youtube.com") || l.includes("youtu.be")) return "youtube";
  if (/\.(pdf)(\?.*)?$/.test(l)) return "pdf";
  if (/\.(mp3|ogg|wav|flac|m4a|aac|opus)(\?.*)?$/.test(l)) return "audio_file";
  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/.test(l)) return "image_file";
  return "website";
}

export function detectMediaType(url: string, platform: DetectedPlatform): DetectedMediaType {
  const l = url.toLowerCase();
  if (platform === "youtube")          return "video";
  if (platform === "pdf")              return "pdf";
  if (platform === "audio_file")       return "audio";
  if (platform === "image_file")       return "image";
  if (platform === "internet_archive") {
    if (l.includes("/stream/") || /\.(mp3|ogg|flac)/.test(l) || l.includes("/audio/")) return "audio";
    if (l.includes(".pdf")) return "pdf";
    return "mixed";
  }
  return "text";
}

// ── Display constants ──────────────────────────────────────────────────────────

export const PLATFORM_LABELS: Record<DetectedPlatform, string> = {
  internet_archive: "Internet Archive",
  youtube:          "YouTube",
  website:          "Website",
  pdf:              "PDF Document",
  audio_file:       "Audio File",
  image_file:       "Image",
  unknown:          "Unknown",
};

export const PLATFORM_ICONS: Record<DetectedPlatform, string> = {
  internet_archive: "🏛",
  youtube:          "▶",
  website:          "🌐",
  pdf:              "📄",
  audio_file:       "🎵",
  image_file:       "🖼",
  unknown:          "❓",
};

export const MEDIA_TYPE_LABELS: Record<DetectedMediaType, string> = {
  audio:   "Audio",
  video:   "Video",
  text:    "Text",
  pdf:     "PDF",
  image:   "Image",
  mixed:   "Mixed",
  unknown: "Unknown",
};

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  pending_analysis:   "विश्लेषण बाँकी",
  analyzed:           "विश्लेषण भयो",
  saved_private:      "Private Save",
  permission_needed:  "Permission चाहिन्छ",
  public_ready:       "Public Ready",
  monetization_ready: "Monetize Ready",
  rejected:           "Reject गरियो",
};

export const STATUS_COLORS: Record<ReviewStatus, string> = {
  pending_analysis:   "text-zinc-500 border-zinc-700 bg-zinc-900/40",
  analyzed:           "text-sky-400 border-sky-800/60 bg-sky-950/20",
  saved_private:      "text-violet-400 border-violet-800/60 bg-violet-950/20",
  permission_needed:  "text-amber-400 border-amber-800/60 bg-amber-950/20",
  public_ready:       "text-emerald-400 border-emerald-800/60 bg-emerald-950/20",
  monetization_ready: "text-green-400 border-green-800/60 bg-green-950/20",
  rejected:           "text-red-400 border-red-900/60 bg-red-950/20",
};

export const RIGHTS_LABELS: Record<RightsClear, string> = {
  allowed:          "✓ मिल्छ",
  likely_allowed:   "✓ सम्भव",
  needs_review:     "⚠ Review",
  needs_permission: "⚠ Permission",
  not_allowed:      "✗ मिल्दैन",
  not_applicable:   "—",
};

export const RIGHTS_COLORS: Record<RightsClear, string> = {
  allowed:          "text-emerald-400",
  likely_allowed:   "text-emerald-500",
  needs_review:     "text-amber-400",
  needs_permission: "text-amber-500",
  not_allowed:      "text-red-400",
  not_applicable:   "text-zinc-700",
};

export const MONETIZATION_LABELS: Record<MonetizationSafety, string> = {
  safe:             "✓ Safe",
  likely_safe:      "✓ Likely Safe",
  risky:            "⚠ Risky",
  blocked:          "✗ Blocked",
  needs_permission: "⚠ Permission",
};

export const MONETIZATION_COLORS: Record<MonetizationSafety, string> = {
  safe:             "text-emerald-400",
  likely_safe:      "text-emerald-500",
  risky:            "text-amber-400",
  blocked:          "text-red-400",
  needs_permission: "text-amber-500",
};

// ── Main rule engine ───────────────────────────────────────────────────────────

export function analyzeSourceUrl(url: string): SourceRightsAnalysis {
  const platform  = detectPlatform(url);
  const mediaType = detectMediaType(url, platform);

  let licenseSignal: SourceRightsAnalysis["licenseSignal"] = "unknown";
  let privateStudy:     RightsClear        = "allowed";
  let publicDisplay:    RightsClear        = "needs_review";
  let audioReuse:       RightsClear        = "needs_review";
  let derivativeVideo:  RightsClear        = "needs_permission";
  let monetization:     MonetizationSafety = "risky";
  let attributionRequired: boolean | "unknown" = "unknown";
  let platformNote      = "";
  let recommendedAction = "Private Source मा Save गर्नुहोस्।";
  const allowedItems:   string[] = [];
  const cautionItems:   string[] = [];
  const blockedItems:   string[] = [];
  const safeAlternatives: string[] = [];

  if (platform === "youtube") {
    licenseSignal       = "creator_permission_needed";
    privateStudy        = "allowed";
    publicDisplay       = "needs_review";
    audioReuse          = "needs_permission";
    derivativeVideo     = "needs_permission";
    monetization        = "needs_permission";
    attributionRequired = true;
    platformNote        = "YouTube content default मा creator-owned हुन्छ। Description मा 'Creative Commons' label check गर्नुहोस्। Audio/video reuse गर्न explicit permission चाहिन्छ। Devotional content भए पनि copyright हटाउँदैन।";
    recommendedAction   = "Personal reference मात्र। Audio reuse भन्दा आफ्नै narration बनाउनुहोस्।";
    allowedItems.push("Personal study र reference — राख्न र हेर्न मिल्छ");
    allowedItems.push("SacredWork को reference URL मा add गर्न मिल्छ");
    allowedItems.push("Text/lyrics को अर्थ Nepali मा explain गर्न मिल्छ");
    cautionItems.push("Public embed: CC license confirmed भएपछि मात्र link/embed गर्नुहोस्");
    cautionItems.push("Attribution: Creator/channel को नाम अनिवार्य");
    blockedItems.push("Original audio/video reuse without permission — गर्नु हुन्न");
    blockedItems.push("Monetized content मा original audio — creator permission required");
    safeAlternatives.push("यो YouTube bhajan को text/भाव use गर्नुहोस् — आफ्नै voice/narration record गर्नुहोस्।");
    safeAlternatives.push("Licensed/CC0 music + आफ्नै Nepali explanation narration — monetization safe।");

  } else if (platform === "internet_archive") {
    licenseSignal       = "unknown";
    privateStudy        = "likely_allowed";
    publicDisplay       = "needs_review";
    audioReuse          = "needs_review";
    derivativeVideo     = "needs_review";
    monetization        = "risky";
    attributionRequired = "unknown";
    platformNote        = "Archive.org मा भएको content automatically public domain होइन। Item को Details tab मा 'Rights' वा 'License' field हेर्नुहोस्। Ancient text PD हुन सक्छ तर modern recording copyright हुन सक्छ।";
    recommendedAction   = "Archive.org item page मा 'Rights' field check गर्नुहोस् — PD confirm भएपछि freely use गर्न मिल्छ।";
    allowedItems.push("Private study र note-taking — मिल्छ");
    allowedItems.push("SacredWork मा source reference URL — मिल्छ");
    cautionItems.push("Text public domain भए explanation use गर्न मिल्छ — verify गर्नुहोस् पहिले");
    cautionItems.push("Audio/recording को rights text बाट अलग हुन्छ — recording पनि check गर्नुहोस्");
    cautionItems.push("Public embed/reuse: License confirm गरेपछि मात्र");
    blockedItems.push("Archive.org = PD automatically assume गर्नु हुन्न — verify गर्नुहोस्");
    safeAlternatives.push("Item Details page खोलेर 'Rights' field हेर्नुहोस्। CC0 वा Public Domain mark भए freely use गर्न मिल्छ।");

  } else if (platform === "pdf") {
    licenseSignal       = "unknown";
    privateStudy        = "likely_allowed";
    publicDisplay       = "needs_review";
    audioReuse          = "not_applicable";
    derivativeVideo     = "needs_review";
    monetization        = "risky";
    attributionRequired = "unknown";
    platformNote        = "PDF copyright publisher/author मा हुन्छ। Ancient text PDF भए text PD हुन सक्छ — तर publisher को scan/edition कहिलेकाहीँ copyright हुन सक्छ।";
    recommendedAction   = "Private study मात्र। Gita Press, DLI जस्ता open sources राम्रो option हो।";
    allowedItems.push("Private study — download र read गर्न मिल्छ");
    allowedItems.push("Text को meaning Nepali मा explain गर्न मिल्छ");
    cautionItems.push("Text reuse: Source publisher को license check गर्नुहोस्");
    cautionItems.push("Public digital display: Rights clear गर्नुहोस्");
    safeAlternatives.push("Gita Press वा Digital Library of India — clearly open sources छन्।");

  } else if (platform === "audio_file") {
    licenseSignal       = "unknown";
    privateStudy        = "allowed";
    publicDisplay       = "needs_review";
    audioReuse          = "needs_permission";
    derivativeVideo     = "needs_permission";
    monetization        = "needs_permission";
    attributionRequired = true;
    platformNote        = "Direct audio file — performer/recorder को copyright हुन्छ। Ancient stotra text PD भए पनि modern recording copyright हो।";
    recommendedAction   = "Private study मात्र। Reuse गर्न performer/source को permission लिनुहोस्।";
    allowedItems.push("Personal listening — मिल्छ");
    allowedItems.push("SacredWork मा audio source URL — मिल्छ");
    cautionItems.push("Attribution: Performer/source अनिवार्य");
    blockedItems.push("Public embed without license — गर्नु हुन्न");
    blockedItems.push("Monetized reel/video मा original audio — permission required");
    safeAlternatives.push("Performer सँग direct permission लिनुहोस् — Permission Task बनाउनुहोस्।");
    safeAlternatives.push("आफ्नै recitation record गर्नुहोस् — fully monetization safe।");

  } else {
    // website or unknown
    licenseSignal       = "unknown";
    privateStudy        = "likely_allowed";
    publicDisplay       = "needs_review";
    audioReuse          = "not_applicable";
    derivativeVideo     = "needs_review";
    monetization        = "risky";
    attributionRequired = "unknown";
    platformNote        = "Website content copyright website owner मा हुन्छ। Text use गर्दा source cite गर्नुहोस्। Website ToS check गर्नुहोस्।";
    recommendedAction   = "Reference र study मात्र। Public use गर्नु भन्दा पहिले rights check गर्नुहोस्।";
    allowedItems.push("Private study र reference — मिल्छ");
    allowedItems.push("SacredWork मा source URL — मिल्छ");
    cautionItems.push("Text reuse: Citation र attribution अनिवार्य");
    cautionItems.push("Public publish: Website ToS check गर्नुहोस्");
  }

  return {
    url, platform, mediaType, licenseSignal,
    privateStudy, publicDisplay, audioReuse, derivativeVideo,
    monetization, attributionRequired,
    allowedItems, cautionItems, blockedItems, safeAlternatives,
    recommendedAction, platformNote,
  };
}
