import { TokenSchema, TokenCapability } from "../types/TokenSchema.js";
import { MintCoreError } from "./errors.js";

const VALID_NFT_CAPABILITIES: TokenCapability[] = ["none", "mutable", "minting"];
const MAX_NFT_COMMITMENT_BYTES = 40;
const MAX_METADATA_SERIALIZED_BYTES = 1000;

export function validateSchema(schema: TokenSchema): void {
  if (!schema.name) throw new MintCoreError("Token name is required");
  if (!schema.symbol) throw new MintCoreError("Token symbol is required");
  if (schema.decimals < 0 || schema.decimals > 18) {
    throw new MintCoreError("Decimals must be between 0 and 18");
  }
  if (schema.initialSupply < 0n) {
    throw new MintCoreError("Initial supply must be non-negative");
  }
  if (schema.nft) {
    // Validate NFT capability
    if (!VALID_NFT_CAPABILITIES.includes(schema.nft.capability)) {
      throw new MintCoreError(
        `Invalid NFT capability: "${schema.nft.capability}". Must be one of: ${VALID_NFT_CAPABILITIES.join(", ")}`
      );
    }
    // Validate commitment format and byte length (CashTokens: max 40 bytes)
    const raw = schema.nft.commitment;
    let commitmentBytes: number;
    if (raw.startsWith("0x")) {
      const hexPart = raw.slice(2);
      if (!/^[0-9a-fA-F]*$/.test(hexPart) || hexPart.length % 2 !== 0) {
        throw new MintCoreError(
          "Invalid NFT commitment: 0x-prefixed value must be valid even-length hex"
        );
      }
      commitmentBytes = hexPart.length / 2;
    } else if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
      commitmentBytes = raw.length / 2;
    } else {
      commitmentBytes = new TextEncoder().encode(raw).length;
    }
    if (commitmentBytes > MAX_NFT_COMMITMENT_BYTES) {
      throw new MintCoreError(
        `NFT commitment too long: ${commitmentBytes} bytes (max ${MAX_NFT_COMMITMENT_BYTES} bytes per CashTokens spec)`
      );
    }
  }
  if (schema.metadata !== undefined) {
    const serialized = JSON.stringify(schema.metadata);
    if (serialized.length > MAX_METADATA_SERIALIZED_BYTES) {
      throw new MintCoreError(
        `Token metadata too large: ${serialized.length} characters (max ${MAX_METADATA_SERIALIZED_BYTES})`
      );
    }
  }
}
