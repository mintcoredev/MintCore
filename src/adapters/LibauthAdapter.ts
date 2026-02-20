import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { TransactionBuilder } from "../core/TransactionBuilder";

export class LibauthAdapter {
  private builder: TransactionBuilder;

  constructor(private config: MintConfig) {
    this.builder = new TransactionBuilder(config);
  }

  async buildMintTransaction(schema: TokenSchema): Promise<{ hex: string; txid: string }> {
    const tx = await this.builder.build(schema);

    return {
      hex: tx.hex,
      txid: tx.txid
    };
  }
}
