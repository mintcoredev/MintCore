export interface Utxo {
  txid: string;
  vout: number;
  satoshis: number;
  /**
   * Locking script (hex). May be absent when the UTXO was fetched from a
   * provider that does not return script data (e.g. ElectrumX/Fulcrum).
   * Internal signing paths derive the locking bytecode from the private key,
   * so the absence of this field does not affect minting operations.
   */
  scriptPubKey?: string;
}

export interface TokenOutput {
  valueSatoshis: number;
  category: string; // token category ID (hex)
  amount: bigint;
  nft?: {
    capability: "none" | "mutable" | "minting";
    commitment: string;
  };
  lockingBytecode: Uint8Array;
}

export interface BuiltTransaction {
  hex: string;
  /** Raw serialized transaction hex (identical to `hex`; present for explicit determinism assertions). */
  rawHex: string;
  txid: string;
  /** Fee paid in satoshis. Only present when a UTXO provider was used. */
  fee?: number;
}