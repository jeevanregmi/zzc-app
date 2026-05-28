# ZZC Temple Vault & ZZ Spiritual World

> Version: 2.0 — Living Spiritual Intelligence Graph
> Status: Architecture defined — types complete — no routes or collections built yet
> Author: Jeevan Regmi + Claude Code
> Last updated: 2026-05-28

---

## The Two Worlds

ZZC is evolving from a single civic intelligence system into two connected worlds
built over one shared semantic intelligence architecture.

```
ONE Semantic Intelligence Core
(shared atom protocol, multilingual graph, source grounding)
        │
        ├── ZZC Civic World
        │     Audience:  Citizens, students, researchers, policy learners
        │     Language:  Nepali + English
        │     Purpose:   Constitution, governance, policy, public understanding
        │     Atoms:     constitutional_framework, janta_intelligence, civic_signals
        │
        └── ZZ Spiritual World
              Audience:  Devotees, seekers, Sanskrit-curious, bhakti listeners
              Language:  Sanskrit + Nepali + Hindi + English
              Purpose:   Devotion, scripture, mantra, semantic spiritual learning
              Atoms:     semantic_dictionary (spiritual) + spiritual_characters + spiritual_relationships
```

---

## Four-Layer Spiritual Intelligence Architecture

> This is the architectural north star for ZZ Spiritual.
> Not a dictionary. Not a bhajan storage.
> A living multilingual devotional civilization layer.

The spiritual world mirrors the civic world's two-layer intelligence model exactly:

```
CIVIC WORLD                         SPIRITUAL WORLD
─────────────────────────────────   ─────────────────────────────────────────
Layer 1: constitutional_framework   Layer 1: semantic_dictionary (spiritual)
  Static atoms — articles,            Static atoms — dharma, karma, moksha,
  fundamental rights, parts           maya, advaita, bhakti, shakti
  Sanskrit + IAST + Nepali + Hindi + English
  Source-grounded (Monier-Williams, Apte, DCS)

Layer 2: janta_intelligence         Layer 2: spiritual_characters
  Dynamic nodes — policy records,      Intelligence nodes — Shiva, Krishna,
  citizen-facing extractions           Hanuman, Shankaracharya, Mirabai
  Names/forms, symbols, moods, leelas, teachings,
  visual identity, connected scriptures, bhajans, festivals

Graph: janta_relationships          Graph: spiritual_relationships (leela graph)
  Cross-doc edges — policy ↔ policy    Story/relation edges:
  relationships, impact chains         Krishna → Arjuna → Bhagavad Gita
                                       → Dharma conflict → Karma Yoga

Media: media_atoms (future)         Media: bhakti_atoms
  Expression layer — references        Expression layer — shloka breakdowns,
  intelligence atoms, never            mantra explainers, leela stories
  duplicates them                      ALL grounded in L1+L2+L3 context
```

### Layer 1 — Semantic Spiritual Atoms

**Firestore collection**: `semantic_dictionary` (`domain: "spiritual"`)

Each atom (dharma, karma, moksha, maya...):
- Sanskrit in Devanagari
- IAST transliteration
- Nepali / Hindi / English meaning layers
- Source grounding (Monier-Williams, Apte, DCS — public domain)
- Philosophical notes (Vedantic depth)
- Devotional notes (heart context)
- Grammatical root (dhatu)
- Relationships to other atoms

### Layer 2 — Character Intelligence Graph

**Firestore collection**: `spiritual_characters` (Phase 2+)
**Type**: `SpiritualCharacter` in `lib/types/temple-vault.ts`

Each character node (Shiva, Krishna, Hanuman, Shankaracharya...):
- Primary name + alternate names (Mahadeva, Nataraja, Mahakala...)
- Essence and philosophical meaning
- Symbols (trident, flute, lotus, mace)
- Devotional rasa (dasya, madhurya, vira, karuna...)
- Core teachings and key shlokas
- Leela highlights
- Visual/iconographic description (for grounded media, Phase 6)
- Connections: spouses, children, guru-shishya, manifestations
- Linked semantic atoms, scriptures, bhajans, festivals, mantras

**Sacred Chambers are the UI surface.**
`SpiritualCharacter` records are the intelligence layer.
A chamber "Shiva" loads the Shiva character node and all its connected content.

