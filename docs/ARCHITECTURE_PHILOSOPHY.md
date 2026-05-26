# ZZC Architecture Philosophy

> This document defines how ZZC should grow.
> Read before designing any new module, page, or collection.

---

## The Two Absolute Rules

### 1. ONE Atom Graph (non-negotiable)

There is one source of civic truth. Everything traces back here.

```
constitutional_framework  (Layer 1 — static)
janta_intelligence        (Layer 2 — dynamic)
janta_relationships       (relationship graph)
vault_documents           (source material)
civic_signals             (live government feed)
```

No intelligence is duplicated outside these collections.
New layers reference atoms — they never re-extract, re-store, or replicate them.

**Violation example:** Storing article summaries inside a campaign record.
**Correct approach:** Campaign stores `frameworkIds: ["abc", "def"]` — reads live from source.

### 2. MANY Organized Layers (encouraged)

New rooms can always be added to the city. Each room organizes, expresses, or explores the atom graph differently. Rooms do not conflict with each other or with the atom graph as long as they reference, not replicate.

**Rooms already built:**
- Constitution Tree (public expression)
- Branch Health (operational view)
- Media Workspace (expression layer)
- Janta public feed (public output)
- Documents library (source organization)

**Rooms being built:**
- Campaign layer (topic-based organization)
- Founder Warehouse navigation (discovery layer)

**Rooms planned for future:**
- Signal Center (live government monitoring)
- Research Lab (cross-document analysis)
- Election Mode (election-cycle intelligence view)
- Crisis Mode (emergency civic intelligence)
- Archive Room (historical documents + timeline)
- Simulation Layer (policy impact modeling)
- AI Copilot Studio (LLM layer on top of rule engine)

---

## The City Architecture

ZZC is a **city**, not a single building.

```
🏛  CIVIC INTELLIGENCE CORE (atom graph — never changes)
│
├── 📚 Constitution Library          /vault/constitution
│   └── Branch rooms (Part 1–35)    /vault/constitution/health
│
├── 🔬 Intelligence Labs             /vault/documents
│   └── govFolder districts          judiciary/, budget/, parliament/...
│
├── 🎬 Media District                /vault/media
│   └── Expression atoms             scripts, prompts, captions
│
├── 🗂  Campaign Rooms               /vault/campaigns   (building)
│   └── Topic universes              education/, federalism/, budget/...
│
├── 📡 Signal Center                 /vault/content/intelligence
│   └── Live government feed         NRB, Parliament, MoF
│
├── 🌐 Public Squares               /janta, /constitution
│   └── Citizen-facing outputs       story cards, tree, TTS
│
└── 🧠 Founder Cockpit               (CTO Assistant — always visible)
    └── Intelligence pulse + tasks
```

Every district reads from the atom graph. No district owns its own intelligence.

---

## What "Open-Armed Architecture" Means

**Open-armed means:**
- New Firestore collections are welcome if they reference existing atoms
- New pages and views are welcome if they discover new patterns in existing data
- New expression formats (reels, timelines, simulations) are welcome as long as they cite their source atom
- New organizational layers (campaigns, archives, modes) are welcome

**Open-armed does NOT mean:**
- Duplicate intelligence collections
- Isolated AI pipelines that don't feed into `janta_intelligence` or `constitutional_framework`
- Orphaned data that has no path back to the atom graph

---

## Founder Discovery is a Feature

The backend should continuously reveal:

| Discovery type | Where seen |
|---|---|
| Unused atoms (no media expression yet) | Media Workspace — "no atom linked" |
| Underexplored branches (empty parts) | Branch Health |
| Disconnected signals (no matching intel) | Signal Center |
| Campaign overlaps (same atom in 2 campaigns) | Campaign view |
| Missing narratives (intel exists, no script) | Media Workspace |
| High public value atoms (many relationships) | Relationship map (future) |
| Source gaps (recommended doc not uploaded) | Branch Health upload guidance |
| Civic gaps (constitution promises vs. reality) | Intelligence vs. signals comparison |

