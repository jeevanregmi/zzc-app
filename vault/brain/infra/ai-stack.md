# AI Stack Registry

## Provider 1: Anthropic Direct API

**Env var:** `ANTHROPIC_API_KEY`
**Base URL:** `https://api.anthropic.com/v1/messages`
**Auth header:** `x-api-key: {ANTHROPIC_API_KEY}`

| Worker | Model | Max tokens |
|---|---|---|
| recommend.ts | claude-opus-4-7 | 2048 |
| process-document.ts | claude-sonnet-4-6 | 2048 |
| ingest-url.ts | claude-haiku-4-5-20251001 | 2048 |
| generate-content-idea.ts | claude-haiku-4-5-20251001 | 1024 |

## Provider 2: AWS Bedrock

**Env vars:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (= us-east-1)
**Base URL:** `https://bedrock-runtime.{region}.amazonaws.com/model/{modelId}/invoke`
**Auth:** SigV4 via `aws4fetch` library
**Inference profile required** — base model IDs are rejected

| Worker | Inference Profile ID | Max tokens |
|---|---|---|
| generate-script.ts | us.anthropic.claude-sonnet-4-6 | 3000 |
| generate-thumbnail-prompt.ts | us.anthropic.claude-sonnet-4-6 | 1024 |

### Bedrock Notes

- Model access page retired — models auto-enabled on first invocation
- Cross-region inference profile `us.anthropic.claude-sonnet-4-6` routes across us-east-1 + us-west-2
- 429 "Too many tokens per day" = daily quota, resets midnight UTC
- To check quota: AWS Console → Bedrock → Quotas → Claude Sonnet 4.6 (Global cross-region)
- Quota increase: Request TPM quota increase (auto-approved for reasonable values)

## IAM

**Account:** 135501090730
**User:** zzc-production
**Key description:** zzc-cloudflare-production-v2
**Last rotated:** 2026-05-16 (rotated after AKIAR7DD6R6VA3PLANWC was exposed in chat)
**Permissions required:** AmazonBedrockFullAccess (or scoped bedrock:InvokeModel)

## Current Models Reference

| Model | API ID | Bedrock Profile |
|---|---|---|
| Claude Opus 4.7 | claude-opus-4-7 | us.anthropic.claude-opus-4-7 |
| Claude Sonnet 4.6 | claude-sonnet-4-6 | us.anthropic.claude-sonnet-4-6 |
| Claude Haiku 4.5 | claude-haiku-4-5-20251001 | us.anthropic.claude-haiku-4-5 |
