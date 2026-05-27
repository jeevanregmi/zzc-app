# ZZC Management OS

> Version: 1.0 — Phase 1 design document
> Status: Spec / types only — no UI built yet
> Author: Jeevan Regmi + Claude Code
> Last updated: 2026-05-27

---

## Vision

ZZC should feel like running a small AI-assisted civic institution,
not debugging a developer dashboard.

The founder is the CEO and sole strategy lead.
AI Officers are specialized copilots, each reading the same backend brain.
The backend is the management command center.

This is how ZZC becomes scalable before hiring a real team.

---

## The ONE Brain Rule (non-negotiable)

**Departments are management views. Not separate brains.**

Every AI Officer reads from the same `CopilotContext` engine (`lib/vault/copilotContext.ts`).

```
CopilotContext (ONE source of truth)
    ↓
Department briefings (8 views, same data)
    ↓
Founder Work Cycle (prioritized daily/weekly route)
    ↓
Tasks + Decisions (what to do, in what order)
```

No department stores its own intelligence.
No officer has its own Firestore reads.
No parallel data pipelines.

Management OS is an organization layer on top of existing atom graph.

---

## Departments

### 1. Intelligence Department
**Mission:** Ensure civic documents flow cleanly from upload to intelligence.

**Handles:**
- vault_documents (upload, analyze, approve pipeline)
- janta_intelligence (deep extraction)
- janta_relationships (cross-document graph)
- constitutional_framework (Layer 1 health)
- civic_signals (live signal feed)

**AI Officer:** Chief Intelligence Officer (CIO)
**Primary KPIs:**
- Documents approved (target: 10 for QA sprint)
- Intelligence records extracted
- Branches with data (target: 35/35)
- Avg confidence score

**Primary routes:** `/vault/documents`, `/vault/admin`, `/vault/constitution`

---

### 2. Content & Media Department
**Mission:** Transform intelligence into publishable civic content.

**Handles:**
- media_atoms (scripts, captions, reels)
- Publishing drafts and approval queue
- Content pipeline (script → visual → publish)

**AI Officer:** Chief Content Officer (CCO)
**Primary KPIs:**
- Scripts ready to publish
- Published atoms
- Script → publish conversion rate

**Primary routes:** `/vault/media`, `/vault/content`, `/vault/calendar`

---

### 3. Source & Research Department
**Mission:** Discover and acquire official government documents before others.

**Handles:**
- Source registry (lib/vault/sourceRegistry.ts)
- monitored_sources (watched sources)
- source_updates (new PDFs detected)
- Official link registry
- Document acquisition funnel

**AI Officer:** Chief Research Officer (CRO)
**Primary KPIs:**
- Sources watched
- New updates detected (unreviewed)
- Empty important branches (parts needing documents)
- Upload recommendation coverage

**Primary routes:** `/vault/sources`, `/vault/constitution/health`

---

### 4. Product Department
**Mission:** Keep the public-facing ZZC experience excellent and alive.

**Handles:**
- Public Constitution Tree (`/constitution`)
- Public Janta page (`/janta`)
- Scheme and calculator features
- UX quality and feature health

**AI Officer:** Chief Product Officer (CPO)
**Primary KPIs:**
- Public branches active (parts visible in tree)
- Janta cards published
- Calculator accuracy status

**Primary routes:** `/vault/constitution`, `/constitution`, `/vault/products`

---

### 5. Operations Department
**Mission:** Keep the pipeline running. No stuck workflows. No silent failures.

**Handles:**
- QA sprint progress
- Stuck documents (ai_paused, stalled)
- Deploy health
- System settings (API keys, billing)
- Workflow guide execution

**AI Officer:** Chief Operations Officer (COO)
**Primary KPIs:**
- Documents in ai_paused state (target: 0)
- QA sprint progress (target: 10/10)
- Days since last successful extract

**Primary routes:** `/vault/qa`, `/vault/system`, `/vault/documents`

---

### 6. Growth Department
**Mission:** Build the public audience and creator presence.

**Handles:**
- Social media presence
- Campaign planning
- Audience building strategy
- Creator outreach
- Public launch readiness

