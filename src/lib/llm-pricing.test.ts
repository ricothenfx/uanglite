import { describe, expect, it } from "vitest";
import { estimateCostMicroUsd } from "./llm-pricing";

describe("estimateCostMicroUsd", () => {
  it("prices known models", () => {
    const cost = estimateCostMicroUsd("gpt-4o-mini", 1_000_000, 1_000_000);
    expect(cost).toBe(750_000);
  });

  it("matches model families by prefix", () => {
    expect(estimateCostMicroUsd("gpt-4o-mini-2024-07-18", 1_000_000, 0)).toBe(
      150_000,
    );
  });

  it("falls back to a conservative default for unknown models", () => {
    expect(estimateCostMicroUsd("mystery-model", 1_000_000, 0)).toBe(1_000_000);
  });

  it("handles zero usage", () => {
    expect(estimateCostMicroUsd("gpt-4o-mini", 0, 0)).toBe(0);
  });
});
