import { describe, it, expect } from "vitest";
import { isCategoryRetired } from "../../src/burn/isCategoryRetired.js";

const categoryId = "abc123";

const baseUtxo = { txid: "tx1", vout: 0, satoshis: 1000 };

describe("isCategoryRetired", () => {
  it("returns true for empty UTXO array", () => {
    expect(isCategoryRetired(categoryId, [])).toBe(true);
  });

  it("returns true when no UTXOs match the category", () => {
    const utxos = [
      { ...baseUtxo, token: { category: "other", amount: 100n } },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(true);
  });

  it("returns false when a matching UTXO has fungible token amount > 0n", () => {
    const utxos = [
      { ...baseUtxo, token: { category: categoryId, amount: 50n } },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(false);
  });

  it("returns false when a matching UTXO has minting capability", () => {
    const utxos = [
      {
        ...baseUtxo,
        token: { category: categoryId, amount: 0n, nft: { capability: "minting" } },
      },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(false);
  });

  it("returns false when a matching UTXO has mutable capability", () => {
    const utxos = [
      {
        ...baseUtxo,
        token: { category: categoryId, amount: 0n, nft: { capability: "mutable" } },
      },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(false);
  });

  it("returns true when matching UTXO has nft with capability 'none' and amount 0n", () => {
    const utxos = [
      {
        ...baseUtxo,
        token: { category: categoryId, amount: 0n, nft: { capability: "none" } },
      },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(true);
  });

  it("returns true when matching UTXO has no token data (plain BCH UTXO)", () => {
    const utxos = [{ ...baseUtxo }];
    expect(isCategoryRetired(categoryId, utxos)).toBe(true);
  });

  it("returns true when the only matching UTXO has amount 0n and no nft capability", () => {
    const utxos = [
      { ...baseUtxo, token: { category: categoryId, amount: 0n } },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(true);
  });

  it("returns true with mixed UTXOs: some matching retired and some non-matching", () => {
    const utxos = [
      { ...baseUtxo, token: { category: "other", amount: 500n } },
      { ...baseUtxo, vout: 1, token: { category: categoryId, amount: 0n, nft: { capability: "none" } } },
      { ...baseUtxo, vout: 2 },
    ];
    expect(isCategoryRetired(categoryId, utxos)).toBe(true);
  });
});
