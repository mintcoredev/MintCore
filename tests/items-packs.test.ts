import { describe, it, expect } from "vitest";
import {
  isItemMetadata,
  isItemDefinition,
  assertItemDefinition,
} from "../src/items/item.js";
import {
  isPackMetadata,
  isPackDefinition,
  assertPackDefinition,
} from "../src/packs/pack.js";
import { MintCoreError } from "../src/utils/errors.js";
import { Rarity } from "../src/rarity/rarity.js";

// ── Helpers ────────────────────────────────────────────────────────────────

const validMetadata = { name: "Sword" };

const validItem = {
  id: "sword-1",
  metadata: { name: "Sword" },
  rarity: Rarity.Common,
  version: 1,
};

const validPack = {
  id: "pack-1",
  metadata: { name: "Pack" },
  items: [validItem],
  version: 1,
};

// ── isItemMetadata ─────────────────────────────────────────────────────────

describe("isItemMetadata", () => {
  it("returns true for valid metadata with only name", () => {
    expect(isItemMetadata({ name: "Sword" })).toBe(true);
  });

  it("returns true with all optional fields", () => {
    expect(
      isItemMetadata({
        name: "Sword",
        description: "A blade",
        image: "url",
        attributes: { dmg: 10 },
      })
    ).toBe(true);
  });

  it("returns false for null", () => {
    expect(isItemMetadata(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isItemMetadata(undefined)).toBe(false);
  });

  it("returns false for number", () => {
    expect(isItemMetadata(42)).toBe(false);
  });

  it("returns false for string", () => {
    expect(isItemMetadata("hello")).toBe(false);
  });

  it("returns false for empty name", () => {
    expect(isItemMetadata({ name: "" })).toBe(false);
  });

  it("returns false for whitespace-only name", () => {
    expect(isItemMetadata({ name: "   " })).toBe(false);
  });

  it("returns false when description is not a string", () => {
    expect(isItemMetadata({ name: "Sword", description: 123 })).toBe(false);
  });

  it("returns false when image is not a string", () => {
    expect(isItemMetadata({ name: "Sword", image: 456 })).toBe(false);
  });

  it("returns false when attributes is an array", () => {
    expect(isItemMetadata({ name: "Sword", attributes: [1, 2] })).toBe(false);
  });

  it("returns false when attributes is null", () => {
    expect(isItemMetadata({ name: "Sword", attributes: null })).toBe(false);
  });
});

// ── isItemDefinition ───────────────────────────────────────────────────────

describe("isItemDefinition", () => {
  it("returns true for a valid definition", () => {
    expect(isItemDefinition(validItem)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isItemDefinition(null)).toBe(false);
  });

  it("returns false for empty id", () => {
    expect(
      isItemDefinition({ ...validItem, id: "" })
    ).toBe(false);
  });

  it("returns false for invalid metadata", () => {
    expect(
      isItemDefinition({ ...validItem, metadata: { name: "" } })
    ).toBe(false);
  });

  it("returns false for invalid rarity (99)", () => {
    expect(
      isItemDefinition({ ...validItem, rarity: 99 })
    ).toBe(false);
  });

  it("returns false for version 0", () => {
    expect(
      isItemDefinition({ ...validItem, version: 0 })
    ).toBe(false);
  });

  it("returns false for negative version", () => {
    expect(
      isItemDefinition({ ...validItem, version: -1 })
    ).toBe(false);
  });

  it("returns false for non-integer version", () => {
    expect(
      isItemDefinition({ ...validItem, version: 1.5 })
    ).toBe(false);
  });
});

// ── assertItemDefinition ───────────────────────────────────────────────────

describe("assertItemDefinition", () => {
  it("does not throw for a valid definition", () => {
    expect(() => assertItemDefinition(validItem)).not.toThrow();
  });

  it("throws MintCoreError for non-object", () => {
    expect(() => assertItemDefinition(null)).toThrow(MintCoreError);
  });

  it("throws MintCoreError for empty id", () => {
    expect(() => assertItemDefinition({ ...validItem, id: "" })).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid metadata", () => {
    expect(() =>
      assertItemDefinition({ ...validItem, metadata: { name: "" } })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid rarity", () => {
    expect(() =>
      assertItemDefinition({ ...validItem, rarity: 99 })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid version", () => {
    expect(() =>
      assertItemDefinition({ ...validItem, version: 0 })
    ).toThrow(MintCoreError);
  });
});

// ── isPackMetadata ─────────────────────────────────────────────────────────

describe("isPackMetadata", () => {
  it("returns true for valid metadata", () => {
    expect(isPackMetadata({ name: "Starter Pack" })).toBe(true);
  });

  it("returns false for null", () => {
    expect(isPackMetadata(null)).toBe(false);
  });

  it("returns false for empty name", () => {
    expect(isPackMetadata({ name: "" })).toBe(false);
  });
});

// ── isPackDefinition ───────────────────────────────────────────────────────

describe("isPackDefinition", () => {
  it("returns true for a valid pack definition", () => {
    expect(isPackDefinition(validPack)).toBe(true);
  });

  it("returns false when items contain invalid ItemDefinitions", () => {
    expect(
      isPackDefinition({ ...validPack, items: [{ id: "bad" }] })
    ).toBe(false);
  });

  it("returns false for non-array items", () => {
    expect(
      isPackDefinition({ ...validPack, items: "not-array" })
    ).toBe(false);
  });

  it("returns false for invalid version", () => {
    expect(
      isPackDefinition({ ...validPack, version: 0 })
    ).toBe(false);
  });
});

// ── assertPackDefinition ───────────────────────────────────────────────────

describe("assertPackDefinition", () => {
  it("does not throw for a valid pack", () => {
    expect(() => assertPackDefinition(validPack)).not.toThrow();
  });

  it("throws for non-object", () => {
    expect(() => assertPackDefinition(null)).toThrow(MintCoreError);
  });

  it("throws for invalid items", () => {
    expect(() =>
      assertPackDefinition({ ...validPack, items: [{ id: "bad" }] })
    ).toThrow(MintCoreError);
  });

  it("throws for invalid version", () => {
    expect(() =>
      assertPackDefinition({ ...validPack, version: -1 })
    ).toThrow(MintCoreError);
  });
});
