export interface Utxo {
  txid: string;
  vout: number;
  satoshis: number;
  scriptPubKey: string;
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
  txid: string;
  /** Fee paid in satoshis. Only present when a UTXO provider was used. */
  fee?: number;
}