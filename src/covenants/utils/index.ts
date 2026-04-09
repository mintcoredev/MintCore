/**
 * Script utility helpers for MintCore Phase Three.
 *
 * Pure utility functions for covenant-related data manipulation.
 * These helpers are intentionally generic and not tied to any specific
 * covenant template.  No script generation, no blockchain RPC calls.
 */

import { sha256 } from "@bitauth/libauth";
import { toHex } from "../../utils/hex.js";
import { MintCoreError } from "../../utils/errors.js";
import type { CovenantDefinition } from "../interfaces/index.js";

// ── Internal Base64 helpers (uses TextEncoder/TextDecoder — ES2020 + DOM) ──

/**
 * Encode a UTF-8 string to Base64.
 * Uses TextEncoder so that non-ASCII characters are handled correctly.
 */
function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/**
 * Decode a Base64 string to a UTF-8 string.
 * Uses TextDecoder so that non-ASCII characters are reconstructed correctly.
 */
function base64ToUtf8(encoded: string): string {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ── Public utilities ────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hash of a {@link CovenantDefinition}.
 *
 * The hash is derived from the JSON serialisation of the definition and
 * returned as a 64-character lowercase hex string.  Use this value to
 * produce a stable fingerprint of a covenant for storage, comparison, or
 * off-chain bookkeeping.
 *
 * Does NOT generate or validate scripts.
 *
 * @param def - The covenant definition to hash.
 * @returns A 64-character lowercase hex string (32-byte SHA-256 digest).
 */
export function hashCovenantDefinition(def: CovenantDefinition): string {
  const json = JSON.stringify(def);
  const bytes = new TextEncoder().encode(json);
  return toHex(sha256.hash(bytes));
}

/**
 * Encode covenant metadata as a Base64 string.
 *
 * Serialises `meta` to JSON and encodes the result as Base64.  The returned
 * string is safe for use in URIs, HTTP headers, and OP_RETURN payloads.
 *
 * @param meta - Arbitrary key-value metadata object.
 * @returns A Base64-encoded string.
 * @throws {MintCoreError} when `meta` is not a plain object.
 */
export function encodeCovenantMetadata(meta: Record<string, unknown>): string {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new MintCoreError("encodeCovenantMetadata: meta must be a plain object");
  }
  return utf8ToBase64(JSON.stringify(meta));
}

/**
 * Decode a Base64-encoded covenant metadata string.
 *
 * Reverses {@link encodeCovenantMetadata}: Base64-decodes the input and
 * parses the resulting JSON.
 *
 * @param encoded - A Base64 string previously produced by
 *   {@link encodeCovenantMetadata}.
 * @returns The decoded metadata object.
 * @throws {MintCoreError} when `encoded` is not a valid Base64-encoded JSON
 *   object.
 */
export function decodeCovenantMetadata(encoded: string): Record<string, unknown> {
  if (typeof encoded !== "string" || encoded.length === 0) {
    throw new MintCoreError("decodeCovenantMetadata: encoded must be a non-empty string");
  }
  let json: string;
  try {
    json = base64ToUtf8(encoded);
  } catch {
    throw new MintCoreError("decodeCovenantMetadata: failed to decode Base64 input");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new MintCoreError("decodeCovenantMetadata: decoded value is not valid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new MintCoreError("decodeCovenantMetadata: decoded value must be a plain object");
  }
  return parsed as Record<string, unknown>;
}
