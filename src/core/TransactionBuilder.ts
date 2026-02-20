import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { Utxo, BuiltTransaction } from "../types/TransactionTypes";

export class TransactionBuilder {
  constructor(private config: MintConfig) {}

  async build(schema: TokenSchema): Promise<BuiltTransaction> {
    // 1. Fetch UTXOs for the minter
    const utxos = await this.fetchUtxos(this.config.privateKey);

    if (utxos.length === 0) {
      throw new Error("No UTXOs available for minting");
    }

    // 2. Select UTXO
    const utxo = utxos[0];

    // 3. Build transaction (placeholder for now)
    const hex = "00";
    const txid = "placeholder-txid";

    return { hex, txid };
  }

  private async fetchUtxos(_privateKey: string): Promise<Utxo[]> {
    // TODO: integrate with a BCH indexer or ElectrumX
    return [];
  }
}