These are not bugs. They are the system working correctly — surfacing what needs attention.

---

## Campaign Layer (First-Class System)

Campaigns are not lightweight playlists. They are **civic missions** — first-class organizational units that can grow into:

- **Topic universes** — "Right to Education" as a living intelligence cluster
- **Research rooms** — all atoms related to a topic, cross-layer
- **Media production pipelines** — atoms → scripts → approved → published
- **Public engagement hubs** — atom cluster → public feed → social content
- **Educational tracks** — a sequence of constitutional concepts for public learning

### Campaign can contain:

| Layer | What it holds |
|---|---|
| Source layer | `docIds[]` → vault_documents |
| Intelligence layer | `intelIds[]` → janta_intelligence |
| Framework layer | `frameworkIds[]` + `linkedParts[]` → constitutional_framework |
| Expression layer | `mediaAtomIds[]` → media_atoms |
| Signal layer | `signalIds[]` → civic_signals (future) |
| Output layer | Published URLs, social posts (tracked, not stored) |

Still: **references only**. The atom graph is the single source of truth.

---

## Architecture Expansion Rules

Before adding a new module, ask:

1. **Does it reference existing atoms or create parallel intelligence?**
   - References = welcome
   - Parallel intelligence = violates ONE brain

2. **Does it help the founder discover new patterns?**
   - Yes = build it
   - No clear discovery value = defer

3. **Does it require a new Firestore collection?**
   - If yes: add to `firestore.rules`, document in this file, add to CLAUDE.md Known Collections
   - If no: build as a view layer

4. **Is it a new MODE or a new ROOM?**
   - Modes (election mode, crisis mode) = runtime context switching (no new collections needed — filter behavior changes)
   - Rooms (campaigns, archives) = new organizational units (may need a new collection)

---

## Modules by Phase

### Phase 1 (Current) — Core Stability
`constitutional_framework` + `janta_intelligence` + `vault_documents` + `media_atoms`
Goal: QA sprint — 10 real documents through the full pipeline

### Phase 2 (Near) — Organization Layers
`civic_campaigns` + Warehouse navigation + Smart naming
Goal: Founder can organize and discover across the atom graph

### Phase 3 (Next) — Signal Intelligence
`civic_signals` reliable pipeline + Signal → media_atom suggestion
Goal: Live government changes surface in real-time

### Phase 4 (Future) — Discovery Tools
Relationship explorer + Campaign map + AI clustering
Goal: The system surfaces what the founder hasn't seen yet

### Phase 5 (Vision) — Public Engagement
Public campaign pages + Educational tracks + Citizen API
Goal: ZZC as Nepal's civic intelligence platform

### Phase 6 (Long-term) — AI Augmentation
LLM reasoning layer on rule engine + Multi-contributor + Cross-tree intelligence
Goal: Nepal's governance as a forest, not one tree

---

## What NOT to Fear

- New pages ✅ — every new view is just a new way of seeing the atom graph
- New Firestore collections ✅ — as long as they reference, not duplicate
- Multiple modes ✅ — election mode, crisis mode, archive mode are filter contexts
- Large-scale UI ✅ — the backend should feel like walking through a civic institution
- Ambitious features ✅ — Notion + Bloomberg + Civic OS + AI Studio is the right reference frame

**Fear only:** intelligence fragmentation, data duplication, disconnected pipelines.

---

## How the Founder Walks Through the Backend

Imagined founder session in 2027:

```
/vault/campaigns/education-rights
  → 47 source documents (from 6 govFolders)
  → 312 intelligence records (from 8 ministries)
  → 23 media atoms (15 approved, 8 published)
  → Branch Health: Parts 3, 4, 25 — all healthy
  → 3 signals this month (MoE circular, NPC report, SC decision)
  → Suggested: 2 new media atoms from recent signals
  → Missing: School construction budget report (2081/82) — upload link pre-filled
```

That is the vision. Not "upload PDF → get summary."
