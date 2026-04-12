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

// ── Internal Base64 helpers (pure JS — no DOM btoa/atob dependency) ──────────

const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode a Uint8Array to a Base64 string (pure JS, no DOM/Node dependency).
 */
function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < len ? B64_CHARS[b2 & 63] : "=";
  }
  return result;
}

/**
 * Decode a Base64 string to a Uint8Array (pure JS, no DOM/Node dependency).
 * Throws on invalid characters.
 */
function base64ToBytes(encoded: string): Uint8Array {
  // Build reverse lookup on first call
  const lookup = new Uint8Array(128);
  lookup.fill(255);
  for (let i = 0; i < B64_CHARS.length; i++) lookup[B64_CHARS.charCodeAt(i)] = i;
  lookup["=".charCodeAt(0)] = 0;

  const stripped = encoded.replace(/=+$/, "");
  const outLen = (stripped.length * 3) >>> 2;
  const out = new Uint8Array(outLen);
  let j = 0;
  for (let i = 0; i < stripped.length; i += 4) {
    const c0 = lookup[stripped.charCodeAt(i)];
    const c1 = lookup[stripped.charCodeAt(i + 1)];
    const c2 = i + 2 < stripped.length ? lookup[stripped.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < stripped.length ? lookup[stripped.charCodeAt(i + 3)] : 0;
    if (c0 === 255 || c1 === 255 || c2 === 255 || c3 === 255) {
      throw new Error("Invalid base64 character");
    }
    out[j++] = (c0 << 2) | (c1 >> 4);
    if (i + 2 < stripped.length) out[j++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (i + 3 < stripped.length) out[j++] = ((c2 & 3) << 6) | c3;
  }
  return out;
}

/**
 * Encode a UTF-8 string to Base64.
 * Uses TextEncoder + pure-JS base64 so that non-ASCII characters are handled
 * correctly without depending on DOM `btoa`.
 */
function utf8ToBase64(text: string): string {
  return bytesToBase64(new TextEncoder().encode(text));
}

/**
 * Decode a Base64 string to a UTF-8 string.
 * Uses pure-JS base64 + TextDecoder so that non-ASCII characters are
 * reconstructed correctly without depending on DOM `atob`.
 */
function base64ToUtf8(encoded: string): string {
  return new TextDecoder().decode(base64ToBytes(encoded));
}

// ── Public utilities ────────────────────────────────────────────────────────

/**
 * Recursively canonicalize a value to a JSON string with sorted object keys.
 *
 * This ensures a stable, deterministic representation regardless of insertion
 * order.  Properties with `undefined` values are omitted, matching
 * `JSON.stringify` behavior.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + (value as unknown[]).map(canonicalize).join(",") + "]";
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter(k => obj[k] !== undefined).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonicalize(obj[k])).join(",") + "}";
}

/**
 * Compute a SHA-256 hash of a {@link CovenantDefinition}.
 *
 * The hash is derived from the canonical JSON serialisation of the definition
 * (object keys sorted recursively, UTF-8 encoded) and returned as a
 * 64-character lowercase hex string.  Use this value to produce a stable
 * fingerprint of a covenant for storage, comparison, or off-chain bookkeeping.
 *
 * Does NOT generate or validate scripts.
 *
 * @param def - The covenant definition to hash.
 * @returns A 64-character lowercase hex string (32-byte SHA-256 digest).
 */
export function hashCovenantDefinition(def: CovenantDefinition): string {
  const canonical = canonicalize(def);
  const bytes = new TextEncoder().encode(canonical);
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
