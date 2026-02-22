export interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  privateKey: string;
  /**
   * Base URL of a Chronik instance, e.g.:
   * - https://chronik.be.cash/xec
   * - https://chronik.yourdomain.com
   */
  utxoProviderUrl?: string;
  /**
   * Base URL of an ElectrumX / Fulcrum HTTP REST endpoint, e.g.:
   * - https://fulcrum.bch.example.com
   *
   * Used when `utxoProviderUrl` (Chronik) is not set. If both are configured,
   * `utxoProviderUrl` takes precedence.
   * Expected to expose: GET /address/{address}/unspent
   */
  electrumxProviderUrl?: string;
  feeRate?: number;
}
