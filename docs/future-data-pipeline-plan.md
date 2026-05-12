# ZZC Future Data Pipeline Plan

**Goal: Reduce manual scheme/rate maintenance. Automated ingestion from public sources.**

---

## Guiding Principles

- **Legal data only** — public government and regulatory sources
- **No scraping private/paywalled content** — only open APIs and public HTML
- **Human-in-the-loop for writes** — auto-collect, human-approve, then commit to Firestore
- **Incremental** — start with weekly rate checks, expand to richer datasets over time

---

## Public Data Sources (Nepal)

| Source | Data | Method | Cadence |
|--------|------|--------|---------|
| Nepal Rastra Bank (nrb.org.np) | Interest rates, forex, inflation | Public HTML / NRB API | Weekly |
| NEPSE (nepalstock.com.np) | Index, trading volume | Public HTML | Daily (future) |
| EPF (epfnepal.gov.np) | Contribution rules, interest rate | Public HTML | Quarterly |
| SSF (ssf.gov.np) | Scheme details, contribution rates | Public HTML | Quarterly |
| Beema Samiti (beemasamiti.gov.np) | Insurance premium tables | Public HTML | Quarterly |
| Ministry of Finance (mof.gov.np) | Budget, tax slabs | Public HTML | Annually |
| CIT (cit.com.np) | NAV, returns | Public HTML | Weekly |
| NRB Monetary Policy | Policy rate changes | Public PDF/HTML | Per release |

---

## Architecture: Ingestion Pipeline

```
Cloudflare Cron Trigger (scheduled Workers)
     │
     ▼
functions/api/ingest-*.ts
     │
     ├── Fetch public source (fetch() — no auth)
     ├── Parse HTML/JSON (using regex or basic DOM)
     ├── Normalize to ZZC schema
     ├── Write to Firestore: staging/{collection}/pending/{id}
     └── Trigger notification (future: Slack/email alert)
     
Founder review (Vault → Deploy/Data section)
     │
     ▼
Approve → move staging/{id} → production/{id}
     │
     ▼
Firestore production collection updated
```

---

## Cloudflare Cron Triggers

```toml
# wrangler.toml (future)
[[triggers.crons]]
crons = ["0 18 * * 1"]   # Every Monday 6 PM NST (UTC+5:45 = 12:15 UTC)

[[functions]]
name = "ingest-rates"
```

Cloudflare Pages supports cron triggers via `functions/_worker.ts` with `scheduled` event handler.

---

## Data Schema: market_rates

```typescript
// lib/types/market.ts
export interface MarketRate {
  id: string;                    // "nrb-base-rate-2026-05"
  source: "nrb" | "epf" | "ssf" | "cit" | "nepse";
  label: string;                 // "NRB Base Rate"
  value: number;                 // 5.5
  unit: "percent" | "points" | "npr";
  effectiveDate: string;         // "2026-05-01"
  fetchedAt: string;             // ISO timestamp
  approved: boolean;             // false until founder approves
}
```

---

## AI-Assisted Normalization

For unstructured public HTML (e.g., EPF press releases):

```typescript
// functions/api/normalize-scheme.ts
// Input: raw HTML from public source
// Process: Bedrock extract structured data
// Output: normalized SchemeData object → staging Firestore

const prompt = `
Extract the following fields from this government document:
- Scheme name
- Contribution rate (employer %)
- Contribution rate (employee %)
- Interest rate (%)
- Effective date
- Source URL

Document: ${rawHtml.slice(0, 4000)}

Return as JSON only.
`;
```

---

## Phase Rollout

### Phase 1 (Now — manual)
- Scheme data hardcoded in `lib/data/schemes.ts`
- Market rates: `market_rates` Firestore seeded manually
- Update trigger: founder runs seed script manually

### Phase 2 (3 months)
- Weekly cron: NRB base rate + CIT NAV ingestion
- Staging approval flow in Vault → Deploy section
- Alerts on rate changes >0.5%

### Phase 3 (6 months)
- Daily NEPSE index ingestion
- Quarterly EPF/SSF rule change monitoring
- AI diff detection: "EPF interest rate changed from 8.5% to 9%" → auto-draft update

### Phase 4 (12 months)
- Financial news aggregator (public RSS feeds from Nepal media)
- AI-generated weekly market digest for `/news` section
- Automated scheme comparison updates

---

## What NOT to Build

- No login/session scraping of government portals
- No scraping behind CAPTCHAs
- No storage of personal user data without consent
- No financial advice automation without clear disclaimers
