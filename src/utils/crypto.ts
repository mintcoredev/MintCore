/**
 * Cryptographic utilities for the WizardConnect mobile protocol.
 *
 * Provides:
 * - ECDH shared-secret derivation using libauth's secp256k1 implementation.
 * - AES-256-GCM encrypt/decrypt via the Web Crypto API (`globalThis.crypto`).
 *
 * These are available in all modern browsers and in Node.js ≥ 15.
 */

import type { webcrypto } from "node:crypto";
import { secp256k1 } from "@bitauth/libauth";
import { MintCoreError } from "./errors.js";

// Use webcrypto.CryptoKey for cross-environment type compatibility.
type CryptoKey = webcrypto.CryptoKey;

// ─── ECDH ─────────────────────────────────────────────────────────────────────

/**
 * Derive a 32-byte ECDH shared secret.
 *
 * Computes `privateKey × publicKey` (secp256k1 scalar-point multiplication)
 * and returns the x-coordinate of the resulting point.  Both parties arrive
 * at the same secret as long as one uses their private key and the other's
 * public key.
 *
 * @param privateKey - 32-byte secp256k1 private key (our ephemeral key).
 * @param publicKey  - 33-byte compressed secp256k1 public key (peer's key).
 * @returns 32-byte shared secret (x-coordinate of the shared EC point).
 * @throws {MintCoreError} if either key is invalid.
 */
export function ecdhSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array {
  // mulTweakPublicKeyCompressed computes scalar × point and returns the
  // resulting compressed public key (33 bytes: prefix + 32-byte x-coordinate).
  const result = secp256k1.mulTweakPublicKeyCompressed(publicKey, privateKey);
  if (typeof result === "string") {
    throw new MintCoreError(`ECDH shared secret derivation failed: ${result}`);
  }
  // Extract the x-coordinate: bytes [1, 33)
  return result.slice(1, 33);
}

// ─── AES-256-GCM ──────────────────────────────────────────────────────────────

/**
 * Import a raw 32-byte key as a Web Crypto `CryptoKey` for AES-256-GCM.
 *
 * @param keyBytes - 32 raw key bytes (e.g. an ECDH shared secret).
 * @returns A `CryptoKey` usable for AES-GCM encrypt/decrypt operations.
 */
export async function importAesKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  return (globalThis.crypto as webcrypto.Crypto).subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt `plaintext` with AES-256-GCM.
 *
 * @param key       - AES-GCM `CryptoKey` (256-bit).
 * @param iv        - 12-byte initialisation vector (must be unique per encryption).
 * @param plaintext - Bytes to encrypt.
 * @returns Ciphertext bytes (includes 16-byte GCM authentication tag).
 */
export async function aesGcmEncrypt(
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  const ciphertext = await (globalThis.crypto as webcrypto.Crypto).subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );
  return new Uint8Array(ciphertext);
}

/**
 * Decrypt AES-256-GCM `ciphertext`.
 *
 * @param key        - AES-GCM `CryptoKey` (256-bit).
 * @param iv         - 12-byte initialisation vector used during encryption.
 * @param ciphertext - Encrypted bytes (includes 16-byte GCM authentication tag).
 * @returns Decrypted plaintext bytes.
 * @throws {MintCoreError} if decryption fails (wrong key, tampered ciphertext, etc.).
 */
export async function aesGcmDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  let plaintext: ArrayBuffer;
  try {
    plaintext = await (globalThis.crypto as webcrypto.Crypto).subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new MintCoreError(`AES-GCM decryption failed: ${msg}`);
  }
  return new Uint8Array(plaintext);
}
