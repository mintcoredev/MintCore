// Minting baton helpers.
import type { MintRequest } from "../types/BatchMintTypes.js";

/**
 * Create a {@link MintRequest} that represents a minting baton output
 * (NFT with `capability: "minting"`).
 */
export function createBatonRequest(
  overrides?: Partial<Omit<MintRequest, "capability">>
): MintRequest {
  return {
    capability: "minting",
    amount: 0n,
    ...overrides,
  };
}

/** Return `true` when the request represents a minting baton. */
export function isBatonRequest(req: MintRequest): boolean {
  return req.capability === "minting";
}
