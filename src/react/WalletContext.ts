import type { WalletAdapter } from "../wallet/adapters/WalletAdapter.js";

// ─── Connection state ─────────────────────────────────────────────────────────

export type WalletUIConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

// ─── Context value ────────────────────────────────────────────────────────────

/**
 * Shape of the value exposed by {@link WalletContext} and consumed by
 * {@link useWallet}.
 *
 * All wallet operations (connect, disconnect, sign) are accessed through this
 * object, keeping consumer components free of direct adapter imports.
 */
export interface WalletContextValue {
  // ── State ────────────────────────────────────────────────────────────────

  /**
   * Connected wallet address (BCH CashAddr), or `null` when not connected.
   */
  address: string | null;

  /**
   * Whether a wallet is currently connected.
   */
  isConnected: boolean;

  /**
   * Current connection lifecycle state.
   */
  connectionState: WalletUIConnectionState;

  /**
   * The last error that occurred, or `null`.
   */
  error: Error | null;

  /**
   * The active wallet adapter, or `null` when not connected.
   */
  activeAdapter: WalletAdapter | null;

  /**
   * All wallets available in the registry (for displaying a picker UI).
   */
  adapters: WalletAdapter[];

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Connects to the wallet with the given adapter name.
   *
   * @param adapterName - The {@link WalletAdapter.name} of the adapter to use.
   */
  connect(adapterName: string): Promise<void>;

  /**
   * Disconnects the active wallet.
   */
  disconnect(): Promise<void>;

  /**
   * Signs an arbitrary message with the connected wallet.
   *
   * @param message - Plain-text message to sign.
   * @returns Signature hex string.
   * @throws If not connected or the wallet does not support message signing.
   */
  signMessage(message: string): Promise<string>;

  /**
   * Signs a serialised unsigned transaction.
   *
   * @param tx - Unsigned transaction as raw bytes.
   * @returns Signed transaction as raw bytes.
   * @throws If not connected.
   */
  signTransaction(tx: Uint8Array): Promise<Uint8Array>;

  /**
   * Broadcasts a signed transaction to the BCH network.
   *
   * @param rawTx - Signed transaction as raw bytes.
   * @returns Transaction ID (txid) as a hex string.
   * @throws If not connected or the adapter does not support broadcasting.
   */
  broadcastTransaction(rawTx: Uint8Array): Promise<string>;
}

// ─── Provider props ───────────────────────────────────────────────────────────

export interface WalletProviderProps {
  /**
   * Wallet adapters to make available.  Typically produced by
   * {@link createWalletRegistry}.
   */
  adapters: WalletAdapter[];

  /**
   * When `true`, the provider will attempt to reconnect to the last used
   * wallet on mount (adapter name is persisted in `localStorage`).
   *
   * Defaults to `false`.
   */
  autoConnect?: boolean;

  /**
   * React children.
   */
  children: React.ReactNode;
}
