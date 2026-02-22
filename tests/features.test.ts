import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TransactionBuilder } from "../src/core/TransactionBuilder.js";
import { estimateFee, DEFAULT_FEE_RATE, TOKEN_OUTPUT_DUST, DUST_THRESHOLD } from "../src/utils/fee.js";
import { selectUtxos } from "../src/utils/coinselect.js";
import { validateSchema } from "../src/utils/validate.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";
import type { Utxo } from "../src/types/TransactionTypes.js";

const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const baseConfig: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

// ─── Fee estimation ────────────────────────────────────────────────────────────

describe("estimateFee", () => {
  it("returns a positive integer for 1 input, 1 output with default rate", () => {
    const fee = estimateFee(1, 1);
    expect(fee).toBeGreaterThan(0);
    expect(Number.isInteger(fee)).toBe(true);
  });

  it("increases with more inputs", () => {
    const fee1 = estimateFee(1, 1);
    const fee3 = estimateFee(3, 1);
    expect(fee3).toBeGreaterThan(fee1);
  });

  it("increases with more outputs", () => {
    const fee1 = estimateFee(1, 1);
    const fee2 = estimateFee(1, 2);
    expect(fee2).toBeGreaterThan(fee1);
  });

  it("scales proportionally with feeRate", () => {
    const fee1 = estimateFee(1, 1, 1.0);
    const fee2 = estimateFee(1, 1, 2.0);
    // fee2 should be approximately double fee1 (ceiling may shift by 1)
    expect(fee2).toBeGreaterThanOrEqual(fee1 * 2 - 1);
  });

  it("adds token-prefix overhead when hasToken is true", () => {
    const withToken = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    const withoutToken = estimateFee(1, 1, DEFAULT_FEE_RATE, false);
    expect(withToken).toBeGreaterThan(withoutToken);
  });

  it("uses default feeRate when not supplied", () => {
    expect(estimateFee(1, 1)).toBe(estimateFee(1, 1, DEFAULT_FEE_RATE));
  });
});

// ─── Coin selection ─────────────────────────────────────────────────────────

