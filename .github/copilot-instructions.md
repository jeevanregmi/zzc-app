# GitHub Copilot Instructions — ZZC App

Read AGENTS.md first for the full architecture and rules. This file adds Copilot-specific guidance.

---

## Next.js App Router Rules

- All pages are in `app/` directory. Route handlers use `app/api/` pattern.
- **No Pages Router** — never suggest `pages/`, `getServerSideProps`, `getStaticProps`, `getInitialProps`.
- API routes need `export const runtime = "edge"` for Cloudflare Pages compatibility.
- Client components start with `"use client"` — do not suggest server-side data fetching in client components.
- Dynamic routes: `app/scheme/[id]/page.tsx`, not `pages/scheme/[id].tsx`.

## Firestore Rules

- **Always** include `where("ownerId", "==", uid)` on every query.
- Use `getDocs()` for one-time reads, `onSnapshot()` only when real-time is necessary.
- Cast data as: `d.data() as Record<string, unknown>` — never `d.data() as MyType` directly.
- Wrap queries: `getDocs(...).catch(err => { console.warn(...); return EMPTY_SNAP; })`.

## Cloudflare Pages Functions Rules

- Functions live in `/functions/api/*.ts`, not in `app/api/`.
- Cloudflare CPU limit: **30 seconds** per request. Long AI tasks must be chunked.
- If a response is not JSON (504/524 timeout), the function returned an HTML error page — always check `Content-Type` before calling `.json()`.
- R2 bucket binding is `VAULT_BUCKET` — check it exists before using.
- Never return `undefined` from a function — always return a `Response` object.

## No 502/504 Rule

- Cloudflare will kill requests after 30s. Never make synchronous AI calls on documents > 50 pages.
- Constitution extraction uses 22 sequential batch calls (14 articles each) — each is a separate request.
- Always handle timeout gracefully: save what's already saved, return a partial-success response.

## Cost-Aware AI Extraction

- Before calling any AI API, check if records already exist for that `sourceDocId`.
- Return early with existing data if count > 0 — never re-extract silently.
- Log estimated token cost to `vault_ai_usage` collection after every AI call.
- `ai_paused` status means billing failed — document is safe, never delete it.

## Founder Intelligence Cockpit Philosophy

- The Vault backend is a **living operating system**, not a static dashboard.
- Every page should answer: "What should the Founder do next?"
- Zero states must explain WHY and provide the next action — never show empty numbers.
- The `CTOAssistant` component (floating bottom-right) is the primary guidance layer.
- `WorkflowGuide` component provides step-by-step flows for multi-step tasks.

## Public Frontend vs Vault Backend

| Public (`/`) | Vault (`/vault`) |
|---|---|
| Nepali citizens | Founder / admin only |
| Scheme discovery, calculators | Document upload, AI analysis, approval |
| Constitution Tree (read-only) | Intelligence pipeline management |
| No auth required | Firebase Auth required |
| Fast, minimal JS | Feature-rich, data-heavy |

## Language Rules

- `/vault` pages: **Nepali first**, English secondary.
- All user-facing labels, placeholders, empty states, and tooltips should be in Nepali.
- Error messages: simple Nepali + technical detail in small print below.
- Public pages (`/`): Nepali primary, no toggle needed.

## Commit Style

```
feat: short description of new feature
fix: short description of bug fixed
chore: dependency update / config change
refactor: internal restructure, no behavior change
```

No emoji in commit messages. Co-authored with Claude when AI-assisted.
