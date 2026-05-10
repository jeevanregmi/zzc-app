# ZZC MASTER CONTEXT
## Zeneration Z Chautari — Session State Document
Last Updated: May 10, 2026 | Session 5 In Progress

---

## LIVE SITE
- **URL**: https://zzc.jeevanregmi.com.np
- **Hosting**: Cloudflare Pages — project: `zeneration-z-chautari`
- **Deploy command**: `npx wrangler pages deploy out --project-name=zeneration-z-chautari`
- **GitHub**: https://github.com/jeevanregmi/zzc-app (branch: main)
- **Auto-deploy**: Cloudflare Pages connected to GitHub → push to main = deploy

---

## FIREBASE (zeneration-z-chautari)
- **Firestore collection**: `structuredSchemes` — 26 documents live
  - EPF: 10 schemes
  - CIT: 7 schemes
  - SSF: 9 schemes
- **Auth**: Email/Password enabled, admin user: jeevanregmi15@gmail.com
- **Rules**: Public reads, authenticated writes (`request.auth != null`)
- **No expiry** on rules (permanent)

### Firestore Document Schema (structuredSchemes)
```
title: string
organization: "EPF" | "CIT" | "SSF"
category: "Investment" | "Pension" | "Insurance"
subcategory: string
riskLevel: string
liquidity: string
interestRate: number | null
retirementSupport: boolean
insurance: boolean
medicalCoverage: boolean
pension: boolean
gratuity: boolean
loanLimit: number | null
calculatorEnabled: boolean
benefits: string[]
eligibility: string[]
documents: string[]
summary: string          (English)
nepaliSummary: string    (Nepali — shown in UI)
createdAt: timestamp
```

---

## AI RECOMMENDATION ENGINE

### AWS Bedrock Setup (Session 5 — May 10, 2026)
- **AWS Account ID**: 190777960247
- **IAM User**: `zzc-bedrock-user` (created, policy: `AmazonBedrockFullAccess`)
- **Region**: `us-east-1` (N. Virginia)
- **Target Model**: `anthropic.claude-sonnet-4-6`
- **Use case**: Submitted to Anthropic for model access approval
- **Status**: Awaiting Bedrock model access grant

### Cloudflare Pages Function
- **File**: `functions/api/recommend.ts` (at project root — picked up by wrangler)
- **Endpoint**: `POST /api/recommend`
- **SDK**: `@aws-sdk/client-bedrock-runtime` (InvokeModelCommand)
- **Current MODEL_ID**: `anthropic.claude-3-5-sonnet-20241022-v2:0` (fallback until claude-sonnet-4-6 access granted)
- **nodejs_compat**: enabled via `wrangler.toml` (required for AWS SDK in Workers)

### Required Cloudflare Env Vars (set in dashboard → Settings → Environment variables)
| Variable | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key for zzc-bedrock-user |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_REGION` | `us-east-1` |

### /recommend Page
- **Route**: `/recommend`
- **Server wrapper**: `app/recommend/page.tsx` (SEO metadata + JSON-LD)
- **UI**: `app/recommend/RecommendClient.tsx` ("use client" 3-step wizard)
- **Wizard**: Age slider → Income preset → Risk (Low/Medium/High)
- **Output**: Ranked scheme cards (EPF, CIT, SSF, NEPSE, Beema) in Nepali

### Remaining Steps
1. Get IAM access key + secret for `zzc-bedrock-user`
2. Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` in Cloudflare Pages dashboard
3. Once `anthropic.claude-sonnet-4-6` access is granted, update `MODEL_ID` in `functions/api/recommend.ts`
4. Redeploy: `npx wrangler pages deploy out --project-name=zeneration-z-chautari --commit-dirty=true --commit-message="..."`

---

## TECH STACK
- **Framework**: Next.js 16.2.6 (Turbopack), App Router
- **Output**: `output: "export"` + `trailingSlash: true` (static export for Cloudflare Pages)
- **Styling**: Tailwind CSS v4 — black/zinc/green neon theme
- **Language**: React 19, TypeScript
- **Charts**: Recharts (LineChart in calculator)
- **Fonts**: Geist Sans + Geist Mono

---

## FILE STRUCTURE (app/)
```
app/
├── layout.tsx              — nav, base metadata, lang="ne"
├── page.tsx                — server wrapper, exports metadata
├── HomeClient.tsx          — "use client" homepage UI
├── firebase.ts             — Firebase config (zeneration-z-chautari)
├── globals.css
├── sitemap.ts              — dynamic sitemap, fetches Firestore at build
├── robots.ts               — disallows /admin, points to sitemap
├── eligibility/
│   ├── page.tsx            — server wrapper, exports metadata
│   └── EligibilityClient.tsx — "use client" eligibility checker
├── compare/
│   ├── page.tsx            — server wrapper, exports metadata
│   └── CompareClient.tsx   — "use client" compare table
├── calculator/
│   ├── page.tsx            — server wrapper, exports metadata
│   └── CalculatorClient.tsx — "use client" retirement calculator
├── scheme/[id]/
│   ├── page.tsx            — server component, generateStaticParams + generateMetadata
│   └── SchemeDetail.tsx    — "use client" scheme detail view
├── admin/
│   └── page.tsx            — "use client", Firebase auth gate + upload panel
├── recommend/
│   ├── page.tsx            — server wrapper, exports metadata + JSON-LD
│   └── RecommendClient.tsx — "use client" 3-step AI recommendation wizard
├── scripts/
│   ├── epfDatabase.json    — 10 EPF schemes
│   ├── citDatabase.json    — 7 CIT schemes
│   └── ssfDatabase.json    — 9 SSF schemes
├── PROJECT_BIBLE.md
└── ZZC_MASTER_CONTEXT.md   (this file)

functions/ (project root — Cloudflare Pages Functions)
└── api/
    └── recommend.ts        — POST /api/recommend — calls AWS Bedrock Claude Sonnet
```

