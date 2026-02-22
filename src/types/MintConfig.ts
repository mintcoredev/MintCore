import type { WalletProvider } from "./WalletProvider";

export interface MintConfig {
  network: "mainnet" | "testnet" | "regtest";
  /**
   * Raw 32-byte private key as a hex string.
   * Required unless `walletProvider` is supplied.
   */
  privateKey?: string;
  /**
   * External wallet provider used for address derivation and transaction
   * signing. When set, `privateKey` is not required.
   * If both are set, `privateKey` takes precedence.
   */
  walletProvider?: WalletProvider;
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
