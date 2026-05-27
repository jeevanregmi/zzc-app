# ZZC Temple Vault & ZZ Spiritual World

> Version: 1.0 — Phase 1 design document
> Status: Spec / types only — no routes, no collections created yet
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
              Atoms:     sanskrit_atoms, bhakti_atoms, mantra_atoms (Phase 3+)
```

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

## Firestore Collections (Phase 2+)

None created yet. When Phase 2 begins:

```javascript
// firestore.rules additions:

match /temple_chambers/{id} {
  allow read, write: if isOwner();
}

match /temple_notes/{id} {
  allow read, write: if isOwner();
}

match /temple_content/{id} {
  allow read, write: if isOwner();
}

// Spiritual dictionary terms — PRIVATE in Phase 2
// May become public read in Phase 3+ (ZZ Spiritual Public)
match /semantic_dictionary/{id} {
  allow read: if isOwner();   // private for now
  allow write: if isOwner();
  // Phase 3: update to `allow read: if resource.data.isPublic == true;`
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

### Phase 1 (NOW) — Design only
- [x] `docs/TEMPLE_VAULT.md`
- [x] `lib/types/temple-vault.ts`
- [x] `lib/types/semantic-atom.ts`
- No routes, no Firestore collections, no UI

### Phase 2 — Private Sanctuary
- [ ] `/vault/temple/page.tsx` — calm landing, chamber selector
- [ ] `/vault/temple/[chamber]/page.tsx` — individual chamber
- [ ] Temple Notes CRUD (Firestore: `temple_notes`)
- [ ] Temple Content viewer (Firestore: `temple_content`)
- [ ] Sacred UX: dark indigo theme, Devanagari typography
- [ ] Personal dictionary entry: `semantic_dictionary` (spiritual domain)
- [ ] Add to VaultShell nav — below Management OS, subtle placement

### Phase 3 — Spiritual Dictionary Foundation
- [ ] Seed 30 priority Sanskrit terms manually
- [ ] Monier-Williams XML ingestion pipeline
- [ ] Sanskrit → Nepali → Hindi → English mapping UI
- [ ] Source grounding display
- [ ] Dictionary browser at `/vault/temple/dictionary`

### Phase 4 — Immersive Experience
- [ ] Chamber atmosphere themes (color, typography, background)
- [ ] Audio support (mantra/bhajan) — only with verified public domain sources
- [ ] Meditation/focus mode
- [ ] Sanskrit text rendering with IAST transliteration
- [ ] Semantic relationship graph (related terms web)

### Phase 5 — ZZ Spiritual Public World
- [ ] Public routes: `/spiritual` or `zz.jeevanregmi.com.np`
- [ ] Public `semantic_dictionary` read access for `isPublic: true` terms
- [ ] Public bhajan/stotra library
- [ ] Sanskrit semantic learning experience
- [ ] Devotional content separate from founder's private vault

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
