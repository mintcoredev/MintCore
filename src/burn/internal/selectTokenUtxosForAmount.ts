// Internal helper: greedy smallest-first UTXO selection for fungible tokens.
import { MintCoreError } from "../../utils/errors.js";
import type { TokenUtxo } from "../types.js";

// TODO: Support alternative coin-selection strategy variants (e.g. largest-first,
//       branch-and-bound) so callers can trade off privacy vs. change minimisation.

// TODO: Add an optimisation pass that attempts to find an exact-match subset before
//       falling back to greedy selection, minimising the need for a change output.

// TODO: Decide how to handle NFT-bearing UTXOs: currently they are skipped (token.nft
//       present) to avoid accidentally consuming minting/mutable batons; add an opt-in
//       flag to include them when the caller explicitly wants to retire the baton too.

/**
 * Selects the minimum set of token UTXOs for `categoryId` whose combined
 * fungible-token amount is at least `amount`, using a smallest-first greedy
 * strategy.
 *
 * UTXOs that carry an NFT (baton) are intentionally excluded so that callers
 * cannot accidentally burn a minting or mutable capability.
 *
 * @param utxos      - Full UTXO set to search.
 * @param categoryId - Token category ID (hex) to filter on.
 * @param amount     - Minimum fungible-token amount required (inclusive).
 * @returns          Selected UTXOs and their exact combined token amount.
 * @throws {MintCoreError} When the available balance is less than `amount`.
 */
export function selectTokenUtxosForAmount(
  utxos: TokenUtxo[],
  categoryId: string,
  amount: bigint,
): { selected: TokenUtxo[]; total: bigint } {
  // Filter: matching category, has a positive fungible amount, no NFT baton.
  const candidates = utxos.filter(
    (u) =>
      u.token?.category === categoryId &&
      (u.token.amount ?? 0n) > 0n &&
      u.token.nft === undefined,
  );

  // Sort ascending so we consume the smallest UTXOs first.
  candidates.sort((a, b) => {
    const diff = a.token!.amount! - b.token!.amount!;
    return diff < 0n ? -1 : diff > 0n ? 1 : 0;
  });

  const selected: TokenUtxo[] = [];
  let total = 0n;

  for (const utxo of candidates) {
    selected.push(utxo);
    total += utxo.token!.amount!;
    if (total >= amount) {
      return { selected, total };
    }
  }

  throw new MintCoreError(
    `Insufficient token balance for category ${categoryId}: ` +
      `need ${amount}, have ${total}.`,
  );
}
