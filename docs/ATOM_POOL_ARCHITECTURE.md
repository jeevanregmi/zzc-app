# ZZC Atom Pool Architecture
## Universal Knowledge Object System

> "ZZC is not building many apps.  
> ZZC is building one knowledge civilization."

---

## Core Principle

```
One atom. Many classifications. Many routes. No duplicate intelligence.
```

Every meaningful civic or bhakti unit becomes a **Universal Knowledge Object (UKO)**.

Products — Civic Chautari, Economy Chautari, Promise Tracker, Constitution Reader,
Janta Intelligence, Bhakti Chautari, Media Studio, Discussion Forum — are not
separate databases. They are **different windows into the same Atom Pool**.

An atom is never copied into another system. It is classified into multiple
dimensions and routed to multiple products from a single source of truth.

---

## Why This Matters

Without this architecture, every new product creates its own mini-database:

| Product | Its Own Atoms |
|---|---|
| Economy Chautari | `economy_atoms` |
| Promise Tracker | `promise_atoms` |
| Bhakti Chautari | `bhakti_atoms` |
| Media Studio | `media_atoms` |
| Discussion Forum | `discussion_atoms` |

Each stores overlapping facts. A budget promise about youth employment appears
in economy_atoms AND promise_atoms with no connection. A bhakti shloka appears
in shloka_atoms AND media_atoms as a copy.

**Result: fragmented intelligence. Contradictions. No graph. No meaning.**

With the Atom Pool:

> All products become views over the same intelligence graph.  
> The moat is the graph depth, not the product count.

---

## Theoretical Model

ZZC uses five established knowledge management principles, applied together:

### 1. Universal Knowledge Object
Every meaningful unit is a Knowledge Object with a stable ID.
Products reference objects — they never own them.

### 2. Knowledge Graph
Atoms are nodes. Relationships are directed edges with typed meanings.
The graph is the intelligence layer. Products are UI windows into the graph.

### 3. Ontology
Formal rules define what types of objects exist and what types of
relationships are valid between them. The ontology governs the pool.
New domains (Bhakti, Economy, Constitution) extend the ontology — they
do not create parallel schemas.

### 4. Faceted Classification
One atom carries multiple classification dimensions simultaneously:

```
domain × sector × audience × source × time × importance × public-readiness
```

A single atom with `sector: [youth, employment]` AND `publicProduct: [promise_tracker, economy_chautari]`
appears in both products from one record. No copy needed.

### 5. Routing Layer
Classification drives routing. The routing layer reads an atom's approved
classifications and decides exactly which public products it appears in.

```
classifyKnowledgeAtom(atom) → ClassificationSuggestion
  → founder approves →
routeKnowledgeAtom(atom) → KnowledgeRoute
  → product reads route flag
```

---

## Universal Knowledge Object (UKO) Definition

```typescript
interface UniversalKnowledgeObject {
  // Identity
  id:                string;
  ownerId:           string;
  domain:            KnowledgeDomain;    // "civic" | "bhakti" | "shared"
  objectType:        KnowledgeObjectType;

  // Content
  titleNepali:       string;
  summaryNepali:     string;
  meaningNepali:     string;             // citizen impact / devotional meaning

  // Source traceability (mandatory — no public claim without source)
  sourceCollection:  string;             // original Firestore collection
  sourceDocumentId:  string;             // vault_intelligence_docs ID
  sourceDocTitle:    string;
  evidenceText:      string;             // verbatim quote
  pageNumber:        number;

  // Quality signals
  confidence:        number;             // 0–1
  qualityScore:      number;             // 0–1, computed from metadata completeness
  verificationStatus: VerificationStatus;
  publicReady:       boolean;

  // Classification (faceted, founder-approved)
  classifications:     KnowledgeClassifications;
  classificationStatus: ClassificationStatus;

  // Routing (computed from approved classifications)
  routes:            KnowledgeRoute;

  createdAt:         string;
  updatedAt:         string;
}
```

### Object Types

```
constitution_article  — Article / clause from the Nepal Constitution
civic_fact           — Verified factual statement from government document
government_promise   — Specific commitment with source evidence
economic_atom        — Budget allocation, revenue, spending, deficit
shloka_atom          — Shloka / mantra from a sacred text
bhajan_atom          — Bhajan / stuti / devotional song unit
character_teaching   — Teaching attributed to a spiritual character
semantic_term        — Defined term (civic glossary or Sanskrit dictionary)
media_seed           — Pre-classified unit ready for media production
```

