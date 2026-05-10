# ZENERATION Z CHAUTARI (ZZC)
## Project Bible — Version 5.0
Last Updated: May 10, 2026 | Session 5 In Progress

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
- Phase 2 Investment Game: 85% complete
- Phase 3 Consultancy: 40% complete
- Phase 4 Launch: Planned

## NEXT PRIORITIES
- Deploy latest game.html
- eSewa/Khalti payment integration
- Firebase security rules (before June 4, 2026!)
- SEO meta tags
- First 100 users
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

## SESSION 5 — May 10, 2026 (In Progress)

### AWS Bedrock Setup:
- AWS Account ID: 190777960247
- IAM User: zzc-bedrock-user (AmazonBedrockFullAccess policy)
- Region: us-east-1 (N. Virginia)
- Target model: anthropic.claude-sonnet-4-6
- Use case submitted to Anthropic for model access
- Status: Awaiting access grant + IAM key creation

### AI Recommendation Engine Built:
- `/recommend` page — 3-step wizard (Age → Income → Risk appetite)
- Cloudflare Pages Function: `functions/api/recommend.ts`
- SDK: @aws-sdk/client-bedrock-runtime (InvokeModelCommand)
- wrangler.toml: nodejs_compat flag added
- "AI सिफारिस" nav link added
- Deployed — goes live once Cloudflare env vars set

### Remaining Steps:
1. Create access keys for zzc-bedrock-user in IAM console
2. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION=us-east-1 in Cloudflare Pages dashboard
3. Once model access approved, update MODEL_ID in functions/api/recommend.ts to anthropic.claude-sonnet-4-6
4. Redeploy and test live at zzc.jeevanregmi.com.np/recommend

### Next Priorities:
- Complete AI Recommendation Engine go-live
- Portfolio Simulator
- More schemes (NEPSE mutual funds, Beema Samiti)
- First 100 users campaign