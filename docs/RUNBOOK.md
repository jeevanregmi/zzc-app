# ZZC Operational Runbook

> Step-by-step procedures for operating the ZZC backend.
> Follow these exactly — they encode lessons learned from past failures.

---

## 1. Upload a Document

**Where**: `/vault/documents` → "+ Upload Document"

**Steps**:
1. Click `+ Upload Document`
2. Drag or select PDF/DOCX (max 50 MB)
3. Fill in:
   - **Title**: Human-readable name (Nepali preferred)
   - **Civic Library Folder** (`govFolder`): Select the most appropriate category
   - **Institution**: e.g., "Nepal Rastra Bank", "Ministry of Finance"
   - **Year**: Fiscal or calendar year of the document
   - **Tags**: Comma-separated keywords
4. Click Upload
5. Document status → `ready` in Firestore
6. Proceed to AI Analyze

**Common issues**:
- Upload fails with R2 error → Check Cloudflare Pages → Settings → Functions → `VAULT_BUCKET` binding
- 50 MB limit error → Compress the PDF first

---

## 2. AI Analyze a Document

**Where**: `/vault/documents` → Document card → "AI ले Analyze गर्नुस्"

**Steps**:
1. Find the document with status `ready`
2. Click the Analyze button on the document card
3. Status changes to `processing_ai`
4. Wait 15–30 seconds (Cloudflare 30s limit)
5. Status changes to `ai_ready`
6. Review AI output in the card (summary, topics, insights)

**If it fails with `ai_paused`**:
- Document is safe — not lost
- Check AI provider billing at `/vault/system`
- Add API key or top up billing
- Re-click Analyze when ready

**If it times out (504)**:
- Try again — the function will retry automatically
- If persistent, check Cloudflare Pages function logs

**Cost**: ~0.001–0.01 USD per document depending on size

---

## 3. Admin Review / Approve a Document

**Where**: `/vault/admin` → Documents tab

**Steps**:
1. Find documents with status `ai_ready` and `pending_review`
2. Click to expand the document
3. Read AI summary, key insights, detected topics
4. If correct → click **Approve**
5. If wrong → click **Needs Revision** (document goes back to `ready`)
6. Status changes to `approved`

**This step is mandatory** — Deep Extract only works on approved documents.

---

## 4. Deep Extract Intelligence

**Where**: `/vault/documents` → Document card → "Deep Extract"

**Pre-conditions**: `adminApprovalStatus === "approved"`

**Cost check first**:
- Look at the Intel count on the document card
- If count > 0, do NOT re-extract (unnecessary AI cost)
- Only extract when intel count = 0

**Steps**:
1. Click "Deep Extract" on an approved document card
2. AI reads the full document and extracts:
   - Janta Intelligence records (`janta_intelligence`)
   - Policy points (`vault_policy_points`)
3. After extraction, auto-runs Relationship Match
4. Intel count updates on the card

**Cost**: ~0.01–0.05 USD per document (larger docs cost more)

**If re-extract is needed** (document changed, extractor improved):
- The card shows a cost-guard modal — confirm before proceeding
- Old records are deleted before new ones are inserted

---

## 5. Extract Constitution Framework

**Where**: `/vault/documents` → Constitution document card → "📜 संविधान Framework निकाल्नुस्"

**This is a one-time operation** — do not re-run unless framework is completely wrong.

**Steps**:
1. Upload the Constitution 2072 PDF
2. AI Analyze it (required for OCR)
3. On the document card, click "📜 संविधान Framework निकाल्नुस्"
4. 22 batches run sequentially (14 articles each)
5. Progress shows: `Batch 1/22 (धारा १–१४)…`
6. On completion: ~700 records in `constitutional_framework`
7. Go to `/vault/constitution` to verify

**If a batch times out**:
- The function times out at 30s (Cloudflare limit)
- Click Extract again — resume logic skips already-saved batches
- Safe to re-run multiple times

**After extraction, check for PartNumber=0**:
1. Go to `/vault/constitution`
2. If any records show `भाग (0)`, click "🔧 PartNumber Repair"
3. Repair fixes partNumbers without re-extracting

**Cost**: ~0.10–0.20 USD total (22 batch calls)

---

## 6. Verify Constitution Data

**Where**: `/vault/constitution` and `/vault/constitution/health`

