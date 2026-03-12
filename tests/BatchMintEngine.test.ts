/**
 * tests/BatchMintEngine.test.ts
 *
 * Comprehensive tests for the batch-minting engine:
 *  - planMintBatch(): offline mode (no UTXO provider)
 *  - planMintBatch(): UTXO-provider mode (mocked fetch)
 *  - Input validation (category, capability, amount, commitment, address)
 *  - BatchMintOptions validation
 *  - Chunking / maxOutputsPerTx behaviour
 *  - Fee cap enforcement
 *  - Deterministic planning
 *  - UTXO fragmentation / insufficient funds
 *  - executeMintBatch() error paths
 *  - continueOnFailure flag
 *  - UtxoLock concurrency helper
 *  - estimateBatchTxFee / estimateBatchTxSize utilities
 *  - validateMintRequest / validateBatchMintOptions utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BatchMintEngine } from "../src/core/BatchMintEngine.js";
import { UtxoLock } from "../src/utils/utxoLock.js";
import {
  estimateBatchTxFee,
  estimateBatchTxSize,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
  MINTING_BATON_INPUT_OVERHEAD,
  P2PKH_INPUT_SIZE,
  P2PKH_OUTPUT_SIZE,
  TOKEN_PREFIX_OVERHEAD,
  TX_OVERHEAD,
} from "../src/utils/fee.js";
import {
  validateMintRequest,
  validateBatchMintOptions,
} from "../src/utils/validate.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { MintRequest } from "../src/types/BatchMintTypes.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const TEST_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

// Regtest CashAddress derived from private key 0x01
const TEST_ADDRESS = "bchreg:qp63uahgrxged4z5jswyt5dn5v3lzsem6c6mz8vuwd";

const BASE_CONFIG: MintConfig = {
  network: "regtest",
  privateKey: TEST_KEY,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFtRequest(overrides: Partial<MintRequest> = {}): MintRequest {
  return { capability: "none", amount: 1000n, ...overrides };
}

function makeNftRequest(overrides: Partial<MintRequest> = {}): MintRequest {
  return {
    capability: "none",
    amount: 0n,
    commitment: "deadbeef",
    ...overrides,
  };
}

function makeUtxo(satoshis: number, vout = 0, txid = "a".repeat(64)) {
  return { txid, vout, satoshis, scriptPubKey: "" };
}

/** Stub global `fetch` to return a list of ElectrumX-style UTXOs. */
function stubFetch(utxos: { tx_hash: string; tx_pos: number; value: number }[]) {
  (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => utxos,
  });
}

// ── Fee / size utilities ──────────────────────────────────────────────────────

describe("estimateBatchTxSize", () => {
  it("computes correct size for 1 input, 1 token output, 1 change output", () => {
    const size = estimateBatchTxSize(1, 1, 1);
    expect(size).toBe(
      TX_OVERHEAD +
        1 * P2PKH_INPUT_SIZE +
        1 * (P2PKH_OUTPUT_SIZE + TOKEN_PREFIX_OVERHEAD) +
        1 * P2PKH_OUTPUT_SIZE
    );
  });

  it("scales linearly with the number of token outputs", () => {
    const s1 = estimateBatchTxSize(1, 1, 0);
    const s5 = estimateBatchTxSize(1, 5, 0);
    expect(s5 - s1).toBe(4 * (P2PKH_OUTPUT_SIZE + TOKEN_PREFIX_OVERHEAD));
  });

  it("adds MINTING_BATON_INPUT_OVERHEAD when hasMintingBaton is true", () => {
    const without = estimateBatchTxSize(1, 1, 0, false);
    const with_ = estimateBatchTxSize(1, 1, 0, true);
    expect(with_ - without).toBe(MINTING_BATON_INPUT_OVERHEAD);
  });
});

