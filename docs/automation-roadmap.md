# ZZC Automation Roadmap

**From: manual founder operations  
To: AI-assisted, self-maintaining intelligence platform**

---

## Automation Layers

```
Layer 1: Content Automation       (AI generates, founder approves, platform publishes)
Layer 2: Data Automation          (Scheduled ingestion of public Nepal financial data)
Layer 3: Monitoring Automation    (Deploy health, error rates, domain status)
Layer 4: Business Automation      (Cost tracking, budget alerts, ROI calculations)
Layer 5: Intelligence Automation  (AI-generated insights, research, weekly digests)
```

---

## Layer 1: Content Automation

### Current (Manual)
1. Founder has content idea
2. Opens AI Studio
3. Generates script + thumbnail prompt
4. Copies to video editing software
5. Records, edits, uploads manually

### Target (Semi-automated)
```
Content Idea (Vault → Ideas)
     │
     ▼
One-click: AI Studio → Generate Script + Thumbnail
     │
     ▼
Script approved → moved to "Scripting" status
     │
     ▼
Calendar auto-schedules slot
     │
     ▼
Post-publish: enter YouTube URL → auto-creates PublishingRecord
     │
     ▼
Analytics ingestion: views/CTR pulled weekly → shown in Content Pipeline
```

**Unlock requirements:** None — all existing infrastructure. Needs UI workflows.

### Future (Fully automated, Tier 2)
- `TOGETHER_API_KEY`: AI image generation for thumbnails
- `ELEVENLABS_API_KEY`: AI voice narration for script → audio
- Auto-upload to YouTube via YouTube Data API v3

---

## Layer 2: Data Automation

### Current
- 28 schemes: manually seeded in Firestore
- Market rates: hardcoded defaults (Nepal inflation 6.5%, base rate 5.5%)

### Phase 2 — Cloudflare Cron Worker
```
Schedule: Every Monday 6 PM NST

ingest-nrb-rates.ts:
  → fetch nrb.org.np/statistics/interest-rate
  → parse: base rate, deposit rate, lending rate
  → write to Firestore: staging/market_rates/{id}
  → flag for founder review in Vault → Deploy

ingest-cit-nav.ts:
  → fetch cit.com.np/nav
  → parse: NAV per unit, YTD return
  → write to Firestore: staging/market_rates/cit-nav
```

### Phase 3 — AI Diff Detection
```
compare-scheme-changes.ts:
  → fetch current EPF/SSF public rules page
  → compare against last-stored version (hash)
  → if changed: run Bedrock extraction
  → generate: "EPF interest rate changed: 8.5% → 9.0%"
  → write to Vault notification queue
```

**Unlock requirement:** Cloudflare Cron Triggers (free tier: 5 crons)

---

## Layer 3: Monitoring Automation

### Current
- Manual deploy via CLI
- No uptime monitoring
- No error rate visibility

### Phase 2 — Vault → Deploy section
```
Cloudflare Pages API polling (every 6 hours via Cron):
  → GET /client/v4/accounts/{id}/pages/projects/{project}/deployments
  → Show: latest commit, build time, status, environment
  → Alert: if latest deployment failed

Health checks (every 15 min via external service — UptimeRobot free):
  → /api/recommend       → expect 200
  → /api/generate-script → expect 200 (POST with test body)
  → zzc.jeevanregmi.com.np → expect 200
```

### Phase 3 — Error Rate Dashboard
```
Cloudflare Analytics API:
  → 4xx/5xx rates per route
  → Response time p95
  → Firewall blocks
```

**Unlock requirements:** Cloudflare API token (free), UptimeRobot account (free)

---

## Layer 4: Business Automation

### Phase 2 — Cost Alerts
```
After each AI Studio usage:
  → log to Firestore: ai_jobs/{id} with token count
  → Business BI: calculate monthly Bedrock spend
  → Alert if spend > configurable threshold
```

### Phase 3 — Revenue Tracking
```
Future payment integration (Stripe or local Nepal gateway):
  → webhook → functions/api/payment-webhook.ts
  → write to Firestore: revenue_entries/{id}
  → Business BI: auto-updates MRR, ARR, runway
```

---

## Layer 5: Intelligence Automation (Phase 3-4)

### Weekly Digest Generator
```
Every Sunday:
  → Collect: NRB rate changes, NEPSE movement, EPF/SSF updates
  → Bedrock: "Generate a weekly Nepal finance digest for Gen Z investors"
  → Output: draft article → Vault → Documents
  → Founder approves → publishes to /news/[slug]
```

### AI Research Assistant
```
Vault → Research section (future):
  → Founder enters query: "What did NRB say about NEPSE this month?"
  → System: fetch public NRB press releases → Bedrock synthesis
  → Returns: structured research brief
```

---

## Timeline

| Quarter | Automations |
|---------|------------|
| Q2 2026 (now) | Content workflow UI, AI Studio → Calendar link |
| Q3 2026 | NRB rate ingestion cron, deploy health monitoring |
| Q4 2026 | AI diff detection for schemes, weekly digest draft |
| Q1 2027 | Full content pipeline automation, Tier 2 AI (image/voice) |
| Q2 2027 | Revenue automation, multi-platform publishing API |

---

## Principles

- Every automation has a human approval step before writing to production Firestore
- Automation failures are silent (logged) not user-facing
- Each cron runs in ≤30 seconds (Cloudflare Worker CPU limit)
- Data freshness > data completeness — partial updates are fine
