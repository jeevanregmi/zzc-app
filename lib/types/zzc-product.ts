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
  analytics:        ZzcProductAnalytics;
  createdAt:        string;
  updatedAt:        string;
}
