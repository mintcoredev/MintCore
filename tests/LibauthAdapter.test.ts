import { describe, it, expect } from "vitest";
import { LibauthAdapter } from "../src/adapters/LibauthAdapter.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";

// A well-known 32-byte private key for testing (not for real use)
const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const config: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

// ─── LibauthAdapter ───────────────────────────────────────────────────────────

describe("LibauthAdapter", () => {
  it("builds a fungible token mint transaction", async () => {
    const adapter = new LibauthAdapter(config);
    const schema: TokenSchema = {
      name: "Test Token",
      symbol: "TST",
      decimals: 2,
      initialSupply: 1_000_000n,
    };

    const result = await adapter.buildMintTransaction(schema);

    expect(result.hex).toBeTypeOf("string");
    expect(result.hex.length).toBeGreaterThan(0);
    expect(result.hex.length % 2).toBe(0);
    expect(result.hex).toMatch(/^[0-9a-f]+$/);

    expect(result.txid).toBeTypeOf("string");
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds an NFT mint transaction (minting capability)", async () => {
    const adapter = new LibauthAdapter(config);
    const schema: TokenSchema = {
      name: "My NFT",
      symbol: "NFT",
      decimals: 0,
      initialSupply: 0n,
      nft: {
        capability: "minting",
        commitment: "deadbeef",
      },
    };

    const result = await adapter.buildMintTransaction(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a combined FT + NFT genesis transaction", async () => {
    const adapter = new LibauthAdapter(config);
    const schema: TokenSchema = {
      name: "Combo",
      symbol: "CMB",
      decimals: 8,
      initialSupply: 21_000_000n,
      nft: {
        capability: "none",
        commitment: "cafe",
      },
    };

    const result = await adapter.buildMintTransaction(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns deterministic results for identical inputs", async () => {
    const adapter = new LibauthAdapter(config);
    const schema: TokenSchema = {
      name: "Deterministic",
      symbol: "DET",
      decimals: 0,
      initialSupply: 500n,
    };

    const r1 = await adapter.buildMintTransaction(schema);
    const r2 = await adapter.buildMintTransaction(schema);

    expect(r1.hex).toBe(r2.hex);
    expect(r1.txid).toBe(r2.txid);
  });

  it("returns different results for different schemas", async () => {
    const adapter = new LibauthAdapter(config);

    const r1 = await adapter.buildMintTransaction({
      name: "Token A",
      symbol: "TKA",
      decimals: 0,
      initialSupply: 100n,
    });
    const r2 = await adapter.buildMintTransaction({
      name: "Token B",
      symbol: "TKB",
      decimals: 0,
      initialSupply: 200n,
    });

    expect(r1.hex).not.toBe(r2.hex);
    expect(r1.txid).not.toBe(r2.txid);
  });

  it("returns an object with only hex and txid (no extra properties)", async () => {
    const adapter = new LibauthAdapter(config);
    const result = await adapter.buildMintTransaction({
      name: "Shape Token",
      symbol: "SHP",
      decimals: 0,
      initialSupply: 1n,
    });

    // The adapter contract is { hex, txid } — nothing more
    expect(Object.keys(result).sort()).toEqual(["hex", "txid"]);
  });

  it("throws when the private key is invalid (all-zero key is out of range)", async () => {
    const badConfig: MintConfig = {
      network: "regtest",
      privateKey:
        "0000000000000000000000000000000000000000000000000000000000000000",
    };
    const adapter = new LibauthAdapter(badConfig);
    const schema: TokenSchema = {
      name: "Bad",
      symbol: "BAD",
      decimals: 0,
      initialSupply: 1n,
    };

    await expect(adapter.buildMintTransaction(schema)).rejects.toThrow();
  });
});
