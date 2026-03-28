// Script-related types.

/** Supported P2PKH / P2SH address variants for BCH. */
export type ScriptType = "p2pkh" | "p2sh";

/** Wrapper for a raw locking or unlocking bytecode value. */
export interface ScriptBytes {
  /** The raw script bytes. */
  bytecode: Uint8Array;
  /** Human-readable script type, when known. */
  type?: ScriptType;
}
