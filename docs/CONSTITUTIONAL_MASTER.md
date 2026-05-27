# ZZC Constitutional Intelligence Infrastructure

> Version: 1.0 — Phase 4 design document
> Status: Spec / types only — no collections created yet
> Author: Jeevan Regmi + Claude Code
> Last updated: 2026-05-28

---

## Vision

ZZC will become Nepal's first normalized constitutional knowledge graph.

Today's `constitutional_framework` collection stores raw AI extractions —
articles, clauses, Nepali summaries, confidence scores.
This is useful but fragile: extraction errors persist, bilingual mapping is implicit,
and there is no semantic dictionary to ground AI interpretations.

The Constitutional Intelligence Infrastructure solves this with three new layers:

```
Raw Extractions (constitutional_framework — existing, unchanged)
        ↓
Normalization Pipeline (Phase 6 — human-reviewed)
        ↓
constitutional_master    — verified, canonical article graph
constitutional_variants  — raw OCR outputs, parsing failures, alternates
constitutional_dictionary — Nepali ↔ English civic term mappings
```

These three collections become the semantic foundation for ALL downstream systems:
branch health, civic atoms, media atoms, public explanations, AI copilots, civic search.

---

## The ONE Brain Extension

The existing ONE Brain rule still applies:

```
constitutional_master (canonical truth)
    ↓
constitutional_framework (raw extraction, still used until master is populated)
    ↓
janta_intelligence (policy intelligence per document)
    ↓
janta_relationships (cross-document graph)
        ↓
Everything else references — never duplicates
```

When `constitutional_master` is populated for a given `articleId`, all downstream
systems should prefer it over `constitutional_framework`. The migration is gradual.

---

## Collections

### 1. constitutional_master

The verified, canonical constitutional graph. One record per constitutional article/clause.

```typescript
interface ConstitutionalMasterRecord {
  id:            string;   // same articleId as constitutional_framework ("art-18")
  ownerId:       string;

  // ── Identity (verified) ────────────────────────────────────────────────────
  articleId:     string;   // "art-18"
  partNumber:    number;   // 3 (verified, not extracted)
  part:          string;   // "Part 3 — Fundamental Rights"
  article:       number;   // 18
  clause?:       string;   // null | "1" | "a" | "j(3)"

  // ── Verified bilingual content ─────────────────────────────────────────────
  titleEnglish:  string;   // "Right to Equality"
  titleNepali:   string;   // "समानताको हक"
  textEnglish:   string;   // verbatim English constitutional text
  textNepali:    string;   // verbatim Nepali constitutional text (देवनागरी)
  summaryNepali: string;   // plain-language Nepali explanation (max 120 chars)

  // ── Semantic tagging (verified by founder) ─────────────────────────────────
  constitutionalThemes: string[];  // ["fundamental rights", "equality", "non-discrimination"]
  rights?:       string[];         // ["right to equality", "equal protection"]
  institutions?: string[];         // ["Supreme Court", "Parliament"]
  dictionaryRefs: string[];        // term IDs from constitutional_dictionary

  // ── Source traceability ────────────────────────────────────────────────────
  sourceFrameworkId?: string;      // constitutional_framework record ID this was derived from
  sourcePage?:  number;            // PDF page number
  confidence:   number;            // 0–1, founder-verified records get 1.0

  // ── Normalization metadata ─────────────────────────────────────────────────
  normalizedAt: string;   // ISO timestamp — when this was manually verified
  normalizedBy: string;   // "founder" | "ai_suggestion_accepted"
  reviewStatus: "verified" | "ai_suggested" | "needs_review";
}
```

**Firestore path:** `constitutional_master/{id}`
**Access:** `where("ownerId", "==", uid)` — private to founder

---

### 2. constitutional_variants

Stores raw extractions, OCR outputs, parsing failures, and historical versions.
Never shown publicly. Used for debugging and re-normalization.

```typescript
interface ConstitutionalVariant {
  id:            string;
  ownerId:       string;
  articleId:     string;   // links to constitutional_master record
  variantType:   "raw_extraction" | "ocr_output" | "parsing_failure" | "historical";
  rawText:       string;   // exactly as extracted or scanned
  rawPart?:      string;   // raw part field from extraction ("भाग ३", "Part 3", "0")
  parsedPartNumber?: number; // what the parser thought it was
  extractedAt:   string;
  sourceDocId?:  string;   // vault_documents docId if from a specific doc
  extractionModel?: string; // "gemini-flash-2.0", "bedrock-sonnet"
  errorNote?:    string;   // why this variant was flagged
}
```

