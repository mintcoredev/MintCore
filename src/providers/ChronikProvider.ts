import type { Utxo } from "../types/TransactionTypes";
import { MintCoreError } from "../utils/errors";

export class ChronikProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly network: "mainnet" | "testnet" | "regtest"
  ) {}

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

      // Adjust mapping if your Chronik instance uses a different shape
      return (data.utxos ?? data) as Utxo[];
    } catch (err: any) {
      throw new MintCoreError(`Chronik UTXO fetch failed: ${err?.message ?? String(err)}`);
    }
  }

  private buildUtxoUrl(address: string): string {
    // Example shape – update to match your Chronik deployment if needed.
    // Common pattern: `${baseUrl}/address/${address}/utxos`
    return `${this.baseUrl.replace(/\/+$/, "")}/address/${address}/utxos`;
  }
}
