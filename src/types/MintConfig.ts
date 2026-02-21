export interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey: string;
  /**
   * Base URL of a Chronik instance, e.g.:
   * - https://chronik.be.cash/xec
   * - https://chronik.yourdomain.com
   */
  utxoProviderUrl?: string;
  feeRate?: number;
}
