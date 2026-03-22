/**
 * Unified WalletAdapter interface for BCH-native wallet integrations.
 *
 * Follows the modular adapter pattern used by wagmi (EVM), Solana Wallet
 * Adapter, and CosmosKit — allowing future BCH wallets (Paytaca, Cashonize,
 * Zapit, hardware wallets, etc.) to be added without modifying the core
 * wallet system.
 *
 * ### Adding a new wallet
 * 1. Create a class that implements `WalletAdapter`.
 * 2. Register it with `createWalletRegistry([new MyAdapter()])`.
 * 3. Pass the registry to `WalletProvider`.
 *
 * ### Example
 * ```ts
 * class PaytacaAdapter implements WalletAdapter {
 *   readonly name = "Paytaca";
 *
 *   async connect(): Promise<void> { ... }
 *   async disconnect(): Promise<void> { ... }
 *   async getAddress(): Promise<string> { ... }
 *   async signMessage(message: string): Promise<string> { ... }
 *   async signTransaction(tx: Uint8Array): Promise<Uint8Array> { ... }
 *   on(event: string, callback: (...args: unknown[]) => void): void { ... }
 * }
 * ```
 */
export interface WalletAdapter {
  /**
   * Human-readable identifier for this wallet (e.g. `"WizardConnect"`).
   * Used as the key in the wallet registry.
   */
  readonly name: string;

  /**
   * Initiates the wallet connection flow.
   *
   * Implementations should open any required UI (QR modal, deep link,
   * browser extension prompt) and resolve once the user has approved the
   * connection.  The wallet address becomes available via {@link getAddress}
   * after this resolves.
   */
  connect(): Promise<void>;

  /**
   * Closes the active wallet connection and cleans up any resources.
   */
  disconnect(): Promise<void>;

  /**
   * Returns the primary CashAddress (P2PKH, with network prefix) managed by
   * the connected wallet.
   *
   * @returns CashAddress, e.g. `"bitcoincash:qp63uah..."`.
   * @throws If not connected.
   */
  getAddress(): Promise<string>;

  /**
   * Signs an arbitrary UTF-8 message with the wallet's private key.
   *
   * @param message - Plain-text message to sign.
   * @returns Signature bytes as a hex string.
   * @throws If not connected or the wallet does not support message signing.
   */
  signMessage(message: string): Promise<string>;

  /**
   * Signs a serialised unsigned transaction.
   *
   * @param tx - Unsigned transaction as raw bytes.
   * @returns Signed transaction as raw bytes.
   * @throws If not connected or the wallet rejects the signing request.
   */
  signTransaction(tx: Uint8Array): Promise<Uint8Array>;

  /**
   * Broadcasts a signed transaction to the BCH network.
   *
   * Optional — not all adapters provide broadcasting; they may delegate to
   * an external UTXO provider (Chronik, ElectrumX) instead.
   *
   * @param rawTx - Signed transaction as raw bytes.
   * @returns The transaction ID (txid) as a hex string.
   */
  broadcastTransaction?(rawTx: Uint8Array): Promise<string>;

  /**
   * Registers a listener for wallet events.
   *
   * Standard event names:
   * - `"connect"` — fired when the wallet connects.
   * - `"disconnect"` — fired when the wallet disconnects.
   * - `"accountsChanged"` — fired when the active address changes.
   * - `"error"` — fired on unrecoverable errors.
   *
   * @param event - Event name to subscribe to.
   * @param callback - Callback invoked when the event fires.
   */
  on(event: string, callback: (...args: unknown[]) => void): void;

  /**
   * Removes a previously registered event listener.
   *
   * @param event - Event name the listener was registered under.
   * @param callback - The exact callback function to remove.
   */
  off?(event: string, callback: (...args: unknown[]) => void): void;
}
