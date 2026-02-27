import { describe, it, expect } from "vitest";
import { VERSION } from "../src/version.js";

describe("VERSION", () => {
  it("is a string", () => {
    expect(typeof VERSION).toBe("string");
  });

  it("follows semver format (major.minor.patch)", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("matches the version declared in package.json", async () => {
    const pkg = await import("../package.json", { assert: { type: "json" } });
    expect(VERSION).toBe(pkg.default.version);
  });
});
