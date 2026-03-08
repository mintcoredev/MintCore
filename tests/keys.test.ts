import { describe, it, expect } from "vitest";
import { privateKeyToBin, generateKey, deriveAddress } from "../src/utils/keys.js";
import { MintCoreError } from "../src/utils/errors.js";

const ZERO_KEY_HEX = "0".repeat(64);
const MAX_KEY_HEX = "f".repeat(64);
const KNOWN_KEY = "0000000000000000000000000000000000000000000000000000000000000001";

describe("privateKeyToBin", () => {
  it("returns a Uint8Array", () => {
    expect(privateKeyToBin(KNOWN_KEY)).toBeInstanceOf(Uint8Array);
  });

  it("returns a 32-byte array for a 64-character hex key", () => {
    expect(privateKeyToBin(KNOWN_KEY)).toHaveLength(32);
  });

  it("converts a well-known key (0x01) correctly", () => {
    const result = privateKeyToBin(KNOWN_KEY);
    // First 31 bytes should be 0x00, last byte should be 0x01
    expect(result[31]).toBe(0x01);
    for (let i = 0; i < 31; i++) {
      expect(result[i]).toBe(0x00);
    }
  });

  it("converts all-zero hex key to all-zero bytes", () => {
    const result = privateKeyToBin(ZERO_KEY_HEX);
    expect(result).toEqual(new Uint8Array(32).fill(0x00));
  });

  it("converts all-'f' hex key to all-0xff bytes", () => {
    const result = privateKeyToBin(MAX_KEY_HEX);
    expect(result).toEqual(new Uint8Array(32).fill(0xff));
  });

  it("is consistent with fromHex for the same input", async () => {
    const { fromHex } = await import("../src/utils/hex.js");
    const hex = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20";
    expect(privateKeyToBin(hex)).toEqual(fromHex(hex));
  });
});

// ─── generateKey ──────────────────────────────────────────────────────────────

describe("generateKey", () => {
  it("returns a 64-character lowercase hex string", () => {
    const key = generateKey();
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns a different key on each call", () => {
    const key1 = generateKey();
    const key2 = generateKey();
    // The probability of two randomly generated keys being equal is negligible
    expect(key1).not.toBe(key2);
  });

  it("returns a string that can be parsed back to 32 bytes via privateKeyToBin", () => {
    const key = generateKey();
    const bin = privateKeyToBin(key);
    expect(bin).toBeInstanceOf(Uint8Array);
    expect(bin).toHaveLength(32);
  });
});

// ─── deriveAddress ────────────────────────────────────────────────────────────

describe("deriveAddress", () => {
  it("returns a mainnet CashAddress with 'bitcoincash:' prefix", () => {
    const address = deriveAddress(KNOWN_KEY, "mainnet");
    expect(address).toMatch(/^bitcoincash:q/);
  });

  it("returns a testnet CashAddress with 'bchtest:' prefix", () => {
    const address = deriveAddress(KNOWN_KEY, "testnet");
    expect(address).toMatch(/^bchtest:q/);
  });

  it("returns a regtest CashAddress with 'bchreg:' prefix", () => {
    const address = deriveAddress(KNOWN_KEY, "regtest");
    expect(address).toMatch(/^bchreg:q/);
  });

  it("returns a deterministic address for the same key and network", () => {
    const a1 = deriveAddress(KNOWN_KEY, "mainnet");
    const a2 = deriveAddress(KNOWN_KEY, "mainnet");
    expect(a1).toBe(a2);
  });

  it("returns different addresses for different keys", () => {
    const key2 = "0000000000000000000000000000000000000000000000000000000000000002";
    expect(deriveAddress(KNOWN_KEY, "mainnet")).not.toBe(deriveAddress(key2, "mainnet"));
  });

  it("works end-to-end with generateKey", () => {
    const key = generateKey();
    const address = deriveAddress(key, "mainnet");
    expect(address).toMatch(/^bitcoincash:q/);
  });

  it("throws MintCoreError for an invalid private key", () => {
    expect(() => deriveAddress("notahexstring!!", "mainnet")).toThrow(MintCoreError);
  });
});
