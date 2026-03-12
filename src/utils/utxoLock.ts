import type { Utxo } from "../types/TransactionTypes.js";

/**
 * In-memory UTXO lock registry.
 *
 * Prevents the same UTXO from being selected twice across multiple planned
 * transactions during batch minting, ensuring sequential execution is safe
 * from double-spend within a single `BatchMintEngine` instance.
 *
 * All operations are synchronous and O(1) via a `Set<string>`.
 */
export class UtxoLock {
  private readonly locked = new Set<string>();

  private static key(txid: string, vout: number): string {
    return `${txid}:${vout}`;
  }

  /** Reserve a UTXO so it cannot be selected again. */
  lock(utxo: Pick<Utxo, "txid" | "vout">): void {
    this.locked.add(UtxoLock.key(utxo.txid, utxo.vout));
  }

  /** Release a previously reserved UTXO. */
  unlock(utxo: Pick<Utxo, "txid" | "vout">): void {
    this.locked.delete(UtxoLock.key(utxo.txid, utxo.vout));
  }

  /** Return `true` when the UTXO is currently reserved. */
  isLocked(utxo: Pick<Utxo, "txid" | "vout">): boolean {
    return this.locked.has(UtxoLock.key(utxo.txid, utxo.vout));
  }

  /** Reserve all UTXOs in the provided array. */
  lockAll(utxos: ReadonlyArray<Pick<Utxo, "txid" | "vout">>): void {
    for (const u of utxos) this.lock(u);
  }

  /** Release all UTXOs in the provided array. */
  unlockAll(utxos: ReadonlyArray<Pick<Utxo, "txid" | "vout">>): void {
    for (const u of utxos) this.unlock(u);
  }

  /**
   * Return only the UTXOs from `utxos` that are not currently locked.
   * The original array is not modified.
   */
  filterUnlocked<T extends Pick<Utxo, "txid" | "vout">>(utxos: T[]): T[] {
    return utxos.filter((u) => !this.isLocked(u));
  }

  /** Release all locks held by this instance. */
  clear(): void {
    this.locked.clear();
  }

  /** Number of UTXOs currently reserved. */
  get size(): number {
    return this.locked.size;
  }
}
