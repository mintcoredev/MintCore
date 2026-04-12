import { describe, it, expect } from "vitest";
import { categoryFromTxid, categoryToHex } from "../src/cashTokens/category.js";

const TXID =
  "aabbccdd11223344aabbccdd11223344aabbccdd11223344aabbccdd11223344";

describe("categoryFromTxid", () => {
  it("converts a known txid to internal byte order (reversed)", () => {
    const category = categoryFromTxid(TXID);
    // First display byte 0xaa should become last internal byte
    expect(category[31]).toBe(0xaa);
    // Last display byte 0x44 should become first internal byte
    expect(category[0]).toBe(0x44);
  });

  it("returns a Uint8Array of length 32", () => {
    const category = categoryFromTxid(TXID);
    expect(category).toBeInstanceOf(Uint8Array);
    expect(category).toHaveLength(32);
  });

  it("round-trips with categoryToHex", () => {
    const category = categoryFromTxid(TXID);
    expect(categoryToHex(category)).toBe(TXID);
  });
});

describe("categoryToHex", () => {
  it("converts internal-order bytes to display-order hex", () => {
    // Build a category whose internal bytes are [0x44, 0x33, ..., 0xaa]
    const category = categoryFromTxid(TXID);
    const hex = categoryToHex(category);
    expect(hex).toBe(TXID);
  });

  it("returns a 64-character hex string", () => {
    const category = categoryFromTxid(TXID);
    const hex = categoryToHex(category);
    expect(hex).toHaveLength(64);
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
  });

  it("round-trips with categoryFromTxid", () => {
    const category = categoryFromTxid(TXID);
    const hex = categoryToHex(category);
    expect(categoryFromTxid(hex)).toEqual(category);
  });
});
