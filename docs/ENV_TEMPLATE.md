# ZZC Environment Variables — Complete Reference

> Keep this file updated. It is the portable secret recovery guide.
> Store actual values in Bitwarden under vault: "ZZC Production Secrets"
> NEVER commit actual values to git.

---

## Quick Setup on a New Device

```bash
# 1. Clone repo
git clone https://github.com/jeevanregmi/zzc-app.git
cd zzc-app

# 2. Install Node 22 (via nvm)
nvm install 22 && nvm use 22

# 3. Install dependencies
npm install

# 4. Create local dev env (for dev mode only — bypasses Firebase Auth)
cp docs/ENV_TEMPLATE.md .env.development.local
# Edit the copy — replace placeholder values with real ones from Bitwarden

# 5. Create wrangler secrets (for Cloudflare Pages Functions — production)
# See "Cloudflare Pages Function Secrets" section below

# 6. Verify
npx tsc --noEmit   # must be 0 errors
```

---

## Firebase (Client SDK — hardcoded in app/firebase.ts)

These are public-safe values. Already hardcoded — no env var needed.

| Value | Current |
|---|---|
| Project ID | `zeneration-z-chautari` |
| Auth Domain | `zeneration-z-chautari.firebaseapp.com` |
| App ID | `1:825250336340:web:8182b568d8186c2041e7c1` |

**If you need to regenerate:** Firebase Console → Project Settings → General → Your apps

---

## Cloudflare Pages Function Secrets

These are set via Cloudflare dashboard or wrangler CLI.
They are available as `env.VAR_NAME` inside `/functions/api/*.ts`.

### How to set (Cloudflare Dashboard):
1. Go to Cloudflare Dashboard → Pages → zeneration-z-chautari
2. Settings → Environment Variables
3. Add each secret below under "Production" environment

### How to set (wrangler CLI):
```bash
npx wrangler pages secret put GEMINI_API_KEY
```

---

### Required Secrets

#### AI — Primary (Gemini)

| Variable | Required | Where to get |
|---|---|---|
| `GEMINI_API_KEY` | ✅ Yes | [Google AI Studio](https://aistudio.google.com/apikey) → API Keys |
| `GEMINI_MODEL` | Optional | Default: `gemini-2.5-flash` — change only to upgrade model |

#### AI — Fallback (AWS Bedrock)

| Variable | Required | Where to get |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | ✅ Yes | AWS Console → IAM → Users → [user] → Security credentials |
| `AWS_SECRET_ACCESS_KEY` | ✅ Yes | Same as above (only shown once on creation) |
| `AWS_REGION` | ✅ Yes | e.g. `us-east-1` — must match Bedrock-enabled region |
| `BEDROCK_MODEL_ID` | Optional | Default: `anthropic.claude-3-5-sonnet-20241022-v2:0` |

#### AI — Anthropic Direct (optional fallback)

| Variable | Required | Where to get |
|---|---|---|
| `ANTHROPIC_API_KEY` | Optional | [Anthropic Console](https://console.anthropic.com/) → API Keys |

#### Storage — Cloudflare R2

R2 bucket binding is configured in `wrangler.toml` (already committed):
```toml
[[r2_buckets]]
binding     = "VAULT_BUCKET"
bucket_name = "zzc-vault"
```

**No secret needed** — the binding is handled by Cloudflare automatically in production.
For local wrangler dev: `npx wrangler pages dev` picks up the binding automatically.

#### Firebase Admin SDK

| Variable | Required | Where to get |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | ✅ Yes (if using Admin SDK) | Firebase Console → Project Settings → Service Accounts → Generate new private key → JSON content (minified, base64-encoded) |

**Note:** Check whether any current functions actually use `FIREBASE_SERVICE_ACCOUNT`.
Firestore client SDK in `app/firebase.ts` uses Firebase Auth (client-side) — no admin SDK needed for that.

---

## Local Development Only (.env.development.local)

This file bypasses Firebase Auth for local pipeline testing. **Never commit.**

```bash
# .env.development.local

# Set to true to bypass Firebase Auth (dev mode only)
NEXT_PUBLIC_DEV_VAULT_MODE=true
NEXT_PUBLIC_DEV_OWNER_ID=dev-zzc-pipeline-2026
```

**When to use:** Only when testing the vault UI without a Firebase account locally.
**Production:** Never set `NEXT_PUBLIC_DEV_VAULT_MODE=true` in Cloudflare Pages env vars.

---

## GitHub Actions Secrets (for CI/CD deploy)

These are set in: GitHub → repo → Settings → Secrets and variables → Actions

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Allows GitHub Actions to deploy to Cloudflare Pages |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |

**Where to get `CLOUDFLARE_API_TOKEN`:**
1. Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → "Edit Cloudflare Pages" template
3. Scope to zeneration-z-chautari project

---

## Verification Checklist (After Setup)

```bash
# 1. TypeScript clean
npx tsc --noEmit

# 2. Health endpoint (production)
# Visit: https://zzc.jeevanregmi.com.np/api/health
# Expected: { gemini: "ok", bedrock: "ok" }

# 3. Vault login
# Visit: https://zzc.jeevanregmi.com.np/vault
# Login with: JEEVANREGMI15@gmail.com

# 4. Founder Cockpit
# Click 🧠 bottom-right — should load without errors
# Check Documents count matches Firestore

# 5. Upload test
# Upload a small PDF → verify it appears in Documents list
```

---

## Secret Rotation Guide

| Secret | Rotation | Impact if leaked |
|---|---|---|
| `GEMINI_API_KEY` | Annually or if leaked | AI cost explosion — rotate immediately |
| `AWS_ACCESS_KEY_ID/SECRET` | Annually | AWS cost — rotate immediately, check CloudTrail |
| `ANTHROPIC_API_KEY` | Annually | AI cost — rotate immediately |
| `CLOUDFLARE_API_TOKEN` | Annually | Deployment access — rotate if repo is compromised |
| `FIREBASE_SERVICE_ACCOUNT` | Annually | Firestore write access — rotate in Firebase console |

**Rotation process:**
1. Generate new key in provider console
2. Update Cloudflare Pages environment variable
3. Update GitHub Actions secret
4. Update Bitwarden note
5. Delete old key from provider console
6. Verify health endpoint still returns OK

---

## Bitwarden Storage Format

Store as a Secure Note in Bitwarden:
```
Name: ZZC Production Secrets
Folder: Projects/ZZC

GEMINI_API_KEY=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
ANTHROPIC_API_KEY=...
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
FIREBASE_SERVICE_ACCOUNT=...

Last updated: 2026-05-26
```
