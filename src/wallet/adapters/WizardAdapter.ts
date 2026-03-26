import { MintCoreError } from "../../utils/errors.js";
import { toHex, fromHex } from "../../utils/hex.js";
import type { WalletAdapter } from "./WalletAdapter.js";
import { WalletType } from "../WalletTypes.js";

// ─── Extended duck-typed client interface ─────────────────────────────────────

/**
 * WizardConnect client interface used by {@link WizardAdapter}.
 *
 * Extends the minimal signing contract with an optional `signMessage` method
 * so adapters built on wallets that support BCH message signing can expose
 * that capability without requiring all wallets to implement it.
 */
export interface WizardAdapterClientLike {
  /**
   * Returns the list of CashAddr strings managed by the connected wallet.
   * Each entry is a standard BCH CashAddress, e.g. `"bitcoincash:q..."`.
   */
  getAccounts(): Promise<string[]>;

  /**
   * Signs a BCH transaction and returns the signed transaction hex.
   *
   * @param txHex - Unsigned transaction as a lowercase hex string.
   * @param sourceOutputs - UTXOs being spent, serialised for the wallet.
   */
  signTransaction(
    txHex: string,
    sourceOutputs: Array<{ satoshis: string; lockingBytecode: string }>
  ): Promise<string>;

  /**
   * Signs an arbitrary message.  Optional — not all wallets support this.
   *
   * @param message - Plain-text message to sign.
   * @returns Signature as a hex string.
   */
  signMessage?(message: string): Promise<string>;

  /**
   * Broadcasts a signed transaction to the network.  Optional.
   *
   * @param txHex - Signed transaction as a lowercase hex string.
   * @returns The transaction ID (txid) as a hex string.
   */
  broadcastTransaction?(txHex: string): Promise<string>;

  /** Closes the wallet connection. */
  disconnect(): Promise<void>;
}

// ─── BCH-specific source output type ──────────────────────────────────────────

export interface BchSourceOutput {
  satoshis: bigint;
  lockingBytecode: Uint8Array;
}

// ─── WizardAdapter ────────────────────────────────────────────────────────────

/**
 * WizardConnect adapter implementing the {@link WalletAdapter} interface.
 *
 * Wraps a {@link WizardAdapterClientLike} and exposes the unified wallet API
 * to MintCore's React layer.  No UI logic lives here — the adapter is purely
 * a bridge between the Wizard Connect client and the `WalletAdapter` contract.
 *
 * ### Usage with the wallet registry
 * ```ts
 * import { WizardAdapter, createWalletRegistry } from "mintcore";
 *
 * const client = ...; // your initialised Wizard Connect client
 * const registry = createWalletRegistry([new WizardAdapter({ client })]);
 * ```
 *
 * ### BCH / CashTokens signing
 * For full CashTokens signing (which requires `sourceOutputs`), use the
 * BCH-specific helper {@link signBchTransaction} after casting to
 * `WizardAdapter`:
 * ```ts
 * const signed = await (adapter as WizardAdapter).signBchTransaction(
 *   txHex,
 *   sourceOutputs
 * );
 * ```
 * Alternatively, use the existing {@link WizardConnectProvider} directly with
 * `TransactionBuilder`, which handles `sourceOutputs` automatically.
 */
export class WizardAdapter implements WalletAdapter {
  readonly name: string;
  readonly walletType: WalletType | undefined;

  private static readonly WALLET_NAMES: Record<WalletType, string> = {
    [WalletType.Paytaca]: "Paytaca",
    [WalletType.Cashonize]: "Cashonize",
    [WalletType.Zapit]: "Zapit",
  };

  private readonly client: WizardAdapterClientLike;
  private cachedAddress: string | undefined;
  private connected = false;

  // Typed event listeners
  private readonly eventListeners: Map<
    string,
    Array<(...args: unknown[]) => void>
  > = new Map();

  constructor(options: {
    type?: WalletType;
    client: WizardAdapterClientLike | null;
  }) {
    if (options.client === null || options.client === undefined) {
      throw new MintCoreError(
        "WizardAdapter: a valid client instance is required"
      );
    }
    this.walletType = options.type;
    this.name =
      options.type != null
        ? WizardAdapter.WALLET_NAMES[options.type]
        : "WizardConnect";
    this.client = options.client;
  }

  // ─── WalletAdapter implementation ─────────────────────────────────────────

  /**
   * Initiates the Wizard Connect session by requesting the wallet's accounts.
   *
   * In a real integration the WizardConnect SDK would open a QR/deep-link
   * pairing flow here.  The adapter resolves once `getAccounts()` succeeds,
   * signalling that the connection is active.
   */
  async connect(): Promise<void> {
    let accounts: string[];
    try {
      accounts = await this.client.getAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: connect failed — ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError("WizardAdapter: no accounts returned during connect");
    }

    const raw = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError("WizardAdapter: invalid account entry returned during connect");
    }