### Layer 3 — Story / Leela Graph

**Firestore collection**: `spiritual_relationships` (Phase 2+)
**Type**: `SpiritualRelationship` in `lib/types/temple-vault.ts`

Graph edges connecting characters, atoms, scriptures, and events:

```
Example path — The Mahabharata axis:
Krishna (deity)
  ──sakhya──> Arjuna (character)
  ──set_in──> Kurukshetra (event_place)
  ──reveals──> Bhagavad Gita (scripture)
  ──teaches──> Karma Yoga (atom/concept)
  ──reveals──> Vishwaroopa (event/leela)
  ──embodies──> dharma (semantic atom)

Example path — The Advaita axis:
Adi Shankaracharya (sage_acharya)
  ──composed──> Vivekachudamani (scripture)
  ──teaches──> advaita (semantic atom)
  ──teaches──> maya (semantic atom)
  ──teaches──> moksha (semantic atom)
```

This enables: deep retrieval, meaningful media generation, cross-character semantic discovery.

### Layer 4 — Devotional Media System

**Firestore collection**: `bhakti_atoms` (Phase 5+)
**Type**: `BhaktiAtom` in `lib/types/temple-vault.ts`

AI media generation is **only** permitted when grounded in L1+L2+L3 context:
- Canonical iconographic description from `SpiritualCharacter.canonicalMediaContext`
- Emotional tone from `SpiritualCharacter.primaryRasa`
- Symbolic accuracy from `SpiritualCharacter.symbols`
- Devotional context from the leela graph

AI NEVER generates random spiritual visuals. Every output is traceable to character + atom + scripture context.

These are two *experience worlds*, not two separate brains.
Same atom protocol. Same relationship graph structure. Different domains, different audiences.

---

## Temple Vault — The Private Sanctuary

### What it is

A sacred, founder-only spiritual sanctuary inside ZZC.
Not a public product. Not social media. Not civic intelligence.

The Temple Vault exists because a founder's inner world shapes the outer system.
Before large-scale expansion, the founder deserves a personal sacred space.

### Route

```
/vault/temple
```

Access rule: `allow read, write: if isOwner();` — always and only.
No public routes. No sharing. No recommendations. No engagement.

### What it is NOT

- Not a religion platform
- Not a dashboard
- Not productivity software
- Not an AI chatbot
- Not a social feed
- Not a public service

### What it IS

A sacred digital archive where the founder can:
- Preserve sacred texts and personal translations
- Listen to bhajans and chants
- Study scriptures with multilingual semantic depth
- Write personal spiritual reflections
- Store mantras, prayers, realizations
- Experience spiritual calm and reconnect with intention

---

## Sacred Chambers

Each chamber is a distinct spiritual space within the Temple Vault.
Each has its own atmosphere, color, and content type.

| Chamber | Icon | Tradition |
|---------|------|-----------|
| Shiva | 🕉 | Shaiva — destruction, transformation, consciousness |
| Adi Guru Shankaracharya | 📿 | Advaita Vedanta — non-duality, moksha |
| Krishna | 🪷 | Vaishnava, Bhagavad Gita, Bhakti |
| Devi | 🌸 | Shakta — divine feminine, power, grace |
| Hanuman | 🌟 | Devotion, strength, service |
| Buddha | ☮ | Dharma, impermanence, compassion |
| Rishi / Muni | 📖 | Vedic wisdom, Upanishadic inquiry |
| Vedas | 🔥 | Rig, Sama, Yajur, Atharva — foundational revelation |
| Upanishads | 🌿 | Brahma-vidya, philosophical inquiry |
| Bhajans | 🎵 | Devotional music, saint poetry |
| Sanskrit Stotras | ✨ | Sacred hymns, prayers |
| Guru Parampara | 🙏 | Teacher lineage, teachings, dakshina |

Each chamber may contain:
- Sacred texts (verbatim + personal translation)
- Chants and audio (Phase 3)
- Personal notes and reflections
- Dictionary term connections
- Visual atmosphere themes

---

## Spiritual Dictionary Layer

### Why this is strategically important

Sanskrit carries encoded civilizational knowledge.
Most modern translations flatten its depth.
ZZC should build an authentic semantic preservation of this knowledge.

This is NOT ordinary translation.
This is: **semantic spiritual preservation**.