describe("estimateBatchTxFee", () => {
  it("returns a positive integer", () => {
    const fee = estimateBatchTxFee(1, 5, 1);
    expect(fee).toBeGreaterThan(0);
    expect(Number.isInteger(fee)).toBe(true);
  });

  it("applies safety margin correctly", () => {
    const base = estimateBatchTxFee(1, 5, 1, DEFAULT_FEE_RATE, 0);
    const withMargin = estimateBatchTxFee(1, 5, 1, DEFAULT_FEE_RATE, 10);
    // withMargin should be at least base * 1.10
    expect(withMargin).toBeGreaterThanOrEqual(Math.ceil(base * 1.1));
  });

  it("increases with more token outputs", () => {
    const f1 = estimateBatchTxFee(1, 1, 0);
    const f10 = estimateBatchTxFee(1, 10, 0);
    expect(f10).toBeGreaterThan(f1);
  });

  it("MINTING_BATON_INPUT_OVERHEAD constant is exported and positive", () => {
    expect(MINTING_BATON_INPUT_OVERHEAD).toBeGreaterThan(0);
  });
});

// ── validateMintRequest ───────────────────────────────────────────────────────

describe("validateMintRequest", () => {
  it("accepts a valid FT request", () => {
    expect(() =>
      validateMintRequest({ capability: "none", amount: 1000n })
    ).not.toThrow();
  });

  it("accepts a valid NFT request with hex commitment", () => {
    expect(() =>
      validateMintRequest({
        capability: "minting",
        amount: 0n,
        commitment: "deadbeef",
      })
    ).not.toThrow();
  });

  it("accepts a valid request with recipientAddress", () => {
    expect(() =>
      validateMintRequest({
        capability: "none",
        amount: 100n,
        recipientAddress: TEST_ADDRESS,
      })
    ).not.toThrow();
  });

  it("rejects invalid category (not 64 hex chars)", () => {
    expect(() =>
      validateMintRequest({ capability: "none", amount: 1n, category: "abc" })
    ).toThrow(MintCoreError);
  });

  it("accepts a valid 64-char hex category", () => {
    expect(() =>
      validateMintRequest({
        capability: "none",
        amount: 1n,
        category: "a".repeat(64),
      })
    ).not.toThrow();
  });

  it("rejects invalid capability", () => {
    expect(() =>
      validateMintRequest({
        capability: "invalid" as MintRequest["capability"],
        amount: 1n,
      })
    ).toThrow(MintCoreError);
  });

  it("rejects negative amount", () => {
    expect(() =>
      validateMintRequest({ capability: "none", amount: -1n })
    ).toThrow(MintCoreError);
  });

  it("accepts zero amount", () => {
    expect(() =>
      validateMintRequest({ capability: "none", amount: 0n })
    ).not.toThrow();
  });

  it("rejects commitment longer than 40 bytes", () => {
    // 41 bytes encoded as 82-char hex string
    const longHex = "aa".repeat(41);
    expect(() =>
      validateMintRequest({
        capability: "none",
        amount: 0n,
        commitment: longHex,
      })
    ).toThrow(MintCoreError);
  });

  it("accepts commitment of exactly 40 bytes", () => {
    const maxHex = "bb".repeat(40);
    expect(() =>
      validateMintRequest({ capability: "none", amount: 0n, commitment: maxHex })
    ).not.toThrow();
  });

  it("rejects an invalid recipientAddress format", () => {
    expect(() =>
      validateMintRequest({
        capability: "none",
        amount: 1n,
        recipientAddress: "not-an-address",
      })
    ).toThrow(MintCoreError);
  });

  it("rejects an empty recipientAddress", () => {
    expect(() =>
      validateMintRequest({
        capability: "none",
        amount: 1n,
        recipientAddress: "",
      })
    ).toThrow(MintCoreError);
  });
});

// ── validateBatchMintOptions ──────────────────────────────────────────────────

