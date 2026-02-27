import { describe, it, expect } from "vitest";
import { toHex, fromHex } from "../src/utils/hex.js";

describe("toHex", () => {
  it("converts an empty Uint8Array to an empty string", () => {
    expect(toHex(new Uint8Array([]))).toBe("");
  });

  it("converts a single byte to a 2-character hex string", () => {
    expect(toHex(new Uint8Array([0x00]))).toBe("00");
    expect(toHex(new Uint8Array([0xff]))).toBe("ff");
    expect(toHex(new Uint8Array([0x0a]))).toBe("0a");
  });

  it("converts multiple bytes to a lowercase hex string", () => {
    expect(toHex(new Uint8Array([0xde, 0xad, 0xbe, 0xef]))).toBe("deadbeef");
  });

  it("pads single-digit hex values with a leading zero", () => {
    expect(toHex(new Uint8Array([0x01, 0x02, 0x0f]))).toBe("01020f");
  });

  it("produces lowercase hex characters only", () => {
    const result = toHex(new Uint8Array([0xab, 0xcd, 0xef]));
    expect(result).toBe("abcdef");
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it("produces a string with length == 2 * byteLength", () => {
    const bytes = new Uint8Array(16).fill(0xaa);
    expect(toHex(bytes)).toHaveLength(32);
  });
});

describe("fromHex", () => {
  it("converts an empty string to an empty Uint8Array", () => {
    expect(fromHex("")).toEqual(new Uint8Array([]));
  });

  it("converts a 2-character hex string to a single byte", () => {
    expect(fromHex("00")).toEqual(new Uint8Array([0x00]));
    expect(fromHex("ff")).toEqual(new Uint8Array([0xff]));
    expect(fromHex("0a")).toEqual(new Uint8Array([0x0a]));
  });

  it("converts a multi-byte hex string correctly", () => {
    expect(fromHex("deadbeef")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("handles uppercase hex characters", () => {
    expect(fromHex("DEADBEEF")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("handles mixed-case hex characters", () => {
    expect(fromHex("DeAdBeEf")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("produces a Uint8Array with length == hexString.length / 2", () => {
    const hex = "aa".repeat(16);
    const result = fromHex(hex);
    expect(result).toHaveLength(16);
  });
});

describe("toHex / fromHex round-trip", () => {
  it("toHex(fromHex(hex)) === hex for a known value", () => {
    const hex = "0102030405060708090a0b0c0d0e0f10";
    expect(toHex(fromHex(hex))).toBe(hex);
  });

  it("fromHex(toHex(bytes)) deep-equals the original bytes", () => {
    const bytes = new Uint8Array([0, 1, 127, 128, 254, 255]);
    expect(fromHex(toHex(bytes))).toEqual(bytes);
  });
});
