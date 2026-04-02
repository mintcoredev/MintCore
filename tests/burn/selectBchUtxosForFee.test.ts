import { describe, it, expect } from "vitest";
import { selectBchUtxosForFee } from "../../src/burn/internal/selectBchUtxosForFee.js";
import { MintCoreError } from "../../src/utils/errors.js";
import type { Utxo } from "../../src/burn/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUtxo(txid: string, satoshis: number): Utxo {
  return {
    txid,
    vout: 0,
    satoshis,
    scriptPubKey: "76a914" + "00".repeat(20) + "88ac",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("selectBchUtxosForFee", () => {
  describe("exact fee match", () => {
    it("returns the single UTXO when its value equals required", () => {
      const utxos = [makeUtxo("tx01", 1000)];
      const { selected, total } = selectBchUtxosForFee(utxos, 1000n);
      expect(selected).toHaveLength(1);
      expect(selected[0].txid).toBe("tx01");
      expect(total).toBe(1000n);
    });

    it("returns a single UTXO whose value exceeds required", () => {
      const utxos = [makeUtxo("tx02", 2000)];
      const { selected, total } = selectBchUtxosForFee(utxos, 500n);
      expect(selected).toHaveLength(1);
      expect(total).toBe(2000n);
    });
  });

  describe("multi-UTXO selection", () => {
    it("combines multiple UTXOs until total meets required", () => {
      const utxos = [
        makeUtxo("tx10", 300),
        makeUtxo("tx11", 500),
        makeUtxo("tx12", 200),
      ];
      const { selected, total } = selectBchUtxosForFee(utxos, 700n);
      // Sorted: 200, 300, 500 → 200+300=500 < 700, 200+300+500=1000 >= 700
      expect(total).toBeGreaterThanOrEqual(700n);
      expect(selected.length).toBeGreaterThan(1);
    });

    it("stops selecting as soon as running total meets required", () => {
      const utxos = [
        makeUtxo("tx20", 1000),
        makeUtxo("tx21", 600),
        makeUtxo("tx22", 400),
      ];
      // Sorted: 400, 600, 1000 → 400+600=1000 >= 900, selects 2
      const { selected, total } = selectBchUtxosForFee(utxos, 900n);
      expect(total).toBeGreaterThanOrEqual(900n);
      expect(selected.length).toBeLessThanOrEqual(utxos.length);
    });

    it("returns correct total for multi-UTXO selection", () => {
      const utxos = [makeUtxo("tx30", 100), makeUtxo("tx31", 200)];
      const { total } = selectBchUtxosForFee(utxos, 250n);
      expect(total).toBe(300n);
    });
  });

  describe("insufficient BCH", () => {
    it("throws MintCoreError when the UTXO set is empty", () => {
      expect(() => selectBchUtxosForFee([], 1n)).toThrow(MintCoreError);
    });

    it("throws MintCoreError when total balance is less than required", () => {
      const utxos = [makeUtxo("tx40", 100), makeUtxo("tx41", 200)];
      expect(() => selectBchUtxosForFee(utxos, 500n)).toThrow(MintCoreError);
    });

    it("error message includes the amounts", () => {
      const utxos = [makeUtxo("tx50", 50)];
      expect(() => selectBchUtxosForFee(utxos, 200n)).toThrow(
        /Insufficient BCH balance/,
      );
    });

    it("error message includes both required and available amounts", () => {
      const utxos = [makeUtxo("tx51", 50)];
      expect(() => selectBchUtxosForFee(utxos, 200n)).toThrow(/200.*50|50.*200/);
    });
  });

  describe("sorting behavior", () => {
    it("selects smallest UTXOs first (ascending order)", () => {
      const utxos = [
        makeUtxo("tx60", 1000),
        makeUtxo("tx61", 100),
        makeUtxo("tx62", 500),
      ];
      // Need 550: sorted is 100, 500, 1000 → 100+500=600 >= 550, selects 2
      const { selected, total } = selectBchUtxosForFee(utxos, 550n);
      expect(selected).toHaveLength(2);
      expect(selected[0].satoshis).toBe(100);
      expect(selected[1].satoshis).toBe(500);
      expect(total).toBe(600n);
    });

    it("does not mutate the original utxos array order", () => {
      const utxos = [makeUtxo("tx70", 300), makeUtxo("tx71", 100), makeUtxo("tx72", 200)];
      const originalOrder = utxos.map((u) => u.txid);
      selectBchUtxosForFee(utxos, 100n);
      expect(utxos.map((u) => u.txid)).toEqual(originalOrder);
    });

    it("handles UTXOs with equal satoshi values", () => {
      const utxos = [
        makeUtxo("tx80", 200),
        makeUtxo("tx81", 200),
        makeUtxo("tx82", 200),
      ];
      const { selected, total } = selectBchUtxosForFee(utxos, 350n);
      expect(total).toBeGreaterThanOrEqual(350n);
      expect(selected.length).toBe(2);
    });
  });

  describe("return value types", () => {
    it("returns total as bigint", () => {
      const utxos = [makeUtxo("tx90", 1000)];
      const { total } = selectBchUtxosForFee(utxos, 500n);
      expect(typeof total).toBe("bigint");
    });

    it("returns selected as an array of Utxo objects", () => {
      const utxos = [makeUtxo("tx91", 1000)];
      const { selected } = selectBchUtxosForFee(utxos, 500n);
      expect(Array.isArray(selected)).toBe(true);
      expect(selected[0]).toHaveProperty("txid");
      expect(selected[0]).toHaveProperty("satoshis");
    });
  });
});
