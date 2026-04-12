import { describe, it, expect } from "vitest";
import {
  serializePack,
  deserializePack,
  serializeItem,
  deserializeItem,
} from "../src/serialization/json.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { ItemDefinition } from "../src/items/item.js";
import type { PackDefinition } from "../src/packs/pack.js";
import { Rarity } from "../src/rarity/rarity.js";

const validItem: ItemDefinition = {
  id: "item-1",
  metadata: { name: "Sword" },
  rarity: Rarity.Common,
  version: 1,
};

const validPack: PackDefinition = {
  id: "pack-1",
  metadata: { name: "Starter" },
  items: [validItem],
  version: 1,
};

describe("serializePack", () => {
  it("serializes a valid PackDefinition to a JSON string", () => {
    const json = serializePack(validPack);
    expect(typeof json).toBe("string");
    expect(JSON.parse(json)).toEqual(validPack);
  });

  it("round-trips with deserializePack", () => {
    const json = serializePack(validPack);
    const result = deserializePack(json);
    expect(result).toEqual(validPack);
  });

  it("throws MintCoreError for an invalid pack (missing id)", () => {
    const invalidPack = { metadata: { name: "No ID" }, items: [], version: 1 };
    expect(() => serializePack(invalidPack as any)).toThrow(MintCoreError);
  });
});

describe("deserializePack", () => {
  it("deserializes a valid JSON string to a PackDefinition", () => {
    const json = JSON.stringify(validPack);
    const result = deserializePack(json);
    expect(result).toEqual(validPack);
  });

  it("throws MintCoreError for non-string input", () => {
    expect(() => deserializePack(123 as any)).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid JSON string", () => {
    expect(() => deserializePack("{not json}")).toThrow(MintCoreError);
  });

  it("throws MintCoreError for JSON that doesn't match PackDefinition structure", () => {
    expect(() => deserializePack(JSON.stringify({ foo: "bar" }))).toThrow(
      MintCoreError,
    );
  });
});

describe("serializeItem", () => {
  it("serializes a valid ItemDefinition to a JSON string", () => {
    const json = serializeItem(validItem);
    expect(typeof json).toBe("string");
    expect(JSON.parse(json)).toEqual(validItem);
  });

  it("throws MintCoreError for an invalid item", () => {
    const invalidItem = { metadata: { name: "No ID" }, rarity: 0, version: 1 };
    expect(() => serializeItem(invalidItem as any)).toThrow(MintCoreError);
  });
});

describe("deserializeItem", () => {
  it("deserializes a valid JSON string to an ItemDefinition", () => {
    const json = JSON.stringify(validItem);
    const result = deserializeItem(json);
    expect(result).toEqual(validItem);
  });

  it("throws MintCoreError for non-string input", () => {
    expect(() => deserializeItem(42 as any)).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid JSON string", () => {
    expect(() => deserializeItem("%%%")).toThrow(MintCoreError);
  });

  it("throws MintCoreError for valid JSON with invalid structure", () => {
    expect(() => deserializeItem(JSON.stringify({ x: 1 }))).toThrow(
      MintCoreError,
    );
  });
});
