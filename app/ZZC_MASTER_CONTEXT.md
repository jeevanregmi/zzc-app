# ZZC MASTER CONTEXT
## Zeneration Z Chautari — Session State Document
Last Updated: May 12, 2026 | Session 7 ACTIVE

---

## LIVE SITE
- **URL**: https://zzc.jeevanregmi.com.np
- **Hosting**: Cloudflare Pages — project: `zeneration-z-chautari`
- **Deploy command**: `npx wrangler pages deploy out --project-name=zeneration-z-chautari`
- **GitHub**: https://github.com/jeevanregmi/zzc-app (branch: main)
- **Latest commit**: `0a28fc4` — Vault Phase 1: Intelligence Documents Library

---

## PLATFORM ARCHITECTURE

ZZC is a **two-sided platform** running on ONE domain:

```
zzc.jeevanregmi.com.np
├── / (public)                — Nepal fintech education site
│   ├── /scheme/[id]          — Individual scheme detail pages
│   ├── /calculator           — 6-tab financial calculator
│   ├── /compare              — 29+ scheme comparison table
│   ├── /eligibility          — Employment type eligibility checker
│   └── /recommend            — AI scheme recommendation wizard
│
└── /vault (private)          — Company Operating System (auth-gated)
    ├── /vault                — Command Center overview
    ├── /vault/content        — Content Pipeline
    ├── /vault/content/ai-studio — Script + Thumbnail generators
    ├── /vault/documents      — Intelligence Library (Phase 1 LIVE)
    ├── /vault/media          — Media asset grid + upload
    ├── /vault/business       — Business BI dashboard
    ├── /vault/analytics      — Analytics (stub)
    ├── /vault/tasks          — Task manager (stub)
    ├── /vault/calendar       — Calendar (stub)
    ├── /vault/finance        — Finance tracker (stub)
    ├── /vault/deploy         — Deploy status (stub)
    └── /vault/ai-queue       — AI job orchestration (stub)
```

### Architecture Rules
- One codebase, one domain, one Cloudflare Pages project
- All vault routes are auth-gated via `app/vault/layout.tsx` → `VaultGate` + `VaultShell`
- Individual vault pages render ONLY their content — never add their own VaultGate
- Public nav has "Dashboard →" link to `/vault`
- No `/admin` route — fully replaced by `/vault`

---

## FIREBASE (zeneration-z-chautari)

### Firestore Collections
| Collection | Purpose | Status |
|---|---|---|
| `structuredSchemes` | Public scheme data (26 docs) | LIVE |
| `market_rates` | Scraped daily rates (EPF/SSF/CIT) | LIVE |
| `vault_media` | Media assets (images/video) | LIVE |
| `vault_folders` | Virtual folder hierarchy | LIVE |
| `vault_documents` | Markdown notes/strategy docs | LIVE |
| `vault_intelligence_docs` | Uploaded intelligence files (PDF/DOCX/etc) | LIVE (Phase 1) |
| `business_content` | Content pipeline records | LIVE |
| `business_revenue` | Revenue tracking | Stub |
| `business_expenses` | Expense tracking | Stub |
| `business_ai_costs` | AI API cost tracking | Stub |
| `audience_leads` | Email/interest capture | Stub |
| `recommendation_signals` | AI recommendation inputs | Stub |
| `domain_events` | Event log | Stub |

### Auth
- Email/Password only — jeevanregmi15@gmail.com
- `VaultGate` checks `onAuthStateChanged`
- `useVaultAuth` hook: returns `{ user, loading, isOwner }` — isOwner checks hardcoded email
- Rules: public reads, authenticated writes

---

## AI STACK

### Recommend Engine (Cloudflare Pages Functions + AWS Bedrock)
- **File**: `functions/api/recommend.ts`
- **Endpoint**: `POST /api/recommend`
- **Model**: `anthropic.claude-3-5-sonnet-20241022-v2:0` (fallback; target: `anthropic.claude-sonnet-4-6`)
- **AWS Setup**: IAM User `zzc-bedrock-user`, region `us-east-1`
- **Status**: Deployed but waiting for Cloudflare env vars (AWS keys)

### AI Studio (Vault)
- **Script Generator**: `functions/api/generate-script.ts` — `POST /api/generate-script`
- **Thumbnail Prompt Generator**: `functions/api/generate-thumbnail.ts`
- **UI**: `app/vault/content/ai-studio/`

### Intelligence Library (Phase 1 — LIVE)
- Upload PDFs, DOCX, images, TXT, MD to Firebase Storage
- Real-time Firestore listener via `useIntelligenceDocs`
- `processingStatus` field: `uploading → ready → processing_ai → ai_ready`
- AI processing worker (Phase 2 — not yet built) will populate `aiSummary`, `aiKeyInsights`, `ocrText`

---

## TECH STACK

