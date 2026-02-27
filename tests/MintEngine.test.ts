import { describe, it, expect } from "vitest";
import { MintEngine } from "../src/core/MintEngine.js";
import { MintCoreError } from "../src/utils/errors.js";
import type { MintConfig } from "../src/types/MintConfig.js";
import type { TokenSchema } from "../src/types/TokenSchema.js";

const TEST_PRIVATE_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

const baseConfig: MintConfig = {
  network: "regtest",
  privateKey: TEST_PRIVATE_KEY,
};

describe("MintEngine.mint", () => {
  it("returns a MintResult with hex and txid for a valid fungible token schema", async () => {
    const engine = new MintEngine(baseConfig);
    const schema: TokenSchema = {
      name: "Engine Token",
      symbol: "ENG",
      decimals: 2,
      initialSupply: 1000n,
    };

    const result = await engine.mint(schema);

    expect(result.hex).toBeTypeOf("string");
    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns null metadata when schema.metadata is not provided", async () => {
    const engine = new MintEngine(baseConfig);
    const result = await engine.mint({
      name: "T",
      symbol: "T",
      decimals: 0,
      initialSupply: 1n,
    });

    expect(result.metadata).toBeNull();
  });

  it("returns the schema metadata in the result", async () => {
    const engine = new MintEngine(baseConfig);
    const meta = { description: "A test token", icon: "https://example.com/icon.png" };
    const result = await engine.mint({
      name: "Meta Token",
      symbol: "META",
      decimals: 0,
      initialSupply: 1n,
      metadata: meta,
    });

    expect(result.metadata).toEqual(meta);
  });

  it("mints an NFT schema successfully", async () => {
    const engine = new MintEngine(baseConfig);
    const schema: TokenSchema = {
      name: "Engine NFT",
      symbol: "ENFT",
      decimals: 0,
      initialSupply: 0n,
      nft: { capability: "minting", commitment: "deadbeef" },
    };

    const result = await engine.mint(schema);

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });

  it("throws MintCoreError for an invalid schema (empty name)", async () => {
    const engine = new MintEngine(baseConfig);
    await expect(
      engine.mint({ name: "", symbol: "T", decimals: 0, initialSupply: 1n })
    ).rejects.toThrow(MintCoreError);
  });

  it("throws MintCoreError for negative initialSupply", async () => {
    const engine = new MintEngine(baseConfig);
    await expect(
      engine.mint({ name: "T", symbol: "T", decimals: 0, initialSupply: -1n })
    ).rejects.toThrow(MintCoreError);
  });

  it("is deterministic – same schema produces same txid", async () => {
    const schema: TokenSchema = {
      name: "Deterministic",
      symbol: "DET",
      decimals: 0,
      initialSupply: 42n,
    };

    const engine = new MintEngine(baseConfig);
    const r1 = await engine.mint(schema);
    const r2 = await engine.mint(schema);

    expect(r1.hex).toBe(r2.hex);
    expect(r1.txid).toBe(r2.txid);
  });
});
