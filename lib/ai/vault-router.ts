/**
 * Vault Document Analysis Router — Cloudflare Workers compatible.
 *
 * Provider order (cheapest first):
 *   1. Gemini 2.0 Flash  ($0.10/$0.40 per 1M in/out)  — text, PDF, images
 *   2. Bedrock Haiku 3.5 ($0.80/$4.00 per 1M in/out)  — text, images (no PDF)
 *   3. Anthropic Haiku 4.5 ($0.80/$4.00 per 1M in/out) — text, PDF, images
 *
 * Each provider is skipped when:
 *   - Its env vars are missing (unconfigured)
 *   - It returns billing/quota exhaustion (tries next provider instead)
 *   - It does not support the content type (e.g. Bedrock + PDF)
 *
 * Failure reasons surface to the client as structured codes so the UI
 * can show the right message without parsing error strings.
 */

import { AwsClient }                      from "aws4fetch";
import { callGemini, GeminiCallError }    from "./providers/gemini";
import { resolveBedrockModel }            from "./bedrock-models";
import type { GeminiPart }               from "./providers/gemini";

// ── Public types ───────────────────────────────────────────────────────────────

export type VaultProvider = "gemini-flash" | "bedrock-sonnet" | "anthropic-sonnet";

export interface RouterEnv {
  GEMINI_API_KEY?:        string;
  GEMINI_MODEL?:          string;
  AWS_ACCESS_KEY_ID?:     string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?:            string;
  BEDROCK_MODEL_ID?:      string;
  ANTHROPIC_API_KEY?:     string;
}

/** Multimodal document payload — caller builds this from the fetched file. */
export interface DocumentPayload {
  mimeType:  string;
  fileName:  string;
  /** Populated for plain text / markdown. */
  textBody?: string;
  /** Base64-encoded binary (PDF, image, unsupported binary). */
  base64?:   string;
}

export type FailureReason =
  | "billing_exhausted"   // every configured provider hit billing/quota
  | "all_failed"          // every configured provider returned a real error
  | "no_providers"        // zero providers are configured
  | "unsupported_type";   // no configured provider supports this content type

export interface RouterSuccess {
  ok:       true;
  text:     string;
  provider: VaultProvider;
  model:    string;
  retries:  number;
}

export interface RouterFailure {
  ok:         false;
  reason:     FailureReason;
  tried:      VaultProvider[];
  lastError:  string;
  allBilling: boolean;
}

export type RouterResult = RouterSuccess | RouterFailure;

// ── Internal attempt results ───────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise(r => setTimeout(r, ms));

type AttemptOk      = { ok: true;  text: string; model: string; retries: number };
type AttemptBilling = { ok: false; billing: true };
type AttemptSkip    = { ok: false; skip: true };
type AttemptError   = { ok: false; error: string };
type Attempt        = AttemptOk | AttemptBilling | AttemptSkip | AttemptError;

// ── Content-type support matrix ────────────────────────────────────────────────

function bedrockSupportsMime(mimeType: string): boolean {
  return mimeType !== "application/pdf";
}

// ── Gemini ─────────────────────────────────────────────────────────────────────