---

## CRITICAL PATTERNS

### Metadata (SEO)
- Next.js metadata only works in **server components**
- Pattern: each page has a thin server `page.tsx` (exports `metadata`) + a `*Client.tsx` (`"use client"`)
- Layout has `metadataBase`, title template `"%s | ZZC — Zeneration Z Chautari"`, `lang="ne"`
- Scheme detail uses `generateMetadata` — fetches Firestore REST API at build time

### Static Export + Dynamic Routes
- `app/scheme/[id]/page.tsx` has `generateStaticParams` + `dynamicParams = false`
- Fetches scheme IDs from Firestore REST API at build time (no SDK needed):
  `https://firestore.googleapis.com/v1/projects/zeneration-z-chautari/databases/(default)/documents/structuredSchemes?pageSize=200`
- `params` is `Promise<{id: string}>` in Next.js 16 — must `await params`

### Sitemap
- `app/sitemap.ts` + `export const dynamic = "force-static"` (required for static export)
- Fetches all scheme IDs from Firestore REST at build time
- Outputs 4 static pages + all `/scheme/[id]` URLs with Firestore `updateTime` as `lastModified`
- Same pattern for `app/robots.ts`

### Language
- Entire UI is in Nepali — all labels, headings, buttons, descriptions
- Technical terms kept English: EPF, CIT, SSF, Firebase, JSON, Admin, Quick Load
- Filter values for category stay English ("Investment", "Pension", "Insurance") to match Firestore data
- NPR amounts formatted as "X करोड" / "X लाख"

---

## PAGES
| Route | File | Description |
|-------|------|-------------|
| `/` | HomeClient.tsx | Scheme listing, search, org/category filters |
| `/eligibility` | EligibilityClient.tsx | Employment-type eligibility checker |
| `/compare` | CompareClient.tsx | Side-by-side scheme comparison (up to 4) |
| `/calculator` | CalculatorClient.tsx | Retirement savings projection with chart |
| `/recommend` | RecommendClient.tsx | AI-powered scheme recommendation wizard |
| `/scheme/[id]` | SchemeDetail.tsx | Full scheme detail (26 static pages built) |
| `/admin` | admin/page.tsx | Auth-gated upload/edit panel |
| `/sitemap.xml` | sitemap.ts | Auto-generated from Firestore |
| `/robots.txt` | robots.ts | Blocks /admin, allows all else |

---

## SESSION 4 COMPLETED (May 9, 2026)
- Firebase config corrected (was pointing to wrong project `zzc-finance`)
- Firebase Auth Email/Password enabled
- Firestore security rules deployed (public read, auth write)
- 26 schemes uploaded via Admin panel (EPF 10 + CIT 7 + SSF 9)
- Next.js static build (`npm run build` → `out/` — 36 static pages)
- Deployed to Cloudflare Pages: https://8ac74f4e.zeneration-z-chautari.pages.dev
- Custom domain live: https://zzc.jeevanregmi.com.np
- Entire website converted to Nepali language
- SEO: per-page metadata + keywords (server component wrapper pattern)
- SEO: `sitemap.ts` with dynamic Firestore scheme URLs
- SEO: `robots.ts` blocking /admin
- SEO: `layout.tsx` with `metadataBase`, title template, OpenGraph, `lang="ne"`
- Google Search Console: submitted sitemap, requested indexing
- Old duplicate Cloudflare project (double-i) deleted
- Git repo: https://github.com/jeevanregmi/zzc-app pushed

---

## NEXT PRIORITIES
1. **Finish AI Recommendation Engine** — get IAM keys → set Cloudflare env vars → update MODEL_ID to `anthropic.claude-sonnet-4-6` once access granted → test live
2. **Portfolio Simulator** — track hypothetical investments over time
3. **More schemes** — NEPSE (mutual funds), Beema Samiti (insurance products)
4. **First 100 users** — share in Nepali Facebook groups, LinkedIn
5. **eSewa / Khalti** integration (Phase 3 consultancy payments)

---

## SESSION 5 — May 10, 2026 (In Progress)
- AI Recommendation Engine built: `/recommend` page + 3-step wizard UI
- Cloudflare Pages Function: `functions/api/recommend.ts` using AWS Bedrock SDK
- `wrangler.toml` created with `nodejs_compat` flag
- AWS Account 190777960247 set up; IAM user `zzc-bedrock-user` created
- Bedrock region: `us-east-1`; model access use case submitted for `anthropic.claude-sonnet-4-6`
- "AI सिफारिस" nav link added to layout
- Deployed to Cloudflare Pages (awaiting env var configuration to go live)

---

## KNOWN ISSUES / WATCH LIST
- Scheme detail pages are static (built at deploy time) — adding new schemes to Firestore requires a new Cloudflare Pages deploy to pick them up
- Admin panel (`/admin`) is not indexed (robots.txt) but URL is publicly accessible — Firebase Auth is the only protection
- Calculator uses 80 years as assumed life expectancy for monthly pension estimate (hardcoded)
