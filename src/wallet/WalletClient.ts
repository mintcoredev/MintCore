import { MintCoreError } from "../utils/errors.js";
import { toHex } from "../utils/hex.js";
import {
  BchNetwork,
  WalletSession,
  WalletType,
} from "./WalletTypes.js";

// ─── Duck-typed interfaces ─────────────────────────────────────────────────────

/**
 * Minimal duck-typed interface for a Wizard Connect client.
 *
 * Keeping this interface narrow avoids a hard dependency on any specific
 * Wizard Connect package while remaining fully compatible with any
 * conforming implementation.
 *
 * Wizard Connect is a BCH-native wallet connection protocol — there are no
 * multi-chain abstractions, CAIP-2 chain IDs, or JSON-RPC session topics.
 */
export interface WizardConnectClientLike {
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

  /** Closes the wallet connection. */
  disconnect(): Promise<void>;
}

/**
 * A Wizard Connect session descriptor returned by the connection flow.
 */
export interface WizardConnectSession {
  /** Unique session identifier assigned by the wallet. */
  id: string;
  /** Optional expiry timestamp (ms). */
  expiry?: number;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface WalletClientOptions {
  /**
   * An initialised Wizard Connect client.  The client must already have an
   * active session before `WalletClient` can be used.
   */
  client: WizardConnectClientLike;

  /**
   * The Wizard Connect session to wrap.  Obtain it via the connection flow
   * managed outside this engine layer.
   */
  session: WizardConnectSession;

  /**
   * Which wallet application approved this session.
   * Used to populate {@link WalletSession.walletType}.
   */
  walletType: WalletType;

  /**
   * BCH network for this connection.  Used for informational purposes only —
   * Wizard Connect is BCH-native and does not require a CAIP-2 chain ID.
   * Defaults to `"mainnet"`.
   */
  network?: BchNetwork;
}

// ─── WalletClient ─────────────────────────────────────────────────────────────

/**
 * Low-level Wizard Connect adapter for BCH.
 *
 * Wraps a {@link WizardConnectClientLike} and provides a clean, typed API for
 * address resolution and transaction signing without any UI or browser-specific
 * logic.
 *
 * ### Operations
 * | Method                | Description                              |
 * |-----------------------|------------------------------------------|
 * | `getAddress()`        | Resolves the connected CashAddress       |
 * | `signTransaction()`   | Signs a BCH transaction via the wallet   |
 * | `disconnect()`        | Terminates the wallet connection         |
 */
export class WalletClient {
  private readonly client: WizardConnectClientLike;
  private readonly session: WizardConnectSession;
  private readonly walletType: WalletType;
  private readonly network: BchNetwork;
  private cachedAddress: string | undefined;
  private disconnected = false;

  constructor(options: WalletClientOptions) {
    if (!options.client) {
      throw new MintCoreError("WalletClient: client is required");
    }
    if (!options.session || !options.session.id || options.session.id.trim() === "") {
      throw new MintCoreError("WalletClient: a valid session with a non-empty id is required");
    }

    this.client = options.client;
    this.session = options.session;
    this.walletType = options.walletType;
    this.network = options.network ?? "mainnet";
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Resolves the CashAddr (P2PKH, with network prefix) from the connected
   * wallet.  The result is cached after the first successful call.
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
      throw new MintCoreError(`WalletClient getAccounts failed: ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError(
        "WalletClient: getAccounts returned no accounts"
      );
    }

    const raw: unknown = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError(
        "WalletClient: getAccounts returned an invalid account entry"
      );
    }

    this.cachedAddress = raw;
    return raw;
  }

  /**
   * Returns the wallet application type that approved this session.
   */
  getWalletType(): WalletType {
    return this.walletType;
  }

  /**
   * Returns a snapshot of the current session details, or `null` when the
   * client has been disconnected.
   */
  async getSession(): Promise<WalletSession | null> {
    if (this.disconnected) {
      return null;
    }

    let address: string;
    try {
      address = await this.getAddress();
    } catch {
      address = "";
    }

    return {
      id: this.session.id,
      address,
      walletType: this.walletType,
      createdAt: Date.now(),
      expiry: this.session.expiry,
    };
  }

  /**
   * Signs a BCH transaction via the connected wallet.
   *
   * @param txHex - Unsigned transaction as a lowercase hex string.
   * @param sourceOutputs - UTXOs being spent, in input order.
   * @returns The fully-signed transaction as a lowercase hex string.
   */
  async signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{
      satoshis: bigint;
      lockingBytecode: Uint8Array;
    }>
  ): Promise<string> {
    this.assertConnected();

    const serialisedOutputs = sourceOutputs.map((o) => ({
      satoshis: o.satoshis.toString(),
      lockingBytecode: toHex(o.lockingBytecode),
    }));

    let result: unknown;
    try {
      result = await this.client.signTransaction(txHex, serialisedOutputs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletClient signTransaction failed: ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WalletClient: signTransaction returned an invalid response"
      );
    }

    return result;
  }

  /**
   * Terminates the Wizard Connect session.
   *
   * After calling `disconnect()` all subsequent method calls will throw a
   * {@link MintCoreError}.
   */
  async disconnect(): Promise<void> {
    if (this.disconnected) {
      return;
    }

    try {
      await this.client.disconnect();
    } catch {
      // Swallow errors from the underlying transport — the session is
      // considered terminated regardless.
    } finally {
      this.disconnected = true;
      this.cachedAddress = undefined;
    }
  }

  // ─── Internal helpers ────────────────────────────────────────────────────────

  private assertConnected(): void {
    if (this.disconnected) {
      throw new MintCoreError(
        "WalletClient: cannot perform operation on a disconnected client"
      );
    }
  }
}
