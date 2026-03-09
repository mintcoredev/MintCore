/**
 * tests/integration/minting/offline.test.ts
 *
 * End-to-end tests of the offline minting pipeline:
 *  - deterministic UTXO ordering (zero outpoint)
 *  - correct offline token category (zero txid)
 *  - valid transaction structure
 *  - stable txid across repeated builds
 *  - fee is absent in offline mode (no UTXOs to account for)
 */

import { describe, it, expect } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const config: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
  // No utxoProviderUrl / electrumxProviderUrl → offline mode
};

describe("Offline minting flow", () => {
  it("builds a deterministic genesis mint transaction", async () => {
    const builder = new TransactionBuilder(config);

    const schema: TokenSchema = {
      name: "Test Token",
      symbol: "TST",
      decimals: 2,
      initialSupply: 1000n,
    };

    const tx1 = await builder.build(schema);
    const tx2 = await builder.build(schema);

    // 1. Deterministic txid
    expect(tx1.txid).toBe(tx2.txid);

    // 2. Deterministic hex
    expect(tx1.hex).toBe(tx2.hex);

    // 3. Valid hex format
    expect(tx1.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx1.hex.length % 2).toBe(0);

    // 4. Valid 64-character txid
    expect(tx1.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("uses a zero outpoint in offline mode", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Zero Outpoint Token",
      symbol: "ZOT",
      decimals: 0,
      initialSupply: 500n,
    };

    const tx = await builder.build(schema);

    // The offline transaction serializes a 32-byte zero txid (64 hex '0' chars)
    // followed by 4-byte little-endian vout 0 (00000000) as the input outpoint.
    expect(tx.hex).toMatch(/^02000000[0-9a-f]*0{64}00000000/);
  });

  it("does not include a fee in offline mode", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "No Fee Token",
      symbol: "NFT",
      decimals: 0,
      initialSupply: 1n,
    };

    const tx = await builder.build(schema);

    // Offline mode builds without UTXOs, so fee is undefined
    expect(tx.fee).toBeUndefined();
  });

  it("produces different transactions for different schemas", async () => {
    const builder = new TransactionBuilder(config);

    const schemaA: TokenSchema = {
      name: "Token A",
      symbol: "TKA",
      decimals: 0,
      initialSupply: 100n,
    };
    const schemaB: TokenSchema = {
      name: "Token B",
      symbol: "TKB",
      decimals: 0,
      initialSupply: 200n,
    };

    const txA = await builder.build(schemaA);
    const txB = await builder.build(schemaB);

    expect(txA.hex).not.toBe(txB.hex);
    expect(txA.txid).not.toBe(txB.txid);
  });

  it("builds a fungible token genesis transaction", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Fungible Token",
      symbol: "FNG",
      decimals: 8,
      initialSupply: 21_000_000n,
    };

    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds an NFT genesis transaction in offline mode", async () => {
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Offline NFT",
      symbol: "ONFT",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "minting", commitment: "deadbeef" },
    };

    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws MintCoreError when no signing credentials are configured", async () => {
    const badConfig: MintConfig = { network: "regtest" };
    const builder = new TransactionBuilder(badConfig);

    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(MintCoreError);
    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(/signing credentials/i);
  });
});
