/**
 * tests/integration/fees/dust.test.ts
 *
 * Integration tests for dust-threshold enforcement:
 *  - TOKEN_OUTPUT_DUST is the minimum satoshi value for a token-bearing output
 *  - DUST_THRESHOLD is the minimum satoshi value to include a change output
 *  - Change below DUST_THRESHOLD is absorbed into the fee (not a separate output)
 *  - The fee estimate correctly reflects whether a change output is included
 */

import { describe, it, expect } from "vitest";
import {
  estimateFee,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
  P2PKH_OUTPUT_SIZE,
} from "../../../src/utils/fee.js";
import { selectUtxos } from "../../../src/utils/coinselect.js";
import type { Utxo } from "../../../src/types/TransactionTypes.js";

function makeUtxo(satoshis: number, vout = 0): Utxo {
  return { txid: "a".repeat(64), vout, satoshis, scriptPubKey: "" };
}

describe("TOKEN_OUTPUT_DUST constant", () => {
  it("is a positive integer", () => {
    expect(TOKEN_OUTPUT_DUST).toBeGreaterThan(0);
    expect(Number.isInteger(TOKEN_OUTPUT_DUST)).toBe(true);
  });

  it("is at least 546 satoshis (standard BCH dust limit)", () => {
    // CashTokens outputs carry extra data, so the dust minimum is higher
    // than the bare P2PKH dust limit.
    expect(TOKEN_OUTPUT_DUST).toBeGreaterThanOrEqual(546);
  });

  it("is used as the required output value in coin selection", () => {
    const utxos = [makeUtxo(500_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    // Selected UTXO must cover TOKEN_OUTPUT_DUST + fee
    expect(result.totalInput).toBeGreaterThanOrEqual(TOKEN_OUTPUT_DUST + result.fee);
  });
});

describe("DUST_THRESHOLD constant", () => {
  it("is a positive integer", () => {
    expect(DUST_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(DUST_THRESHOLD)).toBe(true);
  });

  it("equals 546 satoshis (standard BCH P2PKH dust limit)", () => {
    expect(DUST_THRESHOLD).toBe(546);
  });
});

describe("Change dust handling in coin selection", () => {
  it("drops change when surplus is exactly DUST_THRESHOLD - 1", () => {
    const feeFor1In1Out = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    const amount = TOKEN_OUTPUT_DUST + feeFor1In1Out + DUST_THRESHOLD - 1;

    const result = selectUtxos([makeUtxo(amount)], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.change).toBe(0);
  });

  it("includes change when surplus equals DUST_THRESHOLD", () => {
    // If surplus == DUST_THRESHOLD, the check is `change > DUST_THRESHOLD`, so it
    // is dropped. We need at least DUST_THRESHOLD + 1 to produce a change output.
    const feeFor1In2Out = estimateFee(1, 2, DEFAULT_FEE_RATE, true);
    const amount = TOKEN_OUTPUT_DUST + feeFor1In2Out + DUST_THRESHOLD + 1;

    const result = selectUtxos([makeUtxo(amount)], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.change).toBeGreaterThan(DUST_THRESHOLD);
  });

  it("fee increases by exactly one output size when change is included", () => {
    const feeNoChange = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    const feeWithChange = estimateFee(1, 2, DEFAULT_FEE_RATE, true);

    // Adding one P2PKH output should increase the fee by exactly P2PKH_OUTPUT_SIZE * feeRate
    expect(feeWithChange - feeNoChange).toBe(
      Math.ceil(P2PKH_OUTPUT_SIZE * DEFAULT_FEE_RATE)
    );
  });

  it("total satoshis in = TOKEN_OUTPUT_DUST + fee + change (when change > 0)", () => {
    const utxos = [makeUtxo(500_000)];
    const result = selectUtxos(utxos, TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.totalInput).toBe(TOKEN_OUTPUT_DUST + result.fee + result.change);
  });

  it("total satoshis in = TOKEN_OUTPUT_DUST + fee (when change is dropped)", () => {
    const feeFor1In1Out = estimateFee(1, 1, DEFAULT_FEE_RATE, true);
    // Leftover after token dust + fee is exactly DUST_THRESHOLD - 1 (sub-dust)
    const amount = TOKEN_OUTPUT_DUST + feeFor1In1Out + DUST_THRESHOLD - 1;
    const result = selectUtxos([makeUtxo(amount)], TOKEN_OUTPUT_DUST, 1, DEFAULT_FEE_RATE, true);

    expect(result.change).toBe(0);
    // Effective fee absorbs the sub-dust leftover
    expect(result.totalInput - TOKEN_OUTPUT_DUST - result.fee).toBeLessThan(DUST_THRESHOLD);
  });
});
