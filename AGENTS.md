# ZZC Agent Instructions — Universal AI Working Rules

> This file is read by every AI coding assistant working in this repo:
> Claude Code, GitHub Copilot, Codex, Cursor, and future agents.
> Read it before writing any code.

---

## Mission

**ZZC (Zeneration Z Chautari)** is Nepal's civic intelligence infrastructure.

Two layers:
- **Public frontend** (`/`) — scheme discovery, calculators, Constitution Tree for citizens
- **Vault backend** (`/vault`) — Founder Intelligence Cockpit for uploading, extracting, approving, and publishing civic documents

The Founder (Jeevan Regmi) is the sole admin. The system must be:
- Nepali-first in language
- Cost-aware (every AI API call costs money)
- Quality-gated (AI output requires human approval before going public)

---

## Architecture at a Glance

| Layer | Technology |
|---|---|
| Framework | Next.js App Router (Cloudflare Pages via `@cloudflare/next-on-pages`) |
| Database | Firebase Firestore (ownerId-scoped security rules) |
| Auth | Firebase Auth (single owner account) |
| File Storage | Cloudflare R2 (documents), Firebase Storage (hero images) |
| API Functions | Cloudflare Pages Functions (`/functions/api/*.ts`) |
| AI Providers | Google Gemini Flash (primary), AWS Bedrock Sonnet (fallback), Anthropic |
| Deploy | GitHub Actions → Cloudflare Pages |
| Domain | `zzc.jeevanregmi.com.np` |

### Key Firestore Collections

| Collection | Purpose | Access Pattern |
|---|---|---|
| `vault_documents` | Uploaded civic documents | `where("ownerId", "==", uid)` |
| `constitutional_framework` | Layer 1 — constitution articles | `where("ownerId", "==", uid)` |
| `janta_intelligence` | Layer 2 — policy intelligence records | `where("ownerId", "==", uid)` |
| `janta_relationships` | Cross-document relationship graph | `where("ownerId", "==", uid)` |
| `civic_signals` | Live government signal feeds | `where("ownerId", "==", uid)` |
| `structuredSchemes` | Public scheme data | Public read |
| `market_rates` | Public financial rates | Public read |

**NEVER** query collections without `where("ownerId", "==", uid)` — Firestore rules will reject it.

### Phantom Collections (do not use)

These are defined in Firestore rules but **never written to** — do not read from or write to them:
- `constitutional_atoms`
- `constitutional_relationships`
- `vault_civic_atoms`

---

## Document Intelligence Pipeline

Every document goes through this exact sequence:

```
Upload → AI Analyze → Admin Review/Approve → Deep Extract → Relationship Match → Public Tree
```

Status fields in `vault_documents`:
- `processingStatus`: `ready` | `processing_ai` | `ai_ready` | `ai_paused` | `error`
- `adminApprovalStatus`: `pending_review` | `approved` | `needs_revision`

**Deep Extract** (janta_intelligence) only runs after `adminApprovalStatus === "approved"`.
Constitution extraction writes to `constitutional_framework`, not janta_intelligence.

---

## Coding Rules

### Next.js

- This uses Next.js App Router — read `node_modules/next/dist/docs/` for current API.
- All route handlers go in `app/` (not `pages/`). No `getServerSideProps`, no `getStaticProps`.
- Client components must have `"use client"` at the top.
- Cloudflare Pages requires `export const runtime = "edge"` on all API routes.

### TypeScript

- Run `npx tsc --noEmit` before every commit. Zero errors required.
- Never use `any` — use `unknown` with type guards, or specific interfaces.
- All Firestore reads cast data with `d.data() as Record<string, unknown>`.

### Firestore

- Every query MUST have `where("ownerId", "==", uid)` — no exceptions.
- Use `limit()` on all queries. Default: 200 for docs, 500 for framework/intel.
- Wrap parallel reads in `Promise.all` with individual `.catch()` fallbacks.
- Never write to phantom collections listed above.

### AI Calls

- **Cost check first** — before triggering any AI extraction, check if records already exist.
- Constitution extraction: 22 batch calls. Only run if `constitutional_framework` is empty for that doc.
- Deep Extract: only run on approved docs with zero intel count.
- Re-extract: requires explicit cost-guard confirmation in the UI.
- Use `ai_paused` (not `error`) when billing/quota fails — document must never be lost.

### UI

- Nepali is the primary language in `/vault` — English is secondary.
- Every metric card that shows 0 must explain WHY it is 0 and what to do.
- No dead zeros. No phantom collection counts.
- Max 5 cards in the CTO Assistant panel.
- `WorkflowGuide` component is available for step-by-step task flows.

---

## Safety and Cost Rules

| Action | Rule |
|---|---|
| AI Analyze | Check `processingStatus !== "processing_ai"` first |
| Constitution Extract | Check if framework records already exist for that docId |
| Deep Extract | Check `adminApprovalStatus === "approved"` AND intel count === 0 |
| Re-Extract | Must show cost warning modal; never trigger silently |
| Delete | Always confirm with user; never delete without consent |
| Push to main | Only via GitHub Actions CI — never force-push |
| Firestore rules | Never modify `firestore.rules` without reviewing security impact |

---

## What NOT to Do

- Do not use `getServerSideProps` or `getStaticProps` — App Router only.
- Do not query Firestore without `ownerId` filter.
- Do not read from `constitutional_atoms`, `constitutional_relationships`, `vault_civic_atoms`.
- Do not trigger AI calls without checking if already done.
- Do not create new Firestore collections without adding them to `firestore.rules`.
- Do not add optimistic UI without a rollback path.
- Do not write `any` types.
- Do not skip `tsc --noEmit` before committing.
- Do not use Firebase Storage for document files — R2 only (documents). Firebase Storage is for hero images only.
- Do not amend commits already pushed to main.

---

## Deploy Workflow

```bash
# 1. Verify TypeScript
npx tsc --noEmit

# 2. Commit
git add <specific files>
git commit -m "feat/fix/chore: description"

# 3. Push — triggers GitHub Actions auto-deploy to Cloudflare Pages
git push origin main
```

GitHub Actions deploys to `zzc.jeevanregmi.com.np` automatically on push to `main`.

---

## Testing Checklist

Before marking any task complete:

- [ ] `npx tsc --noEmit` passes with 0 errors
- [ ] All Firestore queries have `ownerId` filter
- [ ] No phantom collections read/written
- [ ] AI actions have cost guards
- [ ] Zero metric cards in the UI (if any added)
- [ ] Nepali-first language in all vault UI text
- [ ] WorkflowGuide used for any new multi-step admin flow

---

## Current Priorities (as of 2026-05-26)

1. **PartNumber Repair** — existing constitution records may have `partNumber=0`; Repair button is on `/vault/constitution`
2. **Document govFolder classification** — new uploads should have `govFolder` set; library view in Documents uses it
3. **CTO Assistant** — Founder Intelligence Cockpit, always visible in `/vault`
4. **Branch Health** — no dead zeros; metric cards explain source and next action
5. **QA on live data** — 10 real documents analyzed before new features

See `docs/ROADMAP.md` for full priority list.
