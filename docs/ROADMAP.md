# ZZC Roadmap

> Last updated: 2026-05-26
> Single owner system — Jeevan Regmi is the only admin.
> Update this file whenever priorities shift.

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

---

## 🔴 Immediate (Do this week)

### 1. Run PartNumber Repair on production data
- Go to `/vault/constitution`
- Click "🔧 PartNumber Repair"
- Verify Branch Health shows all 35 parts with data

### 2. DocumentUploadModal govFolder picker
- Add dropdown for `govFolder` selection in upload modal
- Read URL params `?govFolder=constitution&parts=1&tags=constitution` for auto-fill
- When coming from a WorkflowGuide recommendation, form should pre-fill

### 3. FounderGuidancePanel upload links
- "📤 Upload →" links in Branch Health should pass `govFolder` + `parts` as URL params
- e.g., `/vault/documents?govFolder=constitution&parts=3&tags=fundamental-rights`

### 4. QA: 10 real documents through full pipeline
- Upload → Analyze → Review → Deep Extract → Verify in Branch Health
- No new features until this passes

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

## 🔵 Later (Next quarter)

### 9. Living Constitution — Branch decay detection
- AI monitors intelligence freshness
- Documents older than 12 months flagged as "potentially outdated"
- Signals from Parliament trigger branch re-health-checks

### 10. Public Constitution Tree advanced features
- Full-text search across all intelligence records
- "Which policies affect me?" filter by sector, income level, province
- Share specific articles on social media

### 11. Janta mobile app (React Native)
- Same civic intelligence, optimized for mobile
- Push notifications for new government policies
- Offline-capable for rural users

### 12. Multilingual support
- Nepali (current) + English + Maithili (major second language)
- Translation via AI with human review gate

### 13. Media Atom Engine — Civic intelligence → short clips
- Architecture: see `docs/MEDIA_ATOM_ENGINE.md`
- Media atoms are an EXPRESSION LAYER on top of existing intelligence atoms
- `media_atoms` Firestore collection references `constitutional_framework` / `janta_intelligence` — never duplicates
- Phase 1: Script generation (Gemini Flash) + admin approve → caption export
- Phase 2: Visual prompt + AI image generation
- Phase 3: TTS narration + video assembly + TikTok/YouTube Shorts publish
- **Prerequisite:** QA sprint (#4) + stable intel pipeline + Signal Intelligence (#6) + AI cost dashboard (#8)
- Safe media only: AI-generated visuals, own animations, CC0, government footage

---

## ⛔ Not Now (Explicitly deferred)

These are good ideas that would distract from the core mission right now:

| Feature | Why deferred |
|---|---|
| Math Verification Vault | Needs dedicated QA system; deferred until calculator is stable |
| Taxonomy Governance | AI tag suggestions need admin review gate before canonical use |
| Social Membership System | Open signups break quality gate; manual verification too expensive now |
| Generic LLM chatbot | Not the goal — rule-based CTO engine is the right foundation |
| Public editor / contribute mode | Trust problem — anonymous contributions could inject false data |
| Revenue / monetization | Too early — build quality first |
| Mobile app | Web must be excellent first |

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
