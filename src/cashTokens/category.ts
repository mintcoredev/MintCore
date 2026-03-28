// Token category utilities.
import { fromHex, toHex } from "../utils/hex.js";

/**
 * Convert a display-order txid (64-character hex string) to the internal-order
 * category `Uint8Array` used in CashTokens transaction encoding.
 */
export function categoryFromTxid(txid: string): Uint8Array {
  return fromHex(txid).reverse();
}

/**
 * Convert an internal-order category `Uint8Array` to the display-order hex
 * string (as shown in block explorers).
 */
export function categoryToHex(category: Uint8Array): string {
  return toHex(new Uint8Array(category).reverse());
}
