import { describe, it, expect } from "vitest";
import { validateSchema } from "../src/utils/validate.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";

describe("validateSchema", () => {
  // ── Basic field validation ─────────────────────────────────────────────────

  it("passes a valid fungible-token schema", () => {
    expect(() =>
      validateSchema({
        name: "My Token",
        symbol: "MTK",
        decimals: 2,
        initialSupply: 1000000n,
      })
    ).not.toThrow();
  });

  it("throws MintCoreError when name is missing", () => {
    expect(() =>
      validateSchema({ name: "", symbol: "MTK", decimals: 0, initialSupply: 1n })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when symbol is missing", () => {
    expect(() =>
      validateSchema({ name: "T", symbol: "", decimals: 0, initialSupply: 1n })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for decimals below 0", () => {
    expect(() =>
      validateSchema({ name: "T", symbol: "T", decimals: -1, initialSupply: 1n })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for decimals above 18", () => {
    expect(() =>
      validateSchema({ name: "T", symbol: "T", decimals: 19, initialSupply: 1n })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for negative initialSupply", () => {
    expect(() =>
      validateSchema({ name: "T", symbol: "T", decimals: 0, initialSupply: -1n })
    ).toThrow(MintCoreError);
  });

  // ── NFT capability validation ──────────────────────────────────────────────

  it("passes a schema with a valid NFT capability (minting)", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "abcd" },
      })
    ).not.toThrow();
  });

  it("passes a schema with NFT capability 'none'", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "none", commitment: "abcd" },
      })
    ).not.toThrow();
  });

  it("passes a schema with NFT capability 'mutable'", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "mutable", commitment: "abcd" },
      })
    ).not.toThrow();
  });

  it("throws MintCoreError for an invalid NFT capability", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "invalid" as any, commitment: "abcd" },
      })
    ).toThrow(MintCoreError);
  });

  // ── NFT commitment format validation ──────────────────────────────────────

  it("accepts a 0x-prefixed hex commitment", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "0x1234abcd" },
      })
    ).not.toThrow();
  });

  it("accepts a bare hex commitment", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "deadbeef" },
      })
    ).not.toThrow();
  });

  it("accepts a UTF-8 text commitment", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "hello" },
      })
    ).not.toThrow();
  });

  it("throws MintCoreError for a 0x-prefixed odd-length hex commitment", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "0xabc" }, // odd length
      })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for a 0x-prefixed non-hex commitment", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: "0xzzzz" },
      })
    ).toThrow(MintCoreError);
  });

  // ── NFT commitment length (CashTokens max 40 bytes) ───────────────────────

  it("accepts a commitment exactly 40 bytes long", () => {
    // 40 bytes = 80 hex chars
    const fortyBytes = "ab".repeat(40);
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: fortyBytes },
      })
    ).not.toThrow();
  });

  it("throws MintCoreError for a commitment longer than 40 bytes", () => {
    // 41 bytes = 82 hex chars
    const fortyOneBytes = "ab".repeat(41);
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: fortyOneBytes },
      })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError for a UTF-8 commitment exceeding 40 bytes", () => {
    // 41 ASCII characters = 41 bytes when UTF-8 encoded
    const longText = "a".repeat(41);
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "minting", commitment: longText },
      })
    ).toThrow(MintCoreError);
  });

  // ── Metadata size validation ───────────────────────────────────────────────

  it("passes valid metadata", () => {
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 1n,
        metadata: { description: "A token", icon: "https://example.com/icon.png" },
      })
    ).not.toThrow();
  });

  it("throws MintCoreError when metadata serialization exceeds 1000 characters", () => {
    const bigMeta: Record<string, string> = {};
    // Build a metadata object whose JSON serialization exceeds 1000 chars
    bigMeta["key"] = "x".repeat(1000);
    expect(() =>
      validateSchema({
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 1n,
        metadata: bigMeta,
      })
    ).toThrow(MintCoreError);
  });
});
