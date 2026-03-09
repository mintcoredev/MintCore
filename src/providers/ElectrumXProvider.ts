import type { Utxo } from "../types/TransactionTypes.js";
import { MintCoreError } from "../utils/errors.js";
import { validateUtxo } from "../utils/validate.js";

/**
 * ElectrumX / Fulcrum HTTP REST UTXO provider.
 *
 * Compatible with any server that exposes an HTTP endpoint returning an array
 * of unspent outputs for a given BCH address, e.g.:
 *   GET ${baseUrl}/address/${address}/unspent
 *
 * Expected response shape (each element):
 *   { tx_hash: string; tx_pos: number; value: number; height?: number }
 *
 * A `result` wrapper is also accepted:
 *   { result: [ ... ] }
 */
interface ElectrumXUtxo {
  tx_hash: string;
  tx_pos: number;
  value: number;
  height?: number;
}

export class ElectrumXProvider {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    /**
     * Reserved for future use (e.g. network-specific URL routing or validation).
     * Kept for API consistency with `ChronikProvider`.
     */
    private readonly network: "mainnet" | "testnet" | "regtest"
  ) {
    this.baseUrl = ElectrumXProvider.validateBaseUrl(baseUrl);
  }

  private static validateBaseUrl(url: string): string {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new MintCoreError("Invalid ElectrumX provider URL");
    }

    const isLocal =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

    if (parsed.protocol !== "https:" && !isLocal) {
      throw new MintCoreError(
        "ElectrumX provider URL must use HTTPS (or localhost for development)"
      );
    }

    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
  }

  private static parseUtxoEnvelope(data: unknown): ElectrumXUtxo[] {
    if (!data || typeof data !== "object") {
      throw new MintCoreError("ElectrumX returned an invalid response");
    }

    const anyData = data as { result?: unknown; error?: unknown };

    if (typeof anyData.error === "string" && anyData.error.length > 0) {
      throw new MintCoreError(`ElectrumX error: ${anyData.error}`);
    }

    // `anyData` and `data` alias the same reference; this allows the same
    // expression to handle both a bare array and a `{ result: [...] }` wrapper.
    const items = Array.isArray(anyData.result)
      ? anyData.result
      : Array.isArray(data)
      ? (data as ElectrumXUtxo[])
      : null;

    if (!items) {
      throw new MintCoreError("ElectrumX returned a malformed UTXO list");
    }

    return items;
  }

  /**
   * Fetch UTXOs for a given address from an ElectrumX-compatible REST endpoint.
   */
  async fetchUtxos(address: string): Promise<Utxo[]> {
    try {
      const url = this.buildUtxoUrl(address);
      const res = await fetch(url);

      if (!res.ok) {
        throw new MintCoreError(
          `ElectrumX UTXO request failed with status ${res.status}`
        );
      }

      const data = await res.json();
      const items = ElectrumXProvider.parseUtxoEnvelope(data);

      const mapped: Utxo[] = items.map((item) => ({
        txid: item.tx_hash,
        vout: item.tx_pos,
        satoshis: item.value,
        scriptPubKey: "",
      }));

      const invalid = mapped.filter((u) => !validateUtxo(u));
      if (invalid.length > 0) {
        throw new MintCoreError(
          `ElectrumX returned ${invalid.length} UTXO(s) with an invalid schema`
        );
      }

      return mapped;
    } catch (err: any) {
      if (err instanceof MintCoreError) {
        throw err;
      }
      throw new MintCoreError(
        `ElectrumX UTXO fetch failed: ${err?.message ?? String(err)}`
      );
    }
  }

  /**
   * Broadcast a signed raw transaction to the network via an ElectrumX-compatible
   * REST endpoint.
   *
   * Expected endpoint: POST ${baseUrl}/tx/broadcast
   * Accepted body:     { "rawTx": "<hex>" }
   * Accepted response: { "txid": "<txid>" } or a plain txid string
   *
   * @param txHex - Fully-signed transaction hex string.
   * @returns The broadcast transaction ID.
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/tx/broadcast`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawTx: txHex }),
      });

      if (!res.ok) {
        throw new MintCoreError(
          `ElectrumX broadcast failed with status ${res.status}`
        );
      }

      const data = await res.json() as any;
      // Accept { txid: "..." } or { result: "..." } or a plain string
      if (typeof data === "string") return data;
      return data.txid ?? data.result ?? "";
    } catch (err: any) {
      if (err instanceof MintCoreError) throw err;
      throw new MintCoreError(
        `ElectrumX broadcast failed: ${err?.message ?? String(err)}`
      );
    }
  }

  private buildUtxoUrl(address: string): string {
    return `${this.baseUrl}/address/${address}/unspent`;
  }
}
