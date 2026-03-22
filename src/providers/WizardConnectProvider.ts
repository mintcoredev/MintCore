import type { WalletProvider } from "../types/WalletProvider.js";
import { MintCoreError } from "../utils/errors.js";
import { toHex } from "../utils/hex.js";
import type { WizardConnectClientLike } from "../wallet/WalletClient.js";

export type { WizardConnectClientLike };

/**
 * Options for {@link WizardConnectProvider}.
 */
export interface WizardConnectProviderOptions {
  /**
   * An initialised Wizard Connect client (or any compatible object that
   * exposes `getAccounts` and `signTransaction` methods with matching
   * signatures).
   */
  client: WizardConnectClientLike;

  /**
   * CashAddr address (P2PKH, with network prefix) managed by the connected
   * wallet.  When provided, {@link WizardConnectProvider.getAddress} returns
   * this value immediately without making a `getAccounts` call.
   */
  address?: string;
}

/**
 * Wizard Connect adapter for MintCore.
 *
 * Implements the {@link WalletProvider} interface so any Wizard Connect–
 * enabled BCH wallet (e.g. Paytaca, Cashonize, Zapit) can be used for
 * address derivation and transaction signing without exposing a raw
 * private key.
 *
 * Wizard Connect is BCH-native: there are no multi-chain identifiers,
 * WalletConnect session topics, EVM chain IDs, or JSON-RPC boilerplate.
 *
 * ### Quick start
 * ```ts
 * import { WizardConnectProvider, TransactionBuilder } from "mintcore";
 *
 * // client must be an initialised Wizard Connect client with an active session
 * const walletProvider = new WizardConnectProvider({ client });
 *
 * const builder = new TransactionBuilder({
 *   network: "mainnet",
 *   walletProvider,
 *   utxoProviderUrl: "https://chronik.be.cash/xec",
 * });
 * const result = await builder.build({ name: "My Token", symbol: "MTK", decimals: 2 });
 * ```
 *
 * ### Wizard Connect methods used
 * | Method              | When called               |
 * |---------------------|---------------------------|
 * | `getAccounts()`     | {@link getAddress}        |
 * | `signTransaction()` | {@link signTransaction}   |
 *
 * Wallets must implement these methods for the connection to work.
 */
export class WizardConnectProvider implements WalletProvider {
  private readonly client: WizardConnectClientLike;
  private cachedAddress: string | undefined;

  constructor(options: WizardConnectProviderOptions) {
    if (!options.client) {
      throw new MintCoreError("WizardConnectProvider: client is required");
    }

    this.client = options.client;
    this.cachedAddress = options.address;
  }

  /**
   * Returns the CashAddress (P2PKH) managed by the connected wallet.
   *
   * On the first call (when no `address` was supplied in the constructor
   * options) the provider fetches accounts from the wallet via
   * `getAccounts()` and caches the result for subsequent calls.
   */
  async getAddress(): Promise<string> {
    if (this.cachedAddress !== undefined) {
      return this.cachedAddress;
    }

    let accounts: string[];
    try {
      accounts = await this.client.getAccounts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardConnect getAccounts failed: ${msg}`);
    }

    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new MintCoreError(
        "WizardConnect: getAccounts returned no accounts"
      );
    }

    const raw: unknown = accounts[0];
    if (typeof raw !== "string" || raw.trim() === "") {
      throw new MintCoreError(
        "WizardConnect: getAccounts returned an invalid account entry"
      );
    }

    this.cachedAddress = raw;
    return raw;
  }

  /**
   * Signs an unsigned BCH transaction via the connected wallet.
   *
   * Serialises `sourceOutputs` to JSON-safe values (satoshis → string,
   * lockingBytecode → lowercase hex) before forwarding them to the
   * Wizard Connect client, and returns the signed transaction hex.
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
      lockingBytecode: toHex(o.lockingBytecode),
    }));

    let result: unknown;
    try {
      result = await this.client.signTransaction(txHex, serialisedOutputs);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new MintCoreError(`WizardConnect signTransaction failed: ${msg}`);
    }

    if (typeof result !== "string" || result.trim() === "") {
      throw new MintCoreError(
        "WizardConnect: signTransaction returned an invalid response"
      );
    }

    return result;
  }
}
