/**
 * Base64URL encode/decode utilities.
 *
 * Base64URL is the URL-safe variant of Base64: uses `-` instead of `+` and
 * `_` instead of `/`, and omits padding `=` characters.  It is used in the
 * WizardConnect mobile URI protocol for payload and session encoding.
 *
 * These helpers rely only on `btoa`/`atob` which are available in all modern
 * browsers and in Node.js ≥ 16.
 */

/**
 * Encodes a `Uint8Array` to a base64url string (no padding).
 *
 * @param data - The raw bytes to encode.
 * @returns A base64url-encoded string.
 */
export function base64urlEncode(data: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Decodes a base64url string (with or without padding) to a `Uint8Array`.
 *
 * @param str - The base64url-encoded string to decode.
 * @returns The decoded bytes.
 * @throws `Error` if the input is not valid base64url.
 */
export function base64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
