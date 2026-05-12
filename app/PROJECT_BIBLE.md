# ZENERATION Z CHAUTARI (ZZC)
## Project Bible — Version 7.0
Last Updated: May 12, 2026 | Session 7 ACTIVE

---

## OWNER
- **Name**: Jeevan Regmi, 27 years
- **Education**: BBA Finance, KU School of Management (2022) — CGPA 3.45
- **Current**: Junior Assistant Probation — Global IME Bank (Oct 2, 2025)
- **Email**: jeevanregmi15@gmail.com
- **Working Hours**: Evenings after 7PM + Weekends

---

## PLATFORM

**ZZC = Nepal's fintech education platform + internal company OS, all in one.**

- **Live**: https://zzc.jeevanregmi.com.np
- **Hosting**: Cloudflare Pages — `zeneration-z-chautari`
- **Firebase**: zeneration-z-chautari (Spark plan)
- **GitHub**: https://github.com/jeevanregmi/zzc-app

### The Two Sides
| Side | Routes | Purpose |
|------|--------|---------|
| Public | `/`, `/scheme/*`, `/calculator`, `/compare`, `/eligibility`, `/recommend` | Nepal fintech education for young investors |
| Vault / Admin OS | `/vault/*` | Internal operating system — content, media, intelligence, BI |

---

## TECH STACK

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.2.6 (Turbopack, App Router) |
| Output | Static export (`output: "export"`) |
| Styling | Tailwind CSS v4 |
| Language | TypeScript, React 19 |
| Auth/DB/Storage | Firebase (Firestore + Auth + Storage) |
| Hosting | Cloudflare Pages |
| Server-side | Cloudflare Pages Functions (`functions/api/`) |
| AI engine | AWS Bedrock Claude + Anthropic API |
| Charts | Recharts |

---

## PHASE STATUS

| Phase | Name | Status |
|-------|------|--------|
| 1 | Education Website | COMPLETE |
| 2 | Investment Game | 90% complete |
| 3 | Consultancy | 45% complete |
| 4 | Launch | Active |
| 5 | Intelligence OS | Phase 1 LIVE |

---

## COMPLETED SYSTEMS

### Public Side
- ✅ 29+ Nepal financial schemes (EPF/CIT/SSF/NEPSE/Beema)
- ✅ Scheme detail pages (SSG, 29 static pages)
- ✅ Financial calculator (6 tabs: SIP, retirement, loan EMI, risk, health, portfolio)
- ✅ Master comparison table (all 29+ schemes)
- ✅ Eligibility checker (employment type → recommended schemes)
- ✅ AI scheme recommendation wizard (3-step → Claude via Bedrock)
- ✅ SEO: per-page metadata, JSON-LD, sitemap, robots.txt
- ✅ Full Nepali UI (`lang="ne"`)
- ✅ Daily rate scraper (GitHub Actions → Firestore market_rates)

### Vault / Admin OS
- ✅ VaultGate — Firebase Auth, single-owner login
- ✅ VaultShell — OS-style grouped sidebar nav (12 sections)
- ✅ Content Pipeline — track content status
- ✅ AI Studio — script generator + thumbnail prompt generator
- ✅ Media Library — upload, tag, organize (Firebase Storage)
- ✅ Business BI — revenue, expenses, AI costs, KPIs
- ✅ Intelligence Documents Library (Phase 1):
  - Drag-drop upload (PDF/DOCX/TXT/MD/images)
  - Firebase Storage backing + Firestore metadata
  - Real-time grid with search + category filter
  - DocumentCard with AI status badges
  - DocumentViewer (PDF iframe, image, text preview)
  - AI-ready fields (`processingStatus`, `aiSummary`, `aiKeyInsights`)

---

## NEXT PRIORITIES

### Immediate
1. **AWS IAM keys** → set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1` in Cloudflare Pages env vars → AI /recommend goes live
2. **Firestore indexes** → `firebase deploy --only firestore:indexes` (deploy `firestore.indexes.json`)
3. **Custom domain confirm** → Cloudflare Pages → Custom Domains → `zzc.jeevanregmi.com.np`

### Phase 2 — AI Document Processing
- `functions/api/process-document.ts` — Claude analyzes uploaded doc → populates aiSummary, aiKeyInsights
- "Process with AI" button on DocumentCard
- Status flow: `ready → processing_ai → ai_ready`

### Phase 3 — Intelligence Topics Dashboard
- `/vault/content/intelligence` — 3-column: Source Signals → Topics → Content Ideas
- New collections: `intelligence_topics`, `source_signals`, `content_ideas`
- See `docs/ai-content-intelligence-architecture.md` for full design

### Phase 4 — AI Content Idea Generator
- Feed intelligence topics → AI proposes YouTube titles, hooks, scripts
- AI Studio receives pre-filled outline from content_idea

---

## OPERATIONAL PHILOSOPHY

**ZZC is building a credibility-first media brand in Nepal's underserved fintech education space.**

Core beliefs:
- One high-quality, sourced video beats ten AI-generated spam posts
- Human verification is the brand moat — AI assists, Jeevan publishes
- The vault is the brain; the public site is the face
- The intelligence library is the long-term competitive advantage

---

## SESSION LOG

| Session | Date | Key Output |
|---------|------|-----------|
| 4 | May 9, 2026 | Firebase live, 26 schemes, Nepali UI, domain, SEO |
| 5 | May 10, 2026 | lib/schemes-data.ts, live rates, daily scraper, compare rewrite |
| 6 | May 12, 2026 | Two-sided architecture, VaultShell OS nav, vault stubs, Link fixes |
| 7 | May 12, 2026 | Intelligence Documents Library (Phase 1 complete + deployed) |

---

## KNOWN LIMITATIONS

| Limitation | Impact | Fix When |
|-----------|--------|----------|
| Scheme pages are static | New schemes need redeploy | Phase 3 (ISR not possible without edge runtime) |
| AWS Bedrock keys not set | /recommend AI fails silently | Immediate |
| Firestore indexes not deployed | intelligence_docs queries may fail | Immediate |
| Vault URL accessible without auth | VaultGate shows login form (not 404) | Acceptable for now |
| Firebase Spark plan limits | Storage/reads have quotas | Review June 4, 2026 |
| AI doc processing not built | Documents sit at "Ready" | Phase 2 |
