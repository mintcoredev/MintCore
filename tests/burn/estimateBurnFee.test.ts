import { describe, it, expect } from "vitest";
import { estimateBurnFee } from "../../src/burn/internal/estimateBurnFee.js";

describe("estimateBurnFee", () => {
  describe("basic formula: (10 + inputs*148 + outputs*34) * feeRate", () => {
    it("returns correct fee for 1 input, 1 output, feeRate=1", () => {
      // 10 + 148 + 34 = 192 bytes * 1 = 192
      expect(estimateBurnFee(1, 1, 1)).toBe(192n);
    });

    it("returns correct fee for 1 input, 2 outputs, feeRate=1", () => {
      // 10 + 148 + 68 = 226 bytes * 1 = 226
      expect(estimateBurnFee(1, 2, 1)).toBe(226n);
    });

    it("returns correct fee for 2 inputs, 2 outputs, feeRate=1", () => {
      // 10 + 296 + 68 = 374 bytes * 1 = 374
      expect(estimateBurnFee(2, 2, 1)).toBe(374n);
    });
  });

  describe("feeRate variations", () => {
    it("scales linearly with feeRate=2", () => {
      expect(estimateBurnFee(1, 1, 2)).toBe(384n); // 192 * 2
    });

    it("scales linearly with feeRate=10", () => {
      expect(estimateBurnFee(1, 1, 10)).toBe(1920n); // 192 * 10
    });

    it("returns bigint zero for feeRate=0", () => {
      expect(estimateBurnFee(1, 1, 0)).toBe(0n);
    });

    it("handles fractional feeRate by ceiling the result", () => {
      // 192 * 1.5 = 288 (exact integer, no ceiling effect)
      expect(estimateBurnFee(1, 1, 1.5)).toBe(288n);
    });

    it("applies ceiling for non-integer byte*rate products", () => {
      // 10 + 148 + 34 = 192; 192 * 1.1 = 211.2 → ceil → 212
      expect(estimateBurnFee(1, 1, 1.1)).toBe(212n);
    });
  });

  describe("multi-input / multi-output", () => {
    it("handles 3 inputs and 3 outputs", () => {
      // 10 + 3*148 + 3*34 = 10 + 444 + 102 = 556
      expect(estimateBurnFee(3, 3, 1)).toBe(556n);
    });

    it("handles 0 inputs and 0 outputs (base tx only)", () => {
      // 10 * 1 = 10
      expect(estimateBurnFee(0, 0, 1)).toBe(10n);
    });

    it("handles 0 outputs correctly", () => {
      // 10 + 148 + 0 = 158
      expect(estimateBurnFee(1, 0, 1)).toBe(158n);
    });
  });
});