---

## Classification Layer

Classifications are the intelligence layer. They are NOT hardcoded inside the atom
at extraction time. They are suggested by the classifier engine and approved by the founder.

### Civic Classifications

```typescript
interface CivicClassifications {
  domains:          string[];   // ["civic", "economy"]
  sectors:          string[];   // ["youth", "employment", "governance"]
  themes:           string[];   // ["accountability", "public finance"]
  audiences:        string[];   // ["students", "citizens", "journalists"]
  sourceTypes:      string[];   // ["budget_speech", "niti_karyakram"]
  timePeriods:      string[];   // ["2083/84", "post_gen_z_movement"]
  publicProducts:   PublicProduct[];
  mediaSuitability: string[];   // ["short_script", "explainer_card"]
  learningLevel:    ("basic" | "intermediate" | "advanced")[];
  relatedMovements: string[];   // ["gen_z_movement_2081"]
}
```

### Bhakti Classifications

```typescript
interface BhaktiClassifications {
  domains:          string[];   // ["bhakti"]
  traditions:       string[];   // ["shaiva", "vedanta", "vaishava"]
  characters:       string[];   // ["shiva", "vishnu", "adi_shankaracharya"]
  textTypes:        string[];   // ["stotra", "shloka", "bhajan", "katha"]
  rasas:            string[];   // ["shanta", "adbhuta", "bhakti"]
  languages:        string[];   // ["sanskrit", "nepali", "hindi"]
  publicProducts:   PublicProduct[];
  mediaSuitability: string[];   // ["chant_card", "devotional_reel"]
}
```

---

## Example: One Atom, Many Classifications

### Civic Example

**Atom:** "सरकारले ५०,००० युवालाई रोजगारी दिने कार्यक्रम घोषणा गर्‍यो।"

```
objectType:  government_promise
domain:      civic

classifications:
  domains:          [civic, economy]
  sectors:          [youth, employment]
  themes:           [accountability, youth_empowerment]
  audiences:        [students, citizens]
  sourceTypes:      [budget_speech]
  timePeriods:      [2083/84]
  publicProducts:   [promise_tracker, economy_chautari, civic_feed]
  mediaSuitability: [short_script, explainer_card]
  relatedMovements: [gen_z_movement_2081]

routes:
  showInPromiseTracker:   true
  showInEconomyChautari:  true
  showInCivicFeed:        true
  showInMediaStudio:      true
  showInBhaktiChautari:   false
```

Same atom. One record. Three product windows.

### Bhakti Example

**Atom:** "नमामीशमीशान निर्वाणरूपम्"

```
objectType:  shloka_atom
domain:      bhakti

classifications:
  domains:          [bhakti]
  traditions:       [shaiva]
  characters:       [shiva]
  textTypes:        [stotra]
  rasas:            [shanta, adbhuta]
  languages:        [sanskrit]
  publicProducts:   [shloka_explorer, bhakti_chautari]
  mediaSuitability: [chant_card]

routes:
  showInBhaktiChautari:    true
  showInMediaStudio:       true
  showInCivicFeed:         false
  showInPromiseTracker:    false
```

---

## Relationship Layer — Knowledge Graph Edges

Atoms connect to each other through typed relationship edges.

**Collection:** `knowledge_edges`

```typescript
interface KnowledgeEdge {
  id:                string;
  ownerId:           string;
  sourceAtomId:      string;
  targetAtomId:      string;
  sourceCollection:  string;   // which collection sourceAtomId lives in
  targetCollection:  string;
  relationType:      KnowledgeRelationType;
  explanationNepali: string;
  evidenceRef?:      string;
  confidence:        number;
  verificationStatus: VerificationStatus;
  createdAt:         string;
}
```

### Civic Relationship Types

```
supports              — Atom A is evidence for Atom B
contradicts           — Atom A conflicts with Atom B
repeats               — Same promise appeared in a prior year
updates               — Atom A supersedes Atom B
depends_on            — Atom A requires Atom B to be meaningful
relates_to_constitution — Atom links to a constitutional article
funded_by_budget      — Promise has allocated budget atom as evidence
promised_by_government — Budget allocation has a promise atom as source
monitored_by_institution — An institution is responsible for this atom
affects_group         — Atom directly affects a named group
```

