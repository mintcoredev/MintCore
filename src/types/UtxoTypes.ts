/**
 * UTXO models for MintCore v1.0.
 *
 * Provides base UTXO and token-bearing UTXO interfaces with type guards
 * and validation helpers.
 */

import { MintCoreError } from "../utils/errors.js";
import { isTokenCategory, isTokenAmount, isNftCapability } from "./TokenPrimitives.js";
import type { TokenCategory, TokenAmount, NftCapability } from "./TokenPrimitives.js";

// ── Interfaces ─────────────────────────────────────────────────────────────

/**
 * The minimal UTXO representation used throughout MintCore.
 *
 * Fields align with standard BCH UTXO conventions:
 * - `txid` — transaction id in display (reversed) byte order (64 hex chars)
 * - `vout` — output index within the transaction
 * - `satoshis` — value in satoshis (integer >= 0)
 * - `lockingScript` — the output locking bytecode as a lowercase hex string
 */
export interface BaseUtxo {
  txid: string;
  vout: number;
  satoshis: number;
  lockingScript: string;
}

/**
 * Token data attached to a {@link TokenUtxo}.
 *
 * A token UTXO may carry fungible tokens, an NFT, or both simultaneously.
 */
export interface UtxoTokenData {
  /** Token category (genesis txid as 64-char lowercase hex). */
  category: TokenCategory;
  /**
   * Fungible token amount.  Omit when the output carries no fungible balance.
   */
  amount?: TokenAmount;
  /** NFT data; present only when this output carries an NFT. */
  nft?: {
    capability: NftCapability;
    /**
     * Commitment bytes as a lowercase hex string (up to 40 bytes / 80 hex chars).
     * Empty string means no commitment data.
     */
    commitment: string;
  };
}

/**
 * A UTXO that carries CashTokens data (fungible, non-fungible, or both).
 */
export interface TokenUtxo extends BaseUtxo {
  token: UtxoTokenData;
}

// ── Type guards ────────────────────────────────────────────────────────────

/** Regex matching a 64-character lowercase hex string (txid / category). */
const HEX64_RE = /^[0-9a-f]{64}$/;

/** Regex matching an even-length lowercase hex string (locking script, commitment). */
const HEX_EVEN_RE = /^([0-9a-f]{2})*$/;

/**
 * Returns `true` when `value` conforms to the {@link BaseUtxo} interface.
 *
 * Checks:
 * - `txid` is a 64-character lowercase hex string
 * - `vout` is a non-negative integer
 * - `satoshis` is a finite non-negative integer
 * - `lockingScript` is an even-length lowercase hex string (may be empty)
 */
export function isBaseUtxo(value: unknown): value is BaseUtxo {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    typeof u.txid === "string" &&
    HEX64_RE.test(u.txid) &&
    typeof u.vout === "number" &&
    Number.isInteger(u.vout) &&
    u.vout >= 0 &&
    typeof u.satoshis === "number" &&
    Number.isFinite(u.satoshis) &&
    Number.isInteger(u.satoshis) &&
    u.satoshis >= 0 &&
    typeof u.lockingScript === "string" &&
    HEX_EVEN_RE.test(u.lockingScript)
  );
}

/**
 * Returns `true` when `value` conforms to the {@link TokenUtxo} interface.
 *
 * In addition to all {@link BaseUtxo} checks this verifies:
 * - `token.category` is a 64-char lowercase hex string
 * - `token.amount` is a non-negative bigint (when present)
 * - `token.nft.capability` is a valid {@link NftCapability} (when present)
 * - `token.nft.commitment` is an even-length lowercase hex string (when present)
 */
export function isTokenUtxo(value: unknown): value is TokenUtxo {
  if (!isBaseUtxo(value)) return false;
  const u = value as unknown as Record<string, unknown>;
  if (!u.token || typeof u.token !== "object") return false;
  const t = u.token as Record<string, unknown>;
  if (!isTokenCategory(t.category)) return false;
  if (t.amount !== undefined && !isTokenAmount(t.amount)) return false;
  if (t.nft !== undefined) {
    if (typeof t.nft !== "object" || t.nft === null) return false;
    const nft = t.nft as Record<string, unknown>;
    if (!isNftCapability(nft.capability)) return false;
    if (typeof nft.commitment !== "string" || !HEX_EVEN_RE.test(nft.commitment)) return false;
  }
  return true;
}

// ── Validation helpers ─────────────────────────────────────────────────────

/**
 * Assert that `value` is a well-formed {@link BaseUtxo}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertBaseUtxo(value: unknown): asserts value is BaseUtxo {
  if (!value || typeof value !== "object") {
    throw new MintCoreError("BaseUtxo must be a non-null object");
  }
  const u = value as Record<string, unknown>;
  if (typeof u.txid !== "string" || !HEX64_RE.test(u.txid)) {
    throw new MintCoreError(
      `BaseUtxo.txid must be a 64-character lowercase hex string, got "${u.txid}"`
    );
  }
  if (typeof u.vout !== "number" || !Number.isInteger(u.vout) || u.vout < 0) {
    throw new MintCoreError(
      `BaseUtxo.vout must be a non-negative integer, got ${u.vout}`
    );
  }
  if (
    typeof u.satoshis !== "number" ||
    !Number.isFinite(u.satoshis) ||
    !Number.isInteger(u.satoshis) ||
    u.satoshis < 0
  ) {
    throw new MintCoreError(
      `BaseUtxo.satoshis must be a finite non-negative integer, got ${u.satoshis}`
    );
  }
  if (typeof u.lockingScript !== "string" || !HEX_EVEN_RE.test(u.lockingScript)) {
    throw new MintCoreError(
      `BaseUtxo.lockingScript must be an even-length lowercase hex string, got "${u.lockingScript}"`
    );
  }
}

/**
 * Assert that `value` is a well-formed {@link TokenUtxo}.
 *
 * @throws {MintCoreError} on the first constraint violation.
 */
export function assertTokenUtxo(value: unknown): asserts value is TokenUtxo {
  assertBaseUtxo(value);
  const u = value as unknown as Record<string, unknown>;
  if (!u.token || typeof u.token !== "object") {
    throw new MintCoreError("TokenUtxo.token must be a non-null object");
  }
  const t = u.token as Record<string, unknown>;
  if (!isTokenCategory(t.category)) {
    throw new MintCoreError(
      `TokenUtxo.token.category must be a 64-character lowercase hex string, got "${t.category}"`
    );
  }
  if (t.amount !== undefined && !isTokenAmount(t.amount)) {
    throw new MintCoreError(
      `TokenUtxo.token.amount must be a non-negative bigint when provided, got ${t.amount}`
    );
  }
  if (t.nft !== undefined) {
    if (typeof t.nft !== "object" || t.nft === null) {
      throw new MintCoreError("TokenUtxo.token.nft must be a non-null object when provided");
    }
    const nft = t.nft as Record<string, unknown>;
    if (!isNftCapability(nft.capability)) {
      throw new MintCoreError(
        `TokenUtxo.token.nft.capability must be "none", "mutable", or "minting", got "${nft.capability}"`
      );
    }
    if (typeof nft.commitment !== "string" || !HEX_EVEN_RE.test(nft.commitment)) {
      throw new MintCoreError(
        `TokenUtxo.token.nft.commitment must be an even-length lowercase hex string, got "${nft.commitment}"`
      );
    }
  }
}
