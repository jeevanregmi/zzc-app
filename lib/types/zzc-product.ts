// zzc_products Firestore collection schema
// Product catalog + deployment management for ZZC intelligence product ecosystem

export type ProductType =
  | "constitution-tree"
  | "finance-tree"
  | "development-tree"
  | "law-tree"
  | "banking-tree"
  | "custom";

export type Platform = "web" | "android" | "ios" | "windows" | "macos";

export type DeploymentStatus = "draft" | "testing" | "ready" | "published" | "archived";

export type MonetizationType = "free" | "premium" | "donation" | "subscription" | "institutional";

export interface ZzcProductRoutes {
  webUrl?:     string;
  appRoute?:   string;
  storeUrls?: {
    android?: string;
    ios?:     string;
    windows?: string;
    macos?:   string;
  };
}

export interface ZzcProductMonetization {
  type:              MonetizationType;
  revenueEnabled:    boolean;
  stripeProductId?:  string;
  payoutDestination?: string;
}

export interface ZzcProductBranding {
  accentColor?:  string;
  ambientTheme?: string;
  forestType?:   string;
  soundTheme?:   string;
}

export interface ZzcProductTreeAsset {
  heroImageUrl?:    string; // CDN URL of the cinematic tree image (R2 or Firestore Storage)
  activeTreeAsset?: string; // asset filename/key in storage
  generatedBy?:     string; // admin uid who generated the asset
  assetPrompt?:     string; // the image generation prompt used
  assetCost?:       number; // cost in USD (for budget tracking)
  isActive:         boolean; // whether this asset is live on the product
}

export interface ZzcProductAnalytics {
  installs?:     number;
  activeUsers?:  number;
  retention?:    number;
  sessionTime?:  number;
}

export interface ZzcProduct {
  productId:        string;
  ownerId:          string;
  name:             string;
  slug:             string;
  tagline:          string;
  description:      string;
  icon:             string;
  heroImage?:       string;
  theme:            string;
  productType:      ProductType;
  platforms:        Platform[];
  deploymentStatus: DeploymentStatus;
  version:          string;
  buildNumber:      number;
  routes:           ZzcProductRoutes;
  monetization:     ZzcProductMonetization;
  branding:         ZzcProductBranding;
  treeAsset?:       ZzcProductTreeAsset;
  analytics:        ZzcProductAnalytics;
  createdAt:        string;
  updatedAt:        string;
}
