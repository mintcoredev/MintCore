import type { Utxo } from "../types/TransactionTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { validateUtxo } from "../utils/validate.js";

export class ChronikProvider {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly network: "mainnet" | "testnet" | "regtest"
  ) {
    this.baseUrl = ChronikProvider.validateBaseUrl(baseUrl);
  }

  /**
   * Fetch UTXOs for a given address from Chronik.
   * NOTE: You may need to adjust the URL shape to match your Chronik instance.
   */
  async fetchUtxos(address: string): Promise<Utxo[]> {
    try {
      const url = this.buildUtxoUrl(address);
      const res = await fetch(url);

      if (!res.ok) {
        throw new MintCoreError(`Chronik UTXO request failed with status ${res.status}`);
      }

      const data = await res.json();
      return ChronikProvider.parseUtxoResponse(data);
    } catch (err: any) {
      // Re-throw MintCoreError directly; wrap any other error so callers always receive MintCoreError.
      if (err instanceof MintCoreError) throw err;
      throw new MintCoreError(`Chronik UTXO fetch failed: ${err?.message ?? String(err)}`);
    }
  }

  /**
   * Broadcast a signed raw transaction to the network via Chronik.
   *
   * @param txHex - Fully-signed transaction hex string.
   * @returns The broadcast transaction ID.
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/broadcast-txs`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTxs: [txHex] }),
      });

      if (!res.ok) {
        throw new MintCoreError(`Chronik broadcast failed with status ${res.status}`);
      }

      const data = await res.json() as any;
      // Chronik returns { txids: ["<txid>"] }
      return data.txids?.[0] ?? data.txid ?? "";
    } catch (err: any) {
      if (err instanceof MintCoreError) throw err;
      throw new MintCoreError(`Chronik broadcast failed: ${err?.message ?? String(err)}`);
    }
  }

  private static validateBaseUrl(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new MintCoreError("Invalid Chronik provider URL");
    }

    // Allow http://localhost for regtest/dev, require https elsewhere
    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isLocal) {
      throw new MintCoreError(
        "Chronik provider URL must use HTTPS (or localhost for development)"
      );
    }

    return parsed.toString().replace(/\/+$/, "");
  }

  private static parseUtxoResponse(data: unknown): Utxo[] {
    if (!data || typeof data !== "object") {
      throw new MintCoreError("Chronik returned an invalid response");
    }

    const anyData = data as { utxos?: unknown; error?: unknown };

    if (typeof anyData.error === "string" && anyData.error.length > 0) {
      throw new MintCoreError(`Chronik error: ${anyData.error}`);
    }

    if (!Array.isArray(anyData.utxos)) {
      throw new MintCoreError("Chronik returned malformed UTXO list");
    }

    const raw = anyData.utxos;
    const utxos = raw.filter(validateUtxo);

    if (raw.length > 0 && utxos.length === 0) {
      throw new MintCoreError("Chronik returned UTXOs with an unrecognised schema");
    }

    return utxos;
  }

  private buildUtxoUrl(address: string): string {
    // Example shape – update to match your Chronik deployment if needed.
    // Common pattern: `${baseUrl}/address/${address}/utxos`
    return `${this.baseUrl}/address/${address}/utxos`;
  }
}
