import type { ITextProvider, AITextRequest, AITextResponse } from "../types";

export function createAnthropicProvider(apiKey: string, model: string): ITextProvider {
  return {
    async generate(req: AITextRequest): Promise<AITextResponse> {
      const start = Date.now();
      const body: Record<string, unknown> = {
        model,
        max_tokens: req.maxTokens,
        messages:   req.messages,
      };
      if (req.system)      body.system      = req.system;
      if (req.temperature) body.temperature = req.temperature;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => res.statusText);
        throw new Error(`Anthropic ${res.status}: ${err.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        content: Array<{ type: string; text: string }>;
        usage:   { input_tokens: number; output_tokens: number };
        model:   string;
      };

      return {
        content:      data.content?.[0]?.text?.trim() ?? "",
        inputTokens:  data.usage?.input_tokens  ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        model:        data.model ?? model,
        latencyMs:    Date.now() - start,
      };
    },
  };
}
