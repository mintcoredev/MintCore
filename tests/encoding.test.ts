import { describe, it, expect } from "vitest";
import { encodeUtf8, encodeJson, encodeCommitment } from "../src/utils/encoding.js";
import { decodeUtf8, decodeJson } from "../src/utils/decoding.js";
import { MintCoreError } from "../src/utils/errors.js";

describe("encodeUtf8", () => {
  it("encodes ASCII text correctly", () => {
    const result = encodeUtf8("hello");
    expect(result).toEqual(new Uint8Array([104, 101, 108, 108, 111]));
  });

  it("encodes empty string to empty Uint8Array", () => {
    const result = encodeUtf8("");
    expect(result).toEqual(new Uint8Array([]));
  });

  it("encodes multi-byte UTF-8 (emoji, CJK characters)", () => {
    const emoji = encodeUtf8("😀");
    expect(emoji).toEqual(new Uint8Array([0xf0, 0x9f, 0x98, 0x80]));

    const cjk = encodeUtf8("中");
    expect(cjk).toEqual(new Uint8Array([0xe4, 0xb8, 0xad]));
  });
});

describe("encodeJson", () => {
  it("encodes simple object", () => {
    const result = encodeJson({ a: 1 });
    expect(decodeUtf8(result)).toBe('{"a":1}');
  });

  it("encodes array", () => {
    const result = encodeJson([1, 2, 3]);
    expect(decodeUtf8(result)).toBe("[1,2,3]");
  });

  it("encodes null", () => {
    const result = encodeJson(null);
    expect(decodeUtf8(result)).toBe("null");
  });

  it("encodes string", () => {
    const result = encodeJson("hello");
    expect(decodeUtf8(result)).toBe('"hello"');
  });
});

describe("encodeCommitment", () => {
  it("0x-prefixed hex returns decoded bytes", () => {
    const result = encodeCommitment("0xdeadbeef");
    expect(result).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("bare even-length hex returns decoded bytes", () => {
    const result = encodeCommitment("cafe");
    expect(result).toEqual(new Uint8Array([0xca, 0xfe]));
  });

  it("odd-length hex-like string is UTF-8 encoded", () => {
    const result = encodeCommitment("abc");
    expect(result).toEqual(new TextEncoder().encode("abc"));
  });

  it("non-hex text is UTF-8 encoded", () => {
    const result = encodeCommitment("hello world");
    expect(result).toEqual(new TextEncoder().encode("hello world"));
  });

  it("empty 0x prefix returns empty array", () => {
    const result = encodeCommitment("0x");
    expect(result).toEqual(new Uint8Array([]));
  });

  it("mixed case hex is decoded correctly", () => {
    const result = encodeCommitment("0xDeAdBe");
    expect(result).toEqual(new Uint8Array([0xde, 0xad, 0xbe]));
  });
});

describe("decodeUtf8", () => {
  it("decodes ASCII bytes correctly", () => {
    const result = decodeUtf8(new Uint8Array([104, 101, 108, 108, 111]));
    expect(result).toBe("hello");
  });

  it("decodes multi-byte UTF-8", () => {
    const result = decodeUtf8(new Uint8Array([0xf0, 0x9f, 0x98, 0x80]));
    expect(result).toBe("😀");
  });

  it("empty array returns empty string", () => {
    const result = decodeUtf8(new Uint8Array([]));
    expect(result).toBe("");
  });
});

describe("decodeJson", () => {
  it("parses valid JSON object", () => {
    const bytes = new TextEncoder().encode('{"key":"value"}');
    expect(decodeJson(bytes)).toEqual({ key: "value" });
  });

  it("parses valid JSON array", () => {
    const bytes = new TextEncoder().encode("[1,2,3]");
    expect(decodeJson(bytes)).toEqual([1, 2, 3]);
  });

  it("throws MintCoreError on invalid JSON", () => {
    const bytes = new TextEncoder().encode("not json");
    expect(() => decodeJson(bytes)).toThrow(MintCoreError);
    expect(() => decodeJson(bytes)).toThrow("Failed to parse JSON");
  });

  it("round-trips with encodeJson", () => {
    const original = { nested: { arr: [1, "two", null] } };
    const encoded = encodeJson(original);
    const decoded = decodeJson(encoded);
    expect(decoded).toEqual(original);
  });
});
