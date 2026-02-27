import { describe, it, expect } from "vitest";
import { MintCoreError } from "../src/utils/errors.js";

describe("MintCoreError", () => {
  it("is an instance of Error", () => {
    const err = new MintCoreError("something went wrong");
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of MintCoreError", () => {
    const err = new MintCoreError("test");
    expect(err).toBeInstanceOf(MintCoreError);
  });

  it("sets the message property", () => {
    const msg = "invalid token schema";
    const err = new MintCoreError(msg);
    expect(err.message).toBe(msg);
  });

  it("sets name to 'MintCoreError'", () => {
    const err = new MintCoreError("test");
    expect(err.name).toBe("MintCoreError");
  });

  it("can be caught as a MintCoreError", () => {
    expect(() => {
      throw new MintCoreError("caught");
    }).toThrow(MintCoreError);
  });

  it("can be caught as a generic Error", () => {
    expect(() => {
      throw new MintCoreError("caught as Error");
    }).toThrow(Error);
  });

  it("message is readable via the thrown error", () => {
    const msg = "expected failure";
    expect(() => {
      throw new MintCoreError(msg);
    }).toThrow(msg);
  });
});
