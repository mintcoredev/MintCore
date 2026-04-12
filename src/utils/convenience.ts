import { MintConfig } from "../types/MintConfig.js";
import { TokenSchema } from "../types/TokenSchema.js";
import { MintResult } from "../core/MintResult.js";
import { MintEngine } from "../core/MintEngine.js";
import { MintCoreError } from "./errors.js";

export async function mintFungibleToken(
  config: MintConfig,
  schema: Omit<TokenSchema, "nft">
): Promise<MintResult> {
  const engine = new MintEngine(config);
  return engine.mint(schema);
}

export async function mintNFT(
  config: MintConfig,
  schema: TokenSchema
): Promise<MintResult> {
  if (!schema.nft) {
    throw new MintCoreError("NFT options are required for mintNFT");
  }
  const engine = new MintEngine(config);
  return engine.mint(schema);
}

/**
 * Validate that a string is a well-formed 64-character hex transaction ID.
 *
 * @param _config - Reserved for future on-chain verification via a UTXO
 *   provider. Currently unused — this function validates the txid format only.
 * @param txid - The transaction ID to validate.
 * @returns `true` when `txid` is a valid 64-character hex string;
 *   `false` otherwise.
 *
 * @remarks
 * This is a **format-only** check. It does **not** contact any network
 * provider to confirm the transaction has been broadcast or confirmed.
 */
export async function isValidTxid(
  _config: MintConfig,
  txid: string
): Promise<boolean> {
  if (!txid || typeof txid !== "string") return false;
  return /^[0-9a-f]{64}$/i.test(txid);
}

/**
 * @deprecated Renamed to {@link isValidTxid}. This alias will be removed in a
 * future release.
 */
export const verifyMint = isValidTxid;

export function createMetadata(
  fields: Record<string, unknown>
): Record<string, unknown> {
  return { ...fields };
}

export function encodeMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}
