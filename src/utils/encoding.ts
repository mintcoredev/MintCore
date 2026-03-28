// Hex and binary encoding utilities.
export { toHex } from "./hex.js";

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
