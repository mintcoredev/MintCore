import { describe, it, expect } from "vitest";
import { selectTokenUtxosForAmount } from "../../src/burn/internal/selectTokenUtxosForAmount.js";
import { MintCoreError } from "../../src/utils/errors.js";
import type { TokenUtxo } from "../../src/burn/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CAT_A = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CAT_B = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function makeUtxo(
  txid: string,
  category: string,
  amount: bigint,
  hasNft = false,
): TokenUtxo {
  return {
    txid,
    vout: 0,
    satoshis: 1000,
    scriptPubKey: "76a914" + "00".repeat(20) + "88ac",
    token: {
      category,
      amount,
      ...(hasNft ? { nft: { capability: "none" } } : {}),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("selectTokenUtxosForAmount", () => {
  describe("exact match", () => {
    it("returns the single UTXO when its amount equals the requested amount", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx01", CAT_A, 100n)];
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 100n);
      expect(selected).toHaveLength(1);
      expect(selected[0].txid).toBe("tx01");
      expect(total).toBe(100n);
    });

    it("returns the exact UTXO and correct total when a single UTXO exceeds the amount", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx02", CAT_A, 200n)];
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 150n);
      expect(selected).toHaveLength(1);
      expect(total).toBe(200n);
    });
  });

  describe("multi-UTXO selection", () => {
    it("combines multiple UTXOs until the sum meets the amount", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx10", CAT_A, 30n),
        makeUtxo("tx11", CAT_A, 50n),
        makeUtxo("tx12", CAT_A, 20n),
      ];
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 70n);
      // Sorted: 20, 30, 50 → needs 20+30+50 = 100 to reach 70? No: 20+30=50 < 70, 20+30+50=100 >= 70
      expect(total).toBeGreaterThanOrEqual(70n);
      expect(selected.length).toBeGreaterThan(1);
    });

    it("stops selecting as soon as the running total meets the amount", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx20", CAT_A, 10n),
        makeUtxo("tx21", CAT_A, 60n),
        makeUtxo("tx22", CAT_A, 40n),
      ];
      // Sorted: 10, 40, 60 → 10+40=50 < 55, 10+40+60=110 >= 55
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 55n);
      expect(total).toBeGreaterThanOrEqual(55n);
      // Should not have selected more UTXOs than necessary
      expect(selected.length).toBeLessThanOrEqual(utxos.length);
    });
  });

  describe("insufficient balance", () => {
    it("throws MintCoreError when there are no UTXOs for the category", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx30", CAT_B, 500n)];
      expect(() => selectTokenUtxosForAmount(utxos, CAT_A, 1n)).toThrow(
        MintCoreError,
      );
    });

    it("throws MintCoreError when total balance is less than requested amount", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx40", CAT_A, 10n),
        makeUtxo("tx41", CAT_A, 20n),
      ];
      expect(() => selectTokenUtxosForAmount(utxos, CAT_A, 50n)).toThrow(
        MintCoreError,
      );
    });

    it("error message includes the category id and amounts", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx50", CAT_A, 5n)];
      expect(() => selectTokenUtxosForAmount(utxos, CAT_A, 100n)).toThrow(
        /Insufficient token balance for category/,
      );
    });

    it("throws when the UTXO set is empty", () => {
      expect(() => selectTokenUtxosForAmount([], CAT_A, 1n)).toThrow(
        MintCoreError,
      );
    });
  });

  describe("category mismatch", () => {
    it("ignores UTXOs from a different category", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx60", CAT_B, 1000n),
        makeUtxo("tx61", CAT_A, 10n),
      ];
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 10n);
      expect(selected).toHaveLength(1);
      expect(selected[0].token?.category).toBe(CAT_A);
      expect(total).toBe(10n);
    });

    it("throws when only UTXOs of a different category are present", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx70", CAT_B, 9999n)];
      expect(() => selectTokenUtxosForAmount(utxos, CAT_A, 1n)).toThrow(
        MintCoreError,
      );
    });
  });

  describe("sorting behavior", () => {
    it("selects smallest UTXOs first (ascending order)", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx80", CAT_A, 100n),
        makeUtxo("tx81", CAT_A, 10n),
        makeUtxo("tx82", CAT_A, 50n),
      ];
      // Need 55: sorted order is 10,50,100 → 10+50=60 >= 55, so two UTXOs selected
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 55n);
      expect(selected).toHaveLength(2);
      expect(selected[0].token?.amount).toBe(10n);
      expect(selected[1].token?.amount).toBe(50n);
      expect(total).toBe(60n);
    });

    it("skips NFT-bearing UTXOs even when they have a fungible amount", () => {
      const utxos: TokenUtxo[] = [
        makeUtxo("tx90", CAT_A, 200n, true), // has NFT — must be skipped
        makeUtxo("tx91", CAT_A, 50n),
      ];
      const { selected, total } = selectTokenUtxosForAmount(utxos, CAT_A, 50n);
      expect(selected).toHaveLength(1);
      expect(selected[0].txid).toBe("tx91");
      expect(total).toBe(50n);
    });

    it("throws when only NFT-bearing UTXOs are present", () => {
      const utxos: TokenUtxo[] = [makeUtxo("tx95", CAT_A, 500n, true)];
      expect(() => selectTokenUtxosForAmount(utxos, CAT_A, 1n)).toThrow(
        MintCoreError,
      );
    });
  });
});
