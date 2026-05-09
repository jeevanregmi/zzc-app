# ZZC MASTER CONTEXT
## Zeneration Z Chautari — Session State Document
Last Updated: May 9, 2026 | Session 4 Complete

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
├── scripts/
│   ├── epfDatabase.json    — 10 EPF schemes
│   ├── citDatabase.json    — 7 CIT schemes
│   └── ssfDatabase.json    — 9 SSF schemes
├── PROJECT_BIBLE.md
└── ZZC_MASTER_CONTEXT.md   (this file)
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
1. **Connect GitHub → Cloudflare Pages auto-deploy** (settings → Git integration)
2. **AI Recommendation Engine** — "Which scheme is best for me?" quiz flow
3. **Portfolio Simulator** — track hypothetical investments over time
4. **More schemes** — NEPSE (mutual funds), Beema Samiti (insurance products)
5. **First 100 users** — share in Nepali Facebook groups, LinkedIn
6. **eSewa / Khalti** integration (Phase 3 consultancy payments)

---

## KNOWN ISSUES / WATCH LIST
- Scheme detail pages are static (built at deploy time) — adding new schemes to Firestore requires a new Cloudflare Pages deploy to pick them up
- Admin panel (`/admin`) is not indexed (robots.txt) but URL is publicly accessible — Firebase Auth is the only protection
- Calculator uses 80 years as assumed life expectancy for monthly pension estimate (hardcoded)
