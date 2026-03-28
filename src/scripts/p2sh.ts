// P2SH (Pay-to-Script-Hash) script helpers.
import {
  encodeLockingBytecodeP2sh20,
  hash160,
} from "@bitauth/libauth";

/**
 * Build a P2SH20 locking script from a redeem script.
 *
 * The redeem script is hashed (HASH160) and the result is wrapped in the
 * standard P2SH20 template: `OP_HASH160 <scriptHash> OP_EQUAL`.
 *
 * @param redeemScript - The serialised redeem script bytes.
 */
export function p2shLockingBytecode(redeemScript: Uint8Array): Uint8Array {
  return encodeLockingBytecodeP2sh20(hash160(redeemScript));
}
