// Hex and binary encoding utilities.
export { toHex } from "./hex.js";
export { fromHex } from "./hex.js";
import { fromHex } from "./hex.js";

/**
 * Encode a UTF-8 string to a `Uint8Array`.
 *
 * @param text - The string to encode.
 */
export function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/**
 * Encode a JSON-serializable value to a UTF-8 `Uint8Array`.
 *
 * @param value - Any JSON-serialisable value.
 */
export function encodeJson(value: unknown): Uint8Array {
  return encodeUtf8(JSON.stringify(value));
}

/**
 * Encode an NFT commitment string to bytes.
 *
 * Accepts three forms:
 * - `0x`-prefixed hex string: the hex portion is decoded to bytes.
 * - Bare even-length hex string: decoded as raw hex bytes.
 * - Any other string: encoded as UTF-8.
 *
 * This is the canonical encoder used by both `TransactionBuilder` and
 * `BatchMintEngine` to turn a `MintRequest.commitment` value into the
 * `Uint8Array` embedded in the CashTokens token prefix.
 *
 * @param raw - The raw commitment string from a `MintRequest` or `NftOptions`.
 * @returns   A `Uint8Array` of the encoded commitment bytes.
 */
export function encodeCommitment(raw: string): Uint8Array {
  if (raw.startsWith("0x")) {
    return fromHex(raw.slice(2));
  }
  if (/^[0-9a-fA-F]+$/.test(raw) && raw.length % 2 === 0) {
    return fromHex(raw);
  }
  return new TextEncoder().encode(raw);
}
