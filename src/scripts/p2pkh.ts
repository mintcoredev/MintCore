// P2PKH (Pay-to-Public-Key-Hash) script helpers.
import {
  encodeLockingBytecodeP2pkh,
  hash160,
  secp256k1,
} from "@bitauth/libauth";
import { fromHex } from "../utils/hex.js";
import { MintCoreError } from "../utils/errors.js";

/**
 * Build a P2PKH locking script from a 20-byte public key hash.
 *
 * @param pkh - 20-byte public key hash (`Uint8Array`).
 */
export function p2pkhLockingBytecode(pkh: Uint8Array): Uint8Array {
  return encodeLockingBytecodeP2pkh(pkh);
}

/**
 * Derive the P2PKH locking bytecode directly from a compressed private key.
 *
 * @param privateKeyHex - 64-character hex string (32 bytes).
 */
export function p2pkhFromPrivateKey(privateKeyHex: string): Uint8Array {
  const privKeyBin = fromHex(privateKeyHex);
  const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
  if (typeof pubKey === "string") {
    throw new MintCoreError(`Invalid private key: ${pubKey}`);
  }
  return encodeLockingBytecodeP2pkh(hash160(pubKey));
}
