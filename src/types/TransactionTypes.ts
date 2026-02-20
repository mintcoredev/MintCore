export interface Utxo {
  txid: string;
  vout: number;
  satoshis: number;
  scriptPubKey: string;
}

export interface BuiltTransaction {
  hex: string;
  txid: string;
}
