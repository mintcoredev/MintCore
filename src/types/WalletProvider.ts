/**
 * Interface for external wallet providers.
 *
 * Implement this interface to integrate hardware wallets, browser extension
 * wallets, or any other signing back-end without exposing a raw private key
 * through `MintConfig`.
 */
export interface WalletProvider {
  /**
   * Returns the CashAddress (P2PKH) managed by this wallet.
   * Must include the network prefix, e.g. `bitcoincash:q...`.
   */
  getAddress(): Promise<string>;

  /**
   * Signs a fully-constructed but unsigned transaction.
   *
   * @param txHex - Unsigned transaction serialised as a lowercase hex string.
   * @param sourceOutputs - The UTXOs being spent, in input order. Each entry
   *   must supply the `satoshis` value and the P2PKH `lockingBytecode` of the
   *   coin being consumed. These are required for the BCH SIGHASH pre-image.
   * @returns The fully-signed transaction as a lowercase hex string.
   */
  signTransaction(
    txHex: string,
    sourceOutputs: ReadonlyArray<{ satoshis: bigint; lockingBytecode: Uint8Array }>
  ): Promise<string>;
}
