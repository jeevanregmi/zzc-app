# Founder Testing SOP
## Manual QA Checklist — Document Intelligence Pipeline

**Purpose:** Before publishing any document's intelligence publicly, every stage of the pipeline must pass this checklist. Run this for each "golden" test document.

**Who runs this:** Jeevan Regmi (sole founder/admin). No automation replaces this checklist.

---

## Pre-Check: System Health

Go to `/vault/system` before testing any document.

- [ ] Firebase Auth: Signed in (green ✓)
- [ ] R2 Storage: Configured (green ✓)
- [ ] AI Provider: At least one active (Gemini / Bedrock / Anthropic green ✓)
- [ ] Pipeline: Zero "अड्किएको" (stuck) docs — if any exist, fix before adding new docs

If any of the above fail, stop. Fix infrastructure first.

---

## Stage 1: Upload

**Where:** `/vault/documents` → Upload button

Steps:
1. Upload a real official government document (PDF)
2. Fill in: title, govFolder, institutionName, docYear, originalSourceUrl
3. Confirm upload completes (no error toast)

Checks:
- [ ] Document appears in the Documents list
- [ ] `processingStatus` shows as "ready" (not "error")
- [ ] `downloadUrl` is present (viewable in the card)
- [ ] `govFolder` is set correctly (shows in library view)
- [ ] Go to `/vault/system` → Pipeline section shows this doc as "Action चाहिन्छ" (AI analysis needed)

---

## Stage 2: AI Analysis

**Where:** `/vault/documents` → Document card → "AI Analyze" button

Steps:
1. Click "AI Analyze" on the document
2. Wait 1–3 minutes (status changes to "processing_ai" then "ai_ready")

Checks:
- [ ] Status changes to "AI Analysis चल्दैछ" during processing
- [ ] Status changes to "ai_ready" after completion (no "error")
- [ ] `aiSummary` is populated (non-empty, makes sense for the document)
- [ ] `aiKeyInsights` has meaningful entries
- [ ] `nepaliExplainer` is readable plain Nepali
- [ ] `/vault/system` shows this doc as "Review बाँकी"

If status stays "error" or "ai_paused":
- Check `/vault/system` → AI Provider diagnostics
- Confirm API credits are not exhausted
- Do NOT delete the document — it is safe in R2

---

## Stage 3: Admin Review & Approval

**Where:** `/vault/admin?tab=documents`

Steps:
1. Find the document in the pending review list
2. Read the AI summary — does it correctly describe the document?
3. Check `nepaliExplainer` — is it accurate for a citizen audience?
4. If good: click "Approve"
5. If issues: click "Needs Revision" and note what is wrong

Checks:
- [ ] `adminApprovalStatus` changes to "approved"
- [ ] `/vault/system` pipeline shows this doc as "Extract बाँकी"
- [ ] Document does NOT appear on the public `/janta` page yet (correct — not yet extracted)

**Never approve:**
- Documents with empty/nonsense AI summaries
- Documents where source credibility is unclear
- Test/demo files (delete those from `/vault/system-cleanup`)

---

## Stage 4: Intelligence Extract

**Where:** `/vault/documents` → Document card → "Extract Intelligence" button

Steps:
1. Click "Extract Intelligence" on the approved document
2. Wait 2–5 minutes

Checks:
- [ ] `intelCount` goes from 0 to > 0 (check in the card or `/vault/system-cleanup`)
- [ ] Go to `/vault/system-cleanup` → document shows "Intel NN" count > 0
- [ ] Records appear in the Quality tab (`/vault/quality`)
- [ ] `/vault/system` shows this doc as "Pipeline पूरा" (healthy)

If intelCount stays 0 after extraction:
- Check browser console for API errors
- Confirm document was approved (`adminApprovalStatus === "approved"`)
- Do NOT re-extract without checking — each call costs money

---

## Stage 5 (Optional): Atomic Extract

**Where:** `/vault/documents` → Atomic Queue section (visible when docs are eligible)

Steps:
1. Only run for `knowledgeTier: "foundation"` or `"national"` documents
2. Set a budget limit before running
3. Click "Run Queue"

Checks:
- [ ] `atomicCount` > 0 after run (check in `/vault/system-cleanup`)
- [ ] Atomic History shows this doc's run
- [ ] Budget was not exceeded
- [ ] Document shows `extractionTier: "atomic"`

---

## Stage 6 (Optional): Classification

**Where:** `/vault/knowledge`

Steps:
1. Click "Scan" to generate classification suggestions for extracted atoms
2. Review each suggestion
3. Approve or reject

Checks:
- [ ] Suggestions appear for the atoms from this document
- [ ] Classifications make sense for the document's content
- [ ] At least 1 classification approved

---

## Stage 7: Public Ready Check

**Where:** `/janta` (public page)

Steps:
1. Open the public `/janta` page
2. Filter by the document's sector/govFolder

Checks:
- [ ] Stories from this document appear (if `publishToJanta` is set)
- [ ] Story cards show correct title, sector color, and summary
- [ ] TTS works on at least one story card
- [ ] No test data appears in the public feed

---

## End-to-End: 10 Golden Documents Checklist

For the QA sprint to be complete, 10 real official documents must pass ALL stages above.

| # | Document | Upload ✓ | AI ✓ | Approved ✓ | Intel ✓ | Atomic ✓ | Public ✓ |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
| 2 | | | | | | | |
| 3 | | | | | | | |
| 4 | | | | | | | |
| 5 | | | | | | | |
| 6 | | | | | | | |
| 7 | | | | | | | |
| 8 | | | | | | | |
| 9 | | | | | | | |
| 10 | | | | | | | |

**Sprint complete when:** All 10 rows have ✓ in Intel column. Atomic and Public are optional for the sprint but required before launching new public features.

---

## Data Cleanup Rules

After any testing session, run `/vault/system-cleanup` and:

- **Delete:** Any doc with title containing "test", "demo", "sample", "tmp", "untitled" AND no intel records
- **Archive:** Any doc with no source URL + no AI analysis + no intel
- **Keep:** Any doc with `adminApprovalStatus === "approved"` + intelCount > 0
- **Review:** Everything else — founder judgment required

Never delete a document with intel records without first exporting or reviewing those records.

---

## Cost Guards

| Action | Check before running |
|---|---|
| AI Analyze | `processingStatus` must be "ready" or "error" |
| Intelligence Extract | `adminApprovalStatus` must be "approved" AND intelCount === 0 |
| Atomic Extract | Set budget; only run for foundation/national tier docs |
| Re-Extract | Must see cost warning modal; never re-run silently |

---

*Last updated: 2026-05-30*
*Owner: Jeevan Regmi*