describe("selectUtxos", () => {
  const makeUtxo = (satoshis: number, index = 0): Utxo => ({
    txid: "a".repeat(64),
    vout: index,
    satoshis,
    scriptPubKey: "",
  });

  it("selects the single sufficient UTXO", () => {
    const utxos: Utxo[] = [makeUtxo(100_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    expect(result.selected).toHaveLength(1);
    expect(result.fee).toBeGreaterThan(0);
    expect(result.totalInput).toBe(100_000);
  });

  it("selects multiple UTXOs when one is insufficient", () => {
    // Each UTXO is 700 sats – individually below threshold but collectively sufficient
    const utxos: Utxo[] = [
      makeUtxo(700, 0),
      makeUtxo(700, 1),
      makeUtxo(700, 2),
      makeUtxo(700, 3),
      makeUtxo(700, 4),
    ];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    expect(result.selected.length).toBeGreaterThan(1);
    expect(result.totalInput).toBeGreaterThanOrEqual(TOKEN_OUTPUT_DUST + result.fee);
  });

  it("sorts UTXOs largest-first and prefers fewer inputs", () => {
    const utxos: Utxo[] = [
      makeUtxo(500, 0),
      makeUtxo(100_000, 1),
      makeUtxo(200, 2),
    ];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    // The 100_000-sat UTXO should be picked first
    expect(result.selected[0].satoshis).toBe(100_000);
  });

  it("includes a non-zero change when surplus exceeds dust threshold", () => {
    const utxos: Utxo[] = [makeUtxo(500_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    expect(result.change).toBeGreaterThan(DUST_THRESHOLD);
    expect(result.totalInput - result.fee - TOKEN_OUTPUT_DUST).toBeGreaterThan(DUST_THRESHOLD);
  });

  it("reports change of 0 when surplus is below DUST_THRESHOLD", () => {
    // Construct a UTXO that provides exactly TOKEN_OUTPUT_DUST + fee (no real change)
    const feeSingle = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    const exactAmount = TOKEN_OUTPUT_DUST + feeSingle + DUST_THRESHOLD - 1;
    const result = selectUtxos([makeUtxo(exactAmount)], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    expect(result.change).toBe(0);
  });

  it("throws MintCoreError when no UTXOs are provided", () => {
    expect(() => selectUtxos([], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)).toThrow(MintCoreError);
  });

  it("throws MintCoreError when funds are insufficient", () => {
    const utxos: Utxo[] = [makeUtxo(1, 0), makeUtxo(1, 1)];
    expect(() =>
      selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)
    ).toThrow(MintCoreError);
    expect(() =>
      selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)
    ).toThrow(/[Ii]nsufficient/);
  });
});

// ─── BCMR metadata attachment (offline mode) ──────────────────────────────────

describe("BCMR metadata attachment – offline build", () => {
  it("builds a transaction with a BCMR OP_RETURN output", async () => {
    const builder = new TransactionBuilder(baseConfig);
    const schema: TokenSchema = {
      name: "BCMR Token",
      symbol: "BCMR",
      decimals: 0,
      initialSupply: 100n,
      bcmrUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);

    // The serialised transaction must contain the BCMR marker bytes (42 43 4d 52)
    expect(result.hex).toContain("42434d52");
  });

  it("produces a longer hex than a transaction without BCMR", async () => {
    const builder = new TransactionBuilder(baseConfig);
    const baseSchema: TokenSchema = {
      name: "Token",
      symbol: "TKN",
      decimals: 0,
      initialSupply: 1n,
    };
    const bcmrSchema: TokenSchema = {
      ...baseSchema,
      bcmrUri: "https://example.com/token.json",
    };

    const without = await builder.build(baseSchema);
    const withBcmr = await builder.build(bcmrSchema);

    expect(withBcmr.hex.length).toBeGreaterThan(without.hex.length);
  });

  it("does NOT include BCMR marker when bcmrUri is omitted", async () => {
    const builder = new TransactionBuilder(baseConfig);
    const schema: TokenSchema = {
      name: "Token",
      symbol: "TKN",
      decimals: 0,
      initialSupply: 1n,
    };

    const result = await builder.build(schema);
    expect(result.hex).not.toContain("42434d52");
  });
});

// ─── BCMR validation ──────────────────────────────────────────────────────────

describe("validateSchema – bcmrUri", () => {
  const base: TokenSchema = {
    name: "T",
    symbol: "T",
    decimals: 0,
    initialSupply: 1n,
  };

  it("accepts a valid IPFS URI", () => {
    expect(() =>
      validateSchema({ ...base, bcmrUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi" })
    ).not.toThrow();
  });

  it("accepts a valid HTTPS URI", () => {
    expect(() =>
      validateSchema({ ...base, bcmrUri: "https://example.com/token.json" })
    ).not.toThrow();
  });

  it("accepts undefined bcmrUri (field is optional)", () => {
    expect(() => validateSchema(base)).not.toThrow();
  });

  it("throws MintCoreError for an empty bcmrUri", () => {
    expect(() => validateSchema({ ...base, bcmrUri: "" })).toThrow(MintCoreError);
    expect(() => validateSchema({ ...base, bcmrUri: "   " })).toThrow(MintCoreError);
  });

  it("throws MintCoreError for a bcmrUri that exceeds 220 bytes", () => {
    const longUri = "https://example.com/" + "x".repeat(210);
    expect(() => validateSchema({ ...base, bcmrUri: longUri })).toThrow(MintCoreError);
  });
});

// ─── Dynamic fee in funded (provider-backed) mode ────────────────────────────

describe("TransactionBuilder – UTXO-funded mode with dynamic fee", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const mockUtxos = [
    {
      tx_hash: "aa".repeat(32),
      tx_pos: 0,
      value: 200_000,
    },
  ];

  it("builds a signed funded transaction and returns fee", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });

    const config: MintConfig = {
      network: "regtest",
      privateKey: TEST_PRIVATE_KEY,
      electrumxProviderUrl: "https://fulcrum.example.com",
      feeRate: 1.0,
    };
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "Funded Token",
      symbol: "FND",
      decimals: 0,
      initialSupply: 1000n,
    };

    const result = await builder.build(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
    expect(result.fee).toBeTypeOf("number");
    expect(result.fee!).toBeGreaterThan(0);
  });

  it("includes BCMR OP_RETURN in a funded transaction", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockUtxos,
    });

    const config: MintConfig = {
      network: "regtest",
      privateKey: TEST_PRIVATE_KEY,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);
    const schema: TokenSchema = {
      name: "BCMR Funded",
      symbol: "BFN",
      decimals: 0,
      initialSupply: 1n,
      bcmrUri: "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
    };

    const result = await builder.build(schema);
    expect(result.hex).toContain("42434d52");
  });

  it("throws MintCoreError when no UTXOs are returned by provider", async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const config: MintConfig = {
      network: "regtest",
      privateKey: TEST_PRIVATE_KEY,
      electrumxProviderUrl: "https://fulcrum.example.com",
    };
    const builder = new TransactionBuilder(config);
    await expect(
      builder.build({ name: "T", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(MintCoreError);
  });

  it("uses a higher fee when feeRate is increased", async () => {
    const utxos = [{ tx_hash: "bb".repeat(32), tx_pos: 0, value: 500_000 }];

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => utxos,
    });

    const schema: TokenSchema = {
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    };

    const lowFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => utxos });
    vi.stubGlobal("fetch", lowFetch);
    const lowBuilder = new TransactionBuilder({ ...baseConfig, electrumxProviderUrl: "https://example.com", feeRate: 1.0 });
    const lowResult = await lowBuilder.build(schema);

    const highFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => utxos });
    vi.stubGlobal("fetch", highFetch);
    const highBuilder = new TransactionBuilder({ ...baseConfig, electrumxProviderUrl: "https://example.com", feeRate: 5.0 });
    const highResult = await highBuilder.build(schema);

    expect(highResult.fee!).toBeGreaterThan(lowResult.fee!);
  });
});
