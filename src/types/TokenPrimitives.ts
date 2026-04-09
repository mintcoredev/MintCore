/**
 * Core CashTokens token primitives for MintCore v1.0.
 *
 * Provides branded types, interfaces, and validation helpers for working
 * with CashTokens fungible and non-fungible token values.
 */

import { MintCoreError } from "../utils/errors.js";

// ── Branded scalar types ───────────────────────────────────────────────────

/**
 * A 64-character lowercase hex string that uniquely identifies a token output
 * (the genesis transaction id in internal byte order).
 */
export type TokenId = string & { readonly __brand: "TokenId" };

/**
 * A 64-character lowercase hex string that identifies a token category
 * (the genesis transaction id used as the on-chain category identifier).
 */
export type TokenCategory = string & { readonly __brand: "TokenCategory" };

/**
 * A non-negative `bigint` representing a fungible token amount expressed in
 * the smallest indivisible unit of the token.
 */
export type TokenAmount = bigint & { readonly __brand: "TokenAmount" };

// ── NFT capability ─────────────────────────────────────────────────────────

/** The three NFT minting capabilities defined by the CashTokens specification. */
export type NftCapability = "none" | "mutable" | "minting";

// ── Token interfaces ───────────────────────────────────────────────────────

/**
 * A fungible CashToken carrying an integer amount.
 *
 * The `category` links this token to the genesis transaction that created
 * the token class.
 */
export interface FungibleToken {
  /** Token category (genesis txid, 64-char hex). */
  category: TokenCategory;
  /** Non-negative token amount in the smallest unit. */
  amount: TokenAmount;
}

/**
 * The NFT data attached to a non-fungible token output.
 */
export interface NftData {
  /** Minting capability of this NFT. */
  capability: NftCapability;
  /**
   * Up to 40 bytes of arbitrary commitment data encoded as a lowercase hex
   * string (e.g. `"deadbeef"`).  Empty string means no commitment.
   */
  commitment: string;
}

/**
 * A non-fungible CashToken.
 *
 * NFT outputs carry identity (category) and capability information.  They
 * may also carry fungible token amounts (combined FT+NFT outputs) — use the
 * optional `amount` field in that case.
 */
export interface NonFungibleToken {
  /** Token category (genesis txid, 64-char hex). */
  category: TokenCategory;
  /** NFT-specific data. */
  nft: NftData;
  /**
   * Optional fungible token amount co-located in the same output.
   * When absent the output carries no fungible balance.
   */
  amount?: TokenAmount;
}

// ── Constructors / coercions ───────────────────────────────────────────────

/** Regex that matches exactly 64 lowercase hexadecimal characters. */
const HEX64_RE = /^[0-9a-f]{64}$/;

/**
 * Cast a string to {@link TokenId} after validating its format.
 *
 * @throws {MintCoreError} when `value` is not a 64-character lowercase hex string.
 */
export function toTokenId(value: string): TokenId {
  if (!HEX64_RE.test(value)) {
    throw new MintCoreError(
      `Invalid TokenId: expected 64 lowercase hex characters, got "${value}"`
    );
  }
  return value as TokenId;
}

/**
 * Cast a string to {@link TokenCategory} after validating its format.
 *
 * @throws {MintCoreError} when `value` is not a 64-character lowercase hex string.
 */
export function toTokenCategory(value: string): TokenCategory {
  if (!HEX64_RE.test(value)) {
    throw new MintCoreError(
      `Invalid TokenCategory: expected 64 lowercase hex characters, got "${value}"`
    );
  }
  return value as TokenCategory;
}

/**
 * Cast a `bigint` to {@link TokenAmount} after validating that it is non-negative.
 *
 * @throws {MintCoreError} when `value` is negative.
 */
export function toTokenAmount(value: bigint): TokenAmount {
  if (value < 0n) {
    throw new MintCoreError(
      `Invalid TokenAmount: value must be non-negative, got ${value}`
    );
  }
  return value as TokenAmount;
}

// ── Type guards ────────────────────────────────────────────────────────────

/**
 * Returns `true` when `value` is a valid {@link TokenId}
 * (64-character lowercase hex string).
 */
export function isTokenId(value: unknown): value is TokenId {
  return typeof value === "string" && HEX64_RE.test(value);
}

