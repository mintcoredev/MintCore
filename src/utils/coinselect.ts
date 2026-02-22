import type { Utxo } from "../types/TransactionTypes.js";
import { MintCoreError } from "./errors.js";
import { estimateFee, DUST_THRESHOLD } from "./fee.js";

export interface CoinSelectResult {
  /** UTXOs chosen to fund the transaction. */
  selected: Utxo[];
  /** Total satoshis across all selected UTXOs. */
  totalInput: number;
  /** Calculated fee in satoshis. */
  fee: number;
  /** Change in satoshis (may be 0 when below dust threshold). */
  change: number;
}

/**
 * Greedy coin-selection: sort UTXOs largest-first and accumulate until we have
 * enough to cover `requiredOutput` satoshis plus the estimated fee.
 *
 * The fee is recomputed whenever the number of selected inputs grows so that
 * the estimate reflects the actual transaction size.
 *
 * @param utxos          - available UTXOs
 * @param requiredOutput - satoshis required for non-change outputs (e.g. dust for token output)
 * @param numNonChangeOutputs - number of outputs excluding change
 * @param feeRate        - sat/byte
 * @param hasToken       - whether one output carries a CashToken
 */
export function selectUtxos(
  utxos: Utxo[],
  requiredOutput: number,
  numNonChangeOutputs: number,
  feeRate: number,
  hasToken: boolean
): CoinSelectResult {
  if (utxos.length === 0) {
    throw new MintCoreError("No UTXOs available for coin selection");
  }

  // Sort largest-first for greedy selection
  const sorted = [...utxos].sort((a, b) => b.satoshis - a.satoshis);

  const selected: Utxo[] = [];
  let totalInput = 0;

  for (const utxo of sorted) {
    selected.push(utxo);
    totalInput += utxo.satoshis;

    // Recompute fee with the current number of selected inputs.
    // Include a change output in the estimate only if we might have change.
    const feeWithoutChange = estimateFee(selected.length, numNonChangeOutputs, feeRate, hasToken);
    const possibleChange = totalInput - requiredOutput - feeWithoutChange;
    const numOutputs = numNonChangeOutputs + (possibleChange > DUST_THRESHOLD ? 1 : 0);
    const fee = numOutputs > numNonChangeOutputs
      ? estimateFee(selected.length, numOutputs, feeRate, hasToken)
      : feeWithoutChange;

    if (totalInput >= requiredOutput + fee) {
      const change = totalInput - requiredOutput - fee;
      return { selected, totalInput, fee, change: change > DUST_THRESHOLD ? change : 0 };
    }
  }

  throw new MintCoreError(
    `Insufficient funds: have ${totalInput} satoshis, need ${requiredOutput} + fees`
  );
}
