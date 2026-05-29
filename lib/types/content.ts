export type ContentStatus = "idea" | "scripting" | "production" | "editing" | "ready" | "published" | "archived";
export type ContentFormat = "long-form" | "short" | "reel" | "post" | "carousel" | "thumbnail";
export type ContentPillar =
  | "constitution"
  | "civic-rights"
  | "schemes"
  | "employment"
  | "epf-ssf"
  | "cit-tax"
  | "finance"
  | "anti-corruption"
  | "calculator-demo";

export interface VideoIdea {
  id:          string;
  title:       string;
  hook:        string;
  pillar:      ContentPillar;
  format:      ContentFormat;
  estimatedMin: number;
  cta:         string;
  priority:    "high" | "medium" | "low";
  status:      ContentStatus;
  tags:        string[];
  notes?:      string;
  createdAt:   string;
}

export interface ScriptSection {
  label:    string;
  duration: string;
  notes:    string;
}

export interface ScriptDraft {
  id:         string;
  ideaId:     string;
  title:      string;
  status:     "outline" | "draft" | "final";
  sections:   ScriptSection[];
  wordCount?: number;
  docUrl?:    string;
  updatedAt:  string;
}

export interface ThumbnailPrompt {
  id:          string;
  ideaId:      string;
  headline:    string;
  subline?:    string;
  visualStyle: "calculator-screen" | "talking-head" | "data-viz" | "split-screen" | "text-only";
  palette:     "green-black" | "red-black" | "blue-black" | "custom";
  aiPrompt:    string;
  assetId?:    string;
  status:      "draft" | "generated" | "approved" | "uploaded";
  createdAt:   string;
}

export interface PublishingRecord {
  id:          string;
  ideaId:      string;
  platform:    "youtube" | "youtube-shorts" | "instagram" | "tiktok" | "facebook";
  publishedAt: string;
  url:         string;
  title:       string;
  views?:      number;
  likes?:      number;
  comments?:   number;
  ctrPct?:     number;
  avgViewSec?: number;
  notes?:      string;
}
