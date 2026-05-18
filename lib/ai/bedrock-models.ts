/**
 * AWS Bedrock Cross-Region Inference Profile IDs
 *
 * WHY THIS FILE EXISTS:
 *   Bedrock model IDs are NOT the same as Anthropic direct API model IDs.
 *   Bedrock cross-region inference profiles require:
 *     {region-prefix}.anthropic.{model-name}-{YYYYMMDD}-v{n}:{variant}
 *   e.g.  us.anthropic.claude-3-7-sonnet-20250219-v1:0
 *
 *   Using the Anthropic direct API model ID (e.g. "claude-sonnet-4-6") as a
 *   Bedrock model ID will always return 404. This has been the root cause of
 *   all Bedrock invocation failures in generate-script and generate-thumbnail-prompt.
 *
 * HOW TO UPDATE:
 *   When new Claude models become available on Bedrock:
 *   1. Find the model ID in the AWS console → Bedrock → Model catalog
 *   2. Copy the cross-region inference profile ARN (us.anthropic.…)
 *   3. Update BEDROCK_MODELS below
 *   4. Run: firebase deploy (or push to trigger Cloudflare Pages deploy)
 *
 * AVAILABLE MODELS (verified in AWS Bedrock as of 2025):
 *   - claude-3-7-sonnet  → us.anthropic.claude-3-7-sonnet-20250219-v1:0  [best available]
 *   - claude-3-5-sonnet  → us.anthropic.claude-3-5-sonnet-20241022-v2:0
 *   - claude-3-5-haiku   → us.anthropic.claude-3-5-haiku-20241022-v1:0   [fastest/cheapest]
 *
 * NOTE: Claude 4.x models (Sonnet 4.6, Opus 4.7, Haiku 4.5) may not yet be available
 *   on Bedrock. Check AWS console before adding them here. When available, format is:
 *   us.anthropic.claude-{variant}-{version}-{YYYYMMDD}-v1:0
 */

export const BEDROCK_MODELS = {
  // Recommended default — best capability/cost ratio confirmed on Bedrock
  SONNET:      "us.anthropic.claude-3-7-sonnet-20250219-v1:0",

  // Fast/cheap — use for high-volume low-stakes tasks
  HAIKU:       "us.anthropic.claude-3-5-haiku-20241022-v1:0",

  // Previous Sonnet — stable fallback if 3-7 has issues
  SONNET_PREV: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
} as const;

export type BedrockModelKey = keyof typeof BEDROCK_MODELS;

// Default model for Bedrock Workers — override with BEDROCK_MODEL_ID env var
export const DEFAULT_BEDROCK_MODEL = BEDROCK_MODELS.SONNET;

/**
 * Resolve Bedrock model ID from env var or fall back to default.
 * Workers call this to allow per-deploy model overrides without code changes.
 */
export function resolveBedrockModel(envModelId?: string): string {
  if (envModelId && envModelId.trim()) return envModelId.trim();
  return DEFAULT_BEDROCK_MODEL;
}