**Checks**:
1. Record count should be ~650–750 (308 articles × ~2 records each)
2. Parts count should be 35 (all भागहरू)
3. Branch Health page should show all 35 parts with data
4. Average confidence should be > 75%

**If parts show 0 articles**:
- Check PartNumber Repair first (see above)
- If still 0 after repair, re-extract that batch (check which batch covers that part)

**If Branch Health shows 0 everywhere**:
- The `ownerId` filter might be wrong — check the logged-in user UID
- Check browser console for Firestore permission errors

---

## 7. Debug Firestore Zeros

When any metric shows 0 unexpectedly:

**Step 1: Check Firestore rules**
```
Open browser DevTools → Console
Look for: "Missing or insufficient permissions"
```

**Step 2: Check ownerId filter**
All queries must have: `where("ownerId", "==", uid)`
Unfiltered queries will be rejected by Firestore rules → return 0 silently.

**Step 3: Check collection name**
Phantom collections always return 0 (they're empty):
- `constitutional_atoms` ← never written, always 0, do NOT use
- `constitutional_relationships` ← same
- `vault_civic_atoms` ← same

**Step 4: Check data exists**
Go to Firebase Console → Firestore → find the collection → check if documents exist for that ownerId.

**Step 5: Check `safe()` wrapper**
If a query throws and the code uses `.catch(() => EMPTY)`, the error is silently swallowed.
Remove the wrapper temporarily to see the real error.

---

## 8. Deploy to Production

**Normal deploy** (automatic):
```bash
git push origin main
# GitHub Actions runs automatically → Cloudflare Pages deploy
# Takes ~2 minutes
```

**Check deploy status**:
- GitHub → Actions tab → "Deploy to Cloudflare Pages"
- Look for green checkmark
- If red X → click to see error log

**Verify after deploy**:
```
https://zzc.jeevanregmi.com.np/vault
```
- Login should work
- Navigation should work
- Documents page should load without errors

**If Cloudflare deploy fails**:
1. Check GitHub Actions logs for the specific error
2. Most common: TypeScript error that wasn't caught locally
3. Fix locally, `npx tsc --noEmit`, re-push

---

## 9. Handle Re-Extract Safely

**Decision tree**:

```
Does the document already have intel records (count > 0)?
  YES → Do NOT re-extract. The records are fine unless:
        - The document was replaced with a new version
        - The extractor prompt was significantly improved
        - The AI output is factually wrong
  NO  → Extract normally (no cost guard needed)
```

**When re-extract IS needed**:
1. Open Document card → click "Deep Extract"
2. Cost guard modal appears: shows existing record count + cost warning
3. Click "Force Re-extract" to confirm
4. Old records are deleted → new extraction runs

**Never** re-extract just because confidence is slightly low. Use Branch Health to identify actually problematic records.

---

## 10. Check Signal Feed

**Where**: `/vault/content/intelligence`

**Normal state**: Signals appearing daily from NRB, MoF, Parliament

**If no signals in 7+ days**:
1. Check source configurations are active
2. Check GitHub Actions → "Poll Monitored Sources" workflow
3. If workflow is failing → check the error log
4. Manually trigger: GitHub → Actions → "Poll Monitored Sources" → Run workflow

**Signal processing**:
- Raw signals arrive in `civic_signals`
- Admin reviews signals → promotes to `janta_intelligence`
- Or signals can be ingested as documents → run through full pipeline

---

## 11. Emergency: Restore a Stuck Document

If a document is stuck in `processing_ai` indefinitely:

1. Go to `/vault/documents`
2. Find the document card
3. Look for "Reset गरेर फेरि Analyze गर्नुस्" button (appears after timeout)
4. Click to reset to `ready` state
5. Re-analyze

Or manually in Firestore Console:
```
vault_documents → {docId} → processingStatus: "ready"
```

---

## Reference: Environment Variables

Set in Cloudflare Pages → Settings → Environment Variables:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude AI (fallback provider) |
| `GOOGLE_API_KEY` | Gemini Flash (primary AI provider) |
| `AWS_ACCESS_KEY_ID` | Bedrock (secondary fallback) |
| `AWS_SECRET_ACCESS_KEY` | Bedrock |
| `FIREBASE_SERVICE_ACCOUNT` | Server-side Firebase access |
| `VAULT_BUCKET` | R2 bucket binding (Cloudflare function binding, not env var) |
