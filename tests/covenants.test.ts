import { describe, it, expect } from "vitest";
import { MintCoreError } from "../src/utils/errors.js";
import { CovenantBuilder } from "../src/covenants/builder/index.js";
import {
  isCovenantCondition,
  isCovenantInputConstraint,
  isCovenantOutputConstraint,
  isCovenantDefinition,
  assertCovenantCondition,
  assertCovenantDefinition,
} from "../src/covenants/validation/index.js";
import {
  hashCovenantDefinition,
  encodeCovenantMetadata,
  decodeCovenantMetadata,
} from "../src/covenants/utils/index.js";

// ── Helpers ──────────────────────────────────────────────────────────

class TestCovenant extends CovenantBuilder {
  constructor(name: string, version: number) {
    super(name, version);
  }
  defineInputs() {
    return [{ minSatoshis: 1000 }];
  }
  defineOutputs() {
    return [{ allowedRecipients: ["addr"] }];
  }
}

class TestCovenantWithMeta extends CovenantBuilder {
  constructor(name: string, version: number) {
    super(name, version);
  }
  defineInputs() {
    return [{}];
  }
  defineOutputs() {
    return [{}];
  }
  getMetadata() {
    return { author: "test", description: "a covenant" };
  }
}

function validDefinition() {
  return {
    name: "Test",
    version: 1,
    inputs: [{}],
    outputs: [{}],
  };
}

// ── 1. Covenant Validation ───────────────────────────────────────────

describe("isCovenantCondition", () => {
  it('returns true for valid { type: "timelock" }', () => {
    expect(isCovenantCondition({ type: "timelock" })).toBe(true);
  });

  it('returns true for valid { type: "timelock", params: { blocks: 100 } }', () => {
    expect(
      isCovenantCondition({ type: "timelock", params: { blocks: 100 } }),
    ).toBe(true);
  });

  it("returns false for null, undefined, arrays", () => {
    expect(isCovenantCondition(null)).toBe(false);
    expect(isCovenantCondition(undefined)).toBe(false);
    expect(isCovenantCondition([1, 2])).toBe(false);
  });

  it("returns false for empty type or non-string type", () => {
    expect(isCovenantCondition({ type: "" })).toBe(false);
    expect(isCovenantCondition({ type: 123 })).toBe(false);
  });

  it("returns false when params is array or null", () => {
    expect(isCovenantCondition({ type: "x", params: [1] })).toBe(false);
    expect(isCovenantCondition({ type: "x", params: null })).toBe(false);
  });
});

describe("isCovenantInputConstraint", () => {
  it("returns true for empty object {}", () => {
    expect(isCovenantInputConstraint({})).toBe(true);
  });

  it('returns true for { requiredTokens: ["tok1"] }', () => {
    expect(isCovenantInputConstraint({ requiredTokens: ["tok1"] })).toBe(true);
  });

  it("returns true for { minSatoshis: 1000 }", () => {
    expect(isCovenantInputConstraint({ minSatoshis: 1000 })).toBe(true);
  });

  it('returns true for { customConditions: [{ type: "check" }] }', () => {
    expect(
      isCovenantInputConstraint({
        customConditions: [{ type: "check" }],
      }),
    ).toBe(true);
  });

  it("returns false for non-object", () => {
    expect(isCovenantInputConstraint(null)).toBe(false);
    expect(isCovenantInputConstraint("string")).toBe(false);
    expect(isCovenantInputConstraint(42)).toBe(false);
  });

  it("returns false when requiredTokens is not array of strings", () => {
    expect(isCovenantInputConstraint({ requiredTokens: "tok" })).toBe(false);
    expect(isCovenantInputConstraint({ requiredTokens: [123] })).toBe(false);
  });

  it("returns false when minSatoshis is negative or NaN", () => {
    expect(isCovenantInputConstraint({ minSatoshis: -1 })).toBe(false);
    expect(isCovenantInputConstraint({ minSatoshis: NaN })).toBe(false);
  });

  it("returns false when customConditions contains invalid condition", () => {
    expect(
      isCovenantInputConstraint({
        customConditions: [{ type: "" }],
      }),
    ).toBe(false);
  });
});