**Firestore path:** `constitutional_variants/{id}`
**Access:** `where("ownerId", "==", uid)` — private to founder

---

### 3. constitutional_dictionary

Nepal's civic constitutional language dictionary.
Maps English civic/legal terms ↔ Nepali constitutional language.

This is one of ZZC's most defensible long-term assets.

```typescript
interface ConstitutionalDictionaryTerm {
  id:            string;   // "egalitarian", "federal-democratic-republic"
  ownerId:       string;

  // ── Core mapping ───────────────────────────────────────────────────────────
  termEnglish:   string;   // "egalitarian"
  termNepali:    string;   // "समतामूलक"

  // ── Expanded meanings ──────────────────────────────────────────────────────
  definitionEnglish: string;  // "relating to equal rights for all people"
  definitionNepali:  string;  // "सबैको समान अधिकार र अवसर सुनिश्चित गर्ने सिद्धान्त"
  usageExamples: string[];    // how this term appears in the constitution

  // ── Constitutional grounding ───────────────────────────────────────────────
  articleRefs:   string[];    // article IDs where this term appears ("art-18", "art-4")
  partRefs:      number[];    // parts where this term is most relevant
  relatedTerms:  string[];    // other dictionary term IDs

  // ── Classification ────────────────────────────────────────────────────────
  domain:        "fundamental_rights" | "governance" | "federal_structure" |
                 "social_justice" | "economic_rights" | "cultural_rights" |
                 "judicial" | "constitutional_principles";
  difficultyLevel: "citizen" | "educated" | "legal";  // reading complexity

  // ── Metadata ──────────────────────────────────────────────────────────────
  addedAt:       string;
  addedBy:       "founder" | "ai_suggestion";
  verified:      boolean;
}
```

**Firestore path:** `constitutional_dictionary/{id}`
**Public read rule:** `allow read: if true;`  ← this collection IS public
**Write rule:** `allow write: if isOwner();`

---

## Constitutional Dictionary — Seed Terms

Priority seed list. These should be the first 20 terms entered manually:

| English | Nepali |
|---------|--------|
| egalitarian | समतामूलक |
| equity | न्यायोचित समान पहुँच |
| social justice | सामाजिक न्याय |
| federal democratic republic | संघीय लोकतान्त्रिक गणतन्त्र |
| fundamental rights | मौलिक हकहरू |
| directive principles | राज्यका निर्देशक सिद्धान्तहरू |
| constitutional body | संवैधानिक निकाय |
| sovereignty | सार्वभौमसत्ता |
| separation of powers | शक्ति पृथकीकरण |
| rule of law | कानुनको शासन |
| judicial review | न्यायिक पुनरावलोकन |
| proportional representation | समानुपातिक प्रतिनिधित्व |
| secularism | धर्मनिरपेक्षता |
| positive discrimination | सकारात्मक विभेद |
| citizenship | नागरिकता |
| human dignity | मानवीय मर्यादा |
| due process | उचित कानुनी प्रक्रिया |
| public interest | सार्वजनिक हित |
| constitutional amendment | संविधान संशोधन |
| impeachment | महाभियोग |

---

## Normalization Pipeline (Phase 6)

The pipeline that converts `constitutional_framework` records into `constitutional_master`:

```
Step 1 — Structure Validation
  Input:  constitutional_framework record
  Check:  partNumber > 0, article > 0, articleId not empty
  Fail:   → constitutional_variants (type: "parsing_failure")

Step 2 — Part Detection
  Input:  `part` string field ("भाग ३", "Part 3 — Fundamental Rights")
  Logic:  devanagari → int, fallback to English number
  Output: verified partNumber

Step 3 — Article Detection
  Input:  `articleId` field ("art-18"), `article` field
  Logic:  parse from articleId pattern if article field is 0
  Output: verified article number

Step 4 — Nepali-English Matching
  Input:  titleEnglish, titleNepali, originalText
  Check:  both fields present, not placeholder
  Enrich: from constitutional_dictionary term lookups

Step 5 — Meaning Validation
  Input:  plainNepaliSummary
  Check:  not empty, not generic, min 20 chars
  Future: AI-assisted quality check

Step 6 — Master Write
  Output: constitutional_master record with reviewStatus: "ai_suggested"
  Founder action: review and flip to "verified"
```