describe("validateBatchMintOptions", () => {
  it("accepts an empty options object", () => {
    expect(() => validateBatchMintOptions({})).not.toThrow();
  });

  it("accepts valid options", () => {
    expect(() =>
      validateBatchMintOptions({
        maxOutputsPerTx: 20,
        maxFeePerTx: 5000,
        feeRate: 1.5,
        feeSafetyMarginPercent: 10,
        continueOnFailure: true,
      })
    ).not.toThrow();
  });

  it("rejects maxOutputsPerTx of 0", () => {
    expect(() =>
      validateBatchMintOptions({ maxOutputsPerTx: 0 })
    ).toThrow(MintCoreError);
  });

  it("rejects maxOutputsPerTx > 1000", () => {
    expect(() =>
      validateBatchMintOptions({ maxOutputsPerTx: 1001 })
    ).toThrow(MintCoreError);
  });

  it("rejects negative maxFeePerTx", () => {
    expect(() =>
      validateBatchMintOptions({ maxFeePerTx: -1 })
    ).toThrow(MintCoreError);
  });

  it("rejects non-positive feeRate", () => {
    expect(() =>
      validateBatchMintOptions({ feeRate: 0 })
    ).toThrow(MintCoreError);
  });

  it("rejects feeSafetyMarginPercent > 100", () => {
    expect(() =>
      validateBatchMintOptions({ feeSafetyMarginPercent: 101 })
    ).toThrow(MintCoreError);
  });

  it("rejects negative feeSafetyMarginPercent", () => {
    expect(() =>
      validateBatchMintOptions({ feeSafetyMarginPercent: -5 })
    ).toThrow(MintCoreError);
  });
});

// ── UtxoLock ─────────────────────────────────────────────────────────────────

