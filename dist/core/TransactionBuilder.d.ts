import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { BuiltTransaction } from "../types/TransactionTypes";
export declare class TransactionBuilder {
    private config;
    constructor(config: MintConfig);
    build(schema: TokenSchema): Promise<BuiltTransaction>;
    private fetchUtxos;
}
//# sourceMappingURL=TransactionBuilder.d.ts.map