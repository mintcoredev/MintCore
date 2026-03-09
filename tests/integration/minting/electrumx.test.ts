/**
 * tests/integration/minting/electrumx.test.ts
 *
 * Integration tests for the ElectrumX-backed funded minting pipeline:
 *  - UTXOs are fetched from a mocked ElectrumX REST endpoint
 *  - Funded transaction is built and signed with a private key
 *  - Supports both bare-array and { result: [...] } response envelopes
 *  - Transaction broadcast flow is exercised
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const ELECTRUMX_URL = "http://localhost:3031";

// ElectrumX-format UTXOs (tx_hash / tx_pos / value)
const MOCK_ELECTRUMX_UTXOS = [
  { tx_hash: "aa".repeat(32), tx_pos: 1, value: 20_000 },
  { tx_hash: "bb".repeat(32), tx_pos: 0, value: 15_000 },
];

describe("ElectrumX-backed funded minting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const config: MintConfig = {
    network: "regtest",
    privateKey: PRIVATE_KEY,
    electrumxProviderUrl: ELECTRUMX_URL,
  };

  const schema: TokenSchema = {
    name: "ElectrumX Token",
    symbol: "ELX",
    decimals: 2,
    initialSupply: 1000n,
  };

  it("builds a funded transaction from a bare-array UTXO response", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_ELECTRUMX_UTXOS,
    });

    const builder = new TransactionBuilder(config);
    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(tx.fee).toBeTypeOf("number");
    expect(tx.fee!).toBeGreaterThan(0);
  });

  it("builds a funded transaction from a { result: [...] } wrapped response", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ result: MOCK_ELECTRUMX_UTXOS }),
    });

    const builder = new TransactionBuilder(config);
    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds the same transaction from both UTXO response envelope formats", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_ELECTRUMX_UTXOS,
    });
    const builder1 = new TransactionBuilder(config);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ result: MOCK_ELECTRUMX_UTXOS }),
    });
    const builder2 = new TransactionBuilder(config);
    const tx2 = await builder2.build(schema);

    expect(tx1.txid).toBe(tx2.txid);
  });

  it("broadcasts a transaction and returns a txid", async () => {
    const fakeTxid = "cc".repeat(32);

    // First call: UTXO fetch; second call: broadcast
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => MOCK_ELECTRUMX_UTXOS,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ txid: fakeTxid }),
      });

    const builder = new TransactionBuilder(config);
    const tx = await builder.build(schema);
    const broadcastedTxid = await builder.broadcast(tx.hex);

    expect(broadcastedTxid).toBe(fakeTxid);
  });

  it("throws MintCoreError when ElectrumX returns no UTXOs", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const builder = new TransactionBuilder(config);
    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError on a non-OK HTTP status", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 502 });

    const builder = new TransactionBuilder(config);
    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when broadcast is attempted without a provider", async () => {
    const offlineConfig: MintConfig = {
      network: "regtest",
      privateKey: PRIVATE_KEY,
      // no utxoProviderUrl / electrumxProviderUrl
    };
    const builder = new TransactionBuilder(offlineConfig);

    await expect(builder.broadcast("deadbeef")).rejects.toThrow(MintCoreError);
    await expect(builder.broadcast("deadbeef")).rejects.toThrow(/provider/i);
  });
});
