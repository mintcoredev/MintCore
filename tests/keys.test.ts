import { describe, it, expect } from "vitest";
import { privateKeyToBin } from "../src/utils/keys.js";

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
