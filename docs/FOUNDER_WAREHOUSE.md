# ZZC Founder Knowledge Warehouse — Architecture Design

> Status: Designed, NOT yet built.
> Priority: After QA sprint (ROADMAP #4) + Campaign layer.
> Core rule: Multiple organized VIEWS on the same atom graph. Zero new intelligence collections.

---

## Vision

ZZC should feel like a **calm digital civic studio**, not a developer backend.

The founder should think in:
- **Topic** (Education Rights, Youth Employment, Federalism)
- **Branch** (Constitutional Part 3, Fundamental Rights)
- **Campaign** (Education Rights Series — Q2 2082)
- **Context** (Supreme Court → Part 11 → Judiciary folder)
- **Document purpose** (annual budget → budget-economy folder, Part 4 → policy planning)

NOT in: random filenames, upload timestamps, collection names.

---

## ONE Brain Principle (Warehouse Edition)

```
constitutional_framework  ─┐
janta_intelligence        ─┼──► (views)  Constitution Tree
janta_relationships       ─┤            Media Atoms
vault_documents           ─┤            Campaigns
media_atoms               ─┤            Source Library
civic_campaigns (future)  ─┘            Branch View
```

Same atoms. Multiple organized views. Zero duplication.

---

## What EXISTS Today (already built)

| Warehouse View | Backing System | Status |
|---|---|---|
| Source Documents | `vault_documents` + `govFolder` | ✅ Picker in upload modal |
| Constitution Tree folders | `constitutional_framework` Part 1–35 | ✅ Branch Health page |
| Media Atoms | `media_atoms` + Media Workspace | ✅ Just built |
| Per-part upload context | `govFolder` + `parts` URL params from Health page | ✅ Just wired |
| Content category labels | `category` field on vault_documents | ✅ Existing |

---

## The ONE New Structure: Civic Campaign

A Campaign is a **smart playlist** — it groups existing atoms by civic topic without moving or duplicating anything.

### Collection: `civic_campaigns`

```typescript
interface CivicCampaign {
  id?:              string;
  ownerId:          string;
  nameNepali:       string;   // "शिक्षा अधिकार अभियान"
  nameEn?:          string;

  // Constitutional context
  linkedParts:      number[];    // [3] → Fundamental Rights

  // Linked govFolders (which library sections feed this campaign)
  linkedGovFolders: GovFolder[];

  // References to existing atoms (NEVER duplicates content)
  docIds:           string[];    // vault_documents
  intelIds:         string[];    // janta_intelligence
  mediaAtomIds:     string[];    // media_atoms

  status:           "planning" | "active" | "completed";
  tags:             string[];
  createdAt:        string;
  updatedAt:        string;
}
```

### What a Campaign page shows:

| Section | Data source |
|---|---|
| Source documents | `vault_documents` where `id ∈ docIds` |
| Intelligence records | `janta_intelligence` where `id ∈ intelIds` |
| Media atoms | `media_atoms` where `id ∈ mediaAtomIds` |
| Constitutional anchor | Branch Health for `linkedParts` |
| Missing gaps | Which `linkedParts` have no intelligence yet |

---

## Smart Naming System

Auto-generate filename prefixes based on context. Not a new field — just a UI suggestion when uploading.

Examples from URL params:
- `govFolder=constitution&parts=3&tags=fundamental-rights` → suggested prefix: `constitution-part3-fundamental-rights`
- `govFolder=budget-economy&parts=8` → suggested prefix: `budget2082-part8`
- `govFolder=judiciary&parts=9` → suggested prefix: `judiciary-part9-supreme-court`

This is a **UX feature in DocumentUploadModal** — suggest the title prefix, founder can edit.

---

## Generated Asset Tracking

Extend `media_atoms` with asset URLs when founder manually adds them after external tool generation:

```typescript
// Add to MediaAtom interface (lib/types/media-atoms.ts):
interface MediaAtomAssets {
  imageUrl?:    string;   // Ideogram/DALL-E result URL (R2 after upload)
  audioUrl?:    string;   // ElevenLabs narration URL (R2 after upload)
  videoUrl?:    string;   // Runway/CapCut export URL (R2 after upload)
  thumbnailUrl?: string;  // Thumbnail
  subtitleFile?: string;  // SRT/VTT path in R2
}
```

Workflow: Founder generates externally → downloads → uploads to R2 via `/api/upload-document` → pastes URL back into media atom in Media Workspace. No auto-generation. No cost.

---

## Multi-Source Download Assistant

Small addition to CTO insights / WorkflowGuide: a "Track Source" flow.

When a CTO insight says "Upload Supreme Court Annual Report 2081":

1. Founder clicks "📋 स्रोत ट्र्याक गर्नुहोस्"
2. Small form: URL, source name, trust level, notes
3. Saved as `source_tracker` in localStorage (not Firestore — ephemeral)
4. Shows a "Download checklist" in the CTO panel: "2 sources pending download"
5. When uploaded, item is marked done

This is intentionally LOCAL (localStorage) — no new Firestore collection needed. It's a founder scratchpad, not permanent data.

---

## Intelligent Views (Views on Existing Data)

These are UI views to build — each queries existing collections differently:

| View | URL | Query pattern |
|---|---|---|
| Constitution Tree | `/vault/constitution` | `constitutional_framework` grouped by `partNumber` |
| Branch View | `/vault/constitution/health` | Per-part health + upload guidance |
| Media Library | `/vault/media` | `media_atoms` by status |
| Source Library | `/vault/documents?viewMode=library` | `vault_documents` grouped by `govFolder` |
| Campaign View (future) | `/vault/campaigns` | `civic_campaigns` + linked atom counts |
| Topic Cross-view (future) | `/vault/intelligence?topic=education` | `janta_intelligence` where tags include topic |

---

## Warehouse Navigation (Future sidebar section)

```
🧠 Intelligence
├── 📜 Constitution Tree
├── 🔍 Intelligence Records
└── 🌐 Janta (Public)

📁 Library
├── 📄 Documents (govFolder view)
├── 🎬 Media Atoms
└── 📋 Campaigns (future)

⚡ Pipeline
├── 🤖 AI Queue
├── 👁 Admin Review
└── 🌿 Branch Health

🛠 System
├── ⚙ Settings
└── 📊 System Map
```

---

## Build Prerequisites

- [ ] QA sprint: 10 real documents through full pipeline (ROADMAP #4)
- [ ] `civic_campaigns` Firestore rule added before writing
- [ ] Media Workspace stable and tested
- [ ] govFolder context-aware upload wiring complete ✅ (just done)

---

## Phase Plan

### Phase 1 — Campaign Layer (build after QA sprint)
- `civic_campaigns` Firestore collection + rules
- `/vault/campaigns` page: create campaign, link atoms/docs/media
- Add "Add to Campaign" button in Document cards and Media Workspace

### Phase 2 — Smart Naming Suggestions
- In DocumentUploadModal: suggest title prefix from `govFolder` + `parts` URL params
- 1-line feature, zero new collections

### Phase 3 — Generated Asset Tracking
- Add `imageUrl`, `audioUrl`, `videoUrl` fields to `media_atoms`
- Media Workspace: "Paste Asset URL" field when atom is `approved`
- Upload to R2, store in atom

### Phase 4 — Warehouse Navigation
- Sidebar reorganization into "Intelligence / Library / Pipeline / System" sections
- Topic cross-view: filter `janta_intelligence` by tag/topic
- "Recently worked on" from localStorage session tracker (already built)

---

## What NOT to Build

| Temptation | Why Not |
|---|---|
| Separate media file storage collection | `vault_documents` already handles files; `media_atoms` handles expressions |
| Nested subcollections in Firestore | Flat collections with `ownerId` filter are cheaper and safer |
| Auto-upload from external tools | Founder manually controls what enters the warehouse |
| Duplicate atom data inside campaigns | Campaign = ID references only. ONE brain. |
| Complex folder hierarchy in Firestore | govFolder + linkedParts is enough hierarchy |
