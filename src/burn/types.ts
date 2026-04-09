// Burn module types.
export type { Utxo } from "../types/TransactionTypes.js";

/** Optional token data that may be attached to a UTXO by an indexer. */
export interface UtxoToken {
  category?: string;
  amount?: bigint;
  nft?: { capability?: string };
}

/** Extended UTXO shape used by indexers that decorate UTXOs with token data. */
export interface TokenUtxo extends import("../types/TransactionTypes.js").Utxo {
  token?: UtxoToken;
}

/** A lightweight representation of an unsigned BCH transaction (pre-signing). */
export interface UnsignedTransaction {
  /** Raw inputs referencing UTXOs to spend. */
  inputs: Array<{ txid: string; vout: number; satoshis: number }>;
  /** Raw outputs (locking bytecode + value). */
  outputs: Array<{ lockingBytecode: Uint8Array; valueSatoshis: bigint }>;
}

/** Describes a token burn request. */
export interface BurnRequest {
  /** Token category ID (hex). */
  categoryId: string;
  /** Number of fungible tokens to burn. */
  amount: bigint;
  /** Recipient address for any BCH change output. */
  changeAddress: string;
}

/** Context required to build burn transactions. */
export interface BurnContext {
  /** Available UTXOs that may include token or BCH outputs. */
  utxos: import("../types/TransactionTypes.js").Utxo[];
  /** Fee rate in satoshis per byte. */
  feeRate: number;
}
