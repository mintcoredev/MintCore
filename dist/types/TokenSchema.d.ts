export type TokenCapability = "none" | "mutable" | "minting";
export interface NftOptions {
    capability: TokenCapability;
    commitment: string;
}
export interface TokenSchema {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: bigint;
    metadata?: Record<string, any>;
    nft?: NftOptions;
}
//# sourceMappingURL=TokenSchema.d.ts.map