import type { Utxo } from "../types/TransactionTypes";
import { MintCoreError } from "../utils/errors";

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
  constructor(
    private readonly baseUrl: string,
    /**
     * Reserved for future use (e.g. network-specific URL routing or validation).
     * Kept for API consistency with `ChronikProvider`.
     */
    private readonly network: "mainnet" | "testnet" | "regtest"
  ) {}

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

      // Support both a bare array and a `{ result: [...] }` wrapper.
      const items: ElectrumXUtxo[] = Array.isArray(data)
        ? data
        : (data.result ?? []);

      return items.map((item) => ({
        txid: item.tx_hash,
        vout: item.tx_pos,
        satoshis: item.value,
        scriptPubKey: "",
      }));
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
      const url = `${this.baseUrl.replace(/\/+$/, "")}/tx/broadcast`;
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

      const data = await res.json();
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
    return `${this.baseUrl.replace(/\/+$/, "")}/address/${address}/unspent`;
  }
}
