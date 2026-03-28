// Hex and binary decoding utilities.
export { fromHex } from "./hex.js";

/**
 * Decode a UTF-8 `Uint8Array` to a string.
 *
 * @param bytes - Encoded bytes.
 */
export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Decode a JSON-encoded `Uint8Array` to a value.
 *
 * The return type is `unknown`. Callers should validate or cast the result
 * to the expected type before use (e.g. with a type guard or schema validator).
 *
 * @param bytes - UTF-8 bytes containing a JSON document.
 */
export function decodeJson(bytes: Uint8Array): unknown {
  return JSON.parse(decodeUtf8(bytes));
}
