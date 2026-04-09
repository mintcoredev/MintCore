import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { TransactionBuilder } from "../core/TransactionBuilder.js";

/**
 * Convenience adapter around {@link TransactionBuilder}.
 *
 * Provides a named `buildMintTransaction` method that delegates to
 * {@link TransactionBuilder.build} and returns only `hex` and `txid`.
 * Use {@link TransactionBuilder} directly when you need the full
 * {@link BuiltTransaction} (including fee information).
 */
export class LibauthAdapter {
  private builder: TransactionBuilder;

  constructor(private config: MintConfig) {
    this.builder = new TransactionBuilder(config);
  }

  /**
   * Build and sign a CashTokens genesis transaction.
   *
   * @param schema - Token schema describing the token to mint.
   * @returns An object containing the signed transaction `hex` and its `txid`.
   */
  async buildMintTransaction(schema: TokenSchema): Promise<{ hex: string; txid: string }> {
    const tx = await this.builder.build(schema);

    return {
      hex: tx.hex,
      txid: tx.txid
    };
  }
}
