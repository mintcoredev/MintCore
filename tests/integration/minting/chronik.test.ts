/**
 * tests/integration/minting/chronik.test.ts
 *
 * Integration tests for the Chronik-backed funded minting pipeline:
 *  - UTXOs are fetched from a mocked Chronik server
 *  - Funded transaction is built and signed with a private key
 *  - Deterministic UTXO ordering → deterministic txid
 *  - Token category derived from the lexicographically-first input's txid
 *  - Fee is included in the result
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const CHRONIK_URL = "http://localhost:3030";

// Two UTXOs with different txids to exercise deterministic ordering
const MOCK_CHRONIK_UTXOS = [
  {
    txid: "bb".repeat(32),
    vout: 0,
    satoshis: 15_000,
    scriptPubKey: "",
  },
  {
    txid: "aa".repeat(32),
    vout: 1,
    satoshis: 20_000,
    scriptPubKey: "",
  },
];

function mockChronikFetch(utxos = MOCK_CHRONIK_UTXOS) {
  (fetch as any).mockResolvedValue({
    ok: true,
    json: async () => ({ utxos }),
  });
}

describe("Chronik-backed funded minting", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const config: MintConfig = {
    network: "regtest",
    privateKey: PRIVATE_KEY,
    utxoProviderUrl: CHRONIK_URL,
  };

  const schema: TokenSchema = {
    name: "Chronik Token",
    symbol: "CHR",
    decimals: 2,
    initialSupply: 1000n,
  };

  it("builds a funded transaction and returns a fee", async () => {
    mockChronikFetch();

    const builder = new TransactionBuilder(config);
    const tx = await builder.build(schema);

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(tx.fee).toBeTypeOf("number");
    expect(tx.fee!).toBeGreaterThan(0);
    expect(tx.fee!).toBeLessThan(20_000 + 15_000);
  });

  it("builds a deterministic transaction for the same UTXO set", async () => {
    mockChronikFetch();
    const builder = new TransactionBuilder(config);
    const tx1 = await builder.build(schema);

    mockChronikFetch();
    const tx2 = await builder.build(schema);

    expect(tx1.txid).toBe(tx2.txid);
    expect(tx1.hex).toBe(tx2.hex);
  });

  it("produces a deterministic txid regardless of UTXO order returned by server", async () => {
    // Server returns UTXOs in reversed order vs the standard mock
    const reversed = [...MOCK_CHRONIK_UTXOS].reverse();

    mockChronikFetch();
    const builder1 = new TransactionBuilder(config);
    const tx1 = await builder1.build(schema);

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ utxos: reversed }),
    });
    const builder2 = new TransactionBuilder(config);
    const tx2 = await builder2.build(schema);

    // UTXOs are sorted internally before building – txid must be identical
    expect(tx1.txid).toBe(tx2.txid);
  });

  it("derives the token category from the lexicographically-first input", async () => {
    mockChronikFetch();
    const builder = new TransactionBuilder(config);
    const tx = await builder.build(schema);

    // The category is the reversed bytes of the first sorted UTXO's txid.
    // First sorted txid is "aa".repeat(32) → reversed bytes are still "aa".repeat(32).
    // Those bytes appear in the transaction hex (as part of the token prefix).
    const firstSortedTxid = "aa".repeat(32);
    expect(tx.hex).toContain(firstSortedTxid);
  });

  it("throws MintCoreError when Chronik returns no UTXOs", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ utxos: [] }),
    });

    const builder = new TransactionBuilder(config);
    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError when the Chronik server returns an error response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 503 });

    const builder = new TransactionBuilder(config);
    await expect(builder.build(schema)).rejects.toThrow(MintCoreError);
  });

  it("includes a BCMR OP_RETURN output when bcmrUri is set", async () => {
    mockChronikFetch();

    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      ...schema,
      bcmrUri: "https://example.com/token.json",
    });

    expect(tx.hex).toContain("42434d52");
  });
});
