import { MintCoreError } from "./errors.js";

export const toHex = (buffer: Uint8Array): string =>
  Array.from(buffer)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

const HEX_REGEX = /^[0-9a-fA-F]*$/;

/**
 * Throw {@link MintCoreError} when `hex` is not a valid even-length hex string.
 *
 * An empty string is considered valid (zero bytes).
 */
export function assertValidHex(hex: string): void {
  if (hex.length % 2 !== 0) {
    throw new MintCoreError("Invalid hex string: odd length");
  }
  if (!HEX_REGEX.test(hex)) {
    throw new MintCoreError("Invalid hex string: non-hex characters");
  }
}

/**
 * Decode a hex string to a `Uint8Array`.
 *
 * Throws {@link MintCoreError} when the input is not a valid even-length hex
 * string (any non-hex character or an odd number of characters).
 */
export const fromHex = (hex: string): Uint8Array => {
  assertValidHex(hex);
  if (hex.length === 0) return new Uint8Array(0);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Throw {@link MintCoreError} when `key` is not a 64-character lowercase or
 * mixed-case hex string (i.e. a 32-byte private key).
 */
export function validatePrivateKeyHex(key: string): void {
  if (key.length !== 64 || !HEX_REGEX.test(key)) {
    throw new MintCoreError(
      "Invalid private key: expected a 64-character hex string (32 bytes)"
    );
  }
}
