import type { Sha256 } from '../lib.js';
declare const enum KeyUtilConstants {
    privateKeyLength = 32,
    privateKeyRequiredEntropyBits = 128,
    utf8NumbersOffset = 48
}
/**
 * Generate a Uint8Array of the specified length containing a
 * cryptographically-random series of bytes.
 * @param length - the length of the Uint8Array to generate
 */
export declare const generateRandomBytes: (length: number) => Uint8Array;
/**
 * Securely generate a 32-byte, cryptographically random seed (Uint8Array) for
 * use in HD Key derivation (see {@link deriveHdPrivateNodeFromSeed}).
 *
 * To generate a single Secp256k1 private key, use {@link generatePrivateKey}.
 */
export declare const generateRandomSeed: () => Uint8Array;
/**
 * Securely generate a valid Secp256k1 private key.
 *
 * By default, this function uses `crypto.getRandomValues` to produce
 * sufficiently-random key material, but another source of randomness may also
 * be provided.
 *
 * To generate an HD Key, use {@link generateHdPrivateKey}.
 *
 * @param secureRandom - a method that returns a securely-random 32-byte
 * Uint8Array
 */
export declare const generatePrivateKey: (secureRandom?: () => Uint8Array) => Uint8Array;
/**
 * Securely generate a valid {@link HdPrivateNode}, returning both the source
 * seed and the {@link HdPrivateNodeValid}.
 *
 * By default, this function uses `crypto.getRandomValues` to produce
 * sufficiently-random key material, but another source of randomness may also
 * be provided.
 *
 * To generate a single Secp256k1 private key, use {@link generatePrivateKey}.
 */
export declare const generateHdPrivateNode: (secureRandom?: () => Uint8Array) => {
    hdPrivateNode: import("./hd-key.js").HdPrivateNodeValid;
    seed: Uint8Array;
};
/**
 * Given the number of equally-likely results per event, return the Shannon
 * entropy of the event in bits.
 *
 * @param possibleResults - the number of equally-likely results per event;
 * e.g. for a coin, `2`, for dice, the number of faces (for a standard die, `6`)
 */
export declare const shannonEntropyPerEvent: (possibleResults: number) => number;
/**
 * Given the number of equally-likely results per event, return the number of
 * events required to achieve the required bits of Shannon entropy.
 * entropy of the event in bits.
 *
 * For example, to compute the number of standard, 6-sided dice rolls required
 * to generate a private key (with the recommended 128-bit entropy minimum),
 * `minimumEventsPerEntropyBits(6)`.
 *
 * @param possibleResults - the number of equally-likely results per event;
 * e.g. for a coin, `2`, for dice, the number of faces (for a standard die, `6`)
 * @param requiredEntropyBits - the number of bits of entropy required. Defaults
 * to `128`, the recommended value for all private key generation.
 */
export declare const minimumEventsPerEntropyBits: (possibleResults: number, requiredEntropyBits?: KeyUtilConstants) => number;
/**
 * An error in the decoding of an HD public or private key.
 */
export declare enum DeterministicEntropyGenerationError {
    insufficientEntropy = "Deterministic entropy generation error: the provided list of events contains insufficient entropy."
}
/**
 * Generate deterministic entropy by seeding SHA-256 with a list of random
 * events like coin flips or dice rolls. For ease of verification, events are
 * simply encoded as a string of utf8 numbers prior to SHA-256 hashing. For coin
 * flips, use `0` ("heads") and `1` ("tails"); for dice, use the exposed number.
 *
 * @param possibleResults - the number of equally-likely results per event;
 * e.g. for a coin, `2`, for dice, the number of faces (for a standard die, `6`)
 * @param events - an array of numbers encoding the random events; for coin
 * flips, use `0` ("heads") and `1` ("tails"); for dice, use the exposed number
 * (e.g. `1` through `6`)
 * @param requiredEntropyBits - the number of bits of entropy required. Defaults
 * to `128`, the recommended value for all private key generation.
 * @param crypto - an optional object containing an implementation of sha256
 * to use
 */
export declare const generateDeterministicEntropy: (possibleResults: number, events: number[], requiredEntropyBits?: KeyUtilConstants, crypto?: {
    sha256: {
        hash: Sha256['hash'];
    };
}) => Uint8Array | DeterministicEntropyGenerationError.insufficientEntropy;
export {};
//# sourceMappingURL=key-utils.d.ts.map