export type TokenCapability = "none" | "mutable" | "minting";

export interface NftOptions {
  capability: TokenCapability;
  commitment: string; // hex or UTF-8 encoded string
}

export interface TokenSchema {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: bigint;
  metadata?: Record<string, any>;
  nft?: NftOptions;
  /**
   * BCMR (Bitcoin Cash Metadata Registry) URI or IPFS CID to attach as an
   * OP_RETURN output in the genesis transaction.
   * e.g. "ipfs://bafybei..." or "https://example.com/token.json"
   */
  bcmrUri?: string;
}