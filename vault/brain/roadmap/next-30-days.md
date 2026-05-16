# Next 30 Days — ZZC Roadmap

Last updated: 2026-05-16

## Priority Order

1. Stable production deployment
2. Public UX quality (Nepal audience = mostly mobile)
3. Calculator excellence
4. Vault UX continuity
5. Business intelligence / analytics
6. Content/distribution systems
7. Monetization (later)

## Immediate Queue (this week)

| Task | Status | Notes |
|---|---|---|
| Bedrock model fix | Done | us.anthropic.claude-sonnet-4-6 |
| AWS credential rotation | Done | Old key deleted |
| Task 3A: monitored source cron | Done | Hourly GitHub Actions |
| Task 5A: signal→scheme routing | Done | routeSignalToSchemes() |
| Phase 1: vault/brain memory | Done | This directory |
| Phase 2: AI provider abstraction | In progress | lib/ai/providers/ |
| Phase 3: Vault observability | Pending | System status page |
| Phase 4: Scheme routing in UI | Pending | Intelligence signal cards |

## Next Up

| Task | Description |
|---|---|
| Task 3B | Auto content-brief from cron signals (gate on Bedrock quota stable) |
| Task 5B | AI-enriched scheme routing (confidence scoring via Claude) |
| Monitored source scheduler | Frontend to manage cron frequency per source |
| Vault analytics dashboard | Signal volume, content pipeline funnel, AI costs |
| Public email capture | audience_leads → welcome sequence |
| Calculator improvements | SIP, loan, retirement — accuracy audit |
| Mobile UX audit | Public pages on mobile viewport |

## Later (Month 2-3)

- Revenue tracking in vault BI
- Content calendar with publish dates
- AI cost dashboard (tokens used per worker)
- Scheme comparison tool improvements
- SSF/EPF eligibility checker (public)
- Monetization experiments

## Architecture Governance

- Math verification vault (admin-verified calculator QA) — do not implement until Phase 6 complete
- Taxonomy governance (AI suggestions → admin review) — do not implement until Phase 6 complete
- No new paid APIs without founder instruction
