# Deployment

## Rules

- NO GitHub auto-deploy — git push does NOT trigger redeploy
- Every deploy is manual from local machine
- Always commit to git BEFORE deploying

## Deploy Commands (PowerShell)

```powershell
npm run build
npx wrangler pages deploy out --project-name zeneration-z-chautari --commit-dirty=true
```

## Set / Update a Secret

```powershell
echo "value" | npx wrangler pages secret put SECRET_NAME --project-name zeneration-z-chautari
```

## Current Secrets

| Secret | Purpose |
|---|---|
| ANTHROPIC_API_KEY | Anthropic direct API (recommend, ingest, process-document, generate-content-idea) |
| AWS_ACCESS_KEY_ID | Bedrock (generate-script, generate-thumbnail-prompt) |
| AWS_SECRET_ACCESS_KEY | Bedrock |
| AWS_REGION | Bedrock region = us-east-1 |

## Build Output

- `output: "export"` in next.config.ts → static files in `out/`
- Cloudflare reads `pages_build_output_dir = "out"` from wrangler.toml
- Functions bundle compiled from `functions/api/` automatically

## Environments

- Production: https://zzc.jeevanregmi.com.np
- Preview: each deploy gets a unique `*.zeneration-z-chautari.pages.dev` URL

## GitHub Actions (automated)

| Workflow | Schedule | Purpose |
|---|---|---|
| update-rates.yml | Daily 12:15 UTC | Scrape EPF/SSF/CIT market rates |
| poll-monitored-sources.yml | Hourly :30 | Poll active monitored_sources, write SourceSignals |

## Fix: Cloudflare 502 Interception

Never return `status: 502` from Pages Functions. Cloudflare intercepts it and replaces the JSON body with HTML, causing `Unexpected token '<'` on the frontend. Use `status: 500` instead.
