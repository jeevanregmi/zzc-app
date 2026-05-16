/**
 * Page Module Registry — Backend-Controlled Frontend Rendering
 *
 * Defines what renders on each public-facing page, in what order, with what data.
 * Stored in Firestore "page_modules" — admin manages via /vault/modules.
 *
 * Architecture:
 *   Frontend reads modules for its page → renders each ModuleType component.
 *   Only modules with publishStatus === "published" appear on the public frontend.
 *   Modules with publishStatus === "preview" appear at /vault/preview/[page] only.
 *
 * This makes the frontend a render layer controlled entirely from Vault.
 *
 * Module rendering contract:
 *   Each ModuleType maps 1:1 to a React component in components/modules/.
 *   Components receive (module: PageModule, previewMode: boolean) as props.
 *   Components self-fetch their data using module.dataSource + module.config.
 */

import type { PublishStatus } from "./publish";

// ── Public pages that support module-based rendering ─────────────────────

export type PublicPage =
  | "homepage"
  | "calculator"
  | "recommend"
  | "compare"
  | "schemes";     // future: dedicated schemes index page

// ── Module slot system ────────────────────────────────────────────────────
// Each page has named slots. Modules are rendered in ascending `order` within each slot.

export type HomepageSlot =
  | "hero"
  | "ticker"
  | "tools-row"
  | "scheme-explorer"
  | "cta-footer";

export type PageSlot = HomepageSlot | string; // open string for future pages

// ── Module types — each maps to a renderer component ─────────────────────

export type ModuleType =
  // Data-driven modules (read from Firestore at render time)
  | "market-rates-ticker"     // horizontal rates bar; dataSource: market_rates
  | "scheme-grid"             // filterable grid; dataSource: structuredSchemes
  | "ai-insights-feed"        // recent validated signals; dataSource: source_signals
  | "scheme-spotlight"        // single featured scheme card; config: { schemeId }

  // Static/config-driven modules
  | "hero-banner"             // page hero; config: { headline, subline, cta[] }
  | "tools-row"               // 4 tool cards; config: { tools[] }
  | "cta-block"               // call-to-action; config: { headline, buttonLabel, href }
  | "email-capture"           // newsletter signup; config: { headline, placeholder }
  | "custom-html";            // escape hatch; config: { html }

// ── CTA and tool config shapes ────────────────────────────────────────────

export interface CtaButton {
  label:  string;
  href:   string;
  style:  "primary" | "secondary" | "outline";
}

export interface ToolCard {
  label:    string;
  sublabel: string;
  href:     string;
  icon:     string;
  badge?:   string;
}

// ── PageModule — stored in Firestore "page_modules" ───────────────────────

export interface PageModule {
  id:            string;
  page:          PublicPage;
  slot:          PageSlot;
  type:          ModuleType;
  label:         string;          // admin display name

  // ── Publish state ────────────────────────────────────────────────────
  publishStatus: PublishStatus;
  publishedAt?:  string;
  publishedBy?:  string;

  // ── Rendering config ─────────────────────────────────────────────────
  config:        Record<string, unknown>;  // module-type-specific config
  dataSource?:   string;          // Firestore collection name (if data-driven)
  dataFilter?:   Record<string, unknown>;  // query constraints: { category: "Investment" }

  // ── Layout ───────────────────────────────────────────────────────────
  order:         number;          // ascending; lower = rendered first in slot
  hidden:        boolean;         // soft-delete; hides without removing

  // ── Metadata ─────────────────────────────────────────────────────────
  createdAt:     string;
  updatedAt:     string;
  updatedBy:     string;
}

// ── usePageModules hook shape ─────────────────────────────────────────────

export interface PageModulesState {
  modules:  PageModule[];
  loading:  boolean;
  bySlot:   Map<PageSlot, PageModule[]>;
}
