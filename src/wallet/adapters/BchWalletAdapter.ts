import type { WalletType } from "../WalletTypes.js";

/**
 * Modular adapter interface for BCH-native wallet integrations.
 *
 * Implement this interface to add support for any BCH wallet (browser
 * extensions, hardware wallets, mobile wallets, etc.) to the MintCore
 * wallet engine without coupling to a specific connection protocol.
 *
 * ### Adding a new wallet
 * 1. Create a class that implements `BchWalletAdapter`.
 * 2. Implement `connect()`, `disconnect()`, `getAddress()`, and
 *    `signTransaction()` using the wallet's native API.
 * 3. Pass an instance to `WalletManager`.
 *
 * ### Example
 * ```ts
 * class MyBchWallet implements BchWalletAdapter {
 *   readonly walletType = WalletType.Paytaca;
 *
 *   async connect(): Promise<string> {
 *     // … open connection, return CashAddr …
 *   }
 *
 *   async disconnect(): Promise<void> {
 *     // … close connection …
 *   }
 *
 *   async getAddress(): Promise<string> {
 *     // … resolve CashAddr …
 *   }
 *
 *   async signTransaction(
 *     txHex: string,
 *     sourceOutputs: ReadonlyArray<{ satoshis: bigint; lockingBytecode: Uint8Array }>
 *   ): Promise<string> {
 *     // … request signature, return signed hex …
 *   }
 * }
 * ```
 */
export interface BchWalletAdapter {
  /**
   * The wallet application this adapter targets.
   * Used to populate {@link WalletSession.walletType}.
   */
  readonly walletType: WalletType;

  /**
   * Opens a connection to the wallet and returns the primary CashAddress
   * (P2PKH, with network prefix) managed by the wallet.
   *
   * @returns CashAddress, e.g. `"bitcoincash:qp63uah..."`.
   */
  connect(): Promise<string>;

  /**
   * Closes the connection and cleans up any resources held by the adapter.
   */
  disconnect(): Promise<void>;

  /**
   * Returns the CashAddress managed by the wallet.
   *
   * May return a cached value after {@link connect} has been called.
   */
  getAddress(): Promise<string>;

  /**
   * Signs an unsigned BCH transaction.
   *
   * @param txHex - Unsigned transaction as a lowercase hex string.
   * @param sourceOutputs - UTXOs being spent, in input order.
   * @returns The fully-signed transaction as a lowercase hex string.
   */
  signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{
      satoshis: bigint;
      lockingBytecode: Uint8Array;
    }>
  ): Promise<string>;
}
