export interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey: string;
  /**
   * Optional: used later for UTXO fetching (Chronik, ElectrumX, etc.)
   */
  utxoProviderUrl?: string;
  feeRate?: number;
}