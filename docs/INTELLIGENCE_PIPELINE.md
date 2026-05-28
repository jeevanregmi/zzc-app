# ZZC Intelligence Extraction Pipeline

## The Two Tiers

ZZC has a strict distinction between what it currently does and what it is architecturally designed to do. Do not conflate them.

---

## Tier 1 — Operational Analysis (BUILT)

**What it does:** Document-level AI analysis. Fast. One AI call per document.

**Produces:**
- `aiSummary` — 2–3 paragraph document summary
- `tags` — civic topic tags
- `institutionName`, `govFolder`, `docYear` — metadata inference
- `affectedSectors`, `policyChanges`, `financialImplications` — civic signals
- `nepaliExplainer` — 2–3 sentence plain-Nepali explanation
- `contentIdeas` — content flywheel seeds

**Sets:** `processingStatus: "ai_ready"`, `extractionTier: "operational"`

**Honest label:** "विश्लेषण" / "AI Analyze" — NOT "extract", NOT "deep"

---

## Tier 1.5 — Structured Intelligence (BUILT)

**What it does:** Structured record extraction from an approved document. Multiple AI calls. Costs more. Founder approval required before this runs.

**Produces:**
- `janta_intelligence` records — typed policy records with constitutional references
  - Types: `promise`, `budget_target`, `project`, `institution`, `reform`, `social_program`
  - Fields: `constitutionalRefs[]`, `implementationStatus`, `sourceQuote`, `traceability`
- `janta_relationships` — cross-document edges (same commitment found in two docs)
- `constitutional_framework` — article-level extraction (for the Constitution only)

**Sets:** `extractionTier: "structured"`

**Honest label:** "Intelligence Extract" / "Intelligence निकाल्नुहोस्" — NOT "deep"

**Previous mislabeling:** This was called "Deep Extract" in early versions. Renamed to "Intelligence Extract" because "deep" implies Tier 2 atomic depth that this tier does not reach.

---

## Tier 2 — Atomic Extraction (NOT YET BUILT — architecture only)

**What it will do:** Paragraph → atom-level decomposition with full reasoning lineage.

**Will produce (civic):**
- `CivicDocumentSection[]` — section-level extraction with constitutional grounding
- `SemanticDictionaryEntry` records (domain: "civic") — terms with multilingual meaning
- `ReasoningTrace` — every atom linked to the exact sentence that generated it
- Atom relationship graph — edges between civic concepts across documents

**Will produce (bhakti):**
- `ShlokaAtom[]` — one atom per meaningful verse/line
- `DevotionalRasa` classification per atom — typed nine-rasa system
- `SanskritRoot[]` — dhatu extraction → seeds semantic dictionary
- Character enrichment — `SpiritualCharacter` attributes grow from atoms
- Symbolic relationship graph — deity ↔ attribute ↔ symbol edges

**Sets:** `extractionTier: "atomic"`, `SacredTextStatus: "atoms_extracted"`

**Honest label:** "आणविक निकाल" / "Atomic Extract" — this label is RESERVED for Tier 2 only

---

## ExtractionTier field

Every `IntelligenceDocument` and `SacredText` carries `extractionTier?: ExtractionTier`.

```typescript
type ExtractionTier = "none" | "operational" | "structured" | "atomic"
```

This field is:
- Set explicitly by the pipeline (not inferred from other fields)
- The single source of truth for how deeply a document has been processed
- Used by UI badges and recommendation engine to show honest depth

---

## Label Dictionary (canonical terms)

| Operation | Honest Label | Do NOT call it |
|-----------|-------------|----------------|
| AI Analyze (Tier 1) | विश्लेषण / AI Analyze | "extract", "deep", "atomic" |
| Intelligence Extract (Tier 1.5) | Intelligence Extract | "deep extract", "deep intelligence" |
| Atomic Extraction (Tier 2) | Atomic Extract / आणविक निकाल | "analyze", "structured" |
| Shloka Atoms (Tier 2, bhakti) | Atom Extraction | "analysis", "summary" |

---

## What Already Exists

```
lib/types/extraction-pipeline.ts   ← ExtractionTier, DevotionalRasa, SanskritRoot,
                                      CivicAtomicExtractionResult, BhaktiAtomicExtractionResult,
                                      ReasoningTrace, SourceTrace — Phase 2 contracts

lib/types/semantic-atom.ts         ← SemanticAtomBase, CivicSemanticAtom,
                                      SpiritualSemanticAtom — the atom schema (complete)

lib/types/sacred-text.ts           ← SacredText, ShlokaAtom — bhakti intake
lib/types/documents.ts             ← IntelligenceDocument with extractionTier field
lib/types/canonical-identity.ts    ← CanonicalDocument — one document = one identity
lib/types/recommendations.ts       ← UniversalRecommendation — enrichment queue
```

---

## What Phase 2 Requires (not yet built)

1. **Civic atomic extraction API** — section splitter → paragraph decomposer → atom extractor
2. **Constitutional grounding engine** — maps paragraphs to specific constitutional articles
3. **Multilingual meaning grounding** — Nepali ↔ English ↔ Sanskrit term alignment
4. **Source traceability store** — `source_traces` collection (docId + sectionIndex + quote + confidence)
5. **Bhakti extraction API** — line-by-line shloka decomposer → rasa classifier → dhatu extractor
6. **Reasoning lineage store** — `reasoning_traces` collection per document
7. **Founder atom review UI** — approve/reject individual atoms before they become canonical

Phase 2 builds ON TOP of the existing canonical identity and recommendation queue infrastructure. It does not replace them.

---

## Architecture Principle

> Outputs can multiply. Intelligence must remain singular.

Tier 1 and Tier 1.5 produce documents and records.  
Tier 2 produces atoms — the smallest meaningful units that every output layer references.  
Atoms are never duplicated. They are always referenced by canonical ID.  
Every atom carries a `SourceTrace` pointing to the exact sentence that created it.
