import { describe, it, expect } from "vitest";
import { calculateBurnAmounts, splitBurn } from "../../src/burn/calculateBurnAmounts.js";

describe("calculateBurnAmounts", () => {
  it("burns half of supply", () => {
    expect(calculateBurnAmounts(1000n, 0.5)).toBe(500n);
  });

  it("burns all", () => {
    expect(calculateBurnAmounts(1000n, 1.0)).toBe(1000n);
  });

  it("burns small fraction", () => {
    expect(calculateBurnAmounts(1000n, 0.1)).toBe(100n);
  });

  it("burns one-third (approximate)", () => {
    const result = calculateBurnAmounts(1000n, 1 / 3);
    // 1/3 cannot be represented exactly in IEEE 754, so allow ±1 tolerance
    expect(result >= 332n && result <= 334n).toBe(true);
  });

  it("throws RangeError for burnRatio 0", () => {
    expect(() => calculateBurnAmounts(1000n, 0)).toThrow(RangeError);
  });

  it("throws RangeError for burnRatio > 1", () => {
    expect(() => calculateBurnAmounts(1000n, 1.5)).toThrow(RangeError);
  });

  it("throws RangeError for negative burnRatio", () => {
    expect(() => calculateBurnAmounts(1000n, -0.5)).toThrow(RangeError);
  });

  it("throws RangeError for negative totalSupply", () => {
    expect(() => calculateBurnAmounts(-1n, 0.5)).toThrow(RangeError);
  });

  it("handles zero totalSupply correctly", () => {
    expect(calculateBurnAmounts(0n, 0.5)).toBe(0n);
  });
});

describe("splitBurn", () => {
  it("splits evenly", () => {
    expect(splitBurn(100n, 4)).toEqual([25n, 25n, 25n, 25n]);
  });

  it("handles remainder (first bucket absorbs it)", () => {
    const result = splitBurn(10n, 3);
    // 10 / 3 = 3 remainder 1, first bucket gets 3+1=4
    expect(result).toEqual([4n, 3n, 3n]);
    // All buckets must sum to the original amount
    expect(result.reduce((a, b) => a + b, 0n)).toBe(10n);
  });

  it("single bucket", () => {
    expect(splitBurn(50n, 1)).toEqual([50n]);
  });

  it("throws RangeError for parts < 1", () => {
    expect(() => splitBurn(100n, 0)).toThrow(RangeError);
  });

  it("throws RangeError for negative parts", () => {
    expect(() => splitBurn(100n, -1)).toThrow(RangeError);
  });

  it("throws RangeError for non-integer parts", () => {
    expect(() => splitBurn(100n, 1.5)).toThrow(RangeError);
  });

  it("throws RangeError for negative amount", () => {
    expect(() => splitBurn(-10n, 3)).toThrow(RangeError);
  });

  it("zero amount", () => {
    expect(splitBurn(0n, 3)).toEqual([0n, 0n, 0n]);
  });
});
