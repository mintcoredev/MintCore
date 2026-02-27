import { describe, it, expect } from "vitest";
import {
  mintFungibleToken,
  mintNFT,
  verifyMint,
  createMetadata,
  encodeMetadata,
} from "../src/utils/convenience.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";

const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const baseConfig: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

// ─── mintFungibleToken ────────────────────────────────────────────────────────

describe("mintFungibleToken", () => {
  it("returns a MintResult with hex and txid", async () => {
    const result = await mintFungibleToken(baseConfig, {
      name: "Fungible",
      symbol: "FNG",
      decimals: 2,
      initialSupply: 1000n,
    });

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns null metadata when not supplied", async () => {
    const result = await mintFungibleToken(baseConfig, {
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    expect(result.metadata).toBeNull();
  });

  it("passes metadata through to the result", async () => {
    const meta = { description: "hello" };
    const result = await mintFungibleToken(baseConfig, {
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
      metadata: meta,
    });

    expect(result.metadata).toEqual(meta);
  });

  it("throws MintCoreError for an invalid schema", async () => {
    await expect(
      mintFungibleToken(baseConfig, {
        name: "",
        symbol: "T",
        decimals: 0,
        initialSupply: 1n,
      })
    ).rejects.toThrow(MintCoreError);
  });
});

// ─── mintNFT ──────────────────────────────────────────────────────────────────

describe("mintNFT", () => {
  it("returns a MintResult with hex and txid for an NFT schema", async () => {
    const schema: TokenSchema = {
      name: "My NFT",
      symbol: "MNFT",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "minting", commitment: "deadbeef" },
    };

    const result = await mintNFT(baseConfig, schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws a plain Error (not MintCoreError) when nft options are missing", async () => {
    await expect(
      mintNFT(baseConfig, {
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        // no nft field
      })
    ).rejects.toThrow("NFT options are required for mintNFT");
  });

  it("throws MintCoreError for an invalid NFT capability", async () => {
    await expect(
      mintNFT(baseConfig, {
        name: "T",
        symbol: "T",
        decimals: 0,
        initialSupply: 0n,
        nft: { capability: "invalid" as any, commitment: "ff" },
      })
    ).rejects.toThrow(MintCoreError);
  });
});

// ─── verifyMint ───────────────────────────────────────────────────────────────

describe("verifyMint", () => {
  it("returns true for a valid 64-character lowercase hex txid", async () => {
    const txid = "a".repeat(64);
    expect(await verifyMint(baseConfig, txid)).toBe(true);
  });

  it("returns true for a valid 64-character mixed-case hex txid", async () => {
    const txid = "aAbBcCdD".repeat(8);
    expect(await verifyMint(baseConfig, txid)).toBe(true);
  });

  it("returns false for an empty string", async () => {
    expect(await verifyMint(baseConfig, "")).toBe(false);
  });

  it("returns false for a txid shorter than 64 characters", async () => {
    expect(await verifyMint(baseConfig, "a".repeat(63))).toBe(false);
  });

  it("returns false for a txid longer than 64 characters", async () => {
    expect(await verifyMint(baseConfig, "a".repeat(65))).toBe(false);
  });

  it("returns false for a non-hex string of length 64", async () => {
    expect(await verifyMint(baseConfig, "g".repeat(64))).toBe(false);
  });
});

// ─── createMetadata ───────────────────────────────────────────────────────────

describe("createMetadata", () => {
  it("returns an object with the same key-value pairs", () => {
    const fields = { description: "A token", icon: "https://example.com/icon.png" };
    const result = createMetadata(fields);
    expect(result).toEqual(fields);
  });

  it("returns a shallow copy (not the same reference)", () => {
    const fields = { key: "value" };
    const result = createMetadata(fields);
    expect(result).not.toBe(fields);
  });

  it("handles an empty object", () => {
    expect(createMetadata({})).toEqual({});
  });

  it("preserves nested objects", () => {
    const fields = { links: { homepage: "https://example.com" } };
    const result = createMetadata(fields);
    expect(result).toEqual(fields);
  });
});

// ─── encodeMetadata ───────────────────────────────────────────────────────────

describe("encodeMetadata", () => {
  it("returns a JSON string", () => {
    const meta = { description: "test" };
    const encoded = encodeMetadata(meta);
    expect(encoded).toBe(JSON.stringify(meta));
  });

  it("round-trips through JSON.parse correctly", () => {
    const meta = { name: "Token", decimals: 2 };
    expect(JSON.parse(encodeMetadata(meta))).toEqual(meta);
  });

  it("handles an empty object", () => {
    expect(encodeMetadata({})).toBe("{}");
  });

  it("handles nested structures", () => {
    const meta = { links: { homepage: "https://example.com" }, tags: ["defi", "nft"] };
    expect(JSON.parse(encodeMetadata(meta))).toEqual(meta);
  });
});