async function tryGemini(
  env:       RouterEnv,
  system:    string,
  doc:       DocumentPayload,
  maxTokens: number,
): Promise<Attempt> {
  if (!env.GEMINI_API_KEY?.trim()) return { ok: false, skip: true };

  const parts: GeminiPart[] = [];

  if (doc.textBody !== undefined) {
    parts.push({ text: `File: ${doc.fileName}\n\n${doc.textBody}` });
  } else if (doc.base64) {
    if (doc.mimeType === "application/pdf" || doc.mimeType.startsWith("image/")) {
      parts.push({ inline_data: { mime_type: doc.mimeType, data: doc.base64 } });
      parts.push({ text: `Analyze this file: ${doc.fileName}` });
    } else {
      // Unknown binary — provide filename context only
      parts.push({ text: `File: "${doc.fileName}" (${doc.mimeType}) — binary format not directly readable. Provide best-effort analysis based on filename/extension. Set confidence to 0.2.` });
    }
  }

  // Model fallback order: prefer GEMINI_MODEL env var, then 2.0-flash, then 1.5-flash.
  // 2.0-flash may not be available on all free-tier projects; 1.5-flash is the
  // most reliable model across all free-tier AI Studio keys.
  const MODEL_SEQUENCE = env.GEMINI_MODEL
    ? [env.GEMINI_MODEL]
    : ["gemini-2.0-flash", "gemini-1.5-flash"];

  let lastErr = "";
  for (const model of MODEL_SEQUENCE) {
    // Per-model: up to 2 attempts for rate-limit transients
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const result = await callGemini({
          apiKey:    env.GEMINI_API_KEY!,
          model,
          system,
          parts,
          maxTokens,
          jsonMode:  true,
        });
        return { ok: true, text: result.text, model: result.model, retries: attempt };
      } catch (err) {
        if (err instanceof GeminiCallError) {
          if (err.code === "quota_exceeded" && attempt === 0) {
            await sleep(1500);
            continue; // retry same model after brief wait
          }
          if (err.code === "quota_exceeded" || err.code === "auth") {
            return { ok: false, billing: true };
          }
          // bad_request / server_error — try next model in sequence
          lastErr = `${model}: ${err.message.slice(0, 200)}`;
          break;
        }
        lastErr = `${model}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200);
        break;
      }
    }
  }
  return { ok: false, error: lastErr || "All Gemini models failed" };
}

// ── Bedrock ────────────────────────────────────────────────────────────────────

type BedrockBlock =
  | { type: "text";  text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

async function tryBedrock(
  env:       RouterEnv,
  system:    string,
  doc:       DocumentPayload,
  maxTokens: number,
): Promise<Attempt> {
  const hasAws = env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim() && env.AWS_REGION?.trim();
  if (!hasAws) return { ok: false, skip: true };
  if (!bedrockSupportsMime(doc.mimeType)) return { ok: false, skip: true };

  const blocks: BedrockBlock[] = [];

  if (doc.textBody !== undefined) {
    blocks.push({ type: "text", text: `File: ${doc.fileName}\n\n${doc.textBody}` });
  } else if (doc.base64 && doc.mimeType.startsWith("image/")) {
    blocks.push({ type: "image", source: { type: "base64", media_type: doc.mimeType, data: doc.base64 } });
    blocks.push({ type: "text", text: `Analyze this image: ${doc.fileName}` });
  } else if (doc.base64) {
    blocks.push({ type: "text", text: `File: "${doc.fileName}" (${doc.mimeType}) — binary format. Best-effort analysis. Set confidence to 0.2.` });
  }

  try {
    const aws = new AwsClient({
      accessKeyId:     env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      region:          env.AWS_REGION!,
      service:         "bedrock",
    });
    const modelId = resolveBedrockModel(env.BEDROCK_MODEL_ID);
    const url     = `https://bedrock-runtime.${env.AWS_REGION!}.amazonaws.com/model/${encodeURIComponent(modelId)}/invoke`;

    const res = await aws.fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        maxTokens,
        system,
        messages:          [{ role: "user", content: blocks }],
      }),
    });

    if (!res.ok) {
      const raw        = await res.text().catch(() => "");
      const isBilling  = res.status === 429 || raw.includes("quota") || raw.includes("ThrottlingException");
      if (isBilling) return { ok: false, billing: true };
      throw new Error(`Bedrock ${res.status}: ${raw.slice(0, 200)}`);
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return { ok: true, text: data.content?.[0]?.text?.trim() ?? "", model: modelId, retries: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

// ── Anthropic ──────────────────────────────────────────────────────────────────

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";

type AnthropicBlock =
  | { type: "text";     text: string }
  | { type: "image";    source: { type: "base64"; media_type: string; data: string } }
  | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } };

