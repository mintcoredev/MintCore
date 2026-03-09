import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ChronikProvider } from "../src/providers/ChronikProvider.js";
import { MintCoreError } from "../src/utils/errors.js";

const BASE_URL = "https://chronik.example.com";
const TEST_ADDRESS = "bitcoincash:qp3wjpa3tjlj042z2wv7hahsldgwhwy0rq9sywjpyy";

describe("ChronikProvider.fetchUtxos", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns mapped UTXOs from a bare array response", async () => {
    const mockData = [
      { txid: "aa".repeat(32), vout: 0, satoshis: 100000, scriptPubKey: "" },
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toBeInstanceOf(Array);
    expect(utxos).toHaveLength(1);
  });

  it("returns mapped UTXOs from a { utxos: [...] } wrapped response", async () => {
    const inner = [
      { txid: "bb".repeat(32), vout: 0, satoshis: 50000, scriptPubKey: "" },
    ];
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ utxos: inner }),
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(1);
  });

  it("returns an empty array when the response is an empty array", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    const utxos = await provider.fetchUtxos(TEST_ADDRESS);

    expect(utxos).toHaveLength(0);
  });

  it("throws MintCoreError on a non-OK HTTP response", async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 503 });

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("503");
  });

  it("throws MintCoreError when fetch rejects (network error)", async () => {
    (fetch as any).mockRejectedValue(new Error("Network timeout"));

    const provider = new ChronikProvider(BASE_URL, "mainnet");
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow(MintCoreError);
    await expect(provider.fetchUtxos(TEST_ADDRESS)).rejects.toThrow("Network timeout");
  });

  it("builds the correct UTXO URL from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ChronikProvider("https://chronik.example.com/", "mainnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://chronik.example.com/address/${TEST_ADDRESS}/utxos`
    );
  });

  it("strips trailing slashes from the base URL", async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const provider = new ChronikProvider("https://chronik.example.com///", "testnet");
    await provider.fetchUtxos(TEST_ADDRESS);

    expect(fetch).toHaveBeenCalledWith(
      `https://chronik.example.com/address/${TEST_ADDRESS}/utxos`
    );
  });
});
