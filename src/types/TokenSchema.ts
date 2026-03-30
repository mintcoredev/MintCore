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
  metadata?: Record<string, unknown>;
  nft?: NftOptions;
  /**
   * BCMR (Bitcoin Cash Metadata Registry) URI or IPFS CID to attach as an
   * OP_RETURN output in the genesis transaction.
   * e.g. "ipfs://bafybei..." or "https://example.com/token.json"
   */
  bcmrUri?: string;
  /**
   * SHA-256 content hash of the BCMR document hosted at {@link bcmrUri},
   * encoded as a 64-character lowercase hex string.
   *
   * When provided together with `bcmrUri` the hash is embedded in the
   * OP_RETURN output (`OP_RETURN BCMR <hash> <uri>`) creating a hash-pinned
   * authchain registration.  Compute this value with {@link hashBcmr}.
   */
  bcmrHash?: string;
}