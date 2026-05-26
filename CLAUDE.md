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

## Founder Preferences (non-negotiable)

1. **Nepali first** — all vault UI text in Nepali. English is secondary everywhere.
2. **No bloated dashboards** — every page must answer "what do I do next?"
3. **No dead zeros** — every 0 count must explain why and link to a fix.
4. **Guided workflows** — use `WorkflowGuide` for multi-step tasks.
5. **Cost-aware** — never suggest AI re-extraction without checking if already done.
6. **Lean code** — no premature abstractions, no unused state, no redundant comments.
7. **Scan before create** — always `Grep` for existing files before creating new ones.
8. **TypeScript strict** — zero errors before every commit.

---

## Current System State (as of 2026-05-26)

### What exists and works:
- **Document upload pipeline** — R2 storage, Firestore metadata, AI analysis
- **Constitution extraction** — 22 batch API calls, `constitutional_framework` collection
- **Janta Intelligence** — `janta_intelligence` + `janta_relationships` collections
- **Admin Vault** — document review + approval gate
- **Branch Health** — per-part metrics from `constitutional_framework` and `janta_intelligence`
- **Janta public page** — story cards with TTS, timeline view, sector colors, Nepali dates
- **CTO Assistant** — Founder Cockpit floating dock in all `/vault` pages
- **WorkflowGuide** — reusable step-by-step workflow component
- **Document Library** — `govFolder`-grouped view in Documents page

### Known issues / in-progress:
- Existing constitution records may have `partNumber=0` — Repair button on `/vault/constitution`
- `DocumentUploadModal` does not yet have `govFolder` picker
- `FounderGuidancePanel` upload links don't pass `govFolder` params yet

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

### Two-layer model:
- **Layer 1**: `constitutional_framework` — static, extracted once from Constitution PDF
- **Layer 2**: `janta_intelligence` — dynamic, extracted from each government document

---

## Key Component Locations

| Component | File |
|---|---|
| Vault shell + sidebar | `components/vault/VaultShell.tsx` |
| CTO Assistant (cockpit) | `components/vault/CTOAssistant.tsx` |
| CTO rule engine | `lib/vault/ctoEngine.ts` |
| CTO insights hook | `hooks/vault/useCTOInsights.ts` |
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
git commit -m "feat: description"

# 4. Push — GitHub Actions auto-deploys to Cloudflare Pages
git push origin main
```

**Never** force-push to main. **Never** skip the type check.

---

## Session Continuity Rules

When context is compacted or a new session starts:
1. Re-read this file + AGENTS.md
2. Check `git status` to see uncommitted work
3. Check `npx tsc --noEmit` for errors before starting
4. Check `docs/ROADMAP.md` for current priorities
5. Check `docs/RUNBOOK.md` for operational procedures

---

## What NOT to Build (Deferred)

- Math Verification Vault — admin-verified calculator QA (future)
- Taxonomy Governance — AI taxonomy needs admin review gate (future)
- Social Membership System — contributor requests, manual ID verification (future)
- Open signups — never. Single founder/admin only.
- Generic LLM chatbot in vault — not the goal. Rule-based CTO engine first.
