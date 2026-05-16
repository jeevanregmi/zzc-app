# ZZC — Current State

Last updated: 2026-05-16

## Platform

**Live:** https://zzc.jeevanregmi.com.np
**Repo:** https://github.com/jeevanregmi/zzc-app (branch: main)
**Cloudflare project:** `zeneration-z-chautari`

## Architecture

ONE domain, TWO sides:
- `/` → Public fintech education (Nepal Gen Z investors)
- `/vault/*` → Private admin OS (founder only, Firebase auth-gated)

Stack: Next.js 16.2.6 (static export) + Cloudflare Pages + Firebase + Anthropic API + AWS Bedrock

## API Workers (functions/api/)

| Worker | Provider | Model | Status |
|---|---|---|---|
| recommend.ts | Anthropic direct | claude-opus-4-7 | Live |
| ingest-url.ts | Anthropic direct | claude-haiku-4-5-20251001 | Live |
| process-document.ts | Anthropic direct | claude-sonnet-4-6 | Live |
| generate-content-idea.ts | Anthropic direct | claude-haiku-4-5-20251001 | Live |
| generate-script.ts | AWS Bedrock | us.anthropic.claude-sonnet-4-6 | Live (quota resets daily) |
| generate-thumbnail-prompt.ts | AWS Bedrock | us.anthropic.claude-sonnet-4-6 | Live (quota resets daily) |

## Intelligence Pipeline

```
URL → /api/ingest-url → source_signals (raw)
     → admin validates → /vault/content/intelligence
     → "Generate Content Idea" → /api/generate-content-idea → vault_content_queue
     → admin approves → /vault/content/queue
     → "Open in AI Studio" → /vault/content/ai-studio
     → /api/generate-script (Bedrock) → script
```

## Completed (2026-05-16 session)

- AWS credentials rotated (old key AKIAR7DD6R6VA3PLANWC deleted)
- Bedrock inference profile fixed: us.anthropic.claude-sonnet-4-6
- Task 3A: scripts/poll-monitored-sources.js + hourly GitHub Actions cron
- Task 5A: lib/vault/scheme-routing.ts (signal → scheme routing, deterministic)
- vault/brain/ created (this directory)

## Active Blockers

- Bedrock 429 (daily quota) — resets tomorrow, not a code issue

## Next Priorities

See roadmap/next-30-days.md
