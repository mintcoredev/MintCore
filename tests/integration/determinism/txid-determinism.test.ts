/**
 * tests/integration/determinism/txid-determinism.test.ts
 *
 * Integration tests locking in the determinism invariants of the minting pipeline:
 *
 *  1. Offline mode: same private key + same schema → same txid every time.
 *  2. Funded mode: same UTXO set + same schema + same key → same txid every time.
 *  3. UTXO sort-order independence: UTXOs returned in any order by the provider
 *     are sorted before use, so the resulting txid is identical regardless of
 *     the server's response ordering.
 *  4. Sensitivity: any change to the schema or UTXO set produces a different txid.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const offlineConfig: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
};

const fundedConfig: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
  electrumxProviderUrl: "https://fulcrum.example.com",
};

const schema: TokenSchema = {
  name: "Determinism Token",
  symbol: "DET",
  decimals: 2,
  initialSupply: 1000n,
};

const mockUtxos = [
  { tx_hash: "aa".repeat(32), tx_pos: 1, value: 20_000 },
  { tx_hash: "bb".repeat(32), tx_pos: 0, value: 15_000 },
];

describe("Txid determinism – offline mode", () => {
  it("produces an identical txid on repeated builds", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    const tx1 = await builder.build(schema);
    const tx2 = await builder.build(schema);
    const tx3 = await builder.build(schema);

    expect(tx1.txid).toBe(tx2.txid);
    expect(tx2.txid).toBe(tx3.txid);
  });

  it("produces an identical hex on repeated builds", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    const tx1 = await builder.build(schema);
    const tx2 = await builder.build(schema);

    expect(tx1.hex).toBe(tx2.hex);
  });

  it("produces a different txid for a different initialSupply", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    const tx1 = await builder.build({ ...schema, initialSupply: 1000n });
    const tx2 = await builder.build({ ...schema, initialSupply: 2000n });

    expect(tx1.txid).not.toBe(tx2.txid);
  });

  it("produces a different txid for a different NFT commitment", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    // NFT commitment bytes are encoded directly in the transaction output
    const tx1 = await builder.build({
      ...schema,
      nft: { capability: "none", commitment: "0x0001" },
    });
    const tx2 = await builder.build({
      ...schema,
      nft: { capability: "none", commitment: "0x0002" },
    });

    expect(tx1.txid).not.toBe(tx2.txid);
  });
});

describe("Txid determinism – funded mode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("produces an identical txid on repeated builds with the same UTXO set", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder1 = new TransactionBuilder(fundedConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder2 = new TransactionBuilder(fundedConfig);
    const tx2 = await builder2.build(schema);

    expect(tx1.txid).toBe(tx2.txid);
    expect(tx1.hex).toBe(tx2.hex);
  });

  it("produces an identical txid when the server returns UTXOs in any order", async () => {
    const reversed = [...mockUtxos].reverse();

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder1 = new TransactionBuilder(fundedConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => reversed,
    });
    const builder2 = new TransactionBuilder(fundedConfig);
    const tx2 = await builder2.build(schema);

    expect(tx1.txid).toBe(tx2.txid);
  });

  it("produces a different txid when the UTXO set changes", async () => {
    const altUtxos = [
      { tx_hash: "cc".repeat(32), tx_pos: 0, value: 20_000 },
      { tx_hash: "dd".repeat(32), tx_pos: 0, value: 15_000 },
    ];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder1 = new TransactionBuilder(fundedConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => altUtxos,
    });
    const builder2 = new TransactionBuilder(fundedConfig);
    const tx2 = await builder2.build(schema);

    expect(tx1.txid).not.toBe(tx2.txid);
  });

  it("produces a different txid for a different schema with the same UTXOs", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder1 = new TransactionBuilder(fundedConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });
    const builder2 = new TransactionBuilder(fundedConfig);
    const tx2 = await builder2.build({ ...schema, initialSupply: 9999n });

    expect(tx1.txid).not.toBe(tx2.txid);
  });
});