    this.cachedAddress = raw;
    this.connected = true;
    this.emit("connect", this.cachedAddress);
  }

  /**
   * Disconnects from the Wizard Connect session.
   */
  async disconnect(): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      await this.client.disconnect();
    } catch {
      // Treat the session as terminated regardless.
    } finally {
      this.connected = false;
      this.cachedAddress = undefined;
      this.emit("disconnect");
    }
  }

  /**
   * Returns the primary CashAddress of the connected wallet.
   */
  async getAddress(): Promise<string> {
    this.assertConnected();

    if (this.cachedAddress !== undefined) {
      return this.cachedAddress;
    }

    let accounts: string[];
    try {
      accounts = await this.client.getAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: getAddress failed — ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError("WizardAdapter: getAccounts returned no accounts");
    }

    const raw = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError("WizardAdapter: getAccounts returned an invalid account entry");
    }

    this.cachedAddress = raw;
    return raw;
  }

  /**
   * Signs an arbitrary message via the connected wallet.
   *
   * @throws {MintCoreError} if the underlying client does not implement
   *   `signMessage`.
   */
  async signMessage(message: string): Promise<string> {
    this.assertConnected();

    if (typeof this.client.signMessage !== "function") {
      throw new MintCoreError(
        "WizardAdapter: the connected client does not support signMessage"
      );
    }

    try {
      return await this.client.signMessage(message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: signMessage failed — ${msg}`);
    }
  }

  /**
   * Signs a serialised unsigned transaction.
   *
   * Converts the raw `Uint8Array` to hex, calls the Wizard Connect client
   * with empty `sourceOutputs` (sufficient for wallets that derive signing
   * context independently), and returns the signed transaction as raw bytes.
   *
   * **For full CashTokens signing** (which requires explicit `sourceOutputs`
   * for SIGHASH computation), use {@link signBchTransaction} instead.
   */
  async signTransaction(tx: Uint8Array): Promise<Uint8Array> {
    this.assertConnected();

    const txHex = toHex(tx);

    let signedHex: string;
    try {
      signedHex = await this.client.signTransaction(txHex, []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: signTransaction failed — ${msg}`);
    }

    if (typeof signedHex !== "string" || signedHex.trim() === "") {
      throw new MintCoreError(
        "WizardAdapter: signTransaction returned an invalid response"
      );
    }

    return fromHex(signedHex);
  }

  /**
   * BCH / CashTokens–specific signing helper.
   *
   * Passes explicit `sourceOutputs` to the Wizard Connect client, which is
   * required for correct SIGHASH pre-image computation on Bitcoin Cash.
   *
   * @param txHex - Unsigned transaction as a lowercase hex string.
   * @param sourceOutputs - UTXOs being spent, in input order.
   * @returns The fully-signed transaction as a lowercase hex string.
   */
  async signBchTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<BchSourceOutput>
  ): Promise<string> {
    this.assertConnected();

    const serialisedOutputs = sourceOutputs.map((o) => ({
      satoshis: o.satoshis.toString(),
      lockingBytecode: toHex(o.lockingBytecode),
    }));

    let result: string;
    try {
      result = await this.client.signTransaction(txHex, serialisedOutputs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: signBchTransaction failed — ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WizardAdapter: signBchTransaction returned an invalid response"
      );
    }

    return result;
  }

  /**
   * Broadcasts a signed transaction to the network via the Wizard Connect
   * client.
   *
   * @throws {MintCoreError} if the underlying client does not implement
   *   `broadcastTransaction`.
   */
  async broadcastTransaction(rawTx: Uint8Array): Promise<string> {
    this.assertConnected();

    if (typeof this.client.broadcastTransaction !== "function") {
      throw new MintCoreError(
        "WizardAdapter: the connected client does not support broadcastTransaction"
      );
    }

    const txHex = toHex(rawTx);

    try {
      return await this.client.broadcastTransaction(txHex);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardAdapter: broadcastTransaction failed — ${msg}`);
    }
  }

  /**
   * Registers a listener for a wallet event.
   *
   * @param event - Event name (e.g. `"connect"`, `"disconnect"`, `"error"`).
   * @param callback - Callback invoked when the event fires.
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * Removes a previously registered event listener.
   *
   * @param event - Event name the listener was registered under.
   * @param callback - The exact callback function to remove.
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners === undefined) {
      return;
    }
    const idx = listeners.indexOf(callback);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private assertConnected(): void {
    if (!this.connected) {
      throw new MintCoreError(
        "WizardAdapter: cannot perform operation — wallet is not connected"
      );
    }
  }

  private emit(event: string, ...args: unknown[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners === undefined) {
      return;
    }
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch {
        // Event listeners must not crash the adapter.
      }
    }
  }
}
