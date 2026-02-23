export type TokenType = "fungible" | "nft";

export interface MintRequest {
  type: TokenType;
  metadata: Record<string, unknown>;
  amount?: number;
}

export interface MintResponse {
  rawTx: string;
  tokenId: string;
}

export interface Token {
  id: string;
  type: TokenType;
  metadata: Record<string, unknown>;
  amount?: number;
  createdAt: string;
  rawTx: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface WalletInfo {
  address: string;
  bchBalance: number;
  tokens: Token[];
  utxos: Utxo[];
}

export interface Utxo {
  txid: string;
  vout: number;
  satoshis: number;
}

export interface HealthStatus {
  status: "ok" | "error";
  mintcoreVersion: string;
  timestamp: string;
}
