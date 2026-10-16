type ModelPricing = { input: number; output: number };

const DEFAULT_PRICING: Record<string, ModelPricing> = {
  "gpt-5-mini": { input: 0.25, output: 2 },
  "gpt-5": { input: 1.25, output: 10 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10 },
};

function customPricing(): Record<string, ModelPricing> {
  const raw = process.env.LLM_PRICING;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, ModelPricing>;
  } catch {
    return {};
  }
}

export function estimateCostMicroUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = { ...DEFAULT_PRICING, ...customPricing() };
  const entry =
    Object.entries(pricing).find(([key]) => model.startsWith(key))?.[1] ??
    pricing[model] ??
    { input: 1, output: 2 };
  const costUsd =
    (promptTokens / 1_000_000) * entry.input +
    (completionTokens / 1_000_000) * entry.output;
  return Math.round(costUsd * 1_000_000);
}