describe("isCovenantOutputConstraint", () => {
  it("returns true for empty object {}", () => {
    expect(isCovenantOutputConstraint({})).toBe(true);
  });

  it('returns true for { allowedRecipients: ["addr1"] }', () => {
    expect(
      isCovenantOutputConstraint({ allowedRecipients: ["addr1"] }),
    ).toBe(true);
  });

  it("returns true for { requiredTokenDistribution: { tok: 1 } }", () => {
    expect(
      isCovenantOutputConstraint({
        requiredTokenDistribution: { tok: 1 },
      }),
    ).toBe(true);
  });

  it("returns false for non-object", () => {
    expect(isCovenantOutputConstraint(null)).toBe(false);
    expect(isCovenantOutputConstraint(42)).toBe(false);
    expect(isCovenantOutputConstraint("str")).toBe(false);
  });

  it("returns false when allowedRecipients has non-strings", () => {
    expect(
      isCovenantOutputConstraint({ allowedRecipients: [123] }),
    ).toBe(false);
  });

  it("returns false when requiredTokenDistribution has negative values", () => {
    expect(
      isCovenantOutputConstraint({
        requiredTokenDistribution: { tok: -1 },
      }),
    ).toBe(false);
  });
});

describe("isCovenantDefinition", () => {
  it("returns true for valid definition", () => {
    expect(isCovenantDefinition(validDefinition())).toBe(true);
  });

  it("returns false for empty name, invalid version, non-array inputs/outputs", () => {
    expect(
      isCovenantDefinition({ ...validDefinition(), name: "" }),
    ).toBe(false);
    expect(
      isCovenantDefinition({ ...validDefinition(), version: 0 }),
    ).toBe(false);
    expect(
      isCovenantDefinition({ ...validDefinition(), version: -1 }),
    ).toBe(false);
    expect(
      isCovenantDefinition({ ...validDefinition(), inputs: "bad" }),
    ).toBe(false);
    expect(
      isCovenantDefinition({ ...validDefinition(), outputs: "bad" }),
    ).toBe(false);
  });

  it("returns false for metadata that is an array", () => {
    expect(
      isCovenantDefinition({ ...validDefinition(), metadata: [1, 2] }),
    ).toBe(false);
  });
});

describe("assertCovenantCondition", () => {
  it("does not throw for valid condition", () => {
    expect(() => assertCovenantCondition({ type: "timelock" })).not.toThrow();
  });

  it("throws MintCoreError for non-object", () => {
    expect(() => assertCovenantCondition(null)).toThrow(MintCoreError);
    expect(() => assertCovenantCondition(42)).toThrow(MintCoreError);
  });

  it("throws MintCoreError for invalid type", () => {
    expect(() => assertCovenantCondition({ type: "" })).toThrow(MintCoreError);
    expect(() => assertCovenantCondition({ type: 123 })).toThrow(MintCoreError);
  });
});

describe("assertCovenantDefinition", () => {
  it("does not throw for valid definition", () => {
    expect(() => assertCovenantDefinition(validDefinition())).not.toThrow();
  });

  it("throws MintCoreError for invalid inputs", () => {
    expect(() => assertCovenantDefinition(null)).toThrow(MintCoreError);
    expect(() =>
      assertCovenantDefinition({ ...validDefinition(), name: "" }),
    ).toThrow(MintCoreError);
    expect(() =>
      assertCovenantDefinition({ ...validDefinition(), version: 0 }),
    ).toThrow(MintCoreError);
  });
});

// ── 2. Covenant Builder ──────────────────────────────────────────────

