import { TokenSchema, TokenCapability } from "../types/TokenSchema.js";
import type { Utxo } from "../types/TransactionTypes.js";
import type { MintRequest, BatchMintOptions } from "../types/BatchMintTypes.js";
import { MintCoreError } from "./errors.js";
import { decodeCashAddress } from "@bitauth/libauth";

const VALID_NFT_CAPABILITIES: TokenCapability[] = ["none", "mutable", "minting"];
const MAX_NFT_COMMITMENT_BYTES = 40;
const MAX_METADATA_SERIALIZED_BYTES = 1000;

/**
 * Type guard – returns `true` when `value` is a well-formed {@link Utxo}.
 *
 * Validates:
 * - `txid` is a 64-character hex string (case-insensitive)
 * - `vout` is a non-negative integer
 * - `satoshis` is a finite non-negative number
 */
export function validateUtxo(value: unknown): value is Utxo {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.txid === "string" &&
    /^[0-9a-fA-F]{64}$/.test(u.txid) &&
    typeof u.vout === "number" &&
    Number.isInteger(u.vout) &&
    u.vout >= 0 &&
    typeof u.satoshis === "number" &&
    Number.isFinite(u.satoshis) &&
    u.satoshis >= 0
  );
}

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
  if (schema.bcmrUri !== undefined) {
    if (typeof schema.bcmrUri !== "string" || schema.bcmrUri.trim().length === 0) {
      throw new MintCoreError("bcmrUri must be a non-empty string");
    }
    const uriBytes = new TextEncoder().encode(schema.bcmrUri);
    if (uriBytes.length > 512) {
      throw new MintCoreError(
        `bcmrUri is too long: ${uriBytes.length} bytes (max 512 bytes)`
      );
    }
  }
}

const VALID_CAPABILITIES: Array<MintRequest["capability"]> = [
  "none",
  "mutable",
  "minting",
];

/** Maximum byte length of an NFT commitment per the CashTokens specification. */
const MAX_COMMITMENT_BYTES = 40;

/**
 * Validate a single {@link MintRequest} and throw {@link MintCoreError} on
 * the first violation found.
 *
 * Checks:
 * - `category` is a 64-character hex string when provided
 * - `capability` is one of "none" | "mutable" | "minting"
 * - `amount` is a non-negative BigInt
 * - `commitment` is within the 40-byte CashTokens limit when provided
 * - `recipientAddress` is a non-empty CashAddress string when provided
 */
export function validateMintRequest(req: MintRequest): void {
  if (!req || typeof req !== "object") {
    throw new MintCoreError("MintRequest must be a non-null object");
  }

  // category (optional) — must be a 64-hex-char txid when present
  if (req.category !== undefined) {
    if (
      typeof req.category !== "string" ||
      !/^[0-9a-fA-F]{64}$/.test(req.category)
    ) {
      throw new MintCoreError(
        `Invalid token category: "${req.category}". Must be a 64-character hex string (32-byte txid).`
      );
    }
  }

  // capability — required, must be one of the three allowed values
  if (!VALID_CAPABILITIES.includes(req.capability as MintRequest["capability"])) {
    throw new MintCoreError(
      `Invalid mint capability: "${req.capability}". Must be one of: ${VALID_CAPABILITIES.join(", ")}`
    );
  }

  // amount — required BigInt, must be non-negative
  if (typeof req.amount !== "bigint") {
    throw new MintCoreError("Mint amount must be a BigInt");
  }
  if (req.amount < 0n) {
    throw new MintCoreError("Mint amount must be non-negative");
  }

  // commitment (optional) — validate format and byte length
  if (req.commitment !== undefined) {
    if (typeof req.commitment !== "string") {
      throw new MintCoreError("NFT commitment must be a string");
    }
    const raw = req.commitment;
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
    if (commitmentBytes > MAX_COMMITMENT_BYTES) {
      throw new MintCoreError(
        `NFT commitment too long: ${commitmentBytes} bytes (max ${MAX_COMMITMENT_BYTES} bytes per CashTokens spec)`
      );
    }
  }

  // recipientAddress (optional) — must be a valid CashAddress (checksum verified)
  if (req.recipientAddress !== undefined) {
    if (
      typeof req.recipientAddress !== "string" ||
      req.recipientAddress.trim() === ""
    ) {
      throw new MintCoreError("Recipient address must be a non-empty string");
    }
    const decoded = decodeCashAddress(req.recipientAddress);
    if (typeof decoded === "string") {
      throw new MintCoreError(
        `Invalid recipient address format: "${req.recipientAddress}"`
      );
    }
  }
}

/**
 * Validate a {@link BatchMintOptions} object and throw {@link MintCoreError}
 * on the first violation found.
 */
export function validateBatchMintOptions(opts: BatchMintOptions): void {
  if (opts.maxOutputsPerTx !== undefined) {
    if (
      !Number.isInteger(opts.maxOutputsPerTx) ||
      opts.maxOutputsPerTx < 1 ||
      opts.maxOutputsPerTx > 1000
    ) {
      throw new MintCoreError(
        "maxOutputsPerTx must be an integer between 1 and 1000"
      );
    }
  }

  if (opts.maxFeePerTx !== undefined) {
    if (!Number.isFinite(opts.maxFeePerTx) || opts.maxFeePerTx < 0) {
      throw new MintCoreError("maxFeePerTx must be a non-negative number");
    }
  }

  if (opts.feeRate !== undefined) {
    if (!Number.isFinite(opts.feeRate) || opts.feeRate <= 0) {
      throw new MintCoreError("feeRate must be a positive number");
    }
  }

  if (opts.feeSafetyMarginPercent !== undefined) {
    if (
      !Number.isFinite(opts.feeSafetyMarginPercent) ||
      opts.feeSafetyMarginPercent < 0 ||
      opts.feeSafetyMarginPercent > 100
    ) {
      throw new MintCoreError(
        "feeSafetyMarginPercent must be a number between 0 and 100"
      );
    }
  }
}
