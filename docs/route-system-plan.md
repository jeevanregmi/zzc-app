# ZZC Route System Plan

**Target: 30+ routes by Phase 2, unlimited expansion by Phase 3**

---

## Current Routes (Live)

```
PUBLIC
/ (homepage — scheme index)
/calculator
/compare
/eligibility
/recommend
/scheme/[id]
/robots.txt
/sitemap.xml

VAULT (auth-gated)
/vault
/vault/content
/vault/content/ai-studio
/vault/content/youtube
/vault/content/youtube/ideas
/vault/content/youtube/scripts
/vault/content/youtube/thumbnails
/vault/content/youtube/published
/vault/content/youtube/first-video
/vault/content/shorts
/vault/content/facebook
/vault/media
/vault/business
/vault/analytics        ← stub
/vault/tasks            ← stub
/vault/calendar         ← stub
/vault/finance          ← stub
/vault/documents        ← stub
/vault/deploy           ← stub
/vault/ai-queue         ← stub
```

---

## Phase 2 Routes — Public Expansion

```
CALCULATORS HUB
/calculators                     ← hub with all calculator cards
/calculators/retirement          ← existing retirement calc
/calculators/sip                 ← SIP/lump-sum comparison
/calculators/loan                ← loan EMI analyzer
/calculators/health              ← health insurance calculator
/calculators/risk                ← risk profile calculator
/calculators/tax                 ← CIT tax calculator
/calculators/epf-growth          ← EPF corpus projector

SCHEME INTELLIGENCE
/schemes                         ← all schemes hub
/schemes/epf                     ← EPF deep-dive
/schemes/ssf                     ← SSF deep-dive
/schemes/cit                     ← CIT deep-dive
/schemes/compare                 ← redirect to /compare

EDUCATION
/learn                           ← learning hub
/learn/investing-basics
/learn/epf-explained
/learn/ssf-explained
/learn/tax-nepal
/learn/gen-z-money

PORTFOLIO & MARKET
/portfolio                       ← portfolio optimizer
/market                          ← Nepal market dashboard (NRB rates, NEPSE)

AI TOOLS
/recommend                       ← existing AI recommender
/ai/goal-planner                 ← goal-based planning (calcGoalPlan ready)
/ai/portfolio-optimizer          ← AI-driven allocation
```

---

## Phase 3 Routes — Intelligence Expansion

```
RESEARCH & NEWS
/research                        ← Nepal finance research hub
/research/[slug]                 ← AI-generated research articles
/news                            ← Nepal financial news aggregator
/news/[slug]

BUSINESS TOOLS
/tools                           ← Founder/business tools hub
/tools/startup-calculator
/tools/valuation-estimator
/tools/burn-rate-calculator

ONBOARDING
/start                           ← onboarding flow (quiz → recommendation)
/profile                         ← user financial profile (authenticated)
```

---

## URL Design Rules

1. **Nepali-first content, English URLs** — `/learn/epf-explained` not `/learn/ईपीएफ-व्याख्या`
2. **Hubs before leaves** — `/calculators` exists before `/calculators/sip`
3. **No nesting deeper than 3** — `/vault/content/youtube/ideas` is max depth
4. **Slugs over IDs** — `/schemes/epf` preferred over `/scheme/52hlCrPlU3Ba1OsosHxg`
5. **Vault always under `/vault/`** — no public routes mixed with admin routes

---

## Dynamic Route Strategy

```typescript
// lib/routes.ts — single source of truth for route generation
export const SCHEME_SLUGS = {
  "epf": "52hlCrPlU3Ba1OsosHxg",
  "ssf": "...",
  "cit": "...",
} as const;

// Use in generateStaticParams:
export async function generateStaticParams() {
  return Object.keys(SCHEME_SLUGS).map(slug => ({ slug }));
}
```

Migrate `/scheme/[id]` → `/schemes/[slug]` in Phase 2 for SEO.

---

## SEO Route Priority

| Route | Priority | Update Frequency |
|-------|----------|-----------------|
| `/` | 1.0 | Weekly |
| `/calculators` | 0.9 | Monthly |
| `/calculators/*` | 0.8 | Monthly |
| `/schemes/epf` | 0.9 | Monthly |
| `/learn/*` | 0.8 | Weekly |
| `/recommend` | 0.8 | Monthly |
| `/compare` | 0.7 | Monthly |

Update `app/sitemap.ts` when adding new public routes.
