# ADR 0002 — AWS Bedrock Inference Profile Requirement

**Date:** 2026-05-16
**Status:** Accepted

## Context

Bedrock workers `generate-script.ts` and `generate-thumbnail-prompt.ts` were using base model IDs (e.g. `anthropic.claude-3-5-sonnet-20240620-v1:0`). These returned HTTP 400: "Invocation of model ID X with on-demand throughput isn't supported. Retry your request with the ID or ARN of an inference profile."

## Decision

All Bedrock model invocations must use **inference profile IDs**, not base model IDs.

- Format: `{region-prefix}.anthropic.{model-slug}` (e.g. `us.anthropic.claude-sonnet-4-6`)
- `us.` prefix = US cross-region inference (routes across us-east-1 + us-west-2)
- `global.` prefix = global cross-region inference (broader routing)

Current: `us.anthropic.claude-sonnet-4-6` for both Bedrock workers.

## Consequences

- When updating Bedrock model versions, verify the inference profile ID from:
  AWS Console → Bedrock → Inference profiles → System-defined tab
- The `MODEL_ID` constant in each Bedrock worker must be kept current
- Model access page was retired — models auto-enable on first invocation

## History

| Date | Old Model ID | Reason replaced |
|---|---|---|
| 2026-05-15 | anthropic.claude-3-5-sonnet-20241022-v2:0 | EOL |
| 2026-05-15 | anthropic.claude-3-7-sonnet-20250219-v1:0 | EOL |
| 2026-05-16 | anthropic.claude-sonnet-4-6 | Base model ID rejected |
| 2026-05-16 | us.anthropic.claude-sonnet-4-6 | Current — inference profile |