---

## Repair System Redesign

### Current state (before normalization pipeline):

**Repairable** (auto-repair possible):
- `partNumber === 0` AND `part` string field exists → Devanagari-to-int parsing

**Not repairable** (manual review required):
- `partNumber === null | undefined` → No part field, cannot infer
- These go into the manual review queue

**What to show in UI:**
```
If repairableCount > 0:
  → Amber card: "X धाराहरू auto-repair गर्न सकिन्छ" + Repair button

If unclassifiedCount > 0:
  → Gray card: "X records — Manual Constitutional Review आवश्यक"
  → Shows raw text preview (no action button — future Phase 6)

Never: show a Repair button for records that cannot actually be repaired.
```

### Phase 6 — Manual Review Workflow (not yet built):

```
For each unclassified record:
  1. Show: raw text, articleId, raw `part` string
  2. AI suggests: likely partNumber (with confidence)
  3. Founder: Accept (writes to constitutional_master) or Skip
  4. Accepted records: reviewStatus = "ai_suggestion_accepted"
  5. Rejected: stay in constitutional_variants as "parsing_failure"
```

---

## Why This Matters for Nepal

Nepal currently lacks:
- A structured constitutional language graph
- Nepali-English constitutional term mapping
- Semantic constitutional dictionary
- Civic interpretation infrastructure

ZZC can become the canonical constitutional intelligence layer for Nepal, used by:
- Branch health monitoring
- Civic atoms and media atoms
- Public constitutional explanations
- AI copilots grounded in real constitutional text
- Future civic search and constitutional Q&A
- Educational institutions

---

## Firestore Rules (add when creating collections)

When `constitutional_master` is created, add to `firestore.rules`:

```javascript
match /constitutional_master/{id} {
  allow read: if isOwner();
  allow write: if isOwner();
}

match /constitutional_variants/{id} {
  allow read: if isOwner();
  allow write: if isOwner();
}

match /constitutional_dictionary/{id} {
  allow read: if true;  // PUBLIC — civic education layer
  allow write: if isOwner();
}
```

---

## Build Phases

### Phase 4 (NOW complete) — Design only
- [x] `docs/CONSTITUTIONAL_MASTER.md`
- [x] `lib/types/constitutional-master.ts`
- [x] Repair UI fixed — no misleading buttons for unclassifiable records
- No collections created yet

### Phase 5 — Dictionary Entry
- [ ] Manually seed `constitutional_dictionary` with 20 priority terms
- [ ] Add dictionary admin UI at `/vault/constitution/dictionary`
- [ ] Connect dictionary to Branch Health page (term hover definitions)
- [ ] Public dictionary endpoint (civic education)

### Phase 6 — Normalization Pipeline
- [ ] Build normalization pipeline: `constitutional_framework` → `constitutional_master`
- [ ] Manual review workflow UI for unclassified records
- [ ] Accept/reject flow writing to `constitutional_master`
- [ ] Downstream systems prefer `constitutional_master` when available

### Phase 7 — Full Semantic Layer
- [ ] `constitutional_variants` collection for raw/historical data
- [ ] AI-suggested normalization with confidence scores
- [ ] Cross-article relationship graph
- [ ] Semantic embeddings (future — requires vector store)

---

## What NOT to Build (yet)

- Do not create `constitutional_master` in Firestore until Phase 5 dictionary is seeded
- Do not migrate existing `constitutional_framework` records until repair is complete
- Do not build semantic embeddings until Phase 7
- Do not make `constitutional_framework` reads deprecated — it is still Layer 1 source of truth
- Do not build public constitutional search until Phase 7

---

## Connection to Other Docs

- `docs/MANAGEMENT_OS.md` — Intelligence Department owns this pipeline
- `lib/types/management.ts` — CIO officer monitors constitutional health KPIs
- `lib/vault/copilotContext.ts` — `branchHealth` sub-type reads from `constitutional_framework`
- `docs/ARCHITECTURE_PHILOSOPHY.md` — Constitutional master is a permanent room in the ZZC city
