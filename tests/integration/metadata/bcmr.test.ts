/**
 * tests/integration/metadata/bcmr.test.ts
 *
 * Integration tests for BCMR on-chain metadata attachment:
 *  - OP_RETURN output with the "BCMR" marker is included when bcmrUri is set
 *  - The transaction is longer with BCMR than without
 *  - BCMR works in both offline and funded modes
 *  - A URI exceeding 512 bytes is rejected
 *  - Omitting bcmrUri produces no OP_RETURN output
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

/** BCMR marker bytes in hex: ASCII "BCMR" = 0x42 0x43 0x4d 0x52 */
const BCMR_HEX_MARKER = "42434d52";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const offlineConfig: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
};

const baseSchema: TokenSchema = {
  name: "BCMR Token",
  symbol: "BCMR",
  decimals: 0,
  initialSupply: 100n,
};

describe("BCMR metadata attachment – offline mode", () => {
  it("includes the BCMR marker when bcmrUri is set", async () => {
    const builder = new TransactionBuilder(offlineConfig);
    const tx = await builder.build({
      ...baseSchema,
      bcmrUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    });

    expect(tx.hex).toContain(BCMR_HEX_MARKER);
  });

  it("does not include the BCMR marker when bcmrUri is omitted", async () => {
    const builder = new TransactionBuilder(offlineConfig);
    const tx = await builder.build(baseSchema);

    expect(tx.hex).not.toContain(BCMR_HEX_MARKER);
  });

  it("produces a longer transaction hex when bcmrUri is set", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    const withoutBcmr = await builder.build(baseSchema);
    const withBcmr = await builder.build({
      ...baseSchema,
      bcmrUri: "https://example.com/token.json",
    });

    expect(withBcmr.hex.length).toBeGreaterThan(withoutBcmr.hex.length);
  });

  it("produces a different txid when bcmrUri is added", async () => {
    const builder = new TransactionBuilder(offlineConfig);

    const without = await builder.build(baseSchema);
    const with_ = await builder.build({
      ...baseSchema,
      bcmrUri: "https://example.com/token.json",
    });

    expect(without.txid).not.toBe(with_.txid);
  });

  it("encodes the URI bytes into the OP_RETURN payload", async () => {
    const uri = "https://example.com/my-token.json";
    const builder = new TransactionBuilder(offlineConfig);
    const tx = await builder.build({ ...baseSchema, bcmrUri: uri });

    // URI bytes should appear verbatim in the transaction hex
    const uriHex = Buffer.from(uri, "utf8").toString("hex");
    expect(tx.hex).toContain(uriHex);
  });

  it("throws MintCoreError for a URI longer than 512 bytes", async () => {
    const longUri = "https://example.com/" + "x".repeat(500);
    const builder = new TransactionBuilder(offlineConfig);

    await expect(
      builder.build({ ...baseSchema, bcmrUri: longUri })
    ).rejects.toThrow(MintCoreError);
    await expect(
      builder.build({ ...baseSchema, bcmrUri: longUri })
    ).rejects.toThrow(/BCMR URI/i);
  });

  it("is deterministic with the same bcmrUri", async () => {
    const uri = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
    const builder = new TransactionBuilder(offlineConfig);

    const tx1 = await builder.build({ ...baseSchema, bcmrUri: uri });
    const tx2 = await builder.build({ ...baseSchema, bcmrUri: uri });

    expect(tx1.txid).toBe(tx2.txid);
  });
});

describe("BCMR metadata attachment – funded mode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fundedConfig: MintConfig = {
    network: "regtest",
    privateKey: PRIVATE_KEY,
    electrumxProviderUrl: "https://fulcrum.example.com",
  };

  const mockUtxos = [
    { tx_hash: "aa".repeat(32), tx_pos: 0, value: 500_000 },
  ];

  it("includes the BCMR marker in a funded transaction", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });

    const builder = new TransactionBuilder(fundedConfig);
    const tx = await builder.build({
      ...baseSchema,
      bcmrUri: "https://example.com/token.json",
    });

    expect(tx.hex).toContain(BCMR_HEX_MARKER);
  });

  it("does not include the BCMR marker in a funded transaction when bcmrUri is omitted", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });

    const builder = new TransactionBuilder(fundedConfig);
    const tx = await builder.build(baseSchema);

    expect(tx.hex).not.toContain(BCMR_HEX_MARKER);
  });
});
