// Category retirement check.
import type { Utxo } from "../types/TransactionTypes.js";

/** Optional token data that may be attached to a UTXO by indexer extensions. */
interface UtxoToken {
  category?: string;
  amount?: bigint;
  nft?: { capability?: string };
}

/** Extended UTXO shape used by indexers that decorate UTXOs with token data. */
interface TokenUtxo extends Utxo {
  token?: UtxoToken;
}

function isTokenUtxo(utxo: Utxo): utxo is TokenUtxo {
  return "token" in utxo;
}

/**
 * Returns `true` when the given token category has been fully retired,
 * meaning there are no fungible-token UTXOs and no minting-baton UTXOs
 * for the category present in the provided UTXO set.
 *
 * NOTE: This function operates on a caller-supplied snapshot of UTXOs.
 * It cannot verify on-chain state by itself; callers must pass an
 * up-to-date UTXO set for the result to be meaningful.
 *
 * @param categoryId - Token category ID (hex).
 * @param utxos      - Current UTXO set to inspect.
 * @returns          `true` if the category is fully retired.
 */
export function isCategoryRetired(categoryId: string, utxos: Utxo[]): boolean {
  for (const utxo of utxos) {
    if (!isTokenUtxo(utxo)) {
      continue;
    }
    const { token } = utxo;
    if (!token || token.category !== categoryId) {
      continue;
    }

    // Any fungible token balance means the category is still live.
    if (token.amount !== undefined && token.amount > 0n) {
      return false;
    }

    // Any baton UTXO (mutable or minting capability) means still live.
    if (token.nft?.capability === "minting" || token.nft?.capability === "mutable") {
      return false;
    }
  }

  return true;
}
