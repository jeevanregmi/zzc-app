# ZZC Portability & Continuity Audit

> Last updated: 2026-05-26
> Philosophy: "Device is temporary. ZZC cloud system is permanent."
> Founder should be able to: lose device → open any browser → login → continue instantly.

---

## ✅ Already Cloud-Native (No Risk)

| Layer | What | Status |
|---|---|---|
| **Code** | GitHub repo (github.com/jeevanregmi/zzc-app) | ✅ Fully cloud |
| **Database** | Firebase Firestore (Google Cloud) | ✅ Fully cloud |
| **File storage** | Cloudflare R2 (documents) | ✅ Fully cloud |
| **Auth** | Firebase Auth (email/password) | ✅ Cloud login |
| **Deploy** | GitHub Actions → Cloudflare Pages | ✅ Auto from push |
| **Domain** | Cloudflare DNS + Pages | ✅ Cloud managed |
| **Public site** | Deployed on Cloudflare Pages | ✅ Fully cloud |

---

## ⚠️ Local-Only Dependencies (Current Risks)

### 1. Environment Secrets — CRITICAL
**Risk:** `.env.local` file lives only on founder's laptop.
If laptop is lost, all secrets must be manually re-entered.

**Secrets at risk:**
- `FIREBASE_ADMIN_*` (service account keys)
- `GEMINI_API_KEY`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `CLOUDFLARE_API_TOKEN` / `R2_*`
- `ANTHROPIC_API_KEY`

**Current state:** These exist in GitHub Secrets for CI/CD deploy — so deployment works from any machine.
**Gap:** Local development requires `.env.local` to be recreated manually.

**Fix (Stage 1):** Document all required env vars in `docs/ENV_TEMPLATE.md`.
**Fix (Stage 2):** Store encrypted copy in Bitwarden or 1Password (personal vault).

---

### 2. Founder Workflow State — LOW RISK (mostly mitigated)
**Risk:** "What was I working on?" lost between devices/sessions.

**Current state:**
- `zzc_last_session` in localStorage — survives browser refresh, NOT cross-device
- CTO Insights (Firestore-backed) — fully cloud, same on any device
- Cockpit open/close state — localStorage only

**Gap:** localStorage keys (`zzc_last_session`, `zzc_cto_dismissed_v2`, `zzc_vault_mode`) are device-local.

**Fix (Stage 2):** Sync Cockpit dismissed state to a Firestore `vault_preferences` doc (per-founder).
For now: CTO Insights regenerate from Firestore on any new device — functionally equivalent.

---

### 3. Claude Code / Claude.md Memory — LOW RISK
**Risk:** AI working memory lives in `C:\Users\jeeva\.claude\...`

**Current state:** `/memory/*.md` files are on current device only.
**Gap:** On a new device, Claude Code starts with no project memory.

**Fix (Stage 1):** `AGENTS.md` + `CLAUDE.md` + `docs/RUNBOOK.md` + `docs/ROADMAP.md` are checked into git — these are the primary portable institutional brain. They transfer automatically on `git clone`.
**Fix (Stage 2):** Periodically merge key learnings from `.claude/memory/` into `CLAUDE.md`.

---

### 4. Local Dev Environment — LOW RISK
**Risk:** Node.js version, pnpm/npm version, wrangler installed locally.

**Current state:** No `.nvmrc` or explicit engine lock.
**Gap:** On a new machine, tooling setup takes ~30 minutes.

**Fix (Stage 1):** Add `.nvmrc` (Node 22) and document setup in `docs/SETUP.md`.

---

## 🔵 Backup Strategy

### Firestore
- **Current:** No automated exports.
- **Risk:** Data loss if project is accidentally deleted (very low — Firebase has project-level protection).
- **Stage 2:** Enable Firestore scheduled exports to Cloud Storage (GCP Console → Firestore → Backups).
- **Cost:** ~$0.10/GB/month.

### GitHub
- **Current:** Code is on GitHub. Single remote.
- **Risk:** GitHub goes down (extremely rare; 99.9% SLA).
- **Stage 3:** If critical: mirror to Cloudflare Git or self-hosted Gitea (not needed now).

### Cloudflare R2 (Documents)
- **Current:** Documents uploaded to R2. No versioning.
- **Risk:** Accidental deletion is permanent (no recycle bin in R2).
- **Stage 2:** Enable R2 Object Versioning (free at current scale).

### Environment Variables
- **Current:** In GitHub Secrets (for CI) + local `.env.local` (for dev).
- **Stage 1:** Maintain a personal encrypted note (Bitwarden) with all env var values.

---

## 📋 Staged Migration Plan

### Stage 1 — Do This Week (Zero Engineering)
- [ ] Save all `.env.local` values to Bitwarden (personal vault)
- [ ] Create `docs/ENV_TEMPLATE.md` with all required env var names and where to get each
- [ ] Add `.nvmrc` file with `22` (current Node version)
- [ ] Verify GitHub Secrets match current `.env.local` values

### Stage 2 — Do This Month (Minimal Engineering)
- [ ] Enable R2 Object Versioning in Cloudflare dashboard
- [ ] Enable Firestore daily exports to Cloud Storage
- [ ] Sync Cockpit dismissed/preferences to `vault_preferences` Firestore collection
- [ ] Document new-device setup checklist in `docs/SETUP.md`

### Stage 3 — Future (Only if needed)
- [ ] Cross-device localStorage sync via Firestore `vault_preferences`
- [ ] GitHub mirror / secondary remote

---

## 🔐 New Device Checklist (Current Process)

When starting on a new device, do this:

```bash
# 1. Clone repo
git clone https://github.com/jeevanregmi/zzc-app.git
cd zzc-app

# 2. Install Node 22 (use nvm)
nvm install 22 && nvm use 22

# 3. Install dependencies
npm install

# 4. Recreate .env.local (from Bitwarden)
# Required vars: see docs/ENV_TEMPLATE.md (TODO: create this)

# 5. Verify connection
npx tsc --noEmit    # must be 0 errors
# Open https://zzc.jeevanregmi.com.np/vault — login with Firebase account

# 6. System state
# Open Founder Cockpit (🧠 bottom right) — Firestore data loads instantly
```

**Time to productive on new device:** ~20 minutes (mostly `npm install` + env vars)

---

## 🧠 AI Continuity (Claude Code)

The repo-level memory files are the portable institutional brain.
They transfer automatically via `git clone` — no setup required.

| File | Purpose | Portable? |
|---|---|---|
| `AGENTS.md` | Universal AI working rules | ✅ Git |
| `CLAUDE.md` | Claude Code working memory + preferences | ✅ Git |
| `docs/RUNBOOK.md` | Operational procedures | ✅ Git |
| `docs/ROADMAP.md` | Current priorities | ✅ Git |
| `docs/PORTABILITY.md` | This file | ✅ Git |
| `.claude/memory/*.md` | Session-specific learnings | ❌ Local only |

**Rule:** When you learn something important in a Claude Code session, merge it into `CLAUDE.md`
so it survives a device change.

---

## Architecture Assessment

**Current rating: 7/10 portable**

Strong: All user data (Firestore + R2), all code (GitHub), deploy pipeline (CI/CD), auth (Firebase), AI memory files (git).

Gap: Secrets are the only true single-device dependency. Everything else can be recreated in <20 minutes.

**Target: 9/10** after Stage 1 + Stage 2. No engineering required for Stage 1.