describe("UtxoLock", () => {
  it("starts empty", () => {
    const lock = new UtxoLock();
    expect(lock.size).toBe(0);
  });

  it("locks and detects a UTXO", () => {
    const lock = new UtxoLock();
    const u = makeUtxo(1000);
    lock.lock(u);
    expect(lock.isLocked(u)).toBe(true);
    expect(lock.size).toBe(1);
  });

  it("unlocks a UTXO", () => {
    const lock = new UtxoLock();
    const u = makeUtxo(1000);
    lock.lock(u);
    lock.unlock(u);
    expect(lock.isLocked(u)).toBe(false);
    expect(lock.size).toBe(0);
  });

  it("filterUnlocked removes locked UTXOs", () => {
    const lock = new UtxoLock();
    const u1 = makeUtxo(1000, 0);
    const u2 = makeUtxo(2000, 1);
    lock.lock(u1);
    const result = lock.filterUnlocked([u1, u2]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(u2);
  });

  it("lockAll / unlockAll operate on arrays", () => {
    const lock = new UtxoLock();
    const utxos = [makeUtxo(1000, 0), makeUtxo(2000, 1)];
    lock.lockAll(utxos);
    expect(lock.size).toBe(2);
    lock.unlockAll(utxos);
    expect(lock.size).toBe(0);
  });

  it("clear releases all locks", () => {
    const lock = new UtxoLock();
    lock.lockAll([makeUtxo(1000, 0), makeUtxo(2000, 1)]);
    lock.clear();
    expect(lock.size).toBe(0);
  });

  it("treats different txid:vout combinations as independent", () => {
    const lock = new UtxoLock();
    lock.lock({ txid: "a".repeat(64), vout: 0 });
    expect(lock.isLocked({ txid: "a".repeat(64), vout: 1 })).toBe(false);
    expect(lock.isLocked({ txid: "b".repeat(64), vout: 0 })).toBe(false);
  });
});

// ── planMintBatch – offline (no UTXO provider) ────────────────────────────────

describe("BatchMintEngine.planMintBatch – offline mode", () => {
  let engine: BatchMintEngine;

  beforeEach(() => {
    engine = new BatchMintEngine(BASE_CONFIG);
  });

  it("rejects an empty request array", async () => {
    await expect(engine.planMintBatch([])).rejects.toThrow(MintCoreError);
    await expect(engine.planMintBatch([])).rejects.toThrow(/required/i);
  });

  it("returns a plan with one transaction for a single mint", async () => {
    const plan = await engine.planMintBatch([makeFtRequest()]);
    expect(plan.totalTransactions).toBe(1);
    expect(plan.totalMints).toBe(1);
    expect(plan.transactions).toHaveLength(1);
  });

  it("returns correct totalMints count", async () => {
    const requests = Array.from({ length: 7 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests);
    expect(plan.totalMints).toBe(7);
  });

  it("chunks requests by maxOutputsPerTx", async () => {
    const requests = Array.from({ length: 25 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 10 });
    // 25 requests at 10/tx → 3 transactions (10, 10, 5)
    expect(plan.totalTransactions).toBe(3);
    expect(plan.transactions[0].mintRequests).toHaveLength(10);
    expect(plan.transactions[1].mintRequests).toHaveLength(10);
    expect(plan.transactions[2].mintRequests).toHaveLength(5);
  });

  it("defaults to maxOutputsPerTx = 20", async () => {
    const requests = Array.from({ length: 20 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests);
    expect(plan.totalTransactions).toBe(1);
  });

  it("transactions have sequential zero-based indices", async () => {
    const requests = Array.from({ length: 5 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 2 });
    plan.transactions.forEach((tx, i) => expect(tx.index).toBe(i));
  });

  it("estimatedFee is positive for all transactions", async () => {
    const requests = Array.from({ length: 5 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 2 });
    for (const tx of plan.transactions) {
      expect(tx.estimatedFee).toBeGreaterThan(0);
    }
  });

  it("estimatedSize is positive for all transactions", async () => {
    const requests = Array.from({ length: 3 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests);
    for (const tx of plan.transactions) {
      expect(tx.estimatedSize).toBeGreaterThan(0);
    }
  });

  it("totalEstimatedFee equals sum of per-tx fees", async () => {
    const requests = Array.from({ length: 25 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 10 });
    const sum = plan.transactions.reduce((s, t) => s + t.estimatedFee, 0);
    expect(plan.totalEstimatedFee).toBe(sum);
  });

  it("requiredBalance equals totalCost", async () => {
    const plan = await engine.planMintBatch([makeFtRequest()]);
    expect(plan.requiredBalance).toBe(plan.totalCost);
  });

  it("inputs array is empty in offline mode", async () => {
    const plan = await engine.planMintBatch([makeFtRequest()]);
    expect(plan.transactions[0].inputs).toHaveLength(0);
  });

  it("throws for invalid capability", async () => {
    await expect(
      engine.planMintBatch([
        { capability: "bad" as MintRequest["capability"], amount: 1n },
      ])
    ).rejects.toThrow(MintCoreError);
  });

  it("throws for negative amount", async () => {
    await expect(
      engine.planMintBatch([{ capability: "none", amount: -1n }])
    ).rejects.toThrow(MintCoreError);
  });

  it("throws when maxFeePerTx is too low", async () => {
    await expect(
      engine.planMintBatch([makeFtRequest()], { maxFeePerTx: 1 })
    ).rejects.toThrow(MintCoreError);
    await expect(
      engine.planMintBatch([makeFtRequest()], { maxFeePerTx: 1 })
    ).rejects.toThrow(/maxFeePerTx/i);
  });

  it("accepts maxFeePerTx that is large enough", async () => {
    await expect(
      engine.planMintBatch([makeFtRequest()], { maxFeePerTx: 10_000 })
    ).resolves.not.toThrow();
  });

  it("is deterministic – same inputs → same plan", async () => {
    const requests = Array.from({ length: 10 }, () => makeFtRequest());
    const plan1 = await engine.planMintBatch(requests, { maxOutputsPerTx: 5 });
    const plan2 = await engine.planMintBatch(requests, { maxOutputsPerTx: 5 });
    expect(plan1.totalTransactions).toBe(plan2.totalTransactions);
    expect(plan1.totalEstimatedFee).toBe(plan2.totalEstimatedFee);
    expect(plan1.totalCost).toBe(plan2.totalCost);
    for (let i = 0; i < plan1.transactions.length; i++) {
      expect(plan1.transactions[i].estimatedFee).toBe(
        plan2.transactions[i].estimatedFee
      );
    }
  });

  it("handles a large batch (500 mints)", async () => {
    const requests = Array.from({ length: 500 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 20 });
    expect(plan.totalTransactions).toBe(25);
    expect(plan.totalMints).toBe(500);
    expect(plan.totalEstimatedFee).toBeGreaterThan(0);
  });

  it("applies feeSafetyMarginPercent correctly", async () => {
    const req = [makeFtRequest()];
    const noMargin = await engine.planMintBatch(req, {
      feeSafetyMarginPercent: 0,
    });
    const withMargin = await engine.planMintBatch(req, {
      feeSafetyMarginPercent: 20,
    });
    expect(withMargin.totalEstimatedFee).toBeGreaterThan(
      noMargin.totalEstimatedFee
    );
  });
});

// ── planMintBatch – UTXO provider mode ───────────────────────────────────────

describe("BatchMintEngine.planMintBatch – UTXO provider mode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeEngine(): BatchMintEngine {
    return new BatchMintEngine({
      ...BASE_CONFIG,
      electrumxProviderUrl: "https://fulcrum.example.com",
    });
  }

  it("assigns inputs when UTXOs are available", async () => {
    stubFetch([
      { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 },
    ]);
    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);
    expect(plan.transactions[0].inputs).toHaveLength(1);
  });

  it("allocates separate UTXOs to separate transactions", async () => {
    stubFetch([
      { tx_hash: "a".repeat(64), tx_pos: 0, value: 100_000 },
      { tx_hash: "b".repeat(64), tx_pos: 0, value: 100_000 },
    ]);
    const engine = makeEngine();
    const requests = Array.from({ length: 4 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 2 });
    const allInputTxids = plan.transactions.flatMap((tx) =>
      tx.inputs.map((u) => `${u.txid}:${u.vout}`)
    );
    // No duplicate UTXO across transactions
    const unique = new Set(allInputTxids);
    expect(unique.size).toBe(allInputTxids.length);
  });

  it("throws MintCoreError when funds are insufficient", async () => {
    stubFetch([
      { tx_hash: "a".repeat(64), tx_pos: 0, value: 100 }, // way too small
    ]);
    const engine = makeEngine();
    await expect(engine.planMintBatch([makeFtRequest()])).rejects.toThrow(
      MintCoreError
    );
  });

  it("computes a non-zero change output when there is a surplus", async () => {
    stubFetch([{ tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 }]);
    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);
    expect(plan.transactions[0].changeOutput).toBeGreaterThan(DUST_THRESHOLD);
  });

  it("sets changeOutput to 0 when surplus is below dust", async () => {
    // Provide just enough: 1 token dust + estimated fee for 1 input, 1 output
    // (no change output). Set a tight budget.
    const tightBudget = TOKEN_OUTPUT_DUST + estimateBatchTxFee(1, 1, 0, DEFAULT_FEE_RATE, 0) + DUST_THRESHOLD - 1;
    stubFetch([{ tx_hash: "a".repeat(64), tx_pos: 0, value: tightBudget }]);
    const engine = makeEngine();
    const plan = await engine.planMintBatch(
      [makeFtRequest()],
      { feeSafetyMarginPercent: 0 }
    );
    expect(plan.transactions[0].changeOutput).toBe(0);
  });
});

