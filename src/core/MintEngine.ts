import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { MintResult } from "./MintResult.js";
import { TransactionBuilder } from "./TransactionBuilder.js";
import { validateSchema } from "../utils/validate.js";

export class MintEngine {
  private builder: TransactionBuilder;

  constructor(config: MintConfig) {
    this.builder = new TransactionBuilder(config);
  }

  async mint(schema: TokenSchema): Promise<MintResult> {
    validateSchema(schema);

    const tx = await this.builder.build(schema);

    return {
      hex: tx.hex,
      txid: tx.txid,
      metadata: schema.metadata ?? null
    };
  }
}