### Architecture

One `semantic_dictionary` Firestore collection, shared with the constitutional dictionary.
Spiritual terms use `domain: "spiritual"`.

See `lib/types/semantic-atom.ts` for the full atom protocol.

### Seed terms (priority 30)

| Sanskrit | Nepali | Hindi | English meaning |
|----------|--------|-------|----------------|
| धर्म | धर्म | धर्म | cosmic order / righteous path |
| मोक्ष | मुक्ति | मोक्ष | liberation from the cycle |
| आत्मा | आत्मा | आत्मा | individual self / soul |
| ब्रह्म | ब्रह्म | ब्रह्म | universal consciousness |
| अद्वैत | अद्वैत | अद्वैत | non-duality |
| भक्ति | भक्ति | भक्ति | devotional surrender |
| कर्म | कर्म | कर्म | action and its consequences |
| योग | योग | योग | union / path / discipline |
| ज्ञान | ज्ञान | ज्ञान | knowledge / wisdom |
| वैराग्य | वैराग्य | वैराग्य | dispassion / non-attachment |
| सत्य | सत्य | सत्य | truth / reality |
| अहिंसा | अहिंसा | अहिंसा | non-violence |
| श्रद्धा | श्रद्धा | श्रद्धा | faith / reverence |
| गुरु | गुरु | गुरु | teacher / dispeller of darkness |
| शिष्य | शिष्य | शिष्य | student / disciple |
| सेवा | सेवा | सेवा | selfless service |
| प्रसाद | प्रसाद | प्रसाद | grace / blessed offering |
| संसार | संसार | संसार | cycle of worldly existence |
| माया | माया | माया | illusion / creative power |
| तपस | तपस | तपस | austerity / inner fire |
| ध्यान | ध्यान | ध्यान | meditation / focused attention |
| प्राण | प्राण | प्राण | life force |
| नाद | नाद | नाद | primordial sound |
| ओम / ॐ | ओम | ओम | primordial vibration |
| शांति | शान्ति | शांति | peace / stillness |
| चित्त | चित्त | चित्त | consciousness / mind-stuff |
| विवेक | विवेक | विवेक | discernment / discrimination |
| स्तोत्र | स्तोत्र | स्तोत्र | sacred hymn / praise |
| परम्परा | परम्परा | परम्परा | tradition / lineage transmission |
| लीला | लीला | लीला | divine play |

---

## Authentic Source Strategy

ZZC must ground its spiritual semantic layer in authoritative sources.
AI meanings are *drafts*, not authority.

### Tier 1 — Public Domain (use freely)

| Source | Type | License | Coverage |
|--------|------|---------|---------|
| Monier-Williams Sanskrit Dictionary (1899) | Sanskrit-English lexicon | Public domain | ~185,000 entries |
| Apte's Practical Sanskrit-English Dictionary (1890) | Sanskrit-English | Public domain | ~30,000 entries |
| Böhtlingk & Roth (1855–1875) | Sanskrit-German | Public domain | Comprehensive |
| Cologne Digital Sanskrit Dictionaries | Digital XML versions of above | Public domain | Digitized |

### Tier 2 — Open License (attribution required)

| Source | Type | License | Notes |
|--------|------|---------|-------|
| Digital Corpus of Sanskrit (DCS) | Annotated texts | CC-BY | Must attribute |
| GRETIL texts | Original Sanskrit scriptures | Various open | Check per text |
| Sanskrit Heritage | Grammar + dictionary | Free non-commercial | |
| Spokensanskrit.org | Modern usage dictionary | Check | |

### Tier 3 — Evaluate carefully

| Source | Type | Concern |
|--------|------|---------|
| Wisdom Library translations | Modern English translations | Some may be copyrighted |
| IndoWordNet / Sanskrit WordNet | Synset ontology | Academic license |
| Modern bhajan recordings | Audio | Full copyright applies |

### Audio Strategy

Ancient texts = public domain.
Modern *recordings* of ancient texts = copyright applies.

Options:
1. Create original recordings (Phase 3+)
2. Source CC0 or public domain recordings explicitly
3. Text-only mode until audio strategy is resolved

**NEVER**: use copyrighted bhajan recordings without explicit license, even for private use.

---

## Sacred UX Principles

These principles govern the Temple Vault experience.
No normal dashboard conventions apply here.

