# Architecture Rules — Non-Negotiable

These rules are enforced across all AI assistants and PRs. Do not deviate.

## Firestore

- ALL Firebase SDK code lives ONLY in `lib/vault/firestore.ts`
- Hooks and components import domain types only — never Firebase SDK types
- Every `onSnapshot` must return and call its unsubscribe function in useEffect cleanup

## Vault Auth

- `app/vault/layout.tsx` provides VaultGate + VaultShell for ALL vault routes
- Never add VaultGate or auth checks to individual vault sub-pages
- Individual vault pages render content only

## API Routes

- Server-side logic lives ONLY in `functions/api/` (Cloudflare Pages Functions)
- There are NO Next.js API routes — `output: "export"` means static only
- Never return `status: 502` from Pages Functions — Cloudflare intercepts and replaces body with HTML
- Use `status: 500` for upstream/provider errors instead

## Type System

- ALL domain type contracts live in `lib/types/`
- Never define domain types in hooks, components, or API workers
- Workers may define their own local request/response interfaces

## AI Providers

- Anthropic direct API: use `ANTHROPIC_API_KEY` env var
- AWS Bedrock: use `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION`
- Bedrock requires inference profile IDs, not base model IDs (e.g. `us.anthropic.claude-sonnet-4-6`)
- `recommend.ts` uses Anthropic direct — NOT AWS keys (documented after earlier confusion)

## Static Data

- `lib/data/taxonomy.ts` — 31 FinancialTopic entries, 6 sectors. Never stored in Firestore
- `lib/schemes-data.ts` — Nepal financial schemes. Read-only reference data
- Taxonomy IDs are permanent slugs — additive only, never delete or reuse

## Deployment

- NO GitHub auto-deploy. All deploys are manual:
  ```
  npm run build
  npx wrangler pages deploy out --project-name zeneration-z-chautari --commit-dirty=true
  ```
- Env vars are Cloudflare Pages secrets via `wrangler pages secret put` — never in wrangler.toml

## Security

- Never return credentials in API responses
- Never commit secrets to git
- Rotate credentials immediately after any plaintext exposure
- `CRON_SECRET` header pattern for internal cron-to-API auth

## Code Style

- No comments unless WHY is non-obvious
- No multi-paragraph docstrings
- Scan before create — check if file/type exists first
- Edit (diff) preferred over Write (full rewrite)
- No new paid APIs without explicit founder instruction