| Layer | Tech | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| Output | Static export (`output: "export"`) | — |
| Styling | Tailwind CSS v4 | — |
| Language | TypeScript + React | 19 |
| Auth/DB | Firebase (Firestore + Auth + Storage) | — |
| Hosting | Cloudflare Pages | — |
| Server-side | Cloudflare Pages Functions (`functions/api/`) | — |
| AI | AWS Bedrock Claude / Anthropic API | — |
| Charts | Recharts | — |
| Theme | Black/zinc/green neon | — |

---

## FILE STRUCTURE (current)

```
app/
├── layout.tsx              — nav (public "Dashboard →" → /vault), base SEO
├── page.tsx / HomeClient.tsx — scheme grid, search, category filters
├── calculator/             — 6-tab financial calculator
├── compare/                — master comparison table (29+ schemes)
├── eligibility/            — employment type eligibility checker
├── recommend/              — AI recommendation wizard
├── scheme/[id]/            — SSG scheme detail pages (29 pages)
├── vault/
│   ├── layout.tsx          — VaultGate + VaultShell wrapper for ALL vault routes
│   ├── page.tsx            — Command Center (overview dashboard)
│   ├── VaultClient.tsx     — vault homepage UI
│   ├── content/            — content pipeline + AI Studio
│   ├── documents/          — Intelligence Library (LIVE)
│   │   ├── page.tsx        — server wrapper
│   │   └── DocumentsClient.tsx — full upload/grid/search/view UI
│   ├── media/              — media grid
│   ├── business/           — BI dashboard
│   ├── analytics/          — stub
│   ├── tasks/              — stub
│   ├── calendar/           — stub
│   ├── finance/            — stub
│   ├── deploy/             — stub
│   └── ai-queue/           — stub
├── sitemap.ts              — dynamic sitemap from Firestore
└── robots.ts               — blocks /vault, allows all else

components/
├── vault/
│   ├── VaultShell.tsx      — OS-style sidebar nav (grouped, 12 items)
│   ├── VaultGate.tsx       — Firebase Auth check + login form
│   ├── VaultStub.tsx       — reusable stub with roadmap items
│   ├── MediaCard.tsx / MediaGrid.tsx / UploadZone.tsx / FullscreenViewer.tsx
│   └── documents/          — Intelligence Library components (Phase 1)
│       ├── DocumentCard.tsx
│       ├── DocumentUploadModal.tsx
│       └── DocumentViewer.tsx

lib/
├── schemes-data.ts         — SINGLE SOURCE: 29+ schemes, TypeScript typed
├── types/
│   ├── documents.ts        — IntelligenceDocument, DocUploadTask (NEW)
│   ├── media.ts            — MediaAsset types/enums
│   └── vault.ts            — VaultDocument, VaultFolder, UploadMeta
└── vault/
    ├── firestore.ts        — All Firestore CRUD (media, folders, docs, intelligence)
    ├── storage.ts          — Firebase Storage upload utilities
    ├── events.ts           — domain event publisher
    └── types.ts            — adapter layer type re-exports + VaultMedia

hooks/
├── vault/
│   ├── useVaultAuth.ts     — Firebase Auth state + isOwner check
│   ├── useMediaItems.ts    — vault_media real-time listener
│   ├── useUpload.ts        — media upload hook with progress
│   ├── useIntelligenceDocs.ts — vault_intelligence_docs real-time listener (NEW)
│   └── useDocumentUpload.ts — document upload hook with progress (NEW)
└── business/               — BI data hooks

functions/api/              — Cloudflare Pages Functions (server-side)
├── recommend.ts            — POST /api/recommend → AWS Bedrock Claude
├── generate-script.ts      — POST /api/generate-script → content scripts
└── generate-thumbnail.ts   — POST /api/generate-thumbnail → thumbnail prompts

docs/
├── deployment-checklist.md
├── scalable-platform-architecture.md
├── route-system-plan.md
├── future-data-pipeline-plan.md
├── modular-navigation-plan.md
├── automation-roadmap.md
└── ai-content-intelligence-architecture.md (NEW)
```

---

## CRITICAL PATTERNS