### Bhakti Relationship Types

```
praises               — Shloka praises a character
explains              — One atom explains another
invokes               — Mantra invokes a deity
belongs_to_text       — Shloka belongs to a source text
describes_character   — Teaching describes a character
teaches_concept       — Atom teaches a spiritual concept
has_rasa              — Atom carries a specific rasa
related_to_mantra     — Atom is associated with a mantra
related_to_leela      — Atom refers to a leela episode
```

### Shared Relationship Types

```
similar_meaning       — Semantic similarity across atoms
translation_of        — Atom is a translation of another
commentary_on         — Atom comments on or elaborates another
source_for            — Atom is the source evidence for another
public_ready_for      — Atom enables another atom to go public
```

---

## Routing Layer

Routing is a pure function. It reads an atom's **approved classifications**
and returns a routing map.

```typescript
function routeKnowledgeAtom(atom: UniversalKnowledgeObject): KnowledgeRoute

interface KnowledgeRoute {
  showInCivicFeed:           boolean;
  showInConstitutionReader:  boolean;
  showInEconomyChautari:     boolean;
  showInPromiseTracker:      boolean;
  showInBhaktiChautari:      boolean;
  showInSlokhaExplorer:      boolean;
  showInMediaStudio:         boolean;
  showInDiscussionQueue:     boolean;
  showInAITutor:             boolean;
  keepVaultOnly:             boolean;
}
```

### Routing Rules (rule-based, Phase 4)

```
publicProducts includes "promise_tracker"   → showInPromiseTracker = true
publicProducts includes "economy_chautari"  → showInEconomyChautari = true
publicProducts includes "civic_feed"        → showInCivicFeed = true
publicProducts includes "bhakti_chautari"   → showInBhaktiChautari = true
publicProducts includes "shloka_explorer"   → showInSlokhaExplorer = true
publicProducts includes "media_studio"      → showInMediaStudio = true
publicProducts includes "discussion_forum"  → showInDiscussionQueue = true

publicReady == false                        → keepVaultOnly = true, all show* = false
verificationStatus == "ai_extracted"        → keepVaultOnly = true (founder review required)
```

---

## Classifier Pipeline

Classification is a separate pass AFTER extraction. Never mixed into the extraction prompt.

```
Phase 1: Extract atom
         AI reads document → extracts raw UKO fields (title, evidence, page, sector hints)
         Stored as: verificationStatus="ai_extracted", classificationStatus="pending"

Phase 2: Classify
         classifyKnowledgeAtom(atom) runs against the raw atom
         Rule-based first: keywords, sector mapping, docType, fiscal year, character names
         Returns: ClassificationSuggestion (pending founder review)

Phase 3: Founder Review
         Classification Queue shows: "यो atom promise_tracker + economy_chautari मा राख्ने?"
         Founder: approve / edit / reject / defer
         On approve: classificationStatus = "approved", routes computed, stored

Phase 4: Route
         routeKnowledgeAtom(atom) reads approved classifications
         Returns KnowledgeRoute — used by all public product queries

Phase 5 (future): AI Semantic Classifier
         Embedding similarity, graph-based recommendations
         Suggests cross-domain connections (civic atom ↔ bhakti atom with related meaning)
```

---

## Founder Review — Classification Queue

Every classification suggestion is reviewable before it affects the public system.

```typescript
interface ClassificationSuggestion {
  id:                       string;
  ownerId:                  string;
  atomId:                   string;
  sourceCollection:         string;
  atomPreview:              string;         // titleNepali snippet
  suggestedClassifications: KnowledgeClassifications;
  suggestedRoutes:          KnowledgeRoute;
  generatedBy:              "rule_engine" | "ai_classifier" | "founder";
  status:                   "pending" | "approved" | "edited" | "rejected" | "deferred";
  founderNote?:             string;
  createdAt:                string;
  reviewedAt?:              string;
}
```

Vault UI shows per-suggestion:

```
"यो atom youth + employment + promise tracker मा राख्ने?"

[ ✓ Approve ] [ ✏ Edit ] [ ✗ Reject ] [ ⌛ Later ]
```

