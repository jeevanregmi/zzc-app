# ZENERATION Z CHAUTARI (ZZC)
## Project Bible — Version 6.0
Last Updated: May 10, 2026 | Session 5 COMPLETE

## OWNER
- Name: Jeevan Regmi, 27 years
- Education: BBA Finance, KU School of Management (2022) — CGPA 3.45
- Current: Junior Assistant Probation — Global IME Bank (Oct 2, 2025)
- Email: jeevanregmi15@gmail.com
- Working Hours: Evenings after 7PM + Weekends

## WEBSITE
- Live: https://zzc.jeevanregmi.com.np
- Hosting: Cloudflare Pages — zeneration-z-chautari
- Firebase: zeneration-z-chautari (Spark plan)

## PHASE STATUS
- Phase 1 Education Website: COMPLETE
- Phase 2 Investment Game: 90% complete
- Phase 3 Consultancy: 45% complete
- Phase 4 Launch: Active

## NEXT PRIORITIES
1. AI Recommendation Engine go-live — set AWS IAM keys in Cloudflare env vars + update MODEL_ID
2. Switch recommend.ts from AWS Bedrock → Anthropic API directly (simpler, no AWS needed)
3. Portfolio Simulator — track hypothetical investments over time
4. More schemes — NEPSE mutual funds, Beema Samiti products
5. First 100 users — share in Nepali Facebook groups, LinkedIn
6. eSewa/Khalti payment integration (Phase 3)
7. Firebase security rules audit (before June 4, 2026!)
## SESSION 4 — May 9, 2026 (MAJOR SESSION)

### Completed Today:
- Claude Code v2.1.138 setup — Sonnet 4.6 — Claude Pro
- Firebase config fixed (zzc-finance → zeneration-z-chautari)
- Email/Password Auth enabled in Firebase
- Admin user created: jeevanregmi15@gmail.com
- Firestore security rules updated (no expiry)
- 26 schemes uploaded: EPF(10) + CIT(7) + SSF(9)
- Next.js app built (out/ folder — 318 files)
- Deployed to Cloudflare Pages — zeneration-z-chautari
- Live URL: https://8ac74f4e.zeneration-z-chautari.pages.dev
- Custom domain: zzc.jeevanregmi.com.np — LIVE
- Entire website converted to Nepali language
- SEO meta tags + sitemap.ts + robots.ts added
- Google Search Console — Request Indexing done
- Old project (zeneration-z-chautarii double i) deleted

### Current Tech Stack:
- Framework: Next.js 16.2.6 (Turbopack)
- Hosting: Cloudflare Pages
- Database: Firebase Firestore (zeneration-z-chautari)
- Auth: Firebase Email/Password
- Domain: zzc.jeevanregmi.com.np
- AI: AWS Bedrock — Claude Sonnet (anthropic.claude-sonnet-4-6)
- Deploy command: npx wrangler pages deploy out --project-name=zeneration-z-chautari --commit-dirty=true --commit-message="..."

### Phase Status Update:
- Phase 1 Education Website: 100% COMPLETE
- Phase 2 Investment Game: 85% complete
- Phase 3 Consultancy: 40% complete
- Phase 4 Launch: In progress

### Next Priorities (after Session 4):
- Scheme detail page ID bug fix ✓
- AI Recommendation Engine — built, pending AWS credential setup
- Portfolio Simulator
- More schemes add (NEPSE, Beema)
- GitHub repo connect for auto-deploy

---

## SESSION 5 — May 10, 2026 (COMPLETE)

### AWS Bedrock Setup (early session):
- AWS Account ID: 190777960247
- IAM User: zzc-bedrock-user (AmazonBedrockFullAccess policy)
- Region: us-east-1 (N. Virginia)
- Target model: anthropic.claude-sonnet-4-6
- Use case submitted; awaiting model access grant
- Cloudflare env vars still need setting (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION)

### Single Source of Truth — lib/schemes-data.ts:
- Created `lib/schemes-data.ts` with 29+ schemes fully typed (TypeScript)
- Exports: SCHEMES, INVESTMENT_SCHEMES, LOAN_SCHEMES, INSURANCE_SCHEMES, PENSION_SCHEMES
- Exports: getByCategory(), SSF_SECTOR_RATES, SSFSectors interface
- All scheme detail pages, compare page, and recommend prompts now use this file

### Scheme Data Accuracy (CIT/SSF/EPF live rates):
- CIT rates corrected from all-9% placeholder to real scraped rates:
  - Citizens Unit Scheme: 5% individual / 3.5% corporate
  - ESGRS/KBB: 3.75% (loan at 5.25%)
  - CIT Pension: 4.5%
  - Investors Retirement Fund: 2.75%
  - Home/Personal/Education loans: 7%, 7.25%, 7%
- SSF 4-sector rates added: Formal 31%, Informal 10.37%, Foreign 21.33%, Self-employment voluntary
- SSF loans updated: Home (5.85%, Rs 1.5Cr), Education (Rs 35L, 36mo), Special (80% retirement)
- EPF rates: Special Loan 5.75%, Home/Education Loan 7%, Provident Fund 8.5%

### Automated Scraper:
- `.github/workflows/update-rates.yml` — cron 12:15 UTC (6 PM NST)
- `scripts/scrape-rates.js` — EPF + SSF + CIT using cheerio
- Writes to Firestore: market_rates/epf, market_rates/ssf, market_rates/cit, market_rates/meta
- Secrets: FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID in GitHub repo

### Compare Page Rewrite:
- Replaced 2-4 item side-by-side picker with master filterable table
- All 29+ schemes visible simultaneously (rows = schemes, columns = indicators)
- Filter buttons: Category (Investment/Loan/Insurance/Pension) + Org (EPF/CIT/SSF/NEPSE/Beema)
- 12 columns: योजना (sticky), श्रेणी, संस्था, दर%, जोखिम, तरलता, सेवानिवृत्ति, स्वास्थ्य, बीमा, ऋण सीमा, न्यूनतम, विवरण
- Mobile: overflow-x-auto + min-w-[900px], color-coded rates/risk/liquidity

### Custom Slash Commands:
- `.claude/commands/update-memory-of-zzc.md` — session memory updater
- `.claude/commands/start-memory-of-zzc.md` — CTO briefing on session start
- .gitignore updated: allows .claude/commands/, blocks settings.local.json

### Deployed:
- Latest URL: https://f4e4382b.zeneration-z-chautari.pages.dev
- Live: https://zzc.jeevanregmi.com.np
- Git: all commits pushed to main (8ccb691)