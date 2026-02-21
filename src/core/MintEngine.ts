import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { MintResult } from "./MintResult.js";
import { LibauthAdapter } from "../adapters/LibauthAdapter.js";
import { validateSchema } from "../utils/validate.js";

export class MintEngine {
  private adapter: LibauthAdapter;

  constructor(config: MintConfig) {
    this.adapter = new LibauthAdapter(config);
  }

  async mint(schema: TokenSchema): Promise<MintResult> {
    validateSchema(schema);

    const tx = await this.adapter.buildMintTransaction(schema);

    return {
      hex: tx.hex,
      txid: tx.txid,
      metadata: schema.metadata ?? null
    };
  }
}
