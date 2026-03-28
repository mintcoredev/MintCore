/**
 * API surface tests for api/mintcore.ts
 *
 * Verifies that the unified public entry-point re-exports every symbol that
 * downstream consumers are expected to import from "mintcore".
 */
import { describe, it, expect } from "vitest";

// Import everything we expect to be exported from the unified API.
import {
  // ── core ────────────────────────────────────────────────────────────────────
  MintEngine,
  LibauthAdapter,
  TransactionBuilder,
  BatchMintEngine,
  // ── convenience helpers ─────────────────────────────────────────────────────
  mintFungibleToken,
  mintNFT,
  verifyMint,
  createMetadata,
  encodeMetadata,
  // ── validation ──────────────────────────────────────────────────────────────
  validateSchema,
  validateUtxo,
  validateMintRequest,
  validateBatchMintOptions,
  // ── fee / coin-selection ────────────────────────────────────────────────────
  estimateFee,
  estimateBatchTxFee,
  estimateBatchTxSize,
  DEFAULT_FEE_RATE,
  TOKEN_OUTPUT_DUST,
  DUST_THRESHOLD,
  MINTING_BATON_INPUT_OVERHEAD,
  selectUtxos,
  UtxoLock,
  // ── misc ────────────────────────────────────────────────────────────────────
  MintCoreError,
  VERSION,
  generateKey,
  deriveAddress,
} from "../api/mintcore.js";

// ─── Constructors / callable exports ─────────────────────────────────────────

describe("api/mintcore – constructor exports", () => {
  it("MintEngine is a constructor", () => {
    expect(typeof MintEngine).toBe("function");
  });

  it("LibauthAdapter is a constructor", () => {
    expect(typeof LibauthAdapter).toBe("function");
  });

  it("TransactionBuilder is a constructor", () => {
    expect(typeof TransactionBuilder).toBe("function");
  });

  it("BatchMintEngine is a constructor", () => {
    expect(typeof BatchMintEngine).toBe("function");
  });

  it("UtxoLock is a constructor", () => {
    expect(typeof UtxoLock).toBe("function");
  });

  it("MintCoreError is a constructor (extends Error)", () => {
    expect(typeof MintCoreError).toBe("function");
    const err = new MintCoreError("test");
    expect(err).toBeInstanceOf(Error);
  });
});

// ─── Function exports ─────────────────────────────────────────────────────────

describe("api/mintcore – function exports", () => {
  it("mintFungibleToken is a function", () => {
    expect(typeof mintFungibleToken).toBe("function");
  });

  it("mintNFT is a function", () => {
    expect(typeof mintNFT).toBe("function");
  });

  it("verifyMint is a function", () => {
    expect(typeof verifyMint).toBe("function");
  });

  it("createMetadata is a function", () => {
    expect(typeof createMetadata).toBe("function");
  });

  it("encodeMetadata is a function", () => {
    expect(typeof encodeMetadata).toBe("function");
  });

  it("validateSchema is a function", () => {
    expect(typeof validateSchema).toBe("function");
  });

  it("validateUtxo is a function", () => {
    expect(typeof validateUtxo).toBe("function");
  });

  it("validateMintRequest is a function", () => {
    expect(typeof validateMintRequest).toBe("function");
  });

  it("validateBatchMintOptions is a function", () => {
    expect(typeof validateBatchMintOptions).toBe("function");
  });

  it("estimateFee is a function", () => {
    expect(typeof estimateFee).toBe("function");
  });

  it("estimateBatchTxFee is a function", () => {
    expect(typeof estimateBatchTxFee).toBe("function");
  });

  it("estimateBatchTxSize is a function", () => {
    expect(typeof estimateBatchTxSize).toBe("function");
  });

  it("selectUtxos is a function", () => {
    expect(typeof selectUtxos).toBe("function");
  });

  it("generateKey is a function", () => {
    expect(typeof generateKey).toBe("function");
  });

  it("deriveAddress is a function", () => {
    expect(typeof deriveAddress).toBe("function");
  });
});

// ─── Constant exports ─────────────────────────────────────────────────────────

describe("api/mintcore – constant exports", () => {
  it("DEFAULT_FEE_RATE is a positive number", () => {
    expect(typeof DEFAULT_FEE_RATE).toBe("number");
    expect(DEFAULT_FEE_RATE).toBeGreaterThan(0);
  });

  it("TOKEN_OUTPUT_DUST is a positive integer", () => {
    expect(typeof TOKEN_OUTPUT_DUST).toBe("number");
    expect(TOKEN_OUTPUT_DUST).toBeGreaterThan(0);
    expect(Number.isInteger(TOKEN_OUTPUT_DUST)).toBe(true);
  });

  it("DUST_THRESHOLD is a positive integer", () => {
    expect(typeof DUST_THRESHOLD).toBe("number");
    expect(DUST_THRESHOLD).toBeGreaterThan(0);
    expect(Number.isInteger(DUST_THRESHOLD)).toBe(true);
  });

  it("MINTING_BATON_INPUT_OVERHEAD is a positive integer", () => {
    expect(typeof MINTING_BATON_INPUT_OVERHEAD).toBe("number");
    expect(MINTING_BATON_INPUT_OVERHEAD).toBeGreaterThan(0);
    expect(Number.isInteger(MINTING_BATON_INPUT_OVERHEAD)).toBe(true);
  });

  it("VERSION is a non-empty string", () => {
    expect(typeof VERSION).toBe("string");
    expect(VERSION.length).toBeGreaterThan(0);
  });
});

// ─── Smoke-tests: critical paths through the unified API ─────────────────────

describe("api/mintcore – smoke tests", () => {
  it("LibauthAdapter builds a transaction via the unified API", async () => {
    const adapter = new LibauthAdapter({
      network: "regtest",
      privateKey:
        "0000000000000000000000000000000000000000000000000000000000000001",
    });
    const result = await adapter.buildMintTransaction({
      name: "API Test",
      symbol: "APITST",
      decimals: 0,
      initialSupply: 1n,
    });
    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });
});
