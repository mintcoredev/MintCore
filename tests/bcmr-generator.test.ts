import { describe, it, expect } from "vitest";
import { generateBcmr, hashBcmr } from "../src/cashTokens/bcmrGenerator.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { BcmrGeneratorOptions } from "../src/types/BcmrTypes.js";

/** A valid 64-char hex category used throughout the test suite. */
const CATEGORY =
  "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

const BASE_OPTIONS: BcmrGeneratorOptions = {
  category: CATEGORY,
  name: "Test Token",
  symbol: "TST",
  decimals: 8,
};

// ─── generateBcmr ────────────────────────────────────────────────────────────

describe("generateBcmr", () => {
  it("returns an object with the BCMR v2 schema URL", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    expect(doc.$schema).toBe("https://cashtokens.org/bcmr-v2.schema.json");
  });

  it("returns a version object with major, minor, patch", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    expect(typeof doc.version.major).toBe("number");
    expect(typeof doc.version.minor).toBe("number");
    expect(typeof doc.version.patch).toBe("number");
  });

  it("sets latestRevision to an ISO 8601 string", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    expect(() => new Date(doc.latestRevision)).not.toThrow();
    expect(new Date(doc.latestRevision).toISOString()).toBe(doc.latestRevision);
  });

  it("uses the supplied timestamp as latestRevision and snapshot key", () => {
    const ts = "2024-06-15T12:00:00.000Z";
    const doc = generateBcmr({ ...BASE_OPTIONS, timestamp: ts });
    expect(doc.latestRevision).toBe(ts);
    expect(doc.identities[CATEGORY][ts]).toBeDefined();
  });

  it("places the identity under the correct category key", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    expect(doc.identities[CATEGORY]).toBeDefined();
  });

  it("snapshot contains the correct name", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const snapshots = doc.identities[CATEGORY];
    const snapshot = Object.values(snapshots)[0];
    expect(snapshot.name).toBe("Test Token");
  });

  it("snapshot token record contains the category", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect(snapshot.token?.category).toBe(CATEGORY);
  });

  it("snapshot token record contains symbol and decimals when provided", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect(snapshot.token?.symbol).toBe("TST");
    expect(snapshot.token?.decimals).toBe(8);
  });

  it("omits symbol and decimals from token record when not provided", () => {
    const doc = generateBcmr({ category: CATEGORY, name: "Minimal" });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect("symbol" in (snapshot.token ?? {})).toBe(false);
    expect("decimals" in (snapshot.token ?? {})).toBe(false);
  });

  it("includes description in the snapshot when provided", () => {
    const doc = generateBcmr({ ...BASE_OPTIONS, description: "A test token" });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect(snapshot.description).toBe("A test token");
  });

  it("omits description from the snapshot when not provided", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect("description" in snapshot).toBe(false);
  });

  it("includes uris in the snapshot when provided", () => {
    const uris = { icon: "ipfs://bafybei...", web: "https://example.com" };
    const doc = generateBcmr({ ...BASE_OPTIONS, uris });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect(snapshot.uris).toEqual(uris);
  });

  it("omits uris from the snapshot when not provided", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect("uris" in snapshot).toBe(false);
  });

  it("omits uris from the snapshot when an empty object is supplied", () => {
    const doc = generateBcmr({ ...BASE_OPTIONS, uris: {} });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect("uris" in snapshot).toBe(false);
  });

  it("includes tags in the snapshot when provided", () => {
    const tags = ["defi", "utility"];
    const doc = generateBcmr({ ...BASE_OPTIONS, tags });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect(snapshot.tags).toEqual(tags);
  });

  it("omits tags from the snapshot when an empty array is supplied", () => {
    const doc = generateBcmr({ ...BASE_OPTIONS, tags: [] });
    const snapshot = Object.values(doc.identities[CATEGORY])[0];
    expect("tags" in snapshot).toBe(false);
  });

  it("throws MintCoreError when category is not a 64-char hex string", () => {
    expect(() =>
      generateBcmr({ ...BASE_OPTIONS, category: "notahex" })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when category is an empty string", () => {
    expect(() =>
      generateBcmr({ ...BASE_OPTIONS, category: "" })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when name is empty", () => {
    expect(() =>
      generateBcmr({ ...BASE_OPTIONS, name: "" })
    ).toThrow(MintCoreError);
  });

  it("throws MintCoreError when name is whitespace-only", () => {
    expect(() =>
      generateBcmr({ ...BASE_OPTIONS, name: "   " })
    ).toThrow(MintCoreError);
  });
});

// ─── hashBcmr ────────────────────────────────────────────────────────────────

describe("hashBcmr", () => {
  it("returns a 64-character lowercase hex string", () => {
    const doc = generateBcmr(BASE_OPTIONS);
    const hash = hashBcmr(doc);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic: same document always produces the same hash", () => {
    const ts = "2024-01-01T00:00:00.000Z";
    const doc = generateBcmr({ ...BASE_OPTIONS, timestamp: ts });
    expect(hashBcmr(doc)).toBe(hashBcmr(doc));
  });

  it("produces different hashes for documents with different names", () => {
    const ts = "2024-01-01T00:00:00.000Z";
    const doc1 = generateBcmr({ ...BASE_OPTIONS, name: "Token A", timestamp: ts });
    const doc2 = generateBcmr({ ...BASE_OPTIONS, name: "Token B", timestamp: ts });
    expect(hashBcmr(doc1)).not.toBe(hashBcmr(doc2));
  });

  it("produces different hashes for documents with different categories", () => {
    const ts = "2024-01-01T00:00:00.000Z";
    const cat2 = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
    const doc1 = generateBcmr({ ...BASE_OPTIONS, timestamp: ts });
    const doc2 = generateBcmr({ ...BASE_OPTIONS, category: cat2, timestamp: ts });
    expect(hashBcmr(doc1)).not.toBe(hashBcmr(doc2));
  });
});