describe("CovenantBuilder", () => {
  it("build() returns a valid CovenantDefinition", () => {
    const cov = new TestCovenant("MyCov", 1);
    const def = cov.build();
    expect(isCovenantDefinition(def)).toBe(true);
    expect(def.name).toBe("MyCov");
    expect(def.version).toBe(1);
    expect(def.inputs).toEqual([{ minSatoshis: 1000 }]);
    expect(def.outputs).toEqual([{ allowedRecipients: ["addr"] }]);
  });

  it("build() includes metadata when getMetadata() returns non-empty", () => {
    const cov = new TestCovenantWithMeta("WithMeta", 2);
    const def = cov.build();
    expect(def.metadata).toEqual({ author: "test", description: "a covenant" });
  });

  it("build() throws MintCoreError for empty name", () => {
    const cov = new TestCovenant("", 1);
    expect(() => cov.build()).toThrow(MintCoreError);
  });

  it("build() throws MintCoreError for invalid version (0, -1, 1.5)", () => {
    expect(() => new TestCovenant("C", 0).build()).toThrow(MintCoreError);
    expect(() => new TestCovenant("C", -1).build()).toThrow(MintCoreError);
    expect(() => new TestCovenant("C", 1.5).build()).toThrow(MintCoreError);
  });
});

// ── 3. Covenant Utils ────────────────────────────────────────────────

describe("hashCovenantDefinition", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashCovenantDefinition(validDefinition());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic (same input → same output)", () => {
    const a = hashCovenantDefinition(validDefinition());
    const b = hashCovenantDefinition(validDefinition());
    expect(a).toBe(b);
  });

  it("different inputs → different hashes", () => {
    const a = hashCovenantDefinition(validDefinition());
    const b = hashCovenantDefinition({ ...validDefinition(), name: "Other" });
    expect(a).not.toBe(b);
  });

  it("key ordering doesn't matter (canonical JSON)", () => {
    const ordered = { name: "X", version: 1, inputs: [{}], outputs: [{}] };
    const reversed = { outputs: [{}], inputs: [{}], version: 1, name: "X" };
    expect(hashCovenantDefinition(ordered)).toBe(
      hashCovenantDefinition(reversed),
    );
  });
});

describe("encodeCovenantMetadata", () => {
  it("encodes a plain object to a non-empty string", () => {
    const encoded = encodeCovenantMetadata({ key: "value" });
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("round-trips with decodeCovenantMetadata", () => {
    const original = { hello: "world", nested: { a: 1 } };
    const encoded = encodeCovenantMetadata(original);
    const decoded = decodeCovenantMetadata(encoded);
    expect(decoded).toEqual(original);
  });

  it("throws MintCoreError for non-object (null, array, number)", () => {
    expect(() => encodeCovenantMetadata(null as any)).toThrow(MintCoreError);
    expect(() => encodeCovenantMetadata([] as any)).toThrow(MintCoreError);
    expect(() => encodeCovenantMetadata(42 as any)).toThrow(MintCoreError);
  });
});

describe("decodeCovenantMetadata", () => {
  it("decodes a valid encoded string back to the original object", () => {
    const original = { foo: "bar" };
    const encoded = encodeCovenantMetadata(original);
    expect(decodeCovenantMetadata(encoded)).toEqual(original);
  });

  it("throws MintCoreError for empty string", () => {
    expect(() => decodeCovenantMetadata("")).toThrow(MintCoreError);
  });

  it("throws MintCoreError for non-base64 input", () => {
    expect(() => decodeCovenantMetadata("%%%not-base64%%%")).toThrow(
      MintCoreError,
    );
  });

  it("throws MintCoreError for base64 that isn't JSON", () => {
    const notJson = btoa("this is not json");
    expect(() => decodeCovenantMetadata(notJson)).toThrow(MintCoreError);
  });

  it("throws MintCoreError for base64-encoded array", () => {
    const encodedArray = btoa(JSON.stringify([1, 2, 3]));
    expect(() => decodeCovenantMetadata(encodedArray)).toThrow(MintCoreError);
  });
});
