# ZZC Roadmap

> Last updated: 2026-05-27
> Single owner system — Jeevan Regmi is the only admin.
> Update this file whenever priorities shift.
> Architecture: see docs/ARCHITECTURE_PHILOSOPHY.md — city model, not minimal dashboard.

---

## ✅ Completed (Recent)

- [x] Document upload pipeline (R2 storage + Firestore metadata)
- [x] AI analysis pipeline (Gemini Flash primary, Bedrock fallback)
- [x] Constitution extraction (22-batch, Layer 1 framework)
- [x] Devanagari numeral fix (`parseInt("३")` → correct partNumber)
- [x] PartNumber Repair button (fixes existing data without re-extraction)
- [x] Admin Vault review + approval gate
- [x] Janta Intelligence deep extraction (Layer 2)
- [x] Cross-document relationship matching
- [x] Branch Health page (per-part metrics, no dead zeros)
- [x] Janta public page (story cards, TTS, timeline, Nepali dates)
- [x] WorkflowGuide component (step-by-step admin task flows)
- [x] CTO Assistant / Founder Cockpit (floating dock, rule-based insights)
- [x] Document Library view (govFolder-grouped)
- [x] GovFolder classification system (9 civic library folders)
- [x] ZZC Copilot Memory System (AGENTS.md, CLAUDE.md, docs/)
- [x] govFolder picker in DocumentUploadModal + URL param auto-fill
- [x] Context-aware upload links (Branch Health → upload modal pre-filled)
- [x] Media Workspace (`/vault/media`) — script/narration/visual/caption workflow
- [x] Media atoms type + hook + Firestore rule (`media_atoms`)
- [x] Script generation CF function (Gemini Flash → scriptNepali, narrationText, visualPrompt, captionText)
- [x] Architecture Philosophy doc — city model (docs/ARCHITECTURE_PHILOSOPHY.md)
- [x] Founder Warehouse design doc (docs/FOUNDER_WAREHOUSE.md)

---

## 🔴 Immediate (Do this week)

### 1. Run PartNumber Repair on production data ← DO THIS FIRST
- Go to `/vault/constitution`
- Click "🔧 PartNumber Repair"
- Verify Branch Health shows all 35 parts with data

### 2. ~~DocumentUploadModal govFolder picker~~ ✅ Done
### 3. ~~FounderGuidancePanel upload links~~ ✅ Done

### 4. QA: 10 real documents through full pipeline ← HIGHEST LEVERAGE
- Upload → Analyze → Review → Deep Extract → Verify in Branch Health
- No new expression layer features until this passes
- This validates the atom graph before adding organization layers on top

---

## 🟡 Next (This month)

### 5. Constitution Tree public polish
- Branch states (healthy/sparse/weak/decaying) based on intelligence density
- Each part shows: total articles, intelligence records, last updated
- Leaf nodes link to actual intelligence records

### 6. Signal Intelligence pipeline
- Automated NRB, MoF, Parliament signal ingestion working reliably
- Signal → Admin review → janta_intelligence pipeline
- CTO Assistant alerts when signal gap > 7 days

### 7. Janta page improvements
- More civic sectors with distinct colors
- Better filtering (by govFolder, by constitutional part)
- Offline TTS caching

### 8. AI cost tracking dashboard
- `vault_ai_usage` data visible in Admin Vault
- Per-document cost breakdown
- Monthly cost summary

---

## 🔵 Later (Next quarter) — City Expansion

### 9. Civic Campaigns — first-class civic missions
- `civic_campaigns` Firestore collection + firestore.rules entry
- `/vault/campaigns` page — create campaign, link atoms/docs/media
- Campaign contains: `docIds[]`, `intelIds[]`, `mediaAtomIds[]`, `linkedParts[]`
- See `docs/FOUNDER_WAREHOUSE.md` for full schema + evolution path
- Can grow into: topic universe, research room, media pipeline, public engagement hub

