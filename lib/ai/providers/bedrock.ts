import { AwsClient } from "aws4fetch";
import type { ITextProvider, AITextRequest, AITextResponse } from "../types";

interface BedrockEnv {
  accessKeyId:     string;
  secretAccessKey: string;
  region:          string;
}

export function createBedrockProvider(env: BedrockEnv, inferenceProfileId: string): ITextProvider {
  return {
    async generate(req: AITextRequest): Promise<AITextResponse> {
      const start = Date.now();
      const aws = new AwsClient({
        accessKeyId:     env.accessKeyId,
        secretAccessKey: env.secretAccessKey,
        region:          env.region,
        service:         "bedrock",
      });

      const url = `https://bedrock-runtime.${env.region}.amazonaws.com/model/${encodeURIComponent(inferenceProfileId)}/invoke`;

      const body: Record<string, unknown> = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens:        req.maxTokens,
        messages:          req.messages,
      };
      if (req.system) body.system = req.system;

      const res = await aws.fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`Bedrock ${res.status}: ${err.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
        usage:   { input_tokens: number; output_tokens: number };
      };

      return {
        content:      data.content?.[0]?.text?.trim() ?? "",
        inputTokens:  data.usage?.input_tokens  ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        model:        inferenceProfileId,
        latencyMs:    Date.now() - start,
      };
    },
  };
}