async function tryAnthropic(
  env:       RouterEnv,
  system:    string,
  doc:       DocumentPayload,
  maxTokens: number,
): Promise<Attempt> {
  if (!env.ANTHROPIC_API_KEY?.trim()) return { ok: false, skip: true };

  const blocks: AnthropicBlock[] = [];

  if (doc.textBody !== undefined) {
    blocks.push({ type: "text", text: `File: ${doc.fileName}\n\n${doc.textBody}` });
  } else if (doc.base64 && doc.mimeType === "application/pdf") {
    blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: doc.base64 } });
    blocks.push({ type: "text", text: `Analyze this PDF: ${doc.fileName}` });
  } else if (doc.base64 && doc.mimeType.startsWith("image/")) {
    blocks.push({ type: "image", source: { type: "base64", media_type: doc.mimeType, data: doc.base64 } });
    blocks.push({ type: "text", text: `Analyze this image: ${doc.fileName}` });
  } else if (doc.base64) {
    blocks.push({ type: "text", text: `File: "${doc.fileName}" (${doc.mimeType}) — binary format. Best-effort analysis. Set confidence to 0.2.` });
  }

  const headers: Record<string, string> = {
    "Content-Type":      "application/json",
    "x-api-key":         env.ANTHROPIC_API_KEY!,
    "anthropic-version": "2023-06-01",
  };
  if (doc.mimeType === "application/pdf") headers["anthropic-beta"] = "pdfs-2024-09-25";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers,
      body:    JSON.stringify({
        model:      ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system,
        messages:   [{ role: "user", content: blocks }],
      }),
    });

    if (!res.ok) {
      const raw       = await res.text().catch(() => "");
      const isBilling = (res.status === 400 && raw.includes("credit balance")) || res.status === 429;
      if (isBilling) return { ok: false, billing: true };
      throw new Error(`Anthropic ${res.status}: ${raw.slice(0, 200)}`);
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return { ok: true, text: data.content?.[0]?.text?.trim() ?? "", model: ANTHROPIC_MODEL, retries: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.slice(0, 200) };
  }
}

// ── Router ─────────────────────────────────────────────────────────────────────

interface ProviderEntry {
  name: VaultProvider;
  run:  (env: RouterEnv, system: string, doc: DocumentPayload, maxTokens: number) => Promise<Attempt>;
}

const PROVIDERS: ProviderEntry[] = [
  { name: "gemini-flash",    run: tryGemini    },
  { name: "bedrock-sonnet",  run: tryBedrock   },
  { name: "anthropic-sonnet",run: tryAnthropic },
];

export async function routeDocumentAnalysis(
  env:       RouterEnv,
  system:    string,
  doc:       DocumentPayload,
  maxTokens  = 2048,
): Promise<RouterResult> {
  const tried:   VaultProvider[] = [];
  const errors:  string[]        = [];
  let billingCount = 0;

  for (const provider of PROVIDERS) {
    const attempt = await provider.run(env, system, doc, maxTokens);

    if ("skip" in attempt) continue;           // provider not configured or type unsupported

    tried.push(provider.name);

    if (attempt.ok) {
      return { ok: true, text: attempt.text, provider: provider.name, model: attempt.model, retries: attempt.retries };
    }

    if ("billing" in attempt) {
      billingCount++;
      errors.push(`${provider.name}: billing/quota exhausted`);
    } else {
      errors.push(`${provider.name}: ${attempt.error}`);
    }
  }

  if (tried.length === 0) {
    return {
      ok:         false,
      reason:     "no_providers",
      tried:      [],
      lastError:  "No AI providers configured. Add GEMINI_API_KEY, AWS credentials, or ANTHROPIC_API_KEY in Cloudflare Pages env vars.",
      allBilling: false,
    };
  }

  return {
    ok:         false,
    reason:     billingCount === tried.length ? "billing_exhausted" : "all_failed",
    tried,
    lastError:  errors.join(" | "),
    allBilling: billingCount === tried.length,
  };
}

/** Returns human-readable label for a provider (for UI display). */
export function providerLabel(provider: VaultProvider): string {
  switch (provider) {
    case "gemini-flash":    return "Gemini 2.0 Flash";
    case "bedrock-sonnet":  return "Bedrock Haiku 3.5";
    case "anthropic-sonnet":return "Anthropic Haiku 4.5";
  }
}
