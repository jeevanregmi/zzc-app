# Credentials Map

Locations only — no values stored here.

## Cloudflare Pages Secrets

Set via: `echo "value" | npx wrangler pages secret put KEY --project-name zeneration-z-chautari`
View via: Cloudflare Dashboard → Pages → zeneration-z-chautari → Settings → Environment variables

| Secret | Last rotated | Notes |
|---|---|---|
| ANTHROPIC_API_KEY | Unknown | Direct API key from console.anthropic.com |
| AWS_ACCESS_KEY_ID | 2026-05-16 | IAM user: zzc-production, description: zzc-cloudflare-production-v2 |
| AWS_SECRET_ACCESS_KEY | 2026-05-16 | Pair with above |
| AWS_REGION | 2026-05-15 | Value: us-east-1 |

## GitHub Actions Secrets

Set via: GitHub → repo → Settings → Secrets and variables → Actions

| Secret | Purpose |
|---|---|
| FIREBASE_SERVICE_ACCOUNT | JSON service account for Admin SDK (used by scrape-rates.js, poll-monitored-sources.js) |
| FIREBASE_PROJECT_ID | Firebase project: zeneration-z-chautari |
| CRON_SECRET | Optional header for cron→API auth (set if endpoint protection needed) |

## Firebase

- Project: zeneration-z-chautari
- Config: app/firebase.ts (uses public config, safe to commit)
- Admin SDK: service account JSON stored only in GitHub Secrets

## AWS IAM

- Account ID: 135501090730
- User: zzc-production
- Console: https://135501090730.signin.aws.amazon.com/console
- Permissions: AmazonBedrockFullAccess

## Rotation Policy

- Rotate immediately after any plaintext exposure (chat, logs, emails)
- Rotate AWS keys every 90 days minimum
- After rotation: update Cloudflare secret → verify deploy → delete old key
