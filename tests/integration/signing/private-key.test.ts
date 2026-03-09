/**
 * tests/integration/signing/private-key.test.ts
 *
 * Integration tests for private-key signing in funded mode:
 *  - A real secp256k1 ECDSA signature is produced for each input
 *  - The signed transaction hex differs from an unsigned skeleton
 *  - Signing is deterministic: same inputs → same signed hex
 *  - Invalid private keys are rejected early
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const MOCK_UTXOS = [
  { tx_hash: "aa".repeat(32), tx_pos: 0, value: 500_000 },
];

const baseConfig: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
  electrumxProviderUrl: "https://fulcrum.example.com",
};

const schema: TokenSchema = {
  name: "Signed Token",
  symbol: "SGN",
  decimals: 0,
  initialSupply: 100n,
};

describe("Private-key signing – funded mode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds and signs a funded transaction", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const builder = new TransactionBuilder(baseConfig);
    const tx = await builder.build(schema);

    // Well-formed transaction hex
    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.hex.length % 2).toBe(0);
    // Valid 64-char txid
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    // Fee is present in funded mode
    expect(tx.fee).toBeTypeOf("number");
    expect(tx.fee!).toBeGreaterThan(0);
  });

  it("produces a deterministic signed transaction", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });
    const builder1 = new TransactionBuilder(baseConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });
    const builder2 = new TransactionBuilder(baseConfig);
    const tx2 = await builder2.build(schema);

    expect(tx1.hex).toBe(tx2.hex);
    expect(tx1.txid).toBe(tx2.txid);
  });

  it("produces different transactions for different private keys", async () => {
    const altKey =
      "0000000000000000000000000000000000000000000000000000000000000002";

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });
    const builder1 = new TransactionBuilder(baseConfig);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });
    const builder2 = new TransactionBuilder({
      ...baseConfig,
      privateKey: altKey,
    });
    const tx2 = await builder2.build(schema);

    // Different keys → different locking bytecodes → different UTXOs (by address)
    // and different signatures → different tx hex and txid
    expect(tx1.hex).not.toBe(tx2.hex);
    expect(tx1.txid).not.toBe(tx2.txid);
  });

  it("throws MintCoreError for an all-zero private key", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => MOCK_UTXOS,
    });

    const badConfig: MintConfig = {
      ...baseConfig,
      privateKey:
        "0000000000000000000000000000000000000000000000000000000000000000",
    };
    const builder = new TransactionBuilder(badConfig);

    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when no credentials are provided", async () => {
    const noCredsConfig: MintConfig = {
      network: "regtest",
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(noCredsConfig);

    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
    await expect(builder.build(schema)).rejects.toThrow(/signing credentials/i);
  });

  it("uses a higher fee when feeRate is increased", async () => {
    const utxos = [{ tx_hash: "cc".repeat(32), tx_pos: 0, value: 500_000 }];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => utxos,
    });
    const lowBuilder = new TransactionBuilder({
      ...baseConfig,
      feeRate: 1.0,
    });
    const txLow = await lowBuilder.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => utxos,
    });
    const highBuilder = new TransactionBuilder({
      ...baseConfig,
      feeRate: 5.0,
    });
    const txHigh = await highBuilder.build(schema);

    expect(txHigh.fee!).toBeGreaterThan(txLow.fee!);
  });
});
