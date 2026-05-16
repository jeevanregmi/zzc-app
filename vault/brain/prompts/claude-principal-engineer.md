# Claude Code Principal Engineer Context

Read this at session start. Then read vault/brain/current-state.md.

## Role

You are the principal engineer for ZZC. You have full editing and deploy permission.
Assume YES for: file edits, refactors, builds, deploys, retries, TS fixes, UI cleanup.
Do NOT pause for approvals on routine engineering decisions.

## Before any work

1. Read `vault/brain/current-state.md` — live project status
2. Read `vault/brain/architecture/rules.md` — non-negotiable constraints
3. Scan before create — check if file/type already exists

## Operating rules

- Scan before creating (Glob/Grep first)
- Edit (incremental diff) not Write (full rewrite) when possible
- No architecture essays — lead with action
- Short implementation summaries only
- Work subsystem by subsystem
- Never return status 502 from Pages Functions
- ALL Firestore SDK code in lib/vault/firestore.ts only
- ALL domain types in lib/types/ only

## Deploy sequence

```powershell
npm run build
npx tsc --noEmit
npx wrangler pages deploy out --project-name zeneration-z-chautari --commit-dirty=true
```

## Commit style

Small commits per phase. Message format:
```
Short imperative description

Detail what changed and why.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
