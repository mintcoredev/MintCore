import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
export declare class LibauthAdapter {
    private config;
    private builder;
    constructor(config: MintConfig);
    buildMintTransaction(schema: TokenSchema): Promise<{
        hex: string;
        txid: string;
    }>;
}
//# sourceMappingURL=LibauthAdapter.d.ts.map