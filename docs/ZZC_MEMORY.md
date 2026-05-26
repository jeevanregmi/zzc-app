# ZZC Long-Term Project Memory

> This document is the institutional memory of ZZC. It captures vision, philosophy,
> architecture decisions, and the thinking behind the system. Read this when starting
> a new feature, hiring a collaborator, or onboarding a new AI assistant.

---

## Vision

**ZZC is Nepal's civic intelligence infrastructure.**

Nepal has a gap: government documents, laws, budgets, and policies exist — but they are:
- Hard to find
- Harder to understand
- Impossible to connect to daily life

ZZC closes this gap by:
1. Ingesting official documents (PDF, DOCX, reports)
2. Extracting structured intelligence using AI
3. Connecting intelligence to Nepal's Constitution
4. Publishing it in plain Nepali for every citizen

---

## The Two-Layer Model

### Layer 1 — Constitutional Framework (Static)

- Source: Nepal's Constitution 2072 (308 articles, 35 parts)
- Collection: `constitutional_framework`
- Extracted once, rarely changes
- Purpose: The skeleton. Every piece of intelligence attaches to a Part and Article.
- Example record: Article 18 (Right to Equality) → Part 3 → Fundamental Rights

### Layer 2 — Janta Intelligence (Living)

- Source: Government documents, NRB circulars, budgets, court decisions
- Collection: `janta_intelligence`
- Extracted from each document using AI
- Purpose: The flesh. Real policies, promises, facts, linked to the Constitution skeleton.
- Example record: "Budget 2081 allocates NPR 80B for housing" → linked to Art 35 (Right to Housing)

These two layers together form the **Living Constitution** — a document that grows with governance.

---

## Constitution Tree

The public-facing visualization of the two-layer model.

URL: `/constitution` (and `/tree`)

Each "branch" = one constitutional Part (1–35).
Each "leaf" = one intelligence record.
"Branch health" = ratio of actual intelligence to potential (based on Framework density).

Branch states (planned):
- 🟢 Healthy — active intelligence, recent signals
- 🟡 Sparse — some coverage, gaps exist
- 🔴 Weak — minimal intelligence, needs documents
- 🍂 Decaying — intelligence exists but outdated

---

## Founder Intelligence Cockpit

The `/vault` backend is not a traditional admin panel.

It is a **living operating system** that:
- Observes the system state continuously
- Proactively tells the Founder what to do next
- Remembers where workflows were left off
- Explains every metric in plain Nepali

Key components:
- **CTO Assistant** — floating dock present on every `/vault` page. Shows system health, top priority action, blocked pipelines.
- **WorkflowGuide** — step-by-step guide for multi-step tasks (document pipeline, constitution extraction).
- **Branch Health** — per-part intelligence density metrics.

The Founder should never feel lost, confused, or overwhelmed.

---

## Document Intelligence Pipeline

```
Upload Document
    ↓
AI Analyze (topics, rights, institutions, promises, risks)
    ↓
Admin Review + Approve
    ↓
Deep Extract (Janta Intelligence records)
    ↓
Relationship Match (cross-document graph)
    ↓
Branch Health Update
    ↓
Public Tree (citizens explore)
```

Every step is tracked in `vault_documents`:
- `processingStatus`: ready | processing_ai | ai_ready | ai_paused
- `adminApprovalStatus`: pending_review | approved | needs_revision

**The document is always safe.** AI failure never loses the file — it only sets status to `ai_paused`.

---

## National Civic Intelligence Library

Documents are organized into `govFolder` categories:

| Folder | Nepali | What goes here |
|---|---|---|
| `constitution` | संविधान | Constitution text, amendments |
| `budget-economy` | बजेट र अर्थव्यवस्था | Annual budgets, NRB reports, EPF/SSF |
| `policy-planning` | नीति र योजना | Periodic Plans, ministry strategies |
| `parliament` | संसद | Bills, committee reports, proceedings |
| `judiciary` | न्यायपालिका | Court decisions, legal interpretations |
| `local-governance` | स्थानीय शासन | Municipality budgets, ward reports |
| `citizen-intelligence` | नागरिक सूचना | RTI, complaints, surveys |
| `media-signals` | मिडिया र संकेत | News, URL signals, RSS intelligence |
| `other` | अन्य | Uncategorized |

---

## Product Philosophy

### Nepali First

ZZC is built for Nepali citizens — specifically the 18–35 age group. Every feature decision starts with: "Would an ordinary Nepali citizen understand this?"

- Language: Nepali everywhere. English is a fallback for technical terms only.
- Complexity: Simple. Janta (public) pages must require zero context to understand.
- Trust: Every AI output is human-approved before going public.

### Backend = Teach the Founder

The backend must teach the Founder how the system works:
- Every admin page answers: "What is this? Why does it matter? What do I do next?"
- Learning Mode adds Nepali explanations to every term.
- CTO Assistant proactively guides without overwhelming.

### Quality Gate

AI output is never trusted blindly:
1. AI analyzes → stores in `ai_ready`
2. Admin reviews → approves or rejects
3. Only approved records go to Deep Extract and Public Tree

This quality gate is permanent — even if AI improves, human verification stays.

### Cost Discipline

Every AI call costs money. Rules:
- Check if already done before running
- Show cost warning before expensive operations
- Log every call to `vault_ai_usage`
- Use `ai_paused` not `error` when billing fails

---

## Signal Intelligence

The Civic Signal Feed monitors live government sources:
- NRB (Nepal Rastra Bank) circulars
- Ministry of Finance press releases
- Parliament announcements
- Supreme Court decisions

Signals are ingested into `civic_signals`, then promoted to `janta_intelligence` after admin review.

A signal gap > 7 days triggers a CTO Assistant alert.

---

## Living Intelligence Graph

The relationship system (`janta_relationships`) connects intelligence records across documents:

- "Budget 2081 housing fund" ↔ "EPF housing loan circular" ↔ "Art 35 Right to Housing"
- Cross-document patterns emerge automatically via AI matching after Deep Extract
- This graph will eventually power AI-assisted policy analysis

---

## Key Decisions Made

| Decision | Reason |
|---|---|
| R2 for document storage (not Firebase Storage) | Cheaper at scale, Cloudflare-native |
| Firestore for metadata | Real-time capable, owner-scoped rules |
| Single owner model | Quality gate requires human judgment — open uploads would break trust |
| 22-batch constitution extraction | Cloudflare 30s CPU limit per request |
| `ai_paused` vs `error` | Never lose document context due to billing issues |
| `govFolder` classification | Makes library scalable — not a flat file list |
| Rule-based CTO engine (no LLM) | Reliable, deterministic, no AI cost for cockpit |
