// Full category retirement transaction builder.
import type { BurnContext, UnsignedTransaction } from "./types.js";
import type { Utxo } from "../types/TransactionTypes.js";

/** Extended context that also requires the minting baton UTXO. */
export type RetirementContext = BurnContext & { batonUtxo: Utxo };

/**
 * Build an unsigned BCH transaction that fully retires a token category by:
 *  1. Consuming all fungible-token UTXOs for `categoryId`.
 *  2. Consuming the minting baton UTXO.
 *  3. Including a retirement OP_RETURN output.
 *  4. Returning BCH change (minus fee) to the caller.
 *
 * No token or baton change output is created — all tokens are burned.
 *
 * @param categoryId - Token category ID (hex) to retire.
 * @param ctx        - Provides UTXOs (including the baton) and fee parameters.
 * @returns          An unsigned transaction ready for signing.
 */
export function buildFullCategoryRetirementTx(
  categoryId: string,
  ctx: RetirementContext,
): UnsignedTransaction {
  // --- argument validation ---
  if (!categoryId || categoryId.trim() === "") {
    throw new Error("categoryId must be a non-empty hex string");
  }
  if (!Array.isArray(ctx.utxos) || ctx.utxos.length === 0) {
    throw new Error("ctx.utxos must be a non-empty array");
  }
  if (ctx.feeRate <= 0) {
    throw new Error("ctx.feeRate must be a positive number");
  }
  if (!ctx.batonUtxo) {
    throw new Error("ctx.batonUtxo must be provided for full category retirement");
  }

  // TODO: Collect all token UTXOs for categoryId from ctx.utxos.
  //       Throw if none are found (nothing to retire).

  // TODO: Consume the minting baton UTXO (ctx.batonUtxo) as an input.
  //       Ensure it actually carries a minting-capability NFT for categoryId.

  // TODO: Build a retirement OP_RETURN output encoding categoryId so that
  //       indexers can detect the deliberate retirement event on-chain.

  // TODO: Estimate the fee and construct a BCH-only change output for any
  //       satoshi value reclaimed from the consumed UTXOs minus the fee.

  // TODO: Assemble and return the UnsignedTransaction.
  //       Verify that no token field appears on any output (full burn).

  throw new Error("buildFullCategoryRetirementTx is not yet implemented");
}
