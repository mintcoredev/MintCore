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

export async function verifyMint(
  _config: MintConfig,
  txid: string
): Promise<boolean> {
  // Placeholder: validates txid format only (64 hex characters).
  // Replace with real on-chain verification via MintCore / ChronikProvider.
  if (!txid || typeof txid !== "string") return false;
  return /^[0-9a-f]{64}$/i.test(txid);
}

export function createMetadata(
  fields: Record<string, unknown>
): Record<string, unknown> {
  return { ...fields };
}

export function encodeMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(metadata);
}
