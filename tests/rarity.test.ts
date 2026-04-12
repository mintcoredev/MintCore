import { describe, it, expect } from "vitest";
import { Rarity, isRarity, rarityToString } from "../src/rarity/rarity.js";
import { MintCoreError } from "../src/utils/errors.js";

describe("Rarity enum", () => {
  it("has correct numeric values", () => {
    expect(Rarity.Common).toBe(0);
    expect(Rarity.Uncommon).toBe(1);
    expect(Rarity.Rare).toBe(2);
    expect(Rarity.Epic).toBe(3);
    expect(Rarity.Legendary).toBe(4);
  });
});

describe("isRarity", () => {
  it("returns true for all valid Rarity enum values", () => {
    expect(isRarity(0)).toBe(true);
    expect(isRarity(1)).toBe(true);
    expect(isRarity(2)).toBe(true);
    expect(isRarity(3)).toBe(true);
    expect(isRarity(4)).toBe(true);
  });

  it("returns false for invalid numbers", () => {
    expect(isRarity(-1)).toBe(false);
    expect(isRarity(5)).toBe(false);
    expect(isRarity(1.5)).toBe(false);
    expect(isRarity(NaN)).toBe(false);
    expect(isRarity(Infinity)).toBe(false);
  });

  it("returns false for non-numbers", () => {
    expect(isRarity("Common")).toBe(false);
    expect(isRarity(null)).toBe(false);
    expect(isRarity(undefined)).toBe(false);
    expect(isRarity({})).toBe(false);
  });
});

describe("rarityToString", () => {
  it("returns correct strings for all values", () => {
    expect(rarityToString(Rarity.Common)).toBe("Common");
    expect(rarityToString(Rarity.Uncommon)).toBe("Uncommon");
    expect(rarityToString(Rarity.Rare)).toBe("Rare");
    expect(rarityToString(Rarity.Epic)).toBe("Epic");
    expect(rarityToString(Rarity.Legendary)).toBe("Legendary");
  });

  it("throws MintCoreError for invalid rarity value", () => {
    expect(() => rarityToString(99 as Rarity)).toThrow(MintCoreError);
  });
});
