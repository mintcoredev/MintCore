import {
  generatePrivateKey,
  secp256k1,
  hash160,
  encodeLockingBytecodeP2pkh,
  lockingBytecodeToCashAddress,
  CashAddressNetworkPrefix,
} from "@bitauth/libauth";
import { fromHex, toHex, validatePrivateKeyHex } from "./hex.js";
import { MintCoreError } from "./errors.js";

export function privateKeyToBin(key: string): Uint8Array {
  validatePrivateKeyHex(key);
  return fromHex(key);
}

/**
 * Generate a cryptographically secure random 32-byte private key.
 *
 * @returns A 64-character lowercase hex string representing the private key.
 *
 * @remarks
 * **Security notice**: treat the returned value as a secret. Never log it,
 * commit it to source control, or transmit it over insecure channels. Store it
 * in a secure secrets manager or hardware wallet. Loss of the private key means
 * permanent loss of any funds or tokens controlled by it.
 */
export function generateKey(): string {
  return toHex(generatePrivateKey());
}

/**
 * Derive the P2PKH CashAddress for a given private key and network.
 *
 * @param privateKey - 32-byte private key as a 64-character hex string.
 * @param network    - Target network: "mainnet", "testnet", or "regtest".
 * @returns The CashAddress string, including the network prefix
 *          (e.g. `bitcoincash:q...`).
 * @throws {MintCoreError} on an invalid private key or unrecognised network.
 */
export function deriveAddress(
  privateKey: string,
  network: "mainnet" | "testnet" | "regtest"
): string {
  validatePrivateKeyHex(privateKey);
  const privKeyBin = fromHex(privateKey);
  const pubKey = secp256k1.derivePublicKeyCompressed(privKeyBin);
  if (typeof pubKey === "string") {
    throw new MintCoreError(`Invalid private key: ${pubKey}`);
  }
  const pkh = hash160(pubKey);
  const lockingBytecode = encodeLockingBytecodeP2pkh(pkh);

  const prefix = CashAddressNetworkPrefix[network];
  if (!prefix) {
    throw new MintCoreError(`Unrecognized network: "${network}"`);
  }

  const result = lockingBytecodeToCashAddress({ bytecode: lockingBytecode, prefix });
  if (typeof result === "string") {
    throw new MintCoreError("Failed to derive CashAddress from private key");
  }
  return result.address;
}