**AI Officer:** Chief Growth Officer (CGrO)
**Primary KPIs:**
- Publish-ready content assets
- Active campaigns
- Follower/reach targets (manual entry)

**Primary routes:** `/vault/business`, `/vault/content/queue`

---

### 7. Finance & Cost Department
**Mission:** Keep costs controlled and revenue readiness on track.

**Handles:**
- AI token costs (Gemini Flash, Bedrock)
- Cloud costs (Cloudflare R2, Pages)
- Revenue model readiness
- Pricing and monetization planning

**AI Officer:** Chief Finance Officer (CFO)
**Primary KPIs:**
- Pending AI extract cost (USD)
- Documents in ai_paused (billing signal)
- Revenue readiness score (0–100)

**Primary routes:** `/vault/finance`, `/vault/revenue`

---

### 8. Strategy Department
**Mission:** Keep the long-term vision alive and evolving.

**Handles:**
- Vision Vault (founder ideas, letters, philosophy)
- Roadmap evolution
- Long-term architecture decisions
- ZZC constitutional philosophy

**AI Officer:** Chief Strategy Officer (CSO)
**Primary KPIs:**
- Open roadmap decisions
- Vision notes updated (recency)
- Long-term milestones on track

**Primary routes:** `/vault/vision`, `/vault/system-map`

---

## Founder Work Cycle

The Founder Work Cycle is a **dynamic daily/weekly execution rhythm** generated from the current `CopilotContext`.

It answers: *"In what order should I work today, and why?"*

### Prioritization Logic

The cycle orders departments dynamically based on current system state:

```
1. If system risk exists         → Operations FIRST
2. If documents pending pipeline → Intelligence SECOND
3. If source updates unreviewed  → Research THIRD
4. If scripts ready to publish   → Content FOURTH
5. If publish-ready assets       → Growth FIFTH
6. If AI costs rising            → Finance check
7. If roadmap decision pending   → Strategy LAST
```

The founder should never have to guess where to start.

### Each Work Step Contains

| Field | Description |
|-------|-------------|
| `department` | Which department to work in |
| `officer` | Which AI Officer is on duty |
| `durationMins` | Recommended time budget |
| `reason` | Why this step matters RIGHT NOW (Nepali) |
| `primaryTask` | One specific task to complete |
| `actionLabel` | Button label (Nepali) |
| `actionHref` | Where to navigate to complete it |
| `successCondition` | When can you move to the next step? |
| `urgency` | `must_do` / `should_do` / `nice_to_have` |
| `canSkip` | Can this step wait until tomorrow? |

### Example: Today's Founder Route

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 आजको Founder Route — 2026-05-27

Total: 4 steps · ~60 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1 — Operations (10 min) 🔴 MUST DO
Officer: Chief Operations Officer
Reason: 2 documents ai_paused — billing issue detected
Task: System settings → fix API key → retry paused docs
✓ Done when: 0 ai_paused documents

Step 2 — Intelligence (20 min) ⚡ MUST DO
Officer: Chief Intelligence Officer
Reason: 3 approved documents waiting deep extract
Task: Documents → Extract all approved
✓ Done when: 0 pendingExtract

Step 3 — Research (15 min) 📋 SHOULD DO
Officer: Chief Research Officer
Reason: Part 24 (CIAA) empty — important branch
Task: Search source links → upload CIAA annual report
✓ Done when: Part 24 has at least 1 document

Step 4 — Content (15 min) 💡 NICE TO HAVE
Officer: Chief Content Officer
Reason: 5 media scripts ready for approval
Task: Media workspace → approve scripts
✓ Done when: Scripts moved to approved status

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Today's top decision:
→ QA sprint at 2/10 — should we sprint this week?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## /vault/management — Page Design

The Management OS lives at `/vault/management`.

### Top section: Today's Founder Route
- Dynamic work cycle generated from CopilotContext
- Steps in priority order, each with action button
- Total time estimate for the day
- Top open decision requiring founder input

