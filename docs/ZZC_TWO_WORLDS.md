# ZZC — Two Worlds Architecture

> Version: 1.0
> Author: Jeevan Regmi + Claude Code
> Date: 2026-05-28
> Status: Active strategic foundation — read before designing any new module.

---

## The Moat

ZZC's moat is **not** financial data feeds.
ZZC's moat is **not** a Bloomberg terminal clone.

The moat is:

> **Deep multilingual semantic intelligence infrastructure for Nepal.**
>
> Civic understanding + Devotional meaning + Sanskrit preservation,
> built over one shared atom graph, in Nepali-first language.

Nothing else in Nepal does this. Nothing in South Asia does this at the cultural depth required.

---

## Two Public Worlds

```
ONE Semantic Intelligence Core
(shared atom protocol · multilingual graph · source grounding)
         │
         ├── ZZC Civic Chautari                 zzc.jeevanregmi.com.np
         │     Citizens · students · researchers · policy learners
         │     Constitution + governance + policy + public understanding
         │     Language: Nepali + English
         │     Collections: constitutional_framework, janta_intelligence,
         │                  janta_relationships, vault_documents
         │
         └── ZZ Bhakti Chautari                 (Phase 5 — bhakti.zzc or zz.*)
               Devotees · seekers · Sanskrit-curious · bhakti listeners
               Scripture + mantra + devotional media + semantic learning
               Language: Sanskrit + Nepali + Hindi + English
               Collections: bhakti_atoms, semantic_dictionary (spiritual domain)

ONE private sanctuary
         └── Temple Vault                       /vault/temple
               Founder-only spiritual creation cockpit
               The creative source of Bhakti Chautari content
               Three-state visibility: private → review → published
```

These are **experience worlds**, not separate systems.
Same atom protocol. Same relationship graph structure. Same source-grounding discipline.

---

## What Changed From the Old Direction

| Old direction | New direction |
|---|---|
| Financial data feeds as moat | Semantic intelligence as moat |
| "Bloomberg terminal for Nepal" | Civic + devotional meaning infrastructure |
| Real-time rate widgets | Deep multilingual understanding |
| Dashboard-heavy UI | Calm, educational, content-first UX |
| Financial Public Preview dominant | Two meaningful public worlds |
| Temple Vault = isolated notebook | Temple Vault = Bhakti Chautari creative source |

The financial layer (market rates, NRB data) is not eliminated — but it is a **feature**, not the identity.

---

## ZZC Civic Chautari — What It Is

**The Nepal civic intelligence public ecosystem.**

- Constitution of Nepal — semantic, multilingual, living
- Janta Intelligence — government policy → citizen-readable
- Story cards, TTS, timeline, educational explainers
- "Which policies affect me?" citizen filter
- Cross-document relationship discovery
- Civic learning sequences

**The one-line pitch:**
> Nepal's constitution and governance made understandable for every Nepali.

---

## ZZ Bhakti Chautari — What It Is

**The Nepal devotional semantic public ecosystem.**

- Sanskrit term meanings — source-grounded (Monier-Williams, Apte, DCS)
- Shloka/stotra breakdowns — Sanskrit + Nepali + Hindi + English layers
- Mantra explainers — grammatical, devotional, philosophical meaning
- Bhajan texts — with devotional context and tradition notes
- Sacred media atoms — devotional reels, meaning cards, calm audio
- Guided reflection — not engagement bait, but meaningful pause

**The one-line pitch:**
> Sanskrit and devotional wisdom made accessible for the seeking Nepali.

**What Bhakti Chautari is NOT:**
- Not a religion platform
- Not a guru recommendation engine
- Not social media for spirituality
- Not monetized through emotional manipulation
- Not an AI chatbot pretending to be a deity

---

## Temple Vault → Bhakti Chautari Flow

This is the creative pipeline that makes Bhakti Chautari possible.

```
TEMPLE VAULT (founder private)
      │
      │  founder writes, reflects, studies
      │  mantra notes · shloka understanding · bhajan texts
      │  Sanskrit term meanings · spiritual reflections
      │
      ▼ visibility = "review"
      │
      │  founder reviews for public-safeness
      │  edits if needed · removes personal content
      │  ensures source grounding
      │
      ▼ visibility = "published"
      │
      │  creates bhakti_atom (standalone expression record)
      │  NOT a copy of the private note — a new public-safe expression
      │  links to semantic_dictionary terms
      │  optionally links media generation prompt
      │
      ▼
BHAKTI CHAUTARI (public)
      reads from bhakti_atoms where isPublic == true
```

**Privacy architecture:**
- `temple_notes` — never directly public. Firestore rule: owner-only always.
- `bhakti_atoms` — the expression layer. Created by founder from reviewed temple content.
- Published bhakti_atom contains ONLY what the founder explicitly approves for public.
- No automated pipeline from private note → public. Every step is deliberate.

---

## Three Visibility States

Every `TempleNote` and `TempleContent` has a `visibility` field:

| State | Meaning | Who sees it |
|---|---|---|
| `private` | Founder-only. Never leaves vault. Default. | Founder only |
| `review` | Potential future public content. Founder reviewing. | Founder only |
| `published` | Approved for Bhakti Chautari. Source of a bhakti_atom. | Foundation for public |

