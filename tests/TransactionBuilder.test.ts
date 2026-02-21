import { describe, it, expect } from "vitest";
import { TransactionBuilder } from "../src/core/TransactionBuilder.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";

// A well-known 32-byte private key for testing (not for real use)
const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const config: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

describe("TransactionBuilder", () => {
  it("builds a fungible token genesis transaction", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "My Token",
      symbol: "MTK",
      decimals: 2,
      initialSupply: 1000000n,
    };

    const result = await builder.build(schema);

    expect(result.hex).toBeTypeOf("string");
    expect(result.hex.length).toBeGreaterThan(0);
    // Valid transaction hex must be even-length and all hex characters
    expect(result.hex.length % 2).toBe(0);
    expect(result.hex).toMatch(/^[0-9a-f]+$/);

    expect(result.txid).toBeTypeOf("string");
    // TXID is a 64-character hex string (32 bytes)
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds an NFT genesis transaction (minting capability, hex commitment)", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "My NFT",
      symbol: "MNFT",
      decimals: 0,
      initialSupply: 0n,
      nft: {
        capability: "minting",
        commitment: "0x1234abcd",
      },
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a combined FT + NFT genesis transaction", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Combo Token",
      symbol: "CMB",
      decimals: 8,
      initialSupply: 21000000n,
      nft: {
        capability: "none",
        commitment: "deadbeef",
      },
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds an NFT genesis transaction with UTF-8 commitment", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "UTF8 NFT",
      symbol: "UTFN",
      decimals: 0,
      initialSupply: 0n,
      nft: {
        capability: "mutable",
        commitment: "hello",
      },
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns deterministic results for the same input", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Deterministic Token",
      symbol: "DET",
      decimals: 0,
      initialSupply: 500n,
    };

    const result1 = await builder.build(schema);
    const result2 = await builder.build(schema);

    expect(result1.hex).toBe(result2.hex);
    expect(result1.txid).toBe(result2.txid);
  });

  it("returns different transactions for different schemas", async () => {
    const builder = new TransactionBuilder(config);
    const schema1: TokenSchema = {
      name: "Token A",
      symbol: "TKA",
      decimals: 0,
      initialSupply: 100n,
    };
    const schema2: TokenSchema = {
      name: "Token B",
      symbol: "TKB",
      decimals: 0,
      initialSupply: 200n,
    };

    const result1 = await builder.build(schema1);
    const result2 = await builder.build(schema2);

    expect(result1.hex).not.toBe(result2.hex);
    expect(result1.txid).not.toBe(result2.txid);
  });

  it("throws on an invalid private key (all-zero key is outside secp256k1 range)", async () => {
    // secp256k1 requires private keys in the range [1, n-1].
    // A 32-byte key of all zeros is explicitly invalid.
    const badConfig: MintConfig = {
      network: "regtest",
      privateKey: "0000000000000000000000000000000000000000000000000000000000000000",
    };
    const builder = new TransactionBuilder(badConfig);
    const schema: TokenSchema = {
      name: "Bad Key Token",
      symbol: "BKT",
      decimals: 0,
      initialSupply: 1n,
    };

    await expect(builder.build(schema)).rejects.toThrow();
  });
});
