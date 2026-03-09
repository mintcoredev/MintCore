/**
 * tests/integration/fees/coinselect.test.ts
 *
 * Integration tests for the greedy coin-selection algorithm:
 *  - Selects the single sufficient UTXO (largest-first)
 *  - Accumulates multiple UTXOs when a single one is insufficient
 *  - Returns non-zero change when the surplus exceeds DUST_THRESHOLD
 *  - Drops change when the surplus is below DUST_THRESHOLD
 *  - Rejects an empty UTXO list
 *  - Rejects when cumulative funds are insufficient
 *  - Fee grows as the input count grows
 */

import { describe, it, expect } from "vitest";
import { selectUtxos } from "../../../src/utils/coinselect.js";
import { estimateFee, DEFAULT_FEE_RATE, TOKEN_OUTPUT_DUST, DUST_THRESHOLD } from "../../../src/utils/fee.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { Utxo } from "../../../src/types/TransactionTypes.js";

function makeUtxo(satoshis: number, vout = 0, txid = "a".repeat(64)): Utxo {
  return { txid, vout, satoshis, scriptPubKey: "" };
}

describe("selectUtxos – greedy coin selection", () => {
  it("selects a single sufficient UTXO", () => {
    const utxos = [makeUtxo(100_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.selected).toHaveLength(1);
    expect(result.totalInput).toBe(100_000);
    expect(result.fee).toBeGreaterThan(0);
    expect(result.change).toBeGreaterThan(DUST_THRESHOLD);
  });

  it("selects multiple UTXOs when a single UTXO is insufficient", () => {
    const utxos = [
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

  it("prefers larger UTXOs (greedy largest-first)", () => {
    const utxos = [
      makeUtxo(200, 0),
      makeUtxo(100_000, 1),
      makeUtxo(500, 2),
    ];

    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.selected[0].satoshis).toBe(100_000);
    expect(result.selected).toHaveLength(1);
  });

  it("includes non-zero change when the surplus exceeds DUST_THRESHOLD", () => {
    const utxos = [makeUtxo(500_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.change).toBeGreaterThan(DUST_THRESHOLD);
    expect(result.totalInput - result.fee - TOKEN_OUTPUT_DUST).toBeGreaterThan(DUST_THRESHOLD);
  });

  it("reports change = 0 when the surplus is below DUST_THRESHOLD", () => {
    const feeFor1In1Out = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    // Supply exactly TOKEN_OUTPUT_DUST + fee + (DUST_THRESHOLD - 1) so that
    // the leftover after token + fee is just below the dust threshold.
    const amount = TOKEN_OUTPUT_DUST + feeFor1In1Out + DUST_THRESHOLD - 1;

    const result = selectUtxos([makeUtxo(amount)], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.change).toBe(0);
  });

  it("accounts for the change output when estimating fee", () => {
    // With a surplus well above the dust threshold, the fee should reflect
    // 1 input + 2 outputs (token + change) + token prefix overhead.
    const utxos = [makeUtxo(500_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    const expectedFee = estimateFee(1, 2, DEFAULT_FEE_RATE, true);
    expect(result.fee).toBe(expectedFee);
  });

  it("throws MintCoreError when the UTXO list is empty", () => {
    expect(() =>
      selectUtxos([], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when total funds are insufficient", () => {
    const utxos = [makeUtxo(1, 0), makeUtxo(1, 1)];

    expect(() =>
      selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)
    ).toThrow(MintCoreError);
    expect(() =>
      selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true)
    ).toThrow(/[Ii]nsufficient/);
  });

  it("fee grows as the number of required inputs increases", () => {
    // Each small UTXO alone is insufficient; two together are required.
    // The one-input case uses a single large UTXO that is sufficient alone.
    const twoSmall = [makeUtxo(800, 0), makeUtxo(800, 1)];
    const oneLarge = [makeUtxo(3_000, 0)];

    const resultTwo = selectUtxos(twoSmall, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);
    const resultOne = selectUtxos(oneLarge, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    // Both should succeed; the two-input transaction should have a higher fee
    expect(resultTwo.fee).toBeGreaterThan(resultOne.fee);
  });

  it("correctly sums totalInput across selected UTXOs", () => {
    const utxos = [makeUtxo(300_000), makeUtxo(200_000, 1)];
    // The 300_000 UTXO alone is sufficient, so only one should be selected
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.totalInput).toBe(result.selected.reduce((s, u) => s + u.satoshis, 0));
  });
});