### Visual

- Dark background — deep black or dark indigo, not flat zinc-950
- Warm accent tones — saffron, gold, deep rose, sandalwood
- Sanskrit/Devanagari typography support — proper line-height for Devanagari
- Slow, fade transitions — no snap animations
- No metrics, badges, notification counts
- No urgency indicators — no red, no "CRITICAL" labels
- Minimal interface — content is primary, chrome is invisible
- Atmospheric visual themes per chamber (Shiva = dark blue-grey; Devi = deep rose; etc.)

### Interaction

- No infinite scroll
- No autoplay
- No algorithmic suggestions
- No "related content" engines
- Silence is a feature — pages can be empty
- Focus mode: hide all navigation
- Meditation mode: full-screen, minimal, timer (Phase 3)

### Language

- Sanskrit in Devanagari (primary for sacred texts)
- Nepali for navigation and personal notes
- Hindi for devotional context
- English for meaning and translation layer
- Never: mixing sacred language with productivity/system language on the same screen

---

## AI Role in Temple Vault

**AI NEVER:**
- Pretends to be a guru, deity, or spiritual authority
- Fabricates scripture meanings
- Invents interpretations without source grounding
- Generates "devotional content" on demand
- Claims certainty about spiritual matters

**AI ONLY assists with:**
- Organizing and structuring personal notes
- Connecting dictionary term references
- Providing draft meanings clearly marked `ai_draft: true`
- Explaining grammatical structure of Sanskrit terms
- Navigating between related concepts

All AI-generated content in the spiritual dictionary is marked as draft.
Founder verification (`verified: true`) is the only mark of authority.

---

## Personal Spiritual Memory Vault

The founder should be able to store:

```
TempleNote types:
  - "reflection"    personal thought or realization
  - "shloka"        a memorized or favorite verse
  - "mantra"        personal mantra practice
  - "prayer"        personal prayer in any language
  - "dream"         spiritual dream or vision record
  - "teaching"      guru teaching or remembered lesson
  - "bhajan_note"   connection to a specific bhajan
  - "gratitude"     gratitude practice entry
```

These are private by architecture, not by toggle.
There is no "make public" option on Temple Notes.

---

## Firestore Collections

None created yet. When Phase 2 begins, add to `firestore.rules`:

```javascript
// Layer 2 — Character Intelligence Graph
match /spiritual_characters/{id} {
  allow read, write: if isOwner();
  // Phase 5: allow read: if resource.data.visibility == "published";
}

// Layer 3 — Leela / Story Graph
match /spiritual_relationships/{id} {
  allow read, write: if isOwner();
  // Phase 5: allow read: if resource.data.verified == true;
}

// Layer 5 (public expression) — Bhakti Atoms
match /bhakti_atoms/{id} {
  allow write: if isOwner();
  allow read: if resource.data.isPublic == true;
}

// Private sanctuary (always owner-only)
match /temple_chambers/{id} {
  allow read, write: if isOwner();
}
match /temple_notes/{id} {
  allow read, write: if isOwner();
}
match /temple_content/{id} {
  allow read, write: if isOwner();
}

// Layer 1 — Spiritual dictionary terms — PRIVATE in Phase 2
// Becomes public read when isPublic=true in Phase 5
match /semantic_dictionary/{id} {
  allow write: if isOwner();
  allow read: if isOwner();
  // Phase 5: allow read: if resource.data.isPublic == true;
}
```

---

## Privacy Architecture

Temple Vault is isolated from all ZZC systems by rule, not by convention:

```
Temple Vault (private)          ZZC Civic (owner-scoped)
     │                                    │
     │  NO connection                     │
     │  NO data flow                      │
     │  NO cross-references               │
     │                                    │
     └── only: semantic_dictionary ───────┘
         (shared collection, domain-tagged)
```

The only permitted connection: both worlds can share the `semantic_dictionary` collection.
A civic term like "social justice" and a spiritual term like "dharma" may reference each other.
This cross-domain semantic graph is a long-term asset.

---

## Build Phases

### Phase 1 (COMPLETE) — Architecture & Types
- [x] `docs/TEMPLE_VAULT.md` — full architecture defined
- [x] `lib/types/temple-vault.ts` — all types including L2 SpiritualCharacter + L3 SpiritualRelationship
- [x] `lib/types/semantic-atom.ts` — universal atom protocol
- No routes, no Firestore collections, no UI