### Vault Layout Inheritance
- `app/vault/layout.tsx` wraps ALL /vault/* routes with `VaultGate` + `VaultShell`
- Individual vault pages NEVER add their own auth wrapper or nav
- VaultShell nav groups: Overview / Content / Operations / System
- Config-driven: `NAV_GROUPS` in VaultShell; `VAULT_NAV = NAV_GROUPS.flatMap(g => g.items)`

### Static Export Constraints
- `output: "export"` — no server-side Next.js features
- No Next.js API routes — use `functions/api/*.ts` instead
- `generateStaticParams` required for dynamic routes (`/scheme/[id]`)
- Firestore/Firebase accessed client-side only (never in server components at runtime)

### Type System
- Domain contracts: `lib/types/` (canonical, no implementation)
- Adapter types: `lib/vault/types.ts` (Firestore-specific, re-exports from lib/types/)
- Intelligence docs: `lib/types/documents.ts` (separate from markdown VaultDocument)

### SEO Pattern
- Server `page.tsx` (exports `metadata`) + client `*Client.tsx` (`"use client"`)
- All pages have JSON-LD structured data
- Language: Nepali (`lang="ne"`) — all UI text in Nepali

---

## SESSIONS HISTORY

### Session 4 (May 9, 2026)
Firebase setup, 26 schemes uploaded, Nepali UI, SEO, custom domain live.

### Session 5 (May 10, 2026)
`lib/schemes-data.ts` created, CIT/SSF/EPF live rates, daily GitHub Actions scraper, compare page rewrite, custom slash commands.

### Session 6 (May 12, 2026)
Architecture transition: two-sided platform decision. VaultShell rewrite (grouped OS nav), new vault stubs (analytics/tasks/calendar/finance/deploy/ai-queue), public nav updated, HomeClient + SchemeDetail `<a>` → `<Link>`, deployment checklist, 5 architecture docs.

### Session 7 (May 12, 2026 — ACTIVE)

**ANTHROPIC_API_KEY set in Cloudflare Pages production secrets — AI pipeline now live.**

Phase 1 Intelligence Documents Library built:
- `lib/types/documents.ts` — IntelligenceDocument type with AI-ready fields
- `lib/vault/firestore.ts` + `storage.ts` — intelligence doc CRUD
- `hooks/vault/useIntelligenceDocs.ts` + `useDocumentUpload.ts`
- `components/vault/documents/` — DocumentCard, DocumentUploadModal, DocumentViewer
- `app/vault/documents/DocumentsClient.tsx` — full working UI with drag-drop upload
- `firestore.indexes.json` — 3 composite indexes for vault_intelligence_docs
- Deployed: https://61ae052f.zeneration-z-chautari.pages.dev

---

## COMPLETED PHASES

### Phase 1 — Intelligence Documents Library (COMPLETE)
- Upload PDFs, DOCX, images, TXT, MD to Firebase Storage + Firestore
- Real-time grid UI with search, category filter, stats row
- `vault_intelligence_docs` collection, 3 composite indexes deployed

### Phase 2 — AI Document Processing (COMPLETE)
- `functions/api/process-document.ts` — Anthropic API (NOT Bedrock; PDF support requires `pdfs-2024-09-25` beta)
- "Analyze with AI" button on DocumentCard — extracts summary, insights, topics, content ideas
- Results written to Firestore; `processingStatus` transitions: `ready → processing_ai → ai_ready`

### Phase 3 — Admin Validation Queue (COMPLETE)
- `/vault/content/queue` — full approve/reject/archive workflow
- Source traceability as schema-level constraint on every `QueueItem`
- 7-day auto-expiry; status tabs; "View Source" links; inline notes
- Every `contentIdea` from AI processing creates a traceable `QueueItem` automatically

---

## PENDING TASKS

### Immediate
1. **AWS IAM keys** — Create access key for `zzc-bedrock-user` → set in Cloudflare Pages env vars → AI recommend goes live
2. **Cloudflare custom domain** — Pages → zeneration-z-chautari → Custom Domains → Add `zzc.jeevanregmi.com.np`
3. **Firestore indexes deployment** — `firebase deploy --only firestore:indexes` (vault_intelligence_docs + vault_content_queue)

### Phase 4 — AI Studio Integration (NEXT)
- `/vault/content/ai-studio` should read `?queueId=&title=` URL params from approved queue items
- Pre-fill Script Generator with the queue item's `aiTitle` and source context
- Closes the loop: NRB document → AI insights → Queue approval → Script generation

### Phase 5 — Public Growth Features
- Email capture banner on homepage (`audience_leads` Firestore collection)
- Live Nepal market data widget (NRB rates, NEPSE weekly) as daily return-visit hook
- NEPSE mutual funds added to `lib/schemes-data.ts`

### Phase 6 — Source Monitoring (Future)
- Cloudflare Workers cron to auto-fetch NRB RSS, EPF PDFs, NEPSE data
- `source_signals` Firestore collection; auto-trigger intelligence processing

---

## KNOWN ISSUES / LIMITATIONS
- Scheme detail pages are static — new Firestore schemes require redeploy to appear
- Vault is accessible at /vault URL even when logged out (VaultGate shows login form, not 404)
- `vault_intelligence_docs` Firestore indexes need manual deploy: `firebase deploy --only firestore:indexes`
- AWS Bedrock env vars not yet set → /recommend AI call will fail (UI shows error state)
- Calculator uses hardcoded 80yr life expectancy for monthly pension estimate
- Firebase Spark plan — watch storage/read limits (June 4, 2026 review)