// ── executeMintBatch – error paths ────────────────────────────────────────────

describe("BatchMintEngine.executeMintBatch – error paths", () => {
  it("throws when no signing credentials are configured", async () => {
    const engine = new BatchMintEngine({ network: "regtest" });
    const plan = await engine.planMintBatch([makeFtRequest()]);
    await expect(engine.executeMintBatch(plan)).rejects.toThrow(MintCoreError);
    await expect(engine.executeMintBatch(plan)).rejects.toThrow(
      /signing credentials/i
    );
  });

  it("throws when no UTXO provider is configured", async () => {
    const engine = new BatchMintEngine(BASE_CONFIG); // no provider
    const plan = await engine.planMintBatch([makeFtRequest()]);
    await expect(engine.executeMintBatch(plan)).rejects.toThrow(MintCoreError);
    await expect(engine.executeMintBatch(plan)).rejects.toThrow(
      /UTXO provider/i
    );
  });
});

// ── executeMintBatch – UTXO provider mode ─────────────────────────────────────

describe("BatchMintEngine.executeMintBatch – UTXO provider mode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function makeEngine(): BatchMintEngine {
    return new BatchMintEngine({
      ...BASE_CONFIG,
      electrumxProviderUrl: "https://fulcrum.example.com",
    });
  }

  it("returns empty failures on success", async () => {
    const utxo = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    // fetchUtxos called for both planMintBatch and executeOnePlannedTx
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] }) // plan fetch
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] }) // exec re-check fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ txid: "c".repeat(64) }) }); // broadcast

    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);
    const result = await engine.executeMintBatch(plan);

    expect(result.failures).toHaveLength(0);
    expect(result.txids).toHaveLength(1);
    expect(result.txids[0]).toBe("c".repeat(64));
  });

  it("maps each request to its txid and output index", async () => {
    const utxo = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] })
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ txid: "d".repeat(64) }) });

    const engine = makeEngine();
    const requests = [makeFtRequest(), makeNftRequest()];
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 2 });
    const result = await engine.executeMintBatch(plan);

    expect(result.mintResults).toHaveLength(2);
    expect(result.mintResults[0].outputIndex).toBe(0);
    expect(result.mintResults[1].outputIndex).toBe(1);
  });

  it("aborts on first failure when continueOnFailure is false (default)", async () => {
    const utxo1 = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    const utxo2 = { tx_hash: "b".repeat(64), tx_pos: 0, value: 500_000 };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo1, utxo2] }) // plan
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo1, utxo2] }) // exec re-check tx0
      .mockRejectedValueOnce(new Error("broadcast failed")); // broadcast tx0

    const engine = makeEngine();
    const requests = Array.from({ length: 4 }, () => makeFtRequest());
    const plan = await engine.planMintBatch(requests, { maxOutputsPerTx: 2 });

    await expect(engine.executeMintBatch(plan)).rejects.toThrow(MintCoreError);
    await expect(
      engine.executeMintBatch(plan)
    ).rejects.toThrow(/aborted/i);
  });

  it("continues after failure when continueOnFailure is true", async () => {
    const utxo = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] }) // plan
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] }) // exec re-check
      .mockRejectedValueOnce(new Error("broadcast timeout")); // broadcast fails

    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);
    const result = await engine.executeMintBatch(plan, {
      continueOnFailure: true,
    });

    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].txIndex).toBe(0);
    expect(result.failures[0].error).toMatch(/broadcast timeout/i);
  });

  it("records totalFeePaid from successful transactions", async () => {
    const utxo = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] })
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ txid: "e".repeat(64) }) });

    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);
    const result = await engine.executeMintBatch(plan);

    expect(result.totalFeePaid).toBeGreaterThan(0);
  });

  it("throws MintCoreError when a planned UTXO is no longer available", async () => {
    const utxo = { tx_hash: "a".repeat(64), tx_pos: 0, value: 500_000 };
    (fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [utxo] }) // plan
      .mockResolvedValueOnce({ ok: true, json: async () => [] }); // re-check: gone!

    const engine = makeEngine();
    const plan = await engine.planMintBatch([makeFtRequest()]);

    await expect(engine.executeMintBatch(plan)).rejects.toThrow(
      /no longer available/i
    );
  });
});

// ── Parallel-call safety ──────────────────────────────────────────────────────

describe("UtxoLock – parallel call safety", () => {
  it("two independent UtxoLock instances do not share state", () => {
    const lock1 = new UtxoLock();
    const lock2 = new UtxoLock();
    const u = makeUtxo(1000);
    lock1.lock(u);
    // lock2 should not be affected
    expect(lock2.isLocked(u)).toBe(false);
  });
});
