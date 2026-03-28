import { MintCoreError } from "../utils/errors.js";
import { WalletClient, WalletClientOptions, BchWalletSession, BchWalletClientLike } from "./WalletClient.js";
import {
  BchNetwork,
  WalletConnectionState,
  WalletEventName,
  WalletEventPayload,
  WalletSession,
  WalletType,
} from "./WalletTypes.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WalletManagerOptions {
  /**
   * BCH network.  Defaults to `"mainnet"`.
   */
  network?: BchNetwork;
}

type EventListener<K extends WalletEventName> = (
  payload: WalletEventPayload[K]
) => void;

// ─── WalletManager ────────────────────────────────────────────────────────────

/**
 * High-level orchestrator for BCH wallet connections.
 *
 * `WalletManager` owns the connection lifecycle — tracking the current session,
 * the connection state, and notifying subscribers of changes.  It intentionally
 * contains **no UI logic** and **no browser-specific code** so it can be used
 * in any JavaScript / TypeScript environment.
 *
 * ### Typical usage
 * ```ts
 * const manager = new WalletManager({ network: "mainnet" });
 *
 * manager.on("connect", (session) => console.log("Connected:", session.address));
 * manager.on("disconnect", () => console.log("Disconnected"));
 * manager.on("stateChange", (state) => console.log("State:", state));
 * manager.on("error", (err) => console.error("Error:", err.message));
 *
 * // Connection and session approval is handled externally.
 * // Once a session exists, register it:
 * await manager.connect(client, session, WalletType.Paytaca);
 *
 * const address = await manager.getAddress();
 * const signedTx = await manager.signTransaction(txHex, sourceOutputs);
 *
 * await manager.disconnect();
 * ```
 */
export class WalletManager {
  private readonly network: BchNetwork;
  private walletClient: WalletClient | null = null;
  private currentSession: WalletSession | null = null;
  private state: WalletConnectionState = WalletConnectionState.Disconnected;

  // Typed event listener maps
  private readonly listeners: {
    [K in WalletEventName]: Array<EventListener<K>>;
  } = {
    connect: [],
    disconnect: [],
    stateChange: [],
    error: [],
  };

  constructor(options: WalletManagerOptions = {}) {
    this.network = options.network ?? "mainnet";
  }

  // ─── Connection lifecycle ──────────────────────────────────────────────────

  /**
   * Registers an approved wallet session with the manager.
   *
   * The `client` and `session` objects are expected to come from the
   * connection flow performed outside the engine. This method wraps them in
   * a {@link WalletClient}, resolves the wallet address, and transitions the
   * manager to the {@link WalletConnectionState.Connected} state.
   *
   * @param client    - Initialised BCH wallet client.
   * @param session   - Approved session returned by the connection flow.
   * @param walletType - Which wallet app approved the session.
   */
  async connect(
    client: BchWalletClientLike,
    session: BchWalletSession,
    walletType: WalletType
  ): Promise<WalletSession> {
    this.setState(WalletConnectionState.Connecting);

    try {
      const options: WalletClientOptions = {
        client,
        session,
        walletType,
        network: this.network,
      };

      const walletClient = new WalletClient(options);
      const address = await walletClient.getAddress();

      this.walletClient = walletClient;
      this.currentSession = {
        id: session.id,
        address,
        walletType,
        createdAt: Date.now(),
        expiry: session.expiry,
      };

      this.setState(WalletConnectionState.Connected);
      this.emit("connect", this.currentSession);

      return this.currentSession;
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err : new Error(String(err));
      this.setState(WalletConnectionState.Error);
      this.emit("error", error);
      throw new MintCoreError(`WalletManager: connect failed — ${error.message}`);
    }
  }

  /**
   * Disconnects the current session.
   *
   * Transitions the manager back to {@link WalletConnectionState.Disconnected}
   * and notifies all `"disconnect"` listeners.  Safe to call when already
   * disconnected (no-op).
   */
  async disconnect(): Promise<void> {
    if (this.walletClient === null) {
      return;
    }

    try {
      await this.walletClient.disconnect();
    } catch {
      // Treat the session as terminated regardless.
    } finally {
      this.walletClient = null;
      this.currentSession = null;
      this.setState(WalletConnectionState.Disconnected);
      this.emit("disconnect", undefined as void);
    }
  }

  /**
   * Attempts to reconnect using a new session obtained from the connection
   * flow.  Behaves identically to {@link connect} but transitions
   * through the {@link WalletConnectionState.Reconnecting} state first.
   */
  async reconnect(
    client: BchWalletClientLike,
    session: BchWalletSession,
    walletType: WalletType
  ): Promise<WalletSession> {
    this.setState(WalletConnectionState.Reconnecting);

    // Clean up any stale client without emitting a disconnect event.
    if (this.walletClient !== null) {
      try {
        await this.walletClient.disconnect();
      } catch {
        // Ignore errors from the stale session.
      }
      this.walletClient = null;
      this.currentSession = null;
    }

    // Delegate to connect — it will handle state transitions from Reconnecting.
    return this.connect(client, session, walletType);
  }

  // ─── Wallet operations ─────────────────────────────────────────────────────

  /**
   * Returns the CashAddr of the connected wallet.
   * @throws {MintCoreError} When not connected.
   */
  async getAddress(): Promise<string> {
    return this.requireClient().getAddress();
  }

  /**
   * Returns the wallet application type.
   * @throws {MintCoreError} When not connected.
   */
  getWalletType(): WalletType {
    return this.requireClient().getWalletType();
  }

  /**
   * Returns the current {@link WalletSession}, or `null` if disconnected.
   */
  getSession(): WalletSession | null {
    return this.currentSession;
  }

  /**
   * Returns the current connection state.
   */
  getConnectionState(): WalletConnectionState {
    return this.state;
  }

  /**
   * Signs a BCH transaction via the connected wallet.
   * @throws {MintCoreError} When not connected.
   */
  async signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{
      satoshis: bigint;
      lockingBytecode: Uint8Array;
    }>
  ): Promise<string> {
    return this.requireClient().signTransaction(txHex, sourceOutputs);
  }

  // ─── Event system ──────────────────────────────────────────────────────────

  /**
   * Registers a listener for a wallet lifecycle event.
   *
   * @param event - Event name to listen for.
   * @param listener - Callback invoked when the event fires.
   */
  on<K extends WalletEventName>(
    event: K,
    listener: EventListener<K>
  ): this {
    (this.listeners[event] as Array<EventListener<K>>).push(listener);
    return this;
  }

  /**
   * Removes a previously registered listener.
   *
   * @param event - Event name the listener was registered under.
   * @param listener - The exact listener function to remove.
   */
  off<K extends WalletEventName>(
    event: K,
    listener: EventListener<K>
  ): this {
    const arr = this.listeners[event] as Array<EventListener<K>>;
    const idx = arr.indexOf(listener);
    if (idx !== -1) {
      arr.splice(idx, 1);
    }
    return this;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  private setState(next: WalletConnectionState): void {
    if (this.state !== next) {
      this.state = next;
      this.emit("stateChange", next);
    }
  }

  private emit<K extends WalletEventName>(
    event: K,
    payload: WalletEventPayload[K]
  ): void {
    const listeners = this.listeners[event] as Array<EventListener<K>>;
    for (const listener of listeners) {
      try {
        listener(payload);
      } catch {
        // Listeners must not crash the engine.
      }
    }
  }

  private requireClient(): WalletClient {
    if (this.walletClient === null) {
      throw new MintCoreError(
        "WalletManager: no active wallet connection"
      );
    }
    return this.walletClient;
  }
}
