@AGENTS.md

# ZZC Claude Code Working Memory

This file is Claude Code's active working memory for the ZZC project.
AGENTS.md (above) has architecture, rules, and safety constraints — read it first.
This file has current context, founder preferences, and session continuity.

---

## Project Identity

- **Name**: ZZC — Zeneration Z Chautari
- **Founder**: Jeevan Regmi (sole admin, sole user of `/vault`)
- **Domain**: `zzc.jeevanregmi.com.np`
- **Repo**: `github.com/jeevanregmi/zzc-app`
- **Stack**: Next.js App Router + Firebase + Cloudflare Pages + R2

---

## Core System Philosophy

ZZC is a **perpetual civic intelligence operating system** — not a minimal SaaS dashboard.
It is designed like a city: many districts, rooms, and layers — all connected to one atom graph.
See `docs/ARCHITECTURE_PHILOSOPHY.md` for the full city blueprint.

### The ONE Brain Principle (absolute, non-negotiable)

**Outputs can multiply. Intelligence must remain singular.**

All civic intelligence lives in:
- `constitutional_framework` (Layer 1 — static)
- `janta_intelligence` (Layer 2 — dynamic)
- `janta_relationships` (graph edges)
- `vault_documents` (source material)

Everything else — media atoms, campaigns, feeds, timelines, modes — **references** these collections. Never duplicates them.

- New Firestore collection? → must reference atoms, not store intelligence independently
- New AI pipeline? → must extract to existing collections, not create parallel stores
- New page? → must discover or express patterns from the existing atom graph

### Open-Armed Architecture (encouraged)

New rooms, layers, and organizational systems are WELCOME.

ZZC should grow toward: **Notion + Bloomberg + Civic OS + Knowledge Warehouse + AI Studio**

Planned rooms (not yet built — see `docs/ARCHITECTURE_PHILOSOPHY.md`):
- `civic_campaigns` — first-class civic missions, not lightweight playlists
- Signal Center — live government monitoring
- Research Lab — cross-document pattern discovery
- Election/Crisis/Archive modes — runtime context switching
- Relationship explorer — visual atom graph navigation
- AI Copilot Studio — LLM reasoning layer on top of rule engine

These are not fragmentation. They are organized expression of the same atom graph.
Fear only: intelligence duplication, disconnected pipelines, orphaned data.

### QA Stability (current sprint constraint)