### 10. Founder Warehouse Navigation
- Sidebar reorganization: Intelligence / Library / Pipeline / System districts
- Smart collection views: "Needs media", "High-value atoms", "Missing narratives"
- "Recently worked on" (from localStorage session tracker — already built)
- See `docs/FOUNDER_WAREHOUSE.md` for full vision

### 11. Living Constitution — Branch decay detection
- AI monitors intelligence freshness
- Documents older than 12 months flagged as "potentially outdated"
- Signals from Parliament trigger branch re-health-checks

### 12. Signal Intelligence pipeline — Signal Center
- Automated NRB, MoF, Parliament signal ingestion working reliably
- Signal → Admin review → janta_intelligence pipeline
- New signal → suggest media atom draft automatically

### 13. Relationship Explorer
- Visual graph: which atoms relate to which
- "Underexplored branches" — parts with framework but no janta_intelligence
- "Cluster view" — atom groups by topic/sector

### 14. Media Atom Engine — Phase 2 + 3
- Phase 2: Generated asset tracking (imageUrl, audioUrl, videoUrl in media_atoms)
- Phase 3: Video assembly + multi-platform publish pipeline
- Architecture: see `docs/MEDIA_ATOM_ENGINE.md`

### 15. Public Constitution Tree advanced features
- Full-text search across all intelligence records
- "Which policies affect me?" filter by sector, income level, province
- Branch health states visible on public tree

### 16. Multilingual support
- Nepali (current) + English + Maithili
- Translation via AI with human review gate

### 17. Election / Crisis / Archive Modes
- Runtime context switching — no new collections needed
- Election mode: filter everything through election-relevant atoms
- Crisis mode: surface urgent civic intelligence
- Archive mode: historical document timeline view

---

## Future Rooms (Open Architecture — not deferred, just phased)

These are part of the city vision. Not now, but designed to be addable.

| Room | What it is | When |
|---|---|---|
| Research Lab | Cross-document analysis, gap detection, source tracking | Phase 4 |
| AI Copilot Studio | LLM reasoning on top of rule engine | Phase 6 |
| Simulation Layer | Policy impact modeling | Phase 5 |
| Public Campaign Pages | Citizen-facing campaign views on `/janta/campaigns/` | Phase 5 |
| Educational Tracks | Sequences of constitutional concepts for citizens | Phase 5 |
| Citizen API | Public API over the atom graph | Phase 6 |
| Multi-contributor | Trusted researchers as contributors (manual ID verification) | Phase 6 |

---

## ⛔ Permanently Deferred

Only things that violate the ONE brain principle or quality gate:

| Feature | Why permanently deferred |
|---|---|
| Duplicate intelligence collections | Violates ONE brain principle |
| Open signups / public contributor access | Trust problem — no anonymous contributions |
| Generic LLM chatbot | Not the goal — rule-based CTO engine is the foundation |
| Revenue / monetization | Too early — build quality first |
| Auto-generate video without approval | Cost explosion + quality risk |

---

## Architecture Evolution

### Current: Single-founder, rule-based
- One admin, one quality gate
- Rule-based CTO engine (deterministic, cheap)
- Manual pipeline with guided workflows

### Future: AI-augmented, multi-contributor
- Trusted researchers as contributors (manual ID verification)
- LLM reasoning layer on top of rule-based engine
- Cross-tree intelligence: Nepal's governance as a forest, not one tree
- AI alignment across Constitution Tree, Policy Tree, Budget Tree

---

## Metrics We Care About

| Metric | Target | Current |
|---|---|---|
| Constitution Framework records | 650–750 | ~0 (needs repair) |
| Constitutional parts with data | 35/35 | ~0 (needs repair) |
| Documents in pipeline | 10+ | ? |
| Intelligence records | 1000+ | ? |
| Documents approved | All analyzed | ? |
| Signal gap | < 7 days | ? |
| Branch Health score | > 70% parts healthy | ? |

Check `/vault/constitution/health` and `🧠 CTO Assistant` for live values.
