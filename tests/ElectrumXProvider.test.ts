import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ElectrumXProvider } from "../src/providers/ElectrumXProvider.js";
import { MintCoreError } from "../src/utils/errors.js";

const BASE_URL = "https://fulcrum.example.com";
const TEST_ADDRESS = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

describe("ElectrumXProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and maps UTXOs from a bare array response", async () => {
    const mockUtxos = [
      { tx_hash: "aaaa".repeat(16), tx_pos: 0, value: 100000, height: 800000 },
      { tx_hash: "bbbb".repeat(16), tx_pos: 1, value: 50000, height: 800001 },
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUtxos,
    });

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(2);
    expect(utxos[0]).toEqual({
      txid: mockUtxos[0].tx_hash,
      vout: 0,
      satoshis: 100000,
      scriptPubKey: "",
    });
    expect(utxos[1]).toEqual({
      txid: mockUtxos[1].tx_hash,
      vout: 1,
      satoshis: 50000,
      scriptPubKey: "",
    });
  });

  it("fetches and maps UTXOs from a { result: [...] } wrapped response", async () => {
    const mockUtxos = [
      { tx_hash: "cccc".repeat(16), tx_pos: 0, value: 200000 },
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: mockUtxos }),
    });

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(1);
    expect(utxos[0].txid).toBe(mockUtxos[0].tx_hash);
    expect(utxos[0].satoshis).toBe(200000);
  });

  it("returns an empty array when response is an empty array", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(0);
  });

  it("returns an empty array when wrapped result is empty", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ result: [] }),
    });

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(0);
  });

  it("throws MintCoreError on a non-OK HTTP response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 404 });

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("404");
  });

  it("throws MintCoreError when fetch rejects (network error)", async () => {
    (fetch as any).mockRejectedValue(new Error("Network failure"));

    const provider = new ElectrumXProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("Network failure");
  });

  it("builds the correct UTXO URL from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com/", "mainnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://fulcrum.example.com/address/${TEST_ADDRESS}/unspent`
    );
  });

  it("strips trailing slashes from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ElectrumXProvider("https://fulcrum.example.com///", "testnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://fulcrum.example.com/address/${TEST_ADDRESS}/unspent`
    );
  });
});

describe("TransactionBuilder with ElectrumX provider", () => {
  it("accepts electrumxProviderUrl in MintConfig", async () => {
    const { TransactionBuilder } = await import("../src/core/TransactionBuilder.js");

    const config = {
      network: "regtest" as const,
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
      electrumxProviderUrl: "https://fulcrum.example.com",
    };

    // TransactionBuilder should construct without throwing
    const builder = new TransactionBuilder(config);
    expect(builder).toBeDefined();
  });

  it("builds a genesis transaction without a UTXO provider configured", async () => {
    const { TransactionBuilder } = await import("../src/core/TransactionBuilder.js");

    const config = {
      network: "regtest" as const,
      privateKey: "0000000000000000000000000000000000000000000000000000000000000001",
    };

    const builder = new TransactionBuilder(config);
    const result = await builder.build({
      name: "Test Token",
      symbol: "TST",
      decimals: 0,
      initialSupply: 1000n,
    });

    expect(result.hex).toMatch(/^[0-9a-f]+$/);
    expect(result.txid).toMatch(/^[0-9a-f]{64}$/);
  });
});
