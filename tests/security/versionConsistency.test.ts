import { describe, it, expect } from "vitest";
import { VERSION } from "../../src/version.js";
import pkg from "../../package.json";

describe("Version consistency", () => {
  it("VERSION constant must match package.json version", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
