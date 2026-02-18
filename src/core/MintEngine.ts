import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { MintResult } from "./MintResult";
import { LibauthAdapter } from "../adapters/LibauthAdapter";
import { validateSchema } from "../utils/validate";

export class MintEngine {
  private adapter: LibauthAdapter;

  constructor(private config: MintConfig) {
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
