/**
 * tests/integration/metadata/nft-commitment.test.ts
 *
 * Integration tests for NFT commitment encoding and validation:
 *  - 0x-prefixed hex commitment
 *  - Bare hex commitment (even-length hex string)
 *  - UTF-8 string commitment
 *  - Max 40-byte commitment (CashTokens spec)
 *  - NFT capabilities: "none", "mutable", "minting"
 *  - Combined FT amount + NFT in the same output
 */

import { describe, it, expect } from "vitest";
import { TransactionBuilder } from "../../../src/core/TransactionBuilder.js";
import { validateSchema } from "../../../src/utils/validate.js";
import { MintCoreError } from "../../../src/utils/errors.js";
import type { MintConfig } from "../../../src/types/MintConfig.js";
import type { TokenSchema } from "../../../src/types/TokenSchema.js";

const PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const config: MintConfig = {
  network: "regtest",
  privateKey: PRIVATE_KEY,
};

describe("NFT commitment encoding", () => {
  it("builds an NFT transaction with a 0x-prefixed hex commitment", async () => {
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "NFT Hex",
      symbol: "NFTH",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "none", commitment: "0x1234abcd" },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
    // Commitment bytes "1234abcd" must appear in the serialised transaction
    expect(tx.hex).toContain("1234abcd");
  });

  it("builds an NFT transaction with a bare hex commitment", async () => {
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "NFT Bare Hex",
      symbol: "NFBH",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "mutable", commitment: "deadbeef" },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.hex).toContain("deadbeef");
  });

  it("builds an NFT transaction with a UTF-8 string commitment", async () => {
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "NFT UTF8",
      symbol: "NFTU",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "mutable", commitment: "hello" },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    // UTF-8 encoding of "hello" = 68656c6c6f
    expect(tx.hex).toContain("68656c6c6f");
  });

  it("builds an NFT transaction with a minting capability", async () => {
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "Minting NFT",
      symbol: "MFNT",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "minting", commitment: "cafebabe" },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a combined FT + NFT transaction", async () => {
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "Combo Token",
      symbol: "CMB",
      decimals: 8,
      initialSupply: 21_000_000n,
      nft: { capability: "none", commitment: "deadbeef" },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("builds a transaction with the maximum 40-byte commitment", async () => {
    // 40 bytes = 80 hex characters
    const maxCommitment = "ab".repeat(40);
    const builder = new TransactionBuilder(config);
    const tx = await builder.build({
      name: "Max NFT",
      symbol: "MXNF",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "none", commitment: maxCommitment },
    });

    expect(tx.hex).toMatch(/^[0-9a-f]+$/);
    expect(tx.hex).toContain(maxCommitment);
  });

  it("different commitments produce different transactions", async () => {
    const builder = new TransactionBuilder(config);

    const tx1 = await builder.build({
      name: "NFT A",
      symbol: "NFTA",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "none", commitment: "0x0001" },
    });

    const tx2 = await builder.build({
      name: "NFT A",
      symbol: "NFTA",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "none", commitment: "0x0002" },
    });

    expect(tx1.txid).not.toBe(tx2.txid);
  });
});

describe("NFT commitment validation", () => {
  const base: TokenSchema = {
    name: "T",
    symbol: "T",
    decimals: 0,
    initialSupply: 0n,
  };

  it("accepts a 40-byte hex commitment", () => {
    expect(() =>
      validateSchema({
        ...base,
        nft: { capability: "none", commitment: "ab".repeat(40) },
      })
    ).not.toThrow();
  });

  it("rejects a commitment exceeding 40 bytes", () => {
    expect(() =>
      validateSchema({
        ...base,
        nft: { capability: "none", commitment: "ab".repeat(41) },
      })
    ).toThrow(MintCoreError);
  });

  it("accepts all valid NFT capabilities", () => {
    for (const capability of ["none", "mutable", "minting"] as const) {
      expect(() =>
        validateSchema({
          ...base,
          nft: { capability, commitment: "deadbeef" },
        })
      ).not.toThrow();
    }
  });
});