**Transition rules:**
- `private → review`: one tap (founder thinks "this could be shared someday")
- `review → published`: deliberate publish action (creates bhakti_atom)
- `published → review`: founder can pull back (marks bhakti_atom as draft)
- `review → private`: always possible (change your mind)
- Nothing auto-advances. Every transition is founder-initiated.

---

## Bhakti Atom — The Expression Layer

`bhakti_atoms` in Firestore is the public spiritual expression layer.
Same architectural role as `media_atoms` in the civic world.

```typescript
BhaktiAtom {
  ownerId:        string
  sourceNoteId?:  string      // which temple_note inspired this (private ref)
  tradition?:     SpiritualTradition
  type:           "shloka_breakdown" | "mantra_explainer" | "bhajan_text"
                | "meaning_card" | "leela_story" | "devotional_reflection"
  textOriginal:   string      // Devanagari (Sanskrit/Nepali)
  textNepali?:    string
  textEnglish?:   string
  meaningNepali:  string      // the publicly-safe meaning
  dictionaryRefs: string[]    // semantic_dictionary term IDs
  mediaPrompt?:   string      // for future devotional reel/visual generation
  isPublic:       boolean     // false until founder explicitly publishes
  isSourceGrounded: boolean   // was this verified against a source?
  addedAt:        string
  publishedAt?:   string
}
```

**ONE Brain rule for Bhakti:**
All public spiritual content derives from `bhakti_atoms`.
Nothing in Bhakti Chautari is stored independently — it all traces to a bhakti_atom.

---

## Long-Term Monetization (When Value Exists)

No monetization until depth exists. No emotional manipulation. No fake guru model.

When the time comes, the honest model:

| Product | Model |
|---|---|
| Bhakti Chautari premium | Deeper Sanskrit learning, source-grounded commentary |
| Devotional audio/media | Original recordings of public-domain texts |
| Spiritual courses | Sequential learning tracks through the semantic dictionary |
| Cultural preservation archive | Supporting the preservation mission |
| Civic intelligence API | For researchers and organizations |
| Supporter community | People who believe in the mission |

What will never be monetized:
- Emotional spiritual vulnerability
- Fear-based devotional content
- Fake urgency or scarcity around sacred knowledge

---

## Phases

### Phase 1–2 (Done)
- Civic intelligence pipeline complete (constitutional_framework + janta_intelligence)
- Temple Vault private sanctuary built (Phase 2 done)
- Two Worlds architecture designed (this doc)

### Phase 3 — Spiritual Dictionary Foundation
- Seed 30 priority Sanskrit terms in `semantic_dictionary` (spiritual domain)
- Monier-Williams source grounding for key terms
- Dictionary viewer at `/vault/temple/dictionary`
- Three-state visibility system live in TempleClient

### Phase 4 — Temple → Bhakti Pipeline
- Temple notes with `visibility: "review"` visible in a review queue
- Founder publish action → creates `bhakti_atom`
- `/vault/bhakti` publish dashboard (draft bhakti_atoms, approve, mark public)
- `firestore.rules` for `bhakti_atoms` (owner write, public read when `isPublic==true`)

### Phase 5 — Bhakti Chautari Public Launch
- Public routes: `/bhakti` (same domain) or `bhakti.zzc.*`
- Sanskrit shloka breakdowns, mantra explainers, meaning cards
- Calm sacred UX (no engagement bait, no notifications, no algorithmic feed)
- Source attribution on every published atom

### Phase 6 — Immersive Sacred Experience
- Audio: original recordings of public-domain texts
- Devotional reels from bhakti_atom media prompts
- Guided reflection tracks
- Multilingual spiritual learning (Sanskrit → Nepali → Hindi → English)

### Phase 7 — Sustaining the Mission
- Supporter membership (optional — for those who want to sustain the work)
- Premium Sanskrit learning sequences
- Cultural preservation archive publicly accessible

---

## What NOT to Build

- No "spiritual AI chatbot"
- No recommendation engine inside Temple Vault
- No social features in Bhakti Chautari (no likes, shares, comments)
- No auto-publishing from temple notes (every step deliberate)
- No copyrighted bhajan recordings without explicit license
- No fake AI-generated guru teachings
- No cross-promotion between Civic and Spiritual worlds in the UI
- No gamification in either world (no streaks, no points)
- No financial data as the primary public product

---

## How the Founder Walks the System (2028 Vision)

```
Morning:
  /vault/temple/shiva
  → writes a reflection on Mahamrityunjaya Mantra (visibility: private)
  → marks it "review" — thinks it could help others someday

Later:
  /vault/bhakti  (publish dashboard)
  → sees 3 notes in review queue
  → edits the mantra note — removes personal context, adds source grounding
  → publishes → bhakti_atom created, linked to semantic_dictionary/"mahamrityunjaya"

Public:
  bhakti.zzc.jeevanregmi.com.np
  → Mahamrityunjaya meaning card
  → Sanskrit text + IAST + Nepali meaning + English translation
  → Source: Rigveda 7.59.12 · Monier-Williams grounded
  → Calm. Depth. No ads. No algorithm.
```

That is the vision.
Not a "spiritual startup."
Civilizational semantic infrastructure.
