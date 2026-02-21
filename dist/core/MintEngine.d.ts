import { MintConfig } from "../types/MintConfig";
import { TokenSchema } from "../types/TokenSchema";
import { MintResult } from "./MintResult";
export declare class MintEngine {
    private adapter;
    constructor(config: MintConfig);
    mint(schema: TokenSchema): Promise<MintResult>;
}
//# sourceMappingURL=MintEngine.d.ts.map