Nothing routes to public products without founder approval.

---

## Existing Collections → UKO Adapter Map

The Atom Pool is an **adapter layer over existing collections**. Collections are NOT migrated.

| Existing Collection | UKO objectType | Adapter Function |
|---|---|---|
| `janta_intelligence` | `civic_fact` | `civicAtomToUKO()` |
| `economy_atoms` | `economic_atom` | `economyAtomToUKO()` |
| `promise_atoms` | `government_promise` | `promiseAtomToUKO()` |
| `constitutional_framework` | `constitution_article` | `constitutionArticleToUKO()` |
| `shloka_atoms` | `shloka_atom` | `shlokaAtomToUKO()` |
| `bhakti_atoms` | `bhajan_atom` | `bhaktiAtomToUKO()` |
| `semantic_dictionary` | `semantic_term` | `semanticTermToUKO()` |

Each adapter reads the source document and returns a `UniversalKnowledgeObject`.
The source document is never modified. The UKO is a view, not a copy.

---

## Public Products

| Product | Route Flag | Domain | Current Status |
|---|---|---|---|
| Civic Feed | `showInCivicFeed` | civic | Phase 6 (deferred) |
| Constitution Reader | `showInConstitutionReader` | civic | Live |
| Janta Intelligence | `showInJantaFeed` | civic | Live |
| Economy Chautari | `showInEconomyChautari` | civic | Phase 3 |
| Promise Tracker | `showInPromiseTracker` | civic | Phase 2 (building) |
| Bhakti Chautari | `showInBhaktiChautari` | bhakti | Phase 5 |
| Shloka Explorer | `showInSlokhaExplorer` | bhakti | Phase 5 |
| Media Studio | `showInMediaStudio` | shared | Phase 4 |
| Discussion Forum | `showInDiscussionQueue` | shared | Phase 7 |
| AI Tutor | `showInAITutor` | shared | Phase 8 |

---

## Build Order

```
Phase 1 (DONE): Architecture doc (this file)

Phase 2 (DONE): TypeScript types
  lib/types/knowledge-objects.ts
  — UniversalKnowledgeObject
  — KnowledgeClassifications (civic + bhakti)
  — KnowledgeEdge
  — KnowledgeRoute
  — ClassificationSuggestion
  — Adapter function signatures (stubs)

Phase 3 (NEXT, after real data QA):
  lib/knowledge/adapters.ts
  — civicAtomToUKO()
  — economyAtomToUKO()
  — promiseAtomToUKO()
  — constitutionArticleToUKO()
  — shlokaAtomToUKO()

Phase 4 (after Phase 3):
  lib/knowledge/classifier.ts
  — classifyKnowledgeAtom() — rule-based
  — Keyword maps, sector maps, source type maps

Phase 5 (after Phase 4):
  lib/knowledge/router.ts
  — routeKnowledgeAtom() — reads approved classifications
  — Returns KnowledgeRoute

Phase 6 (after Phase 5):
  Vault UI: Classification Queue
  — Shows pending suggestions per atom
  — Founder approve / edit / reject / defer

Phase 7 (future):
  knowledge_edges Firestore collection
  — Relationship graph between atoms
  — Cross-domain connections

Phase 8 (future):
  AI Semantic Classifier
  — Embedding similarity
  — Graph-based recommendations
```

---

## Hard Rules

1. **Never copy intelligence.** An atom appears in multiple products via routing, never via duplication.

2. **No public route without founder approval.** `publicReady == false` → `keepVaultOnly = true`. No exceptions.

3. **Source evidence is mandatory.** Every UKO must have `evidenceText + pageNumber`. No unverifiable claims.

4. **Classification is a separate pass.** The extraction prompt extracts facts. The classifier suggests categories. Mixing them degrades both.

5. **Collections are not migrated.** The UKO is an adapter interface. Existing collections stay. Migrations are a future decision after the adapter layer is proven.

6. **The graph grows incrementally.** Edges are optional on creation. An isolated atom with good classifications is useful. A connected atom is more useful. Build depth over time.

7. **Non-partisan rule applies across the pool.** No editorial opinion. Factual, source-backed, citizen-friendly. This rule is domain-agnostic.
