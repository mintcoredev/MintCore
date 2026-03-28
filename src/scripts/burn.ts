// Burn / OP_RETURN script helpers.
// A "burn" output uses OP_RETURN to make the output permanently unspendable,
// effectively removing the tokens from circulation.
import { encodeDataPush } from "@bitauth/libauth";
import { OP_RETURN } from "./opcodes.js";

/**
 * Build an OP_RETURN locking bytecode that attaches arbitrary data.
 * The resulting output is unspendable (provably unspendable burn output).
 *
 * @param data - Optional bytes to include as a pushed data element.
 */
export function burnLockingBytecode(data?: Uint8Array): Uint8Array {
  if (!data || data.length === 0) {
    return new Uint8Array([OP_RETURN]);
  }
  return new Uint8Array([OP_RETURN, ...encodeDataPush(data)]);
}

/** Return `true` when the locking bytecode begins with OP_RETURN (0x6a). */
export function isBurnOutput(lockingBytecode: Uint8Array): boolean {
  return lockingBytecode.length > 0 && lockingBytecode[0] === OP_RETURN;
}
