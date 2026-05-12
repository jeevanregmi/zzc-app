# ZZC Scalable Platform Architecture

**Domain:** zzc.jeevanregmi.com.np  
**Model:** Two-sided AI-native fintech intelligence platform

---

## Two Sides, One Platform

```
zzc.jeevanregmi.com.np
├── PUBLIC SIDE          → /                 (unauthenticated users)
└── VAULT / ADMIN SIDE   → /vault/*          (authenticated operators)
```

Single Next.js app. Single Cloudflare Pages deployment. One Firebase project.  
No sub-domains. No micro-frontends. No fragmentation.

---

## Public Side — Module Registry

Each public section is a self-contained module under `app/`:

```
app/
├── (public)/                    ← route group (no layout impact)
│   ├── calculators/             ← Financial calculators hub
│   │   ├── retirement/
│   │   ├── sip/
│   │   ├── loan/
│   │   ├── health/
│   │   ├── risk/
│   │   └── tax/
│   ├── schemes/                 ← Nepal scheme intelligence
│   │   ├── epf/
│   │   ├── ssf/
│   │   ├── cit/
│   │   └── [id]/
│   ├── learn/                   ← Education hub
│   │   ├── investing/
│   │   ├── tax/
│   │   ├── retirement/
│   │   └── gen-z-money/
│   ├── portfolio/               ← Portfolio intelligence
│   ├── market/                  ← Nepal market indicators
│   ├── news/                    ← Financial news intelligence
│   ├── tools/                   ← Business/founder tools
│   ├── recommend/               ← AI recommendation engine
│   ├── compare/                 ← Scheme comparison
│   └── eligibility/             ← Eligibility checker
```

---

## Vault Side — OS Module Registry

```
app/vault/
├── (overview)/
│   └── page.tsx                 ← Command Center
├── content/                     ← Content pipeline
│   ├── ai-studio/
│   ├── youtube/
│   ├── shorts/
│   └── facebook/
├── media/                       ← Asset vault
├── business/                    ← Business BI
├── analytics/                   ← Platform analytics
├── tasks/                       ← Task management
├── calendar/                    ← Content calendar
├── finance/                     ← Revenue/budget
├── documents/                   ← Document vault
├── deploy/                      ← Deployment monitor
├── ai-queue/                    ← AI job orchestration
├── experiments/                 ← A/B testing (future)
└── research/                    ← Data research (future)
```

---

## Data Layer

```
Firestore Collections
├── schemes/            ← 28+ Nepal financial schemes (static seeded, AI-updated)
├── market_rates/       ← Interest rates, inflation, NEPSE (scheduled updates)
├── users/              ← Auth + usage profile (future)
├── vault_media/        ← Media metadata (Storage URLs)
├── vault_documents/    ← Document metadata
├── content_ideas/      ← VideoIdea objects
├── content_scripts/    ← ScriptDraft objects
├── content_published/  ← PublishingRecord objects
├── business_entries/   ← Revenue/expense ledger
└── ai_jobs/            ← Queued generation jobs
```

---

## AI Layer

```
functions/api/
├── recommend.ts             ← AWS Bedrock: scheme recommendation
├── generate-script.ts       ← AWS Bedrock: video script generation
├── generate-thumbnail-prompt.ts  ← AWS Bedrock: thumbnail prompt gen
├── ingest-rates.ts          ← SCHEDULED: pull public rate data (future)
├── normalize-scheme.ts      ← AI-assisted scheme data normalization (future)
└── health.ts                ← API health check endpoint (future)
```

All AI calls route through Cloudflare Pages Functions → AWS Bedrock.  
No direct API keys exposed to client.

---

## Scalability Principles

1. **Config-driven nav** — Add a section by adding an entry to nav config, not by editing layout files
2. **Firestore as single truth** — All dynamic data in Firestore, never hardcoded in components
3. **Type-first expansion** — `lib/types/` defines the contract before any UI is built
4. **Static export default** — Pages pre-render at build time; Firebase hydrates client-side
5. **Functions for server logic** — Never add API routes to Next.js; always `functions/api/`
6. **Module independence** — Each section in `app/` can be built/deployed independently

---

## Growth Path

| Phase | Scope | Trigger |
|-------|-------|---------|
| Current | 15 routes, 6 vault sections | MVP |
| Phase 2 | 30 routes, 12 vault sections | First 1k users |
| Phase 3 | 50+ routes, automated data | First revenue |
| Phase 4 | Multi-user vault, enterprise | Team expansion |