/**
 * Returns `true` when `value` is a valid {@link TokenCategory}
 * (64-character lowercase hex string).
 */
export function isTokenCategory(value: unknown): value is TokenCategory {
  return typeof value === "string" && HEX64_RE.test(value);
}

/**
 * Returns `true` when `value` is a valid {@link TokenAmount}
 * (non-negative bigint).
 */
export function isTokenAmount(value: unknown): value is TokenAmount {
  return typeof value === "bigint" && value >= 0n;
}

/** Set of valid {@link NftCapability} values. */
const VALID_NFT_CAPABILITIES = new Set<NftCapability>(["none", "mutable", "minting"]);

/**
 * Returns `true` when `value` is a valid {@link NftCapability} string.
 */
export function isNftCapability(value: unknown): value is NftCapability {
  return typeof value === "string" && VALID_NFT_CAPABILITIES.has(value as NftCapability);
}

/**
 * Returns `true` when `value` is a structurally valid {@link FungibleToken}.
 */
export function isFungibleToken(value: unknown): value is FungibleToken {
  if (!value || typeof value !== "object") return false;
  const ft = value as Record<string, unknown>;
  return isTokenCategory(ft.category) && isTokenAmount(ft.amount);
}

/**
 * Returns `true` when `value` is a structurally valid {@link NonFungibleToken}.
 */
export function isNonFungibleToken(value: unknown): value is NonFungibleToken {
  if (!value || typeof value !== "object") return false;
  const nft = value as Record<string, unknown>;
  if (!isTokenCategory(nft.category)) return false;
  if (!nft.nft || typeof nft.nft !== "object") return false;
  const nftData = nft.nft as Record<string, unknown>;
  if (!isNftCapability(nftData.capability)) return false;
  if (typeof nftData.commitment !== "string") return false;
  if (nft.amount !== undefined && !isTokenAmount(nft.amount)) return false;
  return true;
}

// ── Validation helpers ─────────────────────────────────────────────────────

/**
 * Assert that `value` is a well-formed {@link FungibleToken}.
 *
 * @throws {MintCoreError} when the shape is invalid.
 */
export function assertFungibleToken(value: unknown): asserts value is FungibleToken {
  if (!value || typeof value !== "object") {
    throw new MintCoreError("FungibleToken must be a non-null object");
  }
  const ft = value as Record<string, unknown>;
  if (!isTokenCategory(ft.category)) {
    throw new MintCoreError(
      `FungibleToken.category must be a 64-character lowercase hex string, got "${ft.category}"`
    );
  }
  if (!isTokenAmount(ft.amount)) {
    throw new MintCoreError(
      `FungibleToken.amount must be a non-negative bigint, got ${ft.amount}`
    );
  }
}

/**
 * Assert that `value` is a well-formed {@link NonFungibleToken}.
 *
 * @throws {MintCoreError} when the shape is invalid.
 */
export function assertNonFungibleToken(value: unknown): asserts value is NonFungibleToken {
  if (!value || typeof value !== "object") {
    throw new MintCoreError("NonFungibleToken must be a non-null object");
  }
  const nft = value as Record<string, unknown>;
  if (!isTokenCategory(nft.category)) {
    throw new MintCoreError(
      `NonFungibleToken.category must be a 64-character lowercase hex string, got "${nft.category}"`
    );
  }
  if (!nft.nft || typeof nft.nft !== "object") {
    throw new MintCoreError("NonFungibleToken.nft must be a non-null object");
  }
  const nftData = nft.nft as Record<string, unknown>;
  if (!isNftCapability(nftData.capability)) {
    throw new MintCoreError(
      `NonFungibleToken.nft.capability must be "none", "mutable", or "minting", got "${nftData.capability}"`
    );
  }
  if (typeof nftData.commitment !== "string") {
    throw new MintCoreError(
      `NonFungibleToken.nft.commitment must be a string, got ${typeof nftData.commitment}`
    );
  }
  if (nft.amount !== undefined && !isTokenAmount(nft.amount)) {
    throw new MintCoreError(
      `NonFungibleToken.amount must be a non-negative bigint when provided, got ${nft.amount}`
    );
  }
}
