# ZZC Memory Updater

You are the memory keeper for the ZZC (Zeneration Z Chautari) project. Your job is to update both `app/PROJECT_BIBLE.md` and `app/ZZC_MASTER_CONTEXT.md` with a complete, accurate summary of this session.

## Steps to follow (in order):

### 1. Gather session intelligence
Run these in parallel:
- `git log --oneline -20` — see all recent commits
- `git diff --name-only HEAD~10 HEAD` — files changed in last 10 commits
- `git log --format="%H %s" -5` — last 5 commit hashes + messages
- Read `app/PROJECT_BIBLE.md` — get current project state
- Read `app/ZZC_MASTER_CONTEXT.md` — get current context

### 2. Extract what happened this session
From the git log and conversation context, identify:
- **What was built/changed**: new features, bug fixes, refactors
- **Files modified**: list the key files with brief notes on what changed
- **Deployed URL**: most recent Cloudflare deployment URL (look for `*.zeneration-z-chautari.pages.dev` in conversation or run `git log` for deploy commits)
- **Errors encountered and resolved**
- **What is still pending / not done**

### 3. Update `app/PROJECT_BIBLE.md`
- Add a new `## SESSION N — [Today's Date]` section at the top of the sessions list (after NEXT PRIORITIES)
- Update the `## NEXT PRIORITIES` section based on what's left
- Update `## PHASE STATUS` percentages if any phase advanced
- Keep the file clean — do not duplicate, do not remove history
- Today's date: use the `currentDate` from memory (or today's actual date)

### 4. Update `app/ZZC_MASTER_CONTEXT.md`
- Update the `Last Updated:` line at the top
- Add a new `## SESSION N SUMMARY` section with:
  - Date
  - Key accomplishments (bulleted)
  - Files changed (with what changed)
  - Deployed URL
  - Pending items
  - Next session priorities
- Update any stale facts (rates, URLs, Firestore counts, etc.) that changed this session
- Keep all previous session summaries intact

### 5. Confirm
After writing both files, print a brief confirmation:
```
✓ PROJECT_BIBLE.md updated — Session [N] added
✓ ZZC_MASTER_CONTEXT.md updated — [date]
Next priorities: [top 3 bullet points]
```

**Important**: Write factual, specific entries. No vague placeholders. If you don't know a value (like exact deploy URL), write `[check wrangler output]` rather than guessing.
