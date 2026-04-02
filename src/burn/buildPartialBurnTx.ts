// Partial burn transaction builder.
import type { BurnRequest, BurnContext, UnsignedTransaction } from "./types.js";

/**
 * Build an unsigned BCH transaction that burns `burn.amount` tokens of
 * `burn.categoryId` while returning any excess tokens and BCH change to
 * the caller-specified addresses.
 *
 * @param burn - Specifies the category, amount to burn, and change address.
 * @param ctx  - Provides the available UTXO set and fee parameters.
 * @returns    An unsigned transaction ready for signing.
 */
export function buildPartialBurnTx(
  burn: BurnRequest,
  ctx: BurnContext,
): UnsignedTransaction {
  // --- argument validation ---
  if (!burn.categoryId || burn.categoryId.trim() === "") {
    throw new Error("burn.categoryId must be a non-empty hex string");
  }
  if (burn.amount <= 0n) {
    throw new Error("burn.amount must be greater than zero");
  }
  if (!burn.changeAddress || burn.changeAddress.trim() === "") {
    throw new Error("burn.changeAddress must be a non-empty address string");
  }
  if (!Array.isArray(ctx.utxos) || ctx.utxos.length === 0) {
    throw new Error("ctx.utxos must be a non-empty array");
  }
  if (ctx.feeRate <= 0) {
    throw new Error("ctx.feeRate must be a positive number");
  }

  // TODO: Select token UTXOs from ctx.utxos whose category matches
  //       burn.categoryId and whose combined token amount >= burn.amount.
  //       Throw if insufficient token balance is available.

  // TODO: Construct the burn output — an output that intentionally omits
  //       the token field so that burn.amount tokens are destroyed.

  // TODO: Construct a token change output that returns any surplus tokens
  //       (selectedAmount - burn.amount) back to the change address.
  //       Omit this output when there is no surplus.

  // TODO: Estimate the transaction fee based on ctx.feeRate and the
  //       expected serialised transaction size (inputs + outputs).

  // TODO: Build and return the UnsignedTransaction by assembling the
  //       selected inputs and the computed outputs.

  // Placeholder — replace with real implementation.
  return { inputs: [], outputs: [] };
}