Until 10 real documents have passed through the full pipeline (ROADMAP #4):
- Every new feature must be anchored to the existing atom graph
- No new AI pipelines that haven't been tested on real data
- Founder must run the QA sprint before building new expression layers on top

---

## Founder Preferences (non-negotiable)

1. **Nepali first** — all vault UI text in Nepali. English is secondary everywhere.
2. **No bloated dashboards** — every page must answer "what is happening / why it matters / what to do next."
3. **No dead zeros** — every 0 count must explain why and link to a fix.
4. **Guided workflows** — use `WorkflowGuide` for multi-step tasks.
5. **Cost-aware** — never trigger AI re-extraction without checking if already done.
6. **Lean code** — no premature abstractions, no unused state, no redundant comments.
7. **Scan before create** — always `Grep` for existing files before creating new ones.
8. **TypeScript strict** — zero errors before every commit.
9. **Founder Mode by default** — all vault UI uses plain Nepali language, not developer terms. Debug Mode is behind a toggle.
10. **No panic colors** — amber for warnings, red only for critical. Calm and strategic, not alarming.

---

## Founder Mode / Debug Mode

- **Founder Mode** (default): simplified Nepali language, no collection names, guided UI, destructive actions hidden
- **Debug Mode**: raw collection names, snapshot fields, insight IDs, Dedup/Delete All buttons exposed
- Toggle lives in sidebar (below Learning Mode toggle). Persisted in `zzc_vault_mode` localStorage.
- Context: `contexts/FounderModeContext.tsx` → `useFounderMode()` hook

---

## Current System State (as of 2026-05-26)

### Intelligence Pipeline (Layer 1 + Layer 2)
- **Document upload** — R2 storage, Firestore metadata (`vault_documents`), AI analysis
- **Constitution extraction** — 22 batch API calls → `constitutional_framework` (Layer 1, static)
- **Janta Intelligence** — deep extract from approved docs → `janta_intelligence` + `janta_relationships` (Layer 2, dynamic)
- **Admin Vault** — review + approval gate before Intelligence is extracted
- **Branch Health** — per-part metrics from `constitutional_framework` and `janta_intelligence`

### Public Outputs
- **Janta public page** — story cards with TTS, timeline view, sector colors, Nepali dates
- **Constitution Tree** — public `/constitution` page

### Founder Tools
- **CTO Assistant** — Founder Cockpit floating dock in all `/vault` pages (rule-based, no LLM)
- **WorkflowGuide** — reusable step-by-step task guide
- **Document Library** — `govFolder`-grouped view

### Known gaps (in-progress):
- `DocumentUploadModal` does not yet have `govFolder` picker
- `FounderGuidancePanel` upload links don't pass `govFolder` URL params yet
- QA sprint: 10 real documents through full pipeline (ROADMAP #4) — in progress

### Phantom collections (never use):
- `constitutional_atoms` — defined in rules, never written. Do not read.
- `constitutional_relationships` — same.
- `vault_civic_atoms` — same.

---

## Architecture Constraints

### Firestore query pattern (mandatory):
```typescript
getDocs(query(
  collection(db, "collection_name"),
  where("ownerId", "==", uid),
  limit(200),
))
```

### Error handling pattern (mandatory):
```typescript
const safe = <T,>(p: Promise<T>, fb: T): Promise<T> => p.catch(e => {
  console.warn("[component] read failed:", e?.code ?? e);
  return fb;
});
```

### AI status state machine:
```
ready → processing_ai → ai_ready → (admin approves) → approved
                      ↓
                   ai_paused (billing fail — document SAFE, never lost)
```

### Two-layer model (immutable):
- **Layer 1**: `constitutional_framework` — static, extracted once from Constitution PDF
- **Layer 2**: `janta_intelligence` — dynamic, extracted from each approved government document
- **Expression layer** (future): `media_atoms` — references Layer 1/2 atoms, never duplicates them

---

## Portability

ZZC is designed to be device-independent. See `docs/PORTABILITY.md` for full audit.

- All user data: Firestore + R2 (cloud)
- All code: GitHub (cloud)
- Secrets: Cloudflare Pages env vars + GitHub Actions Secrets → see `docs/ENV_TEMPLATE.md`
- New device setup: ~20 minutes (`git clone` + `npm install` + `.env.local` from Bitwarden)

**Stage 1 (immediate):** Copy all secrets to Bitwarden. Done: `docs/ENV_TEMPLATE.md` exists.

---

## Key Component Locations

| Component | File |
|---|---|
| Vault shell + sidebar | `components/vault/VaultShell.tsx` |
| Founder Mode context | `contexts/FounderModeContext.tsx` |
| CTO Assistant (cockpit) | `components/vault/CTOAssistant.tsx` |
| CTO rule engine | `lib/vault/ctoEngine.ts` |
| CTO insights hook | `hooks/vault/useCTOInsights.ts` |
| Session tracker hook | `hooks/vault/useSessionTracker.ts` |
| Workflow guide | `components/vault/WorkflowGuide.tsx` |
| Document upload modal | `components/vault/documents/DocumentUploadModal.tsx` |
| Document card | `components/vault/documents/DocumentCard.tsx` |
| Branch health page | `app/vault/constitution/health/HealthDebugClient.tsx` |
| Constitution admin | `app/vault/constitution/ConstitutionAdminClient.tsx` |
| Documents page | `app/vault/documents/DocumentsClient.tsx` |
| Firestore helpers | `lib/vault/firestore.ts` |
| Document types | `lib/types/documents.ts` |
| Framework types | `lib/types/constitutional-framework.ts` |

---

## Deploy Workflow

```bash
# 1. Type check — must be zero errors
npx tsc --noEmit

# 2. Stage specific files (never git add -A)
git add <files>

# 3. Commit
git commit -m "feat/fix/docs: description"

# 4. Push — GitHub Actions auto-deploys to Cloudflare Pages
git push origin main
```

**Never** force-push to main. **Never** skip the type check.

---

## Session Continuity Rules

When context is compacted or a new session starts:
1. Re-read this file + AGENTS.md
2. `git status` — see uncommitted work
3. `npx tsc --noEmit` — confirm zero errors
4. `docs/ROADMAP.md` — current priorities
5. `docs/RUNBOOK.md` — operational procedures
6. `docs/ENV_TEMPLATE.md` — if secrets are involved

---

## What NOT to Build (Deferred)

- Media Atom Engine UI — design in `docs/MEDIA_ATOM_ENGINE.md`; build after QA sprint + stable pipeline
- Math Verification Vault — future, after calculator is stable
- Taxonomy Governance — AI tag suggestions need admin review gate first
- Social Membership System — manual ID verification not worth it at current scale
- Open signups — never. Single founder/admin only.
- Generic LLM chatbot in vault — not the goal. Rule-based CTO engine first.
- Any new Firestore collection that duplicates existing intelligence atoms
