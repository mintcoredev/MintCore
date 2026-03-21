import { MintCoreError } from "../utils/errors.js";
import { toHex } from "../utils/hex.js";
import {
  BCH_CHAIN_IDS,
  BchNetwork,
  WalletSession,
  WalletType,
} from "./WalletTypes.js";

// ─── Duck-typed interfaces ─────────────────────────────────────────────────────

/**
 * Minimal duck-typed interface for any WalletConnect v2 SignClient (or any
 * compatible implementation such as wc2-bch-bcr).
 *
 * Keeping this interface narrow avoids a hard dependency on any specific
 * WalletConnect package while staying fully compatible with the real clients.
 */
export interface WalletConnectV2Client {
  /** Send a JSON-RPC request over an active session. */
  request<T>(args: {
    topic: string;
    chainId: string;
    request: { method: string; params: unknown };
  }): Promise<T>;

  /** Disconnect / delete an active session. */
  disconnect(args: { topic: string; reason: { code: number; message: string } }): Promise<void>;
}

/**
 * Subset of a WalletConnect v2 `SessionTypes.Struct` that WalletClient needs.
 */
export interface WalletConnectSession {
  topic: string;
  expiry?: number;
  namespaces: Record<
    string,
    { accounts: string[]; methods: string[]; events: string[] }
  >;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface WalletClientOptions {
  /**
   * An initialised WalletConnect v2 SignClient (e.g. from wc2-bch-bcr or
   * `@walletconnect/sign-client`).  The client must already have a valid
   * approved session before `WalletClient` can be used.
   */
  client: WalletConnectV2Client;

  /**
   * The WalletConnect session to wrap.  Obtain it via the pairing / approval
   * flow that is managed outside this engine layer.
   */
  session: WalletConnectSession;

  /**
   * Which wallet application approved this session.
   * Used to populate {@link WalletSession.walletType}.
   */
  walletType: WalletType;

  /**
   * BCH network for this connection.  Determines the CAIP-2 chain identifier
   * used in all RPC calls.  Defaults to `"mainnet"`.
   */
  network?: BchNetwork;

  /**
   * Override the CAIP-2 chain identifier.  When omitted the value is derived
   * from `network` using {@link BCH_CHAIN_IDS}.
   */
  chainId?: string;
}

// ─── WalletClient ─────────────────────────────────────────────────────────────

/**
 * Low-level WalletConnect v2 adapter for BCH.
 *
 * Wraps a wc2-bch-bcr (or any compatible) WalletConnect v2 SignClient and
 * provides a clean, typed API for address resolution, transaction signing, and
 * message signing without any UI or browser-specific logic.
 *
 * ### Supported namespaces
 * | Network  | CAIP-2 chain ID      |
 * |----------|----------------------|
 * | mainnet  | `bch:bitcoincash`    |
 * | testnet  | `bch:bchtest`        |
 * | regtest  | `bch:bchreg`         |
 *
 * ### RPC methods used
 * | Method                | When called              |
 * |-----------------------|--------------------------|
 * | `bch_getAccounts`     | {@link getAddress}       |
 * | `bch_signTransaction` | {@link signTransaction}  |
 * | `personal_sign`       | {@link signMessage}      |
 */
export class WalletClient {
  private readonly client: WalletConnectV2Client;
  private readonly session: WalletConnectSession;
  private readonly walletType: WalletType;
  private readonly chainId: string;
  private cachedAddress: string | undefined;
  private disconnected = false;

  constructor(options: WalletClientOptions) {
    if (!options.client) {
      throw new MintCoreError("WalletClient: client is required");
    }
    if (!options.session || !options.session.topic || options.session.topic.trim() === "") {
      throw new MintCoreError("WalletClient: a valid session with a non-empty topic is required");
    }

    this.client = options.client;
    this.session = options.session;
    this.walletType = options.walletType;
    this.chainId =
      options.chainId ?? BCH_CHAIN_IDS[options.network ?? "mainnet"];
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

    let accounts: unknown;
    try {
      accounts = await this.client.request<unknown>({
        topic: this.session.topic,
        chainId: this.chainId,
        request: { method: "bch_getAccounts", params: {} },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletClient bch_getAccounts failed: ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError(
        "WalletClient: bch_getAccounts returned no accounts"
      );
    }

    const raw: unknown = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError(
        "WalletClient: bch_getAccounts returned an invalid account entry"
      );
    }

    // Accounts may arrive in CAIP-10 format:
    //   "<namespace>:<chain_ref>:<cashaddr_prefix>:<payload>"
    // e.g. "bch:bitcoincash:bitcoincash:qp63uah..."
    // A standard BCH CashAddr has exactly 2 colon-separated segments, so a
    // CAIP-10 account string will have at least 4 segments.
    const parts = raw.split(":");
    const address = parts.length >= 4 ? parts.slice(2).join(":") : raw;

    this.cachedAddress = address;
    return address;
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
      topic: this.session.topic,
      address,
      chainId: this.chainId,
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
      result = await this.client.request<unknown>({
        topic: this.session.topic,
        chainId: this.chainId,
        request: {
          method: "bch_signTransaction",
          params: { transaction: txHex, sourceOutputs: serialisedOutputs },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletClient bch_signTransaction failed: ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WalletClient: bch_signTransaction returned an invalid response"
      );
    }

    return result;
  }

  /**
   * Signs an arbitrary message via the connected wallet.
   *
   * The message is sent via the `personal_sign` JSON-RPC method, which most
   * BCH wallets (Paytaca, Cashonize, Zapit) support alongside the standard
   * transaction-signing methods.
   *
   * @param message - Plain-text message to sign.
   * @returns Signature as returned by the wallet (format depends on the wallet).
   */
  async signMessage(message: string): Promise<string> {
    this.assertConnected();

    if (typeof message !== "string") {
      throw new MintCoreError("WalletClient: message must be a string");
    }

    let result: unknown;
    try {
      result = await this.client.request<unknown>({
        topic: this.session.topic,
        chainId: this.chainId,
        request: {
          method: "personal_sign",
          params: { message },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletClient personal_sign failed: ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WalletClient: personal_sign returned an invalid response"
      );
    }

    return result;
  }

  /**
   * Terminates the WalletConnect session.
   *
   * After calling `disconnect()` all subsequent method calls will throw a
   * {@link MintCoreError}.
   */
  async disconnect(): Promise<void> {
    if (this.disconnected) {
      return;
    }

    try {
      await this.client.disconnect({
        topic: this.session.topic,
        reason: { code: 6000, message: "User disconnected" },
      });
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
