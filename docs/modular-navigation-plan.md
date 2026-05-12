# ZZC Modular Navigation Plan

**Goal: Config-driven nav that scales to 50+ sections without layout rewrites.**

---

## Current State

| Nav | Location | Structure | Scalability |
|-----|----------|-----------|-------------|
| Public nav | `app/layout.tsx` (inline) | Hardcoded links | Poor — requires layout edit |
| Vault sidebar | `components/vault/VaultShell.tsx` | `NAV_GROUPS` config array | Good — add entry to array |

---

## Target: Config-Driven Public Nav

Extract public nav to a config file. Layout reads from config.

```typescript
// lib/nav/public-nav.ts
export type NavItem = {
  href: string;
  label: string;
  labelNe?: string;          // Nepali label
  highlight?: boolean;       // green accent (AI tools)
  mobileVisible?: boolean;   // show in compressed mobile nav
  badge?: string;            // "New" | "Beta"
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const PUBLIC_NAV: NavItem[] = [
  { href: "/",            label: "Schemes",    labelNe: "योजनाहरू",   mobileVisible: true },
  { href: "/calculators", label: "Calculator", labelNe: "क्यालकुलेटर", mobileVisible: true },
  { href: "/compare",     label: "Compare",    labelNe: "तुलना",       mobileVisible: true },
  { href: "/eligibility", label: "Eligibility",labelNe: "योग्यता" },
  { href: "/recommend",   label: "AI सिफारिस", highlight: true,        mobileVisible: true },
  { href: "/learn",       label: "Learn",      badge: "New" },
  { href: "/portfolio",   label: "Portfolio",  badge: "Beta" },
  { href: "/vault",       label: "Dashboard →", mobileVisible: false },
];
```

---

## Target: Vault Nav Registry

Current `NAV_GROUPS` in VaultShell is already config-driven. Extend it:

```typescript
// lib/nav/vault-nav.ts
export type VaultNavItem = {
  href: string;
  icon: string;
  label: string;
  status?: "live" | "soon" | "planned";  // shown as badge
};

export type VaultNavGroup = {
  label: string | null;
  items: VaultNavItem[];
};

export const VAULT_NAV_GROUPS: VaultNavGroup[] = [
  {
    label: null,
    items: [
      { href: "/vault",                   icon: "◈",  label: "Overview",        status: "live" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/vault/content",           icon: "🎬", label: "Content Pipeline", status: "live" },
      { href: "/vault/content/ai-studio", icon: "⚡", label: "AI Studio",        status: "live" },
      { href: "/vault/media",             icon: "🎞", label: "Media",            status: "live" },
    ],
  },
  // ... Operations, System groups
];
```

Move this config out of `VaultShell.tsx` into `lib/nav/vault-nav.ts` when nav grows beyond 20 items.

---

## Mobile Navigation Strategy

### Public Mobile
Current: horizontal scroll row of key links  
Target: bottom tab bar (4 tabs) for Phase 2

```
[Schemes] [Calculator] [AI Recommend] [More ▾]
```

"More" opens a full-screen drawer with all nav items.

### Vault Mobile
Current: hamburger dropdown (works well for ≤15 items)  
Target (Phase 2): bottom tab bar when vault has 20+ active sections

```
[Overview] [Content] [Operations] [System] [⚙]
```

---

## Section Registry Pattern

For Phase 2, add a machine-readable section registry used by the Command Center and the nav:

```typescript
// lib/registry/sections.ts
export type SectionStatus = "live" | "soon" | "planned" | "blocked";

export interface VaultSection {
  id: string;
  href: string;
  icon: string;
  label: string;
  description: string;
  group: "content" | "operations" | "system";
  status: SectionStatus;
  quickActions?: { label: string; href: string }[];
}

export const VAULT_SECTIONS: VaultSection[] = [...];
```

Both `VaultShell` nav and `VaultClient` Command Center import from this single registry.  
Adding a section = adding one entry to `VAULT_SECTIONS`. No other files to edit.

---

## Badge/Status Visual System

| Status | Color | Icon | Meaning |
|--------|-------|------|---------|
| `live` | green | ● | Fully functional |
| `soon` | yellow | ◎ | In active development |
| `planned` | zinc | ○ | On roadmap |
| `blocked` | red | ✕ | Waiting on dependency |
| `new` | blue | ★ | Recently launched |

Apply consistently across both public nav badges and vault section cards.

---

## Breadcrumb System (Phase 2)

Add a `<Breadcrumb>` component for vault sub-pages:

```
Overview → Content Pipeline → YouTube → First Video
```

```typescript
// components/vault/Breadcrumb.tsx
// Reads current pathname, splits on /, looks up labels from VAULT_SECTIONS registry
// Renders: Home > Section > Sub > Page
```

Already partially done via "← Content" manual links. Replace with systematic breadcrumbs.