### Phase 2 — Private Sanctuary + Intelligence Seeding
- [ ] `/vault/temple/page.tsx` — calm landing, chamber selector
- [ ] `/vault/temple/[chamber]/page.tsx` — chamber loads its SpiritualCharacter node
- [ ] Firestore: `spiritual_characters` — seed 12 core characters (Shiva, Krishna, Hanuman, Devi, Shankaracharya...)
- [ ] Firestore: `spiritual_relationships` — seed core leela graph edges
- [ ] Temple Notes CRUD (Firestore: `temple_notes`)
- [ ] Temple Content viewer (Firestore: `temple_content`)
- [ ] Sacred UX: dark indigo theme, Devanagari typography (see Sacred UX Principles below)
- [ ] Personal dictionary: `semantic_dictionary` with `domain: "spiritual"`
- [ ] Add to VaultShell nav — below Management OS, subtle placement

### Phase 3 — Semantic Dictionary Foundation (Layer 1)
- [ ] Seed 30 priority Sanskrit terms (dharma, karma, moksha, maya, advaita...)
- [ ] Monier-Williams XML ingestion pipeline for source grounding
- [ ] Sanskrit → Nepali → Hindi → English layers with IAST
- [ ] Dictionary browser at `/vault/temple/dictionary`
- [ ] Cross-domain: civic term "social justice" ↔ spiritual term "dharma"

### Phase 4 — Character Intelligence Builder
- [ ] Character edit UI — add/edit names, symbols, teachings, leelas
- [ ] Leela graph builder — draw relationships between characters and concepts
- [ ] Chamber atmosphere themes (color, typography per tradition)
- [ ] Audio support — only public domain recordings verified explicitly
- [ ] Sanskrit IAST rendering

### Phase 5 — ZZ Bhakti Chautari (Public World)
- [ ] Public routes: `/spiritual` or separate domain
- [ ] Public semantic_dictionary (`isPublic: true` atoms)
- [ ] Public spiritual_characters (visibility === "published")
- [ ] Bhakti Atoms expression layer — shloka breakdowns, mantra explainers, leela stories
- [ ] All public media grounded in L2 character context (canonicalMediaContext required)

### Phase 6 — Grounded Devotional Media
- [ ] bhakti_atoms with visual/audio generation
- [ ] AI media only permitted with: character context + rasa + symbols + iconographic desc
- [ ] All outputs traceable to character node + scripture reference

---

## Connection to Existing Architecture

| Component | Connection |
|-----------|-----------|
| `docs/CONSTITUTIONAL_MASTER.md` | Constitutional dictionary uses same `semantic_dictionary` collection — civic domain |
| `lib/types/constitutional-master.ts` | `ConstitutionalDictionaryTerm` will be unified with `SpiritualDictionaryTerm` under `SemanticAtomBase` |
| `lib/types/semantic-atom.ts` | NEW — universal protocol for both worlds |
| `lib/vault/copilotContext.ts` | NO connection — Temple Vault does not feed Copilot |
| `lib/vault/managementEngine.ts` | NO connection — Temple Vault has no department |
| Firestore rules | Must add `temple_*` collections to `firestore.rules` before creation |

---

## What NOT to Build

- No public sharing of Temple Notes (ever — architecture rule)
- No "Temple Vault" section in Management OS dashboard
- No AI-generated devotional content on demand
- No recommendation engine inside Temple Vault
- No cross-promotion between Civic and Spiritual worlds in the UI
- No gamification (streaks, points, achievements)
- No notifications about Temple Vault from other parts of the system
- Do not create audio pipelines before authentic source strategy is resolved

---

## The Long-Term Vision

```
ZZC — Nepal's civic intelligence infrastructure
      Constitution. Governance. Policy. Public Understanding.

ZZ  — Spiritual semantic preservation
      Sanskrit. Devotion. Mantra. Bhakti. Cultural Memory.

Both powered by:
ONE semantic intelligence architecture
ONE multilingual atom graph
ONE source-grounded dictionary layer
ONE stable, portable infrastructure

Different realms.
Same principles.
Same continuity.
```

This is not a product roadmap.
This is civilizational semantic infrastructure.