### Middle section: Department Status Grid
Each department shows:
- Status badge: `CRITICAL` / `NEEDS ATTENTION` / `ON TRACK` / `IDLE`
- AI Officer name
- Top 1-2 tasks
- Current blocker (if any)
- KPI snapshot
- "Go to department" button

### Bottom section: Open Decisions
- Tasks requiring founder approval
- Founder Decision Inbox concept (Phase 4+)

---

## Architecture Integration

### How Officers connect to CopilotContext

```typescript
// Intelligence Officer reads:
ctx.pipeline           // documents in pipeline
ctx.intelligence       // framework + intel counts
ctx.branchHealth       // branch coverage

// Content Officer reads:
ctx.media              // atoms, scripts, published

// Research Officer reads:
ctx.sourceMonitoring   // watched sources, new updates
ctx.branchHealth       // emptyImportant parts

// Operations Officer reads:
ctx.pipeline.aiPaused  // billing failures
ctx.qa                 // sprint progress
ctx.costRisk           // pending AI costs

// Finance Officer reads:
ctx.costRisk           // direct AI cost estimate
ctx.pipeline.aiPaused  // billing signals

// Strategy Officer reads:
ctx.qa                 // sprint on track?
ctx.intelligence       // foundation readiness
ctx.media              // content readiness
```

Officers do NOT query Firestore themselves.
All data flows from `buildCopilotContext()`.

---

## Firestore Collections (management layer)

When tasks are persisted in Phase 4, they live in:

```
management_tasks (new collection, Phase 4+)
  - ownerId
  - departmentId
  - title / titleNp
  - status, priority
  - actionHref
  - linkedDocId, linkedPartNumber, linkedAtomId
  - createdAt, dueDate, completedAt
```

Must be added to `firestore.rules` before creation.
Until Phase 4, tasks are generated from CopilotContext in-memory only (no persistence).

---

## Build Phases

### Phase 1 (NOW) — Design Only
- [x] `docs/MANAGEMENT_OS.md`
- [x] `lib/types/management.ts`
- No UI, no Firestore writes

### Phase 2 — Simple Dashboard
- [ ] `/vault/management/page.tsx`
- [ ] Department cards (status, officer, KPIs)
- [ ] Today's Founder Route (CopilotContext-driven, in-memory tasks)
- [ ] No Firestore writes yet

### Phase 3 — Department Connection
- [ ] Each department card links to its primary route
- [ ] KPI values computed from CopilotContext
- [ ] Work cycle generation from CopilotContext
- [ ] Department briefings derived (not stored)

### Phase 4 — Task System
- [ ] `management_tasks` Firestore collection
- [ ] Task creation from management page
- [ ] Task completion + approval flows
- [ ] Founder Decision Inbox

### Phase 5 — AI Briefings
- [ ] Weekly founder briefing (LLM optional, rule-based first)
- [ ] Department progress logs
- [ ] Officer-generated task queues
- [ ] Revenue readiness review

---

## What NOT to Build

- Separate Firestore reads per department (violates ONE brain rule)
- Chat interfaces for each officer (not a chatbot system)
- Org charts or fake org structure (no real team yet)
- Notification systems before Phase 4 tasks exist
- Department "autonomy" — officers suggest, founder decides
- Separate AI models per department — same CopilotContext everywhere

---

## Connection to CLAUDE.md / AGENTS.md

This document is the source of truth for the Management OS vision.
When building Phase 2+:

1. Read this doc first
2. Check `lib/types/management.ts` for all type definitions
3. Check `lib/vault/copilotContext.ts` for data source
4. Never add a department-specific Firestore collection without this approval:
   - Does it duplicate existing intelligence?
   - Is it referenced from an existing atom?
   - Is it added to `firestore.rules`?

---

## Success Definition

ZZC Management OS is working when:

1. Founder opens `/vault/management` each morning
2. Sees today's prioritized route (5-7 steps, 60-90 min total)
3. Each step has a clear reason, a clear task, and a clear "done" condition
4. Clicking a step button navigates directly to the work
5. After completing all steps, the page shows "Today's work is done"
6. Founder can genuinely say: "I ran ZZC like a real institution today"
