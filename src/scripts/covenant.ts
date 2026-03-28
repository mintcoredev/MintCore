// Covenant script helpers.
// Covenants are scripts that constrain how a UTXO can be spent (e.g. by
// inspecting the spending transaction's outputs).  This module provides
// low-level primitives for composing covenant locking bytecodes.
import { encodeDataPush } from "@bitauth/libauth";
import { OP_RETURN } from "./opcodes.js";

/**
 * Build an `OP_RETURN` data-carrier output locking bytecode.
 * The output carries arbitrary data and is unspendable.
 *
 * @param chunks - One or more byte chunks to push onto the stack.
 */
export function opReturnLockingBytecode(...chunks: Uint8Array[]): Uint8Array {
  const pushes = chunks.flatMap((chunk) => [...encodeDataPush(chunk)]);
  return new Uint8Array([OP_RETURN, ...pushes]);
}
