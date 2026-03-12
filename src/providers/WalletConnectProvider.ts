import type { WalletProvider } from "../types/WalletProvider.js";
import { MintCoreError } from "../utils/errors.js";

/**
 * Minimal duck-typed interface for a WalletConnect v2 `SignClient`.
 *
 * Only the `request` method is required; this keeps the provider free of a
 * hard dependency on `@walletconnect/sign-client` while remaining fully
 * compatible with it.
 */
export interface WalletConnectClientLike {
  request<T>(args: {
    topic: string;
    chainId: string;
    request: { method: string; params: unknown };
  }): Promise<T>;
}

/**
 * Options for {@link WalletConnectProvider}.
 */
export interface WalletConnectProviderOptions {
  /**
   * A WalletConnect v2 `SignClient` instance (or any compatible object that
   * exposes a `request` method with the same signature).
   *
   * Obtain one via `@walletconnect/sign-client`:
   * ```ts
   * import SignClient from "@walletconnect/sign-client";
   * const client = await SignClient.init({ projectId: "..." });
   * ```
   */
  client: WalletConnectClientLike;

  /**
   * The active WalletConnect session topic returned by the pairing / approval
   * flow, e.g. `client.session.getAll()[0].topic`.
   */
  topic: string;

  /**
   * BCH network. Used to derive the default `chainId` when none is supplied.
   * Defaults to `"mainnet"`.
   */
  network?: "mainnet" | "testnet" | "regtest";

  /**
   * Override the CAIP-2 chain identifier sent with every RPC request.
   *
   * Defaults:
   * - `"mainnet"` → `"bch:mainnet"`
   * - `"testnet"` → `"bch:testnet"`
   * - `"regtest"` → `"bch:regtest"`
   *
   * Override this when your target wallet uses a non-standard chain identifier
   * (e.g. `"bch:bitcoincash"`).
   */
  chainId?: string;

  /**
   * CashAddr address (P2PKH, with network prefix) managed by the connected
   * wallet. When provided, {@link WalletConnectProvider.getAddress} returns
   * this value immediately without making a `bch_getAccounts` RPC call.
   */
  address?: string;
}

/**
 * WalletConnect v2 adapter for MintCore.
 *
 * Implements the {@link WalletProvider} interface so any WalletConnect-enabled
 * BCH wallet (e.g. Bitcoin.com Wallet) can be used for address derivation and
 * transaction signing without exposing a raw private key.
 *
 * ### Quick start
 * ```ts
 * import SignClient from "@walletconnect/sign-client";
 * import { WalletConnectProvider, TransactionBuilder } from "mintcore";
 *
 * const client = await SignClient.init({ projectId: "YOUR_PROJECT_ID" });
 * // … perform pairing / session approval (see WalletConnect docs) …
 * const session = client.session.getAll()[0];
 *
 * const walletProvider = new WalletConnectProvider({
 *   client,
 *   topic: session.topic,
 *   network: "mainnet",
 * });
 *
 * const builder = new TransactionBuilder({
 *   network: "mainnet",
 *   walletProvider,
 *   utxoProviderUrl: "https://chronik.be.cash/xec",
 * });
 * const result = await builder.build({ name: "My Token", symbol: "MTK", decimals: 2 });
 * ```
 *
 * ### WalletConnect RPC methods used
 * | Method                | When called               |
 * |-----------------------|---------------------------|
 * | `bch_getAccounts`     | {@link getAddress}        |
 * | `bch_signTransaction` | {@link signTransaction}   |
 *
 * Wallets must advertise these methods in their session namespace for the
 * connection to succeed.
 */
export class WalletConnectProvider implements WalletProvider {
  private readonly client: WalletConnectClientLike;
  private readonly topic: string;
  private readonly chainId: string;
  private cachedAddress: string | undefined;

  constructor(options: WalletConnectProviderOptions) {
    if (!options.client) {
      throw new MintCoreError("WalletConnectProvider: client is required");
    }
    if (!options.topic || options.topic.trim() === "") {
      throw new MintCoreError("WalletConnectProvider: topic is required");
    }

    this.client = options.client;
    this.topic = options.topic;
    this.chainId =
      options.chainId ??
      WalletConnectProvider.networkToChainId(options.network ?? "mainnet");
    this.cachedAddress = options.address;
  }

  /**
   * Returns the CashAddress (P2PKH) managed by the connected wallet.
   *
   * On the first call (when no `address` was supplied in the constructor
   * options) the provider sends a `bch_getAccounts` request to the wallet and
   * caches the result for subsequent calls.
   */
  async getAddress(): Promise<string> {
    if (this.cachedAddress !== undefined) {
      return this.cachedAddress;
    }

    let accounts: unknown;
    try {
      accounts = await this.client.request<unknown>({
        topic: this.topic,
        chainId: this.chainId,
        request: { method: "bch_getAccounts", params: {} },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletConnect bch_getAccounts failed: ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError(
        "WalletConnect: bch_getAccounts returned no accounts"
      );
    }

    const raw: unknown = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError(
        "WalletConnect: bch_getAccounts returned an invalid account entry"
      );
    }

    // Accounts may arrive in CAIP-10 format:
    //   "<namespace>:<chain_ref>:<cashaddr_prefix>:<payload>"
    //   e.g. "bch:mainnet:bitcoincash:qp63uah..."
    // A standard BCH CashAddr has exactly 2 colon-separated segments
    // ("bitcoincash:qp63uah..."), so a CAIP-10 account string will have at
    // least 4 segments.  Strip the leading namespace:chain_ref prefix when
    // that is the case.
    const parts = raw.split(":");
    const address = parts.length >= 4
      ? parts.slice(2).join(":")
      : raw;

    this.cachedAddress = address;
    return address;
  }

  /**
   * Signs an unsigned BCH transaction via the connected wallet.
   *
   * Serialises `sourceOutputs` to JSON-safe values (satoshis → string,
   * lockingBytecode → lowercase hex) before sending them over the
   * WalletConnect RPC channel, and returns the signed transaction hex.
   */
  async signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{
      satoshis: bigint;
      lockingBytecode: Uint8Array;
    }>
  ): Promise<string> {
    const serialisedOutputs = sourceOutputs.map((o) => ({
      satoshis: o.satoshis.toString(),
      lockingBytecode: Buffer.from(o.lockingBytecode).toString("hex"),
    }));

    let result: unknown;
    try {
      result = await this.client.request<unknown>({
        topic: this.topic,
        chainId: this.chainId,
        request: {
          method: "bch_signTransaction",
          params: { transaction: txHex, sourceOutputs: serialisedOutputs },
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WalletConnect bch_signTransaction failed: ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WalletConnect: bch_signTransaction returned an invalid response"
      );
    }

    return result;
  }

  /**
   * Maps a MintCore network name to a default CAIP-2 chain identifier.
   *
   * @param network - `"mainnet"`, `"testnet"`, or `"regtest"`
   * @returns CAIP-2 chain ID string, e.g. `"bch:mainnet"`
   */
  static networkToChainId(
    network: "mainnet" | "testnet" | "regtest"
  ): string {
    switch (network) {
      case "mainnet":
        return "bch:mainnet";
      case "testnet":
        return "bch:testnet";
      case "regtest":
        return "bch:regtest";
    }
  }
}
