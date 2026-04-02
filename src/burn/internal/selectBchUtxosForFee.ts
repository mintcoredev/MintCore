// Internal helper: greedy smallest-first BCH UTXO selection for fee coverage.
import { MintCoreError } from "../../utils/errors.js";
import type { Utxo } from "../types.js";

// TODO: Support alternative coin-selection strategies (e.g. largest-first,
//       branch-and-bound) to minimise change outputs or improve privacy.

// TODO: Add an exact-match optimisation pass before falling back to greedy
//       selection, to avoid creating a change output when possible.

/**
 * Selects the minimum set of BCH UTXOs whose combined satoshi value is at
 * least `required`, using a smallest-first greedy strategy.
 *
 * @param utxos    - Available plain BCH UTXOs to select from.
 * @param required - Minimum total satoshi value required (inclusive).
 * @returns        Selected UTXOs and their exact combined satoshi value.
 * @throws {MintCoreError} When the available balance is less than `required`.
 */
export function selectBchUtxosForFee(
  utxos: Utxo[],
  required: bigint,
): { selected: Utxo[]; total: bigint } {
  // Sort ascending so we consume the smallest UTXOs first.
  const candidates = [...utxos].sort((a, b) => a.satoshis - b.satoshis);

  const selected: Utxo[] = [];
  let total = 0n;

  for (const utxo of candidates) {
    selected.push(utxo);
    total += BigInt(utxo.satoshis);
    if (total >= required) {
      return { selected, total };
    }
  }

  throw new MintCoreError(
    `Insufficient BCH balance: need ${required} satoshis, have ${total}.`,
  );
}
